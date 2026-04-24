---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-04-21'
inputDocuments:
  - specs/planning/prd.md
  - specs/planning/architecture.md
  - specs/planning/product-brief-azdo-mcp.md
  - specs/planning/research/technical-azure-devops-mcp-market-scan-research-2026-04-21.md
---

# AzDo MCP — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for AzDo MCP, decomposing the requirements from the PRD and Architecture into implementable stories sized for AI-agent-driven development.

## Requirements Inventory

### Functional Requirements

**Work Item Retrieval**
- FR1: The user can fetch a single Azure DevOps work item by its numeric ID through a Claude Skill invocation.
- FR2: When fetching a work item, the user can receive its title, description, state, priority, assignee, tags, links to related work items, and existing comments.
- FR3: The user can fetch multiple work items in a single request by providing a list of IDs.
- FR4: The user can fetch all work items assigned to a specific iteration.
- FR5: The user can filter fetched work items by priority.
- FR6: The user can fetch work items using a raw WIQL query when the criteria don't match built-in filters.
- FR7: Claude can request only a subset of fields per work item to minimize payload size.

**Work Item Creation and Modification**
- FR8: The user can create a new Azure DevOps work item through a Claude Skill, providing type, title, description, and optional custom field values.
- FR9: When creating a work item, the user can link it to one or more existing work items with typed relationships (Parent, Child, Related, etc.).
- FR10: The user can post a comment to an existing work item through a Claude Skill.
- FR11: When posting a comment, the user can specify Markdown or HTML format; Markdown is the default.

**Iteration Management**
- FR12: The user can list iterations for a given project and team.
- FR13: The user can filter the iteration list by timeframe (`current`, `past`, `future`).
- FR14: When the user references an iteration by name or path, Claude can resolve it to the correct iteration GUID internally.

**Skill Orchestration**
- FR15: Claude Code can discover all Claude Skills registered under `.claude/skills/<name>/SKILL.md` at session start.
- FR16: The user can invoke a Claude Skill via its slash-command trigger (e.g., `/azdo-sprint-report`).
- FR17: A Claude Skill can invoke multiple MCP tools in sequence to accomplish a compound task.
- FR18: A Claude Skill can prompt the user for missing required parameters through conversational interaction.
- FR19: The user can add or modify a Claude Skill by editing its `SKILL.md` file without rebuilding the MCP server.
- FR20: The MVP ships with five Claude Skills: `/azdo-fetch-ticket`, `/azdo-fetch-tickets`, `/azdo-sprint-report`, `/azdo-create-ticket`, `/azdo-add-comment`.

**Configuration and Identity**
- FR21: The system can load configuration from a `.env` file at startup, including Azure DevOps organization URL, Personal Access Token, and optional default project and team.
- FR22: The system can fail fast with a clear stderr error message when any required environment variable is missing at startup.
- FR23: The system can authenticate all outbound Azure DevOps API requests using the configured PAT, without prompting the user for interactive credentials.
- FR24: The system can be registered as an MCP server in Claude Code via an `.mcp.json` entry that specifies only the process invocation command — no secret material in host configuration.

**Ecosystem Integration (Microsoft Tool Inheritance)**
- FR25: The system can expose Microsoft's `@azure-devops/mcp` tool set (work-items, work, wiki domains) alongside the author-defined primitives within a single MCP tool namespace.
- FR26: When posting Markdown-formatted comments, the system relies on MS's registered `wit_add_work_item_comment` tool (bulk-wired via `configureWorkItemTools` in Epic 1) — `format: "Markdown"` is a first-class parameter and MS handles the underlying api-version (`7.2-preview.4`) internally; no author-written raw-REST code.
- FR27: When creating or updating wiki pages, the system can use Microsoft's pre-existing ETag-retry behavior inherited via deep-import.
- FR28: The user can invoke either author-defined tools or Microsoft-provided tools from Claude without needing to know which source implements which capability.

**Protocol Compliance and Error Handling**
- FR29: The system can implement the Model Context Protocol specification via the `@modelcontextprotocol/sdk` stdio transport, responding to `tools/list` and `tools/call` requests.
- FR30: Each MCP tool can return either a success response (content blocks) or an error response with the `isError` flag set.
- FR31: When an Azure DevOps API call fails, the system can propagate the raw error message through the MCP response so Claude can surface it to the user.
- FR32: The system can enforce stdout discipline: JSON-RPC messages only on stdout; all diagnostic logging on stderr.

### NonFunctional Requirements

**Performance**
- NFR-P1: MCP server cold start < 2 seconds on Node 24 LTS.
- NFR-P2: Single tool-call latency < 1.5 seconds at p95 for a one-ID work-item fetch (`wit_get_work_items_batch_by_ids` with a single ID) and `wit_add_work_item_comment`.
- NFR-P3: Batch fetch of up to 50 work items in an iteration completes within 5 seconds; chunk above 200-ID AzDO limit.
- NFR-P4: `/azdo-sprint-report` end-to-end completion under 2 minutes for a 25-item iteration.

**Security**
- NFR-S1: PAT loaded exclusively from `.env` via Node's `--env-file`. `.env` with placeholder values committed at the initial scaffold for variable discoverability; real values populated locally. `.env` is re-added to `.gitignore` after the scaffold commit to keep real secrets out of history. No `.env.example` — the tracked placeholder `.env` serves that role.
- NFR-S2: No secret material in `.mcp.json`, README, repository commits, or tool I/O schemas.
- NFR-S3: README documents the exact minimum PAT scopes (Work Items R&W, Wiki R&W, Project & Team R).
- NFR-S4: `.env` must be in `.gitignore` (and removed from the index via `git rm --cached .env`) before any commit that would contain real secret material. The initial scaffold commit may include `.env` with placeholders. No pre-commit hook required for MVP.
- NFR-S5: No network requests beyond Azure DevOps API. No telemetry.

**Integration**
- NFR-I1: Azure DevOps Services REST reached via `azure-devops-node-api` (author primitives) and MS-registered tools bulk-wired via `@azure-devops/mcp@2.6.0` (MS tools handle api-version selection internally — `7.2-preview.4` for Markdown comments is an MS implementation detail). AzDO Server on-premises not supported.
- NFR-I2: MCP spec via `@modelcontextprotocol/sdk` v1.29+ over stdio.
- NFR-I3: Invokable by Claude Code via standard `.mcp.json` entry; other MCP hosts not guaranteed.
- NFR-I4: `@azure-devops/mcp@2.6.0` pinned exact; upgrades opt-in.

**Maintainability & Extensibility**
- NFR-M1: Adding a new skill requires editing exactly one `SKILL.md` file. No rebuild.
- NFR-M2: Adding a new primitive requires one new `src/tools/<area>.ts` + one import line in `src/index.ts`.
- NFR-M3: Pure operations accept the AzDO API client as an explicit parameter — unit-testable. Unit tests opt-in at MVP.
- NFR-M4: Startup errors emit to stderr; runtime errors propagate via MCP response with `isError: true`. No error-translation layer.

**Compatibility**
- NFR-C1: Node.js 24 LTS or later; TypeScript 5.9+; target ESNext.
- NFR-C2: pnpm primary package manager; npm/yarn untested.
- NFR-C3: macOS, Linux, Windows (matches Claude Code matrix).
- NFR-C4: Dependencies caret-pinned except `@azure-devops/mcp` exact; lockfile committed.

### Additional Requirements

_From Architecture document:_

- **Starter: manual scaffold, no external template.** The scaffold command sequence from `§ Starter Template Evaluation § Initialization Command` is the canonical first implementation story. Produces empty-but-structurally-correct project in ~10 minutes.
- **Runtime: `node --env-file=.env --import tsx src/index.ts`.** No `tsc` build step; no `dist/`. `tsx` registered via Node's `--import` flag. Alternative dev command adds `--watch`.
- **Configuration: `.env` + native `--env-file`.** No `dotenv` package dependency.
- **`.claude/.mcp.json` committed, ready-to-run.** Contains `node` command + `--env-file` + `--import tsx` + `src/index.ts`, `cwd: "./"`, `type: "stdio"`. No secrets.
- **Module boundaries:** `process.env` only in `src/config.ts`; `new WebApi(...)` only in `src/client.ts`; deep-imports from `@azure-devops/mcp/dist/*` only inside the matching `src/tools/*.ts` wrapper. Enforced by convention; violations caught during Inspector testing.
- **Tool module shape:** each `src/tools/*.ts` exports `register<Domain>Tools(server)` on top, followed by public operations, then private helpers. Pure operations accept `api: WebApi` explicitly; registration functions are the only callers of `getClient()`.
- **Three callable providers** for MS deep-import: `tokenProvider`, `clientProvider`, `userAgentProvider` — module-private inside the matching `src/tools/<domain>.ts` wrapper, positionally handed to MS's `configure*Tools(server, ...)`.
- **Canonical `tsconfig.json`:** `target: ESNext`, `module: ESNext`, `moduleResolution: bundler`, `allowImportingTsExtensions: true`, `strict: true`, `noEmit: true`, `esModuleInterop: true`, `skipLibCheck: true`, `rootDir: src`, `types: [node]`, `include: [src/**/*.ts, types/**/*.d.ts]`.
- **Startup error handling:** `src/config.ts` throws on missing env at module-load time. MVP accepts Node's default uncaught-exception output on stderr (the first line is `Error: <KEY> is required` — the actionable signal). A tagged single-line stderr formatter via `process.on('uncaughtException')` preload is deferred — see `specs/dev/deferred-work.md`.
- **Logging discipline:** no `console.*` in runtime code. Temporary debug logging via `console.error` permitted during active development; must be removed before commit.
- **Response serialization:** JSON-stringified (2-space indent) into a single MCP `text` content block.
- **Zod schemas inline** in each `registerTool` call; no separate `schemas.ts`.
- **No LICENSE file at MVP.** Repo currently private; licensing decision deferred.

### UX Design Requirements

N/A — AzDo MCP has no UI. All user interaction is through Claude Code's chat interface, orchestrated by the skill markdown files. Interaction design lives inside each `SKILL.md` (step ordering, parameter prompts, confirmation phrasing) and is shipped as part of skill authoring, not as a separate UX track.

### FR Coverage Map

| FR | Epic | Описание покрытия |
|---|---|---|
| FR1 fetch single | Epic 2 | MS `wit_get_work_items_batch_by_ids` called by `/azdo-fetch-tickets` skill (single-element `ids`) |
| FR2 fields returned | Epic 2 | JSON response from `wit_get_work_items_batch_by_ids` |
| FR3 fetch multiple by IDs | Epic 2 | `wit_get_work_items_batch_by_ids` via skill |
| FR4 fetch by iteration | Epic 2 | Skill builds WIQL with `@CurrentIteration('[project]\team')` → `wit_query_by_wiql` → batch |
| FR5 filter by priority | Epic 2 | Skill builds WIQL with `[Microsoft.VSTS.Common.Priority] = N` → `wit_query_by_wiql` → batch |
| FR6 WIQL query | Epic 2 | `wit_query_by_wiql` via skill (user's raw SELECT accepted verbatim) |
| FR7 field subset | Epic 2 | `fields` param on `wit_get_work_items_batch_by_ids` |
| FR8 create work item | Epic 3 (Story 3.1) | MS `wit_create_work_item` via `/azdo-create-ticket` skill (baseline, no links) |
| FR9 create with links | Epic 3 (Story 3.2) | MS `wit_work_items_link` via `/azdo-create-ticket` skill; multi-link batch + all-or-nothing pre-validation |
| FR10 post comment | Epic 3 (Story 3.3) | MS `wit_add_work_item_comment` via `/azdo-add-comment` skill + `azdo-comment-style.md` rule |
| FR11 Markdown format | Epic 3 (Story 3.3) | MS `wit_add_work_item_comment` `format: "Markdown"` passed explicitly by the skill |
| FR12 list iterations | Epic 2 | `list_recent_iterations` primitive (author-owned; last N by start date) + MS `work_list_team_iterations` bulk-wired via `configureWorkTools` |
| FR13 timeframe filter | Epic 2 | MS `work_list_team_iterations` `timeframe` param (inherited via `configureWorkTools`) |
| FR14 iteration name→GUID | Epic 2 | Claude orchestrates via skill |
| FR15 skill discovery | Epic 1 | `.claude/skills/` layout established; reinforced every epic |
| FR16 slash-command trigger | Epic 2/3/4 | Each epic ships invokable skills |
| FR17 multi-tool compound skill | Epic 2/3/4 | Skills orchestrate sequentially |
| FR18 conversational param collection | Epic 2/3/4 | Each skill asks for missing inputs |
| FR19 edit skill without rebuild | Epic 1 | Architecture enables; reinforced every epic |
| FR20 ship 5 skills | Epic 2 (1), Epic 3 (2), Epic 4 (1) | 4 skills cumulative — `/azdo-fetch-tickets`, `/azdo-create-ticket`, `/azdo-add-comment`, `/azdo-sprint-report`. Original targets `/azdo-fetch-ticket` + `/azdo-fetch-tickets` collapsed in Story 2.1. FR20 under-delivers on count by one; all functional coverage (FR10/11/16/17/18/26) is intact. Project-wide writing-quality rule ([`writing-quality.md`](../../.claude/rules/writing-quality.md), shipped with Story 4.2) floors every generated artefact in British English. Sprint-goal ingestion (`get_sprint_goal`, Story 4.1) is the author-owned primitive unlocking `/azdo-sprint-report`'s narrative grounding. |
| FR21 `.env` config load | Epic 1 | `src/config.ts` + `--env-file` |
| FR22 fail-fast on missing env | Epic 1 | Startup error pattern |
| FR23 PAT auth | Epic 1 | `src/client.ts` + `getPersonalAccessTokenHandler` |
| FR24 `.mcp.json` host entry | Epic 1 | `.claude/.mcp.json` committed |
| FR25 MS tools in namespace (work-items domain only at MVP) | Epic 1 | `configureWorkItemTools` in `src/index.ts` — other MS domains (`configureWorkTools`, `configureWikiTools`) deferred to Phase 2 |
| FR26 MD comment workaround | Epic 3 (Story 3.3) | Inherited via MS `wit_add_work_item_comment` (MS handles the 7.2-preview.4 call internally; no author code); posted under `/azdo-add-comment` + `azdo-comment-style.md` |
| FR27 wiki ETag workaround | — (deferred) | No wiki primitive in MVP; `configureWikiTools` wiring deferred to Phase 2 |
| FR28 unified namespace | Epic 1 | Author tools + MS `wit_*` tools coexist in single namespace |
| FR29 MCP spec compliance | Epic 1 | `@modelcontextprotocol/sdk` stdio transport |
| FR30 response shape | Epic 1 | Pattern defined; reinforced per tool |
| FR31 error propagation | Epic 1 | try/catch pattern at handler boundary |
| FR32 stdout discipline | Epic 1 | Convention enforced from Epic 1 onward |

**31 of 32 FRs covered at MVP. FR27 deferred to Phase 2 (wiki-tooling expansion).**

## Epic List

### Epic 1: Foundation — Running MCP Server with Work-Items Support

**Goal:** The `azdo-mcp` MCP server boots in Claude Code, authenticates to Azure DevOps via PAT loaded from `.env`, and exposes Microsoft's `wit_*` work-item tools alongside protocol-compliant stdio JSON-RPC. This is the minimum viable running system — Claude can already perform ad-hoc AzDO work-item operations through MS tools before any author primitives exist.

**User outcome:** *"I can ask Claude 'show me ticket 1234' via a Microsoft-provided tool and receive a structured response — even before I write any of my own curated tools."*

**MS deep-import scope:** `configureWorkItemTools` only. `configureWorkTools` (iterations/capacity MS-side) and `configureWikiTools` are deferred from MVP — extension is mechanical (one line per domain in `src/index.ts`) when Phase 2 use cases require them.

**FRs covered:** FR15, FR19, FR21, FR22, FR23, FR24, FR25 (work-items domain only), FR28, FR29, FR30, FR31, FR32
**FRs deferred from Epic 1:** FR27 (wiki ETag; requires wiki primitive or `configureWikiTools` wiring, both Phase 2)

### Epic 2: Work Item Retrieval — Skill-Based Read Layer

**Goal:** Solve the work-item retrieval pain entirely through a single Claude Skill (`/azdo-fetch-tickets`) composed over Microsoft's inherited `wit_*` tools. No author-owned read primitives are shipped — the WIQL-then-batch pattern is an AzDO-API reality, MS already covers both halves, and skill-layer composition (FR17) is the architecture's native extension point. The only author-owned tool added is `get_azdo_context`, a zero-arg lookup returning the configured AzDO project (and team) so the skill can build team-relative WIQL (e.g. `@CurrentIteration('[project]\team')`) without hardcoding.

Single-ticket, multi-ID, iteration-scoped, WIQL-raw, and shorthand-filter retrieval all share one user-facing entry point. Originally-planned stories 2.2 (`list_work_items`), 2.4 (`/azdo-fetch-ticket`), and 2.5 (`/azdo-fetch-tickets` batch-only) are collapsed into Story 2.1's unified skill. See `specs/planning/research/skill-vs-primitive-read-path-2026-04-22.md` for the full rationale behind abandoning author read primitives.

**User outcome:** *"I type `/azdo-fetch-tickets current sprint` — or `1234`, or `closed P1 from last sprint` — and receive structured, readable output in one turn."*

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR12, FR13, FR14, FR16, FR17, FR18, FR20 (2 of 5 skills — `/azdo-fetch-ticket` and `/azdo-fetch-tickets` merged into a single skill)

### Epic 3: Work Item Writes — Skill-Based Mutation Layer

**Goal:** Close the write path entirely at the skill layer, over Microsoft's inherited write tools. Ship two user-facing skills — `/azdo-create-ticket` and `/azdo-add-comment` — composed over MS's `wit_create_work_item`, `wit_work_items_link`, and `wit_add_work_item_comment`, plus one infrastructure story that bulk-wires MS core/team-listing tools for picker UX. No author-owned write primitives; MS's tools already cover the full planned surface, and Markdown comments (FR11/FR26) are handled natively by MS via the `format` parameter on `wit_add_work_item_comment` — the raw-REST workaround originally scoped in FR26 is obsolete. Every mutation skill in this epic obeys the project-wide [`mutation-confirmation.md`](../../.claude/rules/mutation-confirmation.md) rule: preview → edits loop → explicit approval → mutate. See [`specs/planning/research/skill-vs-primitive-write-path-2026-04-22.md`](research/skill-vs-primitive-write-path-2026-04-22.md) for the full primitive-abandonment rationale. After this epic, the conversational ticket-composition use case (Journey 2) works end-to-end.

**Story shape (as shipped):** 3.1+3.2 merged into a single `/azdo-create-ticket` skill with optional link branching (commit `a10d8bd`, 2026-04-23). 3.3 ships `/azdo-add-comment` plus project-wide [`azdo-comment-style.md`](../../.claude/rules/azdo-comment-style.md) — the skill owns input/output contract and deep-link return; the rule owns Markdown hygiene and ticket-reference conventions for every comment body (including `/azdo-sprint-report` in Story 4.1). 3.4 deferred — picker UX has no in-diff consumer at MVP; wiring is a one-line addition when Phase 2 needs it.

**User outcome:** *"I say 'pull feature 8812, draft a follow-up ticket extending the export pipeline, link as Related, create it' — a short conversation with a preview I can iterate on, then one explicit go, no browser tabs, no surprises."* Journey 2 lands end-to-end through `/azdo-create-ticket`; `/azdo-add-comment` adds the complementary "post a note and get a deep link to it" flow.

**FRs covered:** FR8 (Story 3.1), FR9 (Story 3.2), FR10 + FR11 + FR26 (Story 3.3), FR16, FR17, FR18, FR20 (2 skills added cumulatively; 4 total MVP skills — FR20 under-delivers on count by one, coverage intact).

### Epic 4: Sprint Report — Compound Orchestration

**Goal:** The flagship compound skill `/azdo-sprint-report` orchestrates reads (Epic 2) plus writes (Epic 3) to generate a stakeholder-facing **narrative Markdown report** from the previous and current iterations and publish it as a comment on a target work item. Demonstrates the full primitives-plus-skills architecture in its most demanding form. Completes the five-skill MVP roster. **Publish target at MVP: work-item comment. Wiki-page publishing is deferred to Phase 2 (requires wiki-primitive or MS wiki-tool wiring).**

**Story shape (as shipped):** 4.1 ships the author-owned `get_sprint_goal` primitive that reads sprint goals (title, details, `goalAchieved`) from the `keesschollaart/sprint-goal` marketplace extension's Extension Data store — unlocked by the research documented in [`specs/planning/research/sprint-goal-extension-data-api-2026-04-24.md`](research/sprint-goal-extension-data-api-2026-04-24.md). 4.2 ships `/azdo-sprint-report` as a two-section narrative report (Achievements of the Last Sprint / Goals for the Current Sprint) — continuous prose only, no ticket IDs, no bullets, written for non-engineer stakeholders. The skill consumes `list_recent_iterations` (Story 2.3), `get_sprint_goal` (Story 4.1), `wit_query_by_wiql`, `wit_get_work_items_batch_by_ids`, and `wit_add_work_item_comment`. Target work-item ID resolution: user-named → otherwise ask. Goal resolution: user-supplied → `get_sprint_goal` → ask. Markdown hygiene, ticket-reference conventions, and the three safety items come from the general [`azdo-comment-style.md`](../../.claude/rules/azdo-comment-style.md); the skill adds the narrative content structure on top.

**User outcome:** *"End of sprint: one command → narrative stakeholder report published as a comment on the reporting ticket. The 30-minute weekly chore becomes 90 seconds."*

**FRs covered:** FR16, FR17, FR18, FR20 (final skill; 5 of 5), plus reuse of all Epic 2 and Epic 3 capabilities through skill orchestration

### Dependency Flow

```
Epic 1 (Foundation)
  ├── Epic 2 (Reads) ──┐
  │                    ├── Epic 4 (Sprint Report)
  └── Epic 3 (Writes) ─┘
```

- **Epic 1** unblocks everything; without it nothing boots.
- **Epic 2** and **Epic 3** both depend on Epic 1 but are independent of each other. Could run in parallel; within the 5-hour MVP cap they run sequentially.
- **Epic 4** composes Epics 2 + 3 via skill orchestration. The skill itself is one markdown file (low cost), but its testing loop depends on both read and write primitives being operational.

## Epic 1: Foundation — Running MCP Server with Work-Items Support

The `azdo-mcp` MCP server boots in Claude Code, authenticates to Azure DevOps via PAT loaded from `.env`, and exposes Microsoft's `wit_*` work-item tools alongside protocol-compliant stdio JSON-RPC. After this epic Claude can already perform ad-hoc AzDO work-item operations through MS tools.

### Story 1.1: Project Scaffold

As a developer,
I want the existing skeleton repo (`package.json`, `.gitignore`, `specs/planning/*`) augmented with the full TypeScript toolchain, runtime dependencies, `tsconfig.json`, `.env`, `.claude/.mcp.json`, and stub source files,
So that subsequent stories can focus on writing source code without any setup distractions.

**Acceptance Criteria:**

**Given** the initial-commit repository already contains `package.json` (with `name: azdo-mcp`, `version: 0.1.0`, `description`, `private: true`, author, and a single `install:bmad` script), `.gitignore`, and `specs/planning/**`
**When** the scaffold commands from the architecture document are executed
**Then** `package.json` is augmented (not overwritten) with `"type": "module"`, `"engines": { "node": ">=24.0.0" }`, and the four runtime scripts (`start`, `dev`, `type-check`, `inspect`) appended to the existing `install:bmad` script
**And** `pnpm install` adds runtime dependencies to `package.json`: `@modelcontextprotocol/sdk`, `zod`, `@azure-devops/mcp@2.6.0` (pinned exact), `azure-devops-node-api`, `tsx`
**And** `pnpm install -D` adds dev dependencies: `typescript@latest`, `@types/node@latest`
**And** `pnpm-lock.yaml` is generated and committed
**And** `tsconfig.json` is created with the canonical options (`target: ESNext`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `noEmit: true`, `allowImportingTsExtensions: true`, `esModuleInterop: true`, `skipLibCheck: true`, `resolveJsonModule: true`, `rootDir: src`, `types: [node]`, `include: [src/**/*.ts]`)
**And** `.claude/.mcp.json` exists with the ready-to-run `node --env-file=.env --import tsx src/index.ts` entry (command + args + `cwd: "./"` + `type: "stdio"`)
**And** `.env` exists (gitignored) with placeholder lines for `AZDO_ORG_URL`, `AZDO_PAT`, `AZDO_DEFAULT_PROJECT`, `AZDO_DEFAULT_TEAM`
**And** empty stub files exist at `src/index.ts`, `src/config.ts`, `src/client.ts`, `src/tools/work-items.ts`, `src/tools/comments.ts`, `src/tools/iterations.ts`
**And** `pnpm install` completes without errors
**And** `pnpm type-check` reports no errors against the empty stubs
**And** the existing `package.json` identity fields (`name`, `version`, `description`, `private`, `author`) are preserved unchanged

### Story 1.2: Configuration Loader

As a developer,
I want `src/config.ts` to validate required environment variables at module load and export a typed `config` object,
So that every other module can consume configuration with compile-time type safety and fail-fast behavior on misconfiguration.

**Acceptance Criteria:**

**Given** all four environment variables (`AZDO_ORG_URL`, `AZDO_PAT`, `AZDO_DEFAULT_PROJECT`, `AZDO_DEFAULT_TEAM`) are present in `.env`
**When** `src/config.ts` is imported
**Then** the module exports a `config` object with the four fields typed as strings
**And** no secret values are logged anywhere in the module

**Given** `AZDO_ORG_URL` or `AZDO_PAT` is missing from `.env`
**When** `src/config.ts` is imported
**Then** the module throws an `Error` naming the missing variable
**And** the error message is formatted for direct stderr display

**Given** `src/config.ts` is the only source of `process.env` access in the codebase
**When** a `grep` for `process.env` is run across `src/**`
**Then** only `src/config.ts` matches

### Story 1.3: Running MCP server with Microsoft work-items tools

As a Claude Code user,
I want `pnpm start` to boot a live MCP server that exposes Microsoft's `wit_*` work-item tools against my Azure DevOps organisation,
So that Claude can fetch, query, and comment on real work items through MS-provided tooling before any author-owned primitives exist — the MVP is usable from this story onward.

**Acceptance Criteria:**

**Given** `pnpm start` is invoked with a valid `.env`
**When** the process boots
**Then** `src/index.ts` constructs an `McpServer` with name `azdo-mcp` and a semver version string
**And** `src/tools/work-items.ts` exports `registerWorkItemTools(server)` which calls Microsoft's `configureWorkItemTools(server, tokenProvider, clientProvider, userAgentProvider)` exactly once with module-private provider helpers
**And** `src/client.ts` exposes a single public `getClient(): WebApi` backed by a lazy singleton (all auth plumbing — PAT handler, `new WebApi(...)` — is private to `client.ts`)
**And** `server.connect(new StdioServerTransport())` is called
**And** the process stays alive listening on stdio

**Given** any required environment variable is missing
**When** the process boots
**Then** the process exits with a non-zero code and the missing-variable message is visible on stderr (exact format is Node's default uncaught-error output — see Startup-error note below)

**Given** the server is running and MCP Inspector has connected
**When** the host issues a `tools/list` JSON-RPC request
**Then** the response includes Microsoft's `wit_*` tools (at minimum `wit_get_work_item`, `wit_query_by_wiql`, `wit_add_work_item_comment`)
**And** no author-written tools are in the list (they arrive in Epic 2 and Epic 3)

**Given** the server is running
**When** `wit_get_work_item` is invoked via MCP Inspector with a valid work-item ID
**Then** the tool returns a content block containing the work item fields fetched from Azure DevOps
**And** stdout contains only well-formed JSON-RPC messages (no leaks)

**Module boundaries:**
- **Given** `new WebApi(...)` and `getPersonalAccessTokenHandler(...)` calls, **Then** only `src/client.ts` matches a codebase-wide grep
- **Given** `@azure-devops/mcp/dist/*` deep-imports, **Then** only `src/tools/work-items.ts` matches a codebase-wide grep
- **Given** runtime code, **Then** `console.log` is never called (temporary `console.error` permitted during development and removed before commit)
- **Given** `src/client.ts` exports, **Then** only `getClient` is public — provider helpers (`tokenProvider`, `clientProvider`, `userAgentProvider`) live as private functions inside `src/tools/work-items.ts` where they are the only callers

**Provider shapes (private inside `src/tools/work-items.ts`, consumed by `configureWorkItemTools`):**
- `tokenProvider(): Promise<string>` — resolves to `config.pat`
- `clientProvider(): Promise<WebApi>` — resolves to `getClient()`
- `userAgentProvider(): string` — `<package-name>/<package-version>` read from `package.json`

**Startup-error note:** the MVP accepts Node's default uncaught-exception output (the stack trace starts with the `Error: <KEY> is required` line, which contains the actionable signal). Formatted single-line stderr (the original NFR-M4 phrasing) would require either a Node `--import` preload registering `process.on('uncaughtException', …)` or moving config validation behind an explicit `loadConfig()` call. Both are post-MVP hardening — see `specs/dev/deferred-work.md`.

## Epic 2: Work Item Retrieval — Skill-Based Read Layer

**Status:** Complete (2026-04-22) — Story 2.1 shipped in `4d0ca5f`; Story 2.3 shipped in `a972173` with a design pivot (see story note below); Stories 2.4 and 2.5 merged into 2.1.

Solve the work-item retrieval pain through a single Claude Skill (`/azdo-fetch-tickets`) composed over Microsoft's inherited `wit_*` tools, plus one support tool (`get_azdo_context`) returning the configured AzDO project and team for team-relative WIQL.

### Story 2.1: Skill-based read path with project context

**Replaces:** original Story 2.1 (`get_work_item`), original Story 2.2 (`list_work_items`), original Story 2.4 (`/azdo-fetch-ticket`), and original Story 2.5 (`/azdo-fetch-tickets` as a separate batch-only skill). All four collapsed into one story covering a unified `/azdo-fetch-tickets` skill plus the `get_azdo_context` support tool. Rationale in `specs/planning/research/skill-vs-primitive-read-path-2026-04-22.md`.

As a Claude Code user,
I want a single conversational entry point — `/azdo-fetch-tickets` — that fetches work items by any reasonable criterion (one or many IDs, current or named iteration, raw WIQL, or compound shorthand like "closed P1 last sprint") and renders the result as readable Markdown,
So that every work-item read in Azure DevOps becomes a single chat turn without leaving Claude Code, without browser tabs, and without me memorising MS tool names.

**Acceptance Criteria:**

**Given** `src/tools/azdo-context.ts` exports `registerAzdoContextTools(server)`, imported and called by `src/index.ts` (renamed from `src/tools/project-context.ts` / `registerProjectContextTools` during Story 3.1 when the payload grew beyond project scope — see that story's dev doc § Why rename)
**When** the server responds to `tools/list`
**Then** a tool `get_azdo_context` is present with an empty input schema and a zero-arg handler
**And** `get_azdo_context` appears before any `wit_*` tool in the list (author layer registered first)

**Given** `get_azdo_context` is called
**When** the handler executes
**Then** the response contains a single `text` content block with pretty-printed JSON `{ project, team }`
**And** `project` is `config.defaultProject` or `null`; `team` is `config.defaultTeam` or `null`
**And** `isError` is not set

**Given** `.claude/skills/azdo-fetch-tickets/SKILL.md` exists
**When** Claude Code starts
**Then** `/azdo-fetch-tickets` is available as a slash-command with the documented description

**Given** the user invokes `/azdo-fetch-tickets 1234` (one numeric ID)
**When** Claude reads the skill
**Then** Claude calls `wit_get_work_items_batch_by_ids({ ids: [1234] })` directly — no `wit_query_by_wiql`, no `get_azdo_context`
**And** Claude renders a single-ticket Markdown summary (title, state, priority, assignee, description, relations if returned)

**Given** the user invokes `/azdo-fetch-tickets 1234 5678 9012` (multiple numeric IDs)
**When** Claude reads the skill
**Then** Claude calls `wit_get_work_items_batch_by_ids({ ids: [1234, 5678, 9012] })` directly
**And** Claude renders a grouped Markdown summary (group by `System.State`, sort each group by `Microsoft.VSTS.Common.Priority`)

**Given** the user invokes `/azdo-fetch-tickets current sprint`
**When** Claude reads the skill
**Then** Claude calls `get_azdo_context` once, captures `{ project, team }`
**And** Claude builds WIQL `SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] = @CurrentIteration('[<project>]\<team>')`
**And** Claude calls `wit_query_by_wiql({ query, project })`, extracts IDs, then calls `wit_get_work_items_batch_by_ids({ ids, project })`

**Given** the user invokes `/azdo-fetch-tickets closed P1 from last sprint`
**When** Claude reads the skill
**Then** Claude calls `get_azdo_context` once and composes one WIQL combining priority, closed-state clause, and `@CurrentIteration(...) - 1`, then runs query → batch

**Given** the user invokes `/azdo-fetch-tickets` with a raw `SELECT …` query
**When** Claude reads the skill
**Then** Claude runs the user's WIQL verbatim through `wit_query_by_wiql`, then `wit_get_work_items_batch_by_ids`

**Given** the user invokes `/azdo-fetch-tickets` with missing or ambiguous input
**When** Claude reads the skill
**Then** Claude asks a single clarifying question before calling any tool

**Given** any MS tool returns `isError: true`
**When** Claude processes the response
**Then** Claude surfaces the raw error text verbatim and stops — no fabrication, no emulation, no REST fallback

**Given** a query resolves to zero IDs at any step
**When** Claude processes the empty result
**Then** Claude replies "No matching work items." and stops

**Given** `get_azdo_context` returns `null` for a field the current call actually needs
**When** Claude reads the response
**Then** Claude asks the user for just that field (project alone, or team alone) rather than inventing values

**Given** the `mcp__azdo-mcp__*` prefixed tools are not in Claude's available tool list
**When** the user invokes the skill
**Then** the skill instructs Claude to tell the user the `azdo-mcp` MCP server is not connected and point them at `.claude/.mcp.json`, rather than attempt REST or any other backchannel

### Story 2.3: Iteration tooling — `list_recent_iterations` + MS `work` domain bulk-wire

**Shipped with a design pivot** (commit `a972173`). Original AC targeted a single author-owned `list_team_iterations` primitive exposing `{ project?, team?, timeframe? }` with env-default fallbacks. Full rationale and pivot history in [`specs/dev/story-2.3-list-team-iterations.md`](../dev/story-2.3-list-team-iterations.md); summary below.

**Shipped surface:**
- `list_recent_iterations({ project, team, limit = 2 })` — author-owned. Returns the N most-recent iterations sorted by `attributes.startDate` descending, for the sprint-report "last N sprints" scenario. MS has no top-N primitive, so this is the one place an author wrapper adds value.
- MS `configureWorkTools` bulk-wired via the shared `src/ms-providers.ts` helpers — exposes `work_list_team_iterations`, `work_list_iterations`, `work_create_iterations`, `work_assign_iterations`, `work_get_team_capacity`, `work_update_team_capacity`, `work_get_iteration_capacities`, `work_get_team_settings`. Covers timeframe-filtered enumeration through the MS-inherited `timeframe: 'current' | 'past' | 'future'` parameter.

**Rationale (compressed):**
- MS's `work_list_team_iterations` with `timeframe: 'current'` already covers the current-iteration scenario; an author duplicate would be theatre.
- The AzDO REST API only supports `$timeframe=current` server-side (per `WorkApi.d.ts:338` — "Only Current is supported currently"). `past`/`future` require client-side filtering of the full subscription — no value in rewrapping.
- `project` and `team` are required (not optional). Skills hardcode them as prompt constants, so env-default substitution was dead code; zod's "missing required field" error is the right signal.

As Claude (via a skill),
I want to enumerate iterations for a project/team — the last N most recent, or filtered by timeframe — without reimplementing MS's iteration surface,
So that compound skills like `/azdo-sprint-report` can reference iterations deterministically and cheaply.

**Acceptance Criteria (as shipped):**

**Given** `src/tools/iterations.ts` exports `registerIterationTools(server)`
**When** `src/index.ts` calls it during startup
**Then** a tool `list_recent_iterations` is registered with input schema `{ project: string, team: string, limit?: number (positive int, default 2) }`
**And** Microsoft's `configureWorkTools(server, tokenProvider, clientProvider, userAgentProvider)` is invoked in the same registration, exposing the MS `work_*` surface under the unified namespace

**Given** `list_recent_iterations` is called with valid `project` and `team`
**When** the handler executes
**Then** the response contains up to `limit` most-recent iterations (default 2), filtered to entries with a populated `attributes.startDate`, sorted by that date descending, serialised as a pretty-printed JSON `text` content block

**Given** `work_list_team_iterations` is called with `timeframe: "current"` (MS-inherited tool)
**When** the handler executes
**Then** the response contains only iterations whose dates span today's date — this covers the original "current iteration" scenario without an author-owned wrapper

**Given** the underlying AzDO REST call throws
**When** the handler catches the error
**Then** the response is `{ content: [{ type: 'text', text: 'Error: <message>' }], isError: true }`

**FR coverage note:** FR12 (list iterations) — covered by `list_recent_iterations` (last N) + MS `work_list_team_iterations` (full enumeration with timeframe). FR13 (timeframe filter) — covered by the MS `timeframe` param. FR14 (iteration name→GUID) — Claude-orchestrated at the skill layer; no tool change required.

### Stories 2.4 and 2.5 — merged into Story 2.1

Originally planned as separate `/azdo-fetch-ticket` (single) and `/azdo-fetch-tickets` (batch) skills. Both folded into a single unified `/azdo-fetch-tickets` skill under Story 2.1. Single-ticket retrieval is `wit_get_work_items_batch_by_ids({ ids: [N] })` — the same call the batch path uses. Two skills for one concept invited duplicate SKILL.md maintenance and ambiguous intent-matching. Merge preserves all FR coverage (FR16–FR18, FR20 — 2-of-5 skills, since `/azdo-fetch-ticket` no longer exists standalone; the unified skill still counts once).

## Epic 3: Work Item Writes — Skill-Based Mutation Layer

**Status:** Complete (2026-04-23) — Stories 3.1 and 3.2 merged and shipped together (commit `a10d8bd`); Story 3.3 shipped `/azdo-add-comment` skill alongside a project-wide comment-style rule ([`.claude/rules/azdo-comment-style.md`](../../.claude/rules/azdo-comment-style.md)). Story 3.4 deferred to Phase 2 (no in-diff consumer at MVP).

Close the write path at the skill layer, over Microsoft's inherited write tools. No author-owned write primitives — MS's `wit_create_work_item`, `wit_work_items_link`, and `wit_add_work_item_comment` cover the full planned surface, and `wit_add_work_item_comment` handles Markdown natively via its `format` parameter (the raw-REST 7.2-preview.4 workaround MS applied internally — it ships as a first-class enum on the tool). Full rationale in [`research/skill-vs-primitive-write-path-2026-04-22.md`](research/skill-vs-primitive-write-path-2026-04-22.md).

Every skill in this epic follows the project-wide [`mutation-confirmation.md`](../../.claude/rules/mutation-confirmation.md) rule: render a preview, accept explicit user approval or edits, loop until approved, only then mutate. Silence is not approval. Each story's ACs describe observable behavior; the detailed confirmation contract lives in the rule file. Comment content shape is pinned additionally by [`azdo-comment-style.md`](../../.claude/rules/azdo-comment-style.md).

### Story 3.1: `/azdo-create-ticket` skill — baseline create (no links)

**Shipped merged with Story 3.2** — see Story 3.2 note below. Single commit, single SKILL.md with conditional link branching. Dev doc: [`specs/dev/story-3.1-3.2-azdo-create-ticket.md`](../dev/story-3.1-3.2-azdo-create-ticket.md).

As a Claude Code user,
I want to describe a new ticket conversationally — optionally referencing existing tickets for context — and have Claude draft it, iterate with me on edits, and create it in Azure DevOps on my explicit go,
So that ticket composition becomes a short conversational exchange rather than a browser expedition, with no chance of the agent creating something I didn't approve.

**Acceptance Criteria:**

**Given** `src/tools/azdo-context.ts` exports `registerAzdoContextTools(server)` (extended in this story from Story 2.1's `get_project_context` — rename rationale in dev doc § Why rename)
**When** this story's changes are applied
**Then** `get_azdo_context` returns `{ project, team, orgUrl, user }` — `project`/`team` either the configured default or `null`; `orgUrl` always a non-empty string (required env `AZDO_ORG_URL`); `user.email` is the optional `AZDO_USER_EMAIL` value or `null`
**And** the input schema stays zero-arg

**Given** `.claude/skills/azdo-create-ticket/SKILL.md` exists
**When** Claude Code starts
**Then** `/azdo-create-ticket` is available as a slash-command with a one-line description matching "conversational ticket composition" intent

**Given** the user invokes `/azdo-create-ticket pull feature 8812 and propose a follow-up`
**When** Claude reads the SKILL.md steps
**Then** Claude calls `wit_get_work_items_batch_by_ids({ ids: [8812], expand: "relations" })` for context
**And** Claude calls `get_azdo_context` once to resolve `{ project, team, orgUrl, user }`
**And** Claude drafts a title (plain text, no Markdown syntax), a Markdown description, and Markdown acceptance criteria for the follow-up
**And** Claude resolves `System.AreaPath` from the team's default via `work_get_team_settings({ project, team })` when the user didn't name an area verbatim — the skill never creates a ticket with a project-root default area, because that drops the ticket off every team's backlog
**And** Claude presents the full draft inline — work-item type, title, resolved project, resolved area, assignee, priority, story points (when applicable), Markdown description, Markdown acceptance criteria, and any links — labeling each fill-in as `(default: …)` or `(suggested: … — rationale)` so the user sees at a glance what needs confirming
**And** Claude asks the user whether to create as-is or apply edits
**And** if the user proposes edits, Claude applies them, re-renders the full draft, and waits again — looping until the user issues an explicit affirmative verb ("create", "go", "ship it", "approved", or equivalent in the user's language)
**And** only on explicit approval, Claude calls `wit_create_work_item({ project, workItemType, fields: [...] })` with `System.Title` carrying an explicit `format: "Html"` (other plain-string scalars carry no `format` attribute; prose fields carry `format: "Markdown"`)
**And** Claude replies with the new ticket ID and its URL, constructed as `${orgUrl}/${project}/_workitems/edit/${id}` and rendered as a Markdown hyperlink `[#<id>](<url>)` to avoid chat-UI auto-linking `#<id>` to GitHub

**Given** the user invokes `/azdo-create-ticket` with no initial context
**When** Claude reads the SKILL.md
**Then** Claude asks for at minimum `workItemType` and `title` before drafting, and does not fabricate placeholders; `System.Description` and `Microsoft.VSTS.Common.AcceptanceCriteria` are mandatory and drafted from the user's intent (never `TBD` / `n/a`); `System.AreaPath` is mandatory and resolved via the rule above; `Microsoft.VSTS.Common.Priority` is always surfaced in preview with a suggested value inferred from the draft (neutral default `2` when the draft has no signal)

**Given** `get_azdo_context` returns `project: null` (no configured default) and the user's message did not name a project
**When** Claude processes the response
**Then** Claude asks the user for the project by name before any further step — no invented values, no guessing

**Given** `get_azdo_context` returns `team: null` and the user did not name a team or supply `System.AreaPath` verbatim
**When** Claude proceeds to the area-path resolution step
**Then** Claude asks the user for `team` before calling `work_get_team_settings` — the project-root default area is not an acceptable fallback because it produces orphan tickets off every team's backlog; the ask is required only when the skill actually needs the team to resolve area, not as a blanket prompt

**Given** `user.email` is non-null
**When** Claude drafts the preview
**Then** `System.AssignedTo` is proposed in the preview as `(default: <email>)` — the user can accept silently, override with a named teammate, or drop the assignee; if the user drops it, the field is omitted from the `fields[]` payload entirely (not sent as empty string)

**Given** `user.email` is null (the `AZDO_USER_EMAIL` env is unset)
**When** Claude drafts the preview
**Then** Claude asks once for an assignee email before drafting; if the user names someone, that becomes the assignee; if the user skips or says "unassigned", `System.AssignedTo` is omitted from the payload — preferred-but-not-forced

**Given** `wit_create_work_item` returns `isError: true`
**When** Claude reads the response
**Then** Claude surfaces the error text verbatim and does not claim success (per [`mutation-confirmation.md`](../../.claude/rules/mutation-confirmation.md) error handling)

**Given** the `mcp__azdo__*` prefixed tools are not in Claude's available tool list
**When** the user invokes the skill
**Then** the skill instructs Claude to tell the user the `azdo-mcp` MCP server is not connected and point them at `.claude/.mcp.json`, rather than attempt REST or any other backchannel

**Out of scope for Story 3.1:** link support (relations to existing work items). That capability is Story 3.2 — it depends on a working baseline skill so link behavior can be verified independently.

### Story 3.2: `/azdo-create-ticket` — link support

**Shipped merged with Story 3.1** in a single commit. The story-shape separation (baseline then link) existed to make link behaviour verifiable independently, but both stories edit the same SKILL.md and link support is a conditional branch in the same preview → approve → mutate loop. Writing them as one unit avoids shipping a deliberate half-feature. Dev doc: [`specs/dev/story-3.1-3.2-azdo-create-ticket.md`](../dev/story-3.1-3.2-azdo-create-ticket.md).

As a Claude Code user,
I want my new ticket to be linked to one or more existing tickets with typed relationships (Parent, Child, Related, Tests, etc.) as part of the same conversational flow,
So that the ticket I create lands fully wired into the backlog without a second manual step in the browser.

**Acceptance Criteria:**

**Given** Story 3.1 has shipped a working baseline `/azdo-create-ticket` skill
**When** this story's changes are applied
**Then** the same skill file gains link support; no new skill file is created

**Given** the user's request contains one or more link intents (e.g. "link as Related to 8812", "parent is 8800, related to 8812 and 8901")
**When** Claude parses the request
**Then** Claude extracts a list of `{ linkToId, type }` pairs, mapping natural-language labels to MS's enum values (`parent`, `child`, `related`, `predecessor`, `successor`, `tests`, `tested by`, `affects`, `affected by`, `duplicate`, `duplicate of`)

**Given** Claude has a non-empty list of proposed links
**When** Claude proceeds with the preview step
**Then** before drafting the ticket, Claude calls `wit_get_work_items_batch_by_ids({ ids: [<all target IDs>] })` once as a batch pre-validation
**And** if *any* target ID does not resolve (missing from the response, or the call errors), Claude reports all invalid IDs to the user and asks for correction before creating anything — all-or-nothing: the ticket is never created if any link target is invalid

**Given** all target IDs validated successfully
**When** Claude renders the draft preview
**Then** the preview includes a "Links" section listing each link as `{type} → #{linkToId} {title of target}` so the user can see exactly what will land before approving

**Given** the user approves the draft
**When** Claude creates the ticket
**Then** Claude calls `wit_create_work_item(...)` as in Story 3.1
**And** captures the new work-item ID from the response
**And** issues a single `wit_work_items_link({ project, updates: [<all proposed links with id = newId>] })` call with the full batch of link updates

**Given** `wit_create_work_item` succeeds but the subsequent `wit_work_items_link` call returns `isError: true`
**When** Claude reads the link error
**Then** Claude's reply names the created ticket (ID + constructed URL) AND the raw link error verbatim AND offers the user a choice: retry the link batch, retry a subset, or leave the ticket unlinked (per `mutation-confirmation.md` partial-failure honesty)
**And** Claude does NOT attempt any retry automatically

**Given** any tool call in this flow returns `isError: true` before the create step
**When** Claude reads the error
**Then** Claude surfaces it verbatim and stops — the ticket is not created (fail-fast before mutation)

**Trade-off (recorded, non-blocking):** This flow is non-atomic on AzDO's side (create + link = two PATCH calls). An original author-written primitive could have issued a single atomic PATCH. The pre-create batch validation + all-or-nothing gate + partial-failure honesty gives us most of the practical benefit without the primitive. See the write-path research doc for the decision.

### Story 3.3: `/azdo-add-comment` Claude Skill

As a Claude Code user,
I want to post a Markdown comment to a work item conversationally — preview, iterate, approve, receive a deep link to the posted comment — without leaving chat,
So that I can publish notes, status updates, or sprint reports without accidentally shipping a typo or losing the thread of where the comment landed.

**Design note:** the skill formalises the input/output contract (inputs: `workItemId`, `body`, optional `project`/`format`; outputs: comment ID + deep link constructed from `{ orgUrl, project, workItemId, commentId }`), which is awkward to encode in a rule. Comment content *shape* — lead with signal, prefer short paragraphs, prefer bare `#<id>` inside AzDO-rendered bodies, etc. — lives in [`.claude/rules/azdo-comment-style.md`](../../.claude/rules/azdo-comment-style.md) as project-wide recommendations, so `/azdo-sprint-report` and any future comment-posting skill pick up the same style anchor without duplication. The rule is intentionally soft (recommendations, not mandates) except for two safety/UX contracts: empty-body refusal and preview-source-not-rendered.

**Acceptance Criteria:**

**Given** `.claude/skills/azdo-add-comment/SKILL.md` exists
**When** Claude Code starts
**Then** `/azdo-add-comment` is available as a slash-command with a one-line description matching "post a Markdown comment to a work item" intent

**Given** the user invokes `/azdo-add-comment 4521 "Sprint closed, see you Monday."`
**When** Claude reads the SKILL.md
**Then** Claude calls `wit_get_work_items_batch_by_ids({ ids: [4521], project })` once for title enrichment, then renders a preview showing the target work-item ID + title as a Markdown hyperlink to the ticket, the exact comment body as raw Markdown source, and an explicit `Format: Markdown` line with a reminder that it renders as Markdown in the AzDO UI
**And** Claude waits for an explicit affirmative verb ("post", "publish", "ship it", or equivalent); negated forms ("don't post") are refusals; edits loop back to a fresh preview
**And** on explicit approval, Claude calls `wit_add_work_item_comment({ workItemId: 4521, comment: <body>, format: "Markdown", project })` — `format` always passed explicitly, never relying on the MS schema default
**And** Claude replies with the comment ID, a Markdown link to the ticket, and a Markdown deep link to the comment itself constructed as `${orgUrl}/${project}/_workitems/edit/4521?focusedCommentId=<commentId>`

**Given** the user invokes `/azdo-add-comment` without a work-item ID or comment body
**When** Claude reads the SKILL.md
**Then** Claude asks for the missing input(s) before any further step; no placeholders, no invented targets

**Given** the user's comment body, after trimming whitespace, is empty
**When** Claude evaluates the input
**Then** Claude refuses to post, asks the user for a non-empty comment body, and does NOT call `wit_add_work_item_comment` — the skill never lets an empty/whitespace-only comment reach Azure DevOps (per `azdo-comment-style.md`)

**Given** the user's comment body contains Markdown syntax (lists, links, bold, code fences)
**When** the preview is rendered
**Then** Claude shows the raw Markdown source AND notes that it will render as Markdown in the AzDO UI, so formatting mistakes are visible before the comment is public

**Given** `wit_add_work_item_comment` returns `isError: true`
**When** Claude reads the response
**Then** Claude surfaces the error text verbatim and does not claim success

**Given** the `mcp__azdo__*` prefixed tools are not in Claude's available tool list
**When** the user invokes the skill
**Then** the skill instructs Claude to tell the user the `azdo-mcp` MCP server is not connected and point them at `.claude/.mcp.json`, rather than attempt REST or any other backchannel

**Cleanup:** `src/tools/comments.ts` from Epic 1's scaffold is unused — no author-owned comment primitive ships; MS's `wit_add_work_item_comment` handles everything. Can be removed opportunistically.

### Story 3.4: Bulk-wire MS core/team-listing tools for picker UX — DEFERRED

**Deferred to Phase 2 (2026-04-23).** The story's only justification was picker UX for `/azdo-create-ticket` when `get_azdo_context` returns `null` project or team. At MVP, operators configure `AZDO_DEFAULT_PROJECT` and `AZDO_DEFAULT_TEAM` in `.env` (per NFR-S1 two-stage env policy), so the `null` branch is unreachable in practice and the free-text fallback in `/azdo-create-ticket` handles the rare case. Shipping `configureCoreTools` now would pollute `tools/list` with a suite of MS tools that no skill consumes — a violation of the "no symbol without an in-diff consumer" discipline established across Epics 1–3.

When a real picker need surfaces (Phase 2 — e.g. multi-project operators, ghost-team misspelling bugs observed in practice), the wiring is a one-line addition to `src/index.ts` using the existing `src/ms-providers.ts` helpers (same pattern as Story 2.3's `configureWorkTools`). The mechanical cost of deferring is therefore zero.

---

### Original Stories 3.1 and 3.2 — abandoned primitives (historical)

The initial plan shipped two author-owned write primitives — `create_work_item` and `add_comment` (the latter with a raw-REST call to `api-version=7.2-preview.4` to compensate for MS's presumed lack of Markdown support). Schema inspection of the connected `azdo` MCP server on 2026-04-22 showed:

- `wit_create_work_item` accepts a generic `fields` array with per-field `format: "Markdown" | "Html"` — covers FR8 and, together with `wit_work_items_link`, FR9.
- `wit_add_work_item_comment` has a first-class `format` enum defaulting to `Markdown` — MS is already issuing the `7.2-preview.4` call internally. This closes FR26 without any author code.

Both primitives would have been zero-marginal-capability diffs against MS's surface. Following the same reasoning established for the Epic 2 read path ([`specs/planning/research/skill-vs-primitive-read-path-2026-04-22.md`](research/skill-vs-primitive-read-path-2026-04-22.md)), they are abandoned. Full write-path rationale in [`specs/planning/research/skill-vs-primitive-write-path-2026-04-22.md`](research/skill-vs-primitive-write-path-2026-04-22.md).

The `src/tools/comments.ts` file from Epic 1's scaffold is no longer needed and may be removed as an opportunistic cleanup; no FR depends on it after this epic.

## Epic 4: Sprint Report — Compound Orchestration

The flagship compound skill that orchestrates reads plus writes to generate a Markdown report from an iteration and publish it as a comment on a target work item. Publish target at MVP: work-item comment only. Wiki-page publishing is deferred.

**Order revision (2026-04-24).** The original Epic 4 plan shipped as a single story — the narrative skill. During implementation, empirical research ([`specs/planning/research/sprint-goal-extension-data-api-2026-04-24.md`](research/sprint-goal-extension-data-api-2026-04-24.md)) confirmed that sprint goals can be read directly from the `keesschollaart/sprint-goal` marketplace extension's Extension Data store. The skill's content depends on those goals, so the primitive was promoted to **Story 4.1** and the narrative skill renumbered to **Story 4.2**. The dependency now reads cleanly: the tool lands first, the consumer follows.

### Story 4.1: `get_sprint_goal` author tool (extension-data ingestion)

As a Claude Code user whose team already populates sprint goals in the `keesschollaart/sprint-goal` AzDO marketplace extension,
I want a single server-side tool that returns the current sprint goal (title, details, achievement status) for any iteration,
So that compound skills like `/azdo-sprint-report` can ground their narrative in team-authored goals instead of asking me at every invocation.

**Research:** [`specs/planning/research/sprint-goal-extension-data-api-2026-04-24.md`](research/sprint-goal-extension-data-api-2026-04-24.md) — full investigation, endpoint contract, operational requirements.

**Acceptance Criteria:**

**Given** `src/tools/iterations.ts` registers `get_sprint_goal`
**When** Claude Code starts the MCP server
**Then** `mcp__azdo__get_sprint_goal` is available in the tool palette

**Given** the input schema
**When** it is inspected
**Then** it requires `team` and `iterationId`, both validated by a zod GUID regex (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`). No `project` parameter — the ExtensionData endpoint is org-scoped, not project-scoped. Non-GUID input (names, partial IDs, crafted strings with path separators) is rejected at the zod boundary before any URL is constructed — no name-to-GUID resolution, no URL-path injection surface.

**Given** a valid `{ team, iterationId }` (both GUIDs) where the extension has a stored goal
**When** the tool fetches the document at `${extmgmtBase}/_apis/ExtensionManagement/InstalledExtensions/keesschollaart/sprint-goal/Data/Scopes/Default/Current/Collections/%24settings/Documents/sprintConfig.${iterationId[0:15]}${teamId[0:15]}?api-version=7.1-preview.1`
**Then** it returns the stored `value` object (including `goal`, `details`, `detailsPlain`, `goalAchieved`) as JSON

**Given** the document does not exist (no goal set for this team/iteration pair, or extension not installed)
**When** the tool runs
**Then** `typed-rest-client`'s 404-handling returns `{ statusCode: 404, result: null }` and the tool returns the literal JSON `null` without `isError: true`

**Given** the PAT lacks `vso.extension.data`, the network fails, or the upstream returns 5xx
**When** the tool runs
**Then** the thrown error surfaces as `{ isError: true, content: [{ type: "text", text: "Error: <verbatim message>" }] }` so the caller sees it — no soft-failure, no silent fallback

**Given** the tool runs on a stock Node 24 setup with the repo's tsconfig
**When** `pnpm type-check` runs
**Then** the file compiles without errors or new warnings

### Story 4.2: `/azdo-sprint-report` Claude Skill (narrative report)

As a Claude Code user,
I want to type `/azdo-sprint-report`, have Claude assemble a narrative stakeholder-facing Markdown report from the previous and current iterations — two sections in continuous prose, no ticket IDs, no bullets, grounded in each iteration's actual sprint goal when available — and publish it as a comment on a work item I specify,
So that the weekly thirty-minute reporting chore becomes a ninety-second conversational exchange and the posted comment is immediately readable by non-engineers.

**Depends on:** Story 4.1 (`get_sprint_goal`).

**Acceptance Criteria:**

**Given** `.claude/skills/azdo-sprint-report/SKILL.md` exists
**When** Claude Code starts
**Then** `/azdo-sprint-report` is available as a slash-command

**Given** the SKILL.md front matter
**When** it is parsed
**Then** `name` is `azdo-sprint-report` and `description` names the narrative "sprint report / sprint summary / stakeholder update" intent

**Given** the user invokes `/azdo-sprint-report`
**When** Claude reads the SKILL.md orchestration steps
**Then** the steps instruct Claude to:
- call `get_azdo_context` once and cache `{ project, team, orgUrl }`
- call `list_recent_iterations({ project, team, limit: 2 })` to obtain the previous and current iterations (name + path + start/finish dates)
- call `get_sprint_goal` once per iteration to fetch the stored goal and `goalAchieved` state; `null` responses fall back to asking the user for the current goal and omitting any goal-centric narrative for the previous sprint
- call `wit_get_work_items_for_iteration({ project, team, iterationId })` once per iteration — natively team-scoped, so the response contains only tickets the given team has subscribed to in that iteration. Do **not** use `wit_query_by_wiql` with a WHERE clause on `IterationPath`: that path is project-scoped and bleeds in tickets from every team sharing it
- call `wit_get_work_items_batch_by_ids` **once**, combining IDs from both iterations, with fields `["System.Id", "System.Title", "System.State", "System.Description", "System.Tags", "Microsoft.VSTS.Common.Priority"]`
- identify two to three real themes from the fetched goal + tickets (no generic categories)
- produce a report with **exactly** two H2 sections — `## Achievements of the Last Sprint: <previousName>` and `## Goals for the Current Sprint: <currentName>` — three paragraphs each, continuous prose, two to three sentences per paragraph, no ticket IDs, no bullets
- lead each paragraph with the business outcome / value, not a ticket enumeration; prioritise paragraphs by alignment to the sprint goal when one is available, with paragraph 3 framed as wider improvements alongside the main thrust
- when the previous iteration's `goalAchieved` is known, open the Achievements section with that outcome as the lead sentence
- validate the draft against [`writing-quality.md`](../../.claude/rules/writing-quality.md) (British English, no code-switching, no typos, well-formed Markdown) **before** showing the preview
- render the preview inline (not in a code fence), per [`mutation-confirmation.md`](../../.claude/rules/mutation-confirmation.md), with a short meta line (Sprints + Format) and a "happy with the content, or change?" follow-up — no target-work-item reference, because publishing is decided post-preview
- after content is approved, ask whether to publish and where: user supplies a work-item ID to post as a comment, or says "skip" to keep the report in chat only

**Given** the user approves the content and supplies a target work-item ID (either in the initial invocation or at the post-preview ask)
**When** Claude proceeds to publish
**Then** Claude enriches the target via `wit_get_work_items_batch_by_ids({ ids: [<target>], project })` once for the title, shows a mutation preview naming the target, waits for a second explicit affirmative verb, then calls `wit_add_work_item_comment({ workItemId: <target>, comment: <report>, format: "Markdown", project })` — `format` always explicit
**And** Claude replies with a deep link `${orgUrl}/${project}/_workitems/edit/${targetWorkItemId}?focusedCommentId=${commentId}` constructed from `{ orgUrl, project, targetWorkItemId, commentId }`, Markdown-linked

**Given** the user approves the content but says "skip" (or equivalent) at the publish prompt
**When** Claude proceeds
**Then** no `wit_add_work_item_comment` call is made; Claude replies with a short confirmation that the report is ready in the chat above for copy-and-reuse; no deep link is constructed

**Given** either iteration returns an empty ticket set (previous, current, or both)
**When** Claude executes the skill
**Then** Claude stops before drafting, names which iteration came back empty, and asks the user how to proceed (supply a different iteration GUID/name, proceed with an explicit acknowledgement of the empty sprint, or abort) — never silently ships a half-report with a synthesised empty-sprint paragraph

**Given** `list_recent_iterations` returns fewer than two iterations
**When** Claude executes the skill
**Then** Claude stops, reports how many iterations were found (and which), and asks the user to supply the missing iteration explicitly or abort — the report requires both iterations, and a current-only half-report is never offered as an implicit fallback

**Given** `get_sprint_goal` returns `null` for either iteration
**When** Claude proceeds
**Then** Claude never hard-errors; for the current iteration it falls back to asking the user once, for the previous iteration it proceeds from ticket themes alone without inventing a stated goal

**Given** `list_recent_iterations`, `wit_get_work_items_for_iteration`, `wit_get_work_items_batch_by_ids`, or `wit_add_work_item_comment` returns `isError: true`
**When** Claude processes the response
**Then** Claude surfaces the error verbatim and does not claim the report was posted

**Given** the SKILL.md is edited (e.g., to change the section wording, theme-mapping hints, or anti-patterns)
**When** Claude Code starts a new session
**Then** the next invocation of `/azdo-sprint-report` reflects the edits without any source rebuild

