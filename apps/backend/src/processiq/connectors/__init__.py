"""
ProcessIQ Connectors Module

Provides pluggable data source connectors with support for:
- Traditional automation (Playwright/Selenium)  
- AI-powered automation (Vision LLMs)
- Hybrid approaches with intelligent fallback
- RPA workflow orchestration
"""

from .base import ConnectorInterface, ConnectorConfig, ConnectorStatus, DataRecord
from .web import WebConnector, WebAutomationMode
from .api import APIConnector
from .database import DatabaseConnector
from .file import FileConnector
from .desktop import DesktopConnector, InteractionMode, DesktopPlatform

# RPA base classes
from .rpa_base import (
    RPAConnectorInterface, 
    RPAConnectorConfig, 
    RPAExecutionContext, 
    RPAExecutionResult,
    RPATaskType,
    BrowserType,
    RPAConnectorFactory
)

# Import RPA connectors (optional)
try:
    from .playwright_connector import PlaywrightConnector, PlaywrightConnectorConfig
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PlaywrightConnector = None
    PlaywrightConnectorConfig = None
    PLAYWRIGHT_AVAILABLE = False

try:
    from .robotframework_connector import RobotFrameworkConnector, RobotFrameworkConfig
    ROBOTFRAMEWORK_AVAILABLE = True
except ImportError:
    RobotFrameworkConnector = None
    RobotFrameworkConfig = None
    ROBOTFRAMEWORK_AVAILABLE = False

__all__ = [
    # Base classes
    "ConnectorInterface",
    "ConnectorConfig", 
    "ConnectorStatus",
    "DataRecord",
    "WebConnector",
    "WebAutomationMode",
    "APIConnector",
    "DatabaseConnector",
    "FileConnector",
    "DesktopConnector",
    "InteractionMode",
    "DesktopPlatform",
    
    # RPA classes
    "RPAConnectorInterface",
    "RPAConnectorConfig",
    "RPAExecutionContext", 
    "RPAExecutionResult",
    "RPATaskType",
    "BrowserType",
    "RPAConnectorFactory",
    
    # RPA connectors (if available)
    "PlaywrightConnector",
    "PlaywrightConnectorConfig",
    "RobotFrameworkConnector", 
    "RobotFrameworkConfig",
    "PLAYWRIGHT_AVAILABLE",
    "ROBOTFRAMEWORK_AVAILABLE",
]

# Registry of available RPA connectors
RPA_CONNECTORS = {}

if PLAYWRIGHT_AVAILABLE:
    RPA_CONNECTORS["playwright"] = PlaywrightConnector

if ROBOTFRAMEWORK_AVAILABLE:
    RPA_CONNECTORS["robotframework"] = RobotFrameworkConnector


def get_available_rpa_connectors():
    """Get list of available RPA connector types"""
    return list(RPA_CONNECTORS.keys())


def create_rpa_connector(connector_type: str, config: dict, event_bus=None):
    """Factory function to create RPA connector instances"""
    if connector_type not in RPA_CONNECTORS:
        available = list(RPA_CONNECTORS.keys())
        raise ValueError(f"Unknown RPA connector type: {connector_type}. Available: {available}")
    
    connector_class = RPA_CONNECTORS[connector_type]
    
    # Create appropriate config object
    if connector_type == "playwright" and PlaywrightConnectorConfig:
        config_obj = PlaywrightConnectorConfig(**config)
    elif connector_type == "robotframework" and RobotFrameworkConfig:
        config_obj = RobotFrameworkConfig(**config)
    else:
        # Use base RPA config
        config_obj = RPAConnectorConfig(**config)
    
    return connector_class(config_obj, event_bus)