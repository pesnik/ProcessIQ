import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class PythonBridgeNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Python Bridge',
		name: 'pythonBridge',
		icon: 'file:python.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["scriptName"]}}',
		description: 'Execute Python scripts and integrate with ProcessIQ backend',
		defaults: {
			name: 'Python Bridge',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Script',
						value: 'executeScript',
						description: 'Execute a Python script',
						action: 'Execute Python script',
					},
					{
						name: 'Call Backend API',
						value: 'callBackend',
						description: 'Call ProcessIQ backend endpoint',
						action: 'Call backend API',
					},
					{
						name: 'Desktop Automation',
						value: 'desktopAutomation',
						description: 'Execute desktop automation via PyAutoGUI',
						action: 'Desktop automation',
					},
					{
						name: 'Computer Vision',
						value: 'computerVision',
						description: 'Perform computer vision tasks with OpenCV',
						action: 'Computer vision',
					},
					{
						name: 'Data Processing',
						value: 'dataProcessing',
						description: 'Process data with pandas/numpy',
						action: 'Data processing',
					},
					{
						name: 'Machine Learning',
						value: 'machineLearning',
						description: 'Execute ML models and predictions',
						action: 'Machine learning',
					},
					{
						name: 'Robot Framework',
						value: 'robotFramework',
						description: 'Execute Robot Framework tests',
						action: 'Robot Framework',
					},
				],
				default: 'executeScript',
			},
			{
				displayName: 'Script Source',
				name: 'scriptSource',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['executeScript'],
					},
				},
				options: [
					{ name: 'Inline Code', value: 'inline' },
					{ name: 'File Path', value: 'file' },
					{ name: 'Backend Module', value: 'backend' },
				],
				default: 'inline',
				description: 'Source of the Python script',
			},
			{
				displayName: 'Python Code',
				name: 'pythonCode',
				type: 'string',
				typeOptions: {
					editor: 'code',
					editorLanguage: 'python',
				},
				displayOptions: {
					show: {
						operation: ['executeScript'],
						scriptSource: ['inline'],
					},
				},
				default: `# ProcessIQ Python Script
import json
import sys

def main():
    # Your Python code here
    data = {"message": "Hello from Python!", "status": "success"}
    return data

if __name__ == "__main__":
    result = main()
    print(json.dumps(result))`,
				description: 'Python code to execute',
			},
			{
				displayName: 'Script File Path',
				name: 'scriptFilePath',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['executeScript'],
						scriptSource: ['file'],
					},
				},
				default: '',
				placeholder: '/path/to/script.py',
				description: 'Path to Python script file',
			},
			{
				displayName: 'Backend Module',
				name: 'backendModule',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['executeScript'],
						scriptSource: ['backend'],
					},
				},
				options: [
					{ name: 'Playwright Connector', value: 'playwright_connector' },
					{ name: 'RobotFramework Connector', value: 'robotframework_connector' },
					{ name: 'Desktop Connector', value: 'desktop' },
					{ name: 'File Connector', value: 'file' },
					{ name: 'Database Connector', value: 'database' },
				],
				default: 'playwright_connector',
				description: 'ProcessIQ backend module to use',
			},
			{
				displayName: 'Backend Endpoint',
				name: 'backendEndpoint',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['callBackend'],
					},
				},
				default: '/api/v1/connectors/execute',
				placeholder: '/api/v1/connectors/execute',
				description: 'Backend API endpoint to call',
			},
			{
				displayName: 'Desktop Action',
				name: 'desktopAction',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['desktopAutomation'],
					},
				},
				options: [
					{ name: 'Click', value: 'click' },
					{ name: 'Type Text', value: 'type' },
					{ name: 'Take Screenshot', value: 'screenshot' },
					{ name: 'Find Image', value: 'findImage' },
					{ name: 'Get Mouse Position', value: 'mousePosition' },
					{ name: 'Scroll', value: 'scroll' },
					{ name: 'Hotkey', value: 'hotkey' },
				],
				default: 'click',
				description: 'Desktop automation action to perform',
			},
			{
				displayName: 'CV Task',
				name: 'cvTask',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['computerVision'],
					},
				},
				options: [
					{ name: 'Image Recognition', value: 'imageRecognition' },
					{ name: 'Text Detection (OCR)', value: 'textDetection' },
					{ name: 'Object Detection', value: 'objectDetection' },
					{ name: 'Image Processing', value: 'imageProcessing' },
					{ name: 'Template Matching', value: 'templateMatching' },
				],
				default: 'imageRecognition',
				description: 'Computer vision task to perform',
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'fixedCollection',
				placeholder: 'Add Parameter',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Parameter name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Parameter value',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'String', value: 'string' },
									{ name: 'Number', value: 'number' },
									{ name: 'Boolean', value: 'boolean' },
									{ name: 'JSON', value: 'json' },
								],
								default: 'string',
								description: 'Parameter data type',
							},
						],
					},
				],
			},
			{
				displayName: 'Python Path',
				name: 'pythonPath',
				type: 'string',
				default: 'python3',
				description: 'Path to Python interpreter',
			},
			{
				displayName: 'Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: 30,
				description: 'Script execution timeout',
			},
			{
				displayName: 'Environment Variables',
				name: 'envVars',
				type: 'fixedCollection',
				placeholder: 'Add Environment Variable',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'envVar',
						displayName: 'Environment Variable',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Environment variable name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Environment variable value',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		try {
			for (let i = 0; i < items.length; i++) {
				const operation = this.getNodeParameter('operation', i) as string;
				const pythonPath = this.getNodeParameter('pythonPath', i) as string;
				const timeout = this.getNodeParameter('timeout', i) as number;

				let result: any = {};

				switch (operation) {
					case 'executeScript':
						result = await this.executeScript(i, items[i].json);
						break;

					case 'callBackend':
						result = await this.callBackend(i, items[i].json);
						break;

					case 'desktopAutomation':
						result = await this.executeDesktopAutomation(i, items[i].json);
						break;

					case 'computerVision':
						result = await this.executeComputerVision(i, items[i].json);
						break;

					case 'dataProcessing':
						result = await this.executeDataProcessing(i, items[i].json);
						break;

					case 'machineLearning':
						result = await this.executeMachineLearning(i, items[i].json);
						break;

					case 'robotFramework':
						result = await this.executeRobotFramework(i, items[i].json);
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				// Add execution metadata
				result.executionTime = new Date().toISOString();
				result.operation = operation;

				returnData.push({
					json: result,
				});
			}

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Python Bridge execution failed: ${error.message}`);
		}

		return [returnData];
	}

	private async executeScript(itemIndex: number, inputData: any): Promise<any> {
		const scriptSource = this.getNodeParameter('scriptSource', itemIndex) as string;
		const pythonPath = this.getNodeParameter('pythonPath', itemIndex) as string;
		const timeout = this.getNodeParameter('timeout', itemIndex) as number * 1000; // Convert to milliseconds

		let scriptContent = '';
		let scriptPath = '';

		try {
			// Prepare script based on source
			switch (scriptSource) {
				case 'inline':
					scriptContent = this.getNodeParameter('pythonCode', itemIndex) as string;
					scriptPath = await this.createTempScript(scriptContent);
					break;

				case 'file':
					scriptPath = this.getNodeParameter('scriptFilePath', itemIndex) as string;
					if (!fs.existsSync(scriptPath)) {
						throw new NodeOperationError(this.getNode(), `Script file not found: ${scriptPath}`);
					}
					break;

				case 'backend':
					const backendModule = this.getNodeParameter('backendModule', itemIndex) as string;
					scriptContent = await this.generateBackendScript(backendModule, inputData);
					scriptPath = await this.createTempScript(scriptContent);
					break;
			}

			// Execute Python script
			const result = await this.runPythonScript(scriptPath, inputData, pythonPath, timeout);

			// Clean up temp file if created
			if (scriptSource === 'inline' || scriptSource === 'backend') {
				fs.unlinkSync(scriptPath);
			}

			return {
				operation: 'executeScript',
				scriptSource,
				scriptPath: scriptSource === 'file' ? scriptPath : 'temporary',
				executionTime_ms: result.executionTime,
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exitCode,
				data: result.data,
				status: result.exitCode === 0 ? 'success' : 'error',
			};

		} catch (error) {
			// Clean up temp file if created
			if ((scriptSource === 'inline' || scriptSource === 'backend') && scriptPath && fs.existsSync(scriptPath)) {
				fs.unlinkSync(scriptPath);
			}
			throw error;
		}
	}

	private async callBackend(itemIndex: number, inputData: any): Promise<any> {
		const endpoint = this.getNodeParameter('backendEndpoint', itemIndex) as string;
		const parameters = this.getNodeParameter('parameters', itemIndex) as any;

		try {
			// For now, return mock response - in real implementation, call actual backend
			// const response = await fetch(`http://localhost:8000${endpoint}`, {
			//     method: 'POST',
			//     headers: { 'Content-Type': 'application/json' },
			//     body: JSON.stringify({ ...inputData, ...parameters })
			// });

			return {
				operation: 'callBackend',
				endpoint,
				requestData: { ...inputData, parameters },
				mockResponse: {
					status: 'success',
					data: { message: 'Backend call simulated', timestamp: new Date().toISOString() },
				},
				status: 'success',
			};

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Backend call failed: ${error.message}`);
		}
	}

	private async executeDesktopAutomation(itemIndex: number, inputData: any): Promise<any> {
		const desktopAction = this.getNodeParameter('desktopAction', itemIndex) as string;
		const parameters = this.getNodeParameter('parameters', itemIndex) as any;

		// Generate PyAutoGUI script
		const scriptContent = `
import pyautogui
import json
import sys
import time

def main():
    try:
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0.5
        
        action = "${desktopAction}"
        params = ${JSON.stringify(parameters)}
        
        if action == "click":
            x = params.get("x", 100)
            y = params.get("y", 100)
            pyautogui.click(x, y)
            result = {"action": "click", "position": [x, y]}
            
        elif action == "type":
            text = params.get("text", "Hello World")
            pyautogui.typewrite(text)
            result = {"action": "type", "text": text}
            
        elif action == "screenshot":
            screenshot = pyautogui.screenshot()
            screenshot.save("/tmp/python_bridge_screenshot.png")
            result = {"action": "screenshot", "saved": "/tmp/python_bridge_screenshot.png"}
            
        elif action == "mousePosition":
            pos = pyautogui.position()
            result = {"action": "mousePosition", "x": pos.x, "y": pos.y}
            
        elif action == "hotkey":
            keys = params.get("keys", ["ctrl", "c"])
            pyautogui.hotkey(*keys)
            result = {"action": "hotkey", "keys": keys}
            
        else:
            result = {"error": f"Unknown action: {action}"}
            
        return {"status": "success", "data": result}
        
    except Exception as e:
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    result = main()
    print(json.dumps(result))
`;

		const scriptPath = await this.createTempScript(scriptContent);
		const pythonPath = this.getNodeParameter('pythonPath', itemIndex) as string;
		const timeout = this.getNodeParameter('timeout', itemIndex) as number * 1000;

		try {
			const result = await this.runPythonScript(scriptPath, inputData, pythonPath, timeout);
			fs.unlinkSync(scriptPath);

			return {
				operation: 'desktopAutomation',
				desktopAction,
				parameters,
				executionTime_ms: result.executionTime,
				data: result.data,
				status: result.exitCode === 0 ? 'success' : 'error',
			};

		} catch (error) {
			if (fs.existsSync(scriptPath)) {
				fs.unlinkSync(scriptPath);
			}
			throw error;
		}
	}

	private async executeComputerVision(itemIndex: number, inputData: any): Promise<any> {
		const cvTask = this.getNodeParameter('cvTask', itemIndex) as string;
		const parameters = this.getNodeParameter('parameters', itemIndex) as any;

		// Generate OpenCV script
		const scriptContent = `
import cv2
import numpy as np
import json
import sys

def main():
    try:
        task = "${cvTask}"
        params = ${JSON.stringify(parameters)}
        
        if task == "imageRecognition":
            # Mock image recognition
            result = {
                "objects_detected": ["person", "car", "building"],
                "confidence_scores": [0.95, 0.87, 0.92],
                "bounding_boxes": [[100, 100, 200, 300], [300, 150, 450, 250], [500, 50, 800, 400]]
            }
            
        elif task == "textDetection":
            # Mock OCR
            result = {
                "text_detected": "Sample text detected from image",
                "confidence": 0.89,
                "coordinates": [150, 200, 400, 250]
            }
            
        elif task == "objectDetection":
            # Mock object detection
            result = {
                "objects": [
                    {"class": "person", "confidence": 0.95, "bbox": [100, 100, 200, 300]},
                    {"class": "vehicle", "confidence": 0.87, "bbox": [300, 150, 450, 250]}
                ]
            }
            
        else:
            result = {"error": f"Unknown CV task: {task}"}
            
        return {"status": "success", "data": result}
        
    except Exception as e:
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    result = main()
    print(json.dumps(result))
`;

		const scriptPath = await this.createTempScript(scriptContent);
		const pythonPath = this.getNodeParameter('pythonPath', itemIndex) as string;
		const timeout = this.getNodeParameter('timeout', itemIndex) as number * 1000;

		try {
			const result = await this.runPythonScript(scriptPath, inputData, pythonPath, timeout);
			fs.unlinkSync(scriptPath);

			return {
				operation: 'computerVision',
				cvTask,
				parameters,
				executionTime_ms: result.executionTime,
				data: result.data,
				status: result.exitCode === 0 ? 'success' : 'error',
			};

		} catch (error) {
			if (fs.existsSync(scriptPath)) {
				fs.unlinkSync(scriptPath);
			}
			throw error;
		}
	}

	private async executeDataProcessing(itemIndex: number, inputData: any): Promise<any> {
		// Mock data processing operation
		return {
			operation: 'dataProcessing',
			recordsProcessed: Array.isArray(inputData) ? inputData.length : 1,
			operations: ['clean', 'transform', 'aggregate'],
			data: {
				summary: 'Data processed successfully',
				metrics: { nulls_removed: 5, duplicates_removed: 2, transformations_applied: 3 },
			},
			status: 'success',
		};
	}

	private async executeMachineLearning(itemIndex: number, inputData: any): Promise<any> {
		// Mock ML operation
		return {
			operation: 'machineLearning',
			model: 'random_forest_classifier',
			predictions: [0.85, 0.92, 0.78, 0.95],
			confidence: 0.89,
			features_used: ['feature1', 'feature2', 'feature3'],
			status: 'success',
		};
	}

	private async executeRobotFramework(itemIndex: number, inputData: any): Promise<any> {
		// Mock Robot Framework execution
		return {
			operation: 'robotFramework',
			testSuite: 'ProcessIQ_RPA_Tests',
			testsRun: 5,
			testsPassed: 4,
			testsFailed: 1,
			executionTime: '00:02:35',
			status: 'success',
		};
	}

	private async createTempScript(scriptContent: string): Promise<string> {
		const tempDir = '/tmp';
		const tempFile = path.join(tempDir, `python_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
		
		fs.writeFileSync(tempFile, scriptContent, 'utf8');
		return tempFile;
	}

	private async generateBackendScript(backendModule: string, inputData: any): Promise<string> {
		// Generate script that calls ProcessIQ backend modules
		return `
import sys
import json
import requests

def main():
    try:
        # Call ProcessIQ backend module: ${backendModule}
        data = ${JSON.stringify(inputData)}
        
        # Mock backend call - replace with actual backend integration
        result = {
            "module": "${backendModule}",
            "input_data": data,
            "backend_response": {
                "status": "success",
                "message": f"Called {backendModule} successfully",
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }
        
        return {"status": "success", "data": result}
        
    except Exception as e:
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    result = main()
    print(json.dumps(result))
`;
	}

	private async runPythonScript(scriptPath: string, inputData: any, pythonPath: string, timeout: number): Promise<any> {
		return new Promise((resolve, reject) => {
			const startTime = Date.now();
			
			// Set up environment variables
			const envVars = this.getNodeParameter('envVars', 0) as any;
			const env = { ...process.env };
			
			if (envVars?.envVar) {
				envVars.envVar.forEach((envVar: any) => {
					env[envVar.name] = envVar.value;
				});
			}

			const pythonProcess = spawn(pythonPath, [scriptPath], {
				env,
				stdio: ['pipe', 'pipe', 'pipe'],
			});

			let stdout = '';
			let stderr = '';

			pythonProcess.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			pythonProcess.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			// Set timeout
			const timeoutHandle = setTimeout(() => {
				pythonProcess.kill();
				reject(new NodeOperationError(this.getNode(), `Python script timed out after ${timeout}ms`));
			}, timeout);

			pythonProcess.on('close', (exitCode) => {
				clearTimeout(timeoutHandle);
				const executionTime = Date.now() - startTime;

				let data = null;
				if (exitCode === 0 && stdout) {
					try {
						data = JSON.parse(stdout.trim());
					} catch (error) {
						data = { output: stdout.trim() };
					}
				}

				resolve({
					exitCode,
					stdout,
					stderr,
					executionTime,
					data,
				});
			});

			pythonProcess.on('error', (error) => {
				clearTimeout(timeoutHandle);
				reject(new NodeOperationError(this.getNode(), `Failed to execute Python script: ${error.message}`));
			});

			// Send input data to script if needed
			if (inputData) {
				pythonProcess.stdin.write(JSON.stringify(inputData));
				pythonProcess.stdin.end();
			}
		});
	}
}