import { describe, expect, it } from "vitest";
import { formatTallyLine } from "./rollcall-tally";

describe("formatTallyLine", () => {
  it("formats result + yea/nay as 'Passed 232–193'", () => {
    expect(formatTallyLine("Passed", 232, 193)).toBe("Passed 232–193");
  });

  it("formats result without counts as just the result string", () => {
    expect(formatTallyLine("Passed", null, null)).toBe("Passed");
  });

  it("formats counts without result as just the counts", () => {
    expect(formatTallyLine(null, 232, 193)).toBe("232–193");
  });

  it("returns null when both result and counts are absent", () => {
    expect(formatTallyLine(null, null, null)).toBeNull();
  });

  it("returns null when all inputs are undefined", () => {
    expect(formatTallyLine(undefined, undefined, undefined)).toBeNull();
  });

  it("trims whitespace from result string", () => {
    expect(formatTallyLine("  Failed  ", 45, 200)).toBe("Failed 45–200");
  });

  it("treats empty string result as absent", () => {
    expect(formatTallyLine("", 232, 193)).toBe("232–193");
  });

  it("treats whitespace-only result as absent", () => {
    expect(formatTallyLine("   ", 10, 20)).toBe("10–20");
  });

  it("handles zero counts", () => {
    // 0 is a valid count (e.g. no nay votes)
    expect(formatTallyLine("Passed", 435, 0)).toBe("Passed 435–0");
  });

  it("formats when only one count is null (partial data — both required for count segment)", () => {
    // When only yea is known but nay is null, we can't show a count pair
    expect(formatTallyLine("Passed", 232, null)).toBe("Passed");
    expect(formatTallyLine(null, 232, null)).toBeNull();
  });
});
