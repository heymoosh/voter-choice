import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
function url() {
  const r = readFileSync(".env.alignment", "utf8");
  for (const l of r.split("\n")) {
    const t = l.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...v] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL")
      return v
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
  }
  throw new Error("no url");
}
async function main() {
  const sql = neon(url());
  // null-summary bills that are TAGGED (feed alignment), by source
  const bySource = await sql`
    SELECT b.source, count(*)::int AS n
    FROM bills b
    WHERE b.summary IS NULL
      AND EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id=b.id)
    GROUP BY 1 ORDER BY 2 DESC`;
  console.log("## NULL-summary TAGGED bills by source:");
  let total = 0;
  for (const r of bySource) {
    console.log(`  ${String(r.source).padEnd(12)} ${r.n}`);
    total += r.n;
  }
  console.log(`  TOTAL: ${total}`);
  // of those, how many have a sources[] url in raw_metadata (a fetch target)
  const withSrc = await sql`
    SELECT count(*)::int AS n FROM bills b
    WHERE b.summary IS NULL
      AND EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id=b.id)
      AND jsonb_array_length(COALESCE(b.raw_metadata->'sources','[]'::jsonb)) > 0`;
  console.log(
    `\n## of those, with >=1 source URL in raw_metadata: ${withSrc[0].n}`,
  );
  // sample a raw_metadata to see what fetch targets exist (keys + first source)
  const samp = await sql`
    SELECT b.id, b.source, b.raw_metadata->'sources'->0 AS first_source,
           (SELECT array_agg(k) FROM jsonb_object_keys(b.raw_metadata) k) AS meta_keys
    FROM bills b
    WHERE b.summary IS NULL AND b.source='openstates'
      AND EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id=b.id)
      AND jsonb_array_length(COALESCE(b.raw_metadata->'sources','[]'::jsonb)) > 0
    LIMIT 2`;
  console.log("\n## sample openstates null-summary bill metadata:");
  console.log(JSON.stringify(samp, null, 2).slice(0, 1200));
}
main().catch((e) => {
  console.error("SCOPE FAILED:", e.message);
  process.exit(1);
});
