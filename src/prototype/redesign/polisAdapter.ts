/**
 * src/prototype/redesign/polisAdapter.ts
 *
 * Maps the existing polis API responses into the props shape PolisClose
 * renders (docs/design/2026-redesign/…/redesign-polis.jsx → POLIS2). The
 * design component is untouched — all degradation happens here:
 *
 *  - Dots are SYNTHETIC, generated from aggregate distributions (the API
 *    never stores individual records). Cluster centers/sizes come from
 *    grouping the API's dots by primary; cluster NAMES come from the
 *    `groups` field's top issues — never party names.
 *  - Scopes below the privacy threshold are reported via `locked` so the
 *    standing stage can render a lock state instead of the scatter.
 *  - Bridges come from /api/polis/bridges; its v1 sentinel responses
 *    (below_threshold / no_bridges_yet) → empty list → panel hidden.
 */

import { getIssueLabel } from "../../lib/canonicalIssues";

// Design palette for cluster swatches (redesign2-data.jsx POLIS2 colors).
const CLUSTER_COLORS = [
  "oklch(0.58 0.10 160)",
  "oklch(0.60 0.10 90)",
  "oklch(0.58 0.11 40)",
  "oklch(0.55 0.10 280)",
];

export interface PolisScopeVM {
  id: string;
  label: string;
  seed: number;
  sampleSize: number;
  dotPhrase: string;
  scopePhrase: string;
  clusters: Array<{
    id: string;
    name: string;
    color: string;
    center: [number, number];
    n: number;
  }>;
  you: [number, number] | null;
  bridges: Array<{ stmt: string; pct: number }>;
  /** True when the scope is below the privacy threshold (no scatter). */
  locked: boolean;
  countToUnlock: number | null;
}

interface ApiPolisResponse {
  scope: string;
  sampleSize: number;
  thresholdMet: boolean;
  countToUnlock?: number;
  dots: Array<{ x: number; y: number; primary: string }>;
  you: { x: number; y: number } | null;
  groups?: Array<{ primary: string; count: number; topIssues: string[] }>;
}

function deterministicSeed(scopeId: string, sampleSize: number): number {
  let h = sampleSize | 0;
  for (let i = 0; i < scopeId.length; i++) {
    h = (h * 31 + scopeId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

/** "<Top issue label> first" — shared-priority naming, never party. */
function clusterName(
  groups: ApiPolisResponse["groups"],
  primary: string,
): string {
  const top = groups?.find((g) => g.primary === primary)?.topIssues?.[0];
  return top ? `${getIssueLabel(top)} first` : "Shared-priority group";
}

/**
 * Group the API's synthetic dots by primary into design clusters:
 * center = mean position, n = dot count (display count, not sessions).
 */
function clustersFromDots(api: ApiPolisResponse): PolisScopeVM["clusters"] {
  const byPrimary = new Map<string, Array<{ x: number; y: number }>>();
  for (const dot of api.dots) {
    const list = byPrimary.get(dot.primary) ?? [];
    list.push(dot);
    byPrimary.set(dot.primary, list);
  }
  return [...byPrimary.entries()].map(([primary, dots], i) => {
    const cx = dots.reduce((s, d) => s + d.x, 0) / dots.length;
    const cy = dots.reduce((s, d) => s + d.y, 0) / dots.length;
    return {
      id: primary.toLowerCase(),
      name: clusterName(api.groups, primary),
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      center: [Math.round(cx * 100) / 100, Math.round(cy * 100) / 100] as [
        number,
        number,
      ],
      // Cap per-cluster display dots in the same range the design used.
      n: Math.min(dots.length, 140),
    };
  });
}

async function fetchPolisScope(
  params: Record<string, string>,
): Promise<ApiPolisResponse | null> {
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/polis?${qs}`);
    if (!res.ok) return null;
    return (await res.json()) as ApiPolisResponse;
  } catch {
    return null;
  }
}

interface ApiBridge {
  statement?: string;
  stmt?: string;
  agreementPercent?: number;
  clusters?: Array<{ agreementPercent?: number }>;
}

async function fetchBridges(
  stateCode: string,
  county: string | null,
): Promise<Array<{ stmt: string; pct: number }>> {
  try {
    const qs = new URLSearchParams({
      stateCode,
      ...(county ? { county } : {}),
    }).toString();
    const res = await fetch(`/api/polis/bridges?${qs}`);
    if (!res.ok) return [];
    const body = await res.json();
    const list: ApiBridge[] = Array.isArray(body?.bridges) ? body.bridges : [];
    return list
      .map((b) => {
        const stmt = b.statement ?? b.stmt ?? "";
        const pcts = (b.clusters ?? [])
          .map((c) => c.agreementPercent)
          .filter((p): p is number => typeof p === "number");
        const pct =
          typeof b.agreementPercent === "number"
            ? b.agreementPercent
            : pcts.length > 0
              ? Math.min(...pcts)
              : null;
        return stmt && pct !== null ? { stmt, pct: Math.round(pct) } : null;
      })
      .filter((b): b is { stmt: string; pct: number } => b !== null);
  } catch {
    return [];
  }
}

function toScopeVM(
  api: ApiPolisResponse | null,
  id: string,
  label: string,
  dotPhrase: string,
  scopePhrase: string,
  bridges: Array<{ stmt: string; pct: number }>,
): PolisScopeVM | null {
  if (!api) return null;
  const locked = !api.thresholdMet;
  return {
    id,
    label,
    seed: deterministicSeed(id, api.sampleSize),
    sampleSize: api.sampleSize,
    dotPhrase,
    scopePhrase,
    clusters: locked ? [] : clustersFromDots(api),
    you: api.you ? [api.you.x, api.you.y] : null,
    bridges: locked ? [] : bridges,
    locked,
    countToUnlock: api.countToUnlock ?? null,
  };
}

/**
 * Load the standing-stage scopes: county (when known) → state → national.
 * Scopes whose fetch failed are omitted; an all-failed load returns [].
 */
export async function loadPolisScopes(input: {
  stateCode: string;
  stateName: string;
  county: string | null;
  userConcerns: string[];
}): Promise<PolisScopeVM[]> {
  const concerns = input.userConcerns.join(",");
  const base: Record<string, string> = concerns
    ? { userConcerns: concerns }
    : {};

  const [countyRes, stateRes, nationalRes, bridges] = await Promise.all([
    input.county
      ? fetchPolisScope({
          stateCode: input.stateCode,
          county: input.county,
          ...base,
        })
      : Promise.resolve(null),
    fetchPolisScope({ stateCode: input.stateCode, ...base }),
    fetchPolisScope({ scope: "national", ...base }),
    fetchBridges(input.stateCode, input.county),
  ]);

  const countyLabel = (input.county ?? "").replace(/ County$/i, " County");
  const scopes: Array<PolisScopeVM | null> = [
    input.county && countyRes && countyRes.scope === "county"
      ? toScopeVM(
          countyRes,
          "county",
          countyLabel,
          `of your neighbors in ${countyLabel}`,
          `in ${countyLabel}`,
          bridges,
        )
      : null,
    toScopeVM(
      stateRes,
      "state",
      input.stateName,
      `of your fellow ${input.stateName} voters`,
      `across ${input.stateName}`,
      bridges,
    ),
    toScopeVM(
      nationalRes,
      "national",
      "National",
      "person, anywhere in the country,",
      "across the country",
      // Bridges are state-scoped today; the national zoom hides the panel.
      [],
    ),
  ];

  return scopes.filter((s): s is PolisScopeVM => s !== null);
}
