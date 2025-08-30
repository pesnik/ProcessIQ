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
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

import CustomNode, { CustomNodeData } from '../components/workflow/CustomNode';
import NodeSidebar, { NODE_TYPES } from '../components/workflow/NodeSidebar';
import PropertyPanel from '../components/workflow/PropertyPanel';
import workflowExecutionService, { WorkflowExecutionService, WorkflowDefinition, WorkflowExecutionState, NodeExecutionEvent, WorkflowExecutionEvent } from '../services/workflowExecutionService';

// WorkflowDefinition now imported from service

// WorkflowExecution types now imported from service

// Custom node types
const nodeTypes = {
  custom: CustomNode,
};

function WorkflowDesignerContent() {
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
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
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
      
      // Update execution state to completed
      setExecution(prev => prev ? {
        ...prev,
        status: 'completed',
        completed_at: event.timestamp || new Date().toISOString()
      } : null);
      
      // Add completion log
      setExecutionLogs(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        type: 'workflow_completed',
        timestamp: event.timestamp || new Date().toISOString(),
        message: `🎉 Workflow completed successfully!`,
        level: 'success'
      }]);
      
      console.log('Workflow completed:', event);
    };
    
    const handleWorkflowFailed = (event: WorkflowExecutionEvent) => {
      setIsExecuting(false);
      
      // Update execution state to failed
      setExecution(prev => prev ? {
        ...prev,
        status: 'failed',
        completed_at: event.timestamp || new Date().toISOString()
      } : null);
      
      // Add failure log
      setExecutionLogs(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        type: 'workflow_failed',
        timestamp: event.timestamp || new Date().toISOString(),
        message: `💥 Workflow failed: ${event.error || 'Unknown error'}`,
        level: 'error'
      }]);
      
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
      const response = await fetch('http://localhost:8000/api/v1/workflows/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workflowName,
          description: `Workflow created with ProcessIQ Designer`,
          nodes: workflow.nodes,
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
      alert(`✅ Workflow "${workflowName}" saved successfully!`);
      console.log('Workflow saved:', savedWorkflow);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert(`❌ Failed to save workflow: ${(error as Error).message}`);
    }
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
            <button
              onClick={saveWorkflow}
              className="flex items-center px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>
            
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
              <div>
                <h3 className="font-semibold mb-3 text-foreground">Debug Tools</h3>
                
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
            <div className="p-6 bg-background">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Execution Monitor</h2>
              
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
                        {execution.completed_nodes}/{nodes.length}
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
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Variables</h3>
                    <div className="bg-secondary p-4 rounded font-mono text-sm">
                      <pre>{JSON.stringify(execution.variables, null, 2)}</pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Execution Logs</h3>
                    <div className="bg-secondary p-4 rounded max-h-96 overflow-y-auto">
                      {executionLogs.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No logs yet...</p>
                      ) : (
                        <div className="space-y-2">
                          {executionLogs.map((log) => (
                            <div 
                              key={log.id}
                              className={`p-3 rounded text-sm border-l-4 ${
                                log.level === 'error' 
                                  ? 'bg-red-50 border-red-500 text-red-900' 
                                  : log.level === 'success'
                                  ? 'bg-green-50 border-green-500 text-green-900'
                                  : 'bg-blue-50 border-blue-500 text-blue-900'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium">{log.nodeType || 'Workflow'}</span>
                                <span className="text-xs opacity-70">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="whitespace-pre-wrap font-mono text-xs">
                                {log.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No Active Execution</h3>
                  <p className="text-muted-foreground">
                    Execute a workflow to see real-time monitoring data
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="bg-background border p-6 text-center m-6 rounded-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Bug className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                Workflow Debugging
              </h3>
              <p className="text-muted-foreground mb-6">
                Debug workflows with breakpoints, variable inspection, and performance analysis
              </p>
              <div className="flex justify-center space-x-2">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                  Start Debug Session
                </button>
                <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">
                  View Performance
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