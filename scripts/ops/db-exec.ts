/**
 * scripts/ops/db-exec.ts
 *
 * Turnkey SQL runner against the DATABASE_URL in .env.local (or the shell env).
 * Reuses the app's Neon HTTP client (db/client.ts) and loads .env.local via
 * @next/env, so you don't have to paste the connection string inline.
 *
 * Usage:
 *   # Apply a migration file (splits on drizzle's `--> statement-breakpoint`).
 *   # MUTATES the DB at DATABASE_URL — requires --yes.
 *   npx tsx scripts/ops/db-exec.ts --file db/migrations/0005_add_voter_issue_events.sql --yes
 *
 *   # Run an ad-hoc read query (prints rows as a table).
 *   npx tsx scripts/ops/db-exec.ts --sql "SELECT count(*) FROM voter_issue_events"
 *
 * Safety: connects to whatever DATABASE_URL resolves to (prod, per .env.local).
 * `--file` is gated behind `--yes`; `--sql` is for ad-hoc (read) queries.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true); // dev=true -> loads .env.local

import { readFileSync } from "node:fs";
import { requireDb, DatabaseNotConfiguredError } from "../../db/client";
import { sql } from "drizzle-orm";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(name);

// Split a drizzle-style .sql file into individual statements. The Neon HTTP
// driver executes one statement per request, so we cannot send the whole file.
function splitStatements(rawSql: string): string[] {
  return rawSql
    .split("--> statement-breakpoint")
    .map((chunk) =>
      chunk
        .replace(/^\s*--.*$/gm, "") // strip whole-line SQL comments
        .trim(),
    )
    .filter((chunk) => chunk.length > 0);
}

async function main() {
  let db;
  try {
    db = requireDb();
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      console.error("FAIL — DATABASE_URL is not set (.env.local or env).");
      process.exit(1);
    }
    throw err;
  }

  const file = arg("--file");
  const query = arg("--sql");

  if (file) {
    if (!hasFlag("--yes")) {
      console.error(
        `Refusing to apply ${file} without --yes — this MUTATES the database at DATABASE_URL.`,
      );
      process.exit(2);
    }
    const statements = splitStatements(readFileSync(file, "utf8"));
    console.log(`Applying ${statements.length} statement(s) from ${file} ...`);
    for (const [i, stmt] of statements.entries()) {
      await db.execute(sql.raw(stmt));
      const head = stmt.split("\n")[0].slice(0, 72);
      console.log(`  [${i + 1}/${statements.length}] OK  ${head}`);
    }
    console.log("Done.");
    process.exit(0);
  }

  if (query) {
    const res = await db.execute(sql.raw(query));
    const rows = (res as { rows?: unknown[] }).rows ?? res;
    console.table(rows);
    process.exit(0);
  }

  console.error('Nothing to do. Pass --file <path> --yes, or --sql "<query>".');
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
