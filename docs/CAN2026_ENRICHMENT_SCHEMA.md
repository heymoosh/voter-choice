# CAN2026 Enrichment Schema — Design Doc

**Status:** Design only. No migration written, no `db/schema.ts` edits. This doc is the durable spec a future coding agent picks up when we decide to ingest CAN data.

**Author context:** Produced from a read-only evaluation of [can2026.org](https://can2026.org) (Constitutional Accountability Now, run by Paul Zurav LLC) as a candidate enrichment source for voter-choice. This revision is backed by an **exhaustive field parse of the whole site** (29 pages + both data datasets), not a sample. Content snapshot evaluated: **"Updated May 22, 2026"**, fetched 2026-05-28.

**Scope of CAN data:** **Federal only** (House + Senate 2026 races). No state-legislature data. Confirmed counts at this snapshot: 50 states in each of two datasets; **1,160 key-vote rows**; ~167 donor trails; 10 fully-described bills; 14 pending House profiles; ~404 race ratings (≈3 forecaster ratings per race); ~114 source citations; exactly 1 "observable correlation" finding.

---

## 0. How the data is physically stored (read this before designing the ingester)

This is the single most important structural fact, and it changes the ingestion plan:

- The site is an **Astro build from a website-builder** (template `aigenerated`, v201). Fetching **`https://can2026.org/2026-elections`** returns one ~1.9 MB payload whose `<astro-island props="…">` attribute holds the **entire site content graph**, HTML-entity-encoded.
- Candidate/race data is **NOT modeled as JSON objects.** It is **pre-rendered HTML strings** assigned as `CARDS["XX"] = \`…HTML…\`` per US state. **Fields are expressed as CSS classes, table columns, and tag labels inside that HTML** — there are no stable JSON field names. The ingester must parse HTML.
- There are **TWO separate `var CARDS` datasets** in the payload:
  - **Dataset A — SENATE** ("…the race profile for that Senate seat")
  - **Dataset B — HOUSE** ("…its House race profile. Light gray states have profiles in development")
- Plus two lookup objects: **`var BILLS`** (the 10-bill description dictionary) and **`var BTN_COLORS`** (state→hex, presentational only).
- **Class names are overloaded** — e.g. `tag-safer` renders both a "Safe R" *rating* and a plain "Republican" *party label*; `vote-y` and `vote-yea` are the same value coming from the two different datasets. Normalize on ingest.
- The candidate/race/vote/donor data lives **only** in the `/2026-elections` payload — other routes are *different content*, not more of the same data. Verified by reading them directly: `/government-record-old` is an **empty "Archive Is Being Built" framework** (proposed fields, a roster of names, **no records, no date stamp**), and the **case-file pages** (`/oversight-case-files`, `/epstein-files`, …) are **narrative oversight stories** with no structured per-member data (see §5.4). So `/2026-elections` is the canonical source for everything in this schema.

Every "field" below is therefore a parse target, and every top-level table keeps a `raw_html` fragment so re-parsing survives a class-name change.

---

## 1. Design principles

1. **Namespace everything `can_*`.** CAN data is a *distinct, attributed source*, not a drop-in to our existing tables. Its own tables give unambiguous provenance, let us drop/refresh the whole source without touching our GovTrack/OpenStates/FEC pipelines, and make attribution to CAN/Paul Zurav structural rather than a comment.
2. **Crosswalk, don't merge.** CAN entities link to our `candidates.id` / `bills.id` / `votes.id` via **nullable** FK columns plus a `match_method`. CAN profiles challengers and bills we may not have rows for yet, so every link must tolerate "no match."
3. **Provenance on every row.** Every table carries `source_url` and a `snapshot_date`. CAN is a single-maintainer site with rebuild/sustainability risk; we must always know how fresh a fact is and which snapshot it came from.
4. **Normalize ratings and money line-items.** Race ratings (≈3 raters per race) and donor sectors (N per candidate) are one-row-per-fact, so we can show all of them, diff them across snapshots, and avoid wide sparse columns.
5. **Model two person classes, not one.** CAN profiles both **2026 ballot candidates** *and* **sitting members who are NOT on the 2026 ballot** (next election 2028/2030) — and the latter is the larger, vote-rich population. For *alignment* these incumbents matter most (they have the voting records we score). `can_candidates.record_type` distinguishes them; `race_id` is nullable for sitting members tied only to a state.
6. **Parse HTML, normalize verbatim labels, keep the raw.** Fields come from rendered HTML with overloaded classes and free-text labels (donor sectors, FEC metrics, vote qualifiers). Store the **verbatim** string *and* a normalized value; keep `raw_html` so a missed field is recoverable. Never assume a controlled vocabulary where the site uses prose.
7. **Curated prose is the asset — give it room.** CAN's distinctive value over our summary-tagging is human-written *context*: vote Notes, donor-notes, data-gap boxes, the correlation finding, bill procedural notes. Budget `TEXT` columns (and a polymorphic annotations table) for it; do not try to force it into enums.
8. **Do NOT touch `src/lib/canonicalIssues.ts`.** Nothing in CAN ingestion requires it. See §5.

---

## 2. Entity map (what CAN actually publishes)

| CAN concept | Example from the site | Table |
|---|---|---|
| Ingest provenance | "Updated May 22 2026"; fetched 2026-05-28; senate+house row counts | `can_ingest_runs` |
| A 2026 race / seat (Senate or House district) | "Alabama Senate — open seat; Tuberville not seeking reelection" | `can_races` |
| A **pending** House profile (in development) | "Delaware — 1 seat \| Safe Democrat \| Harris +13 (2024)" + what-we-know/what-is-pending | `can_races` (status `pending_profile`) + `can_annotations` |
| Race rating per forecaster / pollster / CAN | Cook = Lean R, Sabato = Likely R, Inside Elections = Safe R, CAN-own chip | `can_race_ratings` |
| A profiled **2026 candidate** | Tom Cotton (R-AR), Susan Collins (R-ME) | `can_candidates` (`record_type=ballot_2026`) |
| A **sitting member NOT on the 2026 ballot** | Lisa Murkowski (R-AK), next election 2028 | `can_candidates` (`record_type=current_member_not_on_ballot`) |
| Donor-trail header | Cotton: raised $11.88M; cash $9.67M; PAC ~22%; window 2025–2026 | `can_donor_trails` |
| Donor-trail curated note (dark money / issue-PAC prose) | "Fairshake spent ~$1.97M…; AIPAC $44,518; no 2026 Fairshake confirmed" | `can_donor_trails.note` |
| Donor sector line-item | "Ideology/Single-Issue $1,866,426", "Securities & Investment $1,027,346" | `can_donor_sectors` |
| Free-form FEC / finance metric row | "Unitemized small-dollar donations $X"; "Senate Majority PAC TV ad commitment $X" | `can_finance_metrics` |
| Named issue-PAC fact (structured) | "AIPAC career total $237,577"; "No Fairshake/crypto confirmed 2026" | `can_issue_pac_contributions` |
| Curated bill narrative (the 10-bill dictionary) | "HR1 (One Big Beautiful Bill Act)" w/ CBO impact + procedural note | `can_bill_narratives` |
| A candidate's key vote (1,160 rows) | Collins on CARES/ARP/IIJA/IRA, each w/ Yea/Nay + context + procedural note + source | `can_candidate_key_votes` |
| Curated prose block (data gap, race notes, correlation, pending blocks) | "DATA GAP: no documented dark money…"; "OBSERVABLE CORRELATION: …" | `can_annotations` |
| Source citation (per-vote source + per-card source-box) | "Cook Political Report \| Inside Elections / 270toWin"; "Fairshake FEC (C00835959)" | `can_citations` |

**Out of the candidate-enrichment scope (parsed, not modeled): editorial pages.** 29 pages exist; the data-bearing ones are only the Senate + House explorers. The rest are prose — methodology/explainer pages, legal/admin, and **investigative content** (oversight case files: Epstein files, Jack Smith hearing; dated blog reports). These are advocacy/oversight editorial, not per-representative data. See §5.4.

---

## 3. Proposed tables (Drizzle-style; implement in `db/schema.ts` when greenlit)

> Convention notes: text PKs use a deterministic natural key where one exists (so re-ingest is idempotent via upsert); otherwise `uuid().defaultRandom()`. All money is `numeric(15,2)`. All enums are `text` with allowed values documented inline (matches existing `votes.vote_cast`, `issue_tags.stance_lens`). Every parse-target field stores a verbatim `*_raw` alongside the normalized value where the source is free-text.

### 3.1 `can_ingest_runs` — provenance header
```ts
export const canIngestRuns = pgTable("can_ingest_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceUrl: text("source_url").notNull(),           // "https://can2026.org/2026-elections"
  contentUpdatedLabel: text("content_updated_label"),// CAN's own stamp, "Updated May 22, 2026"
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  snapshotDate: date("snapshot_date").notNull(),     // date this run's rows are stamped with
  rowsParsed: jsonb("rows_parsed"),                  // {senateRaces, houseRaces, candidates, votes, ratings, donorTrails, ...}
  templateVersion: text("template_version"),         // "aigenerated v201" — detect builder upgrades
  contentChecksum: text("content_checksum"),         // hash of decoded payload; detect rebuilds
  notes: text("notes"),
});
```
Every other `can_*` row references a `snapshot_date`; this is the audit trail of where each snapshot came from and whether the upstream format changed (`content_checksum`, `template_version`).

### 3.2 `can_races` — one row per federal seat (Senate or House district); also holds pending profiles
```ts
export const canRaces = pgTable("can_races", {
  // Deterministic key: "<state>-<chamber>[-<district>]", e.g. "AL-senate", "AZ-house-06"
  id: text("id").primaryKey(),
  state: text("state").notNull(),                    // USPS code, "AL"
  chamber: text("chamber").notNull(),                // "house" | "senate"
  district: text("district"),                        // nullable; null for senate
  senateClass: text("senate_class"),                 // "I" | "II" | "III" | null
  raceSummary: text("race_summary"),                 // curated ch-race line: "Dan Sullivan (R, Inc) vs. Mary Peltola (D) · Toss-Up"
  raceStatus: text("race_status"),                   // "general"|"open_seat"|"runoff"|"special_election"|"pending_profile"
  isOpenSeat: boolean("is_open_seat").notNull().default(false),
  // CAN's own state/race rating chip + the overall state-grid rating (incl. not-on-ballot codes "D -- 2028")
  canOwnRating: text("can_own_rating"),              // normalized: "toss_up"|"lean_d"|...|"safe_r"
  canOwnRatingRaw: text("can_own_rating_raw"),
  overallStateRating: text("overall_state_rating"),  // "Safe Republican"|"Pending"|"D -- 2028"|...
  // House-only classification tags (Dataset B). text[] of: committee_power, watch_list, redistricted,
  // money_network, fairshake_watch, crypto_funded, leadership_pac_flow, tier3_outside_spending, special_election
  flags: jsonb("flags"),
  retirementContext: text("retirement_context"),     // "Tuberville not seeking reelection, ran for governor"
  electoralBaseline: text("electoral_baseline"),     // "Harris +13 (2024)" / "Trump won by 29 points"
  electionDate: date("election_date"),
  primaryDate: date("primary_date"),
  primaryResults: jsonb("primary_results"),          // [{name, party, pct}, ...]
  buttonColorHex: text("button_color_hex"),          // BTN_COLORS["XX"] — presentational, party/lean-coded
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
  rawHtml: text("raw_html"),                          // decoded CARDS[state] fragment for this race
}, (t) => [
  index("can_races_state_idx").on(t.state),
  index("can_races_chamber_idx").on(t.chamber),
]);
```
**One polymorphic table for both chambers** (recommended over two): Senate and House share most fields; House adds `flags` (Committee Power / Watch List / Redistricted / Money Network …) and the `pending_profile` status. Pending House districts are real seats with thin data — they live here with `raceStatus="pending_profile"` and their what-we-know / what-is-pending / ETA prose in `can_annotations`.

### 3.3 `can_race_ratings` — one row per (race, rater)
```ts
export const canRaceRatings = pgTable("can_race_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  raceId: text("race_id").notNull().references(() => canRaces.id),
  rater: text("rater").notNull(),                    // "cook"|"sabato"|"inside_elections"|"270towin"|"can_own"|"<pollster>"
  raterType: text("rater_type").notNull(),           // "forecaster"|"pollster"|"can_own"
  rating: text("rating").notNull(),                  // normalized: "toss_up"|"lean_d"|"lean_r"|"likely_d"|"likely_r"|"safe_d"|"safe_r"
  ratingRaw: text("rating_raw"),                     // verbatim label before normalization ("Solid R", "Lean D")
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  uniqueIndex("can_race_ratings_race_rater_snap_uidx").on(t.raceId, t.rater, t.snapshotDate),
  index("can_race_ratings_race_idx").on(t.raceId),
]);
```
The ~404 ratings ≈ 3 forecasters (Cook, Sabato, Inside Elections) × races, cited as prose in the member subtitle, **plus** CAN's own chip and occasional pollster numbers (Change Research / Emerson / Cherry appear in race-notes). `rater_type` lets the UI separate forecaster consensus from a one-off poll. Unique on (race, rater, snapshot) keeps a time-series of rating movement — itself a signal.

### 3.4 `can_candidates` — profiled people (ballot candidates AND sitting members) + crosswalk
```ts
export const canCandidates = pgTable("can_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  raceId: text("race_id").references(() => canRaces.id), // nullable; null for sitting members tied only to a state
  recordType: text("record_type").notNull(),        // "ballot_2026" | "current_member_not_on_ballot"
  canName: text("can_name").notNull(),               // name as printed on CAN
  party: text("party"),                              // "R" | "D" | "I"
  state: text("state"),
  // "incumbent"|"incumbent_appointed"|"challenger"|"primary_challenger"|"open_seat_nominee"|"retiring"|"current_not_on_ballot"
  incumbentStatus: text("incumbent_status"),
  nextElectionYear: integer("next_election_year"),   // 2028 | 2030, for current_member_not_on_ballot
  primaryResultPct: numeric("primary_result_pct", { precision: 5, scale: 2 }),
  narrativeSummary: text("narrative_summary"),       // bio-text / member-panel prose (education, career, LCV score, etc.)
  dataStatus: text("data_status"),                   // "complete"|"proxy"|"pending"|"profile_pending"
  // --- crosswalk to our data ---
  ourCandidateId: text("our_candidate_id").references(() => candidates.id), // nullable
  matchMethod: text("match_method"),                 // "exact_name_jurisdiction"|"fuzzy"|"manual"|"unmatched"
  matchConfidence: numeric("match_confidence", { precision: 4, scale: 3 }),
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  index("can_candidates_our_cand_idx").on(t.ourCandidateId),
  index("can_candidates_race_idx").on(t.raceId),
  index("can_candidates_record_type_idx").on(t.recordType),
]);
```
`our_candidate_id` is the durable bridge for "show CAN's donor trail / key votes on our candidate page." **The `current_member_not_on_ballot` rows are the alignment-critical ones** — they carry the voting records we score, even though they aren't 2026 candidates. Nullable FK because CAN profiles people we may not have ingested yet.

### 3.5 `can_donor_trails` — donor-trail header + curated note per (person, cycle window)
```ts
export const canDonorTrails = pgTable("can_donor_trails", {
  id: uuid("id").primaryKey().defaultRandom(),
  canCandidateId: uuid("can_candidate_id").notNull().references(() => canCandidates.id),
  cycleWindow: text("cycle_window").notNull(),       // "2025-2026" | "2019-2024" | "data pending"
  totalRaised: numeric("total_raised", { precision: 15, scale: 2 }),
  cashOnHand: numeric("cash_on_hand", { precision: 15, scale: 2 }),
  cashOnHandAsOf: date("cash_on_hand_as_of"),        // the "(March 31, 2026)" glued to the figure
  pacSharePct: numeric("pac_share_pct", { precision: 5, scale: 2 }),
  note: text("note"),                                // donor-note PROSE: dark-money + issue-PAC narrative (AIPAC/Fairshake/crypto)
  dataStatus: text("data_status"),                   // "complete"|"proxy"|"pending" (proxy = House figures shown while Senate profile pending)
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  uniqueIndex("can_donor_trails_cand_window_uidx").on(t.canCandidateId, t.cycleWindow),
]);
```
`note` is the curated **donor-note** prose where the AIPAC/Fairshake/crypto/dark-money story actually lives in free text; `can_issue_pac_contributions` (§3.8) holds the same facts *structured* when they're cleanly extractable. Keep both: the prose is always present, the structured rows aren't.

### 3.6 `can_donor_sectors` — OpenSecrets-sector line items
```ts
export const canDonorSectors = pgTable("can_donor_sectors", {
  id: uuid("id").primaryKey().defaultRandom(),
  donorTrailId: uuid("donor_trail_id").notNull().references(() => canDonorTrails.id),
  sectorLabelRaw: text("sector_label_raw").notNull(),// verbatim, spellings vary ("Securities & Investment" vs "Securities and Investment")
  sectorLabel: text("sector_label"),                 // normalized to a canonical OpenSecrets sector
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  rankInTrail: numeric("rank_in_trail", { precision: 4, scale: 0 }), // display ordering (top-5 per candidate)
}, (t) => [
  uniqueIndex("can_donor_sectors_trail_sector_uidx").on(t.donorTrailId, t.sectorLabelRaw),
]);
```
**Donor sector labels are NOT a controlled vocabulary** — they follow OpenSecrets sectors but with inconsistent abbreviation. Store `sectorLabelRaw` verbatim and normalize into `sectorLabel`. **Note vs. our `donor_aggregates`:** ours buckets into ~20 canonical industry buckets from FEC/FollowTheMoney; CAN uses OpenSecrets sectors. Keep them separate — do NOT remap at ingest (lossy); a `sector_label → bucket_label` crosswalk table is a separate future decision.

### 3.7 `can_finance_metrics` — free-form FEC / finance line-items
```ts
export const canFinanceMetrics = pgTable("can_finance_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  canCandidateId: uuid("can_candidate_id").notNull().references(() => canCandidates.id),
  metricLabelRaw: text("metric_label_raw").notNull(),// bespoke per card: "Total raised (cycle)", "Unitemized small-dollar donations", "Senate Majority PAC TV ad commitment"
  metricLabel: text("metric_label"),                 // optional normalized key, nullable
  amount: numeric("amount", { precision: 15, scale: 2 }),
  asOfDate: date("as_of_date"),                      // nullable
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  index("can_finance_metrics_cand_idx").on(t.canCandidateId),
]);
```
CAN's "FEC Metric | Amount" table uses **free-form labels with no fixed schema** (and a few cards add columns like Individuals/PACs). This catch-all key/value table holds those rows verbatim; structured headline figures (total raised, cash on hand, PAC share) still live on `can_donor_trails`. Don't force these into fixed columns.

### 3.8 `can_issue_pac_contributions` — named issue-PAC tracking (AIPAC, Fairshake, …)
```ts
export const canIssuePacContributions = pgTable("can_issue_pac_contributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  canCandidateId: uuid("can_candidate_id").notNull().references(() => canCandidates.id),
  pacName: text("pac_name").notNull(),               // "AIPAC" | "Fairshake" | ...
  pacCategory: text("pac_category"),                 // "pro_israel" | "crypto" | ... (descriptive free text)
  amount: numeric("amount", { precision: 15, scale: 2 }), // nullable when only a flag/negative is known
  windowType: text("window_type").notNull(),         // "career" | "cycle"
  cycleWindow: text("cycle_window"),                 // nullable; set when windowType="cycle"
  confirmed: boolean("confirmed").notNull().default(true), // false stores CAN's negative assertions
  note: text("note"),                                // "No Fairshake/crypto confirmed 2026"
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  uniqueIndex("can_issue_pac_cand_pac_window_uidx").on(t.canCandidateId, t.pacName, t.windowType, t.cycleWindow),
]);
```
**This is where the AIPAC/Fairshake/crypto numbers live when structured — NOT in `canonicalIssues.ts`.** Donor-side money keyed by PAC name. `confirmed=false` faithfully stores negative assertions ("no crypto money confirmed"), which are themselves meaningful. Much of this also appears as prose in `can_donor_trails.note` — extract here when clean, keep the prose there always.

### 3.9 `can_bill_narratives` — the 10-bill curated dictionary + crosswalk to our `bills`
```ts
export const canBillNarratives = pgTable("can_bill_narratives", {
  id: uuid("id").primaryKey().defaultRandom(),
  // CAN's clickable key from `var BILLS`: one of tcja, ahca, cares, arp, iija, ira, kavanaugh, fra, obbb, genius
  canKey: text("can_key").notNull(),
  title: text("title").notNull(),                    // "Tax Cuts and Jobs Act (H.R. 1) — Dec. 19, 2017"
  billType: text("bill_type"),                       // "legislation"|"nomination"|"resolution"|"impeachment"
  narrative: text("narrative"),                      // "What it did:" — shared bill-level template, NOT per-vote
  proceduralNote: text("procedural_note"),           // "RC176/RC178 were motions to table; Yea = tactical maneuver…"
  // --- crosswalk to our data ---
  ourBillId: text("our_bill_id").references(() => bills.id), // nullable; CAN covers resolutions/PNs we may lack
  matchMethod: text("match_method"),                 // "exact"|"manual"|"unmatched"
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  uniqueIndex("can_bill_narratives_key_snap_uidx").on(t.canKey, t.snapshotDate),
  index("can_bill_narratives_our_bill_idx").on(t.ourBillId),
]);
```
Only **10 bills** are fully described (the `var BILLS` dictionary); the `narrative` ("What it did:") is a **shared template, bill-level, identical across candidates** — store it once here, never per vote. Many key-vote rows reference bills *without* a key (CLARITY Act, ACA repeal sub-votes RC168/176/178); those carry no narrative and link via `bill_label` on the key-vote row (§3.10). This is the highest-value qualitative layer CAN adds; it complements our AI `issue_tags`, it doesn't compete.

### 3.10 `can_candidate_key_votes` — a person's key votes (the 1,160-row Key Votes tables)
```ts
export const canCandidateKeyVotes = pgTable("can_candidate_key_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  canCandidateId: uuid("can_candidate_id").notNull().references(() => canCandidates.id),
  billLabel: text("bill_label").notNull(),           // printed name, always present ("Inflation Reduction Act (H.R. 5376)")
  dataBillKey: text("data_bill_key"),                // nullable; one of the 10 BILLS keys when the row is clickable
  billNarrativeId: uuid("bill_narrative_id").references(() => canBillNarratives.id), // nullable; set only for keyed bills
  voteCast: text("vote_cast"),                       // normalized: "yea"|"nay"|"present"|"not_voting"|"na"
  voteCastRaw: text("vote_cast_raw"),                // verbatim incl. qualifiers: "Yea (procedural)", "N/A -- Not yet senator"
  voteDateRaw: text("vote_date_raw"),                // verbatim, irregular: "Aug. 7, 2022", "Jul. 2017", "No floor vote yet"
  voteDate: date("vote_date"),                       // parsed when possible, nullable
  context: text("context"),                          // the curated Notes/Context column — the per-vote prose
  proceduralNote: text("procedural_note"),           // "Live Pair", "motion to table — tactical maneuver"
  source: text("source"),                            // per-vote Source column, usually "--"
  // --- crosswalk to our votes ---
  ourVoteId: uuid("our_vote_id").references(() => votes.id), // nullable
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  index("can_key_votes_cand_idx").on(t.canCandidateId),
  index("can_key_votes_billnarr_idx").on(t.billNarrativeId),
]);
```
The **`context` column is the curated vote-context layer we lack** — it explains *what a vote meant* ("one of three Republicans whose Nay defeated the bill", a "Live Pair" procedural gesture). Store `vote_cast_raw` verbatim because CAN encodes meaning in qualifiers ("N/A -- Not yet senator" ≠ a real abstention). This is what feeds the alignment "bridge" for federal races (see `ALIGNMENT_DATA_MODEL.md` §6).

### 3.11 `can_annotations` — polymorphic curated-prose blocks
```ts
export const canAnnotations = pgTable("can_annotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),         // "race"|"candidate"|"donor_trail"|"key_vote"
  entityId: text("entity_id").notNull(),             // referenced row id (text form)
  // "data_gap"|"race_notes"|"observable_correlation"|"pending_what_we_know"|"pending_what_is_pending"|"pending_eta"
  annotationType: text("annotation_type").notNull(),
  body: text("body").notNull(),                      // the curated prose
  disclaimer: text("disclaimer"),                    // e.g. correlation finding's "not evidence of quid pro quo"
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  index("can_annotations_entity_idx").on(t.entityType, t.entityId),
  index("can_annotations_type_idx").on(t.annotationType),
]);
```
Consolidates the curated prose that isn't already a first-class column: **DATA GAP / RACE NOTES** boxes, the **OBSERVABLE CORRELATION** finding (rare, editorially loaded, carries its own disclaimer), and the **pending House profile** what-we-know / what-is-pending / ETA blocks. Polymorphic by `(entity_type, entity_id)`, mirroring `can_citations`, so one query path serves all prose. The correlation finding is the one place CAN explicitly ties a donation timeline to a vote — surface it with its disclaimer intact, never as a bare claim.

### 3.12 `can_citations` — source citations attached to any CAN entity
```ts
export const canCitations = pgTable("can_citations", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),         // "race"|"candidate"|"donor_trail"|"bill_narrative"|"key_vote"
  entityId: text("entity_id").notNull(),
  sourceOrg: text("source_org").notNull(),           // "FEC.gov"|"OpenSecrets"|"Cook Political Report"|"NPR"|...
  fecCommitteeId: text("fec_committee_id"),           // when present, e.g. "C00835959" (Fairshake)
  citationUrl: text("citation_url"),
  citationDate: date("citation_date"),               // "NPR May 21 2026" -> 2026-05-21
  rawText: text("raw_text"),                          // verbatim source string (per-vote source OR pipe-delimited source-box)
  snapshotDate: date("snapshot_date").notNull(),
}, (t) => [
  index("can_citations_entity_idx").on(t.entityType, t.entityId),
]);
```
Two citation forms feed this: the per-vote `Source` column and the per-card pipe-delimited **source-box** ("A | B | C"). Some labels embed **FEC committee IDs** — capture them in `fec_committee_id` for a clean join to filings later. Map `source_org` against `docs/SOURCE_TIERS.md` at display time so CAN-sourced facts carry our existing tier discipline.

---

## 4. How this connects to existing features

- **Candidate page enrichment:** `candidates → can_candidates(our_candidate_id) → can_donor_trails / can_donor_sectors / can_finance_metrics / can_issue_pac_contributions`. Adds donor sectors, finance line-items, PAC facts, and a curated bio.
- **Incumbent voting record (alignment-critical):** the `current_member_not_on_ballot` rows + `can_candidate_key_votes(our_vote_id) → can_bill_narratives` give procedural notes + "what it meant" prose on top of a raw Yea/Nay. This is the federal vote-context overlay `ALIGNMENT_DATA_MODEL.md` §6 leans on.
- **Fundraising as a standalone signal:** `can_donor_trails.note` + `can_issue_pac_contributions` map onto the same axes/poles the vote scorer uses (see `ISSUE_DIRECTIONALITY_DESIGN.md` §5 and `ALIGNMENT_DATA_MODEL.md` §7), so "is this funder fighting for the voter's pole?" reuses the vote machinery.
- **Race view (new capability):** `can_races + can_race_ratings` gives forecaster consensus (Cook/Sabato/Inside Elections) + CAN's own call + pending-profile placeholders — race structure we have *zero* of today.
- **Alignment scoring:** still reads `issue_tags`. CAN narratives are display-side **bridge** context, not scoring inputs, unless a later design decides otherwise.

---

## 5. Explicitly out of scope (and why)

1. **`src/lib/canonicalIssues.ts` is NOT touched.** Issue-PAC tracking is donor-side (`can_issue_pac_contributions`), keyed by PAC name. The canonical issues are a *bill*-tagging taxonomy for alignment. The only reason to edit it would be a *separate, deliberate* decision to add alignment issues (e.g. `digital_assets`, `foreign_policy_israel`) — and it is **currently a live-edit collision risk** (the 2026 redesign has uncommitted changes there). Coordinate before ever touching it.
2. **Ingestion mechanism.** This doc defines the *destination* schema only. How data gets in — a partnership/structured handoff from Paul Zurav, or an Astro-props HTML parser of `/2026-elections` (§0, §7) — is a separate workstream. The schema is source-agnostic and idempotent (deterministic keys + upserts) so either path works.
3. **Remapping CAN donor sectors / FEC metrics onto our `donor_aggregates` buckets.** Lossy; deferred to an optional future crosswalk table.
4. **Editorial / investigative pages — read directly, deliberately excluded.** The site has ~5 **oversight case files** (Jack Smith hearing, Epstein Files Transparency Act, two Minneapolis police-killing files, a Venezuela war-powers vote; most "last updated February 2026") plus methodology/legal/blog prose. We confirmed by reading them that they are **narrative**: they name members' *statements, letters, and procedural actions* (a discharge petition, a blocked subpoena, a refusal to hold a hearing) but carry **no per-member roll-call votes** — the Epstein page even reports the bill "passed with near-unanimous support" with no member breakdown. So they do **not** serve vote-alignment ("did my rep vote my way?"). The companion `/government-record-old` "archive" is an **unpopulated framework** (no records, no date stamp). Net: the alignment-relevant CAN data is the `/2026-elections` **key-votes (with context) + donor/fundraising** only. The case files' *non-vote accountability* signal (procedural moves outside a vote) is real but sparse and unstructured; if we ever want it for a *separate* "oversight record" feature, add a `can_editorial` table (slug, type blog|case_file, title, last_updated, body, named_members[], citations[]) and reuse `can_citations` — not an alignment need.

---

## 6. Open decisions for the user before implementation

1. **Migration timing** — needs a Drizzle migration; should land in a worktree clear of the active 2026 redesign to avoid `db/schema.ts` churn collisions.
2. **One polymorphic `can_races` vs. two chamber tables** — recommended: **one** (Senate/House share most fields; House-only data sits in `flags` + `pending_profile` status). Flag if you'd rather split.
3. **Snapshot retention** — keep every snapshot (full time-series of rating movement, larger DB) vs. latest-only (upsert in place). Schema supports time-series; switch to latest-only by dropping `snapshot_date` from the unique indexes.
4. **Canonical source — resolved.** Direct reads of `/government-record-old` and the case-file pages confirm `/2026-elections` is the only page carrying structured candidate/race/vote/donor data; the others are empty-framework or narrative (§5.4). The ingester hits one URL.
5. **Data-status normalization** — `proxy` / `pending` / `data_gap` qualifiers are inline prose today; we lift them into `data_status` enums. Confirm the value set before building the parser.
6. **Attribution surface** — how CAN/Paul Zurav is credited in-product (structural via `source_url` + a per-feature credit line). Worth settling before launch given the partnership intent.
7. **Terms of use** — confirm CAN's terms permit programmatic ingest before any scraper runs.

---

## 7. Verification (re-confirm CAN's data independently)

The payload contains **two** `CARDS` datasets (Senate + House) plus `BILLS` and `BTN_COLORS`. A quick re-confirm of the headline counts:
```bash
curl -sL https://can2026.org/2026-elections | python3 -c "
import sys, re, html
raw = sys.stdin.read()
props = re.findall(r'props=\"([^\"]+)\"', raw)
big = max(props, key=len)                 # the ~1.9MB Page-component props blob
decoded = html.unescape(big)
print('CARDS datasets:', decoded.count('var CARDS'))          # expect 2 (Senate + House)
print('BILLS dict present:', 'var BILLS' in decoded)          # expect True (10 bills)
print('Donor trails:', decoded.count('Donor Trail'))          # ~167
print('Total raised mentions:', decoded.count('Total raised'))
print('Cash on hand mentions:', decoded.count('Cash on hand'))
print('Vote rows (approx):', len(re.findall(r'vote-(?:yea|nay|y|n|na)\b', decoded)))  # ~1160
print('Source citations:', len(re.findall(r'[Ss]ources?[:\s]', decoded)))            # 100+
"
```
Expected (May 22 2026 snapshot): **2** CARDS datasets, `BILLS` present, ~167 donor trails, ~1,160 vote rows, 50 states per dataset, 14 pending House profiles, 100+ citations. If `CARDS datasets` ≠ 2 or the count drifts sharply, the upstream template was rebuilt — re-run the exhaustive field parse before trusting the ingester.
