import { describe, expect, it } from "vitest";
import type { DbClient } from "../../../db/client";
import {
  MAX_UNRECONCILED_DOLLARS,
  MIN_RECONCILED_SHARE,
  canClaimNoCorporatePac,
  corporatePacClaimSentence,
  evaluateCorporatePacClaim,
  lookupCorporatePacClaim,
  type CorporatePacClaimInput,
} from "./corporatePacClaim";

const summary = (pacTotal: number) => ({
  pacTotal,
  coverageEndDate: "2026-06-30" as string | null,
  sourceUrl: "https://www.fec.gov/data/candidate/H2AK01158/?cycle=2026",
});

/** The same filing with a blank CVG_END_DT — what an all-zero row carries. */
const undatedSummary = (pacTotal: number) => ({
  ...summary(pacTotal),
  coverageEndDate: null,
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

  it("refuses a filed zero whose named rows merely net to zero", () => {
    // A contribution and its refund sum to nothing, but a corporate committee
    // is still named on the candidate's own page. Testing the SUM would let
    // that page carry "no PAC contributions of any kind" above the rows.
    const claim = evaluate({
      summary: summary(0),
      contributions: [
        { sponsorClass: "corporate", amount: 5_000 },
        { sponsorClass: "labor", amount: -5_000 },
      ],
    });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unreconciled_total");
    // The computed totals are reported, not zeroed — the corporate row is the
    // whole reason this candidate is being refused.
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

  it("refuses a passing SHARE that still leaves a room full of corporate PACs unaccounted", () => {
    // The share bound scales with the candidate and the dollar bound does not.
    // Exactly 95% of a $3M PAC total leaves $150,000 invisible — 15-30
    // corporate PACs at the $5,000 max-out, which is precisely what the badge
    // would be denying.
    const claim = evaluate({
      summary: summary(3_000_000),
      contributions: [{ sponsorClass: "labor", amount: 2_850_000 }],
    });
    expect(claim.reconciledShare).toBeCloseTo(MIN_RECONCILED_SHARE);
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unreconciled_total");
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("draws the dollar bound strictly: a gap that IS one corporate max-out refuses", () => {
    // The constant is a multicandidate PAC's per-election maximum, and the
    // claim made for it is that no single corporate PAC can hide in the gap.
    // At exactly $5,000 one can — so the bound has to exclude its own value.
    // Share is ~0.995 in all three, well clear of MIN_RECONCILED_SHARE, so the
    // dollar bound is the only thing deciding.
    const withGap = (gap: number) =>
      evaluate({
        summary: summary(1_000_000),
        contributions: [{ sponsorClass: "labor", amount: 1_000_000 - gap }],
      });

    expect(withGap(MAX_UNRECONCILED_DOLLARS - 1).verdict).toBe(
      "no_corporate_pac",
    );
    expect(withGap(MAX_UNRECONCILED_DOLLARS).verdict).toBe("unverified");
    expect(withGap(MAX_UNRECONCILED_DOLLARS).reason).toBe("unreconciled_total");
    expect(withGap(MAX_UNRECONCILED_DOLLARS + 1).verdict).toBe("unverified");
    for (const gap of [
      MAX_UNRECONCILED_DOLLARS,
      MAX_UNRECONCILED_DOLLARS + 1,
    ]) {
      expect(withGap(gap).reconciledShare).toBeGreaterThan(
        MIN_RECONCILED_SHARE,
      );
      expect(canClaimNoCorporatePac(withGap(gap))).toBe(false);
    }
  });

  it("still clears a large filer whose unaccounted remainder is under the dollar cap", () => {
    // The dollar bound must not become a de facto ban on big filers: a $3M
    // total with $1,000 unnamed is as complete as evidence gets.
    const claim = evaluate({
      summary: summary(3_000_000),
      contributions: [{ sponsorClass: "labor", amount: 2_999_000 }],
    });
    expect(3_000_000 - 2_999_000).toBeLessThan(MAX_UNRECONCILED_DOLLARS);
    expect(claim.verdict).toBe("no_corporate_pac");
  });

  it("refuses named money that EXCEEDS the filed total", () => {
    // A share above 1 is the same staleness contradiction the filed-zero
    // branch refuses, and it must be refused here too — `share < MIN` is false
    // for every share above 1, so this shape would otherwise pass. The
    // dangerous form is a partial contributions load (an interrupted ingest,
    // or a `--limit N` run) against a stale summary: some labor rows outrun a
    // small filed total while the corporate rows are simply not loaded yet.
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [{ sponsorClass: "labor", amount: 40_000 }],
    });
    expect(claim.reconciledShare).toBeCloseTo(4);
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unreconciled_total");
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("refuses a filed total that is not a usable number", () => {
    // Every `>` and `<` comparison against NaN is false, so an unguarded NaN
    // falls THROUGH the completeness gates into the badge. Fail closed.
    const claim = evaluate({ summary: summary(Number.NaN), contributions: [] });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unreconciled_total");
    // Never handed to the render layer as a NaN to print.
    expect(claim.pacDollars).toBeNull();
    expect(claim.reconciledShare).toBe(0);
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("refuses a contribution amount that is not a usable number", () => {
    // Worst shape: the unusable amount belongs to an UNCLASSIFIED committee,
    // so a NaN that slips past the guards would have that committee clearing
    // the candidate rather than blocking them. This case must NOT move with
    // the positive finding — an unreadable amount on a committee we cannot
    // classify is exactly the evidence gap the claim is about.
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "unknown", amount: Number.NaN },
        { sponsorClass: "labor", amount: 9_000 },
      ],
    });
    expect(claim.verdict).toBe("unverified");
    expect(Number.isFinite(claim.unclassifiedDollars)).toBe(true);
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("refuses a negative filed PAC total instead of reading it as zero", () => {
    // OTHER_POL_CMTE_CONTRIB goes negative when refunds exceed the period's
    // receipts — which means the candidate DID receive PAC money. The old
    // `<= 0` test handed that to the strongest badge, with the negative figure
    // going out to the render layer.
    const claim = evaluate({ summary: summary(-1_200), contributions: [] });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unreconciled_total");
    expect(claim.pacDollars).toBeNull();
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("still names corporate money when the filed total is not a usable number", () => {
    // The positive finding does not read `pacTotal` at all: it rests on the
    // existence of a row inside the pledge scope, and a summary we cannot read
    // does not make that row stop existing. Refusing here would suppress a
    // fact we hold — show the thin record, never hide it.
    const claim = evaluate({
      summary: summary(Number.NaN),
      contributions: [
        { sponsorClass: "corporate", amount: 2_500 },
        { sponsorClass: "labor", amount: 1_000 },
      ],
    });
    expect(claim.verdict).toBe("has_corporate_pac");
    expect(claim.corporateDollars).toBe(2_500);
    expect(claim.pacDollars).toBeNull();
    expect(claim.reconciledShare).toBe(0);
  });

  it("still names corporate money when the filed total is negative", () => {
    const claim = evaluate({
      summary: summary(-1_200),
      contributions: [{ sponsorClass: "trade", amount: 2_500 }],
    });
    expect(claim.verdict).toBe("has_corporate_pac");
    expect(claim.corporateDollars).toBe(2_500);
    expect(claim.pacDollars).toBeNull();
  });

  it("still names corporate money when the corporate row's own amount is unusable", () => {
    // The dollar figure is dropped from the totals — every reported number
    // stays finite — but the committee is still named on the filing.
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "corporate", amount: Number.NaN },
        { sponsorClass: "labor", amount: 9_000 },
      ],
    });
    expect(claim.verdict).toBe("has_corporate_pac");
    expect(claim.corporateDollars).toBe(0);
    expect(Number.isFinite(claim.reconciledShare)).toBe(true);
  });

  it("never clears a candidate on a summary or an amount it cannot read", () => {
    // The other half of the reorder: nothing degenerate may move in the
    // CLEARING direction, whatever else moves.
    const degenerate: CorporatePacClaimInput[] = [
      { summary: summary(Number.NaN), contributions: [] },
      { summary: summary(-1_200), contributions: [] },
      {
        summary: summary(Number.NaN),
        contributions: [{ sponsorClass: "labor", amount: 10_000 }],
      },
      {
        summary: summary(10_000),
        contributions: [{ sponsorClass: "labor", amount: Number.NaN }],
      },
      {
        summary: summary(10_000),
        contributions: [
          { sponsorClass: "labor", amount: 10_000 },
          { sponsorClass: "leadership", amount: Number.POSITIVE_INFINITY },
        ],
      },
    ];
    for (const input of degenerate) {
      const claim = evaluate(input);
      expect(claim.verdict).toBe("unverified");
      expect(canClaimNoCorporatePac(claim)).toBe(false);
    }
  });

  it("reports corporate money whose dollars a refund has netted away", () => {
    // Presence, not sum: a corporate committee that gave and was refunded is
    // still a corporate committee on the candidate's page, and `> 0` on the
    // dollar total would clear them.
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "corporate", amount: 6_000 },
        { sponsorClass: "corporate", amount: -6_000 },
        { sponsorClass: "labor", amount: 10_000 },
      ],
    });
    expect(claim.corporateDollars).toBe(0);
    expect(claim.verdict).toBe("has_corporate_pac");
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("refuses an unclassified committee whose dollars a refund has netted away", () => {
    const claim = evaluate({
      summary: summary(10_000),
      contributions: [
        { sponsorClass: "unknown", amount: 500 },
        { sponsorClass: "unknown", amount: -500 },
        { sponsorClass: "labor", amount: 10_000 },
      ],
    });
    expect(claim.unclassifiedDollars).toBe(0);
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unclassified_committees");
  });

  it("refuses an undated filed zero — the cohort whose CVG_END_DT is blank", () => {
    // An all-zero weball row typically carries a blank coverage date, so this
    // is the same cohort that produces `no_pac_money`. Undated, the copy is an
    // unqualified absolute about a filing we cannot place in time.
    const claim = evaluate({ summary: undatedSummary(0), contributions: [] });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("undated_filing");
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("refuses an undated no-corporate-PAC claim", () => {
    const claim = evaluate({
      summary: undatedSummary(10_000),
      contributions: [{ sponsorClass: "labor", amount: 10_000 }],
    });
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("undated_filing");
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("still reports corporate money on an undated filing", () => {
    // The date gate guards AFFIRMATIVE ABSENCE claims only. A positive finding
    // is not improved by silence — including when the filing is undated AND
    // its total is unreadable, the two suppressing conditions stacked.
    const shapes = [
      undatedSummary(10_000),
      undatedSummary(Number.NaN),
      undatedSummary(-1_200),
    ];
    for (const filing of shapes) {
      const claim = evaluate({
        summary: filing,
        contributions: [{ sponsorClass: "corporate", amount: 10_000 }],
      });
      expect(claim.verdict).toBe("has_corporate_pac");
    }
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

  it("never emits an undated absence claim", () => {
    // The strongest sentence on the site, with nothing placing it in time.
    const sentence = corporatePacClaimSentence(
      evaluate({ summary: undatedSummary(0), contributions: [] }),
    );
    expect(sentence).toBe("PAC sources not fully identified yet");
    expect(sentence).not.toMatch(/no (corporate )?pac contributions/iu);
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

/**
 * A join-aware fake. The chain records WHICH join the query builder asked for
 * and then answers with that join's real semantics over the committee
 * fixtures — an inner join drops a contribution row whose committee is
 * missing, a left join keeps it with null committee columns. That is what
 * makes the orphan test below a proof rather than a restatement: swap the
 * module back to `innerJoin` and the row vanishes, exactly as it would against
 * a production database whose foreign key has not been applied.
 */
function makeJoinAwareDb(fixtures: {
  summaryRow?: {
    pacTotal: string;
    coverageEndDate: string | null;
    sourceUrl: string;
  };
  contributions: Array<{ committeeId: string; amountTotal: string }>;
  committees: Record<string, { sponsorClass: string | null; status: string }>;
}): DbClient {
  let selectCount = 0;
  const db = {
    select: () => {
      selectCount += 1;
      const isSummaryQuery = selectCount === 1;
      let joinKind: "inner" | "left" | null = null;
      const chain: Record<string, unknown> = {};
      for (const method of ["from", "where", "limit"]) {
        chain[method] = () => chain;
      }
      chain.innerJoin = () => {
        joinKind = "inner";
        return chain;
      };
      chain.leftJoin = () => {
        joinKind = "left";
        return chain;
      };
      chain.then = (resolve: (rows: unknown[]) => void) => {
        if (isSummaryQuery) {
          return resolve(fixtures.summaryRow ? [fixtures.summaryRow] : []);
        }
        const rows: unknown[] = [];
        for (const row of fixtures.contributions) {
          const committee = fixtures.committees[row.committeeId];
          if (!committee) {
            if (joinKind === "inner") continue;
            rows.push({
              sponsorClass: null,
              amount: row.amountTotal,
              status: null,
            });
            continue;
          }
          rows.push({
            sponsorClass: committee.sponsorClass,
            amount: row.amountTotal,
            status: committee.status,
          });
        }
        return resolve(rows);
      };
      return chain;
    },
  };
  return db as unknown as DbClient;
}

const summaryRow = (pacTotal: string) => ({
  pacTotal,
  coverageEndDate: "2026-06-30",
  sourceUrl: "https://www.fec.gov/data/candidate/H2AK01158/?cycle=2026",
});

describe("lookupCorporatePacClaim", () => {
  it("blocks the claim when a contributing committee is missing from pac_committees", async () => {
    // $100,000 filed, $96,000 of it labor and $4,000 from a committee we hold
    // no filing for. Under an inner join that $4,000 row DISAPPEARS, the
    // remaining share reads 0.96, and the badge prints for a candidate whose
    // unattributed money could be anything. The row must block instead.
    const claim = await lookupCorporatePacClaim(
      makeJoinAwareDb({
        summaryRow: summaryRow("100000.00"),
        contributions: [
          { committeeId: "C00000001", amountTotal: "96000.00" },
          { committeeId: "C00000002", amountTotal: "4000.00" },
        ],
        committees: {
          C00000001: { sponsorClass: "labor", status: "auto" },
        },
      }),
      "federal-A",
      "2026",
    );
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unclassified_committees");
    expect(claim.unclassifiedDollars).toBe(4_000);
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("clears a candidate whose committees are all on file and non-corporate", async () => {
    const claim = await lookupCorporatePacClaim(
      makeJoinAwareDb({
        summaryRow: summaryRow("10000.00"),
        contributions: [
          { committeeId: "C00000001", amountTotal: "6000.00" },
          { committeeId: "C00000002", amountTotal: "4000.00" },
        ],
        committees: {
          C00000001: { sponsorClass: "labor", status: "auto" },
          C00000002: { sponsorClass: "leadership", status: "verified" },
        },
      }),
      "federal-A",
      "2026",
    );
    expect(claim.verdict).toBe("no_corporate_pac");
    expect(claim.asOf).toBe("2026-06-30");
  });

  it("blocks on a committee whose filed sponsor claim a human rejected", async () => {
    const claim = await lookupCorporatePacClaim(
      makeJoinAwareDb({
        summaryRow: summaryRow("10000.00"),
        contributions: [{ committeeId: "C00000001", amountTotal: "10000.00" }],
        committees: {
          C00000001: { sponsorClass: "labor", status: "rejected" },
        },
      }),
      "federal-A",
      "2026",
    );
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unclassified_committees");
  });

  it("blocks on any status outside the clearing allow-list", async () => {
    // `pac_committees.status` is unconstrained text with no CHECK, so a status
    // added later must not pass a committee's filed class straight through
    // into an absence claim just because it is not the string 'rejected'.
    const claim = await lookupCorporatePacClaim(
      makeJoinAwareDb({
        summaryRow: summaryRow("10000.00"),
        contributions: [{ committeeId: "C00000001", amountTotal: "10000.00" }],
        committees: {
          C00000001: { sponsorClass: "labor", status: "disputed" },
        },
      }),
      "federal-A",
      "2026",
    );
    expect(claim.verdict).toBe("unverified");
    expect(claim.reason).toBe("unclassified_committees");
    expect(canClaimNoCorporatePac(claim)).toBe(false);
  });

  it("says no filing when the candidate has no FEC summary for the cycle", async () => {
    const claim = await lookupCorporatePacClaim(
      makeJoinAwareDb({ contributions: [], committees: {} }),
      "federal-A",
      "2026",
    );
    expect(claim.verdict).toBe("no_filing");
  });
});
