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

One blank line after the header, then a **compact** body built from two things only:

1. **Purpose line (required).** One sentence on the *intent* — what this commit is for, what it unblocks, what bug it fixes. Not a restatement of the diff.
2. **Optional bullet list of non-obvious notes.** Use bullets for multi-change commits where each change carries context the reader would not infer from the diff: a hidden trade-off, a breaking-change hint, the reason a rejected alternative was rejected, a downstream consequence, a subtle invariant. Skip this list entirely if everything is obvious from the diff.

Never restate what the diff already shows. A reader with the diff open does not need "changed X.ts lines 4–12 to call Y instead of Z" — the diff says that. Write only what the diff does not say — intent and non-obvious context.

A small, obvious change ships with a one-line body. A bug fix with a subtle trade-off may earn a purpose line plus two bullets. A bundled refactor rarely earns more than three bullets. If the body is wider than the diff, the body is wrong.

Reserve blank lines for separating **major logical blocks** — typically the purpose line from a follow-up block. Within a bullet list or a tight paragraph, keep items on consecutive lines without blank-line padding.

### Body anti-patterns

- **Diff restatement.** "Change X to Y. Update A to B. Refactor C to D." Everything the reader already gets for free from the diff.
- **Padding.** Three paragraphs on a one-file typo fix; five bullets that all say "updated &lt;file&gt;" without a reason that matters.
- **PR-description prose.** Narrative reading when the diff is self-evident. That belongs in a PR description or a dev-spec, not git history.
- **Exhaustive "what" with no "why".** Listing every hunk by name and never saying why any of it matters.

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
