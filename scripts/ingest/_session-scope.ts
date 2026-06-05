import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
function env(n:string){const r=readFileSync(".env.alignment","utf8");for(const l of r.split("\n")){const t=l.trim();if(t.startsWith("#")||!t.includes("="))continue;const[k,...v]=t.split("=");if(k.trim()===n)return v.join("=").trim().replace(/^["']|["']$/g,"");}throw new Error(n);}
async function main(){
  const sql=neon(env("ALIGNMENT_DATABASE_URL"));
  // jurisdictions span
  const j=await sql`
    SELECT b.jurisdiction, count(*)::int n
    FROM bills b WHERE b.summary IS NULL AND b.source='openstates'
      AND EXISTS(SELECT 1 FROM issue_tags it WHERE it.bill_id=b.id)
    GROUP BY 1 ORDER BY 2 DESC`;
  console.log("## null-summary tagged openstates bills by jurisdiction:");
  for(const r of j) console.log(`  ${String(r.jurisdiction).padEnd(28)} ${r.n}`);
  console.log("  distinct jurisdictions:", j.length);
  // what session/identifier info exists in raw_metadata?
  const meta=await sql`
    SELECT b.id, b.jurisdiction, b.raw_metadata->>'session' AS session,
           b.raw_metadata->>'identifier' AS identifier,
           (SELECT array_agg(k) FROM jsonb_object_keys(b.raw_metadata) k) AS keys
    FROM bills b WHERE b.summary IS NULL AND b.source='openstates'
      AND EXISTS(SELECT 1 FROM issue_tags it WHERE it.bill_id=b.id)
    LIMIT 3`;
  console.log("\n## sample metadata (session/identifier/keys):");
  console.log(JSON.stringify(meta,null,2).slice(0,1400));
}
main().catch(e=>{console.error(e.message);process.exit(1);});
