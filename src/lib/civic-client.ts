/**
 * Google Civic Information API client.
 * Server-side only — API key is never exposed to the browser.
 *
 * Docs: https://developers.google.com/civic-information/docs/using_api
 * Rate limit: 25,000 queries/day
 * Coverage: 40+ states + DC
 */

import type {
  PollingLocation,
  BallotContest,
  CandidateInfo,
  DistrictInfo,
} from "./api-types";

const CIVIC_BASE = "https://www.googleapis.com/civicinfo/v2";
const TIMEOUT_MS = 10000;

// ---- Raw API response types (subset of what Civic returns) -----------------

interface RawAddress {
  locationName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface RawPollingLocation {
  address?: RawAddress;
  pollingHours?: string;
  notes?: string;
}

interface RawCandidate {
  name?: string;
  party?: string;
  phone?: string;
  email?: string;
  candidateUrl?: string;
}

interface RawContest {
  type?: string;
  office?: string;
  district?: { name?: string };
  candidates?: RawCandidate[];
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumBrief?: string;
}

interface RawDivision {
  name?: string;
  officeIndices?: number[];
}

interface CivicVoterInfoResponse {
  pollingLocations?: RawPollingLocation[];
  earlyVoteSites?: RawPollingLocation[];
  contests?: RawContest[];
  divisions?: Record<string, RawDivision>;
}

interface CivicRepresentativeResponse {
  divisions?: Record<string, RawDivision>;
  offices?: Array<{
    name?: string;
    divisionId?: string;
    levels?: string[];
    roles?: string[];
  }>;
}

// ---- Parsing helpers -------------------------------------------------------

function parseAddress(addr?: RawAddress): string {
  if (!addr) return "";
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.zip,
  ].filter(Boolean);
  return parts.join(", ");
}

function parsePollingLocation(raw: RawPollingLocation): PollingLocation {
  return {
    locationName: raw.address?.locationName ?? "Polling Location",
    address: parseAddress(raw.address),
    city: raw.address?.city ?? "",
    state: raw.address?.state ?? "",
    zip: raw.address?.zip ?? "",
    hours: raw.pollingHours ?? null,
    notes: raw.notes ?? null,
  };
}

function parseCandidate(raw: RawCandidate): CandidateInfo {
  return {
    name: raw.name ?? "Unknown Candidate",
    party: raw.party ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    candidateUrl: raw.candidateUrl ?? null,
  };
}

function parseContest(raw: RawContest): BallotContest {
  return {
    type: raw.type ?? "General",
    office: raw.office ?? raw.referendumTitle ?? "Unknown Office",
    district: raw.district?.name ?? null,
    candidates: (raw.candidates ?? []).map(parseCandidate),
    referendumTitle: raw.referendumTitle,
    referendumSubtitle: raw.referendumSubtitle,
    referendumBrief: raw.referendumBrief,
  };
}

function parseDistricts(divisions?: Record<string, RawDivision>): DistrictInfo {
  if (!divisions) return districtDefault();
  const ids = Object.keys(divisions);

  const county = ids
    .find((id) => id.includes("county:"))
    ?.replace(/.*county:/, "")
    .replace(/_/g, " ");

  const cd = ids.find((id) => id.includes("/cd:"))?.match(/\/cd:(\d+)/)?.[1];

  const sldu = ids
    .find((id) => id.includes("/sldu:"))
    ?.match(/\/sldu:(\d+)/)?.[1];

  const sldl = ids
    .find((id) => id.includes("/sldl:"))
    ?.match(/\/sldl:(\d+)/)?.[1];

  return {
    county: county ? capitalize(county) : null,
    congressionalDistrict: cd ? `CD-${cd}` : null,
    stateLegislativeUpper: sldu ? `Senate District ${sldu}` : null,
    stateLegislativeLower: sldl ? `House District ${sldl}` : null,
  };
}

function districtDefault(): DistrictInfo {
  return {
    county: null,
    congressionalDistrict: null,
    stateLegislativeUpper: null,
    stateLegislativeLower: null,
  };
}

function capitalize(str: string): string {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---- API calls -------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

export interface CivicData {
  pollingLocation: PollingLocation | null;
  contests: BallotContest[];
  districts: DistrictInfo | null;
  error: string | null;
}

/**
 * Fetches voter info (polling location + contests) for a given address.
 * Uses voterInfoQuery endpoint.
 */
export async function fetchCivicVoterInfo(
  address: string,
  apiKey: string,
): Promise<CivicData> {
  const url = new URL(`${CIVIC_BASE}/voterinfo`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("address", address);
  url.searchParams.set("electionId", "2000"); // upcoming election

  try {
    const resp = await fetchWithTimeout(url.toString());

    if (resp.status === 400 || resp.status === 404) {
      // No election data or address not found — try representatives endpoint
      return await fetchCivicRepresentatives(address, apiKey);
    }

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error(`Civic API error ${resp.status}:`, body);
      return {
        pollingLocation: null,
        contests: [],
        districts: null,
        error: `Civic API returned ${resp.status}`,
      };
    }

    const data = (await resp.json()) as CivicVoterInfoResponse;

    const polling =
      data.pollingLocations?.[0] ?? data.earlyVoteSites?.[0] ?? null;

    return {
      pollingLocation: polling ? parsePollingLocation(polling) : null,
      contests: (data.contests ?? []).map(parseContest),
      districts: parseDistricts(data.divisions),
      error: null,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        pollingLocation: null,
        contests: [],
        districts: null,
        error: "Civic API timed out",
      };
    }
    console.error("Civic API fetch error:", err);
    return {
      pollingLocation: null,
      contests: [],
      districts: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fallback: fetch representative/district data when voterinfo isn't available.
 */
async function fetchCivicRepresentatives(
  address: string,
  apiKey: string,
): Promise<CivicData> {
  const url = new URL(`${CIVIC_BASE}/representatives`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("address", address);

  try {
    const resp = await fetchWithTimeout(url.toString());
    if (!resp.ok) {
      return {
        pollingLocation: null,
        contests: [],
        districts: null,
        error: `Representatives API returned ${resp.status}`,
      };
    }
    const data = (await resp.json()) as CivicRepresentativeResponse;
    return {
      pollingLocation: null,
      contests: [],
      districts: parseDistricts(data.divisions),
      error: null,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        pollingLocation: null,
        contests: [],
        districts: null,
        error: "Civic representatives API timed out",
      };
    }
    return {
      pollingLocation: null,
      contests: [],
      districts: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
