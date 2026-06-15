import {
  pgTable,
  text,
  boolean,
  jsonb,
  timestamp,
  uuid,
  date,
  integer,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// candidates
// ---------------------------------------------------------------------------
export const candidates = pgTable(
  "candidates",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull(),
    sourceId: text("source_id").notNull(),
    jurisdiction: text("jurisdiction").notNull(), // e.g. "federal-house" | "federal-senate" | "state-TX-house"
    isIncumbent: boolean("is_incumbent").notNull().default(false),
    // Structured seat columns (nullable — populated for federal rows by the
    // FEC 2026 roster ingest + incumbent backfill; a "race" is the group key
    // (state, district, office, electionYear)).
    party: text("party"), // verbatim FEC party code: "REP" | "DEM" | "LIB" | …
    state: text("state"), // USPS code, "TX"
    district: text("district"), // zero-padded House district, "07"; null for senate
    office: text("office"), // "house" | "senate"
    electionYear: integer("election_year"), // cycle the candidate filed for, e.g. 2026
    fecCandidateId: text("fec_candidate_id"),
    totalReceipts: numeric("total_receipts", { precision: 15, scale: 2 }), // cycle receipts (viability/ranking)
    rawMetadata: jsonb("raw_metadata"),
    insertedAt: timestamp("inserted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("candidates_seat_idx").on(
      t.state,
      t.district,
      t.office,
      t.electionYear,
    ),
    index("candidates_fec_id_idx").on(t.fecCandidateId),
  ],
);

// ---------------------------------------------------------------------------
// candidate_offices
// ---------------------------------------------------------------------------
export const candidateOffices = pgTable("candidate_offices", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidates.id),
  officeLabel: text("office_label").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  termStart: date("term_start").notNull(),
  termEnd: date("term_end"), // nullable — incumbent still serving
  sourceUrl: text("source_url").notNull(),
});

// ---------------------------------------------------------------------------
// bills
// ---------------------------------------------------------------------------
export const bills = pgTable("bills", {
  // Format: "<source>-<source_id>", e.g. "govtrack-hr1234-118"
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  source: text("source").notNull(), // "govtrack" | "openstates" | …
  sourceUrl: text("source_url").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  introducedDate: date("introduced_date"),
  rawMetadata: jsonb("raw_metadata"),
  insertedAt: timestamp("inserted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// votes
// ---------------------------------------------------------------------------
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: text("bill_id")
      .notNull()
      .references(() => bills.id),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id),
    // "yea" | "nay" | "present" | "absent" | "not_voting"
    voteCast: text("vote_cast").notNull(),
    voteDate: date("vote_date").notNull(),
    sourceUrl: text("source_url").notNull(),
    rawMetadata: jsonb("raw_metadata"),
    insertedAt: timestamp("inserted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("votes_bill_candidate_uidx").on(
      table.billId,
      table.candidateId,
    ),
    index("votes_candidate_date_idx").on(table.candidateId, table.voteDate),
    index("votes_bill_idx").on(table.billId),
  ],
);

// ---------------------------------------------------------------------------
// issue_tags
// ---------------------------------------------------------------------------
export const issueTags = pgTable(
  "issue_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: text("bill_id")
      .notNull()
      .references(() => bills.id),
    // Joins to canonical issue ids in src/lib/canonicalIssues.ts
    canonicalIssue: text("canonical_issue").notNull(),
    // "in_favor" | "opposed" — what voting yea on this bill *means* for the issue
    stanceLens: text("stance_lens").notNull(),
    // e.g. "claude-opus-4-7-2026-05-09"
    taggerVersion: text("tagger_version").notNull(),
    taggerConfidence: numeric("tagger_confidence", { precision: 4, scale: 3 }), // nullable, 0–1
    taggedAt: timestamp("tagged_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("issue_tags_bill_issue_uidx").on(
      table.billId,
      table.canonicalIssue,
    ),
    index("issue_tags_canonical_issue_idx").on(table.canonicalIssue),
  ],
);

// ---------------------------------------------------------------------------
// donor_aggregates
// ---------------------------------------------------------------------------
export const donorAggregates = pgTable(
  "donor_aggregates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id),
    electionCycle: text("election_cycle").notNull(), // e.g. "2026"
    // Joins to donor bucket vocabulary in docs/PATTERN_TAXONOMIES.md
    bucketLabel: text("bucket_label").notNull(),
    amountTotal: numeric("amount_total", { precision: 15, scale: 2 }).notNull(),
    source: text("source").notNull(), // "fec" | "followthemoney" | …
    sourceUrl: text("source_url").notNull(),
    rawMetadata: jsonb("raw_metadata"),
    insertedAt: timestamp("inserted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("donor_agg_candidate_cycle_bucket_uidx").on(
      table.candidateId,
      table.electionCycle,
      table.bucketLabel,
    ),
  ],
);

// ---------------------------------------------------------------------------
// candidate_data  — web-research-derived positions for no-record candidates
// ---------------------------------------------------------------------------
export const candidateData = pgTable(
  "candidate_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Normalized "name|jurisdiction|cycle" key (lowercase, trimmed)
    candidateKey: text("candidate_key").notNull(),
    // Joins to canonical issue ids in src/lib/canonicalIssues.ts
    canonicalIssue: text("canonical_issue").notNull(),
    // Candidate's researched position: "in_favor" | "opposed" | "mixed" | "unclear"
    resolvedStance: text("resolved_stance").notNull(),
    // Research confidence: "high" | "medium" | "low"
    confidence: text("confidence").notNull(),
    // Array of { summary: string, url: string } — only items with real https?:// URLs
    evidence: jsonb("evidence").notNull(),
    // e.g. "claude-haiku-4-5-20251001"
    modelVersion: text("model_version").notNull(),
    researchedAt: timestamp("researched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("candidate_data_key_issue_uidx").on(
      table.candidateKey,
      table.canonicalIssue,
    ),
    index("candidate_data_key_idx").on(table.candidateKey),
  ],
);

// ---------------------------------------------------------------------------
// member_stats  — per-incumbent GovTrack stats (attendance, term, class)
// ---------------------------------------------------------------------------
// One row per sitting federal member. Populated by scripts/ingest/member-stats.ts.
// Attendance comes from GovTrack's full missed-votes stat — never derived from
// our partial issue-tagged `votes` table (see redesign HANDOFF.md).
export const memberStats = pgTable("member_stats", {
  candidateId: text("candidate_id")
    .primaryKey()
    .references(() => candidates.id),
  chamber: text("chamber").notNull(), // "house" | "senate"
  // Authoritative geography from the GovTrack role API — the delegation
  // resolver prefers these over the mixed-format name decorations.
  state: text("state"), // 2-letter code
  district: integer("district"), // House only; 0 = at-large; null for senators
  senatorRank: text("senator_rank"), // "senior" | "junior" | null for House
  missedVotesPct: numeric("missed_votes_pct", { precision: 5, scale: 2 }),
  // Total eligible floor votes behind the percentage (display: "of N floor votes")
  votesEligible: numeric("votes_eligible", { precision: 7, scale: 0 }),
  // Chamber median missed-votes pct from the same ingest run — band thresholds
  chamberMedianPct: numeric("chamber_median_pct", { precision: 5, scale: 2 }),
  // End of the member's current term (drives "on the 2026 ballot")
  currentTermEnd: date("current_term_end"),
  senateClass: text("senate_class"), // "1" | "2" | "3" | null for House
  source: text("source").notNull().default("govtrack"),
  sourceUrl: text("source_url").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// scorecard_meta  — metadata only; no per-vote scorecard records
// ---------------------------------------------------------------------------
export const scorecardMeta = pgTable("scorecard_meta", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  partisanLean: text("partisan_lean").notNull(), // "partisan" | "nonpartisan" | "mixed"
  contact: text("contact"), // nullable
  notes: text("notes"), // nullable
});

// ===========================================================================
// CAN2026 enrichment tables (docs/CAN2026_ENRICHMENT_SCHEMA.md §3)
//
// Distinct, attributed source (Constitutional Accountability Now /
// can2026.org). Namespaced `can_*`; crosswalked — never merged — into our
// candidates/bills/votes via nullable FKs + match_method. Populated by
// scripts/ingest/can2026.ts.
// ===========================================================================

// ---------------------------------------------------------------------------
// can_ingest_runs — provenance header (§3.1)
// ---------------------------------------------------------------------------
export const canIngestRuns = pgTable("can_ingest_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceUrl: text("source_url").notNull(), // "https://can2026.org/2026-elections"
  contentUpdatedLabel: text("content_updated_label"), // CAN's own stamp, "Updated May 22, 2026"
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  snapshotDate: date("snapshot_date").notNull(), // date this run's rows are stamped with
  rowsParsed: jsonb("rows_parsed"), // {senateRaces, houseRaces, candidates, votes, ratings, donorTrails, ...}
  templateVersion: text("template_version"), // "aigenerated v201" — detect builder upgrades
  contentChecksum: text("content_checksum"), // hash of decoded payload; detect rebuilds
  notes: text("notes"),
  // Snapshot retention: gzip of the decoded props payload, base64-encoded.
  // The ingester keeps this on the latest 5 runs and nulls it on older ones.
  rawPayloadGzip: text("raw_payload_gzip"),
});

// ---------------------------------------------------------------------------
// can_races — one row per federal seat (Senate or House district); also holds
// pending profiles (§3.2)
// ---------------------------------------------------------------------------
export const canRaces = pgTable(
  "can_races",
  {
    // Deterministic key: "<state>-<chamber>[-<district>]", e.g. "AL-senate", "AZ-house-06"
    id: text("id").primaryKey(),
    state: text("state").notNull(), // USPS code, "AL"
    chamber: text("chamber").notNull(), // "house" | "senate"
    district: text("district"), // nullable; null for senate
    senateClass: text("senate_class"), // "I" | "II" | "III" | null
    raceSummary: text("race_summary"), // curated race line: "Dan Sullivan (R, Inc) vs. Mary Peltola (D) · Toss-Up"
    raceStatus: text("race_status"), // "general"|"open_seat"|"runoff"|"special_election"|"pending_profile"
    isOpenSeat: boolean("is_open_seat").notNull().default(false),
    // CAN's own state/race rating chip + the overall state-grid rating (incl. not-on-ballot codes "D -- 2028")
    canOwnRating: text("can_own_rating"), // normalized: "toss_up"|"lean_d"|...|"safe_r"
    canOwnRatingRaw: text("can_own_rating_raw"),
    overallStateRating: text("overall_state_rating"), // "Safe Republican"|"Pending"|"D -- 2028"|...
    // House-only classification tags (Dataset B). text[] of: committee_power, watch_list, redistricted,
    // money_network, fairshake_watch, crypto_funded, leadership_pac_flow, tier3_outside_spending, special_election
    flags: jsonb("flags"),
    retirementContext: text("retirement_context"), // "Tuberville not seeking reelection, ran for governor"
    electoralBaseline: text("electoral_baseline"), // "Harris +13 (2024)" / "Trump won by 29 points"
    electionDate: date("election_date"),
    primaryDate: date("primary_date"),
    primaryResults: jsonb("primary_results"), // [{name, party, pct}, ...]
    buttonColorHex: text("button_color_hex"), // BTN_COLORS["XX"] — presentational, party/lean-coded
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
    rawHtml: text("raw_html"), // decoded CARDS[state] fragment for this race
  },
  (t) => [
    index("can_races_state_idx").on(t.state),
    index("can_races_chamber_idx").on(t.chamber),
  ],
);

// ---------------------------------------------------------------------------
// can_race_ratings — one row per (race, rater) (§3.3)
// ---------------------------------------------------------------------------
export const canRaceRatings = pgTable(
  "can_race_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    raceId: text("race_id")
      .notNull()
      .references(() => canRaces.id),
    rater: text("rater").notNull(), // "cook"|"sabato"|"inside_elections"|"270towin"|"can_own"|"<pollster>"
    raterType: text("rater_type").notNull(), // "forecaster"|"pollster"|"can_own"
    rating: text("rating").notNull(), // normalized: "toss_up"|"lean_d"|"lean_r"|"likely_d"|"likely_r"|"safe_d"|"safe_r"
    ratingRaw: text("rating_raw"), // verbatim label before normalization ("Solid R", "Lean D")
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [
    uniqueIndex("can_race_ratings_race_rater_snap_uidx").on(
      t.raceId,
      t.rater,
      t.snapshotDate,
    ),
    index("can_race_ratings_race_idx").on(t.raceId),
  ],
);

// ---------------------------------------------------------------------------
// can_candidates — profiled people (ballot candidates AND sitting members)
// + crosswalk to our candidates (§3.4)
// ---------------------------------------------------------------------------
export const canCandidates = pgTable(
  "can_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    raceId: text("race_id").references(() => canRaces.id), // nullable; null for sitting members tied only to a state
    recordType: text("record_type").notNull(), // "ballot_2026" | "current_member_not_on_ballot"
    canName: text("can_name").notNull(), // name as printed on CAN
    party: text("party"), // "R" | "D" | "I"
    state: text("state"),
    // "incumbent"|"incumbent_appointed"|"challenger"|"primary_challenger"|"open_seat_nominee"|"retiring"|"current_not_on_ballot"
    incumbentStatus: text("incumbent_status"),
    nextElectionYear: integer("next_election_year"), // 2028 | 2030, for current_member_not_on_ballot
    primaryResultPct: numeric("primary_result_pct", {
      precision: 5,
      scale: 2,
    }),
    narrativeSummary: text("narrative_summary"), // bio-text / member-panel prose (education, career, LCV score, etc.)
    dataStatus: text("data_status"), // "complete"|"proxy"|"pending"|"profile_pending"
    // --- crosswalk to our data ---
    ourCandidateId: text("our_candidate_id").references(() => candidates.id), // nullable
    matchMethod: text("match_method"), // "exact_name_jurisdiction"|"fuzzy"|"manual"|"unmatched"
    matchConfidence: numeric("match_confidence", { precision: 4, scale: 3 }),
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [
    index("can_candidates_our_cand_idx").on(t.ourCandidateId),
    index("can_candidates_race_idx").on(t.raceId),
    index("can_candidates_record_type_idx").on(t.recordType),
  ],
);

// ---------------------------------------------------------------------------
// can_donor_trails — donor-trail header + curated note per (person, cycle
// window) (§3.5)
// ---------------------------------------------------------------------------
export const canDonorTrails = pgTable(
  "can_donor_trails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canCandidateId: uuid("can_candidate_id")
      .notNull()
      .references(() => canCandidates.id),
    cycleWindow: text("cycle_window").notNull(), // "2025-2026" | "2019-2024" | "data pending"
    totalRaised: numeric("total_raised", { precision: 15, scale: 2 }),
    cashOnHand: numeric("cash_on_hand", { precision: 15, scale: 2 }),
    cashOnHandAsOf: date("cash_on_hand_as_of"), // the "(March 31, 2026)" glued to the figure
    pacSharePct: numeric("pac_share_pct", { precision: 5, scale: 2 }),
    note: text("note"), // donor-note PROSE: dark-money + issue-PAC narrative (AIPAC/Fairshake/crypto)
    dataStatus: text("data_status"), // "complete"|"proxy"|"pending" (proxy = House figures shown while Senate profile pending)
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [
    uniqueIndex("can_donor_trails_cand_window_uidx").on(
      t.canCandidateId,
      t.cycleWindow,
    ),
  ],
);

// ---------------------------------------------------------------------------
// can_donor_sectors — OpenSecrets-sector line items (§3.6)
// ---------------------------------------------------------------------------
export const canDonorSectors = pgTable(
  "can_donor_sectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    donorTrailId: uuid("donor_trail_id")
      .notNull()
      .references(() => canDonorTrails.id),
    sectorLabelRaw: text("sector_label_raw").notNull(), // verbatim, spellings vary ("Securities & Investment" vs "Securities and Investment")
    sectorLabel: text("sector_label"), // normalized to a canonical OpenSecrets sector
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    rankInTrail: numeric("rank_in_trail", { precision: 4, scale: 0 }), // display ordering (top-5 per candidate)
  },
  (t) => [
    uniqueIndex("can_donor_sectors_trail_sector_uidx").on(
      t.donorTrailId,
      t.sectorLabelRaw,
    ),
  ],
);

// ---------------------------------------------------------------------------
// can_finance_metrics — free-form FEC / finance line-items (§3.7)
// ---------------------------------------------------------------------------
export const canFinanceMetrics = pgTable(
  "can_finance_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canCandidateId: uuid("can_candidate_id")
      .notNull()
      .references(() => canCandidates.id),
    metricLabelRaw: text("metric_label_raw").notNull(), // bespoke per card: "Total raised (cycle)", "Unitemized small-dollar donations"
    metricLabel: text("metric_label"), // optional normalized key, nullable
    amount: numeric("amount", { precision: 15, scale: 2 }),
    asOfDate: date("as_of_date"), // nullable
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [index("can_finance_metrics_cand_idx").on(t.canCandidateId)],
);

// ---------------------------------------------------------------------------
// can_issue_pac_contributions — named issue-PAC tracking (AIPAC, Fairshake, …)
// (§3.8)
// ---------------------------------------------------------------------------
export const canIssuePacContributions = pgTable(
  "can_issue_pac_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canCandidateId: uuid("can_candidate_id")
      .notNull()
      .references(() => canCandidates.id),
    pacName: text("pac_name").notNull(), // "AIPAC" | "Fairshake" | ...
    pacCategory: text("pac_category"), // "pro_israel" | "crypto" | ... (descriptive free text)
    amount: numeric("amount", { precision: 15, scale: 2 }), // nullable when only a flag/negative is known
    windowType: text("window_type").notNull(), // "career" | "cycle"
    cycleWindow: text("cycle_window"), // nullable; set when windowType="cycle"
    confirmed: boolean("confirmed").notNull().default(true), // false stores CAN's negative assertions
    note: text("note"), // "No Fairshake/crypto confirmed 2026"
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [
    uniqueIndex("can_issue_pac_cand_pac_window_uidx").on(
      t.canCandidateId,
      t.pacName,
      t.windowType,
      t.cycleWindow,
    ),
  ],
);

// ---------------------------------------------------------------------------
// can_bill_narratives — the 10-bill curated dictionary + crosswalk to our
// bills (§3.9)
// ---------------------------------------------------------------------------
export const canBillNarratives = pgTable(
  "can_bill_narratives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // CAN's clickable key from `var BILLS`: one of tcja, ahca, cares, arp, iija, ira, kavanaugh, fra, obbb, genius
    canKey: text("can_key").notNull(),
    title: text("title").notNull(), // "Tax Cuts and Jobs Act (H.R. 1) — Dec. 19, 2017"
    billType: text("bill_type"), // "legislation"|"nomination"|"resolution"|"impeachment"
    narrative: text("narrative"), // "What it did:" — shared bill-level template, NOT per-vote
    proceduralNote: text("procedural_note"), // "RC176/RC178 were motions to table; Yea = tactical maneuver…"
    // --- crosswalk to our data ---
    ourBillId: text("our_bill_id").references(() => bills.id), // nullable; CAN covers resolutions/PNs we may lack
    matchMethod: text("match_method"), // "exact"|"manual"|"unmatched"
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [
    uniqueIndex("can_bill_narratives_key_snap_uidx").on(
      t.canKey,
      t.snapshotDate,
    ),
    index("can_bill_narratives_our_bill_idx").on(t.ourBillId),
  ],
);

// ---------------------------------------------------------------------------
// can_candidate_key_votes — a person's key votes (the 1,160-row Key Votes
// tables) (§3.10)
// ---------------------------------------------------------------------------
export const canCandidateKeyVotes = pgTable(
  "can_candidate_key_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canCandidateId: uuid("can_candidate_id")
      .notNull()
      .references(() => canCandidates.id),
    billLabel: text("bill_label").notNull(), // printed name, always present ("Inflation Reduction Act (H.R. 5376)")
    dataBillKey: text("data_bill_key"), // nullable; one of the 10 BILLS keys when the row is clickable
    billNarrativeId: uuid("bill_narrative_id").references(
      () => canBillNarratives.id,
    ), // nullable; set only for keyed bills
    voteCast: text("vote_cast"), // normalized: "yea"|"nay"|"present"|"not_voting"|"na"
    voteCastRaw: text("vote_cast_raw"), // verbatim incl. qualifiers: "Yea (procedural)", "N/A -- Not yet senator"
    voteDateRaw: text("vote_date_raw"), // verbatim, irregular: "Aug. 7, 2022", "Jul. 2017", "No floor vote yet"
    voteDate: date("vote_date"), // parsed when possible, nullable
    context: text("context"), // the curated Notes/Context column — the per-vote prose
    proceduralNote: text("procedural_note"), // "Live Pair", "motion to table — tactical maneuver"
    source: text("source"), // per-vote Source column, usually "--"
    // --- crosswalk to our votes ---
    ourVoteId: uuid("our_vote_id").references(() => votes.id), // nullable
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [
    index("can_key_votes_cand_idx").on(t.canCandidateId),
    index("can_key_votes_billnarr_idx").on(t.billNarrativeId),
  ],
);

// ---------------------------------------------------------------------------
// can_annotations — polymorphic curated-prose blocks (§3.11)
// ---------------------------------------------------------------------------
export const canAnnotations = pgTable(
  "can_annotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(), // "race"|"candidate"|"donor_trail"|"key_vote"
    entityId: text("entity_id").notNull(), // referenced row id (text form)
    // "data_gap"|"race_notes"|"observable_correlation"|"pending_what_we_know"|"pending_what_is_pending"|"pending_eta"
    annotationType: text("annotation_type").notNull(),
    body: text("body").notNull(), // the curated prose
    disclaimer: text("disclaimer"), // e.g. correlation finding's "not evidence of quid pro quo"
    snapshotDate: date("snapshot_date").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (t) => [
    index("can_annotations_entity_idx").on(t.entityType, t.entityId),
    index("can_annotations_type_idx").on(t.annotationType),
  ],
);

// ---------------------------------------------------------------------------
// can_citations — source citations attached to any CAN entity (§3.12)
// ---------------------------------------------------------------------------
export const canCitations = pgTable(
  "can_citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(), // "race"|"candidate"|"donor_trail"|"bill_narrative"|"key_vote"
    entityId: text("entity_id").notNull(),
    sourceOrg: text("source_org").notNull(), // "FEC.gov"|"OpenSecrets"|"Cook Political Report"|"NPR"|...
    fecCommitteeId: text("fec_committee_id"), // when present, e.g. "C00835959" (Fairshake)
    citationUrl: text("citation_url"),
    citationDate: date("citation_date"), // "NPR May 21 2026" -> 2026-05-21
    rawText: text("raw_text"), // verbatim source string (per-vote source OR pipe-delimited source-box)
    snapshotDate: date("snapshot_date").notNull(),
  },
  (t) => [index("can_citations_entity_idx").on(t.entityType, t.entityId)],
);

// ---------------------------------------------------------------------------
// voter_issue_events — anonymous per-session concern-interpretation events
//
// Persisted at session-end from the same path that increments the Polis
// counters. Privacy: one row per resolved concern entry, with NO identifier
// linking rows to a person (no session id), NO address, NO free-text verbatim
// (no sourceText, no quotes, no interpretation for mapped issues). State +
// issue + stance only — aggregate-analysis inputs, not individual records.
// `off_topic_label` carries the model's short label ONLY for unmapped/invented
// concerns (canonical_issue IS NULL), to surface taxonomy gaps.
// ---------------------------------------------------------------------------
export const voterIssueEvents = pgTable(
  "voter_issue_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalIssue: text("canonical_issue"), // joins to canonicalIssues.ts ids; NULL when off-topic/invented
    offTopicLabel: text("off_topic_label"), // model's short label, ONLY when canonicalIssue is NULL
    resolvedStance: text("resolved_stance"), // short prose stance; NULL when unknown
    rank: integer("rank"), // 1-based priority (serves "care MOST about")
    wasOffTopic: boolean("was_off_topic").notNull().default(false),
    confidenceLevel: text("confidence_level").notNull(), // "clear" | "low" | "off_topic"
    stateCode: text("state_code"), // USPS code, e.g. "TX"; NULL when unknown
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("voter_issue_events_state_issue_idx").on(
      t.stateCode,
      t.canonicalIssue,
    ),
    index("voter_issue_events_issue_idx").on(t.canonicalIssue),
  ],
);
