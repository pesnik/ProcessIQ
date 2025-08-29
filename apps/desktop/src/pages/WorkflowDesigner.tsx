import React, { useState, useCallback, useRef, useMemo } from 'react';
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
  Bug,
  Shield,
  Settings,
  Users,
  FileText,
  Zap
} from 'lucide-react';

import CustomNode, { CustomNodeData } from '../components/workflow/CustomNode';
import NodeSidebar, { NODE_TYPES } from '../components/workflow/NodeSidebar';
import PropertyPanel from '../components/workflow/PropertyPanel';

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: Record<string, any>;
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

// Custom node types
const nodeTypes = {
  custom: CustomNode,
};

function WorkflowDesignerContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'execute' | 'debug' | 'security'>('design');
  const [workflowName, setWorkflowName] = useState('New Workflow');
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Stop execution function
  const stopExecution = useCallback(() => {
    setIsExecuting(false);
    setExecution(null);
  }, []);

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
          return {
            ...node,
            data: {
              ...node.data,
              ...updates,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

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

  // Workflow execution
  const executeWorkflow = useCallback(async () => {
    // Validate workflow first
    if (!validateWorkflow()) {
      return;
    }
    
    const workflow = getWorkflowDefinition();
    setIsExecuting(true);
    
    // Reset node statuses
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, status: 'idle', error: undefined }
      }))
    );
    
    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_definition: workflow,
          variables: workflow.variables || {},
          triggered_by: 'manual'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Workflow execution started:', result);
        
        // Poll for execution status
        const pollExecution = async (executionId: string) => {
          try {
            const statusResponse = await fetch(`/api/workflows/execution/${executionId}`);
            if (statusResponse.ok) {
              const executionData = await statusResponse.json();
              setExecution(executionData);
              
              // Update node statuses based on execution state
              setNodes((nds) =>
                nds.map((node) => {
                  let status: 'idle' | 'running' | 'completed' | 'failed' = 'idle';
                  let error: string | undefined = undefined;
                  
                  if (executionData.current_nodes && executionData.current_nodes.includes(node.id)) {
                    status = 'running';
                  } else if (executionData.completed_nodes && executionData.completed_nodes > 0) {
                    // In a real implementation, you'd track individual node completion
                    // For now, we'll mark nodes as completed based on execution progress
                    const nodeIndex = nds.findIndex(n => n.id === node.id);
                    if (nodeIndex < executionData.completed_nodes) {
                      status = 'completed';
                    }
                  }
                  
                  // Handle failed nodes
                  if (executionData.failed_nodes && executionData.failed_nodes > 0) {
                    // This is simplified - in practice you'd get specific error info
                    if (status !== 'completed' && status !== 'running') {
                      status = 'failed';
                      error = 'Node execution failed';
                    }
                  }
                  
                  return {
                    ...node,
                    data: { ...node.data, status, error }
                  };
                })
              );
              
              if (executionData.status === 'running' || executionData.status === 'pending') {
                setTimeout(() => pollExecution(executionId), 1000);
              } else {
                setIsExecuting(false);
                console.log('Workflow execution completed:', executionData.status);
              }
            } else {
              console.error('Failed to get execution status');
              setIsExecuting(false);
            }
          } catch (error) {
            console.error('Error polling execution status:', error);
            setIsExecuting(false);
          }
        };

        await pollExecution(result.execution_id);
      } else {
        const errorData = await response.text();
        console.error('Workflow execution failed:', errorData);
        alert(`Failed to execute workflow: ${errorData}`);
        setIsExecuting(false);
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      alert(`Workflow execution error: ${error}`);
      setIsExecuting(false);
    }
  }, [getWorkflowDefinition, setNodes, validateWorkflow]);

  // Save workflow
  const saveWorkflow = useCallback(() => {
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
        } catch (error) {
          console.error('Failed to load workflow:', error);
        }
      };
      reader.readAsText(file);
    }
  }, [setNodes, setEdges]);

  // Delete selected nodes
  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    const selectedNodeIds = selectedNodes.map(node => node.id);
    
    setNodes((nds) => nds.filter(node => !selectedNodeIds.includes(node.id)));
    setEdges((eds) => eds.filter(edge => 
      !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
    ));
    
    if (selectedNode && selectedNodeIds.includes(selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [nodes, selectedNode, setNodes, setEdges]);

  // Keyboard shortcuts
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      deleteSelectedNodes();
    }
  }, [deleteSelectedNodes]);

  return (
    <div className="h-full flex flex-col" onKeyDown={onKeyDown} tabIndex={0}>
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Designer</h1>
            <p className="text-gray-600">{workflowName}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={saveWorkflow}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>
            
            <label className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer">
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
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
                className="flex items-center px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
          <div className="w-64 border-r bg-white p-4">

            {activeTab === 'execute' && (
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Execution Status</h3>
                
                {execution && (
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-100 rounded">
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
                  <p className="text-gray-500 text-sm">
                    No active execution. Click Execute to run the workflow.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'debug' && (
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Debug Tools</h3>
                
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                    Set Breakpoint
                  </button>
                  <button className="w-full px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                    Watch Variables
                  </button>
                  <button className="w-full px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                    Step Through
                  </button>
                  <button className="w-full px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                    Performance Profile
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <h4 className="text-sm font-medium mb-2">Debug Session</h4>
                  <p className="text-xs text-gray-600">
                    No active debug session. Execute workflow with debugging enabled.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Security & Access</h3>
                
                <div className="space-y-2">
                  <button className="w-full flex items-center px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                    <Users className="w-4 h-4 mr-2" />
                    Users & Teams
                  </button>
                  <button className="w-full flex items-center px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                    <Shield className="w-4 h-4 mr-2" />
                    Permissions
                  </button>
                  <button className="w-full flex items-center px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                    <FileText className="w-4 h-4 mr-2" />
                    Activity Log
                  </button>
                  <button className="w-full flex items-center px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </button>
                </div>

                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <h4 className="text-sm font-medium mb-2">Current Access</h4>
                  <p className="text-xs text-gray-600">
                    You can create and execute workflows. 
                    Contact admin for user management access.
                  </p>
                </div>
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
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              isValidConnection={isValidConnection}
              fitView
              className="bg-gray-50"
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.data.status) {
                    case 'running': return '#3b82f6';
                    case 'completed': return '#10b981';
                    case 'failed': return '#ef4444';
                    default: return '#6b7280';
                  }
                }}
              />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          )}

          {activeTab === 'execute' && (
            <div className="p-6 bg-white">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Execution Monitor</h2>
              
              {execution ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-100 p-4 rounded">
                      <h3 className="text-sm font-medium text-gray-600">Status</h3>
                      <p className="text-2xl font-bold">{execution.status}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded">
                      <h3 className="text-sm font-medium text-gray-600">Progress</h3>
                      <p className="text-2xl font-bold">
                        {execution.completed_nodes}/{nodes.length}
                      </p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded">
                      <h3 className="text-sm font-medium text-gray-600">Duration</h3>
                      <p className="text-2xl font-bold">
                        {execution.completed_at 
                          ? Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000) + 's'
                          : Math.round((Date.now() - new Date(execution.started_at).getTime()) / 1000) + 's'
                        }
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">Variables</h3>
                    <div className="bg-gray-100 p-4 rounded font-mono text-sm">
                      <pre>{JSON.stringify(execution.variables, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">No Active Execution</h3>
                  <p className="text-gray-600">
                    Execute a workflow to see real-time monitoring data
                  </p>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'debug' || activeTab === 'security') && (
            <div className="bg-white border p-6 text-center m-6 rounded-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                {activeTab === 'debug' ? (
                  <Bug className="w-8 h-8 text-blue-600" />
                ) : (
                  <Shield className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                {activeTab === 'debug' ? 'Workflow Debugging' : 'Security & Access Control'}
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'debug' 
                  ? 'Debug workflows with breakpoints, variable inspection, and performance analysis'
                  : 'User management, permissions, activity logging, and data export'
                }
              </p>
              <div className="flex justify-center space-x-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {activeTab === 'debug' ? 'Start Debug Session' : 'Manage Users'}
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  {activeTab === 'debug' ? 'View Performance' : 'View Activity Log'}
                </button>
              </div>
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