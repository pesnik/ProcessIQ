from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
from pathlib import Path

from .core.config import get_settings
from .core.engine import ProcessIQEngine
from .core.events import event_bus
from .api import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    settings = get_settings()
    
    # Initialize the ProcessIQ engine
    engine = ProcessIQEngine()
    await engine.initialize()
    app.state.engine = engine
    
    # Start the event bus
    await event_bus.start()
    
    yield
    
    # Cleanup
    await event_bus.stop()
    await engine.cleanup()


# Create FastAPI app
app = FastAPI(
    title="ProcessIQ API",
    description="Modern RPA + AI Automation Platform API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "0.1.0",
        "engine": "running" if hasattr(app.state, 'engine') else "initializing"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "ProcessIQ API",
        "version": "0.1.0",
        "docs": "/api/docs"
    }


def main():
    """Main entry point for the application"""
    settings = get_settings()
    
    uvicorn.run(
        "processiq.main:app",
        host=settings.api.host,
        port=settings.api.port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug"
    )


if __name__ == "__main__":
    main()