import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Tag,
  Play,
  Edit3,
  Copy,
  BarChart3,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  Calendar,
  ChevronDown,
  X,
  Plus,
  Download,
  Upload
} from 'lucide-react';

interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: Record<string, any>;
  variables: Record<string, any>;
  triggers: any[];
  tags: string[];
  created_at: string;
  updated_at: string;
  version: number;
  last_execution?: {
    status: 'completed' | 'failed' | 'running' | 'paused';
    timestamp: string;
    duration?: number;
  };
}

interface FilterState {
  search: string;
  status: string;
  dateRange: string;
  tags: string[];
}

function WorkflowHistory() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    dateRange: 'all',
    tags: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Load workflows from backend
  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/workflows/');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
        
        // Extract unique tags
        const tags = new Set<string>();
        data.workflows?.forEach((workflow: SavedWorkflow) => {
          workflow.tags?.forEach((tag: string) => tags.add(tag));
        });
        setAllTags(Array.from(tags));
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Filter workflows
  const filteredWorkflows = workflows.filter(workflow => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!workflow.name.toLowerCase().includes(searchLower) &&
          !workflow.description.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== 'all') {
      const lastStatus = workflow.last_execution?.status || 'never_run';
      if (lastStatus !== filters.status) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const workflowDate = new Date(workflow.updated_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - workflowDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today':
          if (daysDiff > 0) return false;
          break;
        case 'week':
          if (daysDiff > 7) return false;
          break;
        case 'month':
          if (daysDiff > 30) return false;
          break;
      }
    }

    // Tags filter
    if (filters.tags.length > 0) {
      if (!filters.tags.some(tag => workflow.tags?.includes(tag))) {
        return false;
      }
    }

    return true;
  });

  // Execute workflow
  const executeWorkflow = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      const response = await fetch('http://localhost:8000/api/v1/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_definition: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            nodes: workflow.nodes,
            variables: workflow.variables,
            triggers: workflow.triggers
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Workflow "${workflow.name}" execution started!\nExecution ID: ${result.execution_id}`);
      } else {
        throw new Error('Failed to execute workflow');
      }
    } catch (error) {
      alert(`❌ Failed to execute workflow: ${(error as Error).message}`);
    }
  };

  // Delete workflow
  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/workflows/${workflowId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
        alert('✅ Workflow deleted successfully!');
      } else {
        throw new Error('Failed to delete workflow');
      }
    } catch (error) {
      alert(`❌ Failed to delete workflow: ${(error as Error).message}`);
    }
  };

  // Clone workflow
  const cloneWorkflow = async (workflow: SavedWorkflow) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/workflows/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          nodes: workflow.nodes,
          variables: workflow.variables,
          triggers: workflow.triggers,
          tags: workflow.tags
        })
      });

      if (response.ok) {
        await loadWorkflows();
        alert(`✅ Workflow "${workflow.name}" cloned successfully!`);
      } else {
        throw new Error('Failed to clone workflow');
      }
    } catch (error) {
      alert(`❌ Failed to clone workflow: ${(error as Error).message}`);
    }
  };

  // Export workflow
  const exportWorkflow = (workflow: SavedWorkflow) => {
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
  };

  // Get status color and icon
  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'completed':
        return { color: 'text-green-600 bg-green-100', icon: <CheckCircle className="w-3 h-3" />, text: 'Completed' };
      case 'failed':
        return { color: 'text-red-600 bg-red-100', icon: <AlertCircle className="w-3 h-3" />, text: 'Failed' };
      case 'running':
        return { color: 'text-blue-600 bg-blue-100', icon: <Play className="w-3 h-3" />, text: 'Running' };
      case 'paused':
        return { color: 'text-yellow-600 bg-yellow-100', icon: <Pause className="w-3 h-3" />, text: 'Paused' };
      default:
        return { color: 'text-gray-600 bg-gray-100', icon: <Clock className="w-3 h-3" />, text: 'Never Run' };
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-background h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🗂️ Workflow History</h1>
            <p className="text-muted-foreground mt-1">
              Manage and organize your saved workflows
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to="/designer"
              className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="border-b p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="never_run">Never Run</option>
            </select>

            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground hover:bg-secondary flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              More Filters
              <ChevronDown className={`w-4 h-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <h4 className="font-medium text-foreground mb-3">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      tags: prev.tags.includes(tag)
                        ? prev.tags.filter(t => t !== tag)
                        : [...prev.tags, tag]
                    }));
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  <Tag className="w-3 h-3 mr-1 inline" />
                  {tag}
                </button>
              ))}
            </div>
            
            {filters.tags.length > 0 && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, tags: [] }))}
                className="mt-2 text-sm text-muted-foreground hover:text-foreground flex items-center"
              >
                <X className="w-3 h-3 mr-1" />
                Clear tag filters
              </button>
            )}
          </div>
        )}

        {/* Results Summary */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredWorkflows.length} of {workflows.length} workflows
        </div>
      </div>

      {/* Workflow List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {workflows.length === 0 ? 'No Workflows Yet' : 'No Matching Workflows'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {workflows.length === 0 
                ? 'Create your first workflow to get started'
                : 'Try adjusting your filters to find workflows'
              }
            </p>
            {workflows.length === 0 && (
              <Link
                to="/designer"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center"
              >
                Create First Workflow
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkflows.map((workflow) => {
              const statusDisplay = getStatusDisplay(workflow.last_execution?.status);
              
              return (
                <div
                  key={workflow.id}
                  className="border border-border rounded-lg bg-background hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {workflow.name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${statusDisplay.color}`}>
                            {statusDisplay.icon}
                            <span className="ml-1">{statusDisplay.text}</span>
                          </span>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-3">
                          {workflow.description || 'No description provided'}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Updated {new Date(workflow.updated_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            {Object.keys(workflow.nodes || {}).length} nodes
                          </div>
                          <div className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            v{workflow.version}
                          </div>
                        </div>

                        {/* Tags */}
                        {workflow.tags && workflow.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {workflow.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Last Execution Info */}
                        {workflow.last_execution && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            Last run: {new Date(workflow.last_execution.timestamp).toLocaleString()}
                            {workflow.last_execution.duration && (
                              <span> • Duration: {workflow.last_execution.duration}s</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => executeWorkflow(workflow.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Execute Workflow"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => navigate(`/designer?id=${workflow.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Workflow"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => cloneWorkflow(workflow)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Clone Workflow"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => exportWorkflow(workflow)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Export Workflow"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            // For now, navigate to designer with execution tab
                            navigate(`/designer?id=${workflow.id}&tab=execute`);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="View Execution History"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteWorkflow(workflow.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Workflow"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowHistory;