import { describe, it, expect } from "vitest";
import { getPartyMeta2, getRatingLabels } from "./RepCard";

describe("getPartyMeta2", () => {
  it("renders party names through t(), not hardcoded English", () => {
    const t = (key: string) =>
      ({
        "repCard.partyRepublican": "Republicano",
        "repCard.partyDemocrat": "Demócrata",
        "repCard.partyIndependent": "Independiente",
      })[key] ?? key;

    const meta = getPartyMeta2(t);
    expect(meta.Republican.name).toBe("Republicano");
    expect(meta.Democrat.name).toBe("Demócrata");
    expect(meta.Independent.name).toBe("Independiente");
  });

  it("keeps the code/pipClass fields stable regardless of t()", () => {
    const t = (key: string) => key;
    const meta = getPartyMeta2(t);
    expect(meta.Republican).toMatchObject({ code: "R", pipClass: "rep" });
    expect(meta.Democrat).toMatchObject({ code: "D", pipClass: "dem" });
    expect(meta.Independent).toMatchObject({ code: "I", pipClass: "ind" });
  });
});

describe("getRatingLabels", () => {
  it("renders CAN2026 race-rating labels through t(), not hardcoded English", () => {
    const t = (key: string) =>
      ({
        "repCard.canRatingTossUp": "Empate",
        "repCard.canRatingLeanD": "Favorece D",
        "repCard.canRatingLeanR": "Favorece R",
        "repCard.canRatingLikelyD": "Probable D",
        "repCard.canRatingLikelyR": "Probable R",
        "repCard.canRatingSafeD": "Segura D",
        "repCard.canRatingSafeR": "Segura R",
      })[key] ?? key;

    const labels = getRatingLabels(t);
    expect(labels.toss_up).toBe("Empate");
    expect(labels.lean_d).toBe("Favorece D");
    expect(labels.lean_r).toBe("Favorece R");
    expect(labels.likely_d).toBe("Probable D");
    expect(labels.likely_r).toBe("Probable R");
    expect(labels.safe_d).toBe("Segura D");
    expect(labels.safe_r).toBe("Segura R");
  });
});
