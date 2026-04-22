---
title: Skill-vs-Primitive — Read-path Layer Choice for AzDO MCP
date: 2026-04-22
author: Dmitry (with Amelia, bmad-agent-dev)
status: final
supersedes: none
informs: specs/planning/epics.md § Epic 2; specs/dev/story-2.1-skill-read-path.md
---

# Skill-vs-Primitive — Read-path Layer Choice for AzDO MCP

## Context

Epic 2's original plan shipped two author-owned read primitives on the MCP server — `get_work_item` (single) and `list_work_items` (batch, with `criteria: { ids | iteration | wiql | priority }`) — plus two user-facing skills (`/azdo-fetch-ticket`, `/azdo-fetch-tickets`) that invoked them. During Story 2.1 design, the plan was iterated three times:

1. Separate `get_work_item` + `list_work_items`.
2. Merged into one universal `get_work_items({ criteria })`.
3. **Abandoned entirely** in favor of skill-layer composition over Microsoft's inherited `wit_*` tools.

This document captures why the third form won, so future contributors (or future us) don't re-litigate it.

## The AzDO-API reality that forces the shape

Two endpoint families, two shapes:

| Endpoint | Returns |
|---|---|
| `wit.queryByWiql({ query })` | `WorkItemQueryResult.workItems: WorkItemReference[]` — **IDs only** (`id`, `url`), no field values |
| `work.getIterationWorkItems(teamContext, iterationId)` | `IterationWorkItems.workItemRelations: WorkItemLink[]` — **IDs only** |
| `wit.getWorkItemsBatch({ ids, fields?, $expand? })` | `WorkItem[]` — full fields, ≤ 200 IDs per call |

**Any query-based read of full fields is a two-round-trip operation.** Query → IDs → batch fetch. There is no flag on WIQL to return field values. Microsoft's `wit_query_by_wiql` and `wit_get_work_items_for_iteration` MCP tools follow this exact shape — they're thin wrappers over the same SDK calls.

## What an author primitive `get_work_items` would actually do

In all four criteria cases, the implementation is:

```
resolve IDs (via WIQL / iteration API / explicit list / built-from-priority WIQL)
  → chunk to ≤ 200
  → wit.getWorkItemsBatch per chunk, in parallel
  → flatten
```

For the IDs case the resolve step is `return criteria.ids`. For WIQL / iteration / priority cases the resolve step is a single call to the AzDO query endpoint. The orchestration logic is ~40 lines of TypeScript.

## Why that primitive loses to skill composition

Four independent reasons, any one sufficient.

### 1. Zero marginal capability

Microsoft already registers both halves of the AzDO contract:

- `wit_get_work_items_batch_by_ids` — supports `ids`, `fields`, `expand`. Full payload-shaping surface.
- `wit_query_by_wiql` — accepts raw WIQL, returns ID refs.
- `wit_get_work_items_for_iteration` — iteration-scoped helper.

The hypothetical `get_work_items` would orchestrate these (or rebuild the same orchestration over `WebApi` directly). It adds no capability Claude cannot already access.

### 2. Orchestration belongs at the skill layer by architecture

FR17 explicitly places compound multi-tool workflows at the skill layer: *"A Claude Skill can invoke multiple MCP tools in sequence to accomplish a compound task."* The whole premise of MCP+Skills is that the AI host is a general-purpose orchestrator and the server ships narrow primitives. A single author tool that dispatches across four criteria types is orchestration masquerading as a primitive.

### 3. Cannot reuse Microsoft's handlers from server-side code

A plausible defense was "let our `get_work_items` call MS's `wit_*` handlers internally, so we don't rebuild the orchestration." That path is closed: MS's handlers are private closures inside `configureWorkItemTools`, stashed by the SDK into `McpServer._registeredTools` (a TypeScript-private field). Reaching them requires either (a) reflection into a TS-private map plus a hand-forged `RequestHandlerExtra`, fragile and SDK-version-coupled; or (b) a self-loopback MCP client talking to our own server, two JSON-RPC hops per call for no reason. Both are pure overhead. The only stable path is direct `azure-devops-node-api` calls — which is exactly what MS already does in `wit_*`.

### 4. The author-layer namespace stays lean

Keeping reads pure-skill means the single author-owned tool in Epic 2 is `get_project_context` (zero-arg, returns `{ project, team }` from `.env`). MS's 23 `wit_*` tools plus one thin author tool is a much smaller attack surface than 23 + several author primitives whose contracts we have to maintain, test, and keep in sync with MS's coverage.

## What we do ship

- **`get_project_context` (author)** — zero-arg tool returning the default AzDO project and team for team-relative WIQL (`@CurrentIteration('[project]\team')`). Registered before MS tools so it surfaces first in `tools/list`.
- **`/azdo-fetch-tickets` (skill)** — unified read entry point. Decision tree:
  - Plain numeric IDs → `wit_get_work_items_batch_by_ids` directly, no WIQL detour.
  - Anything compound → build WIQL → `wit_query_by_wiql` → `wit_get_work_items_batch_by_ids`.
  - Raw WIQL from user → run verbatim.
  - `get_project_context` called at most once per request, and only when the WIQL needs team-relative macros or the user did not name a project explicitly.

## Consequences

| Dimension | Before (primitive) | After (skill) |
|---|---|---|
| Author runtime code in Epic 2 | ~80–100 lines (`get_work_items` + dispatch + chunking) | ~15 lines (`get_project_context`) |
| Tools in namespace | 23 MS + 1 author | 23 MS + 1 author (same count; different tool) |
| Round-trips for WIQL-based fetch | 2 (AzDO-mandated) | 2 (AzDO-mandated, unchanged) |
| Round-trips for ID-only fetch | 1 | 1 (skill short-circuits WIQL) |
| Maintenance surface | Our WIQL builder + chunking + dispatch + criteria validation | SKILL.md only |
| Coupling to MS's tool surface | None (we re-implement) | Direct (we depend on `wit_query_by_wiql` + `wit_get_work_items_batch_by_ids` stability) |

The maintenance-surface delta is the key win. When MS evolves their `wit_*` tools (new fields, new expand modes, performance improvements), we inherit those gains for free through the skill. A hand-rolled `get_work_items` would need hand-rolled updates in lockstep.

## Limits of this decision

This call is about **read** paths. Write paths (Epic 3 — `create_work_item`, `add_comment`) are a different calculus: the Markdown-comment workaround needs api-version `7.2-preview.4`, which MS handles via their own raw-REST path (`wit_add_work_item_comment`). If MS's behavior there is sufficient, the same reasoning applies. If not (e.g. we need a different format contract), an author primitive earns its keep.

Read vs. write is the right axis here. Reads are thin plumbing over query + batch; writes often carry business shape (link types, field policies, comment format). Re-evaluate per epic.

## When to revisit

Re-open this decision if any of the following becomes true:

- **MS removes or materially changes `wit_query_by_wiql` / `wit_get_work_items_batch_by_ids`.** Re-evaluate self-implementation.
- **A new read use case cannot be expressed as one WIQL.** Unlikely — WIQL is expressive — but a counterexample would warrant an author primitive for that specific shape, not a general one.
- **Skill-layer latency becomes the bottleneck.** Claude's parse-decide-call loop adds host-side latency. If p95 for `/azdo-fetch-tickets` on simple ID fetches crosses the NFR-P2 budget (1.5 s), a direct author shortcut might earn its keep. Measure first.
- **Multiple skills converge on identical WIQL-construction logic.** Shared construction could live as an author helper primitive. Today `/azdo-fetch-tickets` is the only caller; not worth factoring.

## Decision

Skill-based read path. Author-owned read primitives deferred indefinitely.

Supporting artifacts: `.claude/skills/azdo-fetch-tickets/SKILL.md` (skill), `src/tools/project-context.ts` (support tool), `specs/dev/story-2.1-skill-read-path.md` (story).
