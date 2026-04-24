# Writing Quality

Every piece of prose generated in this repository — commit messages, PR descriptions, code comments, documentation, Azure DevOps work-item titles/descriptions/acceptance criteria/comments, sprint reports, skill outputs, chat replies the user will paste somewhere — must be **well-structured, grammatically and lexically correct British English**, regardless of the language the user used in their request.

This is a quality floor, not a style voice. Authors (human or agent) keep their voice on top of it.

## Strict

- **British English spelling and vocabulary.** `organisation`, `behaviour`, `standardise`, `colour`, `recognise`, `prioritise`, `analyse`. Never mix US and UK spellings inside one artefact.
- **No code-switching.** No stray words or phrases from the user's input language bleeding into the output. If the user wrote in Russian, French, or Spanish, the generated artefact is still fully in English — no "да", no "enfin", no transliterations.
- **No typos, grammar errors, or broken punctuation.** Subject/verb agreement, article usage, comma splices, run-ons, mismatched tenses — re-read and fix before shipping.
- **Well-formed Markdown.** No unclosed `**bold**`, no broken `[link](url)`, no mismatched list markers, no orphan code-fence lines, no inconsistent bullet indentation. If the target renderer is AzDO, Chrome, VS Code, or terminal, the syntax must render cleanly in all of them.

## Validation step

Before finalising any generated artefact — in particular before a mutation (commit, `wit_create_work_item`, `wit_add_work_item_comment`, etc.) or before presenting a preview to the user — re-read the entire artefact end-to-end and verify the four strict bullets above. This is not optional. Skipping the re-read because the draft "looks fine" is how code-switching and grammar slips ship.

For mutation skills, this validation runs **before** the preview is shown to the user. The preview they approve is the final artefact — it must already be clean.

## Not about voice

The rule floors correctness, not style. It does not mandate:

- formal vs. casual tone (both are fine when appropriate to the artefact),
- short vs. long sentences,
- Oxford comma vs. no Oxford comma (be consistent within an artefact),
- any particular vocabulary beyond the British/American split.

Skill-specific style — signal-first comments, narrative report shape, commit-body compactness — lives in the skill or a topic rule and composes on top of this floor.

## Scope

Every authored artefact generated via this repository's agent workflows. If an artefact is purely a copy-paste of the user's text (e.g. the user provided a commit body verbatim and asked for it to be committed as-is), obvious typos in the user's text should still be flagged back to them — but their phrasing is not rewritten without permission.
