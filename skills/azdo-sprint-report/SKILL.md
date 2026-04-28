---
name: azdo-sprint-report
description: Generate a stakeholder-facing narrative sprint report — two sections covering last-sprint achievements and current-sprint goals — and optionally publish it as a Markdown comment on an Azure DevOps work item. Use when the user asks for a "sprint report", "sprint summary", "stakeholder update", "end-of-sprint report", or asks to "generate/publish the sprint report". Pulls the last two iterations, previews the rendered report, and — only if the user asks for publishing — posts after a separate explicit affirmative verb.
---

# /azdo-sprint-report

Turn the weekly sprint-report chore into a ninety-second exchange. The skill reads the previous and current iteration, drafts a narrative Markdown report for stakeholders, previews it rendered, and — if the user names a target work item — posts the report as a comment and replies with a deep link.

The report is **not** a list of tickets. It is continuous prose aimed at non-engineers, organised into two named sections: achievements of the last sprint and goals for the current sprint.

## Applicable rules

This skill composes on top of the repo-wide rules and does not restate them:

- [`writing-quality.md`](../../rules/writing-quality.md) — British English re-read of the full draft **before** the preview is shown.
- [`mutation-confirmation.md`](../../rules/mutation-confirmation.md) — preview, edit loop, explicit-verb gate for the publish path.
- [`azdo-comment-style.md`](../../rules/azdo-comment-style.md) — Markdown hygiene, bare `#<id>` refs inside the body, explicit `format` parameter, empty-body refusal.

**Optional for automatic goal ingestion (§3 of [`workflow.md`](workflow.md)):** the `keesschollaart/sprint-goal` marketplace extension plus `AZDO_PAT` scope `vso.extension.data`. When either is absent, `get_sprint_goal` returns `null` and the skill falls back gracefully to asking the user; it never hard-errors on this path.

## Inputs

Invocation is natural language; no structured arguments.

| Input              | Source                                          | Notes                                                                |
|--------------------|-------------------------------------------------|-----------------------------------------------------------------------|
| `targetWorkItemId` | user message → asked post-preview if missing    | Optional. Publishing is a post-preview step (§8 of [`workflow.md`](workflow.md)). Never invent. |
| `sprintGoals`      | user message → `get_sprint_goal` → ask if needed| Precedence below.                                                     |
| `project`, `team`  | user message → `get_azdo_context`               | `team` is required for iteration lookup; ask if null and unnamed.     |

**`targetWorkItemId` resolution.** Publishing is optional and always post-preview. The skill drafts and previews without a target. §8 of [`workflow.md`](workflow.md) asks where to publish; if the user named an ID in the initial message ("post to 12345"), reuse it there without re-asking. A configured-default target is deferred beyond MVP — it would touch `src/config.ts`, outside skill+rule scope.

**`sprintGoals` resolution** (first match wins):

1. User supplies goals in the invocation — use as-is.
2. `get_sprint_goal` returns non-null — use `goal` as the anchor sentence, `detailsPlain` for paragraph themes.
3. Neither — ask once: "What are the goals for the current sprint?" If the user insists there are no explicit goals, generate the Goals section from current-iteration ticket themes alone; do not fabricate a goal.

## Workflow

Follow the instructions in [`workflow.md`](workflow.md) and [`style.md`](style.md).

## Shape, at a glance

Resolve coordinates → fetch iterations → fetch goals → fetch tickets → identify themes and draft → preview → edit loop → publish decision (optional) → reply with deep link.
