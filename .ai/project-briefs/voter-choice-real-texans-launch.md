# Project Brief: Voter Choice Real Texans Launch

Status: active
Owner: orchestrator
Branch: launch/production

## Original User Intent

Get Voter Choice to a working state for real Texans to use within a few days. Users should enter their address, see what is on their ballot, talk with AI in plain language, get help weighing tradeoffs according to their own values, then leave with a printable choices sheet and downloadable voter profile for future elections.

## Intent Interpretation

Launch the smallest trustworthy civic accessibility tool, not a political persuasion tool. The first release should make ballot research easier for busy voters without requiring them to already understand offices, policy, news, candidates, or campaign finance.

## Product Principle

Voter Choice is an accessibility tool, not a political campaign tool. It must respect individual voter choice, values, uncertainty, reasoning style, and final decisions. It should surface public information, explain tradeoffs, and help voters reflect. It must not convert, manipulate, shame, or optimize for a political outcome.

## Domain / Business Rules

- The voter owns the final decision.
- AI may recommend only when grounded in the user's stated values and must provide uncertainty and counterarguments.
- The app must distinguish sourced public evidence from interpretation.
- "Worked for voters" must be framed as "patterns that may matter based on your priorities," not as an objective universal score.
- Conversation and voter profile should stay local to the user unless explicitly sent as chat context.
- Polling-place output must be printable/writable because Texas restricts wireless device use in voting stations.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX
- accessibility/responsive
- privacy/data
- security baseline
- API/contracts
- deployment/config
- legal/compliance prompt

User decisions needed:

- none for the MVP scope now

Assumptions:

- Start with Texas and current address-based ballot lookup.
- Use Google Civic for ballot/polling/contest lookup.
- Defer representative voting/donor enrichment until the core journey is reliable.
- Defer Agentic QE until pre-live readiness gate.

## Operational Reproducibility

Setup:

- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`

Configuration:

- `GOOGLE_CIVIC_API_KEY`
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`
- `ANTHROPIC_VOTER_API`

Provider setup:

- Google Civic API for voter info.
- Google Places for address autocomplete.
- Anthropic Claude chat with hosted web search.

Infrastructure/deployment:

- Vercel via `.github/workflows/deploy.yml`.
- Bitwarden Secrets Manager supplies production secrets.

Manual steps:

- none expected for code work; credentials/provider availability may require owner action if missing.

## System Ownership Map

- Ballot/polling/contest lookup: `src/app/api/civic/route.ts`, `src/components/BallotToolClient.tsx`
- AI chat and budget: `src/app/api/chat/route.ts`, `src/components/ChatPanel.tsx`, `src/lib/server/budget.ts`, `src/lib/server/rate-limit.ts`
- Prompt behavior: `docs/BALLOT_PROMPT.md`, `src/lib/generatePrompt.ts`
- Printable/profile outputs: `src/lib/ballot-utils.ts`, `src/components/BallotActions.tsx`, `src/components/ResearchPortfolio.tsx`
- Copy/UI language: `src/lib/translations.ts`, page/components

## Launch Sequence

1. Core journey hardening: address to ballot context to chat to printable/profile output.
2. Safety/framing pass: nonpartisan accessibility posture, no persuasion, source boundaries.
3. Operational pass: environment handling, failure states, deploy verification.
4. Fast enrichment: representative evidence cards using cited APIs after core flow is stable.

## Open Risks

- Google Civic may return no live election data for some Texas addresses.
- AI web search can find weak sources; prompt must require source quality and uncertainty.
- Local races may have sparse public data.
- Recommendations are sensitive; wording must make user agency explicit.
