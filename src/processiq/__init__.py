"""
ProcessIQ - Intelligent Process Automation Platform

A modern RPA + AI solution combining traditional automation with intelligent agents.
Built for evolution: Traditional RPA → AI Agents → Future Technologies
"""

__version__ = "0.1.0"
__author__ = "ProcessIQ Team"

from .core import ProcessEngine
from .core.config import Settings
from .core.plugin_manager import PluginManager

__all__ = [
    "ProcessEngine", 
    "Settings", 
    "PluginManager",
    "__version__"
]