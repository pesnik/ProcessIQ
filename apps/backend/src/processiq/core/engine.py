"""
ProcessIQ Core Engine

Main orchestration engine that coordinates all ProcessIQ components:
- Plugin lifecycle management
- Workflow execution
- Event coordination
- Resource management
"""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import Settings, get_settings
from .events import EventBus
from .exceptions import ProcessIQError
from .plugin_manager import PluginManager
from .workflow_engine import WorkflowExecutor, create_workflow_executor
from .security_features import SecurityFeatures, create_security_features


class ProcessIQEngine:
    """
    Main ProcessIQ engine that orchestrates the entire platform
    
    Responsibilities:
    - Initialize and manage plugins
    - Coordinate workflow execution
    - Handle system lifecycle
    - Manage resources and connections
    """
    
    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.event_bus = EventBus()
        self.plugin_manager = PluginManager(self.event_bus)
        self.workflow_executor = create_workflow_executor(self.event_bus)
        self.security_features = create_security_features(self.event_bus)
        
        self._initialized = False
        self._running = False
        self._tasks: List[asyncio.Task] = []
    
    @property
    def is_initialized(self) -> bool:
        """Check if engine is initialized"""
        return self._initialized
    
    @property
    def is_running(self) -> bool:
        """Check if engine is running"""
        return self._running
    
    async def initialize(self) -> None:
        """
        Initialize the ProcessIQ engine
        
        - Validate configuration
        - Set up core services
        - Load and initialize plugins
        - Start background tasks
        """
        if self._initialized:
            return
        
        try:
            await self.event_bus.emit("engine.initializing", {
                "version": self.settings.version
            })
            
            # Validate configuration
            await self._validate_configuration()
            
            # Initialize core services
            await self._initialize_core_services()
            
            # Load plugins
            await self._load_plugins()
            
            # Initialize all plugins
            await self.plugin_manager.initialize_all_plugins()
            
            # Initialize security features
            await self.security_features.initialize()
            
            # Start background tasks
            await self._start_background_tasks()
            
            self._initialized = True
            self._running = True
            
            await self.event_bus.emit("engine.initialized", {
                "plugins_count": len(self.plugin_manager.registry.list_all()),
                "environment": self.settings.environment
            })
            
        except Exception as e:
            await self.event_bus.emit("engine.initialization_failed", {
                "error": str(e)
            })
            raise ProcessIQError(f"Failed to initialize ProcessIQ engine: {e}")
    
    async def shutdown(self) -> None:
        """
        Gracefully shutdown the ProcessIQ engine
        
        - Stop background tasks
        - Cleanup plugins
        - Close connections
        - Save state
        """
        if not self._running:
            return
        
        try:
            await self.event_bus.emit("engine.shutting_down", {})
            
            # Stop background tasks
            await self._stop_background_tasks()
            
            # Cleanup plugins
            await self.plugin_manager.cleanup_all_plugins()
            
            # Close core services
            await self._cleanup_core_services()
            
            self._running = False
            
            await self.event_bus.emit("engine.shutdown_complete", {})
            
        except Exception as e:
            await self.event_bus.emit("engine.shutdown_failed", {
                "error": str(e)
            })
            raise ProcessIQError(f"Failed to shutdown ProcessIQ engine: {e}")
    
    async def reload_plugins(self) -> None:
        """Reload all plugins (useful for development)"""
        await self.event_bus.emit("engine.reloading_plugins", {})
        
        # Cleanup existing plugins
        await self.plugin_manager.cleanup_all_plugins()
        
        # Reload plugins
        await self._load_plugins()
        await self.plugin_manager.initialize_all_plugins()
        
        await self.event_bus.emit("engine.plugins_reloaded", {
            "plugins_count": len(self.plugin_manager.registry.list_all())
        })
    
    def get_plugin(self, name: str):
        """Get a plugin by name"""
        return self.plugin_manager.get_plugin(name)
    
    def get_plugins_by_type(self, plugin_type: str):
        """Get all plugins of a specific type"""
        return self.plugin_manager.get_plugins_by_type(plugin_type)
    
    async def execute_workflow(
        self, 
        workflow_definition: Dict[str, Any],
        variables: Optional[Dict[str, Any]] = None,
        triggered_by: Optional[str] = None
    ) -> str:
        """
        Execute a workflow using the professional workflow engine
        
        Args:
            workflow_definition: Complete workflow definition
            variables: Initial variables for workflow execution
            triggered_by: Source that triggered the workflow
            
        Returns:
            Execution ID
        """
        try:
            execution_id = await self.workflow_executor.execute_workflow(
                workflow_definition=workflow_definition,
                variables=variables,
                triggered_by=triggered_by
            )
            
            return execution_id
            
        except Exception as e:
            raise ProcessIQError(f"Workflow execution failed: {e}")
    
    async def get_workflow_execution_state(self, execution_id: str):
        """Get current state of workflow execution"""
        return await self.workflow_executor.state_manager.get_execution_state(execution_id)
    
    async def get_active_workflows(self) -> List[Dict[str, Any]]:
        """Get list of currently active workflow executions"""
        active_executions = []
        
        for execution_id, execution_state in self.workflow_executor.state_manager.active_executions.items():
            active_executions.append({
                "execution_id": execution_id,
                "workflow_id": execution_state.workflow_id,
                "status": execution_state.status.value,
                "started_at": execution_state.started_at.isoformat(),
                "completed_nodes": len(execution_state.completed_nodes),
                "failed_nodes": len(execution_state.failed_nodes),
                "current_nodes": list(execution_state.current_nodes)
            })
        
        return active_executions
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get current system status"""
        plugins_info = self.plugin_manager.list_plugins()
        
        return {
            "engine": {
                "initialized": self._initialized,
                "running": self._running,
                "version": self.settings.version,
                "environment": self.settings.environment
            },
            "plugins": {
                "total": len(plugins_info),
                "initialized": sum(1 for p in plugins_info.values() if p["initialized"]),
                "enabled": sum(1 for p in plugins_info.values() if p["enabled"]),
                "details": plugins_info
            },
            "events": {
                "recent_count": len(self.event_bus.get_recent_events()),
                "total_event_types": len(self.event_bus.list_events())
            },
            "configuration": {
                "ai_configured": self.settings.validate_ai_setup(),
                "debug_mode": self.settings.debug,
                "plugin_directory": self.settings.plugin_directory
            }
        }
    
    # Private methods
    
    async def _validate_configuration(self) -> None:
        """Validate system configuration"""
        # Check required directories
        plugin_dir = Path(self.settings.plugin_directory)
        data_dir = Path(self.settings.storage.data_directory)
        
        plugin_dir.mkdir(parents=True, exist_ok=True)
        data_dir.mkdir(parents=True, exist_ok=True)
        
        # Validate AI configuration if needed
        if not self.settings.validate_ai_setup():
            print("Warning: No AI services configured. Some features may be limited.")
    
    async def _initialize_core_services(self) -> None:
        """Initialize core system services"""
        # In a full implementation, this would:
        # - Set up database connections
        # - Initialize Redis connections
        # - Configure logging
        # - Set up monitoring
        pass
    
    async def _load_plugins(self) -> None:
        """Load plugins from plugin directory"""
        plugin_dir = Path(self.settings.plugin_directory)
        
        if plugin_dir.exists():
            try:
                self.plugin_manager.load_plugins_from_directory(plugin_dir)
            except Exception as e:
                print(f"Warning: Failed to load plugins from {plugin_dir}: {e}")
    
    async def _start_background_tasks(self) -> None:
        """Start background maintenance tasks"""
        # Example background tasks (implement as needed)
        # self._tasks.append(asyncio.create_task(self._health_check_loop()))
        # self._tasks.append(asyncio.create_task(self._metrics_collection_loop()))
        pass
    
    async def _stop_background_tasks(self) -> None:
        """Stop all background tasks"""
        for task in self._tasks:
            task.cancel()
        
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        
        self._tasks.clear()
    
    async def _cleanup_core_services(self) -> None:
        """Cleanup core services"""
        # Close database connections, Redis connections, etc.
        pass
    
    async def cleanup(self) -> None:
        """
        Clean up the ProcessIQ engine
        
        - Stop background tasks
        - Shutdown plugins
        - Close connections
        """
        if not self._initialized:
            return
        
        try:
            await self.event_bus.emit("engine.shutting_down", {
                "version": self.settings.version
            })
            
            # Stop background tasks
            await self._stop_background_tasks()
            
            # Shutdown plugins
            await self.plugin_manager.shutdown_all_plugins()
            
            # Cleanup core services
            await self._cleanup_core_services()
            
            self._running = False
            self._initialized = False
            
            await self.event_bus.emit("engine.shutdown", {})
            
        except Exception as e:
            print(f"Error during engine cleanup: {e}")
    
    async def shutdown(self) -> None:
        """Alias for cleanup() for backwards compatibility"""
        await self.cleanup()
    
    @asynccontextmanager
    async def lifespan(self):
        """Async context manager for engine lifespan"""
        await self.initialize()
        try:
            yield self
        finally:
            await self.shutdown()


# Convenience functions for common use cases

async def create_engine(settings: Optional[Settings] = None) -> ProcessIQEngine:
    """Create and initialize a ProcessIQ engine"""
    engine = ProcessIQEngine(settings)
    await engine.initialize()
    return engine


async def quick_start(plugin_directory: str = "./plugins") -> ProcessIQEngine:
    """Quick start ProcessIQ with minimal configuration"""
    settings = get_settings()
    settings.plugin_directory = plugin_directory
    
    return await create_engine(settings)