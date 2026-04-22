---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: 'complete'
completed: '2026-04-21'
inputDocuments:
  - specs/planning/research/technical-azure-devops-mcp-market-scan-research-2026-04-21.md
  - specs/planning/product-brief-azdo-mcp.md
documentCounts:
  briefCount: 1
  researchCount: 1
  brainstormingCount: 0
  projectDocsCount: 0
classification:
  projectType: cli_tool
  projectTypeNote: "MCP server — not in BMad taxonomy; cli_tool is closest structural match (local stdio process, package-managed, config via files)"
  domain: general
  complexity: low
  projectContext: greenfield
  targetAudience: "Any Claude Code user working with Azure DevOps — developers, PMs, QAs, designers, anyone (NOT developer-specific)"
  stack:
    runtime: "Node.js 24 LTS"
    packageManager: pnpm
    language: TypeScript
    host: "Claude Code"
    transport: stdio
workflowType: 'prd'
---

# Product Requirements Document — AzDo MCP

**Author:** Dmitry
**Date:** 2026-04-21

## Executive Summary

**AzDo MCP** is a personal MCP (Model Context Protocol) server that makes Azure DevOps operable from within Claude Code. It pairs a minimal set of server-side primitives — fetch work items, batch-fetch by criteria, post comments, create tickets — with a library of Claude Skills that orchestrate real workflows without compiled code. The product is for any Claude Code user who works in Azure DevOps (developer, PM, QA, designer — not developer-specific), and it targets a single behavioral outcome: **eliminate the browser tab for AzDO plumbing work**.

The architectural bet is deliberate: **Skills are the UI. MCP is the bus.** Primitives stay minimal and thin; business logic lives in markdown-edited `SKILL.md` files that any user can author, edit, and share without a rebuild cycle. Microsoft's `@azure-devops/mcp@2.6.0` is deep-imported for ecosystem-wide AzDO capabilities (inheriting their raw-REST workarounds for Markdown comments and wiki ETag handling), while compound workflows — which Microsoft explicitly refuses to ship upstream — live in the Skills layer under the project's control. The result: one MCP server, one PAT-based auth stack, five primitives, five skills, five hours to MVP.

The timing is not accidental. MCP adoption went vertical in Q1 2026 (97M monthly SDK downloads, up from 2M at launch in late 2024), Claude Code became the #1 AI coding tool in eight months, and Azure DevOps users remain structurally excluded from the agentic workflows that GitHub and Linear users take for granted. Microsoft's own Copilot for Azure Boards does not support work-item dependencies or concurrent operations. The gap is real, the tooling is mature, and the cost of filling it for personal use is measured in hours — not quarters.

### What Makes This Special

- **First MCP+Skills stack for Azure DevOps.** Every other MCP server for AzDO (Microsoft's included) stops at the primitive layer; compound workflow logic is absent by design. AzDo MCP inverts this: primitives are scaffolding, skills are the product.
- **Markdown is the compiler.** New workflows are authored as markdown `SKILL.md` files. No TypeScript, no rebuild, no release. The iteration loop for adding behavior is minutes, not days.
- **Permanent architectural niche.** Microsoft's `CONTRIBUTING.md` explicitly declines to accept "complex tools that require extensive logic". This is not a temporary feature gap — it is a design boundary that will not move. The primitives-plus-skills split is therefore defensible without a technical moat.
- **Built by its user for its user.** The author uses Azure DevOps and Claude Code daily, knows the REST API, and iterates against their own workflow. Every design decision optimizes for one real user's loop. No product manager translating user research into specs.
- **Generalizable pattern.** The primitives-plus-skills architecture is a reference template for any SaaS-to-MCP adapter (Jira, ServiceNow, Notion, others). The product's long-tail value extends beyond Azure DevOps.

## Project Classification

| Dimension | Value |
|---|---|
| **Project Type** | `cli_tool` (closest match in BMad taxonomy — MCP server is a novel category: local stdio process, package-distributed, config via files) |
| **Target Audience** | Any Claude Code user working with Azure DevOps — developers, PMs, QAs, designers, any role |
| **Domain** | `general` — no specialized compliance frameworks apply |
| **Complexity** | `low` — narrow scope, established patterns, 5h build |
| **Project Context** | `greenfield` — new codebase, no existing constraints |
| **Runtime** | Node.js 24 LTS, TypeScript |
| **Package Manager** | pnpm |
| **Host** | Claude Code |
| **Transport** | stdio (MCP over JSON-RPC) |
| **Distribution** | GitHub repository, currently private; licensing decision deferred |

## Success Criteria

### User Success

The sole primary user is the author. User success is defined by **observable behavior change over a full sprint**:

- **Binary signal (pass/fail per sprint):** zero browser tabs opened to `dev.azure.com` for plumbing work — reports, ticket writes, comment posts, context fetches. One manual UI visit for plumbing = sprint failed.
- **End-of-sprint report cycle** collapses from ~30 minutes of clicking to a single `/azdo-sprint-report` invocation.
- **Ticket composition** — "read feature X, draft follow-up, create it" — completes in one Claude Code turn rather than a multi-tab expedition.
- **Context-fetching** — "pull ticket 1234, summarize" — is a slash-command, never a browser navigation.

### Project Success

Substituted for business success (non-commercial personal tool):

- **Build cost stays within 5-hour hard cap.** If author exceeds 5 hours, architecture failed; scope must be cut.
- **Extensibility claim is empirically proven at MVP:** five skills ship, not one. The "edit one markdown file to add a skill" promise is demonstrated, not asserted.
- **No MS-release coupling:** pinned `@azure-devops/mcp@2.6.0` isolates the project from Microsoft's monthly cadence; upgrades are opt-in, never forced.
- **Single-auth simplicity:** no `.mcp.json` secret material, no dual interactive-OAuth + PAT stacks. One PAT, one `.env`, one process.

### Technical Success

- **All 5 MCP primitives return structurally correct data** for the happy path (valid PAT, existing ticket, existing iteration).
- **stdio transport is clean:** zero `console.log` regressions, JSON-RPC protocol never corrupted.
- **Markdown-comment workaround** (api-version 7.2-preview.4) operates via MS deep-import without author-written REST code.
- **Wiki ETag retry** operates via MS deep-import without author-written REST code.
- **Claude Code picks up all 5 skills** via `.claude/skills/*/SKILL.md` convention on fresh session start.
- **`.env` gitignored from the first commit** so no secret material can be committed accidentally.

### Measurable Outcomes

| Outcome | Target | How measured |
|---|---|---|
| Browser tabs opened to `dev.azure.com` during a sprint | 0 (for plumbing) | Self-tally, first 3 sprints post-ship |
| Time to generate & publish sprint report | < 2 minutes end-to-end | Wall-clock on `/azdo-sprint-report` invocation |
| Skills shipped in MVP | 5 (not 1) | Count in `.claude/skills/` directory |
| Build hours consumed | ≤ 5 hours | Self-tracked during build session |
| MCP server cold start (skill → first tool call) | < 2s | Inspector timing |
| Accidental `.env` commits | 0 | Git history / pre-commit hook |

## Product Scope

### MVP Strategy & Philosophy

**MVP Approach: Problem-solving MVP.** The product solves one concrete, daily pain (browser tabs for AzDO plumbing work) with the smallest possible surface that delivers end-to-end value. Every scope decision filters through: *"Does this move the binary success signal — zero browser tabs during a sprint — closer to true?"* If the answer is no, it's deferred.

Not a platform MVP (no ecosystem ambition in MVP), not a revenue MVP (non-commercial), not an experience MVP (no UI to polish). The job is to make one developer's sprint-close cycle invisible. Everything else is Phase 2+.

### Resource Requirements

- **Team size:** 1 (the author).
- **Time budget:** 5 hours, hard cap. If exceeded, scope gets cut — not the cap.
- **Skill prerequisites (already met):** Node/TypeScript fluency, familiarity with Azure DevOps REST API, prior use of Claude Code, working AzDO PAT.
- **Infrastructure:** none. Local Node process, local `.env`, local MCP host.
- **External dependencies:** `@modelcontextprotocol/sdk`, `@azure-devops/mcp@2.6.0` (pinned), `azure-devops-node-api`, `zod`, `tsx`. No `dotenv` — Node 20.6+ loads `.env` natively via `--env-file`. All installed via `pnpm` during scaffold.

### MVP — Minimum Viable Product (5-hour hard cap)

**MCP primitives (5):**

- `get_work_item` — fetch by ID, return title/description/priority/state/comments/links
- `list_work_items` — batch fetch by iteration / priority / WIQL / explicit ID list
- `create_work_item` — create with full field control
- `add_comment` — post Markdown-formatted comment on a work item
- `list_recent_iterations` — last N iterations by start date (MS `work_list_team_iterations` bulk-wired for timeframe enumeration)

**Claude Skills (5):**

- `/azdo-fetch-ticket` — single-ticket context retrieval
- `/azdo-fetch-tickets` — batch retrieval with criteria
- `/azdo-sprint-report` — iteration → markdown report
- `/azdo-create-ticket` — conversational ticket creation
- `/azdo-add-comment` — post comment from chat

**Infrastructure:**

- Deep-import of `@azure-devops/mcp@2.6.0` (pinned exact) — provides ecosystem-wide AzDO tool surface with MS raw-REST workarounds inherited.
- Node.js 24 LTS / TypeScript, pnpm, stdio transport.
- `.env` loaded by Node's native `--env-file` flag (no `dotenv` package): `AZDO_ORG_URL`, `AZDO_PAT`, `AZDO_DEFAULT_PROJECT`, `AZDO_DEFAULT_TEAM`.
- `.env` file with real configuration values; listed in `.gitignore` from the first commit. No separate `.env.example` template — simpler for a local personal tool.
- PAT scopes documented in README: Work Items (Read & Write), Wiki (Read & Write), Project & Team (Read).
- GitHub repo (currently private). No `LICENSE` file at MVP — licensing decision deferred until / if the project goes public.
- Unit test coverage: none mandatory at MVP. Pure functions (if introduced) may be tested with Node's native test runner; tests are opt-in, not required.

### Growth Features (Post-MVP, no commitments)

Added organically as real pain emerges:

- Additional skills: `/azdo-prep-standup`, `/azdo-prep-retrospective`, `/azdo-triage-bugs`, `/azdo-create-epic-with-children`.
- PR-review primitives + skills (`get_pull_request`, `list_pr_changes`, `post_pr_comment`).
- Multi-project / multi-org runtime switching.
- Bootstrap script (`pnpm azdo-mcp init`) for faster onboarding.
- PAT-scope preflight / doctor command.
- Structured error translation (401 → "PAT missing scope X").
- Skill templates / `SKILLS.md` author guide.

### Vision (Future, directional)

- **Claude as AzDO Scrum Master.** Planning sessions open with Claude summarizing velocity, flagging carryover, proposing iteration plans. Triage happens conversationally. Capacity management, backlog reordering, cross-iteration coordination — all skill-driven.
- **Azure DevOps becomes a backend, not a destination.** The AzDO UI tab becomes a rarity, reserved for the 5% of tasks that genuinely need a GUI.
- **Primitives-plus-skills pattern generalizes.** This project becomes a reference template for Jira-MCP, ServiceNow-MCP, Notion-MCP adapters. Long-tail value extends beyond Azure DevOps.

## User Journeys

### Journey 1 — Dmitry, End of Sprint (Happy Path, Core Experience)

**Opening scene.** Friday evening, sprint 34 just closed. Previously, Dmitry would open six Azure DevOps tabs, filter the board by iteration, click into each of twenty-three work items in turn, skim descriptions, type titles into a note-taking app, curse at the formatting, paste into a comment box on the epic, and publish. Thirty minutes of tab-switching, none of it thinking. This time, the board tab isn't open.

**Rising action.** Dmitry opens Claude Code, types `/azdo-sprint-report`. Claude reads the skill's markdown, asks for the target iteration (offers "current" as default), builds WIQL with `@CurrentIteration('[project]\team')` and runs `wit_query_by_wiql` to get 23 IDs, then `wit_get_work_items_batch_by_ids` to fetch title/description/priority/state for each. Claude returns a markdown draft — grouped by state (Done / In Progress / Blocked), sorted by priority, one-line summaries per item. Dmitry reads it: accurate. He says "publish it as a comment on epic 4521." Claude calls `add_comment`. Done.

**Climax.** The whole exchange took 90 seconds of wall-clock time and zero browser tabs. Dmitry checks the comment in Azure DevOps once, out of reflex — it's there, perfectly formatted, Markdown rendered correctly via Microsoft's api-version 7.2-preview.4 workaround he doesn't think about.

**Resolution.** He closes Claude Code and goes home. The 30-minute weekly chore is now a slash-command. The product works.

**Reveals requirements for:** `list_recent_iterations` (sprint-report's "last N sprints" scenario), MS-inherited `wit_query_by_wiql` + `wit_get_work_items_batch_by_ids` (query → batch read), `add_comment` (Markdown format), and the orchestrating `/azdo-sprint-report` skill with intent collection (target iteration, publish target).

### Journey 2 — Dmitry, Follow-Up Ticket Composition

**Opening scene.** Monday standup: a stakeholder asks for a follow-up ticket from feature 8812 to extend scope. Previously, Dmitry would open feature 8812, scan its description, open its three linked items by ID to remember context, copy-paste fragments into a blank "new work item" dialog, figure out which fields the template requires, click save, lose focus. Ten minutes. This time, he types into Claude.

**Rising action.** Dmitry says: *"Pull feature 8812 and its children. Draft a follow-up ticket in the same format — scope: extending the export pipeline to support CSV. Link it to 8812 as Related."* Claude invokes `/azdo-create-ticket`, which fetches 8812 and its children via `get_work_item` and `list_work_items`, reads their descriptions to internalize tone and structure, drafts a title and Markdown description using the same template. Shows Dmitry the draft inline. Dmitry says "looks good, create it."

**Climax.** `create_work_item` runs; the ticket appears in AzDO with ID 9104. Claude replies with the ID and a link. Dmitry never left his terminal.

**Resolution.** He moves on to actual coding. The plumbing that used to fragment his morning now fits in one conversational turn.

**Reveals requirements for:** `get_work_item` (with linked-items expansion), `create_work_item` (full field control including templates and link types), and a composing `/azdo-create-ticket` skill that can read context and propose structure.

### Journey 3 — Dmitry, Edge Case: Missing PAT Scope

**Opening scene.** Dmitry just rotated his PAT. He typed the new token into `.env`, restarted Claude Code, and ran `/azdo-sprint-report`. Something is wrong.

**Rising action.** The MCP server starts fine, the skill loads, the iteration list returns — but `get_work_items` returns a 401 Unauthorized. Claude surfaces the error raw: `"Azure DevOps API returned 401"`. Dmitry is annoyed but not surprised: he forgot to tick "Work Items (Read & Write)" when generating the new PAT.

**Climax.** He opens the PAT management page, regenerates the token with correct scopes (documented in the repo's README), updates `.env`, restarts the server, re-runs the skill. It works.

**Resolution.** Not painless, but self-diagnosable in under three minutes. Better error translation (`"PAT missing scope: Work Items (Read & Write)"`) is on the Growth backlog — acknowledged as MVP friction, not blocker.

**Reveals requirements for:** structured error propagation from the MCP tool through Claude back to the user (error text must be LLM-readable); clear README documentation of PAT scopes; acceptance that unstructured errors are MVP-acceptable.

### Journey 4 — Alex (Colleague), First Run

**Opening scene.** Alex is a PM. She's been curious about Dmitry's `/azdo-sprint-report` trick all week. She asks him for the repo link; he DMs it with "good luck".

**Rising action.** She clones the repo, runs `pnpm install`, reads the README. It lists prerequisites: Node 24 LTS, Claude Code, an Azure DevOps PAT with three scopes. She has all three (she uses AzDO daily, has Claude Code installed, and knows how to generate a PAT). She creates a `.env` file following the four field names listed in the README, adds the `.mcp.json` snippet to her project root. She restarts Claude Code. She types `/azdo-sprint-report`. It works.

**Climax.** She sees the report in her comment thread. She goes back to Dmitry: "Can you add one for retrospective prep?" He shrugs — she already has the repo, and skills are markdown files — "write it yourself, it's a markdown file."

**Resolution.** Alex doesn't write it that day. But the architecture has done its job: the pull model held. She didn't ask for a tutorial; the README was enough. She hit no errors because her setup was standard. The one-colleague-without-hand-holding success signal fires, despite Dmitry not caring whether it does.

**Reveals requirements for:** a README with a five-minute setup flow (prerequisites list, PAT scope table, explicit `.env` field list with comments, `.mcp.json` snippet, first-run test command); `.env` gitignored from first commit; one reference skill fully documented as a pattern; implicit assumption that colleague already has prerequisites (Claude Code, Node 24 LTS, AzDO access).

### Journey Requirements Summary

| Capability area | Journeys that require it | Source primitive / skill |
|---|---|---|
| Iteration resolution (current / by name / by ID) | 1 | WIQL `@CurrentIteration('[project]\team')` (via `wit_query_by_wiql`) for the skill-layer default; `list_recent_iterations` + MS `work_list_team_iterations` when a skill needs explicit enumeration |
| Batch work-item fetch by iteration | 1 | `list_work_items` |
| Batch work-item fetch with field selection | 1, 2 | `get_work_items` (via MS batch) |
| Single work-item fetch with linked-items | 2 | `get_work_item` |
| Work-item creation with link types | 2 | `create_work_item` |
| Markdown comment posting | 1 | `add_comment` |
| Error propagation to LLM (basic, unstructured) | 3 | MCP tool response shape |
| `.env` config with four required fields | 3, 4 | `src/config.ts` validation |
| README + prerequisite documentation | 4 | Non-code deliverable |
| Skill orchestration (multi-step, intent collection) | 1, 2 | 5 Claude Skills |

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Skills-as-UI, MCP-as-bus inversion.** Where every other Azure DevOps MCP stops at primitives, AzDo MCP delegates compound logic entirely to Claude Skills (`.claude/skills/*/SKILL.md`). This is an architectural bet that editable markdown prose is a superior substrate for business logic than compiled TypeScript compound tools. Not novel in isolation — the MCP+Skills combination in the wider Claude ecosystem is young but emerging — but **first application to Azure DevOps**.
- **Primitives-plus-skills as reference architecture.** The same decomposition applies to Jira, ServiceNow, Notion, GitHub Issues, Linear. Documenting the pattern (even implicitly via the code) makes the project a template beyond its AzDO scope.
- **Markdown-as-compiler for workflows.** Adding behavior to the system is editing one `SKILL.md` file; no rebuild, no release cycle, no TypeScript. Inverts the usual cost curve of extending a developer tool.

### Market Context

- Microsoft refuses compound business logic upstream (`CONTRIBUTING.md`): structural, not tactical. Permanent gap.
- No direct competitor targets Azure DevOps with a MCP+Skills stack as of 2026-04-21. Linear AI and Atlassian Rovo occupy parallel ecosystems. Closest analogs (Tiberriver256, Vortiago, RyanCardin15 community servers) all stop at primitive API coverage, without skill layering.
- Claude Code is the dominant MCP host (#1 AI coding tool 2026); Skills adoption is nascent but supported by Anthropic's direction.

### Validation Approach

- **Primary validation:** five skills ship at MVP, proving the "add behavior = edit markdown" claim empirically with N=5, not N=1.
- **Secondary validation:** primitives are structured for testability (pure async functions receiving the AzDO API client as a parameter). Unit tests are optional at MVP — added only when specific logic demands them, not by default.
- **Usage validation:** the Success Criteria binary signal (zero browser tabs for plumbing) is the end-to-end test. If behavior change happens over one full sprint, the architecture works.

## Risks & Mitigations

Consolidated from innovation analysis and scoping exercise. All risks tracked with explicit mitigation path.

### Technical Risks

- **MS deep-import breakage on upgrade.** `@azure-devops/mcp`'s `dist/tools/*.js` paths are not part of a public API; Microsoft may reorganize them or change `configure*Tools` signatures at any release. **Mitigation:** pin exact version `2.6.0`; upgrades opt-in. Fallback path documented: reimplement 5 primitives directly on `azure-devops-node-api` (6-12h migration, raw-REST helpers for Markdown comments and wiki ETag already understood from research).
- **stdio stdout pollution.** Any accidental write to stdout outside the SDK breaks JSON-RPC silently. **Mitigation:** convention enforced (all logging to stderr); MCP Inspector catches regressions during dev loop.
- **Markdown-comment / wiki-write REST version gaps.** The typed `azure-devops-node-api` lags (`addComment` pinned to 7.1-preview.3, no wiki create/update method). **Mitigation:** pre-solved by MS's own raw-REST helpers inherited via deep-import — zero author-side risk at MVP.
- **Skills DX brittleness.** Markdown orchestration may fail on edge cases (wrong iteration picked, empty state, hallucinated work-item IDs). **Mitigation:** ship five skills at MVP to expose failure patterns early; iterate on prompt quality via MCP Inspector; Growth backlog includes structured error translation.

### Strategic Risks

- **Microsoft Remote MCP deprecates local server over time.** MS shipped a Remote MCP in public preview on 2026-03-17 and has stated it will "over time replace the local MCP Server." **Mitigation:** no timeline announced; local + PAT design remains correct for a personal tool today; re-evaluate against Remote MCP if/when Microsoft sets a sunset date.
- **Host lock-in to Claude Code.** The MCP server is portable to any MCP host, but Claude Skills are a Claude-specific orchestration layer. Users on other hosts get primitives but lose skill orchestration. **Mitigation:** acceptable — Claude Code is #1 AI coding tool by adoption; personal tool scope does not require host portability.

### Market Risks

- **N/A** — non-commercial personal tool. No customer acquisition, no competitive positioning to defend. The only "market" signal is the author's own continued use.

### Resource Risks

- **5-hour budget overrun.** **Mitigation:** pre-committed scope cuts in priority order: first drop `create_work_item` complexity (fields/links), then drop `/azdo-create-ticket` skill, then drop secondary skills. The sprint-report path (`list_recent_iterations`, MS `wit_query_by_wiql` + `wit_get_work_items_batch_by_ids`, `add_comment`, `/azdo-sprint-report`) is load-bearing and stays.
- **Fatigue / context loss mid-build.** **Mitigation:** scaffolding-first (30 min); primitives one-at-a-time with MCP Inspector validation; each 45-minute block ends with a working-state checkpoint.

## cli_tool-Specific Requirements (MCP Server Adaptation)

### Project-Type Overview

AzDo MCP is a local MCP server: a Node/TypeScript process invoked by Claude Code via stdio, communicating in JSON-RPC per the Model Context Protocol specification. It is structurally a `cli_tool` (a package-distributed, locally-invoked process configured via files), but it is semantically a **protocol endpoint** — the user never interacts with stdio directly; Claude does, on the user's behalf.

### Technical Architecture Considerations

- **Protocol:** MCP over JSON-RPC over stdio. `@modelcontextprotocol/sdk` v1.29+ handles framing, tool dispatch, and transport.
- **Process model:** Single stdio child process, spawned by the host (`claude` via `.mcp.json`), lifetime-bound to the Claude Code session.
- **Concurrency:** Single-threaded Node event loop; Azure DevOps calls are I/O-bound, so concurrent tool invocations are safe within V8's standard async model.
- **State:** No persistence layer. `WebApi` connection is a lazy singleton in-process; restarts = fresh state.
- **Boundary discipline:** stdout is reserved for JSON-RPC protocol messages. All logging uses `console.error` (stderr). Any stdout write outside the SDK breaks the protocol silently. Enforced by convention and caught by MCP Inspector during development.

### Command Structure (MCP Tool Surface)

**5 author-defined primitives** registered via `server.registerTool()`:

| Tool | Input schema (zod) | Returns |
|---|---|---|
| `get_work_item` | `{ id: number, expandLinks?: boolean }` | Work item JSON (title, description, state, priority, comments, linked items) |
| `list_work_items` | `{ criteria: { iteration?: string, priority?: number, wiql?: string, ids?: number[] }, fields?: string[] }` | Array of work item JSONs (batch-fetched) |
| `create_work_item` | `{ project: string, type: string, title: string, description?: string, fields?: Record<string,any>, links?: Array<{id, type}> }` | Created work item ID + URL |
| `add_comment` | `{ workItemId: number, comment: string, format?: "Markdown" \| "Html" }` | Comment ID |
| `list_recent_iterations` | `{ project: string, team: string, limit?: number (positive int, default 2) }` | Array of iteration objects (id, name, path, attributes) sorted by `startDate` descending; timeframe filtering delegated to MS-inherited `work_list_team_iterations` via bulk-wired `configureWorkTools` |

**Deep-imported from `@azure-devops/mcp@2.6.0`:**

- `configureWorkItemTools(server, tokenProvider, connectionProvider, userAgentProvider)` — registers `wit_*` tools (~23 operations).
- `configureWorkTools(...)` — registers `work_*` tools (iterations/capacity).
- `configureWikiTools(...)` — registers `wiki_*` tools (including `wiki_create_or_update_page` with ETag handling).

Tools from Microsoft's server coexist in the same namespace; no prefix collision with author's tools (MS uses `wit_/work_/wiki_` prefixes, author uses verb-leading names).

### Output Formats

- **Success:** `{ content: [{ type: "text", text: <result as string or JSON> }] }`. For structured data, serialize to pretty-printed JSON; LLM parses.
- **Error:** `{ content: [{ type: "text", text: <error message> }], isError: true }`. Raw error text from the AzDO API or the SDK is passed through for MVP — no custom translation layer. Claude surfaces the error to the user.
- **No streaming** at MVP. All tools return single response. Growth: consider streamable HTTP for long-running operations (batch fetches across large iterations).

### Config Schema

Two-layer configuration:

**Layer 1 — process config (`.env`, loaded by Node's native `--env-file` flag at process start; no `dotenv` package needed):**

```
AZDO_ORG_URL=https://dev.azure.com/<org>
AZDO_PAT=<personal-access-token>
AZDO_DEFAULT_PROJECT=<project-name>
AZDO_DEFAULT_TEAM=<team-name>
```

Validated on startup (`src/config.ts`): missing keys → fail fast with clear error on stderr before `server.connect()`. No runtime defaults; explicit failure beats silent mis-configuration.

**Layer 2 — host config (`.mcp.json`, committed example in repo):**

```json
{
  "mcpServers": {
    "azdo-mcp": {
      "command": "node",
      "args": [
        "--env-file=.env",
        "--import",
        "tsx",
        "src/index.ts"
      ],
      "cwd": "./",
      "type": "stdio"
    }
  }
}
```

No secrets in `.mcp.json`. Host registration is pure process-spawn metadata.

### Authentication Model

- **Primary:** PAT via `azure-devops-node-api`'s `getPersonalAccessTokenHandler(token)` — emits `Authorization: Basic base64("PAT:"+token)` on each request.
- **Scopes required (documented in README):** Work Items (Read & Write), Wiki (Read & Write), Project & Team (Read).
- **No interactive OAuth, no Entra ID integration** at MVP. Microsoft's MCP server supports these flows via `@azure/identity`; deep-import activates them only if the user supplies appropriate credentials. Author's path is pure PAT.
- **Cross-origin caveat:** `typed-rest-client` strips Authorization header on cross-host redirects by default. If requests hit `vssps.dev.azure.com` (identity endpoints), pass `allowCrossOriginAuthentication=true`. Not applicable for MVP scope (no identity tool in the five primitives).

### Scripting / Automation Support — N/A

MCP is not a shell-scriptable CLI. No `stdin` parsing, no `--flag`-based invocation, no exit-code contract beyond Node process conventions. If the user needs shell scripting over Azure DevOps, they use `az devops` CLI, not AzDo MCP.

### Implementation Considerations

- **Entry point:** `src/index.ts` constructs `McpServer`, wires providers, registers author tools, invokes MS `configure*Tools()`, connects `StdioServerTransport`, awaits protocol termination. Environment variables are already in `process.env` by the time `index.ts` runs (loaded by Node's `--env-file` flag).
- **Runtime:** `tsx` executes `src/index.ts` directly. No compile step; no `dist/`. `tsc --noEmit` runs on demand for type-checking.
- **Dev loop:** MCP Inspector (`npx @modelcontextprotocol/inspector node --env-file=.env --import tsx src/index.ts`) for interactive tool testing without Claude Code roundtrip.
- **Dependencies:** `@modelcontextprotocol/sdk@^1.29`, `@azure-devops/mcp@2.6.0` (exact), `azure-devops-node-api@^15.1`, `zod@^3.25`, `tsx@^4`. No `dotenv`.

### Skipped (per CSV `skip_sections`)

- **Visual design** — N/A, no UI surface.
- **UX principles** — N/A, human UX is Claude's, not ours.
- **Touch interactions** — N/A.

## Functional Requirements

The following FR set defines the complete capability contract for AzDo MCP MVP. Any feature not listed here will not exist unless explicitly added.

### Work Item Retrieval

- **FR1:** The user can fetch a single Azure DevOps work item by its numeric ID through a Claude Skill invocation.
- **FR2:** When fetching a work item, the user can receive its title, description, state, priority, assignee, tags, links to related work items, and existing comments.
- **FR3:** The user can fetch multiple work items in a single request by providing a list of IDs.
- **FR4:** The user can fetch all work items assigned to a specific iteration.
- **FR5:** The user can filter fetched work items by priority.
- **FR6:** The user can fetch work items using a raw WIQL query when the criteria don't match built-in filters.
- **FR7:** Claude can request only a subset of fields per work item to minimize payload size.

### Work Item Creation and Modification

- **FR8:** The user can create a new Azure DevOps work item through a Claude Skill, providing type, title, description, and optional custom field values.
- **FR9:** When creating a work item, the user can link it to one or more existing work items with typed relationships (Parent, Child, Related, etc.).
- **FR10:** The user can post a comment to an existing work item through a Claude Skill.
- **FR11:** When posting a comment, the user can specify Markdown or HTML format; Markdown is the default.

### Iteration Management

- **FR12:** The user can list iterations for a given project and team.
- **FR13:** The user can filter the iteration list by timeframe (`current`, `past`, `future`).
- **FR14:** When the user references an iteration by name or path, Claude can resolve it to the correct iteration GUID internally.

### Skill Orchestration

- **FR15:** Claude Code can discover all Claude Skills registered under `.claude/skills/<name>/SKILL.md` at session start.
- **FR16:** The user can invoke a Claude Skill via its slash-command trigger (e.g., `/azdo-sprint-report`).
- **FR17:** A Claude Skill can invoke multiple MCP tools in sequence to accomplish a compound task (e.g., list iterations → list work items → batch fetch → format → post).
- **FR18:** A Claude Skill can prompt the user for missing required parameters (e.g., target iteration, publish destination) through conversational interaction.
- **FR19:** The user can add or modify a Claude Skill by editing its `SKILL.md` file without rebuilding the MCP server or restarting the host beyond a new Claude Code session.
- **FR20:** The MVP ships with five Claude Skills: `/azdo-fetch-ticket`, `/azdo-fetch-tickets`, `/azdo-sprint-report`, `/azdo-create-ticket`, `/azdo-add-comment`.

### Configuration and Identity

- **FR21:** The system can load configuration from a `.env` file at startup, including Azure DevOps organization URL, Personal Access Token, and optional default project and team.
- **FR22:** The system can fail fast with a clear stderr error message when any required environment variable is missing at startup.
- **FR23:** The system can authenticate all outbound Azure DevOps API requests using the configured PAT, without prompting the user for interactive credentials.
- **FR24:** The system can be registered as an MCP server in Claude Code via an `.mcp.json` entry that specifies only the process invocation command — no secret material in host configuration.

### Ecosystem Integration (Microsoft Tool Inheritance)

- **FR25:** The system can expose Microsoft's `@azure-devops/mcp` tool set (work-items, work, wiki domains) alongside the author-defined primitives within a single MCP tool namespace.
- **FR26:** When posting Markdown-formatted comments, the system can use Microsoft's pre-existing REST workaround (api-version `7.2-preview.4`) inherited via deep-import, without author-written REST code.
- **FR27:** When creating or updating wiki pages, the system can use Microsoft's pre-existing ETag-retry behavior inherited via deep-import, without author-written REST code.
- **FR28:** The user can invoke either author-defined tools or Microsoft-provided tools from Claude without needing to know which source implements which capability.

### Protocol Compliance and Error Handling

- **FR29:** The system can implement the Model Context Protocol specification via the `@modelcontextprotocol/sdk` stdio transport, responding to `tools/list` and `tools/call` requests.
- **FR30:** Each MCP tool can return either a success response (content blocks) or an error response with the `isError` flag set.
- **FR31:** When an Azure DevOps API call fails, the system can propagate the raw error message through the MCP response so Claude can surface it to the user.
- **FR32:** The system can enforce stdout discipline: JSON-RPC messages only on stdout; all diagnostic logging on stderr.

## Non-Functional Requirements

NFRs are scoped tightly. Categories that don't apply to a personal, single-user, non-UI tool are omitted deliberately.

### Performance

- **NFR-P1: MCP server cold start.** Time from Claude Code process-spawn to first `tools/list` response < 2 seconds on a developer workstation with Node 24 LTS. Measured via MCP Inspector.
- **NFR-P2: Single tool-call latency.** For `get_work_item` and `add_comment` against an active Azure DevOps instance, end-to-end latency (MCP request → REST → response) < 1.5 seconds at the p95 over a single working day.
- **NFR-P3: Batch fetch practicality.** `list_work_items` for an iteration with up to 50 items must return within 5 seconds. For iterations above 50 items, the system may use Microsoft's deep-imported batch behavior — Azure DevOps caps batches at 200 IDs per call, so the system must chunk internally above that threshold.
- **NFR-P4: End-to-end skill completion.** `/azdo-sprint-report` from invocation to markdown published must complete in < 2 minutes wall-clock for a 25-item iteration.

### Security

- **NFR-S1: PAT storage.** Personal Access Token must be loaded exclusively from `.env` via Node's native `--env-file` flag (no `dotenv` package). `.env` with **placeholder** values is committed at the initial scaffold so the required-variable list is self-documenting in the repo; real values are populated locally by each developer, and `.env` is re-added to `.gitignore` after the initial commit to keep real secrets out of history. No separate `.env.example` template — the initial tracked `.env` placeholder file serves that purpose.
- **NFR-S2: No secret propagation.** No secret material (PAT, tokens, credentials) may appear in `.mcp.json` host config, README examples, repository commits, or MCP tool input/output schemas.
- **NFR-S3: Minimum scope PAT.** The README must document the exact minimum-required PAT scopes (Work Items Read & Write, Wiki Read & Write, Project & Team Read). Users must be able to generate a least-privileged PAT and have the MVP work end-to-end without expanded scopes.
- **NFR-S4: Public repo hygiene.** The initial scaffold commit may contain a `.env` with placeholder values only. Before the first commit that would contain real secret material, `.env` must be added to `.gitignore` and `git rm --cached .env` run. No pre-commit hook required for MVP — author discipline enforces this.
- **NFR-S5: No telemetry.** The MCP server must not emit network requests beyond those required to serve tool calls to Azure DevOps. No analytics, no phone-home, no usage reporting.

### Integration

- **NFR-I1: Azure DevOps REST API.** The system must integrate with Azure DevOps Services (`dev.azure.com`) REST API version 7.1 (for wiki) and 7.2-preview.4 (for Markdown comments), inherited via `@azure-devops/mcp@2.6.0` deep-import. On-premises Azure DevOps Server is **not** supported in MVP.
- **NFR-I2: MCP protocol compliance.** The system must conform to the Model Context Protocol specification implemented by `@modelcontextprotocol/sdk` v1.29+ over stdio transport. Breaking changes in MCP spec are addressed through SDK upgrades on opt-in cadence.
- **NFR-I3: Claude Code host.** The system must be invokable as an MCP server by Claude Code via a standard `.mcp.json` entry. Compatibility with other MCP hosts (VS Code, Cursor, Claude Desktop) is not guaranteed at MVP but is not deliberately broken.
- **NFR-I4: Microsoft deep-import contract.** The system must consume `@azure-devops/mcp@2.6.0` via exact-version pinning, calling its exported `configure*Tools(server, tokenProvider, connectionProvider, userAgentProvider)` functions. Compatibility with newer versions is opt-in and requires manual re-verification.

### Maintainability & Extensibility

- **NFR-M1: Skill authoring cost.** Adding a new Claude Skill must require editing exactly one file (`.claude/skills/<name>/SKILL.md`) and restarting Claude Code — no source rebuild, no dependency change, no server restart beyond a new host session.
- **NFR-M2: Primitive addition cost.** Adding a new MCP primitive must require editing exactly one file (`src/tools/<area>.ts` or similar) plus one import line in `src/index.ts`. Build + MCP Inspector verification cycle must complete in under 60 seconds on a developer workstation.
- **NFR-M3: Testability structure.** Primitives are structured for unit-testability — pure async functions accept the AzDO API client as an explicit parameter, enabling structural mocking. Unit tests are opt-in at MVP, not mandatory. Skills hold orchestration and formatting; complex logic outside primitives belongs in skill markdown, not utility code.
- **NFR-M4: Error observability.** Startup errors (missing env, invalid config) must emit to stderr in plain text. Runtime errors during tool calls must propagate to the MCP response with the raw error text — no silent swallowing, no custom error transformation layer at MVP.

### Compatibility

- **NFR-C1: Runtime.** Node.js 24 LTS or later (Active LTS since October 2025). Node 26 (Current) is supported but not required. Earlier LTS lines (20, 22) are out of scope. TypeScript 5.9 or later. Transpilation target: ESNext — leverage the full language/runtime surface available in current TypeScript and Node 24+.
- **NFR-C2: Package manager.** `pnpm` is the primary package manager. `npm`/`yarn` may work but are not tested.
- **NFR-C3: Operating system.** macOS, Linux, and Windows (WSL or native) supported, matching Claude Code's platform matrix.
- **NFR-C4: Dependency pinning.** Direct dependencies pinned with caret except `@azure-devops/mcp` which is pinned exact. `pnpm-lock.yaml` must be committed to lock transitive resolution.
