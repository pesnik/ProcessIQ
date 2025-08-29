/**
 * n8n Integration Service - Manages embedded n8n server and editor
 */
import { app } from 'electron';
import * as express from 'express';
import * as path from 'path';

interface N8nConfig {
  port: number;
  host: string;
  userFolder: string;
  customNodes: string[];
}

class N8nService {
  private server: express.Application | null = null;
  private serverInstance: any = null;
  private config: N8nConfig;

  constructor() {
    this.config = {
      port: 5678, // Standard n8n port
      host: 'localhost',
      userFolder: path.join(app.getPath('userData'), 'n8n'),
      customNodes: [
        path.join(__dirname, '../../node_modules/@processiq/n8n-rpa-nodes/dist')
      ]
    };
  }

  /**
   * Start embedded n8n server
   */
  async startN8nServer(): Promise<boolean> {
    try {
      // Set n8n environment variables
      process.env.N8N_HOST = this.config.host;
      process.env.N8N_PORT = this.config.port.toString();
      process.env.N8N_USER_FOLDER = this.config.userFolder;
      process.env.N8N_CUSTOM_EXTENSIONS = this.config.customNodes.join(';');
      process.env.N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN = 'true';
      process.env.N8N_DISABLE_PRODUCTION_MAIN_PROCESS = 'true';
      
      // Import n8n dynamically to avoid issues with electron
      const n8n = await import('n8n');
      
      // Start n8n server
      await n8n.start();
      
      console.log(`n8n server started on http://${this.config.host}:${this.config.port}`);
      return true;
      
    } catch (error) {
      console.error('Failed to start n8n server:', error);
      return false;
    }
  }

  /**
   * Stop n8n server
   */
  async stopN8nServer(): Promise<void> {
    try {
      if (this.serverInstance) {
        await this.serverInstance.close();
        this.serverInstance = null;
      }
      console.log('n8n server stopped');
    } catch (error) {
      console.error('Error stopping n8n server:', error);
    }
  }

  /**
   * Get n8n editor URL
   */
  getEditorUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get n8n API base URL
   */
  getApiUrl(): string {
    return `http://${this.config.host}:${this.config.port}/rest`;
  }

  /**
   * Check if n8n server is running
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getApiUrl()}/active-workflows`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Execute workflow by ID
   */
  async executeWorkflow(workflowId: string, data?: any): Promise<any> {
    try {
      const response = await fetch(`${this.getApiUrl()}/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(`Workflow execution failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Workflow execution error:', error);
      throw error;
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
   * List available workflows
   */
  async getWorkflows(): Promise<any[]> {
    try {
      const response = await fetch(`${this.getApiUrl()}/workflows`);
      
      if (!response.ok) {
        throw new Error(`Failed to get workflows: ${response.statusText}`);
      }

      const data = await response.json();
      return data.workflows || [];
    } catch (error) {
      console.error('Get workflows error:', error);
      return [];
    }
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

export const n8nService = new N8nService();