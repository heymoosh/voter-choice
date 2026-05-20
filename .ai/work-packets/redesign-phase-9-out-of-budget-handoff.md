# Work Packet: redesign-phase-9-out-of-budget-handoff

Status: ready
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 9 (Out-of-budget handoff reframe)
Branch: launch/production

## Intent

When the monthly community chat budget is exhausted, the user lands on a continuity screen, not an apology. Their ballot is saved client-side, the handoff prompt is ready to copy, four alphabetical chatbot links (Claude, ChatGPT, Gemini, Grok) offer the next chat. Power users can drop in their own Anthropic API key to keep going inside Voter Choice — key stays in localStorage, never reaches the Voter Choice server. The headline is "Your ballot is saved. Keep going on any chatbot," not "We've hit our limit, sorry."

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 9: "When the monthly community budget is exhausted, the user lands on a continuity screen, not an apology. Their ballot is saved, the handoff prompt is ready to copy, four alphabetical chatbot links (Claude, ChatGPT, Gemini, Grok) offer the next chat. Power users can drop in their own Anthropic API key to keep going inside Voter Choice."

And from the design brief §10 ("When the free chat budget runs out"): "A graceful handoff, not a paywall. … The right way to communicate the limit isn't apology, it's continuity: your work is safe, here's the prompt, here are four chatbots that will pick it up."

## Intent Interpretation

The current app likely returns a 500 or generic error when the chat budget is exhausted. The redesign reframes this moment as **continuity**, not failure. The user's ballot, themes, and decisions are saved in localStorage (they were never on the server). The handoff prompt (Phase 1's handoff-generation output) is pre-populated and copyable. Four chatbot deeplinks are listed in alphabetical order — Voter Choice is non-partisan, and so is the AI-provider choice. Claude isn't first-class; alphabetical isn't an SEO move; it's part of the brand.

The BYOK path (bring-your-own-key) is a v1 feature, not v2. Power users who'd otherwise feel walled off can drop in their own Anthropic API key. The key lives in localStorage **only**; never sent to the Voter Choice server. The chat route, when given a BYOK key in the request, swaps to a client-side or proxied path that uses the user's key. The original `BALLOT_PROMPT.md` (kept by Phase 1 as the handoff target) is the prompt the user pastes elsewhere.

Phase 9 depends on Phase 1 (handoff prompt generation, `BALLOT_PROMPT.md` retained as the canonical handoff text). It produces the budget-exhausted UI state and the BYOK plumbing.

## Business Logic

Rules:

- Budget exhaustion is a structured state, not a 500. The chat route returns `{ status: "budget_exhausted", resetAt: ISO, handoffPrompt: string }` instead of throwing.
- The budget-exhausted screen's headline is "Your ballot is saved. Keep going on any chatbot." Never "We've hit our limit" or any apology framing.
- The user's ballot (themes + decisions + remaining races) persists in localStorage. The screen surfaces this fact prominently — nothing was lost.
- The handoff prompt is generated from the current app state via the handoff-generation prompt (Phase 1). The prompt body is exactly the legacy `BALLOT_PROMPT.md` template, populated with the user's specifics, ready to copy.
- Four chatbot deeplinks in alphabetical order: Claude (claude.ai), ChatGPT (chatgpt.com), Gemini (gemini.google.com), Grok (x.com/grok). No preference signaled; alphabetical.
- BYOK path: a small "Have an Anthropic API key? Use it directly in Voter Choice →" affordance. Clicking opens a key-input flow. Key stored in localStorage only. UI copy makes this explicit ("key stays in your browser, never sent to our server").
- BYOK chat path: when the user has supplied a key in localStorage, the chat client uses it directly (client-side fetch to Anthropic) OR routes through a thin server proxy that doesn't log the key. Worker decides; document the choice. The localStorage-only contract is non-negotiable.
- Budget reset time surfaced prominently ("Resets in 13 days · June 1, 12:00 AM UTC").
- A small "tip jar" line invites support without conditioning continued access on it. "Not required" is explicit.

Assumptions:

- `src/lib/server/budget.ts` already exists and tracks budget; this packet adds the structured-state surface and the UI consumer.
- Anthropic API calls with a BYOK key can be made client-side (Anthropic SDK supports browser usage with appropriate CORS / origin handling) OR via a thin server proxy that forwards the user's key without logging it. Worker picks based on infrastructure.

User-confirmed decisions:

- BYOK is v1. Power users hit the limit first; serving them keeps engagement.
- Chatbot deeplinks in alphabetical order, no exceptions.
- The handoff target is the original `BALLOT_PROMPT.md` — Phase 1 retains it specifically for this.

Edge cases:

- Budget exhausted at the cold open (before themes locked): the screen still renders; handoff prompt is sparse but valid.
- Budget exhausted mid-race: handoff includes decided races and remaining races.
- User pastes an invalid BYOK key: client-side validation surfaces "key didn't authenticate — try again" without sending the key to our server. (If using a proxy, the proxy returns 401; client surfaces same message.)
- User has a BYOK key set and our community budget still has room: respect the user's choice — use their key. Document the precedence.
- BYOK rate-limited by the user's own Anthropic account: surface Anthropic's error message verbatim. We don't pretend to manage their account.
- Network failure during handoff prompt generation: fall back to a static handoff template populated client-side from localStorage state.
- Budget resets while the user is on the screen: don't auto-refresh into the chat. User clicks an explicit "I'm back" button.
- Multiple sessions per user (incognito, different browsers): each has its own BYOK localStorage. Document for users.

Out of scope:

- Server-side BYOK key storage. localStorage only.
- A payment / subscription path. The tip jar is a link only.
- Per-user budget enforcement beyond the community budget already in place.
- A "share my handoff with a friend" social feature.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX (the budget-exhausted screen is the most emotionally-charged moment in the app)
- privacy/data (BYOK key in localStorage only — explicit UI copy + technical guarantee)
- API/contracts (chat route returns structured budget-exhausted state)
- security baseline (BYOK key never reaches Voter Choice server; verify via network trace)
- legal/compliance prompt (alphabetical chatbot listing; no preference signal; tip-jar disclosure)
- observability/support (log budget-exhausted events with no PII)

User decisions needed:

- whether to use a thin BYOK proxy or direct browser-to-Anthropic. Worker decides; default to direct if Anthropic SDK supports CORS for the chosen endpoints.

Assumptions:

- The legacy `BALLOT_PROMPT.md` generates a self-contained pasteable prompt when fed with the user's current state.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- `ANTHROPIC_VOTER_API` (community budget key — existing)
- no new env for BYOK (per-user)

Provider setup:

- no new providers

Infrastructure/deployment:

- Vercel manual deploy via `deploy.yml`

Database migrations:

- not applicable

Manual steps:

- After deploy: artificially exhaust the community budget in preview (or stub the budget check); verify the screen renders; verify the handoff prompt copies cleanly; supply a real Anthropic key in BYOK and verify chat continues with the user's key.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — budget-exhausted state happy path; BYOK happy path
- `bash scripts/ai-verify.sh`

Test quality:

- Test that the chat route returns the structured budget-exhausted shape (not 500) when the community budget is gone.
- Test that the BYOK key never appears in any server-side log or response body. Network trace assertion.
- Test that the handoff prompt is generated from the legacy `BALLOT_PROMPT.md` template + current state.
- Test alphabetical order of chatbot links.

Critical logic trigger:

- security (BYOK key handling)
- privacy (key in localStorage only; never to server)
- business rule (alphabetical chatbot order; non-partisan presentation)

## Scope

Touch:

- `src/lib/server/budget.ts` — surface a structured state instead of throwing.
- `src/app/api/chat/route.ts` — return the structured shape; accept a BYOK key in request header and use it instead of the community key when present (or reject the community key path with the structured shape).
- new `src/components/BudgetExhausted.tsx` — owns the screen.
- new `src/lib/anthropic-client-byok.ts` — manages the BYOK key (read/write localStorage; create an Anthropic client with the key).
- `src/lib/server/rate-limit.ts` — coordinate with budget exhaustion; don't double-throw.
- `src/components/HandoffPackage.tsx` (Phase 3 / existing) — the handoff prompt body is consumed here.
- `src/lib/generated/ballotPromptEn.generated.ts` — used as the handoff template; do not delete.
- tests for the chat route's structured response, BYOK key handling, alphabetical link order, no-key-on-server assertion.

Do not touch:

- `main`
- Prompt fleet beyond what Phase 1 already shipped (the handoff prompt is from Phase 1)
- Cold-open UI (Phase 2)
- Workspace shell (Phase 3) beyond wiring the "Continue in another chatbot" button to this screen
- Candidate cards (Phase 4)
- State party gates (Phase 5)
- Theme amendment (Phase 6)
- Printable PDF (Phase 7)
- Polis view (Phase 8)

## Ownership Audit

Concern: budget exhaustion state, BYOK key plumbing, handoff continuity UX
Existing owner: `src/lib/server/budget.ts`, `src/app/api/chat/route.ts`, `src/components/HandoffPackage.tsx`
Neighboring owners:

- rate limiting: `src/lib/server/rate-limit.ts`
- handoff template: `src/lib/generated/ballotPromptEn.generated.ts` (kept by Phase 1)
- workspace handoff button: `src/components/BallotPane.tsx` (Phase 3)

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md` §5 Phase 9
- `docs/design/2026-redesign/Voter Choice Redesign.html` §10
- `docs/design/2026-redesign/Voter Choice Redesign.html` §6 (handoff prompt format)
- `docs/design/2026-redesign/prompts.md` §5 (handoff generation)
- `src/lib/server/budget.ts`
- `src/lib/server/rate-limit.ts`
- `src/app/api/chat/route.ts`
- `src/components/HandoffPackage.tsx`
- `src/lib/generated/ballotPromptEn.generated.ts`

Reuse/edit targets:

- Extend `budget.ts` to surface structured state.
- New `BudgetExhausted.tsx` owns the screen.
- New `anthropic-client-byok.ts` owns the BYOK client.

New owner needed: yes — `BudgetExhausted.tsx` and `anthropic-client-byok.ts` are new.

Overlap/bloat risks:

- Two handoff-prompt rendering paths (Phase 3's "Continue in another chatbot" button and Phase 9's exhaustion screen). Share the prompt-generation function; render twice.
- BYOK key in two places (localStorage + a context provider). Single source of truth: localStorage; context reads from it.
- Server-side budget check + client-side budget guess. Server is canonical; client never trusts its own count.

Recommendation:

- Build the structured response + the screen + the BYOK client. Keep server as canonical for budget. localStorage-only key contract is the line of demarcation for security.

Execution constraints:

- Workers must NOT send the BYOK key to the Voter Choice server in any code path other than (optionally) a passthrough proxy that does not log or persist.
- Workers must NOT reorder the chatbot links from alphabetical.
- Workers must NOT show apology framing on the screen.
- Workers must NOT condition continued access on tipping.
- Workers must NOT log the BYOK key in any analytics or observability surface.

## Acceptance Criteria

- Chat route returns `{ status: "budget_exhausted", resetAt: <ISO>, handoffPrompt: <string> }` when the community budget is gone, instead of a 500.
- The `BudgetExhausted.tsx` screen renders this state. Headline: "Your ballot is saved. Keep going on any chatbot."
- Handoff prompt is generated from the legacy `BALLOT_PROMPT.md` template populated with current themes / decisions / remaining races; copyable via one click.
- Four chatbot deeplinks listed in alphabetical order: Claude, ChatGPT, Gemini, Grok. Verified by snapshot test.
- BYOK affordance: "Have an Anthropic API key? Use it directly in Voter Choice →" surfaces a key-input flow. Key persists in localStorage only.
- With BYOK key set in localStorage, the chat client uses it (direct or proxied path) and bypasses the community budget. Server logs and network traces show no BYOK key leakage to the Voter Choice server (other than optional proxy passthrough without logging).
- UI copy near the BYOK input explicitly states: "key stays in your browser, never sent to our server."
- Budget reset time surfaced prominently with absolute timestamp.
- Tip-jar link present; clearly marked "not required."
- `npm run lint`, `npm run test`, `npm run build` pass.
- `npm run e2e` budget-exhausted happy path passes.

## Verification

- `npm run lint` clean.
- `npm run test` passing — structured-response tests, BYOK key handling tests, alphabetical-order test, no-server-leakage tests.
- `npm run build` successful.
- `npm run e2e` — simulate budget exhaustion; verify screen renders; verify handoff copies; verify BYOK path works with a test key (in CI: mocked).
- `bash scripts/ai-verify.sh` clean.
- Manual smoke: artificially exhaust budget in preview; verify screen; set BYOK key; verify chat continues.

## Evidence Plan

Visual evidence:

- Screenshot of the budget-exhausted screen with the headline, handoff prompt, four chatbot links, BYOK affordance, reset time, tip-jar line.
- Screenshot of the BYOK key-input flow.

Behavior evidence:

- E2E test outputs: budget-exhausted happy path; BYOK happy path.
- Test names: structured-response-not-500, byok-key-never-on-server, alphabetical-chatbot-order, handoff-prompt-from-current-state.

Business logic evidence:

- Rule: "Alphabetical order" — snapshot test of the link order; expected `[Claude, ChatGPT, Gemini, Grok]`, observed match.
- Rule: "BYOK never on server" — network trace assertion during BYOK chat call; expected no `x-byok-key` header in any logged request, observed none.
- Rule: "Handoff from current state" — fixture with known themes/decisions, expected handoff text contains those values, observed match.

Persistence evidence:

- BYOK key survives refresh (localStorage); is cleared on explicit "remove my key" action.

Auth/security evidence:

- The BYOK key is provably localStorage-only. Code review + network trace.
- A `grep` of server logs for the BYOK key pattern returns zero matches.
- An invalid BYOK key surfaces an explicit error without leaking the key value to any error reporting.

Commercial readiness evidence:

- Privacy lane: BYOK key never persisted server-side; UI copy is explicit.
- Legal/compliance lane: alphabetical chatbot order; no preference; tip-jar disclosure.

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` output.

Integration evidence:

- Preview deploy URL + screenshot of the screen rendered from an artificially-exhausted budget.
- Test BYOK key (with a stubbed Anthropic endpoint) successfully drives a chat call.

Regression evidence:

- With budget available and no BYOK key, normal chat flow continues unchanged.

Proof standard:

- A reviewer can artificially exhaust the budget, observe the screen with the right headline + handoff + 4 alphabetical links + BYOK affordance, click "Use my own key," paste a key, and complete a chat call — all while the BYOK key never appears in any Voter Choice server log or response body.

Non-proof:

- "Screen renders" alone — must include the BYOK security check.
- "BYOK input works" without the network-trace assertion.

## Anti-Solutions

- Do not return a 500 on budget exhaustion; return the structured state.
- Do not use apology framing on the screen; the headline is continuity.
- Do not reorder the chatbot links from alphabetical.
- Do not send the BYOK key to the Voter Choice server (except optionally via a passthrough proxy that does not log).
- Do not store the BYOK key server-side; localStorage only.
- Do not condition continued access on tipping.
- Do not log the BYOK key in any analytics or observability surface.
- Do not let a budget exhaustion at the cold open render a broken screen — the handoff is sparse but valid.

## Notes

- The design brief §10 mock is the visual reference. The headline, reset time, handoff block, four chatbot links, BYOK line, and tip-jar all map to specific UI elements.
- The legacy `src/lib/generated/ballotPromptEn.generated.ts` (and its ES sibling) is the canonical handoff template. Phase 1 explicitly retained it for this. Do not delete; do not paraphrase its contents.
- Consider a small key-format hint near the BYOK input ("starts with `sk-ant-`") to reduce typo-frustration.
- The BYOK chat path should respect the same shared safety header from Phase 1 — even on the user's own key, we don't suddenly become a partisan recommender.
- The "I'm back" affordance for when the budget resets while the user is on the screen: a manual button, not auto-refresh.
- Watch for race conditions between the BYOK key being set and the next chat call — the chat client should consult localStorage on every request, not at session start.
- The handoff prompt rendering should reuse Phase 1's handoff-generation prompt builder — `src/lib/prompts/handoff.ts` (server-side render) OR a client-side renderer that consumes the same template. The legacy `BALLOT_PROMPT.md` content remains the canonical text either way.
