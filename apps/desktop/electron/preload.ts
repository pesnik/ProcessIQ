import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend operations
  getBackendStatus: () => ipcRenderer.invoke('backend-status'),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),

  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value),

  // External links
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Menu actions
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_, action) => callback(action));
  },

  // App info
  getVersion: () => process.env.npm_package_version || '0.1.0',
  getPlatform: () => process.platform,

  // Window controls (for custom title bar if needed)
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // Cleanup
  removeAllListeners: () => ipcRenderer.removeAllListeners('menu-action')
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getBackendStatus: () => Promise<boolean>;
      restartBackend: () => Promise<boolean>;
      selectFile: () => Promise<Electron.OpenDialogReturnValue>;
      selectDirectory: () => Promise<Electron.OpenDialogReturnValue>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<boolean>;
      openExternal: (url: string) => Promise<void>;
      onMenuAction: (callback: (action: string) => void) => void;
      getVersion: () => string;
      getPlatform: () => string;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      removeAllListeners: () => void;
    };
  }
}