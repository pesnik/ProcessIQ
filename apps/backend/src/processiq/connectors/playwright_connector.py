"""
Playwright Connector for ProcessIQ

Provides web automation capabilities using Microsoft Playwright.
Supports modern web scraping, form automation, and data extraction.
"""

import asyncio
import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    # Create mock classes for type hints
    class Browser: pass
    class BrowserContext: pass
    class Page: pass
    class Playwright: pass

from .rpa_base import (
    WebAutomationConnector, 
    RPAConnectorConfig, 
    RPAExecutionContext, 
    RPAExecutionResult,
    RPATaskType,
    BrowserType
)
from ..core.events import EventBus
from ..core.exceptions import ProcessIQError

import logging
logger = logging.getLogger(__name__)


class PlaywrightConnectorConfig(RPAConnectorConfig):
    """Playwright-specific configuration"""
    
    # Browser launch options
    browser_args: List[str] = []
    viewport_width: int = 1920
    viewport_height: int = 1080
    device_scale_factor: float = 1.0
    
    # Page options
    user_agent: Optional[str] = None
    accept_downloads: bool = True
    ignore_https_errors: bool = False
    
    # Performance settings
    disable_images: bool = False
    disable_javascript: bool = False
    block_resources: List[str] = []  # ['image', 'stylesheet', 'font', 'media']


class PlaywrightConnector(WebAutomationConnector):
    """
    Playwright-based web automation connector
    
    Provides modern, reliable web automation capabilities using Playwright.
    Supports multiple browsers and advanced web interactions.
    """
    
    def __init__(self, config: PlaywrightConnectorConfig, event_bus: EventBus):
        if not PLAYWRIGHT_AVAILABLE:
            raise ImportError("playwright package is required for PlaywrightConnector")
        
        super().__init__(config, event_bus)
        self.config: PlaywrightConnectorConfig = config
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # Set up directories
        if self.config.screenshots_dir:
            self.config.screenshots_dir.mkdir(parents=True, exist_ok=True)
        if self.config.downloads_dir:
            self.config.downloads_dir.mkdir(parents=True, exist_ok=True)
    
    @property
    def supported_browsers(self) -> List[str]:
        return ["chromium", "firefox", "webkit"]
    
    async def connect(self) -> None:
        """Initialize Playwright and launch browser"""
        try:
            await self.set_status(self.status.__class__.CONNECTING, "Starting Playwright")
            
            # Start Playwright
            self.playwright = await async_playwright().start()
            
            # Choose browser based on config
            if self.config.browser_type == BrowserType.CHROMIUM:
                browser_launcher = self.playwright.chromium
            elif self.config.browser_type == BrowserType.FIREFOX:
                browser_launcher = self.playwright.firefox
            elif self.config.browser_type == BrowserType.WEBKIT:
                browser_launcher = self.playwright.webkit
            else:
                browser_launcher = self.playwright.chromium
            
            # Browser launch options
            launch_options = {
                "headless": self.config.headless,
                "args": self.config.browser_args,
                "slow_mo": self.config.slow_mo,
            }
            
            if self.config.browser_path:
                launch_options["executable_path"] = self.config.browser_path
                
            if self.config.downloads_dir:
                launch_options["downloads_path"] = str(self.config.downloads_dir)
            
            # Launch browser
            self.browser = await browser_launcher.launch(**launch_options)
            
            # Create context
            context_options = {
                "viewport": {
                    "width": self.config.viewport_width,
                    "height": self.config.viewport_height
                },
                "device_scale_factor": self.config.device_scale_factor,
                "accept_downloads": self.config.accept_downloads,
                "ignore_https_errors": self.config.ignore_https_errors,
            }
            
            if self.config.user_agent:
                context_options["user_agent"] = self.config.user_agent
                
            if self.config.proxy_server:
                context_options["proxy"] = {
                    "server": self.config.proxy_server,
                    "username": self.config.proxy_username,
                    "password": self.config.proxy_password
                }
                
            self.context = await self.browser.new_context(**context_options)
            
            # Block resources if configured
            if self.config.block_resources:
                await self.context.route("**/*", self._handle_route)
            
            # Create initial page
            self.page = await self.context.new_page()
            
            # Set default timeouts
            self.page.set_default_navigation_timeout(self.config.navigation_timeout)
            self.page.set_default_timeout(self.config.element_timeout)
            
            await self.set_status(self.status.__class__.CONNECTED, "Playwright ready")
            
        except Exception as e:
            await self.handle_error(e, "Failed to connect to Playwright")
            raise
    
    async def disconnect(self) -> None:
        """Close browser and cleanup Playwright"""
        try:
            if self.page:
                await self.page.close()
                self.page = None
                
            if self.context:
                await self.context.close()
                self.context = None
                
            if self.browser:
                await self.browser.close()
                self.browser = None
                
            if self.playwright:
                await self.playwright.stop()
                self.playwright = None
                
            await self.set_status(self.status.__class__.DISCONNECTED, "Playwright disconnected")
            
        except Exception as e:
            logger.warning(f"Error during Playwright cleanup: {e}")
    
    async def _handle_route(self, route, request):
        """Handle resource blocking"""
        resource_type = request.resource_type
        if resource_type in self.config.block_resources:
            await route.abort()
        else:
            await route.continue_()
    
    async def execute_task(
        self, 
        task_type: RPATaskType, 
        parameters: Dict[str, Any], 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Execute an RPA task using Playwright"""
        start_time = time.time()
        
        try:
            if not self.is_connected:
                await self.connect()
            
            # Route to appropriate method based on task type
            if task_type == RPATaskType.WEB_SCRAPING:
                result_data = await self._scrape_web_data(parameters, context)
            elif task_type == RPATaskType.WEB_AUTOMATION:
                result_data = await self._automate_web_interaction(parameters, context)
            elif task_type == RPATaskType.FORM_FILLING:
                result_data = await self._fill_web_form(parameters, context)
            elif task_type == RPATaskType.DATA_EXTRACTION:
                result_data = await self._extract_web_data(parameters, context)
            else:
                raise ValueError(f"Unsupported task type: {task_type}")
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return RPAExecutionResult(
                task_id=context.task_id,
                success=True,
                data=result_data,
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            
            # Take screenshot on error if configured
            screenshots = []
            if self.config.screenshot_on_error and self.page:
                try:
                    screenshot_path = await self.capture_screenshot()
                    screenshots.append(screenshot_path)
                except Exception as screenshot_error:
                    logger.warning(f"Failed to capture error screenshot: {screenshot_error}")
            
            return RPAExecutionResult(
                task_id=context.task_id,
                success=False,
                error_message=str(e),
                screenshots=screenshots,
                execution_time_ms=execution_time
            )
    
    async def navigate_to_url(self, url: str, context: RPAExecutionContext) -> RPAExecutionResult:
        """Navigate to a specific URL"""
        try:
            await self.page.goto(url, timeout=context.timeout_seconds * 1000)
            return RPAExecutionResult(
                task_id=context.task_id,
                success=True,
                data={"url": url, "title": await self.page.title()}
            )
        except Exception as e:
            return RPAExecutionResult(
                task_id=context.task_id,
                success=False,
                error_message=str(e)
            )
    
    async def extract_data(
        self, 
        selectors: Dict[str, str], 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Extract data using CSS selectors"""
        try:
            extracted_data = {}
            
            for field_name, selector in selectors.items():
                try:
                    # Wait for element and extract text
                    element = await self.page.wait_for_selector(
                        selector, 
                        timeout=context.timeout_seconds * 1000
                    )
                    
                    if element:
                        text_content = await element.text_content()
                        extracted_data[field_name] = text_content.strip() if text_content else ""
                    else:
                        extracted_data[field_name] = None
                        
                except Exception as e:
                    logger.warning(f"Failed to extract {field_name} with selector {selector}: {e}")
                    extracted_data[field_name] = None
            
            return RPAExecutionResult(
                task_id=context.task_id,
                success=True,
                data=extracted_data
            )
            
        except Exception as e:
            return RPAExecutionResult(
                task_id=context.task_id,
                success=False,
                error_message=str(e)
            )
    
    async def fill_form(
        self, 
        form_data: Dict[str, Any], 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Fill out web forms"""
        try:
            filled_fields = []
            
            for field_selector, value in form_data.items():
                try:
                    # Wait for field to be available
                    await self.page.wait_for_selector(
                        field_selector, 
                        timeout=context.timeout_seconds * 1000
                    )
                    
                    # Fill the field
                    await self.page.fill(field_selector, str(value))
                    filled_fields.append(field_selector)
                    
                except Exception as e:
                    logger.warning(f"Failed to fill field {field_selector}: {e}")
            
            return RPAExecutionResult(
                task_id=context.task_id,
                success=True,
                data={"filled_fields": filled_fields, "total_fields": len(form_data)}
            )
            
        except Exception as e:
            return RPAExecutionResult(
                task_id=context.task_id,
                success=False,
                error_message=str(e)
            )
    
    async def click_element(
        self, 
        selector: str, 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Click on a web element"""
        try:
            await self.page.click(selector, timeout=context.timeout_seconds * 1000)
            return RPAExecutionResult(
                task_id=context.task_id,
                success=True,
                data={"clicked_element": selector}
            )
        except Exception as e:
            return RPAExecutionResult(
                task_id=context.task_id,
                success=False,
                error_message=str(e)
            )
    
    async def wait_for_element(
        self, 
        selector: str, 
        timeout_ms: int = 10000,
        context: Optional[RPAExecutionContext] = None
    ) -> RPAExecutionResult:
        """Wait for an element to appear"""
        try:
            element = await self.page.wait_for_selector(selector, timeout=timeout_ms)
            return RPAExecutionResult(
                task_id=context.task_id if context else "wait_for_element",
                success=True,
                data={"element_found": selector, "visible": await element.is_visible()}
            )
        except Exception as e:
            return RPAExecutionResult(
                task_id=context.task_id if context else "wait_for_element",
                success=False,
                error_message=str(e)
            )
    
    async def capture_screenshot(self, path: Optional[Path] = None) -> Path:
        """Capture screenshot of current page"""
        if not path:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            path = self.config.screenshots_dir / f"playwright_screenshot_{timestamp}.png"
        
        await self.page.screenshot(path=str(path), full_page=True)
        return path
    
    # Private methods for specific task implementations
    
    async def _scrape_web_data(
        self, 
        parameters: Dict[str, Any], 
        context: RPAExecutionContext
    ) -> Dict[str, Any]:
        """Scrape data from web pages"""
        url = parameters.get("url")
        selectors = parameters.get("selectors", {})
        
        if not url:
            raise ValueError("URL is required for web scraping")
        
        # Navigate to URL
        await self.page.goto(url)
        
        # Extract data using selectors
        extracted_data = {}
        for field_name, selector in selectors.items():
            try:
                elements = await self.page.query_selector_all(selector)
                if len(elements) == 1:
                    extracted_data[field_name] = await elements[0].text_content()
                elif len(elements) > 1:
                    extracted_data[field_name] = [
                        await elem.text_content() for elem in elements
                    ]
                else:
                    extracted_data[field_name] = None
            except Exception as e:
                logger.warning(f"Failed to extract {field_name}: {e}")
                extracted_data[field_name] = None
        
        return {
            "url": url,
            "title": await self.page.title(),
            "data": extracted_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _automate_web_interaction(
        self, 
        parameters: Dict[str, Any], 
        context: RPAExecutionContext
    ) -> Dict[str, Any]:
        """Automate web interactions"""
        actions = parameters.get("actions", [])
        results = []
        
        for action in actions:
            action_type = action.get("type")
            action_data = action.get("data", {})
            
            try:
                if action_type == "navigate":
                    await self.page.goto(action_data["url"])
                    results.append({"action": "navigate", "status": "success"})
                    
                elif action_type == "click":
                    await self.page.click(action_data["selector"])
                    results.append({"action": "click", "status": "success"})
                    
                elif action_type == "fill":
                    await self.page.fill(action_data["selector"], action_data["value"])
                    results.append({"action": "fill", "status": "success"})
                    
                elif action_type == "wait":
                    await self.page.wait_for_timeout(action_data.get("timeout", 1000))
                    results.append({"action": "wait", "status": "success"})
                    
                else:
                    results.append({"action": action_type, "status": "unsupported"})
                    
            except Exception as e:
                results.append({
                    "action": action_type, 
                    "status": "failed", 
                    "error": str(e)
                })
        
        return {"actions_executed": len(actions), "results": results}
    
    async def _fill_web_form(
        self, 
        parameters: Dict[str, Any], 
        context: RPAExecutionContext
    ) -> Dict[str, Any]:
        """Fill web forms"""
        form_selector = parameters.get("form_selector")
        form_data = parameters.get("form_data", {})
        submit_button = parameters.get("submit_button")
        
        filled_fields = []
        
        # Fill each field
        for field_selector, value in form_data.items():
            try:
                await self.page.fill(field_selector, str(value))
                filled_fields.append(field_selector)
            except Exception as e:
                logger.warning(f"Failed to fill {field_selector}: {e}")
        
        # Submit form if button provided
        submitted = False
        if submit_button:
            try:
                await self.page.click(submit_button)
                submitted = True
            except Exception as e:
                logger.warning(f"Failed to submit form: {e}")
        
        return {
            "filled_fields": filled_fields,
            "total_fields": len(form_data),
            "submitted": submitted
        }
    
    async def _extract_web_data(
        self, 
        parameters: Dict[str, Any], 
        context: RPAExecutionContext
    ) -> Dict[str, Any]:
        """Extract structured data from web pages"""
        selectors = parameters.get("selectors", {})
        format_output = parameters.get("format", "json")
        
        extracted_data = {}
        
        for field_name, selector in selectors.items():
            try:
                # Handle different selector types
                if isinstance(selector, str):
                    # Simple selector
                    element = await self.page.query_selector(selector)
                    if element:
                        extracted_data[field_name] = await element.text_content()
                    else:
                        extracted_data[field_name] = None
                        
                elif isinstance(selector, dict):
                    # Complex selector with options
                    sel = selector.get("selector")
                    attribute = selector.get("attribute", "text")
                    multiple = selector.get("multiple", False)
                    
                    if multiple:
                        elements = await self.page.query_selector_all(sel)
                        if attribute == "text":
                            extracted_data[field_name] = [
                                await elem.text_content() for elem in elements
                            ]
                        else:
                            extracted_data[field_name] = [
                                await elem.get_attribute(attribute) for elem in elements
                            ]
                    else:
                        element = await self.page.query_selector(sel)
                        if element:
                            if attribute == "text":
                                extracted_data[field_name] = await element.text_content()
                            else:
                                extracted_data[field_name] = await element.get_attribute(attribute)
                        else:
                            extracted_data[field_name] = None
                            
            except Exception as e:
                logger.warning(f"Failed to extract {field_name}: {e}")
                extracted_data[field_name] = None
        
        return {
            "extracted_data": extracted_data,
            "format": format_output,
            "extraction_time": datetime.utcnow().isoformat()
        }
    
    # Base connector interface implementations
    
    async def fetch_data(
        self, 
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List:
        """Fetch data from current page (for base connector compatibility)"""
        if not query:
            # Return basic page info
            return [{
                "url": self.page.url,
                "title": await self.page.title(),
                "content": await self.page.content()
            }]
        
        # Use query as selectors for data extraction
        selectors = query.get("selectors", {})
        extracted = {}
        
        for field, selector in selectors.items():
            try:
                element = await self.page.query_selector(selector)
                if element:
                    extracted[field] = await element.text_content()
            except Exception as e:
                logger.warning(f"Failed to extract {field}: {e}")
                extracted[field] = None
        
        return [extracted]
    
    async def fetch_data_stream(
        self, 
        query: Optional[Dict[str, Any]] = None
    ):
        """Stream data from web page"""
        data = await self.fetch_data(query)
        for record in data:
            yield record
    
    async def get_schema(self) -> Dict[str, Any]:
        """Get schema information"""
        return {
            "connector_type": "playwright",
            "capabilities": await self.get_capabilities(),
            "supported_selectors": ["css", "xpath", "text", "role"],
            "supported_browsers": self.supported_browsers
        }


# Register the connector
from .rpa_base import RPAConnectorFactory
if PLAYWRIGHT_AVAILABLE:
    RPAConnectorFactory.register("playwright", PlaywrightConnector)