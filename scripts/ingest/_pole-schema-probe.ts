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
  const cols =
    await sql`SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_name='issue_tags_pole_v1' ORDER BY ordinal_position`;
  console.log("## issue_tags_pole_v1 columns:");
  for (const c of cols)
    console.log(
      `  ${c.column_name.padEnd(22)} ${c.data_type.padEnd(28)} null=${c.is_nullable}`,
    );
  const samp = await sql`SELECT * FROM issue_tags_pole_v1 LIMIT 2`;
  console.log("\n## sample rows:");
  console.log(JSON.stringify(samp, null, 2));
  const idx =
    await sql`SELECT indexdef FROM pg_indexes WHERE tablename='issue_tags_pole_v1'`;
  console.log("\n## indexes:");
  for (const i of idx) console.log("  " + i.indexdef);
  const runs =
    await sql`SELECT source_run, count(*)::int n FROM issue_tags_pole_v1 GROUP BY 1 ORDER BY 1`;
  console.log("\n## source_run values:");
  for (const r of runs) console.log(`  ${r.source_run}: ${r.n}`);
}
main().catch((e) => {
  console.error("PROBE FAILED:", e.message);
  process.exit(1);
});
