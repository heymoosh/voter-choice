# Budget cap investigation — 2026-05-18

## Trigger

User (Muxin) hit a "monthly chat budget reached" message at the end of an E2E
launch test. Her personal Anthropic API account was reported nowhere near its
monthly limit, suggesting either:

- A confused-meter problem (the app's own cap vs. the Anthropic platform cap), or
- A cost-math bug overstating real spend.

The investigation was scoped to `src/lib/server/budget.ts`,
`src/lib/server/durable-store.ts`, and `src/app/api/chat/route.ts`. No durable
store reads were possible from the worktree (no Redis credentials present).

## What I audited

1. **Pricing constants** in `budget.ts` against current Anthropic pricing.
2. **Cost-math correctness** in `estimateUsageCost` and `recordUsage` —
   line-by-line per-component arithmetic for input, output, cached input,
   cache writes, and `web_search` server-tool calls.
3. **Model in use** vs. **model the pricing constants encode**.
4. **Git history** for `budget.ts` and `chat/route.ts` to determine whether the
   constants were ever intentionally calibrated to a worst-case (e.g., Sonnet
   pricing as a safety margin) or simply went stale.

## What I found

**The pricing constants encoded Claude Sonnet 4.5 rates, but the chat route
calls Claude Haiku 4.5.** Concretely:

| Cost component        | Before (in code)      | Sonnet 4.5 actual | Haiku 4.5 actual |
| --------------------- | --------------------- | ----------------- | ---------------- |
| Input tokens          | $3.00 / MTok          | $3.00 / MTok      | $1.00 / MTok     |
| Output tokens         | $15.00 / MTok         | $15.00 / MTok     | $5.00 / MTok     |
| Cached input          | $0.30 / MTok (= 0.1x) | $0.30 / MTok      | $0.10 / MTok     |
| Cache write (5-min)   | $3.75 / MTok (= 1.25x)| $3.75 / MTok      | $1.25 / MTok     |
| Web search            | $10 / 1000 searches   | $10 / 1000        | $10 / 1000       |

`SEARCH_COST_PER_THOUSAND` was already correct (web search is model-agnostic).

**Git evidence that this is a regression, not an intentional safety margin:**

- Commit `5454ede` (2026-04-12) — original launch: `model: "claude-sonnet-4-6"`
  in `chat/route.ts` AND Sonnet pricing constants in `budget.ts`. Internally
  consistent at the time. The constants comment even said
  `// Anthropic pricing for Claude Sonnet (per 1M tokens)`.
- Commit `67d76f5` (2026-05-08) — handoff improvements: swapped chat-route model
  from `"claude-sonnet-4-6"` to `DEFAULT_ANTHROPIC_CHAT_MODEL =
  "claude-haiku-4-5-20251001"`. Did NOT touch `budget.ts`.

Since the model switch on May 8, the budget tracker has been overestimating
input/output/cache-write costs by approximately 3x. That overestimation is what
tripped the gate during launch testing — the displayed `estimatedSpendUSD`
crossed $50 while the real Anthropic spend was closer to ~$17 (consistent with
the user's report that her personal API account was nowhere near its monthly
limit).

The web_search count is tracked and priced correctly (`searchCount` in
`StreamUsage`, populated from `server_tool_use.web_search_requests` in
`message_start` / `message_delta` events). No double-counting and no
under-counting on that line.

The cached/cache-write accounting in `chat/route.ts` reads
`cache_read_input_tokens` and `cache_creation_input_tokens` from the SDK's
usage payload — those are the right fields. Math in `estimateUsageCost` is
correct dimensional arithmetic; only the per-unit constants were wrong.

## What I changed (Scenario B + Scenario A copy fix)

1. **`src/lib/server/budget.ts`** — corrected constants to Haiku 4.5:
   - `INPUT_COST_PER_MILLION`: 3.0 → 1.0
   - `OUTPUT_COST_PER_MILLION`: 15.0 → 5.0
   - `CACHED_INPUT_COST_PER_MILLION`: 0.3 → 0.1
   - `CACHE_WRITE_COST_PER_MILLION`: 3.75 → 1.25
   - Added a header comment explaining the model/constants invariant and
     pointing at `DEFAULT_ANTHROPIC_CHAT_MODEL` in `chat/route.ts` so the next
     model swap doesn't repeat the regression.
   - **Kept `MONTHLY_BUDGET_USD = 50.0` unchanged.** The corrected cost math
     gives ~3x effective headroom on the existing cap, which appears to be what
     was needed for launch testing. Raising the cap would compound with the
     pricing correction and lose the safety value of the cap.

2. **`src/lib/server/budget.test.ts`** — recalibrated two fixtures to Haiku
   numbers:
   - "1M input + 1M output" assertion: $18 (36%) → $6 (12%).
   - "accumulates across multiple calls" with 500k input twice: $3 → $1.
   - All other tests use direct USD spend setters
     (`_setSpendForTesting(50.0)` etc.) and tier-percentage assertions, which
     are constant-independent and required no changes.

3. **`src/lib/translations.ts`** — replaced the confusing handoff-card copy
   that read like "your machine ran out of resources":
   - `en.handoff.budgetReached`: "Monthly Chat Budget Reached" → "Our free AI
     chat reached its monthly limit"
   - `en.handoff.budgetExplanation`: "Your local compute allocation has been
     exhausted for this period. Research continues via our external protocols."
     → explicit "Our free AI chat reached its monthly limit — your personal
     Anthropic API key is unaffected. Copy the prompt below and paste it into
     any free AI chatbot (or use your own API key) to continue your research."
   - Spanish equivalents updated to match.
   - `budget.exhausted` strings (en + es) at line ~552 / ~1067 already had the
     correct framing ("Our free AI chat has reached its monthly limit. Copy
     the prompt below…") and were left as-is.
   - Inline strings in `chat/route.ts` already use the right framing too.

## Why Scenario B over Scenario A

The task default was to raise the cap. But the git history + pricing audit
showed an actual calc bug, which is the higher-leverage fix:

- Raising the cap masks the bug. If the model is ever swapped to Opus 4.7, the
  bug would resurface at the new (higher) cap.
- Fixing constants restores correct behavior at the original cap. Less surface
  area for downstream confusion ("did we set the cap based on real spend or
  guessed spend?").
- The copy improvement from Scenario A is unambiguously good and was applied
  in addition.

## What to monitor going forward

- **Pricing-vs-actual drift.** If our displayed `estimatedSpendUSD` diverges
  from the Anthropic Console's reported spend by >20% over the next billing
  week, audit:
  - Whether prompt caching is being applied as expected (cache_read tokens
    should be the bulk of input tokens after the first message in a session).
  - Whether `extractSearchCount` is firing on `message_delta` and not just
    `message_start` (server-tool counts can finalize late).
  - Whether `cache_creation_input_tokens` is double-counted alongside
    `input_tokens` in the SDK payload — re-verify with the latest SDK release
    notes if we upgrade past 0.39.0.
- **Model swap discipline.** If the chat model is ever changed in
  `DEFAULT_ANTHROPIC_CHAT_MODEL` (or via `ANTHROPIC_CHAT_MODEL` env var on
  Vercel), the pricing constants in `budget.ts` must change in the same PR.
  Consider a follow-up that derives the constants from the configured model
  name so this can't go out of sync again.
- **Cap sizing.** If real-world Haiku spend during the first week of usage
  approaches the $50/mo cap, that's a real signal to raise it — but raise it
  based on observed Anthropic Console data, not estimated spend.

## Out-of-scope (deferred to other agents / future work)

- `ChatPanel.tsx` is being modified by another agent — not touched here.
- `translations.ts` keys outside the budget/handoff scope — left alone.
- No commit was made; the user will review and commit.
- No dev server was started.
