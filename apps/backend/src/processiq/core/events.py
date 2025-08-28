"""
Event System for ProcessIQ

Provides pub/sub event system for loose coupling between components:
- Plugin lifecycle events
- Workflow execution events  
- Data processing events
- System health events
"""

import asyncio
from typing import Any, Callable, Dict, List
from dataclasses import dataclass
from datetime import datetime

from .exceptions import ProcessIQError


@dataclass
class Event:
    """Event data structure"""
    name: str
    data: Dict[str, Any]
    timestamp: datetime
    source: str = "system"


EventHandler = Callable[[Event], None]
AsyncEventHandler = Callable[[Event], None]


class EventBus:
    """Async event bus for component communication"""
    
    def __init__(self):
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._async_handlers: Dict[str, List[AsyncEventHandler]] = {}
        self._event_history: List[Event] = []
        self._max_history = 1000
    
    def subscribe(self, event_name: str, handler: EventHandler) -> None:
        """Subscribe to an event with a synchronous handler"""
        if event_name not in self._handlers:
            self._handlers[event_name] = []
        self._handlers[event_name].append(handler)
    
    def subscribe_async(self, event_name: str, handler: AsyncEventHandler) -> None:
        """Subscribe to an event with an async handler"""
        if event_name not in self._async_handlers:
            self._async_handlers[event_name] = []
        self._async_handlers[event_name].append(handler)
    
    def unsubscribe(self, event_name: str, handler: EventHandler) -> None:
        """Unsubscribe from an event"""
        if event_name in self._handlers:
            try:
                self._handlers[event_name].remove(handler)
            except ValueError:
                pass
    
    def unsubscribe_async(self, event_name: str, handler: AsyncEventHandler) -> None:
        """Unsubscribe from an async event"""
        if event_name in self._async_handlers:
            try:
                self._async_handlers[event_name].remove(handler)
            except ValueError:
                pass
    
    async def emit(
        self, 
        event_name: str, 
        data: Dict[str, Any], 
        source: str = "system"
    ) -> None:
        """Emit an event to all subscribers"""
        
        event = Event(
            name=event_name,
            data=data,
            timestamp=datetime.utcnow(),
            source=source
        )
        
        # Store in history
        self._add_to_history(event)
        
        # Call sync handlers
        handlers = self._handlers.get(event_name, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                # Log error but don't stop other handlers
                print(f"Error in event handler: {e}")
        
        # Call async handlers
        async_handlers = self._async_handlers.get(event_name, [])
        if async_handlers:
            await asyncio.gather(*[
                self._safe_async_call(handler, event) 
                for handler in async_handlers
            ], return_exceptions=True)
    
    async def _safe_async_call(self, handler: AsyncEventHandler, event: Event) -> None:
        """Safely call async handler with error handling"""
        try:
            await handler(event)
        except Exception as e:
            # Log error but don't propagate
            print(f"Error in async event handler: {e}")
    
    def _add_to_history(self, event: Event) -> None:
        """Add event to history with size limit"""
        self._event_history.append(event)
        if len(self._event_history) > self._max_history:
            self._event_history.pop(0)
    
    def get_recent_events(self, count: int = 10) -> List[Event]:
        """Get recent events from history"""
        return self._event_history[-count:]
    
    def get_events_by_name(self, event_name: str, count: int = 10) -> List[Event]:
        """Get recent events by name"""
        matching_events = [
            event for event in self._event_history 
            if event.name == event_name
        ]
        return matching_events[-count:]
    
    def clear_history(self) -> None:
        """Clear event history"""
        self._event_history.clear()
    
    def get_subscriber_count(self, event_name: str) -> int:
        """Get number of subscribers for an event"""
        sync_count = len(self._handlers.get(event_name, []))
        async_count = len(self._async_handlers.get(event_name, []))
        return sync_count + async_count
    
    def list_events(self) -> List[str]:
        """List all event names that have subscribers"""
        all_events = set()
        all_events.update(self._handlers.keys())
        all_events.update(self._async_handlers.keys())
        return sorted(list(all_events))
    
    async def start(self) -> None:
        """Start the event bus"""
        await self.emit("system.event_bus.started", {})
    
    async def stop(self) -> None:
        """Stop the event bus"""
        await self.emit("system.event_bus.stopped", {})


# Global event bus instance
event_bus = EventBus()