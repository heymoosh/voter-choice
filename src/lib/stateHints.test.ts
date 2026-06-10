import { describe, it, expect } from "vitest";
import { stateHintsFromAddress, STATE_HINT_NAMES } from "./stateHints";

describe("stateHintsFromAddress", () => {
  it("covers all 50 states + DC in the name table", () => {
    expect(Object.keys(STATE_HINT_NAMES)).toHaveLength(51);
  });

  it.each(Object.entries(STATE_HINT_NAMES))(
    "matches a trailing comma code for %s",
    (code, name) => {
      expect(
        stateHintsFromAddress(`123 Main St, Springfield, ${code}`),
      ).toContain(name);
    },
  );

  it.each(Object.entries(STATE_HINT_NAMES))(
    "matches the full state name for %s",
    (_code, name) => {
      expect(stateHintsFromAddress(`123 Main St, ${name}`)).toContain(name);
    },
  );

  it("resolves a state from the ZIP code alone", () => {
    expect(stateHintsFromAddress("123 Main St 78701")).toContain("Texas");
    expect(stateHintsFromAddress("1 Beacon St 02108")).toContain(
      "Massachusetts",
    );
  });

  it("matches a code immediately before the ZIP", () => {
    expect(
      stateHintsFromAddress("100 Congress Ave, Austin, TX 78701"),
    ).toContain("Texas");
    expect(stateHintsFromAddress("1 Main St, Cheyenne, wy 82001")).toContain(
      "Wyoming",
    );
  });

  it("does NOT false-positive on street directionals", () => {
    // "NE" here is a directional, not Nebraska — there is no NE-positioned
    // code and the ZIP is Oregon.
    const hints = stateHintsFromAddress("100 NE 5th Ave, Portland, OR 97232");
    expect(hints).toContain("Oregon");
    expect(hints).not.toContain("Nebraska");
  });

  it("never reads West Virginia as Virginia", () => {
    const hints = stateHintsFromAddress(
      "12 Coal Rd, Charleston, West Virginia",
    );
    expect(hints).toContain("West Virginia");
    expect(hints).not.toContain("Virginia");
  });

  it("never reads Arkansas as Kansas", () => {
    const hints = stateHintsFromAddress("12 Rock Rd, Little Rock, Arkansas");
    expect(hints).toContain("Arkansas");
    expect(hints).not.toContain("Kansas");
  });

  it("returns border-ZIP ambiguity as multiple hints", () => {
    // 86515 spans the AZ/NM border (lookupZip override).
    const hints = stateHintsFromAddress("1 Border Rd 86515");
    expect(hints).toEqual(expect.arrayContaining(["Arizona", "New Mexico"]));
  });

  it("returns [] for an address with no state signal", () => {
    expect(stateHintsFromAddress("123 Main Street, Springfield")).toEqual([]);
  });
});
