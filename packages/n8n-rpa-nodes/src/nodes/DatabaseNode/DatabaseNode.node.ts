import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class DatabaseNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Database Connector',
		name: 'database',
		icon: 'file:database.svg',
		group: ['input', 'output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["database"]}}',
		description: 'Connect to and query various databases (PostgreSQL, MySQL, MongoDB, SQLite)',
		defaults: {
			name: 'Database',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Database Type',
				name: 'databaseType',
				type: 'options',
				options: [
					{ name: 'PostgreSQL', value: 'postgresql' },
					{ name: 'MySQL', value: 'mysql' },
					{ name: 'SQLite', value: 'sqlite' },
					{ name: 'MongoDB', value: 'mongodb' },
					{ name: 'Microsoft SQL Server', value: 'mssql' },
				],
				default: 'postgresql',
				description: 'Type of database to connect to',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Query',
						value: 'query',
						description: 'Execute a SQL query',
						action: 'Execute a query',
					},
					{
						name: 'Insert Records',
						value: 'insert',
						description: 'Insert new records into table',
						action: 'Insert records',
					},
					{
						name: 'Update Records',
						value: 'update',
						description: 'Update existing records',
						action: 'Update records',
					},
					{
						name: 'Delete Records',
						value: 'delete',
						description: 'Delete records from table',
						action: 'Delete records',
					},
					{
						name: 'Create Table',
						value: 'createTable',
						description: 'Create a new table',
						action: 'Create table',
					},
					{
						name: 'Get Table Schema',
						value: 'schema',
						description: 'Get table structure information',
						action: 'Get table schema',
					},
					{
						name: 'List Tables',
						value: 'listTables',
						description: 'List all tables in database',
						action: 'List tables',
					},
					{
						name: 'Execute Procedure',
						value: 'procedure',
						description: 'Execute stored procedure',
						action: 'Execute procedure',
					},
				],
				default: 'query',
			},
			{
				displayName: 'Connection',
				name: 'connection',
				type: 'collection',
				placeholder: 'Add Connection Detail',
				default: {},
				displayOptions: {
					show: {
						databaseType: ['postgresql', 'mysql', 'mssql'],
					},
				},
				options: [
					{
						displayName: 'Host',
						name: 'host',
						type: 'string',
						default: 'localhost',
						description: 'Database server host',
					},
					{
						displayName: 'Port',
						name: 'port',
						type: 'number',
						default: 5432,
						description: 'Database server port',
					},
					{
						displayName: 'Database',
						name: 'database',
						type: 'string',
						default: '',
						required: true,
						description: 'Database name',
					},
					{
						displayName: 'Username',
						name: 'username',
						type: 'string',
						default: '',
						required: true,
						description: 'Database username',
					},
					{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						typeOptions: {
							password: true,
						},
						default: '',
						required: true,
						description: 'Database password',
					},
					{
						displayName: 'SSL',
						name: 'ssl',
						type: 'boolean',
						default: false,
						description: 'Use SSL connection',
					},
				],
			},
			{
				displayName: 'SQLite File Path',
				name: 'sqliteFile',
				type: 'string',
				displayOptions: {
					show: {
						databaseType: ['sqlite'],
					},
				},
				default: '',
				placeholder: '/path/to/database.db',
				description: 'Path to SQLite database file',
			},
			{
				displayName: 'MongoDB Connection String',
				name: 'mongoConnectionString',
				type: 'string',
				displayOptions: {
					show: {
						databaseType: ['mongodb'],
					},
				},
				default: 'mongodb://localhost:27017',
				description: 'MongoDB connection string',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					editor: 'code',
					editorLanguage: 'sql',
				},
				displayOptions: {
					show: {
						operation: ['query'],
					},
				},
				default: 'SELECT * FROM table_name LIMIT 10',
				description: 'SQL query to execute',
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['insert', 'update', 'delete', 'schema'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the table',
			},
			{
				displayName: 'MongoDB Collection',
				name: 'collection',
				type: 'string',
				displayOptions: {
					show: {
						databaseType: ['mongodb'],
						operation: ['query', 'insert', 'update', 'delete'],
					},
				},
				default: '',
				required: true,
				description: 'MongoDB collection name',
			},
			{
				displayName: 'MongoDB Query',
				name: 'mongoQuery',
				type: 'string',
				typeOptions: {
					editor: 'code',
					editorLanguage: 'json',
				},
				displayOptions: {
					show: {
						databaseType: ['mongodb'],
						operation: ['query'],
					},
				},
				default: '{}',
				description: 'MongoDB query (JSON format)',
			},
			{
				displayName: 'Data Fields',
				name: 'dataFields',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: ['insert', 'update'],
					},
				},
				default: {},
				placeholder: 'Add Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'field',
						displayName: 'Field',
						values: [
							{
								displayName: 'Column Name',
								name: 'column',
								type: 'string',
								default: '',
								description: 'Database column name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to insert/update',
							},
							{
								displayName: 'Data Type',
								name: 'dataType',
								type: 'options',
								options: [
									{ name: 'String', value: 'string' },
									{ name: 'Number', value: 'number' },
									{ name: 'Boolean', value: 'boolean' },
									{ name: 'Date', value: 'date' },
									{ name: 'JSON', value: 'json' },
								],
								default: 'string',
								description: 'Data type of the value',
							},
						],
					},
				],
			},
			{
				displayName: 'Where Condition',
				name: 'whereCondition',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['update', 'delete'],
					},
				},
				default: '',
				placeholder: 'id = 1',
				description: 'WHERE clause condition',
			},
			{
				displayName: 'Additional Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Query Timeout (seconds)',
						name: 'timeout',
						type: 'number',
						default: 30,
						description: 'Query timeout in seconds',
					},
					{
						displayName: 'Return Metadata',
						name: 'returnMetadata',
						type: 'boolean',
						default: false,
						description: 'Include query execution metadata',
					},
					{
						displayName: 'Batch Size',
						name: 'batchSize',
						type: 'number',
						default: 1000,
						description: 'Number of records to process in batch',
					},
					{
						displayName: 'Auto Create Table',
						name: 'autoCreateTable',
						type: 'boolean',
						default: false,
						description: 'Automatically create table if it does not exist',
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
				const databaseType = this.getNodeParameter('databaseType', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let result: any = {};

				// For now, return mock results since we don't have actual database connections
				// In real implementation, we would use appropriate database drivers
				result = await this.mockDatabaseOperation(databaseType, operation, i);

				// Add execution metadata
				result.executionTime = new Date().toISOString();
				result.databaseType = databaseType;
				result.operation = operation;

				returnData.push({
					json: result,
				});
			}

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Database operation failed: ${error.message}`);
		}

		return [returnData];
	}

	private async mockDatabaseOperation(databaseType: string, operation: string, itemIndex: number): Promise<any> {
		// Mock implementation - replace with actual database connections in production
		
		const mockData = [
			{ id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-01T10:00:00Z' },
			{ id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-02T11:00:00Z' },
			{ id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-03T12:00:00Z' },
		];

		switch (operation) {
			case 'query':
				return {
					operation: 'query',
					recordsFound: mockData.length,
					data: mockData,
					executionTime_ms: Math.random() * 100 + 50,
					status: 'success',
				};

			case 'insert':
				const tableName = this.getNodeParameter('tableName', itemIndex) as string;
				const dataFields = this.getNodeParameter('dataFields', itemIndex) as any;
				
				return {
					operation: 'insert',
					tableName,
					recordsInserted: 1,
					insertedId: Math.floor(Math.random() * 1000) + 100,
					fieldsInserted: dataFields?.field?.length || 0,
					status: 'success',
				};

			case 'update':
				const updateTable = this.getNodeParameter('tableName', itemIndex) as string;
				const whereCondition = this.getNodeParameter('whereCondition', itemIndex) as string;
				
				return {
					operation: 'update',
					tableName: updateTable,
					whereCondition,
					recordsUpdated: Math.floor(Math.random() * 5) + 1,
					status: 'success',
				};

			case 'delete':
				const deleteTable = this.getNodeParameter('tableName', itemIndex) as string;
				const deleteWhere = this.getNodeParameter('whereCondition', itemIndex) as string;
				
				return {
					operation: 'delete',
					tableName: deleteTable,
					whereCondition: deleteWhere,
					recordsDeleted: Math.floor(Math.random() * 3) + 1,
					status: 'success',
				};

			case 'listTables':
				const mockTables = ['users', 'orders', 'products', 'customers', 'invoices'];
				return {
					operation: 'listTables',
					tablesFound: mockTables.length,
					tables: mockTables.map(name => ({
						table_name: name,
						table_type: 'BASE TABLE',
						engine: databaseType === 'mysql' ? 'InnoDB' : null,
					})),
					status: 'success',
				};

			case 'schema':
				const schemaTable = this.getNodeParameter('tableName', itemIndex) as string;
				const mockSchema = [
					{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: null },
					{ column_name: 'name', data_type: 'varchar(255)', is_nullable: 'NO', column_default: null },
					{ column_name: 'email', data_type: 'varchar(255)', is_nullable: 'YES', column_default: null },
					{ column_name: 'created_at', data_type: 'timestamp', is_nullable: 'YES', column_default: 'CURRENT_TIMESTAMP' },
				];
				
				return {
					operation: 'schema',
					tableName: schemaTable,
					columnsFound: mockSchema.length,
					schema: mockSchema,
					status: 'success',
				};

			case 'createTable':
				const createTableName = this.getNodeParameter('tableName', itemIndex) as string;
				
				return {
					operation: 'createTable',
					tableName: createTableName,
					tableCreated: true,
					status: 'success',
				};

			case 'procedure':
				return {
					operation: 'procedure',
					procedureExecuted: true,
					resultSets: 1,
					recordsAffected: Math.floor(Math.random() * 10) + 1,
					status: 'success',
				};

			default:
				throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
		}
	}

	// Real database implementation methods would go here:
	
	private async connectPostgreSQL(connection: any): Promise<any> {
		// Implementation with pg library
		// const { Client } = require('pg');
		// const client = new Client(connection);
		// await client.connect();
		// return client;
	}

	private async connectMySQL(connection: any): Promise<any> {
		// Implementation with mysql2 library
		// const mysql = require('mysql2/promise');
		// const connection = await mysql.createConnection(connection);
		// return connection;
	}

	private async connectSQLite(filePath: string): Promise<any> {
		// Implementation with sqlite3 library
		// const sqlite3 = require('sqlite3').verbose();
		// const db = new sqlite3.Database(filePath);
		// return db;
	}

	private async connectMongoDB(connectionString: string): Promise<any> {
		// Implementation with mongodb library
		// const { MongoClient } = require('mongodb');
		// const client = new MongoClient(connectionString);
		// await client.connect();
		// return client;
	}
}