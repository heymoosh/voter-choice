<!-- last-archive: 2026-07-13T21:24:54.358671+00:00 -->

## Archived 2026-07-13T21:24:54.357024+00:00

**[P0] Golden-address alignment smoke test — fail when alignment silently goes blank (BUILD FIRST)**
- The 2026-06-26 prod incident (empty `DATABASE_URL` + unapplied migration lines) silently blanked ALL alignment and only surfaced via manual testing — e2e stayed green because it asserts UI structure, not real data. This card adds a test that fails when a known address returns empty alignment. Complements the schema-vs-migrations drift guard deferred in `claude-code-handoff/conductor-resume-2026-06-28.md`.
- Anchor on verified real data: John Cornyn (TX Senator) + `healthcare_affordability` — post-fix `lookupAlignment()` returns a non-empty result (≈18 healthcare votes observed at incident time). Assert `{ found: true, total >= 1, contributingVotes.length > 0 }` — a real WITH/AGAINST badge backed by actual votes, not just a rendered DOM node. `resolveCandidateId()` already handles "Cornyn."
- WHERE it must run: a PR-time test against a fresh CI DB would NOT catch this class (CI applies the migration → column exists → green, while prod sits behind). Run the assertion post-deploy against live prod, and/or add a deploy-time schema-vs-migrations drift check. A PR-time migrate+seed test only guards "code references a column no migration creates" — useful, but false confidence for THIS bug.
- Current e2e is 100% mock-based (no test DB), so this is NEW infra, not a quick add.
- DECISION (Muxin, 2026-06-28): build the deploy-time schema-vs-migrations drift check as the PRIMARY guard — cheapest, deterministic, and it targets this exact bug (prod sitting behind a migration). Layer the golden-address smoke (Cornyn / `healthcare_affordability` non-empty) on top as defense-in-depth once the drift check lands. (Alternatives weighed: post-deploy prod smoke — needs prod creds + a fail/rollback story; PR-time migrate+seed — cheapest but misses prod drift.)
- STATUS: Done
<!-- card-id: df3fc703-4cf5-41e7-a338-195645f1d5c9 -->

**[P1] EPIC: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)**
- User found the results page "extremely overwhelming" with no guidance: "I entered this page with no idea of what you wanted me
to do. While the information is there, it took me a long time to understand what you would like me as a user to do."
- Resolve in this session: guided onboarding into results, information hierarchy (visible vs. progressive-revealed), color scheme
/ visual activation, scorecard layout + print styling, left/right panel arrangement, progress indicators.
- Design anchor — the layout/hierarchy/flow/color cards below depend on it.
- 2026-06-17 UPDATE: **DESIGN IS DONE** — delivered as `claude-code-handoff/` (DECISIONS.md + README.md + screens-*.jsx; Bold Flag palette). The design pass RESOLVES this anchor + ~18 UX cards. **IMPLEMENTATION is tracked by the EPIC card "Implement the Keystone redesign" and is BACKEND-GATED per surface** — the head-to-head, Polis report, funding-detail, and bill-detail surfaces depend on new backend (researched scoring f52273a5, Polis per-session data, chamber-median, tally/status) and must show honest "not available yet" states until that data exists. So the redesign cannot be marked *complete* until the backend track lands.
- STATUS: Done
<!-- card-id: e688d5a6-78fa-4e30-a31d-e5039ab31a9f -->

**[P1] Spanish translation covers only the top bar**
- "Spanish translation only translates top bar"
- i18n bug — es strings exist in `src/lib/translations.ts` but aren't applied to the app body. Mechanical, not design-coupled.
- NOTE: prerequisite to "[P1] Translations to major languages" — confirm dependency direction at grooming.
- DONE (2026-07-01): the app-body wiring shipped in PR #168 (merged to main, squash 0b57244) — the inline TRANSLATIONS body copy is now applied. Follow-on surfaces tracked by "Finish Spanish coverage for remaining redesign surfaces". Flipped Review→Done for board accuracy (was stale).
- STATUS: Done
<!-- card-id: d8059e2e-2cfd-4933-b2e9-fc3012ebb591 -->

**Wire "Export profile" in the App2 settings drawer**
- The settings drawer's Export button is inert in App2 (handler passed undefined). Adapt VoterChoiceApp's handleExportProfile to the App2 data model. (Surfaced building PR #169.)
- CLOSED (2026-07-01, Muxin): WON'T DO — the redesign deliberately dropped profile export and the HandoffModal already provides a scorecard `.txt` export (`buildScorecardHandoffPrompt`). App2 also has no settings drawer today (`openSettings` is a no-op). Superseded by the scorecard export; not re-adding a separate Export profile.
- STATUS: Done
- DEPENDS ON: Settings button has no functionality
<!-- card-id: 79cfa416-df1d-4059-8f30-06bee50455fc -->

**[P2] Reconsider color scheme for emotional activation**
- "I think the color scheme is too subdued. You want to activate people. I think US Flag colors or variations therefore could
really bring the concept home."
- FOLDED 2026-06-26 (Muxin): the design session already answered this — the Bold Flag palette IS the flag-forward / emotional-activation color system. Tracked by the "Implement the Keystone redesign" EPIC (palette = default); no standalone color work. Closed.
- STATUS: Done
<!-- card-id: ffb7a832-6284-4f6d-92f3-497dee03c62a -->

**[P1] Chat fails when community budget used up - unclear**
- After entering address, when sharing details about issues user cares about: An error message in small red text is displayed when community budget is completely used up (API calls Haiku for chatbot).
- This is unclear and doesn’t help the user: Understand why this is happening, or how to resolve it.
- The message needs to be much more clear that the budget is used up and resets (when) - and how to proceed if they want to use it ASAP (use their own API key). A CTA to the tip jar (secondary) to support others to keep using the website.
- STATUS: Done
<!-- card-id: 3fcf5217-758c-497b-aae4-69133fcf0b78 -->

**[P2] President/VP candidate card design does not match the standard card design**
- Flagged 2026-06-07, from FL ballot preview test
- The President & Vice President candidate card renders with a visibly different design from the other candidate cards.
- All candidate cards should share the exact same design/layout regardless of data mode (voting-record vs `web_search` "based on public statements" vs no-record). Audit `CandidateCard` in `src/prototype/VoterChoiceApp.tsx` so the modes are visually consistent. Presidential candidates
- STATUS: Done
<!-- card-id: 31145699-6396-44b3-915c-c30976551085 -->

**[P0] Design Candidates UX flow**
- Design is settled — see claude-code-handoff/design-session/screens-candidates.jsx + candidates.css; DECISIONS.md "Session 2" down-selected B · dedicated head-to-head (full-screen duel, challenger switcher, per-issue Δ ledger, Keep/Replace at foot). Do not port; use the design provided.
- When user decides to replace a rep, what happens?
- Right now, candidates are simply listed below the rep if they are running for the seat.
- STATUS: Done
<!-- card-id: 6a1fb1fb-b93b-46e7-a2c4-1101a92be631 -->

**[P2] React duplicate-key warnings in issue list + prior-session seed**
  - Found 2026-06-16 (Muxin, during #134 review). Two console errors:
  - (a) `same key, 'AI safety, extreme wealth inequality, and lack of universal healthcare.'` — an issue concern/sourceText string
  used directly as a React key. Candidate sites: PolisClose.tsx:195 & :254 (`key={s.canonicalIssue}`), DelegationWorkspace.tsx:360,
  RepCard.tsx:179.
  - (b) `same key, '(prior session)'` — IssueConversation.tsx:68 sets every prior-session-seeded issue's sourceText to the literal
  "(prior session)"; if that feeds a list key, all seeded issues collide.
  - Impact: React drops/duplicates non-unique-keyed children → likely the proximate cause of the P1 above.
  - Fix: key every row by a stable unique id, never the concern text or the "(prior session)" literal.
- RESOLVED by PR #172 — MERGED 2026-07-01 (stable React keys; subsumed this card).
- STATUS: Done
<!-- card-id: 08e091a4-65ab-45b8-96c9-7b384ff46a43 -->

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
- ✅ DONE 2026-06-26 — LIVE & verified: rows persist for both the mapped-issue and off-topic-label paths, with only the 9 privacy-safe columns. Root cause was THREE compounding prod-config gaps, all fixed: (1) `VOTER_ISSUE_EVENTS_ENABLED` existed but was set to an EMPTY value (gate is `=== "true"`); (2) Vercel prod `DATABASE_URL` was EMPTY → the live app had no DB connection at runtime (`getDb()`→not-configured → silent return); (3) prod `voter_issue_events` lacked the `sub_issue` column — 0006's two `voter_issue_events` lines (column + index) applied to the production branch 2026-06-26. KEY gotcha: `vercel redeploy` reuses the original deployment's env snapshot — a fresh `vercel --prod` is required for env changes to take effect.
- STATUS: Done
<!-- card-id: 39a6b6e3-2a1c-4277-a295-b1cf44e3a6d6 -->

**[P0] Remove Fed Both and State labels from Issues**
- These tags labeled ‘both’ or ‘fed’ on Your Issues (on the screen where you evaluate candidates) are confusing - just remove the little tags entirely, not needed.
- STATUS: Done
<!-- card-id: e2d2a7a0-e314-4d47-a402-08e0fff9f672 -->

**[P1] Surface the bill summary in the vote detail (plumb bills.summary → narrative)**
- 2026-06-16 (Muxin, during #133 review). #133 fills `bills.summary` from CRS, but the contributing-vote "What it did" narrative
(`ContributingVote.narrative`, `src/lib/server/alignment.ts`) reads from `can_bill_narratives` (CAN2026, gated behind
`CAN2026_DISPLAY_ENABLED`) — never from `bills.summary`. So the CRS summary lands in the DB unused.
- Fix: in the alignment builder, fall back to `bills.summary` (CRS, public-domain, ungated) for `narrative` when no CAN2026 row
exists; label/append Congress.gov to the vote's sources. Result: bill detail shows summary + how-they-voted + sources, even while
CAN2026 stays gated.
- STATUS: Done
- DEPENDS ON: Integrate Congress.gov CRS bill summaries
<!-- card-id: a06450b8-ae7d-4e6f-8ad5-23cf5c02f42d -->

**[P0] Fix Edit Issues Conversation Flow**
- It took 6+ annoying turns to get the chatbot to take ‘congressional accountability’ because it would keep asking for disambiguation
- If it’s not in our database, flag it and ask for at most 2 clarifying questions, then lock in the users’ responses (all of them) to help us ID and tag bills
- STATUS: Done
<!-- card-id: 6cdedfa6-406c-4197-83af-cea6cd69d702 -->

**[P2] Implement the GovInfo BILLSUM fallback for CRS summaries**
- 2026-06-16 (follow-up to #133). `crs-summaries.ts` has `fetchCrsSummaryGovInfoFallback()` STUBBED (returns null), called when
the Congress.gov primary returns null. Implement it against GovInfo BILLSTATUS/BILLSUM bulk XML so an extended Congress.gov outage
doesn't blank federal bill summaries. Lightweight XML parse of the summaries element; cache aggressively.
- STATUS: Done
- DEPENDS ON: Integrate Congress.gov CRS bill summaries
<!-- card-id: 0f890cb0-3dba-40fb-be37-ac0df377286a -->

**[P2] Wire the batch tagger path to record skip_reason**
- 2026-06-16 (follow-up to #132). The realtime tagger (`scripts/ingest/tag-bills.ts` → `processBill`) now sets `bills.skip_reason`
when a bill returns zero tags, but the **batch** path (`scripts/ingest/tag-bills-batch.ts` → `processResults`, which processes
Anthropic batch-API results) does NOT. Bills tagged via the batch path won't get a skip_reason, so they stay indistinguishable
from "queued for tagging."
- Fix: call `inferSkipReason()` + `recordSkipReason()` from the batch `processResults` path when a bill's result yields zero valid
tags, mirroring the realtime path; add `billsSkipReasonWritten` to the batch counters/summary.
- STATUS: Done
- DEPENDS ON: No distinction between "not yet tagged" and "not an issue bill"
<!-- card-id: d1592733-9fc6-4b4c-adc2-f8b444872d23 -->

**[P1] Redesign Polis for effect**
- Design direction lives in claude-code-handoff/design-session/DECISIONS.md (Polis: out of the per-seat flow; standalone placement is still its own session). The old voter-choice-redesign-delta folder is gone — do not port; use the design provided.
- Too tiny, too small, too off the side
- Not impactful enough: We want to depolarize, and this is a thin scatterplot that’s not only hard to read but hard to care about
- STATUS: Done
<!-- card-id: bc774728-5153-409e-a13a-a8207dad0836 -->

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

**[P1] Alignment 2b — in-chat pole disambiguation (not a theme-card)**
- 2026-06-16 (Muxin): handle contested-issue side-picking IN the intake chat, not a separate theme-card UI. Builds on #130
(axis_type-driven stance), which currently gives an honest no-score when a contested concern comes in with no side.
- Behavior: when a contested concern arrives neutral (the case #130 omits), the intake conversation ASKS a disambiguation question
instead of silently no-scoring. The question LEADS with what's in our DB — poleVocabulary's per-issue neutral question + its two
pole labels / nearest canonical issues — AND ends open-ended ("…or is it something else?"), so the voter isn't boxed into our
buckets.
- Matching: if the answer maps to a canonical issue/pole → set the stance and score against it. If it does NOT map → store the
concern via the existing voter-issue storage / counters so the unmatched input feeds future tagging (this is why we store issue
data).
- Scope: theme-refinement.ts already gets #130's [contested]/[valence] tags (shared block), so it knows which concerns to
disambiguate; wire poleVocabulary's `disambiguation` question + pole labels into the chat turn and parse the answer back to a
stance. No new theme-card component.
- Supersedes & replaces the old "Alignment 2b — in-chat pole disambiguation (not a theme-card)" card.
- STATUS: Done
- DEPENDS ON: Alignment 2a — data-driven disambiguation trigger
<!-- card-id: c6f8727b-0f81-4307-8451-35a399ba5f4b -->

**[P2] Alignment 4 — per-vote rationale field (design-only, from ALIGNMENT_DATA_MODEL.md)**
- Flagged 2026-06-15 — handoff item 4, no prior card.
- A per-contributing-vote rationale on `ContributingVote` / `AlignmentResult` (`src/lib/server/alignment.ts`), surfaced in `AlignmentDrilldown`. Where CAN curated context covers the vote (`can_candidate_key_votes.context`), populate from that prose. (Docs renamed "bridge" → "vote rationale" to avoid colliding with the Polis "bridge statements"; settled in docs, absent from code.)
- Additive; effectively depends on CAN data being displayed (see the CAN2026 display gate, blocked on attribution terms).
- CLOSED 2026-06-25 (Muxin): CAN context source confirmed dead (CAN2026 browser crawl → zero ingestable data, card e55381e2). Per-vote rationale is now delivered by the synthesized "member's stated reason" layer (PR #145, merged) surfaced via the Unified vote explainer (8ea00aad) — this card is redundant. Closed.
- STATUS: Done
<!-- card-id: 4d2fa4a5-3ee1-4038-8994-c7d489e62000 -->

**[P2] `crime_public_safety` and `public_safety` — keep distinct, or deliberately merge? (Muxin call)**
- Flagged 2026-05-15. **Reframed 2026-06-15 (pole-anchor work, PR #114):** these are NOT simply "redundant." `docs/alignment/POLE_VOCABULARY.md` + `src/lib/alignment/poleVocabulary.ts` now define them as **distinct axes** — `public_safety` = policing / use-of-force (police funding, enforcement powers, qualified immunity, accountability); `crime_public_safety` = sentencing / charging / incarceration (mandatory minimums, bail, sentencing reform, reentry) — with an explicit "do NOT cross-tag the same provision under both" rule.
- (Tag counts 5,499 / 3,800 are pre-cutover 2026-05-15; the 2026-06-06 re-tag changed totals.)
- So this is no longer an automatic "consolidate." Whether to MERGE into one parent with sub-issues is handoff **item 3** — a deliberate, validated mini-cutover (touches `canonicalIssues.ts` + the pole vocab + a targeted re-tag), not a rename-in-place. Decide intent first.
- **DECIDED 2026-06-17 (Muxin): KEEP DISTINCT** (status quo) — two separate top-level issues, no merge, no re-tag. Preserves the policing-vs-sentencing signal (#114). If hierarchical sub-issues roll out more broadly later (extending the healthcare pilot), revisit folding both under a "Crime & Public Safety" parent then.
- STATUS: Done
<!-- card-id: aab02053-d7dc-41ad-8984-570b6f1a9085 -->

**[P2] Sub-issue v2 — refine `coverage_access` before tagging it**
- **Plain English:** We split healthcare into 5 mini-topics. Four are sharp; the 5th — insurance/coverage — turned out to be a catch-all mush, so we left it OFF (those questions just use the old broad score — no worse than before). This card = sharpen "coverage" (or split it into Medicaid / Obamacare / uninsured), re-check, then switch it on.
- Flagged 2026-06-15, from the healthcare sub-issue pilot (PR #117) gold panel.
- `coverage_access` was the ONE facet the 3-juror Opus panel could not confirm — only **43% agreement even on the tagger's HIGH-confidence assignments** (vs 92–100% for `drug_prices` / `provider_costs` / `senior_care` / `mental_behavioral_health`). The tagger applies it to broad ACA / Medicaid / structural healthcare bills the panel reads as "general," not a specific facet. Zero wrong-facet contradictions — errors are "facet vs. general," so it was safe but imprecise.
- **Cutover decision (Muxin): shipped NULL** — no `coverage_access` rows on prod, so those concerns fall back to parent-level scoring (never worse). Re-enable only after tightening.
- **Fix:** tighten the `coverage_access` definition / `billSignals` in `src/lib/alignment/subIssues.ts` (+ `docs/alignment/SUB_ISSUE_VOCABULARY.md`), and/or SPLIT it (e.g. `medicaid` vs `aca_marketplace` vs `the_uninsured`); then re-run the healthcare-scoped `_subissue-*` re-tag + gold gate and insert the passing facet(s). Also reconsider whether to ship the medium-confidence tail of the 4 live facets (currently HIGH-conf only — 912 rows; ~2,449 medium/low left NULL).
- STATUS: Done
<!-- card-id: 5d23faba-728a-4c32-a7d1-91878b4711c8 -->

**[P1] Alignment 2a — data-driven disambiguation trigger (axis_type, not the LLM's confidence)**
- Flagged 2026-06-15 — direct follow-up to the Item-1 pole anchor (PR #114), which now exposes per-issue `axis_type` (12 contested / 4 valence).
- **The live bug:** `src/lib/prompts/theme-extraction.ts` `THEME_FIELDS_PROMPT_BLOCK` tells the model "Most priorities are aspirational → in_favor." For a **contested** issue + a value-only concern ("I care about guns", "I care about my kid's education"), the model silently assigns `in_favor` (= the Pole-A side — e.g. gun *access*, fossil energy, school *choice*) and scores against a guessed pole. 12 of 16 issues are contested, so this is the central case, not an edge.
- **Fix:** drive the stance decision off `axis_type` from `poleVocabulary.ts`. For a contested issue whose concern doesn't pick a side, OMIT the stance (honest no-score) instead of defaulting to `in_favor`; for `valence_dominant`, keep matching the consensus pole. Prompt-behavior change in `theme-extraction.ts` (+ `theme-refinement.ts`, which shares the block). No new UI. NOTE: Item 1 deliberately left this heuristic unchanged.
- **Caveat:** without 2b, a contested value-only concern then yields no alignment score (better than a wrong one) until the voter states a side. Best paired with 2b.
- STATUS: Done
<!-- card-id: d04b101f-123a-43c7-a874-396386ac44ed -->

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

**[idea] Polis viz no longer gated on participation threshold**
- Flagged 2026-05-18 — design + QA tooling
- **Resolved by removing the gate (PR #116, 2026-06-15):** the original concern was that low-participation jurisdictions saw NO Polis viz (the old `thresholdMet` / 200-user minimum hid it). Rather than build a mock-data "preview mode" to work around the gate, the participation threshold was **removed entirely** — the party-free overlap cloud now renders for everyone regardless of participant count, so there is no longer a blocked state to preview around. This is the desired behavior.
- The originally-proposed `?devPolis=1` / `NEXT_PUBLIC_DEV_POLIS` mock-data path was therefore **never built and is not needed** (those flags do not exist in code).
- STATUS: Done
<!-- card-id: b762fd4e-2525-4b59-a4f9-6baafc2988ba -->

**[P1] Hardcoded location/state data still leaks into the UI — make EVERYTHING address-derived**
- Flagged 2026-06-05, from Muxin's preview test
- Same class as the F12 "hardcoded Texas" fix, but more instances remain. On a NEW JERSEY address the UI still showed Texas/Harris-County leftovers: the left-panel footer link **"See party-gate (TX primary)"**, and the election-info "Show details" panel **"SOURCE · HARRIS COUNTY ELECTIONS"**.
- **Requirement (Muxin):** ALL locations, states, counties, jurisdictions, election-types must be variables populated after we ingest the address + ballot — never hardcoded.
- **Action:** sweep UI + data layers for literal "TX"/"Texas"/"Harris"/"primary"/county/state constants and replace each with an address/ballot-derived value. The "See party-gate (TX primary)" link is a dev affordance — remove or make dynamic for production.
- STATUS: Done
<!-- card-id: 054cbdca-c250-4634-b5e3-916a25d5e584 -->

**[P0] F02 — Mutable expected-congressional-contest calendar oracle**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- PLAN: docs/operations/nationwide-congressional-roster-plan.md
- OUTCOME: Model effective-dated exact federal contests and calendar revisions, so sources and the application cannot confuse election stage, date changes, regular/special contests, Senate seats, or conditional runoffs.
- IN SCOPE: Calendar/contest contract, revision behavior, and a verifier command. Alabama’s 2026 district split is a permanent regression: Senate and CDs 3/4/5 primary 2026-05-19; CDs 1/2/6/7 primary 2026-08-11.
- OUT OF SCOPE: Live source collection, candidate ingestion, database migrations, external provisioning, schedules, production mutation, and Ballotpedia scraping.
- SAFETY: FEC/state date conflicts must enter review and may never silently overwrite authoritative state evidence. State logistics JSON cannot be the contest oracle.
- TESTS: Focused calendar tests for Alabama split, stable identity across revisions, FEC/state conflict, regular/special separation, and untriggered conditional runoffs.
- GOAL_CONDITION: Focused calendar tests and `npm run verify:congressional-calendar -- --year 2026 --fixture al-split` pass, followed by `npm run check`.
- SHIP: auto-pending-merge
- PR: https://github.com/heymoosh/voter-choice/pull/301
- STATUS: Done
- DECISION: approved — non-visual, additive foundation work; no external provisioning or production mutation.
- GROOMED: ready: explicit scope, tests, and goal condition; parallel Wave 1 foundation — 2026-07-13
- LANE: roster-b
<!-- card-id: 852f0b20-69b8-4429-9ac5-6fbdb425132f -->

**[P0] F01 — Congressional official-source inventory contract and verifier**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- PLAN: docs/operations/nationwide-congressional-roster-plan.md
- OUTCOME: Define and validate a versioned official-source record for every required jurisdiction and contest-source field, including authority, access constraints, parser mode, cadence, coverage state, and evidence.
- IN SCOPE: Contract/types, fixture-backed validator, and the source-inventory verification command. The inventory must make missing, blocked, manual-import, and not-yet-published states explicit; it must never permit an unknown jurisdiction omission.
- OUT OF SCOPE: Live national source collection, roster ingestion, database migrations, secrets, schedules, production mutation, or Ballotpedia scraping.
- SOURCE RULE: Use the FEC state-election-office directory only as a starting directory; state election authorities remain the roster authority. Do not bypass access controls.
- TESTS: Focused contract/validator tests; fixtures covering every coverage state and rejected incomplete/invalid records.
- GOAL_CONDITION: Focused source-inventory tests and `npm run verify:congressional-source-inventory -- --fixtures` pass, followed by `npm run check`.
- SHIP: auto-pending-merge
- PR: https://github.com/heymoosh/voter-choice/pull/300
- STATUS: Done
- DECISION: approved — non-visual, additive foundation work; no external provisioning or production mutation.
- GROOMED: ready: explicit scope, tests, and goal condition; independent Wave 1 foundation — 2026-07-13
- LANE: roster-a
<!-- card-id: 42152a2c-ab16-4590-a03b-19f8c05b365d -->

**[P3] President/VP blind-mode redaction uses a raw last-name split (ticket names)**
- Surfaced 2026-06-30 reviewing PR #174. `RepCard.tsx:620,623` derive the blind-mode redacted last name via `cand.name?.split(" ").pop()`, which yields "Vance" not "Trump" for a President/VP ticket. PR #174 fixed the visible card header (`VoterChoiceApp.tsx`) but not these RepCard call sites.
- Fix: derive the ticket's primary last name consistently for blind-mode redaction. Low priority — only matters if blind-mode shows on the President/VP card.
- CLOSED (2026-07-01, Muxin): NOT APPLICABLE — RepCard is the redesign component and the redesign path (App2 → /api/delegation) renders only U.S. House/Senate seats; a President/VP "A / B" ticket never routes through RepCard, so `split(" ").pop()` already returns the correct last name there. Dead-code hardening with no observable behavior — closing.
- STATUS: Done
<!-- card-id: 1309dd21-4116-4230-b270-fb83c26312de -->

**[P1] BACKEND: Polis report data — per-session response vectors + clustering**
- Gates the redesigned Polis REPORT (claude-code-handoff/screens-polis.jsx PolisReport). The new report leads with a PCA-style cluster map ('voters who answer alike sit together'), shows consensus statements that cleared 60%+ in EVERY cluster, and an honest 'divided' state.
- BLOCKER: our Polis currently stores only party x issue MARGINALS, not per-session answer vectors — so we cannot cluster. Needs: (a) store de-identified per-session response vectors, (b) PCA-style clustering, (c) per-group 60%+ consensus + divided-state logic. (Same schema gap flagged in the Phase-1 Polis viz work; bridges endpoint returns [] until this lands.)
- Privacy: de-identified aggregates only; never name who voted which way (design neutrality contract).
- STATUS: Done
<!-- card-id: 1d3d1843-34ed-4c66-ba9e-e20707900ed0 -->

**[P1] Header links unreachable on mobile after footer strip**
- Surfaced by PR #166 (header/footer consolidation).
- A pre-existing rule `.app-nav .links { display: none }` at <=767px hides the header link group. With the footer stripped to brand + copyright, Privacy / Support / About become unreachable on mobile.
- Add a mobile nav affordance (hamburger / overflow menu) so those links stay reachable on small screens. Applies to whichever nav design lands (#154 or #166).
- CLOSED (2026-07-01, Muxin): ALREADY FIXED by merged PR #166 — the same commit removed the `.app-nav .links { display:none }` rule and wraps the link group to a full-width second row at <=767px, so Privacy/About/Support are reachable on mobile today (verified on origin/main). Optional quick mobile spot-check.
- STATUS: Done
<!-- card-id: 23687b66-d005-44dd-86a3-d93664160f9b -->

**[P2] Remove dead Bitwarden DATABASE_URL fetch in deploy.yml**
- - Follow-up from the deploy.yml DATABASE_URL fix (02686df1). After dropping the `set_env DATABASE_URL "$DATABASE_URL"` push line, the workflow's "Pull secrets" step (deploy.yml ~lines 69-71) still fetches `DATABASE_URL` from Bitwarden Secrets Manager (secret id 90abeeed-130e-4707-86ff-b446003770c2) into `$GITHUB_ENV`, but nothing consumes it anymore (the test job at ~line 44 runs before the pull).
- ACTION: remove the dead Bitwarden DATABASE_URL fetch so CI stops pulling a prod DB secret it no longer uses. Verify no other step consumes `$DATABASE_URL` first.
- Low risk, cleanup-only. Blocked on the parent PR landing so the diffs don't conflict.
- CLOSED 2026-07-01 — OBSOLETE, do NOT do. Premise flipped: main's deploy.yml (~lines 77-83) now runs `check-schema-drift.ts --require-db`, which CONSUMES this `DATABASE_URL` from `$GITHUB_ENV`. The fetch is no longer dead — removing it would fail every deploy (--require-db fails on a missing DATABASE_URL). (This branch is 4 commits behind main, which added the gate.)
- STATUS: Done
<!-- card-id: babd56b0-73ff-4928-9f8f-c4e08bb4610f -->

**[P1] Make the schema-drift check a hard deploy gate (DATABASE_URL secret + prod audit + --require-db)**
- PR #179 added scripts/ops/check-schema-drift.ts wired into deploy.yml. As shipped it fails the deploy ONLY when DATABASE_URL resolves AND drift exists; it self-skips (exit 0) when DATABASE_URL is empty so it can never break a deploy today.
- To make it a real, always-on gate: (1) confirm the deploy job actually populates DATABASE_URL (deploy.yml pulls secrets from Bitwarden into $GITHUB_ENV above the step — verify the value is non-empty in a deploy run); (2) run a ONE-TIME prod drift audit first — DATABASE_URL=<prod-neon> npx tsx scripts/ops/check-schema-drift.ts — and confirm zero drift before flipping it on (else the next deploy fails by design); (3) add --require-db to the deploy step so a missing secret is a hard failure rather than a silent skip.
- Optional hardening (low priority): the parser ignores ALTER ... ADD CONSTRAINT and does not flag DB-only extra objects (it is fail-closed on unparsed schema-DECLARING statements, which is the important case). A future version could surface unexpected divergence.
- STATUS: Done
<!-- card-id: aadd9bec-9db1-4ab0-bf97-7d429f0ac773 -->

**Double-check CAN2026: review the site thoroughly, page by page**
- Confirm what data CAN2026 (can2026.org) actually provides by going through the site THOROUGHLY, page by page — the initial research only fetched the landing page and may have missed bill summaries / vote-rationale / useful supplemental data living in specific sub-pages.
- Context: the quick fetch read CAN2026 as a constitutional-oversight documentation archive ("no evaluative conclusions"), but Muxin recalls some relevant data existing in specific parts of the site. CAN2026 could still be useful SUPPLEMENTAL info even if it isn't the primary summary/rationale source.
- Deliverable: a page-by-page inventory of what CAN2026 offers (summaries? vote rationale? oversight records?), access/format, and whether/how it complements the free backups in cards A/B. Flag for user review before acting.
- 2026-06-17 UPDATE: first pass (WebFetch) delivered a partial inventory but is NOT exhaustive — WebFetch CANNOT render the JS pages, so `/government-record` (the main data index) and `/2026-elections` were never actually loaded. REMAINING WORK = a real browser crawl (Playwright / headless, renders JS) that clicks every page, especially `/government-record`, to definitively determine if CAN has ingestable vote/rationale/bill data. KEY FACT (prod DB queried 2026-06-17): `can_candidate_key_votes` = 0 rows and `can_bill_narratives` = 0 rows — we have ingested ZERO CAN data, so this is purely about whether the SITE has anything worth a future ingest. This gates the #139 keep/close decision (gated per-vote rationale reads `can_candidate_key_votes.context`, currently empty).
- STATUS: Done
<!-- card-id: e55381e2-a02a-4b48-bb1f-4667108c7b38 -->

**[P1] BACKEND: Chamber-median FEC funding aggregate (per chamber/cycle)**
- Gates the redesign's funding comparison ('~3x the median House campaign' — design_handoff README 8.1, funding.chamberMedian).
- Compute median total raised per chamber per cycle from existing FEC donor data; expose on the seat. Comparison is chamber-median, NOT challenger-based (can't know a challenger before one is selected to compare). Used by the FunderPanel funding-detail expansion.
- STATUS: Done
<!-- card-id: 676bda25-cb71-4c7f-9e28-fcf34f686693 -->

**Synthesized "member's stated reason" vote-rationale layer**
- Build a clearly-labeled "why this member voted this way" layer. No FREE structured vote-rationale source exists (CQ Roll Call is the only true one and is enterprise-paywalled; ProPublica's API is dead) — so synthesize it.
- Approach: ingest Derek Willis's `congress-press` dataset (free bulk JSONL, 670K+ member press releases, daily updates, 2001-present); match releases to roll-call votes by bill number + date; optionally enrich with GovInfo Congressional Record floor statements; LLM-generate a plain-language "what the member said about this vote" blurb.
- Labeling: present as the member's STATED / inferred reasoning, source-linked — never as authoritative fact or a verified quote unless quoting verbatim.
- Caveats: coverage is structurally partial (members explain contested/messaging votes, rarely party-line or procedural ones); avoid Congressional Record "Personal Explanations" (those cover MISSED votes, ~half non-substantive); vet the congress-press license + underlying member-site ToS before redistribution.
- ✅ LEGAL PRE-APPROVED (2026-06-17, Muxin — FAIL-OPEN): PROCEED with ingestion + display UNLESS the legal finding (9a53647e) returns `VERDICT: BLOCKER` (an explicit redistribution prohibition / paid-license requirement). If it returns `ATTRIBUTION-REQUIRED`, IMPLEMENT the stated citation/attribution (source links + the required credit) and proceed. If `CLEAR`, just proceed. Do NOT block on ambiguity — default to proceed. Still runs AFTER 9a53647e (so it picks up any attribution requirement first). Generation via Claude Code subscription subagents (not metered API).
- STATUS: Done
- DEPENDS ON: Legal: clear congress-press dataset + member-site ToS for vote rationale
<!-- card-id: f9cc6279-41ea-463b-a29c-3cf26f617396 -->

**[P1] BACKEND: Roll-call tally + bill status ingest (vote.tally / vote.status)**
- Gates the redesign's bill-detail surface (design_handoff README 8.1): vote.tally ('Passed House 232-193') and vote.status ('Passed House, stalled in Senate'). We ingest the member's vote_cast but NOT the overall roll-call tally or bill lifecycle status.
- Ingest from Congress.gov / GovTrack: per-vote tally + bill status. Honest fallback (hide the line) where unavailable.
- STATUS: Done
<!-- card-id: f1e99999-0ccf-46a6-805e-ca60f414162c -->

**[P1] Issue extraction bundles multi-concern input into one issue (regression from #114)**
- BUG (reported 2026-06-17, Muxin, live review): a compound first message e.g. "AI safety and healthcare insurance costs" yields ONE issue named the literal phrase, instead of splitting into separate issues. The combined string matches no canonical issue -> "no voting record data for this topic" -> breaks vote evaluation. User: "it used to split and now bundles."
- ROOT CAUSE: `src/lib/prompts/theme-extraction.ts` allows splitting (1-5 themes) but has NO explicit rule to split a compound input. Regression correlates with PR #114 (c864a87), which appended the POLE DIRECTIONS block to CANONICAL_ISSUES_PROMPT_BLOCK -> makes canonical mapping feel load-bearing, so the model collapses compound input into one literal-named theme, especially when one concern ("AI safety") has no canonical id.
- FIX (minimal, prompt-behavioral -> verify LIVE): add an explicit split rule to the Rules block ('if the voter names multiple distinct concerns, emit a separate theme for each, even if one has no canonicalIssue'); regenerate theme-extraction golden; add a multi-issue extraction test.
- SEVERITY: high - every multi-concern cold-open input (very common: 'guns and abortion', 'housing and climate') currently breaks. Primary intake flow.
- RELATED: cousin of #138 (theme-refinement). SECONDARY taxonomy question (separate): 'AI safety' maps to no canonical issue -> even split it shows 'no data'; consider adding an AI/tech canonical issue.
- STATUS: Done
<!-- card-id: 31942302-b656-49a2-9ad8-53a2c2707564 -->

**Legal: clear congress-press dataset + member-site ToS for vote rationale**
- Gate before any press-release-derived vote rationale ships — blocks the rationale layer (f9cc6279).
- Vet (a) Derek Willis `congress-press` dataset license and (b) the underlying member-site terms of use, for our ingest + LLM synthesis + display-with-attribution.
- Context: members' press releases are public statements on official .gov sites (federal works are generally public-domain), but confirm the compiled dataset's license permits redistribution and that showing synthesized summaries with source links is OK. Low-but-nonzero risk; a due-diligence pass, not a big legal project.
- TASK (not Muxin-owned): conductor/subagent drafts a first-pass read — find + summarize the `congress-press` dataset's stated license/terms, spot-check a few member-site ToS.
- DECISION FRONT-LOADED (2026-06-17, Muxin — FAIL-OPEN): output a STRUCTURED verdict line — `VERDICT: CLEAR` | `VERDICT: ATTRIBUTION-REQUIRED — <exact requirement, e.g. how to credit congress-press / the member sites>` | `VERDICT: BLOCKER — <explicit prohibition / paid license>`. Muxin pre-approves proceeding on CLEAR or ATTRIBUTION-REQUIRED (the rationale layer f9cc6279 implements the attribution); ONLY a hard BLOCKER stops the rationale work. Do NOT escalate ambiguity — default to proceed. The finding feeds f9cc6279's attribution + is recorded in the morning summary.
- STATUS: Done
<!-- card-id: 9a53647e-36c5-420c-b00c-e2e76d99d551 -->

**[P2] `ingest-state-donors-monthly.yml` — ~21 states use best-effort download URLs**
- Flagged during build
- Several state donor download URLs were added as best-effort guesses without verification (AK, AR, CO, FL, HI, IN, KY, MA, MI, MN, MO, MS, NC, ND-cfis, NY, OH, OK, SC, TN, TX). These have `continue-on-error: true` and may silently fail on the monthly run.
- The existing donor data for these states is from the initial ingest and is correct; only future refreshes are at risk.
- **Fix:** Verify each URL manually before the first monthly run. Expected: June 2026.
- STATUS: Done
<!-- card-id: bc0e3955-16ad-4ad6-ad31-2ea8d4f10ce2 -->

**Integrate Congress.gov CRS bill summaries (free public-domain backup)**
- Free, public-domain backup for plain-language bill summaries — replaces CAN2026's summary need (per the [P0] Backup research, 2026-06-15).
- Source: Congress.gov API CRS summaries — endpoint /bill/{congress}/{type}/{number}/summaries; free api.data.gov key, ~5K req/hr; public domain, NO attribution strings.
- Hot fallback: GovInfo BILLSTATUS / BILLSUM bulk XML (identical CRS data) when the API is down.
- Caveats: in the 119th Congress CRS writes summaries for the INTRODUCED version only — some bills return empty, handle gracefully; summary text is HTML, sanitize before display; Congress.gov API had an undocumented multi-day outage (Aug 2025) with no SLA — cache aggressively.
- STATUS: Done
<!-- card-id: e70d609d-9b4b-4ad1-971c-1fbcba09f7bc -->

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
- STATUS: Done
<!-- card-id: 032d3451-cfa9-4dcf-b6e1-5d54bc82ab2c -->

**Formatting / terminology consistency — deferred**
- Same concept named differently in different places — pick one term per concept. ~18 items from the copy audit.
- "Amend your issues" vs "Edit your issues" (EditIssuesModal) — standardize.
- Nav link ordering: AppNav vs in-page links (VoterChoiceApp).
- Eyebrow / kick label casing (PolisClose, RepCard confidence label).
- "Add something I forgot" → "Add something I missed" (IssueConversation).
- Spread across VoterChoiceApp.tsx (5), data.tsx (3), RepCard, PolisClose, IssueConversation.
- STATUS: Done
<!-- card-id: 0b7a6412-34b0-4274-83ec-b06a3ac3eb6c -->

**Copy-accuracy cleanup — deferred wording calls**
- Real wording problems from the copy audit that each need a small judgment (not mechanical). ~22 items.
- Dead links: VoterChoiceApp.tsx href="#" anchors that go nowhere — point at real targets or remove.
- "Tap a bill →" → "Tap a vote →" (VoterChoiceApp).
- IssueConversation / HandoffModal: privacy + progress wording nuance.
- ByokCard: "Saved. Chat now uses your account." → clarify the retry step.
- EditIssuesModal: "Re-rank, rename, add" → also mention "remove".
- Concentrated in VoterChoiceApp.tsx (11), about/page (2), EditIssuesModal, ByokCard.
- STATUS: Done
<!-- card-id: 35ed3262-ec67-494c-9919-4dd719bfa9a1 -->

**[P1] Reframe product copy: "ballot research" → "Congress assessment"**
- Default live app is the Congress scorecard (ballot flow is behind BALLOT_ENABLED), but ~20 strings still pitch a "research your ballot / printable ballot to take to the polls" tool — copy describes a different product than what loads.
- Decide the canonical framing (e.g. "Assess your representatives with AI"), then update consistently across surfaces.
- Site metadata — src/app/layout.tsx: title, openGraph.title, twitter.title, and both descriptions ("Research your ballot with AI…"); drop "printable ballot to take to the polls".
- About page — src/app/about/page.tsx: "free, non-partisan ballot research tool" framing.
- In-app strings — VoterChoiceApp.tsx ("Issues you voted on" → "Issues you cared about"), DelegationWorkspace.tsx (scorecard back-labels), BudgetModal.tsx (privacy line).
- Factual fix bundled here: VoterChoiceApp lede "34 Senate seats are on the ballot" → "33".
- ~20 flagged locations from the 2026-06-15 copy audit; re-audit those files when implementing.
- STATUS: Done
<!-- card-id: 26b49d49-8dfb-4dbd-ad19-d12046b7b802 -->

**[P1] Confirm `ingest-states.yml` cron is actually firing from main**
- Partially resolved 2026-05-15; mechanism updated 2026-06-15
- **Resolved (mechanism):** `ingest-states.yml` now self-schedules on `main` (`schedule: cron "30 7 * * *"`, daily 07:30 UTC), sharding 10 states/day by day-of-month % 5 so all 50 cycle every 5 days within the 250 req/day OpenStates limit. The earlier cross-branch `dispatch-state-ingest.yml` dispatcher (which fired `workflow_dispatch` onto `launch/production`) no longer exists — `main` is the canonical deploy branch now, so the dispatcher is unnecessary.
- **Remaining (monitor):** confirm the on-`main` cron has actually been running and the downstream ingest succeeds — `gh run list --workflow=ingest-states.yml`. Close once a green run is verified.
- STATUS: Done
<!-- card-id: f80ffd2b-5b5d-4274-bd1c-94b03784b5d5 -->

**[P2] Consolidate duplicate `AlignmentScore` type into one source of truth**
- Surfaced 2026-06-15 as a follow-up to the limited-data-notice wiring (the `kept: 0` card), which required editing the `AlignmentScore` shape in TWO places.
- `AlignmentScore` is defined twice: `src/lib/structured-blocks.ts` (server/canonical) and `src/prototype/realData.ts` (client prototype copy). Any field change must be made in both, so they can silently drift.
- **Fix:** one canonical definition (or a shared types module) that the other file imports — one source of truth for the data shape. Also covers the `redesign/delegationData.ts` consumer.
- **Constraint to respect:** the prototype is intentionally self-contained; confirm the import doesn't drag server-only code into the client bundle. Pick the canonical home accordingly.
- STATUS: Done
<!-- card-id: dfc934fd-ade1-4974-b781-db1aa9b79419 -->

**[P2] Delete drifted legacy frontend (supersedes #27)**
- Flagged 2026-06-07; the app IS the prototype now
- `src/app/page.tsx` now renders `<VoterChoiceApp/>` directly; `src/app/PageContent.tsx`, `src/components/BallotToolClient.tsx`, and related pre-rebuild landing code are dead. Remove them in a dedicated cleanup pass (the stale landing tests were already rewritten to the new shell).
- Perf follow-up: `src/app/layout.tsx` loads 6 Google Font families via `<link>` for the in-app mood/palette switcher, but production hardcodes `data-mood='civic'` — consider trimming to the Civic families (IBM Plex Sans/Serif/Mono) for the prod default to cut font payload.
- STATUS: Done
<!-- card-id: f3bfe5e0-dc5e-403b-bc38-2306e5c0965f -->
