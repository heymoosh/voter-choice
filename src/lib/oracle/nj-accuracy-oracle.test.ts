/**
 * NJ ACCURACY ORACLE — the cross-pillar "definition of done" for the
 * post-upload accuracy work. Asserts the real Camden/Audubon June-2-2026 ballot
 * is rendered ACCURATELY across the three pillars (what's on my ballot ·
 * candidate analysis · voting details).
 *
 * Convention:
 *   - `it(...)`      → unit-checkable TODAY; must stay green.
 *   - `it.todo(...)` → a real gap a workstream still owns. The owning WS replaces
 *                      the `it.todo("… [WSn]")` line with a real `it(...)` (often
 *                      an integration/e2e assertion) when they land their piece.
 *
 * Ground truth lives in ./nj-ground-truth.ts — never loosen a value to pass.
 */

import { describe, it, expect } from "vitest";
import { NJ_GROUND_TRUTH, njRealExtractionFixture } from "./nj-ground-truth";
import { extractionToRaces } from "../extractionToRaces";
import { getStateRule } from "../state-rules/lookup";
import { getStateData } from "../getStateData";
import { getVoterIdRule } from "../voter-id-rules";
import { toBallotLogistics } from "../civic-logistics";
import { deriveDistrictCode } from "../../prototype/realData";

const POST_PRIMARY_DATE = "2026-06-05"; // 3 days after the June-2 primary

describe("NJ accuracy oracle", () => {
  describe("ground-truth self-consistency (guards the oracle itself)", () => {
    it("R-Senate has EXACTLY 4 candidates (the dense column F1 misread)", () => {
      const rSenate = NJ_GROUND_TRUTH.repBallot.find((r) =>
        r.office.includes("Senator"),
      );
      expect(rSenate?.candidates).toHaveLength(4);
    });

    it("only Booker + Norcross are in our voting-record DB; everyone else is a gap", () => {
      const all = [...NJ_GROUND_TRUTH.demBallot, ...NJ_GROUND_TRUTH.repBallot];
      const inDb = all
        .flatMap((r) => r.candidates)
        .filter((c) => c.record === "in_db")
        .map((c) => c.name);
      expect(inDb.sort()).toEqual(["Cory Booker", "Donald Norcross"]);
    });
  });

  // ── Pillar 1 — what's on my ballot ───────────────────────────────────────
  describe("Pillar 1 · ballot accuracy", () => {
    it("NJ election data carries the Nov general so the address-path rolls past the primary", async () => {
      const data = await getStateData("NJ");
      expect(data).not.toBeNull();
      // After the June-2 primary, the only 'upcoming' NJ election is the general.
      const upcoming = (data?.elections ?? []).filter(
        (e) => e.date >= POST_PRIMARY_DATE,
      );
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0]?.type).toBe("general");
      expect(upcoming[0]?.date).toBe("2026-11-03");
    });

    it("gate rule: NJ general → NO gate; NJ primary → semi-closed gate fires", () => {
      expect(getStateRule("NJ", "general")).toBeNull();
      const primaryRule = getStateRule("NJ", "primary");
      expect(primaryRule).not.toBeNull();
      expect(primaryRule?.category).toBe("semi-closed");
    });

    it("party filter — DEM voter sees only Democratic races, no Republican leakage", () => {
      const races = extractionToRaces(njRealExtractionFixture(), "DEM-primary");
      const names = races.flatMap((r) => r.candidates.map((c) => c.name));
      // Every real D candidate present:
      for (const c of NJ_GROUND_TRUTH.demBallot.flatMap((r) => r.candidates)) {
        expect(names).toContain(c.name);
      }
      // Zero R leakage:
      for (const c of NJ_GROUND_TRUTH.repBallot.flatMap((r) => r.candidates)) {
        expect(names).not.toContain(c.name);
      }
    });

    it("party filter — REP voter sees the full 4-candidate Senate race, no Democratic leakage", () => {
      const races = extractionToRaces(njRealExtractionFixture(), "REP-primary");
      const senate = races.find((r) => /Senate|Senator/i.test(r.label));
      expect(senate?.candidates).toHaveLength(4);
      const names = races.flatMap((r) => r.candidates.map((c) => c.name));
      expect(names).toContain("Damon Galdo");
      expect(names).toContain("Robert Stone");
      expect(names).not.toContain("Cory Booker");
      expect(names).not.toContain("Donald Norcross");
    });

    // The "exactly 3 races (empty county-committee dropped)" behaviour lives in
    // the seam's filterRacesByParty (realData.ts) → verified in Phase B e2e.
    it.todo(
      "[Phase B] DEM ballot renders exactly 3 scored races (empty no-petition committee dropped)",
    );
    it.todo(
      "[WS1 A3/A4] real PDF extraction of the R-Senate dense column returns the 4 ground-truth names (Textract) or flags low confidence",
    );
  });

  // ── Pillar 2 — candidate analysis ────────────────────────────────────────
  describe("Pillar 2 · candidate analysis", () => {
    it.todo(
      "[WS2 integration] Booker (Senate) + Norcross (House NJ-01) resolve to real voting-record alignment (sourceType:'voting_record')",
    );
    it.todo(
      "[WS2 B1] every no-record candidate (4 R-Senate, Galdo, all commissioners) gets position-based analysis labeled sourceType:'web_search'",
    );
    it.todo(
      "[WS2 B3] no candidate renders a blank analysis card when a sibling candidate has one",
    );
  });

  // ── Pillar 3 — voting details / logistics ────────────────────────────────
  describe("Pillar 3 · voting details", () => {
    it("voter-ID: NJ requires no document for most in-person voters", () => {
      expect(getVoterIdRule("NJ")?.required).toBe(false);
    });

    // [Phase B] Flipped: deriveDistrictCode extracts the CD number from the
    // ballot extraction's House race label and formats it as "NJ-01".
    it(
      "[WS3 C1] logistics block shows congressional district NJ-01 from the ballot extraction's House race label, not '—'",
      () => {
        // The ballot extraction's House race label after deriveRaces is e.g.
        // "U.S. House — CD-1" or "U.S. House of Representatives — District 1"
        // deriveDistrictCode strips the prefix, extracts the digit, and formats.
        expect(deriveDistrictCode("U.S. House — CD-1", "NJ")).toBe("NJ-01");
        expect(deriveDistrictCode("U.S. House of Representatives — District 1", "NJ")).toBe("NJ-01");
        expect(deriveDistrictCode("House — CD-01", "NJ")).toBe("NJ-01");
        // Must match the ground-truth congressional district.
        expect(deriveDistrictCode("U.S. House — CD-1", "NJ")).toBe(
          NJ_GROUND_TRUTH.meta.congressionalDistrict,
        );
      },
    );

    // [Phase B] Flipped: toBallotLogistics on an empty civic response (no
    // contests, no pollingLocations — the NJ no-contest case after the primary)
    // returns null pollingPlace and the honest vote.gov fallback URL.
    it(
      "[WS3 C1] polling place is null + vote.gov fallback when civic returns no location (never the TX mock)",
      () => {
        const emptyResponse = {
          pollingLocations: [],
          earlyVoteSites: [],
          contests: [],
        };
        const logistics = toBallotLogistics(emptyResponse);
        expect(logistics.pollingPlace).toBeNull();
        expect(logistics.congressionalDistrict).toBeNull();
        expect(logistics.fallbackUrl).toBe("https://vote.gov/");
        expect(logistics.source).toBe("fallback");
        // Honesty: none of the forbidden TX strings appear in the logistics.
        const logisticsStr = JSON.stringify(logistics);
        for (const forbidden of NJ_GROUND_TRUTH.forbiddenForNj) {
          expect(logisticsStr).not.toContain(forbidden);
        }
      },
    );

    // [WS3 C3 / Phase B] The zero-forbidden-strings check requires rendering
    // the full React component tree and inspecting the DOM — not unit-testable.
    // This is verified in the Phase B E2E drive (Playwright, dev :3000).
    // The unit-testable part: confirmed that all seam constants in data.tsx and
    // VoterChoiceApp.tsx have been neutralized (TX/Harris/Houston/handgun removed
    // from POLLING_INFO, STATE_ELECTION_DATA, i18n strings, dev links,
    // NoContestedView defaults, GeocodeFailView tips, handoff prompt).
    it.todo(
      "[WS3 C3 / Phase B] rendered workspace + print contain ZERO forbidden TX/Harris strings for an NJ voter (E2E / Playwright only)",
    );
  });
});
