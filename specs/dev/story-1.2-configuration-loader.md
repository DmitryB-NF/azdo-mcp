---
epic: 1
story: 1.2
title: Configuration Loader
status: Done
completedAt: 2026-04-22
---

# Story 1.2 — Configuration Loader

**Source:** `specs/planning/epics.md` § Epic 1 § Story 1.2

## Implementation Summary

`src/config.ts` reads environment variables at module load and exports a default `config` object consumed by the rest of the codebase. `AZDO_ORG_URL` and `AZDO_PAT` are required — missing or empty values throw `Error: <KEY> is required`. `AZDO_DEFAULT_PROJECT` and `AZDO_DEFAULT_TEAM` are optional — missing values become `undefined`. `src/index.ts` side-imports `./config` so required-value validation runs at startup. No module outside `src/config.ts` touches `process.env`.

## Acceptance Criteria — Verification

| AC scenario | Status | Notes |
|---|---|---|
| All four env vars present → `config` exports all four fields (URL + PAT as `string`, defaults as `string`) | ✅ | `pnpm start` with placeholder `.env` boots and emits the scaffold marker |
| No secret values logged anywhere | ✅ | Source has no `console.*`, no `process.stderr.write`, and error messages name only the key (never the value) |
| Missing `AZDO_ORG_URL` or `AZDO_PAT` → throws naming the missing variable | ✅ | `node --import tsx src/index.ts` without env → `Error: AZDO_ORG_URL is required`, exit 1 |
| Error message formatted for direct stderr display | ✅ | Single-line `<KEY> is required` — ready for Story 1.4's `process.stderr.write` pattern without reformatting |
| `src/config.ts` is the only source of `process.env` in `src/**` | ✅ | `grep process\.env src/**` → one match (`src/config.ts`) |

## Design Decisions

1. **URL and PAT required; `DEFAULT_PROJECT`/`DEFAULT_TEAM` optional.** AC scenario 2 explicitly names URL and PAT as the missing-scenario keys. The `DEFAULT_*` names imply "optional with fallback at the tool layer". `config.defaultProject` / `defaultTeam` are typed as `string | undefined`; Story 2.3's `list_team_iterations` will either use the default when present or require the caller to pass an explicit `project`/`team` when absent.
2. **Default export over named export.** `export default { … }` for the config object; consumers write `import config from './config'`. Types are inferred from the object literal — no explicit `Config` type alias. Callers who need the type can write `typeof config` locally.
3. **Side-effect import in `src/index.ts`.** `import './config'` rather than `import config from './config'` because Story 1.2 only requires that config validates at startup; consumers of the actual `config` object arrive with `src/client.ts` (Story 1.3). Minimal change to `index.ts` keeps Story 1.4's rewrite clean.
4. **Terse error message.** `throw new Error(\`${key} is required\`)` — no elaborate "Missing required environment variable" phrasing. This path is only reachable when a developer has deliberately deleted a variable from `.env` (placeholders ship pre-populated), so message verbosity is not worth the bytes. Story 1.4's top-level catch still prefixes it with `[azdo-mcp] Startup failure:` per NFR-M4.
5. **Private helper at the bottom.** `requireEnv` is declared after the public `export default`; function-declaration hoisting lets it be referenced inside the object literal above its declaration. Keeps the eye-line reading order "what this module exports" → "how the helpers work".

## File List

**Created:**
- `src/config.ts`

**Modified:**
- `src/index.ts` — added side-effect import of `./config.ts`

## Dev Agent Record

- **Agent:** Amelia (`bmad-agent-dev`)
- **Date:** 2026-04-22
- **Verification:**
  - `pnpm type-check` → exit 0
  - `pnpm start` (placeholder `.env` loaded) → scaffold marker on stderr, exit 0
  - `node --import tsx src/index.ts` with no env → `Error: AZDO_ORG_URL is required`, exit 1
  - `node` with `AZDO_ORG_URL=… AZDO_PAT=…` set, defaults omitted → boots OK (defaults are optional)
  - `grep process\.env src/**` → single match: `src/config.ts`
- **Tests:** None. NFR-M3 marks unit tests as opt-in at MVP; behaviour is fully exercised by the four verification runs above.

### Review Findings

Review run 2026-04-22 across three layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor).

**Patch** (applied):

- [x] [Review][Patch] Import uses `.ts` extension — violates architecture extensionless-imports rule [src/index.ts:1] — fixed: now `import './config'`

**Follow-up refactor** (user-requested, applied in the same cycle):

- [x] Moved private `requireEnv` below the public `export default` for reading order
- [x] Inlined the `value` local — `requireEnv` now checks and throws directly against `process.env[key]`
- [x] Simplified error message to `<KEY> is required` (placeholder `.env` means this path is rarely hit)
- [x] Made `AZDO_DEFAULT_PROJECT` and `AZDO_DEFAULT_TEAM` optional — consumers get `string | undefined`
- [x] Switched to `export default` — types inferred from the object literal, no explicit `Config` alias

**Defer** (real, non-blocking — tracked in `specs/dev/deferred-work.md`):

- [x] [Review][Defer] Startup-error stack trace leaks absolute filesystem paths via Node's default handler [src/index.ts, src/config.ts:4] — deferred to Story 1.4 per Design Decision #4 (top-level try/catch + tagged stderr.write pattern lives there)
- [x] [Review][Defer] Placeholder `.env` values (`<your-org>`, etc.) pass truthy validation and boot silently [src/config.ts:2-6] — deferred; NFR-S1 intentionally allows placeholder `.env` to boot for variable discoverability, hardening is post-MVP
- [x] [Review][Defer] `config.pat` has no redaction — any `console.log(config)` leaks the PAT [src/config.ts:11] — deferred; personal local tool with no shared logs, redaction is post-MVP hardening
- [x] [Review][Defer] Leading/trailing whitespace in quoted env values preserved, breaks auth silently [src/config.ts:2-6] — deferred; input-hardening is post-MVP
- [x] [Review][Defer] No URL validation on `AZDO_ORG_URL` — typos/missing scheme surface as downstream 404 [src/config.ts:10] — deferred; fail-fast URL parse is post-MVP hardening
- [x] [Review][Defer] Review gate in commit-policy.md has no mechanical enforcement (no pre-commit hook / CI) [.claude/rules/commit-policy.md §Mandatory review gate] — deferred; author-discipline-only at MVP, hook/CI is post-MVP
- [x] [Review][Defer] `requireEnv` does not trim whitespace before emptiness check [src/config.ts:8-11] — deferred; see whitespace-in-quoted-values above, post-MVP
- [x] [Review][Defer] `process.env`-only-in-config.ts boundary (architecture.md line 589) has no mechanical enforcement [src/**] — deferred; lint/test tooling is post-MVP

**Dismissed** (noise or false positive — 11 items):
module-top-level throw (feature per fail-fast), `as const` type-shape (adequate), `console.error` at startup (MCP stdio convention), zero unit tests (NFR-M3 opt-in), bundle tree-shaking concern (no bundler per architecture §230), all-four-vars-required (documented Design Decision #1), `#` in PAT truncation (PATs are Base64-only), story file stub perception (review input used bracketed summaries, not the file), bundled-diff (split into two commits at commit-time), spec-widening for defaults (documented decision), placeholder-valid intent (NFR-S1 covers).

**Verdict:** `fix-first` — one patch to apply, then ship.
