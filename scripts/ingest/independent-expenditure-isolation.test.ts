/**
 * scripts/ingest/independent-expenditure-isolation.test.ts
 *
 * The legally load-bearing guarantee of Part 6b, enforced rather than
 * documented (plan doc Open Risk #7: "Summing or visually mingling
 * independent expenditures with candidate receipts would misstate
 * campaign-finance law. The 'outside spending' separation is a correctness
 * requirement, enforced by test.").
 *
 * Two rules, both checked structurally so a future change trips the test
 * rather than shipping a wrong number:
 *
 *   1. IE amounts never enter donor_aggregates / funding-mix math. The IE
 *      ingest does not touch donor_aggregates, and no funding-mix producer or
 *      read path references the independent_expenditures table.
 *   2. Support and oppose are never summed into one figure. They are separate
 *      rows keyed apart by the table's unique constraint, and the ingest never
 *      adds one to the other.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { FUNDING_MIX_BUCKET_LABELS } from "./_fec-bulk";
import {
  SUPPORT_OPPOSE_VALUES,
  aggregateIeRows,
  buildIeRows,
  type IeExpenditureRow,
} from "./federal-independent-expenditures";

const REPO_ROOT = process.cwd();

const IE_INGEST = resolve(
  REPO_ROOT,
  "scripts/ingest/federal-independent-expenditures.ts",
);
const IE_MIGRATION = resolve(
  REPO_ROOT,
  "db/migrations/0023_add_independent_expenditures.sql",
);

/**
 * Every module that produces or reads funding-mix money. None of them may
 * learn about independent expenditures.
 */
const FUNDING_MIX_MODULES = [
  "scripts/ingest/federal-donors.ts",
  "scripts/ingest/federal-sectors-bulk.ts",
  "scripts/ingest/federal-issue-pacs.ts",
  "scripts/ingest/federal-pac-sponsors.ts",
  "scripts/ingest/_fec-bulk.ts",
  "scripts/ingest/_bucket-mapping.ts",
  "src/lib/server/donors.ts",
  "src/lib/server/race-data.ts",
];

/**
 * The only files allowed to reference the IE table or ingest module: the
 * ingest itself, its tests, and the schema/migration that define the table.
 * Anything else means outside spending has leaked into another surface —
 * which, on a funding surface, is the misstatement the plan forbids.
 */
const ALLOWED_REFERENCE_FILES = new Set([
  "scripts/ingest/federal-independent-expenditures.ts",
  "scripts/ingest/federal-independent-expenditures.test.ts",
  "scripts/ingest/independent-expenditure-isolation.test.ts",
  "db/schema.ts",
]);

/** Usage of the table/module — identifiers and imports, not prose mentions. */
const IE_USAGE_PATTERNS: readonly RegExp[] = [
  /independentExpenditures/u,
  /independent_expenditures/u,
  /from\s+["'][^"']*federal-independent-expenditures["']/u,
];

const SCANNED_ROOTS = ["src", "scripts", "db"];
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "coverage",
  "migrations",
  "fixtures",
  "_gold-batches",
]);

function collectTypeScriptFiles(
  directory: string,
  found: string[] = [],
): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      collectTypeScriptFiles(join(directory, entry.name), found);
    } else if (/\.tsx?$/u.test(entry.name)) {
      found.push(join(directory, entry.name));
    }
  }
  return found;
}

function repoTypeScriptFiles(): string[] {
  return SCANNED_ROOTS.flatMap((root) =>
    collectTypeScriptFiles(resolve(REPO_ROOT, root)),
  );
}

/**
 * Strip comments so the ingest's own prose — which necessarily names
 * donor_aggregates and the "PACs" bucket to explain what it must never touch —
 * is not mistaken for a reference. Applied only to the IE ingest's
 * self-checks; the cross-module checks read raw source, since the identifiers
 * they look for never appear in those modules' prose.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//u.test(line))
    .join("\n");
}

function ieRow(overrides: Partial<IeExpenditureRow> = {}): IeExpenditureRow {
  return {
    candidateFecId: "H0TX01000",
    spenderCommitteeId: "C00100001",
    spenderName: "AN OUTSIDE GROUP",
    amount: 1000,
    supportOppose: "support",
    fileNumber: null,
    previousFileNumber: null,
    ...overrides,
  };
}

describe("independent expenditures never enter funding-mix math", () => {
  it("the IE ingest never writes donor_aggregates", () => {
    const source = codeOnly(readFileSync(IE_INGEST, "utf8"));
    expect(source).not.toMatch(/donorAggregates/u);
    expect(source).not.toMatch(/donor_aggregates/u);
    expect(source).not.toMatch(/upsertDonorAggregateRows/u);
  });

  it("the IE ingest emits no funding-mix bucket label", () => {
    const source = codeOnly(readFileSync(IE_INGEST, "utf8"));
    for (const label of FUNDING_MIX_BUCKET_LABELS) {
      expect(source).not.toContain(label);
    }
  });

  it("no funding-mix producer or read path references the IE table", () => {
    for (const modulePath of FUNDING_MIX_MODULES) {
      const source = readFileSync(resolve(REPO_ROOT, modulePath), "utf8");
      for (const pattern of IE_USAGE_PATTERNS) {
        expect(
          pattern.test(source),
          `${modulePath} must not reference independent expenditures`,
        ).toBe(false);
      }
    }
  });

  it("nothing outside the ingest, its tests and the schema references the IE table", () => {
    const offenders = repoTypeScriptFiles()
      .map((file) => relative(REPO_ROOT, file).split(sep).join("/"))
      .filter((file) => !ALLOWED_REFERENCE_FILES.has(file))
      .filter((file) => {
        const source = readFileSync(resolve(REPO_ROOT, file), "utf8");
        return IE_USAGE_PATTERNS.some((pattern) => pattern.test(source));
      });
    expect(offenders).toEqual([]);
  });

  it("the funding-mix bucket vocabulary gains no outside-spending bucket", () => {
    expect([...FUNDING_MIX_BUCKET_LABELS]).toEqual([
      "Small individual donors (under $200)",
      "Large individual donors ($200+)",
      "PACs",
    ]);
  });

  it("IE rows carry no bucket_label field that could reach the mix", () => {
    const result = aggregateIeRows(
      [ieRow()],
      new Map([["H0TX01000", "fec-H0TX01000"]]),
    );
    const rows = buildIeRows(
      result.pairs,
      "2026",
      "https://example.com/ie.csv",
    );
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual([
      "amountTotal",
      "candidateId",
      "committeeId",
      "electionCycle",
      "expenditureCount",
      "source",
      "sourceUrl",
      "supportOppose",
    ]);
  });
});

describe("support and oppose are never summed into one number", () => {
  it("there are exactly two directions and they aggregate apart", () => {
    expect([...SUPPORT_OPPOSE_VALUES]).toEqual(["support", "oppose"]);
    const result = aggregateIeRows(
      [
        ieRow({ amount: 7000, supportOppose: "support" }),
        ieRow({ amount: 2500, supportOppose: "oppose" }),
      ],
      new Map([["H0TX01000", "fec-H0TX01000"]]),
    );
    const rows = buildIeRows(
      result.pairs,
      "2026",
      "https://example.com/ie.csv",
    );
    expect(rows.map((r) => [r.supportOppose, r.amountTotal])).toEqual([
      ["oppose", "2500.00"],
      ["support", "7000.00"],
    ]);
    // Neither the sum (9500) nor the net (4500) exists anywhere.
    expect(rows.map((r) => r.amountTotal)).not.toContain("9500.00");
    expect(rows.map((r) => r.amountTotal)).not.toContain("4500.00");
  });

  it("the table's unique key keeps the two directions apart forever", () => {
    const migration = readFileSync(IE_MIGRATION, "utf8");
    expect(migration).toMatch(
      /UNIQUE \("committee_id", "candidate_id", "election_cycle", "support_oppose"\)/u,
    );
    const schema = readFileSync(resolve(REPO_ROOT, "db/schema.ts"), "utf8");
    expect(schema).toMatch(/unique\("independent_expenditures_uidx"\)/u);
  });

  it("the ingest never adds a support amount to an oppose amount", () => {
    const source = codeOnly(readFileSync(IE_INGEST, "utf8"));
    expect(source).not.toMatch(/supportAmount\s*\+/u);
    expect(source).not.toMatch(/\+\s*opposeAmount/u);
    expect(source).not.toMatch(/support\w*\s*\+\s*oppose\w*/iu);
  });
});
