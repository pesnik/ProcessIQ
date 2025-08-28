import { useState, useEffect, useCallback } from 'react';

interface BackendConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  retry: () => void;
}

const BACKEND_URL = 'http://localhost:8000';

export function useBackendConnection(): BackendConnectionState {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>();

  const checkConnection = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);

    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.status === 'healthy');
      } else {
        setIsConnected(false);
        setError(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const retry = useCallback(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    isConnecting,
    error,
    retry,
  };
}