import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { Builder, By, WebDriver, until, Key } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as firefox from 'selenium-webdriver/firefox';
import * as fs from 'fs';

export class SeleniumNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Selenium Web Automation',
		name: 'selenium',
		icon: 'file:selenium.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["url"]}}',
		description: 'Advanced web automation using Selenium WebDriver',
		defaults: {
			name: 'Selenium',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Browser',
				name: 'browser',
				type: 'options',
				options: [
					{ name: 'Chrome', value: 'chrome' },
					{ name: 'Firefox', value: 'firefox' },
					{ name: 'Edge', value: 'edge' },
				],
				default: 'chrome',
				description: 'Browser to use for automation',
			},
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
						name: 'Find Element',
						value: 'findElement',
						description: 'Find element on the page',
						action: 'Find an element',
					},
					{
						name: 'Click Element',
						value: 'click',
						description: 'Click on a page element',
						action: 'Click an element',
					},
					{
						name: 'Fill Form Field',
						value: 'fillField',
						description: 'Fill a form field with text',
						action: 'Fill a form field',
					},
					{
						name: 'Extract Text',
						value: 'extractText',
						description: 'Extract text from page elements',
						action: 'Extract text from elements',
					},
					{
						name: 'Extract Data Table',
						value: 'extractTable',
						description: 'Extract data from HTML tables',
						action: 'Extract table data',
					},
					{
						name: 'Take Screenshot',
						value: 'screenshot',
						description: 'Take a screenshot of the page',
						action: 'Take a screenshot',
					},
					{
						name: 'Execute JavaScript',
						value: 'executeJS',
						description: 'Execute custom JavaScript code',
						action: 'Execute JavaScript',
					},
					{
						name: 'Handle Alert',
						value: 'handleAlert',
						description: 'Handle browser alerts/dialogs',
						action: 'Handle browser alert',
					},
					{
						name: 'Scroll Page',
						value: 'scroll',
						description: 'Scroll the page',
						action: 'Scroll the page',
					},
					{
						name: 'Wait for Element',
						value: 'waitElement',
						description: 'Wait for element to appear/disappear',
						action: 'Wait for element',
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
				displayName: 'Selector Type',
				name: 'selectorType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['findElement', 'click', 'fillField', 'extractText', 'waitElement'],
					},
				},
				options: [
					{ name: 'CSS Selector', value: 'css' },
					{ name: 'XPath', value: 'xpath' },
					{ name: 'ID', value: 'id' },
					{ name: 'Name', value: 'name' },
					{ name: 'Class Name', value: 'className' },
					{ name: 'Tag Name', value: 'tagName' },
					{ name: 'Link Text', value: 'linkText' },
					{ name: 'Partial Link Text', value: 'partialLinkText' },
				],
				default: 'css',
				description: 'Type of selector to use',
			},
			{
				displayName: 'Selector',
				name: 'selector',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['findElement', 'click', 'fillField', 'extractText', 'waitElement'],
					},
				},
				default: '',
				placeholder: 'input[name="email"]',
				description: 'Element selector',
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
				displayName: 'JavaScript Code',
				name: 'jsCode',
				type: 'string',
				typeOptions: {
					editor: 'code',
					editorLanguage: 'javascript',
				},
				displayOptions: {
					show: {
						operation: ['executeJS'],
					},
				},
				default: 'return document.title;',
				description: 'JavaScript code to execute',
			},
			{
				displayName: 'Headless Mode',
				name: 'headless',
				type: 'boolean',
				default: true,
				description: 'Whether to run browser in headless mode',
			},
			{
				displayName: 'Window Size',
				name: 'windowSize',
				type: 'string',
				default: '1920,1080',
				placeholder: '1920,1080',
				description: 'Browser window size (width,height)',
			},
			{
				displayName: 'Wait Timeout (ms)',
				name: 'waitTimeout',
				type: 'number',
				default: 10000,
				description: 'Maximum time to wait for elements',
			},
			{
				displayName: 'Page Load Timeout (ms)',
				name: 'pageLoadTimeout',
				type: 'number',
				default: 30000,
				description: 'Maximum time to wait for page loads',
			},
			{
				displayName: 'Implicit Wait (ms)',
				name: 'implicitWait',
				type: 'number',
				default: 5000,
				description: 'Implicit wait time for element finding',
			},
		],
	};

	private driver: WebDriver | null = null;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		try {
			for (let i = 0; i < items.length; i++) {
				const operation = this.getNodeParameter('operation', i) as string;
				const browser = this.getNodeParameter('browser', i) as string;
				const headless = this.getNodeParameter('headless', i) as boolean;
				const windowSize = this.getNodeParameter('windowSize', i) as string;
				const waitTimeout = this.getNodeParameter('waitTimeout', i) as number;
				const pageLoadTimeout = this.getNodeParameter('pageLoadTimeout', i) as number;
				const implicitWait = this.getNodeParameter('implicitWait', i) as number;

				// Initialize driver if not already done
				if (!this.driver) {
					this.driver = await this.initializeDriver(browser, headless, windowSize);
					await this.driver.manage().setTimeouts({
						pageLoad: pageLoadTimeout,
						implicit: implicitWait,
					});
				}

				let result: any = {};

				switch (operation) {
					case 'navigate':
						result = await this.navigateToUrl(i);
						break;

					case 'findElement':
						result = await this.findElement(i);
						break;

					case 'click':
						result = await this.clickElement(i);
						break;

					case 'fillField':
						result = await this.fillField(i);
						break;

					case 'extractText':
						result = await this.extractText(i);
						break;

					case 'extractTable':
						result = await this.extractTable(i);
						break;

					case 'screenshot':
						result = await this.takeScreenshot(i);
						break;

					case 'executeJS':
						result = await this.executeJavaScript(i);
						break;

					case 'handleAlert':
						result = await this.handleAlert(i);
						break;

					case 'scroll':
						result = await this.scrollPage(i);
						break;

					case 'waitElement':
						result = await this.waitForElement(i);
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
				}

				// Add execution metadata
				result.executionTime = new Date().toISOString();
				result.currentUrl = await this.driver.getCurrentUrl();

				returnData.push({
					json: result,
				});
			}

		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Selenium execution failed: ${error.message}`);
		} finally {
			// Clean up driver
			if (this.driver) {
				await this.driver.quit();
				this.driver = null;
			}
		}

		return [returnData];
	}

	private async initializeDriver(browser: string, headless: boolean, windowSize: string): Promise<WebDriver> {
		const [width, height] = windowSize.split(',').map(Number);

		let driver: WebDriver;

		switch (browser) {
			case 'chrome':
				const chromeOptions = new chrome.Options();
				if (headless) {
					chromeOptions.addArguments('--headless');
				}
				chromeOptions.addArguments('--no-sandbox');
				chromeOptions.addArguments('--disable-dev-shm-usage');
				chromeOptions.addArguments(`--window-size=${width},${height}`);
				
				driver = await new Builder()
					.forBrowser('chrome')
					.setChromeOptions(chromeOptions)
					.build();
				break;

			case 'firefox':
				const firefoxOptions = new firefox.Options();
				if (headless) {
					firefoxOptions.addArguments('--headless');
				}
				firefoxOptions.addArguments(`--width=${width}`);
				firefoxOptions.addArguments(`--height=${height}`);
				
				driver = await new Builder()
					.forBrowser('firefox')
					.setFirefoxOptions(firefoxOptions)
					.build();
				break;

			default:
				throw new NodeOperationError(this.getNode(), `Unsupported browser: ${browser}`);
		}

		return driver;
	}

	private getElementLocator(selectorType: string, selector: string): By {
		switch (selectorType) {
			case 'css': return By.css(selector);
			case 'xpath': return By.xpath(selector);
			case 'id': return By.id(selector);
			case 'name': return By.name(selector);
			case 'className': return By.className(selector);
			case 'tagName': return By.tagName(selector);
			case 'linkText': return By.linkText(selector);
			case 'partialLinkText': return By.partialLinkText(selector);
			default:
				throw new NodeOperationError(this.getNode(), `Unknown selector type: ${selectorType}`);
		}
	}

	private async navigateToUrl(itemIndex: number): Promise<any> {
		const url = this.getNodeParameter('url', itemIndex) as string;

		if (!url) {
			throw new NodeOperationError(this.getNode(), 'URL is required');
		}

		await this.driver!.get(url);
		const title = await this.driver!.getTitle();

		return {
			operation: 'navigate',
			url,
			title,
			status: 'success',
		};
	}

	private async findElement(itemIndex: number): Promise<any> {
		const selectorType = this.getNodeParameter('selectorType', itemIndex) as string;
		const selector = this.getNodeParameter('selector', itemIndex) as string;

		const locator = this.getElementLocator(selectorType, selector);
		const element = await this.driver!.findElement(locator);
		
		const tagName = await element.getTagName();
		const text = await element.getText();
		const isDisplayed = await element.isDisplayed();
		const isEnabled = await element.isEnabled();

		return {
			operation: 'findElement',
			selectorType,
			selector,
			elementFound: true,
			tagName,
			text,
			isDisplayed,
			isEnabled,
			status: 'success',
		};
	}

	private async clickElement(itemIndex: number): Promise<any> {
		const selectorType = this.getNodeParameter('selectorType', itemIndex) as string;
		const selector = this.getNodeParameter('selector', itemIndex) as string;
		const waitTimeout = this.getNodeParameter('waitTimeout', itemIndex) as number;

		const locator = this.getElementLocator(selectorType, selector);
		const element = await this.driver!.wait(until.elementLocated(locator), waitTimeout);
		await this.driver!.wait(until.elementIsVisible(element), waitTimeout);
		await element.click();

		return {
			operation: 'click',
			selectorType,
			selector,
			status: 'success',
		};
	}

	private async fillField(itemIndex: number): Promise<any> {
		const selectorType = this.getNodeParameter('selectorType', itemIndex) as string;
		const selector = this.getNodeParameter('selector', itemIndex) as string;
		const text = this.getNodeParameter('text', itemIndex) as string;
		const waitTimeout = this.getNodeParameter('waitTimeout', itemIndex) as number;

		const locator = this.getElementLocator(selectorType, selector);
		const element = await this.driver!.wait(until.elementLocated(locator), waitTimeout);
		
		await element.clear();
		await element.sendKeys(text);

		return {
			operation: 'fillField',
			selectorType,
			selector,
			text,
			status: 'success',
		};
	}

	private async extractText(itemIndex: number): Promise<any> {
		const selectorType = this.getNodeParameter('selectorType', itemIndex) as string;
		const selector = this.getNodeParameter('selector', itemIndex) as string;

		const locator = this.getElementLocator(selectorType, selector);
		const elements = await this.driver!.findElements(locator);
		
		const extractedData = [];
		for (const element of elements) {
			const text = await element.getText();
			const tagName = await element.getTagName();
			extractedData.push({ text, tagName });
		}

		return {
			operation: 'extractText',
			selectorType,
			selector,
			elementsFound: elements.length,
			data: extractedData,
			status: 'success',
		};
	}

	private async extractTable(itemIndex: number): Promise<any> {
		// Extract data from HTML tables
		const tableData = await this.driver!.executeScript(`
			const tables = document.querySelectorAll('table');
			const result = [];
			
			tables.forEach((table, tableIndex) => {
				const rows = table.querySelectorAll('tr');
				const tableResult = {
					tableIndex,
					headers: [],
					rows: []
				};
				
				// Extract headers
				const headerCells = table.querySelectorAll('th');
				headerCells.forEach(cell => {
					tableResult.headers.push(cell.textContent.trim());
				});
				
				// Extract rows
				rows.forEach((row, rowIndex) => {
					const cells = row.querySelectorAll('td');
					if (cells.length > 0) {
						const rowData = [];
						cells.forEach(cell => {
							rowData.push(cell.textContent.trim());
						});
						tableResult.rows.push(rowData);
					}
				});
				
				result.push(tableResult);
			});
			
			return result;
		`);

		return {
			operation: 'extractTable',
			tablesFound: (tableData as any[]).length,
			data: tableData,
			status: 'success',
		};
	}

	private async takeScreenshot(itemIndex: number): Promise<any> {
		const screenshot = await this.driver!.takeScreenshot();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `/tmp/selenium-screenshot-${timestamp}.png`;
		
		fs.writeFileSync(filename, screenshot, 'base64');

		return {
			operation: 'screenshot',
			screenshotPath: filename,
			screenshotBase64: screenshot,
			status: 'success',
		};
	}

	private async executeJavaScript(itemIndex: number): Promise<any> {
		const jsCode = this.getNodeParameter('jsCode', itemIndex) as string;

		const result = await this.driver!.executeScript(jsCode);

		return {
			operation: 'executeJS',
			jsCode,
			result,
			status: 'success',
		};
	}

	private async handleAlert(itemIndex: number): Promise<any> {
		try {
			const alert = await this.driver!.switchTo().alert();
			const alertText = await alert.getText();
			await alert.accept();

			return {
				operation: 'handleAlert',
				alertText,
				action: 'accepted',
				status: 'success',
			};
		} catch (error) {
			return {
				operation: 'handleAlert',
				alertPresent: false,
				status: 'no_alert',
			};
		}
	}

	private async scrollPage(itemIndex: number): Promise<any> {
		await this.driver!.executeScript('window.scrollTo(0, document.body.scrollHeight);');

		return {
			operation: 'scroll',
			scrollType: 'bottom',
			status: 'success',
		};
	}

	private async waitForElement(itemIndex: number): Promise<any> {
		const selectorType = this.getNodeParameter('selectorType', itemIndex) as string;
		const selector = this.getNodeParameter('selector', itemIndex) as string;
		const waitTimeout = this.getNodeParameter('waitTimeout', itemIndex) as number;

		const locator = this.getElementLocator(selectorType, selector);
		const startTime = Date.now();
		
		try {
			const element = await this.driver!.wait(until.elementLocated(locator), waitTimeout);
			const waitTime = Date.now() - startTime;

			return {
				operation: 'waitElement',
				selectorType,
				selector,
				elementFound: true,
				waitTime,
				status: 'success',
			};
		} catch (error) {
			const waitTime = Date.now() - startTime;
			
			return {
				operation: 'waitElement',
				selectorType,
				selector,
				elementFound: false,
				waitTime,
				status: 'timeout',
			};
		}
	}
}