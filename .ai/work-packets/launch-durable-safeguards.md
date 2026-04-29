# Work Packet: launch-durable-safeguards

Status: completed
Owner: orchestrator
Source: Residual risk from launch adversarial hardening
Branch: launch/production

## Intent

Make budget, chat rate-limit, and Civic lookup safeguards durable across Vercel cold starts and instances when production Redis-compatible REST storage is configured.

## Original User Intent

Continue executing on the residual launch risk implementation work.

## Intent Interpretation

The remaining risk is not product UX; it is production cost and abuse control. Implement shared counters without adding a new application database or changing the voter journey.

## Business Logic

Rules:

- Production budget and abuse counters should not rely solely on per-process memory.
- Local development must continue to work without external services.
- If the durable store is configured but unavailable, budget/rate gates should fail closed enough to protect spend.

Assumptions:

- Vercel KV or Upstash Redis REST is acceptable because both expose Redis-compatible REST commands through environment variables.
- Actual provider creation/secret values remain owner-controlled.

User-confirmed decisions:

- none during this packet

Edge cases:

- Durable store env vars absent.
- Durable store env vars present but unavailable.
- Serverless cold starts reset process memory.

Out of scope:

- Creating provider resources or secrets outside the repo.
- Replacing Anthropic/provider-level spend limits.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- security baseline
- API/contracts
- deployment/config
- operational reproducibility

User decisions needed:

- Configure `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` before public traffic.

Assumptions:

- Until those env vars exist in production, durable shared limits are code-ready but not active.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- `.env.example` documents required AI/Civic/Places vars and optional durable store vars.
- `README.md` documents production safeguard behavior.

Provider setup:

- Vercel KV or Upstash Redis REST; no provider state changed by this packet.

Infrastructure/deployment:

- `.github/workflows/deploy.yml` passes optional durable store GitHub secrets through to Vercel env vars when present.

Database migrations:

- not applicable

Manual steps:

- Add one durable store provider and configure production secrets.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `bash scripts/ai-preflight.sh`

Test quality:

- focused unit tests for durable budget/rate-limit paths using mocked REST responses

Critical logic trigger:

- pricing/limits and security validation

## Scope

Touch:

- `src/lib/server/durable-store.ts`
- `src/lib/server/budget.ts`
- `src/lib/server/rate-limit.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/civic/route.ts`
- `.env.example`
- `README.md`
- `.github/workflows/deploy.yml`
- focused tests

Do not touch:

- provider credentials
- branch history
- new data integrations

## Ownership Audit

Concern: production shared budget and abuse-control counters.
Existing owner: `src/lib/server/budget.ts` and `src/lib/server/rate-limit.ts`
Neighboring owners:

- Chat API gate: `src/app/api/chat/route.ts`
- Civic API gate: `src/app/api/civic/route.ts`
- Deployment env propagation: `.github/workflows/deploy.yml`
  Files/modules/docs inspected:
- `src/lib/server/budget.ts`
- `src/lib/server/rate-limit.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/civic/route.ts`
- `.github/workflows/deploy.yml`
- `README.md`
  Reuse/edit targets:
- add one shared REST helper and update existing owners
  New owner needed: yes, `src/lib/server/durable-store.ts` owns Redis-compatible REST command access only.
  Overlap/bloat risks:
- hiding production state requirements in code comments only
- falling back to memory in production while claiming durable safety
  Recommendation:
- use durable store when env vars are present, document the env requirement, and keep memory fallback explicit for local development.
  Execution constraints:
- do not add external dependencies
- do not read or expose secrets

## Acceptance Criteria

- Budget status and usage can use a shared Redis-compatible REST store.
- Chat rate limits can use shared counters for message, daily session, and active session limits.
- Civic lookup throttling can use shared counters.
- Local development still works without durable store env vars.
- Production setup documents the durable env vars.
- Tests cover durable-store behavior with mocked REST responses.

## Verification

- Focused budget/rate tests.
- Full lint/test/build/preflight.

## Anti-Solutions

- Do not silently represent in-memory limits as production-safe.
- Do not add provider credentials to the repo.
- Do not add a database dependency when REST commands are enough for this launch gate.
