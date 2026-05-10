/**
 * Anonymous session counters for the Polis-style overlap visualization.
 *
 * Privacy guarantee: NO individual record is ever written. Counters increment
 * at session-end over aggregate keys only. The dedupe token (sessionId-keyed)
 * is an idempotency guard with 1-hour TTL — it is not a user record.
 *
 * Key namespace: voter-choice:counters:*
 * Dedupe namespace: voter-choice:dedupe:*
 */

import { isDurableStoreConfigured, redisCommand } from "./durable-store";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IncrementInput {
  /** Random per-session, never persisted client-side beyond the tab. */
  sessionId: string;
  stateCode: string;
  county: string | null; // null when unknown
  primary: "DEM" | "REP" | "OPEN" | "GENERAL";
  confirmedConcerns: Array<{ canonicalIssue: string }>;
  picks: Array<{ race: string; candidateId: string }>;
}

export interface IncrementResult {
  ok: boolean;
  alreadyCounted: boolean;
}

export interface PolisAggregate {
  /** Which level we aggregated at. */
  scope: "county" | "state";
  sampleSize: number;
  /** True when sample >= THRESHOLD. */
  thresholdMet: boolean;
  /** Per-issue counts split by primary, used by the consensus panel. */
  issueCounts: Array<{
    canonicalIssue: string;
    primary: "DEM" | "REP" | "OPEN" | "GENERAL";
    count: number;
  }>;
  /** Total per-primary sessions, used to compute % shares. */
  primaryTotals: Array<{
    primary: "DEM" | "REP" | "OPEN" | "GENERAL";
    count: number;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NS = "voter-choice:counters";
const DEDUPE_NS = "voter-choice:dedupe";
const DEDUPE_TTL_SECONDS = 3600; // 1 hour
const THRESHOLD = 200;
const PRIMARIES = ["DEM", "REP", "OPEN", "GENERAL"] as const;

// ---------------------------------------------------------------------------
// In-memory fallback (used when Redis is not configured — keeps tests runnable)
// ---------------------------------------------------------------------------

const memCounters = new Map<string, number>();
const memDedupe = new Set<string>();

function memIncr(key: string, by = 1): void {
  memCounters.set(key, (memCounters.get(key) ?? 0) + by);
}

function memGet(key: string): number {
  return memCounters.get(key) ?? 0;
}

// Exposed for testing only.
export function _resetMemoryForTesting(): void {
  memCounters.clear();
  memDedupe.clear();
}

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------

function statePrefix(stateCode: string): string {
  return `${NS}:state:${stateCode}`;
}

function countyPrefix(stateCode: string, county: string): string {
  return `${NS}:county:${stateCode}:${county}`;
}

function dedupeKey(sessionId: string): string {
  return `${DEDUPE_NS}:${sessionId}`;
}

// ---------------------------------------------------------------------------
// Increment
// ---------------------------------------------------------------------------

/**
 * Increment anonymous aggregate counters at session-end.
 *
 * Idempotent: if the sessionId dedupe token already exists (within the 1-hour
 * TTL window), returns `alreadyCounted: true` and skips all increments.
 */
export async function incrementSessionCounters(
  input: IncrementInput,
): Promise<IncrementResult> {
  const { sessionId, stateCode, county, primary, confirmedConcerns } = input;

  // --- Durable path ---
  if (isDurableStoreConfigured()) {
    try {
      // Idempotency check: SET NX with 1-hour TTL.
      const dk = dedupeKey(sessionId);
      const set = await redisCommand<string>([
        "SET",
        dk,
        "1",
        "EX",
        DEDUPE_TTL_SECONDS,
        "NX",
      ]);
      // SET NX returns "OK" when the key was newly set, null when it already existed.
      if (set === null) {
        return { ok: true, alreadyCounted: true };
      }

      // Build all INCRBY commands.
      const commands: Array<Promise<unknown>> = [];

      const stateP = `${statePrefix(stateCode)}`;
      const statePrimaryP = `${stateP}:primary:${primary}`;

      // State-level totals
      commands.push(redisCommand(["INCRBY", `${stateP}:total`, 1]));
      commands.push(redisCommand(["INCRBY", `${statePrimaryP}:total`, 1]));

      // County-level totals (when county is known)
      let countyP: string | null = null;
      let countyPrimaryP: string | null = null;
      if (county) {
        countyP = countyPrefix(stateCode, county);
        countyPrimaryP = `${countyP}:primary:${primary}`;
        commands.push(redisCommand(["INCRBY", `${countyP}:total`, 1]));
        commands.push(redisCommand(["INCRBY", `${countyPrimaryP}:total`, 1]));
      }

      // Issue-level counters
      for (const { canonicalIssue } of confirmedConcerns) {
        if (!canonicalIssue) continue;
        commands.push(
          redisCommand([
            "INCRBY",
            `${statePrimaryP}:issue:${canonicalIssue}`,
            1,
          ]),
        );
        if (countyPrimaryP) {
          commands.push(
            redisCommand([
              "INCRBY",
              `${countyPrimaryP}:issue:${canonicalIssue}`,
              1,
            ]),
          );
        }
      }

      await Promise.all(commands);
      return { ok: true, alreadyCounted: false };
    } catch (err) {
      console.error("[counters] Redis increment failed:", err);
      return { ok: false, alreadyCounted: false };
    }
  }

  // --- In-memory fallback ---
  const dk = dedupeKey(sessionId);
  if (memDedupe.has(dk)) {
    return { ok: true, alreadyCounted: true };
  }
  memDedupe.add(dk);

  const stateP = statePrefix(stateCode);
  const statePrimaryP = `${stateP}:primary:${primary}`;

  memIncr(`${stateP}:total`);
  memIncr(`${statePrimaryP}:total`);

  if (county) {
    const cp = countyPrefix(stateCode, county);
    const cpp = `${cp}:primary:${primary}`;
    memIncr(`${cp}:total`);
    memIncr(`${cpp}:total`);

    for (const { canonicalIssue } of confirmedConcerns) {
      if (!canonicalIssue) continue;
      memIncr(`${statePrimaryP}:issue:${canonicalIssue}`);
      memIncr(`${cpp}:issue:${canonicalIssue}`);
    }
  } else {
    for (const { canonicalIssue } of confirmedConcerns) {
      if (!canonicalIssue) continue;
      memIncr(`${statePrimaryP}:issue:${canonicalIssue}`);
    }
  }

  return { ok: true, alreadyCounted: false };
}

// ---------------------------------------------------------------------------
// Aggregate fetch helpers
// ---------------------------------------------------------------------------

async function durableGetTotal(prefix: string): Promise<number> {
  const v = await redisCommand<string>(["GET", `${prefix}:total`]);
  return Number(v ?? 0);
}

async function durableGetPrimaryTotal(
  prefix: string,
  primary: string,
): Promise<number> {
  const v = await redisCommand<string>([
    "GET",
    `${prefix}:primary:${primary}:total`,
  ]);
  return Number(v ?? 0);
}

/**
 * Fetch issue counts for a given prefix (state or county) using KEYS.
 *
 * NOTE: KEYS is acceptable here because the namespace is small and
 * state/county-scoped. Flag for future SCAN optimization when namespaces grow.
 */
async function durableGetIssueCounts(scopePrefix: string): Promise<
  Array<{
    canonicalIssue: string;
    primary: "DEM" | "REP" | "OPEN" | "GENERAL";
    count: number;
  }>
> {
  const pattern = `${scopePrefix}:primary:*:issue:*`;
  const keys = await redisCommand<string[]>(["KEYS", pattern]);
  if (!keys || keys.length === 0) return [];

  // Fetch all values in parallel
  const values = await Promise.all(
    keys.map((k) => redisCommand<string>(["GET", k])),
  );

  const results: Array<{
    canonicalIssue: string;
    primary: "DEM" | "REP" | "OPEN" | "GENERAL";
    count: number;
  }> = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const count = Number(values[i] ?? 0);
    if (count === 0) continue;

    // Key format: {scopePrefix}:primary:{primary}:issue:{canonicalIssue}
    // Find the :primary: segment
    const primaryMatch = key.match(
      /:primary:(DEM|REP|OPEN|GENERAL):issue:(.+)$/,
    );
    if (!primaryMatch) continue;
    const primary = primaryMatch[1] as "DEM" | "REP" | "OPEN" | "GENERAL";
    const canonicalIssue = primaryMatch[2];
    results.push({ canonicalIssue, primary, count });
  }

  return results;
}

// ---------------------------------------------------------------------------
// fetchPolisAggregate
// ---------------------------------------------------------------------------

const EMPTY_AGGREGATE: PolisAggregate = {
  scope: "state",
  sampleSize: 0,
  thresholdMet: false,
  issueCounts: [],
  primaryTotals: [],
};

/**
 * Fetch the polis aggregate for rendering the overlap viz.
 *
 * Scope resolution:
 *  - If county provided AND county total >= 200 → scope = "county"
 *  - Else if state total >= 200 → scope = "state"
 *  - Else → whichever has more sessions (thresholdMet: false)
 */
export async function fetchPolisAggregate(
  stateCode: string,
  county: string | null,
): Promise<PolisAggregate> {
  if (isDurableStoreConfigured()) {
    try {
      return await durableFetchPolisAggregate(stateCode, county);
    } catch (err) {
      console.error("[counters] Redis aggregate fetch failed:", err);
      return { ...EMPTY_AGGREGATE };
    }
  }
  return memFetchPolisAggregate(stateCode, county);
}

async function durableFetchPolisAggregate(
  stateCode: string,
  county: string | null,
): Promise<PolisAggregate> {
  const stateP = statePrefix(stateCode);

  // Fetch totals
  const [stateTotal, countyTotal] = await Promise.all([
    durableGetTotal(stateP),
    county
      ? durableGetTotal(countyPrefix(stateCode, county))
      : Promise.resolve(0),
  ]);

  // Determine scope
  let scope: "county" | "state";
  let scopeTotal: number;
  let scopePrefix: string;

  if (county && countyTotal >= THRESHOLD) {
    scope = "county";
    scopeTotal = countyTotal;
    scopePrefix = countyPrefix(stateCode, county);
  } else if (stateTotal >= THRESHOLD) {
    scope = "state";
    scopeTotal = stateTotal;
    scopePrefix = stateP;
  } else {
    // Below threshold on both — pick whichever has more
    const useCounty = county && countyTotal > stateTotal;
    scope = useCounty ? "county" : "state";
    scopeTotal = useCounty ? countyTotal : stateTotal;
    scopePrefix = useCounty ? countyPrefix(stateCode, county!) : stateP;
  }

  const thresholdMet = scopeTotal >= THRESHOLD;

  // Fetch primary totals and issue counts in parallel
  const [primaryTotalsRaw, issueCounts] = await Promise.all([
    Promise.all(
      PRIMARIES.map(async (p) => ({
        primary: p,
        count: await durableGetPrimaryTotal(scopePrefix, p),
      })),
    ),
    durableGetIssueCounts(scopePrefix),
  ]);

  const primaryTotals = primaryTotalsRaw.filter((pt) => pt.count > 0);

  return {
    scope,
    sampleSize: scopeTotal,
    thresholdMet,
    issueCounts,
    primaryTotals,
  };
}

function memFetchPolisAggregate(
  stateCode: string,
  county: string | null,
): PolisAggregate {
  const stateP = statePrefix(stateCode);
  const stateTotal = memGet(`${stateP}:total`);
  const countyTotal = county
    ? memGet(`${countyPrefix(stateCode, county)}:total`)
    : 0;

  let scope: "county" | "state";
  let scopeTotal: number;
  let scopePrefix: string;

  if (county && countyTotal >= THRESHOLD) {
    scope = "county";
    scopeTotal = countyTotal;
    scopePrefix = countyPrefix(stateCode, county);
  } else if (stateTotal >= THRESHOLD) {
    scope = "state";
    scopeTotal = stateTotal;
    scopePrefix = stateP;
  } else {
    const useCounty = county && countyTotal > stateTotal;
    scope = useCounty ? "county" : "state";
    scopeTotal = useCounty ? countyTotal : stateTotal;
    scopePrefix = useCounty ? countyPrefix(stateCode, county!) : stateP;
  }

  const thresholdMet = scopeTotal >= THRESHOLD;

  const primaryTotals = PRIMARIES.map((p) => ({
    primary: p,
    count: memGet(`${scopePrefix}:primary:${p}:total`),
  })).filter((pt) => pt.count > 0);

  // Synchronous issue counts from memory
  let issueCounts: PolisAggregate["issueCounts"] = [];
  try {
    // memGetIssueCounts is async but safe to unwrap here because memory ops are sync
    // We'll call the sync-equivalent inline instead
    for (const [key, count] of memCounters) {
      if (!key.startsWith(scopePrefix)) continue;
      if (count === 0) continue;
      const primaryMatch = key.match(
        /:primary:(DEM|REP|OPEN|GENERAL):issue:(.+)$/,
      );
      if (!primaryMatch) continue;
      const primary = primaryMatch[1] as "DEM" | "REP" | "OPEN" | "GENERAL";
      const canonicalIssue = primaryMatch[2];
      issueCounts.push({ canonicalIssue, primary, count });
    }
  } catch {
    issueCounts = [];
  }

  return {
    scope,
    sampleSize: scopeTotal,
    thresholdMet,
    issueCounts,
    primaryTotals,
  };
}
