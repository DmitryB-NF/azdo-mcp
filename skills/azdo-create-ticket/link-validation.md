# /azdo-create-ticket — link validation and partial failure

Link-intent extraction, deduplication, conflict detection, the all-or-nothing pre-validation gate, and partial-failure handling for the linking phase. Read this when the user named link targets in their initial message or in an edit (§4 and §6 of [`workflow.md`](workflow.md)).

## Extract link targets

When the user named link targets — "linked as Related to 12345", "parent is 67890 and related to 12345, 13579", "child of 24680" — extract a list of `{ linkToId, type }` pairs.

### Deduplicate before pre-validation

- If the same `linkToId` appears with the same `type`, collapse the duplicate silently.
- If the same `linkToId` appears with **different types** (e.g., "parent 67890 and related to 67890"), this is a conflict — report both to the user and ask which type they meant; do not pre-validate or create anything until the conflict is resolved.

### Valid type values

MS enum, lowercase: `parent`, `child`, `related`, `predecessor`, `successor`, `tests`, `tested by`, `affects`, `affected by`, `duplicate`, `duplicate of`.

Map natural-language labels conservatively. Default to `related` only on genuine ambiguity — never silently upgrade "linked to" into `parent`/`child`.

## Pre-validation gate — all-or-nothing

If the proposed link list is non-empty, call `wit_get_work_items_batch_by_ids({ ids: [<all distinct linkToId>], project })` once before drafting the preview.

If any target ID is missing from the response (not just errors — missing entries too), **list all invalid IDs to the user, ask for correction, and stop**. The ticket is not created when any link target is invalid. Re-run the gate after correction.

Capture each target's title from the response so the preview can render `[#<linkToId>](<url>) <title>` in the Links section.

## Re-run on edit

If the user changes link targets in the edit loop (§6 of [`workflow.md`](workflow.md)) — adds a target, drops one, swaps a type — re-run the pre-validation gate before re-rendering the preview. The rule remains all-or-nothing: any invalid target halts the cycle.

## Partial failure (post-create)

`wit_create_work_item` succeeds → new ID captured → `wit_work_items_link` then returns `isError: true` or throws:

- Reply **must** include:
  - The created ticket ID and its constructed URL.
  - The raw link-error text, verbatim.
  - A clear next-step choice for the user: **retry the full link batch**, **retry a named subset**, or **leave the ticket unlinked**.
- Do **not** retry automatically.
- Do **not** delete the created ticket to "roll back" — the user's approval was for a create, not an undo.
