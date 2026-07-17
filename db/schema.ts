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
  unique,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// chat_usage_metrics — anonymous per-request AI cost telemetry
//
// Privacy: NO identifier of any kind. No IP address, no session id, no user
// id, no address, no request body, no prompt text. Operational numbers only:
// model, token counts, estimated cost, and an optional call_kind
// discriminator. Mirrors the voter_issue_events privacy contract ("NO
// identifier linking rows to a person, NO address, NO free-text verbatim").
// Use for aggregate cost monitoring and volume/spike detection only — never
// for tracing or profiling individual users or sessions.
// ---------------------------------------------------------------------------
export const chatUsageMetrics = pgTable(
  "chat_usage_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    model: text("model").notNull(),
    /** 'chat' | 'research' — distinguishes main conversation vs sub-agent calls. */
    callKind: text("call_kind").default("chat"),
    inputTokens: integer("input_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    webSearchCount: integer("web_search_count").notNull().default(0),
    /** Computed from model rates at record time; stored as numeric for query aggregation. */
    estimatedCostUsd: numeric("estimated_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
  },
  (t) => [
    index("chat_usage_metrics_recorded_at_idx").on(t.recordedAt),
    index("chat_usage_metrics_model_idx").on(t.model),
  ],
);

// ---------------------------------------------------------------------------
// polis_response_vectors — de-identified per-session Polis answer vectors
//
// PRIVACY CONTRACT (see also db/migrations/0012_add_polis_response_vectors.sql):
//   • session_token is a random UUID per Polis session, discarded by the
//     browser at tab close. It is NOT stored elsewhere in the DB and is NOT
//     the same as the Redis dedupe sessionId.
//   • No user_id, IP, email, name, or cross-table joinable key.
//   • recorded_hour is truncated to the hour (UTC) to prevent exact-time
//     re-identification.
//   • Outputs of clustering functions over this table are aggregate-only.
//
// COLLECTION STATUS: NOT ACTIVE — gated by POLIS_VECTOR_COLLECTION_ENABLED.
// ---------------------------------------------------------------------------
export const polisResponseVectors = pgTable(
  "polis_response_vectors",
  {
    // Opaque random token, one per Polis session.
    sessionToken: text("session_token").notNull(),
    // ISO 3166-2 state code, e.g. "TX"; NULL when voter skipped location.
    stateCode: text("state_code"),
    // { [statementId: string]: "agree" | "disagree" | "pass" }
    // Absent keys = voter did not answer that statement (not the same as "pass").
    responses: jsonb("responses").notNull(),
    // Truncated to the hour (UTC) to prevent time-based re-identification.
    // No full-precision inserted_at: a millisecond insert time would undermine
    // the coarse-hour guarantee by allowing single-row time linkage.
    recordedHour: timestamp("recorded_hour", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("polis_response_vectors_token_uidx").on(t.sessionToken),
    index("polis_response_vectors_state_idx").on(t.stateCode),
    index("polis_response_vectors_hour_idx").on(t.recordedHour),
  ],
);

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
// official_roster_candidates — state Secretary-of-State candidate rosters
// (e.g. azsos.gov's qualified-for-primary PDF), crosswalked to `candidates`
// but never merged. Governs the candidate SET for a contest when the
// OFFICIAL_ROSTER_ENABLED flag is on and rows exist for that
// (state, office, district, electionYear) — see
// src/lib/server/officialRoster.ts / officialRosterFlag.ts. Additive and
// read-only from the app's perspective; populated by a separate importer.
// Full validation: docs/operations/arizona-vertical-slice-data-check.md.
// ---------------------------------------------------------------------------
export const officialRosterCandidates = pgTable(
  "official_roster_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    state: text("state").notNull(), // USPS code, "AZ"
    office: text("office").notNull(), // "house" | "senate"
    district: text("district"), // zero-padded House district, "01"; null for senate
    electionYear: integer("election_year").notNull(),
    name: text("name").notNull(),
    party: text("party"), // state-recognized code, e.g. "AIP"; null for write-ins
    isIncumbent: boolean("is_incumbent").notNull().default(false),
    // "qualified_for_primary_ballot" | "write_in_qualified" (matches
    // OfficialBallotStatus in scripts/congressional-rosters/*.ts)
    ballotStatus: text("ballot_status").notNull(),
    stage: text("stage").notNull(), // "primary" | "general"
    sourceUrl: text("source_url").notNull(),
    retrievedAt: text("retrieved_at").notNull(), // ISO date string, e.g. "2026-07-15"
    // Crosswalk to our FEC-derived candidates row, when a finance history
    // match exists. Nullable — most official-roster filers have no FEC row.
    ourCandidateId: text("our_candidate_id").references(() => candidates.id),
    insertedAt: timestamp("inserted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // NULLS NOT DISTINCT: statewide (Senate) rows have district = NULL, and
    // a plain unique index treats NULL as distinct from itself in Postgres —
    // without this, the same Senate candidate re-imported via the fixture
    // importer would insert a duplicate row every run instead of upserting
    // (found while building the TX vertical slice; migration 0016 fixes
    // this on top of 0015's original uniqueIndex).
    unique("official_roster_candidates_seat_name_uidx")
      .on(t.state, t.office, t.district, t.electionYear, t.name, t.stage)
      .nullsNotDistinct(),
    index("official_roster_candidates_state_idx").on(t.state),
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
  // Nullable. LLM-generated short plain-language summary (≤2 sentences,
  // ≤~240 chars) derived from `summary` (the raw CRS text) by
  // scripts/ingest/summarize-bills.ts. Additive — `summary` is kept verbatim.
  // NULL means "not yet generated". The contributing-vote narrative prefers
  // this over the raw CRS summary so users see a true short summary.
  plainSummary: text("plain_summary"),
  source: text("source").notNull(), // "govtrack" | "openstates" | …
  sourceUrl: text("source_url").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  introducedDate: date("introduced_date"),
  rawMetadata: jsonb("raw_metadata"),
  // Nullable. Set by the tagger when a bill is intentionally not tagged because
  // it is genuinely non-issue (procedural, naming/renaming, ceremonial, or
  // non-substantive). NULL means "not yet processed" OR "tagged with ≥1 tag".
  // Used by coverage reporting to separate "skipped non-issue" from "queued for
  // tagging". Values: 'procedural' | 'naming' | 'ceremonial' | 'non_issue'
  skipReason: text("skip_reason"),
  // Nullable. Latest lifecycle stage for the bill, e.g.
  // "Passed House, stalled in Senate" or "Signed into law 2022-08-16".
  // Sourced from Congress.gov latestAction.text during bill enrichment.
  // NULL for state bills or bills not yet enriched. Hide this line in the UI
  // when NULL (honest fallback — never display a placeholder or stub).
  billStatus: text("bill_status"),
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
    // Roll-call tally: chamber-wide headcount for this specific roll call.
    // NULL for old rows or state votes. Populated by federal-votes ingest
    // from GovTrack total_plus / total_minus / total_present / total_not_voting.
    tallyYea: integer("tally_yea"),
    tallyNay: integer("tally_nay"),
    tallyPresent: integer("tally_present"),
    tallyNotVoting: integer("tally_not_voting"),
    // Human-readable roll-call outcome, e.g. "Passed", "Failed", "Agreed to".
    // Sourced from GovTrack's `result` field. NULL when unavailable.
    tallyResult: text("tally_result"),
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
    // Optional topic facet beneath canonical_issue (e.g. "drug_prices"); NULL when not sub-tagged
    subIssue: text("sub_issue"),
    // Lets a sub-pass be idempotent WITHOUT touching tagger_version, e.g. "claude-opus-4-8-2026-06-15"
    subTaggerVersion: text("sub_tagger_version"),
    subTaggerConfidence: numeric("sub_tagger_confidence", {
      precision: 4,
      scale: 3,
    }), // nullable, 0–1
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
    index("issue_tags_sub_issue_idx").on(table.canonicalIssue, table.subIssue),
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
// vote_rationales — member-stated reasoning synthesized from congress-press
//
// Data source: Derek Willis's congress-press dataset (MIT-licensed bulk JSONL,
// 670K+ member press releases, 2001-present).
// Attribution: "congress-press by Derek Willis" (https://github.com/dwillis/congress-press)
// must appear wherever rationale text is displayed.
// MIT copyright notice: Copyright (c) 2026 Derek Willis
//
// Coverage caveat: members explain contested / messaging votes; party-line and
// procedural votes are rarely commented on. Rationale is absent for ~80% of rows.
// ---------------------------------------------------------------------------
export const voteRationales = pgTable(
  "vote_rationales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // One rationale per (candidate, bill)
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id),
    billId: text("bill_id")
      .notNull()
      .references(() => bills.id),
    // LLM-generated "stated reason" blurb (plain text, ≤3 sentences).
    // Labeled as stated/inferred — NEVER presented as verified fact.
    // NULL until the generation step runs.
    rationaleText: text("rationale_text"),
    // "stated" (direct quote / paraphrase) | "inferred" (thematically related).
    // NULL when rationaleText is NULL.
    label: text("label"),
    // Press release source URLs — array stored as JSONB.
    // Each element: { url: string, publishedAt: string, title: string }.
    pressReleaseSources: jsonb("press_release_sources").notNull().default([]),
    // Model/version that generated the rationale. NULL until generated.
    modelVersion: text("model_version"),
    // Confidence in press-release→vote match:
    // "high"   = bill number appears verbatim in press release
    // "medium" = bill title keyword + date window match
    // "low"    = date window only (weakest signal)
    matchConfidence: text("match_confidence"),
    // When the rationale was last generated. NULL until generated.
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    insertedAt: timestamp("inserted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("vote_rationales_cand_bill_uidx").on(t.candidateId, t.billId),
    index("vote_rationales_candidate_idx").on(t.candidateId),
    index("vote_rationales_bill_idx").on(t.billId),
  ],
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
    subIssue: text("sub_issue"), // optional topic facet beneath canonical_issue; NULL when not resolved
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
    index("voter_issue_events_sub_issue_idx").on(t.canonicalIssue, t.subIssue),
  ],
);

// ---------------------------------------------------------------------------
// member_stock_transactions — STOCK Act Periodic Transaction Report (PTR)
// disclosures for sitting House/Senate members. Populated by
// scripts/ingest/stock-transactions.ts. INCUMBENTS ONLY — a transaction only
// gets a row here once it is matched to a `candidates` row with
// is_incumbent = true (House: state+district; Senate: bioguide id).
//
// HONESTY CONTRACT: the STOCK Act discloses dollar bands, never exact
// amounts. amount_low/amount_high are the parsed bounds of that band
// (amount_high is NULL for the open-ended top band, e.g. "Over
// $50,000,000") — never fabricate a point estimate. amount_range_label
// keeps the verbatim source string for display. Both transaction_date and
// disclosure_date are stored (STOCK Act filings can lag the trade by weeks),
// plus filing_url — the official House Clerk / Senate eFD PTR filing — so
// every row is independently verifiable.
// ---------------------------------------------------------------------------
export const memberStockTransactions = pgTable(
  "member_stock_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id),
    // Authoritative for Senate rows (source dataset provides it directly);
    // derived from candidateId ("federal-<BIOGUIDE>") for House rows.
    bioguideId: text("bioguide_id"),
    chamber: text("chamber").notNull(), // "house" | "senate"
    ticker: text("ticker"), // NULL for non-ticker assets (bonds, etc.) or unresolved ("--")
    assetDescription: text("asset_description").notNull(),
    assetType: text("asset_type"), // source verbatim: "Stock" | "Corporate Bond" | "Other Securities" | ...
    // Normalized bucket for filtering/display; rawTransactionType keeps the
    // verbatim source label (e.g. "Sale (Partial)") for full fidelity.
    transactionType: text("transaction_type").notNull(), // "purchase" | "sale" | "sale_partial" | "exchange" | "other"
    rawTransactionType: text("raw_transaction_type").notNull(),
    // STOCK Act range bounds — see HONESTY CONTRACT above. Never exact amounts.
    amountLow: numeric("amount_low", { precision: 14, scale: 2 }).notNull(),
    amountHigh: numeric("amount_high", { precision: 14, scale: 2 }), // NULL = open-ended top band
    amountRangeLabel: text("amount_range_label").notNull(), // verbatim source label, e.g. "$1,001 - $15,000"
    transactionDate: date("transaction_date").notNull(),
    disclosureDate: date("disclosure_date"), // NULL when the source omitted/couldn't parse it
    owner: text("owner"), // "Self" | "Spouse" | "Joint" | "Child" | null
    filingUrl: text("filing_url").notNull(), // official PTR filing (House Clerk PDF / Senate eFD)
    sourceDataset: text("source_dataset").notNull(), // "house_stock_watcher" | "senate_stock_watcher"
    // Idempotency key computed by the ingest (no per-row id in either source
    // dataset) — see buildExternalId in stock-transactions.ts.
    externalId: text("external_id").notNull(),
    rawMetadata: jsonb("raw_metadata"), // source-specific extras (comment, filing_id, raw member name, ...)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("member_stock_transactions_external_id_uidx").on(t.externalId),
    index("member_stock_transactions_candidate_idx").on(t.candidateId),
    index("member_stock_transactions_txn_date_idx").on(t.transactionDate),
    index("member_stock_transactions_chamber_idx").on(t.chamber),
  ],
);

// ---------------------------------------------------------------------------
// lobbying_issue_activity — LDA LD-2 quarterly lobbying-activity disclosures
// (client x issue-area x chamber x quarter). Populated by
// scripts/ingest/lobbying-issue-activity.ts from the lda.gov REST API.
//
// NOT MEMBER-KEYED, DELIBERATELY: LD-2 filings disclose only the chamber(s)
// contacted ("SENATE", "HOUSE OF REPRESENTATIVES"), never an individual
// Member of Congress — there is no field for it on the form. A row here
// means "this client's lobbyists disclosed contacting the House/Senate on
// this issue this quarter," never "lobbied Rep./Sen. X." Render accordingly:
// issue-level context only, never attached to a member.
// ---------------------------------------------------------------------------
export const lobbyingIssueActivity = pgTable(
  "lobbying_issue_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filingUuid: text("filing_uuid").notNull(),
    filingType: text("filing_type").notNull(),
    filingYear: integer("filing_year").notNull(),
    filingPeriod: text("filing_period").notNull(),
    registrantName: text("registrant_name").notNull(),
    clientName: text("client_name").notNull(),
    clientDescription: text("client_description"),
    clientState: text("client_state"),
    issueAreaCode: text("issue_area_code").notNull(),
    issueAreaLabel: text("issue_area_label").notNull(),
    specificIssues: text("specific_issues"),
    chamber: text("chamber").notNull(), // "house" | "senate"
    incomeAmount: numeric("income_amount", { precision: 14, scale: 2 }),
    expensesAmount: numeric("expenses_amount", { precision: 14, scale: 2 }),
    filingUrl: text("filing_url").notNull(),
    sourceDataset: text("source_dataset").notNull(), // "lda_gov"
    // Idempotency key: one row per (filing, issue area, chamber) — see
    // buildLobbyingExternalId in lobbying-issue-activity.ts.
    externalId: text("external_id").notNull(),
    rawMetadata: jsonb("raw_metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("lobbying_issue_activity_external_id_uidx").on(t.externalId),
    index("lobbying_issue_activity_issue_idx").on(t.issueAreaCode),
    index("lobbying_issue_activity_chamber_idx").on(t.chamber),
    index("lobbying_issue_activity_period_idx").on(
      t.filingYear,
      t.filingPeriod,
    ),
  ],
);

// ---------------------------------------------------------------------------
// member_civic_positions — Financial Disclosure Schedule E ("Positions Held
// Outside U.S. Government") for sitting Members of Congress. Populated by
// scripts/ingest/member-civic-positions.ts. SENATE ONLY in this first pass
// (Senate EFD e-filed HTML is structured/parseable without OCR; House Clerk
// filings are PDFs, some scanned, needing OCR — deferred). Bioguide-keyed
// like member_stock_transactions.
//
// LEGAL / HONESTY CONTRACT: 5 U.S.C. app. 4 Sec. 105(c)(1),(2) restricts
// commercial/solicitation use of Financial Disclosure data. Mitigation
// (decided by Muxin, 2026-07-08): build read-only, and every surfaced row
// MUST link back to source_filing_url so this app is never the disclosure
// of record, only a citation-linked pointer to it. Never omit or fabricate
// source_filing_url.
// ---------------------------------------------------------------------------
export const memberCivicPositions = pgTable(
  "member_civic_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id),
    bioguideId: text("bioguide_id").notNull(),
    chamber: text("chamber").notNull(), // "senate" (house deferred)
    entityName: text("entity_name").notNull(),
    entityType: text("entity_type"),
    positionHeld: text("position_held").notNull(),
    positionDates: text("position_dates"),
    comments: text("comments"),
    filingYear: integer("filing_year").notNull(),
    sourceFilingUrl: text("source_filing_url").notNull(),
    sourceDataset: text("source_dataset").notNull(), // "senate_efd"
    externalId: text("external_id").notNull(),
    rawMetadata: jsonb("raw_metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("member_civic_positions_external_id_uidx").on(t.externalId),
    index("member_civic_positions_candidate_idx").on(t.candidateId),
    index("member_civic_positions_filing_year_idx").on(t.filingYear),
  ],
);

// ---------------------------------------------------------------------------
// roster_feedback — user-submitted "Missing a rep? Something look wrong?"
// reports from the results/roster surfaces (card "[P1] Ballot-accuracy
// feedback intake"). Muxin's post-launch correction channel for roster/
// ballot errors, replacing manual re-combing of state sites.
//
// No auth, no PII beyond whatever the voter types into `message`. state /
// office / district / candidateRef are prefilled client-side from the
// voter's existing address-resolution context but are freely editable
// before submit — none of them are trustworthy identifiers, same posture
// as the free-text message itself. See db/migrations/0017_add_roster_feedback.sql.
// ---------------------------------------------------------------------------
export const rosterFeedback = pgTable(
  "roster_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    state: text("state"), // USPS code, e.g. "TX"; voter-editable prefill, not trusted
    office: text("office"),
    district: text("district"),
    candidateRef: text("candidate_ref"), // free-text; not a foreign key
    message: text("message").notNull(),
    appContext: jsonb("app_context"), // optional client-supplied debugging context
  },
  (t) => [
    index("roster_feedback_created_at_idx").on(t.createdAt),
    index("roster_feedback_state_idx").on(t.state),
  ],
);
