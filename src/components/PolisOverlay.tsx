"use client";

/* ──────────────────────────────────────────────────────────────
 * PolisOverlay — PR 10 (national-default).
 *
 * Per user feedback: "Most people share a lot of the same issues and
 * priorities. It will shock them to see how many others are actually
 * truly in the middle and clustered around their shared views on the
 * world, as opposed to the incredibly polarized version of society
 * that we normally see online."
 *
 * The polis view DEFAULTS to scope=national so voters first see the
 * shared baseline across the country. A toggle lets them switch to
 * scope=county when they want the local reading. When countyName is
 * unknown the toggle is hidden — national is the only view available.
 *
 * Renders three readings, each owned by its own GET endpoint:
 *   1. Overlap bars  — "you're not alone across the country" / "in {county}"
 *      (data from /api/polis/bars?scope=...). Percent text is load-bearing.
 *   2. Bridge statements — "where people agree" (data from
 *      /api/polis/bridges?scope=...; v1 returns no_bridges_yet sentinel).
 *   3. Cluster compass — "how we cluster" (data from
 *      /api/polis/compass?scope=...; v1 always returns below_threshold).
 *
 * NO partisan strings appear in cluster labels (label hygiene asserted
 * in src/lib/server/polis/clusters.test.ts). NO identity fields surface
 * in the rendered DOM (asserted here).
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
  /** Display name for the county; when undefined, the county toggle is hidden. */
  countyName?: string;
  userThemes: UserTheme[];
  /** Opt-in / post-decision; WorkspacePolisSection gates expansion. */
  visible?: boolean;
}

type Scope = "national" | "county";

/* ── Response shapes (mirrors API contracts) ─────────────────── */

interface BarsResponse {
  scope: Scope;
  county?: string;
  threshold: number;
  count: number;
  status?: "below_threshold";
  bars: Array<{ themeId: string; theme: string; percent: number }>;
}

interface BridgesResponse {
  scope: Scope;
  county?: string;
  threshold: number;
  count: number;
  status?: "below_threshold" | "no_bridges_yet";
  bridges: Array<{
    statement: string;
    clusters: Array<{ name: string; agreementPercent: number }>;
  }>;
}

interface CompassResponse {
  scope: Scope;
  county?: string;
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
  scope: Scope;
  stateCode: string;
  county: string;
  userThemeIds?: string[];
}): string {
  const params = new URLSearchParams({ scope: opts.scope });
  if (opts.scope === "county") {
    params.set("stateCode", opts.stateCode);
    params.set("county", opts.county);
  }
  if (opts.userThemeIds && opts.userThemeIds.length > 0) {
    params.set("userConcerns", opts.userThemeIds.join(","));
  }
  return params.toString();
}

/* ── Sections ────────────────────────────────────────────────── */

function BarsSection({
  state,
  scope,
  countyName,
  t,
}: {
  state: SectionState<BarsResponse>;
  scope: Scope;
  countyName: string;
  t: (typeof translations)["en"]["research"];
}) {
  const heading =
    scope === "national"
      ? t.polisBarsHeadingNational
      : t.polisBarsHeading(countyName);
  const emptyCopy =
    scope === "national" ? t.polisBarsEmptyNational : t.polisBarsEmpty;
  const belowThresholdCopy = (count: number, threshold: number) =>
    scope === "national"
      ? t.polisBarsBelowThresholdNational(count, threshold)
      : t.polisBarsBelowThreshold(count, threshold);

  return (
    <section
      data-testid="polis-bars-section"
      data-scope={scope}
      aria-labelledby="polis-bars-heading"
      className="space-y-3"
    >
      <h3
        id="polis-bars-heading"
        className="text-base font-bold text-on-surface leading-snug"
      >
        {heading}
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
            {emptyCopy}
          </p>
        ) : state.data.status === "below_threshold" ? (
          <p
            data-testid="polis-bars-below-threshold"
            className="text-sm text-on-surface-muted"
          >
            {belowThresholdCopy(state.data.count, state.data.threshold)}
          </p>
        ) : (
          <ul
            className="space-y-2"
            aria-label={
              scope === "national"
                ? "National overlap bars"
                : "County overlap bars"
            }
          >
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
  scope,
  countyName,
  t,
}: {
  state: SectionState<BridgesResponse>;
  scope: Scope;
  countyName: string;
  t: (typeof translations)["en"]["research"];
}) {
  const heading =
    scope === "national"
      ? t.polisBridgesHeadingNational
      : t.polisBridgesHeading(countyName);
  const belowThresholdCopy = (count: number, threshold: number) =>
    scope === "national"
      ? t.polisBridgesBelowThresholdNational(count, threshold)
      : t.polisBridgesBelowThreshold(count, threshold);

  return (
    <section
      data-testid="polis-bridges-section"
      data-scope={scope}
      aria-labelledby="polis-bridges-heading"
      className="space-y-3"
    >
      <h3
        id="polis-bridges-heading"
        className="text-base font-bold text-on-surface leading-snug"
      >
        {heading}
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
            {belowThresholdCopy(state.data.count, state.data.threshold)}
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
  scope,
  t,
}: {
  state: SectionState<CompassResponse>;
  scope: Scope;
  t: (typeof translations)["en"]["research"];
}) {
  const belowThresholdCopy = (count: number, threshold: number) =>
    scope === "national"
      ? t.polisCompassBelowThresholdNational(count, threshold)
      : t.polisCompassBelowThreshold(count, threshold);

  return (
    <section
      data-testid="polis-compass-section"
      data-scope={scope}
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
            {belowThresholdCopy(state.data.count, state.data.threshold)}
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

/* ── Scope toggle ────────────────────────────────────────────── */

function ScopeToggle({
  scope,
  countyName,
  onChange,
  t,
}: {
  scope: Scope;
  countyName: string;
  onChange: (next: Scope) => void;
  t: (typeof translations)["en"]["research"];
}) {
  return (
    <div
      data-testid="polis-scope-toggle"
      role="radiogroup"
      aria-label="Scope: nationwide or your county"
      className="inline-flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface-low p-0.5 text-xs"
    >
      <button
        type="button"
        role="radio"
        aria-checked={scope === "national"}
        data-testid="polis-scope-toggle-national"
        onClick={() => onChange("national")}
        className={`rounded-full px-3 py-1 transition ${
          scope === "national"
            ? "bg-primary/15 font-bold text-on-surface"
            : "text-on-surface-muted hover:text-on-surface"
        }`}
      >
        {t.polisScopeToggleNational}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scope === "county"}
        data-testid="polis-scope-toggle-county"
        onClick={() => onChange("county")}
        className={`rounded-full px-3 py-1 transition ${
          scope === "county"
            ? "bg-primary/15 font-bold text-on-surface"
            : "text-on-surface-muted hover:text-on-surface"
        }`}
      >
        {t.polisScopeToggleCounty} ({countyName})
      </button>
    </div>
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

  // PR 10 — national is the default. The county toggle is only available
  // when we have a county name to show in the label.
  const hasCounty = Boolean(countyName && countyName.length > 0 && county);
  const [scope, setScope] = useState<Scope>("national");

  // If county becomes unavailable while scope=county, fall back to national.
  useEffect(() => {
    if (!hasCounty && scope === "county") {
      setScope("national");
    }
  }, [hasCounty, scope]);

  const userThemeIds = userThemes.map((t) => t.id);
  const qs = buildQuery({ scope, stateCode, county, userThemeIds });
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
      {hasCounty && (
        <ScopeToggle
          scope={scope}
          countyName={displayCounty}
          onChange={setScope}
          t={t}
        />
      )}
      <BarsSection
        state={barsState}
        scope={scope}
        countyName={displayCounty}
        t={t}
      />
      <BridgesSection
        state={bridgesState}
        scope={scope}
        countyName={displayCounty}
        t={t}
      />
      <CompassSection state={compassState} scope={scope} t={t} />
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
