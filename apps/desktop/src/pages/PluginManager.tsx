import React from 'react';

export default function PluginManager() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Plugin Manager</h1>
        <p className="text-muted-foreground">Install and manage ProcessIQ plugins</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Plugin Ecosystem</h3>
        <p className="text-muted-foreground">
          Extend ProcessIQ with community plugins and custom integrations
        </p>
      </div>
    </div>
  );
}