import React, { useState } from 'react';
import { Download, Upload, Search, Star, Shield, Package, ExternalLink, CheckCircle, AlertCircle, Clock, Trash2 } from 'lucide-react';

export default function PluginManager() {
  const [activeTab, setActiveTab] = useState<'installed' | 'available' | 'marketplace'>('installed');
  const [searchTerm, setSearchTerm] = useState('');

  const installedPlugins = [
    {
      id: 1,
      name: 'Advanced Excel Operations',
      version: '2.1.0',
      author: 'ProcessIQ Team',
      description: 'Extended Excel functionality with pivot tables, charts, and advanced formatting',
      status: 'active',
      category: 'File Processing',
      rating: 4.8,
      downloads: 15420,
      lastUpdated: '2 days ago'
    },
    {
      id: 2,
      name: 'MongoDB Connector',
      version: '1.3.2',
      author: 'Community',
      description: 'Native MongoDB integration with aggregation pipeline support',
      status: 'active',
      category: 'Database',
      rating: 4.6,
      downloads: 8300,
      lastUpdated: '1 week ago'
    },
    {
      id: 3,
      name: 'Slack Notifications',
      version: '1.0.5',
      author: 'DevTools Inc',
      description: 'Send workflow notifications and updates to Slack channels',
      status: 'inactive',
      category: 'Communication',
      rating: 4.2,
      downloads: 5200,
      lastUpdated: '3 weeks ago'
    }
  ];

  const availablePlugins = [
    {
      id: 4,
      name: 'AWS S3 Integration',
      version: '3.0.0',
      author: 'CloudSync',
      description: 'Complete AWS S3 integration with bucket management and file operations',
      category: 'Cloud Storage',
      rating: 4.9,
      downloads: 22100,
      price: 'Free',
      verified: true
    },
    {
      id: 5,
      name: 'Google Sheets API',
      version: '2.4.1',
      author: 'Google Certified',
      description: 'Real-time Google Sheets integration with collaborative editing',
      category: 'Productivity',
      rating: 4.7,
      downloads: 18500,
      price: 'Free',
      verified: true
    },
    {
      id: 6,
      name: 'AI Text Analysis',
      version: '1.2.0',
      author: 'AI Labs',
      description: 'Advanced text processing with sentiment analysis and entity extraction',
      category: 'AI/ML',
      rating: 4.4,
      downloads: 3200,
      price: '$29/month',
      verified: false
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'updating': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return null;
    }
  };

  const filteredInstalledPlugins = installedPlugins.filter(plugin =>
    plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAvailablePlugins = availablePlugins.filter(plugin =>
    plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plugin Manager</h1>
          <p className="text-muted-foreground">Extend ProcessIQ with community plugins and integrations</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Install from File
          </button>
          <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <ExternalLink className="w-4 h-4 mr-2" />
            Browse Marketplace
          </button>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {[{key: 'installed', label: 'Installed'}, {key: 'available', label: 'Available'}, {key: 'marketplace', label: 'Marketplace'}].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.key 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
      </div>

      {/* Plugin Content */}
      {activeTab === 'installed' && (
        <div>
          {filteredInstalledPlugins.length > 0 ? (
            <div className="space-y-4">
              {filteredInstalledPlugins.map(plugin => (
                <div key={plugin.id} className="bg-card p-6 rounded-lg border border-border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{plugin.name}</h3>
                          <p className="text-sm text-muted-foreground">v{plugin.version} by {plugin.author}</p>
                        </div>
                        <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                          {plugin.category}
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(plugin.status)}
                          <span className={`text-xs capitalize ${
                            plugin.status === 'active' ? 'text-green-500' : 'text-yellow-500'
                          }`}>
                            {plugin.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-3">{plugin.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {plugin.rating}
                        </div>
                        <span>{plugin.downloads.toLocaleString()} downloads</span>
                        <span>Updated {plugin.lastUpdated}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80 transition-colors">
                        Configure
                      </button>
                      <button 
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          plugin.status === 'active'
                            ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                            : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        }`}
                      >
                        {plugin.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button className="px-3 py-1 bg-red-500/10 text-red-500 rounded text-sm hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No plugins installed</h3>
              <p className="text-muted-foreground">Browse the marketplace to install your first plugin</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'available' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAvailablePlugins.map(plugin => (
            <div key={plugin.id} className="bg-card p-6 rounded-lg border border-border hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  {plugin.verified && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs">
                      <Shield className="w-3 h-3" />
                      Verified
                    </div>
                  )}
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                    {plugin.price}
                  </span>
                </div>
              </div>
              
              <h3 className="font-semibold text-foreground mb-1">{plugin.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">v{plugin.version} by {plugin.author}</p>
              <p className="text-sm text-muted-foreground mb-4">{plugin.description}</p>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground">{plugin.category}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {plugin.rating}
                  </div>
                  <span>{plugin.downloads.toLocaleString()}</span>
                </div>
              </div>
              
              <button className="w-full flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Install Plugin
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'marketplace' && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-6">
            <ExternalLink className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-4">ProcessIQ Marketplace</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Discover thousands of community-built plugins, integrations, and workflow templates to supercharge your automation.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Open Marketplace
            </button>
            <button className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
              Developer Docs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}