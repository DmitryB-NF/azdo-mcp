---
name: azdo-create-ticket
description: Draft and create a new Azure DevOps work item — Bug, Task, User Story, Feature, Epic, or any other type configured on the project — optionally linked to existing tickets with typed relationships (Parent, Child, Related, Predecessor, Successor, Tests, Tested By, Affects, Affected By, Duplicate, Duplicate Of). Use when the user asks to "create", "draft", "open", "raise", "file", or "add" a ticket, work item, bug, story, task, feature, or epic in Azure DevOps — including phrasings like "create a follow-up linked as Related to 8812" or "draft a child of 8800". Always previews the pending mutation and requires explicit user approval before writing anything to Azure DevOps.
---

# /azdo-create-ticket

Turn a short conversational request into an approved Azure DevOps work-item create — optionally pre-wired with typed links — in a single turn. No browser. No guesses. No unapproved mutations.

## Preconditions

All tools below are registered on the `azdo` MCP server. Invoke them with the `mcp__azdo__` prefix — `wit_create_work_item` becomes `mcp__azdo__wit_create_work_item`, `get_azdo_context` becomes `mcp__azdo__get_azdo_context`, and so on. The bare names in this document are the tool IDs on the server.

If the `mcp__azdo__*` tools are not in your available tool list, the server is not connected. **Follow `.claude/rules/azdo-mcp-connection.md`** — it pins the naming contract and the no-REST-fallback policy. Report the disconnected state to the user and stop; do not invent alternatives.

## The non-negotiable contract

This skill writes to Azure DevOps. Every invocation MUST obey `.claude/rules/mutation-confirmation.md`:

1. Gather inputs (user message + optional read-only lookups).
2. Render a **full preview** of the pending mutation.
3. Loop on edits — each edit re-renders the full preview.
4. Mutate **only on explicit affirmative verb** from the user ("create", "go", "ship it", "approved", or equivalent in the user's language). Silence is not approval. "Looks good." alone is not approval — it is acknowledgement, not an instruction. A negated affirmative is a refusal, not an approval: "don't create", "не создавай", "hold off", "not yet" — even though they contain affirmative verbs, they mean stop. Pattern-match on intent, not on substring. If in doubt, ask.

Partial failure is reported honestly — see § Partial failure.

## Call sequence

### 1. Resolve session coordinates

Call `get_azdo_context` **once per invocation** and cache `{ project, team, orgUrl, user }` for the rest of the turn.

- If the user named a project in their message, prefer that over the default.
- If `project` is `null` after the lookup and the user didn't name one, **ask the user for the project by name**. Never invent a value. (Picker UX for projects is deferred to a future story; free-text prompt is the current contract.)
- `team` is required **only when area-path resolution falls to `work_get_team_settings`** — i.e. the user did not supply `System.AreaPath` verbatim (§ 3 Area Path). When the user named an area path directly, team is not needed for create and the skill does not ask. When area-path resolution does need team and `team` came back `null`, ask the user for the team before calling `work_get_team_settings`.
- `orgUrl` is always a non-empty string — use it to construct the reply URL (§ 6).
- `user.email` may be `null` (the `AZDO_USER_EMAIL` env is optional). When present, use it as the default assignee; when `null`, the assignee step (§ 3 Assignee) asks once — if the user skips, the ticket is created unassigned (the assignee field is omitted from the payload).

### 2. Optional context-read

If the user referenced existing work items for context ("pull feature 8812 and draft a follow-up"):

- Call `wit_get_work_items_batch_by_ids({ ids: [<referenced>], expand: "relations", project })` **once**.
- If any referenced ID is missing from the response (not just errors — silently-dropped entries too), report the invalid IDs to the user and ask for correction **before drafting**. Don't draft blind against partial context.
- Use the returned titles / descriptions / relations to inform the draft.
- Do **not** speculatively fetch tickets the user didn't name.

### 3. Draft

Compose the create payload.

**Mandatory fields — ask for any the user didn't supply; never invent or leave blank:**

- `workItemType` — a type valid for the target project (`Bug`, `Task`, `User Story`, `Feature`, `Epic`, etc.).
- `title` (`System.Title`) — **plain text only**. No Markdown syntax: no backticks, no `*`/`_`, no `[]()` links, no `#` headings, no escape sequences. AzDO treats `System.Title` as a literal string and will reject or malformat any Markdown. If the user drafted a title with Markdown, strip it before drafting; if the stripped text loses meaning, ask. Concise, imperative, no trailing period.
- `description` (`System.Description`) — Markdown. Quote context faithfully; don't fabricate facts that weren't in the user's message or the context-read.
- `acceptanceCriteria` (`Microsoft.VSTS.Common.AcceptanceCriteria`) — Markdown. Project policy: **every** work item created via this skill must carry non-empty acceptance criteria. If the user's intent implies testable outcomes, draft them and show in preview; if the intent is too vague to write meaningful AC, ask the user before drafting. Bullet list of verifiable conditions is the expected shape, but any clear Markdown is fine. Never ship `TBD`, `n/a`, or a placeholder — if the user insists on "no AC", stop and surface the policy conflict.
- `areaPath` (`System.AreaPath`) — the backslash-delimited path that determines which team's backlog the new ticket lands on (format: `<project>\<area>[\<sub-area>…]`). Resolve in this order:
    1. If the user named an area path verbatim, use it.
    2. Otherwise call `work_get_team_settings({ project, team })` **once** and read the default area path from the returned team settings (the AzDO field carrying the `\`-delimited area). Cache the value for the rest of the turn.
    3. If the team-settings response has no usable default area, ask the user.
  Never create a ticket without `System.AreaPath` — relying on the project-root default puts it on nobody's backlog and is the concrete failure mode we are avoiding.
- `assignedTo` (`System.AssignedTo`) — prefer an assignee, don't insist:
    - If `user.email` from `get_azdo_context` is non-null, use it as the default in the preview. Surface it to the user as "(default: `<email>`) — change, confirm, or drop" so a one-word reply can override it, keep it, or remove it.
    - If `user.email` is `null` (the `AZDO_USER_EMAIL` env is not set), ask once for an assignee email before drafting. If the user names someone, use that. If the user skips or says "unassigned" / "leave it" / "skip", proceed without the field — **omit `System.AssignedTo` from the `fields[]` payload entirely** (do not send an empty string; AzDO rejects that).
    - If the user references a teammate by name and you cannot resolve to an email deterministically (no context-read, no env hint), ask for the full email rather than guessing. If the user doesn't supply one, fall back to the same skip-path as above. (Full picker UX arrives with Story 3.4 `configureCoreTools` wiring.)
    - Never fabricate an email. Silence at the initial prompt = skip, not guess.
- `priority` (`Microsoft.VSTS.Common.Priority`) — an integer 1–4 (1 = highest, 4 = lowest). Skill **infers a suggested priority** from the drafted title, description, and AC, and surfaces it in the preview as "Priority: N (suggested)". Heuristics: production-breaking / security / active-blocker language → 1; clear user-facing bug or time-pressured work → 2; routine feature, cleanup with deadline → 3; nice-to-have, tech debt, no pressure → 4. When signals are ambiguous, fall back to 2 and label it "Priority: 2 (default)" instead of "suggested". Never silently omit the field — unprioritized tickets clutter triage boards. One-word override from the user replaces the value.
- `storyPoints` (`Microsoft.VSTS.Scheduling.StoryPoints`) — a numeric estimate (no assumption of Fibonacci or any other scale — whatever the team uses). Skill **infers a suggested size** from the drafted description and AC — rough scope, number of touchpoints, breadth of work — and surfaces it in the preview as "Story Points: N (suggested)". When the draft is too sparse to reason about, fall back to `3` and label it "Story Points: 3 (default)". Shown only for types that use the field (`User Story`, `Feature`, `Epic`, and any project type that inherits the Scheduling template); omit and drop the line for `Task` / `Bug` on templates that use `OriginalEstimate` instead. The user can change the number or say "no story points" to explicitly opt out.

**Optional extras — only if the user asked for them:** `System.Tags`, iteration path, any project-specific custom field. `OriginalEstimate` / `RemainingWork` for task-style items if the user provides them.

### 4. Link intent (optional branch)

When the user named link targets — "linked as Related to 8812", "parent is 8800 and related to 8812, 8901", "child of 4500" — extract a list of `{ linkToId, type }` pairs. **Deduplicate before pre-validation:**

- If the same `linkToId` appears with the same `type`, collapse the duplicate silently.
- If the same `linkToId` appears with **different types** (e.g., "parent 8800 and related to 8800"), this is a conflict — report both to the user and ask which type they meant; do not pre-validate or create anything until the conflict is resolved.

Valid `type` values (MS enum, lowercase): `parent`, `child`, `related`, `predecessor`, `successor`, `tests`, `tested by`, `affects`, `affected by`, `duplicate`, `duplicate of`.

Map natural-language labels conservatively. Default to `related` only on genuine ambiguity — never silently upgrade "linked to" into `parent`/`child`.

**Pre-validation gate — all-or-nothing:**

If the proposed link list is non-empty, call `wit_get_work_items_batch_by_ids({ ids: [<all distinct linkToId>], project })` once before drafting the preview. If any target ID is missing from the response (not just errors — missing entries too), **list all invalid IDs to the user, ask for correction, and stop**. The ticket is not created when any link target is invalid. Re-run the gate after correction.

Capture each target's title from the response for the preview.

### 5. Preview

Render inline, in Markdown, ALL of the following:

```
**Draft — not yet created**

- Project:      <project>
- Area:         <areaPath>
- Type:         <workItemType>
- Title:        <title (plain text)>
- Assignee:     <email or "unassigned">   (default: user.email — change, confirm, or drop)
- Priority:     <1-4>             (suggested: N — reasoning in one short clause, or "default" if no signal)
- Story Points: <number>          (suggested: N — one-clause rationale, or "default" if no signal; say "no SP" to drop)

Description (renders as Markdown in AzDO):
<markdown source, verbatim>

Acceptance Criteria (renders as Markdown in AzDO):
<markdown source, verbatim>

Extras:
- <field>: <value>     (only if set)
- ...

Links (<N>):
- <type> → [#<linkToId>](<orgUrl>/<project>/_workitems/edit/<linkToId>) <title of target>
- ...
```

`Project`, `Area`, `Type`, `Title`, `Priority`, `Description`, and `Acceptance Criteria` are always shown. `Assignee` is shown with the resolved email or the word `unassigned` — both states are legal and previewable. `Story Points` is shown when the work-item type uses the field (see § 3 Draft). Drop the `Extras:` / `Links:` sections if they're empty. Do not show anything that isn't being sent.

Fill-in values are always labeled so the user knows which fields need a glance:

- `Assignee` when `user.email` was used → `(default: <email>)`.
- `Priority` and `Story Points` when the skill inferred from the draft content → `(suggested: N — short reasoning)`. When the draft had no signal to infer from → `(default: N)` instead.
- If the user explicitly supplied the value in their message, show no annotation — it's their input, not a fill-in.

If the user changes a suggested/default in the edit loop, drop the annotation on the next preview render — it now reflects their choice.

Every ticket reference in the preview — link targets, context-read summaries, anything with a numeric work-item ID — is rendered as a full Markdown hyperlink `[#<id>](<orgUrl>/<project>/_workitems/edit/<id>)`, never bare `#<id>`. Bare `#<id>` gets auto-linked to GitHub by chat UIs and sends the user to the wrong place.

Close the preview with an explicit ask: "Create as-is, or what would you like to change?"

### 6. Edit loop

If the user proposes edits — title tweak, tag change, swap `Related` → `Parent`, add/drop a link, etc. — apply them, re-run the pre-validation gate **if link targets changed**, and re-render the full preview. Wait again.

Proceed to step 7 only on an explicit affirmative verb.

### 7. Mutate

**Create call:**

```
wit_create_work_item({
  project,
  workItemType,
  fields: [
    { name: "System.Title",                              value: <title plain text>, format: "Html" },
    { name: "System.AreaPath",                           value: <areaPath> },
    { name: "System.AssignedTo",                         value: <email> },                             // omit entirely when unassigned
    { name: "Microsoft.VSTS.Common.Priority",            value: "<1-4>" },
    { name: "Microsoft.VSTS.Scheduling.StoryPoints",     value: "<n>" },                               // only for types that use it; drop on opt-out
    { name: "System.Description",                        value: <markdown>,         format: "Markdown" },
    { name: "Microsoft.VSTS.Common.AcceptanceCriteria",  value: <ac markdown>,      format: "Markdown" },
    // ...extras: Markdown format for rich-text prose fields; no format attribute for any other field
  ]
})
```

**Field-format rules — empirically verified in production:**

- `System.Title` MUST carry `format: "Html"`. Omitting it causes AzDO to reject the patch with `"Operation of changing value type is not supported for the field System.Title"` (the error text is misleading — the underlying cause is MS's schema defaulting format to Markdown, which poisons this plain-string field).
- **Rich-text prose fields** (`System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `Microsoft.VSTS.TCM.ReproSteps`, any HTML-rich field on the process template) → `format: "Markdown"` when sending Markdown source; `format: "Html"` when sending raw HTML.
- **All other fields** (`System.AreaPath`, `System.AssignedTo`, `Microsoft.VSTS.Common.Priority`, `Microsoft.VSTS.Scheduling.StoryPoints`, any non-prose custom field) → send **no `format` attribute**. MS does not auto-apply the schema default server-side for these; omitting format is the working shape.

`System.AssignedTo` takes the user's email (or display name); AzDO resolves it to the identity. `Priority` and `StoryPoints` are integer-backed but the MS schema requires `value: string` so send them as stringified numbers. Extras follow the same rule — attach `format: "Markdown"` only when the field is known to be rich-text prose; otherwise omit.

Capture the new work-item ID from the response.

**Link call (only if the approved preview had a Links section):**

```
wit_work_items_link({
  project,
  updates: [
    { id: <newId>, linkToId: <target1>, type: "<type>" },
    // ...one entry per approved link
  ]
})
```

One batch call — never one per link.

### 8. Reply

Construct the URL: `${orgUrl}/${project}/_workitems/edit/${id}`. MS's response is not guaranteed to carry a URL; always build it yourself.

Report success briefly. The ticket reference in the reply MUST be a full Markdown link — `[#<id>](<url>)` — never bare `#<id>`, because bare `#<id>` gets auto-linked to GitHub by chat UIs and sends the reader to the wrong service. Include type and title alongside. If links landed, confirm the count; the same Markdown-link rule applies to any referenced linked ticket.

## Partial failure

`wit_create_work_item` succeeds → new ID captured → `wit_work_items_link` then returns `isError: true` or throws:

- Reply **must** include:
  - The created ticket ID and its constructed URL.
  - The raw link-error text, verbatim.
  - A clear next-step choice for the user: **retry the full link batch**, **retry a named subset**, or **leave the ticket unlinked**.
- Do **not** retry automatically.
- Do **not** delete the created ticket to "roll back" — the user's approval was for a create, not an undo.

## Errors before the create

Any `isError: true` before the create call — context-read, pre-validation, resolution lookup — is surfaced verbatim to the user, and **the ticket is not created**. Fail fast; the mutation never fires.

Exception: a resolvable error that clearly names its fix (e.g. a typo in a field name the user can correct) may be re-tried after the user confirms the correction — same preview → approve cycle.

## Never

- Never call `wit_create_work_item` or `wit_work_items_link` without an explicit affirmative verb from the user in *this* invocation.
- Never invent a project, type, title, field value, or link target.
- Never scrape the ticket URL from MS's response — always construct it from `{ orgUrl, project, id }`.
- Never silently retry a failed link batch — ask the user.
- Never fall back to REST, `curl`, `fetch`, or any non-MCP path to AzDO.
