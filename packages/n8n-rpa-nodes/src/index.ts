import { PlaywrightNode } from './nodes/PlaywrightNode/PlaywrightNode.node';
import { ExcelNode } from './nodes/ExcelNode/ExcelNode.node';
import { SeleniumNode } from './nodes/SeleniumNode/SeleniumNode.node';
import { DatabaseNode } from './nodes/DatabaseNode/DatabaseNode.node';
import { PythonBridgeNode } from './nodes/PythonBridgeNode/PythonBridgeNode.node';
import { ProcessIQApi } from './credentials/ProcessIQApi.credentials';

export {
	PlaywrightNode,
	ExcelNode,
	SeleniumNode,
	DatabaseNode,
	PythonBridgeNode,
	ProcessIQApi,
};

// Export for n8n node discovery
export const nodes = [
	PlaywrightNode,
	ExcelNode,
	SeleniumNode,
	DatabaseNode,
	PythonBridgeNode,
];

export const credentials = [
	ProcessIQApi,
];