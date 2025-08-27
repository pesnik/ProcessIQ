export interface WorkflowNode {
  id: string;
  type: 'connector' | 'processor' | 'condition' | 'loop' | 'trigger';
  name: string;
  description?: string;
  position: {
    x: number;
    y: number;
  };
  config: Record<string, any>;
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  metadata?: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

export interface WorkflowPort {
  id: string;
  name: string;
  type: 'data' | 'control' | 'error';
  dataType?: string;
  required?: boolean;
  description?: string;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  status?: 'active' | 'inactive' | 'error';
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: WorkflowVariable[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    tags: string[];
  };
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value: any;
  description?: string;
  scope: 'global' | 'local';
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule' | 'webhook' | 'file_watch' | 'email';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowSettings {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  concurrent?: boolean;
  maxConcurrency?: number;
  errorHandling: 'stop' | 'continue' | 'retry';
  logging: 'none' | 'basic' | 'detailed';
  notifications: {
    onSuccess?: boolean;
    onFailure?: boolean;
    onStart?: boolean;
    channels?: string[];
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startTime: string;
  endTime?: string;
  duration?: number;
  trigger: {
    type: string;
    source: string;
    data?: any;
  };
  context: Record<string, any>;
  steps: WorkflowExecutionStep[];
  logs: WorkflowLog[];
  metrics: WorkflowMetrics;
}

export interface WorkflowExecutionStep {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  retryCount?: number;
}

export interface WorkflowLog {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  details?: Record<string, any>;
}

export interface WorkflowMetrics {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  dataProcessed: number;
  memoryUsage?: number;
  cpuUsage?: number;
}