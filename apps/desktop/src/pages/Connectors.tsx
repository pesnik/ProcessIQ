import React, { useState } from 'react';
import { Plus, Settings, Power, Database, Globe, FileText, Zap, MoreHorizontal, Check, X, AlertTriangle } from 'lucide-react';

export default function Connectors() {
  const [connectors, setConnectors] = useState([
    { 
      id: 1, 
      name: 'ProcessIQ Browser', 
      type: 'Web Automation', 
      status: 'active', 
      description: 'Built-in browser automation for web scraping and interaction',
      icon: Globe,
      lastUsed: '2 hours ago',
      executions: 245
    },
    { 
      id: 2, 
      name: 'Excel Integration', 
      type: 'File Processing', 
      status: 'active', 
      description: 'Read and write Excel spreadsheets with advanced formatting',
      icon: FileText,
      lastUsed: '1 day ago',
      executions: 89
    },
    { 
      id: 3, 
      name: 'PostgreSQL Database', 
      type: 'Database', 
      status: 'warning', 
      description: 'Connect to PostgreSQL databases with query optimization',
      icon: Database,
      lastUsed: '3 days ago',
      executions: 156
    },
    { 
      id: 4, 
      name: 'Email Service', 
      type: 'Communication', 
      status: 'active', 
      description: 'SMTP email sending with template support',
      icon: Zap,
      lastUsed: '5 hours ago',
      executions: 67
    },
    { 
      id: 5, 
      name: 'REST API Client', 
      type: 'API Integration', 
      status: 'inactive', 
      description: 'Generic HTTP client for REST API integration',
      icon: Globe,
      lastUsed: '1 week ago',
      executions: 23
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);

  const toggleConnectorStatus = (id: number) => {
    setConnectors(prev => prev.map(conn => 
      conn.id === id 
        ? { ...conn, status: conn.status === 'active' ? 'inactive' : 'active' }
        : conn
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500';
      case 'inactive': return 'bg-gray-500/10 text-gray-500';
      case 'warning': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Check className="w-3 h-3" />;
      case 'inactive': return <X className="w-3 h-3" />;
      case 'warning': return <AlertTriangle className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Connectors</h1>
          <p className="text-muted-foreground">Manage workflow integrations and data sources</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Connector
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Connectors</p>
              <p className="text-2xl font-bold text-foreground">{connectors.length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">{connectors.filter(c => c.status === 'active').length}</p>
            </div>
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Check className="w-4 h-4 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="text-2xl font-bold text-foreground">{connectors.reduce((sum, c) => sum + c.executions, 0)}</p>
            </div>
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Issues</p>
              <p className="text-2xl font-bold text-yellow-600">{connectors.filter(c => c.status === 'warning').length}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connectors.map((connector) => {
          const IconComponent = connector.icon;
          return (
            <div key={connector.id} className="bg-card p-6 rounded-lg border border-border hover:shadow-md transition-all hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connector.status)}`}>
                    {getStatusIcon(connector.status)}
                    {connector.status}
                  </span>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="font-semibold text-foreground mb-2">{connector.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{connector.description}</p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span>{connector.type}</span>
                <span>{connector.executions} runs</span>
              </div>
              
              <div className="text-xs text-muted-foreground mb-4">
                Last used: {connector.lastUsed}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleConnectorStatus(connector.id)}
                  className={`flex items-center px-3 py-1 rounded text-xs font-medium transition-colors ${
                    connector.status === 'active' 
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                  }`}
                >
                  <Power className="w-3 h-3 mr-1" />
                  {connector.status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button className="flex items-center px-3 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium hover:bg-secondary/80 transition-colors">
                  <Settings className="w-3 h-3 mr-1" />
                  Configure
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Connector Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Add New Connector</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Connector Type</label>
                <select className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground">
                  <option>Database (MySQL, PostgreSQL)</option>
                  <option>REST API Client</option>
                  <option>File System</option>
                  <option>Email (SMTP/IMAP)</option>
                  <option>Cloud Storage</option>
                  <option>Custom Webhook</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input 
                  type="text" 
                  placeholder="My Database Connection"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}