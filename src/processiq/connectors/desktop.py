"""
Desktop Application Connector

Advanced desktop automation supporting:
- Native Windows/macOS/Linux application control
- UI element detection and interaction
- Keyboard/mouse automation
- Screen recording and image recognition
- Process management and monitoring
- Cross-platform compatibility
"""

import asyncio
import subprocess
import time
from enum import Enum
from typing import Any, Dict, List, Optional, AsyncGenerator, Union, Tuple
from datetime import datetime
from dataclasses import dataclass
import json

try:
    import pyautogui
    import pygetwindow as gw
    import psutil
    import opencv_python as cv2
    import numpy as np
    from PIL import Image, ImageGrab
except ImportError:
    # These will be optional dependencies
    pyautogui = None
    gw = None
    psutil = None
    cv2 = None
    np = None
    Image = None
    ImageGrab = None

from pydantic import BaseModel, Field

from .base import ConnectorInterface, ConnectorConfig, DataRecord, ConnectorStatus
from ..core.events import EventBus
from ..core.exceptions import AutomationError, ConnectionError


class DesktopPlatform(Enum):
    """Supported desktop platforms"""
    WINDOWS = "windows"
    MACOS = "macos"
    LINUX = "linux"


class InteractionMode(Enum):
    """Desktop interaction modes"""
    COORDINATES = "coordinates"      # Click at specific x,y coordinates
    UI_AUTOMATION = "ui_automation"  # Use OS-specific UI automation APIs
    IMAGE_RECOGNITION = "image_recognition"  # Find elements by image matching
    AI_VISION = "ai_vision"          # Use Vision LLM to understand UI
    HYBRID = "hybrid"                # Intelligent combination of methods


class WindowState(Enum):
    """Window state options"""
    NORMAL = "normal"
    MINIMIZED = "minimized"
    MAXIMIZED = "maximized"
    FULLSCREEN = "fullscreen"


@dataclass
class DesktopAction:
    """Desktop automation action definition"""
    type: str  # click, type, key, scroll, drag, window_action, etc.
    target: Optional[str] = None  # Window title, element selector, or description
    value: Optional[str] = None   # Text to type, key combination, etc.
    coordinates: Optional[Tuple[int, int]] = None  # x, y coordinates
    image_path: Optional[str] = None  # Path to image for recognition
    timeout: int = 10  # Timeout in seconds
    retry_count: int = 3
    metadata: Dict[str, Any] = None


@dataclass
class WindowInfo:
    """Window information structure"""
    title: str
    handle: int
    pid: int
    process_name: str
    x: int
    y: int
    width: int
    height: int
    is_visible: bool
    is_active: bool
    state: WindowState


class DesktopConnectorConfig(ConnectorConfig):
    """Configuration for desktop application connector"""
    
    # Platform settings
    platform: DesktopPlatform = DesktopPlatform.WINDOWS
    interaction_mode: InteractionMode = InteractionMode.HYBRID
    
    # Automation settings
    default_delay: float = 0.1  # Delay between actions
    screenshot_on_action: bool = True
    record_session: bool = False
    
    # UI Automation settings
    element_search_timeout: int = 10
    image_match_threshold: float = 0.8
    use_fuzzy_matching: bool = True
    
    # AI Vision settings (when using AI_VISION mode)
    ai_provider: str = "qwen2.5-vl"
    vision_confidence_threshold: float = 0.7
    ai_context_screenshots: bool = True
    
    # Screen capture settings
    screenshot_format: str = "png"
    screenshot_quality: int = 90
    video_recording_fps: int = 30
    
    # Process management
    monitor_target_processes: List[str] = Field(default_factory=list)
    auto_launch_apps: Dict[str, str] = Field(default_factory=dict)
    auto_close_apps: bool = False
    
    # Safety settings
    confirm_destructive_actions: bool = True
    backup_before_changes: bool = False
    failsafe_enabled: bool = True  # PyAutoGUI failsafe
    
    # Performance
    parallel_operations: bool = False
    max_screenshot_cache: int = 50
    cleanup_temp_files: bool = True


class DesktopConnector(ConnectorInterface):
    """
    Advanced desktop application automation connector
    
    Provides comprehensive control over desktop applications using multiple
    interaction methods with intelligent fallback and AI-powered recognition.
    """
    
    def __init__(self, config: DesktopConnectorConfig, event_bus: EventBus):
        super().__init__(config, event_bus)
        self.config: DesktopConnectorConfig = config
        
        # Platform detection
        import platform
        system = platform.system().lower()
        if "windows" in system:
            self._platform = DesktopPlatform.WINDOWS
        elif "darwin" in system:
            self._platform = DesktopPlatform.MACOS
        elif "linux" in system:
            self._platform = DesktopPlatform.LINUX
        else:
            self._platform = self.config.platform
        
        # Automation components
        self._ui_automation = None
        self._vision_processor = None
        self._screen_recorder = None
        
        # State tracking
        self._active_windows: Dict[str, WindowInfo] = {}
        self._screenshot_cache: Dict[str, bytes] = {}
        self._action_history: List[DesktopAction] = []
        
        # Platform-specific initialization
        self._initialize_platform_specific()
    
    @property
    def connector_type(self) -> str:
        return "desktop"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["json", "screenshot", "video", "process_info"]
    
    # Connection Management
    
    async def connect(self) -> None:
        """Initialize desktop automation capabilities"""
        try:
            await self.set_status(ConnectorStatus.CONNECTING)
            
            # Check required dependencies
            self._check_dependencies()
            
            # Initialize PyAutoGUI settings
            if pyautogui:
                pyautogui.FAILSAFE = self.config.failsafe_enabled
                pyautogui.PAUSE = self.config.default_delay
            
            # Initialize UI automation for the platform
            await self._initialize_ui_automation()
            
            # Initialize AI vision if configured
            if self.config.interaction_mode in [InteractionMode.AI_VISION, InteractionMode.HYBRID]:
                await self._initialize_vision_processor()
            
            # Start monitoring target processes
            if self.config.monitor_target_processes:
                await self._start_process_monitoring()
            
            # Auto-launch configured applications
            for app_name, app_path in self.config.auto_launch_apps.items():
                await self._launch_application(app_name, app_path)
            
            await self.set_status(ConnectorStatus.CONNECTED)
            self.reset_error_count()
            
        except Exception as e:
            await self.set_status(ConnectorStatus.ERROR)
            await self.handle_error(e, "connect")
            raise
    
    async def disconnect(self) -> None:
        """Cleanup desktop automation resources"""
        try:
            # Stop screen recording if active
            if self._screen_recorder:
                await self._screen_recorder.stop()
            
            # Close auto-launched applications if configured
            if self.config.auto_close_apps:
                for app_name in self.config.auto_launch_apps.keys():
                    await self._close_application(app_name)
            
            # Cleanup temporary files
            if self.config.cleanup_temp_files:
                await self._cleanup_temp_files()
            
            # Clear caches
            self._screenshot_cache.clear()
            self._active_windows.clear()
            
            await self.set_status(ConnectorStatus.DISCONNECTED)
            
        except Exception as e:
            await self.handle_error(e, "disconnect")
    
    # Desktop Automation Methods
    
    async def fetch_data(
        self, 
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[DataRecord]:
        """Execute desktop automation workflow and extract data"""
        
        if not self.is_connected:
            await self.connect()
        
        try:
            workflow = self._parse_query_to_workflow(query)
            results = []
            
            # Execute workflow actions
            for i, action in enumerate(workflow.get("actions", [])):
                if limit and len(results) >= limit:
                    break
                
                try:
                    # Execute desktop action
                    action_result = await self._execute_desktop_action(action)
                    
                    # Create data record for action result
                    record = DataRecord(
                        id=f"action_{i}",
                        data=action_result,
                        metadata={
                            "workflow": workflow.get("name", "desktop_automation"),
                            "action_type": action.get("type"),
                            "timestamp": datetime.utcnow(),
                            "platform": self._platform.value
                        },
                        timestamp=datetime.utcnow(),
                        source=f"desktop:{workflow.get('target_app', 'system')}"
                    )
                    results.append(record)
                    
                except Exception as e:
                    if not self.config.continue_on_error:
                        raise AutomationError(f"Desktop action {i+1} failed: {e}")
                    
                    # Log error but continue
                    await self.handle_error(e, f"desktop_action:{action.get('type')}")
            
            # Extract additional data if specified
            if "extraction_rules" in workflow:
                extracted_data = await self._extract_desktop_data(workflow["extraction_rules"])
                results.extend(extracted_data)
            
            return results
            
        except Exception as e:
            await self.handle_error(e, "fetch_data")
            raise
    
    async def fetch_data_stream(
        self, 
        query: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[DataRecord, None]:
        """Stream desktop automation data (useful for monitoring)"""
        
        if not query:
            query = {"type": "monitor", "interval": 5}
        
        monitor_type = query.get("type", "windows")
        interval = query.get("interval", 5)
        
        while True:
            try:
                if monitor_type == "windows":
                    # Monitor active windows
                    windows = await self._get_active_windows()
                    for window in windows:
                        record = DataRecord(
                            id=f"window_{window.handle}",
                            data=window.__dict__,
                            metadata={"monitor_type": "window"},
                            timestamp=datetime.utcnow(),
                            source="desktop:windows"
                        )
                        yield record
                
                elif monitor_type == "processes":
                    # Monitor running processes
                    processes = await self._get_running_processes()
                    for proc in processes:
                        record = DataRecord(
                            id=f"process_{proc['pid']}",
                            data=proc,
                            metadata={"monitor_type": "process"},
                            timestamp=datetime.utcnow(),
                            source="desktop:processes"
                        )
                        yield record
                
                elif monitor_type == "screen":
                    # Monitor screen changes
                    screenshot = await self._take_screenshot()
                    record = DataRecord(
                        id=f"screenshot_{int(time.time())}",
                        data={"screenshot": screenshot, "timestamp": datetime.utcnow()},
                        metadata={"monitor_type": "screen"},
                        timestamp=datetime.utcnow(),
                        source="desktop:screen"
                    )
                    yield record
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                await self.handle_error(e, "fetch_data_stream")
                await asyncio.sleep(interval)
    
    # Core Desktop Automation Methods
    
    async def _execute_desktop_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a desktop automation action"""
        
        action_type = action.get("type")
        target = action.get("target")
        value = action.get("value")
        coordinates = action.get("coordinates")
        
        try:
            if action_type == "click":
                return await self._click_action(target, coordinates)
            
            elif action_type == "double_click":
                return await self._double_click_action(target, coordinates)
            
            elif action_type == "right_click":
                return await self._right_click_action(target, coordinates)
            
            elif action_type == "type":
                return await self._type_action(value, target)
            
            elif action_type == "key":
                return await self._key_action(value)
            
            elif action_type == "scroll":
                return await self._scroll_action(target, value)
            
            elif action_type == "drag":
                return await self._drag_action(action.get("from"), action.get("to"))
            
            elif action_type == "window_action":
                return await self._window_action(target, value)
            
            elif action_type == "launch_app":
                return await self._launch_application(target, value)
            
            elif action_type == "close_app":
                return await self._close_application(target)
            
            elif action_type == "screenshot":
                return await self._screenshot_action(target)
            
            elif action_type == "wait":
                return await self._wait_action(target, value)
            
            elif action_type == "find_element":
                return await self._find_element_action(target, action.get("method"))
            
            else:
                raise AutomationError(f"Unsupported desktop action: {action_type}")
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": action_type,
                "timestamp": datetime.utcnow()
            }
    
    async def _click_action(self, target: Optional[str], coordinates: Optional[Tuple[int, int]]) -> Dict[str, Any]:
        """Execute click action using different methods"""
        
        if coordinates:
            # Direct coordinate click
            if pyautogui:
                pyautogui.click(coordinates[0], coordinates[1])
                return {"success": True, "method": "coordinates", "location": coordinates}
        
        elif target:
            # Find element and click
            element_location = await self._find_element(target)
            if element_location:
                if pyautogui:
                    pyautogui.click(element_location[0], element_location[1])
                    return {"success": True, "method": "element_found", "location": element_location}
        
        # Fallback to AI vision
        if self.config.interaction_mode in [InteractionMode.AI_VISION, InteractionMode.HYBRID]:
            ai_result = await self._ai_vision_click(target)
            if ai_result.get("success"):
                return ai_result
        
        return {"success": False, "error": "Could not locate click target"}
    
    async def _type_action(self, text: str, target: Optional[str] = None) -> Dict[str, Any]:
        """Type text, optionally focusing on a specific element first"""
        
        try:
            if target:
                # Click on target element first to focus
                click_result = await self._click_action(target, None)
                if not click_result.get("success"):
                    return {"success": False, "error": "Could not focus on target element"}
                
                # Small delay to ensure focus
                await asyncio.sleep(0.2)
            
            if pyautogui:
                pyautogui.write(text, interval=0.05)  # Small delay between characters
                return {"success": True, "text": text, "method": "pyautogui"}
            else:
                return {"success": False, "error": "PyAutoGUI not available"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _key_action(self, key_combination: str) -> Dict[str, Any]:
        """Execute key combination (e.g., 'ctrl+c', 'alt+tab')"""
        
        try:
            if pyautogui:
                if '+' in key_combination:
                    # Handle key combinations
                    keys = [k.strip() for k in key_combination.split('+')]
                    pyautogui.hotkey(*keys)
                else:
                    # Single key
                    pyautogui.press(key_combination)
                
                return {"success": True, "keys": key_combination, "method": "pyautogui"}
            else:
                return {"success": False, "error": "PyAutoGUI not available"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _find_element(self, target: str) -> Optional[Tuple[int, int]]:
        """Find element using various methods"""
        
        # Method 1: Image recognition
        if self.config.interaction_mode in [InteractionMode.IMAGE_RECOGNITION, InteractionMode.HYBRID]:
            location = await self._find_by_image(target)
            if location:
                return location
        
        # Method 2: Window title/text search
        location = await self._find_by_text(target)
        if location:
            return location
        
        # Method 3: AI Vision
        if self.config.interaction_mode in [InteractionMode.AI_VISION, InteractionMode.HYBRID]:
            location = await self._find_by_ai_vision(target)
            if location:
                return location
        
        return None
    
    async def _find_by_image(self, image_path: str) -> Optional[Tuple[int, int]]:
        """Find element by image matching"""
        
        try:
            if pyautogui:
                location = pyautogui.locateOnScreen(
                    image_path, 
                    confidence=self.config.image_match_threshold
                )
                if location:
                    return pyautogui.center(location)
        except Exception:
            pass
        
        return None
    
    async def _find_by_text(self, text: str) -> Optional[Tuple[int, int]]:
        """Find element by searching for text on screen"""
        
        # This would require OCR or platform-specific UI automation
        # Placeholder implementation
        return None
    
    async def _find_by_ai_vision(self, description: str) -> Optional[Tuple[int, int]]:
        """Find element using AI vision description"""
        
        if not self._vision_processor:
            return None
        
        try:
            screenshot = await self._take_screenshot()
            result = await self._vision_processor.find_element(
                screenshot=screenshot,
                description=description,
                confidence_threshold=self.config.vision_confidence_threshold
            )
            
            if result.get("success") and result.get("coordinates"):
                return tuple(result["coordinates"])
        except Exception:
            pass
        
        return None
    
    # Window Management
    
    async def _get_active_windows(self) -> List[WindowInfo]:
        """Get list of active windows"""
        
        windows = []
        
        try:
            if gw:  # PyGetWindow available
                for window in gw.getAllWindows():
                    if window.isVisible:
                        window_info = WindowInfo(
                            title=window.title,
                            handle=window._hWnd if hasattr(window, '_hWnd') else 0,
                            pid=0,  # Would need platform-specific code
                            process_name="unknown",
                            x=window.left,
                            y=window.top,
                            width=window.width,
                            height=window.height,
                            is_visible=window.isVisible,
                            is_active=window.isActive,
                            state=WindowState.NORMAL  # Would detect actual state
                        )
                        windows.append(window_info)
        except Exception as e:
            await self.handle_error(e, "get_active_windows")
        
        return windows
    
    async def _window_action(self, window_title: str, action: str) -> Dict[str, Any]:
        """Perform action on specific window"""
        
        try:
            if not gw:
                return {"success": False, "error": "PyGetWindow not available"}
            
            windows = gw.getWindowsWithTitle(window_title)
            if not windows:
                return {"success": False, "error": f"Window not found: {window_title}"}
            
            window = windows[0]
            
            if action == "activate":
                window.activate()
            elif action == "minimize":
                window.minimize()
            elif action == "maximize":
                window.maximize()
            elif action == "restore":
                window.restore()
            elif action == "close":
                window.close()
            else:
                return {"success": False, "error": f"Unknown window action: {action}"}
            
            return {"success": True, "window": window_title, "action": action}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Process Management
    
    async def _get_running_processes(self) -> List[Dict[str, Any]]:
        """Get list of running processes"""
        
        processes = []
        
        try:
            if psutil:
                for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
                    try:
                        proc_info = proc.info
                        processes.append({
                            'pid': proc_info['pid'],
                            'name': proc_info['name'],
                            'cpu_percent': proc_info['cpu_percent'],
                            'memory_mb': proc_info['memory_info'].rss / 1024 / 1024 if proc_info['memory_info'] else 0
                        })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
        except Exception as e:
            await self.handle_error(e, "get_running_processes")
        
        return processes
    
    async def _launch_application(self, app_name: str, app_path: str) -> Dict[str, Any]:
        """Launch desktop application"""
        
        try:
            if self._platform == DesktopPlatform.WINDOWS:
                process = subprocess.Popen([app_path], shell=True)
            else:
                process = subprocess.Popen([app_path])
            
            # Wait a moment for application to start
            await asyncio.sleep(2)
            
            return {
                "success": True,
                "app_name": app_name,
                "app_path": app_path,
                "pid": process.pid
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _close_application(self, app_name: str) -> Dict[str, Any]:
        """Close desktop application"""
        
        try:
            if gw:
                windows = gw.getWindowsWithTitle(app_name)
                for window in windows:
                    window.close()
                
                return {"success": True, "app_name": app_name}
            else:
                return {"success": False, "error": "Cannot close application - PyGetWindow not available"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Screenshot and Recording
    
    async def _take_screenshot(self, region: Optional[Tuple[int, int, int, int]] = None) -> bytes:
        """Take screenshot of desktop or specific region"""
        
        try:
            if ImageGrab:
                if region:
                    screenshot = ImageGrab.grab(bbox=region)
                else:
                    screenshot = ImageGrab.grab()
                
                # Convert to bytes
                import io
                img_bytes = io.BytesIO()
                screenshot.save(img_bytes, format=self.config.screenshot_format.upper())
                return img_bytes.getvalue()
            else:
                raise AutomationError("PIL ImageGrab not available")
                
        except Exception as e:
            await self.handle_error(e, "take_screenshot")
            raise
    
    # Utility Methods
    
    def _parse_query_to_workflow(self, query: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Parse query into desktop automation workflow"""
        
        if not query:
            return {"name": "empty_workflow", "actions": []}
        
        return query
    
    def _check_dependencies(self) -> None:
        """Check if required dependencies are available"""
        
        missing_deps = []
        
        if not pyautogui:
            missing_deps.append("pyautogui")
        if not gw:
            missing_deps.append("pygetwindow")
        if not psutil:
            missing_deps.append("psutil")
        
        if missing_deps:
            raise ConnectionError(f"Missing dependencies: {', '.join(missing_deps)}")
    
    def _initialize_platform_specific(self) -> None:
        """Initialize platform-specific components"""
        
        if self._platform == DesktopPlatform.WINDOWS:
            # Initialize Windows-specific UI automation
            pass
        elif self._platform == DesktopPlatform.MACOS:
            # Initialize macOS-specific automation
            pass
        elif self._platform == DesktopPlatform.LINUX:
            # Initialize Linux-specific automation
            pass
    
    async def _initialize_ui_automation(self) -> None:
        """Initialize UI automation for the platform"""
        # Platform-specific UI automation initialization
        pass
    
    async def _initialize_vision_processor(self) -> None:
        """Initialize AI vision processor"""
        # Initialize vision processor for AI-powered element detection
        self._vision_processor = DesktopVisionProcessor(
            provider=self.config.ai_provider,
            confidence_threshold=self.config.vision_confidence_threshold
        )
    
    async def _start_process_monitoring(self) -> None:
        """Start monitoring target processes"""
        # Implementation for process monitoring
        pass
    
    async def _cleanup_temp_files(self) -> None:
        """Cleanup temporary files"""
        # Implementation for cleaning up screenshots, recordings, etc.
        pass
    
    # Schema and Metadata
    
    async def get_schema(self) -> Dict[str, Any]:
        """Get desktop environment schema"""
        
        try:
            windows = await self._get_active_windows()
            processes = await self._get_running_processes()
            
            return {
                "platform": self._platform.value,
                "interaction_mode": self.config.interaction_mode.value,
                "active_windows": len(windows),
                "running_processes": len(processes),
                "capabilities": {
                    "ui_automation": self._ui_automation is not None,
                    "vision_processing": self._vision_processor is not None,
                    "image_recognition": pyautogui is not None,
                    "process_management": psutil is not None
                },
                "supported_actions": [
                    "click", "double_click", "right_click", "type", "key",
                    "scroll", "drag", "window_action", "launch_app", "close_app",
                    "screenshot", "wait", "find_element"
                ]
            }
        except Exception as e:
            return {"error": str(e)}


# Placeholder for desktop vision processor
class DesktopVisionProcessor:
    def __init__(self, provider: str, confidence_threshold: float):
        self.provider = provider
        self.confidence_threshold = confidence_threshold
    
    async def find_element(self, screenshot: bytes, description: str, confidence_threshold: float) -> Dict:
        # Placeholder for AI vision element detection
        return {"success": False, "reason": "Desktop Vision AI not implemented yet"}
    
    async def analyze_screen(self, screenshot: bytes) -> Dict:
        # Placeholder for screen analysis
        return {"success": False, "reason": "Screen analysis not implemented yet"}