"""
WebSocket endpoints for real-time workflow execution updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# Active WebSocket connections
active_connections: Dict[str, Set[WebSocket]] = {
    "workflows": set()
}

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "workflows": set()
        }
    
    async def connect(self, websocket: WebSocket, channel: str = "workflows"):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)
        logger.info(f"WebSocket connected to {channel}. Total connections: {len(self.active_connections[channel])}")
    
    def disconnect(self, websocket: WebSocket, channel: str = "workflows"):
        """Remove WebSocket connection"""
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
        logger.info(f"WebSocket disconnected from {channel}. Total connections: {len(self.active_connections.get(channel, set()))}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific WebSocket"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    async def broadcast(self, message: str, channel: str = "workflows"):
        """Broadcast message to all connections in channel"""
        if channel not in self.active_connections:
            return
        
        disconnected = set()
        for connection in self.active_connections[channel]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected.add(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.active_connections[channel].discard(connection)
    
    async def broadcast_json(self, data: dict, channel: str = "workflows"):
        """Broadcast JSON data to all connections in channel"""
        message = json.dumps(data)
        await self.broadcast(message, channel)

# Global connection manager
manager = ConnectionManager()

@router.websocket("/ws/workflows")
async def websocket_workflow_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time workflow execution updates
    
    Clients will receive:
    - workflow.started: When workflow execution begins
    - workflow.completed: When workflow finishes successfully  
    - workflow.failed: When workflow fails
    - node.started: When individual node starts executing
    - node.completed: When individual node completes
    - node.failed: When individual node fails
    - execution.progress: Periodic progress updates
    """
    await manager.connect(websocket, "workflows")
    
    try:
        # Send welcome message
        await manager.send_personal_message(
            json.dumps({
                "event_type": "connected",
                "message": "Connected to ProcessIQ workflow updates",
                "timestamp": asyncio.get_event_loop().time()
            }), 
            websocket
        )
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client (like ping/pong)
                data = await websocket.receive_text()
                
                # Handle client messages
                try:
                    message = json.loads(data)
                    if message.get("type") == "ping":
                        await manager.send_personal_message(
                            json.dumps({"type": "pong", "timestamp": asyncio.get_event_loop().time()}),
                            websocket
                        )
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received: {data}")
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket, "workflows")

# Helper functions for broadcasting workflow events

async def broadcast_workflow_started(execution_id: str, workflow_id: str, **kwargs):
    """Broadcast workflow started event"""
    await manager.broadcast_json({
        "event_type": "workflow_started",
        "execution_id": execution_id,
        "workflow_id": workflow_id,
        "timestamp": datetime.now().isoformat(),
        **kwargs
    })

async def broadcast_workflow_completed(execution_id: str, workflow_id: str, **kwargs):
    """Broadcast workflow completed event"""
    await manager.broadcast_json({
        "event_type": "workflow_completed", 
        "execution_id": execution_id,
        "workflow_id": workflow_id,
        "timestamp": datetime.now().isoformat(),
        **kwargs
    })

async def broadcast_workflow_failed(execution_id: str, workflow_id: str, error: str, **kwargs):
    """Broadcast workflow failed event"""
    await manager.broadcast_json({
        "event_type": "workflow_failed",
        "execution_id": execution_id,
        "workflow_id": workflow_id,
        "error": error,
        "timestamp": datetime.now().isoformat(),
        **kwargs
    })

async def broadcast_node_started(execution_id: str, node_id: str, node_type: str, **kwargs):
    """Broadcast node started event"""
    await manager.broadcast_json({
        "event_type": "node_started",
        "execution_id": execution_id,
        "node_id": node_id,
        "node_type": node_type,
        "timestamp": datetime.now().isoformat(),
        **kwargs
    })

async def broadcast_node_completed(execution_id: str, node_id: str, node_type: str, result: dict = None, **kwargs):
    """Broadcast node completed event"""
    await manager.broadcast_json({
        "event_type": "node_completed",
        "execution_id": execution_id,
        "node_id": node_id, 
        "node_type": node_type,
        "data": result,  # Changed from "result" to "data" to match frontend expectations
        "timestamp": datetime.now().isoformat(),
        **kwargs
    })

async def broadcast_node_failed(execution_id: str, node_id: str, node_type: str, error: str, **kwargs):
    """Broadcast node failed event"""
    await manager.broadcast_json({
        "event_type": "node_failed",
        "execution_id": execution_id,
        "node_id": node_id,
        "node_type": node_type, 
        "error": error,
        "timestamp": datetime.now().isoformat(),
        **kwargs
    })

async def broadcast_execution_progress(execution_id: str, state: dict, **kwargs):
    """Broadcast execution progress update"""
    await manager.broadcast_json({
        "event_type": "execution_progress",
        "execution_id": execution_id,
        "state": state,
        "timestamp": datetime.now().isoformat(),
        **kwargs
    })

async def broadcast_message(message: dict, channel: str = "workflows"):
    """Generic function to broadcast any message"""
    await manager.broadcast_json(message, channel)

# Export the manager for use in other modules
__all__ = [
    "router",
    "manager", 
    "broadcast_workflow_started",
    "broadcast_workflow_completed", 
    "broadcast_workflow_failed",
    "broadcast_node_started",
    "broadcast_node_completed",
    "broadcast_node_failed", 
    "broadcast_execution_progress",
    "broadcast_message"
]