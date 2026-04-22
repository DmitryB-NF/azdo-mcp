# AzDo MCP — Connection & Tool-Naming

Every skill and agent that reaches Azure DevOps goes through the `azdo` MCP server registered at `<repo-root>/.mcp.json` — the **project-scoped** config auto-discovered by Claude Code at session start, not the global `~/.claude.json`. This rule pins the naming contract and the recovery path when the server isn't connected.

## The server is local to this repo

`azdo` is **not** a hosted service, and it is **not** wired up through the user's global Claude config. It's a TypeScript process that Claude Code spawns over stdio from **this repository on the user's machine**, per the project-scoped `<repo-root>/.mcp.json` entry (relative paths, `cwd: "./"`). Consequences:

- Claude Code must be launched with **this repo as its workspace**. If it was opened elsewhere — a parent directory, a sibling project, or against `~/.claude/` — `cwd: "./"` won't resolve to the repo, and the server never starts.
- There is no remote fallback and no global-config fallback. Every fix below is a local fix in this repo on the user's machine.

## Naming contract

Tools appear in Claude's tool palette with the prefix `mcp__azdo__`. Bare names in skills and docs are the tool IDs on the server; apply the prefix when invoking. Example: `wit_query_by_wiql` → `mcp__azdo__wit_query_by_wiql`.

## No REST backchannel

If the `mcp__azdo__*` tools are not in the tool list, the server isn't connected. **Do not** fall back to REST calls, `curl`, `fetch`, or any other path to Azure DevOps — that bypasses auth and `.env` discipline (NFR-S1). Report the disconnected state to the user and stop.

## Scope

Applies to every skill under `.claude/skills/azdo-*` and any agent that touches Azure DevOps.
