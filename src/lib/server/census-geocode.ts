/**
 * src/lib/server/census-geocode.ts
 *
 * Address → state + county + congressional district via the US Census
 * Bureau geocoder (free, no API key). This is the resolver behind
 * /api/delegation: Google Civic's representatives endpoint was retired in
 * 2025 and its voterinfo endpoint only answers during active elections, so
 * "who represents me right now" has to come from Census geographies.
 *
 * One GET per lookup (retried once on transient upstream trouble — see
 * below):
 *   https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress
 *     ?address=…&benchmark=Public_AR_Current&vintage=Current_Current
 *     &format=json&layers=all
 *
 * The congressional-district layer is keyed by congress number ("119th
 * Congressional Districts" today). We match the key by suffix so the
 * 119th→120th vintage rollover doesn't break the parser.
 *
 * The geocoder is a free government service with no reliability SLA: it
 * throws connection errors, 5xx responses, and truncated bodies under
 * ordinary load, not just outages. A single blip used to surface straight
 * to the voter as "the lookup service is having trouble" (honest, but
 * needless — see /api/delegation's 502 vs 200 split) on the very first
 * attempt. We now retry once on a retryable failure (network error, 5xx,
 * unparseable JSON) with jittered backoff before giving up. A 4xx (our
 * request was malformed) is not retried — trying again won't change it.
 *
 * This module is server-only. Never import it from client components.
 */

const CENSUS_GEOCODER_URL =
  "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress";

const FETCH_TIMEOUT_MS = 4000;
const MAX_ATTEMPTS = 2;

/** Territories / districts with no voting member of Congress. */
const NON_VOTING_AREAS = new Set(["DC", "PR", "GU", "VI", "AS", "MP"]);

export interface CensusDistrictResult {
  stateCode: string;
  stateName: string;
  /** County NAME as Census reports it (e.g. "Mercer County"); null if absent. */
  county: string | null;
  /**
   * Congressional district number. 0 = at-large (Census CD code "00").
   * Null when the area has no voting representative (DC, territories — CD
   * codes "98"/"99"/"ZZ", or a state code in NON_VOTING_AREAS).
   */
  district: number | null;
  matchedAddress: string;
}

export type CensusGeocodeOutcome =
  | { status: "ok"; result: CensusDistrictResult }
  /** The geocoder answered but found no match for the address. */
  | { status: "no_match" }
  /** Network failure / non-200 / malformed payload — retryable. */
  | { status: "error" };

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as UnknownRecord)
    : null;
}

function getString(rec: UnknownRecord | null, key: string): string | null {
  const v = rec?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** First entry of the geography layer whose name ends with `suffix`. */
function findLayerEntry(
  geographies: UnknownRecord,
  suffix: string,
): UnknownRecord | null {
  for (const [name, value] of Object.entries(geographies)) {
    if (!name.endsWith(suffix)) continue;
    if (Array.isArray(value) && value.length > 0) {
      const entry = asRecord(value[0]);
      if (entry) return entry;
    }
  }
  return null;
}

/**
 * Pull the district code out of a congressional-districts layer entry.
 * The field is congress-numbered ("CD119" today) so match by shape.
 */
function districtCodeFromEntry(entry: UnknownRecord): string | null {
  for (const [key, value] of Object.entries(entry)) {
    if (/^CD\d+$/i.test(key) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  // Fallback: BASENAME on this layer is the bare district number.
  return getString(entry, "BASENAME");
}

/** "00" → at-large 0; "98"/"99"/non-numeric → non-voting (null). */
function parseDistrictCode(code: string | null): number | null {
  if (code === null) return null;
  if (!/^\d+$/.test(code)) return null;
  const n = Number(code);
  if (n >= 98) return null; // Census non-voting delegate codes
  return n;
}

function parseGeocodeResponse(payload: unknown): CensusGeocodeOutcome {
  const result = asRecord(asRecord(payload)?.result);
  const matches = result?.addressMatches;
  if (!Array.isArray(matches)) return { status: "error" };
  if (matches.length === 0) return { status: "no_match" };

  const match = asRecord(matches[0]);
  const geographies = asRecord(match?.geographies);
  if (!match || !geographies) return { status: "error" };

  const state = findLayerEntry(geographies, "States");
  const stateCode = getString(state, "STUSAB")?.toUpperCase() ?? null;
  const stateName = getString(state, "NAME");
  if (!stateCode || !stateName) return { status: "error" };

  const county = getString(findLayerEntry(geographies, "Counties"), "NAME");

  const cdEntry = findLayerEntry(geographies, "Congressional Districts");
  const rawDistrict = cdEntry ? districtCodeFromEntry(cdEntry) : null;
  const district = NON_VOTING_AREAS.has(stateCode)
    ? null
    : parseDistrictCode(rawDistrict);

  return {
    status: "ok",
    result: {
      stateCode,
      stateName,
      county,
      district,
      matchedAddress: getString(match, "matchedAddress") ?? "",
    },
  };
}

type FetchAttemptResult =
  | { kind: "payload"; payload: unknown }
  /** Non-2xx client error (bad request) — retrying changes nothing. */
  | { kind: "client_error" }
  /** Network failure, 5xx, or unparseable body — worth one retry. */
  | { kind: "retryable_error" };

/** One HTTP round trip. Never throws. Never logs the address (PRIVACY). */
async function fetchGeocodePayload(
  address: string,
): Promise<FetchAttemptResult> {
  const params = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
    layers: "all",
  });

  let response: Response;
  try {
    response = await fetch(`${CENSUS_GEOCODER_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    console.error(
      "[census-geocode] upstream fetch failed:",
      err instanceof Error ? err.name : String(err),
    );
    return { kind: "retryable_error" };
  }

  if (!response.ok) {
    console.error(`[census-geocode] upstream returned ${response.status}`);
    return response.status >= 500
      ? { kind: "retryable_error" }
      : { kind: "client_error" };
  }

  try {
    return { kind: "payload", payload: await response.json() };
  } catch {
    console.error("[census-geocode] malformed JSON payload from upstream");
    return { kind: "retryable_error" };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Geocode a free-form address to state + county + congressional district.
 * Never throws — network/parse failures come back as `{ status: "error" }`
 * after one retry (see module doc). A malformed-but-2xx payload (unexpected
 * shape) is not retried; that's a parsing bug, not upstream flakiness.
 */
export async function geocodeAddressToDistrict(
  address: string,
): Promise<CensusGeocodeOutcome> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await fetchGeocodePayload(address);
    if (result.kind === "payload") return parseGeocodeResponse(result.payload);
    if (result.kind === "client_error") return { status: "error" };
    if (attempt < MAX_ATTEMPTS) {
      const backoffMs = 300 * attempt + Math.random() * 200;
      await sleep(backoffMs);
    }
  }
  return { status: "error" };
}
