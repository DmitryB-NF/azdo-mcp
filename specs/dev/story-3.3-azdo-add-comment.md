---
epic: 3
story: 3.3
title: /azdo-add-comment skill + project-wide comment-style rule
status: Done
---

# Story 3.3 — `/azdo-add-comment` skill + comment-style rule

**Source:** `specs/planning/epics.md` § Epic 3 § Story 3.3.

## Goal

Ship a conversational way to post a Markdown comment on an AzDO work item, with a preview the user can iterate on before publishing and a deep link to the posted comment in the reply. Compose over MS's `wit_add_work_item_comment` — no author-owned comment primitive; the scaffolded `src/tools/comments.ts` remains unused.

## Shape — skill plus rule

The skill and the rule carry different weight; shipping both keeps each file honest.

- **Skill** (`.claude/skills/azdo-add-comment/SKILL.md`) — formalises the **input/output contract**: required `workItemId` and `body`, optional `project`/`format`, explicit defaults (format = `"Markdown"`, always passed — never relying on the MS schema default), and the deterministic reply shape (comment ID + deep link `${orgUrl}/${project}/_workitems/edit/${workItemId}?focusedCommentId=${commentId}` + ticket URL). That contract does not fit in a rule — rules describe cross-cutting policy, not per-call argument schemas or return conventions.
- **Rule** (`.claude/rules/azdo-comment-style.md`) — owns the **content shape** of comment bodies, as project-wide recommendations: lead with signal, prefer short paragraphs, prefer bare `#<id>` (AzDO renders it natively — Markdown-linked refs are for chat-UI output paths like `/azdo-fetch-tickets`), prefer code-fenced identifiers, etc. Two items in the rule are strict because they are safety/UX contracts rather than style: empty-body refusal and the preview-source-not-rendered reminder. Everything else is "prefer when useful" — authors keep their voice. The rule is shared with `/azdo-sprint-report` (Story 4.1) and any future comment-posting skill.

Earlier in planning a rule-only shape was considered (abandon the skill, put everything in a rule). It didn't hold: the return contract — especially the `focusedCommentId` deep-link construction — needs a skill to encode deterministically. The research doc arguing for rule-only was deleted as superseded; this dev doc records the actual shipped design.

## Scope

**In scope:**

1. New skill `.claude/skills/azdo-add-comment/SKILL.md` with explicit input/output contract and deep-link reply shape.
2. New rule `.claude/rules/azdo-comment-style.md` with soft content-shape recommendations + two strict contracts (empty-body, preview-source-not-rendered).
3. Cross-link from `mutation-confirmation.md` to the new style rule (one line).
4. Update `CLAUDE.md` rules layout list to mention the new rule.
5. Update `specs/planning/epics.md` — Story 3.3 block reshaped to match shipped reality; FR Coverage Map and Epic 3 header reflect skill+rule shape.

**Out of scope:**

- Removing the unused `src/tools/comments.ts` stub — opportunistic cleanup, not blocking for this story.
- Any change to `/azdo-sprint-report` beyond "it will inherit the same rule when it ships in Story 4.1".
- Story 3.4 (MS core/team-listing bulk-wire) — deferred to Phase 2 per epics.md § Story 3.4.

## MS tool consumed (already wired in Epic 1)

`wit_add_work_item_comment` from `configureWorkItemTools`. No new `configure*Tools` registration.

Response fields used:
- `id` (new comment's ID) — captured and echoed back to the user.
- `createdBy`, `createdDate` — not used; AzDO UI surfaces these natively.
- `url` — the REST API URL; explicitly NOT used for the user-facing reply because it is not a UI deep link.

## Reply link shape — why `focusedCommentId`

AzDO web UI scrolls the work-item view to a given comment and highlights it when the URL includes `?focusedCommentId=<id>`. This is the current deep-link pattern used by the AzDO UI itself when you copy a comment link. The skill constructs it deterministically from `{ orgUrl, project, workItemId, commentId }`.

The work-item URL alone (`${orgUrl}/${project}/_workitems/edit/${workItemId}`) is also returned so the user has a Markdown-linked jump to the full thread, not just the single comment.

## Acceptance Criteria — Verification Plan

| AC | Verification |
|---|---|
| `.claude/skills/azdo-add-comment/SKILL.md` exists with correct front-matter | File inspection; skill appears in tool palette as `/azdo-add-comment` |
| Skill asks for missing `workItemId` or `body` before drafting | Live session with incomplete invocation |
| Skill enriches target via one `wit_get_work_items_batch_by_ids` call and shows the target title in the preview | Transcript inspection |
| Empty / whitespace-only body → refused, no tool call issued | Live session with `""` or `"   "` body |
| `format: "Markdown"` is always passed explicitly in the `wit_add_work_item_comment` call | Tool-call payload inspection |
| On success, reply contains: comment ID, ticket URL as Markdown link, deep link `?focusedCommentId=<id>` | Post a live test comment; inspect reply + click through |
| On `isError: true`, raw error text surfaced verbatim | Live session with a malformed payload (e.g. huge body) |
| `mcp__azdo__*` tools absent → skill reports disconnected per `azdo-mcp-connection.md`; no REST fallback | Session with MCP server off |

## File List

**Will create:**
- `.claude/skills/azdo-add-comment/SKILL.md`
- `.claude/rules/azdo-comment-style.md`
- `specs/dev/story-3.3-azdo-add-comment.md` (this file)

**Will modify:**
- `CLAUDE.md` — add the new rule to the rules-layout list
- `.claude/rules/mutation-confirmation.md` — one cross-link to the new style rule in the Comment preview bullet
- `specs/planning/epics.md` — Story 3.3 block reshaped; FR Coverage Map updated; Epic 3 header status and story-shape lines updated

**Will NOT modify:**
- `src/tools/comments.ts` — stays as an unused stub for now; cleanup is a separate opportunistic commit
- Any runtime code — this story is a skill + rule + spec reshape only

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Date:** 2026-04-23
- **Notes:** Initial iteration considered a rule-only shape (skill abandoned). That shape was rejected because the return contract — deep-link construction from `focusedCommentId` — doesn't fit a rule file. The rejected research artifact (`research/skill-vs-rule-comment-path-2026-04-23.md`) was deleted rather than kept as a record of flawed reasoning; this note is the only paper trail.
