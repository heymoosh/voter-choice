"use client";

/* ──────────────────────────────────────────────────────────────
 * PolisOverlay — Phase 8 restructure.
 *
 * Renders three readings of the user's county, each owned by its own
 * GET endpoint and rendered independently with explicit empty states:
 *
 *   1. Overlap bars  — "you're not alone in {county}" (data from
 *      /api/polis/bars). Percent text is load-bearing.
 *   2. Bridge statements — "where people in {county} agree" (data from
 *      /api/polis/bridges; v1 returns no_bridges_yet sentinel).
 *   3. Cluster compass — "how we cluster" (data from /api/polis/compass;
 *      v1 always returns below_threshold, count + threshold visible).
 *
 * NO partisan strings appear in cluster labels (label hygiene asserted
 * in src/lib/server/polis/clusters.test.ts). NO identity fields surface
 * in the rendered DOM (asserted here).
 *
 * Re-fetches all three endpoints whenever stateCode/county change.
 * ────────────────────────────────────────────────────────────── */

import React, { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import { PrivacyCallout } from "./PrivacyCallout";

/* ── Public props ────────────────────────────────────────────── */

export interface UserTheme {
  id: string;
  label: string;
}

export interface PolisOverlayProps {
  stateCode: string;
  county: string;
  countyName?: string;
  userThemes: UserTheme[];
  /** Opt-in / post-decision; HandoffPackage already gates on stateCode + county. */
  visible?: boolean;
}

/* ── Response shapes (mirrors API contracts) ─────────────────── */

interface BarsResponse {
  county: string;
  threshold: number;
  count: number;
  status?: "below_threshold";
  bars: Array<{ themeId: string; theme: string; percent: number }>;
}

interface BridgesResponse {
  county: string;
  threshold: number;
  count: number;
  status?: "below_threshold" | "no_bridges_yet";
  bridges: Array<{
    statement: string;
    clusters: Array<{ name: string; agreementPercent: number }>;
  }>;
}

interface CompassResponse {
  county: string;
  threshold: number;
  count: number;
  status?: "below_threshold";
  clusters: Array<{
    name: string;
    percent: number;
    axisX: number;
    axisY: number;
  }>;
  dots: Array<{ x: number; y: number; cluster: string }>;
}

/* ── Fetch helpers ───────────────────────────────────────────── */

function buildQuery(opts: {
  stateCode: string;
  county: string;
  userThemeIds?: string[];
}): string {
  const params = new URLSearchParams({
    stateCode: opts.stateCode,
    county: opts.county,
  });
  if (opts.userThemeIds && opts.userThemeIds.length > 0) {
    params.set("userConcerns", opts.userThemeIds.join(","));
  }
  return params.toString();
}

/* ── Sections ────────────────────────────────────────────────── */

function BarsSection({
  state,
  countyName,
  t,
}: {
  state: SectionState<BarsResponse>;
  countyName: string;
  t: (typeof translations)["en"]["research"];
}) {
  return (
    <section
      data-testid="polis-bars-section"
      aria-labelledby="polis-bars-heading"
      className="space-y-3"
    >
      <h3
        id="polis-bars-heading"
        className="text-base font-bold text-on-surface leading-snug"
      >
        {t.polisBarsHeading(countyName)}
      </h3>

      {state.kind === "loading" && (
        <p
          data-testid="polis-bars-loading"
          className="text-sm text-on-surface-muted"
        >
          {t.polisBarsLoading}
        </p>
      )}

      {state.kind === "error" && (
        <p
          data-testid="polis-bars-error"
          className="text-sm text-on-surface-muted"
        >
          {t.polisSectionError}
        </p>
      )}

      {state.kind === "data" &&
        (state.data.count === 0 ? (
          <p
            data-testid="polis-bars-empty"
            className="text-sm text-on-surface-muted"
          >
            {t.polisBarsEmpty}
          </p>
        ) : state.data.status === "below_threshold" ? (
          <p
            data-testid="polis-bars-below-threshold"
            className="text-sm text-on-surface-muted"
          >
            {t.polisBarsBelowThreshold(state.data.count, state.data.threshold)}
          </p>
        ) : (
          <ul className="space-y-2" aria-label="County overlap bars">
            {state.data.bars.map((bar) => (
              <li
                key={bar.themeId}
                data-testid={`overlap-bar-${bar.themeId}`}
                className="space-y-0.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-on-surface">
                    {bar.theme}
                  </span>
                  <span className="tabular-nums text-on-surface-muted">
                    {bar.percent}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full bg-outline-variant/20 overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${Math.min(bar.percent, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

function BridgesSection({
  state,
  countyName,
  t,
}: {
  state: SectionState<BridgesResponse>;
  countyName: string;
  t: (typeof translations)["en"]["research"];
}) {
  return (
    <section
      data-testid="polis-bridges-section"
      aria-labelledby="polis-bridges-heading"
      className="space-y-3"
    >
      <h3
        id="polis-bridges-heading"
        className="text-base font-bold text-on-surface leading-snug"
      >
        {t.polisBridgesHeading(countyName)}
      </h3>

      {state.kind === "loading" && (
        <p
          data-testid="polis-bridges-loading"
          className="text-sm text-on-surface-muted"
        >
          {t.polisBridgesLoading}
        </p>
      )}

      {state.kind === "error" && (
        <p
          data-testid="polis-bridges-error"
          className="text-sm text-on-surface-muted"
        >
          {t.polisSectionError}
        </p>
      )}

      {state.kind === "data" &&
        (state.data.status === "below_threshold" ? (
          <p
            data-testid="polis-bridges-below-threshold"
            className="text-sm text-on-surface-muted"
          >
            {t.polisBridgesBelowThreshold(
              state.data.count,
              state.data.threshold,
            )}
          </p>
        ) : state.data.bridges.length === 0 ? (
          <p
            data-testid="polis-bridges-empty"
            className="text-sm text-on-surface-muted"
          >
            {t.polisBridgesEmpty}
          </p>
        ) : (
          <ul className="space-y-3" aria-label="Bridge statements">
            {state.data.bridges.map((b, i) => (
              <li
                key={i}
                data-testid={`bridge-statement-${i}`}
                className="space-y-1.5 border-l-2 border-primary/40 pl-3"
              >
                <p className="text-sm text-on-surface">{b.statement}</p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-on-surface-muted">
                  {b.clusters.map((c, j) => (
                    <li key={j} className="tabular-nums">
                      {c.name}: {c.agreementPercent}%
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

function CompassSection({
  state,
  t,
}: {
  state: SectionState<CompassResponse>;
  t: (typeof translations)["en"]["research"];
}) {
  return (
    <section
      data-testid="polis-compass-section"
      aria-labelledby="polis-compass-heading"
      className="space-y-3"
    >
      <h3
        id="polis-compass-heading"
        className="text-base font-bold text-on-surface leading-snug"
      >
        {t.polisCompassHeading}
      </h3>

      {state.kind === "loading" && (
        <p
          data-testid="polis-compass-loading"
          className="text-sm text-on-surface-muted"
        >
          {t.polisCompassLoading}
        </p>
      )}

      {state.kind === "error" && (
        <p
          data-testid="polis-compass-error"
          className="text-sm text-on-surface-muted"
        >
          {t.polisSectionError}
        </p>
      )}

      {state.kind === "data" &&
        (state.data.status === "below_threshold" ? (
          <p
            data-testid="compass-empty"
            className="text-sm text-on-surface-muted"
          >
            {t.polisCompassBelowThreshold(
              state.data.count,
              state.data.threshold,
            )}
          </p>
        ) : (
          // v2 placeholder — when PCA + cluster labels ship, render the
          // compass chart here. The test harness already covers the v1
          // below_threshold path; this branch is wiring for the next phase.
          <p data-testid="compass-chart" className="text-sm text-on-surface">
            Compass visualization (Phase 8b).
          </p>
        ))}
    </section>
  );
}

/* ── Fetch state machine ─────────────────────────────────────── */

type SectionState<T> =
  | { kind: "loading" }
  | { kind: "data"; data: T }
  | { kind: "error" };

function useSectionFetch<T>(url: string | null): SectionState<T> {
  const [state, setState] = useState<SectionState<T>>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setState({ kind: "loading" });
      return;
    }
    setState({ kind: "loading" });
    void fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setState({ kind: "error" });
          return;
        }
        const json = (await res.json()) as T;
        if (!cancelled) setState({ kind: "data", data: json });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

/* ── Main export ─────────────────────────────────────────────── */

export function PolisOverlay({
  stateCode,
  county,
  countyName,
  userThemes,
  visible = true,
}: PolisOverlayProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  const userThemeIds = userThemes.map((t) => t.id);
  const qs = buildQuery({ stateCode, county, userThemeIds });
  const barsUrl = visible ? `/api/polis/bars?${qs}` : null;
  const bridgesUrl = visible ? `/api/polis/bridges?${qs}` : null;
  const compassUrl = visible ? `/api/polis/compass?${qs}` : null;

  const barsState = useSectionFetch<BarsResponse>(barsUrl);
  const bridgesState = useSectionFetch<BridgesResponse>(bridgesUrl);
  const compassState = useSectionFetch<CompassResponse>(compassUrl);

  const displayCounty = countyName ?? county;

  return (
    <section
      aria-label="Voter overlap visualization"
      className="p-4 border border-outline-variant/30 bg-surface-lowest rounded-sm space-y-6"
    >
      <BarsSection state={barsState} countyName={displayCounty} t={t} />
      <BridgesSection state={bridgesState} countyName={displayCounty} t={t} />
      <CompassSection state={compassState} t={t} />
      <PrivacyCallout variant="inline" />
    </section>
  );
}

/* ── Legacy named export for downstream consumers ───────────── */

/**
 * Kept for backward compatibility with HandoffPackage's import of `PolisData`.
 * The legacy shape is no longer rendered; HandoffPackage passes the Phase 8
 * props directly. This re-export will be removed in a follow-up cleanup.
 */
export interface PolisData {
  scope?: "county" | "state";
  sampleSize?: number;
  thresholdMet?: boolean;
  countToUnlock?: number;
  dots?: Array<{ x: number; y: number; primary: string }>;
  you?: { x: number; y: number } | null;
  consensus?: Array<{
    canonicalIssue: string;
    issueLabel: string;
    percent: number;
  }>;
}
