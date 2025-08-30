/**
 * Test Workflow for ProcessIQ Execution System
 * 
 * This creates a simple workflow to test the execution engine:
 * Start -> Browser Navigate -> Data Extract -> End
 */

import { WorkflowDefinition } from '../services/workflowExecutionService';

export const createTestWorkflow = (): WorkflowDefinition => {
  return {
    id: `test_workflow_${Date.now()}`,
    name: "Test Workflow - Basic Flow",
    description: "Simple test workflow to verify execution engine functionality",
    nodes: {
      "start_1": {
        id: "start_1",
        type: "start",
        name: "Start Test",
        position: { x: 100, y: 100 },
        config: {},
        connections: ["browser_1"]
      },
      "browser_1": {
        id: "browser_1", 
        type: "browser_navigate",
        name: "Visit Example.com",
        position: { x: 300, y: 100 },
        config: {
          url: "https://example.com",
          wait_for: "networkidle"
        },
        connections: ["extract_1"]
      },
      "extract_1": {
        id: "extract_1",
        type: "browser_extract", 
        name: "Extract Page Title",
        position: { x: 500, y: 100 },
        config: {
          selector: "h1",
          extract_type: "text",
          variable_name: "page_title"
        },
        connections: ["log_1"]
      },
      "log_1": {
        id: "log_1",
        type: "log",
        name: "Log Results",
        position: { x: 700, y: 100 },
        config: {
          level: "info",
          message: "Extracted title: ${page_title}"
        },
        connections: ["end_1"]
      },
      "end_1": {
        id: "end_1",
        type: "end",
        name: "Complete Test",
        position: { x: 900, y: 100 },
        config: {
          message: "Test workflow completed successfully"
        },
        connections: []
      }
    },
    variables: {
      environment: "test",
      created_at: new Date().toISOString()
    },
    triggers: []
  };
};

export const createDataProcessingWorkflow = (): WorkflowDefinition => {
  return {
    id: `data_processing_${Date.now()}`,
    name: "Data Processing Test", 
    description: "Test data processing capabilities with Excel and variables",
    nodes: {
      "start_1": {
        id: "start_1",
        type: "start", 
        name: "Start Processing",
        position: { x: 100, y: 200 },
        config: {},
        connections: ["excel_1"]
      },
      "excel_1": {
        id: "excel_1",
        type: "excel_read",
        name: "Read Test Data",
        position: { x: 300, y: 200 },
        config: {
          file_path: "./test_data.xlsx",
          sheet_name: "Sheet1", 
          variable_name: "excel_data"
        },
        connections: ["python_1"]
      },
      "python_1": {
        id: "python_1",
        type: "python_script",
        name: "Process Data",
        position: { x: 500, y: 200 },
        config: {
          script: "# Process the Excel data\nprocessed_data = [row for row in excel_data if row.get('active', True)]",
          input_variables: ["excel_data"],
          output_variables: ["processed_data"]
        },
        connections: ["condition_1"]
      },
      "condition_1": {
        id: "condition_1",
        type: "condition",
        name: "Check Data Count",
        position: { x: 700, y: 200 },
        config: {
          condition: "len(processed_data) > 0"
        },
        connections: ["email_1", "log_error"]
      },
      "email_1": {
        id: "email_1", 
        type: "email_send",
        name: "Send Success Report",
        position: { x: 850, y: 150 },
        config: {
          to: "test@example.com",
          subject: "Data Processing Complete",
          body: "Processed ${len(processed_data)} records successfully."
        },
        connections: ["end_1"]
      },
      "log_error": {
        id: "log_error",
        type: "log",
        name: "Log No Data",
        position: { x: 850, y: 250 },
        config: {
          level: "warning", 
          message: "No data found to process"
        },
        connections: ["end_1"]
      },
      "end_1": {
        id: "end_1",
        type: "end",
        name: "Processing Complete",
        position: { x: 1000, y: 200 },
        config: {
          message: "Data processing workflow finished"
        },
        connections: []
      }
    },
    variables: {
      environment: "test",
      batch_id: `batch_${Date.now()}`
    },
    triggers: []
  };
};

export const createErrorTestWorkflow = (): WorkflowDefinition => {
  return {
    id: `error_test_${Date.now()}`,
    name: "Error Handling Test",
    description: "Test error handling and recovery mechanisms", 
    nodes: {
      "start_1": {
        id: "start_1",
        type: "start",
        name: "Start Error Test", 
        position: { x: 100, y: 300 },
        config: {},
        connections: ["browser_fail"]
      },
      "browser_fail": {
        id: "browser_fail",
        type: "browser_navigate",
        name: "Navigate to Invalid URL",
        position: { x: 300, y: 300 },
        config: {
          url: "https://this-domain-does-not-exist-12345.com",
          wait_for: "networkidle"
        },
        connections: ["log_1"]
      },
      "log_1": {
        id: "log_1", 
        type: "log",
        name: "This Should Still Run",
        position: { x: 500, y: 300 },
        config: {
          level: "info",
          message: "This log should execute even after previous node fails"
        },
        connections: ["end_1"]
      },
      "end_1": {
        id: "end_1",
        type: "end", 
        name: "End Error Test",
        position: { x: 700, y: 300 },
        config: {
          message: "Error handling test completed"
        },
        connections: []
      }
    },
    variables: {
      error_test: true
    },
    triggers: []
  };
};

// Export test suite for easy execution
export const TEST_WORKFLOWS = {
  basic: createTestWorkflow,
  dataProcessing: createDataProcessingWorkflow,
  errorHandling: createErrorTestWorkflow
};

export default TEST_WORKFLOWS;