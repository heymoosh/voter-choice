/**
 * src/lib/server/corporatePacClaim.ts
 *
 * Can this candidate honestly be shown as taking no corporate PAC money?
 *
 * The claim is about ABSENCE, so the rule is inverted from normal display
 * logic: the verdict is only affirmative when the evidence is COMPLETE. Any
 * dollar we cannot attribute — an unclassified committee, a committee we hold
 * no filing for, or named contributions that do not reconcile with the filed
 * PAC total — returns `unverified`, never `no_corporate_pac`. A blank is a
 * worse outcome than a missing badge; a false "$0" is the worst outcome of all.
 *
 * Every gate below is therefore written to fail CLOSED. That is a stricter
 * discipline than it sounds: a guard phrased `x > 0` or `x < limit` is FALSE
 * for a NaN and so lets a degenerate figure fall through into the badge, and a
 * guard phrased as a share lets an arbitrarily large number of dollars hide
 * inside a rounding allowance. Both shapes are avoided deliberately here.
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

/**
 * The most filed PAC money that may stay unaccounted for and still allow an
 * absence claim, in dollars. A share cannot bound this on its own, because a
 * share scales with the candidate: 95% of a $3M PAC total leaves $150,000
 * invisible — room for 15-30 corporate PACs at max-out, which is precisely
 * what the badge denies. $5,000 is a multicandidate PAC's maximum contribution
 * per election, so under this gap no single corporate PAC can hide inside the
 * remainder. BOTH bounds must hold; either one failing returns `unverified`.
 */
export const MAX_UNRECONCILED_DOLLARS = 5_000;

/**
 * Float-noise tolerance on the "named money exceeds the filed total" refusal.
 * Not a business allowance: any real overshoot means the summary is stale or
 * the contribution rows are a partial load, and both are contradictions, not
 * roundings.
 */
const RECONCILED_SHARE_EPSILON = 1e-9;

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
  /**
   * Named contributions do not account for the filed PAC total — too little
   * named, more named than filed, or a figure that is not a usable number.
   */
  | "unreconciled_total"
  /** The filing carries no coverage date, so no claim from it can be dated. */
  | "undated_filing";

export interface CorporatePacClaim {
  verdict: CorporatePacVerdict;
  reason?: UnverifiedReason;
  /** Filed PAC total for the cycle, in dollars. Null when nothing is on file. */
  pacDollars: number | null;
  /** Dollars from committees inside the pledge scope. */
  corporateDollars: number;
  /** Dollars from committees we could not classify. */
  unclassifiedDollars: number;
  /**
   * Share of the filed PAC total accounted for by named committees. 0-1 on
   * every verdict that survives the gates: a share above 1 is a contradiction
   * and is refused, so a caller never sees one on an affirmative claim.
   */
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
 * An affirmative claim is the strongest sentence on the page, and FEC coverage
 * dates vary per candidate — so it is publishable only DATED. `coverage_end_date`
 * is nullable, and the ingest parser drops any CVG_END_DT that is not
 * MM/DD/YYYY, blank included — which is what an all-zero weball row carries,
 * i.e. the very cohort that produces `no_pac_money`. Undated, the copy degrades
 * to a bare absolute ("No PAC contributions of any kind in FEC filings"), an
 * unqualified present-tense claim about a filing we cannot even place in time.
 * Refuse instead.
 */
function onlyIfDated(claim: CorporatePacClaim): CorporatePacClaim {
  if (claim.asOf) return claim;
  return { ...claim, verdict: "unverified", reason: "undated_filing" };
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

  const unreconciled = (
    totals: Pick<
      CorporatePacClaim,
      "corporateDollars" | "unclassifiedDollars" | "reconciledShare"
    >,
  ): CorporatePacClaim => ({
    ...base,
    ...totals,
    verdict: "unverified",
    reason: "unreconciled_total",
  });

  // Degenerate figures are not evidence in either direction, so they buy
  // silence, not a badge.
  //   * A non-finite figure defeats every comparison below — `x > 0` and
  //     `x < limit` are BOTH false for NaN — so an unguarded NaN would fall
  //     through the completeness gates and clear the candidate. This is
  //     unreachable through the DB today (both columns are numeric NOT NULL),
  //     but `evaluateCorporatePacClaim` is public API and a fail-closed module
  //     must not have its guards written in the one direction that fails open.
  //   * A negative filed total is FEC refund arithmetic:
  //     OTHER_POL_CMTE_CONTRIB goes negative when refunds exceed the period's
  //     receipts — which means the candidate DID receive PAC money. Swallowing
  //     it into the filed-zero branch would print the strongest badge on the
  //     evidence of the opposite fact.
  if (!Number.isFinite(summary.pacTotal) || summary.pacTotal < 0) {
    return unreconciled({
      corporateDollars: 0,
      unclassifiedDollars: 0,
      reconciledShare: 0,
    });
  }
  if (contributions.some((row) => !Number.isFinite(row.amount))) {
    return unreconciled({
      corporateDollars: 0,
      unclassifiedDollars: 0,
      reconciledShare: 0,
    });
  }

  let corporateDollars = 0;
  let unclassifiedDollars = 0;
  let namedTotal = 0;
  // Tracked as PRESENCE, not dollars. A refund can net a committee's total to
  // zero or below, and `corporateDollars > 0` would then read as "no corporate
  // money" for a candidate with a named corporate committee on file. The row's
  // existence is the fact; its sign is accounting.
  let hasCorporateRow = false;
  let hasUnclassifiedRow = false;
  for (const row of contributions) {
    namedTotal += row.amount;
    if (row.sponsorClass === null || row.sponsorClass === "unknown") {
      unclassifiedDollars += row.amount;
      hasUnclassifiedRow = true;
      continue;
    }
    if (isPledgeCorporate(row.sponsorClass)) {
      corporateDollars += row.amount;
      hasCorporateRow = true;
    }
  }

  // A filed zero is the strongest claim available and needs no committee-level
  // evidence — UNLESS our own committee-level rows contradict it. The two FEC
  // files carry independent coverage dates (the per-committee contribution
  // file can be weeks fresher than a candidate's summary), so "summary says
  // $0" plus "we hold named PAC contributions" means the summary is stale, not
  // that the candidate took nothing. Saying `no_pac_money` there would print
  // the strongest badge on a page that can also list those very dollars. The
  // test is the EXISTENCE of rows, not their sum: a set that nets to zero
  // (a contribution and its refund) is still a named PAC committee on file.
  if (summary.pacTotal === 0) {
    if (contributions.length > 0) {
      return unreconciled({
        corporateDollars,
        unclassifiedDollars,
        // The ratio is undefined against a zero denominator; reported as 0 so
        // the field stays inside its declared range.
        reconciledShare: 0,
      });
    }
    return onlyIfDated({
      ...base,
      verdict: "no_pac_money",
      corporateDollars: 0,
      unclassifiedDollars: 0,
      reconciledShare: 1,
    });
  }

  const reconciledShare = namedTotal / summary.pacTotal;
  const unreconciledDollars = summary.pacTotal - namedTotal;
  const totals = { corporateDollars, unclassifiedDollars, reconciledShare };

  // Corporate money found: a positive finding needs no completeness check.
  if (hasCorporateRow) {
    return { ...base, ...totals, verdict: "has_corporate_pac" };
  }

  if (hasUnclassifiedRow) {
    return {
      ...base,
      ...totals,
      verdict: "unverified",
      reason: "unclassified_committees",
    };
  }

  // Named money EXCEEDS the filed total — the same staleness contradiction the
  // filed-zero branch refuses, and it must be refused here too or it passes:
  // `share < MIN` is false for every share above 1. The dangerous shape is a
  // PARTIAL contributions load (an interrupted ingest, or a `--limit N` run)
  // against a stale summary: a fraction of the labor rows can outrun a small
  // filed total while the corporate rows are simply not loaded yet.
  if (reconciledShare > 1 + RECONCILED_SHARE_EPSILON) {
    return unreconciled(totals);
  }

  // Both bounds, not either: the share catches a candidate whose named rows
  // cover only a fraction of the filing, and the dollar cap catches the large
  // filer whose 5% remainder is still enough for a room full of corporate
  // PACs. Phrased as negations of the passing condition so that a value which
  // is not a usable number fails CLOSED even if it ever reaches this line.
  if (
    !(reconciledShare >= MIN_RECONCILED_SHARE) ||
    !(unreconciledDollars <= MAX_UNRECONCILED_DOLLARS)
  ) {
    return unreconciled(totals);
  }

  return onlyIfDated({ ...base, ...totals, verdict: "no_corporate_pac" });
}

/**
 * Committee statuses whose filed sponsor class may be used to CLEAR a
 * candidate. `pac_committees.status` is unconstrained `text DEFAULT 'auto'`
 * with no CHECK, so this is an allow-list rather than a deny-list on
 * 'rejected': any status added later — 'disputed', 'stale', 'needs_review' —
 * must block the claim until someone decides it should not, which is the only
 * direction of that mistake we can afford.
 */
const CLEARING_COMMITTEE_STATUSES: ReadonlySet<string> = new Set([
  "auto",
  "verified",
]);

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
    // LEFT, deliberately. An inner join DELETES any contribution row whose
    // committee we hold no `pac_committees` filing for — turning money we
    // cannot attribute into money we cannot SEE, the exact inversion of this
    // module's premise: the row would stop counting toward the reconciliation
    // gap and the candidate would clear on the strength of the rows that
    // happen to have joined. Migration 0022 declares a foreign key that should
    // make an orphan impossible, but that migration is applied to production
    // separately from this code; the read path stays correct regardless of
    // which migrations have landed.
    .leftJoin(
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
      // Two ways a row arrives without a usable class, both landing in
      // `unclassified` — which BLOCKS the claim rather than quietly clearing
      // it: the left join found no committee at all (`status` null), or the
      // committee's filed claim carries a status we do not accept as evidence.
      sponsorClass:
        r.status !== null && CLEARING_COMMITTEE_STATUSES.has(r.status)
          ? (r.sponsorClass as PacSponsorClass | null)
          : null,
      amount: Number(r.amount),
    })),
  });
}

/**
 * Reader-facing sentence for a verdict, with the filing date attached. The
 * `through` clause is conditional only for the shapes that never carry a date
 * anyway — `unverified` and `no_filing` do not use it, and an undated
 * affirmative claim has already been turned into `unverified` upstream.
 */
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
