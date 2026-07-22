"use client";
/**
 * src/prototype/redesign/FundingSources.tsx
 *
 * "Where the big money comes from" — the money-redesign's unified ranked
 * source list (v2 brief §2 Tier B), fusing what FunderBars renders as three
 * separate blocks (mix bar / named issue-PACs / industry breakdown) into one
 * dollar-ranked list. REUSES FunderBars' own data + math — no new data path:
 *   - individual money (small/large) comes from `fundingMix` %s
 *   - issue-PAC rows + their conflict/align tag come straight off
 *     `donorCoalition` via `deriveIssuePacAlignment` (VoterChoiceApp.tsx) —
 *     the exact helper FunderBars itself now calls, so the flag can never
 *     drift between the two surfaces.
 *   - industry rows + the "outside named sectors" remainder use the same
 *     otherPct/otherAmt math FunderBars' industry block already computes.
 *   - the untraced-PAC remainder uses the same namedPacTotal/impliedPacTotal
 *     math as FunderBars' pac-gap caveat (PacGapCaveat renders the prose
 *     version of this same honesty note separately, below this list).
 *
 * Honest-blank: a row only renders when its underlying $ is present; the
 * untraced-PAC / outside-sectors rows only render when their computed
 * remainder is non-trivial (mirrors FunderBars' own thresholds).
 */

import React from "react";
import {
  useI18n,
  formatDollars,
  deriveIssuePacAlignment,
} from "../VoterChoiceApp";
import type { VoteLinkageEntry } from "./delegationData";

interface FundingSourcesProps {
  donorCoalition: any[] | null | undefined;
  totalRaised: number | null | undefined;
  fundingMix:
    | { small: number; large: number; pac: number; cycle?: string }
    | null
    | undefined;
  userIssues: Array<{ canonicalIssue?: string; interpretation: string }>;
  /**
   * Per-entity "did the money vote?" linkage (delegationData.ts
   * `deriveVoteLinkage(seat)`) — keyed by "small"/"large" for those two
   * fixed rows, else the row's own donorCoalition `label` (the same string
   * this component already renders as `r.name`). A parent computes this
   * once per seat and can pass the identical map into a duel column's
   * FundingSources instance unchanged — the lookup and rendering here don't
   * know or care which surface they're in (Frame 7 item 1/2).
   *
   * Omitted (undefined/null) ⇒ no `src-votes` sub-blocks render anywhere,
   * never a blank shell. A row present in the component but absent from the
   * map (e.g. the synthetic "industry-other"/"pac-untraced" remainder rows,
   * which have no single donorCoalition entity behind them to score) simply
   * renders with no sub-block of its own.
   */
  voteLinkage?: Map<string, VoteLinkageEntry> | null;
  /**
   * True only for a candidate with NO roll-call record at all (e.g. a
   * challenger who has never held this office) — every row that would
   * otherwise read "Can't check — agenda untraced" instead reads "No
   * roll-calls exist to check this money against — the influence read
   * starts with their first vote." Has no effect on 'scored'/'small'/
   * 'large' rows. Defaults to false (the ordinary incumbent case).
   */
  noRollCallRecord?: boolean;
}

const VOTE_LINKAGE_LABEL = "Did their money vote?";
const VOTE_LINKAGE_INDIVIDUALS =
  "Nothing to check — individuals don't file lobbying agendas";
const VOTE_LINKAGE_UNTRACED = "Can't check — agenda untraced";
const VOTE_LINKAGE_NO_ROLLCALL =
  "No roll-calls exist to check this money against — the influence read starts with their first vote.";

/**
 * The whiteboard's `src-votes` sub-block (`Voter Choice Whiteboard.html`
 * lines 245-276) — verbatim markup/classes: `.sv-top`/`.sv-lab`, `.mvr-pct`
 * (`.hi` at k/n ≥ ⅔), `.mvr-dots` (`.w` donor's way / `.a` against). No
 * `.mvr-receipt` — GAPS-AND-DATA-AUDIT.md §C2: donor_aggregates carries no
 * dated transactions, so a receipt line can't be built honestly.
 */
function renderVoteLinkage(
  entry: VoteLinkageEntry | undefined,
  noRollCallRecord: boolean,
): React.ReactNode {
  if (!entry) return null;

  if (entry.kind === "scored") {
    const hi = entry.n > 0 && entry.k * 3 >= entry.n * 2;
    return (
      <div className="src-votes">
        <div className="sv-top">
          <span className="sv-lab">{VOTE_LINKAGE_LABEL}</span>
          <span className={"mvr-pct" + (hi ? " hi" : "")}>
            {`Voted their way ${entry.k} of ${entry.n}`}
          </span>
        </div>
        <div className="mvr-dots">
          {entry.dots.map((d, i) => (
            <i key={i} className={d} />
          ))}
        </div>
      </div>
    );
  }

  if (entry.kind === "small" || entry.kind === "large") {
    return (
      <div className="src-votes">
        <div className="sv-top">
          <span className="sv-lab">{VOTE_LINKAGE_LABEL}</span>
          <span className="mvr-pct">{VOTE_LINKAGE_INDIVIDUALS}</span>
        </div>
      </div>
    );
  }

  // 'unscored' | 'industry' — untraced agenda, or (noRollCallRecord) a
  // candidate with no votes yet to check the money against.
  return (
    <div className="src-votes">
      <div className="sv-top">
        <span className="sv-lab">{VOTE_LINKAGE_LABEL}</span>
        <span className="mvr-pct">
          {noRollCallRecord ? VOTE_LINKAGE_NO_ROLLCALL : VOTE_LINKAGE_UNTRACED}
        </span>
      </div>
    </div>
  );
}

/**
 * Cheap parent-side check — RepCard needs to know whether at least one
 * `src-votes` dot strip actually rendered before showing the `.mvc-key`
 * legend (Frame 7 §2 item 3). Pure and render-independent so a caller can
 * check it up front rather than threading a render callback through.
 */
export function hasScoredVoteLinkage(
  voteLinkage: Map<string, VoteLinkageEntry> | null | undefined,
): boolean {
  if (!voteLinkage) return false;
  for (const entry of voteLinkage.values()) {
    if (entry.kind === "scored") return true;
  }
  return false;
}

type Row = {
  key: string;
  dotClass: string;
  name: string;
  amount: number;
  pctLabel: string;
  agenda: string;
  tagClass: string | null;
  tagLabel: string | null;
};

export function FundingSources({
  donorCoalition,
  totalRaised,
  fundingMix,
  userIssues,
  voteLinkage,
  noRollCallRecord = false,
}: FundingSourcesProps) {
  const { t } = useI18n() as {
    t: (key: string, vars?: Record<string, unknown>) => string;
  };
  if (
    !donorCoalition ||
    !fundingMix ||
    typeof totalRaised !== "number" ||
    totalRaised <= 0
  )
    return null;

  const issuePacs = donorCoalition.filter((s) => s && s.isIssuePAC);
  const industries = donorCoalition.filter((s) => s && !s.isIssuePAC);
  const rows: Row[] = [];

  if (fundingMix.small > 0) {
    const amount = Math.round(totalRaised * (fundingMix.small / 100));
    rows.push({
      key: "small",
      dotClass: "d-people",
      name: t("fundingSources.smallDonorsName"),
      amount,
      pctLabel: t("fundingSources.pctOfAllMoney", { pct: fundingMix.small }),
      agenda: t("fundingSources.smallDonorsAgenda"),
      tagClass: "t-none",
      tagLabel: t("fundingSources.tagNone"),
    });
  }
  if (fundingMix.large > 0) {
    const amount = Math.round(totalRaised * (fundingMix.large / 100));
    rows.push({
      key: "large",
      dotClass: "d-people",
      name: t("fundingSources.largeDonorsName"),
      amount,
      pctLabel: t("fundingSources.pctOfAllMoney", { pct: fundingMix.large }),
      agenda: t("fundingSources.largeDonorsAgenda"),
      tagClass: "t-none",
      tagLabel: t("fundingSources.tagNone"),
    });
  }

  issuePacs.forEach((p, i) => {
    const { userIssue, showAlignment, conflictsWithUser } =
      deriveIssuePacAlignment(p, userIssues);
    const rank = userIssue
      ? userIssues.findIndex((iss) => iss === userIssue) + 1
      : null;
    const pct =
      typeof totalRaised === "number" && totalRaised > 0
        ? Math.round((p.amount / totalRaised) * 100)
        : null;
    let tagClass: string | null = "t-none";
    let tagLabel: string | null = t("fundingSources.tagNone");
    let dotClass = "d-pac";
    if (showAlignment && rank) {
      if (conflictsWithUser) {
        tagClass = "t-conflict";
        tagLabel = t("fundingSources.tagConflict", {
          rank,
          issue: userIssue.interpretation,
        });
        dotClass = "d-pac";
      } else {
        tagClass = "t-align";
        tagLabel = t("fundingSources.tagAlign", {
          rank,
          issue: userIssue.interpretation,
        });
        dotClass = "d-good";
      }
    }
    rows.push({
      key: "pac-" + i,
      dotClass,
      name: p.label,
      amount: p.amount || 0,
      pctLabel: pct !== null ? t("fundingSources.pctOfAllMoney", { pct }) : "",
      agenda: p.advocates || p.fullName || p.label,
      tagClass,
      tagLabel,
    });
  });

  industries.forEach((d, i) => {
    rows.push({
      key: "ind-" + i,
      dotClass: "d-neutral",
      name: d.label,
      amount: d.amount || 0,
      pctLabel:
        typeof d.percent === "number"
          ? t("fundingSources.pctOfAllMoney", { pct: d.percent })
          : "",
      agenda: t("fundingSources.industryAgenda"),
      tagClass: "t-none",
      tagLabel: t("fundingSources.tagNone"),
    });
  });

  // Industries' own uncovered remainder — same math as FunderBars' industry block.
  const namedIndustryPct = industries.reduce((s, d) => s + (d.percent || 0), 0);
  const namedIndustryAmt = industries.reduce((s, d) => s + (d.amount || 0), 0);
  const otherIndustryPct = Math.max(0, 100 - namedIndustryPct);
  const otherIndustryAmt = Math.max(0, totalRaised - namedIndustryAmt);
  if (industries.length > 0 && otherIndustryPct >= 2) {
    rows.push({
      key: "industry-other",
      dotClass: "d-unknown",
      name: t("funderBars.outsideNamedSectors"),
      amount: otherIndustryAmt,
      pctLabel: t("fundingSources.pctOfAllMoney", { pct: otherIndustryPct }),
      agenda: t("fundingSources.outsideNamedSectorsAgenda"),
      tagClass: "t-none",
      tagLabel: t("fundingSources.tagNone"),
    });
  }

  // Untraced-PAC remainder — same math as PacGapCaveat's prose version.
  const namedPacTotal = issuePacs.reduce((s, p) => s + (p.amount || 0), 0);
  const impliedPacTotal = Math.round(totalRaised * (fundingMix.pac / 100));
  const uncatPacTotal = Math.max(0, impliedPacTotal - namedPacTotal);
  const pctIdentified =
    impliedPacTotal > 0
      ? Math.round((namedPacTotal / impliedPacTotal) * 100)
      : null;
  if (
    impliedPacTotal > 0 &&
    (pctIdentified === null || pctIdentified < 100) &&
    uncatPacTotal > 0
  ) {
    const untracedPct = Math.round((uncatPacTotal / totalRaised) * 100);
    if (untracedPct >= 1) {
      rows.push({
        key: "pac-untraced",
        dotClass: "d-unknown",
        name: t("fundingSources.untracedPacsName"),
        amount: uncatPacTotal,
        pctLabel: t("fundingSources.pctOfAllMoney", { pct: untracedPct }),
        agenda: t("fundingSources.untracedPacsAgenda"),
        tagClass: "t-none",
        tagLabel: t("fundingSources.tagUnknown"),
      });
    }
  }

  rows.sort((a, b) => b.amount - a.amount);
  const maxAmount = Math.max(...rows.map((r) => r.amount), 1);

  return (
    <div className="srcs">
      <div className="srcs-h">{t("fundingSources.heading")}</div>
      <div className="srcs-sub">{t("fundingSources.subheading")}</div>
      {rows.map((r) => {
        const linkageKey =
          r.key === "small" || r.key === "large" ? r.key : r.name;
        const linkage = voteLinkage?.get(linkageKey);
        return (
          <div className="src" key={r.key}>
            <span className={"src-dot " + r.dotClass} aria-hidden="true" />
            <span className="src-name">{r.name}</span>
            <span className="src-amt">{formatDollars(r.amount)}</span>
            {r.pctLabel && <span className="src-pct">{r.pctLabel}</span>}
            <div className="src-body">
              <div className="src-agenda">{r.agenda}</div>
              {r.tagLabel && (
                <span className={"src-tag " + r.tagClass}>{r.tagLabel}</span>
              )}
              {voteLinkage && renderVoteLinkage(linkage, noRollCallRecord)}
            </div>
            <div className="src-proportion">
              <i
                className={r.dotClass}
                style={{ width: (r.amount / maxAmount) * 100 + "%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
