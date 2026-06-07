/**
 * civic-logistics.ts
 *
 * Pure mapper: Google Civic `voterinfo` response → `BallotLogistics`.
 *
 * HONESTY RULE (hard constraint, matches NJ_ACCURACY_ORACLE Pillar 3):
 *   - When civic returns nothing for a field, the field is NULL or an honest
 *     vote.gov fallback — NEVER a fabricated polling place, address, or hours.
 *   - Congressional district comes from the civic response ONLY when a
 *     congressional-scope contest is present. It is NOT reliably available in
 *     the no-contest case (e.g. a primary that has passed). See FINDING below.
 *
 * FINDING — Congressional district in Civic voterinfo:
 *   The `voterinfo` endpoint has no top-level "voter's districts" field. A
 *   congressional district is inferable ONLY when a US House contest is returned
 *   with `district.scope === "congressional"` (or similar scope token) and a
 *   `district.name` such as "New Jersey's 1st" or "1". When no contests are
 *   returned (e.g. a primary has passed, or the address is between election
 *   cycles) civic gives NO district signal. In that case the mapper returns
 *   `district: null`. Phase B should wire the district from the uploaded
 *   ballot's House race label (VoterChoiceApp.tsx:4688-4689) which already
 *   does this correctly. The `representativeInfoByAddress` endpoint would be
 *   more reliable but this route does not call it and adding it is out of scope.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Input shape — mirrors the CivicApiResponse returned by /api/civic/route.ts
// ---------------------------------------------------------------------------

export interface CivicPollingLocation {
  name: string;
  address: string;
  hours: string;
  notes: string;
}

export interface CivicContest {
  office: string;
  district: string;
  type: string;
  candidates: { name: string; party: string }[];
}

/**
 * The shape returned by /api/civic/route.ts (CivicApiResponse).
 * We accept a partial here so callers can pass a minimal object.
 */
export interface CivicApiInput {
  pollingLocations?: CivicPollingLocation[];
  earlyVoteSites?: CivicPollingLocation[];
  contests?: CivicContest[];
  electionName?: string;
  county?: string;
  source?: unknown; // BallotSourceSummary — opaque to this mapper
  error?: string;
}

// ---------------------------------------------------------------------------
// Optional stateData input — we only need earlyVoting from StateElectionData
// ---------------------------------------------------------------------------

export interface EarlyVotingInput {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface StateDataInput {
  earlyVoting?: EarlyVotingInput;
}

// ---------------------------------------------------------------------------
// Output type — BallotLogistics
// ---------------------------------------------------------------------------

export interface PollingPlace {
  name: string;
  address: string;
  hours: string;
  notes?: string;
}

export interface EarlyVotingWindow {
  start: string; // ISO YYYY-MM-DD
  end: string; // ISO YYYY-MM-DD
  location?: string; // name/address of early site, when known
}

/**
 * `source` discriminator tells consumers where each data point came from:
 *   "civic"    — real value from Google Civic voterinfo response
 *   "state"    — derived from StateElectionData (stateData param)
 *   "fallback" — honest "no data" signal; voter should consult vote.gov
 */
export type LogisticsSource = "civic" | "state" | "fallback";

export interface BallotLogistics {
  /**
   * Congressional district in "NJ-01" or "TX-7" form, when available.
   * NULL when civic did not return a House contest (see FINDING above).
   * The rendered UI should fall back to the ballot-extraction district in this case.
   */
  congressionalDistrict: string | null;

  /**
   * The voter's Election-Day polling place.
   * NULL when civic returned no polling location — use vote.gov fallback instead.
   */
  pollingPlace: PollingPlace | null;

  /**
   * Early-voting window, when available.
   * Sourced from civic earlyVoteSites (preferred) or stateData.earlyVoting.
   * NULL when neither source has the data.
   */
  earlyVoting: EarlyVotingWindow | null;

  /**
   * Where each field originated. One discriminator covers the whole object;
   * more granular provenance can be added per-field if needed later.
   */
  source: LogisticsSource;

  /**
   * Honest fallback pointer shown when civic data is absent.
   * Always present; consumers may ignore it when `source === "civic"`.
   */
  fallbackUrl: "https://vote.gov/";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to extract the voter's congressional district from the civic
 * contests list. Returns null when no congressional House contest is present.
 *
 * Google Civic `district.name` for a US House contest is typically one of:
 *   "New Jersey's 1st Congressional District" — parse the digit(s)
 *   "1" or "01" — just a number
 *   "TX-7" or "NJ-01" — already formatted
 *
 * We normalise all of these to "<STATE_ABBR>-<CD>" form when we can determine
 * the state; otherwise we return the raw district name trimmed.
 */
function extractCongressionalDistrict(
  contests: CivicContest[],
  county?: string,
): string | null {
  if (!contests || contests.length === 0) return null;

  // Find a US House contest. civic `office` is typically "U.S. House" or
  // "United States House of Representatives" with a district name.
  const houseContest = contests.find(
    (c) => /house/i.test(c.office) && /u\.?s\.?|united states/i.test(c.office),
  );

  if (!houseContest || !houseContest.district) return null;

  const raw = houseContest.district.trim();
  if (!raw) return null;

  // Already in "XX-N" form
  if (/^[A-Z]{2}-\d+$/i.test(raw)) return raw.toUpperCase();

  // Extract just a number and pair it with the state from the county field
  // e.g. "Camden County, NJ" → "NJ"
  const digitMatch = raw.match(/\b(\d+)(st|nd|rd|th)?\b/i);
  if (!digitMatch) return raw; // return raw if we can't parse

  const cdNum = digitMatch[1].replace(/^0+/, "") || digitMatch[1];

  // Try to get a 2-letter state code from county (often "Camden County, NJ")
  const stateMatch = county?.match(/\b([A-Z]{2})\b/);
  if (stateMatch) {
    return `${stateMatch[1]}-${cdNum.padStart(2, "0")}`;
  }

  return raw;
}

/**
 * Pick the most useful polling place from the civic response.
 * Returns null when no location is available.
 */
function pickPollingPlace(civic: CivicApiInput): PollingPlace | null {
  const locs = civic.pollingLocations ?? [];
  if (locs.length === 0) return null;

  const loc = locs[0];
  if (!loc.address) return null; // name-only without address is not useful

  return {
    name: loc.name || "Polling Place",
    address: loc.address,
    hours: loc.hours || "",
    notes: loc.notes || undefined,
  };
}

/**
 * Extract the earliest early-vote site from civic, or fall back to
 * stateData.earlyVoting if provided.
 */
function extractEarlyVoting(
  civic: CivicApiInput,
  stateData?: StateDataInput,
): EarlyVotingWindow | null {
  // Prefer civic earlyVoteSites (address-specific)
  const sites = civic.earlyVoteSites ?? [];
  if (sites.length > 0) {
    const site = sites[0];
    // sites carry startDate/endDate encoded in `hours` via extractLocation in route.ts:
    // "YYYY-MM-DD – YYYY-MM-DD" or "YYYY-MM-DD – YYYY-MM-DD: HH:MM AM – HH:MM PM"
    // We try to parse them; otherwise we fall through to stateData.
    const rangeMatch = site.hours?.match(
      /(\d{4}-\d{2}-\d{2})\s*[–-]\s*(\d{4}-\d{2}-\d{2})/,
    );
    if (rangeMatch) {
      return {
        start: rangeMatch[1],
        end: rangeMatch[2],
        location: site.name || site.address || undefined,
      };
    }
  }

  // Fall back to stateData
  if (
    stateData?.earlyVoting?.available &&
    stateData.earlyVoting.startDate &&
    stateData.earlyVoting.endDate
  ) {
    return {
      start: stateData.earlyVoting.startDate,
      end: stateData.earlyVoting.endDate,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Map a Google Civic voterinfo API response to a `BallotLogistics` object.
 *
 * @param civic    - The response from /api/civic/route.ts (CivicApiResponse).
 * @param stateData - Optional StateElectionData subset, used for early-voting
 *                   fallback when civic earlyVoteSites is absent.
 *
 * Honesty contract:
 *   - `pollingPlace` is null when civic returned no location.
 *   - `congressionalDistrict` is null when civic returned no House contest.
 *   - `earlyVoting` is null when neither civic nor stateData has dates.
 *   - `fallbackUrl` is always "https://vote.gov/".
 */
export function toBallotLogistics(
  civic: CivicApiInput,
  stateData?: StateDataInput,
): BallotLogistics {
  const contests = civic.contests ?? [];
  const pollingPlace = pickPollingPlace(civic);
  const congressionalDistrict = extractCongressionalDistrict(
    contests,
    civic.county,
  );
  const earlyVoting = extractEarlyVoting(civic, stateData);

  // Determine the source discriminator
  let source: LogisticsSource = "fallback";
  if (pollingPlace) {
    source = "civic";
  } else if (earlyVoting) {
    source = "state";
  }

  return {
    congressionalDistrict,
    pollingPlace,
    earlyVoting,
    source,
    fallbackUrl: "https://vote.gov/",
  };
}
