/**
 * Workflow Engine Service - Manages embedded workflow server and editor
 */

interface WorkflowEngineConfig {
  port: number;
  host: string;
  userFolder: string;
  customNodes: string[];
}

class WorkflowEngineService {
  private server: express.Application | null = null;
  private serverInstance: any = null;
  private config: WorkflowEngineConfig;
  private mockServerRunning: boolean = false;

  constructor() {
    this.config = {
      port: 5678, // Workflow engine port
      host: 'localhost',
      userFolder: '', // Will be set when needed
      customNodes: [
        // Will be set dynamically when needed
      ]
    };
    this.initializeUserFolder();
  }

  private async initializeUserFolder(): Promise<void> {
    try {
      // Get user data path from electron if available, otherwise use fallback
      const userDataPath = typeof window !== 'undefined' && window.electronAPI 
        ? await window.electronAPI.getUserDataPath() 
        : './processiq-data';
        
      this.config.userFolder = `${userDataPath}/workflow-engine`;
      
      // Set custom nodes path relative to the app
      this.config.customNodes = [
        `${userDataPath}/workflow-nodes/@processiq/n8n-rpa-nodes/dist`
      ];
    } catch (error) {
      console.warn('Could not get user data path, using fallback:', error);
      this.config.userFolder = './processiq-data/workflow-engine';
      this.config.customNodes = ['./processiq-data/workflow-nodes'];
    }
  }

  /**
   * Start embedded workflow server
   */
  async startWorkflowEngine(): Promise<boolean> {
    try {
      console.log('Starting workflow engine...');
      
      // Simulate startup delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, use mock server - actual workflow engine integration will be implemented
      // when we have proper workflow dependencies installed
      this.mockServerRunning = true;
      console.log(`Mock workflow engine started on http://${this.config.host}:${this.config.port}`);
      return true;
      
    } catch (error) {
      console.error('Failed to start workflow engine:', error);
      return false;
    }
  }

  /**
   * Stop workflow server
   */
  async stopWorkflowEngine(): Promise<void> {
    try {
      this.mockServerRunning = false;
      if (this.serverInstance) {
        await this.serverInstance.close();
        this.serverInstance = null;
      }
      console.log('Workflow engine stopped');
    } catch (error) {
      console.error('Error stopping workflow engine:', error);
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
   * Check if workflow engine is running
   */
  async isServerRunning(): Promise<boolean> {
    // For mock implementation, return the mock server status
    return this.mockServerRunning;
  }

  /**
   * Execute workflow by ID
   */
  async executeWorkflow(workflowId: string, data?: any): Promise<any> {
    if (!this.mockServerRunning) {
      throw new Error('Workflow engine is not running');
    }

    // Return mock execution result
    const executionId = `exec_${Date.now()}`;
    console.log(`Mock execution started for workflow ${workflowId}:`, executionId);
    
    return {
      executionId,
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString()
    };
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
   * List available workflows
   */
  async getWorkflows(): Promise<any[]> {
    if (!this.mockServerRunning) {
      return [];
    }

    // Return mock workflows for demo
    return [
      {
        id: 'rpa-demo-workflow',
        name: 'ProcessIQ RPA Demo - Kaggle to Excel',
        active: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'web-automation-workflow',
        name: 'Web Data Extraction',
        active: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(workflowData: any): Promise<any> {
    try {
      const response = await fetch(`${this.getApiUrl()}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error(`Failed to import workflow: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Import workflow error:', error);
      throw error;
    }
  }

  /**
   * Create ProcessIQ RPA demo workflow
   */
  async createRPADemoWorkflow(): Promise<any> {
    const demoWorkflow = {
      name: 'ProcessIQ RPA Demo - Kaggle to Excel',
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
          position: [250, 300],
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
          position: [450, 300],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'fillField',
            selector: 'input[name="custemail"]',
            text: 'demo@processiq.com'
          },
          id: 'playwright-3',
          name: 'Fill Email',
          type: 'playwright',
          position: [650, 300],
          typeVersion: 1
        },
        {
          parameters: {
            operation: 'screenshot'
          },
          id: 'playwright-4',
          name: 'Take Screenshot',
          type: 'playwright',
          position: [850, 300],
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
                node: 'Fill Email',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Fill Email': {
          main: [
            [
              {
                node: 'Take Screenshot',
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