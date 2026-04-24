# AzDo MCP — Agent Instructions

Base instructions for all agents working in this repository (primarily Claude
Code today; multi-agent compatibility is a future goal). All communication
— commit messages, code comments, PR descriptions, chat — must be in
**English**.

## Rules layout

Topic-specific rules live in `.claude/rules/` and are auto-loaded by Claude
Code alongside this file. Add a new file per topic; keep each under ~200
lines. Current rules:

- [`commit-policy.md`](.claude/rules/commit-policy.md) — commit header, body, trailer, forbidden patterns, examples.
- [`review-gate.md`](.claude/rules/review-gate.md) — pre-commit approval workflow; explicit user approval is mandatory, automated review is optional per commit.
- [`azdo-mcp-connection.md`](.claude/rules/azdo-mcp-connection.md) — `azdo` MCP server is self-hosted from this repo on the user's local machine (no remote endpoint); `mcp__azdo__` tool-naming contract; no REST backchannel.
- [`mutation-confirmation.md`](.claude/rules/mutation-confirmation.md) — every skill that mutates Azure DevOps state must render a preview and receive explicit user approval before issuing a mutating tool call; silence is not approval.
- [`azdo-comment-style.md`](.claude/rules/azdo-comment-style.md) — Markdown hygiene and ticket-reference conventions for every comment posted via `wit_add_work_item_comment` (short paragraphs, bullets for lists, inline code for identifiers, bare `#<id>` refs, empty-body refusal, preview-rendered, format always explicit); composes on top of `mutation-confirmation.md`.
- [`writing-quality.md`](.claude/rules/writing-quality.md) — project-wide floor for every generated artefact (commits, comments, reports, docs): well-structured British English, no code-switching, no typos, well-formed Markdown; validated before preview/mutation.
