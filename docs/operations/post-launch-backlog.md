# Post-Launch Backlog

Issues, monitoring gaps, data quality concerns, and enhancement ideas identified at or after launch. Entries are triaged by severity and should be reviewed quarterly.

**Severity:** `P0` = blocking / causes silent bad data · `P1` = meaningful user impact · `P2` = improvement / polish · `idea` = not yet scoped

---

## Pre-Launch Must-Fix (lower before opening to real users)

### [P0] Lower `CHAT_DAILY_SESSION_LIMIT` from 30 back to 10 before public launch
**Status:** Open (flagged 2026-05-26) · **Owner:** TBD

During pre-launch dogfooding the per-IP daily session cap was raised from 10 → 30 on Vercel Production env (`CHAT_DAILY_SESSION_LIMIT=30`) so power users and testers don't trip the limit while iterating. Before opening the app to real users this MUST be reduced back to 10 — leaving it at 30 in production:
- Costs more per abuser (a malicious IP can burn 3× the API quota)
- Surfaces a less-defensive default for the Phase 9 budget continuity flow
- Was never the intended steady-state cap

**Action when ready to launch:**
```bash
cd <worktree>
# Remove the override (falls back to DEFAULT_DAILY_SESSION_LIMIT=10 in production)
vercel env rm CHAT_DAILY_SESSION_LIMIT production
# Trigger redeploy with an empty commit on launch/production
git commit --allow-empty -m "chore(deploy): drop CHAT_DAILY_SESSION_LIMIT override → default 10"
git push origin launch/production
```

**Verification:** after redeploy, `vercel env ls` should NOT list `CHAT_DAILY_SESSION_LIMIT` for Production. The default `process.env.NODE_ENV === "production" ? 10 : 20` in `src/lib/server/rate-limit.ts:4-5` then applies.

**Why we raised it temporarily:** PR #45 fixed a sessionId regeneration bug (each page reload was consuming a fresh session slot). With that fix landed, a single user's session correctly counts as 1. But during the launch ramp it was practical to give dogfooders headroom rather than tune the cap precisely.

---

## Data Quality

### [P1] Issue taxonomy is too broad for precise alignment matching
**Status:** Open (flagged 2026-05-15)

The 15 canonical issues (`healthcare_affordability`, `economy_jobs`, etc.) are high-level categories. A voter who cares about "insulin prices" and one who cares about "hospital monopolies" both resolve to `healthcare_affordability` and get the same alignment score, even if their actual concerns are distinct. Similarly, "crime" vs. "policing reform" both land in `crime_public_safety` with no way to distinguish stance at query time.

**Impact on chat:** Alignment answers can feel generic or off-target for voters with specific policy concerns. The system will return votes that are technically related to the category but not the voter's actual position.

**Longer-term fix:** Expand the canonical vocabulary (likely 30–50 issues), add stance-level sub-tags (e.g., `healthcare_affordability:expand_coverage` vs. `healthcare_affordability:cost_containment`), and re-tag the 67K bill corpus. Requires coordinated change to `canonicalIssues.ts`, `BALLOT_PROMPT.md`, and a full re-tagging run.

**Related:** See "Store voter issue preferences" idea below.

---

### [P1] No distinction between "not yet tagged" and "not an issue bill"
**Status:** Open (flagged 2026-05-15)

Bills with zero `issue_tags` rows look identical in the DB whether they are:
- Genuinely non-issue (procedural votes, budget line items, ceremonial resolutions, street renaming) — estimated ~30% of all bills
- Legitimately untagged because the tagger hasn't reached them yet

**Impact:** The 56.2% bill coverage figure overstates the gap. The real "taggable but untagged" figure is probably closer to 25–30%. Alignment scores for high-bill states (IL at 31.8%, TN at 35.6%) look sparse but some of that is structural.

**Fix:** Add a `skip_reason` column to `bills` table (or a separate `bill_skips` table). When the tagger decides a bill is non-issue, record it explicitly. Then coverage reporting can separate "skipped non-issue" from "queued for tagging."

**Tracking query:**
```sql
SELECT COUNT(*) FROM bills b
WHERE NOT EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id = b.id);
-- Current: ~29,654 bills — mix of non-issue + untagged
```

---

### [P2] IL bill coverage lagging (31.8% — worst of high-volume states)
**Status:** Open (flagged 2026-05-15)

Illinois has 8,379 bills — the largest state corpus — but only 31.8% are tagged. Sunday cron will close this slowly. If IL is a priority, a targeted manual tagging run (100 batches × 300 bills) would close it in one session.

---

### [P2] `crime_public_safety` and `public_safety` are redundant canonical issues
**Status:** Open (flagged 2026-05-15)

Both exist in the taxonomy. `public_safety` has 5,499 tags; `crime_public_safety` has 3,800. They overlap substantially. When the taxonomy is expanded (see P1 above), consolidate these into sub-issues under a single parent.

---

### [P2] WI has 0% donor coverage (honest, but notable)
**Status:** Documented, no action needed

WI source deleted 2026-05-14 after finding implausibly large amounts ($26M for state senator from `wi_cfis_bulk`). WI has no electronic filing mandate — structural ceiling. Chat will not show donor data for WI candidates. This is correct behavior.

---

## Chat / Alignment Feature

### [P0 — FIXED 2026-05-15] `healthcare_access` wrong canonical id in system prompt example
**Status:** Fixed in `docs/BALLOT_PROMPT.md` + regenerated, commit pending

The `[CONCERN_INTERPRETATION]` example in the system prompt showed `"canonicalIssue":"healthcare_access"` — a string that doesn't exist in the `issue_tags` table. When Claude followed this example for health-related voter concerns, `lookup_alignment` returned no contributing votes (correct format, zero results), and the chat fell back to web search instead of using the voting record database.

**Fix applied:** Corrected example to `healthcare_affordability`. Added explicit vocabulary list of all 15 valid ids to the system prompt rules so the model cannot invent variants.

**Monitoring:** After the API cap is lifted and chat is functional, spot-check a session where a voter mentions "healthcare costs" and confirm the alignment tool is called with `healthcare_affordability`, not a variant.

---

### [P1] Alignment returns `kept: 0` silently for unmapped concerns
**Status:** Open (flagged 2026-05-15)

If Claude maps a voter concern to a canonical id that has very few tagged bills (e.g., `border_security` with only 155 tags, or `immigration` with 407), the alignment lookup will return `found: true` but very low `kept` counts. The voter sees a score like "1 of 47 votes" which looks like the candidate barely addressed the issue — when in reality there just aren't many tagged bills.

**Impact:** Misleading sparsity signals, especially for federal-only issues (immigration, border) where state legislators rarely vote on them.

**Fix options:** (a) Show a "limited data" notice when `total < 5`. (b) Fall back to web search when `total` is below a threshold. (c) Expand the tag corpus for thin issues.

---

### [P1] Google Civic ballot lookup unreliable for Texas (and likely other states)
**Status:** Open — structural, partially mitigated

Harris County 77002 returns "0 races, Not confirmed" from Google Civic. The PDF ballot upload fallback works well (confirmed with real DEM Harris ballot). But users who don't know to upload a PDF will see the "not confirmed" state and may not realize there's a fallback.

**Mitigation in place:** PDF upload is surfaced in the UI with a `<details>` section and clear instructions. pdfjs-dist extraction confirmed working.

**Remaining gap:** No proactive prompt to upload when Civic lookup fails — user must discover the `<details>` section themselves.

---

### [P1] No alignment data for non-legislative candidates (executive, judicial, local)
**Status:** Open (flagged 2026-05-15)

The `candidates` table and `votes` table only contain state house/senate members and federal House/Senate members. Statewide executive candidates (Governor, Lt. Governor, Attorney General), judicial candidates (judges), county officials, city council, school board, and ballot measure races have no entries in the DB.

**Impact:** For ballots that are entirely or mostly non-legislative (primaries, runoffs, off-cycle local elections), `lookup_alignment` returns `found: false` for every candidate. The entire chat session falls back to web search. Our proprietary voting record data plays no role. The May 26, 2026 Texas DEM runoff ballot is an example: Lt. Governor, AG, Court of Appeals, County Judge, District Clerk — none covered.

**Partial mitigation:** Web-search-based alignment scoring (see idea below). Full fix requires new data sources (executive campaign finance, AG actions, bill signing records) — significant scope.

---

### [P1] `reproductive_rights` and `immigration` canonical issues have very thin tag coverage
**Status:** Open (flagged 2026-05-15)

`reproductive_rights`: 619 tags (1.5% of corpus). `immigration`: 407 tags (1%). `border_security`: 155 tags (0.4%). These are the three thinnest canonical issues.

**Impact:** Voters who care about reproductive rights or immigration will often see 0–2 contributing votes even for active state legislators, which reads as "this candidate doesn't address this issue" when the reality is "we don't have enough tagged bills." This is the most politically significant taxonomy gap given that reproductive rights is a top-tier voter concern in 2026.

**Why thin:** State legislatures rarely have explicit "reproductive rights" bill language — bills are titled by their regulatory mechanism (gestational limits, clinic licensing, etc.). The tagger is less confident matching these to the canonical issue without explicit text, leading to low-confidence drops. Federal bills are better labeled but we have fewer of them.

**Fix:** Write targeted tagger instructions specifically for reproductive rights and immigration bills (examples of what to look for), and run a focused re-tagging pass on states with relevant legislative histories (TX, FL, OH, GA, NC, AZ, WI for reproductive rights; TX, AZ, FL for immigration). Also see "Expand canonical vocabulary" P1 above.

---

### [P1 — FIXED 2026-05-18] Ranked priorities reorder showed letter ids instead of issue labels
**Status:** Fixed in `fix/launch-prod-feedback` (commit 1054bcb)

The `SortableItem` in `src/components/ValuesTagSelector.tsx` rendered `item.id` (e.g., `"a"`, `"b"`, `"d"`) instead of `item.label` in the drag-rank list. The single-letter ids worked correctly as click handles for the chip picker but bled through to the reorder UI, leaving voters staring at "a / b / d" with no idea what they were prioritizing.

**Fix applied:** Pass `block.items` into `SortableItem` and look up the human label by id. Regression test added.

**Monitoring:** Visual smoke — confirm the drag-rank surface in step 2 shows issue labels like "Crime / public safety" rather than letters.

---

### [P1 — FIXED 2026-05-18] Reveal Candidates was required before picking and was one-way
**Status:** Fixed in `fix/launch-prod-feedback` (commit 1054bcb)

Anonymous-first ranking is the whole point of the candidate cards — voters should pick on alignment, not on name recognition. The original flow inverted that: the Reveal Candidates button was a precondition for picking, and once clicked, names couldn't be hidden again.

**Fix applied in `src/components/RacePatterns.tsx`:** Pick is now decoupled from reveal; voters can choose "Candidate A" while names stay hidden. The button toggles between **Reveal Candidates** and **Hide Names**. New `racePatternsHideButton` translation key (en + es).

**Monitoring:** Confirm a voter can pick a candidate without revealing names, and the button text correctly flips between reveal/hide.

---

### [P1 — FIXED 2026-05-18] No proactive ballot / voter-profile CTA — voter had to text-prompt the AI
**Status:** Fixed in `fix/launch-prod-feedback` (commits 1054bcb + 3f72b26)

After finishing a ballot, voters had no obvious way to get the printable ballot and voter-profile deliverable — they had to type a request into the chat and hope the model interpreted it. Muxin's E2E run had to text-prompt explicitly.

**Two-part fix:**
1. `docs/BALLOT_PROMPT.md` (en + es) now instructs the model to emit `[MY BALLOT]` / `[MY VOTER PROFILE]` / `[SESSION HANDOFF]` blocks **automatically** when the voter finishes a ballot or signals "done" — no "would you like a profile?" gate. Regenerated `ballotPromptEn.generated.ts` / `ballotPromptEs.generated.ts` via `npm run sync:ballot-prompt`.
2. New safety-net button in `ChatPanel.tsx` ("Generate my voter profile and printable ballot", sticky bottom) that dispatches the canned request to the model — guarantees voters can always reach the deliverable even when the model misses the proactive cue.

**Monitoring:** Post-deploy, observe a few full sessions to see whether the proactive emission lands without the button being clicked. If the safety net is being clicked frequently, the prompt cue isn't reliable enough.

---

### [P2 — FIXED 2026-05-18] Streaming structured blocks rendered as raw JSON / text mess
**Status:** Fixed in `fix/launch-prod-feedback` (commit 3f72b26)

While the model streamed a structured block (race-patterns, alignment-scores, values-tag-request, concern-interpretation), the in-flight JSON/markdown leaked into the chat surface and looked broken. Loading placeholders for each block type now render an `animate-pulse` container + inline Loader SVG + contextual copy until the block is parseable.

**Monitoring:** Throttle the network in devtools and watch a chat response — placeholders should appear in place of raw text for each of the four block types.

---

### [P1] Second candidate missing alignment block when first has one
**Status:** Open — flagged in Muxin's 2026-05-18 E2E run, needs verification

In one observed session, the first candidate in a race had a complete alignment block, but the second candidate did not. The structural fallthrough for non-legislative candidates is already covered by the "No alignment data for non-legislative candidates" P1 above, but the web-search alignment fallback added in commit 5bc3585 was specifically intended to backfill these cases — and it didn't fire here.

**Suspected cause:** The prompt path that routes to `web_search` for non-legislative candidates isn't being taken reliably. The model may be short-circuiting after the first candidate's lookup succeeds, or the per-candidate iteration may be silently skipping the fallback branch.

**Verification needed:** Spot-check a session with a Texas non-legislative race (Lt. Governor, AG, Court of Appeals are all good test cases). Capture the AI's tool calls and confirm whether `lookup_alignment` falls through to web-search emission for each candidate that returns `found: false`. If it doesn't, file as a separate P1 with the tool-call transcript.

---

### [P2] "Voted in line with platform" semantics unclear
**Status:** Open — flagged in Muxin's 2026-05-18 E2E run

Voters were unsure whether "voted in line with platform" referred to the candidate's stated platform or the voter's own selected priorities. The phrasing reads ambiguously and undercuts the trust we're trying to build with the alignment number.

**Proposed reword:** "X of Y tagged votes aligned with your stance on [Issue]" with a tooltip link to the contributing-votes drilldown so voters can audit the underlying evidence.

**Where to change:** The alignment-scores rendering in the candidate cards (likely `src/components/AlignmentScores.tsx` or equivalent) and any system-prompt boilerplate that uses the phrase.

---

## Operations / Infrastructure

### [P1] `ingest-states.yml` cron has never fired from main
**Status:** Partially resolved 2026-05-15

Scheduled trigger only fires from default branch (`main`). New `dispatch-state-ingest.yml` on `main` added 2026-05-15 to trigger `workflow_dispatch` on `launch/production` daily at 07:30 UTC. First fire: 2026-05-16 (shard 1: HI ID IL IN IA KS KY LA ME MD).

**Monitor:** Check `gh run list --workflow=dispatch-state-ingest.yml` after 2026-05-16 07:30 UTC to confirm it fired and the downstream ingest succeeded.

---

### [P2] deploy.yml `vercel env add` failures were silently swallowed
**Status:** Fixed 2026-05-15

All `vercel env add` calls previously used `2>/dev/null || true`. ANTHROPIC_VOTER_API was not landing in production deployments; `/api/chat` returned 500. Fixed with explicit `::notice::`/`::error::` logging.

---

### [P2] `ingest-state-donors-monthly.yml` — ~21 states use best-effort download URLs
**Status:** Open (flagged during build)

Several state donor download URLs were added as best-effort guesses without verification (AK, AR, CO, FL, HI, IN, KY, MA, MI, MN, MO, MS, NC, ND-cfis, NY, OH, OK, SC, TN, TX). These have `continue-on-error: true` and may silently fail on the monthly run. The existing donor data for these states is from the initial ingest and is correct; only future refreshes are at risk.

**Fix:** Verify each URL manually before the first monthly run. Expected: June 2026.

---

### [P1 — FIXED 2026-05-18] Budget meter overestimated spend by ~3x (Sonnet pricing constants on a Haiku-priced model)
**Status:** Fixed in `fix/launch-prod-feedback` (commit 3f72b26). Full audit: `docs/operations/budget-cap-investigation-2026-05-18.md`

The chat route switched to `claude-haiku-4-5-20251001` on 2026-05-08 but the cost constants in `src/lib/budget.ts` were never updated from Sonnet pricing. Real Anthropic spend was tracked correctly on the Anthropic Console, but the app's internal meter was running ~3x high — which tripped the $50/mo soft cap when actual spend was closer to $17. This is the root cause of what voters experienced as a "monthly limit reached" message during Muxin's launch-week testing.

**Fix applied:** Constants updated to Haiku 4.5 pricing: $1 input / $5 output / $0.10 cached read / $1.25 cache write. The $50 cap is unchanged — the math correction effectively gives ~3x headroom, which matches the actual budget we wanted.

**Monitoring:** Cross-check `budget.ts`-reported spend against the Anthropic Console weekly for the next month to confirm the meter and reality stay in sync. If the model is ever swapped again, this is the file to update.

---

### [P2 — FIXED 2026-05-18] "Finish this later" visible after budget exhaustion (re-triggered the gate)
**Status:** Fixed in `fix/launch-prod-feedback` (commit 3f72b26)

After the budget cap was hit, the "Finish this later" button remained visible — clicking it just re-triggered the exhaustion gate, which was confusing. Now hidden when `budgetStatus.tier` is `soft_close`, `handoff`, or `exhausted`.

**Monitoring:** Force a `soft_close` tier locally and confirm the button is gone.

---

### [P2 — FIXED 2026-05-18] Budget-exhausted copy confused voters as a personal API limit
**Status:** Fixed in `fix/launch-prod-feedback` (commit 3f72b26)

The exhaustion message read as if the voter's personal Anthropic API key had hit a limit. Updated `src/lib/translations.ts` to clarify: "Our free AI chat reached its monthly limit. Your personal Anthropic API key is unaffected..." — explicitly distinguishes the free-tier app cap from the bring-your-own-key path.

**Monitoring:** Trigger exhaustion in en + es and confirm copy reads cleanly in both.

---

## Product Ideas (not yet scoped)

### [idea] Web-search-based alignment scoring as fallback when DB has no data
**Status:** Flagged 2026-05-15 — requires design

**What:** When `lookup_alignment` returns `found: false` (non-legislative candidate) or `total < threshold` (thin data), instruct the model to run a targeted web search for the candidate's public statements, endorsements, and actions on the issue — then emit a structured alignment assessment in the same `[ALIGNMENT_SCORES]` format, labeled with a different source type so the UI can render it differently.

**Why it's viable:** The model already does this analysis in prose for non-legislative candidates. The change is making it structured and consistent rather than narrative. The model reads web search results and synthesizes "does this candidate support or oppose this concern?" It already knows how to do that reasoning — we'd just be capturing the output formally.

**What it would look like in the scores block:**
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
    {"summary": "Endorsed by Planned Parenthood TX, May 2026", "url": "..."},
    {"summary": "Stated opposition to HB 1280 in campaign interview", "url": "..."}
  ]
}
```

**Key design constraints:**
- Must be clearly labeled as "Based on public statements" — not "voting record." Different epistemics: voting records are facts, web search summaries are interpretations of available media.
- Confidence degradation: `high` only for explicit on-record statements; `medium` for endorsements; `low` for inferred from affiliations.
- Hallucination risk: model must cite sources for each evidence item. Any claim without a real URL should be dropped.
- Source quality: partisan endorsement sites can be misleading. The model should weight official campaign statements, credentialed news coverage, and official government records over advocacy org summaries.

**Implementation path:** Primarily a system prompt change + a UI change to render `sourceType: "web_search"` scores differently from `sourceType: "voting_record"` scores. No new backend required. Moderate prompt engineering effort. Low infrastructure cost.

**Related:** Addresses "No alignment data for non-legislative candidates" [P1] above and "thin tag coverage" [P1] above.

---

### [idea] Store voter issue preferences for analysis
**Status:** Flagged 2026-05-15 — requires design

**What:** Persist the `[CONCERN_INTERPRETATION]` output (voter's ranked canonical issues + stances) to a database table, anonymously, without any PII. This would let us run analysis: which issues voters in which states care most about, which canonical issues are being invented (indicating taxonomy gaps), how often voters express concerns outside the 15 canonical categories.

**Why this matters:** The current taxonomy was built bottom-up from legislative data, not from what voters actually ask. Storing what voters ask would let us close the gap — both by expanding the vocabulary and by improving the tagging priority queue (tag more bills in the issues voters actually care about).

**What it requires before building:**
- New DB table (`voter_concern_events` or similar) with columns: session_id (hashed), canonical_issue, resolved_stance, was_off_topic, confidence_level, state_code, timestamp
- Privacy policy update: clarify that we store anonymous, non-PII issue preference signals. Current policy says we store "anonymous counts only — never who said what." This is consistent but needs explicit mention of concern signals.
- UX: this data is already being sent to Anthropic as part of the chat context. The new part is persisting the structured output, not adding new collection.
- A simple analytics query interface (even just SQL in the repo) to inspect the data.

**Constraint:** Do not collect the voter's free-text verbatim — only the resolved canonical issue id and stance. Free text could be identifying.

---

### [idea — IMPLEMENTED 2026-05-18] Tesseract.js OCR fallback for scanned PDFs
**Status:** Shipped in `fix/launch-prod-feedback` (commit 1054bcb)

`ResearchLayout` PDF upload now OCR-fallbacks via `tesseract.js` when pdfjs returns fewer than 50 characters (i.e., the PDF is a scan, not a text-layer document). Lazy-imported on the scanned-PDF code path only — zero initial-bundle cost for the common text-layer case. Pinned `tesseract.js@5.1.1`. Also updated `pdfScannedError` copy with explicit Cmd/Ctrl+A copy-paste fallback steps, and opened the upload `<details>` by default so the textarea surface is discoverable.

**Monitoring:** Validate on actual scanned ballot PDFs post-deploy — a few real county-provided scans are the only meaningful test. If OCR quality is poor for specific counties' scan formats, that's a tuning conversation (preprocess image, try alternate language packs).

---

### [P1] Donor coalition surface: no total raised, no small-vs-large breakdown
**Status:** Open — flagged in Muxin's 2026-05-18 E2E run · escalated to P1 2026-05-19 on Muxin's feedback

`FunderBars` (`src/components/FunderBars.tsx`) renders only percentages. The `DonorBucketSlice` data type carries `{label, percent}` and nothing else — so absolute dollar amounts aren't even available client-side. Voters lose meaningful signal: 45% from large individuals on a $20K race reads very differently than 45% on a $2M race.

**Why P1 (escalated):** Total raised is core to the product thesis. Muxin: "if people cannot see the total amount their politicians have raised, they don't have a good sense of how much of their time is spent on fundraising — one of the biggest arguments I'm making on this app: you should know which Congresspeople are doing their job vs. spending time fundraising." Without absolute amounts, the donor coalition view fails its primary value proposition.

**What it would take:**
- Extend `DonorBucketSlice` to include absolute totals (cents or dollars).
- Surface a headline "Total raised: $X" above the bars.
- Render inline absolute amounts on each bar (e.g., "Large individual: 45% ($240K)").
- Probably also: surface "Time spent fundraising" or "Hours per dollar" derived metric if/when that data is available.

**Open design question:** Headline number above, or inline amounts on each bar, or both? Mobile rendering constraints argue for one or the other, not both.

---

### [idea] Polis viz dev/preview mode for low-participation areas
**Status:** Flagged 2026-05-18 — design + QA tooling

When `thresholdMet === false` (jurisdictions with too few participants to show the visualization), QA + demos currently have no way to preview what the viz will look like once data fills in. Proposal: gate a mock dataset behind a `?devPolis=1` query param (or `NEXT_PUBLIC_DEV_POLIS` env flag) that renders the viz with a clearly-labeled "preview data" banner.

**Useful for:** Pre-launch demos in low-participation states, QA regression-checking the viz layout without waiting for real participation, screenshot/marketing material.

**Constraint:** Must be visually distinguishable from real data — banner is non-negotiable, and the env-flag form should be production-disabled by default.

---

### [idea] Polis viz: usage tracker + social share
**Status:** Flagged 2026-05-18 — growth / social-proof

Two small additions to the Polis viz surface:
1. Social-proof banner near the viz: "N voters in [county] have used this tool" — needs a counts query against the existing session/participation data.
2. "Share this tool" CTA next to the viz, with prefilled copy and OG image.

**Why:** Both are low-cost trust-builders and growth nudges. The counts banner especially helps in counties where the viz is still warming up — even a modest "47 voters in Travis County" reads as legitimacy.

---

### [idea] Reconsider chip-pick vs full ranking for issue priorities
**Status:** Deferred — revisit after Polis data + voter-feedback signals accumulate

What we shipped — "drag-rank top 3" — works for launch and the data is clean. Longer-term, a conversation-driven priority discovery flow ("First, tell us what matters most to you") with examples + stances could produce much richer concern data: stance polarity, intensity, specific sub-issues. The final ranking would then render as a confirmation step rather than a pre-flight task.

**Why deferred:** We need real-world signal first. Specifically: (a) how often are voters' chip-picked priorities a poor match for what they actually ask about in chat (gap between selection and discovery), (b) do Polis clusters suggest meaningful sub-issue structure that the current taxonomy hides. Both are answerable from launch data once we have a few thousand sessions.

**Related:** "Expand canonical vocabulary" [P1] above and "Store voter issue preferences for analysis" [idea] above — these three together form the longer-arc taxonomy + UX redesign.

---

## 2026-05-19 round 2 — Muxin's second-pass feedback

### [P1 — FIXED 2026-05-19] Generate-profile + Finish-later buttons visible after profile already generated
**Status:** FIXED in `fix/launch-prod-feedback`

User had already generated her voter profile and printable ballot but the safety-net "Generate my voter profile and printable ballot" + "Finish this later" buttons were still showing at the bottom of the chat, which was confusing — those deliverables already exist. Buttons now gated on `!ballotReady`: once the AI has emitted `[MY BALLOT]`, they disappear.

### [P1 — FIXED 2026-05-19] Duplicate "Your research portfolio" cue at top of chat
**Status:** FIXED in `fix/launch-prod-feedback`

After the auto-switch to `ResearchPortfolio` view fires (on `ballotReady`), if the user clicks "Back to chat," a large green "Your research portfolio" button was re-injected at the top of the chat. Muxin: "what the heck is the Research Portfolio? It's just repeating the section that already exists higher up." Button removed entirely. The auto-switch still fires once; portfolio remains reachable by re-asking the AI or via the existing scroll.

### [P2 — FIXED 2026-05-19] "Prefer to use your own AI?" section visible alongside active chat
**Status:** FIXED in `fix/launch-prod-feedback`

The promptOutput section was rendered alongside ChatPanel for the entire session — confusing because it offered a competing path while the user was already in the AI chat. Gate changed to `canStartResearch && budgetChecked && !chatAvailable` — section now only appears as the fallback when chat is unavailable.

### [P2 — FIXED 2026-05-19] "Returning voter? Upload your voter profile" visible mid-session
**Status:** FIXED in `fix/launch-prod-feedback`

`ProfileUpload` was visible at the top of the page even after the user had started a chat session. Now hidden once any chat messages exist (`hasChatStarted === true`), via a new `onChatStarted` callback wired from ChatPanel → ResearchLayout → BallotToolClient.

### [idea — IMPLEMENTED 2026-05-19] Dev-mode URL overrides for QA preview
**Status:** Implemented in `fix/launch-prod-feedback`

`?devBudget=normal|notice|soft_close|handoff|exhausted` overrides the displayed budget tier in `NODE_ENV=development` so we can screenshot/preview the budget-exhausted banner without polluting real state.

`?devPolis=mock` injects a hardcoded ~20-voter mock dataset into `PolisOverlay` so we can preview the visualization in low-participation areas. Useful for QA, demos, marketing.

Both no-op in production. Both `console.warn` on activation.

**Caveat:** `devBudget` is display-only. Backend `/api/chat` still enforces the real budget. To actually USE the chat against a real backend in an exhausted-state environment, clear the durable-store key `voter-choice:budget:YYYY-MM` (Upstash console or `redis-cli del voter-choice:budget:2026-05`).

### [P1] PDF OCR fallback fires but still surfaces "scanned" message in some cases
**Status:** Open — instrumented 2026-05-19, awaiting Muxin retry with browser console

Muxin retried a real PDF upload and still saw the "scanned image, paste text" error after the Tesseract.js OCR fallback was added. The OCR path is wired correctly (`extractPdfText` → `ocrPdfPages` on <50 chars) but either Tesseract threw on import, or all pages returned <50 chars of text, or the canvas rendering failed silently.

**Instrumentation added (2026-05-19):**
- `console.log("[pdf-extract] ...")` at OCR start, per-page (with canvas dimensions + text length), at OCR done.
- Per-page try/catch — single bad page no longer aborts the whole doc.
- Canvas dimensions logged + zero-size guard added.
- `canvas.toDataURL("image/png")` passed to Tesseract instead of the raw canvas (Tesseract v5 picky-input mitigation).
- Distinct error message `pdfOcrFailed` for "OCR threw" vs. `pdfScannedError` for "OCR ran but returned nothing."

**Next step:** voter retries upload, reports browser-console logs. Based on what fails, either tune the OCR parameters (PSM mode, character whitelist, scale), preprocess the image (binarize/contrast), or accept OCR as best-effort and prioritize the paste-fallback path.

### [P2] Conversational priority discovery (re-flagged with sharper framing)
**Status:** Open — re-flagged 2026-05-19 with sharper framing than the earlier "idea" entry

Muxin reiterated her preference for conversation-first priority discovery: "I would have preferred the AI ask me about the issues I care about in a conversation. Once it gets a good sense of what my issues are and how I feel about them, it then shows me the ranked list of issues from the conversation. I can have a chance to review it and reorganize or re-rank things, and once I submit it, it should just move on to the next step."

This is a sharper specification than the earlier "reconsider chip-pick vs full ranking" idea: she wants the model to drive an open-ended issue-elicitation conversation, then render the structured rank as a CONFIRMATION (which is editable), and proceed only on confirmation.

**Why this matters for alignment quality:** Stance ambiguity for issues like "reproductive rights" is the symptom; the cause is asking voters to pick from chips before they've said in their own words what they actually care about. Conversation surfaces stance directly, which then resolves the existing `CONCERN_INTERPRETATION` ambiguity gate without needing the disambiguation question.

**What we shipped is good enough for launch.** The launch-week data will tell us whether the gap between chip-picked priorities and chat-discovered concerns is meaningful — that data justifies the redesign or doesn't.

**Related:** "Expand canonical vocabulary" [P1] above (taxonomy-side fix for the same root cause).

### [P2] After candidate selection, race-patterns viz disappears and is replaced by raw text in chat thread
**Status:** Open — flagged 2026-05-19

Muxin: "after I've made my candidate selection, it is showing me the text instead of the visualization in the chat thread." When the user picks a candidate, the existing `RacePatterns` viz collapses and the chat surface shows the model's textual confirmation prose instead. The structured viz should remain in the scrollback (read-only post-pick state).

**Likely cause:** The submitted-race-final state isn't preserving the rendered RacePatterns component — the streaming text replaces it. Verify in `ChatPanel.tsx` (renderRacePatterns and submittedRaceFinals plumbing).

### [P2] Polis interface preceded by raw streaming text before final render
**Status:** Open — flagged 2026-05-19

Same root cause as the existing streaming-skeleton fix, but for a code path that wasn't covered. The Polis viz section streams its setup content (or a sibling structured block) before the final viz renders. Verify which block opens immediately before the viz and ensure `hasOpen*Block` is checked at that surface too.
