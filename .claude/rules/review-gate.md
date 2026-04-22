# Review Gate

No commit may be created without the human's explicit approval. Before every commit:

1. Present what's about to be committed — the list of staged paths and a one-paragraph summary of intent.
2. Ask the user whether an automated code review is wanted for this commit. If yes, invoke a code-review agent (the BMAD `bmad-code-review` skill, or equivalent) against the staged changes and present the findings — blocking issues, major concerns, suggestions, and a recommendation (ship / fix-first / rework). If no, skip straight to step 3.
3. Wait for the user's explicit approval. "Looks good", "ship it", "approved", or equivalent in any language the user uses counts; silence does not.
4. Only then create the commit. If a review ran and surfaced blocking issues, address them, re-review, and repeat until the user approves.

This applies to every commit — `feat`, `fix`, `chore`, `docs` alike. Explicit approval is always required; running an automated review is at the user's discretion per commit.
