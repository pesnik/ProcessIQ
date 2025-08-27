// Application constants

export const APP_INFO = {
  NAME: 'ProcessIQ',
  DESCRIPTION: 'Modern RPA + AI Automation Platform',
  VERSION: '0.1.0',
  AUTHOR: 'ProcessIQ Team',
  LICENSE: 'MIT',
  REPOSITORY: 'https://github.com/pesnik/ProcessIQ',
} as const;

export const API_ENDPOINTS = {
  BASE: '/api/v1',
  WORKFLOWS: '/workflows',
  CONNECTORS: '/connectors',
  EXECUTIONS: '/executions',
  LOGS: '/logs',
  PLUGINS: '/plugins',
  SETTINGS: '/settings',
  HEALTH: '/health',
  SYSTEM: '/system',
} as const;

export const CONNECTOR_CATEGORIES = {
  WEB: 'web',
  DESKTOP: 'desktop',
  API: 'api',
  DATABASE: 'database',
  FILE: 'file',
  EMAIL: 'email',
  CLOUD: 'cloud',
  AI: 'ai',
  PROCESSOR: 'processor',
  UTILITY: 'utility',
} as const;

export const WORKFLOW_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
} as const;

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  QWEN: 'qwen',
  LOCAL: 'local',
} as const;

export const FILE_EXTENSIONS = {
  WORKFLOW: '.piq',
  CONFIG: '.yaml',
  LOG: '.log',
  DATA: '.json',
} as const;

export const DEFAULT_PORTS = {
  BACKEND: 8000,
  FRONTEND: 5173,
  DOCS: 8080,
} as const;

export const LIMITS = {
  MAX_WORKFLOW_NODES: 1000,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_LOG_ENTRIES: 10000,
  MAX_EXECUTION_TIME: 24 * 60 * 60 * 1000, // 24 hours
  MAX_RETRY_COUNT: 10,
  MAX_CONCURRENT_EXECUTIONS: 10,
} as const;

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  SEMANTIC_VERSION: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
  IDENTIFIER: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
} as const;

export const KEYBOARD_SHORTCUTS = {
  NEW_WORKFLOW: 'ctrl+n',
  OPEN_WORKFLOW: 'ctrl+o',
  SAVE_WORKFLOW: 'ctrl+s',
  RUN_WORKFLOW: 'f5',
  STOP_WORKFLOW: 'shift+f5',
  TOGGLE_LOGS: 'ctrl+l',
  TOGGLE_SETTINGS: 'ctrl+comma',
  SEARCH: 'ctrl+k',
  ZOOM_IN: 'ctrl+=',
  ZOOM_OUT: 'ctrl+-',
  ZOOM_RESET: 'ctrl+0',
} as const;