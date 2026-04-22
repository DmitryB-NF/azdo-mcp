# Commit Policy

Every commit in this repository must follow this format. No exceptions.

## Header

```
<type>(<scope>): <title>
```

- **type** — one of:
  - `feat`   — user-visible new capability
  - `fix`    — bug fix
  - `chore`  — tooling, config, dependencies, scaffolding
  - `docs`   — documentation-only change
- **scope** — a concrete identifier of **what** the commit touches. Pick
  the form that best describes the change; never commit with the literal
  words `Scope` or `Feature` in the parens.
  - **Story reference** — `Story <N.M>` for work implementing a specific
    story from `specs/planning/epics.md` (e.g. `Story 1.1`, `Story 1.2`).
    The number is mandatory; bare `Story` is not valid.
  - **Named scope** — a short tag identifying the area, process, or
    document set affected when the change is not tied to a single story
    (e.g. `env-policy`, `planning`, `tooling`, `NFR-S1`, `release`).
  - **Feature name** — the name of the feature or subsystem being
    changed, when the change is cross-cutting or post-story maintenance
    (e.g. `MCP`, `wit_get_work_item`, `sprint-report`, `add_comment`).

  Prefer kebab-case for multi-word identifiers; underscores or dots are
  acceptable when they match an existing symbol (tool name, FR ID, NFR
  ID, etc.). Never invent a scope when an established one already
  exists — reuse it.
- **title** — imperative mood, ≤72 chars, no trailing period. Describes
  the change, not the file. Lowercase unless a proper noun demands otherwise.

## Body

One blank line after the header, then:

1. **Paragraph 1 (required).** A clean explanation of **why** the change
   was made — the intent and motivation. Never restate what the diff
   shows; the reader already has the diff.
2. **Paragraph 2+ (optional).** Only if the change has non-obvious
   behaviour, dual intent, or consequences that cannot be inferred from
   the code. Omit otherwise.

**Keep the body compact.** Match its length to the size and subtlety of the change. A small, obvious change can ship with a one-sentence body; only genuinely non-obvious context earns additional lines. Three paragraphs for a three-line diff is waste — resist the urge to document what the diff already shows or to pad with structure for its own sake.

Reserve blank lines for separating **major logical blocks** — typically the intent paragraph from a follow-up explanation block. Within a block, start each distinct point on its own line for readability, but **do not** put a blank line between them; sentences that develop the same thought stay together on one line. Meaning-based breaks within a tight block keep the body easy to scan and diff; blank lines only earn their place when the next chunk of prose is clearly a different topic.

See [`review-gate.md`](review-gate.md) for the pre-commit approval workflow that applies to every commit in addition to the rules below.

## Forbidden

- **No `Co-Authored-By` trailer** from any AI agent or tool. Author is
  the human driving the session.
- **No `--no-verify`** or other hook-skipping flags unless the user
  explicitly authorises it for a specific commit.
- **No bundled unrelated changes.** One logical change per commit. If
  a scaffolding task accidentally uncovered an unrelated bug, fix it in
  a separate commit.
- **No `[skip ci]`, `[chore]`, emoji prefixes, or other non-standard
  header decoration.**

## Examples

```
feat(Story 1.1): scaffold typescript toolchain and mcp host entry

Augment the initial repo with runtime and dev dependencies, canonical tsconfig, .env placeholders, and .claude/.mcp.json so subsequent stories can focus on source code without setup distractions.
```

```
chore(env-policy): allow placeholder .env at initial commit

The original "`.env` gitignored from first commit" rule blocked using the repo itself to document required environment variables.
Policy now: commit a placeholder `.env`, then re-gitignore + `git rm --cached` before any real-secret edit.
PRD, epics.md, and architecture.md updated to match.
```

```
fix(pnpm): switch allow-list to map form so build scripts run

The list-form `allowBuilds` silently no-ops — pnpm coerces it to `{'0': ..., '1': ...}` and keeps emitting the "Ignored build scripts" warning. Map form `{pkg: true}` activates the allow-list.
Also drops the sha512 integrity hash from `packageManager` — visual noise without meaningful gain for this project.
```
