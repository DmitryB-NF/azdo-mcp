import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { configureWorkTools } from '@azure-devops/mcp/dist/tools/work';
import { getClient } from '../client';
import { tokenProvider, clientProvider, userAgentProvider } from '../ms-providers';


export function registerIterationTools(server: McpServer): void {
  server.registerTool(
    'list_recent_iterations',
    {
      description:
        'Return the N most recent iterations for a project/team, sorted by start date descending. Defaults to 2 (current + previous) — the base scenario for sprint reports. For just the currently active iteration, use work_list_team_iterations with timeframe: "current".',
      inputSchema: {
        project: z.string(),
        team: z.string(),
        limit: z.number().int().positive().default(2),
      },
    },
    async ({ project, team, limit }) => {
      try {
        const work = await getClient().getWorkApi();
        const iterations = await work.getTeamIterations({ project, team });
        const recent = iterations
          .filter((it) => it.attributes?.startDate)
          .sort((a, b) => b.attributes!.startDate!.getTime() - a.attributes!.startDate!.getTime())
          .slice(0, limit);
        return { content: [{ type: 'text', text: JSON.stringify(recent, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    },
  );

  configureWorkTools(server, tokenProvider, clientProvider, userAgentProvider);
}
