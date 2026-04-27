# /capture

Purpose: preserve an idea without breaking current flow.

Decision owner: `docs/ai-coding-practices/guardrails/request-routing.md`.
Template: `docs/ai-coding-practices/templates/capture.md`.

## Steps

1. Use this flow only when the user clearly wants an idea saved for later.
2. If immediate vs later is unclear, ask one short question.
3. Create `.ai/inbox/<timestamp>-<slug>.md` from the capture template.
4. Preserve the user's wording with only light cleanup.
5. Reply with one line: `captured: <slug>`.

## Do Not

- Do not auto-capture every interesting idea.
- Do not prioritize, write AC, create a project brief, or edit TRACKER.
