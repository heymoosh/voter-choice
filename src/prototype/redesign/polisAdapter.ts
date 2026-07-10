/**
 * src/prototype/redesign/polisAdapter.ts
 *
 * Maps the /api/polis response into the props PolisClose renders. The viz is a
 * single party-free "overlap cloud":
 *
 *  - Dots are SYNTHETIC, one per finished session (the API never stores
 *    individual records). The API places them by shared priority — never party.
 *  - `overlap` carries the personalized prevalence stat (how many people share
 *    the voter's top priority) — the emotional payoff.
 *  - `issueRegions` are anchor positions + labels for the most common
 *    priorities, drawn faintly on the cloud and read out for screen readers.
 *  - A scope is `locked` ONLY when it has zero finished sessions (nothing to
 *    draw). There is no minimum-participation gate — the map renders for anyone.
 *  - Bridges come from /api/polis/bridges; while that endpoint is sentinel-only
 *    its empty list simply hides the panel.
 */

export interface IssueStat {
  canonicalIssue: string;
  issueLabel: string;
  percent: number;
}

/** A population-level agreement statement — the party-free "common ground" row. */
export interface Bridge {
  stmt: string;
  pct: number;
}

/**
 * A statement the population genuinely split on. Party-free: `agreePct` /
 * `disagreePct` are whole-population shares (no cluster or party breakdown).
 */
export interface Divided {
  stmt: string;
  agreePct: number;
  disagreePct: number;
}

/** One session's dot on the opinion map: display position + opinion-group id. */
export interface ClusterDot {
  x: number;
  y: number;
  cluster: number;
}

/** A soft opinion-group field. Neutral label ("Group A") — never a party. */
export interface ClusterGroup {
  id: number;
  label: string;
  sharePercent: number;
  cx: number;
  cy: number;
  spread: number;
}

/**
 * The real pol.is-style opinion map: PCA-projected sessions clustered by answer
 * similarity. Party-free (DECISION #116): positions + counts + neutral ids
 * only. Present only when the API found enough separated groups; otherwise the
 * scope carries `clusterMap: null` and the FE draws the single-cloud fallback.
 */
export interface ClusterMap {
  dots: ClusterDot[];
  clusters: ClusterGroup[];
  you: { x: number; y: number; cluster: number } | null;
}

export interface PolisScopeVM {
  id: string;
  label: string;
  sampleSize: number;
  dotPhrase: string;
  scopePhrase: string;
  dots: Array<{ x: number; y: number }>;
  you: [number, number] | null;
  /** Real cluster map when available; null → single-cloud fallback. */
  clusterMap: ClusterMap | null;
  overlap: {
    mostCommon: IssueStat | null;
    youShares: IssueStat[];
  };
  issueRegions: Array<{ label: string; x: number; y: number; percent: number }>;
  bridges: Bridge[];
  /** Statements the population split on (honest "where it split" panel). */
  divided: Divided[];
  /** True only when the scope has zero finished sessions (nothing to draw). */
  locked: boolean;
}

interface ApiPolisResponse {
  scope: string;
  sampleSize: number;
  dots: Array<{ x: number; y: number }>;
  you: { x: number; y: number } | null;
  clusterMap?: ClusterMap | null;
  consensus?: IssueStat[];
  overlap?: {
    mostCommon: IssueStat | null;
    youShares: IssueStat[];
  };
  issueRegions?: Array<{
    canonicalIssue: string;
    issueLabel: string;
    percent: number;
    x: number;
    y: number;
  }>;
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

interface ApiDivided {
  statement?: string;
  stmt?: string;
  agreePercent?: number;
  disagreePercent?: number;
}

/**
 * Read the party-free bridges + divided arrays the route returns. Bridges are
 * statements a supermajority of the whole population agreed on; divided are the
 * ones the population genuinely split on (agree vs. disagree shares, no party
 * or cluster breakdown — DECISION #116). Both come from the same endpoint.
 */
async function fetchBridges(
  stateCode: string,
): Promise<{ bridges: Bridge[]; divided: Divided[] }> {
  try {
    const qs = new URLSearchParams({ stateCode }).toString();
    const res = await fetch(`/api/polis/bridges?${qs}`);
    if (!res.ok) return { bridges: [], divided: [] };
    const body = await res.json();

    const bridgeList: ApiBridge[] = Array.isArray(body?.bridges)
      ? body.bridges
      : [];
    const bridges: Bridge[] = bridgeList
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
      .filter((b): b is Bridge => b !== null);

    const dividedList: ApiDivided[] = Array.isArray(body?.divided)
      ? body.divided
      : [];
    const divided: Divided[] = dividedList
      .map((d) => {
        const stmt = d.statement ?? d.stmt ?? "";
        const agreePct = d.agreePercent;
        const disagreePct = d.disagreePercent;
        return stmt &&
          typeof agreePct === "number" &&
          typeof disagreePct === "number"
          ? {
              stmt,
              agreePct: Math.round(agreePct),
              disagreePct: Math.round(disagreePct),
            }
          : null;
      })
      .filter((d): d is Divided => d !== null);

    return { bridges, divided };
  } catch {
    return { bridges: [], divided: [] };
  }
}

function toScopeVM(
  api: ApiPolisResponse | null,
  id: string,
  label: string,
  dotPhrase: string,
  scopePhrase: string,
  findings: { bridges: Bridge[]; divided: Divided[] },
): PolisScopeVM | null {
  if (!api) return null;
  const locked = api.sampleSize === 0;
  return {
    id,
    label,
    sampleSize: api.sampleSize,
    dotPhrase,
    scopePhrase,
    dots: api.dots ?? [],
    you: api.you ? [api.you.x, api.you.y] : null,
    clusterMap: locked ? null : (api.clusterMap ?? null),
    overlap: api.overlap ?? { mostCommon: null, youShares: [] },
    issueRegions: (api.issueRegions ?? []).map((r) => ({
      label: r.issueLabel,
      x: r.x,
      y: r.y,
      percent: r.percent,
    })),
    bridges: locked ? [] : findings.bridges,
    divided: locked ? [] : findings.divided,
    locked,
  };
}

/**
 * Load the standing-stage scopes: state → national. County is intentionally
 * not surfaced — we don't collect or display county-level location (privacy).
 * Scopes whose fetch failed are omitted; an all-failed load returns [].
 */
export async function loadPolisScopes(input: {
  stateCode: string;
  stateName: string;
  userConcerns: string[];
}): Promise<PolisScopeVM[]> {
  const concerns = input.userConcerns.join(",");
  const base: Record<string, string> = concerns
    ? { userConcerns: concerns }
    : {};

  const [stateRes, nationalRes, findings] = await Promise.all([
    fetchPolisScope({ stateCode: input.stateCode, ...base }),
    fetchPolisScope({ scope: "national", ...base }),
    fetchBridges(input.stateCode),
  ]);

  const empty = { bridges: [], divided: [] };
  const scopes: Array<PolisScopeVM | null> = [
    toScopeVM(
      stateRes,
      "state",
      input.stateName,
      `of your fellow ${input.stateName} voters`,
      `across ${input.stateName}`,
      findings,
    ),
    toScopeVM(
      nationalRes,
      "national",
      "National",
      "person, anywhere in the country,",
      "across the country",
      // Bridges/divided are state-scoped today; the national zoom hides them.
      empty,
    ),
  ];

  return scopes.filter((s): s is PolisScopeVM => s !== null);
}
