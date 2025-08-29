import React from 'react';
import { ThemeToggle } from '../ThemeToggle';

interface BackendStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  onRetry: () => void;
}

interface LayoutProps {
  children: React.ReactNode;
  backendStatus: BackendStatus;
}

export function Layout({ children, backendStatus }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border">
        <div className="p-4">
          <h1 className="text-xl font-bold text-foreground">ProcessIQ</h1>
        </div>
        <nav className="mt-8">
          <div className="px-4 py-2">
            <a href="/dashboard" className="block px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent">
              Dashboard
            </a>
            <a href="/designer" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              Visual Designer
            </a>
            <a href="/connectors" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              Connectors
            </a>
            <a href="/plugins" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              Plugins
            </a>
            <a href="/rpa-demo" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              RPA Demo
            </a>
            <a href="/logs" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              Logs
            </a>
            <a href="/settings" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              Settings
            </a>
          </div>
        </nav>
        
        {/* Theme Toggle */}
        <div className="mt-8 px-4">
          <ThemeToggle />
        </div>
        
        {/* Backend Status */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${backendStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-muted-foreground">
              {backendStatus.isConnecting ? 'Connecting...' : 
               backendStatus.isConnected ? 'Backend Connected' : 'Backend Disconnected'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}