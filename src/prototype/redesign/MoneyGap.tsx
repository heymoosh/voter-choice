"use client";
/**
 * src/prototype/redesign/MoneyGap.tsx
 *
 * "Raised vs. the median" — the money-gap primitive, ported from the reviewed
 * design (design-handoff/design-session/screens-funding.jsx + funding.css).
 *
 * Three surfaces, one shared scale:
 *   - <MedianChip>   the collapsed glance on a money line / card row
 *   - <MoneyGapScale> the full field/scale that REPLACES the flat
 *                     "≈3× the median House campaign" string in the funder
 *                     disclosure
 *   - <MoneyGapH2H>  the head-to-head money comparison (incumbent vs. challenger)
 *
 * Honest-state discipline (NON-NEGOTIABLE): when there is no `PeerComparison`
 * baseline, the chip shows the dollar amount only and the scale/H2H hide the
 * comparison. Never a fabricated baseline, multiple, or scale.
 *
 * Neutral palette: gold = "how much more" (above the median); muted navy =
 * "raised". Keep/replace red/green mean alignment, never money.
 *
 * Styles live in public/redesign2.css (`.mgap*`, `.median-chip*`) — the
 * redesign's existing CSS system; this component invents no styling mechanism.
 */

import React, { useState } from "react";
import {
  type PeerComparison,
  peerBand,
  formatUsd,
  formatMultiple,
} from "./peerComparison";

type PipClass = "dem" | "rep" | "ind";

const bandLabel = (b: ReturnType<typeof peerBand>): string =>
  b === "above" ? "above median" : b === "below" ? "running lean" : "≈ median";

// ---------------------------------------------------------------------------
// MedianChip — the collapsed glance
// ---------------------------------------------------------------------------

export interface MedianChipProps {
  /** The candidate's own raised total (dollars). */
  raised: number | null | undefined;
  /** Null ⇒ no baseline; show $ only (or the honest "no median" pill). */
  peer: PeerComparison | null;
}

/**
 * The inline chip as it sits on a card money line.
 * - peer present  → multiple + a tiny bar with a median tick.
 * - peer null but raised present → dollar amount only (honest, no baseline).
 * - nothing       → the "no median yet" pill.
 */
export function MedianChip({ raised, peer }: MedianChipProps) {
  if (peer === null) {
    if (typeof raised === "number" && raised > 0) {
      // Honest dollar-only glance — NO fabricated baseline / multiple / scale.
      return (
        <span className="median-chip dollar-only" title={formatUsd(raised)}>
          <b>{formatUsd(raised)}</b> raised
        </span>
      );
    }
    return (
      <span className="median-chip none">No median yet · too few filed</span>
    );
  }

  const m = peer.multiple;
  const b = peerBand(m);
  // Bar fill maps the multiple onto a 0–3× visual range (clamped), with a tick
  // at the median (1× sits at 1/3 of the bar — matches the design's 33%).
  const fillPct = Math.min((m / 3) * 100, 100);
  return (
    <span
      className={"median-chip " + b}
      title={
        formatUsd(raised) + " · " + formatMultiple(m) + " the typical campaign"
      }
    >
      <span className="mc-bar">
        <i style={{ width: fillPct + "%" }} />
        <span className="mc-tick" />
      </span>
      <span>
        <b>{formatMultiple(m)}</b> median
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared scale internals — axis, one row
// ---------------------------------------------------------------------------

export interface GapRowDatum {
  id: string;
  name: string;
  raised: number;
  pip: PipClass;
  you?: boolean;
  tag?: string;
}

interface AxisProps {
  axisMax: number;
  medianPct: number;
  median: number;
  medianLabel: string;
}

function MedianAxis({ axisMax, medianPct, median, medianLabel }: AxisProps) {
  return (
    <div className="mgap-axis">
      <span className="mgap-zero">$0</span>
      <div className="mgap-medflag" style={{ left: medianPct + "%" }}>
        <span className="mf-lab">MEDIAN</span>
        <span className="mf-amt">{formatUsd(median)}</span>
        <span className="mf-sub">{medianLabel}</span>
      </div>
      <span className="mgap-max">{formatUsd(axisMax)}</span>
    </div>
  );
}

interface GapRowProps {
  c: GapRowDatum;
  axisMax: number;
  medianPct: number;
  median: number;
}

function GapRow({ c, axisMax, medianPct, median }: GapRowProps) {
  const m = c.raised / median;
  const b = peerBand(m);
  const barPct = Math.max((c.raised / axisMax) * 100, 1.4);
  const overW = Math.max(barPct - medianPct, 0);
  const aria =
    `${c.name} raised ${formatUsd(c.raised)}, ` +
    (b === "below"
      ? "about " + formatMultiple(m) + " of"
      : formatMultiple(m) + " times") +
    ` the median of ${formatUsd(median)}.`;
  return (
    <div className="mgap-row" role="group" aria-label={aria}>
      <div className="mgap-lab">
        <div className="mgap-nm">
          <span className={"pip " + c.pip} aria-hidden="true" />
          {c.name}
          {c.you && <span className="you">You</span>}
        </div>
        {c.tag && (
          <div className="mgap-tag">
            {c.tag} · {formatUsd(c.raised)}
          </div>
        )}
      </div>
      <div className="mgap-track">
        <div
          className={"mgap-bar" + (b === "below" ? " is-below" : "")}
          style={{ width: barPct + "%" }}
        />
        {b !== "below" && overW > 0.5 && (
          <div
            className="mgap-over"
            style={{ left: medianPct + "%", width: overW + "%" }}
          />
        )}
        {b === "below" && (
          <div
            className="mgap-rem"
            style={{ left: barPct + "%", width: medianPct - barPct + "%" }}
          />
        )}
        <div className="mgap-medline" style={{ left: medianPct + "%" }} />
      </div>
      <div className={"mgap-read is-" + b}>
        <b>{formatMultiple(m)}</b>
        <span>{bandLabel(b)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MoneyGapScale — the full field/scale (replaces the flat peer string)
// ---------------------------------------------------------------------------

export interface MoneyGapScaleProps {
  /** The "you" row (the rep/candidate this card is about). */
  subject: { name: string; raised: number; pip: PipClass };
  /** Other campaigns for the same seat (optional — incumbent card may be alone). */
  field?: Array<{ name: string; raised: number; pip: PipClass; tag?: string }>;
  peer: PeerComparison | null;
}

/**
 * The whole-field scale. Renders nothing when there is no baseline — the caller
 * is expected to fall back to the plain dollar string in that case.
 */
export function MoneyGapScale({ subject, field, peer }: MoneyGapScaleProps) {
  if (peer === null) return null;

  const rows: GapRowDatum[] = [
    {
      id: "subject",
      name: subject.name,
      raised: subject.raised,
      pip: subject.pip,
      you: true,
    },
    ...(field ?? []).map((c, i) => ({
      id: "f" + i,
      name: c.name,
      raised: c.raised,
      pip: c.pip,
      tag: c.tag,
    })),
  ];

  const maxRaised = Math.max(...rows.map((r) => r.raised), peer.medianRaised);
  const axisMax = maxRaised * 1.04;
  const medianPct = (peer.medianRaised / axisMax) * 100;
  const medianLabel = "the typical " + peer.office + " campaign";

  return (
    <div className="mgap" data-palette="white">
      <MedianAxis
        axisMax={axisMax}
        medianPct={medianPct}
        median={peer.medianRaised}
        medianLabel={medianLabel}
      />
      <div className="mgap-plot">
        {rows.map((c) => (
          <GapRow
            key={c.id}
            c={c}
            axisMax={axisMax}
            medianPct={medianPct}
            median={peer.medianRaised}
          />
        ))}
      </div>
      <div className="mgap-key">
        <span>
          <i className="base" />
          Raised, up to the median
        </span>
        <span>
          <i className="over" />
          How much more — above the median
        </span>
        <span>
          <i className="line" />
          Median · the typical campaign
        </span>
      </div>
      <div className="mgap-src">
        Baseline · {peer.source} · {peer.cycle}.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MoneyGapH2H — the head-to-head money comparison
// ---------------------------------------------------------------------------

export interface H2HCandidate {
  id: string;
  name: string;
  raised: number;
  pip: PipClass;
  pac?: number;
  small?: number;
}

export interface MoneyGapH2HProps {
  incumbent: H2HCandidate;
  challengers: H2HCandidate[];
  peer: PeerComparison | null;
  onKeep?: () => void;
  onReplace?: (challengerId: string) => void;
}

const lastName = (n: string): string => n.split(" ").slice(-1)[0] ?? n;

/**
 * The head-to-head money gap (the compare/duel flow). Incumbent vs. one
 * challenger on a shared scale, with a challenger switcher. Lead stat is the
 * incumbent-vs-challenger ratio; the median scale gives the absolute context.
 *
 * Honest-state: the median scale is hidden when `peer` is null; the raw ratio
 * (incumbent ÷ challenger) still renders, since it needs no median baseline.
 */
export function MoneyGapH2H({
  incumbent,
  challengers,
  peer,
  onKeep,
  onReplace,
}: MoneyGapH2HProps) {
  const [sel, setSel] = useState<string>(challengers[0]?.id ?? "");
  const ch = challengers.find((c) => c.id === sel) ?? challengers[0];

  if (!ch) return null;

  const ratio = ch.raised > 0 ? incumbent.raised / ch.raised : Infinity;
  const ratioStr = !Number.isFinite(ratio)
    ? "—"
    : ratio >= 10
      ? Math.round(ratio) + "×"
      : ratio.toFixed(1).replace(/\.0$/, "") + "×";

  const incMult = peer
    ? formatMultiple(incumbent.raised / peer.medianRaised)
    : null;

  return (
    <div className="h2hm" data-palette="white">
      <div className="h2hm-top">
        <div>
          <h2>The money gap</h2>
          <div className="ctx">your rep vs. who&apos;s running</div>
        </div>
        <div className="h2hm-switch">
          {challengers.map((c) => (
            <button
              key={c.id}
              className={sel === c.id ? "on" : ""}
              onClick={() => setSel(c.id)}
            >
              <span className={"pip " + c.pip} aria-hidden="true" />
              {lastName(c.name)}
              <span className="p">{formatUsd(c.raised)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h2hm-ratio">
        <div className="big">
          {ratioStr}
          <small> more</small>
        </div>
        <div className="txt">
          <b>{incumbent.name}</b> has out-raised <b>{ch.name}</b> by {ratioStr}{" "}
          this cycle
          {incMult ? (
            <>
              {" "}
              — and sits at{" "}
              <b>
                {incMult} the typical {peer!.office} campaign
              </b>
            </>
          ) : null}
          . That gap, more than any single position, is what an incumbent&apos;s
          war chest buys: ads, staff, name recognition.
        </div>
      </div>

      {peer && (
        <MoneyGapScale
          subject={{
            name: incumbent.name,
            raised: incumbent.raised,
            pip: incumbent.pip,
          }}
          field={[
            { name: ch.name, raised: ch.raised, pip: ch.pip, tag: ch.name },
          ]}
          peer={peer}
        />
      )}

      <div className="h2hm-foot">
        <div className="h2hm-pac">
          {typeof incumbent.pac === "number" && (
            <div className="blk">
              <span className="v">{incumbent.pac}% PAC</span>
              <span className="k">
                {lastName(incumbent.name)} · {formatUsd(incumbent.raised)}
              </span>
            </div>
          )}
          <span className="vs">vs</span>
          {typeof ch.pac === "number" && (
            <div className="blk">
              <span className="v">{ch.pac}% PAC</span>
              <span className="k">
                {lastName(ch.name)} · {formatUsd(ch.raised)}
                {typeof ch.small === "number" ? ` · ${ch.small}% small` : ""}
              </span>
            </div>
          )}
        </div>
        <div className="h2hm-actions">
          <button className="h2hm-keepbtn" onClick={onKeep}>
            Keep {lastName(incumbent.name)}
          </button>
          <button className="h2hm-repbtn" onClick={() => onReplace?.(ch.id)}>
            Replace with {lastName(ch.name)} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
