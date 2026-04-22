---
epic: 1
story: 1.3
title: Running MCP server with Microsoft work-items tools
status: Done
completedAt: 2026-04-22
merges: [original 1.3 "Client Module", original 1.4 "Server Entry Point"]
---

# Story 1.3 — Running MCP server with Microsoft work-items tools

**Source:** `specs/planning/epics.md` § Epic 1 § Story 1.3

## Implementation Summary

`pnpm start` boots a live MCP stdio server that exposes Microsoft's `wit_*` work-item tools against the configured Azure DevOps organisation. Three source files carry the whole thing:

- `src/client.ts` — one public symbol: `getClient(): WebApi` backed by a lazy singleton. All PAT/auth plumbing is private.
- `src/tools/work-items.ts` — one public symbol: `registerWorkItemTools(server)`. It is the only file in the repo that deep-imports from `@azure-devops/mcp/dist/*` and the only file that knows how MS's provider contract looks. The three provider helpers (`tokenProvider`, `clientProvider`, `userAgentProvider`) live here as private functions because they have no other caller.
- `src/index.ts` — minimal entry: construct `McpServer`, call `registerWorkItemTools(server)`, connect stdio. Static imports, no `try/catch`.

Originally-planned Stories 1.3 (Client Module) and 1.4 (Server Entry) were each prep-only — neither delivered anything the user could exercise on its own. Merging them into this single story removed dead exports and produced a commit that actually gives the user a running MCP after the first merge.

## Acceptance Criteria — Verification

| AC | Status | Evidence |
|---|---|---|
| `McpServer({ name: 'azdo-mcp', version: '0.1.0' })` constructed | ✅ | `src/index.ts:6` reads name/version from `package.json`; Inspector handshake returns the same serverInfo |
| `src/tools/work-items.ts` exports `registerWorkItemTools(server)` which calls `configureWorkItemTools(server, tokenProvider, clientProvider, userAgentProvider)` once with private providers | ✅ | Single call site at `src/tools/work-items.ts:10`; providers are non-exported `function` declarations at the bottom of the same file |
| `src/client.ts` exposes only `getClient(): WebApi` backed by a lazy singleton; PAT handler + `new WebApi(...)` private to the file | ✅ | `src/client.ts` has exactly one `export function getClient()`; body uses `client ??= new WebApi(...)` |
| `server.connect(new StdioServerTransport())` called; process stays alive on stdio | ✅ | `pnpm start` accepts JSON-RPC from stdin, replies on stdout, holds open until stdin closes |
| Missing env var → non-zero exit, missing-variable message visible on stderr (Node default format) | ✅ | `AZDO_ORG_URL=x node --import tsx src/index.ts` → stderr starts with `Error: AZDO_PAT is required` pointing at `src/config.ts:9`, exit 1. Formatted single-line stderr deferred — see `specs/dev/deferred-work.md` |
| `tools/list` includes `wit_get_work_item`, `wit_query_by_wiql`, `wit_add_work_item_comment`; no author-written tools | ✅ | Handshake returns 23 `wit_*` tools, all three present; no author tools (Epic 2/3 work) |
| `wit_get_work_item` returns a content block with work-item data against real Azure DevOps | ✅ | Verified manually via Inspector — real ticket ID returned real fields; real Azure DevOps error responses propagate through MCP as `isError: true` content blocks |
| stdout contains only well-formed JSON-RPC | ✅ | Python JSON-line parser consumed stdout cleanly during handshake + tools/list + tools/call |
| `new WebApi(...)` only in `src/client.ts` | ✅ | `grep 'new WebApi' src/` → single match (`src/client.ts:8`) |
| `@azure-devops/mcp/dist/*` only in `src/tools/work-items.ts` (runtime) | ✅ | `grep '@azure-devops/mcp/dist' src/` → single match (`src/tools/work-items.ts:2`); ambient type shim at `types/azure-devops-mcp.d.ts` is type-only and lives outside `src/` |
| `console.log` never called in runtime code | ✅ | `grep 'console.log' src/` → no matches |

## Design Decisions

1. **Module layout: `tools/<domain>.ts` owns the MS wiring for that domain.** `src/index.ts` is a thin composer — it doesn't know anything about MS's provider contract or the deep-import path. Each MS domain we adopt later (`wiki`, `work`, etc.) adds one `src/tools/<domain>.ts` file and one import line in `index.ts`. The boundary rule "MS deep-import only in `src/tools/<domain>.ts`" scales with the tool surface.
2. **Provider helpers are private to `tools/work-items.ts`.** `tokenProvider`, `clientProvider`, `userAgentProvider` are only called by MS's `configureWorkItemTools`, and the only file that reaches `configureWorkItemTools` is `tools/work-items.ts`. Exporting them would be dead-code-at-commit-time (YAGNI rule memory). If `tools/wiki.ts` arrives later and needs the same providers, we refactor them upward then — not now.
3. **`getClient()` is the only public in `client.ts`.** Auth plumbing (PAT handler construction, `WebApi` singleton, `new WebApi`) is an implementation detail. Epic 2 primitives will import `getClient()`, no more.
4. **Static imports everywhere; no `try/catch` in `src/index.ts`.** The earlier draft used dynamic `import('./client')` inside a `try/catch` to catch config-module throws at load time. That trick was called "мусор" in review and replaced with plain static imports; startup failures now surface via Node's default uncaught-exception handler. The trade-off (stack trace vs single-line stderr) is documented in `specs/dev/deferred-work.md` and is cheap to revisit later via a Node `--import` preload.
5. **Ambient type shim at `types/azure-devops-mcp.d.ts`.** `@azure-devops/mcp@2.6.0` ships no `.d.ts`. The shim declares the precise signature of `configureWorkItemTools(server, tokenProvider, connectionProvider, userAgentProvider)`. It lives outside `src/` (tsconfig include expanded to `types/**/*.d.ts`) so the "deep-imports only in `src/tools/<domain>.ts`" grep remains honest for runtime code.
6. **`@modelcontextprotocol/inspector` as devDependency, not `npx` per run.** The `inspect` script invokes the locally-installed binary (`mcp-inspector`) rather than hitting npm on every use. Caret-pinned per NFR-C4; published 8 days before install so it cleared `pnpm-workspace.yaml`'s `minimumReleaseAge: 1440` quarantine.
7. **`.env` in `deny` permissions.** `.claude/settings.local.json` was extended with `"deny": ["Read(./.env)", "Read(.env)"]` so the Claude Code agent cannot read the PAT via the Read tool during dev. Not a complete mitigation (file-watcher reminders can still include diffs), but reduces the surface. Always rotate the PAT after any session that might have seen it.

## File List

**Created:**
- `src/tools/work-items.ts`
- `types/azure-devops-mcp.d.ts`
- `specs/dev/story-1.3-running-mcp-server.md` (this file)

**Modified:**
- `src/client.ts` — collapsed to a single public `getClient()`; providers moved to `tools/work-items.ts`
- `src/index.ts` — replaced scaffold marker with real MCP server wiring (static imports, no `try/catch`)
- `src/config.ts` — `return process.env[key]!` relaxed to `return process.env[key]` now that TS 6 narrows the type through the `if (!process.env[key]) throw` guard (no runtime change)
- `tsconfig.json` — added `types/**/*.d.ts` to `include`
- `package.json` + `pnpm-lock.yaml` — added `@modelcontextprotocol/inspector` devDependency; `inspect` script now invokes the local binary
- `specs/planning/epics.md` — merged original Stories 1.3 + 1.4 into a single Story 1.3; updated module-boundary wording; added Startup-error note
- `specs/planning/architecture.md` — boundary rule updated: MS deep-imports live in matching `src/tools/*.ts` wrapper, not `src/index.ts`
- `specs/dev/deferred-work.md` — rewrote the stack-trace entry to reflect the conscious trade-off
- `.claude/settings.local.json` (gitignored) — added `deny: ["Read(./.env)"]`

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Date:** 2026-04-22
- **Verification runs:**
  - `pnpm type-check` → exit 0
  - `pnpm start` + placeholder `.env` → accepts JSON-RPC, handshake replies, `tools/list` returns 23 `wit_*` tools including the three required
  - `wit_get_work_item` against a real Azure DevOps work item in the configured project → real fields returned, verified manually via MCP Inspector
  - Missing PAT → Node default stderr stack trace with `Error: AZDO_PAT is required` on the first line, exit 1
  - `grep 'new WebApi' src/` → only `src/client.ts`
  - `grep '@azure-devops/mcp/dist' src/` → only `src/tools/work-items.ts`
  - `grep 'console.log' src/` → no matches
- **Tests:** None per NFR-M3. End-to-end verified via Inspector against a real Azure DevOps ticket.
