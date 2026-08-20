import { describe, expect, it } from "vitest";
import {
  MIN_RECONCILED_SHARE,
  canClaimNoCorporatePac,
  corporatePacClaimSentence,
  evaluateCorporatePacClaim,
  type CorporatePacClaimInput,
} from "./corporatePacClaim";

const summary = (pacTotal: number) => ({
  pacTotal,
  coverageEndDate: "2026-06-30",
  sourceUrl: "https://www.fec.gov/data/candidate/H2AK01158/?cycle=2026",
});

const evaluate = (input: CorporatePacClaimInput) =>
  evaluateCorporatePacClaim(input);

describe("evaluateCorporatePacClaim", () => {
  it("says no filing — not $0 — when nothing is on file", () => {
    const claim = evaluate({ summary: null, contributions: [] });
    expect(claim.verdict).toBe("no_filing");
    expect(claim.pacDollars).toBeNull();
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("treats a filed zero as the strongest claim, with no committee evidence needed", () => {
    const claim = evaluate({ summary: summary(0), contributions: [] });
    expect(claim.verdict).toBe("no_pac_money");
    expect(claim.asOf).toBe("2026-06-30");
    expect(canClaimNoCorporatePac(claim)).toBe(true);
  });

  it("refuses a filed zero that our own committee rows contradict", () => {
    // The two FEC files carry independent coverage dates, so a stale summary
    // can read $0 while the per-committee file already holds contributions.
    // The badge must not be stronger than the money we can see.
    const claim = evaluate({
      summary: summary(0),
      contributions: [{ sponsorClass: "corporate", amount: 5_000 }],
    });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unreconciled_total");
    expect(claim.corporateDollars).toBe(5_000);
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("clears a candidate whose PAC money is entirely labor and leadership", () => {
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "labor", amount: 6_000 },
        { sponsorClass: "leadership", amount: 3_000 },
        { sponsorClass: "non_connected", amount: 1_000 },
      ],
    });
    expect(claim.verdict).toBe("no_corporate_pac");
    expect(claim.corporateDollars).toBe(0);
    expect(canClaimNoCorporatePac(claim)).toBe(true);
  });

  it("counts trade-association money as corporate under the ECU pledge scope", () => {
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "labor", amount: 9_000 },
        { sponsorClass: "trade", amount: 1_000 },
      ],
    });
    expect(claim.verdict).toBe("has_corporate_pac");
    expect(claim.corporateDollars).toBe(1_000);
  });

  it("refuses the claim when any contributing committee is unclassified", () => {
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "labor", amount: 9_500 },
        { sponsorClass: "unknown", amount: 500 },
      ],
    });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unclassified_committees");
    expect(claim.unclassifiedDollars).toBe(500);
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("treats a null sponsor class the same as unknown", () => {
    const claim = evaluate({
      summary: summary(1_000),
      contributions: [{ sponsorClass: null, amount: 1_000 }],
    });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unclassified_committees");
  });

  it("refuses the claim when named committees do not account for the filed total", () => {
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [{ sponsorClass: "labor", amount: 5_000 }],
    });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unreconciled_total");
    expect(claim.reconciledShare).toBeCloseTo(0.5);
  });

  it("allows the small reconciliation gap between the two FEC files", () => {
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "labor", amount: 10_000 * MIN_RECONCILED_SHARE },
      ],
    });
    expect(claim.verdict).toBe("no_corporate_pac");
  });

  it("reports corporate money even when the rest of the evidence is incomplete", () => {
    // A positive finding needs no completeness check — only the ABSENCE claim
    // does. Withholding a confirmed corporate contribution because other
    // committees are unclassified would hide the more important fact.
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "corporate", amount: 2_000 },
        { sponsorClass: "unknown", amount: 1_000 },
      ],
    });
    expect(claim.verdict).toBe("has_corporate_pac");
  });
});

describe("corporatePacClaimSentence", () => {
  it("dates every claim it makes", () => {
    expect(
      corporatePacClaimSentence(
        evaluate({
          summary: summary(10_000),
          contributions: [{ sponsorClass: "labor", amount: 10_000 }],
        }),
      ),
    ).toBe("No corporate PAC contributions in FEC filings through 2026-06-30");
  });

  it("never implies $0 when there is no filing", () => {
    const sentence = corporatePacClaimSentence(
      evaluate({ summary: null, contributions: [] }),
    );
    expect(sentence).toBe("No FEC filing yet");
    expect(sentence).not.toMatch(/\$0|no corporate/iu);
  });

  it("says the evidence is incomplete rather than making a claim", () => {
    expect(
      corporatePacClaimSentence(
        evaluate({
          summary: summary(1_000),
          contributions: [{ sponsorClass: "unknown", amount: 1_000 }],
        }),
      ),
    ).toBe("PAC sources not fully identified yet");
  });
});
