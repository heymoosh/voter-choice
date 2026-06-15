/**
 * Anonymous session counters for the Polis-style overlap visualization.
 *
 * Privacy guarantee (counters path): NO individual record is ever written.
 * Counters increment at session-end over aggregate keys only. The dedupe token
 * (sessionId-keyed) is an idempotency guard with 1-hour TTL — it is not a user
 * record.
 *
 * `recordConcernEvents` (below) is a separate, opt-in Postgres write that
 * persists per-concern event rows for taxonomy analysis. It stores NO
 * identifier (no session id), NO address, NO free-text verbatim — state +
 * issue + stance only — so rows remain unlinkable to a person.
 *
 * Key namespace: voter-choice:counters:*
 * Dedupe namespace: voter-choice:dedupe:*
 */

import { isDurableStoreConfigured, redisCommand } from "./durable-store";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { voterIssueEvents } from "../../../db/schema";

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
  scope: "county" | "state" | "national";
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

// Strip Redis glob metacharacters and colons (which would break key structure)
// from any value used in key construction.
function sanitizeKeySegment(s: string): string {
  return s.replace(/[*?[\]\\:]/g, "");
}

function statePrefix(stateCode: string): string {
  return `${NS}:state:${sanitizeKeySegment(stateCode)}`;
}

function countyPrefix(stateCode: string, county: string): string {
  return `${NS}:county:${sanitizeKeySegment(stateCode)}:${sanitizeKeySegment(county)}`;
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
// recordConcernEvents — anonymous per-concern event rows (Postgres)
// ---------------------------------------------------------------------------

export interface ConcernEvent {
  canonicalIssue: string | null;
  offTopicLabel: string | null;
  stance: string | null;
  rank: number | null;
  confidence: "clear" | "low" | "off_topic";
  wasOffTopic: boolean;
}

export interface ConcernEventInput {
  stateCode: string;
  concernEvents: ConcernEvent[];
}

/**
 * Persist anonymous per-concern event rows at session-end.
 *
 * Best-effort and fully isolated from the counter path: it never throws and
 * its outcome never affects the HTTP response. Gated independently on BOTH:
 *  - VOTER_ISSUE_EVENTS_ENABLED === "true" (kill-switch, default OFF), and
 *  - DATABASE_URL configured (getDb() !== DB_NOT_CONFIGURED).
 * Either unset → silent no-op.
 *
 * Stores NO identifier (no session id), NO address, NO free-text verbatim.
 * The caller (route) only invokes this when the session was not already
 * counted, so the Redis 1-hour dedupe doubles as the event-row dedupe.
 */
export async function recordConcernEvents(
  input: ConcernEventInput,
): Promise<void> {
  try {
    if (process.env.VOTER_ISSUE_EVENTS_ENABLED !== "true") return;
    if (input.concernEvents.length === 0) return;

    const db = getDb();
    if (db === DB_NOT_CONFIGURED) return;

    const rows = input.concernEvents.map((e) => ({
      canonicalIssue: e.canonicalIssue,
      offTopicLabel: e.offTopicLabel,
      resolvedStance: e.stance,
      rank: e.rank,
      wasOffTopic: e.wasOffTopic,
      confidenceLevel: e.confidence,
      stateCode: input.stateCode || null,
    }));

    await db.insert(voterIssueEvents).values(rows);
  } catch (err) {
    console.error("[counters] voter_issue_events insert failed:", err);
  }
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

// ---------------------------------------------------------------------------
// County-only overlap counts (Phase 8 bars endpoint)
// ---------------------------------------------------------------------------

export interface CountyOverlapCounts {
  /** Total finished sessions for the (stateCode, county) pair. */
  count: number;
  /**
   * For each canonical issue, the count of distinct sessions in the county
   * that confirmed it. (Summed across primaries — the bars endpoint does
   * not split by primary.)
   *
   * Note: this is an upper bound when the same session confirmed multiple
   * issues — but each per-issue-per-primary counter increments at most once
   * per session-end because dedupe gates the whole increment block. So the
   * count is exact.
   */
  issueCounts: Record<string, number>;
}

const EMPTY_OVERLAP: CountyOverlapCounts = { count: 0, issueCounts: {} };

/**
 * Fetch county-only finished-session count + per-issue counts.
 *
 * Phase 8 bars use this directly (no scope fallback — "your county" framing).
 */
export async function fetchCountyOverlapCounts(
  stateCode: string,
  county: string,
): Promise<CountyOverlapCounts> {
  if (isDurableStoreConfigured()) {
    try {
      const prefix = countyPrefix(stateCode, county);
      const count = await durableGetTotal(prefix);
      const issueRows = await durableGetIssueCounts(prefix);
      const issueCounts: Record<string, number> = {};
      for (const row of issueRows) {
        issueCounts[row.canonicalIssue] =
          (issueCounts[row.canonicalIssue] ?? 0) + row.count;
      }
      return { count, issueCounts };
    } catch (err) {
      console.error("[counters] Redis county overlap fetch failed:", err);
      return { ...EMPTY_OVERLAP };
    }
  }
  return memFetchCountyOverlapCounts(stateCode, county);
}

function memFetchCountyOverlapCounts(
  stateCode: string,
  county: string,
): CountyOverlapCounts {
  const prefix = countyPrefix(stateCode, county);
  const count = memGet(`${prefix}:total`);

  const issueCounts: Record<string, number> = {};
  for (const [key, value] of memCounters) {
    if (!key.startsWith(prefix)) continue;
    if (value === 0) continue;
    const m = key.match(/:primary:(DEM|REP|OPEN|GENERAL):issue:(.+)$/);
    if (!m) continue;
    const canonicalIssue = m[2];
    issueCounts[canonicalIssue] = (issueCounts[canonicalIssue] ?? 0) + value;
  }

  return { count, issueCounts };
}

// ---------------------------------------------------------------------------
// National overlap counts (PR 10 — national-default polis)
// ---------------------------------------------------------------------------

/**
 * Fetch nation-wide finished-session count + per-issue counts.
 *
 * Aggregates across every state-level counter. Because
 * `incrementSessionCounters` writes a state-level total for every session
 * (county is optional), summing state totals = exact nation-wide session
 * count. Per-issue counts sum across every primary and every state.
 *
 * Optional `stateCode` argument: when provided, restricts the aggregation
 * to a single state (still aggregating across every county within it).
 * This is a forward-looking sibling for future "your state" surfaces; the
 * PR 10 polis routes do not pass it.
 *
 * PR 10 — "Most people share a lot of the same issues and priorities. It
 * will shock them to see how many others are actually truly in the middle."
 * The polis view defaults to this national reading.
 *
 * Privacy: counts only. Same allowlisted shape as `CountyOverlapCounts`.
 * NO user_id, session_id, name, address, email.
 */
export async function fetchNationalOverlapCounts(
  stateCode?: string,
): Promise<CountyOverlapCounts> {
  if (isDurableStoreConfigured()) {
    try {
      return await durableFetchNationalOverlapCounts(stateCode);
    } catch (err) {
      console.error("[counters] Redis national overlap fetch failed:", err);
      return { ...EMPTY_OVERLAP };
    }
  }
  return memFetchNationalOverlapCounts(stateCode);
}

async function durableFetchNationalOverlapCounts(
  stateCode?: string,
): Promise<CountyOverlapCounts> {
  // When `stateCode` is provided, narrow the glob to one state.
  const stateGlob = stateCode
    ? `${NS}:state:${sanitizeKeySegment(stateCode)}`
    : `${NS}:state:*`;

  // Sum every state-level :total counter for the national session count.
  const totalKeys = await redisCommand<string[]>([
    "KEYS",
    `${stateGlob}:total`,
  ]);
  // Filter out per-primary subtotals (which match :primary:X:total too).
  // The exact state-level :total pattern is `${NS}:state:<code>:total`
  // with no :primary: segment in between.
  const stateTotalKeys = (totalKeys ?? []).filter(
    (k) => !k.includes(":primary:"),
  );

  let count = 0;
  if (stateTotalKeys.length > 0) {
    const values = await Promise.all(
      stateTotalKeys.map((k) => redisCommand<string>(["GET", k])),
    );
    for (const v of values) count += Number(v ?? 0);
  }

  // Sum every state-level per-issue counter across primaries.
  const issueKeys = await redisCommand<string[]>([
    "KEYS",
    `${stateGlob}:primary:*:issue:*`,
  ]);
  const issueCounts: Record<string, number> = {};
  if (issueKeys && issueKeys.length > 0) {
    const values = await Promise.all(
      issueKeys.map((k) => redisCommand<string>(["GET", k])),
    );
    for (let i = 0; i < issueKeys.length; i++) {
      const v = Number(values[i] ?? 0);
      if (v === 0) continue;
      const m = issueKeys[i].match(
        /:primary:(DEM|REP|OPEN|GENERAL):issue:(.+)$/,
      );
      if (!m) continue;
      const issue = m[2];
      issueCounts[issue] = (issueCounts[issue] ?? 0) + v;
    }
  }

  return { count, issueCounts };
}

// ---------------------------------------------------------------------------
// National polis aggregate (2026 redesign — "see where you stand" national zoom)
// ---------------------------------------------------------------------------

/**
 * Fetch the nation-wide polis aggregate: per-primary totals and per-issue
 * counts summed across every state-level counter, in the same
 * `PolisAggregate` shape the polis route renders.
 *
 * Privacy: aggregate counts only — same guarantee as everything else here.
 */
export async function fetchNationalPolisAggregate(): Promise<PolisAggregate> {
  if (isDurableStoreConfigured()) {
    try {
      return await durableFetchNationalPolisAggregate();
    } catch (err) {
      console.error("[counters] Redis national aggregate fetch failed:", err);
      return { ...EMPTY_AGGREGATE, scope: "national" };
    }
  }
  return memFetchNationalPolisAggregate();
}

async function durableFetchNationalPolisAggregate(): Promise<PolisAggregate> {
  // Nation-wide session count: sum exact state-level :total keys.
  const totalKeys = await redisCommand<string[]>([
    "KEYS",
    `${NS}:state:*:total`,
  ]);
  const stateTotalKeys = (totalKeys ?? []).filter(
    (k) => !k.includes(":primary:"),
  );
  let sampleSize = 0;
  if (stateTotalKeys.length > 0) {
    const values = await Promise.all(
      stateTotalKeys.map((k) => redisCommand<string>(["GET", k])),
    );
    for (const v of values) sampleSize += Number(v ?? 0);
  }

  // Per-primary totals across states.
  const primaryTotalsMap = new Map<string, number>();
  const primaryKeys = (totalKeys ?? []).filter((k) => k.includes(":primary:"));
  if (primaryKeys.length > 0) {
    const values = await Promise.all(
      primaryKeys.map((k) => redisCommand<string>(["GET", k])),
    );
    for (let i = 0; i < primaryKeys.length; i++) {
      const m = primaryKeys[i].match(/:primary:(DEM|REP|OPEN|GENERAL):total$/);
      if (!m) continue;
      const v = Number(values[i] ?? 0);
      if (v === 0) continue;
      primaryTotalsMap.set(m[1], (primaryTotalsMap.get(m[1]) ?? 0) + v);
    }
  }

  // Per-(primary, issue) counts across states.
  const issueKeys = await redisCommand<string[]>([
    "KEYS",
    `${NS}:state:*:primary:*:issue:*`,
  ]);
  const issueCountsMap = new Map<string, number>();
  if (issueKeys && issueKeys.length > 0) {
    const values = await Promise.all(
      issueKeys.map((k) => redisCommand<string>(["GET", k])),
    );
    for (let i = 0; i < issueKeys.length; i++) {
      const m = issueKeys[i].match(
        /:primary:(DEM|REP|OPEN|GENERAL):issue:(.+)$/,
      );
      if (!m) continue;
      const v = Number(values[i] ?? 0);
      if (v === 0) continue;
      const key = `${m[1]}|${m[2]}`;
      issueCountsMap.set(key, (issueCountsMap.get(key) ?? 0) + v);
    }
  }

  return buildNationalAggregate(sampleSize, primaryTotalsMap, issueCountsMap);
}

function memFetchNationalPolisAggregate(): PolisAggregate {
  let sampleSize = 0;
  const primaryTotalsMap = new Map<string, number>();
  const issueCountsMap = new Map<string, number>();

  for (const [key, value] of memCounters) {
    if (value === 0) continue;
    if (!key.startsWith(`${NS}:state:`)) continue;
    if (key.endsWith(":total") && !key.includes(":primary:")) {
      sampleSize += value;
      continue;
    }
    const totalMatch = key.match(/:primary:(DEM|REP|OPEN|GENERAL):total$/);
    if (totalMatch) {
      primaryTotalsMap.set(
        totalMatch[1],
        (primaryTotalsMap.get(totalMatch[1]) ?? 0) + value,
      );
      continue;
    }
    const issueMatch = key.match(
      /^.*:state:[^:]+:primary:(DEM|REP|OPEN|GENERAL):issue:(.+)$/,
    );
    if (issueMatch) {
      const k = `${issueMatch[1]}|${issueMatch[2]}`;
      issueCountsMap.set(k, (issueCountsMap.get(k) ?? 0) + value);
    }
  }

  return buildNationalAggregate(sampleSize, primaryTotalsMap, issueCountsMap);
}

function buildNationalAggregate(
  sampleSize: number,
  primaryTotalsMap: Map<string, number>,
  issueCountsMap: Map<string, number>,
): PolisAggregate {
  const primaryTotals = PRIMARIES.map((p) => ({
    primary: p,
    count: primaryTotalsMap.get(p) ?? 0,
  })).filter((pt) => pt.count > 0);

  const issueCounts: PolisAggregate["issueCounts"] = [];
  for (const [key, count] of issueCountsMap) {
    const [primary, canonicalIssue] = key.split("|");
    issueCounts.push({
      canonicalIssue,
      primary: primary as "DEM" | "REP" | "OPEN" | "GENERAL",
      count,
    });
  }

  return {
    scope: "national",
    sampleSize,
    thresholdMet: sampleSize >= THRESHOLD,
    issueCounts,
    primaryTotals,
  };
}

function memFetchNationalOverlapCounts(
  stateCode?: string,
): CountyOverlapCounts {
  let count = 0;
  const issueCounts: Record<string, number> = {};
  const statePrefix = stateCode
    ? `${NS}:state:${sanitizeKeySegment(stateCode)}:`
    : `${NS}:state:`;

  for (const [key, value] of memCounters) {
    if (value === 0) continue;
    if (!key.startsWith(statePrefix)) continue;
    // State-level total keys: `${NS}:state:<code>:total`
    // (Per-primary totals end :primary:<P>:total — exclude them.)
    if (key.endsWith(":total") && !key.includes(":primary:")) {
      count += value;
      continue;
    }
    // State-level per-issue keys: `${NS}:state:<code>:primary:<P>:issue:<I>`
    {
      const m = key.match(
        /^.*:state:[^:]+:primary:(DEM|REP|OPEN|GENERAL):issue:(.+)$/,
      );
      if (!m) continue;
      const issue = m[2];
      issueCounts[issue] = (issueCounts[issue] ?? 0) + value;
    }
  }

  return { count, issueCounts };
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
