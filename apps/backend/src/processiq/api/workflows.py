from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from ..core.engine import ProcessIQEngine

router = APIRouter()

# Pydantic models for API requests/responses
class WorkflowExecutionRequest(BaseModel):
    workflow_definition: Dict[str, Any]
    variables: Optional[Dict[str, Any]] = None
    triggered_by: Optional[str] = None

class WorkflowExecutionResponse(BaseModel):
    execution_id: str
    workflow_id: str
    status: str
    message: str

class WorkflowStateResponse(BaseModel):
    execution_id: str
    workflow_id: str
    status: str
    started_at: str
    completed_at: Optional[str]
    completed_nodes: int
    failed_nodes: int
    current_nodes: List[str]
    variables: Dict[str, Any]

# Dependency to get ProcessIQ engine
# In a full implementation, this would be properly injected
_engine_instance = None

async def get_engine() -> ProcessIQEngine:
    """Get ProcessIQ engine instance"""
    global _engine_instance
    if _engine_instance is None:
        from ..core.engine import create_engine
        _engine_instance = await create_engine()
    return _engine_instance

@router.get("/")
async def list_workflows(engine: ProcessIQEngine = Depends(get_engine)):
    """List all active workflow executions"""
    try:
        active_workflows = await engine.get_active_workflows()
        return {"workflows": active_workflows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(
    request: WorkflowExecutionRequest,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Execute a workflow"""
    try:
        execution_id = await engine.execute_workflow(
            workflow_definition=request.workflow_definition,
            variables=request.variables,
            triggered_by=request.triggered_by
        )
        
        workflow_id = request.workflow_definition.get('id', 'unknown')
        
        return WorkflowExecutionResponse(
            execution_id=execution_id,
            workflow_id=workflow_id,
            status="started",
            message="Workflow execution started successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/execution/{execution_id}", response_model=WorkflowStateResponse)
async def get_workflow_execution(
    execution_id: str,
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get workflow execution state"""
    try:
        execution_state = await engine.get_workflow_execution_state(execution_id)
        
        if not execution_state:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        return WorkflowStateResponse(
            execution_id=execution_state.execution_id,
            workflow_id=execution_state.workflow_id,
            status=execution_state.status.value,
            started_at=execution_state.started_at.isoformat(),
            completed_at=execution_state.completed_at.isoformat() if execution_state.completed_at else None,
            completed_nodes=len(execution_state.completed_nodes),
            failed_nodes=len(execution_state.failed_nodes),
            current_nodes=list(execution_state.current_nodes),
            variables=execution_state.variables
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get a specific workflow definition"""
    # This would typically fetch from a database
    # For now, return a placeholder
    return {
        "id": workflow_id, 
        "name": f"Workflow {workflow_id}",
        "status": "active",
        "message": "Workflow definition would be returned here"
    }

@router.get("/execution/{execution_id}/logs")
async def get_workflow_execution_logs(execution_id: str):
    """Get logs for a workflow execution"""
    # This would fetch logs from the execution
    return {
        "execution_id": execution_id,
        "logs": []
    }

@router.post("/execution/{execution_id}/pause")
async def pause_workflow_execution(execution_id: str):
    """Pause a running workflow execution"""
    # Implementation would pause the workflow
    return {"message": f"Workflow execution {execution_id} paused"}

@router.post("/execution/{execution_id}/resume") 
async def resume_workflow_execution(execution_id: str):
    """Resume a paused workflow execution"""
    # Implementation would resume the workflow
    return {"message": f"Workflow execution {execution_id} resumed"}

@router.delete("/execution/{execution_id}")
async def cancel_workflow_execution(execution_id: str):
    """Cancel a workflow execution"""
    # Implementation would cancel the workflow
    return {"message": f"Workflow execution {execution_id} cancelled"}