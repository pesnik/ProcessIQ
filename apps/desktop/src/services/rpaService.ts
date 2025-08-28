/**
 * RPA Service - Handles communication with ProcessIQ backend
 */

const API_BASE_URL = 'http://localhost:8000';

export interface RPAStepResult {
  stepId: string;
  status: 'success' | 'error' | 'running';
  data?: any;
  duration?: number;
  error?: string;
  screenshot?: string;
}

export interface RPAExecutionRequest {
  workflowType: 'kaggle_to_excel' | 'custom';
  steps: string[];
  options?: {
    headless?: boolean;
    outputDir?: string;
    showBrowser?: boolean;
  };
}

export interface RPAExecutionResponse {
  executionId: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  currentStep?: string;
  results?: RPAStepResult[];
  artifacts?: {
    excel_file?: string;
    summary_report?: string;
    screenshots?: string[];
  };
}

class RPAService {
  private executionId: string | null = null;
  private eventSource: EventSource | null = null;

  async startDemo(request: RPAExecutionRequest): Promise<RPAExecutionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/rpa/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.executionId = data.executionId;
      return data;
    } catch (error) {
      console.error('Failed to start RPA demo:', error);
      throw error;
    }
  }

  async stopDemo(): Promise<void> {
    if (!this.executionId) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/rpa/execute/${this.executionId}/stop`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to stop RPA demo:', error);
    } finally {
      this.executionId = null;
      this.closeEventStream();
    }
  }

  subscribeToProgress(
    onProgress: (data: RPAExecutionResponse) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this.executionId) {
      throw new Error('No active execution to subscribe to');
    }

    // Close existing connection if any
    this.closeEventStream();

    try {
      this.eventSource = new EventSource(
        `${API_BASE_URL}/api/v1/rpa/execute/${this.executionId}/stream`
      );

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onProgress(data);
        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError);
        }
      };

      this.eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        if (onError) {
          onError(new Error('Connection to backend lost'));
        }
      };

      this.eventSource.onopen = () => {
        console.log('Connected to RPA execution stream');
      };

    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      if (onError) {
        onError(error as Error);
      }
    }

    // Return cleanup function
    return () => this.closeEventStream();
  }

  private closeEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  async getDemoStatus(): Promise<RPAExecutionResponse | null> {
    if (!this.executionId) return null;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/rpa/execute/${this.executionId}/status`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get demo status:', error);
      return null;
    }
  }

  async getAvailableArtifacts(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/rpa/artifacts`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.artifacts || [];
    } catch (error) {
      console.error('Failed to get artifacts:', error);
      return [];
    }
  }

  async downloadArtifact(filename: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/rpa/artifacts/${filename}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to download artifact:', error);
      throw error;
    }
  }

  // Fallback: Run demo without backend (simulated mode)
  async runSimulatedDemo(
    onProgress: (data: RPAExecutionResponse) => void,
    steps: string[]
  ): Promise<void> {
    const simulatedExecutionId = `sim_${Date.now()}`;
    
    // Start simulation
    onProgress({
      executionId: simulatedExecutionId,
      status: 'started',
      results: [],
    });

    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];
      
      // Step start
      onProgress({
        executionId: simulatedExecutionId,
        status: 'running',
        currentStep: stepId,
        results: [],
      });

      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

      // Mock step result
      const stepResult: RPAStepResult = {
        stepId,
        status: 'success',
        duration: Math.floor(Math.random() * 2000 + 1000),
        data: this.getMockStepData(stepId),
      };

      // Step completion
      onProgress({
        executionId: simulatedExecutionId,
        status: i === steps.length - 1 ? 'completed' : 'running',
        currentStep: undefined,
        results: [stepResult],
      });
    }
  }

  private getMockStepData(stepId: string): any {
    switch (stepId) {
      case 'web_scraping':
        return {
          records_scraped: Math.floor(Math.random() * 100 + 100),
          sources: ['simulated-source.com'],
          data_quality: `${(95 + Math.random() * 4).toFixed(1)}%`,
          file_size: `${(10 + Math.random() * 10).toFixed(1)} KB`,
        };
      case 'data_processing':
        return {
          records_processed: Math.floor(Math.random() * 100 + 140),
          records_cleaned: Math.floor(Math.random() * 100 + 135),
          duplicates_removed: Math.floor(Math.random() * 5 + 1),
          total_sales: `$${(Math.random() * 500000 + 500000).toLocaleString()}`,
          regions_analyzed: 5,
        };
      case 'excel_generation':
        return {
          worksheets_created: 4,
          charts_generated: Math.floor(Math.random() * 4 + 4),
          file_size: `${(2 + Math.random() * 2).toFixed(1)} MB`,
          format: 'XLSX with macros',
        };
      case 'analysis_report':
        return {
          insights_generated: Math.floor(Math.random() * 8 + 10),
          trends_identified: Math.floor(Math.random() * 3 + 4),
          recommendations: Math.floor(Math.random() * 5 + 6),
          confidence_score: `${(90 + Math.random() * 8).toFixed(1)}%`,
        };
      default:
        return { status: 'completed' };
    }
  }
}

export const rpaService = new RPAService();