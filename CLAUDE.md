# AzDo MCP — Agent Instructions

Base instructions for all agents working in this repository (primarily Claude
Code today; multi-agent compatibility is a future goal). All work artefacts
— commit messages, code comments, PR descriptions, Azure DevOps work-item
titles / descriptions / acceptance criteria / comments, sprint reports,
documentation — must be in **British English** (per
[`writing-quality.md`](rules/writing-quality.md)).

Chat with the user is in whatever language the user is writing in. The
language of the chat does not affect the language of the artefacts.

## Layout

This repo is also a Claude Code plugin. The canonical locations are at the
repo root:

- `skills/<skill>/SKILL.md` — skill bodies and supporting files.
- `rules/<rule>.md` — topic-specific rules referenced by skills.
- `.claude-plugin/plugin.json` — plugin manifest with the MCP server and
  `userConfig` for installs in other projects.

For in-repo development, `.claude/skills/azdo-*` and `.claude/rules/*.md`
are symlinks into `skills/` and `rules/`, so Claude Code auto-loads them
alongside this file when working here. Edits go into the canonical files
under `skills/` and `rules/`; the symlinks follow.

Skills reference rules via `../../rules/<file>.md` from
`skills/<skill>/SKILL.md`. Add a new rule file per topic; keep each under
~200 lines. Current rules:

- [`mutation-confirmation.md`](rules/mutation-confirmation.md) — every skill that mutates Azure DevOps state must render a preview and receive explicit user approval before issuing a mutating tool call; silence is not approval.
- [`writing-quality.md`](rules/writing-quality.md) — project-wide floor for every generated artefact (commits, comments, reports, docs): well-structured British English, no code-switching, no typos, well-formed Markdown; validated before preview/mutation.

The skill-specific rule `azdo-comment-style.md` (comment-body Markdown hygiene) lives at [`rules/azdo-comment-style.md`](rules/azdo-comment-style.md) and is referenced from `azdo-add-comment` and `azdo-sprint-report` — the two skills that post comments — so it enters context only when one of them is invoked rather than on every turn.
