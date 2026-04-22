# AzDo MCP — Agent Instructions

Base instructions for all agents working in this repository (primarily Claude
Code today; multi-agent compatibility is a future goal). All communication
— commit messages, code comments, PR descriptions, chat — must be in
**English**. The file will grow as conventions solidify; right now it defines
only the commit policy.

---

## Commit Policy

Every commit in this repository must follow this format. No exceptions.

### Header

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
    The number is mandatory; bare `Story` is not valid. Triggers the
    trailer-block requirement below.
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

### Body

One blank line after the header, then:

1. **Paragraph 1 (required).** A clean explanation of **why** the change
   was made — the intent and motivation. Never restate what the diff
   shows; the reader already has the diff.
2. **Paragraph 2+ (optional).** Only if the change has non-obvious
   behaviour, dual intent, or consequences that cannot be inferred from
   the code. Omit otherwise.

Write each paragraph as a single unbroken line — no manual line wraps. Modern git tooling (GitHub, `gh`, most terminals) reflows long lines automatically; hard wraps fossilise an arbitrary column width and make prose harder to read and edit.

### Additional rules for `Story <N.M>` commits

A `Story` commit must end with a trailer block:

```
Requirements: <path to requirement source>
Goals covered:
- <acceptance criterion 1>
- <acceptance criterion 2>
- ...
```

- `Requirements` points to the exact file + section where the story and
  its acceptance criteria live (e.g.
  `specs/dev/story-1.1-project-scaffold.md` or
  `specs/planning/epics.md § Story 1.1`). The trailer exists so a reader
  can open the source of truth in one click.
- `Goals covered` lists every acceptance criterion this commit satisfies
  (one bullet each, short phrase — not full AC prose). If the commit only
  partially satisfies the story, list only what it actually covers and
  note remaining work in the body.

### Forbidden

- **No `Co-Authored-By` trailer** from any AI agent or tool. Author is
  the human driving the session.
- **No `--no-verify`** or other hook-skipping flags unless the user
  explicitly authorises it for a specific commit.
- **No bundled unrelated changes.** One logical change per commit. If
  a scaffolding task accidentally uncovered an unrelated bug, fix it in
  a separate commit.
- **No `[skip ci]`, `[chore]`, emoji prefixes, or other non-standard
  header decoration.**

### Examples

```
feat(Story 1.1): scaffold typescript toolchain and mcp host entry

Augment the initial repo with runtime and dev dependencies, canonical tsconfig, .env placeholders, and .claude/.mcp.json so subsequent stories can focus on source code without setup distractions.

Requirements: specs/dev/story-1.1-project-scaffold.md
Goals covered:
- package.json augmented; identity fields preserved
- runtime + dev deps installed; caret-pin policy per NFR-C4
- tsconfig.json with canonical compiler options
- .claude/.mcp.json ready-to-run host entry
- src/index.ts boot verification with stderr marker
- pnpm pinned via packageManager; supply-chain settings added
```

```
chore(env-policy): allow placeholder .env at initial commit

The original "`.env` gitignored from first commit" rule blocked using the repo itself to document required environment variables. Policy now: commit placeholder `.env`, then re-gitignore + `git rm --cached` before any real-secret edit. PRD, epics.md, and architecture.md updated to match.
```

```
fix(pnpm): switch allow-list to map form so build scripts run

The list-form `allowBuilds` silently no-ops — pnpm coerces it to `{'0': ..., '1': ...}` and keeps emitting the "Ignored build scripts" warning. Map form `{pkg: true}` activates the allow-list. Also drops the sha512 integrity hash from `packageManager` — visual noise without meaningful gain for this project.
```
