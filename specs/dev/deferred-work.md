# Deferred Work

Findings from code reviews that are real but not actionable in the current story's scope. Each entry names the review it came from, the issue, and the reason for deferring.

## Deferred from: code review of story-1.2-configuration-loader (2026-04-22)

- **Startup-error stack trace leak.** Node's default uncaught-exception handler prints `/Users/<user>/…` and full stack on any missing-env throw. Fix: top-level `try/catch` in `src/index.ts` → `process.stderr.write('[azdo-mcp] Startup failure: <msg>\n')` → `process.exit(1)`. Owned by Story 1.4 per architecture.md gap-resolution §738 and Story 1.2 Design Decision #4.
- **Placeholder `.env` boots silently.** Literal `<your-org>` / `<your-personal-access-token>` strings are truthy and pass `requireEnv`. Cloning the repo and running `pnpm start` without editing `.env` produces a successful-looking startup that fails opaquely later. Defer reason: NFR-S1 intentionally commits placeholder `.env` for variable discoverability; placeholder-detection is post-MVP hardening.
- **No PAT redaction on `config` object.** `console.log(config)` or any accidental object serialisation leaks the PAT. Defer reason: personal local tool with no shared logs or CI; redaction (custom `inspect` / `toJSON`) is post-MVP.
- **Whitespace in quoted env values preserved.** `AZDO_PAT="  abc  "` survives validation with padding intact, breaks auth silently. Defer reason: input hardening is post-MVP.
- **No `AZDO_ORG_URL` format validation.** Typos, missing scheme, trailing slash pass startup and break downstream as opaque 404/DNS errors. Defer reason: `new URL(value)` probe is post-MVP hardening.
- **Review gate has no mechanical enforcement.** Commit policy lives in `.claude/rules/commit-policy.md`; no pre-commit hook or CI check blocks a commit that skipped review. Defer reason: author-discipline at MVP per scaffold decision; hook/CI is post-MVP.
- **`requireEnv` does not trim before emptiness check.** Couples with whitespace-preservation above. Defer reason: post-MVP.
- **`process.env`-only-in-`config.ts` boundary is unprotected.** Architecture.md:589 mandates the boundary; no ESLint rule or test enforces it — a future story can silently violate. Defer reason: lint/test tooling is post-MVP.
