import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  const rows = await sql`SELECT full_name, jurisdiction FROM candidates WHERE jurisdiction LIKE 'state-RI-%' ORDER BY full_name`;
  console.log('RI candidates:', rows.length);
  rows.forEach((r: any) => console.log(r.full_name, '|', r.jurisdiction));
}
main().catch(console.error);
