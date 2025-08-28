"""
RPA-Specific Connector Base Classes

Extends the base connector architecture for RPA automation tasks.
Defines interfaces for web automation, workflow orchestration, and AI-powered automation.
"""

from abc import abstractmethod
from typing import Any, Dict, List, Optional, Union, AsyncGenerator
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import asyncio
import logging

from .base import ConnectorInterface, ConnectorConfig, DataRecord
from ..core.events import EventBus
from ..core.exceptions import ProcessIQError

logger = logging.getLogger(__name__)


class RPATaskType(Enum):
    """Types of RPA tasks supported"""
    WEB_SCRAPING = "web_scraping"
    WEB_AUTOMATION = "web_automation"
    FORM_FILLING = "form_filling"
    DATA_EXTRACTION = "data_extraction"
    FILE_PROCESSING = "file_processing"
    WORKFLOW_EXECUTION = "workflow_execution"
    VISUAL_AUTOMATION = "visual_automation"
    AI_INTERACTION = "ai_interaction"


class BrowserType(Enum):
    """Supported browser types"""
    CHROMIUM = "chromium"
    FIREFOX = "firefox"
    WEBKIT = "webkit"
    CHROME = "chrome"
    EDGE = "edge"


@dataclass
class RPAExecutionContext:
    """Context for RPA task execution"""
    task_id: str
    task_type: RPATaskType
    workflow_id: Optional[str] = None
    user_id: Optional[str] = None
    browser_type: Optional[BrowserType] = BrowserType.CHROMIUM
    headless: bool = True
    screenshot_on_error: bool = True
    variables: Dict[str, Any] = field(default_factory=dict)
    timeout_seconds: int = 30
    max_retries: int = 3
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class RPAExecutionResult:
    """Result of RPA task execution"""
    task_id: str
    success: bool
    data: Any = None
    error_message: Optional[str] = None
    screenshots: List[Path] = field(default_factory=list)
    logs: List[str] = field(default_factory=list)
    artifacts: Dict[str, Path] = field(default_factory=dict)
    execution_time_ms: Optional[int] = None
    retry_count: int = 0
    completed_at: datetime = field(default_factory=datetime.utcnow)


class RPAConnectorConfig(ConnectorConfig):
    """Configuration for RPA connectors"""
    
    # Browser settings
    browser_type: BrowserType = BrowserType.CHROMIUM
    headless: bool = True
    browser_path: Optional[str] = None
    user_data_dir: Optional[Path] = None
    
    # Automation settings
    default_timeout: int = 30000  # milliseconds
    navigation_timeout: int = 30000
    element_timeout: int = 10000
    screenshot_on_error: bool = True
    slow_mo: int = 0  # milliseconds delay between actions
    
    # AI settings (for AI-powered connectors)
    ai_model: Optional[str] = None
    ai_api_key: Optional[str] = None
    use_vision: bool = False
    
    # File paths
    downloads_dir: Optional[Path] = None
    screenshots_dir: Optional[Path] = None
    workflows_dir: Optional[Path] = None
    
    # Proxy settings
    proxy_server: Optional[str] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None


class RPAConnectorInterface(ConnectorInterface):
    """Base interface for RPA automation connectors"""
    
    def __init__(self, config: RPAConnectorConfig, event_bus: EventBus):
        super().__init__(config, event_bus)
        self.config: RPAConnectorConfig = config
        self._browser_context = None
        self._page = None
    
    @property
    @abstractmethod
    def supported_tasks(self) -> List[RPATaskType]:
        """Return list of RPA task types this connector supports"""
        pass
    
    @abstractmethod
    async def execute_task(
        self, 
        task_type: RPATaskType, 
        parameters: Dict[str, Any], 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Execute an RPA task with given parameters"""
        pass
    
    async def supports_task(self, task_type: RPATaskType) -> bool:
        """Check if connector supports a specific task type"""
        return task_type in self.supported_tasks
    
    async def capture_screenshot(self, path: Optional[Path] = None) -> Path:
        """Capture screenshot of current state"""
        if not path:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            path = self.config.screenshots_dir / f"screenshot_{timestamp}.png"
        
        # Implementation depends on the specific connector
        # This is a placeholder that should be overridden
        return path
    
    async def get_capabilities(self) -> Dict[str, Any]:
        """Get detailed capabilities of this RPA connector"""
        return {
            "connector_type": self.connector_type,
            "supported_tasks": [task.value for task in self.supported_tasks],
            "browser_support": getattr(self, 'supported_browsers', []),
            "ai_enabled": hasattr(self.config, 'ai_model') and self.config.ai_model is not None,
            "visual_automation": RPATaskType.VISUAL_AUTOMATION in self.supported_tasks,
            "headless_support": True,
            "screenshot_support": True
        }


class WebAutomationConnector(RPAConnectorInterface):
    """Base class for web automation connectors (Playwright, Selenium, etc.)"""
    
    @property
    def connector_type(self) -> str:
        return "web_automation"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["html", "json", "csv", "xlsx"]
    
    @property
    def supported_tasks(self) -> List[RPATaskType]:
        return [
            RPATaskType.WEB_SCRAPING,
            RPATaskType.WEB_AUTOMATION,
            RPATaskType.FORM_FILLING,
            RPATaskType.DATA_EXTRACTION
        ]
    
    @abstractmethod
    async def navigate_to_url(self, url: str, context: RPAExecutionContext) -> RPAExecutionResult:
        """Navigate to a specific URL"""
        pass
    
    @abstractmethod
    async def extract_data(
        self, 
        selectors: Dict[str, str], 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Extract data using CSS selectors or XPath"""
        pass
    
    @abstractmethod
    async def fill_form(
        self, 
        form_data: Dict[str, Any], 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Fill out web forms"""
        pass
    
    @abstractmethod
    async def click_element(
        self, 
        selector: str, 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Click on a web element"""
        pass
    
    @abstractmethod
    async def wait_for_element(
        self, 
        selector: str, 
        timeout_ms: int = 10000,
        context: Optional[RPAExecutionContext] = None
    ) -> RPAExecutionResult:
        """Wait for an element to appear"""
        pass


class WorkflowConnector(RPAConnectorInterface):
    """Base class for workflow execution connectors (Robot Framework, etc.)"""
    
    @property
    def connector_type(self) -> str:
        return "workflow_engine"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["robot", "yaml", "json", "xml"]
    
    @property
    def supported_tasks(self) -> List[RPATaskType]:
        return [RPATaskType.WORKFLOW_EXECUTION]
    
    @abstractmethod
    async def execute_workflow(
        self, 
        workflow_path: Path, 
        variables: Dict[str, Any],
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Execute a workflow file"""
        pass
    
    @abstractmethod
    async def validate_workflow_syntax(self, workflow_path: Path) -> Dict[str, Any]:
        """Validate workflow file syntax"""
        pass
    
    @abstractmethod
    async def list_workflow_keywords(self, workflow_path: Path) -> List[str]:
        """List available keywords in a workflow"""
        pass


class AIAutomationConnector(RPAConnectorInterface):
    """Base class for AI-powered automation connectors"""
    
    @property
    def connector_type(self) -> str:
        return "ai_automation"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["json", "text", "image"]
    
    @property
    def supported_tasks(self) -> List[RPATaskType]:
        return [
            RPATaskType.AI_INTERACTION,
            RPATaskType.VISUAL_AUTOMATION,
            RPATaskType.WEB_AUTOMATION
        ]
    
    @abstractmethod
    async def interact_with_page(
        self, 
        instruction: str, 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Use AI to interact with web page based on natural language instruction"""
        pass
    
    @abstractmethod
    async def extract_data_with_ai(
        self, 
        description: str, 
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Use AI to extract data based on description"""
        pass
    
    async def analyze_screenshot(
        self, 
        screenshot_path: Path, 
        question: str
    ) -> Dict[str, Any]:
        """Analyze screenshot with AI vision capabilities"""
        # Placeholder - implement in concrete classes
        return {"analysis": "Not implemented", "confidence": 0.0}


class DataProcessingConnector(RPAConnectorInterface):
    """Base class for data processing and file operation connectors"""
    
    @property
    def connector_type(self) -> str:
        return "data_processing"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["csv", "xlsx", "json", "xml", "pdf", "txt"]
    
    @property
    def supported_tasks(self) -> List[RPATaskType]:
        return [
            RPATaskType.FILE_PROCESSING,
            RPATaskType.DATA_EXTRACTION
        ]
    
    @abstractmethod
    async def process_file(
        self, 
        file_path: Path, 
        operations: List[Dict[str, Any]],
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Process a file with specified operations"""
        pass
    
    @abstractmethod
    async def convert_format(
        self, 
        input_path: Path, 
        output_path: Path, 
        target_format: str,
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Convert file from one format to another"""
        pass
    
    @abstractmethod
    async def merge_files(
        self, 
        file_paths: List[Path], 
        output_path: Path,
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Merge multiple files into one"""
        pass


class RPAConnectorFactory:
    """Factory for creating RPA connector instances"""
    
    _connector_classes: Dict[str, type] = {}
    
    @classmethod
    def register(cls, connector_type: str, connector_class: type) -> None:
        """Register a connector class"""
        cls._connector_classes[connector_type] = connector_class
        logger.info(f"Registered RPA connector: {connector_type}")
    
    @classmethod
    def create(
        cls, 
        connector_type: str, 
        config: RPAConnectorConfig, 
        event_bus: EventBus
    ) -> RPAConnectorInterface:
        """Create a connector instance"""
        if connector_type not in cls._connector_classes:
            raise ValueError(f"Unknown connector type: {connector_type}")
        
        connector_class = cls._connector_classes[connector_type]
        return connector_class(config, event_bus)
    
    @classmethod
    def list_available(cls) -> List[str]:
        """List all available connector types"""
        return list(cls._connector_classes.keys())


# Utility functions for RPA operations
async def execute_rpa_workflow(
    connectors: List[RPAConnectorInterface],
    workflow_steps: List[Dict[str, Any]],
    context: RPAExecutionContext
) -> List[RPAExecutionResult]:
    """
    Execute a multi-step RPA workflow using multiple connectors
    """
    results = []
    
    for i, step in enumerate(workflow_steps):
        step_context = RPAExecutionContext(
            task_id=f"{context.task_id}_step_{i}",
            task_type=RPATaskType(step.get("type", "web_automation")),
            workflow_id=context.workflow_id,
            variables={**context.variables, **step.get("variables", {})}
        )
        
        # Find appropriate connector for this step
        connector = None
        for conn in connectors:
            if await conn.supports_task(step_context.task_type):
                connector = conn
                break
        
        if not connector:
            error_result = RPAExecutionResult(
                task_id=step_context.task_id,
                success=False,
                error_message=f"No connector found for task type: {step_context.task_type}"
            )
            results.append(error_result)
            break
        
        # Execute the step
        try:
            result = await connector.execute_task(
                step_context.task_type,
                step.get("parameters", {}),
                step_context
            )
            results.append(result)
            
            # If step failed and workflow should stop on error
            if not result.success and step.get("stop_on_error", True):
                break
                
        except Exception as e:
            error_result = RPAExecutionResult(
                task_id=step_context.task_id,
                success=False,
                error_message=str(e)
            )
            results.append(error_result)
            break
    
    return results


def get_connector_for_task(
    connectors: List[RPAConnectorInterface], 
    task_type: RPATaskType
) -> Optional[RPAConnectorInterface]:
    """Get the first connector that supports a specific task type"""
    for connector in connectors:
        if task_type in connector.supported_tasks:
            return connector
    return None