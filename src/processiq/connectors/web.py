"""
Web Automation Connector

Advanced web connector supporting multiple automation modes:
- Traditional (Playwright/Selenium) 
- AI-powered (Vision LLMs)
- Hybrid with intelligent fallback
- Self-learning capabilities
"""

import asyncio
from enum import Enum
from typing import Any, Dict, List, Optional, AsyncGenerator, Union
from datetime import datetime
from dataclasses import dataclass

from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from pydantic import BaseModel, Field

from .base import ConnectorInterface, ConnectorConfig, DataRecord, ConnectorStatus
from ..core.events import EventBus
from ..core.exceptions import AutomationError, VisionError


class WebAutomationMode(Enum):
    """Web automation execution modes"""
    TRADITIONAL = "traditional"      # Pure Playwright/Selenium
    VISION_AI = "vision_ai"         # Pure Vision LLM
    HYBRID = "hybrid"               # Smart fallback between modes
    LEARNING = "learning"           # Self-learning with human feedback


class WebAction(BaseModel):
    """Web action definition"""
    type: str  # click, type, scroll, navigate, extract, etc.
    target: Optional[str] = None  # selector or description
    value: Optional[str] = None   # for type actions
    coordinates: Optional[tuple] = None  # for vision-based actions
    timeout: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WebWorkflow(BaseModel):
    """Web workflow definition"""
    name: str
    description: str = ""
    start_url: str
    actions: List[WebAction]
    extraction_rules: Dict[str, str] = Field(default_factory=dict)
    success_criteria: List[str] = Field(default_factory=list)


class WebConnectorConfig(ConnectorConfig):
    """Configuration for web connector"""
    
    # Browser settings
    browser_type: str = "chromium"  # chromium, firefox, webkit
    headless: bool = True
    viewport: Dict[str, int] = {"width": 1920, "height": 1080}
    user_agent: Optional[str] = None
    
    # Automation mode
    automation_mode: WebAutomationMode = WebAutomationMode.HYBRID
    prefer_traditional: bool = True
    vision_fallback: bool = True
    learning_enabled: bool = False
    
    # Traditional automation settings
    default_timeout: int = 30000  # milliseconds
    wait_for_selector_timeout: int = 10000
    navigation_timeout: int = 30000
    
    # AI/Vision settings
    ai_provider: str = "qwen2.5-vl"  # qwen2.5-vl, gpt-4v, claude-3v
    vision_model_size: str = "7B"    # for Qwen: 3B, 7B, 32B, 72B
    ai_timeout: int = 60
    screenshot_quality: int = 90
    
    # Anti-detection
    stealth_mode: bool = True
    random_delays: bool = True
    proxy_rotation: bool = False
    proxy_list: List[str] = Field(default_factory=list)
    
    # Performance
    parallel_instances: int = 1
    resource_blocking: List[str] = Field(default=["images", "fonts", "media"])
    cache_enabled: bool = True


class WebConnector(ConnectorInterface):
    """
    Advanced web automation connector with multiple execution modes
    
    Supports traditional RPA, AI-powered automation, and hybrid approaches
    with intelligent fallback and self-learning capabilities.
    """
    
    def __init__(self, config: WebConnectorConfig, event_bus: EventBus):
        super().__init__(config, event_bus)
        self.config: WebConnectorConfig = config
        
        # Browser management
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        
        # AI components (initialized on first use)
        self._vision_processor = None
        self._learning_engine = None
        
        # Performance tracking
        self._action_history: List[Dict] = []
        self._success_rates: Dict[str, float] = {}
    
    @property
    def connector_type(self) -> str:
        return "web"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["html", "json", "csv", "screenshot", "pdf"]
    
    # Connection Management
    
    async def connect(self) -> None:
        """Initialize browser and establish connection"""
        try:
            await self.set_status(ConnectorStatus.CONNECTING)
            
            # Initialize Playwright
            self._playwright = await async_playwright().start()
            
            # Launch browser
            browser_args = {
                "headless": self.config.headless,
                "args": self._get_browser_args()
            }
            
            if self.config.browser_type == "chromium":
                self._browser = await self._playwright.chromium.launch(**browser_args)
            elif self.config.browser_type == "firefox":
                self._browser = await self._playwright.firefox.launch(**browser_args)
            elif self.config.browser_type == "webkit":
                self._browser = await self._playwright.webkit.launch(**browser_args)
            else:
                raise AutomationError(f"Unsupported browser: {self.config.browser_type}")
            
            # Create context
            context_options = {
                "viewport": self.config.viewport,
                "user_agent": self.config.user_agent,
            }
            
            self._context = await self._browser.new_context(**context_options)
            
            # Create page
            self._page = await self._context.new_page()
            
            # Configure page settings
            await self._configure_page()
            
            # Initialize AI components if needed
            if self.config.automation_mode in [WebAutomationMode.VISION_AI, WebAutomationMode.HYBRID]:
                await self._initialize_ai_components()
            
            await self.set_status(ConnectorStatus.CONNECTED)
            self.reset_error_count()
            
        except Exception as e:
            await self.set_status(ConnectorStatus.ERROR)
            await self.handle_error(e, "connect")
            raise
    
    async def disconnect(self) -> None:
        """Close browser and cleanup resources"""
        try:
            if self._context:
                await self._context.close()
                self._context = None
                
            if self._browser:
                await self._browser.close()
                self._browser = None
                
            if self._playwright:
                await self._playwright.stop()
                self._playwright = None
            
            self._page = None
            
            await self.set_status(ConnectorStatus.DISCONNECTED)
            
        except Exception as e:
            await self.handle_error(e, "disconnect")
    
    # Data Operations
    
    async def fetch_data(
        self, 
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[DataRecord]:
        """Execute web workflow and extract data"""
        
        if not self.is_connected:
            await self.connect()
        
        workflow = self._parse_query_to_workflow(query)
        
        try:
            results = []
            
            # Navigate to start URL
            await self._navigate(workflow.start_url)
            
            # Execute workflow actions
            for i, action in enumerate(workflow.actions):
                success = await self._execute_action(action)
                
                if not success and not self.config.continue_on_error:
                    raise AutomationError(f"Action {i+1} failed: {action.type}")
                
                # Check if we've hit the limit
                if limit and len(results) >= limit:
                    break
            
            # Extract data based on extraction rules
            extracted_data = await self._extract_data(workflow.extraction_rules)
            
            # Convert to DataRecord format
            for item in extracted_data:
                record = DataRecord(
                    id=None,
                    data=item,
                    metadata={
                        "workflow": workflow.name,
                        "url": self._page.url,
                        "extraction_time": datetime.utcnow()
                    },
                    timestamp=datetime.utcnow(),
                    source=f"web:{workflow.start_url}"
                )
                results.append(record)
            
            return results
            
        except Exception as e:
            await self.handle_error(e, "fetch_data")
            raise
    
    async def fetch_data_stream(
        self, 
        query: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[DataRecord, None]:
        """Stream data from web source (for continuous monitoring)"""
        
        # Implement streaming logic for continuous data extraction
        # This could involve periodic checks, WebSocket monitoring, etc.
        
        workflow = self._parse_query_to_workflow(query)
        interval = query.get("interval", 60) if query else 60
        
        while True:
            try:
                records = await self.fetch_data(query, limit=query.get("batch_size", 10))
                
                for record in records:
                    yield record
                
                # Wait for next interval
                await asyncio.sleep(interval)
                
            except Exception as e:
                await self.handle_error(e, "fetch_data_stream")
                await asyncio.sleep(interval)  # Continue trying
    
    # AI-Powered Automation Methods
    
    async def _execute_action(self, action: WebAction) -> bool:
        """
        Execute action using the configured automation mode
        
        Returns:
            True if action succeeded, False otherwise
        """
        mode = self.config.automation_mode
        
        try:
            if mode == WebAutomationMode.TRADITIONAL:
                return await self._execute_traditional_action(action)
            elif mode == WebAutomationMode.VISION_AI:
                return await self._execute_vision_action(action)
            elif mode == WebAutomationMode.HYBRID:
                return await self._execute_hybrid_action(action)
            elif mode == WebAutomationMode.LEARNING:
                return await self._execute_learning_action(action)
            else:
                raise AutomationError(f"Unsupported automation mode: {mode}")
        
        except Exception as e:
            await self.handle_error(e, f"execute_action:{action.type}")
            return False
    
    async def _execute_traditional_action(self, action: WebAction) -> bool:
        """Execute action using traditional Playwright selectors"""
        
        try:
            if action.type == "click":
                await self._page.click(action.target, timeout=action.timeout or self.config.default_timeout)
            
            elif action.type == "type":
                await self._page.fill(action.target, action.value)
            
            elif action.type == "navigate":
                await self._page.goto(action.target)
            
            elif action.type == "wait":
                await self._page.wait_for_selector(action.target)
            
            elif action.type == "scroll":
                await self._page.evaluate(f"window.scrollTo(0, {action.value or 0})")
            
            else:
                raise AutomationError(f"Unsupported action type: {action.type}")
            
            return True
            
        except Exception:
            return False
    
    async def _execute_vision_action(self, action: WebAction) -> bool:
        """Execute action using Vision LLM"""
        
        if not self._vision_processor:
            await self._initialize_ai_components()
        
        try:
            # Take screenshot
            screenshot = await self._page.screenshot(quality=self.config.screenshot_quality)
            
            # Use Vision LLM to understand and execute action
            result = await self._vision_processor.execute_action(
                screenshot=screenshot,
                action_description=f"{action.type} {action.target or action.value or ''}",
                page_context=await self._get_page_context()
            )
            
            if result.get("success"):
                # Execute the coordinates or instructions returned by Vision LLM
                if result.get("coordinates"):
                    await self._page.click(result["coordinates"][0], result["coordinates"][1])
                
                return True
            
            return False
            
        except Exception:
            return False
    
    async def _execute_hybrid_action(self, action: WebAction) -> bool:
        """Execute action with intelligent fallback between traditional and AI"""
        
        # Try traditional first (faster and more reliable when it works)
        if self.config.prefer_traditional and action.target:
            success = await self._execute_traditional_action(action)
            if success:
                self._update_success_rate("traditional", True)
                return True
            
            self._update_success_rate("traditional", False)
        
        # Fallback to Vision AI if traditional failed or not preferred
        if self.config.vision_fallback:
            success = await self._execute_vision_action(action)
            self._update_success_rate("vision_ai", success)
            return success
        
        return False
    
    async def _execute_learning_action(self, action: WebAction) -> bool:
        """Execute action with self-learning capabilities"""
        
        # This would implement more sophisticated learning logic
        # For now, use hybrid approach with learning tracking
        
        success = await self._execute_hybrid_action(action)
        
        # Track action for learning
        self._action_history.append({
            "action": action.dict(),
            "success": success,
            "timestamp": datetime.utcnow(),
            "page_url": self._page.url,
            "page_context": await self._get_page_context()
        })
        
        return success
    
    # Helper Methods
    
    def _parse_query_to_workflow(self, query: Optional[Dict[str, Any]]) -> WebWorkflow:
        """Convert query parameters to WebWorkflow"""
        
        if not query:
            raise AutomationError("No workflow query provided")
        
        # Handle different query formats
        if "workflow" in query:
            # Direct workflow specification
            workflow_data = query["workflow"]
            return WebWorkflow(**workflow_data)
        
        elif "url" in query:
            # Simple URL-based query
            return WebWorkflow(
                name="simple_extraction",
                start_url=query["url"],
                actions=[],
                extraction_rules=query.get("extract", {})
            )
        
        else:
            raise AutomationError("Invalid query format")
    
    async def _navigate(self, url: str) -> None:
        """Navigate to URL with error handling"""
        await self._page.goto(url, timeout=self.config.navigation_timeout)
        
        # Wait for page to be ready
        await self._page.wait_for_load_state("domcontentloaded")
    
    async def _extract_data(self, extraction_rules: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract data using CSS selectors or XPath"""
        
        results = []
        
        for field_name, selector in extraction_rules.items():
            try:
                elements = await self._page.query_selector_all(selector)
                values = []
                
                for element in elements:
                    text = await element.text_content()
                    values.append(text.strip() if text else "")
                
                # If single value, don't wrap in array
                if len(values) == 1:
                    results.append({field_name: values[0]})
                else:
                    results.append({field_name: values})
                    
            except Exception as e:
                await self.handle_error(e, f"extract_data:{field_name}")
                results.append({field_name: None})
        
        return results
    
    async def _get_page_context(self) -> Dict[str, Any]:
        """Get current page context for AI processing"""
        return {
            "url": self._page.url,
            "title": await self._page.title(),
            "viewport": self.config.viewport
        }
    
    def _get_browser_args(self) -> List[str]:
        """Get browser launch arguments"""
        args = []
        
        if self.config.stealth_mode:
            args.extend([
                "--no-first-run",
                "--disable-blink-features=AutomationControlled",
                "--disable-web-security",
                "--disable-dev-shm-usage"
            ])
        
        return args
    
    async def _configure_page(self) -> None:
        """Configure page settings"""
        
        # Block resources if specified
        if self.config.resource_blocking:
            await self._page.route("**/*", self._handle_route)
        
        # Set extra headers for stealth
        if self.config.stealth_mode:
            await self._page.set_extra_http_headers({
                "Accept-Language": "en-US,en;q=0.9"
            })
    
    async def _handle_route(self, route):
        """Handle resource blocking"""
        if route.request.resource_type in self.config.resource_blocking:
            await route.abort()
        else:
            await route.continue_()
    
    async def _initialize_ai_components(self) -> None:
        """Initialize AI/Vision components"""
        # This would initialize the actual Vision LLM processors
        # For now, create placeholder
        self._vision_processor = VisionProcessor(
            provider=self.config.ai_provider,
            model_size=self.config.vision_model_size
        )
        
        if self.config.learning_enabled:
            self._learning_engine = LearningEngine()
    
    def _update_success_rate(self, method: str, success: bool) -> None:
        """Update success rate tracking"""
        if method not in self._success_rates:
            self._success_rates[method] = 0.0
        
        # Simple exponential moving average
        alpha = 0.1
        current_rate = self._success_rates[method]
        new_rate = current_rate + alpha * (1.0 if success else 0.0 - current_rate)
        self._success_rates[method] = new_rate
    
    # Schema and Metadata
    
    async def get_schema(self) -> Dict[str, Any]:
        """Get schema of current page"""
        
        if not self.is_connected:
            return {"error": "Not connected"}
        
        try:
            # Extract basic page structure
            forms = await self._page.query_selector_all("form")
            inputs = await self._page.query_selector_all("input")
            links = await self._page.query_selector_all("a")
            
            return {
                "url": self._page.url,
                "title": await self._page.title(),
                "forms": len(forms),
                "inputs": len(inputs),
                "links": len(links),
                "extractable_fields": await self._discover_extractable_fields()
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    async def _discover_extractable_fields(self) -> Dict[str, str]:
        """Automatically discover extractable fields on the page"""
        
        # Simple heuristic-based field discovery
        fields = {}
        
        # Look for common data patterns
        candidates = [
            ("titles", "h1, h2, h3, .title, .heading"),
            ("descriptions", "p, .description, .summary"),
            ("prices", ".price, .cost, .amount"),
            ("dates", ".date, .timestamp, time"),
            ("links", "a[href]"),
        ]
        
        for field_name, selector in candidates:
            try:
                elements = await self._page.query_selector_all(selector)
                if elements:
                    fields[field_name] = selector
            except:
                continue
        
        return fields


# Placeholder classes for AI components
# These would be implemented with actual Vision LLM integration

class VisionProcessor:
    def __init__(self, provider: str, model_size: str):
        self.provider = provider
        self.model_size = model_size
    
    async def execute_action(self, screenshot: bytes, action_description: str, page_context: Dict) -> Dict:
        # Placeholder for actual Vision LLM integration
        return {"success": False, "reason": "Vision LLM not implemented yet"}


class LearningEngine:
    def __init__(self):
        pass
    
    async def learn_from_action(self, action_data: Dict) -> None:
        # Placeholder for learning logic
        pass