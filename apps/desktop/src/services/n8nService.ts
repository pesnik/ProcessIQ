/**
 * Workflow Engine Service - Manages n8n workflow server via Electron IPC
 */

interface WorkflowEngineConfig {
  port: number;
  host: string;
}

class WorkflowEngineService {
  private config: WorkflowEngineConfig;

  constructor() {
    this.config = {
      port: 5678, // n8n default port
      host: 'localhost'
    };
  }

  /**
   * Start n8n workflow server via Electron main process
   */
  async startWorkflowEngine(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        console.log('Starting n8n workflow engine via Electron IPC...');
        const result = await (window as any).electronAPI.n8nStart();
        console.log('n8n start result:', result);
        return result;
      } catch (error) {
        console.error('Failed to start n8n via IPC:', error);
        return false;
      }
    } else {
      console.error('ElectronAPI not available - running outside of Electron');
      return false;
    }
  }

  /**
   * Stop n8n workflow server via Electron main process
   */
  async stopWorkflowEngine(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        console.log('Stopping n8n workflow engine via Electron IPC...');
        await (window as any).electronAPI.n8nStop();
        console.log('✅ n8n workflow engine stopped');
      } catch (error) {
        console.error('Error stopping n8n via IPC:', error);
      }
    } else {
      console.error('ElectronAPI not available - running outside of Electron');
    }
  }

  /**
   * Get workflow editor URL
   */
  getEditorUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get workflow API base URL
   */
  getApiUrl(): string {
    return `http://${this.config.host}:${this.config.port}/rest`;
  }

  /**
   * Check if n8n workflow engine is running via Electron main process
   */
  async isServerRunning(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const result = await (window as any).electronAPI.n8nStatus();
        return result;
      } catch (error) {
        console.error('Error checking n8n status via IPC:', error);
        return false;
      }
    } else {
      console.error('ElectronAPI not available - running outside of Electron');
      return false;
    }
  }

  /**
   * Execute workflow by ID via Electron main process
   */
  async executeWorkflow(workflowId: string, data?: any): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const result = await (window as any).electronAPI.n8nExecuteWorkflow(workflowId, data);
        console.log(`✅ n8n workflow execution started for ${workflowId}:`, result);
        return result;
      } catch (error) {
        console.error('Execute workflow error via IPC:', error);
        throw error;
      }
    } else {
      throw new Error('ElectronAPI not available - running outside of Electron');
    }
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.getApiUrl()}/executions/${executionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get execution status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get execution status error:', error);
      throw error;
    }
  }

  /**
   * List available workflows via Electron main process
   */
  async getWorkflows(): Promise<any[]> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const result = await (window as any).electronAPI.n8nGetWorkflows();
        return result;
      } catch (error) {
        console.error('Get workflows error via IPC:', error);
        
        // Return demo workflows as fallback
        return [
          {
            id: 'rpa-demo-workflow',
            name: 'ProcessIQ RPA Demo - Complete Automation Pipeline',
            active: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
      }
    } else {
      console.error('ElectronAPI not available - running outside of Electron');
      return [];
    }
  }

  /**
   * Import workflow from JSON via Electron main process
   */
  async importWorkflow(workflowData: any): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const result = await (window as any).electronAPI.n8nImportWorkflow(workflowData);
        return result;
      } catch (error) {
        console.error('Import workflow error via IPC:', error);
        throw error;
      }
    } else {
      throw new Error('ElectronAPI not available - running outside of Electron');
    }
  }

  /**
   * Create ProcessIQ RPA demo workflow with Phase 2 nodes
   */
  async createRPADemoWorkflow(): Promise<any> {
    const demoWorkflow = {
      name: 'ProcessIQ RPA Demo - Complete Automation Pipeline',
      nodes: [
        {
          parameters: {
            operation: 'navigate',
            url: 'https://httpbin.org/forms/post',
            headless: false
          },
          id: 'playwright-1',
          name: 'Navigate to Demo Site',
          type: 'playwright',
          position: [100, 200],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'fillField',
            selector: 'input[name="custname"]',
            text: 'ProcessIQ Demo User'
          },
          id: 'playwright-2',
          name: 'Fill Customer Name',
          type: 'playwright',
          position: [300, 200],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'extractData',
            selector: 'form',
            dataType: 'form'
          },
          id: 'playwright-3',
          name: 'Extract Form Data',
          type: 'playwright',
          position: [500, 200],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'writeExcel',
            outputFileName: '/tmp/demo-output.xlsx',
            sheetName: 'Demo Data',
            includeHeaders: true
          },
          id: 'excel-1',
          name: 'Save to Excel',
          type: 'excel',
          position: [700, 200],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'query',
            databaseType: 'postgresql',
            connection: {
              host: 'localhost',
              port: 5432,
              database: 'processiq_demo',
              username: 'demo_user',
              password: 'demo_pass'
            },
            query: 'INSERT INTO form_submissions (name, email, created_at) VALUES ($1, $2, NOW())'
          },
          id: 'database-1',
          name: 'Store in Database',
          type: 'database',
          position: [900, 200],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'desktopAutomation',
            desktopAction: 'screenshot',
            parameters: {
              parameter: [{
                name: 'filename',
                value: '/tmp/desktop-screenshot.png',
                type: 'string'
              }]
            }
          },
          id: 'python-1',
          name: 'Desktop Screenshot',
          type: 'pythonBridge',
          position: [500, 400],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'computerVision',
            cvTask: 'imageRecognition',
            parameters: {
              parameter: [{
                name: 'image_path',
                value: '/tmp/desktop-screenshot.png',
                type: 'string'
              }]
            }
          },
          id: 'python-2',
          name: 'Analyze Screenshot',
          type: 'pythonBridge',
          position: [700, 400],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'navigate',
            url: 'https://www.google.com',
            browserType: 'chrome',
            headless: false
          },
          id: 'selenium-1',
          name: 'Advanced Web Navigation',
          type: 'selenium',
          position: [300, 600],
          typeVersion: 1
        }
      ],
      connections: {
        'Navigate to Demo Site': {
          main: [
            [
              {
                node: 'Fill Customer Name',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Fill Customer Name': {
          main: [
            [
              {
                node: 'Extract Form Data',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Extract Form Data': {
          main: [
            [
              {
                node: 'Save to Excel',
                type: 'main',
                index: 0
              },
              {
                node: 'Store in Database',
                type: 'main',
                index: 0
              },
              {
                node: 'Desktop Screenshot',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Desktop Screenshot': {
          main: [
            [
              {
                node: 'Analyze Screenshot',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Save to Excel': {
          main: [
            [
              {
                node: 'Advanced Web Navigation',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      active: false,
      settings: {},
      id: 'rpa-demo-workflow'
    };

    return await this.importWorkflow(demoWorkflow);
  }
}

export const workflowEngineService = new WorkflowEngineService();

// Legacy export for backward compatibility during transition
export const n8nService = workflowEngineService;