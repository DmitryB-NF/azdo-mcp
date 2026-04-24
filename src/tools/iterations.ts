import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { configureWorkTools } from '@azure-devops/mcp/dist/tools/work';
import { getClient } from '../client';
import config from '../config';
import { clientProvider, tokenProvider, userAgentProvider } from '../ms-providers';


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

  server.registerTool(
    'get_sprint_goal',
    {
      description:
        'Return the sprint goal for a given iteration as authored via the keesschollaart/sprint-goal marketplace extension. Response includes the short goal title, rich HTML details, plain-text details, and the post-sprint goalAchieved boolean. Both `team` and `iterationId` must be GUIDs — the zod schema rejects non-GUID input at the boundary, and the extension keys its documents on first-15-char GUID prefixes. Returns "null" (as JSON) when the document does not exist for the given iteration/team (no goal set, or extension not installed). Other failures (PAT lacks vso.extension.data, network errors, upstream 5xx) surface as isError so the caller sees them. Requires the extension installed in the org and a PAT with vso.extension.data (Extension Data → Read) on top of vso.work.',
      inputSchema: {
        team: z
          .string()
          .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'must be a GUID'),
        iterationId: z
          .string()
          .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'must be a GUID'),
      },
    },
    async ({ team, iterationId }) => {
      try {
        // Document key convention from keesschollaart/vsts-sprint-goal (script/helpers.ts):
        // "sprintConfig." + first 15 chars of iteration GUID + first 15 chars of team GUID, no separator.
        const docId = `sprintConfig.${iterationId.slice(0, 15)}${team.slice(0, 15)}`;
        const url =
          `${config.extmgmtApi}/${config.org}/_apis/ExtensionManagement/InstalledExtensions/` +
          `keesschollaart/sprint-goal/Data/Scopes/Default/Current/Collections/%24settings/Documents/${docId}` +
          `?api-version=${config.extmgmtApiVersion}`;

        const res = await getClient().rest.get<{ value: unknown }>(url);
        return { content: [{ type: 'text', text: JSON.stringify(res.result?.value ?? null, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    },
  );

  configureWorkTools(server, tokenProvider, clientProvider, userAgentProvider);
}
