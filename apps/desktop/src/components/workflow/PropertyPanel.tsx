import React from 'react';
import { Node } from 'reactflow';
import { X, Settings } from 'lucide-react';
import { CustomNodeData } from './CustomNode';

interface PropertyPanelProps {
  selectedNode: Node<CustomNodeData> | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<CustomNodeData>) => void;
}

export function PropertyPanel({ selectedNode, onClose, onUpdateNode }: PropertyPanelProps) {
  if (!selectedNode) {
    return null;
  }

  const handleConfigChange = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        [key]: value
      }
    });
  };

  const handleLabelChange = (newLabel: string) => {
    onUpdateNode(selectedNode.id, { label: newLabel });
  };

  const renderNodeSpecificFields = () => {
    const { nodeType, config } = selectedNode.data;

    switch (nodeType) {
      case 'browser_navigate':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                placeholder="https://example.com"
                value={config.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Wait For
              </label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                value={config.wait_for || 'networkidle'}
                onChange={(e) => handleConfigChange('wait_for', e.target.value)}
              >
                <option value="networkidle">Network Idle</option>
                <option value="load">Page Load</option>
                <option value="domcontentloaded">DOM Ready</option>
              </select>
            </div>
          </div>
        );

      case 'browser_extract':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                CSS Selector
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder=".data-element"
                value={config.selector || ''}
                onChange={(e) => handleConfigChange('selector', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Extract Type
              </label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                value={config.extract_type || 'text'}
                onChange={(e) => handleConfigChange('extract_type', e.target.value)}
              >
                <option value="text">Text</option>
                <option value="text_list">Text List</option>
                <option value="attribute">Attribute</option>
                <option value="html">HTML</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Variable Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="extracted_data"
                value={config.variable_name || ''}
                onChange={(e) => handleConfigChange('variable_name', e.target.value)}
              />
            </div>
          </div>
        );

      case 'email_send':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                To
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                placeholder="recipient@example.com"
                value={config.to || ''}
                onChange={(e) => handleConfigChange('to', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Subject
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Email subject"
                value={config.subject || ''}
                onChange={(e) => handleConfigChange('subject', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Body
              </label>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                rows={4}
                placeholder="Email body content"
                value={config.body || ''}
                onChange={(e) => handleConfigChange('body', e.target.value)}
              />
            </div>
          </div>
        );

      case 'excel_read':
      case 'excel_write':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                File Path
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="/path/to/file.xlsx"
                value={config.file_path || ''}
                onChange={(e) => handleConfigChange('file_path', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Sheet Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Sheet1"
                value={config.sheet_name || ''}
                onChange={(e) => handleConfigChange('sheet_name', e.target.value)}
              />
            </div>
            {nodeType === 'excel_read' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Variable Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                  placeholder="excel_data"
                  value={config.variable_name || ''}
                  onChange={(e) => handleConfigChange('variable_name', e.target.value)}
                />
              </div>
            )}
            {nodeType === 'excel_write' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Data Source
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                  placeholder="data_variable"
                  value={config.data_source || ''}
                  onChange={(e) => handleConfigChange('data_source', e.target.value)}
                />
              </div>
            )}
          </div>
        );

      case 'database_query':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Connection
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="db_connection"
                value={config.connection || ''}
                onChange={(e) => handleConfigChange('connection', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Query
              </label>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-mono text-sm"
                rows={4}
                placeholder="SELECT * FROM table_name"
                value={config.query || ''}
                onChange={(e) => handleConfigChange('query', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Result Variable
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="query_result"
                value={config.result_variable || ''}
                onChange={(e) => handleConfigChange('result_variable', e.target.value)}
              />
            </div>
          </div>
        );

      case 'python_script':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Python Code
              </label>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground font-mono text-sm"
                rows={10}
                placeholder="# Enter your Python code here
import pandas as pd

# Your code here..."
                value={config.script || ''}
                onChange={(e) => handleConfigChange('script', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Input Variables (comma-separated)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="var1, var2, var3"
                value={config.input_variables?.join(', ') || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const variables = value ? value.split(',').map(v => v.trim()).filter(v => v) : [];
                  handleConfigChange('input_variables', variables);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Output Variables (comma-separated)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="result1, result2"
                value={config.output_variables?.join(', ') || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const variables = value ? value.split(',').map(v => v.trim()).filter(v => v) : [];
                  handleConfigChange('output_variables', variables);
                }}
              />
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Condition
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="${variable} == 'value'"
                value={config.condition || ''}
                onChange={(e) => handleConfigChange('condition', e.target.value)}
              />
            </div>
          </div>
        );

      case 'http_request':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Method
              </label>
              <select
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                value={config.method || 'GET'}
                onChange={(e) => handleConfigChange('method', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                placeholder="https://api.example.com/endpoint"
                value={config.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Response Variable
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="http_response"
                value={config.response_variable || ''}
                onChange={(e) => handleConfigChange('response_variable', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            No configuration options available for this node type.
          </div>
        );
    }
  };

  return (
    <div className="w-80 bg-background border-l border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center">
          <Settings className="w-5 h-5 text-muted-foreground mr-2" />
          <h3 className="font-semibold text-foreground">Node Properties</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Basic Properties */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Basic Properties</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Node Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                  value={selectedNode.data.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md bg-muted"
                  value={selectedNode.data.nodeType}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Node-specific Configuration */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Configuration</h4>
            {renderNodeSpecificFields()}
          </div>

          {/* Status Information */}
          {selectedNode.data.status && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Status</h4>
              <div className={`p-3 rounded-md ${
                selectedNode.data.status === 'completed' ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800' :
                selectedNode.data.status === 'failed' ? 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800' :
                selectedNode.data.status === 'running' ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
                'bg-muted border border-border'
              }`}>
                <div className="text-sm font-medium capitalize">
                  {selectedNode.data.status}
                </div>
                {selectedNode.data.error && (
                  <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {selectedNode.data.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PropertyPanel;