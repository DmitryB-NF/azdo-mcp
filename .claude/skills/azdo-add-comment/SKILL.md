---
name: azdo-add-comment
description: Post a Markdown comment to an Azure DevOps work item — status update, follow-up note, sprint report, or decision record. Use when the user asks to "comment", "post", "add a note", "reply to", or "add a comment on" a ticket / work item / story / bug / feature / epic. Shows a rendered preview the user can iterate on and requires an explicit affirmative verb before posting. Replies with a link that jumps straight to the posted comment.
---

# /azdo-add-comment

Post a single Markdown comment to an AzDO work item. Preview → approve → post → return a deep link so the user can jump straight to the comment they just published.

## Inputs

| Input            | Required | Shape                                                                                                |
|------------------|----------|------------------------------------------------------------------------------------------------------|
| `workItemId`     | yes      | Positive integer. Must identify a real work item in the target project.                              |
| `body`           | yes      | Markdown string. Non-empty after trimming. Max length: AzDO field limit (~32k chars) — refuse above. |
| `project`        | no       | Override of the configured default. Usually resolved from `get_azdo_context`.                        |
| `format`         | no       | `"Markdown"` (default) or `"Html"`. Always send explicitly in the tool call — do not rely on schema default. |

If the user invokes the skill without `workItemId` or `body`, ask for the missing input(s) before drafting. No placeholders, no invented targets.

## Outputs

On success the skill replies in free natural language, tuned to the moment, with **one non-negotiable requirement**: the reply must include a deep link that opens the posted comment directly in the AzDO UI.

Build the link as `${orgUrl}/${project}/_workitems/edit/${workItemId}?focusedCommentId=${commentId}` from `{ orgUrl, project, workItemId, commentId }` — never use the MS tool's response `url`, which is a REST API URL, not a UI link. Embed it as a Markdown hyperlink in the confirmation. How the link is phrased ("posted — jump to it", "done, see [the comment](...)", etc.) is up to the moment; only the link itself is mandatory. No rigid template.

## Preconditions

All tools below are registered on the `azdo` MCP server. Invoke them with the `mcp__azdo__` prefix — `wit_add_work_item_comment` becomes `mcp__azdo__wit_add_work_item_comment`. The bare names in this document are the tool IDs on the server.

If the `mcp__azdo__*` tools are not in your available tool list, the server is not connected. **Follow `.claude/rules/azdo-mcp-connection.md`** — report the disconnected state to the user and stop; no REST fallback.

## Contract

This skill writes to Azure DevOps. It obeys `.claude/rules/mutation-confirmation.md` (preview → edits loop → explicit affirmative verb → mutate) and `.claude/rules/azdo-comment-style.md` (body shape, empty-body refusal, preview-source-not-rendered reminder).

## Call sequence

### 1. Resolve session coordinates

Call `get_azdo_context` **once per invocation** and cache `{ project, team, orgUrl }`. The target ticket's project usually comes from context; if the user named a project in their message, prefer that. If `project` comes back `null` and the user didn't name one, ask before proceeding.

`orgUrl` is always non-empty — required for building the reply links (§ 6).

### 2. Enrich target (recommended)

Call `wit_get_work_items_batch_by_ids({ ids: [workItemId], project })` once. Use the returned title in the preview so the user can verify they are commenting on the right ticket. If the call errors or the ID is missing from the response, report the problem and stop — don't proceed to preview with a bare ID.

If the user explicitly says "skip the lookup" or the target is known from prior context this turn, the enrichment call may be omitted; the preview then uses the bare ID.

### 3. Validate body

Trim the body. If it is empty or whitespace-only, refuse per `azdo-comment-style.md`: ask the user for non-empty text and do not proceed.

### 4. Normalize and preview

First, **clean up the body** as a helpful editor, not as a style-enforcer:

- Fix obvious Markdown typos (unclosed `**bold**`, broken `[link](url)` syntax, mismatched list markers, orphan code-fence lines, inconsistent bullet indentation).
- Collapse accidental extra whitespace; normalise blank-line separation between paragraphs.
- Respect the user's voice — do not rewrite phrasing, trim meaning, or impose the soft recommendations from `.claude/rules/azdo-comment-style.md`. Those are suggestions for the user, not a license for the skill to editorialise.
- If a cleanup changed the body in a way the user might care about (more than whitespace normalisation), note it briefly — e.g. "Fixed an unclosed bold tag near 'blocked on X'."

Then render the preview inline. The preview shows the body **as it will render** (chat UIs render Markdown the same way AzDO does), so the user sees the final look directly:

```
**Comment draft — not yet posted.** Target: [#<workItemId> <title>](<ticketUrl>) · Format: Markdown

---

<normalised body — rendered inline, not in a code fence, so the chat UI formats it the way AzDO will>

---

Post as-is, or what would you like to change?
```

The `ticketUrl` is `${orgUrl}/${project}/_workitems/edit/${workItemId}`. The horizontal rules separate the meta line and the follow-up question from the body so the rendered comment stands out visually. Do NOT wrap the body in a code fence — that would show raw source instead of the rendered version the user wants to review.

If the user asks explicitly to see the raw Markdown source (e.g. "show me the raw source"), render it in a code fence below the rendered preview — both states on demand, not by default.

### 5. Edit loop

If the user proposes edits — body changes, format change, different target — apply them and re-render the full preview. Wait for an explicit affirmative verb from `mutation-confirmation.md` before proceeding: "post", "publish", "ship it", "approved", or equivalent in the user's language. Negated forms ("don't post", "не публикуй") are refusals, not approvals.

### 6. Mutate

Call the tool with explicit format:

```
wit_add_work_item_comment({
  workItemId,
  comment: <body>,
  format: "Markdown",  // or "Html" if the user asked for it
  project              // pass when known; omit if neither env nor user provided one
})
```

Capture the `id` from the response — this is the comment ID.

### 7. Reply with deep links

Construct:

- `ticketUrl`   = `${orgUrl}/${project}/_workitems/edit/${workItemId}`
- `commentUrl`  = `${ticketUrl}?focusedCommentId=${commentId}`

Both URLs are constructed deterministically — don't scrape MS's response `url` field (it's the REST API URL, not a UI link).

Reply with the confirmation line and both links in Markdown, as shown in § Outputs above.

## Errors

- `wit_add_work_item_comment` returns `isError: true` or throws → surface the raw error text verbatim, do not claim success, do not retry automatically. Follow `mutation-confirmation.md` error handling.
- `wit_get_work_items_batch_by_ids` fails during enrichment (§ 2) → report and stop before preview; the mutation never fires.
- User changed target ID mid-edit → re-run § 2 enrichment before re-rendering preview.

## Never

- Never call `wit_add_work_item_comment` without an explicit affirmative verb from the user in *this* invocation.
- Never invent a `workItemId`.
- Never scrape the reply URLs from MS's response — always construct them from `{ orgUrl, project, workItemId, commentId }`.
- Never rely on MS's schema default for `format` — pass it explicitly.
- Never post an empty-after-trim body, regardless of how the user insists.
- Never fall back to REST, `curl`, `fetch`, or any non-MCP path to AzDO.
