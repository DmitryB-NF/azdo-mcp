# /azdo-sprint-report — report body style

The narrative shape of the report body — pinned structure, voice, anti-patterns, and the don'ts that keep the body usable for stakeholders. Read this before §5 (drafting) of [`workflow.md`](workflow.md), and again during §7 (edit loop) when applying user feedback.

## Structure

Exactly this Markdown, no more, no less:

```markdown
## Achievements of the Last Sprint: <previousName>

<P1 — outcome against the stated sprint goal (or headline achievement when no goal was set)>

<P2 — supporting objective or strongest parallel stream feeding the main goal>

<P3 — wider improvements delivered alongside the main thrust>

## Goals for the Current Sprint: <currentName>

<P1 — primary outcome the team is going after, tied to the stated goal>

<P2 — secondary objective or parallel stream supporting the main goal>

<P3 — wider improvements planned alongside the main thrust>
```

Two sections. Three paragraphs each. No other headings, no sub-headings, no preamble, no sign-off.

## Voice

- **Tone:** professional, neutral, stakeholder-oriented. Written for a product owner or executive reader who will never open a ticket.
- **Form:** continuous prose only. No bullets, no ticket IDs, no ticket titles, no tool names as outcomes.
- **Length:** 2–3 sentences per paragraph, each carrying substance. Every paragraph answers *"why does this matter?"* **and** *"what did we actually do about it?"* — lead with the outcome, then name the concrete themes at a stakeholder level of abstraction.
- **Themes:** 2–3 per section, derived from the fetched tickets. Do not reuse content between paragraphs.
- **Paragraph priority:** P1 carries the goal-aligned outcome; P2 picks up the next-strongest theme (secondary objective or enabler); P3 covers wider improvements framed as *"alongside the main focus, the sprint also advanced …"*. When only one theme remains for P3, write one substantive sentence — do not pad.

## Anti-patterns

- *"This sprint focused on infrastructure, architecture and design."* — generic; surface the real themes.
- Mechanical ticket-list mirroring (*"We closed ticket X. We closed ticket Y."*) — reframe as narrative.
- **Slogan paragraph** — one sentence asserting significance without naming themes (*"Closing the layout-parity gap is the primary aim."*). A paragraph needs outcome *and* substantive themes in 2–3 sentences.
- **Shopping-list paragraph** — ticket counts or titles (*"We closed 14 tickets across the platform refactor and CI updates."*). Reframe as outcome.
- Overly technical detail (*"refactored the Redux reducer to normalise cart state"*) — step one level up for a stakeholder reader.
- Sign-offs (*"Hi team,"*, *"Best,"*) — this is a work-item comment, not an email.

## Skill-specific don'ts

General rules (empty-body refusal, explicit `format` parameter, no REST fallback, no silent retries, no mutation without an explicit verb in *this* invocation) live in the topic rules. Only the narrative-shape constraints belong here:

- Never list ticket IDs or titles in the report body.
- Never use bullet points in the report body.
- Never impose categories that aren't grounded in the fetched tickets.
- Never fabricate achievements, goals, or iterations.
- Never scrape reply URLs from MS's response — always construct them from `{ orgUrl, project, targetWorkItemId, commentId }`.
