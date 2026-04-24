---
title: Sprint-Goal Extension-Data API — Ingestion Path for `/azdo-sprint-report`
date: 2026-04-24
author: Dmitry (with Amelia, bmad-agent-dev)
status: final
supersedes: none
informs: specs/planning/epics.md § Epic 4; specs/dev/story-4.1-sprint-goal-tool.md; specs/dev/story-4.2-azdo-sprint-report.md
---

# Sprint-Goal Extension-Data API — Ingestion Path for `/azdo-sprint-report`

## Context

`/azdo-sprint-report` (Epic 4) produces a stakeholder-facing narrative report in two sections — *Achievements of the Last Sprint* and *Goals for the Current Sprint*. The Goals section requires, unsurprisingly, **sprint goals**. Azure DevOps iteration objects returned by the Work REST API do not carry goals:

```json
{
  "id": "aac378c9-…",
  "name": "<iteration-name>",
  "path": "<Project>\\<Year> Iterations\\<iteration-name>",
  "attributes": { "startDate": "…", "finishDate": "…", "timeFrame": 1 },
  "url": "…"
}
```

The initial plan for Story 4.1 — which at that point was the narrative-skill story; see § Order-of-stories revision at the end of this document — was therefore to ask the user for goals at every invocation. This document captures the investigation that produced a better path: read goals directly from the `keesschollaart/sprint-goal` marketplace extension's data store, which the team is already populating through the AzDO UI.

## Dead ends ruled out

Before committing to the extension-data path, I verified all four cheaper options are closed.

### 1. Native AzDO REST API

Official reference — [MS Learn, Work/Iterations REST API 7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops/work/iterations?view=azure-devops-rest-7.1). Five operations only: `Delete`, `Get`, `Get Iteration Work Items`, `List`, `Post Team Iteration`. No goals, no properties endpoint, no generic metadata bag.

The `/teamsettings/iterations/{id}/properties` endpoint I speculated about in an earlier draft of this research **does not exist** in the public reference. Removed.

### 2. `azure-devops-node-api` SDK

Grep across `WorkApi.d.ts`, `WorkApi.js`, `WorkInterfaces.d.ts`:
- `TeamIterationAttributes` is exactly `{ startDate, finishDate, timeFrame }`.
- No `getIterationProperties`, no `getSprintGoal`, no `getValue`/`setValue` style method at the iteration level.
- No field anywhere in the `Work` interfaces file mentions `goal`, `sprint goal`, or similar.

### 3. Microsoft's `@azure-devops/mcp` bulk-wire

`configureWorkTools`, `configureWorkItemTools`, and the remaining seven MS MCP domains (advanced-security, core, pipelines, repositories, search, test-plans, wiki) expose 80+ tools. Inventoried them; none touch sprint goals. Searching the compiled `dist/tools/*.js` for `goal|sprint.?goal|iteration.?properties` returns zero matches.

### 4. Native AzDO "Sprint Goals" UI feature

AzDO rolled out a native Sprint Goals feature in the UI around 2022 (Sprint 209+). As of 2026-04-24 the REST API surfaces I inventoried (Work/Iterations reference page, `azure-devops-node-api` SDK, MS MCP tool catalogue) do not expose a Sprint Goals endpoint. A broader search across other REST domains might surface an internal or undocumented endpoint, but I did not pursue that — any such endpoint would be brittle by the same logic. Rejected.

## The working path — `vsts-sprint-goal` extension data

The [`keesschollaart/sprint-goal`](https://marketplace.visualstudio.com/items?itemName=keesschollaart.sprint-goal) marketplace extension (v6.1.5 at the time of this research) stores goal data via Azure DevOps' **Extension Data Service**, which *is* publicly reachable via the REST Extension Management API provided the caller has the right PAT scope.

### Storage contract (from extension source)

Taken from `script/sprint-goal.ts` and `script/helpers.ts` in the extension repo:

```typescript
// Service
VSS.getService(VSS.ServiceIds.ExtensionData);

// Key construction
getConfigKey(iterationId, teamId) {
  return iterationId.toString().substring(0, 15)
       + teamId.toString().substring(0, 15);
}

// Read
dataService.getValue("sprintConfig." + key);
```

Translation:

- **Scope:** `Default/Current` (org-wide, not user-scoped) — because no `IDocumentOptions` is passed.
- **Collection:** `$settings` — default when `getValue`/`setValue` is called without an explicit collection name.
- **Document ID:** `sprintConfig.` + first 15 chars of `iterationId` + first 15 chars of `teamId`. No separator between the two GUID prefixes.

### REST endpoint (verified live 2026-04-24)

```
GET https://extmgmt.dev.azure.com/{org}/_apis/ExtensionManagement/
  InstalledExtensions/keesschollaart/sprint-goal/Data/Scopes/
  Default/Current/Collections/%24settings/Documents/{docId}
  ?api-version=7.1-preview.1
```

Two critical details for the URL:

- **Host is `extmgmt.dev.azure.com`, not `dev.azure.com`.** Extension Management is served from its own subdomain for cloud AzDO organisations. The PAT handler applies unchanged; only the host swap matters.
- **`$settings` must be URL-encoded as `%24settings`.** Literal `$` is rejected as a path character by the REST gateway.

### Response shape (verified live, both iterations returned 200)

```json
{
  "id": "sprintConfig.aac378c9-a7c1-44a60d642-0ef8-4",
  "value": {
    "goal": "Component library rollout and bug fixes",
    "details": "<ol><li>…</li></ol>",          // HTML for UI rendering
    "detailsPlain": "Dependency updates\r\nComponent library: layout migration\r\n…",
    "goalAchieved": false,                      // boolean — post-sprint status
    "sprintGoalInTabLabel": false               // UI preference, irrelevant
  },
  "__etag": 3
}
```

Fields the skill uses:

- `goal` — short title, one line, ideal for the section lead.
- `detailsPlain` — bullet-per-line plain text, ready to mine for narrative themes without an HTML parse.
- `goalAchieved` — strong signal for the *Achievements* section. If the prior sprint's goal has `goalAchieved: true`, the narrative opens with a clear outcome statement; if `false`, the narrative reflects partial progress honestly.

Fields the skill ignores:

- `details` — HTML duplicate of `detailsPlain`. No benefit for LLM consumption; skipping it also avoids dragging style attributes through the prompt.
- `sprintGoalInTabLabel` — per-user UI toggle; not content.
- `__etag` — concurrency token; only relevant for writes, which we do not perform.

### Operational requirements

Two preconditions must hold at the user's install site:

1. **`keesschollaart/sprint-goal` extension installed** in the AzDO organisation. The extension itself uses scope `vso.work`; installing it does not widen any other surface. The extension is free.
2. **PAT scope `vso.extension.data` (Extension Data → Read)** added alongside the existing `vso.work`. This is distinct from `vso.extension` (Extensions → Read), which lists installed extensions but is not sufficient for Data access — standard scope semantics, confirmed by the live probe: a PAT with `vso.work` only returned HTTP 401 on the Documents endpoint; after adding `vso.extension` + `vso.extension.data` the same endpoint returned HTTP 200 with the stored goal payload. The `vso.extension` scope alone combination was not isolate-tested in this session; the scope split is inferred from AzDO's documented scope semantics.

Neither precondition is exotic, but both must be documented in `.env.example` and in the skill's preconditions section so a new installer isn't surprised by an empty Goals section.

### Graceful degradation

If either precondition fails — extension absent, PAT scope too narrow, or simply no goal set for a given iteration — the Documents endpoint returns HTTP 404 (or the scope-error variant). The author tool maps all of these to a `null` response, and the skill falls back to the pre-research behaviour: ask the user for current-sprint goals; skip any goal-centric narrative for the previous sprint.

## Why this instead of a pinned-ticket convention

The alternative path I had in mind before the research was "team pins goals in a designated ticket's description; skill fetches by ID." Comparison:

| Dimension                         | Extension data (this path)                  | Pinned-ticket convention                       |
|-----------------------------------|---------------------------------------------|------------------------------------------------|
| Authoring surface                 | Existing UI the team already uses           | Bespoke — one more place to remember to update |
| Structured fields                 | `goal`, `detailsPlain`, `goalAchieved`      | Free-text description only                     |
| Post-sprint status                | Native (`goalAchieved`)                     | None without manual convention                 |
| Operational cost (one-time)       | One PAT scope + install extension           | Create + pin a ticket per team                 |
| Operational cost (ongoing)        | Zero (team already populates goals)         | Re-edit description each sprint                |
| Coupling to external extension    | Yes — extension must stay installed         | None                                           |
| Brittleness if extension v7 ships | Medium — shape could change                 | N/A                                            |

The extension path wins on nearly every axis the team actually experiences. The only real risk is the coupling in the last row, and that is mitigated by: (a) the tool returning `null` gracefully on any failure, so the skill never breaks; (b) the goal data itself is human-readable and recoverable from the UI at any time; (c) extension upgrades rarely break stored schemas (the `__etag` is integer-incrementing, no versioning on the `value` shape historically).

## Scope of the implementation

Kept tight:

- **Story 4.1 (the primitive):** author-owned MCP tool `get_sprint_goal({ project, team, iterationId }) → value | null`. Resolves team name → GUID via `CoreApi.getTeam` when needed. Builds the extmgmt URL by substituting subdomains in `config.orgUrl`. Calls `getClient().rest.get(...)`. Maps 404 → `null`. Other errors surface per project pattern.
- **Story 4.2 (the consumer):** `/azdo-sprint-report` skill calls `get_sprint_goal` once per iteration after `list_recent_iterations`. Uses returned fields to inform the narrative. Falls back to asking the user when goals are absent.

No other changes to runtime code, rules, or planning documents are blocked by this finding.

## Order-of-stories revision

The original plan bundled the narrative skill into Story 4.1. This research arrived mid-implementation and flipped the dependency: the primitive is now the foundation, the skill is its only consumer. Planning re-ordered on 2026-04-24:

- **Old 4.1 (narrative skill, "ask user" for goals)** → becomes **Story 4.2** with goal-ingestion integrated.
- **New 4.1 (this finding, primitive)** → ships first.

See `specs/planning/epics.md` § Epic 4 for the revised story blocks and the explicit order-revision note.

## References

- Extension source: [`keesschollaart81/vsts-sprint-goal`](https://github.com/keesschollaart81/vsts-sprint-goal) — `script/sprint-goal.ts`, `script/helpers.ts`, `vss-extension.json`.
- Marketplace listing: [Sprint Goal (Visual Studio Marketplace)](https://marketplace.visualstudio.com/items?itemName=keesschollaart.sprint-goal).
- MS Work/Iterations REST 7.1: [https://learn.microsoft.com/en-us/rest/api/azure/devops/work/iterations?view=azure-devops-rest-7.1](https://learn.microsoft.com/en-us/rest/api/azure/devops/work/iterations?view=azure-devops-rest-7.1).
- MS Extension Management REST (generic — for scope/endpoint shape): the `/InstalledExtensions/{pub}/{ext}/Data/Scopes/.../Collections/.../Documents/{id}` pattern is documented across AzDO Services' Extension Data Service pages.
