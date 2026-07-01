import { describe, it, expect } from "vitest";
import {
  derivePeerComparison,
  peerBand,
  formatUsd,
  formatMultiple,
  PEER_SOURCE,
} from "./peerComparison";

describe("derivePeerComparison", () => {
  const base = {
    office: "U.S. House",
    cycle: "2025–26",
  };

  it("builds the contract from raised + chamber median", () => {
    const pc = derivePeerComparison({
      ...base,
      totalRaised: 4_200_000,
      chamberMedian: 1_400_000,
    });
    expect(pc).not.toBeNull();
    expect(pc!.baseline).toBe("chamber-median");
    expect(pc!.office).toBe("U.S. House");
    expect(pc!.medianRaised).toBe(1_400_000);
    expect(pc!.multiple).toBeCloseTo(3.0, 5);
    expect(pc!.cycle).toBe("2025–26");
    expect(pc!.source).toBe(PEER_SOURCE);
  });

  it("returns null when there is NO chamber median (honest blank — no fabricated baseline)", () => {
    expect(
      derivePeerComparison({
        ...base,
        totalRaised: 4_200_000,
        chamberMedian: undefined,
      }),
    ).toBeNull();
    expect(
      derivePeerComparison({
        ...base,
        totalRaised: 4_200_000,
        chamberMedian: null,
      }),
    ).toBeNull();
    expect(
      derivePeerComparison({
        ...base,
        totalRaised: 4_200_000,
        chamberMedian: 0,
      }),
    ).toBeNull();
  });

  it("returns null when the candidate has no positive raised total", () => {
    expect(
      derivePeerComparison({
        ...base,
        totalRaised: undefined,
        chamberMedian: 1_400_000,
      }),
    ).toBeNull();
    expect(
      derivePeerComparison({
        ...base,
        totalRaised: 0,
        chamberMedian: 1_400_000,
      }),
    ).toBeNull();
  });

  it("honors a custom source string", () => {
    const pc = derivePeerComparison({
      ...base,
      totalRaised: 2_000_000,
      chamberMedian: 1_000_000,
      source: "Custom FEC note",
    });
    expect(pc!.source).toBe("Custom FEC note");
  });
});

describe("peerBand", () => {
  it("bands the multiple per the design thresholds", () => {
    expect(peerBand(3.0)).toBe("above");
    expect(peerBand(1.15)).toBe("above");
    expect(peerBand(1.0)).toBe("at");
    expect(peerBand(0.85)).toBe("at");
    expect(peerBand(0.84)).toBe("below");
    expect(peerBand(0.29)).toBe("below");
  });
});

describe("formatUsd", () => {
  it("formats compact dollars", () => {
    expect(formatUsd(4_200_000)).toBe("$4.2M");
    expect(formatUsd(12_000_000)).toBe("$12M");
    expect(formatUsd(410_000)).toBe("$410K");
    expect(formatUsd(95)).toBe("$95");
  });
  it("renders an em dash for missing values", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(undefined)).toBe("—");
  });
});

describe("formatMultiple", () => {
  it("formats multiples", () => {
    expect(formatMultiple(3.0)).toBe("3×");
    expect(formatMultiple(1.34)).toBe("1.3×");
    expect(formatMultiple(0.29)).toBe("0.3×");
    expect(formatMultiple(0.07)).toBe("0.07×");
  });
});
