// Workflow types
export * from './workflow';

// Connector types  
export * from './connector';

// System types
export interface SystemInfo {
  platform: 'windows' | 'macos' | 'linux';
  architecture: string;
  version: string;
  memory: {
    total: number;
    available: number;
    used: number;
  };
  cpu: {
    count: number;
    model: string;
    usage?: number;
  };
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// Pagination
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Settings
export interface AppSettings {
  general: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    autoSave: boolean;
    autoUpdate: boolean;
  };
  backend: {
    host: string;
    port: number;
    timeout: number;
    retryCount: number;
  };
  workflow: {
    defaultTimeout: number;
    defaultRetryCount: number;
    autoValidate: boolean;
    gridSnap: boolean;
    gridSize: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxFiles: number;
    maxSize: number; // in MB
    retention: number; // in days
  };
  security: {
    encryptCredentials: boolean;
    sessionTimeout: number; // in minutes
    requireAuth: boolean;
  };
  ai: {
    provider: string;
    model: string;
    apiKey?: string;
    maxTokens: number;
    temperature: number;
  };
}

// Plugin system
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  main: string;
  type: 'connector' | 'processor' | 'ui' | 'theme';
  dependencies?: Record<string, string>;
  permissions?: string[];
  repository?: string;
  keywords?: string[];
}

// Notifications
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  action: string;
  variant?: 'default' | 'destructive';
}