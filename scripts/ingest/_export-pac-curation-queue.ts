/**
 * scripts/ingest/_export-pac-curation-queue.ts
 *
 * Build the review queue for the PAC hand-curation pass — the LAST gate on
 * `PAC_TRANSPARENCY_ENABLED` (plan Part 6a/6b: sponsor names on the biggest
 * spenders are worth showing only after a human has looked at them).
 *
 * Ranks committees by total dollars across both display surfaces — 6b
 * independent expenditures (support + oppose) plus 6a committee→candidate
 * contributions — because that order is exactly how visible each committee
 * will be in the product. Default: top 30 still at status='auto' (the
 * uncurated); --limit N to widen, --all to include already-curated rows.
 *
 * Prints a human-readable table AND writes /tmp/pac-curation-queue.json —
 * an array of { committeeId, name, connectedOrg, sector, evidenceUrl,
 * supportTotal, opposeTotal, contribTotal, verdict: null } — the input
 * template for _apply-pac-curation.ts. The review itself: open each
 * evidenceUrl (the committee's fec.gov page) plus any outside research,
 * then set verdict to "verified" (the filed sponsor/sector claim is right —
 * display it) or "rejected" (the claim is wrong or misleading — the
 * committee keeps its spending rows but loses its sponsor/sector display,
 * per the 6a/6b contract). Optionally set "sector" to correct a
 * misclassification — applied with classification_method='human'.
 *
 * Read-only. Runs on the dev machine:
 *   npx tsx --env-file=.env.local scripts/ingest/_export-pac-curation-queue.ts [--limit 30] [--all]
 */

import * as fs from "node:fs";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";

const OUT_PATH = "/tmp/pac-curation-queue.json";

interface QueueRow {
  committee_id: string;
  name: string;
  status: string;
  connected_org: string | null;
  sector: string | null;
  classification_method: string | null;
  evidence_url: string;
  support_total: string | null;
  oppose_total: string | null;
  contrib_total: string | null;
  salience: string;
}

function usd(v: string | null): string {
  const n = v === null ? 0 : Number(v);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

async function main() {
  const argv = process.argv;
  const includeAll = argv.includes("--all");
  const limitIdx = argv.indexOf("--limit");
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1] ? Number(argv[limitIdx + 1]) : 30;
  if (!Number.isFinite(limit) || limit <= 0) {
    console.error("--limit must be a positive number");
    process.exit(1);
  }

  const db = requireDb();
  const statusFilter = includeAll ? sql`TRUE` : sql`c.status = 'auto'`;
  const result = await db.execute(
    sql`
    SELECT c.committee_id, c.name, c.status, c.connected_org, c.sector,
           c.classification_method, c.evidence_url,
           ie.support_total, ie.oppose_total, pc.contrib_total,
           COALESCE(ie.support_total, 0) + COALESCE(ie.oppose_total, 0)
             + COALESCE(pc.contrib_total, 0) AS salience
    FROM pac_committees c
    LEFT JOIN (
      SELECT committee_id,
             SUM(amount_total) FILTER (WHERE support_oppose = 'support') AS support_total,
             SUM(amount_total) FILTER (WHERE support_oppose = 'oppose') AS oppose_total
      FROM independent_expenditures
      GROUP BY committee_id
    ) ie ON ie.committee_id = c.committee_id
    LEFT JOIN (
      SELECT committee_id, SUM(amount_total) AS contrib_total
      FROM pac_candidate_contributions
      GROUP BY committee_id
    ) pc ON pc.committee_id = c.committee_id
    WHERE ${statusFilter}
    ORDER BY salience DESC
    LIMIT ${limit}
  `,
  );
  const rows = result.rows as unknown as QueueRow[];

  if (rows.length === 0) {
    console.log(
      includeAll
        ? "No committees found at all — has the 6a/6b ingest run?"
        : "No committees left at status='auto' — the curation queue is empty. " +
            "Re-run with --all to review past verdicts.",
    );
    return;
  }

  console.log(
    `PAC curation queue — top ${rows.length} committees by display salience` +
      ` (${includeAll ? "all statuses" : "status='auto' only"}):\n`,
  );
  for (const [i, r] of rows.entries()) {
    console.log(
      `${String(i + 1).padStart(2)}. ${r.committee_id}  ${r.name}` +
        (includeAll ? `  [${r.status}]` : ""),
    );
    console.log(
      `    IE support ${usd(r.support_total)} / oppose ${usd(r.oppose_total)}` +
        `  |  6a contributions ${usd(r.contrib_total)}`,
    );
    console.log(
      `    filed sponsor: ${r.connected_org ?? "(none filed)"}  |  sector: ${r.sector ?? "(unclassified)"}`,
    );
    console.log(`    review at: ${r.evidence_url}`);
  }

  const template = rows.map((r) => ({
    committeeId: r.committee_id,
    name: r.name,
    connectedOrg: r.connected_org,
    sector: r.sector,
    evidenceUrl: r.evidence_url,
    supportTotal: r.support_total === null ? 0 : Number(r.support_total),
    opposeTotal: r.oppose_total === null ? 0 : Number(r.oppose_total),
    contribTotal: r.contrib_total === null ? 0 : Number(r.contrib_total),
    verdict: null as string | null,
  }));
  fs.writeFileSync(OUT_PATH, JSON.stringify(template, null, 2));
  console.log(
    `\nWrote ${template.length} rows to ${OUT_PATH}.` +
      `\nNext: fill each "verdict" with "verified" or "rejected" (optionally` +
      `\ncorrect "sector"), then run _apply-pac-curation.ts on the file.` +
      `\nRows left with verdict null are skipped — curate in as many sittings` +
      `\nas you like.`,
  );
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
