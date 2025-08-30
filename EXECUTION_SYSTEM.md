# ProcessIQ Workflow Execution System

## Overview

ProcessIQ features a professional, enterprise-grade workflow execution system that bridges the React/Electron frontend with a robust Python FastAPI backend. The system provides real-time execution monitoring, comprehensive error handling, and state management for complex automation workflows.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop Frontend                          │
├─────────────────────────────────────────────────────────────┤
│  WorkflowDesigner.tsx                                       │
│  ├─ React Flow Canvas (Visual Design)                       │
│  ├─ Real-time Execution Monitor                            │
│  └─ Node Status Tracking                                   │
│                                                            │
│  workflowExecutionService.ts                              │
│  ├─ Professional Service Bridge                           │
│  ├─ WebSocket & Polling                                   │
│  ├─ State Management                                      │
│  └─ Event-driven Architecture                             │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Engine                           │
├─────────────────────────────────────────────────────────────┤
│  FastAPI Workflow API (/api/workflows/)                    │
│  ├─ POST /execute - Start workflow                         │
│  ├─ GET /execution/{id} - Get status                       │
│  └─ WebSocket /ws/workflows - Real-time events            │
│                                                            │
│  ProcessIQEngine (core/engine.py)                         │
│  ├─ Plugin Management                                     │
│  ├─ Event Bus Coordination                                │
│  └─ Resource Management                                   │
│                                                            │
│  WorkflowExecutor (core/workflow_engine.py)               │
│  ├─ Professional Execution Engine                         │
│  ├─ State Management                                      │
│  ├─ Node Handlers (30+ types)                            │
│  └─ Error Recovery                                        │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 🚀 Real-time Execution
- **Live Status Updates**: Real-time node status changes via WebSocket + polling fallback
- **Progress Tracking**: Visual progress indicators with completion percentages
- **Dynamic UI Updates**: Node colors and status indicators update in real-time

### 🎯 Comprehensive Node Support
- **Web Automation**: Browser open/navigate/extract/close with Playwright
- **Data Processing**: Excel read/write, database operations, file management
- **Communication**: Email sending, HTTP requests, API integrations
- **Logic Control**: Conditions, loops, Python scripts, template rendering
- **System Operations**: File operations, directory scanning, data transformation

### 🛡️ Professional Error Handling
- **Graceful Failures**: Individual node failures don't crash entire workflow
- **Error Recovery**: Retry mechanisms and fallback strategies
- **Detailed Logging**: Comprehensive execution logs for debugging
- **Validation**: Pre-execution workflow validation

### 📊 Advanced Monitoring
- **Execution Dashboard**: Real-time metrics and status visualization
- **Node History**: Complete execution timeline with timestamps
- **Variable Tracking**: Monitor data flow between nodes
- **Performance Metrics**: Execution time, memory usage, throughput

## Usage Example

### 1. Design Your Workflow
```typescript
// Create workflow visually in WorkflowDesigner
const workflow = {
  id: "data_processing_workflow",
  name: "Customer Data Processing",
  nodes: {
    "start_1": {
      type: "start",
      name: "Begin Processing",
      config: {},
      connections: ["browser_1"]
    },
    "browser_1": {
      type: "browser_navigate", 
      name: "Open Customer Portal",
      config: {
        url: "https://portal.example.com/customers",
        wait_for: "networkidle"
      },
      connections: ["extract_1"]
    },
    "extract_1": {
      type: "browser_extract",
      name: "Extract Customer Data",
      config: {
        selector: ".customer-row",
        extract_type: "text",
        variable_name: "customer_data"
      },
      connections: ["excel_1"]
    },
    "excel_1": {
      type: "excel_write",
      name: "Save to Excel",
      config: {
        file_path: "./output/customers.xlsx",
        data_source: "customer_data"
      },
      connections: ["email_1"]
    },
    "email_1": {
      type: "email_send",
      name: "Send Report",
      config: {
        to: "manager@company.com",
        subject: "Customer Data Report",
        body: "Please find the customer data report attached."
      },
      connections: ["end_1"]
    },
    "end_1": {
      type: "end",
      name: "Complete",
      config: {
        message: "Customer data processing completed successfully"
      },
      connections: []
    }
  }
}
```

### 2. Execute with Professional Service
```typescript
import workflowExecutionService from './services/workflowExecutionService';

// Execute workflow
const result = await workflowExecutionService.executeWorkflow(
  workflow,
  { environment: 'production' },
  'manual'
);

console.log(`Execution started: ${result.execution_id}`);

// Monitor progress
workflowExecutionService.on('node:started', (event) => {
  console.log(`Node ${event.node_id} started`);
});

workflowExecutionService.on('workflow:completed', (event) => {
  console.log(`Workflow completed successfully`);
});
```

### 3. Real-time Monitoring
The UI automatically updates with:
- ⚡ **Running nodes** - Blue with spinner animation
- ✅ **Completed nodes** - Green with checkmark
- ❌ **Failed nodes** - Red with error details
- 📊 **Progress tracking** - X/Y nodes completed
- 📝 **Execution logs** - Timestamped activity history

## Advanced Features

### Variable Management
```python
# Variables flow seamlessly between nodes
execution_state.variables.update({
  'customer_count': len(extracted_data),
  'report_date': datetime.now().isoformat(),
  'file_path': '/reports/customers_2024.xlsx'
})
```

### Conditional Logic
```python
# Smart conditional branching
if evaluate_condition(node_config['condition'], execution_state.variables):
    # Continue to success path
    execute_connected_nodes(success_connections)
else:
    # Branch to alternative path  
    execute_connected_nodes(failure_connections)
```

### Error Recovery
```python
try:
    result = await execute_node(node_id, config, state)
except RecoverableError as e:
    # Automatic retry with exponential backoff
    result = await retry_with_backoff(execute_node, node_id, config, state)
except CriticalError as e:
    # Graceful failure with detailed logging
    await handle_node_failure(node_id, str(e), state)
```

## Backend Node Handlers

The system includes professional implementations for:

### Web Automation
- `browser_open` - Launch browsers with configuration
- `browser_navigate` - Navigate with wait conditions
- `browser_extract` - Data extraction with selectors
- `browser_close` - Clean browser shutdown

### Data Operations
- `excel_read/write` - Professional Excel handling
- `database_query/execute` - SQL operations
- `file_scan/move/write` - File system operations
- `http_request` - REST API integration

### Logic & Control
- `condition` - Smart conditional branching
- `loop` - Iteration over data sets
- `python_script` - Custom Python execution
- `template_render` - Dynamic content generation

## Testing the System

### 1. Start the Backend
```bash
cd apps/backend
python -m uvicorn processiq.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Desktop App
```bash
cd apps/desktop  
npm run dev
```

### 3. Create a Test Workflow
1. Drag a **Start** node to the canvas
2. Add a **Browser Navigate** node with URL: `https://example.com`
3. Add a **Data Extract** node to get page title
4. Add an **End** node
5. Connect all nodes with edges
6. Click **Execute** button

### 4. Monitor Execution
- Switch to **Execute** tab to see real-time status
- Watch nodes change color as they execute
- View detailed execution logs and variables
- Monitor progress with completion metrics

## Performance & Scalability

- **Concurrent Execution**: Multiple workflows can run simultaneously
- **Resource Management**: Automatic cleanup of browser instances and file handles
- **Memory Efficiency**: Streaming data processing for large datasets
- **Error Isolation**: Node failures don't affect other running workflows
- **State Persistence**: Execution state survives application restarts

## Development & Extension

### Adding New Node Types
```python
# In backend: core/workflow_engine.py
async def _handle_custom_node(self, node_id: str, node_config: Dict[str, Any], execution_state) -> Any:
    """Handle custom node type"""
    config = node_config.get('config', {})
    
    # Implement your custom logic
    result = await your_custom_operation(config, execution_state.variables)
    
    # Update variables if needed
    if config.get('output_variable'):
        execution_state.variables[config['output_variable']] = result
        await self.state_manager.update_variables(execution_state.execution_id, execution_state.variables)
    
    return {"status": "completed", "result": result}

# Register the handler
self.node_handlers['custom_node'] = self._handle_custom_node
```

### Frontend Integration
```typescript
// Add to NodeSidebar.tsx
{
  type: 'custom_node',
  name: 'Custom Operation', 
  icon: CustomIcon,
  category: 'Custom',
  description: 'Perform custom operation',
  color: 'bg-purple-100 text-purple-700'
}
```

This professional execution system provides enterprise-grade workflow automation with the reliability, monitoring, and extensibility needed for production use.