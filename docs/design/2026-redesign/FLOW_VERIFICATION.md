# Flow verification — cards-first redesign vs prototype

**Purpose:** track every flow step + every prototype interaction with a status
and the evidence behind it. A row is only "✅ verified" when it was observed on
the **actual rendered page** (prod drive-through or local e2e), never inferred
from code or an API response. This survives context compaction — it's the
source of truth for "what actually works."

**Test ballot:** real NJ June 2 2026 **DEM primary** specimen (Camden County,
Audubon Borough). Single-candidate races (Booker for Senate, Norcross for
House CD-1) — the exact case that exposed the ≥2-candidate bug.

Status key: ✅ verified-prod · 🟩 verified-local-e2e · ❌ broken · ⏳ pending ·
🔧 fix-deployed-reverify · ⚪ not-checked

---

## A · Core flow (linear)

| Step | Status | Evidence / notes |
|---|---|---|
| Home → address entry | ✅ | zip 08106 → submit reaches party gate |
| NJ party gate (primary) | ✅ | registered_dem / rep / unaffiliated options; continue works |
| Ballot-lookup screen (civic empty) | ✅ | civic returns 0 contests for NJ → correct fallback screen |
| — accurate state/county links | ✅ | state→voter.svrs.nj.gov, county→vote.nj.gov (NOT the old TX hardcode) |
| Upload PDF → extract | ✅ | cached extraction; clean structured text (Election header, Federal/County sections, candidates+party) |
| Confirm ballot → cold-open | ✅ | "3 RACES ON YOUR BALLOT", AI opener renders |
| "Show me an example" prefill | ✅ | fills insulin/rent/climate longform; send works |
| AI interprets issues | ✅ | "Got it — 3 issues"; 3 themes rendered |
| Rank — move up/down buttons | ✅ | move-up reorders (insulin↔rent swap observed) |
| Rank — DRAG-DROP | ⏳ | handles present (`theme-drag-handle-N`); pointer-drag not yet driven |
| Rank — rename / remove | ⚪ | controls present (`theme-rename-N`, `theme-remove-N`); not driven |
| Lock in → workspace | ✅ | reaches `workspace-shell` with rail + 3 races (Senate/House/County) |
| **4-step loader BETWEEN lock-in and workspace** | 🔧 | built (`a2f47b0`): full-screen `workspace-loading-gate` gates the first workspace paint on the active race's data resolving. e2e updated + green. RE-VERIFY on prod. |
| Workspace cards render | ✅ | confirmed live: House (Norcross, single candidate) card renders, no stub. Required BOTH the ≥2→≥1 fix (`047c1da`) AND the rate-limit fix (`c1ced7e`, race-data was 429'ing on the 20/hr counter limit). |
| Card DATA populated (real) | 🔧 | Booker (Senate) resolved 11/18; Norcross showed backstop — surname "NORCROSS" wasn't resolving (mixed DB name formats). Fixed `a2f47b0` (compatible-state matcher). RE-VERIFY on prod. |

---

## B · Prototype interaction parity checklist

From the full inventory (sub-agent, verified against prototype source). Each
must work in the live app. **None of B is verified yet** — all blocked on cards
rendering (the 429). Re-drive once cards appear.

| Interaction | Prototype ref | Repo target | Status |
|---|---|---|---|
| Blind mode default + per-card Reveal/Hide + header toggle | components.jsx:417 | RacePatterns / CandidateCardHeader | ⏳ |
| AlignmentScoreBanner: avg % + per-issue bars ("K of N votes") | components.jsx:497 | AlignmentScoreBanner.tsx | ⏳ |
| Alignment **drilldown** (tap score → contributing votes, WITH/AGAINST badges, narrative, roll-call link) | components.jsx:548 | AlignmentDrilldown.tsx | ⏳ |
| **Money trail expandable disclosure** ("Show details ▾") | components.jsx:281 | FunderBars.tsx | ⏳ |
| FundingMix bars (small/large/PAC) + peer comparison + issue-PAC flags | components.jsx:687 | FunderBars / FundingMixBars | ⏳ (note: donor data currently coarse — only `total_receipts` bucket ingested, not industry split) |
| "See all N votes →" → AllVotesPanel | components.jsx:269 | AllVotesPanel.tsx | ⏳ |
| **Compare** modal (per-issue stacked, expandable votes, funding panel) | screens.jsx:585 | CompareModal.tsx | ⏳ |
| Pick / Unpick + **auto-advance** to next undecided race | views.jsx:351 | RacePatterns / BallotToolClient | ⏳ |
| Proposition Yes/No card | components.jsx:1032 | (no repo target yet) | ⚪ |
| Ballot pane: decisions, print (PDF), save .txt | views.jsx:722 | BallotPane.tsx | ⏳ |
| Amend issues mid-flow (rail EDIT → editor → re-score delta) | screens.jsx:82 | AmendmentEditor + Amend* | ⏳ |
| Settings drawer (lang, BYOK, data) | screens-c.jsx:41 | SettingsPanel.tsx | ⚪ |

**Prototype's own gaps (do NOT "fix" to exceed prototype):**
- Edit why-note: copy promises it (views.jsx:632) but **no editor exists in the
  prototype** — why-note is auto-generated + read-only. Don't build an editor;
  if anything, drop the promise copy.
- BudgetExhausted "download .txt" / "print" buttons: dead (no onClick) in the
  prototype. Low priority.

---

## C · Bugs found + fixes (this session)

| # | Bug | Fix | Commit |
|---|---|---|---|
| 1 | Cards 100% chat-gated; no data-driven view | `/api/race-data` + cards-first wiring | 8304cda |
| 2 | NJ hallucination (jurisdiction-blind legacy fallback) | county-tolerant route + no blind cinematic prompt | (pivot) |
| 3 | State resolved wrong (TX for NJ ballot) | ballot jurisdiction authoritative for stateCode | df553e8 |
| 4 | Chat in the middle | cards own middle, chat = bottom box | a7d03aa |
| 5 | Prod DB empty | federal votes + donor ingest | (ingest runs) |
| 6 | Every candidate unresolved (GovTrack decorated names + nicknames) | clean-name + lastname+state matcher | 2365fa9 |
| 7 | Chamber-switchers (Andy Kim) no record | prior-role fallback to sibling federal chamber | 6a7dbe5 |
| 8 | Single-candidate races (primary) → no cards (≥2 gate) | render cards for ≥1 | 047c1da |
| 9 | race-data 429 (20/hr counter limit) → cards break | dedicated 60/min read limiter | c1ced7e |
| 10 | Bare surname "NORCROSS" didn't resolve (mixed DB name formats: clean vs decorated → state-null excluded) | compatible-state matcher (state excludes, not requires) | 8c84c09 + a2f47b0 |
| 11 | No loader between lock-in and workspace | full-screen `workspace-loading-gate` | a2f47b0 |

## D · Open work
- Re-verify cards render on prod (post-429-fix) with the real ballot. ← NEXT
- 4-step loader gate between lock-in and workspace (task #22).
- Drive + verify every Section-B interaction.
- Donor industry-bucket breakdown (currently only total_receipts).
</content>
