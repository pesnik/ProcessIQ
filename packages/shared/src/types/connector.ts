export interface ConnectorDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ConnectorCategory;
  type: ConnectorType;
  icon?: string;
  color?: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  repository?: string;
  documentation?: string;
  capabilities: ConnectorCapability[];
  requirements: ConnectorRequirement[];
  configuration: ConnectorConfigSchema;
  ports: {
    inputs: ConnectorPortSchema[];
    outputs: ConnectorPortSchema[];
  };
  metadata: {
    tags: string[];
    license: string;
    createdAt: string;
    updatedAt: string;
  };
}

export type ConnectorCategory = 
  | 'web'
  | 'desktop' 
  | 'api'
  | 'database'
  | 'file'
  | 'email'
  | 'cloud'
  | 'ai'
  | 'processor'
  | 'utility';

export type ConnectorType = 
  | 'source'      // Data input
  | 'target'      // Data output  
  | 'processor'   // Data transformation
  | 'trigger'     // Event initiator
  | 'condition'   // Flow control
  | 'loop'        // Iteration
  | 'utility';    // Helper functions

export type ConnectorCapability = 
  | 'extract'
  | 'load'
  | 'transform'
  | 'validate'
  | 'authenticate'
  | 'schedule'
  | 'monitor'
  | 'notify'
  | 'cache'
  | 'retry'
  | 'parallel'
  | 'stream';

export interface ConnectorRequirement {
  type: 'system' | 'software' | 'library' | 'credential' | 'permission';
  name: string;
  version?: string;
  description: string;
  optional: boolean;
  platforms?: ('windows' | 'macos' | 'linux')[];
}

export interface ConnectorConfigSchema {
  properties: Record<string, ConnectorConfigProperty>;
  required: string[];
  groups?: ConnectorConfigGroup[];
}

export interface ConnectorConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'select' | 'multiselect' | 'file' | 'directory' | 'password';
  title: string;
  description?: string;
  default?: any;
  enum?: string[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  sensitive?: boolean;
  validation?: {
    required?: boolean;
    custom?: string; // Custom validation function
  };
  dependency?: {
    field: string;
    value: any;
  };
}

export interface ConnectorConfigGroup {
  name: string;
  title: string;
  description?: string;
  fields: string[];
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface ConnectorPortSchema {
  name: string;
  title: string;
  description?: string;
  type: 'data' | 'control' | 'error';
  dataType?: string;
  required?: boolean;
  schema?: Record<string, any>; // JSON Schema for validation
}

export interface ConnectorInstance {
  id: string;
  definitionId: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'error' | 'configuring';
  lastUsed?: string;
  usageCount: number;
  version: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
}

export interface ConnectorTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  duration: number;
  timestamp: string;
  capabilities?: {
    [key: string]: boolean;
  };
}

export interface ConnectorMetrics {
  executionCount: number;
  successCount: number;
  errorCount: number;
  averageExecutionTime: number;
  lastExecution?: string;
  dataProcessed: number;
  memoryUsage?: number;
}