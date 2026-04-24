---
name: azdo-sprint-report
description: Generate a stakeholder-facing narrative sprint report — two sections covering last-sprint achievements and current-sprint goals — and optionally publish it as a Markdown comment on an Azure DevOps work item. Use when the user asks for a "sprint report", "sprint summary", "stakeholder update", "end-of-sprint report", or asks to "generate/publish the sprint report". Pulls the last two iterations, previews the rendered report, and — only if the user asks for publishing — posts after a separate explicit affirmative verb.
---

# /azdo-sprint-report

Turn the weekly half-hour reporting chore into a ninety-second conversational exchange. The skill reads the previous and current iteration, drafts a narrative Markdown report for stakeholders, and shows a rendered preview the user can iterate on. After the content is approved the skill asks whether — and where — to publish; if the user names a target work item, it posts the report as a comment and replies with a deep link, and if the user skips, the report simply stays in the chat for copy-and-reuse.

The report is **not** a list of tickets. It is continuous prose aimed at non-engineers, describing outcomes and next-sprint focus in two named sections.

## Preconditions

All tools below are registered on the `azdo` MCP server. Invoke them with the `mcp__azdo__` prefix — `list_recent_iterations` becomes `mcp__azdo__list_recent_iterations`, `get_sprint_goal` becomes `mcp__azdo__get_sprint_goal`, `wit_get_work_items_for_iteration` becomes `mcp__azdo__wit_get_work_items_for_iteration`, `wit_add_work_item_comment` becomes `mcp__azdo__wit_add_work_item_comment`, and so on. The bare names in this document are the tool IDs on the server.

**Optional operational requirement for automatic goal ingestion (§ 3):** the `keesschollaart/sprint-goal` marketplace extension installed in the org, plus the `AZDO_PAT` carrying scope `vso.extension.data` (Extension Data → Read). When either is absent, `get_sprint_goal` returns `null` and the skill falls back gracefully to asking the user for goals — the skill never hard-errors on this path.

If the `mcp__azdo__*` tools are not in your available tool list, the server is not connected. **Follow `.claude/rules/azdo-mcp-connection.md`** — report the disconnected state to the user and stop; no REST fallback.

## The non-negotiable contract

This skill **may** write to Azure DevOps on its optional publish path (§ 8 Path A). When it does, every such mutation MUST obey:

- [`.claude/rules/mutation-confirmation.md`](../../rules/mutation-confirmation.md) — preview the pending mutation, loop on edits, mutate only on an explicit affirmative verb from the user in *this* invocation. The approval for the mutation is separate from the content-approval verb at § 7.
- [`.claude/rules/azdo-comment-style.md`](../../rules/azdo-comment-style.md) — empty-body refusal, preview-rendered, Markdown normalisation, format parameter always explicit. The report's content structure (the two named sections below) is this skill's contribution on top — it sits comfortably inside the rule's "prefer" items without conflict.

Regardless of whether the skill ultimately publishes, every invocation MUST obey:

- [`.claude/rules/writing-quality.md`](../../rules/writing-quality.md) — British English, no code-switching, no typos, well-formed Markdown. The validation step runs **before** the preview is shown to the user, not after approval.

Silence is not approval. "Looks good." alone is not approval. A negated affirmative ("don't post", "hold off", "not yet") is a refusal, not an approval; the same applies to the equivalent phrasing in any language the user uses.

## Inputs

The skill is invoked by slash-command, not by structured argument — users say "/azdo-sprint-report" plus any of the hints below in natural language. The table lists what the skill reads from the user's message and what falls through to `get_azdo_context`.

| Input               | Source                      | Shape                                                                                                         |
|---------------------|-----------------------------|---------------------------------------------------------------------------------------------------------------|
| `targetWorkItemId`  | user message → asked post-preview if missing | Positive integer. Optional — publishing is a post-preview step (§ 8). When absent, the skill generates and previews the report without it, then asks whether to publish; the user may supply an ID then or skip publishing entirely. Never invent. |
| `sprintGoals`       | user message → `get_sprint_goal` → otherwise ask | Free-text summary of current-sprint priorities. Precedence detailed in § `sprintGoals` resolution below.    |
| `project`           | user message → `get_azdo_context` | Only needs an override when the user explicitly names a project different from the configured default.  |
| `team`              | user message → `get_azdo_context` | Required for iteration lookup. Override only when the user names a team different from the default.     |

### `targetWorkItemId` resolution

Publishing the report is **optional and always post-preview**. The skill generates the report, previews it, and loops on content edits without needing a target. Only after content approval (§ 8) does the skill ask whether — and where — to publish. If the user names a work-item ID in their initial message, remember it for § 8 but do not preview-with-target; if they never mention one, no target is required.

- Initial-message mention ("post to 8812") → remember as a candidate target; use it in § 8 without re-asking.
- Otherwise → § 8 asks explicitly: work-item ID to post as a comment, or "skip" to keep the report in chat only.
- Never invent an ID.

A configured-default-target feature (env or config.ts) is deliberately out of scope at MVP — the architecture reserves `process.env` reads for `src/config.ts`, and adding a default path touches code beyond skill + rule. Tracked as a deferred enhancement.

### `sprintGoals` resolution

Goals are resolved in this precedence, first match wins:

1. **User supplies goals in the invocation.** Use as-is.
2. **`get_sprint_goal` returns non-null** for the iteration (see § 3 Fetch sprint goals). Use the returned `goal` (title) and `detailsPlain` (bullet-list body) as the authoritative source.
3. **Neither present** → ask the user once: "What are the goals for the current sprint?" Accept a short free-text answer. If the user insists there are no explicit goals, generate the Goals section from current-iteration ticket themes alone — do not fabricate a goal.

Rationale: the `keesschollaart/sprint-goal` marketplace extension is installed in the project's AzDO org and the team populates goals via its UI tab. The `get_sprint_goal` author tool reads those entries directly. Graceful null-fallback handles the case where the extension is absent, the PAT lacks `vso.extension.data`, or a particular iteration simply has no goal set.

## Call sequence

### 1. Resolve session coordinates

Call `get_azdo_context` **once per invocation** and cache `{ project, team, orgUrl }` for the rest of the turn.

- If the user named `project` / `team`, prefer those over the defaults.
- `team` is required for iteration lookup; if it comes back `null` and the user didn't name one, ask before proceeding.
- `orgUrl` is always non-empty — used to construct the deep link in § 9.

### 2. Fetch the last two iterations

Call `list_recent_iterations({ project, team, limit: 2 })` once. It returns up to two iterations sorted by `attributes.startDate` descending — `[current, previous]` under normal team configuration.

The sprint report's premise is **Achievements of the previous sprint + Goals for the current sprint** — both iterations are required. Anything less is an error state; never silently degrade.

- **Two iterations returned** → `current = recent[0]`, `previous = recent[1]`. Capture `name` and `path` from each. Proceed.
- **Fewer than two iterations returned** → stop and ask the user explicitly. Surface how many were found and which (by `name`), then ask how to proceed:
  - the user can supply the missing iteration's GUID / name verbatim, which the skill then uses directly;
  - or the user can abort.

  Do not offer a "current-only" half-report as an implicit option, and do not ship anything until the user has named both iterations.

### 3. Fetch sprint goals for each iteration

`get_sprint_goal` requires both `team` and `iterationId` as **GUIDs** — the tool's zod schema rejects names or non-GUID strings at the boundary. The iteration GUID is already in `current.id` / `previous.id` from step 2. The team GUID is embedded in each iteration's `url` field, which `list_recent_iterations` returns in this shape:

```
https://dev.azure.com/<org>/<projectId>/<teamId>/_apis/work/teamsettings/iterations/<iterationId>
```

Extract the team GUID as the path segment **immediately before `_apis/work/teamsettings`**. The unambiguous way is a regex — `/\/([0-9a-f-]{36})\/_apis\/work\/teamsettings\//` — whose first capture group is the team GUID. Both iterations share the same team, so one extraction is enough.

If an iteration's `url` field is missing or no team GUID can be matched, skip `get_sprint_goal` for that iteration and apply the `null`-fallback path described below (ask-user for current, ticket-only narrative for previous).

Then call `get_sprint_goal` **once per iteration**:

```
get_sprint_goal({ team: teamGuid, iterationId: current.id })
get_sprint_goal({ team: teamGuid, iterationId: previous.id })
```

The tool returns either the sprint goal object or `null`:

```json
{
  "goal": "Mitosis Layout and maintenance",
  "detailsPlain": "Security repo updates\r\nMitosis: Layout components migration\r\n…",
  "goalAchieved": true
}
```

Map the returned fields into the narrative:

- **Current iteration goal** — seeds the Goals section. The `goal` becomes the anchor sentence of paragraph 1; `detailsPlain` feeds the themes expanded in paragraphs 2–3.
- **Previous iteration goal + `goalAchieved`** — seeds the Achievements section. Paragraph 1 opens with whether the stated goal was met (`goalAchieved: true` → clear outcome; `false` → partial progress framed honestly). Paragraphs 2–3 cover supporting ticket work.

**Null-fallback:**

- Current goal `null` → fall back to asking the user once (§ Inputs → `sprintGoals` resolution).
- Previous goal `null` → Achievements section proceeds from ticket themes alone; do not invent a stated goal. Do not hard-error.
- Both `null` → same as above for each; the report still ships.

The tool is soft-failure by design; extension absence, missing PAT scope, or an unset goal for a given iteration all produce `null` and the skill degrades gracefully.

### 4. Fetch tickets for each iteration

For each iteration, issue one team-scoped call:

```
wit_get_work_items_for_iteration({ project, team, iterationId: current.id })
wit_get_work_items_for_iteration({ project, team, iterationId: previous.id })
```

This endpoint wraps `GET /{project}/{team}/_apis/work/teamsettings/iterations/{id}/workitems` — natively team-scoped, so it returns exactly the work items the given team has subscribed to in the given iteration. No WIQL, no `IterationPath` `WHERE` clause bleeding in tickets from other teams that share the same path, no `AreaPath` juggling, no `@CurrentIteration` macro guessing.

Extract IDs from `workItemRelations[].target.id`. Flat work items (the usual case) have `source: null`; parent–child relations inside the iteration surface as separate entries with `source` set — dedupe by `target.id`.

**Batch budget: 50 tickets per iteration per batch call.** A single `wit_get_work_items_batch_by_ids` invocation fetches at most 50 IDs per iteration (so a combined previous + current batch never exceeds 100). In the common case — both iterations returning ≤ 50 IDs — one combined batch call covers everything and the skill proceeds straight to § 5.

**If either iteration returned more than 50 IDs, stop before the batch call and ask the user first.** More than 50 tickets in a single team's sprint is an edge case that often signals something is off: a mis-subscribed iteration, the wrong team picked up, an unusually large or over-scoped sprint, or an upstream bug. Surface the counts explicitly and offer three options:

> Iteration `<name>` returned **<N>** tickets (cap per batch is 50). That is unusually large for a single sprint and may indicate a mis-subscribed iteration, the wrong team, or an over-scoped sprint. How shall I proceed?
> - **Use the first 50** (backlog-ordered) — fastest, usually enough to identify narrative themes.
> - **Fetch all in 50-ticket chunks** — I'll make sequential batch calls; context grows with each chunk.
> - **Abort** — something is likely off; re-invoke against a corrected iteration.

Do not default silently to any of the three — wait for an explicit choice. Do not widen the 50-per-batch-call limit even when the user chooses to fetch all; that choice authorises *more batch calls*, not a bigger single call. Paging past 50 is always by repeated chunked calls, never by stuffing one call with 100+ IDs.

**Execution per user choice:**

- **Use the first 50** → take the first 50 IDs from each iteration (backlog-ordered — AzDO returns them in the team's prioritisation). One combined batch call covers both iterations.
- **Fetch all in chunks** → split each iteration's IDs into slices of 50, call `wit_get_work_items_batch_by_ids` once per slice (previous-iteration slices first, then current-iteration slices), merging returned items as they come back. Each call carries at most 50 IDs from one iteration, so the context footprint is bounded per call even though the total grows.
- **Abort** → stop, do not draft, wait for the user's next instruction.

**Batch call shape** (regardless of chunking choice):

```
wit_get_work_items_batch_by_ids({
  ids: <chunk of up to 50 IDs from one iteration, or combined ≤100 from both when each is ≤50>,
  project,
  fields: [
    "System.Id",
    "System.Title",
    "System.State",
    "System.Description",
    "System.Tags",
    "Microsoft.VSTS.Common.Priority"
  ]
})
```

Split the returned items back into previous / current by matching against the originating ID lists.

**Empty-set handling — always ask the user when anything is empty.**

A sprint report assumes both iterations had committed work; an empty set points at either a wrong iteration selection, a team that is not subscribed to the iteration, or a genuinely idle sprint — all of which the user should decide on, not the skill.

- **Either iteration empty** (previous, current, or both) → stop, surface exactly which iteration came back empty, and ask the user whether to (a) supply a different iteration GUID/name for that slot, (b) confirm the sprint was genuinely idle and proceed with an explicit note in the narrative acknowledging the empty sprint, or (c) abort. Never silently ship a report with a synthesised "the sprint had no committed work" paragraph.
- Only proceed to § 5 once both iterations resolve to non-empty ticket sets (or the user has explicitly approved a path that includes an empty one).

### 5. Identify themes and draft the report

Read the fetched tickets. For each iteration, extract **two to three real themes** grounded in actual work — never invent categories, never fall back to generic labels like "infrastructure / architecture / design".

Use the mapping guide below as a translation hint, not a template:

| Input signal (from titles, descriptions, tags) | Frame as                              |
|------------------------------------------------|---------------------------------------|
| Security, dependencies, CI/CD, supply chain    | Stability and risk reduction          |
| Data pipelines, ETL, analytics                 | Data platform maturity                |
| API changes, integrations                      | Service reliability                   |
| Bugs, hotfixes, incident follow-ups            | User experience and reliability       |
| Design, UX, copy work                          | Product refinement                    |
| Infrastructure, deployment, observability      | Operational improvements              |

Write the report in the shape laid out in § Style below. Before showing anything to the user, re-read the draft end-to-end against `writing-quality.md` — British spelling, no code-switching from the user's chat language, no typos, no broken Markdown.

### 6. Preview the rendered report

No target is needed at this stage — publishing is decided post-preview in § 8. Render the draft **inline, not in a code fence**, so the chat UI formats it the way AzDO will. Frame it with a short meta line and a follow-up question, separated from the body by horizontal rules:

```
**Sprint-report draft.** Sprints: <previousName> → <currentName> · Format: Markdown

---

<rendered report — two ## sections, three paragraphs each, no code fence>

---

Happy with the content, or what would you like to change? (You'll be asked where — if anywhere — to publish this after approval.)
```

If the user asks to see the raw Markdown source ("show me the raw source"), render it in a code fence *below* the rendered preview. Rendered is always the default; source is available on explicit request.

### 7. Edit loop on content

If the user proposes edits — theme rephrasing, goal swap, tone change, paragraph reshuffle — apply them, re-validate against `writing-quality.md`, and re-render the full preview. Wait for an explicit affirmative verb on the content: "looks good", "approved", "content is ok", "ok go", "proceed", or equivalent phrasing in the language the user is writing in. Loop until the user approves the content.

**Under no circumstances interpret § 7 approval as authorising `wit_add_work_item_comment`.** Even if the user's verb sounds publish-intent ("post it", "ship it", "publish"), § 7 still resolves only to *content approved* — the skill must still proceed to § 8 to ask *where* to publish and to render the mutation preview. A single verb never crosses both gates. Mutation-confirmation requires its own explicit approval at § 8 Path A, after the target is known and the mutation preview is on screen.

### 8. Publish decision

After content approval, ask the user where — if anywhere — to publish the report:

> Report is ready. Would you like me to post it as a comment on a work item? Give me the work-item ID, or say "skip" to keep the report in chat only.

If the user named a target in their initial invocation ("post to 8812"), reuse it here — phrase the ask as *"I'll post it as a comment on #8812 — confirm, give me a different ID, or say 'skip'."* rather than re-asking from scratch.

**Path A — user supplies a work-item ID:**

1. Enrich the target: call `wit_get_work_items_batch_by_ids({ ids: [targetWorkItemId], project })` once for the title. If the call errors or the ID is missing from the response, report the problem; the content is still available in chat; ask for a different ID or offer the skip path.
2. Render the mutation preview (per `mutation-confirmation.md`):

   ```
   **About to post the approved report as a comment on [#<targetWorkItemId> <targetTitle>](<ticketUrl>).** Format: Markdown.

   Confirm?
   ```

   `ticketUrl` is `${orgUrl}/${project}/_workitems/edit/${targetWorkItemId}`.
3. Wait for an explicit affirmative verb ("post", "publish", "ship it", "approved", or equivalent phrasing in the language the user is writing in). Silence, "ok", "looks fine" — none of those count. If the user refuses or pivots to skip at this gate ("don't post", "hold off", "actually skip", "forget it", "never mind" — or the same intent in the user's language), fall through to Path B: end without mutation, reply with the skip-path confirmation, do not re-prompt for a target.
4. On explicit approval, call:

   ```
   wit_add_work_item_comment({
     workItemId: targetWorkItemId,
     comment: <approved body>,
     format: "Markdown",   // always explicit — never rely on the MS schema default
     project
   })
   ```

5. Capture the `id` from the response. Continue to § 9.

If the user changes the target ID mid-publish-flow, repeat enrichment for the new ID and re-render the mutation preview.

**Path B — user says "skip" / "just the report" / equivalent:**

No mutation. Reply with a short confirmation that the report is ready in the chat above and the user can copy or reuse it as they need. Skip § 9 entirely.

### 9. Reply with deep link (post path only)

Only runs when § 8 Path A produced a posted comment. Construct:

- `ticketUrl`  = `${orgUrl}/${project}/_workitems/edit/${targetWorkItemId}`
- `commentUrl` = `${ticketUrl}?focusedCommentId=${commentId}`

Both URLs are deterministic — never scrape MS's response `url` field (it is a REST API URL, not a UI deep link).

Reply in natural language tuned to the moment, with one non-negotiable requirement: the reply must include the `commentUrl` as a Markdown hyperlink so the user can jump straight to the posted report. Include `ticketUrl` too when it aids the reader; how the reply is phrased is up to the moment.

## Style — the report body

The only section of this document that prescribes content structure. Markdown hygiene and reference conventions still come from `azdo-comment-style.md`; this section adds the narrative shape on top.

### Structure

Exactly this Markdown, no more, no less:

```markdown
## Achievements of the Last Sprint: <previousName>

<Paragraph 1 — outcome against the stated sprint goal (or headline achievement when no goal was set)>

<Paragraph 2 — supporting objective or strongest parallel stream feeding the main goal>

<Paragraph 3 — wider improvements delivered alongside the main thrust, framed as context>

## Goals for the Current Sprint: <currentName>

<Paragraph 1 — primary outcome the team is going after, tied to the stated goal>

<Paragraph 2 — secondary objective or parallel stream supporting the main goal>

<Paragraph 3 — wider improvements planned alongside the main thrust>
```

Two sections. Three paragraphs each. No other headings, no sub-headings, no preamble, no sign-off.

### Business-value framing

Every paragraph answers "why does this matter?" before "what was done?". Lead with the stakeholder outcome — the capability delivered, the risk reduced, the experience improved — and only then, if space permits, reference the work that produced it. Tickets are evidence, not the storyline.

Prioritise paragraphs by alignment to the sprint goal:

- **Paragraph 1** carries the goal-aligned outcome. For the previous sprint, lead with whether the stated goal was met (using `get_sprint_goal.goalAchieved` when available) and the headline value the team delivered against it. For the current sprint, lead with the primary outcome the team is going after. This paragraph earns the most specificity.
- **Paragraph 2** picks up the next-strongest theme: a secondary objective the team set, or work that indirectly enables the main goal (foundational infrastructure, design investigation before build, unblocking dependencies).
- **Paragraph 3** frames the remaining work as wider improvements delivered alongside the main thrust — positioned as context rather than headline. Phrase it as *"alongside the main focus, the sprint also advanced …"* and name real themes drawn from the remaining tickets. Do not pad if only one real theme exists; say so honestly.

Balance: reflect as much of the fetched work as the narrative honestly supports, but always in priority order. A paragraph that leads with "we closed 14 tickets across X and Y" is a shopping list, not a report — reframe as outcome.

### Voice and length

- **Tone:** professional, neutral, stakeholder-oriented. Written for a product owner or executive reader who will not open a single ticket.
- **Length:** two to three sentences per paragraph.
- **Form:** continuous prose only.
- **Themes:** two to three per section, derived from the actual tickets fetched. Do not reuse content between paragraphs.
- **Outcome-focused:** describe results and intent, not the tools or the process that produced them.

### Hard rules

- DO NOT list ticket IDs or ticket titles anywhere in the body.
- DO NOT use bullet points anywhere in the body.
- DO NOT impose artificial categories such as "infrastructure / architecture / design".
- DO NOT list tools as outcomes ("we used Azure DevOps", "we ran migrations") — describe the result.
- DO NOT fabricate achievements or goals not supported by the fetched tickets or the user-provided goals.
- ALWAYS lead each paragraph with the value or outcome, not an enumeration of artefacts. Tickets are evidence, not the storyline.
- ALWAYS prioritise paragraphs by alignment to the sprint goal when one is available; when none is available, prioritise by observed impact.
- ALWAYS return exactly two sections, three paragraphs each.

### Anti-patterns

- "This sprint focused on infrastructure, architecture and design." → too generic; surface the real themes.
- Three paragraphs that mirror the ticket list mechanically ("We closed ticket X. We closed ticket Y.") → reframe as narrative.
- "We closed 14 tickets across Mitosis migration and CI updates." → ticket-count shopping list, no value framing. Reframe as outcome: "We accelerated multi-framework adoption by migrating layout components to Mitosis, while hardening CI against dependency drift."
- Paragraph 3 as an empty container ("This paragraph covers everything else that happened.") → if the remaining work is genuinely maintenance-scale, say so honestly rather than padding.
- Overly technical implementation detail ("refactored the Redux reducer to normalise the cart state shape") → one level up for a stakeholder reader.
- Sign-offs and salutations ("Hi team,", "Best,") → this is a work-item comment, not an email.

## Errors

- `get_azdo_context` returns `null` for required coordinates the user didn't supply → ask for the missing field, do not proceed.
- `list_recent_iterations` returns `isError: true` → surface the raw error text verbatim and stop.
- `get_sprint_goal` returns `null` → soft-failure, continue with the fallback path described in § 3. Not an error condition.
- `get_sprint_goal` returns `isError: true` → surface the raw error text; do not proceed with that iteration's goal-driven narrative. The other iteration's goal and all ticket-level work is still usable.
- `wit_get_work_items_for_iteration` fails on either iteration → surface the error; do not fall back to the other iteration silently. Offer the user the option to continue with the surviving iteration only.
- `wit_get_work_items_batch_by_ids` fails for the combined ticket fetch → surface the error and stop. No partial report.
- `wit_get_work_items_batch_by_ids` fails for the target enrichment in § 8 Path A → report the failure, keep the content available in chat, and offer the user a different ID or the skip path. The mutation never fires, but the report is not lost.
- `wit_add_work_item_comment` returns `isError: true` or throws → surface the raw error verbatim, do **not** retry silently, do **not** claim the report was posted. Follow `mutation-confirmation.md` § Error handling.
- Partial failure after approval (e.g. the post succeeded but the reply link can't be constructed) — report exactly what landed, with the comment ID if available, and what did not. Never paper over.

## Never

- Never call `wit_add_work_item_comment` without an explicit affirmative verb from the user in *this* invocation.
- Never invent a `targetWorkItemId`, an iteration, a ticket, an achievement, or a goal.
- Never list ticket IDs or titles in the report body.
- Never use bullet points in the report body.
- Never rely on MS's schema default for `format` — pass `"Markdown"` explicitly.
- Never post an empty-after-trim body.
- Never scrape the reply URLs from MS's response — always construct them from `{ orgUrl, project, targetWorkItemId, commentId }`.
- Never fall back to REST, `curl`, `fetch`, or any non-MCP path to AzDO.
- Never skip the `writing-quality.md` re-read step before showing the preview.
