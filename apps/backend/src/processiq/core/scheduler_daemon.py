"""
Scheduler Daemon - Background service for executing workflows on schedule
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set
import pytz
from croniter import croniter
import json
import os
import uuid

from .engine import ProcessIQEngine, create_engine
from ..api.scheduler import load_schedule, save_schedule_to_storage, list_all_schedules, ScheduledWorkflow
from ..api.workflows import load_workflow
from ..api.websockets import broadcast_message

logger = logging.getLogger(__name__)

class ScheduleExecution:
    """Represents a single schedule execution"""
    def __init__(self, schedule_id: str, execution_id: str, started_at: datetime):
        self.schedule_id = schedule_id
        self.execution_id = execution_id
        self.started_at = started_at
        self.status = 'running'
        self.error_message: Optional[str] = None
        self.completed_at: Optional[datetime] = None
        
    def to_dict(self):
        return {
            'schedule_id': self.schedule_id,
            'execution_id': self.execution_id,
            'started_at': self.started_at.isoformat(),
            'status': self.status,
            'error_message': self.error_message,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration': (self.completed_at - self.started_at).total_seconds() if self.completed_at else None
        }

class SchedulerDaemon:
    """Background daemon that monitors schedules and executes workflows"""
    
    def __init__(self, check_interval: int = 60):
        self.check_interval = check_interval  # Check every 60 seconds
        self.running = False
        self.engine: Optional[ProcessIQEngine] = None
        self.active_executions: Dict[str, ScheduleExecution] = {}
        self.processed_schedules: Set[str] = set()  # Track processed schedule times to avoid duplicates
        
        # Storage for execution history
        self.execution_history_dir = os.path.join(os.getcwd(), "data", "schedule_executions")
        os.makedirs(self.execution_history_dir, exist_ok=True)
        
    async def start(self):
        """Start the scheduler daemon"""
        if self.running:
            logger.warning("Scheduler daemon is already running")
            return
            
        logger.info("Starting scheduler daemon...")
        self.running = True
        
        # Initialize the workflow engine
        self.engine = await create_engine()
        
        # Start the main loop
        await self._run_loop()
        
    async def stop(self):
        """Stop the scheduler daemon"""
        logger.info("Stopping scheduler daemon...")
        self.running = False
        
        # Wait for active executions to complete (with timeout)
        if self.active_executions:
            logger.info(f"Waiting for {len(self.active_executions)} active executions to complete...")
            await asyncio.wait_for(self._wait_for_executions(), timeout=300)  # 5 minute timeout
            
    async def _run_loop(self):
        """Main daemon loop"""
        while self.running:
            try:
                await self._check_schedules()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in scheduler daemon loop: {e}")
                await asyncio.sleep(self.check_interval)
                
    async def _check_schedules(self):
        """Check all schedules and execute those that are due"""
        try:
            schedules = list_all_schedules()
            current_time = datetime.now(timezone.utc)
            
            for schedule in schedules:
                if not schedule.enabled:
                    continue
                    
                if await self._should_execute_schedule(schedule, current_time):
                    await self._execute_schedule(schedule)
                    
        except Exception as e:
            logger.error(f"Error checking schedules: {e}")
            
    async def _should_execute_schedule(self, schedule: ScheduledWorkflow, current_time: datetime) -> bool:
        """Determine if a schedule should be executed now"""
        try:
            # Check max runs limit
            if schedule.max_runs and schedule.current_runs >= schedule.max_runs:
                logger.info(f"Schedule {schedule.id} has reached max runs limit")
                return False
                
            # Check date constraints
            if schedule.start_date:
                start_date = datetime.fromisoformat(schedule.start_date.replace('Z', '+00:00'))
                if current_time < start_date:
                    return False
                    
            if schedule.end_date:
                end_date = datetime.fromisoformat(schedule.end_date.replace('Z', '+00:00'))
                if current_time > end_date:
                    return False
                    
            # Handle different trigger types
            if schedule.trigger_type == 'cron' and schedule.cron_expression:
                return await self._should_execute_cron(schedule, current_time)
            elif schedule.trigger_type == 'interval' and schedule.interval_seconds:
                return await self._should_execute_interval(schedule, current_time)
                
        except Exception as e:
            logger.error(f"Error checking if schedule {schedule.id} should execute: {e}")
            
        return False
        
    async def _should_execute_cron(self, schedule: ScheduledWorkflow, current_time: datetime) -> bool:
        """Check if cron schedule should execute"""
        try:
            # Convert to schedule timezone
            tz = pytz.timezone(schedule.timezone)
            local_time = current_time.astimezone(tz)
            
            # Create cron iterator
            cron = croniter(schedule.cron_expression, local_time.replace(second=0, microsecond=0))
            
            # Get the most recent execution time that should have occurred
            prev_time = cron.get_prev(datetime)
            
            # Create unique key for this execution time
            execution_key = f"{schedule.id}:{prev_time.isoformat()}"
            
            # Check if we've already processed this execution time
            if execution_key in self.processed_schedules:
                return False
                
            # Check if this execution time is within our check interval
            time_diff = (local_time - prev_time).total_seconds()
            if 0 <= time_diff <= self.check_interval:
                self.processed_schedules.add(execution_key)
                return True
                
        except Exception as e:
            logger.error(f"Error checking cron schedule {schedule.id}: {e}")
            
        return False
        
    async def _should_execute_interval(self, schedule: ScheduledWorkflow, current_time: datetime) -> bool:
        """Check if interval schedule should execute"""
        try:
            if not schedule.last_run:
                return True  # First run
                
            last_run = datetime.fromisoformat(schedule.last_run.replace('Z', '+00:00'))
            time_since_last = (current_time - last_run).total_seconds()
            
            return time_since_last >= schedule.interval_seconds
            
        except Exception as e:
            logger.error(f"Error checking interval schedule {schedule.id}: {e}")
            
        return False
        
    async def _execute_schedule(self, schedule: ScheduledWorkflow):
        """Execute a scheduled workflow"""
        execution_id = str(uuid.uuid4())
        
        try:
            logger.info(f"Executing schedule {schedule.id}: {schedule.name}")
            
            # Load the workflow
            workflow = load_workflow(schedule.workflow_id)
            if not workflow:
                raise Exception(f"Workflow {schedule.workflow_id} not found")
                
            # Create execution record
            execution = ScheduleExecution(
                schedule_id=schedule.id,
                execution_id=execution_id,
                started_at=datetime.now(timezone.utc)
            )
            self.active_executions[execution_id] = execution
            
            # Update schedule statistics
            await self._update_schedule_stats(schedule, 'started')
            
            # Broadcast execution started
            await broadcast_message({
                'type': 'schedule_execution_started',
                'schedule_id': schedule.id,
                'execution_id': execution_id,
                'workflow_name': workflow.name,
                'timestamp': datetime.now().isoformat()
            })
            
            # Execute the workflow
            workflow_execution_id = await self.engine.execute_workflow(
                workflow_definition={
                    'id': workflow.id,
                    'name': workflow.name,
                    'nodes': workflow.nodes
                },
                variables=workflow.variables,
                triggered_by=f'schedule:{schedule.id}'
            )
            
            # Monitor workflow execution
            await self._monitor_workflow_execution(execution, workflow_execution_id)
            
        except Exception as e:
            logger.error(f"Error executing schedule {schedule.id}: {e}")
            await self._handle_execution_error(schedule, execution_id, str(e))
            
    async def _monitor_workflow_execution(self, execution: ScheduleExecution, workflow_execution_id: str):
        """Monitor a workflow execution and update schedule accordingly"""
        try:
            # Poll workflow status until completion
            timeout = 3600  # 1 hour timeout
            start_time = datetime.now()
            
            while (datetime.now() - start_time).seconds < timeout:
                workflow_state = await self.engine.get_workflow_execution_state(workflow_execution_id)
                
                if not workflow_state:
                    break
                    
                if workflow_state.status.value in ['completed', 'failed']:
                    # Update execution record
                    execution.completed_at = datetime.now(timezone.utc)
                    execution.status = workflow_state.status.value
                    
                    # Update schedule statistics
                    schedule = load_schedule(execution.schedule_id)
                    if schedule:
                        await self._update_schedule_stats(schedule, workflow_state.status.value)
                        
                    # Broadcast completion
                    await broadcast_message({
                        'type': 'schedule_execution_completed',
                        'schedule_id': execution.schedule_id,
                        'execution_id': execution.execution_id,
                        'status': workflow_state.status.value,
                        'duration': (execution.completed_at - execution.started_at).total_seconds(),
                        'timestamp': datetime.now().isoformat()
                    })
                    
                    # Save execution history
                    await self._save_execution_history(execution)
                    
                    # Remove from active executions
                    self.active_executions.pop(execution.execution_id, None)
                    return
                    
                await asyncio.sleep(10)  # Check every 10 seconds
                
            # Handle timeout
            execution.status = 'timeout'
            execution.error_message = 'Execution timed out'
            execution.completed_at = datetime.now(timezone.utc)
            await self._save_execution_history(execution)
            self.active_executions.pop(execution.execution_id, None)
            
        except Exception as e:
            logger.error(f"Error monitoring workflow execution: {e}")
            await self._handle_execution_error(None, execution.execution_id, str(e))
            
    async def _update_schedule_stats(self, schedule: ScheduledWorkflow, status: str):
        """Update schedule statistics and next run time"""
        try:
            current_time = datetime.now()
            
            # Update last run time
            schedule.last_run = current_time.isoformat()
            schedule.last_status = status
            
            # Update run count
            if status == 'started':
                schedule.current_runs += 1
                
            # Update failure count
            if status == 'failed':
                schedule.consecutive_failures += 1
            elif status == 'completed':
                schedule.consecutive_failures = 0
                
            # Calculate next run time
            if schedule.cron_expression:
                try:
                    tz = pytz.timezone(schedule.timezone)
                    local_time = current_time.astimezone(tz)
                    cron = croniter(schedule.cron_expression, local_time)
                    next_run = cron.get_next(datetime)
                    schedule.next_run = next_run.isoformat()
                except Exception as e:
                    logger.error(f"Error calculating next run for schedule {schedule.id}: {e}")
                    
            # Save updated schedule
            save_schedule_to_storage(schedule)
            
        except Exception as e:
            logger.error(f"Error updating schedule stats: {e}")
            
    async def _handle_execution_error(self, schedule: Optional[ScheduledWorkflow], execution_id: str, error: str):
        """Handle execution errors"""
        try:
            execution = self.active_executions.get(execution_id)
            if execution:
                execution.status = 'failed'
                execution.error_message = error
                execution.completed_at = datetime.now(timezone.utc)
                await self._save_execution_history(execution)
                self.active_executions.pop(execution_id, None)
                
            if schedule:
                await self._update_schedule_stats(schedule, 'failed')
                
            # Broadcast error
            await broadcast_message({
                'type': 'schedule_execution_failed',
                'schedule_id': schedule.id if schedule else None,
                'execution_id': execution_id,
                'error': error,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error handling execution error: {e}")
            
    async def _save_execution_history(self, execution: ScheduleExecution):
        """Save execution history to storage"""
        try:
            history_file = os.path.join(
                self.execution_history_dir,
                f"{execution.schedule_id}_{execution.started_at.strftime('%Y%m%d')}.json"
            )
            
            # Load existing history for the day
            history = []
            if os.path.exists(history_file):
                with open(history_file, 'r') as f:
                    history = json.load(f)
                    
            # Add new execution
            history.append(execution.to_dict())
            
            # Save updated history
            with open(history_file, 'w') as f:
                json.dump(history, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving execution history: {e}")
            
    async def _wait_for_executions(self):
        """Wait for all active executions to complete"""
        while self.active_executions:
            await asyncio.sleep(5)
            
    def get_active_executions(self) -> List[Dict]:
        """Get list of currently active executions"""
        return [execution.to_dict() for execution in self.active_executions.values()]
        
    def get_status(self) -> Dict:
        """Get daemon status"""
        return {
            'running': self.running,
            'active_executions': len(self.active_executions),
            'check_interval': self.check_interval,
            'processed_schedules_count': len(self.processed_schedules)
        }

# Global daemon instance
_daemon_instance: Optional[SchedulerDaemon] = None

async def get_scheduler_daemon() -> SchedulerDaemon:
    """Get or create the global scheduler daemon instance"""
    global _daemon_instance
    if _daemon_instance is None:
        _daemon_instance = SchedulerDaemon()
    return _daemon_instance

async def start_scheduler_daemon():
    """Start the scheduler daemon"""
    daemon = await get_scheduler_daemon()
    if not daemon.running:
        # Run in background task
        asyncio.create_task(daemon.start())
        logger.info("Scheduler daemon started in background")
    
async def stop_scheduler_daemon():
    """Stop the scheduler daemon"""
    global _daemon_instance
    if _daemon_instance and _daemon_instance.running:
        await _daemon_instance.stop()
        _daemon_instance = None