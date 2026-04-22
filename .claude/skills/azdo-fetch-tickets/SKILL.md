---
name: azdo-fetch-tickets
description: Fetch one or many Azure DevOps work items — by ID(s), by iteration, or by any compound criteria (state, priority, assignee, sprint, tags, text search) — and render as readable Markdown. Use when the user asks to "show", "fetch", "pull", or "list" tickets / work items / sprint items from Azure DevOps.
---

# /azdo-fetch-tickets

Resolve the user's request to a set of work-item IDs, then fetch full fields in one batch call and render.

## Preconditions

All tools below are registered on the `azdo` MCP server. Invoke them with the `mcp__azdo__` prefix — `wit_get_work_items_batch_by_ids` becomes `mcp__azdo__wit_get_work_items_batch_by_ids`, `get_project_context` becomes `mcp__azdo__get_project_context`. The bare names in this document are the tool IDs on the server.

If the `mcp__azdo__*` tools are not in your available tool list, the server is not connected. **Follow `.claude/rules/azdo-mcp-connection.md`** — it pins the naming contract and the no-REST-fallback policy. Report the disconnected state to the user and stop; do not invent alternatives.

## Invariants the AzDO API forces

Two rules are not yours to bend — everything else is:

1. `wit_query_by_wiql` and iteration endpoints return **ID references only**. No field values. Always finish with `wit_get_work_items_batch_by_ids` when you need fields for rendering.
2. For **plain numeric IDs from the user, skip WIQL entirely** — go straight to the batch endpoint. Wrapping a known ID list in `[System.Id] IN (1, 2, 3)` is pure overhead; don't do it.

## Project context

Most calls need `project`. Team-relative WIQL (`@CurrentIteration`, some iteration paths) also needs `team`.

- If the user named a project and/or team in this turn, use their values verbatim.
- If coordinates aren't needed for the call you're about to make, skip the lookup.
- Otherwise call `get_project_context` **once** and cache `{ project, team }` for the rest of the request.
- If a required field comes back `null`, ask the user for just that field.

Never call `get_project_context` twice per request. Never call it when the user already gave you what you need.

## Building WIQL — your call

You have full freedom to compose the query. Prefer one well-formed WIQL over two narrow ones. The fragments below are a reference, not a script — combine, extend, or ignore as fits the user's intent.

| Intent | Fragment |
|---|---|
| Current sprint (offsets work: `- 1` previous, `+ 1` next, `- N`, etc.) | `[System.IterationPath] = @CurrentIteration('[<project>]\<team>')` |
| Named iteration | `[System.IterationPath] = '<project>\...\<iteration>'` |
| Subtree of a path | `[System.IterationPath] UNDER '<path>'` |
| Priority | `[Microsoft.VSTS.Common.Priority] = N` |
| State (single / list) | `[System.State] = 'Active'` · `[System.State] IN ('Closed', 'Done', 'Resolved')` |
| Me / named assignee | `[System.AssignedTo] = @Me` · `[System.AssignedTo] = '<descriptor>'` |
| Text | `[System.Title] CONTAINS 'word'` · `[System.Tags] CONTAINS 'tag'` |
| Dates | `[System.ChangedDate] > @Today - 7` · `[System.ChangedDate] > '2026-04-01'` |

Combine with `AND`/`OR`, order with `ORDER BY`. Stick to canonical field names (`System.*`, `Microsoft.VSTS.Common.*`). If a field name feels guessed, check `wit_query_by_wiql` error output — AzDO names the offender.

## Call sequence

- **IDs path:** `wit_get_work_items_batch_by_ids({ ids, project?, fields?, expand? })`. Done.
- **WIQL path:** `wit_query_by_wiql({ query, project? })` → extract `workItems[].id` → `wit_get_work_items_batch_by_ids({ ids, … })`.

Pass `fields` only when the user asked for a subset. Pass `expand: "relations"` only when they asked for links. The defaults are already good.

## Rendering

Make it readable and shaped to what the user asked for.

- Single ticket → full body: title, state, priority, assignee, description, and a linked-items section if relations came back.
- Multiple tickets → a grouped summary. Grouping by `System.State` and sorting by `Microsoft.VSTS.Common.Priority` ascending is a solid default when the user didn't specify an order.

## Errors and empty sets

- Any tool returns `isError: true` → surface the error text verbatim and stop. Retry only when the error clearly names a fix (e.g. typo in a WIQL field name).
- Zero results at any step → reply "No matching work items." and stop. Do not fabricate.
