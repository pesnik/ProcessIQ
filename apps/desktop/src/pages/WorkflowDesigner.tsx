import React from 'react';

export default function WorkflowDesigner() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Workflow Designer</h1>
        <p className="text-muted-foreground">Create and edit automation workflows</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Visual Workflow Designer</h3>
        <p className="text-muted-foreground mb-6">
          Drag and drop components to create powerful automation workflows. Connect data sources, apply transformations, and define outputs.
        </p>
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          Create New Workflow
        </button>
      </div>
    </div>
  );
}