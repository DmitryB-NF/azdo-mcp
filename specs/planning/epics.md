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
- FR26: When posting Markdown-formatted comments, the system can use Microsoft's pre-existing REST workaround (api-version `7.2-preview.4`) inherited via deep-import.
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
- NFR-P2: Single tool-call latency < 1.5 seconds at p95 for `get_work_item` and `add_comment`.
- NFR-P3: Batch fetch of up to 50 work items in an iteration completes within 5 seconds; chunk above 200-ID AzDO limit.
- NFR-P4: `/azdo-sprint-report` end-to-end completion under 2 minutes for a 25-item iteration.

**Security**
- NFR-S1: PAT loaded exclusively from `.env` via Node's `--env-file`. `.env` with placeholder values committed at the initial scaffold for variable discoverability; real values populated locally. `.env` is re-added to `.gitignore` after the scaffold commit to keep real secrets out of history. No `.env.example` — the tracked placeholder `.env` serves that role.
- NFR-S2: No secret material in `.mcp.json`, README, repository commits, or tool I/O schemas.
- NFR-S3: README documents the exact minimum PAT scopes (Work Items R&W, Wiki R&W, Project & Team R).
- NFR-S4: `.env` must be in `.gitignore` (and removed from the index via `git rm --cached .env`) before any commit that would contain real secret material. The initial scaffold commit may include `.env` with placeholders. No pre-commit hook required for MVP.
- NFR-S5: No network requests beyond Azure DevOps API. No telemetry.

**Integration**
- NFR-I1: Azure DevOps Services REST API 7.1 (wiki) and 7.2-preview.4 (Markdown comments) via deep-imported helpers. AzDO Server on-premises not supported.
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
- **Module boundaries:** `process.env` only in `src/config.ts`; `new WebApi(...)` only in `src/client.ts`; deep-imports from `@azure-devops/mcp/dist/*` only in `src/index.ts`. Enforced by convention; violations caught during Inspector testing.
- **Tool module shape:** each `src/tools/*.ts` exports `register<Domain>Tools(server)` on top, followed by public operations, then private helpers. Pure operations accept `api: WebApi` explicitly; registration functions are the only callers of `getClient()`.
- **Three callable providers** for MS deep-import: `tokenProvider`, `clientProvider`, `userAgentProvider` exported from `src/client.ts`. Positional handoff to MS `configure*Tools(server, ...)`.
- **Canonical `tsconfig.json`:** `target: ESNext`, `module: ESNext`, `moduleResolution: bundler`, `allowImportingTsExtensions: true`, `strict: true`, `noEmit: true`, `esModuleInterop: true`, `skipLibCheck: true`, `rootDir: src`, `types: [node]`, `include: [src/**/*.ts]`.
- **Startup error handling:** `src/config.ts` throws on missing env; top-level `try/catch` in `src/index.ts` writes the single permitted `process.stderr.write` call with a tagged prefix and exits 1.
- **Logging discipline:** no `console.*` in runtime code. Temporary debug logging via `console.error` permitted during active development; must be removed before commit.
- **Response serialization:** JSON-stringified (2-space indent) into a single MCP `text` content block.
- **Zod schemas inline** in each `registerTool` call; no separate `schemas.ts`.
- **No LICENSE file at MVP.** Repo currently private; licensing decision deferred.

### UX Design Requirements

N/A — AzDo MCP has no UI. All user interaction is through Claude Code's chat interface, orchestrated by the skill markdown files. Interaction design lives inside each `SKILL.md` (step ordering, parameter prompts, confirmation phrasing) and is shipped as part of skill authoring, not as a separate UX track.

### FR Coverage Map

| FR | Epic | Описание покрытия |
|---|---|---|
| FR1 fetch single | Epic 2 | `get_work_item` primitive |
| FR2 fields returned | Epic 2 | JSON response from `get_work_item` |
| FR3 fetch multiple by IDs | Epic 2 | `list_work_items` with `ids` criterion |
| FR4 fetch by iteration | Epic 2 | `list_work_items` with `iteration` criterion |
| FR5 filter by priority | Epic 2 | `list_work_items` with `priority` criterion |
| FR6 WIQL query | Epic 2 | `list_work_items` with `wiql` criterion |
| FR7 field subset | Epic 2 | `fields` param |
| FR8 create work item | Epic 3 | `create_work_item` primitive |
| FR9 create with links | Epic 3 | `links` param |
| FR10 post comment | Epic 3 | `add_comment` primitive |
| FR11 Markdown format | Epic 3 | `format` param + raw-REST 7.2-preview.4 |
| FR12 list iterations | Epic 2 | `list_team_iterations` primitive (author-owned, independent of MS `work` domain) |
| FR13 timeframe filter | Epic 2 | `timeframe` param |
| FR14 iteration name→GUID | Epic 2 | Claude orchestrates via skill |
| FR15 skill discovery | Epic 1 | `.claude/skills/` layout established; reinforced every epic |
| FR16 slash-command trigger | Epic 2/3/4 | Each epic ships invokable skills |
| FR17 multi-tool compound skill | Epic 2/3/4 | Skills orchestrate sequentially |
| FR18 conversational param collection | Epic 2/3/4 | Each skill asks for missing inputs |
| FR19 edit skill without rebuild | Epic 1 | Architecture enables; reinforced every epic |
| FR20 ship 5 skills | Epic 2 (2), Epic 3 (2), Epic 4 (1) | Cumulative across three epics |
| FR21 `.env` config load | Epic 1 | `src/config.ts` + `--env-file` |
| FR22 fail-fast on missing env | Epic 1 | Startup error pattern |
| FR23 PAT auth | Epic 1 | `src/client.ts` + `getPersonalAccessTokenHandler` |
| FR24 `.mcp.json` host entry | Epic 1 | `.claude/.mcp.json` committed |
| FR25 MS tools in namespace (work-items domain only at MVP) | Epic 1 | `configureWorkItemTools` in `src/index.ts` — other MS domains (`configureWorkTools`, `configureWikiTools`) deferred to Phase 2 |
| FR26 MD comment workaround | Epic 3 | Author-written raw-REST fetch in `add_comment` (api-version 7.2-preview.4) |
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

### Epic 2: Work Item Retrieval — Curated Read Layer

**Goal:** Introduce author-controlled read primitives (`get_work_item`, `list_work_items`, `list_team_iterations`) with clean, verb-leading naming and a unified `criteria` parameter object for batch queries. Two user-facing Claude Skills (`/azdo-fetch-ticket`, `/azdo-fetch-tickets`) give the user conversational access to the whole work-item retrieval surface. After this epic, the core pain ("20 browser tabs to read tickets") is solved.

**User outcome:** *"I type `/azdo-fetch-tickets current sprint` and receive all iteration tickets in one structured response, ready for Claude to reason about."*

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR12, FR13, FR14, FR16, FR17, FR18, FR20 (2 of 5 skills)

### Epic 3: Work Item Writes — Curated Mutation Layer

**Goal:** Introduce author-controlled write primitives (`create_work_item`, `add_comment`) and two user-facing skills (`/azdo-create-ticket`, `/azdo-add-comment`). `add_comment` uses a custom raw-REST call to api-version `7.2-preview.4` for Markdown formatting (FR26). After this epic, the conversational ticket-composition use case (Journey 2) works end-to-end.

**User outcome:** *"I say 'pull feature 8812, draft a follow-up ticket extending the export pipeline, link as Related, create it' — one Claude turn, no browser tabs."*

**FRs covered:** FR8, FR9, FR10, FR11, FR16, FR17, FR18, FR20 (2 more skills; cumulative 4 of 5), FR26

### Epic 4: Sprint Report — Compound Orchestration

**Goal:** The flagship compound skill `/azdo-sprint-report` orchestrates reads (Epic 2) plus writes (Epic 3) to generate a Markdown report from an iteration and publish it as a comment on a target work item. Demonstrates the full primitives-plus-skills architecture in its most demanding form. Completes the five-skill MVP roster. **Publish target at MVP: work-item comment. Wiki-page publishing is deferred to Phase 2 (requires wiki-primitive or MS wiki-tool wiring).**

**User outcome:** *"End of sprint: one command → Markdown report published as a comment on the epic. The 30-minute weekly chore becomes 90 seconds."*

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

### Story 1.3: Azure DevOps Client Module

As a developer,
I want `src/client.ts` to own a lazy-initialized `WebApi` singleton and expose three callable providers for Microsoft deep-import handoff,
So that authentication is constructed exactly once per process and all AzDO access flows through a single module boundary.

**Acceptance Criteria:**

**Given** `src/client.ts` is imported and `getClient()` is called for the first time
**When** execution reaches the `WebApi` constructor
**Then** `getPersonalAccessTokenHandler(config.pat)` is called with the PAT from `config.ts`
**And** a `WebApi` instance is created against `config.orgUrl`
**And** the instance is cached in a module-scoped variable

**Given** `getClient()` has already been called at least once
**When** `getClient()` is called again
**Then** the same cached `WebApi` instance is returned without re-instantiating

**Given** `src/client.ts` is loaded
**When** the module exports are inspected
**Then** exactly four symbols are exported: `getClient`, `tokenProvider`, `clientProvider`, `userAgentProvider`
**And** `tokenProvider` returns `Promise<string>` yielding `config.pat`
**And** `clientProvider` returns `Promise<WebApi>` by awaiting `getClient()`
**And** `userAgentProvider` returns a string containing the package name and version

**Given** `src/client.ts` is the only source of `new WebApi(...)` calls in the codebase
**When** a `grep` for `new WebApi` is run across `src/**`
**Then** only `src/client.ts` matches

### Story 1.4: Server Entry Point with Microsoft Work-Items Deep-Import

As a developer,
I want `src/index.ts` to construct an `McpServer`, wire Microsoft's work-items tools via deep-import, connect stdio transport, and handle startup failures cleanly,
So that running `pnpm start` produces a live MCP server responding to Claude Code's JSON-RPC requests.

**Acceptance Criteria:**

**Given** environment variables are valid and the server is started via `pnpm start`
**When** the process boots
**Then** an `McpServer` instance is constructed with name `azdo-mcp` and a semver version string
**And** `configureWorkItemTools(server, tokenProvider, clientProvider, userAgentProvider)` is called exactly once with the providers from `src/client.ts`
**And** `server.connect(new StdioServerTransport())` is called
**And** the process stays alive listening on stdio
**And** `console.log` is never called anywhere in runtime code

**Given** any required environment variable is missing
**When** the process boots
**Then** startup fails with a single `process.stderr.write` call prefixed `[azdo-mcp] Startup failure:` containing the missing-variable message
**And** `process.exit(1)` is called

**Given** the server is running and a Claude Code host (or MCP Inspector) has connected
**When** the host issues a `tools/list` JSON-RPC request
**Then** the response includes Microsoft's `wit_*` tools (at minimum `wit_get_work_item`, `wit_query_by_wiql`, `wit_add_work_item_comment`)
**And** no author-written tools are in the list (they arrive in Epic 2 and Epic 3)

**Given** the server is running
**When** `wit_get_work_item` is invoked via MCP Inspector with a valid work-item ID
**Then** the tool returns a content block containing the work item fields fetched from Azure DevOps
**And** stdout contains only well-formed JSON-RPC messages

**Given** `@azure-devops/mcp/dist/*` imports
**When** a `grep` for `@azure-devops/mcp/dist` is run across `src/**`
**Then** only `src/index.ts` matches

## Epic 2: Work Item Retrieval — Curated Read Layer

Introduce author-controlled read primitives with clean naming and two user-facing Claude Skills that give the user conversational access to the whole work-item retrieval surface.

### Story 2.1: `get_work_item` Primitive

As Claude (via a skill or direct tool call),
I want to fetch a single Azure DevOps work item by ID with an option to include linked-items,
So that orchestrating skills can pull ticket context into the conversation with one tool call.

**Acceptance Criteria:**

**Given** `src/tools/work-items.ts` is loaded and `registerWorkItemTools(server)` has been called
**When** the server responds to `tools/list`
**Then** a tool named `get_work_item` is present with description, zod input schema, and a handler
**And** the input schema declares `id: number.int.positive()` and `expandLinks: boolean.optional()`

**Given** `get_work_item` is called with a valid existing work-item ID
**When** the handler executes
**Then** the response contains a single `text` content block with pretty-printed JSON (2-space indent)
**And** the JSON includes `System.Title`, `System.Description`, `System.State`, `Microsoft.VSTS.Common.Priority` at minimum
**And** `isError` is not set

**Given** `get_work_item` is called with `expandLinks: true`
**When** the response JSON is inspected
**Then** a `relations` array is present containing typed links (if the work item has any)

**Given** `get_work_item` is called with an ID that does not exist in Azure DevOps
**When** the handler executes
**Then** the response contains `isError: true`
**And** the `text` field contains the raw error message prefixed `Error:`

**Given** the file shape convention
**When** `src/tools/work-items.ts` is read top-to-bottom
**Then** the `registerWorkItemTools` export appears before any pure operation function
**And** the pure `getWorkItem(api, params)` function takes the client as its first parameter and never calls `getClient()` internally

### Story 2.2: `list_work_items` Primitive (batch fetch)

As Claude (via a skill or direct tool call),
I want to fetch multiple Azure DevOps work items in one call using criteria (iteration / priority / WIQL / explicit IDs) with optional field selection,
So that compound workflows can retrieve a whole iteration in one round-trip.

**Acceptance Criteria:**

**Given** `list_work_items` is registered
**When** the server responds to `tools/list`
**Then** the tool is present with an input schema accepting `criteria: { iteration?, priority?, wiql?, ids? }` and `fields?: string[]`

**Given** `list_work_items` is called with `criteria: { ids: [101, 102, 103] }`
**When** the handler executes
**Then** the response contains the requested work items as an array of JSON objects

**Given** `list_work_items` is called with `criteria: { iteration: "<valid iteration GUID>" }`
**When** the handler executes
**Then** the response contains every work item assigned to that iteration (via two-step fetch: iteration→IDs, then batch)

**Given** `list_work_items` is called with `criteria: { wiql: "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'" }`
**When** the handler executes
**Then** the response contains the work items matching the WIQL query

**Given** `list_work_items` is called with more than 200 matching IDs
**When** the handler executes
**Then** the batch fetch chunks IDs into groups of ≤200 and the response contains the complete flattened result

**Given** `list_work_items` is called with `fields: ["System.Title", "System.State"]`
**When** the response JSON is inspected
**Then** only the requested fields are present on each work item (plus standard ID field)

### Story 2.3: `list_team_iterations` Primitive

As Claude (via a skill),
I want to list iterations for a given project and team with optional timeframe filtering,
So that skills can resolve a human reference ("current sprint") to a concrete iteration GUID usable by `list_work_items`.

**Acceptance Criteria:**

**Given** `src/tools/iterations.ts` exports `registerIterationTools(server)` and `listTeamIterations(api, params)`
**When** the server responds to `tools/list`
**Then** a tool `list_team_iterations` is present with input schema `{ project?: string, team?: string, timeframe?: "current" | "past" | "future" }`

**Given** `list_team_iterations` is called without `project` or `team` parameters
**When** the handler executes
**Then** `config.defaultProject` and `config.defaultTeam` are used as fallbacks

**Given** `list_team_iterations` is called with `timeframe: "current"`
**When** the handler executes
**Then** the response contains only iterations whose dates span today's date

**Given** `list_team_iterations` is called with no `timeframe`
**When** the handler executes
**Then** the response contains all iterations visible to the team context

**Given** each returned iteration object
**When** the response JSON is inspected
**Then** at minimum `id` (GUID), `name`, `path`, and date range fields are present

### Story 2.4: `/azdo-fetch-ticket` Claude Skill

As a Claude Code user,
I want to type `/azdo-fetch-ticket 1234` and receive the ticket's contents rendered for easy reading,
So that I can pull ticket context into the conversation without leaving Claude Code.

**Acceptance Criteria:**

**Given** the file `.claude/skills/azdo-fetch-ticket/SKILL.md` exists
**When** Claude Code starts a new session
**Then** `/azdo-fetch-ticket` is available as a slash-command

**Given** the SKILL.md front matter
**When** it is parsed
**Then** `name` is `azdo-fetch-ticket` and `description` is a one-line purpose for Claude intent-matching

**Given** the user invokes `/azdo-fetch-ticket 1234`
**When** Claude reads the SKILL.md steps
**Then** Claude calls `get_work_item({ id: 1234, expandLinks: true })`
**And** Claude presents the returned fields as a concise, readable summary (title, state, priority, description, linked items)

**Given** the user invokes `/azdo-fetch-ticket` without an ID
**When** Claude reads the SKILL.md
**Then** Claude asks the user for the ticket ID before calling any tool

**Given** `get_work_item` returns `isError: true`
**When** Claude reads the response
**Then** Claude surfaces the error text to the user with a brief human-readable explanation

### Story 2.5: `/azdo-fetch-tickets` Claude Skill

As a Claude Code user,
I want to type `/azdo-fetch-tickets` with criteria like "current sprint" or "priority 1" and receive all matching tickets in one response,
So that I can pull batches of ticket context into the conversation in a single turn.

**Acceptance Criteria:**

**Given** `.claude/skills/azdo-fetch-tickets/SKILL.md` exists
**When** Claude Code starts
**Then** `/azdo-fetch-tickets` is available as a slash-command

**Given** the user invokes `/azdo-fetch-tickets current sprint`
**When** Claude reads the SKILL.md steps
**Then** Claude calls `list_team_iterations({ timeframe: "current" })`, picks the GUID, then calls `list_work_items({ criteria: { iteration: <GUID> } })`
**And** Claude returns the tickets grouped by state and sorted by priority in a Markdown list

**Given** the user invokes `/azdo-fetch-tickets priority 1`
**When** Claude reads the SKILL.md steps
**Then** Claude calls `list_work_items({ criteria: { priority: 1 } })`
**And** Claude returns the matching tickets in a readable Markdown list

**Given** the user invokes `/azdo-fetch-tickets` with ambiguous or missing criteria
**When** Claude reads the SKILL.md
**Then** Claude asks the user to clarify (iteration, priority, WIQL, or explicit IDs) before calling any tool

**Given** the response set is empty
**When** Claude processes the empty array
**Then** Claude replies with an explicit "no matching work items" message rather than fabricating results

## Epic 3: Work Item Writes — Curated Mutation Layer

Introduce author-controlled write primitives and two user-facing skills, closing the write-path. `add_comment` uses a custom raw-REST call to api-version `7.2-preview.4` for Markdown formatting.

### Story 3.1: `create_work_item` Primitive

As Claude (via a skill),
I want to create a new Azure DevOps work item with type, title, description, arbitrary field values, and optional typed links to existing work items,
So that conversational ticket-composition skills can create real tickets end-to-end without the browser UI.

**Acceptance Criteria:**

**Given** `src/tools/work-items.ts` exports `registerWorkItemTools(server)` (already present after Story 2.1)
**When** the server responds to `tools/list`
**Then** a tool named `create_work_item` is present with an input schema accepting `project: string`, `type: string`, `title: string`, `description?: string`, `fields?: Record<string, unknown>`, `links?: Array<{ id: number, type: string }>`

**Given** `create_work_item` is called with valid minimal parameters (`project`, `type`, `title`)
**When** the handler executes
**Then** the Azure DevOps REST `PATCH` add-operations payload is constructed correctly
**And** the response contains the new work item's ID and URL

**Given** `create_work_item` is called with `links: [{ id: 8812, type: "System.LinkTypes.Related" }]`
**When** the handler executes
**Then** the payload includes a relation add-operation for the specified link type
**And** the created work item exhibits the link in its relations on re-fetch

**Given** `create_work_item` is called with `fields: { "Microsoft.VSTS.Common.Priority": 2, "System.Tags": "backend; urgent" }`
**When** the handler executes
**Then** the payload includes add-operations for each custom field
**And** the resulting work item reflects those values

**Given** the work-item `type` does not exist in the target project
**When** the handler executes
**Then** the response contains `isError: true` with the raw error message from Azure DevOps

### Story 3.2: `add_comment` Primitive with Markdown Support

As Claude (via a skill),
I want to post a Markdown-formatted comment to an Azure DevOps work item through a single tool call,
So that compound skills can publish formatted output (sprint reports, follow-up notes) directly to tickets.

**Acceptance Criteria:**

**Given** `src/tools/comments.ts` exports `registerCommentTools(server)` and `addComment(api, params)`
**When** the server responds to `tools/list`
**Then** a tool `add_comment` is present with input schema `{ workItemId: number.int.positive(), comment: string, format?: "Markdown" | "Html" }`

**Given** `add_comment` is called with default `format: "Markdown"`
**When** the handler executes
**Then** a raw `fetch` HTTPS `POST` is issued against `/_apis/wit/workItems/{id}/comments?format=0&api-version=7.2-preview.4`
**And** the request body is `{ "text": "<comment>" }`
**And** the request carries the same `Authorization: Basic` PAT header as the rest of the client
**And** the response contains the new comment's ID

**Given** `add_comment` is called with `format: "Html"`
**When** the handler executes
**Then** the `format` query parameter is `1`

**Given** no `azure-devops-node-api` typed method is used for comment posting
**When** the source of `addComment` is inspected
**Then** it uses raw fetch against the versioned endpoint directly (matching Microsoft's own workaround pattern)

**Given** the target work item ID does not exist
**When** the handler executes
**Then** the response contains `isError: true` with the raw 404 error body

### Story 3.3: `/azdo-create-ticket` Claude Skill

As a Claude Code user,
I want to describe a new ticket conversationally — optionally referencing existing tickets for context — and have Claude draft it, confirm with me, and create it in Azure DevOps,
So that ticket composition becomes a single conversational turn rather than a browser expedition.

**Acceptance Criteria:**

**Given** `.claude/skills/azdo-create-ticket/SKILL.md` exists
**When** Claude Code starts
**Then** `/azdo-create-ticket` is available as a slash-command

**Given** the user invokes `/azdo-create-ticket pull feature 8812 and propose a follow-up`
**When** Claude reads the SKILL.md steps
**Then** Claude calls `get_work_item({ id: 8812, expandLinks: true })` to pull context
**And** Claude drafts a title and Markdown description for the follow-up
**And** Claude presents the draft inline and asks for confirmation before calling `create_work_item`
**And** on user approval, Claude calls `create_work_item({ project, type, title, description, links: [{ id: 8812, type: "System.LinkTypes.Related" }] })`
**And** Claude replies with the new ticket ID and its URL

**Given** the user invokes `/azdo-create-ticket` without context
**When** Claude reads the SKILL.md
**Then** Claude asks the user for the required inputs (project, work-item type, title, and optional description) before calling any tool

**Given** `create_work_item` returns `isError: true`
**When** Claude reads the response
**Then** Claude surfaces the error text to the user and does not claim success

### Story 3.4: `/azdo-add-comment` Claude Skill

As a Claude Code user,
I want to post a Markdown comment to a work item conversationally,
So that I can publish notes, status updates, or sprint reports directly from chat.

**Acceptance Criteria:**

**Given** `.claude/skills/azdo-add-comment/SKILL.md` exists
**When** Claude Code starts
**Then** `/azdo-add-comment` is available

**Given** the user invokes `/azdo-add-comment 4521 "Sprint closed, see you Monday."`
**When** Claude reads the SKILL.md
**Then** Claude calls `add_comment({ workItemId: 4521, comment: "Sprint closed, see you Monday.", format: "Markdown" })`
**And** Claude replies confirming the comment was posted with the returned comment ID

**Given** the user invokes `/azdo-add-comment` without a work-item ID or comment body
**When** Claude reads the SKILL.md
**Then** Claude asks for both before calling the tool

**Given** the user's comment body contains Markdown syntax (lists, links, bold)
**When** the comment is posted and rendered in Azure DevOps
**Then** the Markdown renders correctly (confirmed by manual UI check or by re-fetching the comment with its format metadata)

## Epic 4: Sprint Report — Compound Orchestration

The flagship compound skill that orchestrates reads plus writes to generate a Markdown report from an iteration and publish it as a comment on a target work item. Publish target at MVP: work-item comment only. Wiki-page publishing is deferred.

### Story 4.1: `/azdo-sprint-report` Claude Skill

As a Claude Code user,
I want to type `/azdo-sprint-report` at the end of a sprint and have Claude assemble a Markdown report from the iteration's work items — grouped by state, sorted by priority — and publish it as a comment on a target work item I specify,
So that the weekly thirty-minute reporting chore becomes a ninety-second conversational exchange.

**Acceptance Criteria:**

**Given** `.claude/skills/azdo-sprint-report/SKILL.md` exists
**When** Claude Code starts
**Then** `/azdo-sprint-report` is available as a slash-command

**Given** the SKILL.md front matter
**When** it is parsed
**Then** `name` is `azdo-sprint-report` and `description` is a one-line statement matching "end-of-sprint markdown report" intent

**Given** the user invokes `/azdo-sprint-report`
**When** Claude reads the SKILL.md orchestration steps
**Then** the steps instruct Claude to:
- call `list_team_iterations({ timeframe: "current" })` and take the resolved iteration GUID
- call `list_work_items({ criteria: { iteration: <GUID> }, fields: ["System.Title", "System.State", "System.Description", "Microsoft.VSTS.Common.Priority"] })`
- group returned items by `System.State` (Done / In Progress / other), sort each group by `Microsoft.VSTS.Common.Priority` ascending
- render a Markdown report with a heading per state and one bullet per item (title + priority + one-line trimmed description)
- prompt the user to confirm the report and provide a target work-item ID for publishing

**Given** the user confirms and supplies a target ticket ID
**When** Claude proceeds
**Then** Claude calls `add_comment({ workItemId: <target>, comment: <markdown report>, format: "Markdown" })`
**And** Claude replies with the target ticket URL and a brief confirmation

**Given** the iteration contains zero work items
**When** Claude executes the skill
**Then** Claude reports "no work items in this iteration" and does not call `add_comment`

**Given** `list_work_items` or `add_comment` returns `isError: true`
**When** Claude processes the response
**Then** Claude surfaces the error and does not claim the report was posted

**Given** the SKILL.md is edited (e.g., to change the grouping logic or the report template wording)
**When** Claude Code starts a new session
**Then** the next invocation of `/azdo-sprint-report` reflects the edits without any source rebuild

