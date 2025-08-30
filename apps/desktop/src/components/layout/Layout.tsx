import React, { useState, useEffect } from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { 
  BarChart3, 
  Workflow, 
  Plug, 
  Puzzle, 
  Zap, 
  FileText, 
  Settings, 
  Shield,
  ChevronLeft, 
  ChevronRight,
  Activity,
  Brain,
  Sparkles,
  FolderOpen,
  Clock
} from 'lucide-react';

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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Initialize from localStorage or default to false
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [currentPath, setCurrentPath] = useState('/dashboard');

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Update current path when location changes
  useEffect(() => {
    const updatePath = () => {
      setCurrentPath(window.location.pathname);
    };

    // Set initial path
    updatePath();

    // Listen for navigation events (for Electron/browser navigation)
    window.addEventListener('popstate', updatePath);
    
    // Also listen for hash changes in case of hash-based routing
    window.addEventListener('hashchange', updatePath);

    // Custom event for programmatic navigation
    window.addEventListener('navigate', updatePath);

    return () => {
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('hashchange', updatePath);
      window.removeEventListener('navigate', updatePath);
    };
  }, []);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/designer', label: 'Workflow Designer', icon: Workflow },
    { href: '/workflows', label: 'Workflow History', icon: FolderOpen },
    { href: '/scheduler', label: 'Scheduler', icon: Clock },
    { href: '/connectors', label: 'Connectors', icon: Plug },
    { href: '/plugins', label: 'Plugins', icon: Puzzle },
    { href: '/security', label: 'Security', icon: Shield },
    { href: '/rpa-demo', label: 'RPA Platform', icon: Zap },
    { href: '/logs', label: 'Logs', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  // Function to check if a nav item is active
  const isActiveRoute = (href: string) => {
    if (href === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) {
      return true;
    }
    return currentPath === href;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col relative`}>
        {/* Header */}
        <div className="p-4 flex items-center min-h-[60px]">
          {/* Logo Container - Fixed position for smooth transition */}
          <div className="relative flex items-center flex-shrink-0">
            <div className="relative">
              <div className={`flex items-center justify-center rounded-lg shadow-lg transition-all duration-300 ${
                isCollapsed 
                  ? 'w-8 h-8 bg-transparent' 
                  : 'w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700'
              }`}>
                <Brain className={`transition-all duration-300 ${
                  isCollapsed 
                    ? 'h-8 w-8 text-primary' 
                    : 'h-6 w-6 text-white'
                }`} />
              </div>
              <Sparkles className="h-3 w-3 text-blue-400 absolute -top-1 -right-1 transition-all duration-300" />
            </div>
            
            {/* Text Container with smooth fade */}
            <div className={`flex flex-col transition-all duration-300 overflow-hidden ${
              isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-auto ml-3'
            }`}>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                ProcessIQ
              </h1>
              <span className="text-xs text-muted-foreground font-medium tracking-wide whitespace-nowrap">
                Enterprise RPA Platform
              </span>
            </div>
          </div>
        </div>
        
        {/* Toggle Button - Floating on separator */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3 p-1.5 bg-card border border-border rounded-md hover:bg-accent transition-all duration-300 shadow-sm z-10 flex-shrink-0 ${
            isCollapsed ? 'top-20' : 'top-4'
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 mt-4">
          <div className="px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-md text-sm font-medium transition-colors group ${
                    isActiveRoute(item.href)
                      ? 'text-foreground bg-accent' 
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </a>
              );
            })}
          </div>
        </nav>
        
        {/* Theme Toggle */}
        {!isCollapsed && (
          <div className="mt-4 px-4">
            <ThemeToggle />
          </div>
        )}
        
        {/* Backend Status */}
        <div className={`mt-4 mb-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {isCollapsed ? (
            <div 
              className="flex justify-center"
              title={backendStatus.isConnecting ? 'Connecting...' : 
                     backendStatus.isConnected ? 'Backend Connected' : 'Backend Disconnected'}
            >
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${backendStatus.isConnected ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${backendStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-muted-foreground">
                {backendStatus.isConnecting ? 'Connecting...' : 
                 backendStatus.isConnected ? 'Backend Connected' : 'Backend Disconnected'}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}