# Work Packet: launch-adversarial-hardening

Status: completed
Owner: orchestrator
Source: Project brief — Voter Choice Real Texans Launch
Branch: launch/production

## Intent

Fix deploy-blocking failure modes found in adversarial review so the MVP is safer for real Texas voters: privacy claims must match behavior, address entry must degrade reliably, API usage must be harder to abuse, and generated voting artifacts must not use stale context.

## Original User Intent

Proceed with the adversarial review recommendations and keep moving toward a usable real-user launch.

## Intent Interpretation

Prioritize concrete launch hardening over new enrichment APIs. This packet should reduce privacy, cost, reliability, and correctness risk without changing the app's core nonpartisan accessibility posture.

## Business Logic

Rules:

- Voter Choice is an accessibility tool, not a persuasion tool.
- Address, chat, and voter-profile handling must be accurately disclosed.
- The app must not log sensitive voter-entered address/profile/chat data.
- Budget and rate limits are operational safeguards; client-reported state is not authoritative.
- Printable ballot/profile output should represent the latest confirmed AI output.

Assumptions:

- No new external providers or databases are added in this packet.
- Durable distributed rate/budget storage may remain a documented launch risk if it requires provider decisions outside the repo.

User-confirmed decisions:

- Agentic QE remains deferred until pre-live readiness.

Edge cases:

- Google Places fails or is blocked.
- Civic lookup fails after a prior successful lookup.
- Users upload profile text containing instructions.
- Claude emits more than one ballot/profile block.

Out of scope:

- Representative voting-history and donor integrations.
- User accounts or server-side profile storage.
- Full durable production budget store unless an existing repo dependency already supports it.

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

- none for repo-local hardening

Assumptions:

- Privacy page can be corrected to accurate third-party and local-storage disclosures without legal review in this packet; final legal approval remains owner responsibility.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- existing `ANTHROPIC_VOTER_API`
- existing `GOOGLE_CIVIC_API_KEY`
- existing `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

Provider setup:

- no provider state changes

Infrastructure/deployment:

- no deployment workflow changes expected

Database migrations:

- not applicable

Manual steps:

- none

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `bash scripts/ai-preflight.sh`

Test quality:

- focused tests for critical parsing, prompt, API validation, and address behavior where existing test harness supports it

Critical logic trigger:

- privacy/data, security validation, pricing/limits, AI behavior

## Scope

Touch:

- `src/components/ZipForm.tsx`
- `src/components/BallotToolClient.tsx`
- `src/app/api/civic/route.ts`
- `src/app/api/chat/route.ts`
- `src/lib/server/rate-limit.ts`
- `src/lib/ballot-utils.ts`
- `src/app/privacy/page.tsx`
- focused tests for changed behavior

Do not touch:

- `main`
- provider credentials
- Vercel/Bitwarden deployment config unless verification reveals a direct blocker
- new data providers

## Ownership Audit

Concern: launch hardening across privacy disclosures, address lookup, API abuse controls, and ballot output correctness.
Existing owner: project brief ownership map plus existing modules for each concern.
Neighboring owners:

- Civic lookup: `src/app/api/civic/route.ts`, `src/components/BallotToolClient.tsx`
- Chat/budget/rate limiting: `src/app/api/chat/route.ts`, `src/lib/server/budget.ts`, `src/lib/server/rate-limit.ts`
- Address input UX: `src/components/ZipForm.tsx`
- Output parsing/printing: `src/lib/ballot-utils.ts`
- Privacy disclosure: `src/app/privacy/page.tsx`
  Files/modules/docs inspected:
- `src/components/ZipForm.tsx`
- `src/components/BallotToolClient.tsx`
- `src/app/api/civic/route.ts`
- `src/app/api/chat/route.ts`
- `src/lib/server/budget.ts`
- `src/lib/server/rate-limit.ts`
- `src/lib/ballot-utils.ts`
- `src/app/privacy/page.tsx`
- `.ai/project-briefs/voter-choice-real-texans-launch.md`
  Reuse/edit targets:
- update existing owners; do not create parallel privacy, rate-limit, or parsing systems
  New owner needed: no
  Overlap/bloat risks:
- duplicating address validation between client and server without shared intent
- overpromising durable budget enforcement while state remains process-local
- burying privacy disclosures in UI copy while policy remains inaccurate
  Recommendation:
- make minimal code changes that remove sensitive logs, add server-side validation/rate checks, preserve first-party address fallback, and update disclosures.
  Execution constraints:
- do not weaken the nonpartisan prompt posture
- do not add new provider setup or credentials

## Acceptance Criteria

- Address entry remains usable without relying solely on Google Places.
- Client console logging no longer exposes address/place data.
- Civic lookup does not send address in a client-visible query string and has basic abuse controls.
- Chat API rejects malformed/oversized request fields and does not rely solely on client message count.
- Copy/paste fallback profile wrapping includes the same instruction-safety boundary as server chat.
- Printable ballot uses local/system fonts only.
- Privacy page accurately discloses local language storage, third-party API use, chat/profile forwarding, and in-memory rate counters.
- Ballot/profile extraction prefers the latest matching block.

## Verification

- Focused tests for parsing latest blocks, API validation/rate behavior, and profile prompt wrapping.
- Full lint/test/build.
- Preflight after edits.

## Evidence Plan

Visual evidence:

- not required unless UI tests fail; address fallback is covered by component behavior/tests where practical

Behavior evidence:

- tests show latest ballot/profile extraction and fallback prompt safety

Business logic evidence:

- privacy copy and profile wrapping preserve user agency and sensitive-data boundaries

Persistence evidence:

- no new persistence introduced

Auth/security evidence:

- API payload validation and rate checks verified

Commercial readiness evidence:

- privacy/data and security baseline lanes checked

Operational evidence:

- no new provider setup; existing env vars unchanged

Integration evidence:

- Civic and Anthropic paths remain existing providers

Regression evidence:

- lint/test/build pass

Proof standard:

- launch-blocking risks from adversarial review are fixed or explicitly named as residual provider/infrastructure risks.

Non-proof:

- passing build alone is insufficient without validating privacy/API/output behavior.

## Anti-Solutions

- Do not hide Google Places failures by removing address lookup entirely.
- Do not claim durable budget enforcement unless implementation is actually durable across serverless instances.
- Do not add a new database or provider for this packet without a separate owner decision.
- Do not leave sensitive debug logging behind.
