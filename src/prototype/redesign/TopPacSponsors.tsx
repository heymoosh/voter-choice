"use client";
/**
 * src/prototype/redesign/TopPacSponsors.tsx
 *
 * Part 6a display block — "Top PACs and their sponsors". Names the PAC
 * committees that gave directly to this candidate, each with the sponsor the
 * committee itself declares on its FEC filing (CONNECTED_ORG), the sector we
 * inferred from that sponsor when we could, the dollars, and a link to the
 * filing the claim rests on.
 *
 * A BREAKDOWN, NOT A NEW TOTAL. Every dollar here is already inside the
 * "PACs" slice of the funding mix rendered above it (plan doc, Part 6a:
 * "read paths must never re-add them to totals"). The component therefore
 * shows per-PAC amounts only, prints no subtotal, and says so in its
 * subheading — so no reader (and no future edit) treats it as extra money.
 * Its data path (src/lib/server/pac-sponsors.ts) has no total field at all.
 *
 * HONEST EMPTY: an empty `sponsors` array renders an explicit "nothing on
 * file" line, never a blank. The whole block renders nothing only when
 * `data` is absent — which means "we didn't look" (flag off, or no resolved
 * candidate), a different statement from "there is nothing".
 *
 * Styling reuses the money section's existing `.srcs` / `.src` list classes
 * (FundingSources.tsx) — same surface, same visual language.
 */

import React from "react";
import { useI18n, formatDollars } from "../VoterChoiceApp";

export interface PacSponsorRow {
  committeeId: string;
  name: string;
  /** CONNECTED_ORG from the committee's own filing; null when none is filed. */
  sponsor: string | null;
  /** Our sector inference; null = honestly unclassified, shown as nothing. */
  sector: string | null;
  amount: number;
  transactionCount: number;
  evidenceUrl: string;
  /**
   * Curation state the read path carries through: 'auto' | 'verified'
   * ('rejected' never reaches a display surface). Not rendered today — a
   * "verified" marker is a decision for after the first curation pass, not
   * something to invent here.
   */
  status?: string;
}

export interface TopPacSponsorsData {
  electionCycle: string;
  sponsors: PacSponsorRow[];
  /** PACs beyond the listed ones — a count of committees, never dollars. */
  hiddenCount: number;
}

export interface TopPacSponsorsProps {
  /** Absent/null ⇒ we didn't look (flag off, unresolved candidate) ⇒ no block. */
  data?: TopPacSponsorsData | null;
}

export function TopPacSponsors({ data }: TopPacSponsorsProps) {
  const { t } = useI18n() as {
    t: (key: string, vars?: Record<string, unknown>) => string;
  };
  if (!data) return null;

  const { sponsors, hiddenCount } = data;

  return (
    <div
      className="srcs"
      data-testid="top-pac-sponsors"
      style={{ marginTop: 24 }}
    >
      <div className="srcs-h">{t("topPacSponsors.heading")}</div>
      <div className="srcs-sub">{t("topPacSponsors.subheading")}</div>

      {sponsors.length === 0 ? (
        <p className="sec-note" data-testid="top-pac-sponsors-empty">
          {t("topPacSponsors.empty")}
        </p>
      ) : (
        <>
          {sponsors.map((pac) => (
            <div className="src" key={pac.committeeId}>
              <span className="src-dot d-pac" aria-hidden="true" />
              <span className="src-name">{pac.name}</span>
              <span className="src-amt">{formatDollars(pac.amount)}</span>
              <span className="src-pct">
                {t("topPacSponsors.contributionCount", {
                  count: pac.transactionCount,
                })}
              </span>
              <div className="src-body">
                <div className="src-agenda">
                  {pac.sponsor
                    ? t("topPacSponsors.sponsorFiled", { sponsor: pac.sponsor })
                    : t("topPacSponsors.sponsorNotFiled")}
                </div>
                {/* Sector only where one exists — never invented. */}
                {pac.sector && (
                  <span className="src-tag t-none">{pac.sector}</span>
                )}
                <div className="md-src">
                  <a
                    href={pac.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("topPacSponsors.evidenceLink")}
                  </a>
                </div>
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="sec-note" data-testid="top-pac-sponsors-hidden">
              {t("topPacSponsors.hiddenCount", { count: hiddenCount })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
