from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_connectors():
    """List all available connectors"""
    return {"connectors": []}

@router.get("/categories")
async def list_connector_categories():
    """List connector categories"""
    return {
        "categories": [
            "web", "desktop", "api", "database", 
            "file", "email", "cloud", "ai", "processor", "utility"
        ]
    }