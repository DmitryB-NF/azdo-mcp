---
name: azdo-add-comment
description: Post a Markdown comment to an Azure DevOps work item — status update, follow-up note, sprint report, or decision record. Use when the user asks to "comment", "post", "add a note", "reply to", or "add a comment on" a ticket / work item / story / bug / feature / epic. Shows a rendered preview the user can iterate on and requires an explicit affirmative verb before posting. Replies with a link that jumps straight to the posted comment.
---

# /azdo-add-comment

Post a single Markdown comment to an AzDO work item. Preview → approve → post → return a deep link so the user can jump straight to the comment they just published.

## Inputs

| Input            | Required | Shape                                                                                                |
|------------------|----------|------------------------------------------------------------------------------------------------------|
| `workItemId`     | yes      | Positive integer. Must identify a real work item in the target project.                              |
| `body`           | yes      | Markdown string. Non-empty after trimming. Max length: AzDO field limit (~32k chars) — refuse above. |
| `project`        | no       | Override of the configured default. Usually resolved from `get_azdo_context`.                        |
| `format`         | no       | `"Markdown"` (default) or `"Html"`. Always send explicitly in the tool call — do not rely on schema default. |

If the user invokes the skill without `workItemId` or `body`, ask for the missing input(s) before drafting. No placeholders, no invented targets.

## Outputs

On success the skill replies in free natural language, tuned to the moment, with **one non-negotiable requirement**: the reply must include a deep link that opens the posted comment directly in the AzDO UI.

Build the link as `${orgUrl}/${project}/_workitems/edit/${workItemId}?focusedCommentId=${commentId}` from `{ orgUrl, project, workItemId, commentId }` — never use the MS tool's response `url`, which is a REST API URL, not a UI link. Embed it as a Markdown hyperlink in the confirmation. How the link is phrased ("posted — jump to it", "done, see [the comment](...)", etc.) is up to the moment; only the link itself is mandatory. No rigid template.

## Workflow

Follow the instructions in [`workflow.md`](workflow.md).

## Applicable rules

This skill composes on top of the repo-wide rules and does not restate them:

- [`mutation-confirmation.md`](../../rules/mutation-confirmation.md) — preview, edit loop, explicit-verb gate before any mutation.
- [`azdo-comment-style.md`](../../rules/azdo-comment-style.md) — Markdown hygiene, body shape, empty-body refusal, explicit `format` parameter.
- [`writing-quality.md`](../../rules/writing-quality.md) — British English re-read before the preview is shown.

## Shape, at a glance

Resolve coordinates → enrich target → validate body → normalise and preview → edit loop → mutate → reply with deep links.
