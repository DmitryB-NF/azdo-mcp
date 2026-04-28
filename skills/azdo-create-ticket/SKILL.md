---
name: azdo-create-ticket
description: Draft and create a new Azure DevOps work item — Bug, Task, User Story, Feature, Epic, or any other type configured on the project — optionally linked to existing tickets with typed relationships (Parent, Child, Related, Predecessor, Successor, Tests, Tested By, Affects, Affected By, Duplicate, Duplicate Of). Use when the user asks to "create", "draft", "open", "raise", "file", or "add" a ticket, work item, bug, story, task, feature, or epic in Azure DevOps — including phrasings like "create a follow-up linked as Related to 12345" or "draft a child of 67890". Always previews the pending mutation and requires explicit user approval before writing anything to Azure DevOps.
---

# /azdo-create-ticket

Turn a short conversational request into an approved Azure DevOps work-item create — optionally pre-wired with typed links — in a single turn. No browser. No guesses. No unapproved mutations.

## Workflow

Follow the instructions in [`workflow.md`](workflow.md) and [`field-reference.md`](field-reference.md). If the user named link targets, also follow [`link-validation.md`](link-validation.md).

## Applicable rules

This skill composes on top of the repo-wide rules and does not restate them:

- [`mutation-confirmation.md`](../../rules/mutation-confirmation.md) — preview, edit loop, explicit-verb gate before the create, honest partial-failure reporting.
- [`writing-quality.md`](../../rules/writing-quality.md) — British English re-read of every drafted field before the preview is shown.

## Shape, at a glance

Resolve coordinates → optional context-read → draft → optional link intent → preview → edit loop → mutate → reply.
