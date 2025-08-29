import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import Store from 'electron-store';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Initialize electron store for settings
const store = new Store();

class ProcessIQApp {
  private mainWindow: BrowserWindow | null = null;
  private backendProcess: ChildProcessWithoutNullStreams | null = null;
  private n8nProcess: ChildProcessWithoutNullStreams | null = null;
  private n8nServerRunning: boolean = false;
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

    // n8n workflow engine management
    ipcMain.handle('n8n-start', async () => {
      return await this.startN8nServer();
    });

    ipcMain.handle('n8n-stop', async () => {
      return await this.stopN8nServer();
    });

    ipcMain.handle('n8n-status', async () => {
      return this.isN8nRunning();
    });

    ipcMain.handle('n8n-get-workflows', async () => {
      return await this.getN8nWorkflows();
    });

    ipcMain.handle('n8n-execute-workflow', async (_, workflowId: string, data?: any) => {
      return await this.executeN8nWorkflow(workflowId, data);
    });

    ipcMain.handle('n8n-import-workflow', async (_, workflowData: any) => {
      return await this.importN8nWorkflow(workflowData);
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
    this.stopN8nServer();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // n8n Workflow Engine Management Methods
  private async startN8nServer(): Promise<boolean> {
    if (this.n8nServerRunning || this.n8nProcess) {
      log.info('n8n server is already running');
      return true;
    }

    try {
      log.info('Starting n8n workflow engine...');
      
      // Set up user folder and custom nodes path
      const userDataPath = app.getPath('userData');
      const userFolder = path.join(userDataPath, 'workflow-engine');
      const packagePath = path.resolve(__dirname, '..', '..', '..', 'packages', 'n8n-rpa-nodes');
      
      // Ensure user folder exists
      if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true });
      }

      // Set up environment variables for n8n with better-sqlite3
      const env = {
        ...process.env,
        N8N_PORT: '5678',
        N8N_HOST: 'localhost',
        N8N_USER_FOLDER: userFolder,
        N8N_NODES_BASE_PATH: packagePath,
        N8N_DISABLE_UI: 'false',
        N8N_BASIC_AUTH_ACTIVE: 'false', // Disable auth for local development
        N8N_DIAGNOSTICS_ENABLED: 'false',
        N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
        N8N_TEMPLATES_ENABLED: 'true',
        N8N_PUBLIC_API_DISABLED: 'false',
        N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false', // Disable permissions check for development
        N8N_DB_TYPE: 'sqlite',
        N8N_DB_SQLITE_DATABASE: path.join(userFolder, 'database.sqlite'),
        N8N_DB_SQLITE_ENABLE_WAL: 'true', // Enable WAL mode for better performance
        NODE_ENV: 'development'
      };

      log.info('n8n Environment variables:', {
        N8N_PORT: env.N8N_PORT,
        N8N_HOST: env.N8N_HOST,
        N8N_USER_FOLDER: env.N8N_USER_FOLDER,
        N8N_NODES_BASE_PATH: env.N8N_NODES_BASE_PATH,
        N8N_DB_TYPE: env.N8N_DB_TYPE,
        N8N_DB_SQLITE_DATABASE: env.N8N_DB_SQLITE_DATABASE
      });

      // Start n8n process - use the installed version in our dependencies
      log.info('Starting n8n using the installed package dependency');
      
      const n8nCommand = 'npm';
      const n8nArgs = ['exec', '--', 'n8n', 'start'];

      this.n8nProcess = spawn(n8nCommand, n8nArgs, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        cwd: path.resolve(__dirname, '..')
      });

      // Handle n8n process events
      this.n8nProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        log.info(`[n8n] ${output.trim()}`);
        
        // Check if server has started successfully
        if (output.includes('n8n ready on') || output.includes('localhost:5678')) {
          this.n8nServerRunning = true;
          log.info('✅ n8n server started successfully');
        }
      });

      this.n8nProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        log.error(`[n8n ERROR] ${error.trim()}`);
      });

      this.n8nProcess.on('close', (code) => {
        log.info(`[n8n] Process exited with code ${code}`);
        this.n8nServerRunning = false;
        this.n8nProcess = null;
      });

      this.n8nProcess.on('error', (error) => {
        log.error(`[n8n] Process error:`, error);
        this.n8nServerRunning = false;
        this.n8nProcess = null;
      });

      // Wait for n8n to start (with timeout)
      const startTimeout = 30000; // 30 seconds
      const checkInterval = 1000; // 1 second
      let elapsed = 0;

      while (elapsed < startTimeout && !this.n8nServerRunning) {
        await this.sleep(checkInterval);
        elapsed += checkInterval;
      }

      if (this.n8nServerRunning) {
        log.info('✅ n8n workflow engine started successfully on http://localhost:5678');
        return true;
      } else {
        log.error('❌ n8n server failed to start within timeout period');
        await this.stopN8nServer();
        return false;
      }
      
    } catch (error) {
      log.error('Failed to start n8n workflow engine:', error);
      await this.stopN8nServer();
      return false;
    }
  }

  private async stopN8nServer(): Promise<void> {
    try {
      if (this.n8nProcess) {
        log.info('Stopping n8n workflow engine...');
        
        // Try graceful shutdown first
        this.n8nProcess.kill('SIGTERM');
        
        // Wait a moment for graceful shutdown
        await this.sleep(5000);
        
        // Force kill if still running
        if (this.n8nProcess && !this.n8nProcess.killed) {
          this.n8nProcess.kill('SIGKILL');
        }
        
        this.n8nProcess = null;
      }
      
      this.n8nServerRunning = false;
      log.info('✅ n8n workflow engine stopped');
    } catch (error) {
      log.error('Error stopping n8n workflow engine:', error);
    }
  }

  private isN8nRunning(): boolean {
    return this.n8nServerRunning && this.n8nProcess !== null && !this.n8nProcess.killed;
  }

  private async getN8nWorkflows(): Promise<any[]> {
    if (!this.isN8nRunning()) {
      return [];
    }

    try {
      // For now, return demo workflow data since we need to implement n8n API calls
      return [
        {
          id: 'rpa-demo-workflow',
          name: 'ProcessIQ RPA Demo - Complete Automation Pipeline',
          active: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    } catch (error) {
      log.error('Error getting workflows:', error);
      return [];
    }
  }

  private async executeN8nWorkflow(workflowId: string, data?: any): Promise<any> {
    if (!this.isN8nRunning()) {
      throw new Error('n8n workflow engine is not running');
    }

    try {
      log.info(`Executing n8n workflow: ${workflowId}`);
      
      // Mock execution result for now - real n8n API integration would go here
      const executionId = `exec_${Date.now()}`;
      
      return {
        executionId,
        workflowId,
        status: 'running',
        startedAt: new Date().toISOString()
      };
    } catch (error) {
      log.error('Execute workflow error:', error);
      throw error;
    }
  }

  private async importN8nWorkflow(workflowData: any): Promise<any> {
    if (!this.isN8nRunning()) {
      throw new Error('n8n workflow engine is not running');
    }

    try {
      log.info('Importing n8n workflow:', workflowData.name);
      
      // Mock import result for now - real n8n API integration would go here
      return {
        id: workflowData.id || `workflow_${Date.now()}`,
        name: workflowData.name,
        imported: true,
        importedAt: new Date().toISOString()
      };
    } catch (error) {
      log.error('Import workflow error:', error);
      throw error;
    }
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