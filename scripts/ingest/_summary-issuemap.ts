/**
 * _summary-issuemap.ts — for our 16,841 recovery bills, map each to the canonical
 * issues it's tagged to, flagging the 12 launch-blocking CONTESTED issues (those drive
 * the pole_v1 re-tag; valence-only bills get a summary but no pole re-tag this round).
 * Read-only on Neon. Output: _pole-batches/_summary-issuemap.json  { our_id: { contested:[...], all:[...] } }
 */
import { readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const CONTESTED = new Set([
  "gun_rights_safety",
  "immigration",
  "border_security",
  "public_safety",
  "crime_public_safety",
  "energy_grid",
  "reproductive_rights",
  "environment_climate",
  "election_integrity",
  "economy_jobs",
  "education_funding",
  "property_taxes",
]);

function env(n: string): string {
  const r = readFileSync(".env.alignment", "utf8");
  for (const l of r.split("\n")) {
    const t = l.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...v] = t.split("=");
    if (k.trim() === n)
      return v
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
  }
  throw new Error(n);
}

async function main() {
  const sql = neon(env("ALIGNMENT_DATABASE_URL"));
  const rows = (await sql`
    SELECT it.bill_id, it.canonical_issue
    FROM issue_tags it
    JOIN bills b ON b.id = it.bill_id
    WHERE b.summary IS NULL AND b.source = 'openstates'`) as Array<{
    bill_id: string;
    canonical_issue: string;
  }>;

  const map: Record<string, { contested: string[]; all: string[] }> = {};
  for (const r of rows) {
    map[r.bill_id] ??= { contested: [], all: [] };
    map[r.bill_id].all.push(r.canonical_issue);
    if (CONTESTED.has(r.canonical_issue))
      map[r.bill_id].contested.push(r.canonical_issue);
  }
  writeFileSync(
    "scripts/ingest/_pole-batches/_summary-issuemap.json",
    JSON.stringify(map),
  );

  const bills = Object.keys(map).length;
  const withContested = Object.values(map).filter(
    (m) => m.contested.length > 0,
  ).length;
  const multiContested = Object.values(map).filter(
    (m) => m.contested.length > 1,
  ).length;
  console.log(`bills: ${bills}`);
  console.log(
    `with >=1 contested tag: ${withContested} (${Math.round((withContested / bills) * 100)}%) → these get pole re-tag`,
  );
  console.log(`with >1 contested tag: ${multiContested}`);
  console.log(
    `valence-only (summary only, no re-tag): ${bills - withContested}`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
