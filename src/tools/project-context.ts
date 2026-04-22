import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import config from '../config';


export function registerProjectContextTools(server: McpServer): void {
  server.registerTool(
    'get_project_context',
    {
      description:
        'Return the default Azure DevOps project (and team, if configured) to use when the user has not named one explicitly. Call this when a query needs a project scope — WIQL against team-relative macros like @CurrentIteration, iteration paths, project-scoped batch fetches. Skip for plain ID fetches or absolute cross-project queries.',
      inputSchema: {},
    },
    async () => {
      const payload = { project: config.defaultProject ?? null, team: config.defaultTeam ?? null };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    },
  );
}
