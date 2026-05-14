/**
 * scripts/ingest/insert-issue-tags.ts
 *
 * Accepts a JSON file path as the first argument. The file must contain a
 * JSON array of tag objects:
 *   [{ billId, canonicalIssue, stanceLens, confidence }, ...]
 *
 * Upserts each tag into the issue_tags table.
 * Idempotent — safe to run multiple times for the same bills.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/insert-issue-tags.ts /tmp/tags.json
 */

import * as fs from "node:fs";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { issueTags } from "../../db/schema";

const TAGGER_VERSION = "claude-sonnet-4-6-agent-v1";

interface TagInput {
  billId: string;
  canonicalIssue: string;
  stanceLens: "in_favor" | "opposed";
  confidence: number;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx insert-issue-tags.ts <tags.json>");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as TagInput[];
  if (!Array.isArray(raw) || raw.length === 0) {
    console.log("[insert-tags] no tags to insert");
    return;
  }

  const db = requireDb();
  let upserted = 0;
  let errors = 0;

  const VALID_STANCES = new Set(["in_favor", "opposed"]);

  for (const tag of raw) {
    if (!VALID_STANCES.has(tag.stanceLens)) {
      console.error(`[insert-tags] skip ${tag.billId}/${tag.canonicalIssue}: invalid stanceLens="${tag.stanceLens}" (must be in_favor|opposed)`);
      errors++;
      continue;
    }
    try {
      await db.insert(issueTags).values({
        billId: tag.billId,
        canonicalIssue: tag.canonicalIssue,
        stanceLens: tag.stanceLens,
        taggerVersion: TAGGER_VERSION,
        taggerConfidence: tag.confidence.toFixed(3),
        taggedAt: new Date(),
      }).onConflictDoUpdate({
        target: [issueTags.billId, issueTags.canonicalIssue],
        set: {
          stanceLens: sql`excluded.stance_lens`,
          taggerVersion: sql`excluded.tagger_version`,
          taggerConfidence: sql`excluded.tagger_confidence`,
          taggedAt: sql`excluded.tagged_at`,
        },
      });
      upserted++;
    } catch (e) {
      console.error(`[insert-tags] error on ${tag.billId}/${tag.canonicalIssue}:`, e);
      errors++;
    }
  }

  console.log(`[insert-tags] done upserted=${upserted} errors=${errors}`);
}

main().catch(e => { console.error(e); process.exit(1); });
