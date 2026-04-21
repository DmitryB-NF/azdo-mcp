---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-21'
inputDocuments:
  - specs/planning/prd.md
  - specs/planning/product-brief-azdo-mcp.md
  - specs/planning/research/technical-azure-devops-mcp-market-scan-research-2026-04-21.md
workflowType: 'architecture'
project_name: 'azdo-mcp'
user_name: 'Dmitry'
date: '2026-04-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 32 FRs across 7 capability areas:

- Work Item Retrieval (FR1–FR7) — fetch single, batch by iteration / priority / WIQL / ID-list, field selection.
- Work Item Creation and Modification (FR8–FR11) — create with typed links, post Markdown comments.
- Iteration Management (FR12–FR14) — list, filter by timeframe, name→GUID resolution.
- Skill Orchestration (FR15–FR20) — skill discovery, invocation, compound sequencing, conversational parameter collection; five reference skills at MVP.
- Configuration and Identity (FR21–FR24) — `.env`-based config, fail-fast validation, PAT auth, host registration.
- Ecosystem Integration (FR25–FR28) — Microsoft `@azure-devops/mcp` deep-import, coexistence in a single tool namespace, inheritance of Microsoft's raw-REST workarounds (Markdown comments, wiki ETag retry).
- Protocol Compliance and Error Handling (FR29–FR32) — MCP specification adherence, response shape, error propagation, stdout discipline.

**Non-Functional Requirements:** 22 NFRs across 5 dimensions:

- Performance: cold start <2s, single tool call <1.5s p95, batch 50 items <5s, end-to-end skill completion <2 min.
- Security: PAT loaded from `.env` only, no secret propagation into host config or outputs, minimum-scope PAT, repo hygiene, zero telemetry.
- Integration: Azure DevOps REST 7.1 + 7.2-preview.4, MCP spec via `@modelcontextprotocol/sdk` v1.29+, Claude Code host, `@azure-devops/mcp@2.6.0` deep-import contract (exact pin).
- Maintainability: skill-add = one markdown edit, primitive-add = one source file + one import line, pure-function testability, error observability on stderr.
- Compatibility: Node.js 24 LTS or later, TypeScript 5.9+, target ESNext, pnpm, macOS/Linux/Windows (matching the Claude Code platform matrix), caret + exact-pin hybrid dependency policy.

### Scale & Complexity

- **Primary domain:** protocol-level backend (MCP JSON-RPC over stdio) paired with a thin tool-orchestration layer (Claude Skills, host-side markdown).
- **Complexity level:** low. Personal MVP with a five-hour hard cap, single user, narrow scope. No regulatory frameworks apply.
- **Architectural components:** seven (entry point, config, client singleton, five primitive modules, utils module, skill directory) plus the deep-imported Microsoft MCP domains as an external module.

### Technical Constraints & Dependencies

- **Runtime:** **Node.js 24 LTS or later** (Active LTS since October 2025). Node 26 (Current) acceptable. Earlier LTS lines (20, 22) out of scope.
- **Language:** **TypeScript 5.9+**. Transpilation target **ESNext** — use the full modern surface.
- **Package manager:** pnpm (primary). npm / yarn may work but are not tested.
- **Transport:** MCP over stdio. No HTTP/streamable-HTTP at MVP.
- **Host:** Claude Code. Compatibility with other MCP hosts (VS Code, Cursor, Claude Desktop) not guaranteed at MVP but not deliberately broken.
- **Upstream APIs:** Azure DevOps Services REST (`dev.azure.com`) versions 7.1 (wiki write) and 7.2-preview.4 (Markdown comments). Azure DevOps Server on-premises not supported.
- **External dependencies:** `@modelcontextprotocol/sdk@^1.29`, `@azure-devops/mcp@2.6.0` (pinned exact), `azure-devops-node-api@^15.1`, `zod@^3.25`, `tsx@^4` (runtime via `node --import tsx`). No `dotenv` — Node 20.6+ reads `.env` natively via `--env-file=.env`.
- **Deep-import constraint:** consumes `@azure-devops/mcp/dist/tools/*.js` — unsupported path. Exact-version pinning + documented fallback to SDK-direct reimplementation (6–12h migration) if MS reorganizes `dist/`.

### Cross-Cutting Concerns

- **Authentication propagation.** A single PAT is loaded from `.env` at startup. `getPersonalAccessTokenHandler(PAT)` wraps a singleton `WebApi` instance. Provider functions (`tokenProvider`, `clientProvider`, `userAgentProvider`) deliver the same credential to deep-imported Microsoft tool registrations. No second auth stack.
- **stdio-stdout invariant.** JSON-RPC owns stdout exclusively. Any direct `console.log` outside the SDK corrupts the protocol silently. All diagnostic output routes to stderr. Enforced by convention; validated in the dev loop via MCP Inspector.
- **Deep-import fragility.** `@azure-devops/mcp/dist/tools/*.js` is unsupported API surface. Mitigated by exact-version pinning on `2.6.0`. If Microsoft reorganizes the dist structure, the fallback plan is to reimplement the five primitives directly on `azure-devops-node-api`, borrowing the already-understood raw-REST helpers for Markdown comments and wiki page ETag retry from the research document.
- **Error pass-through.** No custom error translation layer at MVP. Raw Azure DevOps API errors propagate through the MCP response shape (`{ content, isError }`) so Claude can surface them conversationally to the user. Structured translation (e.g., "PAT missing scope X") is Phase 2 scope.
- **Pure-function extraction.** Compound logic that exceeds trivial request/response mapping (e.g., `formatReport` for Markdown report generation) factors into `src/utils/` with corresponding `test/` coverage. Skills and primitives stay thin; anything testable is extracted.
- **Skill-authoring boundary.** Runtime artifact = `.claude/skills/<name>/SKILL.md` (host-side, markdown only, no rebuild). Code artifact = `src/tools/<area>.ts` (requires `tsc` rebuild + Claude Code session restart). Skill authors never touch source; primitive authors touch both. This boundary is load-bearing for the extensibility claim in the PRD.

## Starter Template Evaluation

### Primary Technology Domain

MCP protocol backend (stdio-based). Structurally a CLI tool (local Node process, package-distributed, config via files); semantically a JSON-RPC protocol endpoint. No web / mobile / UI starters apply.

### Starter Options Considered

| Option | Assessment |
|---|---|
| Manual scaffold (official SDK quickstart pattern) | **Selected.** Zero vendor lock-in, folder layout matches PRD exactly, 15-minute setup. |
| [`@modelcontextprotocol/typescript-sdk`](https://github.com/modelcontextprotocol/typescript-sdk) docs example | Canonical reference, not a template — informs the manual scaffold. |
| [`alexanderop/mcp-server-starter-ts`](https://github.com/alexanderop/mcp-server-starter-ts) | Minimal OSS starter with MCP Inspector + Node native test runner preconfigured; includes dual transport (HTTP) we don't need. Would require structural refactor to match PRD. |
| [`kirbah/mcp-typescript-starter`](https://github.com/kirbah/mcp-typescript-starter) | Production-grade with DI container and zod validation — over-engineered for a 5-hour personal MVP. |
| [`MatthewDailey/mcp-starter`](https://github.com/MatthewDailey/mcp-starter), [`TheSethRose/MCP-Server-Starter`](https://github.com/TheSethRose/MCP-Server-Starter) | Community starters; non-matching folder conventions; maintenance status variable. |

### Selected Starter: Manual scaffold from official SDK quickstart pattern

**Rationale for Selection:**

The PRD fixes the project layout (entry, config, client singleton, `src/tools/`, `src/utils/`, `.claude/skills/`). Any third-party template introduces its own structure that must be refactored to match — the refactor cost exceeds the scaffold cost. Manual scaffold also keeps the dependency surface minimal (the 5-hour budget penalizes every transitive dependency surprise). The official `@modelcontextprotocol/typescript-sdk` `docs/server.md` quickstart provides the ~20-line canonical stdio server example that covers ~90% of the entry-point boilerplate for free.

**Initialization Command:**

```bash
# Repo is already initialized from the initial planning commit with:
#   package.json    (name, version, description, private: true, author, install:bmad script)
#   .gitignore      (node_modules, .env, _bmad, .claude/settings.local.json, .DS_Store)
#   specs/planning/**  (brief, PRD, architecture, epics, readiness report)
# This scaffold augments the existing repo with:
#   - "type": "module", "engines.node": ">=24.0.0", and runtime scripts in package.json
#   - dependencies + devDependencies
#   - tsconfig.json, .env (with placeholders), empty source stubs, .claude/.mcp.json

cd azdo-mcp

# Runtime deps. tsx is a runtime dep — we run .ts directly, no tsc compile step.
# No dotenv — Node 20.6+ handles .env natively via --env-file.
pnpm add @modelcontextprotocol/sdk zod \
         @azure-devops/mcp@2.6.0 \
         azure-devops-node-api \
         tsx

pnpm add -D typescript@latest @types/node@latest

# Generate the canonical tsconfig.json — if you already authored it manually, skip
# or reconcile the flags afterwards.
pnpm exec tsc --init \
  --target ESNext --module ESNext --moduleResolution bundler \
  --rootDir src --strict --noEmit --allowImportingTsExtensions

mkdir -p src/tools .claude/skills
touch src/index.ts src/config.ts src/client.ts
touch src/tools/work-items.ts src/tools/iterations.ts src/tools/comments.ts
touch README.md

# Seed .env with required placeholders (never committed; .gitignore covers it)
cat > .env <<'EOF'
AZDO_ORG_URL=https://dev.azure.com/<your-org>
AZDO_PAT=<your-personal-access-token>
AZDO_DEFAULT_PROJECT=<your-project>
AZDO_DEFAULT_TEAM=<your-team>
EOF
```

**Architectural Decisions Provided by Starter:**

- **Language & Runtime:** Node.js 24 LTS, TypeScript 5.9+, **`tsx` as the runtime** (no `tsc` compile step). The server runs `.ts` files directly. Node 24's native `--experimental-strip-types` is an alternative but `tsx` is more predictable across edge cases.
- **Module system:** ESM only (`"type": "module"` in `package.json`). **Imports are extensionless** (`moduleResolution: bundler` in `tsconfig.json`). No `.js` extensions in import paths — the project is authored and run as pure TypeScript.
- **Build tooling:** **No build step.** `tsc` is invoked only for type-checking (`--noEmit`). No `dist/` directory. The `.mcp.json` host entry spawns `tsx src/index.ts` directly.
- **Testing framework:** Optional. Node native test runner (`node --test`) via `tsx` is available for pure-function unit tests when complexity warrants them; no unit tests are mandatory at MVP.
- **Linting/Formatting:** **None at MVP.** No Prettier, no ESLint. Local-only personal tool; style discipline is author's own. Phase 2 if the codebase grows or external contributors appear.
- **Project structure:** Predetermined by the PRD — matches the manual scaffold 1:1 without cleanup.
- **Running the server:** canonical command is `node --env-file=.env --import tsx src/index.ts` (works on any machine with Node 20.6+, zero dependency on pnpm's runtime behavior). The `package.json` `start` script wraps this. Optional `dev` script adds `--watch` for hot-reload. Interactive tool debugging via the `inspect` script.

**`.mcp.json` host entry shape:**

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

Invokes `node` directly — more universal than `pnpm start` (no runtime dependency on pnpm's spawning behavior). `--env-file=.env` loads environment variables natively (Node 20.6+). `--import tsx` registers the tsx loader so `.ts` files execute without a build step. `cwd: "./"` resolves against the project root. No secrets in this file; it is committed as-is.

**Note:** Project initialization using these commands is the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation) — all already made:**

Runtime, language, module system, package manager, transport, auth model, tool architecture, file layout. Enumerated in the Project Context Analysis and Starter Template Evaluation sections above.

**Important Decisions (Shape Architecture) — mostly inherited from PRD; clarified below:**

Tool registration pattern, provider pattern for deep-import, input validation, error propagation, config validation, naming conventions.

**Deferred (Post-MVP):**

- OAuth / Entra ID authentication.
- Structured error translation (AzDO 401 → "PAT missing scope X").
- Multi-org / multi-project runtime switching.
- CI/CD pipeline (GitHub Actions).
- Pre-commit hooks (husky, lint-staged).
- Skill sharing / registry infrastructure.
- Remote MCP / streamable HTTP transport.

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Persistent store | **None** | No data to persist — MCP process is stateless between requests. All state reconstructed from `.env` + AzDO API on demand. |
| In-memory state | **`WebApi` lazy singleton** in `src/client.ts` | One client, built once, reused across tool calls. PAT handler bound at construction. |
| Caching | **None at MVP** | AzDO rate limits are generous for personal use; caching adds invalidation complexity. Each tool call fetches fresh. |
| Data validation | **zod** schemas at MCP tool input boundary only | SDK already uses zod via `server.registerTool()`; no additional library. AzDO response data is trusted (typed by `azure-devops-node-api`). |

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Auth method | **Personal Access Token** via `azure-devops-node-api`'s `getPersonalAccessTokenHandler(PAT)` | Emits `Authorization: Basic base64("PAT:"+token)`; user already has working PAT. |
| Secret storage | **`.env` file** with real values, loaded by Node's native `--env-file=.env` flag at process start; **gitignored from the first commit**. No separate `.env.example`; no `dotenv` package. | Simpler for a local personal tool. Node 20.6+ reads `.env` natively, eliminating a runtime dependency. The README documents the required field names. |
| PAT scopes required | Work Items (R&W), Wiki (R&W), Project & Team (R) | Documented in README; enables least-privilege PAT generation. |
| Secret rotation | **Manual** — user regenerates PAT, updates `.env`, restarts Claude Code | Acceptable for personal tool; automated rotation is Phase 2. |
| Encryption at rest | **N/A** | No data store. `.env` inherits filesystem permissions (user's responsibility). |
| TLS/transport security | **Inherited** — `typed-rest-client` uses HTTPS for `dev.azure.com` by default | No custom configuration needed. |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| Protocol | **MCP over JSON-RPC over stdio** | SDK default; matches Claude Code host expectation; no HTTP complexity. |
| SDK | **`@modelcontextprotocol/sdk@^1.29`** | Official TypeScript SDK; stable on v1 (no breaking majors in 6 months per research). |
| Tool registration API | **`McpServer.registerTool(name, {description, inputSchema}, handler)`** | High-level SDK API; zod integration built-in via `inputSchema`. |
| Tool namespace | **Single flat namespace** — author tools and MS deep-imported tools coexist | Author tools use verb-leading names (`get_work_item`); MS uses prefix-leading (`wit_*`, `wiki_*`). No collision. |
| Response shape | **`{content: [{type: "text", text}], isError?: boolean}`** | MCP spec; JSON-serialize structured data into `text`. |
| Error handling | **Try/catch at tool boundary; raw error text into `content` with `isError: true`** | No custom translation at MVP; LLM surfaces error to user. |
| Input validation | **zod schemas per tool; SDK validates before handler dispatch** | Matches `registerTool` contract; rejects malformed input before any AzDO API call. |

### Frontend Architecture

**N/A** — no UI. All user interaction is through Claude Code's chat interface.

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | **Local Node stdio process**, spawned by Claude Code per session via `.mcp.json` | No server to host; no port binding; zero infrastructure. |
| Build artifact | **None.** Pure TS runtime via `tsx`. `tsc` runs type-check only (`--noEmit`). | No `dist/`, no compile step. `.mcp.json` spawns `tsx src/index.ts`. Simpler dev loop; no stale-build class of bugs. |
| Bundling | **None** | Node imports work directly; bundling adds complexity without benefit for a local process. |
| Package publishing (MVP) | **Not published** — repo cloned directly from GitHub | Keeps MVP minimal; Phase 2 may consider npm publish for `pnpm azdo-mcp init`-style bootstrap. |
| CI/CD | **None at MVP** — manual build + manual test via MCP Inspector | GitHub Actions is Phase 2 if/when external contributors appear. |
| Monitoring | **Stderr log only** for runtime diagnostics | Development loop uses MCP Inspector; runtime monitoring unnecessary for a personal tool. |
| Scaling | **N/A** — single user, single process per Claude Code session | |
| Environment strategy | **Single `.env` file** with no dev/prod split | Personal tool runs in one environment. |

### Cross-Cutting Patterns

- **Tool module convention.** Each domain = one file in `src/tools/` exporting (a) pure async functions that take `(conn: WebApi, params): Promise<T>` and (b) a `register*Tools(server: McpServer)` function. The `register` function is called once from `src/index.ts`. This pattern enables unit-testing pure functions with structural `WebApi` mocks, per NFR-M3.
- **Provider pattern for deep-import.** `src/client.ts` exports the singleton `getClient()` plus three callable providers (`tokenProvider`, `clientProvider`, `userAgentProvider`) required by Microsoft's `configure*Tools(server, ...)` contract. `clientProvider` is our local binding name; Microsoft's function signature names the corresponding parameter `connectionProvider`. TypeScript accepts positional callers, so the local name is ours to choose. All four pointer-targets live in one file to keep the MS contract local.
- **File naming convention.** Kebab-case for files (`work-items.ts`), camelCase for functions (`listTeamIterations`), PascalCase for types (`IterationWorkItemResult`). Matches Node/TS ecosystem norms.
- **Package entry points.** `"type": "module"` (ESM only). No `"main"`/`"exports"`/`"bin"` at MVP — `.mcp.json` spawns `node --env-file=.env --import tsx src/index.ts` directly (pure TS runtime, native `.env` loading). Optional `"bin"` is Phase 2 if published to npm.
- **Git hooks.** **None at MVP.** No husky, no lint-staged, no pre-commit. Dependency surface minimized. Manual discipline + `.gitignore` cover the secret-commit risk.
- **Linting / formatting.** **None at MVP.** No Prettier, no ESLint, no style-enforcement tooling. Local-only personal tool — author owns style discipline. Phase 2 if external contributors appear.
- **Testing.** **Node native test runner** (`node --test`) via `tsx` for `.test.ts` files. Only pure functions under `src/utils/` receive unit tests. Manual integration via MCP Inspector.

### Decision Impact Analysis

**Implementation sequence (first story → last):**

1. Scaffold project (`pnpm init`, deps, `tsconfig.json`, directory skeleton) — Phase 0 of MVP roadmap.
2. Implement `src/config.ts` (env validation, fail-fast on missing keys).
3. Implement `src/client.ts` (WebApi singleton + three providers).
4. Implement `src/index.ts` (server boot, MS deep-imports, stdio transport).
5. Verify with MCP Inspector against live AzDO (MS tools reachable, auth works).
6. Implement each primitive in `src/tools/<area>.ts` one at a time, verifying via Inspector after each.
7. Author 5 `SKILL.md` files (formatting and orchestration logic lives here, not in `src/`), test end-to-end via Claude Code.
8. Write README (prerequisites, setup, tool/skill catalog, troubleshooting).
9. Commit to public GitHub repo.

**Cross-component dependencies:**

- `src/client.ts` depends on `src/config.ts` (reads PAT/org from config).
- `src/index.ts` depends on both plus each `src/tools/*.ts`.
- All author tools depend on `getClient()` from `src/client.ts`.
- Microsoft `configure*Tools` calls depend on the three provider functions from `src/client.ts`.
- Skills depend on primitives being registered; no direct code dependency — Claude resolves tools at invocation time.

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Files:**

- `kebab-case.ts` for all source files (`work-items.ts`, `iterations.ts`, `config.ts`).
- Skill files at `.claude/skills/<slug>/SKILL.md` with kebab-case slug.

**Functions:**

- `camelCase` for all functions.
- Pure async implementations take `(api: WebApi, params: T)` and return `Promise<R>`. Never use module-level state inside implementations — always accept the AzDO API client via parameter.
- Registration functions follow `register<Domain>Tools(server: McpServer): void`.

**Types & interfaces:**

- `PascalCase`. Prefer `interface` for object shapes; `type` for unions, aliases, mapped types.

**MCP Tool names:**

- Author tools: verb-leading, snake_case, no prefix: `get_work_item`, `list_work_items`, `create_work_item`, `add_comment`, `list_team_iterations`.
- Microsoft deep-imported tools keep their upstream prefixes (`wit_*`, `wiki_*`, `work_*`).

**Claude Skill names:**

- `/azdo-<action>[-<object>]`: `/azdo-sprint-report`, `/azdo-fetch-ticket`, `/azdo-fetch-tickets`, `/azdo-create-ticket`, `/azdo-add-comment`.

**Variables:**

- `camelCase` inside function scope. `SCREAMING_SNAKE_CASE` for module-level constants and env-var keys.

### Structure Patterns

**Project layout (final):**

```
src/
├── index.ts              # server boot, stdio connect, register all tools
├── config.ts             # validate process.env (loaded natively by Node --env-file)
├── client.ts             # WebApi singleton + three providers for MS deep-import
└── tools/
    ├── work-items.ts     # get_work_item, list_work_items, create_work_item
    ├── comments.ts       # add_comment
    └── iterations.ts     # list_team_iterations
.claude/skills/
├── azdo-fetch-ticket/SKILL.md
├── azdo-fetch-tickets/SKILL.md
├── azdo-sprint-report/SKILL.md
├── azdo-create-ticket/SKILL.md
└── azdo-add-comment/SKILL.md
```

- No `src/utils/` directory at MVP — formatting and orchestration live in Skills (markdown).
- No `test/` directory mandated — tests are opt-in if/when introduced.
- No `dist/` — pure TS runtime via `tsx`.

### Import Conventions

- **ESM only.** `"type": "module"` in `package.json`.
- **Extensionless imports.** `moduleResolution: bundler` in `tsconfig.json`. Write `import { getClient } from './client'`, not `./client.js` and not `./client.ts`.
- **Import style follows each library's canonical usage.** Use whatever form the library's docs recommend (named / default / namespace). No blanket rule favoring one form; match ecosystem convention per-library.
- **No barrel files** (`index.ts` re-exports) at MVP. Import directly from the module that defines the symbol.

### Code Shape — Tool Module Template

Ordering within each `src/tools/*.ts` file:

1. **Imports** (external first, then internal).
2. **MCP registration (public API)** — `register<Domain>Tools(server)`. The "controller" layer: what the MCP host sees.
3. **Exported operations** (if any) — pure functions used by registration AND potentially reused or tested externally. Exported **only** when reuse or test access is needed.
4. **Private helpers** — `function`-declared, module-scoped, no `export`. Default to private; promote to exported only on demand.

Encapsulation principle: everything is private until a concrete reason forces it public.

```ts
// src/tools/work-items.ts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { WebApi } from 'azure-devops-node-api';
import { z } from 'zod';
import { getClient } from '../client';

// === Public MCP API ===========================================

export function registerWorkItemTools(server: McpServer): void {
  server.registerTool(
    'get_work_item',
    {
      description: 'Fetch a single Azure DevOps work item by ID.',
      inputSchema: z.object({
        id: z.number().int().positive(),
        expandLinks: z.boolean().optional(),
      }),
    },
    async (input) => {
      try {
        const result = await getWorkItem(await getClient(), input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );
  // ... more tools ...
}

// === Public operations (testable / reusable) ==================

export async function getWorkItem(
  api: WebApi,
  params: { id: number; expandLinks?: boolean },
) {
  const wit = await api.getWorkItemTrackingApi();
  return wit.getWorkItem(
    params.id,
    undefined,
    undefined,
    params.expandLinks ? 1 /* Relations */ : 0 /* None */,
  );
}

// === Private helpers ==========================================

// (none yet — add when a pattern emerges across 2+ call sites)
```

**Controller / Service split.** When a `register*Tools` file grows beyond ~200 lines or an operation warrants dedicated testing, extract the pure operations to a sibling `src/tools/<area>-ops.ts` (or equivalent). Registration file imports from the ops file. Keeps "what the MCP exposes" separate from "how the operations work." Not mandatory at MVP — only when complexity forces it.

**Mandatory discipline:**

- Pure operations **never** call `getClient()` internally — they accept `api: WebApi` (or similarly named `client`) as an explicit parameter. This is the only way to unit-test without network access.
- Registration functions are the **only** callers of `getClient()`.
- Try/catch wraps every registered handler body; errors flow into the MCP response shape with `isError: true`.
- Response data is JSON-serialized (2-space indent) into a single text block.

### Format Patterns

**MCP tool response (success):**

```json
{ "content": [{ "type": "text", "text": "<json or plain text>" }] }
```

**MCP tool response (error):**

```json
{ "content": [{ "type": "text", "text": "Error: <message>" }], "isError": true }
```

**Zod schema style:**

- Object schemas inline in the `registerTool` call.
- Required fields without `.optional()`; optional fields with `.optional()`. Avoid `.nullish()` / `.nullable()` unless the AzDO API itself returns null.
- Prefer primitive types (`z.string()`, `z.number()`) over `z.any()`. Use `z.record()` sparingly for free-form `fields` maps.

**Dates and identifiers in output:**

- Preserve whatever `azure-devops-node-api` returns. No reformatting at MVP. Dates stay as ISO strings, IDs as numbers, GUIDs as strings.

### Error Handling

- Try/catch **only** at the MCP tool handler boundary. Pure operations throw normally; no try/catch inside operations.
- Propagate `err.message` verbatim. No structured error envelope at MVP. Structured translation is Phase 2.
- No retries at MVP. If AzDO fails transiently, the user re-invokes the skill.
- Use native `Error`. No custom error classes at MVP.

### Logging

- **None in runtime code.** The production server does not emit `console.*` calls. Errors flow through the MCP response shape; startup failures throw and exit the process.
- **Temporary debug logging** via `console.error` (stderr) is permitted locally during active development and **must be removed before commit**.
- Never `console.log` — stdout is reserved for JSON-RPC and any accidental write corrupts the protocol.

### Claude Skill Markdown Structure

Every `.claude/skills/<slug>/SKILL.md`:

```markdown
---
name: <slug>
description: <one-line purpose for Claude to match intent>
---

## Purpose

<2-3 sentence user-facing description>

## Steps

1. <Concrete action, referencing MCP tool names by their exact name>
2. ...

## Inputs required

- <parameter name>: <what Claude should ask the user if missing>

## Output contract

<what the user receives at the end>

## Failure handling

<what to do when a tool returns isError>
```

- **Mandatory front matter:** `name`, `description`.
- **Mandatory body section:** `Steps` (imperative, one action per step, reference MCP tools by **exact** name).
- **Optional sections:** `Purpose`, `Inputs required`, `Output contract`, `Failure handling` — include when non-obvious.
- **Formatting, templating, and report composition live here.** The server does not carry formatting utilities; skills instruct Claude how to format.

### TypeScript Conventions

- `strict: true` in `tsconfig.json`. No opt-outs.
- **Explicit return types** on all exported functions. Internals may rely on inference.
- `const` over `let` unless reassignment is essential.
- Prefer `for...of` over `.forEach()` in async contexts.
- No `any` in exported APIs.

### Enforcement

- No automated tooling at MVP (no ESLint, no Prettier). Author-owned discipline.
- Violations surface during Inspector testing (e.g., accidental `console.log` breaks the Inspector session immediately).

## Project Structure & Boundaries

### Complete Project Directory Structure

```
azdo-mcp/
├── .env                          # gitignored; real values
├── .gitignore                    # .env, node_modules/
├── package.json                  # "type": "module", deps & scripts
├── pnpm-lock.yaml                # committed for reproducibility
├── tsconfig.json                 # ESNext + bundler resolution + strict + noEmit
├── README.md                     # prerequisites, setup, tool/skill catalog, troubleshooting
├── src/
│   ├── index.ts                  # entry: load .env → construct server → wire tools → stdio
│   ├── config.ts                 # validate env, export typed config object
│   ├── client.ts                 # WebApi singleton + tokenProvider/clientProvider/userAgentProvider
│   └── tools/
│       ├── iterations.ts         # list_team_iterations
│       ├── work-items.ts         # get_work_item, list_work_items, create_work_item
│       └── comments.ts           # add_comment
└── .claude/
    ├── .mcp.json                 # ready-to-run MCP host entry, relative paths
    └── skills/
        ├── azdo-fetch-ticket/
        │   └── SKILL.md
        ├── azdo-fetch-tickets/
        │   └── SKILL.md
        ├── azdo-sprint-report/
        │   └── SKILL.md
        ├── azdo-create-ticket/
        │   └── SKILL.md
        └── azdo-add-comment/
            └── SKILL.md
```

**Totals:** 4 source files (entry + config + client + 3 tool modules); 5 skill markdown files; 6 repo-level files (README, package.json, lockfile, tsconfig, gitignore, `.env`); 1 ready-to-run MCP host config inside `.claude/`. No tests, no dist, no utils, no CI config, no LICENSE at MVP.

### Root Configuration Files

| File | Purpose |
|---|---|
| `package.json` | ESM marker (`"type": "module"`), runtime + dev deps, scripts `start` / `dev` / `type-check` / `inspect` (all node-based, no pnpm wrappers at runtime), plus `install:bmad` pinning the BMad Method installer version for planning provenance |
| `pnpm-lock.yaml` | Transitive resolution lock; committed |
| `tsconfig.json` | `target: ESNext`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `noEmit: true`, `allowImportingTsExtensions: true` |
| `.env` | Real config values; gitignored from the first commit |
| `.gitignore` | `.env`, `node_modules/` |
| `README.md` | Prerequisites (Node 24 LTS, Claude Code, AzDO PAT), five-minute setup, tool/skill catalog, PAT scope table, troubleshooting |
| `.claude/.mcp.json` | Ready-to-run MCP host entry using relative paths; picked up by Claude Code when the project is opened |

**`.claude/.mcp.json` content (committed, no secrets):**

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

`node` is the canonical process launcher — universal across machines with Node 20.6+ installed, no runtime dependency on pnpm's spawn semantics. `--env-file=.env` loads secrets natively into `process.env`. `--import tsx` registers TypeScript execution. End-to-end setup: `git clone` → `pnpm install` → create `.env` → open in Claude Code. Everything else is already wired.

**No LICENSE file at MVP.** The project is private for now. Licensing (MIT or otherwise) is decided if/when the repository goes public.

### Architectural Boundaries

**Module-level boundaries:**

- `src/index.ts` → the only integration point. Owns server lifecycle, registers all tool domains (author's own + MS deep-imports), connects stdio transport.
- `src/config.ts` → the only module that reads `process.env`. Environment variables are loaded by Node natively via `--env-file=.env`; no `dotenv` import needed. Everything else consumes a typed `config` export.
- `src/client.ts` → the only module that instantiates `WebApi`. Exposes `getClient()` + three providers. All AzDO API access flows through here.
- `src/tools/*.ts` → the only modules that register MCP tools. Each file owns one domain and exports `register<Domain>Tools(server)` (public controller) plus any reusable pure operations (public) and private helpers (default).

**External boundaries:**

- Downward: Azure DevOps REST API (via `azure-devops-node-api` + `@azure-devops/mcp` deep-imports).
- Upward: Model Context Protocol over stdio → Claude Code host (via `@modelcontextprotocol/sdk`).
- Sideways: none. No service mesh, no other processes, no databases.

**Boundary enforcement:**

- Imports from `@azure-devops/mcp/dist/tools/*` are permitted **only** in `src/index.ts` via the four `configure*Tools(server, ...)` calls. No other file reaches into `dist/`.
- Imports from `azure-devops-node-api` are permitted **only** in `src/client.ts` and `src/tools/*.ts`. No direct REST calls elsewhere.
- `process.env` access is permitted **only** in `src/config.ts`.

### Requirements to Structure Mapping

| Capability area (PRD) | FR range | Implementation location |
|---|---|---|
| Work Item Retrieval | FR1–FR7 | `src/tools/work-items.ts` (`get_work_item`, `list_work_items`) |
| Work Item Creation | FR8–FR9 | `src/tools/work-items.ts` (`create_work_item`) |
| Work Item Commenting | FR10–FR11 | `src/tools/comments.ts` (`add_comment`) |
| Iteration Management | FR12–FR14 | `src/tools/iterations.ts` (`list_team_iterations`) |
| Skill Orchestration | FR15–FR20 | `.claude/skills/azdo-*/SKILL.md` (five markdown files) |
| Configuration and Identity | FR21–FR24 | `src/config.ts`, `src/client.ts`, `.env`, `.claude/.mcp.json` |
| Ecosystem Integration (MS deep-import) | FR25–FR28 | `src/index.ts` (calls MS `configure*Tools`), inherits via pnpm dep |
| Protocol Compliance / Errors | FR29–FR32 | `src/index.ts` (stdio transport), per-tool `try/catch` in every `register*Tools` handler |

**Cross-cutting concerns mapping:**

- **Authentication propagation** → `src/client.ts` (singleton PAT handler + three providers).
- **stdio-stdout invariant** → enforced by convention across `src/**`; no runtime `console.*` calls.
- **Deep-import fragility** → isolated to `src/index.ts` via the four `configure*Tools` call sites; fallback plan lives in `src/tools/*.ts` (reimplement directly on `azure-devops-node-api` if needed).
- **Error pass-through** → isolated to `register*Tools` handlers in each tool file; pure operations throw.
- **Skill-authoring boundary** → `.claude/skills/` is the runtime extensibility surface; `src/tools/` is the code extensibility surface.

### Integration Points

**Internal communication (within the server process):**

- `src/index.ts` calls `registerIterationTools(server)`, `registerWorkItemTools(server)`, `registerCommentTools(server)` and MS `configure*Tools(server, ...)` sequentially at boot.
- Tool handlers call `getClient()` from `src/client.ts` on each invocation; the client is a lazy singleton.
- Pure operations in `src/tools/*.ts` accept `api: WebApi` explicitly — no global state access.

**External integrations:**

- Azure DevOps Services REST API 7.1 (wiki) + 7.2-preview.4 (markdown comments) via `azure-devops-node-api` and MS-provided raw-REST helpers.
- Claude Code MCP host via stdio JSON-RPC (`@modelcontextprotocol/sdk`).
- No other external services. No telemetry. No analytics.

**Data flow (request lifecycle):**

1. User types a slash-command in Claude Code (e.g., `/azdo-sprint-report`).
2. Claude reads the matching `SKILL.md`, interprets steps, selects an MCP tool call.
3. Claude Code host sends `tools/call` JSON-RPC over stdio to the running `azdo-mcp` process.
4. `@modelcontextprotocol/sdk` validates input against the registered zod schema.
5. Handler wraps `try` → resolves `getClient()` → calls the pure operation → serializes the result to JSON.
6. Response flows back as an MCP content block (or error with `isError: true`).
7. Claude reads the response, chooses the next skill step, repeats.

### File Organization Patterns

**Configuration files:** all at repo root except `.mcp.json` which lives inside `.claude/` for colocation with Claude-specific assets. No `config/` subfolder.

**Source organization:** flat `src/` with one file per responsibility plus a single `tools/` subfolder grouping domain modules. No `services/`, `repositories/`, `middleware/`, or similar layers — the scope does not warrant them.

**Test organization:** none mandated at MVP. If tests appear, they live in `test/<area>.test.ts` mirroring `src/` paths.

**Asset organization:** N/A. No static assets.

### Development Workflow Integration

**Running the server:**

```bash
pnpm start       # = node --env-file=.env --import tsx src/index.ts   (canonical)
pnpm dev         # = node --env-file=.env --import tsx --watch src/index.ts
pnpm type-check  # = tsc --noEmit
```

**Interactive tool testing (dev loop):**

```bash
pnpm run inspect     # = pnpm exec @modelcontextprotocol/inspector tsx src/index.ts
```

**Build:** no build step. TS runs directly via `tsx` in production.

**Deployment:** clone repo, `pnpm install`, populate `.env`, open in Claude Code. `.claude/.mcp.json` is auto-detected. End-to-end setup under five minutes on a prepared workstation.

**`package.json` script surface:**

```json
"scripts": {
  "start":        "node --env-file=.env --import tsx src/index.ts",
  "dev":          "node --env-file=.env --import tsx --watch src/index.ts",
  "type-check":   "tsc --noEmit",
  "inspect":      "npx @modelcontextprotocol/inspector node --env-file=.env --import tsx src/index.ts",
  "install:bmad": "npx bmad-method@6.3.0 install"
}
```

The `install:bmad` script pins the BMad Method installer version used for planning. BMad is not a runtime dependency and is not listed in `devDependencies` — it is a CLI tool invoked on-demand. The script documents the version for provenance and gives contributors a reproducible upgrade path (`pnpm install:bmad`) matching the convention used by `@bmad-code-org/BMAD-METHOD` itself.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

All technology choices are mutually compatible. Node.js 24 LTS (with native `--env-file` from 20.6+ carried forward) + TypeScript 5.9+ + `tsx` (via `--import`) + ESM + `moduleResolution: bundler` form a coherent modern stack with no version conflicts. `@modelcontextprotocol/sdk` v1.29+ operates natively over stdio. `@azure-devops/mcp@2.6.0` deep-import exports match the `configureXxxTools(server, tokenProvider, clientProvider, userAgentProvider)` positional contract already verified in research. `azure-devops-node-api` v15.1 is the supported SDK version used internally by Microsoft's MCP server — same dependency, same auth path.

**Pattern Consistency:**

Naming conventions (kebab-case files, camelCase functions, PascalCase types, verb-leading snake_case MCP tools, `/azdo-*` skill slugs) are uniformly applied across source and skill markdown. Code shape (MCP registration on top → public operations → private helpers) is consistent across all three tool files. Error handling pattern (try/catch at handler boundary only) is enforced uniformly.

**Structure Alignment:**

Project structure supports every architectural decision: each `src/*` file has exactly one responsibility; boundaries are mechanically enforceable (e.g., `process.env` access only in `config.ts`); the `.claude/` folder cleanly separates runtime extensibility (skills) from code extensibility (tools). The three module boundaries (config / client / tools) map 1:1 to the three cross-cutting concerns (env loading / auth / business capability).

### Requirements Coverage Validation ✅

**Functional Requirements (FR1–FR32):** 100% mapped to specific files per the Requirements-to-Structure table in §Project Structure. No FR is undefined architecturally.

**Non-Functional Requirements (NFR-P1 … NFR-C4):**

| NFR | Architectural support |
|---|---|
| NFR-P1 cold start <2s | Minimal dep surface, `node --import tsx` fast startup, no bundler overhead |
| NFR-P2 tool latency <1.5s p95 | Single HTTPS call per tool; `azure-devops-node-api` baseline perf |
| NFR-P3 batch 50 items <5s | Microsoft batch helper + SDK chunking at 200-ID cap |
| NFR-P4 skill end-to-end <2min | Composition of Phase 1 primitives + host-side skill orchestration |
| NFR-S1–S5 PAT/env/gitignore/no-telemetry | `.env` gitignored; `.env` the only secret store; native `--env-file` loader; `process.env` boundary in `config.ts`; no network beyond AzDO |
| NFR-I1–I4 AzDO REST, MCP spec, Claude Code host, MS pin | `azure-devops-node-api@^15.1`, `@modelcontextprotocol/sdk@^1.29`, stdio transport, `@azure-devops/mcp@2.6.0` exact |
| NFR-M1 skill-add 1 file | `.claude/skills/<slug>/SKILL.md` markdown-only edit |
| NFR-M2 primitive-add 1+1 | New `src/tools/<area>.ts` + one import line in `src/index.ts` |
| NFR-M3 testability structure | Pure operations accept `api: WebApi` parameter — unit-testable via structural mock |
| NFR-M4 error observability | Raw error text flows into MCP response with `isError: true` |
| NFR-C1–C4 runtime/pm/OS/pinning | Node 24 LTS, pnpm for install, platform-agnostic, lockfile committed |

All 22 NFRs have architectural coverage.

### Implementation Readiness Validation ✅

**Decision Completeness:**

Every critical decision has an explicit entry in the Core Architectural Decisions section with choice, rationale, and — where relevant — version. Deferred decisions are listed with their MVP boundary rationale.

**Structure Completeness:**

Complete file tree with every expected file and directory. `.claude/.mcp.json` is committed ready-to-run with relative paths and `node --env-file --import tsx` launcher. Scaffold command sequence is copy-pasteable and reproducible.

**Pattern Completeness:**

All identified conflict points (naming, imports, file shape, error handling, logging, response format, zod style, skill markdown structure) have explicit patterns with good/anti-pattern examples.

### Gap Analysis

**Critical gaps:** None. The architecture is implementation-ready.

**Important gaps (worth noting, not blocking):**

- **Startup error handling is implied but not fully specified.** Pattern: `src/config.ts` throws `Error` on missing env at import time (since `process.env` is already populated by Node's `--env-file` flag); `src/index.ts` catches at top level, writes to stderr once via `process.stderr.write`, then `process.exit(1)`. Captured below.
- **Canonical `tsconfig.json` is described via flags but not as a single committed example.** Captured below.

**Nice-to-have gaps:**

- README section outline — specified at high level; full heading structure could be drafted ahead of implementation.
- Canonical `package.json` shape — scripts are specified; full file is not. Trivial to derive.

### Resolution of Important Gaps

**Startup error handling pattern:**

```ts
// src/index.ts
try {
  const { config } = await import('./config');    // throws on missing env
  const { main } = await import('./main');        // wires server + registers tools + connects stdio
  await main(config);
} catch (err) {
  process.stderr.write(`[azdo-mcp] Startup failure: ${(err as Error).message}\n`);
  process.exit(1);
}
```

The single permitted `process.stderr.write` call is at the fail-fast boundary only, not elsewhere. `main()` owns server boot + stdio connect; while stdio is open, the process stays alive. Alternatively, the boot logic can inline in `src/index.ts` without a separate `src/main.ts` — the shape is identical.

**Canonical `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

### Architecture Completeness Checklist

**✅ Requirements Analysis** — all PRD FRs/NFRs loaded, 32 FRs + 22 NFRs mapped.
**✅ Architectural Decisions** — all critical decisions documented with versions; deferred items enumerated.
**✅ Implementation Patterns** — naming, structure, imports, code shape, format, errors, logging, skill markdown, TS conventions — all specified with examples.
**✅ Project Structure** — complete tree, boundaries, integration points, data flow, workflow scripts.

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION.

**Confidence Level:** HIGH. Decisions are backed by the technical research document (market scan, SDK verification, MS deep-import source inspection) and cross-checked against PRD FRs/NFRs with 100% coverage.

**Key Strengths:**

- Minimal scope with maximum clarity: 4 source files, 5 skills, zero build pipeline.
- Extensibility is mechanical: skill-add = markdown edit, primitive-add = 1 source file + 1 import.
- Deep-import strategy inherits Microsoft's ongoing API maintenance for free while keeping business logic in the author's control.
- PAT-only auth with native `--env-file` eliminates both interactive OAuth friction and the `dotenv` runtime dependency.
- `node --env-file --import tsx` launcher is universal: runs on any machine with Node 20.6+, zero pnpm runtime coupling.
- Ready-to-run `.claude/.mcp.json` means zero host-config friction after clone.

**Areas for Future Enhancement (Phase 2+):**

- Structured error translation (AzDO 401 → "PAT missing scope X").
- Bootstrap / doctor CLI command for non-author adopters.
- Multi-org / multi-project runtime switching.
- OAuth / Entra ID authentication.
- Published npm package with `bin` entry.
- GitHub Actions type-check on PR (if the project goes public and accepts contributions).

### Implementation Handoff

**AI Agent Guidelines:**

- Follow every decision in `Core Architectural Decisions` verbatim.
- Apply every pattern from `Implementation Patterns & Consistency Rules` uniformly across all tool modules.
- Respect the boundary rules: `process.env` only in `config.ts`; `new WebApi(...)` only in `client.ts`; deep-imports from `@azure-devops/mcp/dist/*` only in `src/index.ts`.
- Use the canonical `tsconfig.json` and `.claude/.mcp.json` provided in this document.
- No `console.*` in runtime code. No unit tests mandatory.
- When in doubt, refer to this document before inventing a convention.

**First Implementation Story:**

Execute the scaffold command sequence from §Starter Template Evaluation §Initialization Command. This produces a working `pnpm install` and empty-but-structurally-correct `src/*.ts` files within ~10 minutes.
