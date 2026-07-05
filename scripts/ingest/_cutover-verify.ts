/**
 * _cutover-verify.ts — POST-FIRE verification (READ-ONLY) of the production cutover.
 *
 * Connects to the target DB (CUTOVER_PROD_DATABASE_URL) and confirms:
 *   1. Per-issue issue_tags counts post-fire: migrated issues == their confident pole_v1 count
 *      (no_score gone); blanked issues == 0; valence issues untouched.
 *   2. No stance_lens='no_score' rows leaked into issue_tags (the read path can't filter them).
 *   3. Replays the SHIPPED lookupAlignment math (imported computeVoteAlignment) for a few sample
 *      candidates on a contested issue → shows kept/total so a human can eyeball that scoring
 *      returns sensible, non-inverted results.
 *
 *   CUTOVER_PROD_DATABASE_URL=... npx tsx scripts/ingest/_cutover-verify.ts [issue] [in_favor|opposed]
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { computeVoteAlignment } from "../../src/lib/server/alignment";

const ALL_CONTESTED = [
  "gun_rights_safety",
  "immigration",
  "border_security",
  "reproductive_rights",
  "public_safety",
  "crime_public_safety",
  "environment_climate",
  "election_integrity",
  "economy_jobs",
  "education_funding",
  "property_taxes",
  "energy_grid",
];

function alignmentUrl(): string {
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
  return "";
}
function fourYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 4);
  return d.toISOString().slice(0, 10);
}
function cutoverVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  let raw = "";
  try {
    raw = readFileSync(".env.cutover", "utf8");
  } catch {
    return undefined;
  }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === key)
      return (
        rest
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "") || undefined
      );
  }
  return undefined;
}

async function main() {
  const issue = process.argv[2] || "energy_grid";
  const stance = (process.argv[3] as "in_favor" | "opposed") || "in_favor";
  const url = cutoverVar("CUTOVER_PROD_DATABASE_URL");
  if (!url)
    throw new Error("CUTOVER_PROD_DATABASE_URL not set (env or .env.cutover)");
  const sql = neon(url);
  console.log(
    `target host: ${(() => {
      try {
        return new URL(url).host;
      } catch {
        return "?";
      }
    })()}\n`,
  );

  // 1. Per-issue counts (contested) + pole_v1 confident expectation (from the alignment branch)
  const src = neon(alignmentUrl());
  console.log("=== POST-FIRE issue_tags counts (contested) ===");
  console.log(
    "issue                 prod_now  pv_confident(expected if migrated)",
  );
  for (const i of ALL_CONTESTED) {
    const now = (
      await sql`SELECT count(*)::int n FROM issue_tags WHERE canonical_issue=${i}`
    )[0].n;
    const pvConf = (
      await src`SELECT count(*)::int n FROM issue_tags_pole_v1 WHERE canonical_issue=${i} AND pole_stance IN ('in_favor','opposed')`
    )[0].n;
    console.log(`${i.padEnd(20)} ${String(now).padStart(8)}  ${pvConf}`);
  }

  // 2. no_score leak check
  const leak = (
    await sql`SELECT count(*)::int n FROM issue_tags WHERE stance_lens='no_score'`
  )[0].n;
  console.log(
    `\nstance_lens='no_score' rows in prod issue_tags: ${leak} ${leak === 0 ? "✓" : "✗ LEAK"}`,
  );

  // 3. Replay shipped lookupAlignment math for sample candidates
  const cutoff = fourYearsAgo();
  const cands = (await sql`
    SELECT DISTINCT v.candidate_id AS id FROM votes v
    JOIN issue_tags it ON it.bill_id = v.bill_id
    WHERE it.canonical_issue = ${issue} AND v.vote_date >= ${cutoff}
    LIMIT 5`) as Array<{ id: string }>;
  console.log(
    `\n=== lookupAlignment replay — issue=${issue}, resolvedStance=${stance} (${cands.length} sample candidates) ===`,
  );
  for (const c of cands) {
    const rows = (await sql`
      SELECT v.vote_cast AS vote_cast, it.stance_lens AS stance_lens
      FROM votes v
      JOIN bills b ON b.id = v.bill_id
      JOIN issue_tags it ON it.bill_id = b.id AND it.canonical_issue = ${issue}
      WHERE v.candidate_id = ${c.id} AND v.vote_date >= ${cutoff}`) as Array<{
      vote_cast: string;
      stance_lens: string;
    }>;
    const scored = rows
      .map((r) => computeVoteAlignment(r.vote_cast, r.stance_lens, stance))
      .filter((a) => a !== "abstain");
    const kept = scored.filter((a) => a === "with").length;
    console.log(
      `  candidate ${c.id.slice(0, 28).padEnd(28)} kept ${kept}/${scored.length}` +
        (scored.length < 5 ? "  (limited-data notice would show)" : ""),
    );
  }
  console.log(
    `\nDone. Spot-check the kept/total above against expectation; then check the live app.`,
  );
}

main().catch((e) => {
  console.error("VERIFY FAILED:", e.message);
  process.exit(1);
});
