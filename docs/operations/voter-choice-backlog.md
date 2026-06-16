# Voter Choice Backlog

Issues, monitoring gaps, data-quality concerns, and enhancement ideas. **Reorganized 2026-06-07 by product phase** (model below). Resolved items moved to `voter-choice-backlog-archive.md` on 2026-06-12 to keep the board live-state-only.

**Severity:** `P0` = blocking / silent bad data · `P1` = meaningful user impact · `P2` = improvement / polish · `idea` = not yet scoped

## ✍️ Adding cards (cheat sheet)

- New card = a block of text with a blank line around it. The board stamps `STATUS` + an id for you.
- Big task? Start the block with a **[P1] Bold title** and bullet the details underneath.
- `## Headings` group cards into phases (the purple tag on the board).
- `- DEPENDS ON: <other card title>` marks a blocker (fuzzy-matched; fix mis-matches on the board).
- Resolved work → `voter-choice-backlog-archive.md`. Full format rules: simple-kanban README.

## 🚦 Phasing model (2026-06-07 pivot)

Ballot upload/parse is too much friction for the target user, so the product ships in phases:

- **Phase 1 — Assess Congress (no ballot):** voting-record alignment + funding for US House/Senate, by address. Largely built; needs prod-hardening + redesign UX.
- **Phase 2 — Intermediary (TBD):** expand beyond Congress *without* full ballot ingestion.
- **Phase 3 — Accurate ballot ingestion (gated on traction / Ballotpedia):** upload/parse/extraction, party gates, measures, a reliable ballot source.
- **Cross-cutting / Operations:** quality + infra that applies regardless of phase.

---

## Phase 1 — Assess Congress (no ballot)

#### Resolve before Phase 1 public release — prod-hardening, NOT design-dependent:

**[P0] Design Candidates UX flow**
- See /Users/Muxin/Documents/GitHub/voter-choice/voter-choice-redesign-delta for front end code - do not port, use the code provided
- When user decides to replace a rep, what happens? 
- Right now, candidates are simply listed below the rep if they are running for the seat.
- STATUS: To Do
<!-- card-id: 6a1fb1fb-b93b-46e7-a2c4-1101a92be631 -->

**[P0] Run /security-review**
- STATUS: Backlog
<!-- card-id: 850b1220-9de9-4aee-814f-470b8096f164 -->

**[P1] Redesign Polis for effect**
- See /Users/Muxin/Documents/GitHub/voter-choice/voter-choice-redesign-delta for front end code - do not port, use the code provided
- Too tiny, too small, too off the side
- Not impactful enough: We want to depolarize, and this is a thin scatterplot that’s not only hard to read but hard to care about
- STATUS: To Do
<!-- card-id: bc774728-5153-409e-a13a-a8207dad0836 -->

**[P0] Reset Polis count to 0 before launch**
- STATUS: Backlog
<!-- card-id: 1f5e2506-106d-4d72-97ec-d85a2d8c214d -->

**[P0] Lower `CHAT_DAILY_SESSION_LIMIT` from 100 back to 10 before public launch**
- Flagged 2026-05-26, raised again 2026-05-28
- Owner: TBD
- During pre-launch dogfooding the per-IP daily session cap was raised above the production default so testers don't trip the limit while iterating: **10 → 30 (2026-05-26), then 30 → 100 (2026-05-28)** when active debugging kept hitting it. Current Vercel Production value: `CHAT_DAILY_SESSION_LIMIT=100`.
- Before opening the app to real users this MUST be reduced back to 10 — leaving it at 100 in production:
  - Costs more per abuser (a malicious IP can burn 10× the API quota)
  - Surfaces a less-defensive default for the Phase 9 budget continuity flow
  - Was never the intended steady-state cap
- **Action when ready to launch:**
  ```bash
  cd <launch-production worktree>
  # Remove the override (falls back to DEFAULT_DAILY_SESSION_LIMIT=10 in production)
  vercel env rm CHAT_DAILY_SESSION_LIMIT production --yes
  # Auto-deploy is DISABLED — a git push will NOT redeploy. Redeploy manually so the
  # running functions re-snapshot project env vars and the override is gone:
  vercel redeploy <latest-production-url> --target production
  ```
- **Verification:** after redeploy, `vercel env ls` should NOT list `CHAT_DAILY_SESSION_LIMIT` for Production. The default `process.env.NODE_ENV === "production" ? 10 : 20` in `src/lib/server/rate-limit.ts:4-5` then applies. Env changes only take effect on a _fresh_ deployment.
- **Why we raised it temporarily:** PR #45 fixed a sessionId regeneration bug (each page reload was consuming a fresh session slot). With that fix landed, a single user's session correctly counts as 1. But during the launch ramp it was practical to give dogfooders headroom rather than tune the cap precisely.
- **Caveat (noted 2026-05-28, updated same day):** the durable rate-limiter still fails _closed_ on ANY Upstash Redis error (`src/lib/server/rate-limit.ts:256-269`), so a Redis blip denies the request — but it now reports `code: "RATE_LIMIT_UNAVAILABLE"` (not `DAILY_LIMIT`), which the continuity overlay renders as a distinct "temporarily unavailable — try again" message instead of the misleading "Budget exhausted" copy. Raising `CHAT_DAILY_SESSION_LIMIT` won't help a Redis failure: if chat denies while the budget tier is still `normal`, suspect a Redis blip, not the cap.
- STATUS: Backlog
<!-- card-id: 28bf87ec-8587-4d1f-acc7-ab5ff7467cf4 -->

**[P2] President/VP candidate card design does not match the standard card design**
- Flagged 2026-06-07, from FL ballot preview test
- The President & Vice President candidate card renders with a visibly different design from the other candidate cards.
- All candidate cards should share the exact same design/layout regardless of data mode (voting-record vs `web_search` "based on public statements" vs no-record). Audit `CandidateCard` in `src/prototype/VoterChoiceApp.tsx` so the modes are visually consistent. Presidential candidates
- STATUS: Backlog
<!-- card-id: 31145699-6396-44b3-915c-c30976551085 -->

**[P1] Translations to major languages**
- Flagged 2026-06-12 (pre-launch) — Muxin. DRAFT card; confirm the language set + wording.
- The app currently ships English + Spanish. Before public launch, add translations to major languages. The i18n plumbing already exists: `src/lib/translations.ts` (UI strings, en/es) and the en/es system-prompt variants (`ballotPromptEn.generated.ts` / `ballotPromptEs.generated.ts`, synced via `npm run sync:ballot-prompt`).
- **Language set (TBD — confirm):** a defensible starting point is the federally-relevant ballot languages under Voting Rights Act §203 — Spanish (done), plus Chinese, Vietnamese, Korean, Tagalog, and the Native American / Alaska Native language groups where covered jurisdictions require them. Choose the set deliberately rather than "all major world languages." (Suggested by Claude — confirm.)
- **Sequencing note:** Translation work depends on the final Phase 1 UX/UI — don't translate strings that are still changing. Blocks on the "[P1] Phase 1 UX/UI finalized (redesign complete)" milestone above (this carries forward the old "no translations until the UX is ironed out" instruction from the retired ES-locale card).
- STATUS: To Do
- DEPENDS ON: Phase 1 UX/UI finalized (redesign complete)
<!-- card-id: 2b325135-bafc-454f-b253-5bce21e05a13 -->

**[P1] Enable voter issue-event persistence in production (go-live steps)**
- Flagged 2026-06-15 — Muxin. Code shipped via PR (`feat/store-voter-issue-events`); these are the deploy-time actions to turn it ON. Until they run, the feature is **inert** — counters/Polis are unaffected and zero rows are written.
- Persists anonymous issue signals at session-end (state + canonical issue + stance + confidence + rank; the model's short label for off-topic/unmapped concerns). **NO session id, NO address, NO verbatim text** — rows are unlinkable. Gated behind `VOTER_ISSUE_EVENTS_ENABLED` (default OFF) and requires the `voter_issue_events` table.
- **Steps, in order:**
  1. **Apply the migration** `db/migrations/0005_add_voter_issue_events.sql` to the prod Neon DB. There is no drizzle journal — apply the raw SQL via the Neon SQL editor / psql. Confirm the table + two indexes exist.
  2. **Confirm the privacy copy is live** — the "Anonymous Issue Signals" section (`src/app/privacy/page.tsx`) describes this collection in the present tense, so it must be deployed before/with enabling.
  3. **Set the flag + redeploy** — `VOTER_ISSUE_EVENTS_ENABLED=true` in Vercel Production, then redeploy (env changes only take effect on a fresh deploy — same caveat as the `CHAT_DAILY_SESSION_LIMIT` card).
- **Status check (2026-06-15) — Plain English:** this feature needs a database table that was never actually created on the live DB, so it's silently doing nothing. I confirmed it's still missing while doing the sub-issue work — the `voter_issue_events` table doesn't exist in prod, i.e. **migration `0005` was never applied** (migration `0006` tried to add a column to it and got `relation "voter_issue_events" does not exist`). To turn the feature on, run `0005` on prod — and re-run `0006`'s two `voter_issue_events` lines too (column + index), since they were skipped for the same reason.
- **Consistency gate:** enable the flag in the SAME release the privacy copy goes live, so the policy never describes collection that isn't happening (or vice-versa).
- **Verify:** run a session to all-seats-verdicted, confirm rows in `voter_issue_events` (incl. ≥1 null-`canonical_issue` row carrying an `off_topic_label` if an off-topic concern was raised). Inspect via `npm run db:analytics-concerns`.
- **Kill-switch:** unset the flag + redeploy to stop collection instantly; counters/Polis are unaffected either way.
- STATUS: Backlog
<!-- card-id: 39a6b6e3-2a1c-4277-a295-b1cf44e3a6d6 -->

**[P1] Phase 1 UX/UI finalized (redesign complete)**
- Flagged 2026-06-12 — Muxin. Milestone/umbrella card; rename or fold into your redesign tracking if you keep it elsewhere.
- The phasing model says Phase 1 is "largely built; needs prod-hardening + redesign UX." This card represents that redesign / UX-and-UI finalization as a single gate, so downstream work that can't start until the surface is stable has something concrete to block on.
- Added new Polis UI changes 6/15
- Not a code task in itself — it closes when the Phase 1 redesign UX/UI is locked.
- STATUS: Backlog
<!-- card-id: e18e65fd-faf8-4aaf-8c4f-cee2111725c6 -->

**[P1] Complete Alignment work**
- **Umbrella tracker — not a code task in itself.** Closes when all the open alignment cards listed below are Done. Tracks the broader alignment-quality effort that began with `docs/alignment/PHASE2_HANDOFF.md` (the original 6-item backlog).
- **Item 1 (operationalize the shared pole anchor) SHIPPED — PR #114 (2026-06-15).** One typed artifact `src/lib/alignment/poleVocabulary.ts` (16 issues × pinned `in_favor`/`opposed` poles, `axis_type`, bill signals, disambiguation, version stamp) is now consumed by BOTH the bill tagger (`tag-bills.ts` / `_classify-batch.ts`) AND the live concern-resolver, with drift / doc-sync / single-source-grep tests. `TAGGER_VERSION` deliberately unchanged → **no DB re-tag**. This is the durable fix that closes the pole-direction drift the ~40–55% inversion came from.
- **⚠ Architecture correction (affects several cards below):** the live concern-resolver is NOT the legacy `[CONCERN_INTERPRETATION]` block in `docs/BALLOT_PROMPT.md`. PromptFleetV2 is ON in prod, so a voter's free-text concern → `canonicalIssue` + `stance` via `src/lib/prompts/theme-extraction.ts` (+ `theme-refinement.ts`), which share `CANONICAL_ISSUES_PROMPT_BLOCK` / `THEME_FIELDS_PROMPT_BLOCK`. `BALLOT_PROMPT.md` is the out-of-budget fallback only — editing it does NOT change live behavior.
- **Open alignment cards this tracker rolls up** (work them individually — this card is just the rollup):
  - Issue taxonomy is too broad for precise alignment matching (Review)
  - Sub-issue v2 — refine `coverage_access` before tagging it (Backlog)
  - `crime_public_safety` and `public_safety` — keep distinct, or deliberately merge? (To Do)
  - Alignment returns `kept: 0` silently for unmapped concerns (To Do)
  - `reproductive_rights` and `immigration` canonical issues have very thin tag coverage (To Do)
  - Alignment 2a — data-driven disambiguation trigger (Backlog)
  - Alignment 2b — theme-card disambiguation UI (Backlog)
  - Alignment 4 — per-vote rationale field (Backlog)
  - ~47% of state bills have no summary (Backlog)
  - No alignment data for non-legislative candidates (Backlog)
  - Second candidate missing alignment block when first has one (Backlog)
  - Web-search-based alignment scoring as fallback (idea)
- STATUS: Backlog
<!-- card-id: f474c4b8-e8c0-4129-9a67-4705a1370efe -->

**[P0] Backup to CAN2026**
- Is there an alternative way to provide bill summaries and why rep voted the way they did than using the CAN2026 as a source? In case we don’t hear back quickly enough?
- Investigate first - look for free, accessible, available data online that is at least as reputable as CAN2026’s sources and interpretation.
- Flag for user review before executing.
- STATUS: Done
<!-- card-id: 3d64a71d-68e4-4ebf-b761-91440ff63e56 -->

**[P0] Sanity check copy and text formatting**
- Ensuring that copy reflects what the app actually does
- Checking on format and layout - ensure consistency
- STATUS: Done
<!-- card-id: a4add889-8b50-4aca-8bb6-82441093dd59 -->

**[P1] "Community AI budget used up" modal misfires when the budget is NOT exhausted**
- Flagged 2026-06-05, from Muxin's preview test
- A voter who barely clicked around and NEVER used the chatbot was shown the "Community AI budget used up" continuity modal.
- Confirmed against live data: the community budget is at **estimatedSpendUSD ≈ $0.87 (1.7% of the $50 cap)** — nowhere near exhausted — and the new block tracker (`voter-choice:blocks:<day>:*`) recorded **zero** blocks, so no server-side budget gate fired.
- The modal is therefore a **client-side misfire**, likely introduced/exposed by the 2026-06-05 observability deploy's budget derivation (`realData.ts streamChatReply` maps a `status:"budget_exhausted"` 200 → BUDGET_EXHAUSTED; `resolveChatBlock`/`setBudgetExhausted` route to the modal).
- **Investigate:** what sets `budgetExhausted=true` on the client without a real server exhaustion (e.g. a per-race chat-intro response mis-parsed as budget_exhausted, or a stale flag). Same "blocking message that doesn't match reality" family as the rate-limit fail-closed.
- STATUS: Done
<!-- card-id: 46a3d077-02a7-4de5-810a-26625a908b49 -->

**[P1] Header and Footer available on app page (3 panel)**
- Footer not available once you go to the app page
- If you navigate back to the home page - without reloading or closing the tab - you lost your place in the app. Didn’t we used to have a resume session? We only remove data if they close a tab.
- STATUS: Done
<!-- card-id: abfc2ecf-0cbf-44e8-bf3d-ee1dbe949796 -->

**[P2] Tip Jar link is unpopulated**
- Flagged 2026-06-05, from Muxin's preview test
- The "TIP JAR" link (budget-exhausted continuity footer + "A tip keeps the budget alive for the next voter…") has no real destination/page yet.
- Populate it (tip/payment page or external link) before launch — a dead tip-jar link at the budget-exhaustion moment is a poor experience.
- STATUS: Done
<!-- card-id: 17b0ac28-91cd-494d-92eb-28d1d96b8bb6 -->

**[P1] Fix Gray Bird to Grey Bird - everywhere**
- This is the official LLC name - Grey Bird LLC
- Has to be accurate
- STATUS: Done
<!-- card-id: 843b96b1-88ac-4d16-93fc-4723869c82a5 -->

**[P2] `/terms` (full AI disclaimer) is not reachable from the app**
- Flagged 2026-06-07
- The prototype nav exposes How-it-works / Methodology / About / Privacy but not **Terms**, where the full "AI Can Make Mistakes" + "Verify with Official Sources" disclaimer lives (`src/app/terms/page.tsx`).
- The disclaimer is NOT dropped — it's also surfaced contextually in the research UI (`RacePatterns`, `AllVotesPanel`, `AlignmentDrilldown`) and on `/methodology` — but the dedicated Terms page should be linked (e.g. in the prototype footer beside Privacy) so it's reachable.
- Add a Terms link in `src/prototype/VoterChoiceApp.tsx`.
- STATUS: Done
<!-- card-id: 73bbe681-558e-4e4c-9e39-3291cb491c46 -->

#### Phase 1 alignment quality — Congress = federal; parallel data work, not redesign-blocking:

**[P2] Sub-issue v2 — refine `coverage_access` before tagging it**
- **Plain English:** We split healthcare into 5 mini-topics. Four are sharp; the 5th — insurance/coverage — turned out to be a catch-all mush, so we left it OFF (those questions just use the old broad score — no worse than before). This card = sharpen "coverage" (or split it into Medicaid / Obamacare / uninsured), re-check, then switch it on.
- Flagged 2026-06-15, from the healthcare sub-issue pilot (PR #117) gold panel.
- `coverage_access` was the ONE facet the 3-juror Opus panel could not confirm — only **43% agreement even on the tagger's HIGH-confidence assignments** (vs 92–100% for `drug_prices` / `provider_costs` / `senior_care` / `mental_behavioral_health`). The tagger applies it to broad ACA / Medicaid / structural healthcare bills the panel reads as "general," not a specific facet. Zero wrong-facet contradictions — errors are "facet vs. general," so it was safe but imprecise.
- **Cutover decision (Muxin): shipped NULL** — no `coverage_access` rows on prod, so those concerns fall back to parent-level scoring (never worse). Re-enable only after tightening.
- **Fix:** tighten the `coverage_access` definition / `billSignals` in `src/lib/alignment/subIssues.ts` (+ `docs/alignment/SUB_ISSUE_VOCABULARY.md`), and/or SPLIT it (e.g. `medicaid` vs `aca_marketplace` vs `the_uninsured`); then re-run the healthcare-scoped `_subissue-*` re-tag + gold gate and insert the passing facet(s). Also reconsider whether to ship the medium-confidence tail of the 4 live facets (currently HIGH-conf only — 912 rows; ~2,449 medium/low left NULL).
- STATUS: To Do
<!-- card-id: 5d23faba-728a-4c32-a7d1-91878b4711c8 -->

**[P2] `crime_public_safety` and `public_safety` — keep distinct, or deliberately merge? (Muxin call)**
- Flagged 2026-05-15. **Reframed 2026-06-15 (pole-anchor work, PR #114):** these are NOT simply "redundant." `docs/alignment/POLE_VOCABULARY.md` + `src/lib/alignment/poleVocabulary.ts` now define them as **distinct axes** — `public_safety` = policing / use-of-force (police funding, enforcement powers, qualified immunity, accountability); `crime_public_safety` = sentencing / charging / incarceration (mandatory minimums, bail, sentencing reform, reentry) — with an explicit "do NOT cross-tag the same provision under both" rule.
- (Tag counts 5,499 / 3,800 are pre-cutover 2026-05-15; the 2026-06-06 re-tag changed totals.)
- So this is no longer an automatic "consolidate." Whether to MERGE into one parent with sub-issues is handoff **item 3** — a deliberate, validated mini-cutover (touches `canonicalIssues.ts` + the pole vocab + a targeted re-tag), not a rename-in-place. Decide intent first.
- STATUS: To Do
<!-- card-id: aab02053-d7dc-41ad-8984-570b6f1a9085 -->

**[P1] `reproductive_rights` and `immigration` canonical issues have very thin tag coverage**
- Flagged 2026-05-15
- `reproductive_rights`: 619 tags (1.5% of corpus). `immigration`: 407 tags (1%). `border_security`: 155 tags (0.4%). These are the three thinnest canonical issues.
- **Impact:** Voters who care about reproductive rights or immigration will often see 0–2 contributing votes even for active state legislators, which reads as "this candidate doesn't address this issue" when the reality is "we don't have enough tagged bills." This is the most politically significant taxonomy gap given that reproductive rights is a top-tier voter concern in 2026.
- **Why thin:** State legislatures rarely have explicit "reproductive rights" bill language — bills are titled by their regulatory mechanism (gestational limits, clinic licensing, etc.). The tagger is less confident matching these to the canonical issue without explicit text, leading to low-confidence drops. Federal bills are better labeled but we have fewer of them.
- **Fix:** **Partly addressed (PR #114):** `src/lib/alignment/poleVocabulary.ts` now gives the tagger explicit pole definitions + bill signals for these issues, and widened `reproductive_rights` Pole B to cover contraception / IVF / Title-X / family-planning (so a contraception restriction no longer falls through to the wrong side). **But `TAGGER_VERSION` was deliberately NOT bumped, so no bills were re-tagged — the improved prompt only helps a FUTURE run.** Remaining (handoff item 6): run a focused re-tagging pass — bump `TAGGER_VERSION` (or target specific bill ids) — on states with relevant legislative histories (TX, FL, OH, GA, NC, AZ, WI for reproductive rights; TX, AZ, FL for immigration).
- STATUS: To Do
<!-- card-id: e782e72f-5c9c-41c5-aedc-7e95f586dbc4 -->

**[P1] Alignment 2a — data-driven disambiguation trigger (axis_type, not the LLM's confidence)**
- Flagged 2026-06-15 — direct follow-up to the Item-1 pole anchor (PR #114), which now exposes per-issue `axis_type` (12 contested / 4 valence).
- **The live bug:** `src/lib/prompts/theme-extraction.ts` `THEME_FIELDS_PROMPT_BLOCK` tells the model "Most priorities are aspirational → in_favor." For a **contested** issue + a value-only concern ("I care about guns", "I care about my kid's education"), the model silently assigns `in_favor` (= the Pole-A side — e.g. gun *access*, fossil energy, school *choice*) and scores against a guessed pole. 12 of 16 issues are contested, so this is the central case, not an edge.
- **Fix:** drive the stance decision off `axis_type` from `poleVocabulary.ts`. For a contested issue whose concern doesn't pick a side, OMIT the stance (honest no-score) instead of defaulting to `in_favor`; for `valence_dominant`, keep matching the consensus pole. Prompt-behavior change in `theme-extraction.ts` (+ `theme-refinement.ts`, which shares the block). No new UI. NOTE: Item 1 deliberately left this heuristic unchanged.
- **Caveat:** without 2b, a contested value-only concern then yields no alignment score (better than a wrong one) until the voter states a side. Best paired with 2b.
- STATUS: To Do
<!-- card-id: d04b101f-123a-43c7-a874-396386ac44ed -->

**[P1] Alignment 2b — theme-card disambiguation UI (let the voter pick the pole)**
- Flagged 2026-06-15 — follow-up to Item 1 (PR #114) + 2a. When 2a omits the stance for a contested value-only concern, the voter currently has no way to set their side, so the issue stays unscored.
- **What:** render the pole choice on the theme card — `poleVocabulary.ts` already carries each contested issue's neutral `disambiguation` question + two poled option labels. A tap sets the theme's stance and re-scores. The send-back path exists (`SeatChat` `onSend`); the parse/render layer does NOT — no production component renders the structured concern blocks today (`src/prototype/redesign/SeatChat.tsx` is plain-text).
- **Scope:** redesign-coupled (theme-card UI in `src/prototype/redesign/`). Larger than 2a.
- STATUS: To Do
- DEPENDS ON: Alignment 2a — data-driven disambiguation trigger
<!-- card-id: c6f8727b-0f81-4307-8451-35a399ba5f4b -->

**[P2] Alignment 4 — per-vote rationale field (design-only, from ALIGNMENT_DATA_MODEL.md)**
- Flagged 2026-06-15 — handoff item 4, no prior card.
- A per-contributing-vote rationale on `ContributingVote` / `AlignmentResult` (`src/lib/server/alignment.ts`), surfaced in `AlignmentDrilldown`. Where CAN curated context covers the vote (`can_candidate_key_votes.context`), populate from that prose. (Docs renamed "bridge" → "vote rationale" to avoid colliding with the Polis "bridge statements"; settled in docs, absent from code.)
- Additive; effectively depends on CAN data being displayed (see the CAN2026 display gate, blocked on attribution terms).
- STATUS: To Do
<!-- card-id: 4d2fa4a5-3ee1-4038-8994-c7d489e62000 -->

**[P1] Store voter issue preferences for analysis**
- Flagged 2026-05-15 — requires design
- Pre-launch (Muxin, 2026-06-12): bumped ahead of Phase 1 public release
- **What:** Persist the `[CONCERN_INTERPRETATION]` output (voter's ranked canonical issues + stances) to a database table, anonymously, without any PII. This would let us run analysis: which issues voters in which states care most about, which canonical issues are being invented (indicating taxonomy gaps), how often voters express concerns outside the 15 canonical categories.
- **Why this matters:** The current taxonomy was built bottom-up from legislative data, not from what voters actually ask. Storing what voters ask would let us close the gap — both by expanding the vocabulary and by improving the tagging priority queue (tag more bills in the issues voters actually care about).
- **Pre-launch rationale (Muxin, 2026-06-12):** We should be using the same data that populates Polis — and it enables us to figure out what else to tag in the DB. Still anonymized.
- **What it requires before building:**
  - New DB table (`voter_concern_events` or similar) with columns: session_id (hashed), canonical_issue, resolved_stance, was_off_topic, confidence_level, state_code, timestamp
  - Privacy policy update: clarify that we store anonymous, non-PII issue preference signals. Current policy says we store "anonymous counts only — never who said what." This is consistent but needs explicit mention of concern signals.
  - UX: this data is already being sent to Anthropic as part of the chat context. The new part is persisting the structured output, not adding new collection.
  - A simple analytics query interface (even just SQL in the repo) to inspect the data.
- **Constraint:** Do not collect the voter's free-text verbatim — only the resolved canonical issue id and stance. Free text could be identifying.
- **Implemented 2026-06-15 (PR `feat/store-voter-issue-events`):** new `voter_issue_events` Postgres table written from the existing session-end `/api/counters` path (`recordConcernEvents` in `src/lib/server/counters.ts`); analytics via `npm run db:analytics-concerns`. **Two decisions refined the spec with Muxin:** (1) **no session id at all** — the original `session_id (hashed)` column was dropped, so rows store state + issue only and are unlinkable (dedup rides the existing Redis idempotency gate). (2) For off-topic/unmapped concerns we store the model's short label (not the voter's words) to surface taxonomy gaps. Privacy copy added. Code merges behind a default-OFF flag — see "Enable voter issue-event persistence in production" above for the go-live steps.
- STATUS: Done
<!-- card-id: ff008bd7-d5ad-422a-bdd9-22bfac6227cc -->

**[P1] Issue taxonomy is too broad for precise alignment matching**
- **Plain English:** Big topics like "healthcare" were too broad — "insulin prices" and "hospital monopolies" got the *same* score. Fix = add mini-topics under each big topic. We built that machine and ran it on healthcare (live in the data now): 4 mini-topics shipped, so a drug-price question now scores only on drug-price votes. Still to do: run the same machine on the other 15 big topics, and fix the messy "insurance" mini-topic (its own card below).
- Flagged 2026-05-15
- The 15 canonical issues (`healthcare_affordability`, `economy_jobs`, etc.) are high-level categories. A voter who cares about "insulin prices" and one who cares about "hospital monopolies" both resolve to `healthcare_affordability` and get the same alignment score, even if their actual concerns are distinct. Similarly, "crime" vs. "policing reform" both land in `crime_public_safety` with no way to distinguish stance at query time.
- **Impact on chat:** Alignment answers can feel generic or off-target for voters with specific policy concerns. The system will return votes that are technically related to the category but not the voter's actual position.
- **Longer-term fix:** Expand the canonical vocabulary (likely 30–50 issues) and re-tag the 67K bill corpus. **Update (PR #114):** stance-level *directionality* is now handled — `src/lib/alignment/poleVocabulary.ts` pins per-issue `in_favor`/`opposed` poles consumed by both tagger and resolver — so the remaining gap is finer *sub-issue* granularity (e.g. `healthcare_affordability:expand_coverage` vs `cost_containment`), not direction. A change here means coordinated edits to `canonicalIssues.ts` + `poleVocabulary.ts` + the live resolver `src/lib/prompts/theme-extraction.ts` (NOT `BALLOT_PROMPT.md` — off the live path) + a re-tagging run.
- **SHIPPED — hierarchical sub-issue layer + healthcare pilot (PR #117, 2026-06-15).** Chose layered (parent + optional `sub_issue`) over a flat 30–50 rewrite: `src/lib/alignment/subIssues.ts` (`sub-issue-v1`) adds optional topic facets beneath the 16 issues; facets INHERIT the parent pole (orthogonal to #114's direction work). `lookupAlignment` PREFERS sub-issue votes and FALLS BACK to parent when sparse → never worse than today. Schema: nullable `issue_tags.sub_issue` (+ `sub_tagger_version`/`sub_tagger_confidence`), migration `0006` (additive). Healthcare piloted end-to-end: all 6,494 bills re-tagged (Sonnet), 3-juror Opus gold gate passed (contradiction ≤5% all facets), **912 high-confidence rows cut over to prod** across 4 facets (`drug_prices` / `provider_costs` / `senior_care` / `mental_behavioral_health`). Live proof: a candidate scored 813/842 (parent) vs 29/29 `drug_prices`, 9/9 `provider_costs`. **`coverage_access` dropped (fuzzy — 43% panel agreement even at high confidence) → its own card below.** Prod sub_issue data is invisible to users until PR #117 deploys.
- **Remaining (keeps this card open):** roll out the other 15 families — data-only per family (sub_issue defs in `subIssues.ts` + `SUB_ISSUE_VOCABULARY.md`, scoped `_subissue-*` re-tag, gold gate); apply a sparsity gate (skip/coarsen families thinned by the June cutover, e.g. border/gun/immigration). Mechanism + tooling already built.
- **Related:** See "Store voter issue preferences" idea below.
- STATUS: Done
<!-- card-id: c9a51f25-70cd-495c-ab5e-0dda3d5765b6 -->

**[P1] Alignment returns `kept: 0` silently for unmapped concerns**
- Flagged 2026-05-15
- If Claude maps a voter concern to a canonical id that has very few tagged bills (e.g., `border_security` with only 155 tags, or `immigration` with 407), the alignment lookup will return `found: true` but very low `kept` counts. The voter sees a score like "1 of 47 votes" which looks like the candidate barely addressed the issue — when in reality there just aren't many tagged bills.
- **Impact:** Misleading sparsity signals, especially for federal-only issues (immigration, border) where state legislators rarely vote on them.
- **Fix options:** (a) Show a "limited data" notice when `total < 5` — **DONE** (`attachLimitedDataNotice` in `src/lib/server/alignment.ts:80` sets `result.notice`, rendered verbatim by the chat layer). Remaining: (b) fall back to web search when `total` is below a threshold; (c) expand the tag corpus for thin issues (overlaps the thin-coverage + re-tag cards). Narrow this card to (b)/(c), or close if (a) is deemed sufficient.
- STATUS: Done
<!-- card-id: c6263fc9-63ca-488a-926e-4d38d81bb7c6 -->

---

## Phase 2 — Intermediary [PROPOSED — refine later]

Expand beyond Congress without full ballot ingestion (non-legislative candidates via web search, state/local depth, engagement/Polis).

**[P1] ~47% of state bills have no summary — "can we find missing bill summaries?" (OpenStates has none; recover via full-text+LLM or accept title-only)**
- Flagged 2026-06-04, during alignment re-tag methodology validation on the `alignment-work` Neon branch
- **Finding (read-only DB audit):** `bills.summary` is missing on **47.4% of OpenStates (state) bills** — 31,813 of 67,048 — vs. only **7.5% of federal** (govtrack) bills. The text is **not hidden in our DB**: for these bills `raw_metadata->'openstates'` stores only a 4-field skeleton (`classification`, `id`, `identifier`, `session_id`); there is **no** `abstracts` / `summary` / `description` field anywhere (0 of 31,813). So this is an **ingest gap, not an extraction gap** — we never fetched/stored the abstract; it is not "present but unmapped."
- **Impact:** The bill-tagger (and the new pole-anchored alignment approach) reads `title` + `summary`. With no summary, ~half of state bills can only be judged on title, forcing low-confidence tags or honest "no-score" abstentions. In a 49-bill real-data eval the title-only state bills largely went to no-score (accurate, but it **thins alignment coverage on state/local races** — the bulk of the candidate universe).
- **Correction (2026-06-05, verified in code):** the ingest **already** requests `abstracts` and falls back to `subject` — `scripts/ingest/state-votes.ts`: `fetchOpenStatesJson` (~L475 adds `include=abstracts`); `buildBillRow` (~L741–783) sets `summary = abstracts[0].abstract ?? abstracts[0].note ?? subject`. So the nulls are NOT an ingest bug — OpenStates simply has **no abstract and no subject** for these ~31,813 bills. (The 4-field `raw_metadata` skeleton noted above is just what we chose to store; the abstract was already extracted to `summary` when one existed.)
- **Real recovery options:**
  - **(a)** Fetch each bill's **full text** (OpenStates exposes `versions[]` / `sources[]` links) and run an **LLM pass** to produce a short summary → backfill `bills.summary`. Biggest coverage lever for state races, but a real ingest + LLM job.
  - **(b)** Accept title-only and let the alignment tagger abstain (`no_score`) — honest but thinner (current behavior).
- **Where to look:** `scripts/ingest/state-votes.ts` (`buildBillRow`, `fetchOpenStatesJson`); the OpenStates v3 `/bills` response shape (`versions`, `sources`).
- **Related:** the "Issue taxonomy too broad" item, and the alignment pole-anchor work — now SHIPPED as `src/lib/alignment/poleVocabulary.ts` (PR #114), which the tagger reads alongside `title` + `summary`. Title-only state bills still go to honest no-score per the vocab's fall-through rule, so this summary gap remains the biggest lever for state-race coverage.
- STATUS: Backlog
<!-- card-id: 0338a55a-ee3f-4867-9611-2518a6ae9266 -->

**[P2] IL bill coverage lagging (31.8% — worst of high-volume states)**
- Flagged 2026-05-15
- Illinois has 8,379 bills — the largest state corpus — but only 31.8% are tagged. Sunday cron will close this slowly.
- If IL is a priority, a targeted manual tagging run (100 batches × 300 bills) would close it in one session.
- STATUS: Backlog
<!-- card-id: d16de86e-3e7d-4f59-bd63-15e7825344cc -->

**[P1] No alignment data for non-legislative candidates (executive, judicial, local)**
- Flagged 2026-05-15
- The `candidates` table and `votes` table only contain state house/senate members and federal House/Senate members. Statewide executive candidates (Governor, Lt. Governor, Attorney General), judicial candidates (judges), county officials, city council, school board, and ballot measure races have no entries in the DB.
- **Impact:** For ballots that are entirely or mostly non-legislative (primaries, runoffs, off-cycle local elections), `lookup_alignment` returns `found: false` for every candidate. The entire chat session falls back to web search. Our proprietary voting record data plays no role. The May 26, 2026 Texas DEM runoff ballot is an example: Lt. Governor, AG, Court of Appeals, County Judge, District Clerk — none covered.
- **Partial mitigation:** Web-search-based alignment scoring (see idea below). Full fix requires new data sources (executive campaign finance, AG actions, bill signing records) — significant scope.
- STATUS: Backlog
<!-- card-id: f52273a5-38ee-4f58-a6fa-edb1d4b43c2b -->

**[P1] Second candidate missing alignment block when first has one**
- Flagged in Muxin's 2026-05-18 E2E run, needs verification
- In one observed session, the first candidate in a race had a complete alignment block, but the second candidate did not. The structural fallthrough for non-legislative candidates is already covered by the "No alignment data for non-legislative candidates" P1 above, but the web-search alignment fallback added in commit 5bc3585 was specifically intended to backfill these cases — and it didn't fire here.
- **Suspected cause:** The prompt path that routes to `web_search` for non-legislative candidates isn't being taken reliably. The model may be short-circuiting after the first candidate's lookup succeeds, or the per-candidate iteration may be silently skipping the fallback branch.
- **Verification needed:** Spot-check a session with a Texas non-legislative race (Lt. Governor, AG, Court of Appeals are all good test cases). Capture the AI's tool calls and confirm whether `lookup_alignment` falls through to web-search emission for each candidate that returns `found: false`. If it doesn't, file as a separate P1 with the tool-call transcript.
- STATUS: Backlog
<!-- card-id: f21e0941-57d0-42b4-b1b7-1c5a1f1a5705 -->

**[idea] Web-search-based alignment scoring as fallback when DB has no data**
- Flagged 2026-05-15 — requires design
- **What:** When `lookup_alignment` returns `found: false` (non-legislative candidate) or `total < threshold` (thin data), instruct the model to run a targeted web search for the candidate's public statements, endorsements, and actions on the issue — then emit a structured alignment assessment in the same `[ALIGNMENT_SCORES]` format, labeled with a different source type so the UI can render it differently.
- **Why it's viable:** The model already does this analysis in prose for non-legislative candidates. The change is making it structured and consistent rather than narrative. The model reads web search results and synthesizes "does this candidate support or oppose this concern?" It already knows how to do that reasoning — we'd just be capturing the output formally.
- **What it would look like in the scores block:**
  ```json
  {
    "canonicalIssue": "reproductive_rights",
    "issueLabel": "Reproductive Rights",
    "resolvedStance": "in_favor",
    "kept": null,
    "total": null,
    "sourceType": "web_search",
    "confidence": "medium",
    "evidence": [
      { "summary": "Endorsed by Planned Parenthood TX, May 2026", "url": "..." },
      {
        "summary": "Stated opposition to HB 1280 in campaign interview",
        "url": "..."
      }
    ]
  }
  ```
- **Key design constraints:**
  - Must be clearly labeled as "Based on public statements" — not "voting record." Different epistemics: voting records are facts, web search summaries are interpretations of available media.
  - Confidence degradation: `high` only for explicit on-record statements; `medium` for endorsements; `low` for inferred from affiliations.
  - Hallucination risk: model must cite sources for each evidence item. Any claim without a real URL should be dropped.
  - Source quality: partisan endorsement sites can be misleading. The model should weight official campaign statements, credentialed news coverage, and official government records over advocacy org summaries.
- **Implementation path:** Primarily a system prompt change + a UI change to render `sourceType: "web_search"` scores differently from `sourceType: "voting_record"` scores. No new backend required. Moderate prompt engineering effort. Low infrastructure cost.
- **Related:** Addresses "No alignment data for non-legislative candidates" [P1] above and "thin tag coverage" [P1] above.
- STATUS: Backlog
<!-- card-id: f5d6a886-da2c-4f0e-827c-fee3e3ebc035 -->

**[idea] Polis viz: usage tracker + social share**
- Flagged 2026-05-18 — growth / social-proof
- Two small additions to the Polis viz surface:
  1. Social-proof banner near the viz: "N voters in [county] have used this tool" — needs a counts query against the existing session/participation data.
  2. "Share this tool" CTA next to the viz, with prefilled copy and OG image.
- **Why:** Both are low-cost trust-builders and growth nudges. The counts banner especially helps in counties where the viz is still warming up — even a modest "47 voters in Travis County" reads as legitimacy.
- STATUS: Backlog
<!-- card-id: 2269ffae-a02c-4561-83c9-1d9a0661b910 -->

**[idea] Polis viz no longer gated on participation threshold**
- Flagged 2026-05-18 — design + QA tooling
- **Resolved by removing the gate (PR #116, 2026-06-15):** the original concern was that low-participation jurisdictions saw NO Polis viz (the old `thresholdMet` / 200-user minimum hid it). Rather than build a mock-data "preview mode" to work around the gate, the participation threshold was **removed entirely** — the party-free overlap cloud now renders for everyone regardless of participant count, so there is no longer a blocked state to preview around. This is the desired behavior.
- The originally-proposed `?devPolis=1` / `NEXT_PUBLIC_DEV_POLIS` mock-data path was therefore **never built and is not needed** (those flags do not exist in code).
- STATUS: Done
<!-- card-id: b762fd4e-2525-4b59-a4f9-6baafc2988ba -->

---

## Phase 3 — Accurate ballot ingestion (gated on traction / Ballotpedia)

All ballot upload/parse/extraction, party gates, measures, and a reliable ballot source. Pursue only if traction justifies the cost/effort.

**[P2 / idea] Open-primary party-selection flexibility + pre-print party confirmation**
- Flagged 2026-06-05 from R4 multi-state verification; DEFERRED by Muxin — core ballot accuracy is higher priority
- The party gate currently fires for ANY primary whose ballot spans multiple party lanes (`isPrimaryLike && racesSpanMultipleParties` in `VoterChoiceApp.tsx`), regardless of `getStateRule`. R4 testing on a WI open-primary ballot confirmed it fires for open primaries too.
- **Muxin's intended flow (scope creep, deferred):** at the gate, ask "which party do you want to vote for?"; if the voter doesn't know / wants to browse, let them **see BOTH parties**; then add a step **before printing the final ballot** that helps them choose which party to commit to (based on their answers/picks) and **confirm before the printout** — so an open-primary voter can browse everything and commit to one party only at print time (you may legally vote only one party's primary).
- Likely also wires `getStateRule` into the gate COPY (closed → "your registered party" + unaffiliated-voter notice; open → free choice; top-two → no gate). Not for this session.
- STATUS: Backlog
<!-- card-id: 8bc7e9e5-f4c1-4b70-bc71-347b06a9c9ff -->

**[P1] Hardcoded location/state data still leaks into the UI — make EVERYTHING address-derived**
- Flagged 2026-06-05, from Muxin's preview test
- Same class as the F12 "hardcoded Texas" fix, but more instances remain. On a NEW JERSEY address the UI still showed Texas/Harris-County leftovers: the left-panel footer link **"See party-gate (TX primary)"**, and the election-info "Show details" panel **"SOURCE · HARRIS COUNTY ELECTIONS"**.
- **Requirement (Muxin):** ALL locations, states, counties, jurisdictions, election-types must be variables populated after we ingest the address + ballot — never hardcoded.
- **Action:** sweep UI + data layers for literal "TX"/"Texas"/"Harris"/"primary"/county/state constants and replace each with an address/ballot-derived value. The "See party-gate (TX primary)" link is a dev affordance — remove or make dynamic for production.
- STATUS: To Do
<!-- card-id: 054cbdca-c250-4634-b5e3-916a25d5e584 -->

**[P1] Party-primary FILTERING of the ballot ("2 Senate races")**
- Flagged 2026-06-03
- Rebuild task #25
- In a closed/semi-closed PRIMARY the ballot carries BOTH parties' primary contests. The gate captures the voter's party, but the displayed races are NOT yet filtered to that party → both the Democratic and Republican Senate primary show (the "2 Senate races" the user saw).
- Fix: thread the gate selection (registered_dem / registered_rep / unaffiliated→chosen party) into ballot derivation and filter partisan contests to the selected primary; keep non-partisan races. In a GENERAL election, show ALL candidates (no filter, no gate).
- Verify end-to-end with the real NJ June primary PDF (registered Dem → only DEM races) AND a November general scenario (all candidates, no gate).
- STATUS: Backlog
<!-- card-id: 2a68bab6-4dd7-4f21-817b-de9446085dac -->

**[P1] Google Civic `voterinfo` rarely returns the ballot (contests) — heavy reliance on upload/paste**
- Flagged 2026-06-03
- We DO request the ballot: `/api/civic` calls Google `civicinfo/v2/voterinfo` for `contests` (not just polling-location logistics). But Google's Civic election/ballot data is sparse and unreliable — Google deprecated much of it (the `representatives` endpoint shut down in 2025; `voterinfo` contest data is populated only for some elections, often only near election day, and is spotty by state). So for many addresses (incl. NJ) it returns 0 contests and the app correctly falls back to the upload/paste `BallotLookupNeeded` screen. This is a Google limitation, not our bug — but it means we **cannot rely on Civic for the ballot**.
- **Action (evaluate pre-launch):** add a more reliable ballot-contest source (e.g. BallotReady / Democracy Works, Ballotpedia, or per-state SOS feeds) so most users get an auto-pulled ballot instead of having to upload a sample ballot. Keep upload/paste as the universal fallback.
- STATUS: Backlog
<!-- card-id: fceacf73-1bd9-4120-9b5b-6fb27b39dbb2 -->

**[P1] "Pull my ballot →" submit button overflows the address card at desktop widths**
- Flagged 2026-05-26 — defer to mobile/responsiveness session
- After PR #48 fixed the button height (71px → 48px matching prototype `.addr-card .go`), the button now sticks OUT of the right edge of the address card instead of wrapping inside it. The card has a fixed max-width via `.addr-card` but the flex row containing input + button isn't clamping the button into the card's content area.
- **User screenshot:** address `260 West Atlantic Avenue, Audubon, NJ 0…` (truncated by the input's clear-X) and the green "Pull my ballot →" button visibly extending ~30-40px past the card's right border.
- **Likely fix paths to evaluate during the responsive pass:**
  - Constrain the input column with `flex: 1` / `min-width: 0` so it shrinks to make room for the button
  - Wrap the button below the input on narrower viewports via flex-wrap
  - Reduce the card's internal padding so the row fits cleanly
- **Scope:** part of the broader mobile responsiveness pass — verify against the prototype's responsive breakpoints in `prototype.css` (look for `@media` queries on `.addr-card`).
- STATUS: Backlog
<!-- card-id: e6d1fdd3-425a-4700-b1d8-b01dc1901b99 -->

**[P0] Run Contender 1 (Textract + Sonnet) on the bakeoff fixtures before locking C2 as the long-term extraction architecture**
- Flagged 2026-05-27 from `experiment/pdf-extraction-bakeoff` decision
- The PDF extraction bakeoff (Phases 0–6 on `experiment/pdf-extraction-bakeoff`) named three contenders. **Contender 1 (AWS Textract Forms + Claude Sonnet post-processor) was skipped in Phase 4 due to absent AWS credentials** (no `~/.aws/credentials`, no `AWS_*` env vars, no SSO cache). The bakeoff selected **Contender 2 (Sonnet vision direct)** as v1 winner with documented caveats:
  - C2 missed ~13% of NJ Camden candidates (87%, not a clean win).
  - C2 has 3 perception errors on FL Orange multi-district content (wrong Senator district 21 vs 25, hallucinated State Rep district 44, Circuit Judge with position/district transposed).
- Textract is purpose-built for forms — it may handle BOTH the NJ broken-text layer (form-native extraction) AND the FL multi-district perception errors (designed for structured tabular content). If C1 results justify, the v2 architecture may be **Textract-first with C2 as fallback**, not the other way around.
- **Worktree:** all C1 bakeoff work should happen on branch `experiment/pdf-extraction-bakeoff` or a fresh experiment branch, not in the production worktree. This branch never merges to `launch/production`; only the eventual v2 architecture PR (if results justify) would be a fresh branch off `launch/production` that ports the chosen production code.
- **Action when AWS credentials are available:**
  1. AWS account + IAM scoped user already provisioned via `experiments/pdf-extraction-bakeoff/infra/provision-scoped-user.mjs`. Put scoped credentials in the active experiment worktree's `.env.local`. Verify with `node experiments/pdf-extraction-bakeoff/infra/verify-aws-creds.mjs`.
  2. Run the C1 runner against the 4 fixtures (`nj-camden-2026-primary.pdf`, `tx-harris-2026-dem-runoff.pdf`, `tx-hidalgo-2026-bilingual.pdf`, `fl-orange-2026-composite.pdf`). Runner exists at `experiments/pdf-extraction-bakeoff/runners/01-textract-sonnet.ts` (committed `da7d915`).
  3. Re-run `npx tsx experiments/pdf-extraction-bakeoff/score.ts` to score the C1 cells.
  4. If C1 outperforms C2 on FL Orange AND ties/wins on NJ Camden, file a v2 architecture PR off `launch/production`. Otherwise, C2 stays as production extraction path.
- **Does NOT block v1 ship of C2.** This is a "lock the long-term architecture" gate, not a "ship the extraction path" gate.
- **References:**
  - Bakeoff branch: `experiment/pdf-extraction-bakeoff`
  - Decision doc: `experiments/pdf-extraction-bakeoff/decision.md` (winner: C2 with caveats)
  - Design spec: `experiments/pdf-extraction-bakeoff/decision-design.md`
  - Skipped C1 runner: `experiments/pdf-extraction-bakeoff/results/01-textract-sonnet/SKIPPED.md` on the bakeoff branch
- STATUS: Backlog
<!-- card-id: 31cbba83-eb2c-461c-99f6-1767a359bbfe -->

**[P1] C2 prompt engineering for multi-district disambiguation (post-launch)**
- Flagged 2026-05-27 from `experiment/pdf-extraction-bakeoff` decision
- On the FL Orange fixture, Contender 2 (Sonnet vision direct) produced three perception errors on multi-district content:
  - Senator district extracted as 21 instead of the actual 25 on the ballot.
  - Hallucinated State Representative district 44 (does not exist on the ballot).
  - Circuit Judge with position and district fields transposed.
- These are NOT non-ballot hallucinations and NOT schema/enum issues. They are model-capability or prompt-engineering gaps on disambiguating multi-district ballot content. The 2026-05-27 section_name enum expansion did NOT fix them.
- **Likely fixes to try once C2 is wired into production and we can iterate against real ballots:**
  - Add explicit prompt constraints for multi-district handling. Example: "If you see multiple district numbers near the same office label (e.g., '21 vs 25'), use the first one encountered after the office label."
  - Add a per-race confidence signal to the schema and surface a "low-confidence extraction" warning to the voter when an office has a district/position combination that the model wasn't sure about.
  - Test ablations: smaller crop windows per page, explicit page-region prompts, post-extraction district validation against a per-jurisdiction allowlist.
- **References:**
  - Bakeoff decision: `experiments/pdf-extraction-bakeoff/decision.md` § "Honest caveats" caveat 1
  - Bakeoff design: `experiments/pdf-extraction-bakeoff/decision-design.md` § "Known limitations of C2 (v1 winner as of 2026-05-27)"
- STATUS: Backlog
<!-- card-id: c107390e-0e28-4423-aaf3-9526aaff9d14 -->

**[idea / P2] Add Contender 3 (docling) as opt-in second path for amendment-heavy ballots**
- Flagged 2026-05-27 from `experiment/pdf-extraction-bakeoff` decision
- Bakeoff data shows docling + Sonnet post-processor (Contender 3) outperformed C2 on the FL Orange composite fixture (15/15 weighted vs 10.5/15). FL Orange is dominated by long-form prose office names (judicial retentions, constitutional amendments) and multi-district races — exactly the content where C3 captured 100% race coverage at 100% candidate completeness vs C2's 96%/94% with 3 perception errors.
- C3 was disqualified as v1 winner because it returned `{"sections": []}` on the NJ Camden broken-text-layer fixture (the bakeoff's motivating case). It cannot OCR; the spec dropped Tesseract preprocessing. So C3 is not a primary path candidate.
- **Why this matters in late 2026:** November 2026 general-election ballots in CA, FL, TX, and other states will surface a much higher fraction of proposition-heavy / amendment-heavy ballots than the spring primaries. If real-world telemetry shows C2's FL-Orange-shape failure mode recurring, C3 becomes a strong opt-in second path: route amendment-heavy ballots to C3, broken-text-layer ballots to C2.
- **Trigger to revisit:** when the production extraction telemetry surfaces ≥5% of ballots with the FL-Orange failure pattern (perception errors on multi-district content), or before the November 2026 general-election rollout, whichever comes first.
- **References:**
  - Bakeoff decision: `experiments/pdf-extraction-bakeoff/decision.md` § "Future levers"
  - C3 runner + results: `experiments/pdf-extraction-bakeoff/runners/03-docling-sonnet/` and `experiments/pdf-extraction-bakeoff/results/03-docling-sonnet/` on the bakeoff branch.
- STATUS: Backlog
<!-- card-id: 1ed1c65b-c4ed-4b3a-a5cd-53128c053ab8 -->

**[P1] Google Civic ballot lookup unreliable for Texas (and likely other states)**
- Structural, partially mitigated
- Harris County 77002 returns "0 races, Not confirmed" from Google Civic. The PDF ballot upload fallback works well (confirmed with real DEM Harris ballot). But users who don't know to upload a PDF will see the "not confirmed" state and may not realize there's a fallback.
- **Mitigation in place:** PDF upload is surfaced in the UI with a `<details>` section and clear instructions. pdfjs-dist extraction confirmed working.
- **Remaining gap:** No proactive prompt to upload when Civic lookup fails — user must discover the `<details>` section themselves.
- STATUS: Backlog
<!-- card-id: 7f8a78f3-9ef9-4d6e-bb3a-af3df78b7e4e -->

**[idea] AI plain-language "what's at stake" for ballot measures — alongside the official text**
- Flagged 2026-06-07 — deferred by Muxin (verbatim measure body shipped in PR #65)
- Build on `race.measureBody` (official ballot summary now captured verbatim during extraction — `extract-prompt.ts` → `Race.measureBody`, rendered in `PropositionCard`, `src/prototype/VoterChoiceApp.tsx`).
- Add an AI-generated plain-language summary + "If yes / If no" outcomes, fed the captured `measure_text` as its source. **Hard constraint (Muxin): render the AI summary IN ADDITION to the verbatim official text — never hide or replace the original.**
- Needs an honesty guard (no claims beyond the source) and adds a summarization call + token cost. The existing `PROPOSITION_DETAIL` mock path already shows the summary + If-yes/If-no shape this would populate from real data.
- STATUS: Backlog
<!-- card-id: a0405729-9a8f-461e-8bfd-49b145752925 -->

**[P1] PDF OCR fallback fires but still surfaces "scanned" message in some cases**
- Instrumented 2026-05-19, awaiting Muxin retry with browser console
- Muxin retried a real PDF upload and still saw the "scanned image, paste text" error after the Tesseract.js OCR fallback was added. The OCR path is wired correctly (`extractPdfText` → `ocrPdfPages` on <50 chars) but either Tesseract threw on import, or all pages returned <50 chars of text, or the canvas rendering failed silently.
- **Instrumentation added (2026-05-19):**
  - `console.log("[pdf-extract] ...")` at OCR start, per-page (with canvas dimensions + text length), at OCR done.
  - Per-page try/catch — single bad page no longer aborts the whole doc.
  - Canvas dimensions logged + zero-size guard added.
  - `canvas.toDataURL("image/png")` passed to Tesseract instead of the raw canvas (Tesseract v5 picky-input mitigation).
  - Distinct error message `pdfOcrFailed` for "OCR threw" vs. `pdfScannedError` for "OCR ran but returned nothing."
- **Next step:** voter retries upload, reports browser-console logs. Based on what fails, either tune the OCR parameters (PSM mode, character whitelist, scale), preprocess the image (binarize/contrast), or accept OCR as best-effort and prioritize the paste-fallback path.
- STATUS: Backlog
<!-- card-id: b1a14253-12ad-4030-9446-f4275f3b4c24 -->

**[P2] Detector threshold tuning from production telemetry**
- By-design
- `extract.detector_decision` telemetry is logged for every routing decision. Once we have ~100 real ballots through the route, pull the logs and tune `EXTRACTION_DETECTOR_DICT_FLOOR` / `_VOCAB_FLOOR` / `_PROPER_NOUN_FLOOR` in Vercel env without redeploying.
- Defaults are 0.6 / 5 / 5; the right floor depends on what real ballots look like in pdfjs's output.
- STATUS: Backlog
<!-- card-id: 69ed6fcd-09d9-47cc-b64f-8157e046cb89 -->

**[P2] Progressive UX during multi-page extraction**
- Out-of-scope follow-up from PDF bakeoff decision.md
- Worst-case 14-page Hidalgo bilingual ballots take ~90s wall-clock even with per-page parallelism. A single spinner reads as broken.
- Stream race results into the UI as each page's Sonnet call returns — the route returns once all pages stitch, but the client can show "found 5 races so far…" instead of waiting silently.
- STATUS: Backlog
<!-- card-id: 0708be5c-b49f-4183-b165-aac379e131f1 -->

**[P2] Hash-based caching for repeat PDF uploads**
- Out-of-scope follow-up from PDF bakeoff decision.md
- If a voter uploads the same PDF twice (page reload, tab close), the route currently re-spends $0.04–$0.55 of Sonnet vision.
- Hash the PDF on upload, cache by hash → JSON result (Redis with 7d TTL). Saves cost + latency on repeat uploads. Out of scope for v1 ship.
- STATUS: Backlog
<!-- card-id: 25d56ebf-9589-4e75-a36e-cf9c9b4d78f8 -->

**[P2] Surface early-vote site addresses + precinct numbers from Google Civic**
- Flagged 2026-06-12 — residual lifted from two cards resolved 2026-06-10 (now in the archive): "[P1] Election DATA must cover ANY upcoming election" and "[P1] Printable ballot shows generic placeholders". DRAFT card — revise wording as needed.
- Remaining from the 2026-06-10 address-logistics work (branch claude/alignment-election-data-rules-smlqus): the congress-assessment flow surfaces real polling place/hours, but early-vote SITE addresses and precinct numbers are not yet pulled through from the Google Civic `voterinfo` response when it carries them.
- Populate them into the workspace bar + printable scorecard. Honesty bar: never show a site or precinct we didn't actually resolve.
- STATUS: Backlog
<!-- card-id: 937407c8-a38d-4a1e-bdb5-ba53460ecb14 -->

---

## Cross-cutting / Operations (any phase)

**[P1] No distinction between "not yet tagged" and "not an issue bill"**
- Flagged 2026-05-15
- Bills with zero `issue_tags` rows look identical in the DB whether they are:
  - Genuinely non-issue (procedural votes, budget line items, ceremonial resolutions, street renaming) — estimated ~30% of all bills
  - Legitimately untagged because the tagger hasn't reached them yet
- **Impact:** The 56.2% bill coverage figure overstates the gap. The real "taggable but untagged" figure is probably closer to 25–30%. Alignment scores for high-bill states (IL at 31.8%, TN at 35.6%) look sparse but some of that is structural.
- **Fix:** Add a `skip_reason` column to `bills` table (or a separate `bill_skips` table). When the tagger decides a bill is non-issue, record it explicitly. Then coverage reporting can separate "skipped non-issue" from "queued for tagging."
- **Tracking query:**
  ```sql
  SELECT COUNT(*) FROM bills b
  WHERE NOT EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id = b.id);
  -- Current: ~29,654 bills — mix of non-issue + untagged
  ```
- STATUS: To Do
<!-- card-id: 032d3451-cfa9-4dcf-b6e1-5d54bc82ab2c -->

**[P1] Confirm `ingest-states.yml` cron is actually firing from main**
- Partially resolved 2026-05-15; mechanism updated 2026-06-15
- **Resolved (mechanism):** `ingest-states.yml` now self-schedules on `main` (`schedule: cron "30 7 * * *"`, daily 07:30 UTC), sharding 10 states/day by day-of-month % 5 so all 50 cycle every 5 days within the 250 req/day OpenStates limit. The earlier cross-branch `dispatch-state-ingest.yml` dispatcher (which fired `workflow_dispatch` onto `launch/production`) no longer exists — `main` is the canonical deploy branch now, so the dispatcher is unnecessary.
- **Remaining (monitor):** confirm the on-`main` cron has actually been running and the downstream ingest succeeds — `gh run list --workflow=ingest-states.yml`. Close once a green run is verified.
- STATUS: To Do
<!-- card-id: f80ffd2b-5b5d-4274-bd1c-94b03784b5d5 -->

**[P2] `ingest-state-donors-monthly.yml` — ~21 states use best-effort download URLs**
- Flagged during build
- Several state donor download URLs were added as best-effort guesses without verification (AK, AR, CO, FL, HI, IN, KY, MA, MI, MN, MO, MS, NC, ND-cfis, NY, OH, OK, SC, TN, TX). These have `continue-on-error: true` and may silently fail on the monthly run.
- The existing donor data for these states is from the initial ingest and is correct; only future refreshes are at risk.
- **Fix:** Verify each URL manually before the first monthly run. Expected: June 2026.
- STATUS: To Do
<!-- card-id: bc0e3955-16ad-4ad6-ad31-2ea8d4f10ce2 -->

**[P2] Consolidate duplicate `AlignmentScore` type into one source of truth**
- Surfaced 2026-06-15 as a follow-up to the limited-data-notice wiring (the `kept: 0` card), which required editing the `AlignmentScore` shape in TWO places.
- `AlignmentScore` is defined twice: `src/lib/structured-blocks.ts` (server/canonical) and `src/prototype/realData.ts` (client prototype copy). Any field change must be made in both, so they can silently drift.
- **Fix:** one canonical definition (or a shared types module) that the other file imports — one source of truth for the data shape. Also covers the `redesign/delegationData.ts` consumer.
- **Constraint to respect:** the prototype is intentionally self-contained; confirm the import doesn't drag server-only code into the client bundle. Pick the canonical home accordingly.
- STATUS: To Do
<!-- card-id: dfc934fd-ade1-4974-b781-db1aa9b79419 -->

**[P1] Reframe product copy: "ballot research" → "Congress assessment"**
- Default live app is the Congress scorecard (ballot flow is behind BALLOT_ENABLED), but ~20 strings still pitch a "research your ballot / printable ballot to take to the polls" tool — copy describes a different product than what loads.
- Decide the canonical framing (e.g. "Assess your representatives with AI"), then update consistently across surfaces.
- Site metadata — src/app/layout.tsx: title, openGraph.title, twitter.title, and both descriptions ("Research your ballot with AI…"); drop "printable ballot to take to the polls".
- About page — src/app/about/page.tsx: "free, non-partisan ballot research tool" framing.
- In-app strings — VoterChoiceApp.tsx ("Issues you voted on" → "Issues you cared about"), DelegationWorkspace.tsx (scorecard back-labels), BudgetModal.tsx (privacy line).
- Factual fix bundled here: VoterChoiceApp lede "34 Senate seats are on the ballot" → "33".
- ~20 flagged locations from the 2026-06-15 copy audit; re-audit those files when implementing.
- STATUS: To Do
<!-- card-id: 26b49d49-8dfb-4dbd-ad19-d12046b7b802 -->

**Copy-accuracy cleanup — deferred wording calls**
- Real wording problems from the copy audit that each need a small judgment (not mechanical). ~22 items.
- Dead links: VoterChoiceApp.tsx href="#" anchors that go nowhere — point at real targets or remove.
- "Tap a bill →" → "Tap a vote →" (VoterChoiceApp).
- IssueConversation / HandoffModal: privacy + progress wording nuance.
- ByokCard: "Saved. Chat now uses your account." → clarify the retry step.
- EditIssuesModal: "Re-rank, rename, add" → also mention "remove".
- Concentrated in VoterChoiceApp.tsx (11), about/page (2), EditIssuesModal, ByokCard.
- STATUS: Review
<!-- card-id: 35ed3262-ec67-494c-9919-4dd719bfa9a1 -->

**Formatting / terminology consistency — deferred**
- Same concept named differently in different places — pick one term per concept. ~18 items from the copy audit.
- "Amend your issues" vs "Edit your issues" (EditIssuesModal) — standardize.
- Nav link ordering: AppNav vs in-page links (VoterChoiceApp).
- Eyebrow / kick label casing (PolisClose, RepCard confidence label).
- "Add something I forgot" → "Add something I missed" (IssueConversation).
- Spread across VoterChoiceApp.tsx (5), data.tsx (3), RepCard, PolisClose, IssueConversation.
- STATUS: In Progress
<!-- card-id: 0b7a6412-34b0-4274-83ec-b06a3ac3eb6c -->

**Integrate Congress.gov CRS bill summaries (free public-domain backup)**
- Free, public-domain backup for plain-language bill summaries — replaces CAN2026's summary need (per the [P0] Backup research, 2026-06-15).
- Source: Congress.gov API CRS summaries — endpoint /bill/{congress}/{type}/{number}/summaries; free api.data.gov key, ~5K req/hr; public domain, NO attribution strings.
- Hot fallback: GovInfo BILLSTATUS / BILLSUM bulk XML (identical CRS data) when the API is down.
- Caveats: in the 119th Congress CRS writes summaries for the INTRODUCED version only — some bills return empty, handle gracefully; summary text is HTML, sanitize before display; Congress.gov API had an undocumented multi-day outage (Aug 2025) with no SLA — cache aggressively.
- STATUS: To Do
<!-- card-id: e70d609d-9b4b-4ad1-971c-1fbcba09f7bc -->

**Synthesized "member's stated reason" vote-rationale layer**
- Build a clearly-labeled "why this member voted this way" layer. No FREE structured vote-rationale source exists (CQ Roll Call is the only true one and is enterprise-paywalled; ProPublica's API is dead) — so synthesize it.
- Approach: ingest Derek Willis's `congress-press` dataset (free bulk JSONL, 670K+ member press releases, daily updates, 2001-present); match releases to roll-call votes by bill number + date; optionally enrich with GovInfo Congressional Record floor statements; LLM-generate a plain-language "what the member said about this vote" blurb.
- Labeling: present as the member's STATED / inferred reasoning, source-linked — never as authoritative fact or a verified quote unless quoting verbatim.
- Caveats: coverage is structurally partial (members explain contested/messaging votes, rarely party-line or procedural ones); avoid Congressional Record "Personal Explanations" (those cover MISSED votes, ~half non-substantive); vet the congress-press license + underlying member-site ToS before redistribution.
- STATUS: To Do
<!-- card-id: f9cc6279-41ea-463b-a29c-3cf26f617396 -->

**Double-check CAN2026: review the site thoroughly, page by page**
- Confirm what data CAN2026 (can2026.org) actually provides by going through the site THOROUGHLY, page by page — the initial research only fetched the landing page and may have missed bill summaries / vote-rationale / useful supplemental data living in specific sub-pages.
- Context: the quick fetch read CAN2026 as a constitutional-oversight documentation archive ("no evaluative conclusions"), but Muxin recalls some relevant data existing in specific parts of the site. CAN2026 could still be useful SUPPLEMENTAL info even if it isn't the primary summary/rationale source.
- Deliverable: a page-by-page inventory of what CAN2026 offers (summaries? vote rationale? oversight records?), access/format, and whether/how it complements the free backups in cards A/B. Flag for user review before acting.
- STATUS: To Do
<!-- card-id: e55381e2-a02a-4b48-bb1f-4667108c7b38 -->

**[P2] Delete drifted legacy frontend (supersedes #27)**
- Flagged 2026-06-07; the app IS the prototype now
- `src/app/page.tsx` now renders `<VoterChoiceApp/>` directly; `src/app/PageContent.tsx`, `src/components/BallotToolClient.tsx`, and related pre-rebuild landing code are dead. Remove them in a dedicated cleanup pass (the stale landing tests were already rewritten to the new shell).
- Perf follow-up: `src/app/layout.tsx` loads 6 Google Font families via `<link>` for the in-app mood/palette switcher, but production hardcodes `data-mood='civic'` — consider trimming to the Civic families (IBM Plex Sans/Serif/Mono) for the prod default to cut font payload.
- STATUS: Done
<!-- card-id: f3bfe5e0-dc5e-403b-bc38-2306e5c0965f -->
