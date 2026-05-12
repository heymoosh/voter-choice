# Work Packet: launch-anonymous-counters-and-polis-viz

Status: completed — anonymous counters + polis overlay shipped (commit 7ab152e)
Owner: orchestrator (Claude Opus, this session) → worker subagents (Sonnet)
Source: `.ai/project-briefs/voter-choice-alignment-engine-v2.md` § Phasing → Packet 5; user-supplied Polis-style overlap viz spec.
Branch: launch/production

## Intent

Ship the depolarization payoff: a polis-style end-of-session overlap visualization that shows the voter how much they share with neighbors across primaries — anonymously, threshold-gated, no individual records ever stored. Plus the privacy-posture rewrite that names this honestly: "we save anonymous aggregate counts only — even under subpoena, we can't reveal what one voter said." This is the brand asset as much as the feature.

## Original User Intent

User pasted a polis-style overlap viz spec (in conversation, 2026-05-09) that's strict on the privacy architecture: counters only, no user records, no IP, no timestamps tied to identity, threshold-gated, subpoena callout as a brand asset. User confirmed: privacy callout should be **loud, brand-asset prominent** — not footnote-quiet.

## Intent Interpretation

Two-part packet. Part one is the counter pipeline + the polis viz UI. Part two is the privacy posture rewrite — Act 1.5 prompt briefing, tab-close banner, sticky banner, plus a new privacy callout component used in the polis viz. Together they reposition the product from "we save nothing" (which becomes false the moment counters land) to "we save aggregate counts only — and the records that would link those to you simply do not exist." This is honest, tighter, and a brand asset.

The viz itself: aggregate scatter (one dot per synthetic voter session, colored by primary), "you" dot with halo + label, consensus panel showing top shared priorities across primaries. No external poll bootstrap, threshold-gated to 200+ per (county, primary) bucket. Below threshold: placeholder with unlock counter.

## Business Logic

Rules:

- **No individual record is ever written.** Counters increment at end of session. Keys: `voter-choice:counters:{stateCode}:{county}:{primary}:total` and `:issue:{canonicalIssue}` and `:pick:{race}:{candidateId}`. No user id, no session id, no IP, no timestamp tied to identity.
- **Counter-write is idempotent on session id.** A short-lived in-memory `sessionId` (random per session, never persisted client-side beyond the tab) gates the increment. If the client retries the counter-write call, the second one no-ops (server keeps a tiny TTL'd dedupe set keyed by session-id with 1-hour expiry, per-key only — that set IS NOT persistent identity, just an idempotency token that auto-expires).
- **Threshold gate: 200+ sessions per (county, primary) bucket** before the viz unlocks. Below threshold, render a placeholder with the unlock counter and a soft viral hook.
- **No external poll bootstrap.** Don't blend external data with our counters. If a county is too thin, broaden to state level explicitly with copy that says so.
- **Synthetic dot generation.** Dots are generated from the aggregate distribution; each dot is a statistical sample, not a real person. Honest framing: "shape of your county, not a record of who voted."
- **"You" dot computed from your actual confirmed concerns + picks, projected to 2D using the same dimension-reduction logic as the aggregate.** Most voters land in the overlap zone — that's the point. Don't artificially place them there; let them actually land there.
- **Consensus panel:** top 5 issues prioritized across both primaries (sum of counter values for each canonical issue across DEM + REP buckets), shown as horizontal bars with %.
- **Privacy promise copy verbatim from the spec, prominently placed:**
  > No accounts. No tracking. No persistent storage on your device. We count what people care about — never who said what.
  >
  > When you finish your session, we add to running totals for your county and primary. There is no record anywhere that says "this voter answered X." There are only counts.
  >
  > Even with a subpoena, we couldn't tell anyone your answers. The records don't exist to compel.
- **Subpoena line gets its own paragraph for impact** (per the spec).
- **Animation:** dots fade in at final positions, staggered 600–900ms total. "You" arrives last with a subtle pulse. No fake "settling" animation — that implies motion that didn't happen.
- **Copy discipline:** observation, not promise. _"Most Harris County voters — across both primaries — cluster around shared priorities."_ NOT _"You agree with 86% of Harris County."_

Assumptions:

- Vercel KV / Upstash Redis is provisioned with `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) before this packet executes. The existing `src/lib/server/budget.ts` already initializes a Redis client with those env vars; reuse the connection.
- Dimension reduction = simple PCA over a low-dim issue-priority space. Defer UMAP/t-SNE. PCA is interpretable, stable, and fast enough server-side.
- ES path stays held back. New translation keys ship EN only with EN copies in ES bodies.
- Spanish privacy callout is intentionally NOT translated yet (the rewrite touches the trust framing; ES gets a focused pass when we un-pause that path).

User-confirmed decisions:

- Privacy callout: loud, brand-asset prominent.
- User provisions Vercel KV; this packet executes after env vars are live.
- 200+ sessions per (county, primary) threshold gate.
- No external poll bootstrap.
- Synthetic dots from aggregate distribution.

Edge cases:

- County has < 200 sessions but state has > 200: viz unlocks at state level with explicit copy "showing state-wide pattern — your county doesn't have enough sessions yet."
- Both county and state below threshold: render the placeholder with unlock counter, no viz yet.
- Voter skipped Act 2 (no confirmed concerns) → "you" dot can't be computed → render the consensus panel without a "you" dot, with copy explaining "you didn't state priorities, so we don't have a position for you on this map. Here's the broader pattern."
- Voter ran into the budget exhaustion path mid-session and never finished → no counter increment (counter-write happens at session-end / handoff).
- Counter-write failure (Redis unavailable): log, don't crash the session. The handoff and ballot summary still complete.

Out of scope:

- Per-issue drill-down on the viz (deferred per spec).
- Cluster-click interactivity (deferred per spec).
- Mobile-specific design tuning beyond reasonable defaults (defer per spec).
- Color-blind palette toggle (acceptable risk for v1; flagged in spec).
- Spanish path content for any of the new copy.
- Backend ingestion pipeline (Packet 6).

## Scope

Touch:

- `src/lib/server/counters.ts` _(new)_ — counter-write helpers, threshold-check, aggregate-fetch. Reuses the Redis connection from `src/lib/server/budget.ts` (refactor budget.ts so the connection is exported as a shared module if needed; do NOT duplicate connection logic).
- `src/lib/server/counters.test.ts` _(new)_ — tests for counter-increment, idempotency-by-session-id, threshold check, aggregate-fetch.
- `src/app/api/counters/route.ts` _(new)_ — POST endpoint to increment counters at session-end. Accepts `{ sessionId, stateCode, county, primary, confirmedConcerns: [{canonicalIssue, ...}], picks: [{race, candidateId}] }`. Returns `{ ok, alreadyCounted? }`.
- `src/app/api/polis/route.ts` _(new)_ — GET endpoint returning the polis viz data: `{ thresholdMet, scope: "county"|"state", sampleSize, dots: [{x, y, primary}], you: {x, y} | null, consensus: [{issueLabel, percent}] }`. Computes aggregates from counters, runs PCA, generates synthetic dots, computes "you" position.
- `src/components/PolisOverlay.tsx` _(new)_ — the visualization component. Scatter plot with halo + label for "you", consensus panel below, privacy callout prominently placed, sample size footer, animation per spec.
- `src/components/PolisOverlay.test.tsx` _(new)_ — tests for threshold-met render, threshold-not-met placeholder render, "you" dot positioning, consensus panel rendering, privacy callout presence.
- `src/components/PrivacyCallout.tsx` _(new, reused)_ — three-paragraph privacy-promise component. Used inside the polis viz AND linkable from the Act 1.5 briefing if the model wants to reference it.
- `src/components/HandoffPackage.tsx` — wire the polis viz to render at session-end (after handoff, but only for sessions where the voter walked through Act 2/3). One viz per session — show after they have their summary.
- `src/components/ResearchLayout.tsx` — update the sticky tab-close banner copy to reference the new privacy posture (one-line: "We save anonymous counts only. Get your summary before closing the tab — there's no recovery if you don't.").
- `docs/BALLOT_PROMPT.md` — Act 1.5 briefing rewrite. Replace "I do NOT save your data" with the new tighter framing. Add the subpoena line. Maintain the get-the-summary urgency. New rule: at session-end, the model emits a `[POLIS_VIZ_TRIGGER]` block to signal the UI should render the polis overlay. (Or simpler: trigger via the existing handoff flow without a new structured block — pick whichever is simpler.)
- `src/lib/translations.ts` — new EN keys for `polisOverlayHeading`, `polisOverlayPlaceholderLocked`, `polisOverlayUnlockCounter`, `polisOverlayConsensusHeading`, `polisOverlaySampleFooter`, `polisOverlayYouLabel`, `privacyCalloutP1`, `privacyCalloutP2`, `privacyCalloutP3` (the subpoena line), `tabCloseWarningBannerV2` (rewritten copy).
- `src/lib/generated/ballotPromptEn.generated.ts` — regenerated mechanically.
- `src/lib/generatePrompt.test.ts` — assertions for the new Act 1.5 framing.
- `src/components/HandoffPackage.test.ts` — tests for the polis trigger wiring.

Do not touch:

- Spanish content.
- Budget logic outside extracting the shared Redis connection.
- `[RACE_PATTERNS]`, `[ALIGNMENT_SCORES]`, `[VALUES_TAG_REQUEST]`, `[CONCERN_INTERPRETATION]` schemas.
- State fixtures.
- Backend ingestion pipeline (Packet 6).
- Color palette / design system tokens (reuse existing).

## Acceptance Criteria

- Counter-write API increments per (state, county, primary, issue, pick) buckets at session-end with no individual record. Idempotent on session id with 1-hour TTL on the dedupe token.
- Polis API returns threshold status, sample size, scope, synthetic dots, "you" position (or null), and consensus list.
- `PolisOverlay` renders the threshold-met state with scatter + consensus + privacy callout + sample footer.
- `PolisOverlay` renders the threshold-not-met placeholder with the unlock counter and the soft viral hook.
- `PrivacyCallout` renders the three-paragraph promise with the subpoena line as its own paragraph, prominently styled (not footnote).
- `HandoffPackage` renders the polis viz once at session-end, after the handoff summary.
- Tab-close banner reads with the new posture; doesn't claim "we save nothing" anywhere.
- `BALLOT_PROMPT.md` Act 1.5 briefing reflects the new posture honestly. The subpoena line appears. The get-the-summary urgency stays.
- Counters don't crash the session if Redis is down.
- "You" dot is computed from the voter's actual confirmed concerns; voter who skipped Act 2 sees the consensus panel but no "you" dot, with explanatory copy.
- Lint clean, full test suite green, build succeeds.

## Anti-solutions

- Storing any individual user record (session log, anonymized profile, anything that could be reidentified). Counters only.
- Bootstrapping the viz with external polling data.
- Calling the consensus panel "% agreement" or implying voters agree on policies (they share priorities; they may disagree on the answer).
- "You agree with N% of Harris County" copy. Use observation framing, not promise.
- Color-only encoding without alternative cue (acceptable risk in v1 per spec, but flagged).
- Animating dots from a fake "settling" position.
- Adding cluster-click interactivity (deferred).
- Writing a new Spanish privacy callout.

## Notes — phased execution

**Phase 1 (parallel — 2 subagents):**

- **Agent A — Server: counters API + polis API.** Creates `src/lib/server/counters.ts`, the two route handlers, tests. Reuses the Redis connection from budget. PCA implementation is small (~50 lines of math; reference an existing PCA library only if `package.json` already has one — otherwise inline math is fine for a 5-dim → 2-dim projection).
- **Agent B — Client: PolisOverlay + PrivacyCallout components.** Creates `PolisOverlay.tsx`, `PrivacyCallout.tsx`, tests. Renders all the viz states (locked / unlocked / unlocked-without-you-dot). Animation via CSS keyframes with `animation-delay` per dot. SVG scatter (no canvas; SVG is more accessible).

**Phase 2 (single subagent — depends on Phase 1):**

- **Agent C — Integration: HandoffPackage + ResearchLayout + Act 1.5 prompt rewrite + translations.** Wires PolisOverlay into HandoffPackage (renders after session-end handoff). Updates ResearchLayout sticky banner copy. Rewrites Act 1.5 briefing in BALLOT_PROMPT.md per the new privacy posture. Regen + prompt tests.

**Phase 3 (verifier subagent):**
Lint + test + build. Walk acceptance criteria. Grep audit. Output report. No edits.

**Practical note for Agent A:** the existing `src/lib/server/budget.ts` initializes a Redis client. If the client is currently a private module-scoped variable, refactor minimally: extract a `getRedisClient()` shared helper. Don't break budget tests.

**Practical note for Agent B:** SVG with `viewBox="0 0 400 300"` (or similar) keeps the scatter responsive. Dot size = ~3-5px diameter. "You" dot has a 12px halo (lighter color, 30% opacity), an ~6px solid dot inside, and a small label offset above-right. Animation: each dot has `animation-delay` randomized between 0-900ms; "you" dot has the maximum delay plus a CSS pulse.
