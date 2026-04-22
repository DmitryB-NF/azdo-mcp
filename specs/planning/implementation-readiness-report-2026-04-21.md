---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - specs/planning/prd.md
  - specs/planning/architecture.md
  - specs/planning/epics.md
  - specs/planning/product-brief-azdo-mcp.md
  - specs/planning/research/technical-azure-devops-mcp-market-scan-research-2026-04-21.md
workflowType: 'readiness-check'
date: '2026-04-21'
project_name: 'AzDo MCP'
status: 'complete'
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-21 (initial assessment) · **Last synced:** 2026-04-22
**Project:** AzDo MCP
**Assessor:** BMad Implementation Readiness workflow

---

## Sync log

**2026-04-22 — Post Epic 2 + Epic 3 design pivots.** Both epics shifted from author-primitive implementations to skill-layer composition over MS-inherited tools, with a new project-wide mutation-confirmation rule for write skills. Sections affected and updated in-place:

- Step 3 Epic ↔ FR Coverage Map — rebuilt with current story IDs and tool attribution (MS tools now carry most of the FR1–FR11 load; author primitive surface shrank to `get_project_context` + `list_recent_iterations`).
- Step 4 UX Alignment — story ID references updated.
- Step 5 Dependency Audit — story structure of Epics 2 and 3 updated.
- Step 6 Recommended Next Steps — scope-cut priority order updated to reflect current story shape (no `create_work_item` primitive to drop).

Decisions captured in:
- [`research/skill-vs-primitive-read-path-2026-04-22.md`](research/skill-vs-primitive-read-path-2026-04-22.md)
- [`research/skill-vs-primitive-write-path-2026-04-22.md`](research/skill-vs-primitive-write-path-2026-04-22.md)
- [`../../.claude/rules/mutation-confirmation.md`](../../.claude/rules/mutation-confirmation.md)

The original 🟢 READY status from 2026-04-21 still holds; the pivots clarified and simplified the plan rather than introducing gaps.

---

## Step 1 — Document Discovery ✅

| Category | Status | Location |
|---|---|---|
| PRD | ✅ present, complete | [prd.md](prd.md) — 32 FR + 21 NFR, 488 lines |
| Architecture | ✅ present, complete | [architecture.md](architecture.md) — 8-step workflow complete, status: complete |
| Epics & Stories | ✅ present, complete | [epics.md](epics.md) — 4 epics, 14 stories, validated |
| UX Design | ℹ️ N/A | Product has no UI (MCP server). Interaction design lives in `SKILL.md` files |
| Supporting: Product Brief | ✅ present | [product-brief-azdo-mcp.md](product-brief-azdo-mcp.md) |
| Supporting: Technical Research | ✅ present | [research](research/technical-azure-devops-mcp-market-scan-research-2026-04-21.md) |

**Duplicates:** none. **Missing required docs:** none (UX correctly N/A).

---

## Step 2 — PRD Analysis ✅

### Functional Requirements Extracted — 32 total

Grouped by capability area:

- Work Item Retrieval: FR1-FR7 (7)
- Work Item Creation & Modification: FR8-FR11 (4)
- Iteration Management: FR12-FR14 (3)
- Skill Orchestration: FR15-FR20 (6)
- Configuration & Identity: FR21-FR24 (4)
- Ecosystem Integration (MS deep-import): FR25-FR28 (4)
- Protocol Compliance & Error Handling: FR29-FR32 (4)

All 32 FRs are clear, testable, implementation-agnostic, and free of subjective adjectives. No anti-patterns detected.

### Non-Functional Requirements Extracted — 21 total

Grouped by dimension:

- Performance: NFR-P1 to NFR-P4 (4) — specific targets (< 2s cold start, < 1.5s p95, < 5s batch)
- Security: NFR-S1 to NFR-S5 (5) — measurable (PAT storage, scope table, telemetry-free)
- Integration: NFR-I1 to NFR-I4 (4) — specific (AzDO REST versions, MCP spec, host)
- Maintainability: NFR-M1 to NFR-M4 (4) — specific (1-file edits, pure-fn testability)
- Compatibility: NFR-C1 to NFR-C4 (4) — specific (Node 24 LTS, pnpm, platform matrix)

All NFRs measurable with clear pass/fail criteria.

### Additional Requirements — captured

Ported from Architecture document into Epic 1 scope:

- Starter scaffold command sequence (→ Story 1.1)
- `node --env-file=.env --import tsx src/index.ts` runtime (→ Story 1.3)
- `.claude/.mcp.json` committed ready-to-run (→ Story 1.1)
- Module boundaries (→ enforced by Stories 1.2, 1.3)
- Code shape: MCP registration top → public ops → private helpers (→ Stories 2.x, 3.x)
- Three callable providers for MS deep-import, extracted to shared `src/ms-providers.ts` (→ Story 1.3, refactored during Story 2.3)
- Canonical `tsconfig.json` (→ Story 1.1)
- Startup error-handling pattern (→ Story 1.3)
- `.env` gitignored from first commit (→ Story 1.1)

### PRD Completeness Assessment

**Complete.** High information density, measurable requirements, clear traceability chain (Vision → Success → Journeys → FRs → NFRs). Dual-audience quality (human + LLM) confirmed. No ambiguities requiring clarification.

---

## Step 3 — Epic Coverage Validation ✅

### Epic ↔ FR Coverage Map (2026-04-22 resync)

| FR | Epic | Story | Mechanism |
|---|---|---|---|
| FR1 fetch single | Epic 2 | 2.1 | Skill `/azdo-fetch-tickets` → MS `wit_get_work_items_batch_by_ids({ ids: [N] })` |
| FR2 fields returned | Epic 2 | 2.1 | Same call; MS response carries title/state/priority/description/relations |
| FR3 fetch multiple by IDs | Epic 2 | 2.1 | Same call with multi-ID array |
| FR4 fetch by iteration | Epic 2 | 2.1 | Skill builds WIQL with `@CurrentIteration('[project]\team')` → MS `wit_query_by_wiql` → MS `wit_get_work_items_batch_by_ids` |
| FR5 filter by priority | Epic 2 | 2.1 | Skill builds WIQL with `[Microsoft.VSTS.Common.Priority] = N` → query → batch |
| FR6 WIQL query | Epic 2 | 2.1 | MS `wit_query_by_wiql` (user's raw SELECT passed verbatim) |
| FR7 field subset | Epic 2 | 2.1 | `fields` param on MS `wit_get_work_items_batch_by_ids` |
| FR8 create work item | Epic 3 | 3.1 | Skill `/azdo-create-ticket` → MS `wit_create_work_item` (fields array incl. System.Title, System.Description as Markdown) |
| FR9 create with links | Epic 3 | 3.2 | Same skill extended → MS `wit_work_items_link` (multi-link batch + all-or-nothing pre-validation) |
| FR10 post comment | Epic 3 | 3.3 | Skill `/azdo-add-comment` → MS `wit_add_work_item_comment` |
| FR11 Markdown format | Epic 3 | 3.3 | MS `wit_add_work_item_comment.format: "Markdown"` (default) |
| FR12 list iterations | Epic 2 | 2.3 | Author `list_recent_iterations` (top-N) + MS `work_list_team_iterations` (full enumeration) |
| FR13 timeframe filter | Epic 2 | 2.3 | MS `work_list_team_iterations.timeframe` param |
| FR14 iteration name→GUID | Epic 2 | 2.1 / 4.1 | Skill-orchestrated; no tool change required |
| FR15 skill discovery | Epic 1 | 1.1 | `.claude/skills/` layout established; reinforced every epic |
| FR16 slash-command trigger | Epics 2/3/4 | 2.1, 3.1, 3.3, 4.1 | Each skill has slash-command AC |
| FR17 multi-tool compound skill | Epics 2/3/4 | 2.1, 3.1, 3.2, 3.3, 4.1 | Skills orchestrate sequentially |
| FR18 conversational param collection | Epics 2/3/4 | 2.1, 3.1, 3.2, 3.3, 4.1 | Each skill asks for missing inputs (AC) |
| FR19 edit skill without rebuild | Epic 1 | 1.1 + all skill stories | Markdown-only runtime |
| FR20 ship skill set | Epics 2/3/4 | 2.1, 3.1, 3.3, 4.1 = 4 skills at MVP | Original 5-skill aspiration met cumulatively across the epic roadmap (additional skills ship in post-MVP epics) |
| FR21 `.env` config load | Epic 1 | 1.2 | `src/config.ts` + native `--env-file` |
| FR22 fail-fast on missing env | Epic 1 | 1.2 / 1.3 | Throws at module-load |
| FR23 PAT auth | Epic 1 | 1.3 | `src/client.ts` + `getPersonalAccessTokenHandler` |
| FR24 `.mcp.json` host entry | Epic 1 | 1.1 | `.claude/.mcp.json` committed |
| FR25 MS tools in namespace | Epic 1 / 2 / 3 | 1.3 + 2.3 + 3.4 (pending) | `configureWorkItemTools` (1.3), `configureWorkTools` (2.3), `configureCoreTools` (3.4 pending audit), `configureWikiTools` deferred with FR27 |
| FR26 MD comment workaround | Epic 3 | 3.3 | Inherited via MS `wit_add_work_item_comment` — MS handles the `7.2-preview.4` call internally; no author raw-REST code |
| FR27 wiki ETag workaround | — | — | Deferred to Phase 2 (no wiki primitive or `configureWikiTools` wire at MVP) |
| FR28 unified namespace | Epic 1 | 1.3 | Author tools + MS `wit_*` etc. coexist |
| FR29 MCP spec compliance | Epic 1 | 1.3 | `@modelcontextprotocol/sdk` stdio |
| FR30 response shape | Epic 1 + per tool | 1.3 + per-story | Pattern enforced |
| FR31 error propagation | Epic 1 + per tool | 1.3 + try/catch pattern | `isError: true` pass-through |
| FR32 stdout discipline | Epic 1 + per tool | 1.3 + convention | No `console.log` in runtime |

**Coverage summary:** **31 / 32 FRs covered at MVP.** FR27 (wiki ETag workaround) explicitly deferred to Phase 2.

**Project-wide rule for write skills:** [`.claude/rules/mutation-confirmation.md`](../../.claude/rules/mutation-confirmation.md) — every write skill (`/azdo-create-ticket`, `/azdo-add-comment`, `/azdo-sprint-report`) must render a preview, accept explicit user approval or edits, and only then mutate. Enforced through each write story's AC rather than a dedicated FR line.

### No uncovered FRs

All MVP-scope FRs have at least one story with testable AC.

### No orphan stories

Every story maps back to one or more FRs. No story exists for speculative or out-of-scope features.

---

## Step 4 — UX Alignment ✅

**N/A by design.** AzDo MCP has no UI. All user interaction happens through Claude Code's chat interface, orchestrated by five `SKILL.md` markdown files whose interaction patterns (step ordering, parameter prompts, confirmation phrasing, error handling) are embedded in the skill files themselves.

**Verification:** every skill story (2.1, 3.1, 3.2, 3.3, 4.1) contains explicit AC covering:

- Slash-command trigger availability
- Missing-parameter conversational prompting
- Tool call sequence (which primitive gets called with what args)
- Response formatting for user presentation
- Error-path behavior (`isError: true` surfacing)

No separate UX spec was required or produced.

---

## Step 5 — Epic Quality Review ✅

### Story Quality

| Criterion | Result |
|---|---|
| Each story completable by single AI agent in one session (~20-45 min) | ✅ all 14 sized appropriately |
| Clear AC with Given/When/Then | ✅ all stories use pattern |
| AC are specific and testable (no subjective adjectives) | ✅ concrete conditions (tool names, file paths, exact parameters, version strings) |
| No forward dependencies | ✅ within-epic sequencing linear; cross-epic only forward to backward |
| Scope sized for single dev agent | ✅ each story edits 1 file or adds 1 primitive/skill |

### Epic Structure

| Criterion | Result |
|---|---|
| User-value focus, not technical layers | ✅ each epic delivers standalone functionality |
| Natural dependency flow | ✅ 1 → (2+3) → 4 |
| Foundation epic creates only necessary setup | ✅ Epic 1 = 4 stories; scaffold + config + client + entry |
| No large upfront technical work | ✅ database/entities N/A; scaffold creates stubs only |
| Each epic independently valuable | ✅ Epic 1 alone gives Claude MS work-items tools; Epic 2 alone gives reads; Epic 3 alone gives writes |

### Dependency Audit

**Within-epic (resynced 2026-04-22 after Epic 2 + Epic 3 pivots):**

- Epic 1: 1.1 → 1.2 → 1.3 (linear — Story 1.4 merged into 1.3 as "running MCP server with MS work-items tools")
- Epic 2: 2.1 (unified `/azdo-fetch-tickets` skill + `get_project_context` support tool) → 2.3 (`list_recent_iterations` + MS work-domain bulk-wire). Original 2.2 / 2.4 / 2.5 collapsed into 2.1 per the skill-vs-primitive read-path research.
- Epic 3: 3.1 (`/azdo-create-ticket` baseline, create-only) → 3.2 (link-support extension to same skill) → 3.3 (`/azdo-add-comment` skill) → 3.4 (MS core-tools bulk-wire for picker UX — independent augmentation). Original 3.1 / 3.2 author primitives abandoned per the skill-vs-primitive write-path research.
- Epic 4: 4.1 standalone markdown

**Cross-epic:**

- Epic 2 depends on Epic 1 (scaffold + client + MS wiring). ✅ valid backward dependency
- Epic 3 depends on Epic 1 + Epic 2 (work-items.ts pattern established in 2.1). ✅ valid backward dependency
- Epic 4 depends on Epic 1 + 2 + 3 (compound skill uses all primitives). ✅ valid backward dependency

**No forward dependencies detected.** No story waits on a future story.

### Architecture Compliance

- ✅ Starter setup (scaffold command) is Epic 1 Story 1.1 — matches BMad pattern.
- ✅ Module boundaries enforced by story AC (`process.env` only in 1.2; `new WebApi` and `@azure-devops/mcp/dist/*` deep-imports only in Story 1.3 and each `src/tools/*.ts`).
- ✅ Code shape discipline encoded in tool stories (2.1 AC explicitly verifies skill + support-tool registration).
- ✅ Error-handling pattern (try/catch at boundary, raw message pass-through) present in every handler AC.
- ✅ Logging discipline (stderr only, no `console.log`) in Story 1.3 AC.

---

## Step 6 — Final Assessment

### Overall Readiness Status

# 🟢 READY FOR IMPLEMENTATION

All four required planning artifacts (Brief, PRD, Architecture, Epics) are complete, validated, and internally consistent. Downstream implementation agents have sufficient detail to execute stories without further clarification.

### Critical Issues Requiring Immediate Action

**None.** No blocking issues identified.

### Minor Observations (informational, not blocking)

1. **FR27 explicitly deferred to Phase 2.** Documented in PRD, Architecture, and Epic 1 scope. This is a conscious scope decision, not a gap.
2. **One cross-file dependency** (Stories 2.1 and 3.1 both mutate `src/tools/work-items.ts`). Not a blocker — Story 1.1 creates the stub, subsequent stories append. AI agent executes in story order, so the ordering holds naturally.
3. **No automated tests at MVP.** Testability is structurally preserved (pure operations accept `api: WebApi`), but no CI/test harness ships with MVP. Acceptable for personal throwaway scope.
4. **Historical artifacts may reference older naming** (research doc uses `dotenv`, older `.env.example` pattern). Canonical source of truth is PRD + Architecture + Epics; research is reference material only.

### Recommended Next Steps

1. **Commit planning artifacts** to the repository before starting implementation (see "Pre-Implementation Checklist" below).
2. **Execute Epic 1 Story 1.1** (Project Scaffold) in a fresh Claude Code context window with Architecture and Epics as input. Estimated ~30 minutes.
3. **Proceed story-by-story in epic order** (1.1 → 1.2 → 1.3 → 1.4 → 2.1 → … → 4.1). Each story is self-contained with testable AC.
4. **Use MCP Inspector between stories** for interactive validation, especially after Epic 1 (verify auth works) and after each primitive in Epic 2/3 (verify MCP tools list and input/output).
5. **Time-budget discipline:** 5-hour cap. If overrun likely at any checkpoint, apply the pre-committed scope cuts in priority order: (a) drop Epic 3 Story 3.2 (link support), (b) drop Epic 3 Story 3.4 (MS core-tools bulk-wire for picker UX), (c) drop `/azdo-create-ticket` entirely, (d) drop secondary skills. The sprint-report path (`list_recent_iterations`, MS `wit_query_by_wiql` + `wit_get_work_items_batch_by_ids`, MS `wit_add_work_item_comment`, `/azdo-sprint-report`) is load-bearing and stays.

### Pre-Implementation Checklist (commit strategy)

Before opening a new implementation context:

1. **Review `_bmad/` folder.** If installer-generated metadata contains nothing project-specific, commit as-is. If it contains modifications, review first.
2. **Git init the repo** (if not already initialized) at the project root.
3. **Create `.gitignore`** at repo root now (before any `.env` file can exist) listing at minimum:
   ```
   node_modules/
   .env
   ```
4. **Stage and commit planning artifacts** with a descriptive initial commit:
   - `specs/planning/product-brief-azdo-mcp.md`
   - `specs/planning/prd.md`
   - `specs/planning/architecture.md`
   - `specs/planning/epics.md`
   - `specs/planning/implementation-readiness-report-2026-04-21.md`
   - `specs/planning/research/technical-azure-devops-mcp-market-scan-research-2026-04-21.md`
   - `_bmad/` (if BMad metadata is useful to check in; skip if out of scope)
5. **Suggested commit message:**
   ```
   Plan AzDo MCP — Brief, PRD, Architecture, Epics, Readiness

   Complete BMad planning pipeline for a 5-hour MVP MCP server
   exposing Azure DevOps through Claude Code. 32 FRs across 4 epics
   and 14 stories; architecture ready for story-by-story AI execution.
   ```
6. **Confirm the working tree is clean** before creating the first implementation commit.

### Remaining BMad Steps Before Code (optional)

| Step | Verdict for this project |
|---|---|
| `bmad-sprint-planning` | **Skip.** 14 stories with natural ordering; formal sprint plan is overhead for 5h MVP. |
| `bmad-create-story` per story | **Skip at MVP.** Per-story context documents useful for large teams; overkill here. |
| `bmad-dev-story` story cycle | **Optional.** Canonical path for AI-assisted dev; each invocation implements one story. Worth considering for Epic 1 Story 1.1 to establish a repeatable rhythm, then decide whether to continue or switch to ad-hoc implementation. |
| Ad-hoc implementation in Claude Code | **Recommended.** Plans + architecture are self-sufficient spec. Direct implementation is the fastest path under the 5h cap. |

### Final Note

This assessment identified **zero** critical issues across six validation categories. The planning pipeline is thorough, internally consistent, and ready for direct AI-assisted implementation. The project may proceed to Epic 1 Story 1.1 without further planning work.
