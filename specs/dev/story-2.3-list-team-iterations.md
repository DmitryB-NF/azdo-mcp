---
epic: 2
story: 2.3
title: Iteration Tooling (MS bulk-wire + list_recent_iterations)
status: Done
---

# Story 2.3 — Iteration Tooling (MS bulk-wire + `list_recent_iterations`)

**Source:** `specs/planning/epics.md` § Epic 2 § Story 2.3

## Goal

Cover the two iteration-shaped skill scenarios with the minimum amount of author-owned code:

1. **Resolve the current iteration ID** (so a skill can chain into `list_work_items`) → delegated entirely to MS's built-in `work_list_team_iterations` tool with `timeframe: 'current'` passed explicitly. No author-owned wrapper.
2. **Pull the last N iterations for a sprint-report** → new author-owned tool `list_recent_iterations({ project, team, limit? })`. Fetches the team's iteration subscription, filters out entries with no `startDate`, sorts descending by `startDate`, slices `[0, limit)` (default 2).

Paired bonus: bulk-wire MS's `configureWorkTools` so every iteration/capacity primitive MS ships (`work_list_team_iterations`, `work_list_iterations`, `work_create_iterations`, `work_assign_iterations`, `work_get_team_capacity`, `work_update_team_capacity`, `work_get_iteration_capacities`, `work_get_team_settings`) is available to skills without re-implementation.

## Design decisions

1. **`project` and `team` are required, not optional.** Skills hardcode these as constants in their prompts (same approach that makes MS's bulk-wired tools usable without triggering `elicitProject`/`elicitTeam`). Making them `.optional()` and reading `config.defaultProject`/`defaultTeam` on the server would cover a scenario nobody will reach — skills already know their own project/team. The env-default path was theatre; zod's "required field missing" error is the right signal here.
2. **Why not also wrap `get_current_iteration`.** Considered; dropped. MS's `work_list_team_iterations` with `timeframe: 'current'` already does exactly that. The only ergonomic gap left (dodging elicitation) vanishes as soon as skills pass `project`/`team` explicitly — which they do.
3. **Why wrap `list_recent_iterations` instead of delegating to skill-side logic.** MS has no "top-N by date" primitive. Offloading the sort/slice to the skill means Claude JSON-parses the full iteration list, sorts in-prompt, and picks N — every invocation, non-deterministically, at token cost. For a recurring sprint-report scenario, a handful of lines of server-side `.sort().slice()` are cheaper, deterministic, and cache-friendly. This is pre-processing, not ergonomics — belongs in the MCP server.
4. **REST-dictated shape.** `getTeamIterations` offers exactly one server filter: `$timeframe=current` (per [WorkApi.d.ts:338](../../node_modules/azure-devops-node-api/WorkApi.d.ts) — "Only Current is supported currently"). No date anchor, no `$top`/`$skip`, no sort options. "Last N by start date" necessarily means fetching the team's full subscription and slicing client-side. Bounded naturally: these are iterations explicitly `postTeamIteration`'d onto the team, not the project-wide classification tree — typically dozens, not hundreds.
5. **Sort key: `attributes.startDate`.** Iterations without a start date are filtered out of the sort pool — they can't be ordered sensibly and historically represent placeholder entries (Parking Lot, Backlog pseudo-iterations).
6. **No pure-op extraction; handler is the whole implementation.** Two lines of REST call plus a `.filter().sort().slice()` chain, single call-site — extracting a `fetchTeamIterations` helper would just be indirection theatre. Promote to a named function when a second caller exists.
7. **Provider helpers duplicated in `iterations.ts`.** Same three one-liners as `work-items.ts`. Extracting to a shared module now would touch `work-items.ts`, which is currently held by the parallel Story 2.1 agent. Duplication flagged as deferred consolidation if a third consumer appears.

## Plan

1. **New module `src/tools/iterations.ts`.** Exports `registerIterationTools(server)`.
2. **MS bulk wiring.** `configureWorkTools(server, tokenProvider, clientProvider, userAgentProvider)` — same three-provider shape as Story 2.1.
3. **Tool `list_recent_iterations`.** Schema: `{ project: string, team: string, limit?: number (positive int, default 2) }`. Handler inline: `getClient().getWorkApi()` → `getTeamIterations({ project, team })` → filter by `startDate` presence → sort desc by `startDate` → `slice(0, limit)`.
4. **Error shape.** `try/catch` in handler → `{ content: [{ type: 'text', text: 'Error: <msg>' }], isError: true }` on throw.
5. **Response shape.** `JSON.stringify(recent, null, 2)` in a single `text` content block.
6. **Types extension.** Add ambient declaration for `@azure-devops/mcp/dist/tools/work` to `types/azure-devops-mcp.d.ts`, sibling to the existing `work-items` declaration.
7. **Index wiring deferred.** `registerIterationTools(server)` call in `src/index.ts` is added last, after the parallel Story 2.1 agent releases its hold.

## Acceptance Criteria — Verification Plan

| AC | Verification |
|---|---|
| `src/tools/iterations.ts` exports `registerIterationTools(server)` | Read file top-level exports |
| `tools/list` includes `list_recent_iterations` with schema `{ project (required string), team (required string), limit (optional positive int, default 2) }` | Inspector handshake |
| Call without `project` or without `team` → zod validation error surfaced to the caller | Inspector call with `{}` |
| `list_recent_iterations` with no `limit` → returns up to 2 most recent iterations sorted by `startDate` descending | Inspect response against team with ≥3 iterations |
| `list_recent_iterations` with `limit: 5` → returns up to 5 most recent iterations sorted by `startDate` descending | Inspect response length and ordering |
| Each returned iteration exposes `id`, `name`, `path`, and `attributes.startDate`/`finishDate` | Inspect any element |
| Iterations without `attributes.startDate` are excluded from the sorted result | Inspect response against a team with a known placeholder iteration |
| AzDO REST error → `isError: true`, text prefixed `Error:` | Call against a non-existent project/team pair |
| MS iteration/capacity tools (`work_list_team_iterations`, `work_list_iterations`, `work_create_iterations`, `work_assign_iterations`, `work_get_team_capacity`, `work_update_team_capacity`, `work_get_iteration_capacities`, `work_get_team_settings`) also appear in `tools/list` | Inspector handshake |
| Current-iteration scenario covered by calling `work_list_team_iterations` with `timeframe: 'current'` (skill-side responsibility, not a new tool) | Inspector handshake confirms `work_list_team_iterations` is listed |

## File List

**Will create:**
- `specs/dev/story-2.3-list-team-iterations.md` (this file)
- `src/tools/iterations.ts` — `registerIterationTools` + MS `configureWorkTools` wiring + inline `list_recent_iterations` handler + private provider helpers

**Will modify:**
- `types/azure-devops-mcp.d.ts` — add ambient declaration for `@azure-devops/mcp/dist/tools/work` (sibling of the existing `work-items` declaration)

**Will modify (deferred — last step, after parallel Story 2.1 agent finishes):**
- `src/index.ts` — add `registerIterationTools(server)` call after the existing `registerWorkItemTools(server)` line

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Started:** 2026-04-22
- **Design pivot 1 (2026-04-22):** Original plan had a single `list_team_iterations` tool with a `timeframe: 'current' | 'past' | 'future'` enum. After verifying the REST API only supports `$timeframe=current` server-side (SDK docstring confirms), pivoted to two tools: `get_current_iteration` + `list_recent_iterations`.
- **Design pivot 2 (2026-04-22):** Dropped `get_current_iteration` — its only value over MS's `work_list_team_iterations({ timeframe: 'current' })` was env-default substitution, which is cheaper to cover in skill prompts. Kept `list_recent_iterations` because MS has no top-N primitive.
- **Design pivot 3 (2026-04-22):** Removed env-default substitution entirely. `project`/`team` are now required fields (no `.optional()`, no `config.defaultProject`/`defaultTeam` lookup, no `resolveDefaults` helper). Skills pass them explicitly as prompt constants — the env-default path was dead code. Also inlined the two-line `fetchTeamIterations` pure op into the handler — single call-site, extracting was indirection without payoff.
- **Note:** Parallel Story 2.1 agent is holding `src/tools/work-items.ts` and `src/index.ts`. New files created first; index wiring deferred to avoid merge conflict.

### Review Findings

- [x] [Review][Patch] Flip story frontmatter `status: In Progress` → `status: Done` before commit [`specs/dev/story-2.3-list-team-iterations.md:4`] — applied.
- [x] [Review][Defer] Invalid-`Date` values from upstream produce non-deterministic sort order [`src/tools/iterations.ts:27`] — deferred, see `deferred-work.md` § Story 2.3.
- [x] [Review][Defer] No upper bound on `limit` parameter [`src/tools/iterations.ts:17`] — deferred, see `deferred-work.md` § Story 2.3.
- [x] [Review][Defer] No tiebreaker for iterations with identical `startDate` [`src/tools/iterations.ts:27`] — deferred, see `deferred-work.md` § Story 2.3.

Dismissed (12): Blind#1 (SDK `formatResponse` does convert ISO to `Date` — false positive); `.filter`/`!` type-narrowing style (TS quirk, safe); raw SDK stringify (desired MCP text-block behavior); `configureWorkTools` throw-at-registration (startup-only, no hot-reload per project memory); hand-rolled ambient decl drift (pre-existing pattern from Story 2.1); empty-array result (by design); `getClient` concurrency (singleton confirmed in `client.ts`); timezone drift (no behavior break); null/undefined from `getTeamIterations` (already caught); MS-before-wrapper order (informational); review-gate procedural reminder (handled by workflow); `node_modules/` in `git status` (unrelated).
