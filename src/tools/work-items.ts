import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { configureWorkItemTools } from '@azure-devops/mcp/dist/tools/work-items';
import type { WebApi } from 'azure-devops-node-api';
import { getClient } from '../client';
import config from '../config';
import pkg from '../../package.json' with { type: 'json' };


export function registerWorkItemTools(server: McpServer): void {
  configureWorkItemTools(server, tokenProvider, clientProvider, userAgentProvider);
}

async function tokenProvider(): Promise<string> {
  return config.pat;
}

async function clientProvider(): Promise<WebApi> {
  return getClient();
}

function userAgentProvider(): string {
  return `${pkg.name}/${pkg.version}`;
}
