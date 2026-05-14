# Work Packet: launch-ballot-chat-print-profile

Status: completed — all 6 acceptance criteria verified: nonpartisan framing (BALLOT_PROMPT.md), citation requirement (CORE GUARDRAILS), missing-ballot fallback (generatePrompt.ts unconfirmed path), printable ballot (ResearchPortfolio), profile download (ProfileDownloadCard), budget fallback copy/paste (HandoffPackage). Tests 991/991, build passes, lint clean (commit 8695423).
Owner: orchestrator
Source: Project brief — Voter Choice Real Texans Launch
Branch: launch/production

## Intent

Make the core voter journey reliable enough for real Texans: enter address, resolve ballot context, chat with AI about the ballot, and leave with a printable choices sheet plus downloadable voter profile.

## Original User Intent

Users should be able to find what's on their ballot, have a conversation that helps them choose without assuming political knowledge, get AI research and tradeoff guidance that respects their values, print choices for the polls, and download a voter profile for future election cycles.

## Intent Interpretation

Harden the existing MVP skeleton rather than adding new civic data integrations first. The product should be usable even when some ballot data is incomplete, and it must preserve user agency.

## Business Logic

Rules:

- Treat the app as a civic accessibility tool, not a persuasion tool.
- Never imply the app knows the voter's best political answer independent of their values.
- Prefer official election data and clearly label missing or incomplete data.
- Printable ballot output is for user-entered/confirmed choices only.
- Voter profile captures user-stated values and reasoning, not inferred ideology presented as fact.

Assumptions:

- Texas launch is the immediate priority.
- Google Civic is the current ballot/polling source.
- Anthropic hosted web search remains the initial research path.

User-confirmed decisions:

- Defer Agentic QE until pre-live readiness.
- Defer broad representative/donor enrichment until the core journey is stable.
- Reframe enrichment as surfacing hard-to-find public information, not judging representatives.

Edge cases:

- Address has no Google Civic election data.
- Address has election data but no contests.
- Chat budget is unavailable.
- AI does not emit exact ballot/profile markers.
- User has no final choice for some races.

Out of scope:

- FEC/Open States/Texas Ethics integrations.
- User accounts or server-side profile storage.
- Objective representative scorecards.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX
- accessibility/responsive
- privacy/data
- API/contracts
- deployment/config
- legal/compliance prompt

User decisions needed:

- none before implementation

Assumptions:

- Keep all saved profile/output artifacts client-side.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- `ANTHROPIC_VOTER_API`
- `GOOGLE_CIVIC_API_KEY`
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

Provider setup:

- no new providers in this packet

Infrastructure/deployment:

- Vercel production workflow remains unchanged unless verification reveals a blocker

Database migrations:

- not applicable

Manual steps:

- none expected

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- browser smoke test when UI behavior changes

Test quality:

- focused component/unit tests for changed behavior

Critical logic trigger:

- privacy, AI behavior, and ballot output correctness

## Scope

Touch:

- `docs/BALLOT_PROMPT.md`
- `src/lib/generatePrompt.ts`
- `src/components/ChatPanel.tsx`
- `src/components/BallotActions.tsx`
- `src/components/ResearchPortfolio.tsx`
- tests for changed prompt/output behavior

Do not touch:

- `main`
- provider credentials
- Vercel workflow unless blocked
- new representative/donor APIs

## Ownership Audit

Concern: core voter research journey and AI output contract
Existing owner: `docs/BALLOT_PROMPT.md` and `src/lib/generatePrompt.ts`
Neighboring owners:

- UI display: `src/components/ChatPanel.tsx`, `src/components/ResearchPortfolio.tsx`
- output parsing/download: `src/lib/ballot-utils.ts`
- civic lookup: `src/app/api/civic/route.ts`

Files/modules/docs inspected:

- `docs/BALLOT_PROMPT.md`
- `src/components/BallotToolClient.tsx`
- `src/components/ChatPanel.tsx`
- `src/components/BallotActions.tsx`
- `src/components/ResearchPortfolio.tsx`
- `src/app/api/civic/route.ts`

Reuse/edit targets:

- update existing prompt and output handling; do not create a second prompt owner

New owner needed: no

Overlap/bloat risks:

- duplicating prompt rules in UI copy
- adding new APIs before core flow is stable

Recommendation:

- harden the current flow and prompt contract first

Execution constraints:

- all AI recommendation language must preserve voter agency

## Acceptance Criteria

- Address lookup leads to a clear research state when Texas election data exists.
- Missing ballot/contest data produces a useful fallback path, not a dead end.
- Initial AI behavior frames the tool as nonpartisan accessibility support.
- AI outputs require citations/source boundaries for claims about candidates, offices, propositions, and voting rules.
- Printable ballot/profile outputs are discoverable and generated from confirmed conversation content.
- Chat budget fallback still gives the user a usable copy/paste prompt.

## Verification

- Unit/component tests for prompt and output behavior.
- Full app lint/test/build.
- Browser smoke evidence for the main flow if local environment permits.

## Evidence Plan

Visual evidence:

- screenshot or browser observation for address/chat/output flow when implemented

Behavior evidence:

- user can proceed from address to research chat and output controls

Business logic evidence:

- prompt contains voter-agency and non-persuasion constraints

Persistence evidence:

- downloadable profile remains client-side

Auth/security evidence:

- no API keys exposed beyond existing public Places key

Commercial readiness evidence:

- privacy and voting-device constraints present

Operational evidence:

- lint/test/build pass

Integration evidence:

- Google Civic and Anthropic paths remain source-bounded

Regression evidence:

- existing tests pass

Proof standard:

- a real Texas voter can understand the flow and leave with useful paper/local artifacts

Non-proof:

- a generic chat response without printable/profile output is insufficient

## Anti-Solutions

- Do not add partisan scoring.
- Do not claim source-backed certainty when data is sparse.
- Do not store voter profiles server-side.
- Do not add broad data integrations before the core journey works.
