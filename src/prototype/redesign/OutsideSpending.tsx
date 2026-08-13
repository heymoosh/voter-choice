"use client";
/**
 * src/prototype/redesign/OutsideSpending.tsx
 *
 * Part 6b display block — "Outside spending about this race".
 *
 * ---------------------------------------------------------------------------
 * THE DISPLAY RULE (legally load-bearing, plan doc Part 6b — non-negotiable)
 *
 * This is NOT the candidate's money. Independent expenditures are absent from
 * candidate receipts by law and cannot be coordinated with the campaign. So:
 *   • The block renders OUTSIDE and BELOW the funding-mix section, in its own
 *     bordered container with its own heading, never inside the money mix.
 *   • "Spent supporting" and "spent opposing" are TWO figures, rendered as two
 *     separate columns. They are never summed, never netted, and never added
 *     to totalRaised or the funding mix. This component computes no sum of the
 *     two — there is no expression in this file that adds one to the other,
 *     and its test asserts that no combined number is ever rendered.
 *   • A plain-language explainer states, in the block itself, that this is
 *     independent spending and not campaign money.
 *
 * Spenders are presented by NAME + the sponsor filed on their own committee
 * record, with sector shown only where one exists — most super PACs are
 * non-connected committees and are rightly unclassified (plan doc, 6b
 * dry-run finding 3).
 * ---------------------------------------------------------------------------
 *
 * HONEST EMPTY: zero rows in a direction renders an explicit "nothing on
 * file" line for that direction, never a blank. The block disappears entirely
 * only when `data` is absent — "we didn't look" (flag off / unresolved
 * candidate), which is a different statement from "there is nothing".
 */

import React from "react";
import { useI18n, formatDollars } from "../VoterChoiceApp";

export interface OutsideSpenderRow {
  committeeId: string;
  name: string;
  /** Sponsor filed by the spending committee; null for non-connected PACs. */
  sponsor: string | null;
  /** Sector only where one exists; null = honestly unclassified. */
  sector: string | null;
  amount: number;
  expenditureCount: number;
  evidenceUrl: string;
}

export interface OutsideSpendingDirectionData {
  /** Dollars in THIS direction only. Never combined with the other. */
  total: number;
  spenders: OutsideSpenderRow[];
  /** Spenders beyond the listed ones — a count of committees, never dollars. */
  hiddenCount: number;
}

export interface OutsideSpendingData {
  electionCycle: string;
  support: OutsideSpendingDirectionData;
  oppose: OutsideSpendingDirectionData;
}

export interface OutsideSpendingProps {
  /** Absent/null ⇒ we didn't look (flag off, unresolved candidate) ⇒ no block. */
  data?: OutsideSpendingData | null;
}

type T = (key: string, vars?: Record<string, unknown>) => string;

/**
 * One direction's figure and its spenders. Rendered twice, once per
 * direction, with each call seeing ONLY its own side's data — the component
 * has no access to the other direction's numbers while rendering a side.
 */
function DirectionColumn({
  direction,
  data,
  t,
}: {
  direction: "support" | "oppose";
  data: OutsideSpendingDirectionData;
  t: T;
}) {
  const labelKey =
    direction === "support"
      ? "outsideSpending.supportLabel"
      : "outsideSpending.opposeLabel";
  const emptyKey =
    direction === "support"
      ? "outsideSpending.supportEmpty"
      : "outsideSpending.opposeEmpty";

  return (
    <div className="os-dir" data-testid={`outside-spending-${direction}`}>
      <div className="os-dir-lab">{t(labelKey)}</div>
      <div
        className="os-dir-amt"
        data-testid={`outside-spending-${direction}-total`}
      >
        {formatDollars(data.total)}
      </div>
      {data.spenders.length === 0 ? (
        <p
          className="sec-note"
          data-testid={`outside-spending-${direction}-empty`}
        >
          {t(emptyKey)}
        </p>
      ) : (
        <>
          {data.spenders.map((spender) => (
            <div className="src" key={spender.committeeId}>
              <span className="src-dot d-unknown" aria-hidden="true" />
              <span className="src-name">{spender.name}</span>
              <span className="src-amt">{formatDollars(spender.amount)}</span>
              <span className="src-pct">
                {t("outsideSpending.filingCount", {
                  count: spender.expenditureCount,
                })}
              </span>
              <div className="src-body">
                <div className="src-agenda">
                  {spender.sponsor
                    ? t("outsideSpending.sponsorFiled", {
                        sponsor: spender.sponsor,
                      })
                    : t("outsideSpending.sponsorNotFiled")}
                </div>
                {/* Sector only where one exists — never invented. */}
                {spender.sector && (
                  <span className="src-tag t-none">{spender.sector}</span>
                )}
                <div className="md-src">
                  <a
                    href={spender.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("outsideSpending.evidenceLink")}
                  </a>
                </div>
              </div>
            </div>
          ))}
          {data.hiddenCount > 0 && (
            <p className="sec-note">
              {t("outsideSpending.hiddenCount", { count: data.hiddenCount })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function OutsideSpending({ data }: OutsideSpendingProps) {
  const { t } = useI18n() as { t: T };
  if (!data) return null;

  return (
    <div className="outside-spend" data-testid="outside-spending">
      <div className="srcs-h">{t("outsideSpending.heading")}</div>
      {/* The explainer is part of the block, not a footnote: a reader must
          not be able to see the figures without the sentence that says whose
          money this is. */}
      <p className="outside-spend-explainer">
        {t("outsideSpending.explainer")}
      </p>
      <div className="os-dirs">
        <DirectionColumn direction="support" data={data.support} t={t} />
        <DirectionColumn direction="oppose" data={data.oppose} t={t} />
      </div>
      <p className="sec-note">{t("outsideSpending.neverSummed")}</p>
    </div>
  );
}
