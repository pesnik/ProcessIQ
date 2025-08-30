from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
import json
import os
from datetime import datetime
import uuid

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

# New models for workflow persistence
class WorkflowDefinitionSave(BaseModel):
    name: str
    description: Optional[str] = ""
    nodes: Dict[str, Any]
    variables: Optional[Dict[str, Any]] = {}
    triggers: Optional[List[Any]] = []
    tags: Optional[List[str]] = []

class SavedWorkflow(BaseModel):
    id: str
    name: str
    description: str
    nodes: Dict[str, Any]
    variables: Dict[str, Any]
    triggers: List[Any]
    tags: List[str]
    created_at: str
    updated_at: str
    version: int

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

# Simple file-based storage (can be replaced with database later)
WORKFLOWS_STORAGE_DIR = os.path.join(os.getcwd(), "data", "workflows")

def ensure_storage_dir():
    """Ensure storage directory exists"""
    os.makedirs(WORKFLOWS_STORAGE_DIR, exist_ok=True)

def get_workflow_file_path(workflow_id: str) -> str:
    """Get file path for a workflow"""
    return os.path.join(WORKFLOWS_STORAGE_DIR, f"{workflow_id}.json")

def load_workflow(workflow_id: str) -> Optional[SavedWorkflow]:
    """Load workflow from storage"""
    try:
        file_path = get_workflow_file_path(workflow_id)
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, 'r') as f:
            data = json.load(f)
        return SavedWorkflow(**data)
    except Exception as e:
        print(f"Error loading workflow {workflow_id}: {e}")
        return None

def save_workflow_to_storage(workflow: SavedWorkflow) -> bool:
    """Save workflow to storage"""
    try:
        ensure_storage_dir()
        file_path = get_workflow_file_path(workflow.id)
        
        with open(file_path, 'w') as f:
            json.dump(workflow.dict(), f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving workflow {workflow.id}: {e}")
        return False

def list_all_workflows() -> List[SavedWorkflow]:
    """List all saved workflows"""
    workflows = []
    try:
        ensure_storage_dir()
        for filename in os.listdir(WORKFLOWS_STORAGE_DIR):
            if filename.endswith('.json'):
                workflow_id = filename[:-5]  # Remove .json extension
                workflow = load_workflow(workflow_id)
                if workflow:
                    workflows.append(workflow)
    except Exception as e:
        print(f"Error listing workflows: {e}")
    
    return sorted(workflows, key=lambda w: w.updated_at, reverse=True)

def delete_workflow_from_storage(workflow_id: str) -> bool:
    """Delete workflow from storage"""
    try:
        file_path = get_workflow_file_path(workflow_id)
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Error deleting workflow {workflow_id}: {e}")
        return False

@router.get("/")
async def list_saved_workflows():
    """List all saved workflow definitions"""
    try:
        workflows = list_all_workflows()
        return {"workflows": [w.dict() for w in workflows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=SavedWorkflow)
async def save_new_workflow(workflow_data: WorkflowDefinitionSave):
    """Save a new workflow definition"""
    try:
        # Generate new workflow ID
        workflow_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create saved workflow
        saved_workflow = SavedWorkflow(
            id=workflow_id,
            name=workflow_data.name,
            description=workflow_data.description or "",
            nodes=workflow_data.nodes,
            variables=workflow_data.variables or {},
            triggers=workflow_data.triggers or [],
            tags=workflow_data.tags or [],
            created_at=timestamp,
            updated_at=timestamp,
            version=1
        )
        
        # Save to storage
        if not save_workflow_to_storage(saved_workflow):
            raise HTTPException(status_code=500, detail="Failed to save workflow")
        
        return saved_workflow
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/executions")
async def list_active_executions(engine: ProcessIQEngine = Depends(get_engine)):
    """List all active workflow executions"""
    try:
        active_workflows = await engine.get_active_workflows()
        return {"executions": active_workflows}
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

@router.get("/{workflow_id}", response_model=SavedWorkflow)
async def get_workflow(workflow_id: str):
    """Get a specific workflow definition"""
    workflow = load_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.put("/{workflow_id}", response_model=SavedWorkflow)
async def update_workflow(workflow_id: str, workflow_data: WorkflowDefinitionSave):
    """Update an existing workflow definition"""
    try:
        # Load existing workflow
        existing_workflow = load_workflow(workflow_id)
        if not existing_workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Update workflow
        updated_workflow = SavedWorkflow(
            id=workflow_id,
            name=workflow_data.name,
            description=workflow_data.description or "",
            nodes=workflow_data.nodes,
            variables=workflow_data.variables or {},
            triggers=workflow_data.triggers or [],
            tags=workflow_data.tags or [],
            created_at=existing_workflow.created_at,
            updated_at=datetime.now().isoformat(),
            version=existing_workflow.version + 1
        )
        
        # Save to storage
        if not save_workflow_to_storage(updated_workflow):
            raise HTTPException(status_code=500, detail="Failed to update workflow")
        
        return updated_workflow
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow definition"""
    if not delete_workflow_from_storage(workflow_id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": f"Workflow {workflow_id} deleted successfully"}

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