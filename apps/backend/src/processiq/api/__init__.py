from fastapi import APIRouter

router = APIRouter()

# Import and include all API routers
from . import workflows, connectors, executions, system, rpa_demo, websockets, scheduler

router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
router.include_router(connectors.router, prefix="/connectors", tags=["connectors"])
router.include_router(executions.router, prefix="/executions", tags=["executions"])
router.include_router(system.router, prefix="/system", tags=["system"])
router.include_router(rpa_demo.router, prefix="/rpa", tags=["rpa-demo"])
router.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
router.include_router(websockets.router, tags=["websockets"])