# /azdo-create-ticket — field reference

Full specification of every field the skill writes to AzDO via `wit_create_work_item`, plus the empirically verified format rules for the payload. Read this before drafting (§3 of [`workflow.md`](workflow.md)) and before composing the mutate payload (§7 of [`workflow.md`](workflow.md)).

## Mandatory fields

Ask for any the user didn't supply; never invent or leave blank.

### `workItemType`

A type valid for the target project (`Bug`, `Task`, `User Story`, `Feature`, `Epic`, etc.).

### `title` (`System.Title`)

**Plain text only.** No Markdown syntax: no backticks, no `*`/`_`, no `[]()` links, no `#` headings, no escape sequences. AzDO treats `System.Title` as a literal string and will reject or malformat any Markdown. If the user drafted a title with Markdown, strip it before drafting; if the stripped text loses meaning, ask. Concise, imperative, no trailing period.

### `description` (`System.Description`)

Markdown. Quote context faithfully; don't fabricate facts that weren't in the user's message or the context-read.

### `acceptanceCriteria` (`Microsoft.VSTS.Common.AcceptanceCriteria`)

Markdown. Project policy: **every** work item created via this skill must carry non-empty acceptance criteria. If the user's intent implies testable outcomes, draft them and show in preview; if the intent is too vague to write meaningful AC, ask the user before drafting. Bullet list of verifiable conditions is the expected shape, but any clear Markdown is fine. Never ship `TBD`, `n/a`, or a placeholder — if the user insists on "no AC", stop and surface the policy conflict.

### `areaPath` (`System.AreaPath`)

The backslash-delimited path that determines which team's backlog the new ticket lands on (format: `<project>\<area>[\<sub-area>…]`). Resolve in this order:

1. If the user named an area path verbatim, use it.
2. Otherwise call `work_get_team_settings({ project, team })` **once** and read the default area path from the returned team settings (the AzDO field carrying the `\`-delimited area). Cache the value for the rest of the turn.
3. If the team-settings response has no usable default area, ask the user.

Never create a ticket without `System.AreaPath` — relying on the project-root default puts it on nobody's backlog and is the concrete failure mode we are avoiding.

### `assignedTo` (`System.AssignedTo`)

Prefer an assignee, don't insist:

- If `user.email` from `get_azdo_context` is non-null, use it as the default in the preview. Surface it to the user as "(default: `<email>`) — change, confirm, or drop" so a one-word reply can override it, keep it, or remove it.
- If `user.email` is `null` (the `AZDO_USER_EMAIL` env is not set), ask once for an assignee email before drafting. If the user names someone, use that. If the user skips or says "unassigned" / "leave it" / "skip", proceed without the field — **omit `System.AssignedTo` from the `fields[]` payload entirely** (do not send an empty string; AzDO rejects that).
- If the user references a teammate by name and you cannot resolve to an email deterministically (no context-read, no env hint), ask for the full email rather than guessing. If the user doesn't supply one, fall back to the same skip-path as above. (Full picker UX arrives with Story 3.4 `configureCoreTools` wiring.)
- Never fabricate an email. Silence at the initial prompt = skip, not guess.

### `priority` (`Microsoft.VSTS.Common.Priority`)

An integer 1–4 (1 = highest, 4 = lowest). Skill **infers a suggested priority** from the drafted title, description, and AC, and surfaces it in the preview as "Priority: N (suggested)". Heuristics: production-breaking / security / active-blocker language → 1; clear user-facing bug or time-pressured work → 2; routine feature, cleanup with deadline → 3; nice-to-have, tech debt, no pressure → 4. When signals are ambiguous, fall back to 2 and label it "Priority: 2 (default)" instead of "suggested". Never silently omit the field — unprioritised tickets clutter triage boards. One-word override from the user replaces the value.

### `storyPoints` (`Microsoft.VSTS.Scheduling.StoryPoints`)

A numeric estimate (no assumption of Fibonacci or any other scale — whatever the team uses). Skill **infers a suggested size** from the drafted description and AC — rough scope, number of touchpoints, breadth of work — and surfaces it in the preview as "Story Points: N (suggested)". When the draft is too sparse to reason about, fall back to `3` and label it "Story Points: 3 (default)". Shown only for types that use the field (`User Story`, `Feature`, `Epic`, and any project type that inherits the Scheduling template); omit and drop the line for `Task` / `Bug` on templates that use `OriginalEstimate` instead. The user can change the number or say "no story points" to explicitly opt out.

## Optional extras

Only include if the user asked for them: `System.Tags`, iteration path, any project-specific custom field. `OriginalEstimate` / `RemainingWork` for task-style items if the user provides them.

## Field-format rules — empirically verified in production

Each entry in the `fields[]` array of `wit_create_work_item` may carry a `format` attribute. The rules below are empirical, not derived from MS docs:

- **`System.Title` MUST carry `format: "Html"`.** Omitting it causes AzDO to reject the patch with `"Operation of changing value type is not supported for the field System.Title"` (the error text is misleading — the underlying cause is MS's schema defaulting format to Markdown, which poisons this plain-string field).
- **Rich-text prose fields** — `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `Microsoft.VSTS.TCM.ReproSteps`, any HTML-rich field on the process template — take `format: "Markdown"` when sending Markdown source, or `format: "Html"` when sending raw HTML.
- **All other fields** — `System.AreaPath`, `System.AssignedTo`, `Microsoft.VSTS.Common.Priority`, `Microsoft.VSTS.Scheduling.StoryPoints`, any non-prose custom field — send **no `format` attribute**. MS does not auto-apply the schema default server-side for these; omitting `format` is the working shape.

`Priority` and `StoryPoints` are integer-backed but the MS schema requires `value: string` — send them as stringified numbers.

Extras follow the same rule — attach `format: "Markdown"` only when the field is known to be rich-text prose; otherwise omit the attribute entirely.
