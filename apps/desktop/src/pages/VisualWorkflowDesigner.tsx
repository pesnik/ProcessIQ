import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Download, 
  Upload, 
  Settings,
  ExternalLink,
  Workflow,
  Zap
} from 'lucide-react';
import { n8nService } from '../services/n8nService';

interface WorkflowInfo {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ExecutionInfo {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
}

export const VisualWorkflowDesigner: React.FC = () => {
  const [isN8nRunning, setIsN8nRunning] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [executions, setExecutions] = useState<ExecutionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingN8n, setStartingN8n] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check n8n server status on mount
  useEffect(() => {
    checkN8nStatus();
    
    // Set up periodic status check
    const interval = setInterval(checkN8nStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load workflows when n8n is running
  useEffect(() => {
    if (isN8nRunning) {
      loadWorkflows();
    }
  }, [isN8nRunning]);

  const checkN8nStatus = async () => {
    try {
      const running = await n8nService.isServerRunning();
      setIsN8nRunning(running);
      
      if (!running && !startingN8n) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking n8n status:', error);
      setIsN8nRunning(false);
      setLoading(false);
    }
  };

  const startN8nServer = async () => {
    setStartingN8n(true);
    setLoading(true);
    
    try {
      const success = await n8nService.startWorkflowEngine();
      if (success) {
        // Wait a moment for server to fully initialize
        setTimeout(async () => {
          await checkN8nStatus();
          setStartingN8n(false);
          setLoading(false);
        }, 3000);
      } else {
        setStartingN8n(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error starting n8n server:', error);
      setStartingN8n(false);
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      const workflowList = await n8nService.getWorkflows();
      setWorkflows(workflowList);
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  };

  const createDemoWorkflow = async () => {
    try {
      await n8nService.createRPADemoWorkflow();
      await loadWorkflows();
      
      // Refresh the iframe to show the new workflow
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } catch (error) {
      console.error('Error creating demo workflow:', error);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      const execution = await n8nService.executeWorkflow(workflowId);
      console.log('Workflow execution started:', execution);
      
      // TODO: Add execution to list and monitor status
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  };

  const openN8nInBrowser = () => {
    if (window.electronAPI) {
      window.electronAPI.openExternal(n8nService.getEditorUrl());
    } else {
      window.open(n8nService.getEditorUrl(), '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {startingN8n ? 'Starting workflow engine...' : 'Loading workflow engine status...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isN8nRunning) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visual Workflow Designer</h1>
            <p className="text-muted-foreground">
              Design and orchestrate automated business processes
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <Workflow className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle>Workflow Engine Not Running</CardTitle>
            <CardDescription>
              Start the workflow engine to begin creating and managing automated processes
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={startN8nServer} size="lg" disabled={startingN8n}>
              {startingN8n ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Starting Server...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Workflow Engine
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visual Workflow Designer</h1>
          <p className="text-muted-foreground">
            Create, manage, and execute automated workflows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Engine Running
          </Badge>
          <Button variant="outline" onClick={openN8nInBrowser} size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Browser
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{workflows.length}</p>
                <p className="text-xs text-muted-foreground">Active Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Play className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{executions.length}</p>
                <p className="text-xs text-muted-foreground">Executions Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Button onClick={createDemoWorkflow} className="w-full" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Create Demo RPA
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Button onClick={loadWorkflows} className="w-full" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Workflows
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      {workflows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Workflows</CardTitle>
            <CardDescription>
              Manage and execute your n8n workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${workflow.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium">{workflow.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {workflow.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => executeWorkflow(workflow.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Execute
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Embedded n8n Editor */}
      <Card className="min-h-[600px]">
        <CardHeader>
          <CardTitle>Workflow Editor</CardTitle>
          <CardDescription>
            Design your automated processes using the visual workflow editor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              src={n8nService.getEditorUrl()}
              className="w-full h-[600px] border-0"
              title="ProcessIQ Workflow Editor"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};