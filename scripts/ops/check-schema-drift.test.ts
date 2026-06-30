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
  parseMigrationDir,
  diff,
  computeExitCode,
  type SchemaShape,
} from "./check-schema-drift";

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
