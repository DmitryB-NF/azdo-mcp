---
epic: 4
story: 4.1
title: get_sprint_goal author tool (extension-data ingestion)
status: Done
---

# Story 4.1 — `get_sprint_goal` author tool

**Source:** `specs/planning/epics.md` § Epic 4 § Story 4.1.
**Research:** [`specs/planning/research/sprint-goal-extension-data-api-2026-04-24.md`](../planning/research/sprint-goal-extension-data-api-2026-04-24.md).
**Consumed by:** `/azdo-sprint-report` skill (Story 4.2).

## Goal

Ship a small author-owned MCP tool — `get_sprint_goal({ project, team, iterationId })` — that reads the current sprint goal (goal title, detailed breakdown, achievement status) from the `keesschollaart/sprint-goal` marketplace extension's Extension Data store. The primitive exists so Story 4.2's `/azdo-sprint-report` skill can ground its narrative in real team-authored goals instead of asking the user at every invocation.

## Design

Everything load-bearing is captured in the research doc. Implementation-only details live here.

### Tool signature

```ts
get_sprint_goal({
  team: string,         // team GUID (validated by zod regex at the tool boundary)
  iterationId: string   // iteration GUID (validated by zod regex at the tool boundary)
})
→ {
    goal: string,
    details: string,         // HTML
    detailsPlain: string,    // plain text with \r\n line breaks
    goalAchieved: boolean,
    sprintGoalInTabLabel?: boolean
  }
| null                        // document does not exist (no goal set, or extension absent)
```

Both `team` and `iterationId` are validated against a canonical GUID regex by the zod input schema before the handler runs. Non-GUID input (names, partial IDs, strings with path separators) is rejected at the boundary — no name-to-GUID resolution, no chance of URL-path injection via crafted inputs. The caller (a skill or agent) is expected to pass GUIDs extracted from iteration metadata (e.g., from `list_recent_iterations[].url`).

### Call sequence inside the handler

1. **Construct the document ID** per the extension's key convention (source: `script/helpers.ts` in `keesschollaart81/vsts-sprint-goal`): `` `sprintConfig.${iterationId.slice(0, 15)}${team.slice(0, 15)}` `` — first 15 characters of each GUID, concatenated without a separator. A short inline comment in the source points at this origin.
2. **Read the extmgmt base URL from `config.extmgmtOrgUrl`.** Config layer composes it as `` `https://extmgmt.dev.azure.com/${org}` `` inline in `src/config.ts`, using the required `AZDO_ORG` env. The host is public and stable (Microsoft-owned cloud Services subdomain), so it lives as a string literal in the config object rather than a named constant or env. No URL manipulation, no regex, no derivation from `config.orgUrl`.
3. **Issue `getClient().rest.get<{ value: SprintGoal }>(url)`.** `typed-rest-client`'s `RestClient.get` returns `{ statusCode, result }`; per the SDK contract, `result === null` on 404 — which is the designed soft-failure path (no goal, malformed key, extension absent). Other errors (401 from missing `vso.extension.data` scope, 5xx upstream failures, network timeouts) reject the promise and surface as `isError: true` via the standard `try/catch`. No regex-based error classification.
4. **Map `result.value` to the MCP response.** Serialise via `JSON.stringify(value ?? null, null, 2)`. When `value` is absent, the literal string `"null"` goes in the text block so the skill gets an unambiguous parseable signal.

### What the handler does **not** do

- **No HTML → Markdown conversion.** `details` comes back as HTML; LLM consumers handle formatting when needed. The tool ships raw structured data.
- **No caching.** One REST call per invocation. The caller (a skill) typically needs at most two calls per turn (previous + current iteration). No cache means no invalidation logic and no stale-read surprises.
- **No write path.** Reading only. Writes would require `vso.extension.data_write` scope and mutation-confirmation mechanics, neither of which is in scope for the sprint-report use case.
- **No extension-availability probe.** If the extension is not installed, the Documents endpoint returns the same 404 that "goal not set" produces; both map to `null`. Differentiating the two adds code for a distinction the skill doesn't need to act on differently.

### Why the tool lives in `src/tools/iterations.ts`

Two reasons:

1. **Iteration-scoped semantics.** `get_sprint_goal` is strictly a per-iteration read, siblings to `list_recent_iterations` and the MS `work_list_team_iterations`. Keeping iteration-scoped primitives in one file makes the mental map smaller.
2. **Reuses `registerIterationTools` export.** Story 2.3 already wired `registerIterationTools(server)` in `src/index.ts`. Adding a new `server.registerTool(...)` inside the same function avoids a fresh registration call at the index level — matches the pattern used for `configureWorkTools` bulk-wire.

A standalone `src/tools/extensions.ts` module was considered and rejected: the tool is a one-off, extension-data is not a planned sprawling domain, and premature extraction would be noise.

### Operational requirements

Two preconditions for the tool to return a non-null response:

- **Extension `keesschollaart/sprint-goal` installed** in the org. Free, single-org install, no admin-scope requirements beyond the standard marketplace install.
- **PAT scope `vso.extension.data` (Extension Data → Read)** added alongside `vso.work`. Empirically required — a PAT with only `vso.extension` produces HTTP 401 on the Documents endpoint; adding `vso.extension.data` upgrades to HTTP 200.

Both preconditions are documented in `.env.example` and in the skill's preconditions section (Story 4.2).

When either precondition fails, the tool gracefully returns `null` rather than hard-erroring — consistent with the skill's fallback-to-ask path.

## Acceptance Criteria — Verification Plan

| AC | Verification |
|---|---|
| `src/tools/iterations.ts` registers `get_sprint_goal` tool | Read file; inspector handshake lists the tool |
| Schema: `{ project: string (required), team: string (required), iterationId: string (required) }` | Inspector schema view |
| Call with a real project/team name + valid iteration GUID → returns `{ goal, details, detailsPlain, goalAchieved, ... }` | Live call against the configured project/team's current iteration |
| Call with team passed as GUID (not name) → same result, no CoreApi.getTeam call | Live call with resolved team GUID; verify only one HTTP request is made |
| Call with an iteration that has no goal set → returns `null` | Live call against an iteration known to have no sprint-goal entry |
| Call with the extension uninstalled or an invalid pub/ext in the URL → returns `null` | Live call against a team without the extension |
| PAT scope too narrow (no `vso.extension.data`) → returns `null` (not `isError`) | Live call with a PAT that has only `vso.work` + `vso.extension` |
| Other REST errors (500, 401 on upstream, network timeout) → `isError: true` with raw error text | Mock or trigger by hitting a non-existent org |
| Tool works for org URLs with or without trailing slash | Two config variants |
| Tool does not rely on `process.env` reads outside `src/config.ts` | Code review — grep for `process.env` in new code |

## File List

**Will create:**

- `specs/dev/story-4.1-sprint-goal-tool.md` (this file)

**Will modify:**

- `src/tools/iterations.ts` — add `get_sprint_goal` registration with inline handler. No helper for team resolution — caller passes GUIDs, names return `null`.
- `src/config.ts` — split the former `orgUrl` field into `api`, `extmgmtApi`, `extmgmtApiVersion`, and `org` exposed separately. `AZDO_ORG_URL` env is replaced by `AZDO_ORG` (just the slug); the rest of the URL shape lives as string literals in `config.ts` since these are public, stable AzDO Services constants. Breaking change for local `.env` files — migration: `AZDO_ORG_URL=https://dev.azure.com/<slug>` → `AZDO_ORG=<slug>`.
- `src/client.ts` — compose `WebApi(...)` URL inline as `` `${config.api}/${config.org}` ``.
- `src/tools/azdo-context.ts` — compose the `orgUrl` response field inline from `config.api + config.org` (tool's external shape unchanged).
- `.env.example` — drop `AZDO_ORG_URL`, add `AZDO_ORG`.
- `specs/planning/epics.md` — refine Story 4.1 AC to match the final tool contract (no `project` param, no team-name resolution, clarified error/null mapping). The AC was committed in the preceding `docs(Epic 4)` commit based on the initial resolver design; this commit finalises it against the shipped code.

**Will NOT modify:**

- `.claude/skills/azdo-sprint-report/SKILL.md` — the skill's consumption of `get_sprint_goal` is a Story 4.2 change.
- `.claude/rules/` — no rule changes.
- Any other `src/tools/*.ts` or MS bulk-wire configurations.

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Date:** 2026-04-24
- **Notes:**
  - This story emerged mid-implementation of Epic 4. Original plan had Epic 4 ship as one story (the narrative skill); the user asked whether goals could be pulled from AzDO natively; research led through three dead ends (public REST, SDK, MS MCP) to the `keesschollaart/sprint-goal` extension's Extension Data store, verified live against the configured project/team. Full findings in `specs/planning/research/sprint-goal-extension-data-api-2026-04-24.md`.
  - The narrative-skill draft that had been labelled Story 4.1 was renumbered to Story 4.2 to reflect the dependency: the primitive ships first, the consumer follows.
  - Team-GUID resolution is branchy on the input (name vs GUID). Kept as one inline helper rather than a shared utility — no other current or foreseeable tool needs the same resolution pattern.
