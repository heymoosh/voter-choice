/**
 * scripts/ingest/_apply-pac-curation.test.ts
 *
 * Tests for the curation writer's validation and SET-building — the guards
 * that stand between a curator's JSON file and pac_committees.
 *
 * The sponsor-class half matters more than it looks: marking a committee
 * corporate/trade only ever BLOCKS a "$0 corporate PAC" badge, but marking it
 * labor/membership/non_connected can CLEAR one. A typo'd class name silently
 * written through would put a false absence claim in front of a voter, so the
 * vocabulary is validated against its single source of truth rather than
 * trusted from the file.
 */

import { describe, it, expect } from "vitest";
import {
  rowHasWork,
  rowError,
  buildSet,
  describe as describeRow,
} from "./_apply-pac-curation";

/** Render a drizzle SET fragment list down to comparable text. */
function setText(sets: ReturnType<typeof buildSet>): string {
  return JSON.stringify(sets);
}

describe("rowHasWork", () => {
  it("skips a row that asks for nothing", () => {
    expect(rowHasWork({ committeeId: "C1", verdict: null })).toBe(false);
  });

  it("picks up a status-only row", () => {
    expect(rowHasWork({ committeeId: "C1", verdict: "verified" })).toBe(true);
  });

  it("picks up a sponsor-class-only row", () => {
    // Classifying who is behind a committee and ratifying its filed display
    // claim are separate judgements; a curator asked for one must not be
    // forced to deliver the other.
    expect(
      rowHasWork({
        committeeId: "C1",
        verdict: null,
        sponsorClass: "corporate",
      }),
    ).toBe(true);
  });

  it("treats a blank sponsorClass as no work", () => {
    expect(
      rowHasWork({ committeeId: "C1", verdict: null, sponsorClass: "   " }),
    ).toBe(false);
  });
});

describe("rowError", () => {
  it("accepts a sponsor class with no status verdict", () => {
    expect(
      rowError({ committeeId: "C1", verdict: null, sponsorClass: "trade" }),
    ).toBeNull();
  });

  it("rejects a sponsor class outside the vocabulary", () => {
    const err = rowError({
      committeeId: "C1",
      verdict: null,
      sponsorClass: "corporation",
    });
    expect(err).toContain("invalid sponsorClass");
    expect(err).toContain("corporate");
  });

  it("still rejects an invalid status verdict", () => {
    expect(rowError({ committeeId: "C1", verdict: "maybe" })).toContain(
      "invalid verdict",
    );
  });

  it("still refuses a summary with no citation", () => {
    expect(
      rowError({
        committeeId: "C1",
        verdict: "verified",
        summary: "A trade group for radiologists.",
      }),
    ).toContain("sourceUrl");
  });

  it("accepts unknown as an explicit class", () => {
    // "We looked and still cannot tell" is a real verdict worth recording —
    // it stops the committee coming back in every future queue export.
    expect(
      rowError({ committeeId: "C1", verdict: null, sponsorClass: "unknown" }),
    ).toBeNull();
  });
});

describe("buildSet", () => {
  it("writes sponsor_class with method 'human'", () => {
    // 'human' is the one value federal-pac-sponsors.ts refuses to overwrite,
    // so a curated class has to survive every later re-run of the ingest.
    const text = setText(
      buildSet({ committeeId: "C1", verdict: null, sponsorClass: "corporate" }),
    );
    expect(text).toContain("sponsor_class");
    expect(text).toContain("human");
  });

  it("leaves status untouched on a sponsor-class-only row", () => {
    const text = setText(
      buildSet({ committeeId: "C1", verdict: null, sponsorClass: "labor" }),
    );
    expect(text).not.toContain("status =");
  });

  it("leaves sponsor_class untouched on a status-only row", () => {
    const text = setText(buildSet({ committeeId: "C1", verdict: "rejected" }));
    expect(text).not.toContain("sponsor_class");
  });
});

describe("describe", () => {
  it("reports a sponsor-class change without inventing a status change", () => {
    const line = describeRow(
      { committeeId: "C1", verdict: null, sponsorClass: "trade" },
      "auto",
    );
    expect(line).toContain("sponsor_class -> trade");
    expect(line).not.toContain("auto ->");
  });
});
