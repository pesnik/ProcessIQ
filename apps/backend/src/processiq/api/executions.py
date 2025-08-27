from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_executions():
    """List workflow executions"""
    return {"executions": []}

@router.get("/{execution_id}")
async def get_execution(execution_id: str):
    """Get execution details"""
    return {"id": execution_id, "status": "completed"}