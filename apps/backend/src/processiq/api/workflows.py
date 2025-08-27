from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_workflows():
    """List all workflows"""
    return {"workflows": []}

@router.post("/")
async def create_workflow():
    """Create a new workflow"""
    return {"message": "Workflow created"}

@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get a specific workflow"""
    return {"id": workflow_id, "message": "Workflow details"}