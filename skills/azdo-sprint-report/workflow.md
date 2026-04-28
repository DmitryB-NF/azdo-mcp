# /azdo-sprint-report — workflow

Detailed call sequence and errors for `/azdo-sprint-report`. The entry [`SKILL.md`](SKILL.md) carries the description, applicable rules, and inputs. Narrative-body shape (structure, voice, anti-patterns) lives in [`style.md`](style.md). They are not restated here.

Bare tool names below (`list_recent_iterations`, `get_sprint_goal`, `wit_get_work_items_for_iteration`, `wit_get_work_items_batch_by_ids`, `wit_add_work_item_comment`, `get_azdo_context`) are server IDs; invoke with the `mcp__azdo__` prefix. If `mcp__azdo__*` tools are missing, the server isn't connected — report and stop.

## Call sequence

### 1. Resolve session coordinates

Call `get_azdo_context` once per invocation and cache `{ project, team, orgUrl }`. Prefer user-named `project` / `team` over defaults. If `team` is null and the user didn't name one, ask before proceeding.

### 2. Fetch the last two iterations

`list_recent_iterations({ project, team, limit: 2 })` returns iterations sorted by `attributes.startDate` descending — `[current, previous]` under normal configuration.

Both iterations are required; the skill never silently degrades to a current-only half-report. If fewer than two come back, surface what was found (by `name`) and ask the user either to supply the missing iteration's GUID/name verbatim or to abort.

### 3. Fetch sprint goals for each iteration

`get_sprint_goal` requires both `team` and `iterationId` as **GUIDs** — the zod schema rejects names or non-GUID strings. Iteration GUIDs are in `current.id` / `previous.id`. The team GUID is embedded in each iteration's `url`:

```
https://dev.azure.com/<org>/<projectId>/<teamId>/_apis/work/teamsettings/iterations/<iterationId>
```

Extract with `/\/([0-9a-f-]{36})\/_apis\/work\/teamsettings\//` — first capture group is the team GUID. Both iterations share the same team, so one extraction is enough. If the `url` is missing or no GUID matches, apply the `null`-fallback below and skip `get_sprint_goal` for that iteration.

Call `get_sprint_goal` once per iteration. Returned shape:

```json
{ "goal": "Component library rollout and bug fixes", "detailsPlain": "Dependency updates\r\n…", "goalAchieved": true }
```

Map into the narrative:

- **Current** — `goal` seeds paragraph 1 of the Goals section; `detailsPlain` feeds the themes in paragraphs 2–3.
- **Previous** — `goal` + `goalAchieved` seed paragraph 1 of Achievements (`true` → clear outcome; `false` → honest partial progress); ticket work supports 2–3.

**Null-fallback (soft-failure by design):**

- Current `null` → ask-user fallback (see [`SKILL.md § Inputs → sprintGoals resolution`](SKILL.md)).
- Previous `null` → Achievements proceeds from ticket themes alone; do not invent a goal.
- `isError: true` → surface verbatim; drop that iteration's goal-driven paragraph. Ticket-level work is still usable.

### 4. Fetch tickets for each iteration

```
wit_get_work_items_for_iteration({ project, team, iterationId: current.id })
wit_get_work_items_for_iteration({ project, team, iterationId: previous.id })
```

This endpoint is natively team-scoped (wraps `GET /{project}/{team}/_apis/work/teamsettings/iterations/{id}/workitems`), so no WIQL, no `IterationPath` `WHERE` clause leaking other teams, no `@CurrentIteration` guessing. Extract IDs from `workItemRelations[].target.id` and dedupe — parent/child relations inside the iteration surface as separate entries.

**Batch budget: at most 50 IDs per iteration per `wit_get_work_items_batch_by_ids` call** (combined ≤ 100 when each iteration fits). In the common case one combined batch call covers both iterations.

**If either iteration returned > 50 IDs, stop and ask** — that is unusually large and often signals a mis-subscribed iteration, the wrong team, or an over-scoped sprint:

> Iteration `<name>` returned **<N>** tickets (batch cap is 50). Proceed by: **using the first 50** (backlog-ordered), **fetching all in 50-ticket chunks** (sequential batch calls), or **aborting**?

Wait for an explicit choice. The 50-per-call cap never widens — "fetch all" authorises more calls, not larger calls.

**Batch call shape:**

```
wit_get_work_items_batch_by_ids({
  ids: <≤50 from one iteration, or combined ≤100 when each ≤50>,
  project,
  fields: [
    "System.Id", "System.Title", "System.State",
    "System.WorkItemType", "System.Tags",
    "Microsoft.VSTS.Common.Priority"
  ]
})
```

Split the returned items back into previous / current by matching against the originating ID lists.

**Empty-set handling — always ask the user.** An empty set points at a wrong iteration, an un-subscribed team, or a genuinely idle sprint; the user decides, not the skill. Surface exactly which iteration came back empty and offer: (a) supply a different GUID/name for that slot, (b) confirm the sprint was genuinely idle and proceed with an explicit note in the narrative acknowledging it, or (c) abort. Never silently synthesise "the sprint had no committed work."

### 5. Identify themes and draft the report

Extract **two to three real themes per iteration** grounded in the fetched tickets. Never invent categories; never use generic labels like "infrastructure / architecture / design". The table is a translation hint, not a template:

| Signal (titles, descriptions, tags)         | Frame as                         |
|---------------------------------------------|----------------------------------|
| Security, dependencies, CI/CD, supply chain | Stability and risk reduction     |
| Data pipelines, ETL, analytics              | Data platform maturity           |
| API changes, integrations                   | Service reliability              |
| Bugs, hotfixes, incident follow-ups         | User experience and reliability  |
| Design, UX, copy work                       | Product refinement               |
| Infrastructure, deployment, observability   | Operational improvements         |

Write the draft in the shape pinned by [`style.md`](style.md). Before showing anything to the user, re-read the draft end-to-end against `writing-quality.md`.

### 6. Preview the rendered report

No target is needed at this stage — publishing is decided post-preview (§8). Render the draft **inline, not in a code fence**, so the chat UI formats it the way AzDO will:

```
**Sprint-report draft.** Sprints: <previousName> → <currentName> · Format: Markdown

---

<rendered report — two ## sections, three paragraphs each, no code fence>

---

Happy with the content, or what would you like to change? (You'll be asked where — if anywhere — to publish this after approval.)
```

Raw Markdown source is available only on explicit request ("show me the raw source") — render it in a code fence **below** the rendered preview.

### 7. Edit loop on content

Apply user edits, re-validate against `writing-quality.md` and [`style.md`](style.md), re-render the full preview. Loop until the user gives an explicit affirmative on content ("looks good", "approved", "ok go", "proceed", or equivalent in the user's language).

A content-approval verb — **even one that sounds publish-intent** ("ship it", "post it", "publish") — never doubles as publish approval. §8 asks for the target and renders a separate mutation preview; the publish gate is its own explicit verb.

### 8. Publish decision

After content approval, ask:

> Report is ready. Would you like me to post it as a comment on a work item? Give me the work-item ID, or say "skip" to keep the report in chat only.

If the user named a target in the initial invocation, reuse it — phrase as *"I'll post it as a comment on #12345 — confirm, give me a different ID, or say 'skip'."*

**Path A — user supplies a work-item ID:**

1. Enrich: `wit_get_work_items_batch_by_ids({ ids: [targetWorkItemId], project })` for the title. On failure, report it; the content is still in chat; offer a different ID or the skip path.
2. Render the mutation preview:

   ```
   **About to post the approved report as a comment on [#<targetWorkItemId> <targetTitle>](<ticketUrl>).** Format: Markdown.

   Confirm?
   ```

   `ticketUrl` = `${orgUrl}/${project}/_workitems/edit/${targetWorkItemId}`.

3. Wait for an explicit affirmative verb ("post", "publish", "ship it", "approved", or equivalent). If the user pivots to skip at this gate ("don't post", "hold off", "actually skip"), fall through to Path B — no re-prompt for a target.
4. On approval, call:

   ```
   wit_add_work_item_comment({
     workItemId: targetWorkItemId,
     comment: <approved body>,
     format: "Markdown",   // always explicit — never rely on the schema default
     project
   })
   ```

5. Capture `id` from the response and continue to §9.

If the user changes the target mid-flow, re-enrich and re-render the mutation preview.

**Path B — user says "skip" / "just the report" / equivalent:** no mutation; short confirmation that the report is ready in chat for copy-and-reuse; skip §9.

### 9. Reply with deep link (Path A only)

Construct deterministically — never scrape MS's response `url` field (it is a REST URL, not a UI deep link):

- `ticketUrl`  = `${orgUrl}/${project}/_workitems/edit/${targetWorkItemId}`
- `commentUrl` = `${ticketUrl}?focusedCommentId=${commentId}`

Reply in natural language tuned to the moment. Non-negotiable: the `commentUrl` must appear as a Markdown hyperlink so the user can jump straight to the posted report. Include `ticketUrl` too when it aids the reader.

## Errors

Generic error discipline — surface raw errors verbatim, no silent retry, no false-success claims, partial-failure honesty — is covered by `mutation-confirmation.md § Error handling`. Skill-specific branches:

- `get_azdo_context` returns `null` for a required coordinate the user didn't supply → ask for the missing field; do not proceed.
- `list_recent_iterations` returns fewer than two iterations → see §2.
- Either iteration returns > 50 IDs from `wit_get_work_items_for_iteration` → see §4 batch-budget branch.
- Either iteration's ticket set is empty → see §4 empty-set handling.
- `get_sprint_goal` returns `null` → soft-failure per §3. Not an error condition.
- `wit_get_work_items_for_iteration` errors on one iteration → surface the error; do not silently degrade. Offer the user the option to continue with the surviving iteration only.
- Target enrichment in §8 Path A fails → report the failure, keep the content available in chat, offer a different ID or the skip path. The mutation never fires, but the report is not lost.
