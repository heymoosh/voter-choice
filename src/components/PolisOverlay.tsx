"use client";

import React, { useMemo } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import { PrivacyCallout } from "./PrivacyCallout";

/* ──────────────────────────────────────────────────────────────
 * PolisOverlay — polis-style scatter visualization.
 *
 * Renders one of three states:
 *   1. Loading — spinner/skeleton.
 *   2. Threshold not met — placeholder with unlock counter.
 *   3. Threshold met — SVG scatter + consensus panel + privacy callout.
 *
 * NO network calls. Data is passed via props; the parent fetches
 * from /api/polis and passes the result here.
 * ────────────────────────────────────────────────────────────── */

/* ── Types ───────────────────────────────────────────────────── */

export interface PolisData {
  scope: "county" | "state";
  sampleSize: number;
  thresholdMet: boolean;
  countToUnlock?: number;
  dots: Array<{ x: number; y: number; primary: string }>;
  you: { x: number; y: number } | null;
  consensus: Array<{
    canonicalIssue: string;
    issueLabel: string;
    percent: number;
  }>;
}

export interface PolisOverlayProps {
  data: PolisData;
  loading?: boolean;
  countyName?: string;
  stateName?: string;
}

/* ── Constants ───────────────────────────────────────────────── */

const VIEWBOX_W = 400;
const VIEWBOX_H = 300;
const PADDING = 24;
const DOT_R = 2.5; // 5px diameter
const YOU_HALO_R = 12;
const YOU_DOT_R = 6;
const MAX_STAGGER_MS = 900;
const YOU_EXTRA_DELAY_MS = 100;
const CONSENSUS_MAX_ITEMS = 5;

/* ── Primary color mapping ───────────────────────────────────── */

function primaryColor(primary: string): string {
  const p = primary.toUpperCase();
  if (p === "DEM" || p === "DEMOCRATIC") return "#3B82F6"; // blue-500
  if (p === "REP" || p === "REPUBLICAN") return "#EF4444"; // red-500
  return "#9CA3AF"; // gray-400 — OPEN / GENERAL / unknown
}

/* ── Scale helper: maps data values into SVG viewBox coords ─── */

function buildScale(
  dots: Array<{ x: number; y: number }>,
  youDot: { x: number; y: number } | null,
) {
  const allX = dots.map((d) => d.x);
  const allY = dots.map((d) => d.y);
  if (youDot) {
    allX.push(youDot.x);
    allY.push(youDot.y);
  }

  if (allX.length === 0) {
    return {
      scaleX: (v: number) => VIEWBOX_W / 2 + v,
      scaleY: (v: number) => VIEWBOX_H / 2 + v,
    };
  }

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const plotW = VIEWBOX_W - PADDING * 2;
  const plotH = VIEWBOX_H - PADDING * 2;

  return {
    scaleX: (v: number) => PADDING + ((v - minX) / rangeX) * plotW,
    scaleY: (v: number) => PADDING + ((v - minY) / rangeY) * plotH,
  };
}

/* ── CSS keyframes injected once ────────────────────────────── */

const KEYFRAMES_ID = "polis-overlay-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes polis-dot-fadein {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes polis-you-pulse {
      0%, 100% { opacity: 0.3; r: ${YOU_HALO_R}; }
      50%       { opacity: 0.5; r: ${YOU_HALO_R + 3}; }
    }
  `;
  document.head.appendChild(style);
}

/* ── Loading state ───────────────────────────────────────────── */

function LoadingState({ t }: { t: (typeof translations)["en"]["research"] }) {
  return (
    <div
      data-testid="polis-overlay-loading"
      className="flex flex-col items-center justify-center gap-3 py-12 text-on-surface-muted"
    >
      {/* Spinner */}
      <svg
        className="animate-spin"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4"
          strokeDashoffset="10"
        />
      </svg>
      <p className="text-sm">{t.polisOverlayLoading}</p>
    </div>
  );
}

/* ── Threshold-not-met placeholder ──────────────────────────── */

function LockedState({
  t,
  scopeName,
  countToUnlock,
  sampleSize,
}: {
  t: (typeof translations)["en"]["research"];
  scopeName: string;
  countToUnlock?: number;
  sampleSize: number;
}) {
  return (
    <div data-testid="polis-overlay-locked" className="space-y-4">
      {/* Heading */}
      <div className="space-y-1">
        <h3
          data-testid="polis-overlay-locked-heading"
          className="text-base font-bold text-on-surface leading-snug"
        >
          {t.polisOverlayLockedHeading(scopeName)}
        </h3>
        {countToUnlock != null && (
          <p
            data-testid="polis-overlay-unlock-counter"
            className="text-sm text-on-surface-muted"
          >
            {t.polisOverlayUnlockCounter(countToUnlock)}
          </p>
        )}
      </div>

      {/* Privacy callout */}
      <PrivacyCallout variant="inline" />

      {/* Sample footer */}
      <p className="text-[11px] text-on-surface-muted">
        {t.polisOverlaySampleFooter(sampleSize, scopeName)}
      </p>
    </div>
  );
}

/* ── Primary shape mapping (colorblind-safe parallel cue) ───── */

/**
 * Returns the SVG shape type for a primary lane.
 * DEM = circle, REP = diamond (square rotated 45°), OPEN/GENERAL = triangle.
 * "You" is always a circle regardless of primary.
 */
function primaryShape(primary: string): "circle" | "diamond" | "triangle" {
  const p = primary.toUpperCase();
  if (p === "DEM" || p === "DEMOCRATIC") return "circle";
  if (p === "REP" || p === "REPUBLICAN") return "diamond";
  return "triangle";
}

/**
 * Render one aggregate dot using the shape for its primary lane.
 * r is the effective radius (used as half-size for polygon shapes).
 */
function DotShape({
  cx,
  cy,
  r,
  color,
  primary,
  delay,
  primaryLabel,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  primary: string;
  delay: string;
  primaryLabel: string;
}) {
  const shape = primaryShape(primary);
  const animStyle = {
    animation: `polis-dot-fadein 400ms ease-out ${delay} both`,
  };
  const title = <title>{`Aggregate voter dot, ${primaryLabel} primary`}</title>;

  if (shape === "diamond") {
    // Diamond: square rotated 45° — polygon with 4 points at cardinal positions
    const pts = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
    return (
      <polygon
        data-testid="polis-dot"
        points={pts}
        fill={color}
        fillOpacity={0.7}
        style={animStyle}
      >
        {title}
      </polygon>
    );
  }

  if (shape === "triangle") {
    // Equilateral-ish triangle pointing up
    const pts = `${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`;
    return (
      <polygon
        data-testid="polis-dot"
        points={pts}
        fill={color}
        fillOpacity={0.7}
        style={animStyle}
      >
        {title}
      </polygon>
    );
  }

  // Default: circle (DEM)
  return (
    <circle
      data-testid="polis-dot"
      cx={cx}
      cy={cy}
      r={r}
      fill={color}
      fillOpacity={0.7}
      style={animStyle}
    >
      {title}
    </circle>
  );
}

/* ── Scatter SVG ─────────────────────────────────────────────── */

function ScatterPlot({
  dots,
  you,
  t,
}: {
  dots: Array<{ x: number; y: number; primary: string }>;
  you: { x: number; y: number } | null;
  t: (typeof translations)["en"]["research"];
}) {
  // Ensure keyframes are injected client-side
  React.useEffect(() => {
    ensureKeyframes();
  }, []);

  const { scaleX, scaleY } = useMemo(() => buildScale(dots, you), [dots, you]);

  // Compute a stable random delay for each dot index
  const dotDelays = useMemo(
    () =>
      dots.map((_, i) => {
        // Deterministic-ish: spread evenly then add a small jitter
        const base = (i / Math.max(dots.length - 1, 1)) * MAX_STAGGER_MS;
        // Clamp to [0, MAX_STAGGER_MS - YOU_EXTRA_DELAY_MS] so "you" is always last
        return Math.min(base, MAX_STAGGER_MS - YOU_EXTRA_DELAY_MS - 1);
      }),
    [dots],
  );

  const youDelay = MAX_STAGGER_MS;

  // Determine which primaries appear in the data (for legend visibility)
  const presentPrimaries = useMemo(() => {
    const set = new Set(dots.map((d) => d.primary.toUpperCase()));
    return {
      hasDem: set.has("DEM") || set.has("DEMOCRATIC"),
      hasRep: set.has("REP") || set.has("REPUBLICAN"),
      hasOpen: set.has("OPEN") || set.has("GENERAL"),
    };
  }, [dots]);

  return (
    <>
      <svg
        data-testid="polis-scatter-svg"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Scatter plot showing how county voters are distributed by issue priorities"
      >
        {/* Aggregate dots */}
        {dots.map((dot, i) => {
          const cx = scaleX(dot.x);
          const cy = scaleY(dot.y);
          const color = primaryColor(dot.primary);
          const delay = `${dotDelays[i]}ms`;
          const primaryLabel =
            dot.primary.charAt(0).toUpperCase() +
            dot.primary.slice(1).toLowerCase();

          return (
            <DotShape
              key={i}
              cx={cx}
              cy={cy}
              r={DOT_R}
              color={color}
              primary={dot.primary}
              delay={delay}
              primaryLabel={primaryLabel}
            />
          );
        })}

        {/* "You" dot — always circle with halo, regardless of primary */}
        {you && (
          <g
            data-testid="polis-you-dot"
            style={{
              animation: `polis-dot-fadein 400ms ease-out ${youDelay}ms both`,
            }}
          >
            {/* Halo */}
            <circle
              cx={scaleX(you.x)}
              cy={scaleY(you.y)}
              r={YOU_HALO_R}
              fill="currentColor"
              fillOpacity={0.3}
              className="text-primary"
              style={{
                animation: `polis-you-pulse 2.5s ease-in-out ${youDelay + 400}ms infinite`,
              }}
              aria-hidden="true"
            />
            {/* Solid dot */}
            <circle
              cx={scaleX(you.x)}
              cy={scaleY(you.y)}
              r={YOU_DOT_R}
              fill="currentColor"
              className="text-primary"
            >
              <title>You</title>
            </circle>
            {/* Label */}
            <text
              x={scaleX(you.x) + YOU_DOT_R + 4}
              y={scaleY(you.y) - YOU_DOT_R - 2}
              fontSize="11"
              fontWeight="600"
              fill="currentColor"
              className="text-primary"
              aria-hidden="true"
            >
              {t.polisOverlayYouLabel}
            </text>
          </g>
        )}
      </svg>

      {/* Shape legend — colorblind-safe parallel cue */}
      {dots.length > 0 && (
        <div
          data-testid="polis-shape-legend"
          className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-muted"
          aria-label="Primary lane shape key"
        >
          {presentPrimaries.hasDem && (
            <span data-testid="polis-legend-dem">
              ● {t.polisOverlayLegendDemocratic}
            </span>
          )}
          {presentPrimaries.hasRep && (
            <span data-testid="polis-legend-rep">
              ◆ {t.polisOverlayLegendRepublican}
            </span>
          )}
          {presentPrimaries.hasOpen && (
            <span data-testid="polis-legend-open">
              ▲ {t.polisOverlayLegendOpen}
            </span>
          )}
        </div>
      )}
    </>
  );
}

/* ── Consensus panel ─────────────────────────────────────────── */

function ConsensusPanel({
  consensus,
  t,
}: {
  consensus: Array<{
    canonicalIssue: string;
    issueLabel: string;
    percent: number;
  }>;
  t: (typeof translations)["en"]["research"];
}) {
  const topItems = consensus.slice(0, CONSENSUS_MAX_ITEMS);

  return (
    <div data-testid="polis-consensus-panel" className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-on-surface">
          {t.polisOverlayConsensusHeading}
        </h4>
        <p className="text-[11px] text-on-surface-muted mt-0.5">
          {t.polisOverlayConsensusSubtitle}
        </p>
      </div>

      <ul className="space-y-2" aria-label="Top shared priorities">
        {topItems.map((item) => (
          <li key={item.canonicalIssue} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-on-surface">
                {item.issueLabel}
              </span>
              <span
                data-testid={`consensus-percent-${item.canonicalIssue}`}
                className="tabular-nums text-on-surface-muted"
              >
                {item.percent}%
              </span>
            </div>
            {/* Bar */}
            <div className="h-1.5 rounded-full bg-outline-variant/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${Math.min(item.percent, 100)}%` }}
                aria-hidden="true"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Threshold-met viz ───────────────────────────────────────── */

function UnlockedState({
  t,
  data,
  scopeName,
}: {
  t: (typeof translations)["en"]["research"];
  data: PolisData;
  scopeName: string;
}) {
  return (
    <div data-testid="polis-overlay-unlocked" className="space-y-5">
      {/* Heading */}
      <h3 className="text-base font-bold text-on-surface leading-snug">
        {t.polisOverlayHeading(scopeName)}
      </h3>

      {/* Scatter */}
      <ScatterPlot dots={data.dots} you={data.you} t={t} />

      {/* Honest framing */}
      <p className="text-[11px] italic text-on-surface-muted">
        {t.polisOverlayShapeFraming}
      </p>

      {/* "You" absent caption */}
      {data.you === null && (
        <p
          data-testid="polis-no-you-caption"
          className="text-xs text-on-surface-muted border-l-2 border-outline-variant/40 pl-3"
        >
          {t.polisOverlayNoYouCaption}
        </p>
      )}

      {/* Consensus panel */}
      {data.consensus.length > 0 && (
        <ConsensusPanel consensus={data.consensus} t={t} />
      )}

      {/* Privacy callout */}
      <PrivacyCallout variant="inline" />

      {/* Sample footer */}
      <p className="text-[11px] text-on-surface-muted">
        {t.polisOverlaySampleFooter(data.sampleSize, scopeName)}
      </p>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */

export function PolisOverlay({
  data,
  loading = false,
  countyName,
  stateName,
}: PolisOverlayProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  // Build scope label for headings/copy
  const scopeName =
    data.scope === "county" ? (countyName ?? "county") : (stateName ?? "state");

  // Loading
  if (loading) {
    return (
      <section
        aria-label="Voter overlap visualization"
        className="p-4 border border-outline-variant/30 bg-surface-lowest rounded-sm"
      >
        <LoadingState t={t} />
      </section>
    );
  }

  return (
    <section
      aria-label="Voter overlap visualization"
      className="p-4 border border-outline-variant/30 bg-surface-lowest rounded-sm space-y-4"
    >
      {data.thresholdMet ? (
        <UnlockedState t={t} data={data} scopeName={scopeName} />
      ) : (
        <LockedState
          t={t}
          scopeName={scopeName}
          countToUnlock={data.countToUnlock}
          sampleSize={data.sampleSize}
        />
      )}
    </section>
  );
}
