import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  const rows = await sql`SELECT full_name, jurisdiction FROM candidates WHERE jurisdiction LIKE 'state-NV-%' ORDER BY full_name LIMIT 10`;
  const cnt = await sql`SELECT COUNT(*) as c FROM candidates WHERE jurisdiction LIKE 'state-NV-%'`;
  console.log('NV candidates:', cnt[0].c);
  rows.forEach((r: any) => console.log(r.full_name, '|', r.jurisdiction));
}
main().catch(console.error);
