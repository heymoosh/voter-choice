import {
  pgTable,
  text,
  boolean,
  jsonb,
  timestamp,
  uuid,
  date,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// candidates
// ---------------------------------------------------------------------------
export const candidates = pgTable("candidates", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  sourceId: text("source_id").notNull(),
  jurisdiction: text("jurisdiction").notNull(), // e.g. "federal-house" | "federal-senate" | "state-TX-house"
  isIncumbent: boolean("is_incumbent").notNull().default(false),
  rawMetadata: jsonb("raw_metadata"),
  insertedAt: timestamp("inserted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
