/**
 * _summary-pilot.ts — Phase-1 pilot for summary recovery (read-only on DB; OpenStates GETs).
 *
 * Samples null-summary TAGGED openstates bills, calls the OpenStates v3 single-bill
 * endpoint with include=versions,sources, and measures:
 *   - YIELD: how many have >=1 fetchable full-text version
 *   - media-type mix (html vs pdf) → drives the extraction approach
 *   - rate-limit behavior (429s, Retry-After) → drives runtime planning for 16.8k
 *
 *   npx tsx scripts/ingest/_summary-pilot.ts [N=50]
 * Writes scripts/ingest/_pole-batches/_summary-pilot.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function env(name: string): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === name) return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error(`${name} not found in .env.alignment`);
}

const BASE = "https://v3.openstates.org";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// DB id "openstates-ocd-bill-<uuid>" → OpenStates id "ocd-bill/<uuid>"
function toOcdId(dbId: string): string {
  return dbId.replace(/^openstates-/, "").replace(/^ocd-bill-/, "ocd-bill/");
}

async function getBill(ocdId: string, apiKey: string) {
  const url = new URL(`${BASE}/bills/${ocdId}`);
  url.searchParams.append("include", "versions");
  url.searchParams.append("include", "sources");
  let capMs = 8000;
  for (let attempt = 0; attempt <= 6; attempt++) {
    const res = await fetch(url.href, {
      headers: { "user-agent": "voter-choice-summary-recovery", "X-API-KEY": apiKey },
    });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After")) || 0;
      const waitMs = retryAfter ? retryAfter * 1000 : Math.floor(Math.random() * capMs);
      console.warn(`  429 rate-limited; wait ${waitMs}ms (attempt ${attempt + 1})`);
      await sleep(waitMs);
      capMs *= 2;
      continue;
    }
    return { status: res.status, body: res.status === 200 ? await res.json() : await res.text() };
  }
  return { status: 429, body: "exhausted retries" };
}

async function main() {
  const N = Number(process.argv[2] ?? 50);
  const sql = neon(env("ALIGNMENT_DATABASE_URL"));
  const apiKey = env("OPENSTATES_API_KEY");

  const bills = (await sql`
    SELECT b.id, b.title, b.jurisdiction
    FROM bills b
    WHERE b.summary IS NULL AND b.source='openstates'
      AND EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id=b.id)
    ORDER BY b.id
    LIMIT ${N}`) as Array<{ id: string; title: string; jurisdiction: string }>;

  console.log(`Pilot: ${bills.length} null-summary tagged openstates bills\n`);
  const results: any[] = [];
  const media: Record<string, number> = {};
  let withVersion = 0, http200 = 0, errors = 0, has429 = 0;

  for (const b of bills) {
    const ocd = toOcdId(b.id);
    const { status, body } = await getBill(ocd, apiKey);
    if (status === 429) has429++;
    if (status !== 200) {
      errors++;
      results.push({ id: b.id, status, note: String(body).slice(0, 120) });
      await sleep(250);
      continue;
    }
    http200++;
    const versions = Array.isArray((body as any).versions) ? (body as any).versions : [];
    const links = versions.flatMap((v: any) => Array.isArray(v.links) ? v.links : []);
    if (links.length > 0) {
      withVersion++;
      for (const l of links) media[l.media_type ?? "unknown"] = (media[l.media_type ?? "unknown"] ?? 0) + 1;
    }
    const best = links.find((l: any) => /html/.test(l.media_type ?? "")) ?? links[0];
    results.push({
      id: b.id, status, jurisdiction: b.jurisdiction,
      n_versions: versions.length, n_links: links.length,
      best: best ? { media_type: best.media_type, url: best.url } : null,
      title: b.title.slice(0, 70),
    });
    await sleep(250); // polite throttle
  }

  writeFileSync("scripts/ingest/_pole-batches/_summary-pilot.json", JSON.stringify(results, null, 2));
  console.log("\n=== PILOT RESULTS ===");
  console.log(`HTTP 200: ${http200}/${bills.length} · errors: ${errors} · had-429: ${has429}`);
  console.log(`With >=1 fetchable version: ${withVersion}/${http200} (${Math.round((withVersion / Math.max(http200, 1)) * 100)}% yield)`);
  console.log(`Media types:`, media);
  console.log(`\nFirst 6 with versions:`);
  for (const r of results.filter((r) => r.best).slice(0, 6))
    console.log(`  [${r.jurisdiction}] ${r.best.media_type}  ${r.title}`);
  console.log(`\nDetails → scripts/ingest/_pole-batches/_summary-pilot.json`);
}

main().catch((e) => { console.error("PILOT FAILED:", e.message); process.exit(1); });
