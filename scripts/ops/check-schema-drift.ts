/**
 * scripts/ops/check-schema-drift.ts
 *
 * Deploy-time schema-vs-migrations DRIFT CHECK.
 *
 * Why this exists
 * ---------------
 * On 2026-06-26 prod silently blanked ALL voter alignment because the prod
 * Neon DB sat BEHIND its migrations — migrations 0005/0006 were never applied,
 * so `voter_issue_events` (and `voter_issue_events.sub_issue`,
 * `issue_tags.sub_issue`, the `*_sub_issue_idx` indexes) were MISSING. The app
 * failed *silently* — no error, no logs, just empty results. CI was green
 * because CI applies migrations to a fresh DB; nobody compared the migration
 * files to what was actually live in prod.
 *
 * This check closes that gap: pointed at a DB (via DATABASE_URL), it FAILS
 * LOUDLY (exit 1) if that DB is missing any table / column / index that the
 * migration files in db/migrations/ say should exist.
 *
 * Design
 * ------
 *   - parseMigrations() / diff() / computeExitCode() are PURE and unit-testable
 *     (no DB, no env). They are exported for the test suite.
 *   - introspectDb() is the ONLY impure piece: it takes a connected query
 *     function and reads information_schema / pg_indexes.
 *   - main() wires env + connection + IO and is guarded so importing this
 *     module does NOT run it.
 *
 * Usage
 * -----
 *   DATABASE_URL=<neon-url> npx tsx scripts/ops/check-schema-drift.ts
 *   DATABASE_URL=<neon-url> npx tsx scripts/ops/check-schema-drift.ts --require-db
 *
 * With no DATABASE_URL the check SKIPS (exit 0) and prints a loud warning — so
 * it is safe to wire into deploy.yml before the DATABASE_URL secret is plumbed.
 * Pass --require-db to turn that skip into a hard failure once the DB plumbing
 * is in place.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Expected (and actual) schema, all lower-cased identifiers. */
export interface SchemaShape {
  /** Table names, e.g. "voter_issue_events". */
  tables: Set<string>;
  /** "table.column", e.g. "voter_issue_events.sub_issue". */
  columns: Set<string>;
  /** Index names, e.g. "voter_issue_events_sub_issue_idx". */
  indexes: Set<string>;
}

export interface SchemaDiff {
  missingTables: string[];
  missingColumns: string[];
  missingIndexes: string[];
}

export interface ParseResult {
  schema: SchemaShape;
  /** Count of statements we could not classify (informational). */
  skipped: number;
  /**
   * Schema-DECLARING statements (CREATE TABLE / ADD COLUMN / CREATE INDEX) that
   * we recognised by keyword but FAILED to fully parse — e.g. a schema-qualified
   * or unquoted identifier, or a statement corrupted by a `;` / `--` inside a
   * string literal. These are the dangerous skips: the object they declare is
   * absent from `schema`, so the guard would fail OPEN on it. Each entry is the
   * statement's leading snippet, for a loud warning. Benign skips (FK
   * constraints, RENAME, etc.) are NOT included.
   */
  unparsedDdl: string[];
}

// ---------------------------------------------------------------------------
// Migration parser (PURE — no DB, no env)
// ---------------------------------------------------------------------------

/** Strip surrounding double quotes from a captured SQL identifier. */
function unquote(ident: string): string {
  return ident.replace(/^"|"$/g, "").trim().toLowerCase();
}

/**
 * Split a migration file's text into individual statements.
 * drizzle separates statements with `--> statement-breakpoint`; hand-written
 * migrations may rely on plain `;`. Split on both, then drop empties.
 */
export function splitStatements(sql: string): string[] {
  return sql
    .split(/-->\s*statement-breakpoint/i)
    .flatMap((chunk) => chunk.split(";"))
    .map((s) => stripSqlComments(s).trim())
    .filter((s) => s.length > 0);
}

/** Remove `-- line comments` so they can't swallow real tokens on a line. */
function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

/**
 * Extract column names declared inside a `CREATE TABLE "t" ( ... )` body.
 * Only top-level column definitions count: each begins with a double-quoted
 * identifier. Table-level constraints (PRIMARY KEY (...), FOREIGN KEY (...),
 * CONSTRAINT ...) start with a keyword, not a quote, so they're skipped.
 */
function extractTableColumns(body: string): string[] {
  const cols: string[] = [];
  // Split the parenthesised body on top-level commas (depth 0). Column defs
  // can contain commas inside type modifiers like numeric(15, 2), so track
  // paren depth.
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf);

  for (const part of parts) {
    const trimmed = part.trim();
    // Column definitions start with a double-quoted name. Constraint clauses
    // (CONSTRAINT/PRIMARY/FOREIGN/UNIQUE/CHECK) start with a keyword.
    const m = trimmed.match(/^"([^"]+)"/);
    if (m) cols.push(m[1].toLowerCase());
  }
  return cols;
}

/** Classify a single statement and fold it into the cumulative schema. */
function applyStatement(stmt: string, schema: SchemaShape): boolean {
  // CREATE TABLE [IF NOT EXISTS] "name" ( <body> )
  const createTable = stmt.match(
    /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"\s*\(([\s\S]*)\)\s*$/i,
  );
  if (createTable) {
    const table = unquote(createTable[1]);
    schema.tables.add(table);
    for (const col of extractTableColumns(createTable[2])) {
      schema.columns.add(`${table}.${col}`);
    }
    return true;
  }

  // ALTER TABLE "t" ADD COLUMN [IF NOT EXISTS] "col" ...
  const addColumn = stmt.match(
    /^ALTER\s+TABLE\s+"([^"]+)"\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/i,
  );
  if (addColumn) {
    schema.columns.add(`${unquote(addColumn[1])}.${unquote(addColumn[2])}`);
    return true;
  }

  // CREATE [UNIQUE] INDEX [IF NOT EXISTS] "idx" ON "t" (...)
  const createIndex = stmt.match(
    /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"\s+ON\s+"([^"]+)"/i,
  );
  if (createIndex) {
    schema.indexes.add(unquote(createIndex[1]));
    return true;
  }

  return false;
}

/**
 * True if a statement DECLARES a schema object we assert on (a table, a column
 * via ADD COLUMN, or an index) — recognised purely by leading keyword, looser
 * than applyStatement's strict identifier match. Used to distinguish a
 * *dangerous* parse miss (a CREATE TABLE we couldn't read → object absent from
 * expected → guard fails open) from a *benign* skip (ADD CONSTRAINT, RENAME,
 * DROP, etc.) that we never assert on anyway.
 */
function declaresSchemaObject(stmt: string): boolean {
  return (
    /^CREATE\s+TABLE\b/i.test(stmt) ||
    /^ALTER\s+TABLE\b[\s\S]*\bADD\s+COLUMN\b/i.test(stmt) ||
    /^CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(stmt)
  );
}

/**
 * Parse all migration .sql files (sorted) and build the cumulative EXPECTED
 * schema. Statements we can't classify (ALTER ... ADD CONSTRAINT, etc.) are
 * counted as skipped — that's expected; we only assert presence of
 * tables/columns/indexes. Any schema-DECLARING statement we fail to fully parse
 * is additionally recorded in `unparsedDdl` so the caller can warn loudly: such
 * a miss leaves the object out of the expected schema and would make the guard
 * fail open on it.
 */
export function parseMigrations(
  files: { name: string; sql: string }[],
): ParseResult {
  const schema: SchemaShape = {
    tables: new Set(),
    columns: new Set(),
    indexes: new Set(),
  };
  let skipped = 0;
  const unparsedDdl: string[] = [];

  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  for (const file of sorted) {
    for (const stmt of splitStatements(file.sql)) {
      if (!applyStatement(stmt, schema)) {
        skipped++;
        if (declaresSchemaObject(stmt)) {
          unparsedDdl.push(
            `${file.name}: ${stmt.slice(0, 80).replace(/\s+/g, " ")}`,
          );
        }
      }
    }
  }
  return { schema, skipped, unparsedDdl };
}

/** Read db/migrations/*.sql from disk and parse them. */
export function parseMigrationDir(dir: string): ParseResult {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((name) => ({ name, sql: readFileSync(path.join(dir, name), "utf8") }));
  return parseMigrations(files);
}

// ---------------------------------------------------------------------------
// diff (PURE)
// ---------------------------------------------------------------------------

/**
 * Compare EXPECTED (from migrations) against ACTUAL (from the DB). Drift is any
 * expected object that's absent in actual. We do NOT flag extra objects in the
 * DB — only things the migrations require but the DB lacks (the prod-behind bug).
 */
export function diff(expected: SchemaShape, actual: SchemaShape): SchemaDiff {
  const missing = (exp: Set<string>, act: Set<string>) =>
    [...exp].filter((x) => !act.has(x)).sort();
  return {
    missingTables: missing(expected.tables, actual.tables),
    missingColumns: missing(expected.columns, actual.columns),
    missingIndexes: missing(expected.indexes, actual.indexes),
  };
}

/** True if the diff reports any missing object. */
export function hasDrift(d: SchemaDiff): boolean {
  return (
    d.missingTables.length > 0 ||
    d.missingColumns.length > 0 ||
    d.missingIndexes.length > 0
  );
}

// ---------------------------------------------------------------------------
// Exit-code policy (PURE)
// ---------------------------------------------------------------------------

/**
 * Decide the process exit code.
 *   - No DATABASE_URL: skip → 0, unless --require-db → 1.
 *   - DB present: drift → 1, clean → 0.
 */
export function computeExitCode(
  d: SchemaDiff | null,
  opts: { requireDb: boolean; hasDbUrl: boolean },
): number {
  if (!opts.hasDbUrl) return opts.requireDb ? 1 : 0;
  if (!d) return 0;
  return hasDrift(d) ? 1 : 0;
}

// ---------------------------------------------------------------------------
// DB introspection (IMPURE — isolated)
// ---------------------------------------------------------------------------

/** Minimal tagged-template query interface (matches @neondatabase/serverless). */
export type SqlQuery = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]>;

/**
 * Build the ACTUAL schema from a live DB. Reads the `public` schema only,
 * matching where our migrations create everything.
 */
export async function introspectDb(sql: SqlQuery): Promise<SchemaShape> {
  const tableRows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const columnRows = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  const indexRows = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
  `;

  const tables = new Set<string>();
  for (const r of tableRows) tables.add(String(r.table_name).toLowerCase());

  const columns = new Set<string>();
  for (const r of columnRows) {
    columns.add(
      `${String(r.table_name).toLowerCase()}.${String(r.column_name).toLowerCase()}`,
    );
  }

  const indexes = new Set<string>();
  for (const r of indexRows) indexes.add(String(r.indexname).toLowerCase());

  return { tables, columns, indexes };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/**
 * Resolve db/migrations relative to this file. Lazy (not a module-level const)
 * so that importing this module under a non-file: loader (e.g. vitest) never
 * evaluates fileURLToPath at import time — only main() needs the path. Not
 * exported: under vitest this module's import.meta.url is not a file: URL, so
 * the test re-derives the dir from its OWN file location instead.
 */
function migrationsDir(): string {
  return fileURLToPath(new URL("../../db/migrations", import.meta.url));
}

function printDrift(d: SchemaDiff): void {
  console.error("✗ SCHEMA DRIFT DETECTED — the DB is BEHIND its migrations.\n");
  if (d.missingTables.length) {
    console.error(`Missing tables (${d.missingTables.length}):`);
    for (const t of d.missingTables) console.error(`  - ${t}`);
  }
  if (d.missingColumns.length) {
    console.error(`Missing columns (${d.missingColumns.length}):`);
    for (const c of d.missingColumns) console.error(`  - ${c}`);
  }
  if (d.missingIndexes.length) {
    console.error(`Missing indexes (${d.missingIndexes.length}):`);
    for (const i of d.missingIndexes) console.error(`  - ${i}`);
  }
  console.error(
    "\nApply the outstanding migrations to this DB (db/migrations/) and re-run.",
  );
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  const requireDb = argv.includes("--require-db");
  const dbUrl = process.env.DATABASE_URL ?? "";
  const hasDbUrl = dbUrl.trim().length > 0;

  const {
    schema: expected,
    skipped,
    unparsedDdl,
  } = parseMigrationDir(migrationsDir());
  console.log(
    `Parsed migrations: ${expected.tables.size} tables, ${expected.columns.size} columns, ${expected.indexes.size} indexes expected (${skipped} statements skipped/unclassified).`,
  );

  // A schema-DECLARING statement we couldn't fully parse means the expected
  // schema is incomplete — the guard would fail OPEN on that object. Surface it
  // loudly; when we actually have a DB to check, treat it as a hard failure so
  // a parser blind spot can't silently let real drift through.
  if (unparsedDdl.length > 0) {
    console.error(
      `✗ ${unparsedDdl.length} schema-declaring statement(s) could not be parsed — expected schema is INCOMPLETE:`,
    );
    for (const s of unparsedDdl) console.error(`  - ${s}`);
    console.error(
      "Extend the parser in scripts/ops/check-schema-drift.ts to cover these forms.",
    );
    if (hasDbUrl) return 1;
  }

  if (!hasDbUrl) {
    console.warn("⚠ schema-drift check SKIPPED: DATABASE_URL not set");
    if (requireDb) {
      console.error(
        "--require-db was passed but DATABASE_URL is empty — failing.",
      );
    }
    return computeExitCode(null, { requireDb, hasDbUrl });
  }

  // Connect via the repo convention: @neondatabase/serverless HTTP, tagged
  // templates — same as scripts/ingest/_pole-schema-probe.ts.
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(dbUrl) as unknown as SqlQuery;

  const actual = await introspectDb(sql);
  const d = diff(expected, actual);

  if (hasDrift(d)) {
    printDrift(d);
  } else {
    console.log(
      `✓ schema matches migrations (${expected.tables.size} tables, ${expected.columns.size} columns, ${expected.indexes.size} indexes checked)`,
    );
  }
  return computeExitCode(d, { requireDb, hasDbUrl });
}

/**
 * True only when this file is the program entrypoint (CLI), not when imported
 * by a test. Wrapped in try/catch because under a non-file: loader (vitest)
 * fileURLToPath(import.meta.url) throws — in which case we are definitionally
 * NOT the CLI, so return false.
 */
function isInvokedDirectly(): boolean {
  try {
    const entry = process.argv?.[1];
    if (!entry) return false;
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("✗ schema-drift check FAILED with an error:");
      console.error(err);
      process.exit(1);
    });
}
