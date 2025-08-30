/**
 * Workflow Execution Service
 * 
 * Professional service that bridges the desktop frontend with the ProcessIQ backend
 * workflow execution engine. Provides real-time execution monitoring, state management,
 * and comprehensive error handling.
 */

// Browser-compatible EventEmitter implementation
class BrowserEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  removeAllListeners() {
    this.listeners = {};
  }
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: Record<string, WorkflowNodeDefinition>;
  variables: Record<string, any>;
  triggers: any[];
}

export interface WorkflowNodeDefinition {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  connections: string[];
}

export interface WorkflowExecutionRequest {
  workflow_definition: WorkflowDefinition;
  variables?: Record<string, any>;
  triggered_by?: string;
}

export interface WorkflowExecutionResponse {
  execution_id: string;
  workflow_id: string;
  status: string;
  message: string;
}

export interface WorkflowExecutionState {
  execution_id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  started_at: string;
  completed_at?: string;
  completed_nodes: number;
  failed_nodes: number;
  current_nodes: string[];
  variables: Record<string, any>;
}

export interface NodeExecutionEvent {
  type: 'node_started' | 'node_completed' | 'node_failed';
  execution_id: string;
  node_id: string;
  node_type: string;
  timestamp: string;
  data?: any;
  error?: string;
}

export interface WorkflowExecutionEvent {
  type: 'workflow_started' | 'workflow_completed' | 'workflow_failed' | 'workflow_paused';
  execution_id: string;
  workflow_id: string;
  timestamp: string;
  data?: any;
  error?: string;
}

export class WorkflowExecutionService extends BrowserEventEmitter {
  private baseUrl: string;
  private activeExecutions = new Map<string, WorkflowExecutionState>();
  private pollingIntervals = new Map<string, number>();
  private wsConnection: WebSocket | null = null;
  
  constructor(baseUrl: string = 'http://localhost:8000') {
    super();
    this.baseUrl = baseUrl;
    this.setupWebSocketConnection();
  }

  /**
   * Execute a workflow with comprehensive monitoring and state management
   */
  async executeWorkflow(
    workflowDefinition: WorkflowDefinition,
    variables: Record<string, any> = {},
    triggeredBy: string = 'manual'
  ): Promise<WorkflowExecutionResponse> {
    try {
      // Validate workflow before execution
      this.validateWorkflow(workflowDefinition);
      
      const request: WorkflowExecutionRequest = {
        workflow_definition: workflowDefinition,
        variables,
        triggered_by: triggeredBy
      };

      const response = await fetch(`${this.baseUrl}/api/v1/workflows/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Workflow execution failed: ${errorText}`);
      }

      const result: WorkflowExecutionResponse = await response.json();
      
      // Start monitoring this execution
      this.startExecutionMonitoring(result.execution_id);
      
      // Emit workflow started event
      this.emit('workflow:started', {
        type: 'workflow_started',
        execution_id: result.execution_id,
        workflow_id: result.workflow_id,
        timestamp: new Date().toISOString()
      } as WorkflowExecutionEvent);

      return result;
    } catch (error) {
      this.emit('execution:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Get current execution state with caching for performance
   */
  async getExecutionState(executionId: string): Promise<WorkflowExecutionState | null> {
    try {
      // Check cache first for performance
      const cached = this.activeExecutions.get(executionId);
      
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/execution/${executionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get execution state: ${response.statusText}`);
      }

      const state: WorkflowExecutionState = await response.json();
      
      // Update cache
      this.activeExecutions.set(executionId, state);
      
      // Emit state update if changed
      if (!cached || cached.status !== state.status) {
        this.emit('execution:state_changed', { execution_id: executionId, state });
      }

      return state;
    } catch (error) {
      this.emit('execution:error', {
        execution_id: executionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Start real-time monitoring of workflow execution
   */
  private startExecutionMonitoring(executionId: string): void {
    // Clear any existing polling for this execution
    this.stopExecutionMonitoring(executionId);

    const interval = window.setInterval(async () => {
      try {
        const state = await this.getExecutionState(executionId);
        
        if (state) {
          // Check if execution is complete
          if (['completed', 'failed', 'cancelled'].includes(state.status)) {
            this.stopExecutionMonitoring(executionId);
            
            // Emit completion event
            this.emit(`workflow:${state.status}`, {
              type: `workflow_${state.status}`,
              execution_id: executionId,
              workflow_id: state.workflow_id,
              timestamp: new Date().toISOString(),
              data: state
            } as WorkflowExecutionEvent);
          } else {
            // Emit progress update
            this.emit('execution:progress', {
              execution_id: executionId,
              state,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Error polling execution state:', error);
        // Continue polling unless it's a critical error
      }
    }, 1000); // Poll every second

    this.pollingIntervals.set(executionId, interval);
  }

  /**
   * Stop monitoring a workflow execution
   */
  stopExecutionMonitoring(executionId: string): void {
    const interval = this.pollingIntervals.get(executionId);
    if (interval) {
      window.clearInterval(interval);
      this.pollingIntervals.delete(executionId);
    }
  }

  /**
   * Get all active workflow executions
   */
  async getActiveWorkflows(): Promise<WorkflowExecutionState[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/`);
      
      if (!response.ok) {
        throw new Error(`Failed to get active workflows: ${response.statusText}`);
      }

      const result = await response.json();
      return result.workflows || [];
    } catch (error) {
      this.emit('execution:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Pause a running workflow execution
   */
  async pauseExecution(executionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/execution/${executionId}/pause`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to pause execution: ${response.statusText}`);
      }

      this.emit('execution:paused', { execution_id: executionId });
    } catch (error) {
      this.emit('execution:error', {
        execution_id: executionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Resume a paused workflow execution
   */
  async resumeExecution(executionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/execution/${executionId}/resume`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to resume execution: ${response.statusText}`);
      }

      this.emit('execution:resumed', { execution_id: executionId });
    } catch (error) {
      this.emit('execution:error', {
        execution_id: executionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Cancel a workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/execution/${executionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel execution: ${response.statusText}`);
      }

      this.stopExecutionMonitoring(executionId);
      this.activeExecutions.delete(executionId);
      
      this.emit('execution:cancelled', { execution_id: executionId });
    } catch (error) {
      this.emit('execution:error', {
        execution_id: executionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get execution logs for debugging and monitoring
   */
  async getExecutionLogs(executionId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/execution/${executionId}/logs`);
      
      if (!response.ok) {
        throw new Error(`Failed to get execution logs: ${response.statusText}`);
      }

      const result = await response.json();
      return result.logs || [];
    } catch (error) {
      console.error('Failed to get execution logs:', error);
      return [];
    }
  }

  /**
   * Setup WebSocket connection for real-time updates
   */
  private setupWebSocketConnection(): void {
    // In a full implementation, this would connect to a WebSocket endpoint
    // for real-time updates from the backend
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/api/v1/ws/workflows';
    
    try {
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('Workflow WebSocket connected');
        this.emit('connection:established');
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('Workflow WebSocket disconnected');
        this.emit('connection:closed');
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          this.setupWebSocketConnection();
        }, 5000);
      };

      this.wsConnection.onerror = (error) => {
        console.error('Workflow WebSocket error:', error);
        this.emit('connection:error', error);
      };
    } catch (error) {
      console.error('Failed to setup WebSocket connection:', error);
      // Fall back to polling only
    }
  }

  /**
   * Handle real-time WebSocket messages from backend
   */
  private handleWebSocketMessage(data: any): void {
    const { event_type, execution_id, node_id, ...payload } = data;

    switch (event_type) {
      case 'node_started':
        this.emit('node:started', {
          type: 'node_started',
          execution_id,
          node_id,
          timestamp: new Date().toISOString(),
          data: payload
        } as NodeExecutionEvent);
        break;

      case 'node_completed':
        this.emit('node:completed', {
          type: 'node_completed',
          execution_id,
          node_id,
          timestamp: new Date().toISOString(),
          data: payload
        } as NodeExecutionEvent);
        break;

      case 'node_failed':
        this.emit('node:failed', {
          type: 'node_failed',
          execution_id,
          node_id,
          timestamp: new Date().toISOString(),
          error: payload.error
        } as NodeExecutionEvent);
        break;

      case 'workflow_completed':
        this.emit('workflow:completed', {
          type: 'workflow_completed',
          execution_id,
          workflow_id: payload.workflow_id,
          timestamp: new Date().toISOString(),
          data: payload
        } as WorkflowExecutionEvent);
        break;

      case 'workflow_failed':
        this.emit('workflow:failed', {
          type: 'workflow_failed',
          execution_id,
          workflow_id: payload.workflow_id,
          timestamp: new Date().toISOString(),
          error: payload.error
        } as WorkflowExecutionEvent);
        break;

      default:
        console.log('Unknown WebSocket event:', event_type, data);
    }
  }

  /**
   * Validate workflow before execution
   */
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.nodes || Object.keys(workflow.nodes).length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // Check for start nodes
    const startNodes = Object.values(workflow.nodes).filter(node => node.type === 'start');
    if (startNodes.length === 0) {
      throw new Error('Workflow must have at least one Start node');
    }

    if (startNodes.length > 1) {
      throw new Error('Workflow can only have one Start node');
    }

    // Check for end nodes
    const endNodes = Object.values(workflow.nodes).filter(node => node.type === 'end');
    if (endNodes.length === 0) {
      throw new Error('Workflow must have at least one End node');
    }

    // Validate node configurations
    for (const [nodeId, node] of Object.entries(workflow.nodes)) {
      switch (node.type) {
        case 'browser_navigate':
          if (!node.config.url || node.config.url.trim() === '') {
            throw new Error(`Browser Navigate node "${node.name}" requires a URL`);
          }
          break;

        case 'email_send':
          if (!node.config.to || node.config.to.trim() === '') {
            throw new Error(`Email Send node "${node.name}" requires a recipient email`);
          }
          if (!node.config.subject || node.config.subject.trim() === '') {
            throw new Error(`Email Send node "${node.name}" requires a subject`);
          }
          break;

        case 'database_query':
          if (!node.config.query || node.config.query.trim() === '') {
            throw new Error(`Database Query node "${node.name}" requires a SQL query`);
          }
          break;

        case 'condition':
          if (!node.config.condition || node.config.condition.trim() === '') {
            throw new Error(`Condition node "${node.name}" requires a condition expression`);
          }
          break;
      }
    }
  }

  /**
   * Clean up resources when service is destroyed
   */
  cleanup(): void {
    // Stop all polling intervals
    for (const [executionId] of this.pollingIntervals) {
      this.stopExecutionMonitoring(executionId);
    }

    // Close WebSocket connection
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    // Clear cached data
    this.activeExecutions.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}

// Singleton instance for global use
export const workflowExecutionService = new WorkflowExecutionService();

export default workflowExecutionService;