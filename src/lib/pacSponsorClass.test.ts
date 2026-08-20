import { describe, expect, it } from "vitest";
import {
  CORPORATE_PLEDGE_CLASSES,
  classifyPacSponsor,
  isPledgeCorporate,
  type PacSponsorFilingFields,
} from "./pacSponsorClass";

const filing = (
  overrides: Partial<PacSponsorFilingFields>,
): PacSponsorFilingFields => ({
  orgType: null,
  designation: null,
  committeeType: null,
  connectedOrg: null,
  ...overrides,
});

describe("classifyPacSponsor", () => {
  it("takes the committee's own ORG_TP over every other signal", () => {
    // A corporate SSF that also files as a leadership-style designation is
    // still corporate — the declared org type wins.
    expect(
      classifyPacSponsor(filing({ orgType: "C", designation: "D" })),
    ).toEqual({ sponsorClass: "corporate", method: "org-type-v1" });
    expect(classifyPacSponsor(filing({ orgType: "W" })).sponsorClass).toBe(
      "corporate",
    );
    expect(classifyPacSponsor(filing({ orgType: "T" })).sponsorClass).toBe(
      "trade",
    );
    expect(classifyPacSponsor(filing({ orgType: "V" })).sponsorClass).toBe(
      "trade",
    );
    expect(classifyPacSponsor(filing({ orgType: "L" })).sponsorClass).toBe(
      "labor",
    );
    expect(classifyPacSponsor(filing({ orgType: "M" })).sponsorClass).toBe(
      "membership",
    );
  });

  it("normalises case and whitespace in filed values", () => {
    expect(classifyPacSponsor(filing({ orgType: " c " })).sponsorClass).toBe(
      "corporate",
    );
    expect(
      classifyPacSponsor(filing({ designation: " d ", committeeType: "q" }))
        .sponsorClass,
    ).toBe("leadership");
  });

  it("classifies leadership PACs from the designation when ORG_TP is blank", () => {
    expect(
      classifyPacSponsor(
        filing({
          designation: "D",
          committeeType: "Q",
          connectedOrg: "SCALISE LEADERSHIP FUND",
        }),
      ),
    ).toEqual({ sponsorClass: "leadership", method: "designation-v1" });
  });

  it("classifies party committees from the committee type", () => {
    for (const committeeType of ["X", "Y", "Z"]) {
      expect(classifyPacSponsor(filing({ committeeType })).sponsorClass).toBe(
        "party",
      );
    }
  });

  it("classifies an unauthorized committee with no connected org as non-connected", () => {
    expect(
      classifyPacSponsor(filing({ designation: "U", committeeType: "Q" })),
    ).toEqual({ sponsorClass: "non_connected", method: "designation-v1" });
    expect(
      classifyPacSponsor(
        filing({ designation: "U", committeeType: "O", connectedOrg: "   " }),
      ).sponsorClass,
    ).toBe("non_connected");
  });

  it("leaves an unauthorized committee that DID name a sponsor unknown", () => {
    expect(
      classifyPacSponsor(
        filing({
          designation: "U",
          committeeType: "Q",
          connectedOrg: "PRO-CHOICE WOMEN",
        }),
      ).sponsorClass,
    ).toBe("unknown");
  });

  it("leaves registered-filer SSFs with a blank ORG_TP unknown, never non-corporate", () => {
    // Ernst & Young's and Deloitte's PACs file exactly like this on prod:
    // designation B, committee type Q, no ORG_TP, no connected org. They ARE
    // corporate PACs, so the only safe answer is `unknown` — which blocks a
    // "$0 corporate PAC" claim instead of falsifying one.
    const registeredFiler = classifyPacSponsor(
      filing({ designation: "B", committeeType: "Q" }),
    );
    expect(registeredFiler.sponsorClass).toBe("unknown");
    expect(isPledgeCorporate(registeredFiler.sponsorClass)).toBe(false);
  });

  it("returns unknown for an empty filing", () => {
    expect(classifyPacSponsor(filing({}))).toEqual({
      sponsorClass: "unknown",
      method: "unresolved-v1",
    });
  });
});

describe("isPledgeCorporate", () => {
  it("counts corporate and trade-association money under the ECU pledge scope", () => {
    expect(isPledgeCorporate("corporate")).toBe(true);
    expect(isPledgeCorporate("trade")).toBe(true);
  });

  it("does not count labor, membership, leadership, party or non-connected PACs", () => {
    for (const cls of [
      "labor",
      "membership",
      "leadership",
      "party",
      "non_connected",
    ] as const) {
      expect(isPledgeCorporate(cls)).toBe(false);
    }
  });

  it("never counts unknown as corporate — unknown blocks the claim elsewhere", () => {
    expect(isPledgeCorporate("unknown")).toBe(false);
    expect(CORPORATE_PLEDGE_CLASSES.has("unknown")).toBe(false);
  });
});
