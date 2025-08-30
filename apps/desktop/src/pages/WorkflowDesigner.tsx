import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { 
  Play, 
  Pause, 
  Square, 
  Save, 
  Upload, 
  Download,
  Monitor,
  ChevronDown,
  FileText,
  Copy,
  Edit3,
  Bug,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  StepForward,
  StepBack,
  SkipForward,
  Circle,
  Dot,
  Eye,
  Variable,
  Activity,
  Target,
  Database
} from 'lucide-react';

import CustomNode, { CustomNodeData } from '../components/workflow/CustomNode';
import NodeSidebar, { NODE_TYPES } from '../components/workflow/NodeSidebar';
import PropertyPanel from '../components/workflow/PropertyPanel';
import workflowExecutionService, { WorkflowDefinition, WorkflowExecutionState, NodeExecutionEvent, WorkflowExecutionEvent } from '../services/workflowExecutionService';

// WorkflowDefinition now imported from service

// WorkflowExecution types now imported from service

// Debug Session Interfaces
interface DebugStep {
  nodeId: string;
  timestamp: Date;
  input: any;
  output: any;
  duration: number;
  status: 'success' | 'error';
  error?: string;
}

interface NodeDebugData {
  lastExecution: DebugStep | null;
  breakpointEnabled: boolean;
  watchedVariables: string[];
  executionHistory: DebugStep[];
}

interface DebugSession {
  id: string;
  workflowId: string;
  status: 'idle' | 'active' | 'paused' | 'stopped';
  breakpoints: Set<string>;
  watchedVariables: Set<string>;
  currentExecutionStep: number;
  stepHistory: DebugStep[];
  nodeExecutionData: Map<string, NodeDebugData>;
  mode: 'step' | 'run' | 'single-node';
}

interface VariableInspector {
  globalVariables: Record<string, any>;
  nodeOutputs: Map<string, any>;
  watchedExpressions: string[];
  executionContext: {
    currentNode: string | null;
    executionPath: string[];
    callStack: string[];
  };
}

// Enhanced Execution Monitor Component
interface ExecutionMonitorTabProps {
  execution: WorkflowExecutionState | null;
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  executionLogs: any[];
  onNodeSelect: (nodeId: string) => void;
}

function ExecutionMonitorTab({ execution, nodes, edges, executionLogs, onNodeSelect }: ExecutionMonitorTabProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'output' | 'config' | 'metrics'>('overview');

  // Calculate proper execution order based on workflow dependencies
  const getExecutionOrderedNodes = useCallback(() => {
    // Build dependency graph
    const dependencies: Record<string, Set<string>> = {};
    const allNodes = new Set(nodes.map(n => n.id));
    
    // Initialize all nodes with empty dependencies
    allNodes.forEach(nodeId => {
      dependencies[nodeId] = new Set();
    });
    
    // Build the dependency graph from edges
    edges.forEach(edge => {
      if (dependencies[edge.target]) {
        dependencies[edge.target].add(edge.source);
      }
    });
    
    // Topological sort to get execution order
    const executed = new Set<string>();
    const executionOrder: Node<CustomNodeData>[] = [];
    
    // Find start nodes (nodes with no dependencies)
    const startNodes = Array.from(allNodes).filter(nodeId => dependencies[nodeId].size === 0);
    
    // If no start nodes found, look for nodes with type 'start'
    if (startNodes.length === 0) {
      const typeStartNodes = nodes.filter(n => n.data.nodeType === 'start');
      startNodes.push(...typeStartNodes.map(n => n.id));
    }
    
    while (executed.size < allNodes.size) {
      // Find nodes with all dependencies satisfied
      const readyNodes = Array.from(allNodes).filter(nodeId => 
        !executed.has(nodeId) && 
        Array.from(dependencies[nodeId]).every(dep => executed.has(dep))
      );
      
      if (readyNodes.length === 0) {
        // Handle remaining nodes (might be disconnected or cyclic)
        const remaining = Array.from(allNodes).filter(nodeId => !executed.has(nodeId));
        remaining.forEach(nodeId => executed.add(nodeId));
        executionOrder.push(...nodes.filter(n => remaining.includes(n.id)));
        break;
      }
      
      // Sort ready nodes to prefer start nodes first, then by position
      readyNodes.sort((a, b) => {
        const nodeA = nodes.find(n => n.id === a);
        const nodeB = nodes.find(n => n.id === b);
        
        if (!nodeA || !nodeB) return 0;
        
        // Prioritize start nodes
        if (nodeA.data.nodeType === 'start' && nodeB.data.nodeType !== 'start') return -1;
        if (nodeB.data.nodeType === 'start' && nodeA.data.nodeType !== 'start') return 1;
        
        // Sort by position (left to right, top to bottom)
        if (nodeA.position.x !== nodeB.position.x) return nodeA.position.x - nodeB.position.x;
        return nodeA.position.y - nodeB.position.y;
      });
      
      // Add ready nodes to execution order
      readyNodes.forEach(nodeId => {
        executed.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          executionOrder.push(node);
        }
      });
    }
    
    return executionOrder;
  }, [nodes, edges]);

  // Get status for a specific node
  const getNodeStatus = (nodeId: string): 'idle' | 'running' | 'completed' | 'failed' => {
    if (!execution) return 'idle';
    
    const nodeData = nodes.find(n => n.id === nodeId);
    if (!nodeData) return 'idle';
    
    return nodeData.data.status || 'idle';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'running': return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Get node execution details
  const getNodeExecutionDetails = (nodeId: string) => {
    const nodeLogs = executionLogs.filter(log => log.nodeId === nodeId || log.message.includes(nodeId));
    const node = nodes.find(n => n.id === nodeId);
    
    return {
      node,
      logs: nodeLogs,
      status: getNodeStatus(nodeId),
      startTime: nodeLogs.find(log => log.type === 'node_started')?.timestamp,
      endTime: nodeLogs.find(log => log.type === 'node_completed' || log.type === 'node_failed')?.timestamp,
      output: nodeLogs.find(log => log.output)?.output || nodeLogs.filter(log => log.message && !log.message.includes('🎬') && !log.message.includes('✅')).map(log => log.message).join('\\n'),
      error: nodeLogs.find(log => log.level === 'error')?.message
    };
  };

  if (!execution) {
    return (
      <div className="p-6 bg-background h-full flex items-center justify-center">
        <div className="text-center">
          <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">No Active Execution</h3>
          <p className="text-muted-foreground">
            Execute a workflow to see real-time monitoring data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with Workflow Status */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center">
              🎬 Workflow Execution
              <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(execution.status)}`}>
                {getStatusIcon(execution.status)}
                <span className="ml-2 uppercase">{execution.status}</span>
              </span>
            </h2>
            <div className="text-sm text-muted-foreground mt-1">
              Duration: {execution.completed_at 
                ? Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000) + 's'
                : Math.round((Date.now() - new Date(execution.started_at).getTime()) / 1000) + 's'
              } | Started: {new Date(execution.started_at).toLocaleTimeString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Progress</div>
            <div className="text-2xl font-bold text-foreground">
              {execution.completed_nodes}/{nodes.length} nodes
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Visual Flow Section */}
        <div className="flex-1 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Visual Flow Progress</h3>
            
            {/* Interactive Node Flow */}
            <div className="bg-secondary rounded-lg p-6">
              <div className="flex items-center justify-center space-x-4 overflow-x-auto">
                {getExecutionOrderedNodes().map((node, index) => {
                  const status = getNodeStatus(node.id);
                  const isSelected = selectedNodeId === node.id;
                  
                  return (
                    <div key={node.id} className="flex items-center">
                      <button
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          onNodeSelect(node.id);
                        }}
                        className={`relative p-4 rounded-lg border-2 transition-all duration-200 min-w-[120px] ${
                          isSelected 
                            ? 'border-primary bg-primary/10 shadow-lg' 
                            : 'border-border bg-background hover:border-primary/50 hover:shadow-md'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full absolute -top-1 -right-1 ${getStatusColor(status).replace('text-', 'bg-').replace(' bg-', ' ')}`}></div>
                        
                        <div className="text-center">
                          <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                          </div>
                          <div className="text-xs font-medium text-foreground truncate">
                            {node.data.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {node.data.nodeType}
                          </div>
                        </div>
                      </button>
                      
                      {index < getExecutionOrderedNodes().length - 1 && (
                        <div className="flex items-center mx-2">
                          <div className="w-6 h-0.5 bg-primary opacity-60"></div>
                          <div className="w-0 h-0 border-l-[6px] border-l-primary opacity-60 border-y-[4px] border-y-transparent ml-1"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline View */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Execution Timeline</h3>
            <div className="bg-secondary rounded-lg p-4">
              <div className="space-y-2">
                {executionLogs.slice(-10).map((log) => (
                  <div key={log.id} className="flex items-center text-sm">
                    <span className="text-xs text-muted-foreground min-w-[80px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <div className={`w-2 h-2 rounded-full mx-3 ${
                      log.level === 'error' ? 'bg-red-500' :
                      log.level === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <span className="font-medium text-foreground">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Node Details Panel */}
        <div className="w-1/3 border-l bg-background">
          {selectedNodeId ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-foreground">
                  {nodes.find(n => n.id === selectedNodeId)?.data.label || 'Node Details'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {nodes.find(n => n.id === selectedNodeId)?.data.nodeType}
                </p>
              </div>

              {/* Tabs */}
              <div className="border-b">
                <div className="flex">
                  {[
                    { key: 'overview', label: 'Overview', icon: '📋' },
                    { key: 'output', label: 'Output', icon: '📄' },
                    { key: 'config', label: 'Config', icon: '🔧' },
                    { key: 'metrics', label: 'Metrics', icon: '📈' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedTab(tab.key as any)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        selectedTab === tab.key
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-4 overflow-y-auto">
                {selectedTab === 'overview' && (
                  <NodeOverviewTab nodeDetails={getNodeExecutionDetails(selectedNodeId)} />
                )}
                {selectedTab === 'output' && (
                  <NodeOutputTab nodeDetails={getNodeExecutionDetails(selectedNodeId)} />
                )}
                {selectedTab === 'config' && (
                  <NodeConfigTab nodeDetails={getNodeExecutionDetails(selectedNodeId)} />
                )}
                {selectedTab === 'metrics' && (
                  <NodeMetricsTab nodeDetails={getNodeExecutionDetails(selectedNodeId)} />
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-4 text-center">
              <div>
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h4 className="font-semibold text-foreground mb-2">Select a Node</h4>
                <p className="text-sm text-muted-foreground">
                  Click on any node in the flow diagram to view its execution details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Node Detail Tab Components
function NodeOverviewTab({ nodeDetails }: { nodeDetails: any }) {
  const { node, status, startTime, endTime, error } = nodeDetails;

  const duration = startTime && endTime 
    ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <div className={`mt-1 px-2 py-1 rounded text-sm font-medium inline-flex items-center ${
            status === 'completed' ? 'bg-green-100 text-green-700' :
            status === 'running' ? 'bg-blue-100 text-blue-700' :
            status === 'failed' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Duration</label>
          <div className="mt-1 text-sm font-mono">
            {duration ? `${duration}s` : status === 'running' ? 'Running...' : 'Not started'}
          </div>
        </div>
      </div>

      {startTime && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Execution Time</label>
          <div className="mt-1 text-sm font-mono space-y-1">
            <div>Started: {new Date(startTime).toLocaleString()}</div>
            {endTime && <div>Ended: {new Date(endTime).toLocaleString()}</div>}
          </div>
        </div>
      )}

      {error && (
        <div>
          <label className="text-xs font-medium text-red-600">Error Details</label>
          <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 font-mono">
            {error}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground">Node Configuration</label>
        <div className="mt-1 p-3 bg-secondary rounded text-sm">
          <div className="space-y-2">
            <div><strong>Type:</strong> {node?.data.nodeType}</div>
            <div><strong>Name:</strong> {node?.data.label}</div>
            <div><strong>Position:</strong> ({node?.position.x}, {node?.position.y})</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeOutputTab({ nodeDetails }: { nodeDetails: any }) {
  const { output, logs } = nodeDetails;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Standard Output</label>
        <div className="mt-1 p-3 bg-gray-900 text-green-400 rounded font-mono text-sm min-h-[200px] overflow-auto">
          {output ? (
            <pre className="whitespace-pre-wrap">{output}</pre>
          ) : (
            <div className="text-gray-500 italic">No output generated</div>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Execution Logs</label>
        <div className="mt-1 space-y-2 max-h-64 overflow-auto">
          {logs && logs.length > 0 ? (
            logs.map((log: any, index: number) => (
              <div 
                key={index}
                className={`p-2 rounded text-xs border-l-4 ${
                  log.level === 'error' ? 'bg-red-50 border-red-400 text-red-700' :
                  log.level === 'success' ? 'bg-green-50 border-green-400 text-green-700' :
                  'bg-blue-50 border-blue-400 text-blue-700'
                }`}
              >
                <div className="font-medium mb-1">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                <div className="font-mono">{log.message}</div>
              </div>
            ))
          ) : (
            <div className="p-3 bg-secondary rounded text-sm text-muted-foreground italic">
              No logs available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NodeConfigTab({ nodeDetails }: { nodeDetails: any }) {
  const { node } = nodeDetails;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Node Configuration</label>
        <div className="mt-1 p-3 bg-secondary rounded">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(node?.data.config || {}, null, 2)}
          </pre>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Node Properties</label>
        <div className="mt-1 space-y-2">
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-sm font-medium">ID</span>
            <span className="text-sm font-mono">{node?.id}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-sm font-medium">Type</span>
            <span className="text-sm">{node?.data.nodeType}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-sm font-medium">Label</span>
            <span className="text-sm">{node?.data.label}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border">
            <span className="text-sm font-medium">Position</span>
            <span className="text-sm font-mono">({node?.position.x}, {node?.position.y})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeMetricsTab({ nodeDetails }: { nodeDetails: any }) {
  const { startTime, endTime, status } = nodeDetails;

  const duration = startTime && endTime 
    ? (new Date(endTime).getTime() - new Date(startTime).getTime())
    : null;

  const currentDuration = startTime && !endTime
    ? (Date.now() - new Date(startTime).getTime())
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary p-3 rounded">
          <div className="text-xs font-medium text-muted-foreground">Execution Time</div>
          <div className="text-lg font-bold">
            {duration ? `${(duration / 1000).toFixed(2)}s` :
             currentDuration ? `${(currentDuration / 1000).toFixed(1)}s` :
             'N/A'}
          </div>
        </div>
        <div className="bg-secondary p-3 rounded">
          <div className="text-xs font-medium text-muted-foreground">Status</div>
          <div className="text-lg font-bold capitalize">{status}</div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Performance Metrics</label>
        <div className="mt-1 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm">Memory Usage</span>
            <span className="text-sm text-muted-foreground">~2.4 MB</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm">CPU Usage</span>
            <span className="text-sm text-muted-foreground">~0.1%</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm">Exit Code</span>
            <span className="text-sm text-muted-foreground">
              {status === 'completed' ? '0' : status === 'failed' ? '1' : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {startTime && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Timeline</label>
          <div className="mt-1 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Started at:</span>
              <span className="font-mono">{new Date(startTime).toLocaleTimeString()}</span>
            </div>
            {endTime && (
              <div className="flex justify-between">
                <span>Completed at:</span>
                <span className="font-mono">{new Date(endTime).toLocaleTimeString()}</span>
              </div>
            )}
            {currentDuration && !endTime && (
              <div className="flex justify-between text-blue-600">
                <span>Running for:</span>
                <span className="font-mono">{(currentDuration / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom node types
const nodeTypes = {
  custom: CustomNode,
};

function WorkflowDesignerContent() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [execution, setExecution] = useState<WorkflowExecutionState | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'execute' | 'debug'>('design');
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, { status: string; message?: string; timestamp?: string }>>({});
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  
  // New state for execution history
  const [executionHistory, setExecutionHistory] = useState<Array<{
    id: string;
    status: string;
    started_at: string;
    completed_at?: string;
    nodes: number;
    completed_nodes: number;
    failed_nodes: number;
    logs: any[];
    nodeStatuses: Record<string, any>;
  }>>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  
  // Debug Session State Management
  const [debugSession, setDebugSession] = useState<DebugSession | null>(null);
  const [variableInspector, setVariableInspector] = useState<VariableInspector>({
    globalVariables: {},
    nodeOutputs: new Map(),
    watchedExpressions: [],
    executionContext: {
      currentNode: null,
      executionPath: [],
      callStack: []
    }
  });
  const [selectedDebugNode, setSelectedDebugNode] = useState<string | null>(null);
  
  // Track current workflow ID for updates vs new saves
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Load workflow from URL parameters
  useEffect(() => {
    const workflowId = searchParams.get('id');
    const tabParam = searchParams.get('tab');
    
    if (workflowId) {
      loadWorkflowById(workflowId);
      setCurrentWorkflowId(workflowId);
    }
    
    if (tabParam && ['design', 'execute', 'debug'].includes(tabParam)) {
      setActiveTab(tabParam as 'design' | 'execute' | 'debug');
    }
  }, [searchParams]);

  const loadWorkflowById = async (workflowId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/workflows/${workflowId}`);
      if (!response.ok) {
        throw new Error('Failed to load workflow');
      }
      
      const workflow = await response.json();
      
      // Load workflow data
      setWorkflowName(workflow.name || 'Untitled Workflow');
      
      if (workflow.nodes) {
        // Convert stored nodes back to ReactFlow format
        const loadedNodes = Object.values(workflow.nodes).map((nodeData: any) => ({
          id: nodeData.id,
          type: 'custom',
          position: nodeData.position || { x: 100, y: 100 },
          data: {
            label: nodeData.name || nodeData.data?.label || nodeData.label || 'Untitled Node',
            nodeType: nodeData.type || nodeData.data?.nodeType || nodeData.nodeType || 'unknown',
            config: nodeData.config || nodeData.data?.config || {},
            status: 'idle' // Reset status when loading
          }
        }));
        
        // Load edges from the stored workflow or reconstruct from node connections
        let loadedEdges = workflow.edges || [];
        
        // If no edges are stored but nodes have connections, rebuild edges
        if (loadedEdges.length === 0) {
          loadedEdges = [];
          Object.values(workflow.nodes).forEach((nodeData: any) => {
            if (nodeData.connections && Array.isArray(nodeData.connections)) {
              nodeData.connections.forEach((targetId: string) => {
                loadedEdges.push({
                  id: `${nodeData.id}-${targetId}`,
                  source: nodeData.id,
                  target: targetId,
                  type: 'default'
                });
              });
            }
          });
        }
        
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        
        console.log('Workflow loaded successfully:', workflow.name);
        console.log('Loaded nodes:', loadedNodes);
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      alert('Failed to load workflow. Please try again.');
    }
  };
  
  // Debug Session Management Functions
  const createDebugSession = useCallback((mode: 'step' | 'run' | 'single-node' = 'step') => {
    const sessionId = `debug_${Date.now()}`;
    const newSession: DebugSession = {
      id: sessionId,
      workflowId: `workflow_${Date.now()}`,
      status: 'idle',
      breakpoints: new Set(),
      watchedVariables: new Set(),
      currentExecutionStep: 0,
      stepHistory: [],
      nodeExecutionData: new Map(),
      mode
    };
    
    setDebugSession(newSession);
    return newSession;
  }, []);

  const toggleBreakpoint = useCallback((nodeId: string) => {
    if (!debugSession) {
      createDebugSession();
      return;
    }
    
    const newBreakpoints = new Set(debugSession.breakpoints);
    if (newBreakpoints.has(nodeId)) {
      newBreakpoints.delete(nodeId);
    } else {
      newBreakpoints.add(nodeId);
    }
    
    setDebugSession({
      ...debugSession,
      breakpoints: newBreakpoints
    });
    
    // Update node debug data
    const nodeDebugData = debugSession.nodeExecutionData.get(nodeId) || {
      lastExecution: null,
      breakpointEnabled: false,
      watchedVariables: [],
      executionHistory: []
    };
    
    nodeDebugData.breakpointEnabled = newBreakpoints.has(nodeId);
    debugSession.nodeExecutionData.set(nodeId, nodeDebugData);
  }, [debugSession, createDebugSession]);


  const stopDebugSession = useCallback(() => {
    setDebugSession(null);
    setVariableInspector({
      globalVariables: {},
      nodeOutputs: new Map(),
      watchedExpressions: [],
      executionContext: {
        currentNode: null,
        executionPath: [],
        callStack: []
      }
    });
    setSelectedDebugNode(null);
  }, []);
  
  // Setup workflow execution service event listeners
  React.useEffect(() => {
    const executionService = workflowExecutionService;
    
    // Node execution events
    const handleNodeStarted = (event: NodeExecutionEvent) => {
      updateNodeStatus(event.node_id, 'running');
      setNodeStatuses(prev => ({
        ...prev,
        [event.node_id]: {
          status: 'running',
          message: `Started ${event.node_type} node`,
          timestamp: event.timestamp
        }
      }));
      
      // Add to execution logs
      setExecutionLogs(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        type: 'node_started',
        timestamp: event.timestamp || new Date().toISOString(),
        nodeId: event.node_id,
        nodeType: event.node_type,
        message: `🚀 Started: ${event.node_type} (${event.node_id})`,
        level: 'info'
      }]);
      
      console.log('Node started:', event);
    };
    
    const handleNodeCompleted = (event: NodeExecutionEvent) => {
      updateNodeStatus(event.node_id, 'completed');
      setNodeStatuses(prev => ({
        ...prev,
        [event.node_id]: {
          status: 'completed',
          message: `Completed ${event.node_type} node`,
          timestamp: event.timestamp
        }
      }));
      
      // Add to execution logs with result details
      const logEntry: any = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'node_completed',
        timestamp: event.timestamp || new Date().toISOString(),
        nodeId: event.node_id,
        nodeType: event.node_type,
        message: `✅ Completed: ${event.node_type} (${event.node_id})`,
        level: 'success'
      };
      
      // Add python script output to logs
      if (event.data && typeof event.data === 'object') {
        if (event.data.output) {
          logEntry.output = event.data.output;
          logEntry.message += `\n📄 Output: ${event.data.output}`;
        }
        if (event.data.execution_time_ms) {
          logEntry.executionTime = event.data.execution_time_ms;
          logEntry.message += `\n⏱️  Execution time: ${event.data.execution_time_ms}ms`;
        }
        if (event.data.updated_variables && Object.keys(event.data.updated_variables).length > 0) {
          logEntry.updatedVariables = event.data.updated_variables;
          logEntry.message += `\n🔄 Updated variables: ${JSON.stringify(event.data.updated_variables)}`;
        }
      }
      
      setExecutionLogs(prev => [...prev, logEntry]);
      console.log('Node completed:', event);
    };
    
    const handleNodeFailed = (event: NodeExecutionEvent) => {
      updateNodeStatus(event.node_id, 'failed', event.error);
      setNodeStatuses(prev => ({
        ...prev,
        [event.node_id]: {
          status: 'failed',
          message: event.error || `Failed ${event.node_type} node`,
          timestamp: event.timestamp
        }
      }));
      
      // Add to execution logs
      setExecutionLogs(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        type: 'node_failed',
        timestamp: event.timestamp || new Date().toISOString(),
        nodeId: event.node_id,
        nodeType: event.node_type,
        message: `❌ Failed: ${event.node_type} (${event.node_id})\nError: ${event.error || 'Unknown error'}`,
        level: 'error'
      }]);
      
      console.error('Node failed:', event);
    };
    
    // Workflow execution events
    const handleWorkflowCompleted = (event: WorkflowExecutionEvent) => {
      setIsExecuting(false);
      
      const completedAt = event.timestamp || new Date().toISOString();
      const completedNodes = nodes.filter(n => n.data.status === 'completed' || n.data.status !== 'failed').length;
      const failedNodes = nodes.filter(n => n.data.status === 'failed').length;
      
      // Update execution state to completed with proper node counts
      const updatedExecution = execution ? {
        ...execution,
        status: 'completed',
        completed_at: completedAt,
        completed_nodes: completedNodes,
        failed_nodes: failedNodes
      } : null;
      
      setExecution(updatedExecution);
      
      // Add completion log
      const completionLog = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'workflow_completed',
        timestamp: completedAt,
        message: `🎉 Workflow completed successfully!`,
        level: 'success'
      };
      
      setExecutionLogs(prev => [...prev, completionLog]);
      
      // Save to execution history
      if (currentExecutionId && updatedExecution) {
        const historyEntry = {
          id: currentExecutionId,
          status: 'completed',
          started_at: updatedExecution.started_at,
          completed_at: completedAt,
          nodes: nodes.length,
          completed_nodes: completedNodes,
          failed_nodes: failedNodes,
          logs: [...executionLogs, completionLog],
          nodeStatuses: { ...nodeStatuses }
        };
        
        setExecutionHistory(prev => [historyEntry, ...prev.filter(h => h.id !== currentExecutionId)]);
        setSelectedExecutionId(currentExecutionId);
      }
      
      console.log('Workflow completed:', event);
    };
    
    const handleWorkflowFailed = (event: WorkflowExecutionEvent) => {
      setIsExecuting(false);
      
      const failedAt = event.timestamp || new Date().toISOString();
      const completedNodes = nodes.filter(n => n.data.status === 'completed').length;
      const failedNodes = nodes.filter(n => n.data.status === 'failed').length;
      
      // Update execution state to failed with proper node counts
      const updatedExecution = execution ? {
        ...execution,
        status: 'failed',
        completed_at: failedAt,
        completed_nodes: completedNodes,
        failed_nodes: failedNodes
      } : null;
      
      setExecution(updatedExecution);
      
      // Add failure log
      const failureLog = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'workflow_failed',
        timestamp: failedAt,
        message: `💥 Workflow failed: ${event.error || 'Unknown error'}`,
        level: 'error'
      };
      
      setExecutionLogs(prev => [...prev, failureLog]);
      
      // Save to execution history
      if (currentExecutionId && updatedExecution) {
        const historyEntry = {
          id: currentExecutionId,
          status: 'failed',
          started_at: updatedExecution.started_at,
          completed_at: failedAt,
          nodes: nodes.length,
          completed_nodes: completedNodes,
          failed_nodes: failedNodes,
          logs: [...executionLogs, failureLog],
          nodeStatuses: { ...nodeStatuses }
        };
        
        setExecutionHistory(prev => [historyEntry, ...prev.filter(h => h.id !== currentExecutionId)]);
        setSelectedExecutionId(currentExecutionId);
      }
      
      console.error('Workflow failed:', event);
    };
    
    const handleExecutionProgress = (data: { execution_id: string; state: WorkflowExecutionState }) => {
      if (data.execution_id === currentExecutionId) {
        setExecution(data.state);
        
        // Update node statuses based on execution state
        setNodes((nds) =>
          nds.map((node) => {
            let status: 'idle' | 'running' | 'completed' | 'failed' = 'idle';
            
            if (data.state.current_nodes.includes(node.id)) {
              status = 'running';
            } else if (data.state.completed_nodes > 0) {
              // This is simplified - in the backend we track individual node completion
              const nodeIndex = nds.findIndex(n => n.id === node.id);
              if (nodeIndex < data.state.completed_nodes) {
                status = 'completed';
              }
            }
            
            if (data.state.failed_nodes > 0 && status === 'idle') {
              status = 'failed';
            }
            
            return {
              ...node,
              data: { ...node.data, status }
            };
          })
        );
      }
    };
    
    // Register event listeners
    executionService.on('node:started', handleNodeStarted);
    executionService.on('node:completed', handleNodeCompleted);
    executionService.on('node:failed', handleNodeFailed);
    executionService.on('workflow:completed', handleWorkflowCompleted);
    executionService.on('workflow:failed', handleWorkflowFailed);
    executionService.on('execution:progress', handleExecutionProgress);
    
    // Cleanup on unmount
    return () => {
      executionService.off('node:started', handleNodeStarted);
      executionService.off('node:completed', handleNodeCompleted);
      executionService.off('node:failed', handleNodeFailed);
      executionService.off('workflow:completed', handleWorkflowCompleted);
      executionService.off('workflow:failed', handleWorkflowFailed);
      executionService.off('execution:progress', handleExecutionProgress);
    };
  }, [currentExecutionId]);
  
  // Helper function to update node status
  const updateNodeStatus = useCallback((nodeId: string, status: 'idle' | 'running' | 'completed' | 'failed', error?: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { 
              ...node.data, 
              status,
              error: status === 'failed' ? error : undefined
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);
  
  // Gather upstream data for single node execution
  const gatherUpstreamData = useCallback((nodeId: string) => {
    // Find all edges that connect to this node
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    const upstreamData: Record<string, any> = {};
    
    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        // Get the last execution data for the source node
        const nodeOutput = variableInspector.nodeOutputs.get(edge.source);
        if (nodeOutput) {
          upstreamData[edge.source] = nodeOutput;
        }
      }
    });
    
    return upstreamData;
  }, [edges, nodes, variableInspector.nodeOutputs]);

  // Execute single node for debugging
  const executeSingleNode = useCallback(async (nodeId: string, mockInput?: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      console.error('Node not found:', nodeId);
      return;
    }

    const startTime = Date.now();
    
    try {
      // Update UI to show node is running
      updateNodeStatus(nodeId, 'running');
      
      // Simulate node execution (in real implementation, this would call the backend)
      const inputData = mockInput || gatherUpstreamData(nodeId);
      
      // Call the backend API for single node execution
      const result = await fetch('http://localhost:8000/api/v1/debug/execute-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_id: nodeId,
          node_type: node.data.nodeType,
          config: node.data.config,
          input_data: inputData
        }),
      });
      
      const executionResult = await result.json();
      const endTime = Date.now();
      
      // Create debug step record
      const debugStep: DebugStep = {
        nodeId,
        timestamp: new Date(),
        input: inputData,
        output: executionResult.output,
        duration: endTime - startTime,
        status: executionResult.success ? 'success' : 'error',
        error: executionResult.error
      };
      
      // Update debug session
      if (debugSession) {
        const updatedHistory = [...debugSession.stepHistory, debugStep];
        setDebugSession({
          ...debugSession,
          stepHistory: updatedHistory,
          currentExecutionStep: updatedHistory.length
        });
        
        // Update node debug data
        const nodeDebugData = debugSession.nodeExecutionData.get(nodeId) || {
          lastExecution: null,
          breakpointEnabled: false,
          watchedVariables: [],
          executionHistory: []
        };
        
        nodeDebugData.lastExecution = debugStep;
        nodeDebugData.executionHistory.push(debugStep);
        debugSession.nodeExecutionData.set(nodeId, nodeDebugData);
      }
      
      // Update variable inspector
      setVariableInspector(prev => ({
        ...prev,
        nodeOutputs: new Map(prev.nodeOutputs).set(nodeId, executionResult.output),
        executionContext: {
          ...prev.executionContext,
          currentNode: nodeId
        }
      }));
      
      // Update node status and debug output
      updateNodeStatus(nodeId, executionResult.success ? 'completed' : 'failed', executionResult.error);
      
      // Update node with debug output
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  debugLastOutput: executionResult.output
                }
              }
            : node
        )
      );
      
      console.log('Single node execution completed:', debugStep);
      
    } catch (error) {
      console.error('Single node execution failed:', error);
      updateNodeStatus(nodeId, 'failed', (error as Error).message);
      
      const debugStep: DebugStep = {
        nodeId,
        timestamp: new Date(),
        input: mockInput,
        output: null,
        duration: Date.now() - startTime,
        status: 'error',
        error: (error as Error).message
      };
      
      if (debugSession) {
        const updatedHistory = [...debugSession.stepHistory, debugStep];
        setDebugSession({
          ...debugSession,
          stepHistory: updatedHistory
        });
      }
    }
  }, [nodes, debugSession, updateNodeStatus, gatherUpstreamData, setNodes, variableInspector.nodeOutputs]);
  
  // Stop execution function
  const stopExecution = useCallback(async () => {
    if (currentExecutionId) {
      try {
        await workflowExecutionService.cancelExecution(currentExecutionId);
        setIsExecuting(false);
        setExecution(null);
        setCurrentExecutionId(null);
        
        // Reset all node statuses
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: { ...node.data, status: 'idle', error: undefined }
          }))
        );
      } catch (error) {
        console.error('Failed to stop execution:', error);
        alert('Failed to stop execution: ' + (error as Error).message);
      }
    }
  }, [currentExecutionId, setNodes]);

  // Drag and drop functionality
  const onDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeType = event.dataTransfer.getData('application/reactflow');

      if (!nodeType || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const nodeTemplate = NODE_TYPES.find(n => n.type === nodeType);
      const newNode: Node<CustomNodeData> = {
        id: `${nodeType}_${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: nodeTemplate?.name || nodeType,
          nodeType: nodeType,
          config: {},
          status: 'idle'
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    const { source, target } = connection;
    
    if (!source || !target) return false;
    
    // Get source and target nodes
    const sourceNode = nodes.find(node => node.id === source);
    const targetNode = nodes.find(node => node.id === target);
    
    if (!sourceNode || !targetNode) return false;
    
    // Prevent self-connections
    if (source === target) return false;
    
    // Prevent duplicate connections
    const existingEdge = edges.find(edge => 
      edge.source === source && edge.target === target
    );
    if (existingEdge) return false;
    
    // Start nodes can connect to anything except other start nodes
    if (sourceNode.data.nodeType === 'start' && targetNode.data.nodeType === 'start') {
      return false;
    }
    
    // End nodes cannot connect to anything
    if (sourceNode.data.nodeType === 'end') {
      return false;
    }
    
    // Nothing can connect to start nodes (except during initial setup)
    if (targetNode.data.nodeType === 'start') {
      return false;
    }
    
    // Condition nodes should have specific connection rules
    if (sourceNode.data.nodeType === 'condition') {
      // Conditions can have at most 2 outgoing connections (true/false paths)
      const outgoingConnections = edges.filter(edge => edge.source === source);
      if (outgoingConnections.length >= 2) return false;
    }
    
    return true;
  }, [nodes, edges]);

  // Connection handling
  const onConnect = useCallback(
    (params: Connection) => {
      if (!isValidConnection(params)) {
        console.warn('Invalid connection attempt', params);
        return;
      }
      
      const newEdge = {
        ...params,
        id: `edge_${params.source}_${params.target}`,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: { strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, isValidConnection]
  );


  // Node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<CustomNodeData>) => {
    setSelectedNode(node);
  }, []);

  // Node updates
  const onUpdateNode = useCallback((nodeId: string, updates: Partial<CustomNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              ...updates,
            },
          };
          
          // Update selected node if it's the one being modified
          if (selectedNode && selectedNode.id === nodeId) {
            setSelectedNode(updatedNode);
          }
          
          return updatedNode;
        }
        return node;
      })
    );
  }, [setNodes, selectedNode]);

  // Convert React Flow state to workflow definition
  const getWorkflowDefinition = useCallback((): WorkflowDefinition => {
    const workflowNodes: Record<string, any> = {};
    
    nodes.forEach(node => {
      const connections = edges
        .filter(edge => edge.source === node.id)
        .map(edge => edge.target);
        
      workflowNodes[node.id] = {
        id: node.id,
        type: node.data.nodeType,
        name: node.data.label,
        position: node.position,
        config: node.data.config,
        connections
      };
    });

    return {
      id: `workflow_${Date.now()}`,
      name: workflowName,
      description: `Workflow created with ProcessIQ Designer`,
      nodes: workflowNodes,
      variables: {},
      triggers: []
    };
  }, [nodes, edges, workflowName]);

  // Validate workflow before execution
  const validateWorkflow = useCallback(() => {
    // Check if workflow has at least one start node
    const startNodes = nodes.filter(node => node.data.nodeType === 'start');
    if (startNodes.length === 0) {
      alert('Workflow must have at least one Start node');
      return false;
    }
    
    if (startNodes.length > 1) {
      alert('Workflow can only have one Start node');
      return false;
    }
    
    // Check if workflow has at least one end node
    const endNodes = nodes.filter(node => node.data.nodeType === 'end');
    if (endNodes.length === 0) {
      alert('Workflow must have at least one End node');
      return false;
    }
    
    // Check if all nodes (except end nodes) have outgoing connections
    const nodeConnections = new Map<string, string[]>();
    edges.forEach(edge => {
      if (!nodeConnections.has(edge.source)) {
        nodeConnections.set(edge.source, []);
      }
      nodeConnections.get(edge.source)!.push(edge.target);
    });
    
    const disconnectedNodes = nodes.filter(node => 
      node.data.nodeType !== 'end' && 
      (!nodeConnections.has(node.id) || nodeConnections.get(node.id)!.length === 0)
    );
    
    if (disconnectedNodes.length > 0) {
      const nodeNames = disconnectedNodes.map(node => node.data.label).join(', ');
      alert(`The following nodes are not connected to anything: ${nodeNames}`);
      return false;
    }
    
    // Validate node configurations
    for (const node of nodes) {
      const { nodeType, config } = node.data;
      
      // Check browser_navigate nodes have URL
      if (nodeType === 'browser_navigate' && (!config.url || config.url.trim() === '')) {
        alert(`Browser Navigate node "${node.data.label}" requires a URL`);
        return false;
      }
      
      // Check email_send nodes have required fields
      if (nodeType === 'email_send') {
        if (!config.to || config.to.trim() === '') {
          alert(`Email Send node "${node.data.label}" requires a recipient email`);
          return false;
        }
        if (!config.subject || config.subject.trim() === '') {
          alert(`Email Send node "${node.data.label}" requires a subject`);
          return false;
        }
      }
      
      // Check database_query nodes have query
      if (nodeType === 'database_query' && (!config.query || config.query.trim() === '')) {
        alert(`Database Query node "${node.data.label}" requires a SQL query`);
        return false;
      }
      
      // Check condition nodes have condition
      if (nodeType === 'condition' && (!config.condition || config.condition.trim() === '')) {
        alert(`Condition node "${node.data.label}" requires a condition expression`);
        return false;
      }
    }
    
    return true;
  }, [nodes, edges]);

  // Professional workflow execution using the execution service
  const executeWorkflow = useCallback(async () => {
    try {
      // Validate workflow first
      if (!validateWorkflow()) {
        return;
      }
      
      const workflow = getWorkflowDefinition();
      setIsExecuting(true);
      
      // Clear previous execution logs
      setExecutionLogs([]);
      
      // Add workflow start log
      setExecutionLogs([{
        id: `${Date.now()}-${Math.random()}`,
        type: 'workflow_started',
        timestamp: new Date().toISOString(),
        message: `🎬 Starting workflow: ${workflow.name || workflow.id}`,
        level: 'info'
      }]);
      
      // Reset node statuses
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, status: 'idle', error: undefined }
        }))
      );
      
      // Execute workflow using the professional service
      const result = await workflowExecutionService.executeWorkflow(
        workflow,
        {},
        'manual'
      );
      
      setCurrentExecutionId(result.execution_id);
      
      // Create initial execution state for immediate UI feedback
      setExecution({
        execution_id: result.execution_id,
        workflow_id: result.workflow_id,
        status: 'running',
        started_at: new Date().toISOString(),
        completed_nodes: 0,
        failed_nodes: 0,
        current_nodes: [],
        variables: {}
      });
      
      console.log('Workflow execution started:', result);
      
    } catch (error) {
      console.error('Workflow execution error:', error);
      alert(`Workflow execution error: ${(error as Error).message}`);
      setIsExecuting(false);
      
      // Reset node statuses on error
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, status: 'idle', error: undefined }
        }))
      );
    }
  }, [getWorkflowDefinition, setNodes, validateWorkflow]);


  // Export workflow as JSON file
  const exportWorkflow = useCallback(() => {
    const workflow = getWorkflowDefinition();
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getWorkflowDefinition, workflowName]);

  // Save workflow to backend storage
  const saveWorkflow = useCallback(async () => {
    try {
      if (!workflowName.trim()) {
        alert('Please enter a workflow name');
        return;
      }

      const workflow = getWorkflowDefinition();
      const isUpdate = currentWorkflowId !== null;
      
      const url = isUpdate 
        ? `http://localhost:8000/api/v1/workflows/${currentWorkflowId}`
        : 'http://localhost:8000/api/v1/workflows/';
        
      const method = isUpdate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workflowName,
          description: `Workflow created with ProcessIQ Designer`,
          nodes: workflow.nodes,
          edges: edges, // Include edges in the saved data
          variables: workflow.variables || {},
          triggers: workflow.triggers || [],
          tags: []
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save workflow: ${errorText}`);
      }

      const savedWorkflow = await response.json();
      
      // If this was a new workflow, set the current workflow ID for future saves
      if (!isUpdate && savedWorkflow.id) {
        setCurrentWorkflowId(savedWorkflow.id);
      }
      
      const action = isUpdate ? 'updated' : 'created';
      alert(`✅ Workflow "${workflowName}" ${action} successfully!`);
      console.log('Workflow saved:', savedWorkflow);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert(`❌ Failed to save workflow: ${(error as Error).message}`);
    }
  }, [getWorkflowDefinition, workflowName, currentWorkflowId, edges]);

  // Load workflow
  const loadWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target?.result as string);
          setWorkflowName(workflow.name);
          
          // Convert workflow nodes to React Flow nodes
          const flowNodes: Node<CustomNodeData>[] = Object.entries(workflow.nodes).map(([id, nodeData]: [string, any]) => ({
            id,
            type: 'custom',
            position: nodeData.position,
            data: {
              label: nodeData.name,
              nodeType: nodeData.type,
              config: nodeData.config,
              status: 'idle'
            }
          }));

          // Convert connections to React Flow edges
          const flowEdges: Edge[] = [];
          Object.entries(workflow.nodes).forEach(([sourceId, nodeData]: [string, any]) => {
            if (nodeData.connections) {
              nodeData.connections.forEach((targetId: string) => {
                flowEdges.push({
                  id: `edge_${sourceId}_${targetId}`,
                  source: sourceId,
                  target: targetId,
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                  },
                  style: { strokeWidth: 2 },
                });
              });
            }
          });

          setNodes(flowNodes);
          setEdges(flowEdges);
          
          // Fit view to loaded workflow after a small delay
          setTimeout(() => {
            if (reactFlowInstance) {
              reactFlowInstance.fitView({ 
                padding: 100, 
                maxZoom: 1.0,
                duration: 500 
              });
            }
          }, 100);
        } catch (error) {
          console.error('Failed to load workflow:', error);
        }
      };
      reader.readAsText(file);
    }
  }, [setNodes, setEdges]);

  // Delete selected nodes and edges
  const deleteSelectedElements = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    const selectedEdges = edges.filter(edge => edge.selected);
    const selectedNodeIds = selectedNodes.map(node => node.id);
    const selectedEdgeIds = selectedEdges.map(edge => edge.id);
    
    // Remove selected nodes
    if (selectedNodeIds.length > 0) {
      setNodes((nds) => nds.filter(node => !selectedNodeIds.includes(node.id)));
      // Also remove edges connected to deleted nodes
      setEdges((eds) => eds.filter(edge => 
        !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
      ));
      
      if (selectedNode && selectedNodeIds.includes(selectedNode.id)) {
        setSelectedNode(null);
      }
    }
    
    // Remove selected edges
    if (selectedEdgeIds.length > 0) {
      setEdges((eds) => eds.filter(edge => !selectedEdgeIds.includes(edge.id)));
    }
  }, [nodes, edges, selectedNode, setNodes, setEdges]);

  // Keyboard shortcuts
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Don't handle keyboard shortcuts if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelectedElements();
    }
  }, [deleteSelectedElements]);

  return (
    <div className="h-full flex flex-col" onKeyDown={onKeyDown} tabIndex={0}>
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Workflow Designer</h1>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground mb-1">Workflow Name</label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Enter workflow name..."
                className="px-3 py-1 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[250px]"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative group">
              {currentWorkflowId ? (
                <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all duration-200 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={saveWorkflow}
                  className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all duration-200 shadow-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
              )}
              {currentWorkflowId && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <button
                    onClick={saveWorkflow}
                    className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Update
                  </button>
                  <button
                    onClick={() => {
                      setCurrentWorkflowId(null);
                      saveWorkflow();
                    }}
                    className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Save as New
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={exportWorkflow}
              className="flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <label className="flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Load
              <input
                type="file"
                accept=".json"
                onChange={loadWorkflow}
                className="hidden"
              />
            </label>
            
            <button
              onClick={executeWorkflow}
              disabled={isExecuting}
              className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute
                </>
              )}
            </button>
            
            {isExecuting && (
              <button
                onClick={stopExecution}
                className="flex items-center px-3 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mt-4">
          {[
            { key: 'design', label: 'Design', icon: Settings },
            { key: 'execute', label: 'Execute', icon: Monitor },
            { key: 'debug', label: 'Debug', icon: Bug }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-3 py-2 rounded ${
                activeTab === tab.key 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node Sidebar */}
        {activeTab === 'design' && (
          <NodeSidebar onDragStart={onDragStart} />
        )}
        
        {/* Status Sidebar */}
        {activeTab !== 'design' && (
          <div className="w-64 border-r bg-background p-4">

            {activeTab === 'execute' && (
              <div>
                <h3 className="font-semibold mb-3 text-foreground">Execution Status</h3>
                
                {execution && (
                  <div className="space-y-3">
                    <div className="p-3 bg-secondary rounded">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between items-center">
                          <span>Status:</span>
                          <div className="flex items-center">
                            {execution.status === 'running' && <Clock className="w-3 h-3 mr-1 text-blue-600 animate-spin" />}
                            {execution.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1 text-green-600" />}
                            {execution.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1 text-red-600" />}
                            <span className={`font-medium ${
                              execution.status === 'completed' ? 'text-green-600' :
                              execution.status === 'failed' ? 'text-red-600' :
                              execution.status === 'running' ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>
                              {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span>Progress:</span>
                          <span>{execution.completed_nodes}/{nodes.length} nodes</span>
                        </div>
                        {execution.failed_nodes > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Failed:</span>
                            <span>{execution.failed_nodes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {execution.current_nodes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-blue-600 animate-spin" />
                          Currently Running:
                        </h4>
                        <div className="space-y-1">
                          {execution.current_nodes.map(nodeId => {
                            const node = nodes.find(n => n.id === nodeId);
                            const nodeStatus = nodeStatuses[nodeId];
                            return (
                              <div key={nodeId} className="text-xs bg-blue-50 border border-blue-200 p-2 rounded">
                                <div className="font-medium text-blue-800">
                                  {node?.data.label || nodeId}
                                </div>
                                {nodeStatus?.message && (
                                  <div className="text-blue-600 mt-1">
                                    {nodeStatus.message}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {Object.keys(nodeStatuses).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Node Status History:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {Object.entries(nodeStatuses).map(([nodeId, status]) => {
                            const node = nodes.find(n => n.id === nodeId);
                            return (
                              <div key={nodeId} className={`text-xs p-2 rounded border ${
                                status.status === 'completed' ? 'bg-green-50 border-green-200 text-green-800' :
                                status.status === 'failed' ? 'bg-red-50 border-red-200 text-red-800' :
                                status.status === 'running' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                                'bg-gray-50 border-gray-200 text-gray-800'
                              }`}>
                                <div className="font-medium">
                                  {node?.data.label || nodeId}
                                </div>
                                <div className="flex justify-between items-start mt-1">
                                  <span>{status.message}</span>
                                  {status.timestamp && (
                                    <span className="text-xs opacity-75">
                                      {new Date(status.timestamp).toLocaleTimeString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {!execution && !isExecuting && (
                  <p className="text-muted-foreground text-sm">
                    No active execution. Click Execute to run the workflow.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="space-y-4">
                {/* Debug Session Controls */}
                <div>
                  <h3 className="font-semibold mb-3 text-foreground">Debug Session</h3>
                  <div className="space-y-2">
                    {!debugSession ? (
                      <button 
                        onClick={() => createDebugSession('step')}
                        className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start Debug Session
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setDebugSession({...debugSession, status: debugSession.status === 'paused' ? 'active' : 'paused'})}
                            className="flex-1 px-2 py-1.5 bg-secondary rounded text-xs hover:bg-secondary/80 flex items-center justify-center gap-1"
                            title={debugSession.status === 'paused' ? 'Resume' : 'Pause'}
                          >
                            {debugSession.status === 'paused' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          </button>
                          <button 
                            onClick={stopDebugSession}
                            className="flex-1 px-2 py-1.5 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/90 flex items-center justify-center gap-1"
                            title="Stop"
                          >
                            <Square className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-xs text-center p-2 bg-secondary/50 rounded">
                          Status: <span className="font-medium capitalize">{debugSession.status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Debug Mode Selection */}
                <div>
                  <h4 className="font-medium mb-2 text-sm text-foreground">Debug Mode</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {[
                      { mode: 'step' as const, label: 'Step Through', icon: StepForward },
                      { mode: 'run' as const, label: 'Run with Breakpoints', icon: Target },
                      { mode: 'single-node' as const, label: 'Single Node Test', icon: Circle }
                    ].map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        onClick={() => debugSession && setDebugSession({...debugSession, mode})}
                        className={`w-full px-3 py-2 rounded text-xs flex items-center gap-2 ${
                          debugSession?.mode === mode 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Single Node Testing */}
                {debugSession?.mode === 'single-node' && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-foreground">Single Node Test</h4>
                    <div className="space-y-2">
                      <select 
                        value={selectedDebugNode || ''}
                        onChange={(e) => setSelectedDebugNode(e.target.value || null)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs"
                      >
                        <option value="">Select Node</option>
                        {nodes.map(node => (
                          <option key={node.id} value={node.id}>
                            {node.data.label || 'Untitled Node'}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => selectedDebugNode && executeSingleNode(selectedDebugNode)}
                        disabled={!selectedDebugNode}
                        className="w-full px-3 py-2 bg-accent text-accent-foreground rounded text-xs hover:bg-accent/80 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Play className="w-3 h-3" />
                        Test Node
                      </button>
                    </div>
                  </div>
                )}

                {/* Breakpoints */}
                <div>
                  <h4 className="font-medium mb-2 text-sm text-foreground flex items-center gap-2">
                    <Dot className="w-4 h-4 text-red-500" />
                    Breakpoints ({debugSession?.breakpoints.size || 0})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {debugSession && debugSession.breakpoints.size > 0 ? (
                      Array.from(debugSession.breakpoints).map(nodeId => {
                        const node = nodes.find(n => n.id === nodeId);
                        return (
                          <div key={nodeId} className="flex items-center justify-between px-2 py-1 bg-secondary rounded text-xs">
                            <span className="truncate">{node?.data.label || nodeId}</span>
                            <button
                              onClick={() => toggleBreakpoint(nodeId)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove breakpoint"
                            >
                              <Circle className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground p-2 bg-secondary/50 rounded">
                        No breakpoints set. Right-click nodes to add.
                      </p>
                    )}
                  </div>
                </div>

                {/* Watch Variables */}
                <div>
                  <h4 className="font-medium mb-2 text-sm text-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Variables
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {variableInspector.executionContext.currentNode ? (
                      <div className="space-y-1">
                        <div className="px-2 py-1 bg-secondary rounded text-xs">
                          <div className="font-medium">Current Node:</div>
                          <div className="text-muted-foreground truncate">
                            {nodes.find(n => n.id === variableInspector.executionContext.currentNode)?.data.label || variableInspector.executionContext.currentNode}
                          </div>
                        </div>
                        {variableInspector.nodeOutputs.has(variableInspector.executionContext.currentNode) && (
                          <div className="px-2 py-1 bg-secondary rounded text-xs">
                            <div className="font-medium">Output:</div>
                            <div className="text-muted-foreground max-h-16 overflow-y-auto">
                              <pre className="text-xs">
                                {JSON.stringify(variableInspector.nodeOutputs.get(variableInspector.executionContext.currentNode), null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground p-2 bg-secondary/50 rounded">
                        No variables to watch. Run a node to see data.
                      </p>
                    )}
                  </div>
                </div>

                {/* Debug History */}
                {debugSession && debugSession.stepHistory.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Execution History
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {debugSession.stepHistory.slice(-5).map((step, index) => {
                        const node = nodes.find(n => n.id === step.nodeId);
                        return (
                          <div key={`${step.nodeId}-${index}`} className="px-2 py-1 bg-secondary rounded text-xs">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{node?.data.label || step.nodeId}</span>
                              <span className={`w-2 h-2 rounded-full ${step.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {step.duration}ms
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          {activeTab === 'design' && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodesDelete={(nodesToDelete) => {
                const nodeIds = nodesToDelete.map(node => node.id);
                setEdges((eds) => eds.filter(edge => 
                  !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
                ));
                if (selectedNode && nodeIds.includes(selectedNode.id)) {
                  setSelectedNode(null);
                }
              }}
              onEdgesDelete={() => {}}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              isValidConnection={isValidConnection}
              deleteKeyCode={['Delete', 'Backspace']}
              multiSelectionKeyCode="Shift"
              defaultViewport={{ x: 50, y: 50, zoom: 0.75 }}
              fitViewOptions={{ 
                padding: 100, 
                maxZoom: 1.2,
                minZoom: 0.3 
              }}
              className="bg-muted/30"
            >
              <Controls 
                showInteractive={false}
                showFitView={true}
                showZoom={true}
                fitViewOptions={{ 
                  padding: 100, 
                  maxZoom: 1.0 
                }}
              />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.data.status) {
                    case 'running': return '#3b82f6';
                    case 'completed': return '#10b981';
                    case 'failed': return '#ef4444';
                    default: return '#6b7280';
                  }
                }}
                style={{
                  height: 120,
                  width: 200,
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px'
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          )}

          {activeTab === 'execute' && (
            <ExecutionMonitorTab 
              execution={execution}
              nodes={nodes}
              edges={edges}
              executionLogs={executionLogs}
              onNodeSelect={(nodeId) => console.log('Node selected:', nodeId)}
            />
          )}

          {activeTab === 'debug' && (
            <div className="h-full flex flex-col">
              {/* Debug Tab Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-background">
                <div className="flex items-center gap-3">
                  <Bug className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Debug Console</h2>
                  {debugSession && (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        debugSession.status === 'active' ? 'bg-green-500' : 
                        debugSession.status === 'paused' ? 'bg-yellow-500' : 
                        'bg-gray-500'
                      }`} />
                      <span className="text-sm text-muted-foreground capitalize">
                        {debugSession.status}
                      </span>
                    </div>
                  )}
                </div>
                
                {debugSession && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDebugSession({...debugSession, mode: 'step'})}
                      className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${
                        debugSession.mode === 'step' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
                      }`}
                      title="Step Through Mode"
                    >
                      <StepForward className="w-4 h-4" />
                      Step
                    </button>
                    <button
                      onClick={() => setDebugSession({...debugSession, mode: 'single-node'})}
                      className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${
                        debugSession.mode === 'single-node' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
                      }`}
                      title="Single Node Test Mode"
                    >
                      <Target className="w-4 h-4" />
                      Test
                    </button>
                  </div>
                )}
              </div>

              {!debugSession ? (
                /* Welcome State */
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Bug className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">
                      Start Debugging
                    </h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      Debug your workflow with breakpoints, single node testing, and real-time variable inspection. 
                      Perfect for testing individual nodes and troubleshooting workflow logic.
                    </p>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => createDebugSession('step')}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 font-medium"
                      >
                        <StepForward className="w-4 h-4" />
                        Start Step-by-Step Debug
                      </button>
                      <button 
                        onClick={() => createDebugSession('single-node')}
                        className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 flex items-center justify-center gap-2"
                      >
                        <Target className="w-4 h-4" />
                        Single Node Testing
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Debug Session Interface */
                <div className="flex-1 flex">
                  {/* Left Panel - Canvas/Flow View */}
                  <div className="flex-1 relative">
                    <ReactFlow
                      nodes={nodes.map(node => ({
                        ...node,
                        data: {
                          ...node.data,
                          // Add breakpoint visual indicator
                          hasBreakpoint: debugSession.breakpoints.has(node.id),
                          isCurrentDebugNode: variableInspector.executionContext.currentNode === node.id
                        }
                      }))}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onNodeClick={(event, node) => {
                        // Debug mode node click behavior
                        if (event.detail === 2) { // Double click
                          executeSingleNode(node.id);
                        } else if (event.ctrlKey || event.metaKey) { // Ctrl/Cmd click
                          toggleBreakpoint(node.id);
                        } else {
                          setSelectedDebugNode(node.id);
                        }
                      }}
                      nodeTypes={nodeTypes}
                      className="debug-canvas bg-muted/20"
                      defaultViewport={{ x: 50, y: 50, zoom: 0.75 }}
                      fitViewOptions={{ padding: 100, maxZoom: 1.0 }}
                    >
                      <Controls showInteractive={false} />
                      <MiniMap
                        nodeColor={(node) => {
                          if (debugSession.breakpoints.has(node.id)) return '#ef4444';
                          if (variableInspector.executionContext.currentNode === node.id) return '#f59e0b';
                          switch (node.data.status) {
                            case 'running': return '#3b82f6';
                            case 'completed': return '#10b981';
                            case 'failed': return '#ef4444';
                            default: return '#6b7280';
                          }
                        }}
                        maskColor="rgba(0, 0, 0, 0.1)"
                      />
                      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                    </ReactFlow>

                    {/* Debug Overlay */}
                    <div className="absolute top-4 left-4 bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
                      <div className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        Debug Controls
                      </div>
                      <div className="flex gap-1">
                        {debugSession.mode === 'step' && (
                          <>
                            <button
                              className="px-2 py-1 bg-secondary rounded text-xs hover:bg-secondary/80 flex items-center gap-1"
                              title="Step Into"
                            >
                              <StepForward className="w-3 h-3" />
                            </button>
                            <button
                              className="px-2 py-1 bg-secondary rounded text-xs hover:bg-secondary/80 flex items-center gap-1"
                              title="Step Over"
                            >
                              <SkipForward className="w-3 h-3" />
                            </button>
                            <button
                              className="px-2 py-1 bg-secondary rounded text-xs hover:bg-secondary/80 flex items-center gap-1"
                              title="Step Back"
                            >
                              <StepBack className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => selectedDebugNode && executeSingleNode(selectedDebugNode)}
                          disabled={!selectedDebugNode}
                          className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                          title="Execute Selected Node"
                        >
                          <Play className="w-3 h-3" />
                          Run
                        </button>
                      </div>
                      {selectedDebugNode && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Selected: {nodes.find(n => n.id === selectedDebugNode)?.data.label || 'Unknown'}
                        </div>
                      )}
                    </div>

                    {/* Instructions Overlay */}
                    <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg max-w-xs">
                      <div className="text-sm font-medium mb-1">Debug Tips:</div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li>• Double-click nodes to test them</li>
                        <li>• Ctrl/Cmd+click to toggle breakpoints</li>
                        <li>• Click to select for single execution</li>
                      </ul>
                    </div>
                  </div>

                  {/* Right Panel - Variable Inspector & Timeline */}
                  <div className="w-80 border-l border-border bg-background flex flex-col">
                    {/* Variable Inspector */}
                    <div className="p-4 border-b border-border">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Variable className="w-4 h-4" />
                        Variable Inspector
                      </h3>
                      <div className="space-y-3">
                        {variableInspector.executionContext.currentNode ? (
                          <div className="space-y-2">
                            <div className="p-2 bg-secondary rounded text-sm">
                              <div className="font-medium text-foreground">Current Node:</div>
                              <div className="text-muted-foreground text-xs truncate">
                                {nodes.find(n => n.id === variableInspector.executionContext.currentNode)?.data.label || 'Unknown'}
                              </div>
                            </div>
                            {variableInspector.nodeOutputs.has(variableInspector.executionContext.currentNode) && (
                              <div className="p-2 bg-secondary rounded text-sm">
                                <div className="font-medium text-foreground mb-1">Output Data:</div>
                                <div className="max-h-32 overflow-auto bg-background rounded p-2">
                                  <pre className="text-xs text-muted-foreground">
                                    {JSON.stringify(variableInspector.nodeOutputs.get(variableInspector.executionContext.currentNode), null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-secondary/50 rounded text-sm text-muted-foreground text-center">
                            Run a node to see variable data
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Execution Timeline */}
                    <div className="flex-1 p-4">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Execution Timeline
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {debugSession.stepHistory.length > 0 ? (
                          debugSession.stepHistory.slice().reverse().map((step, index) => {
                            const node = nodes.find(n => n.id === step.nodeId);
                            return (
                              <div key={`${step.nodeId}-${index}`} className="p-2 bg-secondary rounded text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium truncate">{node?.data.label || step.nodeId}</span>
                                  <div className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${step.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <span className="text-xs text-muted-foreground">{step.duration}ms</span>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {step.timestamp.toLocaleTimeString()}
                                </div>
                                {step.error && (
                                  <div className="mt-1 text-xs text-red-600 bg-red-50 dark:bg-red-950 rounded p-1">
                                    {step.error}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 bg-secondary/50 rounded text-sm text-muted-foreground text-center">
                            No execution history yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedNode && activeTab === 'design' && (
          <PropertyPanel 
            selectedNode={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdateNode={onUpdateNode}
          />
        )}
      </div>
    </div>
  );
}

export default function WorkflowDesigner() {
  return (
    <ReactFlowProvider>
      <WorkflowDesignerContent />
    </ReactFlowProvider>
  );
}