"""
ProcessIQ Exception Hierarchy

Provides structured error handling across the ProcessIQ platform.
"""

from typing import Any, Dict, Optional


class ProcessIQError(Exception):
    """Base exception for all ProcessIQ errors"""
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class ConfigurationError(ProcessIQError):
    """Configuration-related errors"""
    pass


class PluginError(ProcessIQError):
    """Plugin system errors"""
    pass


class ConnectionError(ProcessIQError):
    """Data source connection errors"""
    pass


class AuthenticationError(ProcessIQError):
    """Authentication and authorization errors"""
    pass


class ValidationError(ProcessIQError):
    """Data validation errors"""
    pass


class ProcessingError(ProcessIQError):
    """Data processing and transformation errors"""
    pass


class AutomationError(ProcessIQError):
    """Web automation and RPA errors"""
    pass


class VisionError(ProcessIQError):
    """Vision/AI processing errors"""
    pass


class WorkflowError(ProcessIQError):
    """Workflow execution errors"""
    pass


class StorageError(ProcessIQError):
    """Data storage and persistence errors"""
    pass