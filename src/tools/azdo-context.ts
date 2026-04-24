import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import config from '../config';


export function registerAzdoContextTools(server: McpServer): void {
  server.registerTool(
    'get_azdo_context',
    {
      description:
        "Return the per-session Azure DevOps coordinates a skill needs to scope calls, build work-item URLs, and attribute work to the current user: the configured organization URL (always present), the default project and team (each null if unset), and — when `AZDO_USER_EMAIL` is set in the environment — the PAT owner's identity under `user.email` (null otherwise). Call this once per turn when a query needs a project scope, a URL for rendering (`${orgUrl}/${project}/_workitems/edit/${id}`), or a default assignee.",
      inputSchema: {},
    },
    async () => {
      const payload = {
        project: config.defaultProject ?? null,
        team: config.defaultTeam ?? null,
        orgUrl: `${config.api}/${config.org}`,
        user: { email: config.userEmail ?? null },
      };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    },
  );
}
