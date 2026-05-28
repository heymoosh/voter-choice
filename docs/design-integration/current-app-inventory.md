# Current-App Functionality Inventory & Acceptance Contract

**Branch:** `feat/design-integration` (off `launch/production` @ `db3b63d`)
**Written:** 2026-05-28, before the Claude Design zip arrives.
**Purpose:** This is the checklist I verify the integrated app against. The pivot is **chat-first → alignment-first** (chat demoted to a support agent; the centerpiece becomes how each candidate's voting + donation record aligns with the user's values). Every behavior below exists in production today. After the Design front-end is wired in, each item is either (a) still working, (b) intentionally cut as part of the pivot — with a note, or (c) broken and must be fixed before ship.

**Integration rule (non-negotiable):** Port real backend logic *into* the vetted Design code. Do **not** rewrite, re-implement, or "take direction from" the Design front-end. Design code = source of truth for the view layer; this app = source of truth for the logic layer. Where Design lacks UI for a feature below, build it in Design's own component/token language — never paste old markup back in.

---

## 0. How to read the status columns

- **Keep** — must work identically after integration.
- **Pivot-cut** — candidate for removal/demotion under alignment-first. Needs an explicit decision before it's actually cut (don't silently drop).
- **Decision** — behavior that the alignment-first Design may contradict; surfaced for the user.

---

## 1. Architecture map (how data reaches the UI *today*)

This is the single most important thing to understand before wiring, because the pivot changes it.

**Today (chat-first):** Almost all candidate data reaches the UI through **LLM-emitted tagged text blocks**. The chat model calls a tool (`lookupAlignment`, `lookupDonorCoalition`), gets structured data back, then *re-emits it as tagged text* inside the streamed message. `src/lib/structured-blocks.ts` (985 lines) parses those tags (`parseAlignmentScoresBlock` :719, `parseRacePatternsBlock` :473) into typed objects the React components render. So the data contract between backend and UI is *text the LLM chose to emit*, not a direct function return.

**The pivot opportunity:** the deterministic DB functions already exist and are one call away from the UI —
- `lookupAlignment()` — `src/lib/server/alignment.ts:195`
- `lookupDonorCoalition()` — `src/lib/server/donors.ts:97`
- and there are **already-built, currently-unused** HTTP routes: `GET /api/alignment` (`src/app/api/alignment/route.ts:114`) and `GET /api/donors` (`src/app/api/donors/route.ts:100`). They're test-only today.

So an alignment-first UI can **render DB output directly** (call the route / server function, render the result) and skip the LLM round-trip entirely for the core alignment view. This is faster, deterministic, and doesn't burn chat budget. **This is the recommended spine of the integration.** Chat becomes a side channel.

---

## 2. Functionality inventory (the acceptance checklist)

### A. Entry / ballot acquisition
| # | Behavior | Where | Status |
|---|---|---|---|
| A1 | Address entry → resolve to races (Google Civic) | address entry flow → `deriveRaces()` `src/lib/raceDeriver.ts` | Keep |
| A2 | Paste a ballot (text) → parse into races/candidates | ballot extraction (`src/lib/server/extract-types.ts`: `BallotExtraction`/`ExtractRace`/`ExtractCandidate`, name/party nullable) | Keep |
| A3 | "Vote for N" multi-seat races expand into N rows | parser (shipped PR #35) | Keep |
| A4 | State party gates (TX runoff, PA closed primary, CA top-two) appear between address and cold-open only when `[state, electionType]` rules require | state rules table | Keep |
| A5 | "Use a starter profile" chip — load a saved `.txt` to seed inference | cold-open (shipped PR #37) | Keep |

### B. Values / cold open (the heart of the pivot)
| # | Behavior | Where | Status |
|---|---|---|---|
| B1 | Free-form cold open: voter describes what they care about; AI mirrors back inferred themes w/ verbatim quotes | prompt fleet: theme-extraction | **Keep — central to alignment-first** |
| B2 | Voter reorders / renames / removes themes before locking in | theme amendment prompt + UI | Keep |
| B3 | Mid-session theme amendment | shipped Phase 6 | Keep |
| B4 | Values are **transient** — there is no stored user-profile object | (confirmed: no persistence) | Decision — pivot may want persistence |

### C. Alignment display (the new centerpiece)
| # | Behavior | Where | Status |
|---|---|---|---|
| C1 | Per-candidate vote alignment: kept/total over a 4-yr window, up to 6 contributing votes | `lookupAlignment` → `computeVoteAlignment` `alignment.ts:161` | **Keep — promote to primary UI** |
| C2 | "Limited data" notice when `< 5` votes | `attachLimitedDataNotice` `alignment.ts:72` | Keep |
| C3 | Fuzzy candidate-name resolution by jurisdiction | `resolveCandidateId` `alignment.ts:103` | Keep |
| C4 | Donor coalition: total raised + bucketed funder breakdown | `lookupDonorCoalition` `donors.ts:97` | **Keep — promote to primary UI** |
| C5 | Donor "not found" states: `candidate_not_resolved` / `no_donor_data` / `non_legislative_candidate` | `DonorCoalitionNotFound` `donors.ts` | Keep — these empty states must be designed, not hidden |
| C6 | Rendering today via parsed LLM blocks (`AlignmentScoreBanner.tsx`, `FunderBars.tsx`, `RacePatterns.tsx`) | `structured-blocks.ts` | Decision — pivot should bypass blocks, render route output directly (see §1) |
| C7 | **No overall alignment score / no candidate ranking / no "best match."** This is *deliberate* (prompt forbids it; nonpartisan stance). | prompt design | **DECISION — highest priority. See §4.** |

### D. Chat (now a support agent, not the focus)
| # | Behavior | Where | Status |
|---|---|---|---|
| D1 | Streaming chat, scoped per active race | `POST /api/chat`, `createSSEStream()` ~`:1175` (ReadableStream + SSE framing, NOT EventSource) | Keep but demote |
| D2 | Tool: `lookupAlignment` | chat route `:50` | Keep (also reachable directly now) |
| D3 | Tool: `lookupDonorCoalition` | chat route `:99` | Keep |
| D4 | Tool: `research_candidate` (web-search fallback for candidates w/ no DB data) | chat route `:144` | **DECISION — see §4. This is the long-tail safety net and it's chat-only today.** |
| D5 | Tool: `web_search` | chat route `:39` | Keep |
| D6 | `budget_exhausted` returns 200 JSON (not a stream) | chat route | Keep — overlay depends on it |

### E. Rate-limit / budget / durable store
| # | Behavior | Where | Status |
|---|---|---|---|
| E1 | Durable store (Upstash/Redis) gates usage | `src/lib/server/durable-store.ts` — reads `KV_REST_API_* ?? UPSTASH_REDIS_REST_*` (`getRedisConfig()` :13) | Keep |
| E2 | Gate codes: SESSION_LIMIT / CONCURRENT_LIMIT / DAILY_LIMIT / RATE_LIMIT_UNAVAILABLE + budget codes | durable-store + chat route | Keep |
| E3 | `BudgetExhausted.tsx` overlay w/ 5 `GateVariant`s (479 lines) | `src/components/BudgetExhausted.tsx` | Keep — must render in Design's language |
| E4 | If `DATABASE_URL` unset → `getDb()` returns `DB_NOT_CONFIGURED`; alignment silently returns empty | `getDb()` | Keep — invariant, not a bug |

### F. Output / handoff
| # | Behavior | Where | Status |
|---|---|---|---|
| F1 | Live-filling printable ballot pane (right pane) | `BallotToolClient` / ballot pane | Keep |
| F2 | Print to PDF | print.css + ballot pane | Keep |
| F3 | Save profile | ballot pane | Keep |
| F4 | Out-of-budget handoff: generate a paste-able package for any other chatbot | `HandoffPackage.tsx`; targets `docs/BALLOT_PROMPT.md` / `_ES.md` | Keep |

### G. i18n
| # | Behavior | Where | Status |
|---|---|---|---|
| G1 | en + es only on prod (vi/zh/ar/RTL is spec-only, NOT shipped) | `src/lib/i18n.tsx`, `translations.ts` (1701 lines); storage key `"ballot-tool-lang"` | Keep |
| G2 | Redesign UI strings (cold-open + workspace chrome from PRs #34–43) are **not yet translated to ES** | deferred item | Known gap — don't regress en |

### H. Privacy
| # | Behavior | Where | Status |
|---|---|---|---|
| H1 | **No analytics / no telemetry** — stated promise on `/privacy` | (absence is the feature) | **Keep — hard invariant. Design must not introduce any tracking/analytics.** |

---

## 3. Hard invariants (the drop-in must NOT break these)

1. **Providers live in `src/app/page.tsx`**, not `layout.tsx`: `<LanguageProvider><ResearchModeProvider><PageContent><BallotToolClient/>`. `page.tsx` is a Server Component, `force-dynamic`, reads `process.env.PROMPT_FLEET_V2`.
2. **`layout.tsx`** hardcodes `<html lang="en">`, sets body `data-mood="civic" data-palette="civic" data-treatment="daylight"` + IBM Plex font vars, imports `globals.css` + `print.css`. No providers here.
3. **`BallotToolClient` must stay mounted across the landing→research flip** (e2e-guarded). Don't unmount/remount it.
4. **Canonical `Race` shape** (`raceDeriver.ts`): `{id, section: RaceSection, label, decided (always false from deriver), candidates: {name,party}[]}`. Every race renderer consumes this. `makeRaceId()` is the id source.
5. **No analytics/telemetry** (privacy promise — H1).
6. **`DATABASE_URL` must be set** or alignment silently returns empty (E4).
7. **Build gating:** `next.config.ts` sets `typescript.ignoreBuildErrors: true` + `eslint.ignoreDuringBuilds: true`. Only `npx vitest run` gates CI. **Therefore I must run `tsc --noEmit` manually as a gate** — type errors otherwise surface at runtime, not build.
8. **Deploy is live-on-push:** every push to `launch/production` auto-triggers the Vercel production deploy (`.github/workflows/deploy.yml`). Integration work stays on `feat/design-integration` and is NOT merged/pushed to `launch/production` without explicit sign-off. Commit-author-email gate rejects `*@experiment`, `*@*.local`, etc.

---

## 4. Decisions needed (cannot be resolved by reading code)

These are the points where an alignment-first Design most likely collides with deliberate product choices. Each needs an explicit call.

**D-1 — Overall score / ranking / "best match" (highest priority).**
The current app *deliberately* shows no overall alignment score and does not rank candidates. The prompt forbids declaring a "best match"; this is a nonpartisan-stance decision, not an oversight. An alignment-first UI very naturally wants a headline number ("87% match") or a sorted list. If the Design has either, shipping it **reverses a deliberate stance and requires new aggregation math** (how do you weigh votes vs. donations? per-issue vs. overall? what about candidates with limited data?). → Need: keep the no-ranking stance, or define the scoring model.

**D-2 — Long-tail coverage when chat is demoted.**
DB coverage is ~82.5% donor / ~53% vote-tagging. For candidates with no DB data, the *only* fallback today is the chat tool `research_candidate` (web search). If chat is demoted to a support agent and the alignment view is direct-render, those candidates show empty unless the fallback is rewired into the non-chat path. → Need: decide whether the alignment view triggers research itself, or whether empty states are acceptable for the long tail.

**D-3 — Direct-render vs. LLM blocks.**
Recommend the alignment view call the DB functions / unused GET routes directly (§1) and stop depending on `structured-blocks.ts` for the core view. This is a real architecture change (deterministic, faster, no budget burn) but means `AlignmentScoreBanner`/`FunderBars`/`RacePatterns` get their data from a new path. → Confirm this is the direction.

**D-4 — Values persistence.**
Values are transient today (no stored profile). An alignment-first flow may assume a saved value-set. → Keep transient, or add persistence (privacy implications — see H1)?

**D-5 — Relationship to prior design work.**
A full **2026 redesign already shipped to prod** (9 phases, PRs #34–43: free-form cold open, three-pane workspace, Civic mood, prompt fleet) — documented in `docs/REDESIGN_2026_SHIPPED.md`. There was also a **prior Stitch→AI Studio integration attempt** (`docs/STITCH_INTEGRATION_PLAN.md`, branch `stitch/ui-integration`) that looks like the cautionary precedent for "rewrote the front-end." → Is the new Claude Design a **continuation** of the shipped 2026 redesign, or a **replacement** of it? This determines how much of the current chrome we preserve vs. supersede.

---

## 5. Verification plan (three gates)

1. **Automated:** `npx vitest run` (CI gate) + `tsc --noEmit` (manual, because the build ignores type errors). Both green before any sign-off.
2. **Functional:** walk this inventory (§2) item-by-item in a local browser — every Keep item demonstrably works; every Pivot-cut item has a recorded decision.
3. **Feel:** user clicks through a preview (localhost during build, then a non-prod Vercel preview deploy) and confirms the vetted Design look/feel survived at every width.

Pristine Design build stays runnable standalone so we can visual-diff the integrated app against it at each breakpoint.

---

## 6. When the zip arrives — first pass (audit before any wiring)

1. **Quarantine:** unzip into a scratch dir inside this worktree; do not overwrite app files yet.
2. **Repo-alignment audit:** verify Design's "already mapped to the repo" claim against reality — which files it expects, which data/type shapes it coded against, which features (from §2) it built UI for and which it did NOT.
3. **Gap list:** features in §2 with no Design UI → to be built in Design's language.
4. **Seam list:** every place Design has a mock/no-op handler that must be replaced by real logic (chat stream is the highest-risk seam — Design fakes streaming).
5. Only then: phased port, `tsc --noEmit` after each seam.
