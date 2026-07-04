/**
 * _summary-persist.ts — write recovery results to the Neon alignment branch.
 *
 * Reads _summary-work/_results/*.json (validated against batch membership):
 *   - UPDATE bills.summary for every recovered bill (idempotent).
 *   - For contested results (pole_stance present), upsert issue_tags_pole_v1
 *     (source_run='summary-recovery-1') — overwrites the prior null-summary no_score.
 *
 *   npx tsx scripts/ingest/_summary-persist.ts            # all result files
 *   npx tsx scripts/ingest/_summary-persist.ts <batchId>… # only these (dry-run persist)
 */
import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const WORK = "scripts/ingest/_pole-batches/_summary-work";
const TAGGER_VERSION = "pole-anchored-v1";
const SOURCE_RUN = "summary-recovery-1";
const VALID_STANCE = new Set(["in_favor", "opposed", "no_score"]);
const VALID_CONF = new Set(["high", "medium", "low"]);
const CHUNK = 500;

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
  const only = process.argv.slice(2);
  const manifest = JSON.parse(
    readFileSync(`${WORK}/_manifest.json`, "utf8"),
  ) as Array<{
    batchId: string;
    issue: string | null;
    resultPath: string;
    count: number;
  }>;
  const entries = only.length
    ? manifest.filter((m) => only.includes(m.batchId))
    : manifest;

  const summaries = new Map<string, string>(); // bill_id → summary (last wins)
  const tags = new Map<
    string,
    { issue: string; stance: string; conf: string }
  >(); // bill_id|issue → tag
  let missing = 0,
    dropped = 0;

  for (const m of entries) {
    if (!existsSync(m.resultPath)) {
      missing++;
      continue;
    }
    const result = JSON.parse(readFileSync(m.resultPath, "utf8")) as {
      results: Array<{
        bill_id: string;
        summary?: string;
        pole_stance?: string;
        confidence?: string;
      }>;
    };
    const batch = JSON.parse(
      readFileSync(`${WORK}/${m.batchId}.json`, "utf8"),
    ) as { bills: { id: string }[] };
    const ids = new Set(batch.bills.map((b) => b.id));
    for (const r of result.results) {
      if (!ids.has(r.bill_id)) {
        dropped++;
        continue;
      }
      if (r.summary && r.summary.trim())
        summaries.set(r.bill_id, r.summary.trim());
      if (m.issue && r.pole_stance && VALID_STANCE.has(r.pole_stance)) {
        tags.set(`${r.bill_id}|${m.issue}`, {
          issue: m.issue,
          stance: r.pole_stance,
          conf: VALID_CONF.has(r.confidence ?? "")
            ? (r.confidence as string)
            : "low",
        });
      }
    }
  }

  console.log(
    `results: ${summaries.size} summaries · ${tags.size} contested tags · missing files ${missing} · dropped ${dropped}`,
  );
  const sql = neon(env("ALIGNMENT_DATABASE_URL"));

  // 1) bills.summary
  const sumRows = [...summaries.entries()];
  let su = 0;
  for (let i = 0; i < sumRows.length; i += CHUNK) {
    const c = sumRows.slice(i, i + CHUNK);
    await sql`
      UPDATE bills SET summary = v.summary, updated_at = now()
      FROM (SELECT unnest(${c.map((x) => x[0])}::text[]) AS id,
                   unnest(${c.map((x) => x[1])}::text[]) AS summary) v
      WHERE bills.id = v.id`;
    su += c.length;
    process.stdout.write(`\r  bills.summary updated ${su}/${sumRows.length}`);
  }
  console.log("");

  // 2) issue_tags_pole_v1 upserts
  const tagRows = [...tags.entries()].map(([key, t]) => ({
    bill_id: key.split("|")[0],
    issue: t.issue,
    stance: t.stance,
    conf: t.conf,
  }));
  let tu = 0;
  for (let i = 0; i < tagRows.length; i += CHUNK) {
    const c = tagRows.slice(i, i + CHUNK);
    await sql`
      INSERT INTO issue_tags_pole_v1 (bill_id, canonical_issue, pole_stance, tagger_version, tagger_confidence, source_run)
      SELECT * FROM unnest(
        ${c.map((r) => r.bill_id)}::text[], ${c.map((r) => r.issue)}::text[],
        ${c.map((r) => r.stance)}::text[], ${c.map(() => TAGGER_VERSION)}::text[],
        ${c.map((r) => r.conf)}::text[], ${c.map(() => SOURCE_RUN)}::text[])
      ON CONFLICT (bill_id, canonical_issue, tagger_version) DO UPDATE
        SET pole_stance = EXCLUDED.pole_stance, tagger_confidence = EXCLUDED.tagger_confidence,
            source_run = EXCLUDED.source_run, tagged_at = now()`;
    tu += c.length;
    process.stdout.write(`\r  pole_v1 upserted ${tu}/${tagRows.length}`);
  }
  console.log(
    `\nDONE: ${su} summaries written, ${tu} contested tags upserted (source_run=${SOURCE_RUN}).`,
  );
}
main().catch((e) => {
  console.error("PERSIST FAILED:", e.message);
  process.exit(1);
});
