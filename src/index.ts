import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { registerWorkItemTools } from './tools/work-items';
import pkg from '../package.json' with { type: 'json' };


const server = new McpServer({ name: pkg.name, version: pkg.version });
registerWorkItemTools(server);
await server.connect(new StdioServerTransport());
