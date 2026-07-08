import { describe, it, expect } from "vitest";
import { getPartyMeta2 } from "./RepCard";

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
