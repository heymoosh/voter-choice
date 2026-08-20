/**
 * src/lib/server/corporatePacClaim.ts
 *
 * Can this candidate honestly be shown as taking no corporate PAC money?
 *
 * The claim is about ABSENCE, so the rule is inverted from normal display
 * logic: the verdict is only affirmative when the evidence is COMPLETE. Any
 * dollar we cannot attribute — an unclassified committee, or named
 * contributions that do not reconcile with the filed PAC total — returns
 * `unverified`, never `no_corporate_pac`. A blank is a worse outcome than a
 * missing badge; a false "$0" is the worst outcome of all.
 *
 * Three inputs, all already ingested:
 *   candidate_fec_summaries        the FILED PAC total (0 included) + the date
 *                                  the filing covers through   (migration 0027)
 *   pac_candidate_contributions    who gave, committee by committee (0022)
 *   pac_committees.sponsor_class   corporate-connected or not      (0026)
 *
 * Pledge scope (corporate + trade association/co-op, the End Citizens United
 * "No Corporate PAC" definition) lives in src/lib/pacSponsorClass.ts, not here.
 *
 * OUT OF SCOPE — independent expenditures. A corporate super PAC spending
 * FOR a candidate is not a contribution TO them; that money lives in
 * `independent_expenditures` (0023) and is a separate statement to the reader.
 * Never fold it into this verdict, in either direction.
 */

import { and, eq } from "drizzle-orm";
import type { DbClient } from "../../../db/client";
import {
  candidateFecSummaries,
  pacCandidateContributions,
  pacCommittees,
} from "../../../db/schema";
import { isPledgeCorporate, type PacSponsorClass } from "../pacSponsorClass";

/**
 * How much of the filed PAC total the named per-committee rows must account
 * for before an absence claim is allowed. Not 100%: the bulk contribution file
 * and the summary file can carry slightly different coverage dates, and small
 * transaction types outside 24K/24P/24Z sit in the filed total. Below this,
 * the honest answer is `unverified`.
 */
export const MIN_RECONCILED_SHARE = 0.95;

export type CorporatePacVerdict =
  /** Filed a summary reporting no PAC contributions of any kind. */
  | "no_pac_money"
  /** Took PAC money, none of it corporate, and every dollar is accounted for. */
  | "no_corporate_pac"
  /** Took corporate PAC money. */
  | "has_corporate_pac"
  /** Evidence is incomplete — say nothing rather than something false. */
  | "unverified"
  /** No FEC summary on file for this cycle. NOT the same as $0. */
  | "no_filing";

export type UnverifiedReason =
  /** Some contributing committees could not be classified from their filing. */
  | "unclassified_committees"
  /** Named contributions do not account for the filed PAC total. */
  | "unreconciled_total";

export interface CorporatePacClaim {
  verdict: CorporatePacVerdict;
  reason?: UnverifiedReason;
  /** Filed PAC total for the cycle, in dollars. Null when nothing is on file. */
  pacDollars: number | null;
  /** Dollars from committees inside the pledge scope. */
  corporateDollars: number;
  /** Dollars from committees we could not classify. */
  unclassifiedDollars: number;
  /** Share of the filed PAC total accounted for by named committees, 0-1. */
  reconciledShare: number;
  /** What the filing covers through (ISO date), for "through <date>" copy. */
  asOf: string | null;
  /** The FEC page the figures come from. */
  sourceUrl: string | null;
}

export interface CorporatePacClaimInput {
  /** Null when the candidate has no FEC summary on file for the cycle. */
  summary: {
    pacTotal: number;
    coverageEndDate: string | null;
    sourceUrl: string;
  } | null;
  /** One entry per contributing committee, from pac_candidate_contributions. */
  contributions: Array<{
    sponsorClass: PacSponsorClass | null;
    amount: number;
  }>;
}

/**
 * Decide the verdict. Pure — no DB, no dates, no I/O — so every branch is
 * testable and the rule is readable in one screen.
 */
export function evaluateCorporatePacClaim(
  input: CorporatePacClaimInput,
): CorporatePacClaim {
  const { summary, contributions } = input;

  if (!summary) {
    return {
      verdict: "no_filing",
      pacDollars: null,
      corporateDollars: 0,
      unclassifiedDollars: 0,
      reconciledShare: 0,
      asOf: null,
      sourceUrl: null,
    };
  }

  const base = {
    pacDollars: summary.pacTotal,
    asOf: summary.coverageEndDate,
    sourceUrl: summary.sourceUrl,
  };

  let corporateDollars = 0;
  let unclassifiedDollars = 0;
  let namedTotal = 0;
  for (const row of contributions) {
    namedTotal += row.amount;
    if (row.sponsorClass === null || row.sponsorClass === "unknown") {
      unclassifiedDollars += row.amount;
      continue;
    }
    if (isPledgeCorporate(row.sponsorClass)) corporateDollars += row.amount;
  }

  // A filed zero is the strongest claim available and needs no committee-level
  // evidence — UNLESS our own committee-level rows contradict it. The two FEC
  // files carry independent coverage dates (the per-committee contribution
  // file can be weeks fresher than a candidate's summary), so "summary says
  // $0" plus "we hold named PAC contributions" means the summary is stale, not
  // that the candidate took nothing. Saying `no_pac_money` there would print
  // the strongest badge on a page that can also list those very dollars.
  if (summary.pacTotal <= 0) {
    if (namedTotal > 0) {
      return {
        ...base,
        verdict: "unverified",
        reason: "unreconciled_total",
        corporateDollars,
        unclassifiedDollars,
        reconciledShare: 0,
      };
    }
    return {
      ...base,
      verdict: "no_pac_money",
      corporateDollars: 0,
      unclassifiedDollars: 0,
      reconciledShare: 1,
    };
  }

  const reconciledShare = namedTotal / summary.pacTotal;
  const totals = { corporateDollars, unclassifiedDollars, reconciledShare };

  // Corporate money found: a positive finding needs no completeness check.
  if (corporateDollars > 0) {
    return { ...base, ...totals, verdict: "has_corporate_pac" };
  }

  if (unclassifiedDollars > 0) {
    return {
      ...base,
      ...totals,
      verdict: "unverified",
      reason: "unclassified_committees",
    };
  }

  if (reconciledShare < MIN_RECONCILED_SHARE) {
    return {
      ...base,
      ...totals,
      verdict: "unverified",
      reason: "unreconciled_total",
    };
  }

  return { ...base, ...totals, verdict: "no_corporate_pac" };
}

/** Load the evidence for one candidate and evaluate it. */
export async function lookupCorporatePacClaim(
  db: DbClient,
  candidateId: string,
  electionCycle: string,
): Promise<CorporatePacClaim> {
  const [summaryRow] = await db
    .select({
      pacTotal: candidateFecSummaries.pacTotal,
      coverageEndDate: candidateFecSummaries.coverageEndDate,
      sourceUrl: candidateFecSummaries.sourceUrl,
    })
    .from(candidateFecSummaries)
    .where(
      and(
        eq(candidateFecSummaries.candidateId, candidateId),
        eq(candidateFecSummaries.electionCycle, electionCycle),
      ),
    )
    .limit(1);

  const contributionRows = await db
    .select({
      sponsorClass: pacCommittees.sponsorClass,
      amount: pacCandidateContributions.amountTotal,
      status: pacCommittees.status,
    })
    .from(pacCandidateContributions)
    .innerJoin(
      pacCommittees,
      eq(pacCommittees.committeeId, pacCandidateContributions.committeeId),
    )
    .where(
      and(
        eq(pacCandidateContributions.candidateId, candidateId),
        eq(pacCandidateContributions.electionCycle, electionCycle),
      ),
    );

  return evaluateCorporatePacClaim({
    summary: summaryRow
      ? {
          pacTotal: Number(summaryRow.pacTotal),
          coverageEndDate: summaryRow.coverageEndDate,
          sourceUrl: summaryRow.sourceUrl,
        }
      : null,
    contributions: contributionRows.map((r) => ({
      // A committee whose filed sponsor claim a human REJECTED is not
      // evidence of anything — treat it as unclassified, which blocks the
      // claim rather than quietly clearing it.
      sponsorClass:
        r.status === "rejected"
          ? null
          : (r.sponsorClass as PacSponsorClass | null),
      amount: Number(r.amount),
    })),
  });
}

/** Reader-facing sentence for a verdict, with the filing date attached. */
export function corporatePacClaimSentence(claim: CorporatePacClaim): string {
  const through = claim.asOf ? ` through ${claim.asOf}` : "";
  switch (claim.verdict) {
    case "no_pac_money":
      return `No PAC contributions of any kind in FEC filings${through}`;
    case "no_corporate_pac":
      return `No corporate PAC contributions in FEC filings${through}`;
    case "has_corporate_pac":
      return `Corporate PAC contributions in FEC filings${through}`;
    case "unverified":
      return "PAC sources not fully identified yet";
    case "no_filing":
      return "No FEC filing yet";
  }
}

/** Convenience for read paths that only need the yes/no/hold-your-tongue. */
export function canClaimNoCorporatePac(claim: CorporatePacClaim): boolean {
  return (
    claim.verdict === "no_corporate_pac" || claim.verdict === "no_pac_money"
  );
}
