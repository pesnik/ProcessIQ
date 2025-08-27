"""
Base Connector Interface

Defines the contract that all ProcessIQ connectors must implement.
This enables plug-and-play architecture for different data sources.
"""

from abc import abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, AsyncGenerator, Union
from datetime import datetime
from dataclasses import dataclass

from pydantic import BaseModel

from ..core.plugin_manager import PluginInterface, PluginConfig
from ..core.events import EventBus
from ..core.exceptions import ConnectionError, ValidationError


class ConnectorStatus(Enum):
    """Connector status enumeration"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"
    PAUSED = "paused"


@dataclass
class DataRecord:
    """Standard data record structure"""
    id: Optional[str]
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    timestamp: datetime
    source: str


class ConnectorConfig(PluginConfig):
    """Base configuration for all connectors"""
    
    # Connection settings
    connection_url: Optional[str] = None
    timeout: int = 30
    retry_attempts: int = 3
    retry_delay: float = 1.0
    
    # Authentication
    auth_type: str = "none"  # none, api_key, oauth, basic
    credentials: Dict[str, Any] = {}
    
    # Data settings
    batch_size: int = 100
    max_records: Optional[int] = None
    data_format: str = "json"  # json, csv, xml, binary
    
    # Scheduling
    schedule_enabled: bool = False
    schedule_interval: int = 3600  # seconds
    
    # Error handling
    continue_on_error: bool = True
    error_threshold: int = 10


class ConnectorInterface(PluginInterface):
    """
    Base interface for all data source connectors
    
    This abstract class defines the contract that all connectors must implement,
    enabling a plug-and-play architecture for different data sources.
    """
    
    def __init__(self, config: ConnectorConfig, event_bus: EventBus):
        super().__init__(config, event_bus)
        self.config: ConnectorConfig = config
        self.status = ConnectorStatus.DISCONNECTED
        self._connection = None
        self._error_count = 0
    
    @property
    def plugin_type(self) -> str:
        return "connector"
    
    @property
    @abstractmethod
    def connector_type(self) -> str:
        """Return the specific type of connector (web, api, database, etc.)"""
        pass
    
    @property
    @abstractmethod
    def supported_formats(self) -> List[str]:
        """Return list of supported data formats"""
        pass
    
    @property
    def is_connected(self) -> bool:
        """Check if connector is currently connected"""
        return self.status == ConnectorStatus.CONNECTED
    
    # Connection Management
    
    @abstractmethod
    async def connect(self) -> None:
        """
        Establish connection to the data source
        
        Should handle authentication, connection pooling, and initial setup.
        Must emit connection events and update status.
        """
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """
        Close connection to the data source
        
        Should clean up resources and update status.
        """
        pass
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test connection without fully connecting
        
        Returns:
            Dictionary with test results and diagnostics
        """
        try:
            await self.connect()
            result = {
                "success": True,
                "status": self.status.value,
                "message": "Connection successful",
                "response_time": None  # Could measure actual response time
            }
            await self.disconnect()
            return result
        except Exception as e:
            return {
                "success": False,
                "status": self.status.value,
                "message": str(e),
                "error_type": type(e).__name__
            }
    
    # Data Operations
    
    @abstractmethod
    async def fetch_data(
        self, 
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[DataRecord]:
        """
        Fetch data from the source
        
        Args:
            query: Query parameters specific to the connector type
            limit: Maximum number of records to return
            
        Returns:
            List of DataRecord objects
        """
        pass
    
    @abstractmethod
    async def fetch_data_stream(
        self, 
        query: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[DataRecord, None]:
        """
        Stream data from the source
        
        Args:
            query: Query parameters specific to the connector type
            
        Yields:
            DataRecord objects
        """
        pass
    
    async def validate_query(self, query: Dict[str, Any]) -> bool:
        """
        Validate query parameters
        
        Args:
            query: Query parameters to validate
            
        Returns:
            True if query is valid
            
        Raises:
            ValidationError: If query is invalid
        """
        # Base implementation - override in specific connectors
        return True
    
    # Optional: Write operations (not all connectors support this)
    
    async def write_data(
        self, 
        records: List[DataRecord],
        mode: str = "append"  # append, overwrite, update
    ) -> Dict[str, Any]:
        """
        Write data to the source (if supported)
        
        Args:
            records: Data records to write
            mode: Write mode (append, overwrite, update)
            
        Returns:
            Write operation results
        """
        raise NotImplementedError(
            f"{self.connector_type} connector does not support write operations"
        )
    
    # Metadata and Schema
    
    @abstractmethod
    async def get_schema(self) -> Dict[str, Any]:
        """
        Get schema information from the data source
        
        Returns:
            Schema information dictionary
        """
        pass
    
    async def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the data source
        
        Returns:
            Metadata information
        """
        return {
            "connector_type": self.connector_type,
            "status": self.status.value,
            "config": self.config.dict(exclude={"credentials"}),
            "supported_formats": self.supported_formats,
            "capabilities": {
                "read": True,
                "write": False,  # Override in specific connectors
                "stream": True,
                "batch": True
            }
        }
    
    # Error Handling
    
    async def handle_error(self, error: Exception, context: str = "") -> None:
        """
        Handle errors with retry logic and event emission
        
        Args:
            error: The exception that occurred
            context: Additional context about where the error occurred
        """
        self._error_count += 1
        
        await self.event_bus.emit("connector.error", {
            "connector_name": self.config.name,
            "connector_type": self.connector_type,
            "error": str(error),
            "error_type": type(error).__name__,
            "context": context,
            "error_count": self._error_count
        })
        
        # Check error threshold
        if self._error_count >= self.config.error_threshold:
            self.status = ConnectorStatus.ERROR
            await self.event_bus.emit("connector.error_threshold_exceeded", {
                "connector_name": self.config.name,
                "error_count": self._error_count
            })
            
            if not self.config.continue_on_error:
                raise ConnectionError(f"Error threshold exceeded for {self.config.name}")
    
    def reset_error_count(self) -> None:
        """Reset error counter (useful after successful operations)"""
        self._error_count = 0
    
    # Status Management
    
    async def set_status(self, status: ConnectorStatus, message: str = "") -> None:
        """Update connector status and emit event"""
        old_status = self.status
        self.status = status
        
        await self.event_bus.emit("connector.status_changed", {
            "connector_name": self.config.name,
            "old_status": old_status.value,
            "new_status": status.value,
            "message": message
        })
    
    # Lifecycle Methods (from PluginInterface)
    
    async def initialize(self) -> None:
        """Initialize the connector"""
        await self.set_status(ConnectorStatus.DISCONNECTED, "Initialized")
        self._mark_initialized()
        
        await self.event_bus.emit("connector.initialized", {
            "connector_name": self.config.name,
            "connector_type": self.connector_type
        })
    
    async def cleanup(self) -> None:
        """Cleanup connector resources"""
        if self.is_connected:
            await self.disconnect()
        
        await self.event_bus.emit("connector.cleanup", {
            "connector_name": self.config.name
        })