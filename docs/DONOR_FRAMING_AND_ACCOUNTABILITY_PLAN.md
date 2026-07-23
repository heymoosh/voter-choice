# Donor-bucket framing + candidate accountability data — plan

> Status: **plan, awaiting external vetting.** No code changes accompany this doc.
> Date: 2026-07-23. Author: session with Muxin, from her review notes on the Money-trail
> surface plus three pieces of unsolicited user feedback about promise-keeping.
> Prior art this supersedes nothing: `docs/FUNDING_DATA_SPARSENESS.md` remains accurate
> for the ingest-coverage story; this doc is about _framing_ and _net-new data_.

## How to vet this doc

If you are an AI or reviewer being asked to check this plan, the highest-value things to
attack, in order:

1. **The legal claims in the Context section.** Three load-bearing assertions: that $200 is
   the FEC itemization threshold and not our editorial choice; that sub-$200 money is
   genuinely un-decomposable in public filings; and that corporations cannot contribute to
   federal candidates. If any of those is wrong, Part 1 changes shape.
2. **Part 5's sourcing.** The promise corpus is the weakest link — see Open Risks #1. We
   found the Library of Congress bulk archive covers 2000–2016 only, which kills the source
   the original research recommended. Is there a better corpus we missed?
3. **Whether a scored kept/broken verdict is defensible at all.** This is an editorial
   judgment we would own publicly. Muxin has explicitly chosen it over a
   show-both-sides-and-let-the-voter-judge design. Argue the other side if you think it
   is the wrong call.
4. **Whether Parts 3 and 4 are worth building** versus answering those questions with live
   web search. Muxin's stated reason for building: _"I don't want to spend web search calls
   on this if we can instead build a database that it calls internally — I'd trust it more."_

What is **already decided** and not up for re-litigation (see Decisions taken): the bucket
label wording, keeping $200 on `/methodology` only, and the choice of a scored tracker.

---

## Context

Two problems and one net-new build, from Muxin's review notes.

**1. The donor buckets mislead and over-disclose.** The card prints `Small donors <$200` /
`Large donors ≥$200`. Two things are wrong with that. The framing implies $200 is an
"everyday person" amount — but the median American donates nothing at all, and of those who
do give, ~55% give under $100. So $200 is nearer the _top third_ of donors than the median.
And printing the cut-line invites gaming.

Important correction to the premise: **$200 is not our methodology.** `federal-donors.ts:414-431`
reads FEC's `individual_unitemized_contributions` vs `individual_itemized_contributions`. Federal
law requires itemization once a donor's cycle aggregate passes $200; below that the FEC publishes
one undifferentiated lump. So (a) there is nothing to game — it is public statute, and (b) we
_cannot_ re-cut at $100 even if we wanted to, because sub-$200 money has no per-donation detail in
any filing. The fix is therefore **labelling**, not re-bucketing: describe _who_ each bucket is,
the way `PACs · groups & lobbies` already does.

Muxin's honest question — do corporations fall in the "large individual" bucket? **No.**
Corporations cannot donate to a federal candidate at all (52 U.S.C. §30118). Corporate money
reaches a candidate as (i) a corporate-sponsored PAC → lands in our **PACs** bucket, or (ii)
super-PAC independent expenditures → not in candidate receipts, so absent from our numbers
entirely. Worth fixing alongside: our **industry** buckets ("Healthcare industry") are derived
from the _employer field on individual donations_ — people who work in that sector, not the
company. Current copy implies the company wrote a cheque.

**2. "No FEC filing data" is mostly wrong.** Live prod query
(`npx tsx --env-file=.env.local scripts/ingest/_coverage-by-layer.ts 2026`, run 2026-07-23):

|         | total  | none  | top-line only | small/large/PAC | sectors | issue-PACs |
| ------- | ------ | ----- | ------------- | --------------- | ------- | ---------- |
| Federal | 3,099  | 587   | 91            | **2,421**       | 1,623   | 620        |
| All     | 11,108 | 8,154 | 113           | 2,841           | 1,993   | 620        |

78% of federal candidates have a full breakdown. So a federal candidate showing "no data" is
almost certainly `candidate_not_resolved` — a name-match miss in `resolveCandidateId`
(`src/lib/server/alignment.ts:250`) — not missing data. State/local (73% `none`) is the genuine hole.

**3. Voters keep asking a question we can't answer.** Twice now: _did the candidate honour the
promises they ran on?_ One verbatim: _"I'd like to see what promises the candidate made/is making
to get elected and how that aligns with their behavior along with the issues I personally care
about. I'd also want to know who their closest partisan and bipartisan collaborators are and which
committees they are on — maybe some kind of analysis of their working style or power levers."_

We have votes, bills, issue tags, stock trades, lobbying activity and press releases — but
**no cosponsorship, no committee assignments, and no promise corpus**. Muxin wants this in our own
DB, not resolved by live web search, so answers are reproducible and trustworthy.

---

## Decisions taken

| Decision        | Choice                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Bucket copy     | Keep the names "Small donors" / "Large donors"; delete the `<$200` / `≥$200` sub-labels; add a corporations gloss |
| $200 disclosure | Scrubbed from every card/legend/prompt surface; **kept on `/methodology`** so numbers stay reproducible           |
| Promise display | **Scored kept / broken / compromise / stalled** tracker (PolitiFact-style) — an editorial judgment we own         |
| Scope           | All of it, fully planned. Multi-PR, multi-session                                                                 |

---

## Part 1 — Donor bucket copy

Surgical: change display strings only. Do **not** touch `donor_aggregates.bucket_label` — that
string is the ingest contract shared by `federal-donors.ts`, `federal-sectors-bulk.ts` and ~40
state ingests, and `race-data.ts:248-249` already filters funding-mix labels out of
`donorCoalition` so they never reach the UI on the DB path.

**`src/prototype/VoterChoiceApp.tsx`** (en block, then mirror in the `es` block at ~:1260/:1643/:1669):

- `:422` `mixKeySmallSub: 'under $200'` → `'individuals'`
- `:424` `mixKeyLargeSub: '$200+'` → `'individuals'`
- `:828` `smallDonorsThreshold: '<$200'` → `'individuals'`
- `:830` `largeDonorsThreshold: '≥$200'` → `'individuals'`
- `:854` `smallDonorsAgenda` → `'Individual people giving in small amounts. No single agenda.'`
- `:856` `largeDonorsAgenda` → `'Individual people giving large amounts. Still individuals — companies cannot donate to a candidate directly.'`
- `:2405-2406` — **hardcoded, not i18n**: `Small donors <small>&lt;$200</small>` / `Large donors <small>≥$200</small>`. Route through `t()` like the `:3269` and `:3463` legends already do.
- New legend gloss beside the existing `pacGlossDefinition` (`:836`): _"Individual donors are people. Companies cannot donate to a candidate directly — their money moves through PACs."_
- `:826` `industryAgenda` (in `fundingSources`) — reword so it reads as _donors who work in that industry_, not the company.

**`src/lib/translations.ts:947` (en) and `:1649` (es)** — `racePatternsDonorMethodologyNote` currently
`"% by total contribution amount · Small donor = under $200 per donation"`. Drop the threshold clause;
keep `"% by total contribution amount"`.

**Prompt vocabulary** — the LLM ballot path emits `donorCoalition` labels verbatim and they can render
raw, so the parenthetical must leave the vocabulary too:

- `docs/PATTERN_TAXONOMIES.md:26-27` — `Small individual donors` / `Large individual donors`
- `docs/BALLOT_PROMPT.md:253-254` — same, plus rewrite the "means individual contributions under $200
  per donation" gloss to say _aggregated by dollar amount, split at the federal itemization line_
- Regenerate `src/lib/generated/ballotPromptEn.generated.ts` (do not hand-edit)
- `docs/BALLOT_PROMPT_ES.md` if it carries the same vocabulary

**`/methodology`** — the "Donor data comes from FEC + state filings" block at
`src/prototype/VoterChoiceApp.tsx:6159`. Add a _How we count donations_ paragraph that does name the
$200 FEC itemization threshold, states that corporations cannot donate directly, and explains that
industry buckets come from donor employer fields.

Tests to update: `src/lib/server/donors.test.ts`, `race-data.test.ts`, `RepCard.test.tsx`,
`e2e/prototype-core.spec.ts`, `design-tokens.test.ts` if it snapshots copy.

> **Note for a later card, not this one:** "Small donors" still frames sub-$200 as the everyday
> baseline when the true median is $0. A percentile framing ("gave more than 97% of Americans")
> would be more honest but needs a defensible denominator — flag it, don't build it here.

---

## Part 2 — "No FEC data" diagnostic and fix

1. **Instrument the miss.** `donorFieldsFromResult` (`src/lib/server/race-data.ts:232-239`) collapses
   three distinct reasons into prose. Log the raw `reason` plus `(name, jurisdiction, stateCode)`
   server-side so we can count `candidate_not_resolved` vs `no_donor_data` in production.
2. **Measure it offline.** New read-only `scripts/ingest/_resolution-miss-report.ts`, modelled on
   `_coverage-by-layer.ts`: replay every 2026 federal ballot name through `resolveCandidateId` and
   report which fail. Expected causes, from the tier logic at `alignment.ts:284-339`: mixed
   `[D-NJ]` state decoration in `candidates.full_name`, nicknames, suffixes, hyphenated surnames.
3. **Fix the top classes**, and add a regression fixture per class. `resolveCandidateId` is already
   known to be latently vulnerable on the chat/ballot path — the earlier House mis-resolution fix
   only threaded the resolved id through delegation.
4. **Honest copy for the real gap.** Where data genuinely is absent (state/local), the message
   should say _we don't have state filings for this office yet_, not imply the candidate filed nothing.

---

## Part 3 — Committee assignments

Source: **`unitedstates/congress-legislators`** — `committees-current.yaml` +
`committee-membership-current.yaml`. CC0 public domain, keyed by bioguide ID (we already store
`bioguide_id` on `member_civic_positions`). Cheapest correct source; almost certainly where
Integrity Index's committees page comes from too.

- Migration: `committees` (thomas_id, name, chamber, jurisdiction, parent_committee_id) and
  `committee_memberships` (candidate_id FK, committee_id FK, rank, title, congress).
- `scripts/ingest/committee-assignments.ts` — follow the `member-stats.ts` shape (bioguide join,
  upsert, `source` + `source_url`, idempotent).
- Read layer in `src/lib/server/` beside `alignment.ts`; surface on the seat card as
  _what this member has formal jurisdiction over_ — chair/ranking flagged, since that is the
  actual power lever.

## Part 4 — Collaborator network (cosponsorship)

Source: **Congress.gov API** `/bill/{congress}/{type}/{number}/cosponsors`. We already hold
`CONGRESS_GOV_API_KEY` and `CONGRESS_GOV_BASE_URL` (`.env.example`), and `crs-summaries.ts`
already has a working client against `api.congress.gov/v3`.

- Migration: `bill_cosponsors` (bill_id FK, candidate_id FK, is_original, date_cosponsored).
- `scripts/ingest/bill-cosponsors.ts` — reuse the `crs-summaries.ts` fetch/backoff helpers;
  backfill over the `bills` rows we already hold.
- Derived read: top same-party and top cross-party collaborators by shared-bill count, computed
  in SQL at request time (no derived table until it's slow).
- External benchmark: **Lugar Center–Georgetown Bipartisan Index** as a citable cross-check —
  cite it, don't ingest it.

## Part 5 — Promise ledger + kept/broken scoring

The hard one, and the one with a real sourcing risk.

**Sourcing reality check.** The original research brief recommended the Library of Congress
Elections Web Archive as the promise corpus. It is **not usable as specced**: the bulk CDX data
package covers **2000–2016 only**. For 2026 the practical archive layer is the **Wayback Machine
CDX API** (free, public) against campaign-site URLs, plus:

- **`dwillis/congress-press`** (MIT) — already wired at
  `scripts/ingest/congress-press-rationales.ts`; same corpus capitolreleases.com scrapes
  ("four times daily from official House and Senate.gov press pages"). This covers promises made
  _in office_.
- **Ballotpedia Candidate Connection** — structured self-reported positions. Voluntary, so
  incomplete; **licence must be confirmed before ingest.**
- **Google Political Ads Transparency Center** (BigQuery, 2018→, 7-year retention) — promises
  made in paid ads.

**Schema:**

- `candidate_promises` — candidate_id, canonical_issue, sub_issue, promise_text, made_at,
  venue (`campaign_site` | `ad` | `press_release` | `questionnaire` | `debate`), source_url,
  archive_url, extraction_model_version.
- `promise_actions` — promise_id, action_type (`vote` | `sponsorship` | `cosponsorship` |
  `amendment` | `committee_action`), ref to `votes` / `bills` / `bill_cosponsors`, direction.
- `promise_verdicts` — promise_id, verdict (`kept` | `broken` | `compromise` | `stalled` |
  `not_yet_rated`), rationale, evidence refs, adjudicator_version, adjudicated_at.

**Pipeline:** extract promises (LLM over archived campaign pages + press releases) → link to
actions (deterministic issue-tag join over `issue_tags`, which already carries `stance_lens`) →
adjudicate (LLM, outcome-based like PolitiFact, not effort-based).

**Because this is a scored verdict we own, it needs the same rigour as the bill tagger:**
a hand-labelled gold set and a scored oracle pass, mirroring
`scripts/_gold-oracle.workflow.js` / `_gold-sample.ts` / `_subissue-gold-score.ts`. Ship no
verdict to production until the gold pass clears. Attribute _agenda-setting_ separately from
_outcome_ — never credit a member for a law merely because they introduced a similar bill.

**Every verdict must show its evidence inline**: `not_yet_rated` is a legitimate, visible state,
never a hidden one.

---

## Attribution — Integrity Index

Muxin wants a shout-out to <https://integrityindex.us> and explicitly does **not** want their data
pulled without permission. The site names no sources on its public pages; its scorecard is built
from four commitments (no corporate PAC money, stock-trading ban, ban lobbying, overturn Citizens
United), all of which are reconstructable from primary sources we already use or plan to use —
FEC, House/Senate financial disclosures, and Quiver Quantitative for stock activity (we already
have `member_stock_transactions` and `scripts/ingest/stock-transactions.ts`).

Action: add a credit line on `/about`, and separately email Nico
(<https://linktr.ee/stocking_the_capitol>) before touching anything of theirs.
`palewire/moneyinpolitics.wtf` is a campaign-finance jargon glossary — a good candidate to link
from the PAC gloss.

---

## Verification

- **Part 1** — `npm test` (donors, race-data, RepCard, structured-blocks); `npx playwright test
e2e/prototype-core.spec.ts`; then run the app and screenshot a federal seat card with a full
  breakdown (Cornyn or Nehls, both confirmed to have 2026 mix rows) to prove no `$200` renders
  anywhere and the corporations gloss reads correctly. A code-reading claim is not sufficient
  evidence for a visual change.
- **Part 2** — `npx tsx --env-file=.env.local scripts/ingest/_resolution-miss-report.ts` before
  and after; miss count must drop, and every fixed class needs a unit test.
- **Parts 3-4** — ingest with `--dry-run` first, then a scoped live run; spot-check one member's
  committees against `clerk.house.gov/committees` and one bill's cosponsors against its
  congress.gov page.
- **Part 5** — gold-set score reported before any verdict is enabled; keep it behind a flag
  (`PROMISE_TRACKER_ENABLED`) in the `CAN2026_DISPLAY_ENABLED` pattern until Muxin signs off.

## Open risks

1. **Promise corpus coverage is unknown.** No campaign-site URL list exists in our schema today;
   sourcing it (Ballotpedia? FEC Form 2?) is unresolved and could gate Part 5 entirely.
   Recommend a spike before committing to the schema.
2. **Ballotpedia licensing unconfirmed.** Do not ingest until cleared.
3. **Scored verdicts are an editorial liability.** Muxin's own observation that Integrity Index
   skews toward one party applies to us the moment we render `BROKEN`. The gold set is the
   mitigation, and per-verdict evidence is non-negotiable.
4. **Migration + security gate.** Parts 3-5 touch `db/**`, which trips the required
   `security-reviewed` label gate.

## Source appendix

Sources evaluated while writing this plan, with the verdict on each.

| Source                                       | Use                                        | Verdict                                                              |
| -------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| FEC `/candidates/totals/`, bulk files        | Funding mix, sectors                       | Already wired (`federal-donors.ts`, `federal-sectors-bulk.ts`)       |
| Congress.gov API v3                          | Cosponsors, amendments, committee activity | **Adopt for Part 4** — key already held                              |
| `unitedstates/congress-legislators` (CC0)    | Committee assignments                      | **Adopt for Part 3** — cheapest correct source                       |
| GovTrack API                                 | Votes, member stats                        | Already wired (`federal-votes.ts`, `member-stats.ts`)                |
| `dwillis/congress-press` (MIT)               | In-office statements                       | Already wired (`congress-press-rationales.ts`)                       |
| capitolreleases.com                          | In-office statements                       | **Redundant** — same House/Senate press-page corpus as above; no API |
| LoC US Elections Web Archive                 | Campaign promises                          | **Rejected** — bulk package is 2000–2016 only                        |
| Wayback Machine CDX API                      | Campaign promises                          | **Adopt for Part 5** — but needs a campaign-URL list we don't have   |
| Ballotpedia Candidate Connection             | Self-reported positions                    | Candidate; **licence unconfirmed**                                   |
| Google Political Ads Transparency (BigQuery) | Promises in paid ads                       | Candidate; 2018→, 7-yr retention                                     |
| Lugar Center Bipartisan Index                | Cross-party benchmark                      | Cite, don't ingest                                                   |
| PolitiFact promise trackers                  | Methodology reference                      | Reference only — presidents only, not Congress                       |
| OpenSecrets                                  | Money context                              | Secondary to FEC                                                     |
| Quiver Quantitative                          | Stock activity                             | Already wired (`stock-transactions.ts`)                              |
| integrityindex.us                            | —                                          | **Do not scrape.** Credit + ask permission                           |
| ProPublica Congress API                      | —                                          | Dead                                                                 |
