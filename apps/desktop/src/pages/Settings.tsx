import React from 'react';

export default function Settings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure ProcessIQ preferences</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Theme</label>
            <select className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground">
              <option>Dark</option>
              <option>Light</option>
              <option>System</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Backend URL</label>
            <input 
              type="text" 
              defaultValue="http://localhost:8000"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}