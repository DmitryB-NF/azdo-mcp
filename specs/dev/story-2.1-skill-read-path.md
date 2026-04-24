---
epic: 2
story: 2.1
title: Skill-based read path with team coordinates
status: Done
replaces: [original 2.1 "get_work_item", original 2.2 "list_work_items"]
---

# Story 2.1 — Skill-based read path with team coordinates

**Source:** `specs/planning/epics.md` § Epic 2 § Story 2.1 (reshaped during Story 2.1 planning — see `specs/planning/research/skill-vs-primitive-read-path-2026-04-22.md` for the rationale behind abandoning author read primitives).

## Goal

Make end-to-end ticket retrieval work through a single Claude Skill (`/azdo-fetch-tickets`) composed over Microsoft's inherited `wit_*` tools. No author read primitives are introduced. The only author-owned tool added in this story is `get_project_context` — a zero-argument lookup that returns the configured AzDO project/team from `.env` so the skill (and any future skill) has unambiguous team coordinates for macros like `@CurrentIteration('[project]\team')`.

By the end of this story the user can type `/azdo-fetch-tickets 12345`, `/azdo-fetch-tickets current sprint`, `/azdo-fetch-tickets SELECT [System.Id] FROM WorkItems WHERE …`, or `/azdo-fetch-tickets priority 1` and get a readable Markdown summary.

## Why no author read primitive

Captured fully in `specs/planning/research/skill-vs-primitive-read-path-2026-04-22.md`. Summary:

- AzDO's WIQL and iteration endpoints serverly return `WorkItemReference[]` — IDs only, no field values. Fetching full items always takes two round-trips (query → batch). MS's own `wit_query_by_wiql` and `wit_get_work_items_for_iteration` do exactly this.
- Any author `get_work_items` that accepts WIQL/iteration criteria would re-implement orchestration the host (Claude) already performs natively via the skill layer. Net overhead is a dead abstraction layer.
- MS's `wit_get_work_items_batch_by_ids` already supports `ids`, `fields`, and `expand` — the whole payload-shaping surface we'd want.
- Skill-layer composition (FR17) is the architecture's native extension point. Using it here is consistent with `/azdo-sprint-report`'s design in Epic 4.

## Scope

**In scope:**
1. Extract the three MS callable providers (`tokenProvider`, `clientProvider`, `userAgentProvider`) from `src/tools/work-items.ts` into a shared `src/ms-providers.ts`. Justification below.
2. New author tool `get_project_context` in `src/tools/project-context.ts` — single-source-of-truth for AzDO project/team coordinates, read from `.env`.
3. New skill `.claude/skills/azdo-fetch-tickets/SKILL.md` covering all read paths: IDs, current sprint, named iteration, raw WIQL, shorthand filters.
4. Epic 2 document reshape — original Stories 2.1 and 2.2 replaced; Stories 2.3 / 2.4 / 2.5 reconfirmed against the new baseline.
5. New research file capturing the skill-vs-primitive lesson so future contributors don't re-litigate it.

**Out of scope (future stories):**
- Wiring MS `core` domain (`configureCoreTools`) for team/project enumeration. Deferred — user works with a single team; defaults from `.env` suffice. Add when a real need appears.
- `list_team_iterations` (original Story 2.3) — re-evaluated next story.
- Anything in Epics 3–4.

## Provider extraction

Story 1.3 placed `tokenProvider`/`clientProvider`/`userAgentProvider` inside `src/tools/work-items.ts` as private functions with the YAGNI justification "no second caller yet." This story is the first moment a second caller becomes realistic: as soon as we wire a second MS domain (and `get_project_context` lives next to them in the same directory), having three provider helpers copy-pasted into each wrapper would be obvious bloat.

Rather than wait for the second MS domain to actually land, I'm promoting the providers now because `ms-providers.ts` is a trivial 15-line module and its existence removes the refactor cost from whichever future story first wires a second `configureXxxTools` call. The tools module stays focused on *its* domain; the generic MS contract lives in its own file.

Architecture rule "MS deep-imports only inside `src/tools/<domain>.ts`" is preserved — `ms-providers.ts` does not deep-import from MS; it only exposes helpers shaped like MS's contract.

## `get_project_context` tool

- File: `src/tools/project-context.ts`.
- Exposes `registerProjectContextTools(server)`.
- Registers a single tool `get_project_context` with empty input schema.
- The tool's name emphasises `project` because that is the primary coordinate; `team` is returned as a secondary convenience and is `null` when unset.
- Returns a JSON payload `{ project: string | null, team: string | null }` from `config.defaultProject`/`config.defaultTeam`. Missing values serialise as `null` — skills decide what to do with that.
- No `isError` path — reading `.env` values is infallible at tool-call time (the fail-fast already fired at module load if required vars were missing).

## Skill `/azdo-fetch-tickets`

- Path: `.claude/skills/azdo-fetch-tickets/SKILL.md`.
- Front matter: `name: azdo-fetch-tickets`, `description: …` (trigger text for Claude's intent-matching).
- Body: decision table for input shapes → MS tool chain, rendering rules for single vs batch results, error-surface rule, explicit "call `get_project_context` only for iteration/sprint paths" note.
- No CSS/Markdown fragment helpers; Claude assembles the output directly.

## Registration order

`src/index.ts` registers `registerProjectContextTools(server)` before `registerWorkItemTools(server)`. Author tools surface first in `tools/list` (insertion-order-preserving). Consistent with the convention established during the `get_work_items` design pivot; cheap reinforcement of "author layer first."

## Acceptance Criteria — Verification Plan

| AC | Verification |
|---|---|
| `tools/list` includes `get_project_context` before any MS `wit_*` tool | Inspector handshake, inspect `tools` array order |
| `get_project_context` returns `{ project, team }` matching `.env` values | Inspector call |
| `get_project_context` returns `null` for each coordinate absent from `.env` | Inspector call with vars unset |
| `/azdo-fetch-tickets <ID>` renders a readable Markdown summary | Claude Code session, real ticket ID |
| `/azdo-fetch-tickets current sprint` calls `get_project_context` once and uses `@CurrentIteration('[<project>]\<team>')` in WIQL | Claude Code session + check tool call transcript |
| `/azdo-fetch-tickets <WIQL>` runs the user's WIQL verbatim through `wit_query_by_wiql` | Claude Code session |
| `/azdo-fetch-tickets priority 1` translates to WIQL `… WHERE [Microsoft.VSTS.Common.Priority] = 1` | Claude Code session + transcript |
| Ambiguous input → skill asks user to clarify | Claude Code session (e.g. empty args) |
| Empty result set → "No matching work items." | Claude Code session against unreachable WIQL |
| `isError: true` from any MS tool → raw text surfaced, no fabrication | Claude Code session with a broken WIQL |
| MS providers are imported from `src/ms-providers.ts`, not duplicated | `grep 'tokenProvider'` across `src/` |
| No author read primitive (`get_work_items`, `list_work_items`, etc.) exists | `grep '<tool_name>'` returns nothing |

## File List

**Will create:**
- `src/ms-providers.ts`
- `src/tools/project-context.ts`
- `.claude/skills/azdo-fetch-tickets/SKILL.md`
- `specs/planning/research/skill-vs-primitive-read-path-2026-04-22.md`
- `specs/dev/story-2.1-skill-read-path.md` (this file)

**Will modify:**
- `src/tools/work-items.ts` — provider helpers removed; now imports from `../ms-providers`
- `src/index.ts` — registers `get_project_context` before work-items
- `specs/planning/epics.md` — Epic 2 shape reset: old Stories 2.1 + 2.2 removed, new Story 2.1 defined; FR coverage map updated

**Will delete:**
- `specs/dev/story-2.1-get-work-items.md` — superseded by this file during the scope pivot (only lived in the working tree during planning)

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Date:** 2026-04-22
