# Voter Choice — Data Contract for Design

**What this is:** the ground truth of what data the app can actually serve, per surface,
including every honest empty state — so design work composes against real shapes and the
canvas rule "close each data gap before building its UI" has a reference. UI/UX itself is
designed in Claude Design first; the repo builds no flow UI ahead of that. Statuses:
**SHIPPED** (on main), **SPEC** (agreed serve shape, not yet running), **PLANNED**
(decided, not built), **DOES NOT EXIST**.

## How to read null vs empty

The repo-wide contract: `null` = we didn't look / the source is unavailable ("not yet
traced"); `[]` or empty = we looked and there is nothing (a legitimate, visible state —
"no promise corpus for this candidate", never a blank). Design must give both states a
face; never render a fabricated zero.

---

## 1. POST /api/delegation — address → seats (SHIPPED)

Input: `{ address }` (street address today).

**Location entry: zip-first is DECIDED (Muxin, 2026-08-18).** The crosswalk ingest +
zip input on `/api/delegation` are PLANNED backend work — design does not need to wait
for them. Design against these states:

| State                            | When                                    | What the data can serve                                                                                                                                                                                                                                                      |
| -------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zip → full delegation`          | ~85% of zips (single-district)          | both senators + House seat, everything in the seat table below                                                                                                                                                                                                               |
| `zip → senators + split-zip ask` | ~15% of zips (splits cluster in cities) | senators render immediately; House needs one more input — **street address is the free, reliable fallback**. Zip+4→district has no free public dataset (commercial only), so design the ask as street, not zip+4, unless we later buy data                                   |
| `zip invalid / unknown`          | typo, new zip                           | designed error state, retry                                                                                                                                                                                                                                                  |
| `no_representation`              | DC + territories                        | existing designed state (delegate/no-vote seats)                                                                                                                                                                                                                             |
| Ballot logistics gap             | any zip-only entry                      | polling place / hours / early-voting lookups need a street address — with zip-only, these degrade to state-level info (registration deadline, ID rules, county lookup link). Honest degrade, optionally upgraded later if the user gives an address (e.g. at scorecard time) |

Data-minimization payoff: zip-only entries never send an address to us or to Google
Places. Whatever is entered is still used once, held only until the tab closes, never
stored.
Output: `{ status, stateCode, stateName, county, districtLabel, seats[] }`.
Statuses: `ok` | `geocode_failed` | `no_representation` (DC/territories) | `db_unavailable`
— each is a designed screen, not an error toast.

Each seat:

| Field                     | Shape                                                                                                                                       | Empty state                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `candidate`               | `{ id, name, party, priorRole, seekingReelection2026? }`                                                                                    | `null` = sitting member unresolved — blind label still renders          |
| `attendance`              | missed-votes % vs chamber median, band `good\|mid\|bad`                                                                                     | `null` = no stats                                                       |
| `committees`              | assignments list                                                                                                                            | `[]`                                                                    |
| `collaborators`           | cosponsorship network                                                                                                                       | `null`                                                                  |
| `challengers`             | max 8, $10k receipts floor: `{ id, name, party, totalReceipts, rosterProvenance, isRunoffPending? }`                                        | `[]`; no FEC match → "No FEC match yet — so no dollar shown" (never $0) |
| `topPacs`                 | ranked named PAC sponsors, max 8: `{ committeeId, name, sponsor?, sector?, amount, transactionCount, evidenceUrl, status }` + `hiddenCount` | `null` = flag off / not traced                                          |
| `outsideSpending`         | support and oppose totals, **separate — never netted, never summed into funding mix**                                                       | `null`                                                                  |
| `canContext`              | curated ratings, donor trail, key votes (max 8), attribution required                                                                       | `null` = flag off / no coverage                                         |
| `challengers[].topIssues` | **SPEC** — top-3 issues from the promise ledger, see §4                                                                                     | absent = no promise corpus for that candidate                           |

## 2. POST /api/race-data — per-seat depth (SHIPPED)

Input includes the voter's issues. **`issues: []` is valid**:

- `racePatterns` — **issue-independent, always available**: `totalRaised`, funding mix
  (small / large individual, PACs), `donorCoalition` sectors, chamber-median comparison,
  untraced-PAC % . Survives `donorCoalition == null` (state coverage gaps) → omit, don't zero.
- `alignmentScores` — **null when no issues.** Per-issue with/against + contributing
  votes (bill title, vote cast, date, tally, source, member rationale labeled
  `stated | inferred`). Only exists after the voter picks issues **with stances**
  (see the ladder below — ranking is not what gates it).

A no-issues default view is therefore **facts-only**: money facts, attendance,
committees, key votes — no verdict language until issues exist.

### Personalization ladder — what each voter input unlocks (verified in code)

| Voter gives us                              | Unlocks                                                                                                       | Cost of skipping                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Nothing                                     | Everything in §1 + `racePatterns` — the full facts view                                                       | none; already complete                                                      |
| Issue **topics** only                       | The member's record _on_ those issues (votes per issue)                                                       | no with/against verdict possible                                            |
| Topics + **stance** (`in_favor \| opposed`) | Full alignment: "aligns with you %", per-issue with/against, contributing votes, money-vs-your-issue verdicts | this is the load-bearing input                                              |
| **Ranking / order**                         | ONLY display order + the "your #1 issue vs their money" callout                                               | nearly free to drop — rank never reaches the backend; scoring is unweighted |

Implication for flow design: **ranking can be omitted at zero data cost** (the ranked
component stays in the design system; the flow just doesn't require it). Stance capture
is the one step that buys alignment — and it doesn't require a chat: any stance-carrying
picker works (e.g. chips whose labels embed the direction). Today the intake
conversation is merely one way of producing `{ issue, stance }` pairs.

## 3. GET /api/donors — bucket vocabulary (SHIPPED)

Funding mix: `Small individual donors (under $200)` ($200 = FEC itemization threshold,
not our choice) · `Large individual donors ($200+)`·`PACs`. Thirteen sector buckets +
`Issue-aligned PACs — <issue>`. Federal sector buckets are a re-cut of individual
dollars — never add them to the mix total.

## 4. Promise ledger — candidate issues & plans (DB SHIPPED · serve shapes SPEC)

The tables are live and a separate backend session is filling the corpus. The serve
shapes below are the agreed contract for the future read path — design against them;
no endpoint is running yet.

`challengers[].topIssues?: { canonicalIssue: string; promiseCount: number }[]` — top 3
by promise count, ties alphabetical. **Key absent = no promise corpus for that candidate**
(never an empty array; incumbents don't carry it yet).

`GET /api/promises?candidateId=&issue=` → `{ status: "ok", promises: CandidatePromiseEntry[] }`:

```ts
interface CandidatePromiseEntry {
  id: string;
  canonicalIssue: string;
  subIssue: string | null;
  promiseText: string; // verbatim, never paraphrased
  promiseType: string; // vote | introduce_bill | oversight | funding | outcome
  conditionsDeadline: string | null; // the test for "kept", declared at extraction time
  venue: string; // campaign_site | ad | press_release | questionnaire | debate
  madeAt: string | null;
  sourceUrl: string;
  archiveUrl: string | null; // the exact archived capture
  verdict: { verdict: string; rationale: string; adjudicatedAt: string } | null;
  actions: {
    actionType: string; // vote | sponsorship | cosponsorship | amendment | committee_action
    evidenceLevel: string; // activity | advancement | outcome
    direction: string; // toward | against
    voteId: string | null;
    billId: string | null;
    cosponsorId: string | null;
  }[];
}
```

Rules that bind design:

- `promiseText` is **verbatim** — paraphrase is a presentation choice, the quote and its
  `sourceUrl`/`archiveUrl` must stay reachable.
- Verdict vocabulary (6 values, all visible states): `kept` · `attempted_blocked` ·
  `compromise` · `broken` · `not_yet_testable` · `not_yet_rated`. `not_yet_rated` is
  legitimate and visible, never hidden.
- Corpus is pilot-scale (~50 promises nationally). Chips render only for candidates with
  ≥1 promise; fallback = researched stances **labeled as stances, not promises**; else
  "No promise corpus yet for this candidate."

## 5. Warning signals (PLANNED — approved trigger set)

A `SignalBadge`: icon shape + plain words + cited evidence; **never color alone; hidden
when no data**. Build order: ① attendance far below chamber median (data shipped) →
② broken promise verdict (after §4, corpus-gated) → ③ donor-alignment ("voted the
donors' way, k of n scored votes" — alignment wording only, never lobbying or
donation→vote timing) → ④ stock trades near their committees (STOCK Act ranges only —
never exact amounts).

## 6. Does not exist — do not design numbers for these

- **Named individual donors, in general** (no dataset; "top donors" = named PACs +
  buckets) — **except** a narrow, curated billionaire watchlist match, see §8. There is
  still no comprehensive per-donor lookup; anyone not on that ~59-person list is
  invisible.
- **Salience / "top actions" score** (derived notable-votes ranking is PLANNED; criteria
  pending sign-off).
- Average gift size · donation→vote timing/receipts · member-level lobbying (LDA names
  chambers, not members) · revolving-door records · PAC ROI figures · a **specific
  dollar amount** attributed from a super-PAC donor to a specific candidate's race (§8's
  PAC-path rows deliberately stop at "gave $X to PAC Y" + "PAC Y spent $Z on this race"
  as two separate facts — never multiplied or netted into one number) · dark-money donor
  lists ("donors not publicly disclosed").

Mock numbers on the canvas for any of these will not ship; the design's own
"citation required — else omit" rule is enforced at build time.

## 7. System-1 / somatic guide concepts — data readiness

Mapping the "Activating the Disengaged Voter" + RepCheck somatic prototype concepts
against real data. **None of these block starting design** — the gaps are small,
well-defined backend cards that can be built while design happens.

| Concept                                                                                                                              | Data status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swipe cards, somatic prompts ("feels unfair?"), micro-animations, haptics, 1-tap pledge (client-side), System-1/System-2 mode toggle | **Front-end only** — no backend at all                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Small-donor vs PAC split bar                                                                                                         | **SHIPPED** (funding mix)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Named top funder ("Tech PAC $140k")                                                                                                  | **SHIPPED** (`topPacs`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Key-vote highlight ("Clean Energy Act: YES")                                                                                         | **PARTIAL** — curated key votes (flag-gated, partial coverage); notable-votes derivation is a pending card                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| "State taxpayers paid $X billion — did you get what you paid for?"                                                                   | **SHIPPED as static data (2026-08-18)** — `src/data/state-tax-households-fy2025.json`: IRS FY2025 gross collections (Data Book Table 1-5), all 50 states + DC + US total, with the IRS's own attribution caveat quoted inside. Same data pushed to the design canvas as `content/system1-content.html` + `content/state-tax-households.json`                                                                                                                                                                                                                         |
| "≈ $Y per household on average" (state taxes ÷ households)                                                                           | **SHIPPED, same file** — Census ACS 2024 household counts + precomputed `avg_per_household` (US avg $40,000; sanity-checked). Label it "average" (means hide how unequal payments are); collections include corporate + employer payroll taxes, so it is a framing average, never "what you paid". DC ($126,400) shows the corporate-HQ distortion — lead with the state total, average as secondary                                                                                                                                                                 |
| Published lobbying-ROI stats as context ("a study found $220 back per $1 lobbied")                                                   | **CURATED-CITED ONLY — v1 content authored (2026-08-18)**, on the design canvas in `content/system1-content.html`: ① 220:1, 2004 repatriation holiday tax savings (Alexander/Mazza/Scholz 2009; contested — IFS disputes the method); ② ~760:1, $5.8B influence spend → $4.4T federal contracts/grants/loans/subsidies, 200 firms 2007–2012 (Sunlight Foundation "Fixed Fortunes" 2014; measures federal support received, correlational). Each entry ships with {stat, scope, source, year, caveat} — all five required. Never a computed per-PAC or per-rep number |
| "82% of money came from out-of-state"                                                                                                | **GAP, modest** — donor geography isn't bucketed today, but FEC bulk individual data (already ingested) carries contributor state; needs a new in-state/out-of-state cut. PAC "location" is murkier (HQ state ≠ interest) — honest label is "donors outside your state," not "out-of-state lobbyists"                                                                                                                                                                                                                                                                |
| Challenger "takes $0 corporate PAC money"                                                                                            | **GAP, known** — challengers mostly carry `totalReceipts` only; the challenger-committee-aggregates extension (already on the gap list) is needed before $0-PAC claims can be verified rather than asserted                                                                                                                                                                                                                                                                                                                                                          |
| Challenger pledge ("promises a ban on stock trading")                                                                                | **IN FLIGHT** — promise ledger corpus (separate session); serve shapes in §4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Aggregate pledge counts ("N neighbors pledged")                                                                                      | **GAP, small** — client-only pledges need no backend; showing counts would reuse the anonymous-counter infra (new event type)                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| "$4,200/household corporate handouts approved [by this rep's votes]"                                                                 | **CANNOT SHIP** — the vote-attribution step is the problem, not the division: bills bundle hundreds of provisions, votes are collective, incidence is contested. "Avg taxes per household" (above) is fine; "this vote cost your household $Z" is not                                                                                                                                                                                                                                                                                                                |
| "Voted to let them keep raising prices" (causal framing)                                                                             | **Constrained** — must use alignment wording ("voted the donors' way on k of n"), never causation/lobbying/timing claims (§5)                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Challenger photos + names up front                                                                                                   | **DECIDED (Muxin 2026-08-18): blind by default stays, especially for challengers.** The somatic hero card must be designed blind (e.g. "Challenger A · 100% grassroots funded" + reveal), no photos pre-reveal                                                                                                                                                                                                                                                                                                                                                       |

## 8. Billionaire donor matches (DB SHIPPED · dark · serve shapes SPEC)

New backend-only work (2026-08-19), not yet reachable by any endpoint — the table exists
in prod and is populated by a weekly ingest, gated fully dark by
`BILLIONAIRE_DONOR_MATCH_ENABLED` (default off). No serve shape or UI decision exists
yet; design against the facts below with the same "close the gap before building UI"
discipline as everything else in this doc, and read the scope note below before treating
this as general donor lookup.

**Scope, precisely:** not general individual-donor lookup — FEC's full itemized donor
data still isn't served anywhere (see §6). This is a curated, hand-verified watchlist of
~59 well-known US billionaires (Musk, Bezos, Soros, the Kochs, Griffin, and similar —
each individually sourced from Wikipedia/Forbes, not comprehensive), matched by name
against FEC records. Anyone not on that list is invisible here, same as before.

Two kinds of match, both raw evidence rows, deliberately never combined into a
fabricated number:

- **Direct-to-candidate** — a billionaire personally wrote the candidate's committee a
  check (capped ~$3,300/cycle by law). Carries `candidateId`.
- **Via a Super PAC** — a billionaire gave to a PAC that is *separately* known (via §1's
  `outsideSpending` / `topPacs` data) to have spent money supporting or opposing a
  candidate. `candidateId` is deliberately NULL on these rows — a PAC pools many donors'
  money, so this never claims "this billionaire's exact dollars funded the ad against
  your candidate," only two true facts side by side: "gave $X to PAC Y" + "PAC Y spent
  $Z FOR/AGAINST candidate D" (the second fact is already shippable via
  `outsideSpending`).

Every match carries a confidence tier design must not hide or flatten:

| Confidence | What it means                                                                                        | 2026 cycle so far (first live run) |
| ---------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `high`     | name match + employer field corroborates (e.g. "GRIFFIN, KENNETH" / employer "CITADEL")               | 456 rows                            |
| `medium`   | name match, employer blank/generic (retired, self-employed, N/A) — not confirmed, not contradicted    | 205 rows                            |
| `low`      | name match only, employer points somewhere unrelated — likely a same-name stranger, kept for human review, not meant to surface | 172 rows                            |

**Ship gate, same shape as §4's promise ledger:** rows exist so a human can review them,
not so a UI can show them unreviewed. Any design must either omit `low` entirely or
label it unmistakably as unverified; `medium` needs its own explicit call before design
treats it as confirmed — do not silently promote either tier to look like `high`.

Future serve shape (not yet built — field list for design reference only):

```ts
interface BillionaireDonorMatch {
  billionaireName: string;
  netWorthUsd: string; // as-of a cited source, not live-updated
  sourceOfWealth: string;
  committeeType: "candidate" | "pac";
  candidateId: string | null; // null on every PAC-path row, see above
  amount: string;
  contributionDate: string | null;
  matchConfidence: "high" | "medium" | "low";
  matchSignals: string; // human-readable — what corroborated or didn't
  sourceUrl: string; // the FEC bulk file this row came from
}
```
