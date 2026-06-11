import { describe, it, expect } from "vitest";
import {
  seatAlignmentPct,
  computeSeatDeltas,
  type DelegationSeatVM,
} from "./delegationData";

function seatWith(
  id: string,
  scores: Array<{ kept?: number; total?: number }> | null,
): DelegationSeatVM {
  return {
    id,
    office: "U.S. House",
    districtLabel: "TX-37",
    alignmentEntry: scores ? { candidateId: id, scores } : null,
  } as unknown as DelegationSeatVM;
}

describe("seatAlignmentPct", () => {
  it("aggregates kept/total across issues", () => {
    expect(
      seatAlignmentPct(
        seatWith("s", [
          { kept: 5, total: 6 },
          { kept: 1, total: 4 },
        ]),
      ),
    ).toBe(60); // 6/10
  });

  it("returns null for no scoreable record (honest gap, not 0%)", () => {
    expect(seatAlignmentPct(seatWith("s", null))).toBeNull();
    expect(seatAlignmentPct(seatWith("s", []))).toBeNull();
    expect(seatAlignmentPct(seatWith("s", [{ kept: 0, total: 0 }]))).toBeNull();
  });

  it("skips malformed rows instead of poisoning the sum", () => {
    expect(
      seatAlignmentPct(
        seatWith("s", [
          { kept: 3, total: 4 },
          {} as never,
          { total: 2 } as never,
        ]),
      ),
    ).toBe(75);
  });
});

describe("computeSeatDeltas", () => {
  it("flags moves past the 5-point noise floor; leaves smaller moves quiet", () => {
    const before = new Map<string, number | null>([
      ["a", 60],
      ["b", 60],
    ]);
    const seats = [
      seatWith("a", [{ kept: 7, total: 10 }]), // 70: +10 → significant
      seatWith("b", [{ kept: 13, total: 20 }]), // 65: +5 → NOT significant (floor is >5)
    ];
    const deltas = computeSeatDeltas(before, seats);
    expect(deltas[0].significant).toBe(true);
    expect(deltas[1].significant).toBe(false);
  });

  it("flags a flip between scoreable and no-record in either direction", () => {
    const before = new Map<string, number | null>([
      ["gained", null],
      ["lost", 80],
    ]);
    const deltas = computeSeatDeltas(before, [
      seatWith("gained", [{ kept: 1, total: 2 }]),
      seatWith("lost", null),
    ]);
    expect(deltas[0].significant).toBe(true);
    expect(deltas[1].significant).toBe(true);
  });

  it("treats two no-record states as unchanged", () => {
    const deltas = computeSeatDeltas(new Map([["x", null]]), [
      seatWith("x", null),
    ]);
    expect(deltas[0].significant).toBe(false);
    expect(deltas[0].oldPct).toBeNull();
    expect(deltas[0].newPct).toBeNull();
  });
});
