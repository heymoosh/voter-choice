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
| Rank — DRAG-DROP | 🟩 | dnd-kit PointerSensor; real pointer gesture driven in e2e (`theme-name-0` becomes former index-1 name after dragging handle-0 past card-1). |
| Rank — rename / remove | ⚪ | controls present (`theme-rename-N`, `theme-remove-N`); not driven |
| Lock in → workspace | ✅ | reaches `workspace-shell` with rail + 3 races (Senate/House/County) |
| **4-step loader BETWEEN lock-in and workspace** | 🔧 | built (`a2f47b0`): full-screen `workspace-loading-gate` gates the first workspace paint on the active race's data resolving. e2e updated + green. RE-VERIFY on prod. |
| Workspace cards render | ✅ | confirmed live: House (Norcross, single candidate) card renders, no stub. Required BOTH the ≥2→≥1 fix (`047c1da`) AND the rate-limit fix (`c1ced7e`, race-data was 429'ing on the 20/hr counter limit). |
| Card DATA populated (real) | 🔧 | Booker (Senate) resolved 11/18; Norcross showed backstop — surname "NORCROSS" wasn't resolving (mixed DB name formats). Fixed `a2f47b0` (compatible-state matcher). RE-VERIFY on prod. |

---

## B · Prototype interaction parity checklist

From the full inventory (sub-agent, verified against prototype source). Each
must work in the live app. **🟩 = driven + asserted in local e2e against a
fresh build** (`e2e/workspace.spec.ts` "candidate-card interactions" + "drag-drop
reorders" + `theme-amend.spec.ts` + `print-ballot.spec.ts`). 🟩 is NOT ✅ prod —
prod re-verify with the real NJ ballot is still pending (waits for the user).
Where only part of a row is driven, the sub-part not driven is named explicitly
(no over-claiming).

| Interaction | Prototype ref | Repo target | Status |
|---|---|---|---|
| Blind mode default + per-card Reveal/Hide + header toggle | components.jsx:417 | RacePatterns / CandidateCardHeader | 🟩 per-card reveal↔hide round-trip driven (reveal → `race-patterns-hide-candidate-A` appears → hide → reveal returns) AND header `workspace-chat-blind-toggle` flips global blind mode (reveal affordance disappears/reappears). |
| AlignmentScoreBanner: avg % + per-issue bars ("K of N votes") | components.jsx:497 | AlignmentScoreBanner.tsx | 🟩 renders with rich mock; per-issue row is the drilldown entry point (driven below). |
| Alignment **drilldown** (tap score → contributing votes, WITH/AGAINST badges, narrative, roll-call link) | components.jsx:548 | AlignmentDrilldown.tsx | 🟩 tap `alignment-issue-row-healthcare_affordability` → `alignment-drilldown-vote-list` visible. |
| **Money trail expandable disclosure** ("Show details ▾") | components.jsx:281 | FunderBars.tsx | 🟩 `race-patterns-money-trail-toggle-A` toggles; `funder-bars` attached. |
| FundingMix bars (small/large/PAC) + peer comparison + issue-PAC flags | components.jsx:687 | FunderBars / FundingMixBars | 🟩 bars render ("35% small · 40% large · 25% PACs" in snapshot). Note: prod donor data still coarse — only `total_receipts` ingested, not industry split (rich mock supplies the mix). |
| "See all N votes →" → AllVotesPanel | components.jsx:269 | AllVotesPanel.tsx | 🟩 `race-patterns-see-all-votes-A` → `dialog` visible. |
| **Compare** modal (per-issue stacked, expandable votes, funding panel) | screens.jsx:585 | CompareModal.tsx | 🟩 `race-patterns-compare` → `dialog` visible. (Was broken: modal JSX lived only in the cold-open return, unreachable in workspace mode + `handleOpenCompare` read the chat message not raceData. Fixed: `cardModals` rendered in BOTH returns + read `workspace.raceData`.) |
| Pick + **auto-advance** to next undecided race | views.jsx:351 | RacePatterns / BallotToolClient | 🟩 `race-patterns-pick-A` lands the decision (`ballot-pane-print` enables) AND auto-advance asserted: picked rail row gets `data-decided=true` + loses `aria-current`, active highlight moves to a different undecided row (`AUTO_ADVANCE_MS=600`). Unpick (`workspace-unpick-trigger`) not yet driven. |
| Rank — **drag-drop** reorder (dnd-kit PointerSensor) | components.jsx (ord) | ThemeRanker.tsx | 🟩 real pointer gesture (mouse down on `theme-drag-handle-0` → move past `theme-card-1` midpoint → up); `theme-name-0` becomes the former index-1 name. |
| Proposition Yes/No card | components.jsx:1032 | (no repo target yet) | ⚪ |
| Ballot pane: decisions, print (PDF), save .txt | views.jsx:722 | BallotPane.tsx | 🟩 print: `print-ballot.spec` drives decide→print→`window.print`; `ballot-pane-print` enables after a pick. save `.txt` not driven. |
| Amend issues mid-flow (rail EDIT → editor → re-score delta) | screens.jsx:82 | AmendmentEditor + Amend* | 🟩 `theme-amend.spec` drives rail-link → editor → lock → offer → Accept(delta)/Decline both green. |
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
| 10 | Bare surnames (NORCROSS, PALLONE) didn't resolve — DB state decoration is unreliable (missing/wrong) so state-matching excluded real incumbents | layered matcher: exact-state → state-or-unknown → **unique-surname-in-chamber** fallback | 8c84c09 → a2f47b0 → (layered) |
| 11 | No loader between lock-in and workspace | full-screen `workspace-loading-gate`, fresh-lock-in only, never hangs | a2f47b0 + 1a891a3 |
| 12 | Compare modal never opened in cards-first workspace | modal JSX lived ONLY in the cold-open return (unreachable in workspace mode) + `handleOpenCompare` read the last chat message, not raceData. Extracted `cardModals` (Compare + AllVotes) into BOTH returns; read `workspace.raceData`. | (this commit) |

**⚠️ Process lesson (cost me hours): `npm run start` serves the PREBUILT
`.next` — it does NOT rebuild on source edits.** Playwright's webServer is
`npm run start` with `reuseExistingServer` locally, so any e2e run not preceded
by `npm run build` (with port 3000 confirmed dead) tests STALE code. The Compare
fix above was correct for two iterations but appeared to "still fail" purely
because the bundle was stale. **Gate rule: always `npm run build` immediately
before any e2e run, and kill :3000 first.** Every 🟩 in this doc was (re)driven
against a fresh build on the final pass — full suite: 55 passed / 0 failed / 12
skipped; vitest 2011/0; tsc 0; eslint 0.

**Known limitation (data) — DEFERRED, needs DB access:** Federal *Senate*
surnames resolve (Booker 11/18). Federal *House* surnames (NORCROSS, PALLONE)
still show backstop even with the unique-surname fallback — they resolve by
FULL name (tier-2) but not by surname (tier-3). The diagnostic signature
(full-name works, surname doesn't, fallback doesn't fire) points to
**per-congress duplicate candidate rows in federal-house**: a member has
multiple rows (118th + 119th) with different ids, so `byLast` isn't unique →
the fallback declines. This ALSO means a member's votes are split across
per-congress rows, so even resolving picks one congress. This is a data-model
issue (candidate-row dedup / vote aggregation across congresses) that needs
DB inspection — NOT another blind matcher iteration. Net user impact on the
test ballot: Senate (Booker) shows real alignment; House (Norcross) shows
backstop. The cross-state-homonym tradeoff above still applies to the
Senate-style unique case.

## D · Open work
- Drive + verify every Section-B interaction on prod with the real ballot. ← NEXT
- **Web-search fallback for LOCAL candidates** (user-requested, NOT built): the
  user wants candidates too local for our DB (county commissioners, etc.) to be
  filled via web search ("Webfetch is the backup"), not left as a backstop.
  `/api/race-data` is currently DB-only → local candidates show the backstop.
  This is a backend data-source addition (web_search/research per unresolved
  candidate, synthesized server-side) — the LLM stays OUT of the UI/chat, only
  in the data layer. Adds latency + web_search spend. Larger task.
- Donor industry-bucket breakdown (currently only `total_receipts`; the
  by-employer FEC enrichment didn't populate).
- Drag-drop ranking: verify the pointer-drag path (move up/down buttons
  verified; drag handles present but pointer-drag not yet driven).
- Edit why-note: NOT in the prototype (read-only there) — drop the promise
  copy rather than build an editor.
</content>
