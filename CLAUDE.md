# AzDO MCP — Agent Instructions

Two rules apply to every agent working with this repository or this
plugin. They are not optional and not negotiable per session.

## 1. Artefact language — British English

All authored artefacts — commit messages, code comments, PR descriptions,
Azure DevOps work-item titles / descriptions / acceptance criteria /
comments, sprint reports, documentation — must be in **British English**,
regardless of the language of the chat. The chat itself follows whatever
language the user is writing in; this never affects artefact language.

Full quality floor — spelling, grammar, Markdown hygiene, validation
step — in [`rules/writing-quality.md`](rules/writing-quality.md).

## 2. Mutation approval — explicit verb required

Never mutate Azure DevOps state — create, update, delete, comment, link,
unlink, or any other write — without an **explicit affirmative verb in
the user's most recent message**. Preview the pending change first;
silence, "looks good", and approvals from earlier in the session do not
count.

Full procedure — preview shape, edit-loop mechanics, error handling,
partial-failure honesty — in [`rules/mutation-confirmation.md`](rules/mutation-confirmation.md).
