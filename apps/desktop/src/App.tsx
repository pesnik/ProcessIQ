import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Layout } from '@/components/layout/Layout';
import { useBackendConnection } from '@/hooks/useBackendConnection';
import { useElectronMenuHandler } from '@/hooks/useElectronMenuHandler';

// Pages
import Dashboard from '@/pages/Dashboard';
import WorkflowDesigner from '@/pages/WorkflowDesigner';
import Connectors from '@/pages/Connectors';
import Logs from '@/pages/Logs';
import Settings from '@/pages/Settings';
import PluginManager from '@/pages/PluginManager';
import RPADemo from '@/pages/RPADemo';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, isConnecting, error, retry } = useBackendConnection();
  
  // Handle Electron menu actions
  useElectronMenuHandler();

  useEffect(() => {
    // Simulate initial app load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="processiq-theme">
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-foreground">Initializing ProcessIQ...</h2>
            <p className="text-sm text-muted-foreground mt-1">Setting up automation engine</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="processiq-theme">
      <div className="h-screen bg-background text-foreground">
        <Layout 
          backendStatus={{ 
            isConnected, 
            isConnecting, 
            error,
            onRetry: retry 
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/designer" element={<WorkflowDesigner />} />
            <Route path="/connectors" element={<Connectors />} />
            <Route path="/plugins" element={<PluginManager />} />
            <Route path="/rpa-demo" element={<RPADemo />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;