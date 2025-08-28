import React from 'react';

export default function Logs() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">System Logs</h1>
        <p className="text-muted-foreground">Monitor application activity and debug issues</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="font-mono text-sm space-y-1">
          <div className="text-green-400">[2025-08-28 06:00:00] INFO: ProcessIQ engine started</div>
          <div className="text-blue-400">[2025-08-28 06:00:01] DEBUG: Loading plugins from ./plugins</div>
          <div className="text-yellow-400">[2025-08-28 06:00:02] WARN: No AI services configured</div>
          <div className="text-green-400">[2025-08-28 06:00:03] INFO: Web connector initialized</div>
          <div className="text-green-400">[2025-08-28 06:00:04] INFO: Backend server ready on port 8000</div>
        </div>
      </div>
    </div>
  );
}