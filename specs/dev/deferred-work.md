# Deferred Work

Findings from code reviews that are real but not actionable in the current story's scope. Each entry names the review it came from, the issue, and the reason for deferring.

## Deferred from: code review of story-1.2-configuration-loader (2026-04-22)

- **Startup-error stack trace on missing env.** Node's default uncaught-exception handler prints `/Users/<user>/…` and full stack on any throw from `src/config.ts` at module evaluation. Fix would either (a) register `process.on('uncaughtException', …)` via a Node `--import` preload module loaded before `src/index.ts`, or (b) move config validation behind an explicit `loadConfig()` call and wrap in `try/catch`. Story 1.3 explicitly rejected both: (a) adds a preload + one file of infrastructure for an aesthetic dev-time error format, (b) changes Story 1.2's committed module-load-time validation contract and every downstream `config.x` access site. The stack trace's first line is already `Error: <KEY> is required`, which is the actionable signal — the rest is developer-only noise. Revisit if user-facing stderr formatting becomes a requirement.
- **Placeholder `.env` boots silently.** Literal `<your-org>` / `<your-personal-access-token>` strings are truthy and pass `requireEnv`. Cloning the repo and running `pnpm start` without editing `.env` produces a successful-looking startup that fails opaquely later. Defer reason: NFR-S1 intentionally commits placeholder `.env` for variable discoverability; placeholder-detection is post-MVP hardening.
- **No PAT redaction on `config` object.** `console.log(config)` or any accidental object serialisation leaks the PAT. Defer reason: personal local tool with no shared logs or CI; redaction (custom `inspect` / `toJSON`) is post-MVP.
- **Whitespace in quoted env values preserved.** `AZDO_PAT="  abc  "` survives validation with padding intact, breaks auth silently. Defer reason: input hardening is post-MVP.
- **No `AZDO_ORG_URL` format validation.** Typos, missing scheme, trailing slash pass startup and break downstream as opaque 404/DNS errors. Defer reason: `new URL(value)` probe is post-MVP hardening.
- **Review gate has no mechanical enforcement.** Commit policy lives in `.claude/rules/commit-policy.md`; no pre-commit hook or CI check blocks a commit that skipped review. Defer reason: author-discipline at MVP per scaffold decision; hook/CI is post-MVP.
- **`requireEnv` does not trim before emptiness check.** Couples with whitespace-preservation above. Defer reason: post-MVP.
- **`process.env`-only-in-`config.ts` boundary is unprotected.** Architecture.md:589 mandates the boundary; no ESLint rule or test enforces it — a future story can silently violate. Defer reason: lint/test tooling is post-MVP.
