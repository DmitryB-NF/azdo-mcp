---
name: azdo-sprint-report
description: Generate a stakeholder-facing narrative sprint report — two sections covering last-sprint achievements and current-sprint goals — and optionally publish it as a Markdown comment on an Azure DevOps work item. Use when the user asks for a "sprint report", "sprint summary", "stakeholder update", "end-of-sprint report", or asks to "generate/publish the sprint report". Pulls the last two iterations, previews the rendered report, and — only if the user asks for publishing — posts after a separate explicit affirmative verb.
---

# /azdo-sprint-report

Turn the weekly sprint-report chore into a ninety-second exchange. The skill reads the previous and current iteration, drafts a narrative Markdown report for stakeholders, previews it rendered, and — if the user names a target work item — posts the report as a comment and replies with a deep link.

The report is **not** a list of tickets. It is continuous prose aimed at non-engineers, organised into two named sections: achievements of the last sprint and goals for the current sprint.

## Applicable rules

This skill composes on top of the repo-wide rules and does not restate them:

- [`azdo-mcp-connection.md`](../../rules/azdo-mcp-connection.md) — `mcp__azdo__` prefix on every tool call, disconnected-state handling, no REST fallback.
- [`writing-quality.md`](../../rules/writing-quality.md) — British English re-read of the full draft **before** the preview is shown.
- [`mutation-confirmation.md`](../../rules/mutation-confirmation.md) — preview, edit loop, explicit-verb gate for the publish path in § 8.
- [`azdo-comment-style.md`](../../rules/azdo-comment-style.md) — Markdown hygiene, bare `#<id>` refs inside the body, explicit `format` parameter, empty-body refusal.

Bare tool names below (`list_recent_iterations`, `get_sprint_goal`, `wit_add_work_item_comment`, …) are the server IDs; invoke them with the `mcp__azdo__` prefix. If the `mcp__azdo__*` tools are missing from the tool list, the server isn't connected — report and stop.

**Optional for automatic goal ingestion (§ 3):** the `keesschollaart/sprint-goal` marketplace extension plus `AZDO_PAT` scope `vso.extension.data`. When either is absent, `get_sprint_goal` returns `null` and the skill falls back gracefully to asking the user; it never hard-errors on this path.

## Inputs

Invocation is natural language; no structured arguments.

| Input              | Source                                          | Notes                                                                |
|--------------------|-------------------------------------------------|-----------------------------------------------------------------------|
| `targetWorkItemId` | user message → asked post-preview if missing    | Optional. Publishing is a post-preview step (§ 8). Never invent.      |
| `sprintGoals`      | user message → `get_sprint_goal` → ask if needed| Precedence below.                                                     |
| `project`, `team`  | user message → `get_azdo_context`               | `team` is required for iteration lookup; ask if null and unnamed.     |

**`targetWorkItemId` resolution.** Publishing is optional and always post-preview. The skill drafts and previews without a target. § 8 asks where to publish; if the user named an ID in the initial message ("post to 8812"), reuse it there without re-asking. A configured-default target is deferred beyond MVP — it would touch `src/config.ts`, outside skill+rule scope.

**`sprintGoals` resolution** (first match wins):

1. User supplies goals in the invocation — use as-is.
2. `get_sprint_goal` returns non-null — use `goal` as the anchor sentence, `detailsPlain` for paragraph themes.
3. Neither — ask once: "What are the goals for the current sprint?" If the user insists there are no explicit goals, generate the Goals section from current-iteration ticket themes alone; do not fabricate a goal.

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
{ "goal": "Mitosis Layout and maintenance", "detailsPlain": "Security repo updates\r\n…", "goalAchieved": true }
```

Map into the narrative:

- **Current** — `goal` seeds paragraph 1 of the Goals section; `detailsPlain` feeds the themes in paragraphs 2–3.
- **Previous** — `goal` + `goalAchieved` seed paragraph 1 of Achievements (`true` → clear outcome; `false` → honest partial progress); ticket work supports 2–3.

**Null-fallback (soft-failure by design):**

- Current `null` → ask-user fallback (§ Inputs → `sprintGoals` resolution).
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

Write the draft in the shape of § Style below. Before showing anything to the user, re-read the draft end-to-end against `writing-quality.md`.

### 6. Preview the rendered report

No target is needed at this stage — publishing is decided post-preview (§ 8). Render the draft **inline, not in a code fence**, so the chat UI formats it the way AzDO will:

```
**Sprint-report draft.** Sprints: <previousName> → <currentName> · Format: Markdown

---

<rendered report — two ## sections, three paragraphs each, no code fence>

---

Happy with the content, or what would you like to change? (You'll be asked where — if anywhere — to publish this after approval.)
```

Raw Markdown source is available only on explicit request ("show me the raw source") — render it in a code fence **below** the rendered preview.

### 7. Edit loop on content

Apply user edits, re-validate against `writing-quality.md`, re-render the full preview. Loop until the user gives an explicit affirmative on content ("looks good", "approved", "ok go", "proceed", or equivalent in the user's language).

A content-approval verb — **even one that sounds publish-intent** ("ship it", "post it", "publish") — never doubles as publish approval. § 8 asks for the target and renders a separate mutation preview; the publish gate is its own explicit verb.

### 8. Publish decision

After content approval, ask:

> Report is ready. Would you like me to post it as a comment on a work item? Give me the work-item ID, or say "skip" to keep the report in chat only.

If the user named a target in the initial invocation, reuse it — phrase as *"I'll post it as a comment on #8812 — confirm, give me a different ID, or say 'skip'."*

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

5. Capture `id` from the response and continue to § 9.

If the user changes the target mid-flow, re-enrich and re-render the mutation preview.

**Path B — user says "skip" / "just the report" / equivalent:** no mutation; short confirmation that the report is ready in chat for copy-and-reuse; skip § 9.

### 9. Reply with deep link (Path A only)

Construct deterministically — never scrape MS's response `url` field (it is a REST URL, not a UI deep link):

- `ticketUrl`  = `${orgUrl}/${project}/_workitems/edit/${targetWorkItemId}`
- `commentUrl` = `${ticketUrl}?focusedCommentId=${commentId}`

Reply in natural language tuned to the moment. Non-negotiable: the `commentUrl` must appear as a Markdown hyperlink so the user can jump straight to the posted report. Include `ticketUrl` too when it aids the reader.

## Style — the report body

### Structure

Exactly this Markdown, no more, no less:

```markdown
## Achievements of the Last Sprint: <previousName>

<P1 — outcome against the stated sprint goal (or headline achievement when no goal was set)>

<P2 — supporting objective or strongest parallel stream feeding the main goal>

<P3 — wider improvements delivered alongside the main thrust>

## Goals for the Current Sprint: <currentName>

<P1 — primary outcome the team is going after, tied to the stated goal>

<P2 — secondary objective or parallel stream supporting the main goal>

<P3 — wider improvements planned alongside the main thrust>
```

Two sections. Three paragraphs each. No other headings, no sub-headings, no preamble, no sign-off.

### Voice

- **Tone:** professional, neutral, stakeholder-oriented. Written for a product owner or executive reader who will never open a ticket.
- **Form:** continuous prose only. No bullets, no ticket IDs, no ticket titles, no tool names as outcomes.
- **Length:** 2–3 sentences per paragraph, each carrying substance. Every paragraph answers *"why does this matter?"* **and** *"what did we actually do about it?"* — lead with the outcome, then name the concrete themes at a stakeholder level of abstraction.
- **Themes:** 2–3 per section, derived from the fetched tickets. Do not reuse content between paragraphs.
- **Paragraph priority:** P1 carries the goal-aligned outcome; P2 picks up the next-strongest theme (secondary objective or enabler); P3 covers wider improvements framed as *"alongside the main focus, the sprint also advanced …"*. When only one theme remains for P3, write one substantive sentence — do not pad.

### Anti-patterns

- *"This sprint focused on infrastructure, architecture and design."* — generic; surface the real themes.
- Mechanical ticket-list mirroring (*"We closed ticket X. We closed ticket Y."*) — reframe as narrative.
- **Slogan paragraph** — one sentence asserting significance without naming themes (*"Closing the layout-parity gap is the primary aim."*). A paragraph needs outcome *and* substantive themes in 2–3 sentences.
- **Shopping-list paragraph** — ticket counts or titles (*"We closed 14 tickets across Mitosis migration and CI updates."*). Reframe as outcome.
- Overly technical detail (*"refactored the Redux reducer to normalise cart state"*) — step one level up for a stakeholder reader.
- Sign-offs (*"Hi team,"*, *"Best,"*) — this is a work-item comment, not an email.

## Errors

Generic error discipline — surface raw errors verbatim, no silent retry, no false-success claims, partial-failure honesty — is covered by `mutation-confirmation.md § Error handling`. Skill-specific branches:

- `get_azdo_context` returns `null` for a required coordinate the user didn't supply → ask for the missing field; do not proceed.
- `list_recent_iterations` returns fewer than two iterations → see § 2.
- Either iteration returns > 50 IDs from `wit_get_work_items_for_iteration` → see § 4 batch-budget branch.
- Either iteration's ticket set is empty → see § 4 empty-set handling.
- `get_sprint_goal` returns `null` → soft-failure per § 3. Not an error condition.
- `wit_get_work_items_for_iteration` errors on one iteration → surface the error; do not silently degrade. Offer the user the option to continue with the surviving iteration only.
- Target enrichment in § 8 Path A fails → report the failure, keep the content available in chat, offer a different ID or the skip path. The mutation never fires, but the report is not lost.

## Skill-specific don'ts

General rules (empty-body refusal, explicit `format` parameter, no REST fallback, no silent retries, no mutation without an explicit verb in *this* invocation) live in the topic rules. Only the narrative-shape constraints belong here:

- Never list ticket IDs or titles in the report body.
- Never use bullet points in the report body.
- Never impose categories that aren't grounded in the fetched tickets.
- Never fabricate achievements, goals, or iterations.
- Never scrape reply URLs from MS's response — always construct them from `{ orgUrl, project, targetWorkItemId, commentId }`.
