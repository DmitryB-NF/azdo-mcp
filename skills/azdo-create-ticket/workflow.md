# /azdo-create-ticket — workflow

Detailed call sequence and pre-create errors for `/azdo-create-ticket`. The entry [`SKILL.md`](SKILL.md) carries the description and applicable rules. Field specifications live in [`field-reference.md`](field-reference.md); link-intent and partial-failure handling live in [`link-validation.md`](link-validation.md). They are not restated here.

Bare tool names below (`wit_create_work_item`, `wit_work_items_link`, `wit_get_work_items_batch_by_ids`, `work_get_team_settings`, `get_azdo_context`) are server IDs; invoke with the `mcp__azdo__` prefix. If `mcp__azdo__*` tools are missing, the server isn't connected — report and stop.

## Call sequence

### 1. Resolve session coordinates

Call `get_azdo_context` **once per invocation** and cache `{ project, team, orgUrl, user }` for the rest of the turn.

- If the user named a project in their message, prefer that over the default.
- If `project` is `null` after the lookup and the user didn't name one, **ask the user for the project by name**. Never invent a value. (Picker UX for projects is deferred to a future story; free-text prompt is the current contract.)
- `team` is required **only when area-path resolution falls to `work_get_team_settings`** — i.e. the user did not supply `System.AreaPath` verbatim (see [`field-reference.md § areaPath`](field-reference.md)). When the user named an area path directly, team is not needed for create and the skill does not ask. When area-path resolution does need team and `team` came back `null`, ask the user for the team before calling `work_get_team_settings`.
- `orgUrl` is always a non-empty string — use it to construct the reply URL (§ 8).
- `user.email` may be `null` (the `AZDO_USER_EMAIL` env is optional). When present, use it as the default assignee; when `null`, the assignee step (see [`field-reference.md § assignedTo`](field-reference.md)) asks once — if the user skips, the ticket is created unassigned (the assignee field is omitted from the payload).

### 2. Optional context-read

If the user referenced existing work items for context ("pull feature 12345 and draft a follow-up"):

- Call `wit_get_work_items_batch_by_ids({ ids: [<referenced>], expand: "relations", project })` **once**.
- If any referenced ID is missing from the response (not just errors — silently-dropped entries too), report the invalid IDs to the user and ask for correction **before drafting**. Don't draft blind against partial context.
- Use the returned titles / descriptions / relations to inform the draft.
- Do **not** speculatively fetch tickets the user didn't name.

### 3. Draft

Compose the create payload. Read [`field-reference.md`](field-reference.md) for the full specification of mandatory and optional fields — `workItemType`, `title`, `description`, `acceptanceCriteria`, `areaPath`, `assignedTo`, `priority`, `storyPoints`, plus optional extras. Each field has its own resolution rules (defaults, suggested-vs-default labelling, opt-out paths) that must not be skipped.

### 4. Link intent (optional branch)

When the user named link targets, follow [`link-validation.md`](link-validation.md). The file covers extraction and conflict detection, deduplication, valid type values, the all-or-nothing pre-validation gate, and capturing target titles for the preview. Skip this step entirely when the user named no link targets.

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

`Project`, `Area`, `Type`, `Title`, `Priority`, `Description`, and `Acceptance Criteria` are always shown. `Assignee` is shown with the resolved email or the word `unassigned` — both states are legal and previewable. `Story Points` is shown when the work-item type uses the field (see [`field-reference.md § storyPoints`](field-reference.md)). Drop the `Extras:` / `Links:` sections if they're empty. Do not show anything that isn't being sent.

Fill-in values are always labelled so the user knows which fields need a glance:

- `Assignee` when `user.email` was used → `(default: <email>)`.
- `Priority` and `Story Points` when the skill inferred from the draft content → `(suggested: N — short reasoning)`. When the draft had no signal to infer from → `(default: N)` instead.
- If the user explicitly supplied the value in their message, show no annotation — it's their input, not a fill-in.

If the user changes a suggested/default in the edit loop, drop the annotation on the next preview render — it now reflects their choice.

Every ticket reference in the preview — link targets, context-read summaries, anything with a numeric work-item ID — is rendered as a full Markdown hyperlink `[#<id>](<orgUrl>/<project>/_workitems/edit/<id>)`, never bare `#<id>`. Bare `#<id>` gets auto-linked to GitHub by chat UIs and sends the user to the wrong place.

Close the preview with an explicit ask: "Create as-is, or what would you like to change?"

### 6. Edit loop

If the user proposes edits — title tweak, tag change, swap `Related` → `Parent`, add/drop a link, etc. — apply them, re-run the pre-validation gate **if link targets changed** (see [`link-validation.md`](link-validation.md)), and re-render the full preview. Wait again.

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

The `format` attribute on each field follows empirically verified rules — see [`field-reference.md § Field-format rules`](field-reference.md) for the full table and the rationale (`System.Title` MUST carry `format: "Html"`; rich-text prose fields take `format: "Markdown"`; all other fields send no `format` attribute). Do not improvise.

`System.AssignedTo` takes the user's email (or display name); AzDO resolves it to the identity. `Priority` and `StoryPoints` are integer-backed but the MS schema requires `value: string` so send them as stringified numbers.

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

One batch call — never one per link. On failure of this call after the create succeeded, follow the partial-failure shape in [`link-validation.md § Partial failure (post-create)`](link-validation.md).

### 8. Reply

Construct the URL: `${orgUrl}/${project}/_workitems/edit/${id}`. MS's response is not guaranteed to carry a URL; always build it yourself.

Report success briefly. The ticket reference in the reply MUST be a full Markdown link — `[#<id>](<url>)` — never bare `#<id>`, because bare `#<id>` gets auto-linked to GitHub by chat UIs and sends the reader to the wrong service. Include type and title alongside. If links landed, confirm the count; the same Markdown-link rule applies to any referenced linked ticket.

## Errors before the create

Any `isError: true` before the create call — context-read, pre-validation, resolution lookup — is surfaced verbatim to the user, and **the ticket is not created**. Fail fast; the mutation never fires.

Exception: a resolvable error that clearly names its fix (e.g. a typo in a field name the user can correct) may be re-tried after the user confirms the correction — same preview → approve cycle.

## Skill-specific don'ts

General discipline — explicit-verb gate before any mutation, no REST fallback — lives in the topic rules. Only the create-specific constraints belong here:

- Never invent a project, type, title, field value, or link target.
- Never scrape the ticket URL from MS's response — always construct it from `{ orgUrl, project, id }`.
- Never silently retry a failed link batch — see [`link-validation.md § Partial failure (post-create)`](link-validation.md).
