import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Play, 
  Square, 
  Globe, 
  FileText, 
  Mail, 
  Database, 
  Zap,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Circle,
  Target,
  Dot
} from 'lucide-react';

export interface CustomNodeData {
  label?: string;
  nodeType?: string;
  config?: Record<string, any>;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
  // Debug-related properties
  hasBreakpoint?: boolean;
  isCurrentDebugNode?: boolean;
  debugLastOutput?: any;
}

const NODE_ICONS: Record<string, React.ComponentType<any>> = {
  start: Play,
  end: Square,
  browser_open: Globe,
  browser_navigate: Globe,
  browser_extract: Globe,
  browser_close: Globe,
  excel_read: FileText,
  excel_write: FileText,
  email_send: Mail,
  database_connect: Database,
  database_query: Database,
  database_execute: Database,
  database_close: Database,
  python_script: Zap,
  condition: Settings,
  loop: Settings,
  template_render: FileText,
  log: FileText,
  file_scan: FileText,
  file_mkdir: FileText,
  file_move: FileText,
  file_write: FileText,
  http_request: Globe,
};

const STATUS_COLORS = {
  idle: 'border-border bg-background',
  running: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
  completed: 'border-green-500 bg-green-50 dark:bg-green-950',
  failed: 'border-red-500 bg-red-50 dark:bg-red-950'
};

const STATUS_ICONS = {
  idle: null,
  running: Clock,
  completed: CheckCircle,
  failed: AlertCircle
};

export function CustomNode({ data, selected, id }: NodeProps<CustomNodeData>) {
  const Icon = NODE_ICONS[data.nodeType] || Settings;
  const StatusIcon = data.status ? STATUS_ICONS[data.status] : null;
  let statusColor = STATUS_COLORS[data.status || 'idle'];
  
  // Override status colors for debug states
  if (data.isCurrentDebugNode) {
    statusColor = 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 ring-2 ring-yellow-400 ring-opacity-50';
  } else if (data.hasBreakpoint) {
    statusColor = 'border-red-500 bg-red-50 dark:bg-red-950 ring-1 ring-red-400 ring-opacity-30';
  }

  // Determine if node should have input/output handles based on type
  const hasInput = data.nodeType !== 'start';
  const hasOutput = data.nodeType !== 'end';

  return (
    <div
      className={`min-w-[180px] rounded-lg border-2 p-3 shadow-sm transition-all relative ${statusColor} ${
        selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
    >
      {/* Input handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      {/* Debug Indicators */}
      {data.hasBreakpoint && (
        <div className="absolute -top-2 -right-2 z-10">
          <Circle className="w-4 h-4 text-red-500 fill-current drop-shadow-sm" />
        </div>
      )}
      
      {data.isCurrentDebugNode && (
        <div className="absolute -top-2 -left-2 z-10">
          <Target className="w-4 h-4 text-yellow-500 fill-current drop-shadow-sm" />
        </div>
      )}

      {/* Node content */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Icon className="w-4 h-4 text-muted-foreground mr-2" />
          {StatusIcon && (
            <StatusIcon 
              className={`w-4 h-4 mr-1 ${
                data.status === 'running' ? 'text-blue-600 animate-spin' :
                data.status === 'completed' ? 'text-green-600' :
                data.status === 'failed' ? 'text-red-600' :
                'text-muted-foreground'
              }`}
            />
          )}
        </div>
        
        {/* Debug status indicator */}
        {(data.hasBreakpoint || data.isCurrentDebugNode) && (
          <div className="flex items-center gap-1">
            {data.hasBreakpoint && (
              <Dot className="w-3 h-3 text-red-500" title="Breakpoint set" />
            )}
            {data.isCurrentDebugNode && (
              <Target className="w-3 h-3 text-yellow-500" title="Current debug node" />
            )}
          </div>
        )}
      </div>

      <div className="text-sm font-medium text-foreground mb-1">
        {data.label || 'Untitled Node'}
      </div>
      
      <div className="text-xs text-muted-foreground">
        {data.nodeType ? data.nodeType.replace(/_/g, ' ') : 'Unknown Type'}
      </div>

      {/* Configuration preview */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {data.nodeType === 'browser_navigate' && data.config?.url && (
              <div className="truncate" title={data.config.url}>
                URL: {data.config.url}
              </div>
            )}
            {data.nodeType === 'email_send' && data.config?.to && (
              <div className="truncate" title={data.config.to}>
                To: {data.config.to}
              </div>
            )}
            {data.nodeType === 'excel_read' && data.config?.file_path && (
              <div className="truncate" title={data.config.file_path}>
                File: {data.config.file_path}
              </div>
            )}
            {data.nodeType === 'python_script' && (
              <div>Python Script</div>
            )}
          </div>
        </div>
      )}

      {/* Debug Output Preview */}
      {data.debugLastOutput && (
        <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/30 rounded-sm">
          <div className="flex items-center gap-1 mb-1">
            <Target className="w-3 h-3 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Debug Output</span>
          </div>
          <div className="text-xs text-muted-foreground max-h-12 overflow-hidden">
            <pre className="text-xs font-mono leading-tight">
              {typeof data.debugLastOutput === 'object' 
                ? JSON.stringify(data.debugLastOutput, null, 1).substring(0, 60)
                : String(data.debugLastOutput).substring(0, 60)
              }
              {(typeof data.debugLastOutput === 'object' 
                ? JSON.stringify(data.debugLastOutput).length > 60 
                : String(data.debugLastOutput).length > 60) && '...'
              }
            </pre>
          </div>
        </div>
      )}

      {/* Error message */}
      {data.error && (
        <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
          <div className="text-xs text-red-600 dark:text-red-400" title={data.error}>
            Error: {data.error.substring(0, 40)}...
          </div>
        </div>
      )}

      {/* Output handle */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}
    </div>
  );
}

export default CustomNode;