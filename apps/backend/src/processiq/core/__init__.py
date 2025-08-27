"""
ProcessIQ Core Module

Contains the foundational architecture for the ProcessIQ platform:
- Plugin system for extensibility
- Configuration management
- Event system for component communication
- Base classes for automation components
"""

from .engine import ProcessEngine
from .plugin_manager import PluginManager
from .config import Settings
from .events import EventBus
from .exceptions import ProcessIQError

__all__ = [
    "ProcessEngine",
    "PluginManager", 
    "Settings",
    "EventBus",
    "ProcessIQError"
]