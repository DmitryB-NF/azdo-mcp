# AzDo Comment Style

Recommendations (not mandates) for shaping comment bodies posted to Azure DevOps work items. Authors have their own voice; the guidance below makes comments easier to scan without flattening style. Two things **are** strict, because they are safety/UX contracts rather than style: empty-body refusal, and the preview-source-not-rendered reminder. Everything else is "prefer when useful".

Composes on top of [`mutation-confirmation.md`](mutation-confirmation.md), which handles preview/approve/edits mechanics. This rule is about content inside the body.

## Strict

- **Never post an empty or whitespace-only body.** After trimming, the body must contain at least one non-whitespace character. If the user's input is empty, ask for non-empty text and do not call `wit_add_work_item_comment`. An empty comment is never a useful record.
- **Preview the body before mutation, rendered as it will appear.** The chat UI renders Markdown the same way AzDO does, so show the body inline (not wrapped in a code fence) — the user sees the final look, not raw source. Raw source is available on explicit request ("show me the source") but is not the default.
- **Fix obvious Markdown mistakes before previewing.** Unclosed `**bold**`, broken `[link](url)` syntax, mismatched list markers, orphan code-fence lines, inconsistent bullet indentation — normalise as an editor would. Do not rewrite phrasing, trim meaning, or impose the soft recommendations below; only fix what would render broken. If the cleanup changed the body in a way the user might care about (more than whitespace normalisation), say so in one line.

## Prefer

Take or leave any of these depending on the comment's intent and your voice:

- **Lead with the signal.** Comments are easier to skim when the first sentence carries the status or outcome (`Shipped — feature is in main.`, `Blocked on X — awaiting Y.`, `Decision: keep behaviour A, drop B.`). Salutations and sign-offs are usually unnecessary — this is a comment thread, not email — though a short greeting is fine when the comment opens a new conversation.
- **A bold anchor for the key verb or status** when it helps scanning (`**Blocked**`, `**Decision:**`, `**Action:**`, `**FYI:**`). One anchor is usually enough; a paragraph peppered with bold loses its emphasis.
- **Short paragraphs.** The AzDO comment panel is narrow, so long paragraphs wrap into unreadable blocks. One idea per paragraph, blank line between, often reads better than a single wall.
- **Bullets for enumerations.** Follow-ups, affected items, decisions made, pending questions — each on its own `- ` bullet. Bullets are for lists; don't use them to add rhythm to prose.
- **Blockquotes for prior context.** When continuing a thread and quoting the ticket description, a previous comment, or a referenced decision, `> ` visually separates quoted material from new content.
- **Inline code and code fences for identifiers.** Field names (``` `System.State` ```, ``` `Microsoft.VSTS.Common.Priority` ```), file paths, shell commands, configuration keys, enumerated values (`"Active"`, `"Closed"`). Inline for a single token; fenced block for multiple lines.

## Ticket references

Bare `#<id>` is the preferred style inside comment bodies — AzDO renders it natively as a work-item mention, which is cleaner than a Markdown hyperlink. Use a full Markdown link `[#<id>](<url>)` only when the reference points at a work item in a different project or organization where the native mention won't resolve. (The Markdown-link-everywhere rule in `/azdo-fetch-tickets` and `/azdo-create-ticket` is about chat-UI output, where the auto-linker would route bare `#<id>` to GitHub — it does not apply inside the comment body, which AzDO itself renders.)

## Format parameter

- Default: `format: "Markdown"` — state this explicitly in the preview so the user knows what they are about to post.
- `format: "Html"` only when the user supplied raw HTML and asked for it; warn in the preview that Markdown features will not apply.
- Avoid relying on the MS schema default — always pass `format` explicitly.

## Scope

Applies to every path that calls `mcp__azdo__wit_add_work_item_comment`:

- direct agent invocation from a user message,
- `/azdo-add-comment` skill,
- `/azdo-sprint-report` publishing its Markdown report,
- any future skill that posts comments.

Read-only paths (`wit_list_work_item_comments`) are outside scope.
