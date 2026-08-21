/**
 * scripts/ingest/pac-sponsor-class-seed.test.ts
 *
 * Guards the SHIPPED curation seed, not a fixture.
 *
 * data/pac-sponsor-class-2026-08.json is 38 hand classifications that get
 * written with sponsor_class_method='human' — the one value the bulk ingest is
 * forbidden to recompute. Its safety rests on a property no reviewer can see
 * from a diff of a later PR: every row moves in the BLOCKING direction, so the
 * worst a mistake can do is withhold a "$0 corporate PAC" badge. One appended
 * row saying `"sponsorClass": "non_connected"` would invert that for one
 * committee, permanently, and CI would have stayed green. This asserts the
 * property over the real file so appending a clearing row turns CI red.
 *
 * Note on provenance: the seed's "note" and "evidenceUrl" keys are read by
 * nothing — see the WHERE THE EVIDENCE LIVES block in _apply-pac-curation.ts.
 * The evidence behind each classification lives in git by decision, because
 * curated_summary is rendered to readers and this repo is under a design
 * freeze. This test therefore checks the keys that DO get written.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { rowError, buildSet } from "./_apply-pac-curation";

const SEED_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data",
  "pac-sponsor-class-2026-08.json",
);

interface SeedRow {
  committeeId: string;
  verdict: string | null;
  sponsorClass?: string | null;
  sector?: string | null;
  summary?: string | null;
  sourceUrl?: string | null;
}

const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8")) as SeedRow[];

describe("shipped sponsor-class seed", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(seed)).toBe(true);
    expect(seed.length).toBeGreaterThan(0);
  });

  it("passes the applier's own validation in strict mode", () => {
    // Strict mode is the default — no --allow-clearing. A row the applier
    // would refuse must not be sitting in the repo waiting to be applied.
    for (const row of seed) {
      expect(`${row.committeeId}: ${rowError(row)}`).toBe(
        `${row.committeeId}: null`,
      );
    }
  });

  it("only ever blocks a badge, never clears one", () => {
    for (const row of seed) {
      expect([row.committeeId, row.sponsorClass]).toEqual([
        row.committeeId,
        expect.stringMatching(/^(corporate|trade)$/u),
      ]);
    }
  });

  it("cannot flip any committee's status", () => {
    // Sponsor class and the sector/sponsor display verdict are separate
    // judgements. This file was curated for the first; silently ratifying the
    // second would put a display claim in front of readers that nobody
    // reviewed.
    for (const row of seed) {
      expect(row.verdict).toBeNull();
      expect(JSON.stringify(buildSet(row))).not.toContain("status =");
    }
  });

  it("carries well-formed, unique FEC committee ids", () => {
    for (const row of seed) {
      expect(row.committeeId).toMatch(/^C\d{8}$/u);
    }
    const ids = seed.map((r) => r.committeeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("writes no curated display copy", () => {
    // summary/sourceUrl land in curated_summary/curated_source_url, which
    // src/lib/server/pac-sponsors.ts renders. Nothing in this pass was
    // reviewed as reader-facing copy, so nothing here may become it.
    for (const row of seed) {
      expect([row.summary, row.sourceUrl, row.sector]).toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    }
  });
});
