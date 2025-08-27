"""
ProcessIQ Connectors Module

Provides pluggable data source connectors with support for:
- Traditional automation (Playwright/Selenium)  
- AI-powered automation (Vision LLMs)
- Hybrid approaches with intelligent fallback
"""

from .base import ConnectorInterface, ConnectorConfig
from .web import WebConnector, WebAutomationMode
from .api import APIConnector
from .database import DatabaseConnector
from .file import FileConnector
from .desktop import DesktopConnector, InteractionMode, DesktopPlatform

__all__ = [
    "ConnectorInterface",
    "ConnectorConfig", 
    "WebConnector",
    "WebAutomationMode",
    "APIConnector",
    "DatabaseConnector",
    "FileConnector",
    "DesktopConnector",
    "InteractionMode",
    "DesktopPlatform"
]