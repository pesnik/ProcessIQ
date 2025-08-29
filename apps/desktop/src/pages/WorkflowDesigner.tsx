import React, { useState, useCallback, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Save, 
  Upload, 
  Download,
  Zap,
  Monitor,
  Database,
  Mail,
  FileText,
  Globe,
  Settings,
  Bug,
  Users,
  Shield
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  connections: string[];
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: Record<string, WorkflowNode>;
  variables: Record<string, any>;
  triggers: any[];
}

interface WorkflowExecution {
  execution_id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  completed_nodes: number;
  failed_nodes: number;
  current_nodes: string[];
  variables: Record<string, any>;
}

const NODE_TYPES = [
  { type: 'start', name: 'Start', icon: Play, category: 'Control' },
  { type: 'end', name: 'End', icon: Square, category: 'Control' },
  { type: 'browser_open', name: 'Open Browser', icon: Globe, category: 'Web' },
  { type: 'browser_navigate', name: 'Navigate', icon: Globe, category: 'Web' },
  { type: 'browser_extract', name: 'Extract Data', icon: Globe, category: 'Web' },
  { type: 'excel_read', name: 'Read Excel', icon: FileText, category: 'Data' },
  { type: 'excel_write', name: 'Write Excel', icon: FileText, category: 'Data' },
  { type: 'email_send', name: 'Send Email', icon: Mail, category: 'Communication' },
  { type: 'database_query', name: 'Database Query', icon: Database, category: 'Data' },
  { type: 'python_script', name: 'Python Script', icon: Zap, category: 'Processing' },
];

export default function WorkflowDesigner() {
  const [workflow, setWorkflow] = useState<WorkflowDefinition>({
    id: 'new-workflow',
    name: 'New Workflow',
    description: 'Untitled workflow',
    nodes: {},
    variables: {},
    triggers: []
  });
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'execute' | 'debug' | 'security'>('design');

  // Node management
  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const nodeId = `node_${Date.now()}`;
    const nodeTemplate = NODE_TYPES.find(n => n.type === nodeType);
    
    const newNode: WorkflowNode = {
      id: nodeId,
      type: nodeType,
      name: nodeTemplate?.name || nodeType,
      position,
      config: {},
      connections: []
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: newNode
      }
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow(prev => {
      const newNodes = { ...prev.nodes };
      delete newNodes[nodeId];
      
      // Remove connections to this node
      Object.values(newNodes).forEach(node => {
        node.connections = node.connections.filter(conn => conn !== nodeId);
      });

      return { ...prev, nodes: newNodes };
    });
    
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          ...prev.nodes[nodeId],
          config: { ...prev.nodes[nodeId].config, ...config }
        }
      }
    }));
  }, []);

  // Workflow execution
  const executeWorkflow = useCallback(async () => {
    setIsExecuting(true);
    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_definition: workflow,
          variables: workflow.variables,
          triggered_by: 'manual'
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Poll for execution status
        const pollExecution = async (executionId: string) => {
          const statusResponse = await fetch(`/api/workflows/execution/${executionId}`);
          if (statusResponse.ok) {
            const executionData = await statusResponse.json();
            setExecution(executionData);
            
            if (executionData.status === 'running') {
              setTimeout(() => pollExecution(executionId), 1000);
            } else {
              setIsExecuting(false);
            }
          }
        };

        await pollExecution(result.execution_id);
      }
    } catch (error) {
      console.error('Workflow execution failed:', error);
      setIsExecuting(false);
    }
  }, [workflow]);

  const stopExecution = useCallback(async () => {
    if (execution) {
      try {
        await fetch(`/api/workflows/execution/${execution.execution_id}`, {
          method: 'DELETE'
        });
        setIsExecuting(false);
      } catch (error) {
        console.error('Failed to stop execution:', error);
      }
    }
  }, [execution]);

  // Workflow persistence
  const saveWorkflow = useCallback(async () => {
    try {
      const blob = new Blob([JSON.stringify(workflow, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflow.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  }, [workflow]);

  const loadWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const loadedWorkflow = JSON.parse(e.target?.result as string);
          setWorkflow(loadedWorkflow);
        } catch (error) {
          console.error('Failed to load workflow:', error);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workflow Designer</h1>
            <p className="text-muted-foreground">{workflow.name}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={saveWorkflow}
              className="flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
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
            { key: 'debug', label: 'Debug', icon: Bug },
            { key: 'security', label: 'Security', icon: Shield }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-3 py-2 rounded ${
                activeTab === tab.key 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-background p-4">
          {activeTab === 'design' && (
            <div>
              <h3 className="font-semibold mb-3">Node Library</h3>
              
              {['Control', 'Web', 'Data', 'Communication', 'Processing'].map(category => (
                <div key={category} className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}</h4>
                  <div className="space-y-1">
                    {NODE_TYPES.filter(node => node.category === category).map(node => (
                      <button
                        key={node.type}
                        onClick={() => addNode(node.type, { x: 200, y: 200 })}
                        className="w-full flex items-center px-3 py-2 text-sm bg-secondary rounded hover:bg-secondary/80"
                      >
                        <node.icon className="w-4 h-4 mr-2" />
                        {node.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'execute' && (
            <div>
              <h3 className="font-semibold mb-3">Execution Status</h3>
              
              {execution && (
                <div className="space-y-2">
                  <div className="p-3 bg-secondary rounded">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-medium ${
                          execution.status === 'completed' ? 'text-green-600' :
                          execution.status === 'failed' ? 'text-red-600' :
                          execution.status === 'running' ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {execution.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span>{execution.completed_nodes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <span>{execution.failed_nodes}</span>
                      </div>
                    </div>
                  </div>
                  
                  {execution.current_nodes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Current Nodes:</h4>
                      {execution.current_nodes.map(nodeId => (
                        <div key={nodeId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1">
                          {nodeId}
                        </div>
                      ))}
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
            <div>
              <h3 className="font-semibold mb-3">Debug Tools</h3>
              
              <div className="space-y-2">
                <button className="w-full px-3 py-2 bg-secondary rounded text-sm hover:bg-secondary/80">
                  Set Breakpoint
                </button>
                <button className="w-full px-3 py-2 bg-secondary rounded text-sm hover:bg-secondary/80">
                  Watch Variables
                </button>
                <button className="w-full px-3 py-2 bg-secondary rounded text-sm hover:bg-secondary/80">
                  Step Through
                </button>
                <button className="w-full px-3 py-2 bg-secondary rounded text-sm hover:bg-secondary/80">
                  Performance Profile
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-secondary rounded">
                <h4 className="text-sm font-medium mb-2">Debug Session</h4>
                <p className="text-xs text-muted-foreground">
                  No active debug session. Execute workflow with debugging enabled.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h3 className="font-semibold mb-3">Security & Access</h3>
              
              <div className="space-y-2">
                <button className="w-full flex items-center px-3 py-2 bg-secondary rounded text-sm hover:bg-secondary/80">
                  <Users className="w-4 h-4 mr-2" />
                  Users & Teams
                </button>
                <button className="w-full flex items-center px-3 py-2 bg-secondary rounded text-sm hover:bg-secondary/80">
                  <Shield className="w-4 h-4 mr-2" />
                  Permissions
                </button>
                <button className="w-full flex items-center px-3 py-2 bg-secondary rounded text-sm hover:bg-secondary/80">
                  <FileText className="w-4 h-4 mr-2" />
                  Activity Log
                </button>
                <button className="w-full flex items-center px-3 py-2 bg-secondary rounded text-sm hover:bg-secondary/80">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </button>
              </div>

              <div className="mt-4 p-3 bg-secondary rounded">
                <h4 className="text-sm font-medium mb-2">Current Access</h4>
                <p className="text-xs text-muted-foreground">
                  You can create and execute workflows. 
                  Contact admin for user management access.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative bg-grid-pattern overflow-auto">
          <div className="absolute inset-0 p-8">
            {activeTab === 'design' && (
              <div className="relative h-full">
                {/* Workflow Canvas */}
                <div className="bg-background/50 rounded-lg border-2 border-dashed border-muted-foreground/30 h-full flex items-center justify-center">
                  {Object.keys(workflow.nodes).length === 0 ? (
                    <div className="text-center">
                      <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Start Building Your Workflow
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Add nodes from the sidebar to begin creating your automation workflow
                      </p>
                      <button
                        onClick={() => addNode('start', { x: 200, y: 150 })}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        Add Start Node
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Render workflow nodes */}
                      {Object.entries(workflow.nodes).map(([nodeId, node]) => (
                        <div
                          key={nodeId}
                          style={{
                            position: 'absolute',
                            left: node.position.x,
                            top: node.position.y,
                          }}
                          onClick={() => setSelectedNode(nodeId)}
                          className={`bg-background border-2 rounded-lg p-3 cursor-pointer min-w-[120px] ${
                            selectedNode === nodeId 
                              ? 'border-primary shadow-lg' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            {(() => {
                              const nodeType = NODE_TYPES.find(n => n.type === node.type);
                              const Icon = nodeType?.icon || Zap;
                              return <Icon className="w-4 h-4" />;
                            })()}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNode(nodeId);
                              }}
                              className="text-muted-foreground hover:text-destructive text-xs"
                            >
                              ×
                            </button>
                          </div>
                          <div className="text-sm font-medium">{node.name}</div>
                          <div className="text-xs text-muted-foreground">{node.type}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'execute' && (
              <div className="bg-background rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Execution Monitor</h2>
                
                {execution ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-secondary p-4 rounded">
                        <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                        <p className="text-2xl font-bold">{execution.status}</p>
                      </div>
                      <div className="bg-secondary p-4 rounded">
                        <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
                        <p className="text-2xl font-bold">
                          {execution.completed_nodes}/{Object.keys(workflow.nodes).length}
                        </p>
                      </div>
                      <div className="bg-secondary p-4 rounded">
                        <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                        <p className="text-2xl font-bold">
                          {execution.completed_at 
                            ? Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000) + 's'
                            : Math.round((Date.now() - new Date(execution.started_at).getTime()) / 1000) + 's'
                          }
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Variables</h3>
                      <div className="bg-secondary p-4 rounded font-mono text-sm">
                        <pre>{JSON.stringify(execution.variables, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Execution</h3>
                    <p className="text-muted-foreground">
                      Execute a workflow to see real-time monitoring data
                    </p>
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'debug' || activeTab === 'security') && (
              <div className="bg-background rounded-lg border p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'debug' ? (
                    <Bug className="w-8 h-8 text-primary" />
                  ) : (
                    <Shield className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {activeTab === 'debug' ? 'Workflow Debugging' : 'Security & Access Control'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {activeTab === 'debug' 
                    ? 'Debug workflows with breakpoints, variable inspection, and performance analysis'
                    : 'User management, permissions, activity logging, and data export'
                  }
                </p>
                <div className="flex justify-center space-x-2">
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                    {activeTab === 'debug' ? 'Start Debug Session' : 'Manage Users'}
                  </button>
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">
                    {activeTab === 'debug' ? 'View Performance' : 'View Activity Log'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        {selectedNode && activeTab === 'design' && (
          <div className="w-80 border-l bg-background p-4">
            <h3 className="font-semibold mb-3">Node Properties</h3>
            
            {(() => {
              const node = workflow.nodes[selectedNode];
              return (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <input
                      type="text"
                      value={node.name}
                      onChange={(e) => updateNodeConfig(selectedNode, { name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <input
                      type="text"
                      value={node.type}
                      disabled
                      className="w-full mt-1 px-3 py-2 border rounded bg-secondary"
                    />
                  </div>
                  
                  {/* Node-specific configuration */}
                  {node.type === 'browser_navigate' && (
                    <div>
                      <label className="text-sm font-medium">URL</label>
                      <input
                        type="text"
                        value={node.config.url || ''}
                        onChange={(e) => updateNodeConfig(selectedNode, { url: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full mt-1 px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                  
                  {node.type === 'email_send' && (
                    <>
                      <div>
                        <label className="text-sm font-medium">To</label>
                        <input
                          type="email"
                          value={node.config.to || ''}
                          onChange={(e) => updateNodeConfig(selectedNode, { to: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Subject</label>
                        <input
                          type="text"
                          value={node.config.subject || ''}
                          onChange={(e) => updateNodeConfig(selectedNode, { subject: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}