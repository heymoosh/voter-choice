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
 *  - `divided` is the "where it split" honest complement of `bridges` —
 *    statements that were scored but didn't clear the threshold. Same
 *    endpoint, same sentinel-only caveat, same population-level framing
 *    (no D/R/I party breakdown — card e2455f56). Empty list hides the panel.
 */

export interface IssueStat {
  canonicalIssue: string;
  issueLabel: string;
  percent: number;
}

export interface PolisScopeVM {
  id: string;
  label: string;
  sampleSize: number;
  dotPhrase: string;
  scopePhrase: string;
  dots: Array<{ x: number; y: number }>;
  you: [number, number] | null;
  overlap: {
    mostCommon: IssueStat | null;
    youShares: IssueStat[];
  };
  issueRegions: Array<{ label: string; x: number; y: number; percent: number }>;
  bridges: Array<{ stmt: string; pct: number }>;
  /** Statements that didn't clear the bridging threshold — "where it split". */
  divided: Array<{ stmt: string; pct: number }>;
  /** True only when the scope has zero finished sessions (nothing to draw). */
  locked: boolean;
}

interface ApiPolisResponse {
  scope: string;
  sampleSize: number;
  dots: Array<{ x: number; y: number }>;
  you: { x: number; y: number } | null;
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

/**
 * Reduce a statement-list contract (bridges OR divided — same shape) down to
 * the single population-level figure the FE renders: one percent per
 * statement, no per-cluster breakdown, never party (D/R/I). For a statement
 * that failed to bridge, the weakest (minimum) cluster figure is the honest
 * number to show — it's the one that kept it out of "common ground".
 */
function mapStatementList(
  list: unknown,
): Array<{ stmt: string; pct: number }> {
  const items: ApiBridge[] = Array.isArray(list) ? list : [];
  return items
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
}

async function fetchBridges(stateCode: string): Promise<{
  bridges: Array<{ stmt: string; pct: number }>;
  divided: Array<{ stmt: string; pct: number }>;
}> {
  try {
    const qs = new URLSearchParams({ stateCode }).toString();
    const res = await fetch(`/api/polis/bridges?${qs}`);
    if (!res.ok) return { bridges: [], divided: [] };
    const body = await res.json();
    return {
      bridges: mapStatementList(body?.bridges),
      divided: mapStatementList(body?.divided),
    };
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
  bridges: Array<{ stmt: string; pct: number }>,
  divided: Array<{ stmt: string; pct: number }>,
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
    overlap: api.overlap ?? { mostCommon: null, youShares: [] },
    issueRegions: (api.issueRegions ?? []).map((r) => ({
      label: r.issueLabel,
      x: r.x,
      y: r.y,
      percent: r.percent,
    })),
    bridges: locked ? [] : bridges,
    divided: locked ? [] : divided,
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

  const [stateRes, nationalRes, statementLists] = await Promise.all([
    fetchPolisScope({ stateCode: input.stateCode, ...base }),
    fetchPolisScope({ scope: "national", ...base }),
    fetchBridges(input.stateCode),
  ]);

  const scopes: Array<PolisScopeVM | null> = [
    toScopeVM(
      stateRes,
      "state",
      input.stateName,
      `of your fellow ${input.stateName} voters`,
      `across ${input.stateName}`,
      statementLists.bridges,
      statementLists.divided,
    ),
    toScopeVM(
      nationalRes,
      "national",
      "National",
      "person, anywhere in the country,",
      "across the country",
      // Bridges/divided are state-scoped today; the national zoom hides both panels.
      [],
      [],
    ),
  ];

  return scopes.filter((s): s is PolisScopeVM => s !== null);
}
