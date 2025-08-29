"""
ProcessIQ Workflow Debugger
Professional debugging integration for ProcessIQ workflows
"""

import asyncio
import json
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

from .events import EventBus
from .exceptions import ProcessIQError


class BreakpointType(Enum):
    """Types of breakpoints for debugging"""
    NODE_START = "node_start"
    NODE_END = "node_end" 
    NODE_ERROR = "node_error"
    CONDITION = "condition"
    VARIABLE_CHANGE = "variable_change"


class DebuggerState(Enum):
    """Debugger session states"""
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    STEPPED = "stepped"
    STOPPED = "stopped"


@dataclass
class Breakpoint:
    """Debugging breakpoint definition"""
    breakpoint_type: BreakpointType
    node_id: Optional[str] = None
    condition: Optional[str] = None
    variable_name: Optional[str] = None
    hit_condition: Optional[str] = None
    enabled: bool = True
    hit_count: int = 0
    
    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "breakpoint_type": self.breakpoint_type.value,
            "node_id": self.node_id,
            "condition": self.condition,
            "variable_name": self.variable_name,
            "hit_condition": self.hit_condition,
            "enabled": self.enabled,
            "hit_count": self.hit_count
        }


@dataclass
class StackFrame:
    """Debugging stack frame"""
    node_id: str
    node_name: str
    node_type: str
    variables: Dict[str, Any]
    timestamp: datetime
    
    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "node_id": self.node_id,
            "node_name": self.node_name,
            "node_type": self.node_type,
            "variables": self.variables,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class DebugSession:
    """Debug session state"""
    session_id: str
    execution_id: str
    workflow_id: str
    state: DebuggerState
    current_node_id: Optional[str]
    variables: Dict[str, Any]
    watch_expressions: Dict[str, str]
    breakpoints: Dict[str, Breakpoint]
    stack_frames: List[StackFrame]
    started_at: datetime
    paused_at: Optional[datetime] = None


@dataclass
class DebugEvent:
    """Debug event data"""
    event_id: str
    session_id: str
    event_type: str
    node_id: Optional[str]
    data: Dict[str, Any]
    timestamp: datetime


class WorkflowDebugger:
    """Professional workflow debugger with advanced debugging capabilities"""
    
    def __init__(self, event_bus: EventBus, data_dir: str = "data/debug"):
        self.event_bus = event_bus
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Active debug sessions
        self.active_sessions: Dict[str, DebugSession] = {}
        
        # Event handlers and subscribers
        self.event_handlers: List[Callable] = []
        self.breakpoint_handlers: Dict[str, Callable] = {}
        
        # Performance tracking
        self.performance_data: Dict[str, List[Dict[str, Any]]] = {}
    
    def subscribe_to_events(self, handler: Callable):
        """Subscribe to debug events"""
        self.event_handlers.append(handler)
    
    async def start_debug_session(
        self, 
        execution_id: str, 
        workflow_id: str,
        initial_breakpoints: List[Breakpoint] = None
    ) -> str:
        """Start a new debug session"""
        
        session_id = str(uuid.uuid4())
        
        breakpoints_dict = {}
        if initial_breakpoints:
            for bp in initial_breakpoints:
                bp_id = str(uuid.uuid4())
                breakpoints_dict[bp_id] = bp
        
        session = DebugSession(
            session_id=session_id,
            execution_id=execution_id,
            workflow_id=workflow_id,
            state=DebuggerState.RUNNING,
            current_node_id=None,
            variables={},
            watch_expressions={},
            breakpoints=breakpoints_dict,
            stack_frames=[],
            started_at=datetime.now()
        )
        
        self.active_sessions[session_id] = session
        
        await self._emit_debug_event(session_id, "session_started", None, {
            "execution_id": execution_id,
            "workflow_id": workflow_id
        })
        
        return session_id
    
    async def stop_debug_session(self, session_id: str):
        """Stop and cleanup debug session"""
        
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            session.state = DebuggerState.STOPPED
            
            await self._emit_debug_event(session_id, "session_stopped", None, {})
            
            # Clean up session data
            del self.active_sessions[session_id]
            if session_id in self.performance_data:
                del self.performance_data[session_id]
    
    async def get_session_info(self, session_id: str) -> Optional[DebugSession]:
        """Get debug session information"""
        return self.active_sessions.get(session_id)
    
    async def set_breakpoint(self, session_id: str, breakpoint: Breakpoint) -> str:
        """Set a breakpoint in debug session"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        breakpoint_id = str(uuid.uuid4())
        session.breakpoints[breakpoint_id] = breakpoint
        
        await self._emit_debug_event(session_id, "breakpoint_set", breakpoint.node_id, {
            "breakpoint_id": breakpoint_id,
            "breakpoint": breakpoint.dict()
        })
        
        return breakpoint_id
    
    async def remove_breakpoint(self, session_id: str, breakpoint_id: str):
        """Remove a breakpoint"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        if breakpoint_id in session.breakpoints:
            breakpoint = session.breakpoints[breakpoint_id]
            del session.breakpoints[breakpoint_id]
            
            await self._emit_debug_event(session_id, "breakpoint_removed", breakpoint.node_id, {
                "breakpoint_id": breakpoint_id
            })
    
    async def toggle_breakpoint(self, session_id: str, breakpoint_id: str):
        """Toggle breakpoint enabled/disabled state"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        if breakpoint_id in session.breakpoints:
            breakpoint = session.breakpoints[breakpoint_id]
            breakpoint.enabled = not breakpoint.enabled
            
            await self._emit_debug_event(session_id, "breakpoint_toggled", breakpoint.node_id, {
                "breakpoint_id": breakpoint_id,
                "enabled": breakpoint.enabled
            })
    
    async def check_breakpoints(
        self, 
        session_id: str, 
        node_id: str,
        breakpoint_type: BreakpointType,
        variables: Dict[str, Any],
        error_info: Dict[str, Any] = None
    ) -> bool:
        """Check if any breakpoints should be triggered"""
        
        session = self.active_sessions.get(session_id)
        if not session or session.state == DebuggerState.STOPPED:
            return False
        
        # Update session variables
        session.variables.update(variables)
        session.current_node_id = node_id
        
        # Check each breakpoint
        for bp_id, breakpoint in session.breakpoints.items():
            if not breakpoint.enabled:
                continue
            
            should_break = False
            
            # Check breakpoint type match
            if breakpoint.breakpoint_type == breakpoint_type:
                # Check node match
                if breakpoint.node_id is None or breakpoint.node_id == node_id:
                    should_break = True
            
            # Check condition if specified
            if should_break and breakpoint.condition:
                should_break = await self._evaluate_condition(breakpoint.condition, variables)
            
            # Check variable change breakpoints
            if breakpoint.breakpoint_type == BreakpointType.VARIABLE_CHANGE and breakpoint.variable_name:
                if breakpoint.variable_name in variables:
                    should_break = True
            
            if should_break:
                breakpoint.hit_count += 1
                
                # Check hit condition
                if breakpoint.hit_condition:
                    hit_condition_met = await self._evaluate_hit_condition(
                        breakpoint.hit_condition, 
                        breakpoint.hit_count
                    )
                    if not hit_condition_met:
                        continue
                
                # Pause execution
                session.state = DebuggerState.PAUSED
                session.paused_at = datetime.now()
                
                # Add stack frame
                stack_frame = StackFrame(
                    node_id=node_id,
                    node_name=f"Node {node_id}",
                    node_type="unknown",
                    variables=variables.copy(),
                    timestamp=datetime.now()
                )
                session.stack_frames.append(stack_frame)
                
                await self._emit_debug_event(session_id, "breakpoint_hit", node_id, {
                    "breakpoint_id": bp_id,
                    "breakpoint": breakpoint.dict(),
                    "variables": variables,
                    "error_info": error_info
                })
                
                return True
        
        return False
    
    async def continue_execution(self, session_id: str):
        """Continue execution from current breakpoint"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        session.state = DebuggerState.RUNNING
        session.paused_at = None
        
        await self._emit_debug_event(session_id, "execution_continued", session.current_node_id, {})
    
    async def step_execution(self, session_id: str, step_type: str = "into"):
        """Step execution (into, over, out)"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        session.state = DebuggerState.STEPPED
        
        await self._emit_debug_event(session_id, "execution_stepped", session.current_node_id, {
            "step_type": step_type
        })
        
        # After step, continue execution but pause at next opportunity
        session.state = DebuggerState.RUNNING
    
    async def add_watch_expression(self, session_id: str, expression: str, name: str = None) -> str:
        """Add a watch expression"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        watch_id = str(uuid.uuid4())
        watch_name = name or f"watch_{len(session.watch_expressions) + 1}"
        
        session.watch_expressions[watch_id] = expression
        
        await self._emit_debug_event(session_id, "watch_added", None, {
            "watch_id": watch_id,
            "expression": expression,
            "name": watch_name
        })
        
        return watch_id
    
    async def evaluate_watch_expressions(self, session_id: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate all watch expressions"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        results = {}
        
        for watch_id, expression in session.watch_expressions.items():
            try:
                # Safe evaluation of watch expression
                result = await self._evaluate_expression(expression, variables)
                results[watch_id] = {
                    "expression": expression,
                    "value": result,
                    "error": None
                }
            except Exception as e:
                results[watch_id] = {
                    "expression": expression,
                    "value": None,
                    "error": str(e)
                }
        
        return results
    
    async def get_variable_value(self, session_id: str, variable_path: str) -> Any:
        """Get the value of a specific variable"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        # Simple dot notation support
        parts = variable_path.split('.')
        value = session.variables
        
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                raise ProcessIQError(f"Variable path '{variable_path}' not found")
        
        return value
    
    async def set_variable_value(self, session_id: str, variable_path: str, new_value: Any):
        """Set the value of a variable during debugging"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        # Simple variable setting (no nested support for now)
        parts = variable_path.split('.')
        if len(parts) == 1:
            session.variables[variable_path] = new_value
        else:
            raise ProcessIQError("Nested variable setting not yet supported")
        
        await self._emit_debug_event(session_id, "variable_changed", None, {
            "variable_path": variable_path,
            "new_value": new_value
        })
    
    async def get_call_stack(self, session_id: str) -> List[StackFrame]:
        """Get the current call stack"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        return session.stack_frames
    
    async def capture_performance_data(
        self, 
        session_id: str, 
        node_id: str,
        start_time: float,
        end_time: float,
        additional_metrics: Dict[str, Any] = None
    ):
        """Capture performance data for debugging analysis"""
        
        if session_id not in self.performance_data:
            self.performance_data[session_id] = []
        
        performance_entry = {
            "node_id": node_id,
            "start_time": start_time,
            "end_time": end_time,
            "duration_ms": (end_time - start_time) * 1000,
            "timestamp": datetime.now().isoformat(),
            **(additional_metrics or {})
        }
        
        self.performance_data[session_id].append(performance_entry)
        
        await self._emit_debug_event(session_id, "performance_captured", node_id, performance_entry)
    
    async def export_debug_data(self, session_id: str, output_format: str = "json") -> str:
        """Export debug session data"""
        
        session = self.active_sessions.get(session_id)
        if not session:
            raise ProcessIQError(f"Debug session {session_id} not found")
        
        export_data = {
            "session": {
                "session_id": session.session_id,
                "execution_id": session.execution_id,
                "workflow_id": session.workflow_id,
                "started_at": session.started_at.isoformat(),
                "ended_at": datetime.now().isoformat()
            },
            "breakpoints": [bp.dict() for bp in session.breakpoints.values()],
            "stack_frames": [frame.dict() for frame in session.stack_frames],
            "variables": session.variables,
            "watch_expressions": session.watch_expressions,
            "performance_data": self.performance_data.get(session_id, [])
        }
        
        export_file = self.data_dir / f"debug_export_{session_id}_{int(time.time())}.json"
        
        with open(export_file, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)
        
        return str(export_file)
    
    # Private helper methods
    
    async def _emit_debug_event(self, session_id: str, event_type: str, node_id: Optional[str], data: Dict[str, Any]):
        """Emit a debug event"""
        
        event = DebugEvent(
            event_id=str(uuid.uuid4()),
            session_id=session_id,
            event_type=event_type,
            node_id=node_id,
            data=data,
            timestamp=datetime.now()
        )
        
        # Emit via ProcessIQ event bus
        await self.event_bus.emit("workflow.debug_event", {
            "event": asdict(event)
        })
        
        # Notify subscribers
        for handler in self.event_handlers:
            try:
                await handler(event)
            except Exception as e:
                print(f"Debug event handler error: {e}")
    
    async def _evaluate_condition(self, condition: str, variables: Dict[str, Any]) -> bool:
        """Safely evaluate a breakpoint condition"""
        # For security, we'll do very basic evaluation
        # In a production system, use a safe expression evaluator
        
        # Simple variable substitution
        for var_name, var_value in variables.items():
            condition = condition.replace(f"${{{var_name}}}", str(var_value))
        
        # Very basic condition evaluation (extend as needed)
        if "==" in condition:
            left, right = condition.split("==", 1)
            return left.strip() == right.strip()
        elif "!=" in condition:
            left, right = condition.split("!=", 1)
            return left.strip() != right.strip()
        
        return False
    
    async def _evaluate_hit_condition(self, hit_condition: str, hit_count: int) -> bool:
        """Evaluate hit condition for breakpoint"""
        
        if hit_condition.startswith(">="):
            threshold = int(hit_condition[2:].strip())
            return hit_count >= threshold
        elif hit_condition.startswith("=="):
            threshold = int(hit_condition[2:].strip())
            return hit_count == threshold
        elif hit_condition.startswith("%"):
            modulo = int(hit_condition[1:].strip())
            return hit_count % modulo == 0
        
        return True
    
    async def _evaluate_expression(self, expression: str, variables: Dict[str, Any]) -> Any:
        """Safely evaluate a watch expression"""
        # Simple variable lookup for now
        if expression in variables:
            return variables[expression]
        
        # Handle dot notation
        if "." in expression:
            parts = expression.split(".")
            value = variables
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return f"<undefined: {expression}>"
            return value
        
        return f"<undefined: {expression}>"


def create_workflow_debugger(event_bus: EventBus) -> WorkflowDebugger:
    """Factory function to create workflow debugger"""
    return WorkflowDebugger(event_bus)