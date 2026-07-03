/**
 * Tests for scripts/ops/check-schema-drift.ts
 *
 * PURE only — no DB, no network. The parser test runs against the REAL
 * db/migrations/*.sql so it stays honest about what the migrations actually
 * declare (this is the regression guard for the 2026-06-26 prod-behind bug:
 * voter_issue_events / sub_issue were silently missing on prod).
 */

import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseMigrations,
  parseMigrationDir,
  splitStatements,
  diff,
  computeExitCode,
  type SchemaShape,
} from "./check-schema-drift";

// NOTE: resolve the migrations dir from the TEST file's own location, not via
// the exported migrationsDir(). Under vitest the source module's
// import.meta.url is not a file: URL, so calling migrationsDir() at load time
// throws "URL must be of scheme file" — the path is duplicated here on purpose.
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

/** Deep-clone a SchemaShape so a test can mutate it without bleeding. */
function cloneShape(s: SchemaShape): SchemaShape {
  return {
    tables: new Set(s.tables),
    columns: new Set(s.columns),
    indexes: new Set(s.indexes),
  };
}

const EMPTY: SchemaShape = {
  tables: new Set(),
  columns: new Set(),
  indexes: new Set(),
};

describe("parseMigrations (against real db/migrations)", () => {
  const { schema: expected, skipped } = parseMigrationDir(MIGRATIONS_DIR);

  it("includes the table that silently vanished from prod", () => {
    expect(expected.tables.has("voter_issue_events")).toBe(true);
  });

  it("includes the sub_issue columns added in 0006", () => {
    expect(expected.columns.has("voter_issue_events.sub_issue")).toBe(true);
    expect(expected.columns.has("issue_tags.sub_issue")).toBe(true);
  });

  it("includes the sub_issue index added in 0006", () => {
    expect(expected.indexes.has("voter_issue_events_sub_issue_idx")).toBe(true);
  });

  it("captures columns declared inside a CREATE TABLE body", () => {
    // From 0000_first_crystal.sql — proves table-body column extraction works.
    expect(expected.columns.has("bills.id")).toBe(true);
    expect(expected.columns.has("issue_tags.canonical_issue")).toBe(true);
  });

  it("parses a non-trivial number of objects (sanity)", () => {
    expect(expected.tables.size).toBeGreaterThan(5);
    expect(expected.columns.size).toBeGreaterThan(20);
    expect(expected.indexes.size).toBeGreaterThan(5);
    // Some constraint/ALTER statements are legitimately unclassified.
    expect(skipped).toBeGreaterThanOrEqual(0);
  });

  it("flags no unparsed schema-declaring DDL in the real migrations", () => {
    // The current corpus is all double-quoted, non-schema-qualified DDL the
    // parser fully understands. If a future migration uses a form the parser
    // can't read, unparsedDdl must catch it (see the synthetic test below).
    const { unparsedDdl } = parseMigrationDir(MIGRATIONS_DIR);
    expect(unparsedDdl).toEqual([]);
  });
});

describe("unparsedDdl (fail-open guard against parser blind spots)", () => {
  it("records a schema-declaring statement the parser can't fully read", () => {
    // Schema-qualified table name — recognised as a CREATE TABLE by keyword but
    // NOT captured by applyStatement, so it would otherwise be silently absent
    // from the expected schema (the guard would fail open on `foo`).
    const { schema, unparsedDdl } = parseMigrations([
      { name: "9999_x.sql", sql: `CREATE TABLE "public"."foo" ("id" text);` },
    ]);
    expect(schema.tables.has("foo")).toBe(false);
    expect(unparsedDdl.length).toBe(1);
    expect(unparsedDdl[0]).toContain("9999_x.sql");
  });

  it("does NOT record benign non-asserted statements (ADD CONSTRAINT)", () => {
    const { unparsedDdl } = parseMigrations([
      {
        name: "9999_y.sql",
        sql: `ALTER TABLE "votes" ADD CONSTRAINT "votes_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id");`,
      },
    ]);
    expect(unparsedDdl).toEqual([]);
  });
});

describe("splitStatements (regression: `;` inside a `--` comment)", () => {
  // 2026-06: 0012_add_polis_response_vectors.sql had a CREATE TABLE body
  // comment containing a `;`. Because splitStatements used to split on `;`
  // BEFORE stripping comments, that `;` fragmented the statement mid-body,
  // which tripped the unparsed-DDL guard (worked around at the time by
  // rewriting the migration's prose). This is the regression test for the
  // real fix: strip comments FIRST, then split.
  const sql = `
CREATE TABLE "widgets" (
  "id" text NOT NULL,
  -- note: default is 5; see docs for details
  "name" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "widgets_name_idx" ON "widgets" ("name");
`;

  it("parses the CREATE TABLE as ONE complete statement, not fragmented", () => {
    const statements = splitStatements(sql);
    const createTable = statements.find((s) => /^CREATE\s+TABLE\b/i.test(s));
    expect(createTable).toBeDefined();
    // A complete statement contains BOTH columns and closes its own paren —
    // pre-fix, the `;` inside the comment splits this into two dangling
    // fragments (`...NOT NULL,\n  -- note: default is 5` and `see docs...`),
    // neither of which is a parseable CREATE TABLE on its own.
    expect(createTable).toContain('"id" text NOT NULL');
    expect(createTable).toContain('"name" text NOT NULL');
    expect(createTable!.trim().endsWith(")")).toBe(true);
  });

  it("still splits the following statement on the `--> statement-breakpoint` marker", () => {
    const statements = splitStatements(sql);
    expect(statements.some((s) => /^CREATE\s+INDEX\b/i.test(s))).toBe(true);
  });

  it("end-to-end: the table + both columns parse, and the guard does NOT trip", () => {
    const { schema, unparsedDdl } = parseMigrations([
      { name: "9999_widgets.sql", sql },
    ]);
    expect(schema.tables.has("widgets")).toBe(true);
    expect(schema.columns.has("widgets.id")).toBe(true);
    expect(schema.columns.has("widgets.name")).toBe(true);
    expect(schema.indexes.has("widgets_name_idx")).toBe(true);
    expect(unparsedDdl).toEqual([]);
  });

  it("does not corrupt the `--> statement-breakpoint` marker itself", () => {
    // Sanity check on the reorder: comments are stripped BEFORE the
    // breakpoint split, so stripSqlComments must not treat `-->` as a `--`
    // line comment (it would erase the marker and merge statements).
    const statements = splitStatements(sql);
    expect(statements.length).toBe(2);
  });
});

describe("diff", () => {
  const { schema: expected } = parseMigrationDir(MIGRATIONS_DIR);

  it("reports drift when the DB is missing the table + sub_issue column", () => {
    // Simulate the prod-behind state: actual = expected minus the 0005/0006 bits.
    const actual = cloneShape(expected);
    actual.tables.delete("voter_issue_events");
    actual.columns.delete("voter_issue_events.sub_issue");
    actual.columns.delete("issue_tags.sub_issue");
    actual.indexes.delete("voter_issue_events_sub_issue_idx");

    const d = diff(expected, actual);

    expect(d.missingTables).toContain("voter_issue_events");
    expect(d.missingColumns).toContain("voter_issue_events.sub_issue");
    expect(d.missingColumns).toContain("issue_tags.sub_issue");
    expect(d.missingIndexes).toContain("voter_issue_events_sub_issue_idx");
  });

  it("reports no drift when actual === expected", () => {
    const d = diff(expected, cloneShape(expected));
    expect(d.missingTables).toEqual([]);
    expect(d.missingColumns).toEqual([]);
    expect(d.missingIndexes).toEqual([]);
  });
});

describe("computeExitCode", () => {
  const clean = { missingTables: [], missingColumns: [], missingIndexes: [] };
  const drifted = {
    missingTables: ["voter_issue_events"],
    missingColumns: [],
    missingIndexes: [],
  };

  it("returns 1 on drift", () => {
    expect(computeExitCode(drifted, { requireDb: false, hasDbUrl: true })).toBe(
      1,
    );
  });

  it("returns 0 on clean", () => {
    expect(computeExitCode(clean, { requireDb: false, hasDbUrl: true })).toBe(
      0,
    );
  });

  it("returns 0 when DATABASE_URL absent and not required (safe skip)", () => {
    expect(computeExitCode(null, { requireDb: false, hasDbUrl: false })).toBe(
      0,
    );
  });

  it("returns 1 when DATABASE_URL absent but --require-db is set", () => {
    expect(computeExitCode(null, { requireDb: true, hasDbUrl: false })).toBe(1);
  });
});

describe("diff with an empty DB (nothing applied)", () => {
  const { schema: expected } = parseMigrationDir(MIGRATIONS_DIR);
  it("flags every expected object as missing", () => {
    const d = diff(expected, EMPTY);
    expect(d.missingTables.length).toBe(expected.tables.size);
    expect(d.missingColumns.length).toBe(expected.columns.size);
    expect(d.missingIndexes.length).toBe(expected.indexes.size);
  });
});
