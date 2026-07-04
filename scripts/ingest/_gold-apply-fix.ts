/**
 * _gold-apply-fix.ts — apply oracle-ADJUDICATED single-tag corrections to issue_tags_pole_v1
 * on the Neon alignment branch (.env.alignment). For each INVERSION in _gold-disagreements.json
 * (oracle confident, pole_v1 the opposite), set pole_v1's pole_stance to the oracle direction.
 * Muxin-approved (2026-06-06): "fix the 1 tag, then ship." Idempotent; writes to the BRANCH only.
 *
 *   npx tsx scripts/ingest/_gold-apply-fix.ts            # dry-run (prints what it would change)
 *   npx tsx scripts/ingest/_gold-apply-fix.ts --apply    # write the corrections
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL")
      return rest
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
  }
  throw new Error("no url");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dis = JSON.parse(
    readFileSync(
      `${resolve("scripts/ingest/_gold-batches")}/_gold-disagreements.json`,
      "utf8",
    ),
  ) as Array<{
    issue: string;
    bill_id: string;
    oracle: string;
    pole_v1: string;
    kind: string;
    agreement: number;
  }>;
  const fixes = dis.filter((d) => d.kind === "INVERSION");
  console.log(
    `${fixes.length} INVERSION correction(s) to apply (oracle direction wins):`,
  );
  for (const f of fixes)
    console.log(
      `  [${f.issue}] ${f.bill_id}  ${f.pole_v1} → ${f.oracle}  (juror agreement ${f.agreement}/3)`,
    );
  if (!fixes.length) return;
  if (!apply) {
    console.log(
      `\nDRY-RUN. Re-run with --apply to write to the alignment branch.`,
    );
    return;
  }
  const sql = neon(loadUrl());
  for (const f of fixes) {
    const before =
      (await sql`SELECT pole_stance FROM issue_tags_pole_v1 WHERE bill_id=${f.bill_id} AND canonical_issue=${f.issue}`) as Array<{
        pole_stance: string;
      }>;
    await sql`
      UPDATE issue_tags_pole_v1
      SET pole_stance = ${f.oracle}, source_run = 'gold-adjudication-1', tagged_at = now()
      WHERE bill_id = ${f.bill_id} AND canonical_issue = ${f.issue}`;
    const after =
      (await sql`SELECT pole_stance FROM issue_tags_pole_v1 WHERE bill_id=${f.bill_id} AND canonical_issue=${f.issue}`) as Array<{
        pole_stance: string;
      }>;
    console.log(
      `  applied [${f.issue}] ${f.bill_id}: ${before[0]?.pole_stance} → ${after[0]?.pole_stance}`,
    );
  }
  console.log(
    `\nDONE: ${fixes.length} correction(s) written (source_run='gold-adjudication-1').`,
  );
}

main().catch((e) => {
  console.error("APPLY-FIX FAILED:", e.message);
  process.exit(1);
});
