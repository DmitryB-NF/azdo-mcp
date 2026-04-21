---
title: "Product Brief: AzDo MCP"
status: "complete"
created: "2026-04-21"
updated: "2026-04-21"
inputs:
  - specs/planning/research/technical-azure-devops-mcp-market-scan-research-2026-04-21.md
---

# Product Brief: AzDo MCP

**AzDo MCP is the first MCP+Skills stack for Azure DevOps.** It turns Azure DevOps from a destination into a backend — a place data lives, not a place the developer has to visit.

## Executive Summary

Every sprint, every ticket, every status update drags the developer out of Claude Code and back into a browser tab, where ten thousand clicks happen against a UI no one loves. AzDo MCP eliminates that. A tiny MCP server exposes the Azure DevOps REST surface to Claude; a handful of Claude Skills orchestrate real workflows — sprint reports, ticket fetches, follow-up ticket composition, comment posting. The developer speaks intent; Claude executes.

The architectural bet is deliberate and narrow: **Skills are the UI. MCP is the bus. Primitives are minimal; orchestration lives in markdown**. Five skills. Five primitives. One `.env`. Five hours of focused build. Everything else unfolds as skills — additive, markdown-editable, rebuild-free.

The timing is not accidental. MCP hit 97M monthly SDK downloads in March 2026 and became the default protocol for LLM-agent integration. Claude Code overtook Copilot and Cursor to become the #1 AI coding tool in eight months. Microsoft shipped `@azure-devops/mcp` but explicitly refused to accept compound business logic — leaving a structural gap that no first-party product will fill. Azure DevOps developers watch GitHub users and Linear users use AI agents natively for ticket work, and they have no equivalent. AzDo MCP fills that gap with a tool you can build in one evening and extend for the next year.

## The Problem

Sprint's end: open Azure DevOps. Switch to the board. Filter by iteration. Open twenty tickets one at a time. Read, skim, copy title and priority into a document. Format as markdown. Navigate to the target ticket. Paste. Publish. **Thirty minutes of tab-wrangling for fifteen bullet points**. Every sprint. Every developer. Every time.

Follow-up ticket writing is worse. Read the feature. Read its linked items one by one. Synthesize context. Open the "new work item" dialog. Fill template fields the UI insists on but the REST API doesn't. Click save. Lose focus. Return to code cold.

The alternatives don't help:
- **Microsoft Copilot for Azure Boards** summarizes. It doesn't act. It can't handle dependencies between items or concurrent operations.
- **Linear AI and Atlassian Rovo** are excellent agents — for Linear and Atlassian customers. Azure DevOps users are locked out.
- **Microsoft's official `@azure-devops/mcp`** exposes ~40 raw tools with no business-logic composition layer. Their `CONTRIBUTING.md` explicitly rejects "complex tools that require extensive logic". Good primitives; no product.

The result: Azure DevOps teams are watching GitHub and Linear users live in agentic workflows while they're still alt-tabbing to a browser. That gap is the product.

## The Solution

AzDo MCP is a local Node/TypeScript MCP server plus a library of Claude Skills. It installs in minutes, reads a `.env` file, and gives Claude Code five high-leverage operations over Azure DevOps.

**The MVP skill library:**

1. **`/azdo-fetch-ticket`** — pull a single work item by ID, get title/description/priority/state/comments/links, Claude uses it as context for whatever comes next.
2. **`/azdo-fetch-tickets`** — batch-fetch by iteration, priority, WIQL, or explicit ID list. Twenty tickets in one call; no clicking.
3. **`/azdo-sprint-report`** — generate a markdown report of an iteration's work, sorted by priority, grouped by state, ready to publish.
4. **`/azdo-create-ticket`** — compose and create a new work item from conversational context. The developer describes intent; Claude fills the fields.
5. **`/azdo-add-comment`** — post a comment on any work item in Markdown, directly from chat.

Skills are the only surface the developer touches. They reach through the MCP server to Azure DevOps; the developer never calls a primitive directly. That's the design: **skills as verbs, MCP as plumbing**.

Under the hood, the MCP server deep-imports Microsoft's `@azure-devops/mcp` per-domain tool registrations — inheriting Microsoft's ongoing maintenance, including the non-obvious workarounds for Markdown-formatted comments (REST `api-version=7.2-preview.4`) and wiki page ETag retries — while remaining fully independent of Microsoft's compound-tool refusal. Five primitive tools plus Microsoft's library is the entire surface.

## What Makes This Different

**Skills are the product, primitives are the scaffolding.** Every other Azure DevOps MCP server — Microsoft's included — stops at the primitive layer. AzDo MCP treats primitives as a means and skills as the end. This is the architectural inversion that makes the Claude-as-operational-layer vision realizable.

**Markdown is the compiler.** A new workflow is a new `SKILL.md` file. No TypeScript. No build step. No release cycle. The moment a developer can describe a workflow in prose, it's shippable. This collapses the iteration loop from days to minutes — and it generalizes: the primitives + skills split is a reference pattern for any SaaS → MCP adapter (Jira, ServiceNow, Notion next).

**Built by its user, for its user.** The developer building this is the same developer who lives in Azure DevOps daily, uses Claude Code for work, and knows the AzDO REST API well enough to debug when it breaks. There's no product manager translating user research into specs. Every design decision optimizes for one developer's actual loop. That's the strongest possible validation signal and the best predictor of skill quality — and it's the reason Linear AI feels better than Azure Boards AI.

**Five hours is a filter, not a limit.** A five-hour hard cap forces the primitives-plus-skills architecture (no time to build compound tools), validates the extensibility claim by constraint, and is reproducible by anyone with the same stack. The cap isn't a scope apology — it's architectural discipline.

**Inherit Microsoft's work, avoid Microsoft's limits.** Deep-importing `@azure-devops/mcp` pays for itself in the wiki-write and Markdown-comment REST workarounds alone. Microsoft maintains them; AzDo MCP consumes them. Pin the version, move on. If Microsoft reorganizes `dist/` tomorrow, fall back to direct `azure-devops-node-api` calls — a documented migration path, six-to-twelve hours, borrowing the raw-REST helpers from this codebase.

## Who This Serves

**One developer: the author.** Lives in Azure DevOps. Lives in Claude Code. Uses both daily. Currently alt-tabbing to a browser for every sprint report, every ticket compose, every comment thread. Knows exactly what hurts and exactly what would help.

The code is open-source and public on GitHub because hiding it would be pointless, not because a user base is a goal. If a colleague stumbles on it, clones it, configures `.env`, and runs a skill — great. That's a consequence of the pull model, not a success metric. There's no onboarding funnel, no docs team, no support commitment. The developer who wants this will figure it out; the developer who doesn't, won't.

## Success Criteria

**The binary signal:** over a full sprint, zero browser tabs open to `dev.azure.com` for plumbing work (reports, ticket writes, comment posts, context fetches). If the author opens the AzDO UI manually once, the product failed that sprint.

**Supporting observables:**
- End-of-sprint report cycle drops from ~30 minutes of clicking to a single `/azdo-sprint-report` invocation.
- Ticket composition — "read feature X, propose follow-up, create it" — collapses to one Claude turn instead of a five-minute tab expedition.
- Adding a new skill requires editing one markdown file. No rebuild. No re-release. Proven empirically by the MVP shipping with five skills, not one.

What success does **not** require: GitHub stars, contributors, colleague adoption, community. This is personal productivity shared openly — not a startup and not a community project.

## Scope

**In for MVP (5 hours, hard cap for author build):**
- MCP server `azdo-mcp` in Node 20+/TypeScript, stdio transport, single-process local.
- Five MCP primitives:
  - `get_work_item` — by ID.
  - `list_work_items` — by iteration / priority / WIQL / ID list.
  - `create_work_item` — with full field control.
  - `add_comment` — Markdown format.
  - `list_team_iterations` — for iteration resolution.
- Deep-import of Microsoft's `configureWorkItemTools`, `configureWorkTools`, `configureWikiTools` from `@azure-devops/mcp@2.6.0` (pinned exact) for ecosystem-wide AzDO capabilities under one namespace.
- Five Claude Skills: `/azdo-fetch-ticket`, `/azdo-fetch-tickets`, `/azdo-sprint-report`, `/azdo-create-ticket`, `/azdo-add-comment`.
- `.env` configuration via `dotenv` (`AZDO_ORG_URL`, `AZDO_PAT`, `AZDO_DEFAULT_PROJECT`, `AZDO_DEFAULT_TEAM`). `.env.example` committed, `.env` gitignored.
- PAT scopes documented in README: Work Items (Read & Write), Wiki (Read & Write), Project & Team (Read).
- Public MIT-licensed GitHub repo. README with five-minute setup (after prerequisites: Claude Code, Node 20+, AzDO access, PAT).
- Unit test for `formatReport` pure function only.

**Out of scope:**
- Compound business-logic tools inside the MCP server — everything compound lives in skills.
- Team dashboards, aggregated views, cross-project reporting, manager-facing analytics.
- Pull request review, code context, CI/CD orchestration, pipeline management.
- Sprint-planning automation, capacity management, backlog grooming beyond ticket CRUD.
- OAuth / Entra authentication — PAT-only.
- Hosted / Remote MCP variant — local stdio only.
- Bootstrap scripts, doctor commands, PAT-scope preflight — deferred as known adoption friction, not MVP.
- Tests beyond `formatReport`.
- Skill sharing / registry / versioning infrastructure.
- Multi-org or multi-project runtime switching.

## Risks & Mitigations

- **Microsoft deep-imports are unsupported.** `@azure-devops/mcp`'s `dist/tools/*.js` paths are not part of a public API. **Mitigation:** pin exact version `2.6.0`; upgrades are opt-in. If MS reorganizes `dist/` or changes the `configure*Tools` signatures, fall back to direct `azure-devops-node-api` calls — a known 6–12h migration with the raw-REST helpers already understood.
- **Microsoft Remote MCP (public preview since 2026-03-17) will "over time replace the local server".** No timeline, but this is the industry direction. **Mitigation:** the local + PAT design stays correct for a personal tool today; re-evaluate against Remote if / when Microsoft deprecates local.
- **Host lock-in to Claude Code.** The MCP server works with any MCP host, but Claude Skills are a Claude-specific orchestration layer. **Mitigation:** acceptable — Claude Code is the #1 AI coding tool by adoption, and this is a personal tool targeting one host.
- **PAT security surface.** Long-lived PAT in `.env`; 53% of MCP servers use the same pattern and the first malicious MCP package appeared in late 2025. **Mitigation:** minimum-scope PAT, gitignored `.env`, `.env.example` in the repo, no secret material in `.mcp.json`.
- **stdio stdout pollution.** Any accidental `console.log` breaks JSON-RPC silently. **Mitigation:** log to `console.error` only, documented in the codebase, caught via MCP Inspector on every dev cycle.
- **Claude Skill DX maturity.** Skill authoring is prompt engineering disguised as markdown — failure modes (wrong iteration picked, empty state handling, hallucinated IDs) are real. **Mitigation:** ship five skills at MVP to observe failure patterns early; iterate on prompt quality after Phase 2.

## Vision

Short arc: fifteen minutes saved per sprint, every sprint, starting this week.

Medium arc: the skills library doubles. `/azdo-fetch-ticket` becomes `/azdo-prep-standup`. `/azdo-create-ticket` becomes `/azdo-create-epic-with-children`. The MCP primitives don't change; the skills do. A quarter in, the AzDO workflow is half-automated, and nobody remembers clicking around the web UI.

Long arc: Azure DevOps becomes a backend, not a destination. Planning opens with Claude summarizing velocity, flagging carryover, proposing a draft iteration. Ticket triage happens conversationally. The developer defines business value; Claude handles coordination. The browser tab to `dev.azure.com` becomes a rarity — reserved for the 5% of tasks that genuinely need a UI.

The primitives-plus-skills pattern outlives the product. Jira, ServiceNow, Notion all have the same "raw API vs. workflow language" tension, and the architecture documented here is a direct template for solving it. The real deliverable isn't AzDo MCP itself — it's the proof that a personal tool, built in five hours, can become a new category of infrastructure for anyone working in Claude Code.
