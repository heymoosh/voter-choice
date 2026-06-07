/**
 * _polev1-snapshot.ts — dump issue_tags_pole_v1 from the alignment branch to JSONL (READ-ONLY).
 * Preserves the full corrected tagset (incl. no_score + text confidences) before the ephemeral
 * `alignment-work` Neon branch auto-deletes (2026-07-04). Committed (gzipped) as durable provenance
 * + the source for follow-ups (stricter public_safety re-tag, granularity/vocab work).
 *
 *   npx tsx scripts/ingest/_polev1-snapshot.ts > scripts/ingest/_polev1-snapshot.jsonl
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL") return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no url");
}

async function main() {
  const sql = neon(loadUrl());
  const rows = (await sql`
    SELECT bill_id, canonical_issue, pole_stance, tagger_version, tagger_confidence, source_run, tagged_at
    FROM issue_tags_pole_v1 ORDER BY canonical_issue, bill_id`) as Array<Record<string, unknown>>;
  for (const r of rows) process.stdout.write(JSON.stringify(r) + "\n");
  process.stderr.write(`dumped ${rows.length} pole_v1 rows\n`);
}
main().catch((e) => { console.error("SNAPSHOT FAILED:", e.message); process.exit(1); });
