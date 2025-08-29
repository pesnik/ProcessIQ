import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { chromium, Page, Browser } from 'playwright';

export class PlaywrightNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Playwright Web Automation',
		name: 'playwright',
		icon: 'file:playwright.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["url"]}}',
		description: 'Automate web interactions using Playwright',
		defaults: {
			name: 'Playwright',
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
						name: 'Navigate to URL',
						value: 'navigate',
						description: 'Navigate to a specific URL',
						action: 'Navigate to a URL',
					},
					{
						name: 'Fill Form Field',
						value: 'fillField',
						description: 'Fill a form field with text',
						action: 'Fill a form field',
					},
					{
						name: 'Click Element',
						value: 'click',
						description: 'Click on a page element',
						action: 'Click an element',
					},
					{
						name: 'Take Screenshot',
						value: 'screenshot',
						description: 'Take a screenshot of the page',
						action: 'Take a screenshot',
					},
					{
						name: 'Extract Text',
						value: 'extractText',
						description: 'Extract text from page elements',
						action: 'Extract text from elements',
					},
				],
				default: 'navigate',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['navigate'],
					},
				},
				default: '',
				placeholder: 'https://example.com',
				description: 'URL to navigate to',
			},
			{
				displayName: 'Selector',
				name: 'selector',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['fillField', 'click', 'extractText'],
					},
				},
				default: '',
				placeholder: 'input[name="email"]',
				description: 'CSS selector for the element',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['fillField'],
					},
				},
				default: '',
				description: 'Text to fill in the field',
			},
			{
				displayName: 'Headless Mode',
				name: 'headless',
				type: 'boolean',
				default: true,
				description: 'Whether to run browser in headless mode',
			},
			{
				displayName: 'Wait for Selector',
				name: 'waitForSelector',
				type: 'boolean',
				default: true,
				description: 'Whether to wait for selector to be available',
			},
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				default: 30000,
				description: 'Maximum time to wait for operations',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		let browser: Browser | undefined;
		let page: Page | undefined;

		try {
			for (let i = 0; i < items.length; i++) {
				const operation = this.getNodeParameter('operation', i) as string;
				const headless = this.getNodeParameter('headless', i) as boolean;
				const timeout = this.getNodeParameter('timeout', i) as number;
				const waitForSelector = this.getNodeParameter('waitForSelector', i) as boolean;

				// Initialize browser if not already done
				if (!browser) {
					browser = await chromium.launch({
						headless,
						args: ['--no-sandbox', '--disable-dev-shm-usage'],
					});
					page = await browser.newPage();
					page.setDefaultTimeout(timeout);
				}

				let result: any = {};

				switch (operation) {
					case 'navigate':
						const url = this.getNodeParameter('url', i) as string;
						if (!url) {
							throw new NodeOperationError(this.getNode(), 'URL is required for navigation');
						}
						
						await page!.goto(url);
						result = {
							operation: 'navigate',
							url,
							title: await page!.title(),
							status: 'success',
						};
						break;

					case 'fillField':
						const fillSelector = this.getNodeParameter('selector', i) as string;
						const text = this.getNodeParameter('text', i) as string;
						
						if (!fillSelector) {
							throw new NodeOperationError(this.getNode(), 'Selector is required for fillField');
						}

						if (waitForSelector) {
							await page!.waitForSelector(fillSelector);
						}
						
						await page!.fill(fillSelector, text);
						result = {
							operation: 'fillField',
							selector: fillSelector,
							text,
							status: 'success',
						};
						break;

					case 'click':
						const clickSelector = this.getNodeParameter('selector', i) as string;
						
						if (!clickSelector) {
							throw new NodeOperationError(this.getNode(), 'Selector is required for click');
						}

						if (waitForSelector) {
							await page!.waitForSelector(clickSelector);
						}
						
						await page!.click(clickSelector);
						result = {
							operation: 'click',
							selector: clickSelector,
							status: 'success',
						};
						break;

					case 'screenshot':
						const screenshot = await page!.screenshot({ 
							type: 'png',
							fullPage: true 
						});
						result = {
							operation: 'screenshot',
							screenshot: screenshot.toString('base64'),
							status: 'success',
						};
						break;

					case 'extractText':
						const extractSelector = this.getNodeParameter('selector', i) as string;
						
						if (!extractSelector) {
							throw new NodeOperationError(this.getNode(), 'Selector is required for extractText');
						}

						if (waitForSelector) {
							await page!.waitForSelector(extractSelector);
						}
						
						const extractedText = await page!.textContent(extractSelector);
						result = {
							operation: 'extractText',
							selector: extractSelector,
							text: extractedText,
							status: 'success',
						};
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				// Add execution metadata
				result.executionTime = new Date().toISOString();
				result.pageUrl = page!.url();

				returnData.push({
					json: result,
				});
			}

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Playwright execution failed: ${error.message}`);
		} finally {
			// Clean up browser
			if (browser) {
				await browser.close();
			}
		}

		return [returnData];
	}
}