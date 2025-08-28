import { useEffect } from 'react';

export function useElectronMenuHandler() {
  useEffect(() => {
    // Check if we're running in Electron
    const isElectron = window.navigator.userAgent.includes('Electron');
    
    if (!isElectron) {
      return;
    }

    // Handle Electron menu events
    const handleMenuEvent = (event: any) => {
      const { action } = event.detail || {};
      
      switch (action) {
        case 'new-workflow':
          window.location.href = '/designer';
          break;
        case 'open-settings':
          window.location.href = '/settings';
          break;
        case 'toggle-devtools':
          // This would be handled by the main process
          break;
        default:
          console.log('Unhandled menu action:', action);
      }
    };

    // Listen for custom menu events
    window.addEventListener('electron-menu', handleMenuEvent);

    // Cleanup
    return () => {
      window.removeEventListener('electron-menu', handleMenuEvent);
    };
  }, []);
}