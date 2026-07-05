/**
 * _cutover-rehearse.ts — rehearse the migrate-with-deletes SQL MECHANICS on a CLONE table,
 * on the alignment branch (.env.alignment). Validates the upsert/delete/read-exclusion that
 * the tag-validation does NOT touch — separate from tag correctness.
 *
 * Clones issue_tags → issue_tags_rehearsal (LIKE ... INCLUDING ALL, so the UNIQUE index +
 * ON CONFLICT work), applies the EXACT migration SQL used by _cutover-fire.ts for all 12
 * contested issues, then checks per-issue counts + replays lookupAlignment before/after, then
 * drops the clone. Never touches issue_tags or production.
 *
 *   npx tsx scripts/ingest/_cutover-rehearse.ts
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { computeVoteAlignment } from "../../src/lib/server/alignment";

const ISSUES = [
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
const CONF_MAP: Record<string, string> = {
  high: "0.900",
  medium: "0.650",
  low: "0.400",
};
const TAGGER_VERSION = "pole-anchored-v1";
const CHUNK = 500;
const T = "issue_tags_rehearsal";

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
function fourYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 4);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const sql = neon(loadUrl());
  try {
    console.log("Cloning issue_tags → " + T + " ...");
    await sql.query(`DROP TABLE IF EXISTS ${T}`);
    await sql.query(`CREATE TABLE ${T} (LIKE issue_tags INCLUDING ALL)`);
    await sql.query(`INSERT INTO ${T} SELECT * FROM issue_tags`);
    const before = (await sql.query(`SELECT count(*)::int n FROM ${T}`))[0].n;
    console.log(`clone rows: ${before}\n`);

    const cutoff = fourYearsAgo();

    // ---- apply EXACT migration SQL (mirrors _cutover-fire.ts) per issue ----
    for (const issue of ISSUES) {
      const pv =
        (await sql`SELECT bill_id, pole_stance, tagger_confidence FROM issue_tags_pole_v1 WHERE canonical_issue=${issue}`) as Array<{
          bill_id: string;
          pole_stance: string;
          tagger_confidence: string;
        }>;
      const confident = pv.filter(
        (r) => r.pole_stance === "in_favor" || r.pole_stance === "opposed",
      );
      const noScoreIds = pv
        .filter((r) => r.pole_stance === "no_score")
        .map((r) => r.bill_id);
      for (let i = 0; i < confident.length; i += CHUNK) {
        const c = confident.slice(i, i + CHUNK);
        await sql.query(
          `INSERT INTO ${T} (bill_id, canonical_issue, stance_lens, tagger_version, tagger_confidence)
           SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::numeric[])
           ON CONFLICT (bill_id, canonical_issue) DO UPDATE
             SET stance_lens=EXCLUDED.stance_lens, tagger_confidence=EXCLUDED.tagger_confidence,
                 tagger_version=EXCLUDED.tagger_version, tagged_at=now()`,
          [
            c.map((r) => r.bill_id),
            c.map(() => issue),
            c.map((r) => r.pole_stance),
            c.map(() => TAGGER_VERSION),
            c.map((r) => CONF_MAP[r.tagger_confidence] ?? "0.400"),
          ],
        );
      }
      for (let i = 0; i < noScoreIds.length; i += CHUNK) {
        const ids = noScoreIds.slice(i, i + CHUNK);
        await sql.query(
          `DELETE FROM ${T} WHERE canonical_issue=$1 AND bill_id = ANY($2)`,
          [issue, ids],
        );
      }
    }

    // ---- verify per-issue counts ----
    console.log("=== REHEARSAL post-migration counts (clone) ===");
    console.log(
      "issue                 after  pv_confident  match  | old(issue_tags)",
    );
    let ok = true;
    for (const issue of ISSUES) {
      const after = (
        await sql.query(
          `SELECT count(*)::int n FROM ${T} WHERE canonical_issue=$1`,
          [issue],
        )
      )[0].n;
      const conf = (
        await sql`SELECT count(*)::int n FROM issue_tags_pole_v1 WHERE canonical_issue=${issue} AND pole_stance IN ('in_favor','opposed')`
      )[0].n;
      const old = (
        await sql`SELECT count(*)::int n FROM issue_tags WHERE canonical_issue=${issue}`
      )[0].n;
      const m = after === conf;
      if (!m) ok = false;
      console.log(
        `${issue.padEnd(20)} ${String(after).padStart(5)}  ${String(conf).padStart(12)}  ${m ? "✓" : "✗"}      | ${old}`,
      );
    }
    const leak = (
      await sql.query(
        `SELECT count(*)::int n FROM ${T} WHERE stance_lens='no_score'`,
      )
    )[0].n;
    const afterTotal = (await sql.query(`SELECT count(*)::int n FROM ${T}`))[0]
      .n;
    console.log(`\nno_score leak in clone: ${leak} ${leak === 0 ? "✓" : "✗"}`);
    console.log(
      `clone total: ${before} → ${afterTotal} (Δ ${afterTotal - before})`,
    );

    // ---- lookupAlignment replay: before (issue_tags) vs after (clone) for a sample candidate/issue ----
    console.log(
      `\n=== lookupAlignment replay (before issue_tags → after clone), in_favor stance ===`,
    );
    for (const issue of [
      "energy_grid",
      "election_integrity",
      "public_safety",
    ]) {
      const cand = (await sql`
        SELECT v.candidate_id id FROM votes v JOIN issue_tags it ON it.bill_id=v.bill_id
        WHERE it.canonical_issue=${issue} AND v.vote_date>=${cutoff} LIMIT 1`) as Array<{
        id: string;
      }>;
      if (!cand.length) {
        console.log(`${issue}: no sample candidate`);
        continue;
      }
      const id = cand[0].id;
      const score = async (table: string) => {
        const rows = (await sql.query(
          `SELECT v.vote_cast vc, t.stance_lens sl FROM votes v
           JOIN ${table} t ON t.bill_id=v.bill_id AND t.canonical_issue=$1
           WHERE v.candidate_id=$2 AND v.vote_date>=$3`,
          [issue, id, cutoff],
        )) as Array<{ vc: string; sl: string }>;
        const s = rows
          .map((r) => computeVoteAlignment(r.vc, r.sl, "in_favor"))
          .filter((a) => a !== "abstain");
        return `kept ${s.filter((a) => a === "with").length}/${s.length}`;
      };
      console.log(
        `  ${issue.padEnd(20)} cand ${id.slice(0, 22)}  before=${await score("issue_tags")}  after=${await score(T)}`,
      );
    }

    console.log(
      `\nREHEARSAL ${ok && leak === 0 ? "PASS ✓ — SQL mechanics validated" : "FAIL ✗ — investigate"}`,
    );
  } finally {
    await sql.query(`DROP TABLE IF EXISTS ${T}`);
    console.log(`(dropped ${T})`);
  }
}

main().catch((e) => {
  console.error("REHEARSE FAILED:", e.message);
  process.exit(1);
});
