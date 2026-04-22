---
epic: 1
story: 1.1
title: Project Scaffold
status: Done
completedAt: 2026-04-22
---

# Story 1.1 — Project Scaffold

**Source:** `specs/planning/epics.md` §Epic 1 §Story 1.1

## Implementation Summary

Initial repo augmented with TypeScript toolchain, runtime deps, `tsconfig.json`, `.env`, `.claude/.mcp.json`, and minimal `src/index.ts`. `pnpm start` boots cleanly and emits a stderr start log. `pnpm type-check` is clean.

## Acceptance Criteria — Verification

| AC | Status | Notes |
|---|---|---|
| `package.json` augmented, identity fields preserved | ✅ | `type: module`, `engines.node: >=24.0.0`, scripts added; `name/version/description/private/author` unchanged |
| Runtime deps installed | ✅ | `@modelcontextprotocol/sdk ^1.29`, `zod ^4.3`, `@azure-devops/mcp 2.6.0` (exact), `azure-devops-node-api ^15.1`, `tsx ^4.21` |
| Dev deps installed | ✅ | `typescript ^6.0`, `@types/node ^25.6` (latest); TS 6 satisfies `5.9+` constraint |
| `pnpm-lock.yaml` committed | ✅ | Generated |
| `tsconfig.json` canonical options | ✅ | All required flags present |
| `.claude/.mcp.json` ready-to-run | ✅ | `node --env-file=.env --import tsx src/index.ts` |
| `.env` with 4 placeholders | ✅ | **Not gitignored** — policy revised; see Scope Deviation #6 |
| `pnpm install` completes without errors | ✅ | |
| `pnpm type-check` reports no errors | ✅ | Exit 0 |
| Identity fields preserved | ✅ | |

## Scope Deviations (explicit, agreed)

1. **Empty stub files dropped.** AC originally required empty stubs at `src/config.ts`, `src/client.ts`, `src/tools/{work-items,comments,iterations}.ts`. Removed per user feedback — empty placeholders add no value. Those files will be created in their own stories (1.2, 1.3, 2.x, 3.x) when real content lands.
2. **`src/index.ts` carries minimal content.** Single `console.error` line verifying the scaffold boots. Architecture rule "no `console.*` in runtime code" applies to the production MCP runtime; per-architecture exception covers temporary dev-phase `console.error`. Story 1.4 will replace this with the real MCP server bootstrap.
3. **`.gitignore` trimmed.** `node_modules/` and `.DS_Store` omitted — covered by global gitignore / modern macOS defaults; only project-specific entries kept.
4. **Supply-chain hardening added.** `pnpm-workspace.yaml` introduced with `minimumReleaseAge: 1440` (24-hour quarantine) and `allowBuilds: { '@azure-devops/mcp': true, esbuild: true }` (install-script allow-list). pnpm pinned to the latest 10.33.0 via `packageManager` with integrity hash (`corepack use pnpm@latest`). Not in original AC — added proactively at user request.
5. **Scripts trimmed.** Story AC listed four scripts (`start`/`dev`/`type-check`/`inspect`). `dev` dropped — MCP stdio protocol doesn't support `--watch` (host spawns a fresh process per session); runtime testing happens by restarting Claude Code, not by file-watch reload.
6. **`.env` policy revised.** Original NFR-S1 required `.env` gitignored from first commit (flagged as wrong documentation). Corrected policy: `.env` with **placeholder** values is committed at the initial scaffold so the required-variable list lives in the repo; real values are populated locally, and `.env` is re-added to `.gitignore` (+ `git rm --cached .env`) before any commit that would contain real secrets. No `.env.example` still holds — the tracked placeholder `.env` plays that role. PRD NFR-S1/S4, epics.md, and architecture.md updated accordingly.
7. **pnpm version pin simplified.** Dropped sha512 integrity hash from `packageManager` field — `pnpm@10.33.0` alone is sufficient. Hash is optional; visual noise not worth it.

## File List

**Modified:**
- `package.json` — augmented per AC
- `.gitignore` — added `.env`

**Created:**
- `tsconfig.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `.env`
- `.claude/.mcp.json`
- `src/index.ts`

**Removed (vs. original AC):**
- No files; stubs in `src/tools/`, `src/config.ts`, `src/client.ts` were never committed.

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Date:** 2026-04-22
- **Key decisions:**
  - Caret-pin all deps except `@azure-devops/mcp@2.6.0` (NFR-C4). pnpm v10 defaults to exact pins — manually corrected.
  - pnpm allow-list key is `allowBuilds` (map form: `'pkg': true`). First attempt with `allowBuilds:` as a list silently no-op'd — pnpm coerced the list into `{'0': …, '1': …}` and the warning persisted. Switched to map form → allow-list activated, warning cleared.
  - pnpm pinned via `corepack use pnpm@latest` → `packageManager: pnpm@10.33.0+sha512-…` in `package.json`.
  - Used `console.error` (not `console.log`) in `src/index.ts` to respect future stdout/JSON-RPC discipline when Story 1.4 introduces the real server.

## Verification Run

```
$ pnpm type-check
> tsc --noEmit
(exit 0)

$ pnpm start
[azdo-mcp] scaffold OK — starting
(exit 0)

$ pnpm install
Done. No "Ignored build scripts" warnings.
```
