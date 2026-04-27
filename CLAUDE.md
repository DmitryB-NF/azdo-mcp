# AzDo MCP — Agent Instructions

Base instructions for all agents working in this repository (primarily Claude
Code today; multi-agent compatibility is a future goal). All work artefacts
— commit messages, code comments, PR descriptions, Azure DevOps work-item
titles / descriptions / acceptance criteria / comments, sprint reports,
documentation — must be in **British English** (per
[`writing-quality.md`](.claude/rules/writing-quality.md)).

Chat with the user is in whatever language the user is writing in. The
language of the chat does not affect the language of the artefacts.

## Rules layout

Topic-specific rules live in `.claude/rules/` and are auto-loaded by Claude
Code alongside this file. Add a new file per topic; keep each under ~200
lines. Current rules:

- [`commit-policy.md`](.claude/rules/commit-policy.md) — commit header, body, trailer, forbidden patterns, examples.
- [`review-gate.md`](.claude/rules/review-gate.md) — pre-commit approval workflow; explicit user approval is mandatory, automated review is optional per commit.
- [`mutation-confirmation.md`](.claude/rules/mutation-confirmation.md) — every skill that mutates Azure DevOps state must render a preview and receive explicit user approval before issuing a mutating tool call; silence is not approval.
- [`writing-quality.md`](.claude/rules/writing-quality.md) — project-wide floor for every generated artefact (commits, comments, reports, docs): well-structured British English, no code-switching, no typos, well-formed Markdown; validated before preview/mutation.

The skill-specific rule `azdo-comment-style.md` (comment-body Markdown hygiene) is kept in `.claude/rules/` and referenced from `azdo-add-comment` and `azdo-sprint-report` — the two skills that post comments — so it enters context only when one of them is invoked rather than on every turn.
