import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { configureWorkItemTools } from '@azure-devops/mcp/dist/tools/work-items';
import { tokenProvider, clientProvider, userAgentProvider } from '../ms-providers';


export function registerWorkItemTools(server: McpServer): void {
  configureWorkItemTools(server, tokenProvider, clientProvider, userAgentProvider);
}
