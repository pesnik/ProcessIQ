import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/theme-provider';
import { Settings as SettingsIcon, Save, RotateCcw, Check } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [autoSave, setAutoSave] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState(5);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedBackendUrl = localStorage.getItem('processiq-backend-url');
    const savedAutoSave = localStorage.getItem('processiq-auto-save');
    const savedDebugMode = localStorage.getItem('processiq-debug-mode');
    const savedMaxTasks = localStorage.getItem('processiq-max-tasks');
    
    if (savedBackendUrl) setBackendUrl(savedBackendUrl);
    if (savedAutoSave) setAutoSave(JSON.parse(savedAutoSave));
    if (savedDebugMode) setDebugMode(JSON.parse(savedDebugMode));
    if (savedMaxTasks) setMaxConcurrentTasks(parseInt(savedMaxTasks));
  }, []);

  const handleSave = () => {
    localStorage.setItem('processiq-backend-url', backendUrl);
    localStorage.setItem('processiq-auto-save', JSON.stringify(autoSave));
    localStorage.setItem('processiq-debug-mode', JSON.stringify(debugMode));
    localStorage.setItem('processiq-max-tasks', maxConcurrentTasks.toString());
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setBackendUrl('http://localhost:8000');
    setAutoSave(true);
    setDebugMode(false);
    setMaxConcurrentTasks(5);
    setTheme('system');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <SettingsIcon className="w-6 h-6 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground">Configure ProcessIQ preferences and behavior</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            Appearance
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Theme</label>
              <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose your preferred color scheme
              </p>
            </div>
          </div>
        </div>

        {/* Backend Configuration */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            Backend Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Backend URL</label>
              <input 
                type="url" 
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ProcessIQ backend server URL for workflow execution
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Settings */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            Workflow Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Auto-save workflows</label>
                <p className="text-xs text-muted-foreground">Automatically save changes as you work</p>
              </div>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSave ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSave ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Concurrent Tasks
              </label>
              <input 
                type="number" 
                value={maxConcurrentTasks}
                onChange={(e) => setMaxConcurrentTasks(parseInt(e.target.value) || 1)}
                min="1"
                max="20"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum number of simultaneous workflow executions (1-20)
              </p>
            </div>
          </div>
        </div>

        {/* Development Settings */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
            Development
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Debug Mode</label>
                <p className="text-xs text-muted-foreground">Enable detailed logging and debugging features</p>
              </div>
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  debugMode ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    debugMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </button>
          
          <button
            onClick={handleSave}
            className={`flex items-center px-6 py-2 rounded transition-colors ${
              saved 
                ? 'bg-green-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}