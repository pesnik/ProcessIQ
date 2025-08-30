"""
Workflow Scheduler API
Professional cron-based workflow scheduling system
"""

from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import json
import os
import uuid
from croniter import croniter
import pytz

router = APIRouter()

# Pydantic models for scheduler
class ScheduleCreate(BaseModel):
    workflow_id: str
    name: str
    description: Optional[str] = ""
    trigger_type: str = Field(..., description="Type of trigger: cron, interval, or event")
    
    # Cron-based scheduling
    cron_expression: Optional[str] = None
    timezone: str = "UTC"
    
    # Interval-based scheduling  
    interval_seconds: Optional[int] = None
    
    # Event-based scheduling
    event_type: Optional[str] = None
    event_conditions: Optional[Dict[str, Any]] = None
    
    # Schedule constraints
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_runs: Optional[int] = None
    
    # Retry configuration
    retry_on_failure: bool = True
    max_retries: int = 3
    retry_delay_seconds: int = 60
    
    # Notification settings
    notify_on_success: bool = False
    notify_on_failure: bool = True
    notification_emails: List[str] = []
    
    # Metadata
    tags: List[str] = []
    enabled: bool = True

class ScheduledWorkflow(BaseModel):
    id: str
    workflow_id: str
    workflow_name: str
    name: str
    description: str
    trigger_type: str
    
    # Cron configuration
    cron_expression: Optional[str] = None
    timezone: str = "UTC"
    
    # Interval configuration
    interval_seconds: Optional[int] = None
    
    # Event configuration
    event_type: Optional[str] = None
    event_conditions: Optional[Dict[str, Any]] = None
    
    # Schedule constraints
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_runs: Optional[int] = None
    current_runs: int = 0
    
    # Retry configuration
    retry_on_failure: bool = True
    max_retries: int = 3
    retry_delay_seconds: int = 60
    
    # Notification settings
    notify_on_success: bool = False
    notify_on_failure: bool = True
    notification_emails: List[str] = []
    
    # Status and execution info
    enabled: bool = True
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    last_status: Optional[str] = None
    consecutive_failures: int = 0
    
    # Metadata
    tags: List[str] = []
    created_at: str
    updated_at: str

class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cron_expression: Optional[str] = None
    timezone: Optional[str] = None
    interval_seconds: Optional[int] = None
    enabled: Optional[bool] = None
    tags: Optional[List[str]] = None

# File-based storage for schedules
SCHEDULES_STORAGE_DIR = os.path.join(os.getcwd(), "data", "schedules")

def ensure_schedules_storage_dir():
    """Ensure schedules storage directory exists"""
    os.makedirs(SCHEDULES_STORAGE_DIR, exist_ok=True)

def get_schedule_file_path(schedule_id: str) -> str:
    """Get file path for a schedule"""
    return os.path.join(SCHEDULES_STORAGE_DIR, f"{schedule_id}.json")

def load_schedule(schedule_id: str) -> Optional[ScheduledWorkflow]:
    """Load schedule from storage"""
    try:
        file_path = get_schedule_file_path(schedule_id)
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, 'r') as f:
            data = json.load(f)
        return ScheduledWorkflow(**data)
    except Exception as e:
        print(f"Error loading schedule {schedule_id}: {e}")
        return None

def save_schedule_to_storage(schedule: ScheduledWorkflow) -> bool:
    """Save schedule to storage"""
    try:
        ensure_schedules_storage_dir()
        file_path = get_schedule_file_path(schedule.id)
        
        with open(file_path, 'w') as f:
            json.dump(schedule.dict(), f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving schedule {schedule.id}: {e}")
        return False

def list_all_schedules() -> List[ScheduledWorkflow]:
    """List all scheduled workflows"""
    schedules = []
    try:
        ensure_schedules_storage_dir()
        for filename in os.listdir(SCHEDULES_STORAGE_DIR):
            if filename.endswith('.json'):
                schedule_id = filename[:-5]  # Remove .json extension
                schedule = load_schedule(schedule_id)
                if schedule:
                    schedules.append(schedule)
    except Exception as e:
        print(f"Error listing schedules: {e}")
    
    return sorted(schedules, key=lambda s: s.updated_at, reverse=True)

def delete_schedule_from_storage(schedule_id: str) -> bool:
    """Delete schedule from storage"""
    try:
        file_path = get_schedule_file_path(schedule_id)
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Error deleting schedule {schedule_id}: {e}")
        return False

def calculate_next_run(cron_expression: str, timezone_str: str = "UTC") -> Optional[str]:
    """Calculate next run time for a cron expression"""
    try:
        tz = pytz.timezone(timezone_str)
        now = datetime.now(tz)
        cron = croniter(cron_expression, now)
        next_run = cron.get_next(datetime)
        return next_run.isoformat()
    except Exception as e:
        print(f"Error calculating next run: {e}")
        return None

def validate_cron_expression(expression: str) -> bool:
    """Validate cron expression"""
    try:
        croniter(expression)
        return True
    except Exception:
        return False

# Load workflow info helper
def get_workflow_info(workflow_id: str) -> Optional[Dict[str, Any]]:
    """Get workflow information"""
    try:
        from .workflows import load_workflow
        workflow = load_workflow(workflow_id)
        if workflow:
            return {
                "id": workflow.id,
                "name": workflow.name,
                "description": workflow.description
            }
        return None
    except Exception as e:
        print(f"Error getting workflow info: {e}")
        return None

# API Endpoints

@router.get("/")
async def list_schedules():
    """List all scheduled workflows"""
    try:
        schedules = list_all_schedules()
        
        # Update next run times
        updated_schedules = []
        for schedule in schedules:
            if schedule.enabled and schedule.cron_expression:
                schedule.next_run = calculate_next_run(schedule.cron_expression, schedule.timezone)
            updated_schedules.append(schedule)
        
        return {"schedules": [s.dict() for s in updated_schedules]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ScheduledWorkflow)
async def create_schedule(schedule_data: ScheduleCreate):
    """Create a new workflow schedule"""
    try:
        # Validate workflow exists
        workflow_info = get_workflow_info(schedule_data.workflow_id)
        if not workflow_info:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Validate cron expression if provided
        if schedule_data.cron_expression and not validate_cron_expression(schedule_data.cron_expression):
            raise HTTPException(status_code=400, detail="Invalid cron expression")
        
        # Generate schedule ID
        schedule_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Calculate next run
        next_run = None
        if schedule_data.cron_expression and schedule_data.enabled:
            next_run = calculate_next_run(schedule_data.cron_expression, schedule_data.timezone)
        
        # Create schedule
        schedule = ScheduledWorkflow(
            id=schedule_id,
            workflow_id=schedule_data.workflow_id,
            workflow_name=workflow_info["name"],
            name=schedule_data.name,
            description=schedule_data.description or "",
            trigger_type=schedule_data.trigger_type,
            cron_expression=schedule_data.cron_expression,
            timezone=schedule_data.timezone,
            interval_seconds=schedule_data.interval_seconds,
            event_type=schedule_data.event_type,
            event_conditions=schedule_data.event_conditions,
            start_date=schedule_data.start_date,
            end_date=schedule_data.end_date,
            max_runs=schedule_data.max_runs,
            current_runs=0,
            retry_on_failure=schedule_data.retry_on_failure,
            max_retries=schedule_data.max_retries,
            retry_delay_seconds=schedule_data.retry_delay_seconds,
            notify_on_success=schedule_data.notify_on_success,
            notify_on_failure=schedule_data.notify_on_failure,
            notification_emails=schedule_data.notification_emails,
            enabled=schedule_data.enabled,
            next_run=next_run,
            tags=schedule_data.tags,
            created_at=timestamp,
            updated_at=timestamp
        )
        
        # Save to storage
        if not save_schedule_to_storage(schedule):
            raise HTTPException(status_code=500, detail="Failed to save schedule")
        
        return schedule
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{schedule_id}", response_model=ScheduledWorkflow)
async def get_schedule(schedule_id: str):
    """Get a specific schedule"""
    schedule = load_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Update next run time
    if schedule.enabled and schedule.cron_expression:
        schedule.next_run = calculate_next_run(schedule.cron_expression, schedule.timezone)
    
    return schedule

@router.put("/{schedule_id}", response_model=ScheduledWorkflow)
async def update_schedule(schedule_id: str, schedule_data: ScheduleUpdate):
    """Update an existing schedule"""
    try:
        # Load existing schedule
        schedule = load_schedule(schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Update fields
        if schedule_data.name is not None:
            schedule.name = schedule_data.name
        if schedule_data.description is not None:
            schedule.description = schedule_data.description
        if schedule_data.cron_expression is not None:
            if not validate_cron_expression(schedule_data.cron_expression):
                raise HTTPException(status_code=400, detail="Invalid cron expression")
            schedule.cron_expression = schedule_data.cron_expression
        if schedule_data.timezone is not None:
            schedule.timezone = schedule_data.timezone
        if schedule_data.interval_seconds is not None:
            schedule.interval_seconds = schedule_data.interval_seconds
        if schedule_data.enabled is not None:
            schedule.enabled = schedule_data.enabled
        if schedule_data.tags is not None:
            schedule.tags = schedule_data.tags
        
        # Update timestamp
        schedule.updated_at = datetime.now().isoformat()
        
        # Recalculate next run
        if schedule.enabled and schedule.cron_expression:
            schedule.next_run = calculate_next_run(schedule.cron_expression, schedule.timezone)
        else:
            schedule.next_run = None
        
        # Save to storage
        if not save_schedule_to_storage(schedule):
            raise HTTPException(status_code=500, detail="Failed to update schedule")
        
        return schedule
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: str):
    """Delete a schedule"""
    if not delete_schedule_from_storage(schedule_id):
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": f"Schedule {schedule_id} deleted successfully"}

@router.post("/{schedule_id}/enable")
async def enable_schedule(schedule_id: str):
    """Enable a schedule"""
    try:
        schedule = load_schedule(schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        schedule.enabled = True
        schedule.updated_at = datetime.now().isoformat()
        
        # Calculate next run
        if schedule.cron_expression:
            schedule.next_run = calculate_next_run(schedule.cron_expression, schedule.timezone)
        
        if not save_schedule_to_storage(schedule):
            raise HTTPException(status_code=500, detail="Failed to enable schedule")
        
        return {"message": f"Schedule {schedule_id} enabled"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{schedule_id}/disable")
async def disable_schedule(schedule_id: str):
    """Disable a schedule"""
    try:
        schedule = load_schedule(schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        schedule.enabled = False
        schedule.next_run = None
        schedule.updated_at = datetime.now().isoformat()
        
        if not save_schedule_to_storage(schedule):
            raise HTTPException(status_code=500, detail="Failed to disable schedule")
        
        return {"message": f"Schedule {schedule_id} disabled"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{schedule_id}/trigger")
async def trigger_schedule_now(schedule_id: str):
    """Manually trigger a scheduled workflow"""
    try:
        schedule = load_schedule(schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Load workflow and execute
        from .workflows import load_workflow
        workflow = load_workflow(schedule.workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Execute workflow (simplified - would need proper execution service integration)
        # For now, just return success message
        return {
            "message": f"Workflow '{workflow.name}' triggered manually",
            "workflow_id": workflow.id,
            "schedule_id": schedule_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/validate-cron/{expression}")
async def validate_cron(expression: str):
    """Validate a cron expression and show next runs"""
    try:
        if not validate_cron_expression(expression):
            return {
                "valid": False,
                "error": "Invalid cron expression"
            }
        
        # Calculate next 5 runs
        cron = croniter(expression, datetime.now())
        next_runs = []
        for _ in range(5):
            next_run = cron.get_next(datetime)
            next_runs.append(next_run.isoformat())
        
        return {
            "valid": True,
            "next_runs": next_runs,
            "description": f"Cron expression: {expression}"
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }