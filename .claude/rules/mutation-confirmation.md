# Mutation Confirmation

Any skill that mutates Azure DevOps state — create, update, delete, comment, link, unlink, or any other write — MUST render a preview of the pending change and receive **explicit user approval** before issuing the mutating tool call. This is non-negotiable.

## Pattern

Every mutation skill follows this loop:

1. **Gather inputs.** Read the user's natural-language request. Use read-only MCP tools (`wit_get_work_items_batch_by_ids`, `get_project_context`, etc.) to fill gaps — never invent values, never call a mutating tool to "probe."
2. **Render a preview** of exactly what the mutation will do:
   - **Create** — drafted payload: work-item type, title, description (Markdown preview ok), project, every field value, every proposed link (source + target + type).
   - **Comment** — the exact comment body, the target work-item ID and title, the format (`Markdown` or `Html`).
   - **Update** — before/after pairs for each changed field, target ID, and change reason.
   - **Link / Unlink** — source ID, target ID, link type, both sides' titles where possible.
3. **Wait for user response.** Accept one of:
   - **Explicit approval** — an affirmative verb: "create", "post", "publish", "ship it", "approved", "да", "давай", "создавай", or equivalent in the user's language. The user names the action they want the skill to take.
   - **Edits** — the user proposes changes ("shorten the title", "add tag X", "link as Parent not Related"). Apply the edits, re-render the full preview, and return to step 2. Loop until the user approves.
4. **Only on explicit approval**, issue the mutating tool call.

## What does NOT count as approval

- **Silence.** A user who just stops typing has not approved anything.
- **Acknowledgment without an affirmative verb.** "Looks good.", "nice.", "ok I see the draft." — none of these are instructions to proceed. Ask again.
- **Forward-looking commentary.** "I think it should also mention Y" is an edit request, not an approval. Apply it, re-render, wait.
- **Approvals from earlier in the session for a different mutation.** Each mutation requires its own explicit go.

When in doubt, ask. The cost of a second confirmation round is trivial; the cost of an unwanted ticket, comment, or link is visible to the team and sometimes hard to undo.

## Error handling after a mutation

If the mutating tool call returns `isError: true` or throws:

- Surface the raw error text verbatim.
- Do **not** retry silently.
- Do **not** claim success.
- If the error is recoverable (e.g., transient network), wait for the user to instruct a retry. If the error is semantic (bad field, unknown type, missing permission), present options, do not guess.

## Partial-failure honesty

When a skill issues a sequence of mutating calls (e.g., create then link), and an intermediate step succeeds but a later step fails, the user's reply must include:

- Exactly what landed (IDs, URLs of created resources).
- Exactly what did not land (with the raw error).
- A clear next-step offer (retry, manual cleanup link, or abandon).

Never paper over partial failure.

## Scope

Applies to every skill under `.claude/skills/azdo-*` that issues any write. Read-only skills (e.g. `/azdo-fetch-tickets`) are outside this rule — they need no confirmation step because they cannot change state.

Current mutation skills in scope: `/azdo-create-ticket`, `/azdo-add-comment`, `/azdo-sprint-report` (it publishes a comment). Any new mutation skill added to the repo inherits this rule automatically.
