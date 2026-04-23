---
epic: 3
stories: [3.1, 3.2]
title: /azdo-create-ticket skill — baseline create + link branching (merged)
status: In Progress
merges: [3.1, 3.2]
---

# Stories 3.1 + 3.2 — `/azdo-create-ticket` skill (merged)

**Source:** `specs/planning/epics.md` § Epic 3 § Stories 3.1 and 3.2. Planned as two sequential stories; merged at implementation time per user direction: a single SKILL.md with conditional link branching is leaner than two passes over the same file.

## Why merge

Stories 3.1 (baseline create, no links) and 3.2 (link support on the same skill) both edit the same `.claude/skills/azdo-create-ticket/SKILL.md`. 3.2's ACs explicitly require "no new skill file is created" — so the split exists purely to let link behavior be verified independently. In practice the link path is a conditional branch inside the same preview → approve → mutate loop; writing it as one unit avoids the cost of deliberately shipping a half-feature and then editing it back the next day. No FR coverage is lost; the `/azdo-create-ticket` line in the FR map still lands once.

Single commit, single SKILL.md, single dev doc. Verification still exercises both paths (no-link and multi-link) as separate scenarios.

## Goal

A single Claude Skill — `/azdo-create-ticket` — turns "draft and create a ticket, optionally linked to others" into one conversational turn with explicit user approval before any write. Composed entirely over Microsoft's inherited `wit_*` tools; no author write primitives. Adheres to `.claude/rules/mutation-confirmation.md` (preview → edits loop → explicit affirmative verb → mutate; error honesty on failure).

After this story the user can say `/azdo-create-ticket pull feature 8812 and propose a follow-up linked as Related`, review the draft, and land a fully-wired ticket without leaving Claude Code.

## Scope

**In scope:**
1. Extend Story 2.1's context tool to also return `orgUrl` (always non-empty; from `config.orgUrl`) and `user.email` (nullable; from a new **optional** `AZDO_USER_EMAIL` env), **and rename it from `get_project_context` to `get_azdo_context`** (see § Why rename). Source file moves from `src/tools/project-context.ts` to `src/tools/azdo-context.ts`; exported registration from `registerProjectContextTools` to `registerAzdoContextTools`. Schema stays zero-arg. `src/config.ts` gains `userEmail: process.env.AZDO_USER_EMAIL` — **not required**, to keep the operator's `.env` lean (existing required keys: `AZDO_ORG_URL`, `AZDO_PAT`). Existing callers (Story 2.1's `/azdo-fetch-tickets`) are updated in the same commit to consume the expanded payload and render Markdown-linked ticket references.
2. New skill `.claude/skills/azdo-create-ticket/SKILL.md` covering:
   - Draft from user intent (with optional context-read of referenced tickets).
   - Preview the full pending mutation inline (type, title, Markdown description, project, optional links section).
   - Edits loop until explicit affirmative verb.
   - **Link branch** — when the user names link targets, pre-validate all target IDs via a single `wit_get_work_items_batch_by_ids` call; all-or-nothing (no partial link sets).
   - Mutation call — `wit_create_work_item`, then (if links) a single `wit_work_items_link` batch.
   - Reply with constructed ticket URL — `${orgUrl}/${project}/_workitems/edit/${id}` — since MS tool response is not guaranteed to carry one.
   - Partial-failure honesty — if create succeeds but link batch fails, name both outcomes and offer retry / unlinked / subset.
3. Update `specs/planning/epics.md` Epic 3 status block — 3.1 and 3.2 shipped (merged).

**Out of scope:**
- Story 3.3 (`/azdo-add-comment`) — separate commit.
- Story 3.4 (`configureCoreTools` bulk-wire for project/team pickers) — separate commit. When `get_azdo_context` returns `project: null`, the skill asks the user for a project name in free text until 3.4 lands.
- Any author-owned write primitive. MS tools already wired via `configureWorkItemTools` in Epic 1 cover every planned capability.

## MS tools consumed (already wired in Epic 1)

| Tool | When called |
|---|---|
| `wit_get_work_items_batch_by_ids` | Optional context-read for user-referenced tickets; mandatory pre-validation of link targets |
| `wit_create_work_item` | The one create mutation |
| `wit_work_items_link` | Optional batch link mutation after create (only if link targets were approved) |

No new MS `configure*Tools` call is required for this story.

## Why rename

Story 2.1 shipped the tool as `get_project_context`. Once `orgUrl` is part of the payload, that name is a lie — `orgUrl` is not project context; it is a per-session connection constant. Three options were weighed:

- **Split into two tools** (`get_project_context` → `{ project, team }`; new `get_connection_info` → `{ orgUrl }`). Clean SRP, but forces every skill that wants both to make two zero-arg calls per turn and adds cognitive weight to `tools/list` for Claude's tool selection. No functional gain.
- **Keep the old name.** Pragmatic, but mis-naming is the kind of small lie that future contributors pattern-match against. Not worth it.
- **Rename the tool to match its actual payload.** Cheapest honesty: one rename, three consumers updated, one-call ergonomics preserved.

The third option wins. `get_azdo_context` returns the bundle a skill needs to scope a call and build a work-item URL — `{ orgUrl, project, team }`. It is the per-session AzDO handshake result. Nullability differs across fields (orgUrl never null; project/team may be), but all three share the same provenance (startup-time config) and lifecycle (constant for the process lifetime). They belong in one call.

## `get_azdo_context` shape

- File: `src/tools/azdo-context.ts` (was `project-context.ts`).
- Exported registration: `registerAzdoContextTools(server)`.
- Tool ID: `get_azdo_context` (exposed as `mcp__azdo__get_azdo_context`).
- Response JSON: `{ project: string | null, team: string | null, orgUrl: string, user: { email: string | null } }`.
- `orgUrl` is always present and non-empty (`AZDO_ORG_URL` is a required env — fail-fast at module load).
- `user.email` is `null` when the optional `AZDO_USER_EMAIL` env is not set. The create-ticket skill branches on nullability: when non-null the email is proposed as the default assignee in preview; when null the skill asks once for an assignee. Unassigned is a legitimate final state — if the user skips the prompt or says "unassigned", the skill omits `System.AssignedTo` from the payload rather than insisting. The contract is "prefer an assignee, don't insist."
- Description string rewritten to foreground three purposes: scope-a-call, build-a-URL, attribute-to-the-current-user (when known).

## Skill contract

Front matter — `name: azdo-create-ticket`; `description: …` trigger text emphasising "create / draft / new ticket / work item" intents, including "linked as …" phrasing so Claude's intent-matcher picks this skill over a generic text composition.

Body — a decision-oriented document, not a rigid script. Key rules the skill enforces:

1. **Never invent required fields, always surface fill-ins.** Every create must carry `workItemType`, `title` (plain text, no Markdown syntax — AzDO rejects or malformats markdown in `System.Title`), `System.Description` (Markdown), `Microsoft.VSTS.Common.AcceptanceCriteria` (Markdown; project policy — every work item gets non-empty AC), `System.AreaPath` (backslash-delimited, resolved from the team's default via `work_get_team_settings` when the user didn't name one), and `Microsoft.VSTS.Common.Priority` (always surfaced — unprioritized tickets clutter triage boards). `System.AssignedTo` is preferred but not forced: default is `user.email` when set; otherwise the skill asks once; if the user skips or says "unassigned", the field is omitted from the payload entirely. For types that use it, the skill surfaces `Microsoft.VSTS.Scheduling.StoryPoints` and lets the user confirm, adjust, or explicitly opt out. For both Priority and Story Points, the skill **infers a suggested value from the drafted content** (urgency cues in the description/AC for Priority; scope/touchpoint signals for Story Points) and labels it `(suggested: N — short reasoning)` in the preview; only when the draft is too sparse to reason does it fall back to a neutral fill-in (`2` for Priority, `3` for Story Points) labeled `(default: N)`. No Fibonacci or scale assumption — the skill picks whatever integer fits and lets the team's convention take over in review. Proposed values must always be labeled so one-word confirmations or overrides are unambiguous.
2. **Context-read is opt-in.** Only fetch referenced tickets when the user names IDs ("pull 8812 and draft a follow-up") — don't speculatively fetch.
3. **Project resolution.** Call `get_azdo_context` once, cache `{ project, team, orgUrl }`. If `project` comes back `null` and the user didn't name one, ask the user for a project name. Team is only required if a later step needs it (create doesn't).
4. **Link intent extraction.** Map natural-language labels to MS's lowercase enum: `parent | child | related | predecessor | successor | tests | tested by | affects | affected by | duplicate | duplicate of`. Default to `related` on genuine ambiguity only — never guess a stronger relationship.
5. **Pre-validation gate.** When there is at least one link target, call `wit_get_work_items_batch_by_ids({ ids: [<all target ids>] })` once before the create. If any target ID is missing from the response or the call errors, report the full list of invalid IDs and stop; do not create the ticket. All-or-nothing.
6. **Preview (mandatory).** Render inline: work-item type; title; Markdown description (as source, noted to render in the AzDO UI); project; a "Links" section listing each `{type} → #{linkToId} {title of target}` if any. Wait for an explicit affirmative verb before proceeding.
7. **Create call shape.** `wit_create_work_item({ project, workItemType, fields: [{ name: "System.Title", value: <title> }, { name: "System.Description", value: <md>, format: "Markdown" }, ...extras] })`.
8. **Link call shape.** One `wit_work_items_link({ project, updates: [{ id: newId, linkToId, type }, ...] })` — batch, single call.
9. **URL construction.** Always construct `${orgUrl}/${project}/_workitems/edit/${id}` for the reply; never scrape from MS response (not guaranteed to include one).
10. **Partial-failure honesty.** Create success + link failure → reply lists the created ticket (ID + URL) AND the raw link error AND offers retry-all / retry-subset / leave-unlinked. No automatic retry.
11. **Connection disclaimer.** If `mcp__azdo__*` tools aren't in the tool list, follow `.claude/rules/azdo-mcp-connection.md` — report disconnected state, stop, no REST fallback.

## Acceptance Criteria — Verification Plan

| AC | Origin | Verification |
|---|---|---|
| `get_azdo_context` returns `{ project, team, orgUrl, user: { email } }` with `orgUrl` always present; `user.email` is the `AZDO_USER_EMAIL` value or `null`; old `get_project_context` is gone from `tools/list` | 3.1 + rename | Inspector call + `tools/list` inspection |
| `AZDO_USER_EMAIL` unset → server boots, `user.email` is `null`; skill asks once for an assignee; if user skips, ticket is created with `System.AssignedTo` omitted | optional-env | Start without the env var set, invoke the create skill, skip the assignee prompt |
| `AZDO_USER_EMAIL` set → `user.email` flows through; skill proposes it as the default assignee and labels it "default" in preview; user can confirm, override, or drop | optional-env | Transcript review |
| Title with Markdown syntax → skill strips or asks; create call payload's `System.Title` entry carries `format: "Html"` (empirically required by AzDO — omitting format causes the "Operation of changing value type is not supported" error); other plain-scalar fields (`AreaPath`, `AssignedTo`, `Priority`, `StoryPoints`) carry no `format` attribute | title-plain-text + format-policy | Inspect `wit_create_work_item` call payload |
| Create call always includes `System.AreaPath` sourced from `work_get_team_settings` when the user didn't specify one | area-path | Transcript + inspect created ticket in AzDO UI |
| Create call includes `System.AssignedTo` (non-empty email) when the user confirmed or supplied one; the field is entirely omitted from `fields[]` when the user skipped or chose "unassigned" — skill never sends an empty string | auto-assign | Transcript + AzDO UI, both branches |
| Create call always includes `Microsoft.VSTS.Common.Priority`; preview shows it as `(suggested: N — reasoning)` when the skill inferred from draft content, `(default: 2)` when the draft had no signal, or no annotation when the user supplied it explicitly | priority-suggestion | Transcript review across draft variants |
| For types that use Story Points, create call includes `Microsoft.VSTS.Scheduling.StoryPoints` with a suggested or default value by the same rule, or the field is explicitly dropped on opt-out — no Fibonacci-specific assumption baked into the skill | story-points-suggestion | Transcript review across draft variants |
| Every ticket reference in both `/azdo-create-ticket` and `/azdo-fetch-tickets` renders as `[#<id>](<url>)` Markdown hyperlink, not bare `#<id>` | link-format | Visual in chat UI (no GitHub auto-link, hover shows AzDO URL) |
| `/azdo-create-ticket` is available as a slash-command after Claude Code start | 3.1/3.2 | Claude Code session |
| No-context invocation → skill asks for `workItemType` + `title` + `acceptanceCriteria` before drafting | 3.1 | Session transcript |
| Preview always includes a non-empty AC section; create call always carries `Microsoft.VSTS.Common.AcceptanceCriteria` with `format: "Markdown"` | project-policy | Transcript + AzDO UI on created ticket |
| Context-referenced invocation (`… pull 8812 and draft …`) → `wit_get_work_items_batch_by_ids([8812], expand: "relations")` before drafting | 3.1 | Transcript |
| Draft preview rendered inline with full pending payload | 3.1/3.2 | Session review |
| Edits cycle: user proposes change → preview re-rendered → still no mutation until explicit approval | rule | Session |
| No-link approved → single `wit_create_work_item` call lands; reply has constructed URL | 3.1 | Session + AzDO check |
| Link intent → all target IDs pre-validated via one batch call | 3.2 | Transcript |
| Any invalid target ID → ticket NOT created, user shown invalid IDs, asked to correct | 3.2 | Session w/ bogus ID |
| All targets valid + user approves → one `wit_create_work_item` + one `wit_work_items_link` batch | 3.2 | Transcript |
| Create ok but link batch fails → reply names created ticket URL AND raw link error AND offers retry/unlinked/subset | 3.2 | Session w/ permission error on link (if reachable) or inspection |
| `isError: true` before create → surfaced verbatim, no create issued | rule | Session w/ broken field |
| `project: null` from context + none named → skill asks, never invents | 3.1 | Session w/ `AZDO_DEFAULT_PROJECT` unset |
| `mcp__azdo__*` tools absent → skill reports disconnected, no REST fallback | rule | Session w/ MCP off |

## File List

**Will create:**
- `src/tools/azdo-context.ts` (rename target; carries the extended tool)
- `.claude/skills/azdo-create-ticket/SKILL.md`
- `specs/dev/story-3.1-3.2-azdo-create-ticket.md` (this file)

**Will delete:**
- `src/tools/project-context.ts` (renamed, not kept as a shim)

**Will modify:**
- `src/config.ts` — add `userEmail: process.env.AZDO_USER_EMAIL` (optional, may be undefined at runtime — the create skill handles both branches)
- `src/index.ts` — import updated to `registerAzdoContextTools` from the new file
- `.claude/skills/azdo-fetch-tickets/SKILL.md` — tool-name references updated to `get_azdo_context`; rendering rules switched to mandatory Markdown-linked ticket IDs with per-item project resolution
- `.claude/rules/mutation-confirmation.md` — one example reference updated
- `specs/planning/epics.md` — Epic 3 header status; Stories 3.1 and 3.2 marked shipped (merged); tool-name references updated across Stories 2.1, 3.1, 3.4, 4.1 to reflect the rename

**Will NOT modify:**
- `src/tools/work-items.ts` — already wires all needed MS tools via `configureWorkItemTools`
- Historical frozen docs (`specs/planning/prd.md`, `architecture.md`, `research/*.md`, `specs/dev/story-2.1-skill-read-path.md`) — they record state at their authoring date and are not rewritten by renames

**Operator note:** setting `AZDO_USER_EMAIL=<their login email>` in the local `.env` is optional. With it, `/azdo-create-ticket` auto-proposes the creator as the default assignee. Without it, the skill asks once; if the user skips, the ticket is created unassigned — preferred but not forced.

## Review Findings

*Code review 2026-04-23 — Blind Hunter + Edge Case Hunter + Acceptance Auditor (via `bmad-code-review`).*

### Decision resolved

- [x] [Review][Decision] Area-path + team mandatory is new scope vs Epic 3.1 AC — **resolved: option 1**. Epic 3.1 AC rewritten to match the shipped contract ("AreaPath always set; team resolution via `work_get_team_settings` when the user didn't supply area verbatim; project-root default area is not an acceptable fallback"). The empirical bug observation (orphan tickets off every team's backlog) outweighs the original "don't ask for team unnecessarily" AC. `epics.md` Story 3.1 AC block updated.

### Patch — code issues with unambiguous fixes

- [x] [Review][Patch] SKILL over-applies `format: "Html"` to scalar fields beyond Title — user's working payload proved `format: "Html"` is needed ONLY on `System.Title`; `AreaPath`, `AssignedTo`, `Priority`, `StoryPoints` worked fine with NO `format` attribute. Tighten SKILL to Title-only. [`.claude/skills/azdo-create-ticket/SKILL.md:146–162`]
- [x] [Review][Patch] Dev-doc AC row `title-plain-text` still says "Title entry never carries a `format` attribute" — inverted from shipped reality after the Html fix. Rewrite to "Title carries explicit `format: \"Html\"`; other scalars carry no format attribute." [`specs/dev/story-3.1-3.2-azdo-create-ticket.md:99`]
- [x] [Review][Patch] `AZDO_USER_EMAIL=""` (empty string in `.env`) treats as set, not unset — `config.userEmail` ends up `""` and flows to preview/payload. Add empty-string guard: `userEmail: process.env.AZDO_USER_EMAIL || undefined`. [`src/config.ts:4`]
- [x] [Review][Patch] SKILL § 1 says `team` is always required for create, but § 3 areaPath step 1 lets the user supply `System.AreaPath` verbatim (bypassing `work_get_team_settings`, so `team` isn't needed). Resolve: require `team` only when area-path resolution actually falls to team-settings. [`.claude/skills/azdo-create-ticket/SKILL.md:36` vs `:57-61`]
- [x] [Review][Patch] Context-read (§ 2) has no missing-ID guard — a stale referenced ID silently yields nothing and the draft goes blind. Add a check parallel to the link pre-validation gate. [`.claude/skills/azdo-create-ticket/SKILL.md:41–45`]
- [x] [Review][Patch] Duplicate link-target IDs not deduplicated — "parent 8800, related 8800" would go through with both entries. Add dedup/conflict rule in § 4. [`.claude/skills/azdo-create-ticket/SKILL.md:74–84`]
- [x] [Review][Patch] Approval verb list lacks negation guard — naive substring match on "create" in "don't create" could wrongly fire. Add explicit "negated forms ≠ approval" rule. [`.claude/skills/azdo-create-ticket/SKILL.md:23`]
- [x] [Review][Patch] `epics.md` still has old symbol references `src/tools/project-context.ts` / `registerProjectContextTools` in active (non-frozen) sections — rename incomplete. [`specs/planning/epics.md:323` Story 2.1 AC, `:442` Story 3.1 AC]
- [x] [Review][Patch] Dev-doc "Will NOT modify" bullet list broken by inline `**Operator note:**` paragraph — reformat so the operator note is its own paragraph outside the list. [`specs/dev/story-3.1-3.2-azdo-create-ticket.md:140–141`]

### Deferred — real but out of scope for this commit

- [x] [Review][Defer] Cross-project link target validation — user says "link to 8812" where 8812 lives in a different project; no guard. [`.claude/skills/azdo-create-ticket/SKILL.md:82`]
- [x] [Review][Defer] `AZDO_ORG_URL` trailing-slash not normalized — pre-existing config concern, produces malformed URLs `…//org//_workitems/…`. [`src/config.ts:2`]
- [x] [Review][Defer] Priority heuristics can fire on quoted context — user pastes an incident report as draft context, agent reads `production down` and picks Priority 1. [`.claude/skills/azdo-create-ticket/SKILL.md:67`]
- [x] [Review][Defer] Edit-loop invalidation after approval — user approves, then edits before mutation fires; no rule that fresh edits invalidate approval. [`.claude/skills/azdo-create-ticket/SKILL.md:130–134`]
- [x] [Review][Defer] AC "never ship TBD" deadlock exit — user insists "AC: n/a" and skill has no escape; rule says "surface the policy conflict" but no concrete exit. [`.claude/skills/azdo-create-ticket/SKILL.md:56`]
- [x] [Review][Defer] `wit_work_items_link` with zero-length `updates[]` after edit-loop drops all links — ambiguous whether Links section flag is cleared. [`.claude/skills/azdo-create-ticket/SKILL.md:166–177`]
- [x] [Review][Defer] `get_azdo_context` tool description says `team` is null-when-unset without hinting that some skills now require it — cosmetic doc drift. [`src/tools/azdo-context.ts` description]

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Date:** 2026-04-23
- **Notes:** Merge of 3.1 and 3.2 confirmed by user at planning time — single SKILL.md with conditional link branch. Review findings recorded after `bmad-code-review` run on 2026-04-23.
