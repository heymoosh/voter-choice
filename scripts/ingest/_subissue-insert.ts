/**
 * _subissue-insert.ts — Phase C of the healthcare sub-issue re-tag.
 *
 * CRITICAL: this UPDATEs EXISTING issue_tags rows; it never INSERTs. For each
 * { bill_id, sub_issue, confidence } it runs:
 *   UPDATE issue_tags
 *      SET sub_issue = ?, sub_tagger_version = SUB_TAGGER_VERSION, sub_tagger_confidence = ?
 *    WHERE bill_id = ? AND canonical_issue = 'healthcare_affordability'
 * It NEVER touches stance_lens / tagger_version / tagger_confidence / tagged_at —
 * those belong to the parent (Step-1) tag and must be preserved.
 *
 * Input: a JSON file of [{ bill_id, canonical_issue, sub_issue, confidence }]
 * (the output of _subissue-assemble.ts). canonical_issue must be
 * healthcare_affordability; anything else is dropped defensively.
 *
 * Writes to the Neon alignment branch (.env.alignment) ONLY. Idempotent:
 * re-running yields the same rows (UPDATE is naturally idempotent). Supports
 * --dry-run (validate + report, write nothing).
 *
 *   npx tsx scripts/ingest/_subissue-insert.ts <subtags.json>
 *   npx tsx scripts/ingest/_subissue-insert.ts <subtags.json> --dry-run
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import {
  SUB_TAGGER_VERSION,
  parseAndValidateSubTag,
} from "../../src/lib/alignment/subIssues";

const PARENT_ISSUE = "healthcare_affordability";
const VALID_CONF = new Set(["high", "medium", "low"]);
const CHUNK = 500;

function loadUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL")
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("ALIGNMENT_DATABASE_URL not found");
}

interface SubTag {
  bill_id: string;
  canonical_issue: string;
  sub_issue: string | null;
  confidence: string;
}

interface Row {
  bill_id: string;
  sub_issue: string | null;
  confidence: string;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: _subissue-insert.ts <subtags.json> [--dry-run]");
    process.exit(1);
  }
  const tags: SubTag[] = JSON.parse(readFileSync(file, "utf8"));

  // Validate + dedupe on bill_id (one healthcare row per bill); last write wins.
  // sub_issue is normalized through parseAndValidateSubTag: invalid ids → null
  // (fall back to parent). canonical_issue must be the healthcare parent.
  const seen = new Map<string, Row>();
  let badCanonical = 0;
  let badBill = 0;
  for (const t of tags) {
    if (!t.bill_id) {
      badBill++;
      continue;
    }
    if (t.canonical_issue !== PARENT_ISSUE) {
      badCanonical++;
      continue;
    }
    const sub_issue = parseAndValidateSubTag(t.sub_issue, PARENT_ISSUE);
    const confidence = VALID_CONF.has(t.confidence) ? t.confidence : "low";
    seen.set(t.bill_id, { bill_id: t.bill_id, sub_issue, confidence });
  }
  const rows = [...seen.values()];
  const assigned = rows.filter((r) => r.sub_issue !== null).length;
  console.log(
    `input ${tags.length} · valid ${rows.length} (assigned ${assigned} · null ${
      rows.length - assigned
    }) · dropped ${badBill} no-bill-id · ${badCanonical} non-healthcare · dupes collapsed ${
      tags.length - badBill - badCanonical - rows.length
    }`,
  );

  if (dryRun) {
    console.log(
      `[dry-run] would UPDATE ${rows.length} issue_tags rows (sub_issue/sub_tagger_version/sub_tagger_confidence only) WHERE canonical_issue='${PARENT_ISSUE}'`,
    );
    return;
  }

  const sql = neon(loadUrl());
  let updated = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const c = rows.slice(i, i + CHUNK);
    // Per-row distinct values via unnest; the FROM-derived table feeds one
    // bulk UPDATE. ONLY the three sub_* columns are SET; the parent tag's
    // stance_lens / tagger_version / tagger_confidence / tagged_at are untouched.
    await sql`
      UPDATE issue_tags AS it
         SET sub_issue = u.sub_issue,
             sub_tagger_version = ${SUB_TAGGER_VERSION},
             sub_tagger_confidence = u.confidence::numeric
        FROM unnest(
          ${c.map((r) => r.bill_id)}::text[],
          ${c.map((r) => r.sub_issue)}::text[],
          ${c.map((r) => confToNumeric(r.confidence))}::text[]
        ) AS u(bill_id, sub_issue, confidence)
       WHERE it.bill_id = u.bill_id
         AND it.canonical_issue = ${PARENT_ISSUE}`;
    updated += c.length;
    console.log(`  updated ${updated}/${rows.length}`);
  }
  console.log(
    `DONE: ${updated} rows updated (sub_tagger_version=${SUB_TAGGER_VERSION}).`,
  );
}

/** Map the categorical confidence label to the numeric(4,3) column value. */
function confToNumeric(confidence: string): string {
  switch (confidence) {
    case "high":
      return "0.900";
    case "medium":
      return "0.600";
    default:
      return "0.300";
  }
}

main().catch((e) => {
  console.error("INSERT FAILED:", e.message);
  process.exit(1);
});
