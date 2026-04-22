declare module '@azure-devops/mcp/dist/tools/work-items' {
  import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
  import type { WebApi } from 'azure-devops-node-api';

  export function configureWorkItemTools(
    server: McpServer,
    tokenProvider: () => Promise<string>,
    connectionProvider: () => Promise<WebApi>,
    userAgentProvider: () => string,
  ): void;
}
