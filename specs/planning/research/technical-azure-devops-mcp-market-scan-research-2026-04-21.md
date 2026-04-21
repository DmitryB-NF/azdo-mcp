---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Azure DevOps MCP server — market scan of existing OSS implementations and reuse feasibility for a custom skills layer (sprint reporting, wiki/comment posting)'
research_goals: 'Decide between reusing an existing MCP server (official Microsoft or community) as a backend for custom skills, vs. building a bespoke MCP server on top of an existing in-house Node Azure DevOps API client. Identify coverage, extensibility, auth model, and integration fit.'
user_name: 'Dmitry'
date: '2026-04-21'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-04-21
**Author:** Dmitry
**Research Type:** technical

---

## Research Overview

This research evaluates whether to reuse an existing open-source Azure DevOps MCP server as the backend for a custom sprint-report helper, or build one from scratch on top of the user's existing in-house Node.js client for Azure DevOps (which itself builds on `azure-devops-node-api`).

**Scope:** OSS MCP implementation landscape; API coverage for the sprint-report use case (list iteration → read work-item descriptions/priorities → render markdown → post as comment or wiki page); integration patterns between the user's tool and Microsoft's MCP server; architectural layout of a custom MCP server.

**Key findings.** Microsoft's official `@azure-devops/mcp` server (v2.6.0, MIT, Node/TS, stdio) covers every primitive the sprint-report scenario requires — including wiki create/update and markdown-formatted comments. Community forks are either less complete or explicitly deprecated. The server is not importable as a library via its package.json `main`/`exports`, but its per-domain tool files under `dist/tools/*.js` export composable `configure*Tools(server, tokenProvider, connectionProvider, userAgentProvider)` functions that register tools on a caller-supplied `McpServer`. This enables a pragmatic deep-import approach where the user's own MCP server hosts Microsoft's tools plus custom compound tools in one namespace, with a single PAT-based auth stack, while Claude Skills on the host side orchestrate the business flow.

**Decision.** Build a small MCP server `azdo-mcp` that deep-imports Microsoft's tool domains and adds only the compound business tools needed for sprint-report generation. Orchestration lives in a Claude Skill (`.claude/skills/generate-sprint-report/SKILL.md`), not in the server. Expected effort: 3–5 hours to working demo. See the full Executive Summary and MVP Roadmap in the Research Synthesis section.

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technical Research Scope Confirmation

**Research Topic:** Azure DevOps MCP server — market scan of existing OSS implementations and reuse feasibility for a custom skills layer (sprint reporting, wiki/comment posting)

**Research Goals:** Decide between reusing an existing MCP server (official Microsoft or community) as a backend for custom skills, vs. building a bespoke MCP server on top of an existing in-house Node Azure DevOps API client. Identify coverage, extensibility, auth model, and integration fit.

**Technical Research Scope:**

- Architecture Analysis — design patterns, frameworks, system architecture of existing AzDO MCP servers (transports, tool layout, auth)
- Implementation Approaches — extensibility patterns for adding custom skills without forking, development methodologies
- Technology Stack — Node/TS vs. other runtimes, compatibility with in-house Node AzDO API client
- Integration Patterns — API coverage (Work Items, Wiki, Repos, Pipelines), comments/attachments support required for sprint reports
- Performance Considerations — rate limits, batch operations, maturity/maintenance health, license fit

**Research Methodology:**

- Current web data with rigorous source verification (GitHub, npm, docs.microsoft, release notes)
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comparison matrix of 3–5 leading implementations and a `reuse / fork / build` recommendation

**Scope Confirmed:** 2026-04-21

## Technology Stack Analysis — Azure DevOps MCP Server Market (2026-04-21)

### Landscape Summary

The ecosystem is now **dominated by Microsoft's first-party server** `@azure-devops/mcp` (1.6k stars, MIT, v2.6.0 released 2026-04-18), which shipped **wiki create/update in v2.4.0 (Jan 2026)** and **work-item comment tooling in v2.5.0 (Mar 2026)** — both critical for the sprint-report use case. Microsoft also launched a hosted **Remote MCP Server in public preview on 2026-03-17** using streamable HTTP + Entra ID, with an explicit message that the local server will eventually be archived (no timeline). Community forks that led in 2025 (Tiberriver256, Vortiago, RyanCardin15) have plateaued or been explicitly deprecated in favor of the Microsoft server. A few niche servers remain useful — notably `uright/azure-devops-wiki-mcp` for wiki-only flows.

_Sources: [microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp), [Releases](https://github.com/microsoft/azure-devops-mcp/releases), [Remote MCP Public Preview DevBlog](https://devblogs.microsoft.com/devops/azure-devops-remote-mcp-server-public-preview/), [Vortiago README](https://github.com/Vortiago/mcp-azure-devops)_

### Comparison Matrix

| Name | Repo | Lang | Transport | Auth | Work Items | Wiki | Repos | Pipelines | Extensibility | License | Maintenance | Conf. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **MS Local** (`@azure-devops/mcp`) | [microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp) | TS/Node 20+ | stdio | MS acct / Entra (browser) | Full (query, CRUD, comments incl. update) | **Create + update** | Yes | Yes (+builds, test-plans, adv-sec) | Fork + PR only (no plugin API) | MIT | v2.6.0 (Apr 18 2026); 1.6k★ | High |
| **MS Remote** (preview) | hosted | closed | streamable HTTP | Entra ID only | Same | Same | Same | Same | Not OSS | proprietary | Public preview 2026-03-17 | High |
| Tiberriver256 | [Tiberriver256/mcp-server-azure-devops](https://github.com/Tiberriver256/mcp-server-azure-devops) | TS/Node 16+ | stdio | PAT, DefaultAzureCredential, az CLI | Query/CRUD/link; comments unclear | Read-only | Yes | Yes | Feature modules, fork-based | MIT | v0.1.45 (Feb 2026); 362★ | High |
| RyanCardin15 | [RyanCardin15/AzureDevOps-MCP](https://github.com/RyanCardin15/AzureDevOps-MCP) | TS/JS | HTTP | PAT, NTLM, Basic, Entra | Full incl. comments | **None** | Yes | Partial | Explicit tool registration | MIT | 54★, no tagged releases | Med |
| Vortiago | [Vortiago/mcp-azure-devops](https://github.com/Vortiago/mcp-azure-devops) | Python 3.10+ | n/a | PAT | Query/CRUD/comments | None | Planned | Planned | Feature modules | MIT | **Deprecated** (→ MS server); 79★ | High |
| uright (wiki-only) | [uright/azure-devops-wiki-mcp](https://github.com/uright/azure-devops-wiki-mcp) | TS/Node 18+ | stdio | az CLI or PAT | — | **Create/update/search/tree** | — | — | Handler-based | MIT | v1.0.1 (Jul 2025) | Med |
| jybrd | [npm @jybrd/azure-devops-mcp](https://www.npmjs.com/package/@jybrd/azure-devops-mcp) | TS | stdio | PAT | WIQL + CRUD + comments, iterations | Claimed, unverified | Limited | — | Unclear | — | Active niche | Low-Med |

### Deep Dive — Microsoft `@azure-devops/mcp`

Node 20+/TypeScript stdio server published to npm. Tool domains toggled via `-d` flags: `core, work, work-items, search, test-plans, repositories, wiki, pipelines, advanced-security` ([README](https://github.com/microsoft/azure-devops-mcp/blob/main/README.md)). Auth is **browser-based Microsoft account login on first use** — no explicit PAT flow in docs. `EXAMPLES.md` confirms work-item comments, wiki create, wiki update, iteration listing ([EXAMPLES](https://github.com/microsoft/azure-devops-mcp/blob/main/docs/EXAMPLES.md)).

**Extensibility is the weak spot**: `CONTRIBUTING.md` requires issue → approval → PR, and explicitly states *"We do not plan to introduce complex tools that require extensive logic"* ([CONTRIBUTING](https://github.com/microsoft/azure-devops-mcp/blob/main/CONTRIBUTING.md)). This closes the door on upstreaming sprint-report skills. The Remote variant is closed-source and Entra-only ([DevBlog](https://devblogs.microsoft.com/devops/azure-devops-remote-mcp-server-public-preview/)).

### Deep Dive — Best Community Alternatives

**Tiberriver256/mcp-server-azure-devops** — Most mature OSS alt: 362★, 42 releases, TS, broad tool coverage incl. PR review flows. Supports PAT + DefaultAzureCredential — friendlier to the existing PAT setup. Weaknesses: wiki is read-only; comment tooling not documented. Feature-module layout is easier to fork than Microsoft's.

**RyanCardin15/AzureDevOps-MCP** — Broadest auth matrix (PAT, NTLM, Basic, Entra) — best if on-prem Azure DevOps Server is ever in scope. Explicit tool-registration pattern in `index.ts` is the cleanest extension model of the surveyed OSS projects. Smaller community (54★), no tagged releases, no wiki write.

**uright/azure-devops-wiki-mcp** — Narrow but solid: `wiki_update_page` explicitly creates-or-updates. Useful as a complement alongside MS server, not as a primary.

### Wiki & Comment Posting — Feature Critical for Sprint Reports

| Server | Work-item comment | Wiki create | Wiki update |
|---|---|---|---|
| **MS Local** | Yes (v2.5 + update) | **Yes** (v2.4) | **Yes** (v2.4) |
| **MS Remote** | Yes | Yes | Yes |
| Tiberriver256 | Unclear | No | No |
| RyanCardin15 | Yes | No | No |
| Vortiago | Yes | No | No |
| uright | N/A | Yes | Yes |
| jybrd | Yes | Claimed | Claimed |

**Only the Microsoft servers and `uright` verifiably cover the full wiki-write + comment combo.**

### Technology Adoption Trends

- **Consolidation around MS server** — community forks are slowing / deprecating; MS ships monthly releases.
- **Shift to Remote / HTTP transports** — MS Remote preview signals industry direction away from stdio-only toward streamable HTTP + Entra.
- **Auth: Entra-forward, PAT-legacy** — first-party tooling treats PAT as fallback; OSS forks remain PAT-centric.
- **Node/TS is the default stack** — 5 of 7 surveyed servers are TS; one Python (deprecated); aligns with the user's existing Node client.
- **Business-logic lives outside primitive MCP servers** — MS explicitly refuses complex tools; ecosystem pattern is emerging toward "wrapper MCPs" or host-side skill composition.

### Gaps & Low-Confidence Items

- `@azure-devops/mcp` weekly npm download numbers — npm page returned 403 via fetch.
- `@jybrd/azure-devops-mcp` exact tool list — sourced from aggregator descriptions, not repo.
- Whether MS server exposes raw `query_wiql` as a tool (WIQL used internally but not in EXAMPLES).
- MS local-server deprecation timeline — Microsoft says "no timeline yet".
- Whether host clients (VS Code, Claude Desktop) cleanly handle two MCP servers side-by-side vs. preferring a single aggregator server.

_All claims above cited inline; items flagged "Unclear"/"Claimed"/"Low-Med confidence" require deeper verification in later research steps._

## Deep Dive — Microsoft `@azure-devops/mcp` Source Investigation

Verified against `microsoft/azure-devops-mcp@617729437c2a` (main, 2026-04-21), package v2.6.0.

### How the server actually works

**Strictly MCP protocol over stdio, NOT a REST/HTTP service.** `src/index.ts` constructs an `McpServer` and connects it to `StdioServerTransport()` — JSON-RPC over stdin/stdout to a parent LLM host (Claude Desktop, VS Code, Copilot). No listening sockets, no routes, no auth endpoint for humans. `curl` does not apply. The process authenticates outbound to AzDO (interactive / az CLI / env / PAT) and re-exposes REST calls as MCP tools.

### Tool list relevant to sprint-report use case

**Iterations / work items:**
- `work_list_team_iterations`, `work_list_iterations` — list iterations (returns GUIDs)
- `wit_get_work_items_for_iteration` — `{ project?, team?, iterationId: GUID }`
- `wit_query_by_wiql` — full WIQL, filter by `[System.IterationPath]`
- `wit_get_work_items_batch_by_ids` — batch fetch titles/descriptions/priorities
- `wit_my_work_items`, `wit_get_work_item`

**Comments:**
- `wit_add_work_item_comment` — `{ workItemId, comment, format: "Markdown" | "Html" }`
- `wit_update_work_item_comment`, `wit_list_work_item_comments`

**Wiki:**
- `wiki_create_or_update_page` — single tool for both; markdown content; handles ETag retry on 409 automatically

### Composition / library use — VERDICT

**CLI-only. Not importable as a library.** `package.json` exposes only `"bin": { "mcp-server-azuredevops": "dist/index.js" }` — no `main`, no `exports`, no programmatic entry. Cannot `require('@azure-devops/mcp')`. Three practical patterns for layering custom skills:

1. **Side-by-side in the host** — register MS server + your own MCP server in `mcp.json`; LLM orchestrates across both toolsets.
2. **Wrapper MCP** — your server spawns `npx -y @azure-devops/mcp` as stdio child, proxies tools via `@modelcontextprotocol/sdk` client, adds compound tools.
3. **Skip MS MCP entirely** — build a bespoke MCP server on `azure-devops-node-api` directly (see next section).

Upstream extension is not viable: `CONTRIBUTING.md` explicitly rejects "complex tools that require extensive logic".

---

## Deep Dive — `azure-devops-node-api` (Option C Feasibility)

Verified against latest published source (npm `15.1.2`, repo last push 2026-04-20, not archived).

### Architecture

**Thin typed HTTP/REST wrapper.** Every client method resolves a route via `VsoClient.getVersioningData(...)` then calls `this.rest.get/create/update/replace(...)` from `typed-rest-client`. One method = one REST endpoint. No WS, no long-poll, no cache. [SRC: `api/WebApi.ts`, `api/WorkItemTrackingApi.ts`]

### PAT auth mechanics

`azdev.getPersonalAccessTokenHandler(token)` → sets `Authorization: Basic base64("PAT:"+token)`. AzDO accepts any non-empty username. `allowCrossOriginAuthentication` flag needed if hitting `vssps.dev.azure.com` after org host. [SRC: `microsoft/typed-rest-client/lib/handlers/personalaccesstoken.ts`]

### Coverage for sprint-report loop

| Capability | Status | Method |
|---|---|---|
| List team iterations | ✅ native | `WorkApi.getTeamIterations(teamContext, timeframe?)` |
| Work items for iteration | ✅ native | `WorkApi.getIterationWorkItems(teamContext, iterationGuid)` — IDs + relations only |
| Batch get work items | ✅ native | `WorkItemTrackingApi.getWorkItemsBatch({ ids, fields, $expand })` — cap 200 IDs |
| WIQL | ✅ native | `WorkItemTrackingApi.queryByWiql(wiql, teamContext?)` |
| Add work item comment (HTML) | ✅ native | `WorkItemTrackingApi.addComment(request, project, workItemId)` — POST `7.1-preview.3`, **HTML-only** |
| **Add work item comment (Markdown)** | ⚠️ **raw REST** | Must call `connection.rest.create(...)` against `/comments?format=0&api-version=7.2-preview.4`. SDK's `addComment` is pinned to `7.1-preview.3`, which predates the Markdown format parameter. This is exactly what the MS MCP server does internally via `fetch()`. |
| **Wiki page create/update** | ❌ **MISSING** | no `createOrUpdatePage` method in `WikiApi.ts`. Types (`WikiPageCreateOrUpdateParameters`) exist but no consumer. Issues [#416](https://github.com/microsoft/azure-devops-node-api/issues/416), #431 open for years. |

### Required raw-REST helpers (two thin wrappers)

Both needed because the SDK version lags behind the REST API. MS MCP does exactly the same thing internally:

**1. Wiki page create/update** (`connection.rest.replace`):
```ts
const url = `${base}/${project}/_apis/wiki/wikis/${wikiId}/pages` +
            `?path=${encodeURIComponent(pagePath)}&api-version=7.1`;
const headers = etag ? { 'If-Match': etag } : {};
await connection.rest.replace(url, { content: markdown },
  { additionalHeaders: headers });
// On 409, GET the page to grab fresh ETag, retry.
```

**2. Work-item comment in Markdown** (`connection.rest.create`):
```ts
// SDK's addComment is pinned to 7.1-preview.3 (HTML-only).
// Markdown format requires 7.2-preview.4 with format=0.
const url = `${base}/${project}/_apis/wit/workItems/${id}/comments` +
            `?format=0&api-version=7.2-preview.4`;
await connection.rest.create(url, { text: markdown });
```

The MS MCP server's `wit_add_work_item_comment` uses a raw `fetch()` with exactly this pattern and the constant `markdownCommentsApiVersion = "7.2-preview.4"`. [SRC: `src/tools/work-items.ts`, `src/utils.ts`]

### Gotchas for a bespoke MCP on this SDK

- **`iterationId` is a GUID**, not a path (`Project\Sprint 34`) — resolve via `getTeamIterations` first.
- **WIQL + `getIterationWorkItems` return only IDs + relations** — always follow up with `getWorkItemsBatch`.
- **Batch cap: 200 IDs** — chunk large iterations.
- **Description and comment bodies are HTML, not markdown.** `System.Description` comes as rendered HTML. Comments post as `Markdown` or `Html` (enum) — `addComment` request supports format. For reading old descriptions and embedding in a markdown report → use `turndown` or equivalent HTML→MD converter.
- **Rate-limit headers not surfaced** on typed responses (open issue [#661](https://github.com/microsoft/azure-devops-node-api/issues/661)). For retry/backoff, drop to `connection.rest` with custom options, or accept the risk for an internal tool.
- **No built-in retry/backoff.** Pass `allowRetries` / `maxRetries` in `IRequestOptions` if needed.
- **Release cadence:** npm ships regularly (latest `15.1.2`, 2026); GitHub release tags lag (last tagged `6.7` in 2022). Not abandonment — just loose tagging.

### Bottom-line — Option C (build-from-scratch)

For the user's sprint-report scenario — list iterations → list work items → fetch titles/descriptions/priorities → render report → post as work-item comment or wiki page — `azure-devops-node-api` covers **every step natively except wiki page create/update**, which is a ~20-line `connection.rest.replace` helper with ETag handling. Everything else (PAT, WIQL, batch reads, iteration work items, comments) is idiomatic and first-class. **Building a bespoke MCP on top is a reasonable and low-risk path.**

_Sources: [microsoft/azure-devops-node-api](https://github.com/microsoft/azure-devops-node-api), [microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp), repo source files as cited inline._

## Integration Patterns Analysis — Three Options Head-to-Head

### MCP TypeScript SDK — Current State (2026-04-21)

`@modelcontextprotocol/sdk` latest `1.29.0` (npm, 2026-03-30). ~21 releases in last 6 months, **no breaking majors** on v1. Minimal stdio server is ~20 LOC:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';

const server = new McpServer({ name: 'sprint-tools', version: '1.0.0' });
server.registerTool('generate_sprint_report',
  { title: 'Sprint Report', description: '...',
    inputSchema: z.object({ iterationId: z.string().optional() }) },
  async ({ iterationId }) => ({ content: [{ type: 'text', text: report }] })
);
await server.connect(new StdioServerTransport());
```

SDK also exposes `Client` + `StdioClientTransport({command, args})` — for Pattern B (spawning another MCP as child) this is ~8 LOC of glue. [SRC: [typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk), [server.md](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md), [client.md](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md)]

### Host Composition — Side-by-Side Reality

Claude Code, Claude Desktop, VS Code Copilot/Chat all accept multiple entries in `mcpServers` and connect to all on startup. Claude Code has `local` / `project` (`.mcp.json`) / `user` (`~/.claude.json`) scopes. [SRC: [Claude Code MCP docs](https://code.claude.com/docs/en/mcp)]

```json
{ "mcpServers": {
    "azure-devops": { "command": "npx", "args": ["-y", "@azure-devops/mcp", "<org>"] },
    "sprint-tools": { "command": "node", "args": ["./dist/index.js"] }
} }
```

**Context tax:** every registered server's tool schema enters the LLM context. MS server exposes ~40 tools. Teams report **30–40% context bloat at 15+ servers** [SRC: [Prompt Shelf 2026](https://thepromptshelf.dev/blog/claude-code-mcp-setup-guide/)].

### Wrapper Pattern (B) Practicality

MCP wrapping/proxying exists (`mcp-proxy`, `mcp-proxy-server`) but tools focus on transport bridging, not re-expose-with-filter. **Auth gotcha:** `@azure-devops/mcp` default opens a browser on first call. Works under wrapper if stdio/TTY inherited; more reliable with `--authentication azcli` or `ADO_MCP_AUTH_TOKEN` env-PAT. Other costs: lifecycle/restart on child crash, schema re-publish when MS renames tools, elicitation passthrough not first-class in SDK v1. [SRC: [sparfenyuk/mcp-proxy](https://github.com/sparfenyuk/mcp-proxy), [MS GETTINGSTARTED](https://github.com/microsoft/azure-devops-mcp/blob/main/docs/GETTINGSTARTED.md)]

### Effort & Fit Comparison (end-to-end demo: read iteration → render markdown → post as comment or wiki)

| Criterion | A. Side-by-side | B. Wrapper | C. Bespoke |
|---|---|---|---|
| **Hours to demo** | **2–5h** | 8–16h | 6–12h |
| LOC to author | ~50 (1 compound tool) | ~200 (proxy + 2 compound tools) | ~300 (5–6 tools on existing node client) |
| Auth setup | Two stacks: MS (interactive/azcli) + yours (PAT) | One, re-invented (pick MS auth) | One, existing PAT |
| MS release coupling | Absorbed automatically | Dispatch tables break on tool renames | Zero |
| LLM context cost | MS ~40 tools + yours | Curated (only yours) | Curated (only yours) |
| Determinism | LLM orchestrates (stochastic) | Your code orchestrates | Your code orchestrates |
| Ad-hoc exploration | ✅ free via MS tools | Only proxied | Only what you built |
| Operational risk | `npx -y` cold-start, stdout pollution, MS deprecation timeline | Highest (compound of above + wrapper bugs) | Lowest |

All effort figures `[ESTIMATE]` — proficient Node/TS dev, existing in-house AzDO client.

### Pattern Selection Logic

**A wins when:** priority is time-to-result, you want ad-hoc exploration for free, stochastic orchestration is acceptable for the target task.

**C wins when:** you need deterministic repeatability ("same sprint report every time"), single auth surface, minimal LLM context cost, independence from MS release cadence.

**B rarely wins** for this use case — combines A's MS-coupling with C's boilerplate cost. Justified only if curating a shared tool surface across multiple hosts.

### Hybrid Migration Path (A → C)

Pragmatic default for "start fast, evolve with real pain":

1. **Hour 2–3:** Stand up custom MCP with one compound tool (`generate_sprint_report`). Register alongside MS server in `mcp.json`. Working demo.
2. **Pain hits:** When specific problems appear (context bloat, LLM picks wrong iteration, auth friction), **migrate individual operations into your MCP**. Disable matching MS tool groups via `-d` flags.
3. **Long term:** MS server progressively dropped; only your MCP remains.

**Advantage:** working result in hours, design evolves on observed pain, not hypotheses. Your compound tool + in-house node client carry over unchanged between A and C.

### Recommendation (preliminary, pre-synthesis)

Given stated priority (min effort, fast result):

**Start with Pattern A. Migrate to C incrementally only when specific friction emerges.**

Pure C makes sense only if user already knows ≥5 skills are coming and stochastic LLM orchestration is a hard non-starter for any of them.

_Sources above cited inline; effort figures are calibrated estimates, not measurements._

## Option 2b — Custom MCP with Deep-Imported MS Tools (new variant)

After verifying the export shape of `@azure-devops/mcp/dist/tools/*.js`, a fourth pragmatic option emerged that outperforms all prior patterns for a personal/throwaway tool.

### Mechanism

MS MCP's per-domain tool files export `configure*Tools(server, tokenProvider, connectionProvider, userAgentProvider)` functions that register tools on a caller-supplied `McpServer` instance with dependency-injected auth providers. The tools are deliberately composable. [SRC: [src/tools/wiki.ts](https://github.com/microsoft/azure-devops-mcp/blob/main/src/tools/wiki.ts)]

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import { z } from 'zod';

import { configureWorkItemTools } from '@azure-devops/mcp/dist/tools/work-items.js';
import { configureWikiTools } from '@azure-devops/mcp/dist/tools/wiki.js';
import { configureWorkTools } from '@azure-devops/mcp/dist/tools/work.js';

const PAT = process.env.AZDO_PAT!;
const connection = new WebApi('https://dev.azure.com/<org>',
                              getPersonalAccessTokenHandler(PAT));
const tokenProvider = async () => PAT;
const connectionProvider = async () => connection;
const userAgentProvider = () => 'sprint-helper/1.0';

const server = new McpServer({ name: 'sprint-helper', version: '1.0.0' });

configureWorkItemTools(server, tokenProvider, connectionProvider, userAgentProvider);
configureWikiTools   (server, tokenProvider, connectionProvider, userAgentProvider);
configureWorkTools   (server, tokenProvider, connectionProvider, userAgentProvider);

server.registerTool('generate_sprint_report', { /* ... */ },
  async ({ iterationId, postTo }) => { /* compound business logic */ });

await server.connect(new StdioServerTransport());
```

### Pros
- Single MCP server in `mcp.json` (no context bloat from two servers).
- Curated domain selection — include only work-items/wiki/work, drop test-plans/advanced-security/pipelines.
- Custom compound tools live alongside MS primitives in one namespace.
- Single auth stack via PAT through `getPersonalAccessTokenHandler` + injected `connectionProvider` — no interactive OAuth.
- MS's `api-version=7.2-preview.4` markdown-comment fix and wiki ETag handling come for free.
- Zero copy-pasted code, no MIT attribution burden.

### Cons & Mitigations
- **Deep import from `dist/` is unsupported.** `package.json` has no `exports` field — MS can reorganize `dist/` or change function signatures in any release. **Mitigation:** pin MS version exactly (`"@azure-devops/mcp": "2.6.0"`, no caret). Acceptable for a personal tool.
- **No TypeScript types on deep imports.** Import `.js` files from `dist/`; either enable `allowJs`/`noImplicitAny: false` or hand-write `.d.ts`. For a throwaway tool, `any` is fine.
- **Bloated install** — MS MCP pulls `@azure/identity`, `@azure/msal-node`, `azure-devops-extension-*` (~20 MB). Not critical for a local helper.
- **Domain-level granularity only** — `configureWorkItemTools` registers all 23 `wit_*` tools at once; no per-tool opt-out inside a domain.

### Effort

**3–5 hours to working demo.** Matches Pattern 1 speed, beats all other options on architecture quality for this use case.

### Updated Ranking (user priority: minimum effort, throwaway personal tool)

| Rank | Option | Hours | Pros | Cons |
|---|---|---|---|---|
| 🥇 | **2b. Custom MCP + deep-import MS tools** | **3–5** | One server, one auth, reuses MS code, compound tools in one namespace | Pinned version, no types, heavy install |
| 🥈 | 1. MS MCP as-is (side-by-side) | 2–5 | Least code | Context bloat, dual auth, stochastic |
| 🥉 | 2. Custom MCP on SDK | 6–12 | Clean, independent | Rewrites MS's existing wrappers |
|  | 3. Custom MCP on raw REST | 10–20 | Zero deps | Lots of boilerplate for no gain |
|  | B. Wrapper MCP | 8–16 | — | Worst of both worlds |

**Option 2b is the pragmatic winner for the user's stated priority** (personal productivity helper, not a product).

## Architectural Patterns and Design — Option 2b Blueprint

Architecture of the custom MCP server that deep-imports MS tools and layers compound skills on top.

### Layer Separation (corrected)

Two layers, clearly separated — not collapsed into compound MCP tools:

- **MCP Tools** — low-level capabilities registered on the server (`list_team_iterations`, `post_comment_markdown`, `upsert_wiki_page`). Named under user's control.
- **Claude Skills** — orchestration layer in `.claude/skills/<name>/SKILL.md` on the host side. Skills invoke MCP tools sequentially. Sprint-report is a Skill, not a tool.

This moves determinism to markdown instructions (edit, no rebuild) and keeps the MCP server surface minimal and reusable.

### Recommended Option: 2b (deep-import MS tools) — final choice

After reconsideration: for a throwaway personal tool, Option 2b is the right answer. Namespace pollution from 40 MS tools is a minor cost; reimplementing them in Option 2 is expensive with no real benefit. Do NOT rewrite what MS already provides.

The clean Skill/Tool layering still holds: MCP tools (mix of MS deep-imported + your own) are primitives; Claude Skills orchestrate. You only write custom tools where compound business logic is needed (sprint report generation).

Internal reuse of MS tool logic from inside your own handlers is done by **calling `azure-devops-node-api` directly** — MS's tools are thin wrappers over the SDK, so calling the SDK method yourself produces the same result without indirection. Reserve handler-trap tricks or copy-paste (MIT) only for the two raw-REST helpers MS added beyond the SDK: markdown comments (api-version 7.2-preview.4) and wiki page write (PUT with ETag retry).

### Project Layout (final)

```
azdo-mcp/
├── .env.example                    # AZDO_PAT=, AZDO_ORG_URL=, AZDO_DEFAULT_PROJECT=
├── .env                            # gitignored
├── package.json                    # pin "@azure-devops/mcp": "2.6.0"
├── tsconfig.json                   # allowJs: true for deep-imports
├── src/
│   ├── index.ts                    # load .env → create server → wire MS + own tools → stdio
│   ├── config.ts                   # parse+validate env, export config
│   ├── connection.ts               # WebApi singleton + providers (token/connection/userAgent)
│   ├── tools/
│   │   └── report.ts               # pure fns + registerReportTools() — compound business logic
│   └── utils/
│       └── format-report.ts        # HTML→MD, markdown template — pure
├── test/
│   ├── report.test.ts
│   └── format-report.test.ts
└── .claude/
    └── skills/
        └── generate-sprint-report/
            └── SKILL.md            # orchestration: calls MCP tools (MS + your own) sequentially
```

MS tools are deep-imported in `index.ts` via `configure*Tools(server, ...)`. No per-domain tool files in `src/tools/` — MS already provides those. Custom `src/tools/report.ts` holds compound logic only (sprint report generation).

### Tool File Pattern — Pure Function + Thin Registration (testability)

Each `src/tools/*.ts` exports two layers: the pure async implementation and the MCP registration wrapper.

```ts
// src/tools/iterations.ts
export async function listTeamIterations(
  conn: WebApi,
  params: { project: string; team: string; timeframe?: 'current' },
) {
  const workApi = await conn.getWorkApi();
  return workApi.getTeamIterations(
    { project: params.project, team: params.team },
    params.timeframe,
  );
}

export function registerIterationTools(server: McpServer) {
  server.registerTool('list_team_iterations', { /* zod schema */ },
    async (input) => {
      const result = await listTeamIterations(await getConnection(), input);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}
```

The pure function is unit-testable by passing a structural mock of `WebApi`. MCP layer in tests is not needed.

### Connection — Single File, Lazy Singleton

```ts
// src/connection.ts
let conn: WebApi | null = null;
export async function getConnection(): Promise<WebApi> {
  if (!conn) conn = new WebApi(config.orgUrl, getPersonalAccessTokenHandler(config.pat));
  return conn;
}
```

No `providers/` folder, no callable abstraction — single WebApi instance, imported where needed.

### Entry Point

```ts
// src/index.ts
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerIterationTools } from './tools/iterations.js';
import { registerWorkItemTools } from './tools/work-items.js';
import { registerCommentTools } from './tools/comments.js';
import { registerWikiTools } from './tools/wiki.js';

const server = new McpServer({ name: 'azdo-mcp', version: '0.1.0' });
registerIterationTools(server);
registerWorkItemTools(server);
registerCommentTools(server);
registerWikiTools(server);
await server.connect(new StdioServerTransport());
```

### Configuration — .env + dotenv (not .mcp.json env)

`.env.example` committed, `.env` gitignored. Loaded by `dotenv/config` at top of `index.ts`. Host `.mcp.json` only points to the built `dist/index.js` — zero secrets in host config.

### Claude Skill (orchestration, not a tool)

```md
<!-- .claude/skills/generate-sprint-report/SKILL.md -->
---
name: generate-sprint-report
description: Generates markdown report of completed iteration tickets and posts to comment or wiki
---

1. Get current iteration: MCP `list_team_iterations({project, team, timeframe: "current"})`
2. Get work item IDs: `list_iteration_work_item_ids({...})`
3. Batch fetch fields: `get_work_items_batch({ids, fields: ["System.Title","System.State","System.Description","Microsoft.VSTS.Common.Priority"]})`
4. Group by state, sort by priority, one-line per item
5. Generate markdown with sections: Done, In Progress, Blocked
6. Ask user where to post: comment on epic N OR wiki page `/Reports/Sprint-<N>`
7. Post via `post_comment_markdown` or `upsert_wiki_page`
```

User runs `/generate-sprint-report`; Claude loads SKILL.md and orchestrates. Template edits = markdown edits, no rebuild.

### Error Handling (lean)

- Startup: missing env → crash with clear message.
- Skills: unwrap AzDO API errors into MCP `{content: [{type: 'text', text: 'Error: ...'}], isError: true}`.
- No retries — internal tool, re-run manually if needed.

### Logging

**Critical rule for stdio MCP:** never `console.log`. Stdout is reserved for JSON-RPC; any stdout write breaks the protocol. Use `console.error` or `winston` pinned to `process.stderr`.

### Testing Strategy — Unit-Testing MCP Tools as Functions

Because each tool file separates a pure async implementation from its MCP registration, tools are unit-testable like any other Node function. The MCP layer is not involved:

```ts
// test/iterations.test.ts
test('listTeamIterations returns iteration names', async () => {
  const mockConn = {
    getWorkApi: async () => ({
      getTeamIterations: async () => [{ id: 'abc', name: 'Sprint 34' }],
    }),
  } as any;
  const result = await listTeamIterations(mockConn, { project: 'P', team: 'T' });
  expect(result[0].name).toBe('Sprint 34');
});
```

**Why it works:** `WebApi` is structurally typed — a mock with the subset of methods the pure function actually calls is enough. No `McpServer`, no stdio transport, no protocol layer in test scope.

**What to test:**
- Pure impls in `src/tools/*.ts` — happy paths, edge cases (empty iteration, API errors unwrapped to MCP error shape).
- `src/utils/format-report.ts` — deterministic, trivial coverage.
- Raw-REST helpers — mock `connection.rest` object.

**What NOT to test:**
- MS MCP's tools (if you deep-import them) — third-party, not your concern.
- MCP protocol transport — covered by SDK.
- Real HTTP calls to AzDO — separate integration layer, not part of CI.

**Interactive exploratory testing:** MCP Inspector is the fastest dev loop. `npm run build && npx @modelcontextprotocol/inspector node dist/index.js` opens a web UI with all registered tools — invoke manually with inputs, see raw results. For a personal tool this covers ~90% of verification without writing unit tests.

### Evolution Path

- **New skill:** `src/skills/new.ts` → one line in `index.ts` → rebuild. No refactoring needed.
- **MS upgrade:** version is pinned, so nothing breaks automatically. When you choose to bump, diff the `src/tools/*.ts` signatures in the MS repo to check if deep-imports still line up, validate via Inspector, merge.

### Deployment Options

- Local: `npm run build` + `.mcp.json` points to `dist/index.js`. Default.
- Team-shared: publish `@your-org/sprint-helper` to private npm, `npm i -g`, run via `command: "sprint-helper"` in `.mcp.json`.
- Container: overkill for personal tool.

### Key Architecture Decisions (ADR-style)

| Decision | Choice | Rationale | Rejected |
|---|---|---|---|
| Integration strategy | Deep-import MS tools + own skills | Min code, max reuse | Fork (maintenance); raw REST (rewrite) |
| Auth | PAT via env | Already works for user, no browser | Interactive OAuth — UX cost for batch tool |
| Runtime | Node 20+/TS | Matches MS MCP, native SDK | Python/Go — no MS dist compatibility |
| Transport | stdio | Default for MCP + host clients | HTTP — unnecessary for local tool |
| Skill granularity | By use-case (generate/post/preview) | Deterministic, easy to iterate | By primitive — MS already has those |
| `@azure-devops/mcp` version | Pinned exact | Deep-import fragile to breaking changes | Caret — accidental break risk |
| Logging | stderr only | stdout reserved for JSON-RPC | stdout — silently breaks server |
| Testing | Pure functions only | Throwaway scope | Full coverage — overkill |

---

# Research Synthesis & MVP Roadmap

## Executive Summary

**Problem framing.** The user has a working Node.js client for Azure DevOps with PAT auth. He wants a quick personal MCP-based helper for end-of-sprint reporting: read an iteration, extract work-item summaries and priorities, render a markdown report, and post it to a specific ticket or a wiki page.

**Market reality.** Microsoft's first-party `@azure-devops/mcp` (v2.6.0, MIT) now covers every primitive this scenario needs — iterations, WIQL, work-item comments (incl. Markdown via api-version `7.2-preview.4`), wiki create/update with ETag handling. Community forks (Tiberriver256, Vortiago, RyanCardin15) are either incomplete or deprecated. There's no need to reimplement primitives.

**Library reality.** The underlying `azure-devops-node-api` SDK (v15.1.2, actively maintained) is a thin typed HTTP wrapper over the REST API. One method = one endpoint. PAT works natively via `getPersonalAccessTokenHandler()`. The only gaps vs. the REST surface: wiki page create/update is missing from the typed SDK (workaround: `connection.rest.replace()`), and the typed `addComment` is pinned to api-version `7.1-preview.3` which is HTML-only (workaround: raw `fetch` to `7.2-preview.4` for Markdown). Microsoft's MCP server already contains both workarounds.

**Integration mechanics.** The Microsoft MCP server is a CLI package — no `main`/`exports` — but per-domain tool files at `dist/tools/*.js` export `configure*Tools(server, tokenProvider, connectionProvider, userAgentProvider)` that register tools on a caller-supplied `McpServer`. This enables a clean deep-import pattern: the user's own MCP server hosts Microsoft's tools plus custom compound tools in a single namespace, with a single PAT-based auth stack.

**Decision.** Use the deep-import approach (Option 2b). Build a small Node/TS MCP server named `azdo-mcp` with:
- Microsoft's tool domains deep-imported via `configure*Tools(server, ...)` for primitives.
- A thin set of custom compound tools for sprint-report business logic (only where Microsoft doesn't provide what's needed).
- Custom tool handlers call `azure-devops-node-api` directly — no reimplementation, no MCP-client-in-MCP.
- Orchestration lives in a Claude Skill under `.claude/skills/generate-sprint-report/SKILL.md`, not in the server.

**Effort estimate.** 3–5 hours to a working demo; 1–2 additional hours to polish the Claude Skill template.

## Rejected Alternatives (why)

- **MS MCP as-is, side-by-side with a separate custom server.** Doubles the auth stack (MS interactive OAuth + yours PAT), bloats LLM context by ~40 unused tool schemas, and leaves the compound business logic to stochastic LLM orchestration. Viable but inferior to deep-import for this scope.
- **Wrapper MCP (your server spawns MS MCP as a child process via `StdioClientTransport`).** Documented path but ~30–50 LOC of glue + child-process startup latency + an extra failure mode — no meaningful gain for a personal tool pinned to a specific MS version.
- **Full rewrite on `azure-devops-node-api` SDK (ignore MS MCP).** Rewrites ~300 LOC of tool wrappers Microsoft already ships; justified only if MS tool set is unacceptable, which it isn't.
- **Full rewrite on raw REST (ignore SDK).** 10–20 hours for no structural benefit; SDK gaps are narrow and already covered by the two same raw-REST helpers Microsoft uses internally.
- **Fork MS MCP.** Overkill; permanent maintenance burden for a throwaway tool.

## MVP Roadmap

### Phase 0 — Scaffolding (30 min)

```bash
mkdir azdo-mcp && cd azdo-mcp
npm init -y
npm i @modelcontextprotocol/sdk azure-devops-node-api dotenv zod
npm i @azure-devops/mcp@2.6.0   # pin exact version
npm i -D typescript @types/node tsx
npx tsc --init
```

Set `tsconfig.json`: `"module": "NodeNext"`, `"target": "ES2022"`, `"allowJs": true`, `"outDir": "dist"`.

Create `.env.example`:
```
AZDO_ORG_URL=https://dev.azure.com/<org>
AZDO_PAT=<pat>
AZDO_DEFAULT_PROJECT=<project>
AZDO_DEFAULT_TEAM=<team>
```

### Phase 1 — Entry point with MS tools (1 h)

- `src/config.ts` — validate env, export config.
- `src/connection.ts` — singleton `WebApi` + provider functions (`tokenProvider`, `connectionProvider`, `userAgentProvider`).
- `src/index.ts` — load `.env`, create server, call `configureWorkItemTools`, `configureWorkTools`, `configureWikiTools`, connect stdio transport.

Verify with MCP Inspector:
```bash
npx tsc && npx @modelcontextprotocol/inspector node dist/index.js
```
List tools, call `work_list_team_iterations` manually — confirm end-to-end auth and data.

### Phase 2 — Claude Skill MVP (30 min)

Write `.claude/skills/generate-sprint-report/SKILL.md` with a 6-step orchestration (get iteration → get item IDs → batch fetch fields → format markdown → confirm target → post). Test via `/generate-sprint-report` in Claude Code — the Skill should compose existing MS tools end-to-end with no custom server code yet.

**Milestone:** working sprint-report flow using only Microsoft's tools and a markdown Skill. If this is good enough for the user's needs, stop here.

### Phase 3 — Optional: custom compound tools (1–2 h)

Only if Phase 2's LLM-driven orchestration is unreliable or too slow. Add `src/tools/report.ts`:
- `sprint_report_markdown({project, team, iterationId?})` — deterministic: resolves current iteration, batch-fetches fields, formats via `src/utils/format-report.ts`.
- Optional: `sprint_report_post({reportMarkdown, target: {kind, id, path}})` — dispatches to MS `wit_add_work_item_comment` or `wiki_create_or_update_page`.

Then simplify the Skill to call these compound tools.

### Phase 4 — Polish (1 h, optional)

- Unit tests for `formatReport()` and any pure helpers.
- README with setup steps and `.mcp.json` snippet.
- `.env.example` committed, `.env` in `.gitignore`.

## Register with Claude Code

Add to project-level `.mcp.json`:

```json
{
  "mcpServers": {
    "azdo-mcp": {
      "command": "node",
      "args": ["./azdo-mcp/dist/index.js"]
    }
  }
}
```

## Risks and Mitigations

- **Deep import from `dist/` is unsupported.** Mitigation: pin `"@azure-devops/mcp": "2.6.0"` exactly (no caret). Upgrades are opt-in, not automatic.
- **No TypeScript types on `dist/*.js` imports.** Mitigation: either `allowJs: true` + `any`, or hand-write a minimal `types.d.ts` covering the four `configure*Tools` signatures.
- **LLM orchestration through the Skill may pick the wrong iteration or skip a field.** Mitigation: Phase 3 compound tools. Decide based on Phase 2 experience, not upfront.
- **MS Remote MCP (preview since 2026-03-17) may eventually replace the local CLI.** No timeline yet; pinned version insulates you. If local is deprecated, re-evaluate against Remote at that point.
- **PAT scope mismatch.** Ensure the PAT has Work Items (Read & Write), Wiki (Read & Write), and Project & Team (Read) scopes.

## Key Research Gaps (low-confidence or unverified)

- Exact env-variable name Microsoft's MCP reads for a PAT bypass in the current version — documentation referenced `ADO_MCP_AUTH_TOKEN` but this should be verified against the CONTRIBUTING/GETTINGSTARTED for the pinned v2.6.0 before wiring up auth.
- Behavior of MS MCP when deep-imported into a process that doesn't pass all four providers — in particular `userAgentProvider` is required per the `configure*Tools` signature but its effect is cosmetic.
- Long-term stability of `dist/tools/*.js` file paths — not part of the public API; may reorganize in any minor release.

## Sources

All sources cited inline throughout the document. Primary references:
- [microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp) (v2.6.0 tag, src/tools/*.ts, CONTRIBUTING.md, docs/EXAMPLES.md, docs/GETTINGSTARTED.md)
- [microsoft/azure-devops-node-api](https://github.com/microsoft/azure-devops-node-api) (api/*.ts)
- [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) (docs/server.md, docs/client.md)
- [Claude Code MCP docs](https://code.claude.com/docs/en/mcp)
- [Microsoft Azure DevOps Remote MCP Server Public Preview DevBlog](https://devblogs.microsoft.com/devops/azure-devops-remote-mcp-server-public-preview/)

## Next Step (outside this research)

Start Phase 0 of the MVP roadmap in a fresh working directory. This research document is the design input; the implementation is scoped for a single focused coding session.

---

**Research Completion Date:** 2026-04-21
**Research Confidence:** High on decision fundamentals; Medium on two specific items (MS PAT env-var name, long-term stability of `dist/` deep-imports) — both mitigated by pinning and small blast radius.







