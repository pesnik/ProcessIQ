import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import Store from 'electron-store';
import * as path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Initialize electron store for settings
const store = new Store();

class ProcessIQApp {
  private mainWindow: BrowserWindow | null = null;
  private backendProcess: ChildProcessWithoutNullStreams | null = null;
  private readonly isDev = process.env.NODE_ENV === 'development';

  constructor() {
    this.setupApp();
    this.setupEventHandlers();
    this.setupIpcHandlers();
  }

  private setupApp(): void {
    // Enable live reload for development (disabled for WSL2 compatibility)
    // if (this.isDev) {
    //   require('electron-reload')(__dirname, {
    //     electron: require('electron'),
    //     hardResetMethod: 'exit'
    //   });
    // }

    // Set app user model ID for Windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.processiq.desktop');
    }
  }

  private setupEventHandlers(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.startBackendServer();
      this.setupMenu();
      
      // Check for updates in production
      if (!this.isDev) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    });

    app.on('window-all-closed', () => {
      this.cleanup();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private setupIpcHandlers(): void {
    // Backend communication
    ipcMain.handle('backend-status', async () => {
      return this.backendProcess !== null;
    });

    ipcMain.handle('restart-backend', async () => {
      this.stopBackendServer();
      await this.sleep(1000);
      this.startBackendServer();
      return true;
    });

    // File operations
    ipcMain.handle('select-file', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'JSON', extensions: ['json'] },
          { name: 'YAML', extensions: ['yaml', 'yml'] },
          { name: 'Excel', extensions: ['xlsx', 'xls'] },
          { name: 'CSV', extensions: ['csv'] }
        ]
      });
      return result;
    });

    ipcMain.handle('select-directory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result;
    });

    // Settings management
    ipcMain.handle('get-setting', async (_, key: string) => {
      return store.get(key);
    });

    ipcMain.handle('set-setting', async (_, key: string, value: any) => {
      store.set(key, value);
      return true;
    });

    // External links
    ipcMain.handle('open-external', async (_, url: string) => {
      shell.openExternal(url);
    });

    // App data path
    ipcMain.handle('get-user-data-path', async () => {
      return app.getPath('userData');
    });
  }

  private createWindow(): void {
    // Get window bounds from store or use defaults
    const windowBounds = store.get('windowBounds', {
      width: 1200,
      height: 800,
      x: undefined,
      y: undefined
    }) as any;

    this.mainWindow = new BrowserWindow({
      ...windowBounds,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      show: false // Don't show until ready
    });

    // Load the appropriate URL
    const startUrl = this.isDev 
      ? 'http://localhost:5173' 
      : `file://${path.join(__dirname, '../dist/index.html')}`;
    
    this.mainWindow.loadURL(startUrl);

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow!.show();
      
      // Focus window on creation
      if (this.isDev) {
        this.mainWindow!.webContents.openDevTools();
      }
    });

    // Save window bounds on close
    this.mainWindow.on('close', () => {
      if (this.mainWindow) {
        store.set('windowBounds', this.mainWindow.getBounds());
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Workflow',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'new-workflow');
            }
          },
          {
            label: 'Open Workflow',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'open-workflow');
            }
          },
          {
            label: 'Save Workflow',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'save-workflow');
            }
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'settings');
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Automation',
        submenu: [
          {
            label: 'Start Workflow',
            accelerator: 'F5',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'start-workflow');
            }
          },
          {
            label: 'Stop Workflow',
            accelerator: 'Shift+F5',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'stop-workflow');
            }
          },
          { type: 'separator' },
          {
            label: 'View Logs',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'view-logs');
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
            click: () => {
              shell.openExternal('https://github.com/pesnik/ProcessIQ/wiki');
            }
          },
          {
            label: 'Report Issue',
            click: () => {
              shell.openExternal('https://github.com/pesnik/ProcessIQ/issues');
            }
          },
          { type: 'separator' },
          {
            label: 'About ProcessIQ',
            click: () => {
              this.mainWindow?.webContents.send('menu-action', 'about');
            }
          }
        ]
      }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private startBackendServer(): void {
    if (this.backendProcess) {
      return; // Already running
    }

    log.info('Starting ProcessIQ backend server...');
    
    try {
      // In development, assume backend is running separately
      if (this.isDev) {
        log.info('Development mode: Backend should be started manually');
        return;
      }

      // In production, start the packaged backend
      const backendPath = path.join(process.resourcesPath, 'backend', 'processiq');
      this.backendProcess = spawn(backendPath, ['start'], {
        env: { ...process.env, PROCESSIQ_MODE: 'desktop' },
        stdio: 'pipe'
      });

      this.backendProcess.stdout?.on('data', (data) => {
        log.info(`Backend stdout: ${data}`);
      });

      this.backendProcess.stderr?.on('data', (data) => {
        log.error(`Backend stderr: ${data}`);
      });

      this.backendProcess.on('close', (code) => {
        log.info(`Backend process exited with code ${code}`);
        this.backendProcess = null;
      });

    } catch (error) {
      log.error('Failed to start backend server:', error);
    }
  }

  private stopBackendServer(): void {
    if (this.backendProcess) {
      log.info('Stopping ProcessIQ backend server...');
      this.backendProcess.kill();
      this.backendProcess = null;
    }
  }

  private cleanup(): void {
    this.stopBackendServer();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the app
new ProcessIQApp();

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://localhost') || url.startsWith('https://127.0.0.1')) {
    // Ignore certificate errors for localhost in development
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});