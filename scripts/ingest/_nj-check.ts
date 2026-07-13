import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Check columns available
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'candidates' ORDER BY ordinal_position LIMIT 20`;
  console.log('Columns:', cols.map((r: any) => r.column_name).join(', '));
  
  const rows = await sql`SELECT full_name, jurisdiction FROM candidates WHERE jurisdiction LIKE 'state-NJ-%' ORDER BY full_name`;
  console.log('NJ candidates:', rows.length);
  rows.forEach((r: any) => console.log(r.full_name, '|', r.jurisdiction));
}
main().catch(console.error);
