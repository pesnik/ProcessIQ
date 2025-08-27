"""
Plugin Management System

Provides a flexible, extensible architecture for ProcessIQ components:
- Dynamic plugin loading and registration
- Interface-based plugin system
- Lifecycle management
- Configuration and dependency injection
"""

import importlib
import inspect
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional, Type, TypeVar, Union

from pydantic import BaseModel

from .exceptions import PluginError
from .events import EventBus


class PluginConfig(BaseModel):
    """Base configuration for all plugins"""
    
    name: str
    version: str = "1.0.0"
    description: str = ""
    enabled: bool = True
    dependencies: List[str] = []
    config: Dict[str, Any] = {}


class PluginInterface(ABC):
    """Base interface that all plugins must implement"""
    
    def __init__(self, config: PluginConfig, event_bus: EventBus):
        self.config = config
        self.event_bus = event_bus
        self._initialized = False
    
    @property
    @abstractmethod
    def plugin_type(self) -> str:
        """Return the type of plugin (connector, processor, agent, etc.)"""
        pass
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the plugin - called once during startup"""
        pass
    
    @abstractmethod
    async def cleanup(self) -> None:
        """Cleanup resources - called during shutdown"""
        pass
    
    @property
    def is_initialized(self) -> bool:
        return self._initialized
    
    def _mark_initialized(self) -> None:
        self._initialized = True


P = TypeVar('P', bound=PluginInterface)


class PluginRegistry:
    """Registry for managing plugin instances"""
    
    def __init__(self):
        self._plugins: Dict[str, PluginInterface] = {}
        self._plugin_types: Dict[str, List[str]] = {}
    
    def register(self, plugin: PluginInterface) -> None:
        """Register a plugin instance"""
        name = plugin.config.name
        plugin_type = plugin.plugin_type
        
        if name in self._plugins:
            raise PluginError(f"Plugin '{name}' is already registered")
        
        self._plugins[name] = plugin
        
        if plugin_type not in self._plugin_types:
            self._plugin_types[plugin_type] = []
        self._plugin_types[plugin_type].append(name)
    
    def get(self, name: str) -> Optional[PluginInterface]:
        """Get plugin by name"""
        return self._plugins.get(name)
    
    def get_by_type(self, plugin_type: str) -> List[PluginInterface]:
        """Get all plugins of a specific type"""
        plugin_names = self._plugin_types.get(plugin_type, [])
        return [self._plugins[name] for name in plugin_names]
    
    def list_all(self) -> Dict[str, PluginInterface]:
        """Get all registered plugins"""
        return self._plugins.copy()
    
    def unregister(self, name: str) -> Optional[PluginInterface]:
        """Unregister a plugin"""
        plugin = self._plugins.pop(name, None)
        if plugin:
            plugin_type = plugin.plugin_type
            if plugin_type in self._plugin_types:
                self._plugin_types[plugin_type].remove(name)
        return plugin


class PluginLoader:
    """Handles dynamic loading of plugins from modules and files"""
    
    @staticmethod
    def load_from_module(module_path: str) -> List[Type[PluginInterface]]:
        """Load plugin classes from a Python module"""
        try:
            module = importlib.import_module(module_path)
            plugin_classes = []
            
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    issubclass(obj, PluginInterface) and 
                    obj != PluginInterface):
                    plugin_classes.append(obj)
            
            return plugin_classes
        except ImportError as e:
            raise PluginError(f"Failed to load module '{module_path}': {e}")
    
    @staticmethod
    def load_from_directory(directory: Union[str, Path]) -> List[Type[PluginInterface]]:
        """Load all plugins from a directory"""
        directory = Path(directory)
        if not directory.exists() or not directory.is_dir():
            raise PluginError(f"Plugin directory '{directory}' does not exist")
        
        plugin_classes = []
        
        for plugin_file in directory.glob("*.py"):
            if plugin_file.stem.startswith("_"):
                continue
                
            module_name = f"{directory.name}.{plugin_file.stem}"
            try:
                plugin_classes.extend(
                    PluginLoader.load_from_module(module_name)
                )
            except PluginError:
                continue  # Skip invalid plugin files
        
        return plugin_classes


class PluginManager:
    """Main plugin management system"""
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.registry = PluginRegistry()
        self.loader = PluginLoader()
        self._plugin_configs: Dict[str, PluginConfig] = {}
    
    def load_plugin_config(self, config_path: Union[str, Path]) -> PluginConfig:
        """Load plugin configuration from file"""
        # Implementation would load from YAML/JSON
        # For now, return a basic config
        return PluginConfig(
            name="example_plugin",
            description="Example plugin configuration"
        )
    
    def register_plugin_class(
        self, 
        plugin_class: Type[PluginInterface], 
        config: PluginConfig
    ) -> PluginInterface:
        """Register and instantiate a plugin class"""
        
        # Check dependencies
        for dep in config.dependencies:
            if not self.registry.get(dep):
                raise PluginError(f"Dependency '{dep}' not found for plugin '{config.name}'")
        
        # Create instance
        plugin = plugin_class(config, self.event_bus)
        
        # Register in registry
        self.registry.register(plugin)
        self._plugin_configs[config.name] = config
        
        return plugin
    
    async def initialize_plugin(self, plugin_name: str) -> None:
        """Initialize a specific plugin"""
        plugin = self.registry.get(plugin_name)
        if not plugin:
            raise PluginError(f"Plugin '{plugin_name}' not found")
        
        if plugin.is_initialized:
            return
        
        await plugin.initialize()
        plugin._mark_initialized()
        
        # Emit event
        await self.event_bus.emit("plugin.initialized", {
            "plugin_name": plugin_name,
            "plugin_type": plugin.plugin_type
        })
    
    async def initialize_all_plugins(self) -> None:
        """Initialize all registered plugins"""
        for plugin_name in self.registry.list_all():
            await self.initialize_plugin(plugin_name)
    
    async def cleanup_plugin(self, plugin_name: str) -> None:
        """Cleanup a specific plugin"""
        plugin = self.registry.get(plugin_name)
        if plugin and plugin.is_initialized:
            await plugin.cleanup()
            
            # Emit event
            await self.event_bus.emit("plugin.cleanup", {
                "plugin_name": plugin_name
            })
    
    async def cleanup_all_plugins(self) -> None:
        """Cleanup all plugins"""
        for plugin_name in self.registry.list_all():
            await self.cleanup_plugin(plugin_name)
    
    def get_plugin(self, name: str, plugin_type: Type[P] = None) -> Optional[P]:
        """Get a plugin with optional type checking"""
        plugin = self.registry.get(name)
        if plugin and plugin_type:
            if not isinstance(plugin, plugin_type):
                raise PluginError(f"Plugin '{name}' is not of type {plugin_type.__name__}")
        return plugin
    
    def get_plugins_by_type(self, plugin_type: str) -> List[PluginInterface]:
        """Get all plugins of a specific type"""
        return self.registry.get_by_type(plugin_type)
    
    def load_plugins_from_directory(self, directory: Union[str, Path]) -> None:
        """Load and register plugins from a directory"""
        plugin_classes = self.loader.load_from_directory(directory)
        
        for plugin_class in plugin_classes:
            # Generate basic config (in real implementation, load from file)
            config = PluginConfig(
                name=plugin_class.__name__.lower(),
                description=plugin_class.__doc__ or ""
            )
            self.register_plugin_class(plugin_class, config)
    
    def list_plugins(self) -> Dict[str, Dict[str, Any]]:
        """List all plugins with their status"""
        plugins_info = {}
        
        for name, plugin in self.registry.list_all().items():
            config = self._plugin_configs.get(name)
            plugins_info[name] = {
                "type": plugin.plugin_type,
                "initialized": plugin.is_initialized,
                "enabled": config.enabled if config else True,
                "version": config.version if config else "unknown",
                "description": config.description if config else ""
            }
        
        return plugins_info