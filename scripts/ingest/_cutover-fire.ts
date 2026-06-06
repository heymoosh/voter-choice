/**
 * _cutover-fire.ts — the PRODUCTION cutover (DATA-ONLY). DRY-RUN BY DEFAULT.
 *
 * Migrates corrected pole_v1 tags into production issue_tags, per-issue, transactionally:
 *   - PASS (migrate): UPSERT confident (in_favor/opposed) under existing (bill_id,canonical_issue)
 *     keys; DELETE rows pole_v1 marks no_score (innerJoin then excludes them, like abstains).
 *   - FAIL (blank): DELETE every prod issue_tags row for that issue ("no tagged votes yet").
 *
 * Connections (deliberately separate so a branch script can NEVER hit prod by accident):
 *   - PROD  : env CUTOVER_PROD_DATABASE_URL  (explicit; NOT .env.local autoload)
 *   - SOURCE: .env.alignment ALIGNMENT_DATABASE_URL (read pole_v1)
 *
 * Safety: dry-run unless --fire; prints the prod host; runs anti-join pre-flight; backs up
 * ALL contested rows to issue_tags_backup_precutover (aborts if that table already exists)
 * before any mutation; one neon HTTP transaction per issue.
 *
 *   plan file: { "migrate": ["issue", ...], "blank": ["issue", ...] }
 *   npx tsx scripts/ingest/_cutover-fire.ts <plan.json>            # dry-run (read-only preflight)
 *   CUTOVER_PROD_DATABASE_URL=... npx tsx scripts/ingest/_cutover-fire.ts <plan.json> --fire
 */
import { readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const ALL_CONTESTED = [
  "gun_rights_safety", "immigration", "border_security", "reproductive_rights",
  "public_safety", "crime_public_safety", "environment_climate", "election_integrity",
  "economy_jobs", "education_funding", "property_taxes", "energy_grid",
];
const CONF_MAP: Record<string, string> = { high: "0.900", medium: "0.650", low: "0.400" };
const TAGGER_VERSION = "pole-anchored-v1";
const BACKUP_TABLE = "issue_tags_backup_precutover";
const CHUNK = 500;

function loadAlignmentUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL")
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("ALIGNMENT_DATABASE_URL not found in .env.alignment");
}
function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return "?"; }
}

async function main() {
  const planPath = process.argv[2];
  const FIRE = process.argv.includes("--fire");
  if (!planPath) throw new Error("usage: _cutover-fire.ts <plan.json> [--fire]");
  const plan = JSON.parse(readFileSync(planPath, "utf8")) as { migrate: string[]; blank: string[] };
  const migrate = plan.migrate || [];
  const blank = plan.blank || [];
  for (const i of [...migrate, ...blank])
    if (!ALL_CONTESTED.includes(i)) throw new Error(`plan references non-contested issue: ${i}`);
  const overlap = migrate.filter((i) => blank.includes(i));
  if (overlap.length) throw new Error(`issue in BOTH migrate and blank: ${overlap.join(", ")}`);

  const prodUrl = process.env.CUTOVER_PROD_DATABASE_URL;
  if (!prodUrl) throw new Error("CUTOVER_PROD_DATABASE_URL is not set (required even for dry-run preflight)");
  const srcUrl = loadAlignmentUrl();
  if (hostOf(prodUrl) === hostOf(srcUrl))
    throw new Error("PROD url host == alignment-branch host — refusing (point CUTOVER_PROD_DATABASE_URL at PRODUCTION)");

  const prod = neon(prodUrl);
  const src = neon(srcUrl);
  console.log(`MODE: ${FIRE ? "🔥 FIRE (will mutate prod)" : "DRY-RUN (read-only preflight)"}`);
  console.log(`PROD host  : ${hostOf(prodUrl)}`);
  console.log(`SOURCE host: ${hostOf(srcUrl)} (pole_v1)`);
  console.log(`migrate: ${migrate.join(", ") || "(none)"}`);
  console.log(`blank  : ${blank.join(", ") || "(none)"}\n`);

  // ---- PRE-FLIGHT (read-only on prod) ----
  const total = (await prod`SELECT count(*)::int n FROM issue_tags`)[0].n;
  console.log(`prod issue_tags total: ${total}`);
  let blocked = false;
  for (const issue of migrate) {
    const prodN = (await prod`SELECT count(*)::int n FROM issue_tags WHERE canonical_issue=${issue}`)[0].n;
    const pvRows = (await src`SELECT bill_id, pole_stance, tagger_confidence FROM issue_tags_pole_v1 WHERE canonical_issue=${issue}`) as Array<{ bill_id: string; pole_stance: string; tagger_confidence: string }>;
    const pvIds = new Set(pvRows.map((r) => r.bill_id));
    const prodIds = (await prod`SELECT bill_id FROM issue_tags WHERE canonical_issue=${issue}`) as Array<{ bill_id: string }>;
    const prodIdSet = new Set(prodIds.map((r) => r.bill_id));
    const prodNotInPv = [...prodIdSet].filter((id) => !pvIds.has(id)).length;
    const pvNotInProd = [...pvIds].filter((id) => !prodIdSet.has(id)).length;
    const conf = pvRows.filter((r) => r.pole_stance === "in_favor" || r.pole_stance === "opposed").length;
    const noScore = pvRows.length - conf;
    const ok = prodNotInPv === 0 && pvNotInProd === 0;
    if (!ok) blocked = true;
    console.log(`  ${issue.padEnd(20)} prod=${prodN} pv=${pvRows.length} (upsert ${conf}, delete ${noScore}) ` +
      `| prodNotInPv=${prodNotInPv} pvNotInProd=${pvNotInProd} ${ok ? "✓" : "✗ KEY GAP"}`);
  }
  for (const issue of blank) {
    const prodN = (await prod`SELECT count(*)::int n FROM issue_tags WHERE canonical_issue=${issue}`)[0].n;
    console.log(`  ${issue.padEnd(20)} BLANK → delete all ${prodN} prod rows`);
  }
  if (blocked) throw new Error("ABORT: key-set gap in a migrate issue (would leave stale/inverted rows). Investigate before firing.");

  if (!FIRE) {
    console.log(`\nDRY-RUN complete. Pre-flight clean. Re-run with --fire to execute.`);
    return;
  }

  // ---- BACKUP (prod) — abort if it already exists, so we never clobber a prior backup ----
  // BACKUP_TABLE is a hardcoded constant (never user input) → safe to inline in query text.
  const exists = (await prod`SELECT to_regclass(${BACKUP_TABLE}) IS NOT NULL AS e`)[0].e;
  if (exists) throw new Error(`${BACKUP_TABLE} already exists — refusing to overwrite. Drop/rename it if this is a re-run.`);
  await prod.query(
    `CREATE TABLE ${BACKUP_TABLE} AS SELECT * FROM issue_tags WHERE canonical_issue = ANY($1)`,
    [ALL_CONTESTED],
  );
  const backupN = (await prod.query(`SELECT count(*)::int n FROM ${BACKUP_TABLE}`))[0].n;
  const dump = (await prod.query(`SELECT * FROM ${BACKUP_TABLE}`)) as unknown[];
  writeFileSync(`scripts/ingest/_cutover-backup-${backupN}rows.json`, JSON.stringify(dump));
  console.log(`\nBACKUP: ${BACKUP_TABLE} created (${backupN} rows) + JSON dump written.`);

  // ---- MIGRATE per issue (one transaction each) ----
  for (const issue of migrate) {
    const pvRows = (await src`SELECT bill_id, pole_stance, tagger_confidence FROM issue_tags_pole_v1 WHERE canonical_issue=${issue}`) as Array<{ bill_id: string; pole_stance: string; tagger_confidence: string }>;
    const confident = pvRows.filter((r) => r.pole_stance === "in_favor" || r.pole_stance === "opposed");
    const noScoreIds = pvRows.filter((r) => r.pole_stance === "no_score").map((r) => r.bill_id);
    const queries = [];
    for (let i = 0; i < confident.length; i += CHUNK) {
      const c = confident.slice(i, i + CHUNK);
      queries.push(prod`
        INSERT INTO issue_tags (bill_id, canonical_issue, stance_lens, tagger_version, tagger_confidence)
        SELECT * FROM unnest(
          ${c.map((r) => r.bill_id)}::text[],
          ${c.map(() => issue)}::text[],
          ${c.map((r) => r.pole_stance)}::text[],
          ${c.map(() => TAGGER_VERSION)}::text[],
          ${c.map((r) => CONF_MAP[r.tagger_confidence] ?? "0.400")}::numeric[]
        )
        ON CONFLICT (bill_id, canonical_issue) DO UPDATE
          SET stance_lens = EXCLUDED.stance_lens,
              tagger_confidence = EXCLUDED.tagger_confidence,
              tagger_version = EXCLUDED.tagger_version,
              tagged_at = now()`);
    }
    for (let i = 0; i < noScoreIds.length; i += CHUNK) {
      const ids = noScoreIds.slice(i, i + CHUNK);
      queries.push(prod`DELETE FROM issue_tags WHERE canonical_issue=${issue} AND bill_id = ANY(${ids})`);
    }
    await prod.transaction(queries);
    const after = (await prod`SELECT count(*)::int n FROM issue_tags WHERE canonical_issue=${issue}`)[0].n;
    console.log(`  MIGRATED ${issue.padEnd(20)} upsert ${confident.length}, delete ${noScoreIds.length} → prod now ${after}`);
  }
  for (const issue of blank) {
    await prod.transaction([prod`DELETE FROM issue_tags WHERE canonical_issue=${issue}`]);
    console.log(`  BLANKED  ${issue.padEnd(20)} → prod now 0`);
  }

  const finalTotal = (await prod`SELECT count(*)::int n FROM issue_tags`)[0].n;
  console.log(`\n🔥 CUTOVER COMPLETE. prod issue_tags total: ${total} → ${finalTotal}. Backup: ${BACKUP_TABLE}.`);
}

main().catch((e) => {
  console.error("CUTOVER FAILED:", e.message);
  process.exit(1);
});
