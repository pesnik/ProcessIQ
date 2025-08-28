import React from 'react';

export default function Connectors() {
  const connectors = [
    { id: 1, name: 'Web Scraper', type: 'Web', status: 'active', description: 'Extract data from websites' },
    { id: 2, name: 'Excel Reader', type: 'File', status: 'active', description: 'Read Excel spreadsheets' },
    { id: 3, name: 'REST API', type: 'API', status: 'inactive', description: 'Connect to REST APIs' },
    { id: 4, name: 'Database', type: 'Database', status: 'active', description: 'Connect to SQL databases' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Connectors</h1>
          <p className="text-muted-foreground">Manage data source connections</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          Add Connector
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((connector) => (
          <div key={connector.id} className="bg-card p-4 rounded-lg border border-border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  connector.status === 'active' 
                    ? 'bg-green-500/10 text-green-500' 
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {connector.status}
                </span>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
            <h3 className="font-semibold text-foreground mb-1">{connector.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">{connector.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{connector.type}</span>
              <button className="text-xs text-primary hover:underline">Configure</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}