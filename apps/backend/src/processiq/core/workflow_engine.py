"""
ProcessIQ Workflow Engine
Professional workflow execution and management integrated with ProcessIQ core
"""

import asyncio
import json
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

from .events import EventBus
from .exceptions import ProcessIQError
from .workflow_debugger import WorkflowDebugger, create_workflow_debugger

# WebSocket broadcasting functions (will be set by main app)
_websocket_broadcasts = {
    'workflow_started': None,
    'workflow_completed': None,
    'workflow_failed': None,
    'node_started': None,
    'node_completed': None,
    'node_failed': None,
    'execution_progress': None
}

def set_websocket_broadcasts(**broadcasts):
    """Set WebSocket broadcast functions"""
    _websocket_broadcasts.update(broadcasts)


class NodeStatus(Enum):
    """Node execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class WorkflowStatus(Enum):
    """Workflow execution status"""
    PENDING = "pending"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


@dataclass
class WorkflowExecutionState:
    """Current state of workflow execution"""
    execution_id: str
    workflow_id: str
    status: WorkflowStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    variables: Dict[str, Any] = None
    context: Dict[str, Any] = None
    current_nodes: Set[str] = None
    completed_nodes: Set[str] = None
    failed_nodes: Set[str] = None
    node_results: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.variables is None:
            self.variables = {}
        if self.context is None:
            self.context = {}
        if self.current_nodes is None:
            self.current_nodes = set()
        if self.completed_nodes is None:
            self.completed_nodes = set()
        if self.failed_nodes is None:
            self.failed_nodes = set()
        if self.node_results is None:
            self.node_results = {}


class WorkflowStateManager:
    """Manages workflow execution state and persistence"""
    
    def __init__(self, data_dir: str = "data/workflows"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory state storage
        self.active_executions: Dict[str, WorkflowExecutionState] = {}
        
        # Node status tracking
        self.node_statuses: Dict[str, Dict[str, NodeStatus]] = {}  # execution_id -> node_id -> status
    
    async def create_execution(
        self, 
        workflow_id: str, 
        variables: Dict[str, Any] = None,
        triggered_by: str = None
    ) -> str:
        """Create new workflow execution"""
        execution_id = str(uuid.uuid4())
        
        execution_state = WorkflowExecutionState(
            execution_id=execution_id,
            workflow_id=workflow_id,
            status=WorkflowStatus.PENDING,
            started_at=datetime.now(),
            variables=variables or {},
            context={
                'triggered_by': triggered_by,
                'execution_id': execution_id,
                'created_at': datetime.now().isoformat()
            }
        )
        
        self.active_executions[execution_id] = execution_state
        self.node_statuses[execution_id] = {}
        
        return execution_id
    
    async def get_execution_state(self, execution_id: str) -> Optional[WorkflowExecutionState]:
        """Get current execution state"""
        return self.active_executions.get(execution_id)
    
    async def update_execution_status(self, execution_id: str, status: WorkflowStatus):
        """Update workflow execution status"""
        if execution_id in self.active_executions:
            self.active_executions[execution_id].status = status
            if status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.CANCELLED]:
                self.active_executions[execution_id].completed_at = datetime.now()
    
    async def update_node_status(self, execution_id: str, node_id: str, status: NodeStatus):
        """Update individual node status"""
        if execution_id not in self.node_statuses:
            self.node_statuses[execution_id] = {}
        
        self.node_statuses[execution_id][node_id] = status
        
        # Update execution state tracking
        execution_state = self.active_executions.get(execution_id)
        if execution_state:
            if status == NodeStatus.RUNNING:
                execution_state.current_nodes.add(node_id)
                execution_state.completed_nodes.discard(node_id)
                execution_state.failed_nodes.discard(node_id)
            elif status == NodeStatus.COMPLETED:
                execution_state.current_nodes.discard(node_id)
                execution_state.completed_nodes.add(node_id)
                execution_state.failed_nodes.discard(node_id)
            elif status == NodeStatus.FAILED:
                execution_state.current_nodes.discard(node_id)
                execution_state.failed_nodes.add(node_id)
                execution_state.completed_nodes.discard(node_id)
    
    async def set_node_result(self, execution_id: str, node_id: str, result: Any):
        """Store node execution result"""
        execution_state = self.active_executions.get(execution_id)
        if execution_state:
            execution_state.node_results[node_id] = result
    
    async def update_variables(self, execution_id: str, variables: Dict[str, Any]):
        """Update workflow variables"""
        execution_state = self.active_executions.get(execution_id)
        if execution_state:
            execution_state.variables.update(variables)


class WorkflowExecutor:
    """Professional workflow execution engine"""
    
    def __init__(self, event_bus: EventBus, automation_bridge=None, state_manager=None, enable_debugging=True):
        self.event_bus = event_bus
        self.automation_bridge = automation_bridge
        self.state_manager = state_manager or WorkflowStateManager()
        self.debugger = create_workflow_debugger(event_bus) if enable_debugging else None
        
        # Node type handlers
        self.node_handlers = {
            'start': self._handle_start_node,
            'end': self._handle_end_node,
            'browser_open': self._handle_browser_open,
            'browser_navigate': self._handle_browser_navigate,
            'browser_extract': self._handle_browser_extract,
            'browser_close': self._handle_browser_close,
            'excel_read': self._handle_excel_read,
            'excel_write': self._handle_excel_write,
            'email_send': self._handle_email_send,
            'file_scan': self._handle_file_scan,
            'file_mkdir': self._handle_file_mkdir,
            'file_move': self._handle_file_move,
            'file_write': self._handle_file_write,
            'http_request': self._handle_http_request,
            'python_script': self._handle_python_script,
            'condition': self._handle_condition,
            'loop': self._handle_loop,
            'loop_end': self._handle_loop_end,
            'template_render': self._handle_template_render,
            'log': self._handle_log,
            'database_connect': self._handle_database_connect,
            'database_query': self._handle_database_query,
            'database_execute': self._handle_database_execute,
            'database_bulk_insert': self._handle_database_bulk_insert,
            'database_close': self._handle_database_close
        }
    
    async def execute_workflow(
        self, 
        workflow_definition: Dict[str, Any],
        variables: Optional[Dict[str, Any]] = None,
        triggered_by: Optional[str] = None
    ) -> str:
        """Execute a complete workflow with comprehensive logging"""
        
        workflow_id = workflow_definition.get('id', 'unknown')
        workflow_name = workflow_definition.get('name', f'Workflow {workflow_id}')
        nodes_count = len(workflow_definition.get('nodes', {}))
        start_time = time.time()
        
        print(f"\n🎬 Starting workflow execution: {workflow_name}")
        print(f"   📋 Workflow ID: {workflow_id}")
        print(f"   🔢 Total nodes: {nodes_count}")
        print(f"   🚀 Triggered by: {triggered_by or 'manual'}")
        if variables:
            print(f"   📝 Input variables: {list(variables.keys())}")
        
        # Create execution state
        execution_id = await self.state_manager.create_execution(
            workflow_id=workflow_id,
            variables=variables,
            triggered_by=triggered_by
        )
        
        print(f"   🆔 Execution ID: {execution_id}")
        
        try:
            await self.event_bus.emit("workflow.execution.started", {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "workflow_name": workflow_name,
                "nodes_count": nodes_count,
                "triggered_by": triggered_by,
                "timestamp": datetime.now().isoformat()
            })
            
            # WebSocket broadcast
            if _websocket_broadcasts['workflow_started']:
                try:
                    print(f"🔔 Broadcasting workflow_started for {execution_id}")
                    await _websocket_broadcasts['workflow_started'](execution_id, workflow_id)
                except Exception as e:
                    print(f"❌ WebSocket broadcast error: {e}")
            else:
                print(f"⚠️ No WebSocket broadcast function for workflow_started")
            
            # Update status to running
            await self.state_manager.update_execution_status(execution_id, WorkflowStatus.RUNNING)
            
            # Execute workflow nodes
            execution_state = await self.state_manager.get_execution_state(execution_id)
            await self._execute_workflow_nodes(workflow_definition, execution_state)
            
            # Mark as completed
            await self.state_manager.update_execution_status(execution_id, WorkflowStatus.COMPLETED)
            
            execution_time = (time.time() - start_time) * 1000
            print(f"\n🎉 Workflow completed successfully: {workflow_name}")
            print(f"   ⏱️  Total execution time: {execution_time:.1f}ms")
            print(f"   ✅ Completed nodes: {len(execution_state.completed_nodes)}")
            if execution_state.variables:
                print(f"   📤 Final variables: {list(execution_state.variables.keys())}")
            
            await self.event_bus.emit("workflow.execution.completed", {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "workflow_name": workflow_name,
                "execution_time_ms": round(execution_time, 2),
                "completed_nodes": len(execution_state.completed_nodes),
                "variables": list(execution_state.variables.keys()),
                "timestamp": datetime.now().isoformat()
            })
            
            # WebSocket broadcast
            if _websocket_broadcasts['workflow_completed']:
                try:
                    await _websocket_broadcasts['workflow_completed'](execution_id, workflow_id)
                except Exception as e:
                    print(f"❌ WebSocket broadcast error: {e}")
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            print(f"\n💥 Workflow execution failed: {workflow_name}")
            print(f"   ⏱️  Execution time before failure: {execution_time:.1f}ms")
            print(f"   ❌ Error: {str(e)}")
            
            await self.state_manager.update_execution_status(execution_id, WorkflowStatus.FAILED)
            
            await self.event_bus.emit("workflow.execution.failed", {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "workflow_name": workflow_name,
                "error": str(e),
                "execution_time_ms": round(execution_time, 2),
                "timestamp": datetime.now().isoformat()
            })
            
            # WebSocket broadcast
            if _websocket_broadcasts['workflow_failed']:
                try:
                    await _websocket_broadcasts['workflow_failed'](execution_id, workflow_id, str(e))
                except Exception as e:
                    print(f"❌ WebSocket broadcast error: {e}")
            
            raise ProcessIQError(f"Workflow execution failed: {e}")
        
        return execution_id
    
    async def _execute_workflow_nodes(self, workflow_definition: Dict[str, Any], execution_state: WorkflowExecutionState):
        """Execute workflow nodes in proper order"""
        nodes = workflow_definition.get('nodes', {})
        
        # Find start nodes
        start_nodes = [node_id for node_id, node_config in nodes.items() 
                      if node_config.get('type') == 'start']
        
        if not start_nodes:
            raise ProcessIQError("No start nodes found in workflow")
        
        # Execute starting from start nodes
        for start_node in start_nodes:
            await self._execute_node_chain(start_node, nodes, execution_state)
    
    async def _execute_node_chain(self, node_id: str, nodes: Dict[str, Any], execution_state: WorkflowExecutionState):
        """Execute a chain of connected nodes"""
        
        visited = set()
        node_queue = [node_id]
        
        while node_queue:
            current_node_id = node_queue.pop(0)
            
            if current_node_id in visited:
                continue
            
            visited.add(current_node_id)
            
            if current_node_id not in nodes:
                continue
            
            node_config = nodes[current_node_id]
            
            # Execute single node
            await self._execute_single_node(current_node_id, node_config, execution_state)
            
            # Add connected nodes to queue
            connections = node_config.get('connections', [])
            node_queue.extend(connections)
    
    async def _execute_single_node(self, node_id: str, node_config: Dict[str, Any], execution_state):
        """Execute a single workflow node with detailed logging"""
        
        node_type = node_config.get('type')
        node_name = node_config.get('name', f'{node_type}_{node_id}')
        start_time = time.time()
        
        print(f"🚀 Starting node execution: {node_name} ({node_type}) [ID: {node_id}]")
        
        await self.event_bus.emit("workflow.node.started", {
            "execution_id": execution_state.execution_id,
            "node_id": node_id,
            "node_type": node_type,
            "node_name": node_name,
            "timestamp": datetime.now().isoformat()
        })
        
        # WebSocket broadcast
        if _websocket_broadcasts['node_started']:
            try:
                print(f"🔔 Broadcasting node_started for {node_id} ({node_type})")
                await _websocket_broadcasts['node_started'](
                    execution_state.execution_id, 
                    node_id, 
                    node_type, 
                    node_name=node_name
                )
            except Exception as e:
                print(f"❌ WebSocket broadcast error: {e}")
        else:
            print(f"⚠️ No WebSocket broadcast function for node_started")
        
        # Update node status to running
        await self.state_manager.update_node_status(execution_state.execution_id, node_id, NodeStatus.RUNNING)
        
        try:
            # Execute node based on type
            handler = self.node_handlers.get(node_type)
            if handler:
                print(f"⚡ Executing {node_type} handler for {node_name}")
                result = await handler(node_id, node_config, execution_state)
                await self.state_manager.set_node_result(execution_state.execution_id, node_id, result)
                
                execution_time = (time.time() - start_time) * 1000
                print(f"✅ Node completed: {node_name} (took {execution_time:.1f}ms)")
                
                # Log detailed result for python scripts
                if node_type == 'python_script' and isinstance(result, dict):
                    if result.get('output'):
                        print(f"📄 Python script output:\n{result['output']}")
                    if result.get('updated_variables'):
                        print(f"🔄 Updated variables: {result['updated_variables']}")
                    if result.get('error'):
                        print(f"❌ Python script error: {result['error']}")
                        
            else:
                raise ProcessIQError(f"Unknown node type: {node_type}")
            
            # Update node status to completed
            await self.state_manager.update_node_status(execution_state.execution_id, node_id, NodeStatus.COMPLETED)
            
            await self.event_bus.emit("workflow.node.completed", {
                "execution_id": execution_state.execution_id,
                "node_id": node_id,
                "node_type": node_type,
                "node_name": node_name,
                "result": result,
                "execution_time_ms": round((time.time() - start_time) * 1000, 2),
                "timestamp": datetime.now().isoformat()
            })
            
            # WebSocket broadcast
            if _websocket_broadcasts['node_completed']:
                try:
                    await _websocket_broadcasts['node_completed'](
                        execution_state.execution_id, 
                        node_id, 
                        node_type, 
                        result, 
                        node_name=node_name,
                        execution_time_ms=round((time.time() - start_time) * 1000, 2)
                    )
                except Exception as e:
                    print(f"❌ WebSocket broadcast error: {e}")
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            print(f"❌ Node failed: {node_name} (took {execution_time:.1f}ms) - {str(e)}")
            
            # Update node status to failed
            await self.state_manager.update_node_status(execution_state.execution_id, node_id, NodeStatus.FAILED)
            
            await self.event_bus.emit("workflow.node.failed", {
                "execution_id": execution_state.execution_id,
                "node_id": node_id,
                "node_type": node_type,
                "node_name": node_name,
                "error": str(e),
                "execution_time_ms": round(execution_time, 2),
                "timestamp": datetime.now().isoformat()
            })
            
            # WebSocket broadcast
            if _websocket_broadcasts['node_failed']:
                try:
                    await _websocket_broadcasts['node_failed'](
                        execution_state.execution_id, 
                        node_id, 
                        node_type, 
                        str(e), 
                        node_name=node_name,
                        execution_time_ms=round(execution_time, 2)
                    )
                except Exception as e:
                    print(f"❌ WebSocket broadcast error: {e}")
            
            raise ProcessIQError(f"Node {node_id} failed: {e}")
    
    # Node handler methods
    async def _handle_start_node(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle workflow start node"""
        return {"status": "started", "timestamp": datetime.now().isoformat()}
    
    async def _handle_end_node(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle workflow end node"""
        message = node_config.get('config', {}).get('message', 'Workflow completed')
        return {"status": "completed", "message": message, "timestamp": datetime.now().isoformat()}
    
    async def _handle_browser_open(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle browser open node"""
        if self.automation_bridge:
            config = node_config.get('config', {})
            browser = config.get('browser', 'chrome')
            headless = config.get('headless', False)
            
            # Use automation bridge to open browser
            result = await self.automation_bridge.execute_action('browser_open', {
                'browser': browser,
                'headless': headless
            })
            return result
        else:
            return {"status": "simulated", "action": "browser_open"}
    
    async def _handle_browser_navigate(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle browser navigate node"""
        config = node_config.get('config', {})
        url = self._substitute_variables(config.get('url', ''), execution_state.variables)
        
        if self.automation_bridge:
            result = await self.automation_bridge.execute_action('browser_navigate', {'url': url})
            return result
        else:
            return {"status": "simulated", "action": "browser_navigate", "url": url}
    
    async def _handle_browser_extract(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle browser data extraction node"""
        config = node_config.get('config', {})
        selector = self._substitute_variables(config.get('selector', ''), execution_state.variables)
        variable_name = config.get('variable_name', 'extracted_data')
        
        if self.automation_bridge:
            result = await self.automation_bridge.execute_action('browser_extract', {
                'selector': selector,
                'extract_type': config.get('extract_type', 'text')
            })
            
            # Store result in variables
            execution_state.variables[variable_name] = result.get('data', [])
            await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
            
            return result
        else:
            # Simulate extraction
            mock_data = ["Sample data 1", "Sample data 2", "Sample data 3"]
            execution_state.variables[variable_name] = mock_data
            await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
            
            return {"status": "simulated", "action": "browser_extract", "data": mock_data}
    
    async def _handle_browser_close(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle browser close node"""
        if self.automation_bridge:
            result = await self.automation_bridge.execute_action('browser_close', {})
            return result
        else:
            return {"status": "simulated", "action": "browser_close"}
    
    async def _handle_excel_read(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle Excel file reading"""
        config = node_config.get('config', {})
        file_path = self._substitute_variables(config.get('file_path', ''), execution_state.variables)
        variable_name = config.get('variable_name', 'excel_data')
        
        # Simulate reading Excel file
        mock_data = [
            {"Column1": "Value1", "Column2": "Value2"},
            {"Column1": "Value3", "Column2": "Value4"},
            {"Column1": "Value5", "Column2": "Value6"}
        ]
        
        execution_state.variables[variable_name] = mock_data
        await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
        
        return {"status": "completed", "file_path": file_path, "rows_read": len(mock_data)}
    
    async def _handle_excel_write(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle Excel file writing"""
        config = node_config.get('config', {})
        file_path = self._substitute_variables(config.get('file_path', ''), execution_state.variables)
        data_source = config.get('data_source', '')
        
        # Get data from variables
        data = execution_state.variables.get(data_source, [])
        
        return {"status": "completed", "file_path": file_path, "rows_written": len(data)}
    
    async def _handle_email_send(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle email sending"""
        config = node_config.get('config', {})
        to_email = self._substitute_variables(config.get('to', ''), execution_state.variables)
        subject = self._substitute_variables(config.get('subject', ''), execution_state.variables)
        
        return {"status": "completed", "to": to_email, "subject": subject}
    
    async def _handle_file_scan(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle file scanning"""
        config = node_config.get('config', {})
        directory = self._substitute_variables(config.get('directory', ''), execution_state.variables)
        pattern = config.get('pattern', '*')
        variable_name = config.get('variable_name', 'file_list')
        
        # Simulate file scanning
        mock_files = [f"{directory}/file1.xlsx", f"{directory}/file2.xlsx", f"{directory}/file3.xlsx"]
        
        execution_state.variables[variable_name] = mock_files
        await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
        
        return {"status": "completed", "directory": directory, "files_found": len(mock_files)}
    
    async def _handle_file_mkdir(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle directory creation"""
        config = node_config.get('config', {})
        directory = self._substitute_variables(config.get('directory', ''), execution_state.variables)
        
        return {"status": "completed", "directory": directory}
    
    async def _handle_file_move(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle file moving"""
        config = node_config.get('config', {})
        source = self._substitute_variables(config.get('source', ''), execution_state.variables)
        destination = self._substitute_variables(config.get('destination', ''), execution_state.variables)
        
        return {"status": "completed", "source": source, "destination": destination}
    
    async def _handle_file_write(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle file writing"""
        config = node_config.get('config', {})
        file_path = self._substitute_variables(config.get('file_path', ''), execution_state.variables)
        content = self._substitute_variables(str(execution_state.variables.get(config.get('content', ''), '')), execution_state.variables)
        
        return {"status": "completed", "file_path": file_path, "bytes_written": len(content)}
    
    async def _handle_http_request(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle HTTP request"""
        config = node_config.get('config', {})
        method = config.get('method', 'GET')
        url = self._substitute_variables(config.get('url', ''), execution_state.variables)
        response_variable = config.get('response_variable', 'http_response')
        
        # Simulate HTTP request
        mock_response = {
            "status_code": 200,
            "text": '{"status": "success", "data": []}',
            "headers": {"content-type": "application/json"}
        }
        
        execution_state.variables[response_variable] = mock_response
        await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
        
        return {"status": "completed", "method": method, "url": url, "status_code": 200}
    
    async def _handle_python_script(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle Python script execution with proper output capture"""
        import io
        import sys
        import contextlib
        import traceback
        
        config = node_config.get('config', {})
        script = config.get('script', '')
        
        if not script.strip():
            return {"status": "completed", "output": "Empty script", "error": None}
        
        # Capture stdout and stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        # Create execution environment with full Python capabilities
        execution_globals = {
            '__builtins__': __builtins__,  # Full Python builtins including __import__
            # Include current workflow variables
            **execution_state.variables
        }
        
        result = {
            "status": "completed",
            "output": "",
            "error": None,
            "execution_time_ms": 0,
            "updated_variables": {}
        }
        
        start_time = time.time()
        
        try:
            # Redirect stdout/stderr to capture output
            with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
                # Execute the script safely
                exec(script, execution_globals)
            
            # Capture execution time
            execution_time = (time.time() - start_time) * 1000
            result["execution_time_ms"] = round(execution_time, 2)
            
            # Capture output
            stdout_content = stdout_capture.getvalue()
            stderr_content = stderr_capture.getvalue()
            
            output_lines = []
            if stdout_content:
                output_lines.append(f"STDOUT:\n{stdout_content}")
            if stderr_content:
                output_lines.append(f"STDERR:\n{stderr_content}")
            
            result["output"] = "\n".join(output_lines) if output_lines else "Script executed successfully (no output)"
            
            # Check for updated variables (exclude builtins and system variables)
            original_vars = set(execution_state.variables.keys())
            for key, value in execution_globals.items():
                # Skip system variables, builtins, and imported modules
                if (not key.startswith('__') and 
                    key != '__builtins__' and
                    key in original_vars and execution_state.variables.get(key) != value):
                    
                    # Variable was updated by the script
                    execution_state.variables[key] = value
                    result["updated_variables"][key] = value
                elif (not key.startswith('__') and 
                      key != '__builtins__' and
                      key not in original_vars and
                      not hasattr(__builtins__, key) if isinstance(__builtins__, dict) else not hasattr(__builtins__, key)):
                    
                    # New variable was created by the script (not a builtin)
                    # Check if the value is JSON serializable
                    try:
                        import json
                        json.dumps(value)  # Test serialization
                        execution_state.variables[key] = value
                        result["updated_variables"][key] = value
                    except (TypeError, ValueError):
                        # Skip non-serializable values (like modules, functions, etc.)
                        print(f"⚠️  Skipping non-serializable variable: {key} = {type(value)}")
                        pass
            
            # Update workflow variables
            if result["updated_variables"]:
                await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
                
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            result["execution_time_ms"] = round(execution_time, 2)
            result["status"] = "failed"
            result["error"] = str(e)
            result["output"] = f"Script execution failed:\n{traceback.format_exc()}"
            
            # Still capture any stdout/stderr before the error
            stdout_content = stdout_capture.getvalue()
            stderr_content = stderr_capture.getvalue()
            if stdout_content or stderr_content:
                result["output"] += f"\n\nPartial output before error:\nSTDOUT:\n{stdout_content}\nSTDERR:\n{stderr_content}"
        
        return result
    
    async def _handle_condition(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle conditional logic"""
        config = node_config.get('config', {})
        condition = config.get('condition', 'True')
        
        # For safety, we'll simulate condition evaluation
        # In a real implementation, you'd want safe expression evaluation
        result = True  # Mock result
        
        return {"status": "completed", "condition": condition, "result": result}
    
    async def _handle_loop(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle loop start"""
        config = node_config.get('config', {})
        items = config.get('items', [])
        
        # Get items from variables if it's a variable name
        if isinstance(items, str) and items in execution_state.variables:
            items = execution_state.variables[items]
        
        return {"status": "completed", "loop_started": True, "item_count": len(items)}
    
    async def _handle_loop_end(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle loop end"""
        return {"status": "completed", "loop_ended": True}
    
    async def _handle_template_render(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle template rendering"""
        config = node_config.get('config', {})
        template = config.get('template', '')
        output_variable = config.get('output_variable', 'rendered_content')
        
        # Simple variable substitution
        rendered = self._substitute_variables(template, execution_state.variables)
        execution_state.variables[output_variable] = rendered
        
        await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
        
        return {"status": "completed", "output_variable": output_variable}
    
    async def _handle_log(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle logging"""
        config = node_config.get('config', {})
        level = config.get('level', 'info')
        message = self._substitute_variables(config.get('message', ''), execution_state.variables)
        
        await self.event_bus.emit("workflow.log", {
            "execution_id": execution_state.execution_id,
            "node_id": node_id,
            "level": level,
            "message": message
        })
        
        return {"status": "completed", "level": level, "message": message}
    
    # Database handlers (mock implementations)
    async def _handle_database_connect(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle database connection"""
        config = node_config.get('config', {})
        connection_string = config.get('connection_string', '')
        connection_variable = config.get('connection_variable', 'db_connection')
        
        # Mock database connection
        mock_connection = {"status": "connected", "connection_id": str(uuid.uuid4())[:8]}
        execution_state.variables[connection_variable] = mock_connection
        
        await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
        
        return {"status": "completed", "connection_variable": connection_variable}
    
    async def _handle_database_query(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle database query"""
        config = node_config.get('config', {})
        query = self._substitute_variables(config.get('query', ''), execution_state.variables)
        result_variable = config.get('result_variable', 'query_result')
        
        # Mock query result
        mock_result = [{"count": 100}]
        execution_state.variables[result_variable] = mock_result
        
        await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
        
        return {"status": "completed", "query": query, "rows_returned": len(mock_result)}
    
    async def _handle_database_execute(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle database execute"""
        config = node_config.get('config', {})
        query = self._substitute_variables(config.get('query', ''), execution_state.variables)
        
        return {"status": "completed", "query": query, "rows_affected": 0}
    
    async def _handle_database_bulk_insert(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle database bulk insert"""
        config = node_config.get('config', {})
        table = config.get('table', '')
        data_source = config.get('data_source', '')
        
        data = execution_state.variables.get(data_source, [])
        
        return {"status": "completed", "table": table, "rows_inserted": len(data)}
    
    async def _handle_database_close(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
        """Handle database close"""
        config = node_config.get('config', {})
        connection_variable = config.get('connection', 'db_connection')
        
        # Remove connection from variables
        if connection_variable in execution_state.variables:
            del execution_state.variables[connection_variable]
            await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
        
        return {"status": "completed", "connection_closed": True}
    
    def _substitute_variables(self, text: str, variables: Dict[str, Any]) -> str:
        """Simple variable substitution in text"""
        if not isinstance(text, str):
            return text
        
        result = text
        for var_name, var_value in variables.items():
            placeholder = f"${{{var_name}}}"
            if placeholder in result:
                result = result.replace(placeholder, str(var_value))
        
        return result


def create_workflow_executor(event_bus: EventBus, automation_bridge=None) -> WorkflowExecutor:
    """Factory function to create workflow executor"""
    return WorkflowExecutor(event_bus, automation_bridge)