from fastapi import APIRouter
import psutil
import platform
from datetime import datetime

router = APIRouter()

@router.get("/info")
async def get_system_info():
    """Get system information"""
    return {
        "platform": platform.system(),
        "architecture": platform.architecture()[0],
        "version": platform.version(),
        "memory": {
            "total": psutil.virtual_memory().total,
            "available": psutil.virtual_memory().available,
            "used": psutil.virtual_memory().used,
            "percent": psutil.virtual_memory().percent
        },
        "cpu": {
            "count": psutil.cpu_count(),
            "percent": psutil.cpu_percent(interval=1),
            "freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
        },
        "disk": {
            "total": psutil.disk_usage('/').total,
            "used": psutil.disk_usage('/').used,
            "free": psutil.disk_usage('/').free,
            "percent": psutil.disk_usage('/').percent
        },
        "uptime": datetime.now().isoformat(),
        "python_version": platform.python_version()
    }