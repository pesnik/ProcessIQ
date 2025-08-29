import { PlaywrightNode } from './nodes/PlaywrightNode/PlaywrightNode.node';
import { ProcessIQApi } from './credentials/ProcessIQApi.credentials';

export {
	PlaywrightNode,
	ProcessIQApi,
};

// Export for n8n node discovery
export const nodes = [
	PlaywrightNode,
];

export const credentials = [
	ProcessIQApi,
];