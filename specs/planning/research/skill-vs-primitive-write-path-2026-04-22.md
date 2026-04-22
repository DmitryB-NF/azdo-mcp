---
title: Skill-vs-Primitive — Write-path Layer Choice for AzDO MCP
date: 2026-04-22
author: Dmitry (with Winston, bmad-agent-architect)
status: final
supersedes: none
informs: specs/planning/epics.md § Epic 3
builds-on: specs/planning/research/skill-vs-primitive-read-path-2026-04-22.md
---

# Skill-vs-Primitive — Write-path Layer Choice for AzDO MCP

## Context

Epic 3's original plan shipped two author-owned write primitives — `create_work_item` (type, title, description, fields, links) and `add_comment` (Markdown format via raw-REST to api-version `7.2-preview.4`) — plus two user-facing skills (`/azdo-create-ticket`, `/azdo-add-comment`) consuming them. The write path was explicitly flagged in the [read-path decision](skill-vs-primitive-read-path-2026-04-22.md) as requiring a separate evaluation, because Markdown-comment support carried a known gap in Microsoft's legacy REST coverage and FR26 was framed as a raw-REST workaround.

Re-evaluating Epic 3 against Microsoft's current MCP tool surface (`@azure-devops/mcp@2.6.0`, bulk-wired via `configureWorkItemTools` in Epic 1) shows the gap has closed: MS ships Markdown-capable write tools natively. The primitives proposed in stories 3.1 and 3.2 add zero marginal capability, so they are abandoned and Epic 3 becomes skill-only — same architectural shape as Epic 2.

## Evidence from MS tool schemas

Schemas loaded directly from the connected `azdo` MCP server (prefix `mcp__azdo__`):

### `wit_add_work_item_comment`

```json
{
  "workItemId": { "type": "number", "minimum": 1 },
  "comment":    { "type": "string" },
  "format":     { "enum": ["Markdown", "Html"], "default": "Markdown" },
  "project":    { "type": "string" }
}
```

The `format` enum is the decisive signal. Markdown comments require `api-version=7.2-preview.4` against the AzDO REST API (per FR26); the fact that MS exposes `format` as a first-class parameter with Markdown as default means MS is already issuing the versioned call internally. Our raw-REST workaround exists to cover a gap that MS has since closed.

### `wit_create_work_item`

```json
{
  "workItemType": "string",
  "fields": [
    { "name": "string", "value": "string", "format": { "enum": ["Html", "Markdown"], "default": "Markdown" } }
  ],
  "project": "string"
}
```

Generic `fields` array with per-field Markdown opt-in covers the full planned surface: `System.Title` (plain), `System.Description` (Markdown), `Microsoft.VSTS.Common.Priority` (number-as-string), `System.Tags`, and any project-specific custom field. Author-level convenience wrapping (top-level `title` / `description` args) would be a stylistic repackaging of the same primitive — zero capability added.

### `wit_work_items_link`

```json
{
  "updates": [
    { "id": 1, "linkToId": 1,
      "type": { "enum": ["parent", "child", "duplicate", "duplicate of",
                         "related", "successor", "predecessor",
                         "tested by", "tests", "affects", "affected by"],
                "default": "related" },
      "comment": "string" }
  ],
  "project": "string"
}
```

Batch linking with a typed enum covers FR9 (`Parent`, `Child`, `Related`, etc.). MS uses friendly lowercase names (`"related"`) rather than the full `System.LinkTypes.Related` URI — a cosmetic mapping the skill can perform.

### Bonus capabilities we get for free

- `wit_update_work_item` — JSON-patch edits to existing items. No FR required it, but it extends the conversational surface naturally.
- `wit_update_work_item_comment` — edit existing comments, also Markdown-capable.
- `wit_list_work_item_comments` — re-fetch comments (useful for confirmation steps in skills).

## Applying the four read-path tests to writes

| Test | Verdict |
|---|---|
| **1. Zero marginal capability** | `wit_create_work_item` + `wit_work_items_link` covers every planned field and link shape. `wit_add_work_item_comment` covers Markdown natively. Author primitives add nothing. |
| **2. Orchestration belongs at the skill layer (FR17)** | A write involving create + link is two MS tool calls. Putting that sequence inside one author tool hides orchestration inside a primitive — same anti-pattern Epic 2 rejected. Skill-layer composition is correct. |
| **3. Cannot reuse MS handlers from server-side code** | Still true. The only production paths are (a) direct `azure-devops-node-api` calls (which is what MS already does) or (b) delegating to MS at the skill layer. We pick (b). |
| **4. The author-layer namespace stays lean** | After Epic 3, author-owned tools remain exactly what Epic 2 ships: `get_project_context` and `list_recent_iterations`. MS tools do all the mutation. |

## The one nuance worth recording: non-atomic create+link

Our original `create_work_item` primitive could have issued a single JSON-patch `PATCH` with both field add-ops and relation add-ops. That is atomic on AzDO's side: if the relation target doesn't exist, the whole create fails, no orphan ticket.

The skill-layer replacement is two calls:

1. `wit_create_work_item` → captures new ID
2. `wit_work_items_link({ updates: [{ id: newId, linkToId: targetId, type: ... }] })`

If the link call fails (e.g., target ID doesn't exist or permission error), the new work item is already created and not linked — a minor consistency drift. Mitigations:

- The skill validates target IDs by reading them with `wit_get_work_items_batch_by_ids` before creating.
- If the link step fails, the skill surfaces the error clearly and offers the user the new-but-unlinked ticket ID for manual cleanup.

This is an acceptable trade-off for MVP. Atomicity would buy maybe one edge case per quarter; the simplicity and inheritance-of-MS-improvements wins are permanent.

## What Epic 3 actually ships

- **No new author primitives.** Author-layer namespace after Epic 3 is unchanged from Epic 2: `get_project_context`, `list_recent_iterations`.
- **`/azdo-create-ticket` skill** — orchestrates optional context fetch (`wit_get_work_items_batch_by_ids` with `expand: "relations"`) → draft → user confirm → `wit_create_work_item` → optional `wit_work_items_link`.
- **`/azdo-add-comment` skill** — one-step wrapper calling `wit_add_work_item_comment({ workItemId, comment, format: "Markdown" })` with conversational parameter gathering.
- **Disconnected-guard clause** (per [`.claude/rules/azdo-mcp-connection.md`](../../../.claude/rules/azdo-mcp-connection.md)) in both skills.

The `src/tools/comments.ts` file planned in Epic 1's scaffold stays empty (or is removed in a follow-up cleanup) — it has no primitives to register.

## Consequences

| Dimension | Before (primitives) | After (skills only) |
|---|---|---|
| Author runtime code in Epic 3 | ~100 lines (create handler + raw-REST comment handler + schemas) | 0 lines of new runtime code |
| Tools in namespace | MS set + 2 author writes | MS set + 0 (same as end of Epic 2) |
| FR26 implementation | Raw-REST `fetch` against `7.2-preview.4` | Inherited from MS's `wit_add_work_item_comment` (which already uses that API version) |
| Create-with-link atomicity | Single PATCH (atomic) | Two calls (non-atomic, with skill-level guards) |
| Maintenance surface | Our raw-REST path + PATCH add-ops builder | SKILL.md files only |
| Coupling to MS tool stability | None for writes (self-implemented) | Direct on `wit_create_work_item`, `wit_work_items_link`, `wit_add_work_item_comment` |

The trade is the same as Epic 2: we take on coupling to MS's tool contracts in exchange for inheriting every future MS improvement (new fields, new link types, performance work) without code changes.

## FR coverage map delta

| FR | Before | After |
|---|---|---|
| FR8 (create work item) | Author `create_work_item` | MS `wit_create_work_item` via `/azdo-create-ticket` skill |
| FR9 (create with typed links) | Author `create_work_item` `links` param | MS `wit_work_items_link` via `/azdo-create-ticket` skill |
| FR10 (post comment) | Author `add_comment` | MS `wit_add_work_item_comment` via `/azdo-add-comment` skill |
| FR11 (Markdown format) | Author `add_comment` `format` param | MS `wit_add_work_item_comment` `format: "Markdown"` |
| FR26 (MD workaround) | Author raw-REST `7.2-preview.4` call | MS `wit_add_work_item_comment` internally (no author code) |

All five FRs remain covered. None regress.

## Downstream documents needing follow-up

- **`specs/planning/epics.md`** — rewrite Epic 3 (this research's primary target).
- **`specs/planning/prd.md`** — FR26 wording ("Microsoft's pre-existing REST workaround … inherited via deep-import") becomes "inherited via MS tool"; NFR-I1 mention of "`7.2-preview.4` (Markdown comments) via deep-imported helpers" becomes "inherited via MS's `wit_add_work_item_comment`" or similar. Non-blocking; update opportunistically.
- **`specs/planning/architecture.md`** — any module-boundary text about `src/tools/comments.ts` holding a raw-REST path needs retirement. Non-blocking; the file itself can stay empty until its removal is formalised.
- **`specs/planning/implementation-readiness-report-2026-04-21.md`** — Epic 3 section needs rewrite; may be simpler to append an addendum rather than edit in place.

## Limits of this decision

Same boundaries as the read-path doc:

- If MS removes or regresses `wit_create_work_item`, `wit_work_items_link`, or `wit_add_work_item_comment`, this decision flips. Re-evaluate self-implementation.
- If a write use case emerges that cannot be expressed through MS's surface (e.g. a specific validation rule or templated field bundle), an author primitive for that specific shape earns its keep. Not a general `create_work_item` wrapper — a narrow one.
- If the non-atomic create-then-link drift causes real bugs in practice (measured, not hypothetical), re-introduce an author primitive that issues a single PATCH. Measure first.

## When to revisit

- MS tool contract changes that break any of the three key tools.
- A write operation that requires fields, links, or behavior MS's tools don't expose.
- Real-world atomicity failure in `/azdo-create-ticket` degrading user trust.
- Multiple skills duplicating identical write orchestration logic (then factor out, probably as a skill-local helper, not a primitive).

## Decision

**Skill-based write path.** Author-owned write primitives abandoned. Epic 3 ships only `/azdo-create-ticket` and `/azdo-add-comment` skills, both composed over Microsoft's inherited write tools.

Supporting artifacts to follow: `.claude/skills/azdo-create-ticket/SKILL.md`, `.claude/skills/azdo-add-comment/SKILL.md`, `specs/dev/story-3.1-*.md` (baseline create), `specs/dev/story-3.2-*.md` (link support), `specs/dev/story-3.3-*.md` (add-comment), `specs/dev/story-3.4-*.md` (MS core-tools bulk-wire). The cross-cutting confirmation contract lives in [`.claude/rules/mutation-confirmation.md`](../../../.claude/rules/mutation-confirmation.md) — referenced by every Epic 3 story.
