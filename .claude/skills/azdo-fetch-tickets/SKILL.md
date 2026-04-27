---
name: azdo-fetch-tickets
description: Fetch one or many Azure DevOps work items — by ID(s), by iteration, or by any compound criteria (state, priority, assignee, sprint, tags, text search) — and render as readable Markdown. Use when the user asks to "show", "fetch", "pull", or "list" tickets / work items / sprint items from Azure DevOps.
---

# /azdo-fetch-tickets

Resolve the user's request to a set of work-item IDs, then fetch full fields in one batch call and render.

Bare tool names below (`wit_query_by_wiql`, `wit_get_work_items_batch_by_ids`, `get_azdo_context`) are server IDs; invoke with the `mcp__azdo__` prefix. If `mcp__azdo__*` tools are missing, the server isn't connected — report and stop.

## Invariants the AzDO API forces

Two rules are not yours to bend — everything else is:

1. `wit_query_by_wiql` and iteration endpoints return **ID references only**. No field values. Always finish with `wit_get_work_items_batch_by_ids` when you need fields for rendering.
2. For **plain numeric IDs from the user, skip WIQL entirely** — go straight to the batch endpoint. Wrapping a known ID list in `[System.Id] IN (1, 2, 3)` is pure overhead; don't do it.

## Project context

Most calls need `project`. Team-relative WIQL (`@CurrentIteration`, some iteration paths) also needs `team`. Rendering (see § Rendering → Ticket links) always needs `orgUrl`.

- Call `get_azdo_context` **once per turn** and cache `{ project, team, orgUrl }` for both tool calls and rendering. `orgUrl` is always non-empty — safe for link construction in every path.
- If the user named a project and/or team in their message, prefer their values over the defaults from `get_azdo_context`.
- If a required field comes back `null` and the user didn't supply it, ask for just that field.

Never call `get_azdo_context` twice per request.

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

### Ticket links

Every reference to a work item — the heading of a single-ticket render, each bullet in a multi-ticket list, any mention of a linked/related ID in the body — MUST be a full Markdown hyperlink:

```
[#<id>](<orgUrl>/<project>/_workitems/edit/<id>) — <type> — <title>
```

Never bare `#<id>`: chat UIs auto-link `#NNNNN` to GitHub issues and send the reader to the wrong service. The rule holds whether you fetched by ID or by WIQL, and whether or not `get_azdo_context` was already part of the call.

- `orgUrl` comes from `get_azdo_context` — call it once per turn for orgUrl alone if you didn't already need it for a project lookup. Cost is one zero-arg round-trip; pay it.
- `project` comes from each returned item's `System.TeamProject` field. Don't reuse a single cached project for the whole list — cross-project batches are legal and each link must target its own project slug.

## Errors and empty sets

- Any tool returns `isError: true` → surface the error text verbatim and stop. Retry only when the error clearly names a fix (e.g. typo in a WIQL field name).
- Zero results at any step → reply "No matching work items." and stop. Do not fabricate.
