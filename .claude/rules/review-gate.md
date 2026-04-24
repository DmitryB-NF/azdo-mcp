# Review Gate

No commit may be created without the human's explicit, fresh approval. Before every commit:

1. Present what's about to be committed — the list of staged paths and a one-paragraph summary of intent.
2. Ask the user whether an automated code review is wanted for this commit. If yes, invoke a code-review agent (the BMAD `bmad-code-review` skill, or equivalent) against the staged changes and present the findings — blocking issues, major concerns, suggestions, and a recommendation (ship / fix-first / rework). If no, skip straight to step 3.
3. **Wait for the user's explicit approval in a new message.** "Looks good", "ship it", "approved", "commit", or equivalent affirmative in the language the user is writing in counts; silence does not. The approval MUST be in the user's **most recent message**, sent **after** you presented the staged diff — approvals from earlier in the session, approvals issued for a different commit, or blanket "go ahead with all stories" instructions from the session start do **not** count. When in doubt, re-ask. The cost of a second confirmation round is trivial; the cost of an unwanted commit is a rewrite of history.
4. Only then create the commit. If a review ran and surfaced blocking issues, address them, re-review, and repeat until the user approves.

## Strict: no commit without an explicit order

Committing is a mutation of repository history and requires the same discipline as any other mutation in this project. Before every `git commit`:

1. **Draft and display the exact commit message** — header line plus body paragraph(s), rendered inline in the response so the user reads what would land.
2. **Ask explicitly**: *"Is the commit message OK? Shall I commit?"* Do not assume prior session context implies approval.
3. **Wait for the user's explicit affirmative in their next message** — "commit", "yes commit", "ship it", "approved", "proceed", or an equivalent affirmative in the language the user is writing in. Silence, acknowledgement without a verb ("looks good", "nice"), or approvals issued before the message was shown all do NOT count.
4. Only then run `git commit`.

If the user asks for changes to the message, redraft and re-display — the approval cycle starts over.

### Mechanical guard: no chaining in one turn

To keep step 4 from slipping past the preview, `git commit` MUST run in its own Bash invocation — not chained via `&&` with `git add`, not bundled with other commands in the same tool call that produced the preview. Staging → preview → approval → commit is four clock ticks in this workflow, not one.

This applies to every commit — `feat`, `fix`, `chore`, `docs` alike. Explicit, fresh approval is always required; running an automated review is at the user's discretion per commit.
