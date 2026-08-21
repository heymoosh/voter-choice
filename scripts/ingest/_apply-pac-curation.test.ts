/**
 * scripts/ingest/_apply-pac-curation.test.ts
 *
 * Tests for the curation writer's validation and SET-building — the guards
 * that stand between a curator's JSON file and pac_committees.
 *
 * The sponsor-class half matters more than it looks: marking a committee
 * corporate/trade/unknown only ever BLOCKS a "$0 corporate PAC" badge, but
 * marking it labor/membership/leadership/party/non_connected can CLEAR one,
 * and no later pass will revisit a 'human' row. A typo'd class name — or a
 * clearing class written casually — would put a false absence claim in front
 * of a voter, so the vocabulary is validated against its single source of
 * truth and the clearing direction needs an explicit --allow-clearing.
 */

import { describe, it, expect } from "vitest";
import {
  rowHasWork,
  rowError,
  buildSet,
  BLOCKING_SPONSOR_CLASSES,
  describe as describeRow,
} from "./_apply-pac-curation";

/** Curator opt-in to the unrecoverable direction. */
const ALLOW_CLEARING = { allowClearing: true };

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

  it("refuses a badge-CLEARING class unless a human asked for it", () => {
    // labor/membership/leadership/party/non_connected all make
    // isPledgeCorporate() false, so writing one to a corporate SSF would hand
    // that candidate a "$0 corporate PAC" badge they have not earned — and
    // nothing downstream revisits a 'human' row, so only hand-written SQL
    // could take it back. The one-directional property was file discipline
    // before this guard; now it is enforced.
    for (const cls of [
      "labor",
      "membership",
      "leadership",
      "party",
      "non_connected",
    ]) {
      const err = rowError({
        committeeId: "C1",
        verdict: null,
        sponsorClass: cls,
      });
      expect(err).toContain("CLEAR");
      expect(err).toContain("--allow-clearing");
      // Still a valid class name — the objection is direction, not spelling.
      expect(err).not.toContain("invalid sponsorClass");
    }
  });

  it("accepts a clearing class once --allow-clearing is passed", () => {
    expect(
      rowError(
        { committeeId: "C1", verdict: null, sponsorClass: "labor" },
        ALLOW_CLEARING,
      ),
    ).toBeNull();
  });

  it("still rejects an unknown class name even with --allow-clearing", () => {
    expect(
      rowError(
        { committeeId: "C1", verdict: null, sponsorClass: "corporation" },
        ALLOW_CLEARING,
      ),
    ).toContain("invalid sponsorClass");
  });

  it("keeps the blocking vocabulary tied to the pledge scope", () => {
    // If CORPORATE_PLEDGE_CLASSES ever widens, the safe-by-default set has to
    // widen with it rather than drift into a second hand-maintained list.
    expect([...BLOCKING_SPONSOR_CLASSES].sort()).toEqual([
      "corporate",
      "trade",
      "unknown",
    ]);
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
      buildSet(
        { committeeId: "C1", verdict: null, sponsorClass: "labor" },
        ALLOW_CLEARING,
      ),
    );
    expect(text).not.toContain("status =");
  });

  it("validates rather than trusting its caller", () => {
    // buildSet is exported, so it is reachable without main()'s validation
    // loop. It used to carry a `satisfies string as PacSponsorClass` cast that
    // read like a check and asserted nothing at runtime; the guard now runs.
    expect(() =>
      buildSet({ committeeId: "C1", verdict: null, sponsorClass: "labor" }),
    ).toThrow(/--allow-clearing/u);
    expect(() =>
      buildSet({
        committeeId: "C1",
        verdict: null,
        sponsorClass: "corporatio",
      }),
    ).toThrow(/invalid sponsorClass/u);
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
