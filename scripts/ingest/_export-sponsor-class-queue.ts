/**
 * scripts/ingest/_export-sponsor-class-queue.ts
 *
 * Build the review queue for the sponsor-class curation pass — the committees
 * standing between us and a verifiable "$0 corporate PAC" badge.
 *
 * WHY A HUMAN PASS IS NEEDED AT ALL. `classifyPacSponsor` resolves a committee
 * from fields the committee itself filed, and refuses to guess past them. For
 * most committees ORG_TP settles it. For a few hundred the FEC left ORG_TP
 * blank — Ernst & Young's and Deloitte's PACs both file it empty — and those
 * land in 'unknown'. Since "no corporate PAC money" is an ABSENCE claim, one
 * unknown committee blocks the badge for every candidate it gave to. Resolving
 * them is the single highest-leverage thing a human can do here.
 *
 * Ranks by 2026 committee -> candidate dollars and by how many candidates each
 * committee currently blocks, because that is exactly how much each verdict
 * buys. Prints a table AND writes a JSON template — the input file for
 * _apply-pac-curation.ts, whose "sponsorClass" fields start null.
 *
 * GET IT WRONG SAFELY. Marking a committee corporate/trade only ever BLOCKS a
 * clean badge. Marking it labor/membership/non_connected can CLEAR one. When
 * the evidence is thin, leave it null — an unresolved committee costs us a
 * badge we could have shown, while a wrong one costs a voter a false fact.
 *
 * Read-only. Runs on the dev machine:
 *   npx tsx --env-file=.env.local scripts/ingest/_export-sponsor-class-queue.ts [--limit 50] [--out path.json]
 */

import * as fs from "node:fs";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { PAC_SPONSOR_CLASS_LABELS } from "../../src/lib/pacSponsorClass";

const DEFAULT_OUT_PATH = "/tmp/pac-sponsor-class-queue.json";
const DEFAULT_LIMIT = 50;
const DEFAULT_CYCLE = "2026";

interface QueueRow {
  committee_id: string;
  name: string;
  designation: string | null;
  committee_type: string | null;
  org_type: string | null;
  connected_org: string | null;
  evidence_url: string;
  contrib_total: string | null;
  candidates_blocked: string;
}

function parseValueFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main() {
  const argv = process.argv;
  const limit = Number(parseValueFlag(argv, "--limit") ?? DEFAULT_LIMIT);
  const outPath = parseValueFlag(argv, "--out") ?? DEFAULT_OUT_PATH;
  const cycle = parseValueFlag(argv, "--cycle") ?? DEFAULT_CYCLE;
  // Integer, not merely finite: Postgres rejects a fractional LIMIT, so 2.5
  // would sail past validation and die in the query instead of here.
  if (!Number.isInteger(limit) || limit <= 0) {
    console.error(`Invalid --limit value: ${limit} — expected a whole number`);
    process.exit(1);
  }

  const db = requireDb();

  // Unresolved = no class yet, or explicitly 'unknown'. A human verdict
  // (sponsor_class_method='human') is never re-queued: it has been decided.
  const result = await db.execute(sql`
    SELECT
      pc.committee_id,
      pc.name,
      pc.designation,
      pc.committee_type,
      pc.org_type,
      pc.connected_org,
      pc.evidence_url,
      SUM(p.amount_total)::text AS contrib_total,
      COUNT(DISTINCT p.candidate_id)::text AS candidates_blocked
    FROM pac_committees pc
    JOIN pac_candidate_contributions p
      ON p.committee_id = pc.committee_id
     AND p.election_cycle = ${cycle}
    WHERE (pc.sponsor_class IS NULL OR pc.sponsor_class = 'unknown')
      AND COALESCE(pc.sponsor_class_method, '') <> 'human'
    GROUP BY pc.committee_id, pc.name, pc.designation, pc.committee_type,
             pc.org_type, pc.connected_org, pc.evidence_url
    ORDER BY SUM(p.amount_total) DESC
    LIMIT ${limit}
  `);
  const rows = result.rows as unknown as QueueRow[];

  if (rows.length === 0) {
    console.log(
      `[sponsor-class-queue] nothing unresolved for cycle ${cycle} — every ` +
        `contributing committee carries a sponsor class.`,
    );
    return;
  }

  console.log(
    `[sponsor-class-queue] ${rows.length} unresolved committee(s), cycle ${cycle}, ` +
      `ranked by dollars. Valid classes: ` +
      Object.keys(PAC_SPONSOR_CLASS_LABELS).join(" | "),
  );
  console.log(
    "\nCOMMITTEE     DSG CTP  DOLLARS       CANDS  NAME / CONNECTED ORG",
  );
  for (const r of rows) {
    const dollars = Number(r.contrib_total ?? 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    const connected = r.connected_org?.trim()
      ? `  <- ${r.connected_org.trim()}`
      : "";
    console.log(
      `${r.committee_id}  ${(r.designation ?? "-").padEnd(3)} ${(r.committee_type ?? "-").padEnd(3)} ` +
        `${dollars.padStart(12)}  ${r.candidates_blocked.padStart(5)}  ${r.name}${connected}`,
    );
  }

  const totalDollars = rows.reduce(
    (sum, r) => sum + Number(r.contrib_total ?? 0),
    0,
  );
  console.log(
    `\n[sponsor-class-queue] these ${rows.length} committee(s) account for ` +
      `${totalDollars.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} ` +
      `of unresolved PAC money.`,
  );

  const template = rows.map((r) => ({
    committeeId: r.committee_id,
    name: r.name,
    designation: r.designation,
    committeeType: r.committee_type,
    connectedOrg: r.connected_org,
    evidenceUrl: r.evidence_url,
    contribTotal: r.contrib_total,
    candidatesBlocked: Number(r.candidates_blocked),
    // Fill this in. Leave null when the evidence is thin — see the header.
    sponsorClass: null,
  }));
  fs.writeFileSync(outPath, JSON.stringify(template, null, 2));
  console.log(
    `[sponsor-class-queue] wrote ${outPath} — fill in "sponsorClass", then:\n` +
      `  npx tsx --env-file=.env.local scripts/ingest/_apply-pac-curation.ts ${outPath}\n` +
      `  (dry-run by default; add --confirm to write)`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
