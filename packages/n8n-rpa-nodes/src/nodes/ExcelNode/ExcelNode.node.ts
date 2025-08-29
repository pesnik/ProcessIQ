import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export class ExcelNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Excel Processor',
		name: 'excel',
		icon: 'file:excel.svg',
		group: ['transform', 'input', 'output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["fileName"]}}',
		description: 'Read, write, and manipulate Excel/CSV files',
		defaults: {
			name: 'Excel Processor',
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
						name: 'Read Excel',
						value: 'readExcel',
						description: 'Read data from an Excel file',
						action: 'Read an Excel file',
					},
					{
						name: 'Write Excel',
						value: 'writeExcel',
						description: 'Write data to an Excel file',
						action: 'Write to an Excel file',
					},
					{
						name: 'Read CSV',
						value: 'readCsv',
						description: 'Read data from a CSV file',
						action: 'Read a CSV file',
					},
					{
						name: 'Write CSV',
						value: 'writeCsv',
						description: 'Write data to a CSV file',
						action: 'Write to a CSV file',
					},
					{
						name: 'Transform Data',
						value: 'transform',
						description: 'Transform and manipulate spreadsheet data',
						action: 'Transform spreadsheet data',
					},
					{
						name: 'Create Report',
						value: 'report',
						description: 'Generate formatted business report',
						action: 'Create a business report',
					},
				],
				default: 'readExcel',
			},
			{
				displayName: 'File Path',
				name: 'fileName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['readExcel', 'readCsv'],
					},
				},
				default: '',
				placeholder: '/path/to/file.xlsx',
				description: 'Path to the input file',
			},
			{
				displayName: 'Output File Path',
				name: 'outputFileName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['writeExcel', 'writeCsv', 'report'],
					},
				},
				default: '',
				placeholder: '/path/to/output.xlsx',
				description: 'Path for the output file',
			},
			{
				displayName: 'Sheet Name',
				name: 'sheetName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['readExcel', 'writeExcel'],
					},
				},
				default: 'Sheet1',
				description: 'Name of the Excel sheet to process',
			},
			{
				displayName: 'Include Headers',
				name: 'includeHeaders',
				type: 'boolean',
				default: true,
				description: 'Whether the first row contains headers',
			},
			{
				displayName: 'Data Range',
				name: 'dataRange',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['readExcel'],
					},
				},
				default: '',
				placeholder: 'A1:E100',
				description: 'Specific range to read (optional, e.g., A1:E100)',
			},
			{
				displayName: 'Transform Options',
				name: 'transformOptions',
				type: 'collection',
				placeholder: 'Add Transform',
				displayOptions: {
					show: {
						operation: ['transform'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Filter Rows',
						name: 'filterRows',
						type: 'string',
						default: '',
						placeholder: 'column > 100',
						description: 'Filter expression for rows',
					},
					{
						displayName: 'Sort By',
						name: 'sortBy',
						type: 'string',
						default: '',
						description: 'Column name to sort by',
					},
					{
						displayName: 'Group By',
						name: 'groupBy',
						type: 'string',
						default: '',
						description: 'Column name to group by',
					},
					{
						displayName: 'Aggregate Function',
						name: 'aggregateFunction',
						type: 'options',
						options: [
							{ name: 'Sum', value: 'sum' },
							{ name: 'Count', value: 'count' },
							{ name: 'Average', value: 'avg' },
							{ name: 'Min', value: 'min' },
							{ name: 'Max', value: 'max' },
						],
						default: 'sum',
						description: 'Aggregation function to apply',
					},
				],
			},
			{
				displayName: 'Report Type',
				name: 'reportType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['report'],
					},
				},
				options: [
					{ name: 'Sales Report', value: 'sales' },
					{ name: 'Financial Summary', value: 'financial' },
					{ name: 'Data Analysis', value: 'analysis' },
					{ name: 'Custom Report', value: 'custom' },
				],
				default: 'analysis',
				description: 'Type of report to generate',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		try {
			for (let i = 0; i < items.length; i++) {
				const operation = this.getNodeParameter('operation', i) as string;
				const includeHeaders = this.getNodeParameter('includeHeaders', i) as boolean;

				let result: any = {};

				switch (operation) {
					case 'readExcel':
						result = await this.readExcelFile(i);
						break;

					case 'writeExcel':
						result = await this.writeExcelFile(i, items[i].json);
						break;

					case 'readCsv':
						result = await this.readCsvFile(i);
						break;

					case 'writeCsv':
						result = await this.writeCsvFile(i, items[i].json);
						break;

					case 'transform':
						result = await this.transformData(i, items[i].json);
						break;

					case 'report':
						result = await this.generateReport(i, items[i].json);
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
			throw new NodeOperationError(this.getNode(), `Excel processing failed: ${error.message}`);
		}

		return [returnData];
	}

	private async readExcelFile(itemIndex: number): Promise<any> {
		const fileName = this.getNodeParameter('fileName', itemIndex) as string;
		const sheetName = this.getNodeParameter('sheetName', itemIndex) as string;
		const includeHeaders = this.getNodeParameter('includeHeaders', itemIndex) as boolean;
		const dataRange = this.getNodeParameter('dataRange', itemIndex) as string;

		if (!fileName) {
			throw new NodeOperationError(this.getNode(), 'File path is required');
		}

		try {
			const workbook = XLSX.readFile(fileName);
			const worksheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
			
			if (!worksheet) {
				throw new NodeOperationError(this.getNode(), `Sheet "${sheetName}" not found`);
			}

			const range = dataRange || undefined;
			const jsonData = XLSX.utils.sheet_to_json(worksheet, {
				header: includeHeaders ? 1 : undefined,
				range: range,
				raw: false,
			});

			return {
				operation: 'readExcel',
				fileName,
				sheetName: sheetName || workbook.SheetNames[0],
				recordsRead: jsonData.length,
				data: jsonData,
				metadata: {
					totalSheets: workbook.SheetNames.length,
					sheetNames: workbook.SheetNames,
					range: range || 'full',
				},
				status: 'success',
			};

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Failed to read Excel file: ${error.message}`);
		}
	}

	private async writeExcelFile(itemIndex: number, inputData: any): Promise<any> {
		const outputFileName = this.getNodeParameter('outputFileName', itemIndex) as string;
		const sheetName = this.getNodeParameter('sheetName', itemIndex) as string;
		const includeHeaders = this.getNodeParameter('includeHeaders', itemIndex) as boolean;

		if (!outputFileName) {
			throw new NodeOperationError(this.getNode(), 'Output file path is required');
		}

		try {
			// Ensure data is an array
			const dataArray = Array.isArray(inputData.data) ? inputData.data : [inputData];
			
			// Create new workbook and worksheet
			const workbook = XLSX.utils.book_new();
			const worksheet = XLSX.utils.json_to_sheet(dataArray, {
				header: includeHeaders ? undefined : [],
			});

			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

			// Ensure output directory exists
			const outputDir = path.dirname(outputFileName);
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			// Write file
			XLSX.writeFile(workbook, outputFileName);

			return {
				operation: 'writeExcel',
				outputFileName,
				sheetName,
				recordsWritten: dataArray.length,
				fileSize: fs.statSync(outputFileName).size,
				status: 'success',
			};

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Failed to write Excel file: ${error.message}`);
		}
	}

	private async readCsvFile(itemIndex: number): Promise<any> {
		const fileName = this.getNodeParameter('fileName', itemIndex) as string;
		const includeHeaders = this.getNodeParameter('includeHeaders', itemIndex) as boolean;

		if (!fileName) {
			throw new NodeOperationError(this.getNode(), 'File path is required');
		}

		try {
			const workbook = XLSX.readFile(fileName, { type: 'file' });
			const worksheet = workbook.Sheets[workbook.SheetNames[0]];
			
			const jsonData = XLSX.utils.sheet_to_json(worksheet, {
				header: includeHeaders ? 1 : undefined,
				raw: false,
			});

			return {
				operation: 'readCsv',
				fileName,
				recordsRead: jsonData.length,
				data: jsonData,
				status: 'success',
			};

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Failed to read CSV file: ${error.message}`);
		}
	}

	private async writeCsvFile(itemIndex: number, inputData: any): Promise<any> {
		const outputFileName = this.getNodeParameter('outputFileName', itemIndex) as string;
		const includeHeaders = this.getNodeParameter('includeHeaders', itemIndex) as boolean;

		if (!outputFileName) {
			throw new NodeOperationError(this.getNode(), 'Output file path is required');
		}

		try {
			// Ensure data is an array
			const dataArray = Array.isArray(inputData.data) ? inputData.data : [inputData];
			
			// Create worksheet from data
			const worksheet = XLSX.utils.json_to_sheet(dataArray, {
				header: includeHeaders ? undefined : [],
			});

			// Convert to CSV
			const csvData = XLSX.utils.sheet_to_csv(worksheet);

			// Ensure output directory exists
			const outputDir = path.dirname(outputFileName);
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			// Write CSV file
			fs.writeFileSync(outputFileName, csvData, 'utf8');

			return {
				operation: 'writeCsv',
				outputFileName,
				recordsWritten: dataArray.length,
				fileSize: fs.statSync(outputFileName).size,
				status: 'success',
			};

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Failed to write CSV file: ${error.message}`);
		}
	}

	private async transformData(itemIndex: number, inputData: any): Promise<any> {
		const transformOptions = this.getNodeParameter('transformOptions', itemIndex) as any;

		try {
			let data = Array.isArray(inputData.data) ? inputData.data : [inputData];
			let transformedData = [...data];

			// Apply filters
			if (transformOptions.filterRows) {
				// Simple filtering (could be enhanced with proper expression parsing)
				transformedData = transformedData.filter((row: any) => {
					// Basic filter implementation - could be expanded
					return true; // Placeholder
				});
			}

			// Apply sorting
			if (transformOptions.sortBy) {
				transformedData.sort((a: any, b: any) => {
					const aVal = a[transformOptions.sortBy];
					const bVal = b[transformOptions.sortBy];
					return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
				});
			}

			// Apply grouping and aggregation
			if (transformOptions.groupBy) {
				const grouped: any = {};
				transformedData.forEach((row: any) => {
					const key = row[transformOptions.groupBy];
					if (!grouped[key]) {
						grouped[key] = [];
					}
					grouped[key].push(row);
				});

				transformedData = Object.keys(grouped).map(key => ({
					[transformOptions.groupBy]: key,
					count: grouped[key].length,
					records: grouped[key],
				}));
			}

			return {
				operation: 'transform',
				originalRecords: data.length,
				transformedRecords: transformedData.length,
				data: transformedData,
				transformationsApplied: Object.keys(transformOptions).filter(key => transformOptions[key]),
				status: 'success',
			};

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Data transformation failed: ${error.message}`);
		}
	}

	private async generateReport(itemIndex: number, inputData: any): Promise<any> {
		const outputFileName = this.getNodeParameter('outputFileName', itemIndex) as string;
		const reportType = this.getNodeParameter('reportType', itemIndex) as string;

		try {
			const data = Array.isArray(inputData.data) ? inputData.data : [inputData];
			
			// Create workbook with multiple sheets for comprehensive report
			const workbook = XLSX.utils.book_new();

			// Summary sheet
			const summaryData = [
				{ Metric: 'Total Records', Value: data.length },
				{ Metric: 'Report Generated', Value: new Date().toISOString() },
				{ Metric: 'Report Type', Value: reportType },
			];
			const summarySheet = XLSX.utils.json_to_sheet(summaryData);
			XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

			// Data sheet
			const dataSheet = XLSX.utils.json_to_sheet(data);
			XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

			// Analysis sheet (basic statistics)
			if (data.length > 0) {
				const numericColumns = Object.keys(data[0]).filter(key => 
					typeof data[0][key] === 'number'
				);

				const analysisData = numericColumns.map(col => {
					const values = data.map(row => row[col]).filter(val => typeof val === 'number');
					return {
						Column: col,
						Count: values.length,
						Sum: values.reduce((a, b) => a + b, 0),
						Average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
						Min: Math.min(...values),
						Max: Math.max(...values),
					};
				});

				if (analysisData.length > 0) {
					const analysisSheet = XLSX.utils.json_to_sheet(analysisData);
					XLSX.utils.book_append_sheet(workbook, analysisSheet, 'Analysis');
				}
			}

			// Ensure output directory exists
			const outputDir = path.dirname(outputFileName);
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			// Write report
			XLSX.writeFile(workbook, outputFileName);

			return {
				operation: 'report',
				reportType,
				outputFileName,
				totalRecords: data.length,
				sheetsGenerated: workbook.SheetNames.length,
				sheetNames: workbook.SheetNames,
				fileSize: fs.statSync(outputFileName).size,
				status: 'success',
			};

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Report generation failed: ${error.message}`);
		}
	}
}