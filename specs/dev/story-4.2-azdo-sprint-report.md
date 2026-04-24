---
epic: 4
story: 4.2
title: /azdo-sprint-report narrative skill + writing-quality rule
status: In Progress
---

# Story 4.2 — `/azdo-sprint-report` narrative skill + writing-quality rule

**Source:** `specs/planning/epics.md` § Epic 4 § Story 4.2.
**Consumes:** `get_sprint_goal` author tool (Story 4.1).
**Research:** [`specs/planning/research/sprint-goal-extension-data-api-2026-04-24.md`](../planning/research/sprint-goal-extension-data-api-2026-04-24.md).

## Goal

Ship the flagship compound skill that closes the five-skill MVP roster: `/azdo-sprint-report`. The skill pulls the previous and current iterations, produces a two-section narrative stakeholder report (Achievements + Goals, continuous prose only, no ticket IDs, no bullets), previews it rendered, and — on an explicit affirmative verb — posts it as a Markdown comment on a user-chosen target work item, replying with a deep link to the posted comment.

Alongside the skill, introduce a project-wide writing-quality floor (`.claude/rules/writing-quality.md`) that every generated artefact inherits — commit messages, code comments, AzDO comments, reports, docs. British English, no code-switching, no typos, well-formed Markdown. The rule is a correctness floor, not a voice mandate, and composes under the existing `azdo-comment-style.md` and every future content rule.

## Shape — skill plus writing-quality rule plus simplified comment-style rule

Three pieces interact.

- **Skill** (`.claude/skills/azdo-sprint-report/SKILL.md`) — owns everything specific to sprint reporting: input/output contract, iteration fetch sequence, target-ID resolution (user-named → ask), two-section report structure, theme mapping, anti-patterns, preview/approve mechanics, deep-link reply shape. The skill's contribution is the narrative content structure that sits on top of the general comment-style rule; it does not override any of the rule's hygiene items.
- **New rule** (`.claude/rules/writing-quality.md`) — project-wide. Strict items only: British English, no code-switching, no typos, well-formed Markdown. Explicitly not about voice. Validated before every preview/mutation.
- **Simplified rule** (`.claude/rules/azdo-comment-style.md`) — stripped of subjective "signal-first / bold-anchor / salutation" guidance that previously nudged authors toward one particular voice. Left with Markdown hygiene, ticket-reference conventions, format-parameter handling, and three strict safety items (empty-body refusal, preview-rendered, Markdown-normalisation). Now applies cleanly to every comment body, free-form or structured, including `/azdo-sprint-report`.

Alternative designs considered and rejected:

1. **Rule per skill for narrative style.** A new `azdo-sprint-report-style.md` rule mirroring the pattern used in Story 3.3 for comments. Rejected because the sprint-report shape is narrow (single skill, single output path) and the style is inseparable from the skill's orchestration — splitting gains no reuse surface.
2. **Carve `/azdo-sprint-report` out of `azdo-comment-style.md`.** Initial draft. Rejected after the user correctly observed that the comment-style rule itself was the problem: its "prefer" items nudged authors toward a specific voice (signal-first leads, bold anchors for key verbs) rather than staying at Markdown hygiene. Simplifying the rule to universal hygiene removes the need for any skill-specific exception.
3. **Writing-quality inside `CLAUDE.md`.** Rejected because every other cross-cutting policy already lives under `.claude/rules/`.
4. **Honour the original epic AC verbatim (bullet-per-item, grouped by state, sorted by priority).** Rejected by product direction: the skill's real audience is non-engineer stakeholders for whom ticket IDs and priority integers are noise. The epic AC predates that clarity and is rewritten in this story to match shipped reality (same pattern as Stories 3.1–3.3).

## Scope

**In scope:**

1. New skill `.claude/skills/azdo-sprint-report/SKILL.md` with explicit input/output contract, iteration fetch sequence, two-section narrative report shape, preview/approve mechanics, deep-link reply.
2. New rule `.claude/rules/writing-quality.md` — project-wide floor.
3. Rewrite `.claude/rules/azdo-comment-style.md` — drop the "signal-first / bold-anchor / salutation" voice guidance; keep Markdown hygiene, ticket-reference conventions, format-parameter handling, and three safety items. Cross-link `writing-quality.md`.
4. Update `CLAUDE.md` rules-layout list — add writing-quality; rewrite the comment-style summary to match the simplified rule.
5. Update `specs/planning/epics.md` — Epic 4 goal/shape, Story 4.2 AC block, FR Coverage Map (mention writing-quality rule), Epic 3 story-shape reference.

**Out of scope:**

- Any change to `/azdo-add-comment` beyond the unrelated rule-scope carve-out already documented.
- Any picker UX for target work items — user-named / env fallback / ask is the whole contract at MVP.
- Wiki-page publishing (deferred to Phase 2 per Epic 4 goal).
- Source code changes. This story is skill + rule + spec only.

## MS / author tools consumed

- `get_azdo_context` (author, shipped in Epic 2) — project/team/orgUrl resolution.
- `list_recent_iterations` (author, shipped in Story 2.3) — two most-recent iterations for the team. Called with `limit: 2`.
- `get_sprint_goal` (author, shipped in Story 4.1) — sprint goal + details + achievement status for each iteration. One call per iteration.
- `wit_query_by_wiql` (MS, bulk-wired in Epic 1) — one call per iteration for ID extraction.
- `wit_get_work_items_batch_by_ids` (MS) — **one** combined batch call across both iterations, plus an optional separate enrichment call for the target work item's title.
- `wit_add_work_item_comment` (MS) — the single mutation; `format: "Markdown"` passed explicitly.

No new `configure*Tools` registration. No new author runtime code in this story (the `get_sprint_goal` primitive lands in Story 4.1).

## Target-ID resolution

1. **User-named in the invocation.** "post to 8812", "target 7410", "on the Q2 reporting epic". Direct.
2. **Ask once.** "Which work item should I post the report on?" Never invent.

An env-configured default target (`AZDO_SPRINT_REPORT_TARGET_ID` or similar) was considered and deferred: `process.env` reads are architecturally reserved for `src/config.ts`, and routing a default through `get_azdo_context` would touch runtime code beyond this story's skill + rule scope. Flagged in `specs/dev/deferred-work.md` for a follow-up.

## Sprint-goal ingestion (via Story 4.1 tool)

After `list_recent_iterations` returns `[current, previous]`, the skill extracts the team GUID as the path segment **immediately before `_apis/work/teamsettings`** in each iteration's `url` (shape: `https://dev.azure.com/<org>/<projectId>/<teamId>/_apis/work/teamsettings/iterations/<iterationId>`; regex: `/\/([0-9a-f-]{36})\/_apis\/work\/teamsettings\//`) and calls `get_sprint_goal` once per iteration — the tool's zod schema requires GUIDs for both parameters, not names:

```
get_sprint_goal({ team: teamGuid, iterationId: current.id })
get_sprint_goal({ team: teamGuid, iterationId: previous.id })
```

Responses drive the narrative:

- **Current iteration goal** (`value.goal`, `value.detailsPlain`) — seeds the Goals section. Paragraph 1 opens with the goal title; paragraphs 2–3 expand using themes mined from `detailsPlain`.
- **Previous iteration goal + `goalAchieved`** — seeds the Achievements section. Paragraph 1 leads with whether the prior goal was met; paragraphs 2–3 cover supporting work from tickets.

**Graceful fallback** when either call returns `null` (extension absent, no goal set, scope insufficient):

- Current goal `null` → ask the user once for goals before drafting, matching the pre-Story-4.1 behaviour.
- Previous goal `null` → Achievements section proceeds from ticket themes alone; no phrasing that implies a stated goal existed.

The tool's `null`-on-failure contract means the skill never breaks because of a missing extension or PAT scope — worst case it degrades to "ask user" for the current goal and ticket-only narrative for achievements.

## Sprint goals — resolution order

The skill resolves sprint goals in this precedence:

1. **User supplies goals in the invocation message.** Direct override — use as-is.
2. **`get_sprint_goal` returns a non-null value** for the current iteration — use `value.goal` + `value.detailsPlain`. For previous iteration, additionally surface `value.goalAchieved` as narrative signal for the Achievements section.
3. **`get_sprint_goal` returns `null`** (extension missing, no goal set, or PAT scope too narrow) — ask the user once before drafting the Goals section. For previous iteration, narrative proceeds from ticket themes only without referencing a stated goal.

The tool is soft-failure by design (see `specs/planning/research/sprint-goal-extension-data-api-2026-04-24.md` for the contract), so the skill never hard-errors because of goal ingestion — it always has a usable path forward.

## Reply link shape — same contract as `/azdo-add-comment`

Construct `commentUrl = ${orgUrl}/${project}/_workitems/edit/${targetWorkItemId}?focusedCommentId=${commentId}` deterministically from the request coordinates and the mutation response `id`. Do not scrape MS's response `url` (REST URL, not a UI link). The reply includes the deep link Markdown-linked; the surrounding phrasing is free-form per moment.

## Acceptance Criteria — Verification Plan

| AC | Verification |
|---|---|
| `.claude/skills/azdo-sprint-report/SKILL.md` exists with correct front-matter | File inspection; skill appears in tool palette as `/azdo-sprint-report` |
| `.claude/rules/writing-quality.md` exists and is auto-loaded | Session start; rule content shows up in system-reminder alongside other rules |
| `.claude/rules/azdo-comment-style.md` applies to `/azdo-sprint-report`'s body without conflict after the simplification | File inspection; scope block lists `/azdo-sprint-report` alongside `/azdo-add-comment`; "prefer" items are compatible with the skill's narrative hard rules |
| Target-ID resolution (user-named → ask) is honoured | Two live sessions: (a) ID in message, (b) no ID → skill asks once |
| Skill resolves sprint goals via precedence: user-supplied → `get_sprint_goal` → ask | Three live sessions: (a) goals in message, (b) extension returns non-null, (c) extension returns null → skill asks |
| `list_recent_iterations` called with `limit: 2`, exactly once per invocation | Tool-call transcript inspection |
| `get_sprint_goal` called exactly once per iteration after `list_recent_iterations` | Tool-call transcript inspection |
| `get_sprint_goal` returning `null` never hard-errors the skill — falls back to ask-user / ticket-only narrative | Live session with non-existent iteration or extension uninstalled |
| `goalAchieved: true/false` from previous iteration is reflected in the Achievements paragraph lead | Live session with each outcome available in test data |
| One WIQL call per iteration + one combined batch call for tickets | Tool-call transcript inspection |
| Report body has exactly two H2 sections with the configured section titles and three paragraphs each | Preview inspection against a 5+ ticket iteration |
| Report body contains no ticket IDs, no ticket titles, no bullets | Preview inspection; grep the preview text for `#\d` and `^-` |
| British English validation runs before the preview is shown | Feed a Russian prompt; verify no Russian bleed-through in the preview |
| `format: "Markdown"` is always passed explicitly to `wit_add_work_item_comment` | Tool-call payload inspection |
| On success, reply contains the deep link `?focusedCommentId=<id>` as a Markdown hyperlink | Post a live test report; click through |
| Fewer than two iterations returned → stop and ask the user to supply the missing iteration explicitly | Mock / test-team with zero or one iteration |
| Either iteration returns an empty ticket set → stop before drafting, name the empty iteration, ask the user to correct / confirm / abort | WIQL returns empty for one or both iterations; verify skill asks rather than synthesising a paragraph |
| The skill never silently ships a half-report or an "empty-sprint" synthesised paragraph | Negative test — force the degenerate cases above and verify the skill always asks |
| On any `isError: true`, raw error surfaced verbatim, no claim of success | Malformed body, then missing project, then garbage target ID |
| `mcp__azdo__*` tools absent → skill reports disconnected per `azdo-mcp-connection.md`; no REST fallback | Session with MCP server off |
| SKILL.md edited between sessions → next invocation reflects edits without rebuild | Tweak a section header; restart Claude Code; verify |

## File List

**Will create:**

- `.claude/skills/azdo-sprint-report/SKILL.md`
- `.claude/rules/writing-quality.md`
- `specs/dev/story-4.2-azdo-sprint-report.md` (this file)

**Will modify:**

- `CLAUDE.md` — add `writing-quality.md` to the rules list; simplified comment-style rule summary.
- `.claude/rules/azdo-comment-style.md` — simplified to universal Markdown hygiene + ticket refs + three safety items; cross-link to `writing-quality.md`.
- `specs/planning/epics.md` — already updated in the preceding `docs(Epic 4)` commit (Epic 4 intro order-revision note, Story 4.2 block, FR20 cell, Epic 3 story-shape reference). No further changes in this commit.

Already landed in `docs(Epic 4)` and not touched again here:

- `specs/dev/deferred-work.md` — Story-4.2 env-target-ID deferral + Story-4.1 goals-source resolution; both committed in `docs(Epic 4)`.

**Will NOT modify:**

- Any runtime code under `src/` — this story is skill + rule + spec only. The `get_sprint_goal` primitive lands in Story 4.1.
- `src/tools/iterations.ts` — `list_recent_iterations` as shipped in Story 2.3 is already correctly shaped (`limit: 2` default, full iteration metadata returned).

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Date:** 2026-04-24
- **Notes:**
  - Starting draft of the skill came from a previous-project artefact. Rewritten against this repo's conventions: real MCP tools (`list_recent_iterations`, `wit_query_by_wiql`, `wit_get_work_items_batch_by_ids`, `wit_add_work_item_comment`), mutation-confirmation preview/approve loop, deep-link reply shape, and target-ID precedence.
  - Content shape for the report was originally proposed as an `azdo-sprint-report-style.md` rule. Per user direction, collapsed into the skill itself because the shape is single-consumer and splitting would force a round-trip to the rule file on every invocation for a document no other skill produces.
  - British English validation was originally coupled to the skill. Per user direction, lifted into a project-wide `writing-quality.md` rule — commits, code comments, tickets, reports, and docs all inherit the same floor.
  - The old Story 4.1 AC (bullet-per-item, grouped by state, sorted by priority) is obsoleted in `epics.md` rather than kept. Same pattern used for Stories 3.1–3.3 when shipped reality diverged from original plan.
  - Initial iteration added an explicit carve-out in `azdo-comment-style.md` for `/azdo-sprint-report`. User flagged that the rule itself was over-reaching — its "signal-first / bold-anchor" items were subjective voice rather than hygiene. Rule rewritten to universal Markdown hygiene + ticket refs + safety; carve-out dropped; sprint-report now inherits cleanly.
  - **Story renumbering (2026-04-24):** After this story was drafted as 4.1, empirical research (see `specs/planning/research/sprint-goal-extension-data-api-2026-04-24.md`) confirmed that sprint goals can be fetched via the `keesschollaart/sprint-goal` extension's Extension Data API. A new author-owned primitive `get_sprint_goal` became the natural foundation and was promoted to **Story 4.1**; this narrative-skill story was renumbered to **Story 4.2** to reflect the correct dependency order. Consumption of the new tool is integrated here (see § Sprint-goal ingestion); goal-resolution precedence updated from "ask user" to "user-supplied → `get_sprint_goal` → ask".
