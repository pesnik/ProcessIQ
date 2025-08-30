"""
ProcessIQ Debug API
REST endpoints for workflow debugging functionality
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query, Depends
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from ..core.engine import ProcessIQEngine
from ..core.workflow_debugger import BreakpointType, Breakpoint, DebugEvent

router = APIRouter()

# Pydantic models for API requests/responses
class StartDebugSessionRequest(BaseModel):
    execution_id: str
    workflow_id: str
    initial_breakpoints: Optional[List[Dict[str, Any]]] = None

class SetBreakpointRequest(BaseModel):
    breakpoint_type: str
    node_id: Optional[str] = None
    condition: Optional[str] = None
    variable_name: Optional[str] = None
    hit_condition: Optional[str] = None

class AddWatchRequest(BaseModel):
    expression: str
    name: Optional[str] = None

class SetVariableRequest(BaseModel):
    variable_path: str
    new_value: Any

class ExecuteNodeRequest(BaseModel):
    node_id: str
    node_type: str
    config: Dict[str, Any]
    input_data: Optional[Dict[str, Any]] = None

class ExecuteNodeResponse(BaseModel):
    success: bool
    output: Any
    error: Optional[str] = None
    duration_ms: int
    node_id: str
    timestamp: str

class DebugSessionResponse(BaseModel):
    session_id: str
    execution_id: str
    workflow_id: str
    state: str
    current_node_id: Optional[str]
    variables: Dict[str, Any]
    watch_expressions: Dict[str, str]
    breakpoints: List[Dict[str, Any]]
    stack_frames: List[Dict[str, Any]]
    started_at: str
    paused_at: Optional[str]

# WebSocket connection manager
class WebSocketConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            dead_connections = []
            for websocket in self.active_connections[session_id]:
                try:
                    await websocket.send_json(message)
                except:
                    dead_connections.append(websocket)
            
            for dead_ws in dead_connections:
                self.active_connections[session_id].remove(dead_ws)

ws_manager = WebSocketConnectionManager()

# Dependency to get ProcessIQ engine
async def get_engine() -> ProcessIQEngine:
    """Get ProcessIQ engine instance"""
    # This should be properly injected in production
    from ..api.workflows import get_engine as get_workflow_engine
    return await get_workflow_engine()

# Debug event handler
async def handle_debug_event(event: DebugEvent):
    """Handle debug events and broadcast to WebSocket clients"""
    await ws_manager.broadcast_to_session(
        event.session_id,
        {
            "type": event.event_type,
            "event_id": event.event_id,
            "node_id": event.node_id,
            "data": event.data,
            "timestamp": event.timestamp.isoformat()
        }
    )

@router.post("/sessions", response_model=str)
async def start_debug_session(
    request: StartDebugSessionRequest,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Start a new debugging session"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        # Convert breakpoint dictionaries to Breakpoint objects
        initial_breakpoints = []
        if request.initial_breakpoints:
            for bp_data in request.initial_breakpoints:
                breakpoint = Breakpoint(
                    breakpoint_type=BreakpointType(bp_data["breakpoint_type"]),
                    node_id=bp_data.get("node_id"),
                    condition=bp_data.get("condition"),
                    variable_name=bp_data.get("variable_name"),
                    hit_condition=bp_data.get("hit_condition")
                )
                initial_breakpoints.append(breakpoint)
        
        session_id = await debugger.start_debug_session(
            execution_id=request.execution_id,
            workflow_id=request.workflow_id,
            initial_breakpoints=initial_breakpoints
        )
        
        # Subscribe to debug events
        debugger.subscribe_to_events(handle_debug_event)
        
        return session_id
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/{session_id}", response_model=DebugSessionResponse)
async def get_debug_session(
    session_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get debug session information"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        session = await debugger.get_session_info(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Debug session not found")
        
        return DebugSessionResponse(
            session_id=session.session_id,
            execution_id=session.execution_id,
            workflow_id=session.workflow_id,
            state=session.state.value,
            current_node_id=session.current_node_id,
            variables=session.variables,
            watch_expressions=session.watch_expressions,
            breakpoints=[bp.dict() for bp in session.breakpoints.values()],
            stack_frames=[frame.dict() for frame in session.stack_frames],
            started_at=session.started_at.isoformat(),
            paused_at=session.paused_at.isoformat() if session.paused_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def stop_debug_session(
    session_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Stop a debugging session"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        await debugger.stop_debug_session(session_id)
        return {"message": "Debug session stopped"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/{session_id}/breakpoints", response_model=str)
async def set_breakpoint(
    session_id: str,
    request: SetBreakpointRequest,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Set a breakpoint in the debug session"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        breakpoint = Breakpoint(
            breakpoint_type=BreakpointType(request.breakpoint_type),
            node_id=request.node_id,
            condition=request.condition,
            variable_name=request.variable_name,
            hit_condition=request.hit_condition
        )
        
        breakpoint_id = await debugger.set_breakpoint(session_id, breakpoint)
        return breakpoint_id
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}/breakpoints/{breakpoint_id}")
async def remove_breakpoint(
    session_id: str,
    breakpoint_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Remove a breakpoint"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        await debugger.remove_breakpoint(session_id, breakpoint_id)
        return {"message": "Breakpoint removed"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/sessions/{session_id}/breakpoints/{breakpoint_id}/toggle")
async def toggle_breakpoint(
    session_id: str,
    breakpoint_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Toggle breakpoint enabled/disabled state"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        await debugger.toggle_breakpoint(session_id, breakpoint_id)
        return {"message": "Breakpoint toggled"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/{session_id}/continue")
async def continue_execution(
    session_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Continue execution from current breakpoint"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        await debugger.continue_execution(session_id)
        return {"message": "Execution continued"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/{session_id}/step")
async def step_execution(
    session_id: str,
    step_type: str = Query("into", regex="^(into|over|out)$"),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Step execution (into, over, out)"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        await debugger.step_execution(session_id, step_type)
        return {"message": f"Step {step_type} executed"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/{session_id}/watches", response_model=str)
async def add_watch_expression(
    session_id: str,
    request: AddWatchRequest,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Add a watch expression"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        watch_id = await debugger.add_watch_expression(
            session_id=session_id,
            expression=request.expression,
            name=request.name
        )
        return watch_id
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/{session_id}/watches")
async def evaluate_watch_expressions(
    session_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Evaluate all watch expressions"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        session = await debugger.get_session_info(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Debug session not found")
        
        results = await debugger.evaluate_watch_expressions(session_id, session.variables)
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}/variables/{variable_path}")
async def get_variable_value(
    session_id: str,
    variable_path: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get the value of a specific variable"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        value = await debugger.get_variable_value(session_id, variable_path)
        return {
            "variable_path": variable_path,
            "value": value,
            "type": type(value).__name__
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/sessions/{session_id}/variables")
async def set_variable_value(
    session_id: str,
    request: SetVariableRequest,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Set the value of a variable during debugging"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        await debugger.set_variable_value(
            session_id=session_id,
            variable_path=request.variable_path,
            new_value=request.new_value
        )
        return {"message": f"Variable '{request.variable_path}' updated"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/{session_id}/stack")
async def get_call_stack(
    session_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get the current call stack"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        stack_frames = await debugger.get_call_stack(session_id)
        return [frame.dict() for frame in stack_frames]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}/performance")
async def get_performance_data(
    session_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get performance data for the debug session"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        performance_data = debugger.performance_data.get(session_id, [])
        
        # Calculate summary statistics
        if performance_data:
            total_duration = sum(item["duration_ms"] for item in performance_data)
            avg_duration = total_duration / len(performance_data)
            max_duration = max(item["duration_ms"] for item in performance_data)
            min_duration = min(item["duration_ms"] for item in performance_data)
            
            summary = {
                "total_nodes": len(performance_data),
                "total_duration_ms": total_duration,
                "avg_duration_ms": avg_duration,
                "max_duration_ms": max_duration,
                "min_duration_ms": min_duration
            }
        else:
            summary = {
                "total_nodes": 0,
                "total_duration_ms": 0,
                "avg_duration_ms": 0,
                "max_duration_ms": 0,
                "min_duration_ms": 0
            }
        
        return {
            "summary": summary,
            "performance_data": performance_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/export")
async def export_debug_data(
    session_id: str,
    output_format: str = Query("json", regex="^(json)$"),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Export debug session data"""
    try:
        debugger = engine.workflow_executor.debugger
        if not debugger:
            raise HTTPException(status_code=400, detail="Debugging not enabled")
        
        export_path = await debugger.export_debug_data(session_id, output_format)
        return {
            "export_path": export_path,
            "format": output_format,
            "message": "Debug data exported successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute-node", response_model=ExecuteNodeResponse)
async def execute_single_node(
    request: ExecuteNodeRequest,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Execute a single node for debugging/testing purposes"""
    try:
        import time
        from datetime import datetime
        
        start_time = time.time()
        
        # Get the workflow executor
        executor = engine.workflow_executor
        
        # Create a minimal execution context for single node testing
        execution_context = {
            "node_id": request.node_id,
            "node_type": request.node_type,
            "config": request.config,
            "input_data": request.input_data or {},
            "variables": {},
            "execution_id": f"debug_single_{int(time.time())}",
            "workflow_id": "debug_single_node"
        }
        
        try:
            # Execute the single node
            result = await executor.execute_single_node(
                node_type=request.node_type,
                config=request.config,
                input_data=request.input_data or {},
                context=execution_context
            )
            
            end_time = time.time()
            duration_ms = int((end_time - start_time) * 1000)
            
            return ExecuteNodeResponse(
                success=True,
                output=result,
                error=None,
                duration_ms=duration_ms,
                node_id=request.node_id,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as exec_error:
            end_time = time.time()
            duration_ms = int((end_time - start_time) * 1000)
            
            return ExecuteNodeResponse(
                success=False,
                output=None,
                error=str(exec_error),
                duration_ms=duration_ms,
                node_id=request.node_id,
                timestamp=datetime.now().isoformat()
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute node: {str(e)}")

# WebSocket endpoint for real-time debugging
@router.websocket("/sessions/{session_id}/ws")
async def websocket_debug_session(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time debug session communication"""
    engine = await get_engine()
    debugger = engine.workflow_executor.debugger
    
    if not debugger:
        await websocket.close(code=4000, reason="Debugging not enabled")
        return
    
    await ws_manager.connect(websocket, session_id)
    
    try:
        # Send initial session state
        session = await debugger.get_session_info(session_id)
        if session:
            await websocket.send_json({
                "type": "session_state",
                "data": {
                    "session_id": session.session_id,
                    "state": session.state.value,
                    "current_node_id": session.current_node_id,
                    "variables": session.variables,
                    "breakpoints": [bp.dict() for bp in session.breakpoints.values()],
                    "watch_expressions": session.watch_expressions
                }
            })
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            try:
                message = eval(data) if data.startswith('{') else {"type": "ping", "data": data}
            except:
                message = {"type": "ping", "data": data}
            
            # Handle debug commands via WebSocket
            if message.get("type") == "continue":
                await debugger.continue_execution(session_id)
            elif message.get("type") == "step":
                step_type = message.get("data", {}).get("step_type", "into")
                await debugger.step_execution(session_id, step_type)
            elif message.get("type") == "set_breakpoint":
                bp_data = message.get("data", {})
                breakpoint = Breakpoint(
                    breakpoint_type=BreakpointType(bp_data["breakpoint_type"]),
                    node_id=bp_data.get("node_id"),
                    condition=bp_data.get("condition")
                )
                await debugger.set_breakpoint(session_id, breakpoint)
            else:
                # Echo back for ping/pong
                await websocket.send_json({"type": "pong", "data": data})
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, session_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket, session_id)