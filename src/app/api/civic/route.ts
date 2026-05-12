import { NextRequest, NextResponse } from "next/server";
import type {
  LiveElectionData,
  BallotContest,
  Candidate,
  PollingLocation,
  PartialError,
  CivicDistricts,
} from "@/lib/types";
import { getVoterIdInfoSync } from "@/lib/voterIdData";

// ── In-memory cache ────────────────────────────────────────────────────────
interface CacheEntry {
  data: LiveElectionData;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Timeout helper ─────────────────────────────────────────────────────────
function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
}

// ── Google Civic helpers ───────────────────────────────────────────────────

interface GoogleAddress {
  line1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface GooglePollingLocation {
  address?: GoogleAddress;
  name?: string;
  notes?: string;
  pollingHours?: string;
  endDate?: string;
}

function parsePollingLocation(raw: GooglePollingLocation): PollingLocation {
  return {
    locationName: raw.name,
    address: {
      line1: raw.address?.line1,
      city: raw.address?.city,
      state: raw.address?.state,
      zip: raw.address?.zip,
    },
    notes: raw.notes,
    pollingHours: raw.pollingHours,
    endDate: raw.endDate,
  };
}

interface GoogleCandidate {
  name?: string;
  party?: string;
  candidateId?: string;
  phone?: string;
  email?: string;
  candidateUrl?: string;
  channels?: { type: string; id: string }[];
}

interface GoogleContest {
  office?: string;
  district?: { name?: string };
  candidates?: GoogleCandidate[];
}

function parseContest(raw: GoogleContest): BallotContest {
  const candidates: Candidate[] = (raw.candidates ?? []).map((c) => ({
    name: c.name ?? "Unknown",
    party: c.party,
    candidateId: c.candidateId,
    phone: c.phone,
    email: c.email,
    candidateUrl: c.candidateUrl,
    channels: c.channels,
  }));
  return {
    office: raw.office ?? "Unknown Office",
    district: raw.district?.name,
    candidates,
  };
}

interface GoogleRepresentative {
  ocdId?: string;
  name?: string;
}

function parseDistricts(
  divisions: Record<string, GoogleRepresentative> | undefined,
  stateName: string,
  stateCode: string,
): CivicDistricts {
  const districts: CivicDistricts = { stateName, stateCode };
  if (!divisions) return districts;

  for (const ocdId of Object.keys(divisions)) {
    if (ocdId.includes("cd:")) {
      const match = ocdId.match(/cd:(\w+)/);
      if (match) districts.congressionalDistrict = match[1];
    } else if (ocdId.includes("sldu:")) {
      const match = ocdId.match(/sldu:(\w+)/);
      if (match) districts.stateSenateDistrict = match[1];
    } else if (ocdId.includes("sldl:")) {
      const match = ocdId.match(/sldl:(\w+)/);
      if (match) districts.stateHouseDistrict = match[1];
    } else if (ocdId.includes("county:")) {
      const match = ocdId.match(/county:([^/]+)/);
      if (match)
        districts.county = match[1]
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  return districts;
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.trim();

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: "Invalid zip code. Must be 5 digits." },
      { status: 400 },
    );
  }

  // Check cache
  const cached = cache.get(zip);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ ...cached.data, fromCache: true });
  }

  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  const errors: PartialError[] = [];
  const fetchedAt = new Date().toISOString();

  // Partial result that we accumulate
  const result: LiveElectionData = {
    zipCode: zip,
    stateCodes: [],
    fetchedAt,
    errors: [],
  };

  if (!apiKey) {
    errors.push({
      source: "civic",
      message: "GOOGLE_CIVIC_API_KEY is not configured",
      timestamp: fetchedAt,
    });
    result.errors = errors;
    return NextResponse.json(result);
  }

  // ── voterInfoByAddress ─────────────────────────────────────────────────
  const voterInfoUrl =
    `https://www.googleapis.com/civicinfo/v2/voterinfo` +
    `?key=${apiKey}&address=${encodeURIComponent(zip)}&returnAllAvailableData=true`;

  try {
    const resp = await fetchWithTimeout(voterInfoUrl);
    if (resp.ok) {
      const data = (await resp.json()) as {
        election?: { name?: string; electionDay?: string };
        pollingLocations?: GooglePollingLocation[];
        earlyVoteSites?: GooglePollingLocation[];
        contests?: GoogleContest[];
      };

      // data.state[0].name has the full state name — we use repInfo for the code instead
      if (data.election) {
        result.electionName = data.election.name;
        result.electionDate = data.election.electionDay;
      }

      if (data.pollingLocations && data.pollingLocations.length > 0) {
        result.pollingLocation = parsePollingLocation(data.pollingLocations[0]);
      }

      if (data.earlyVoteSites) {
        result.earlyVoteSites = data.earlyVoteSites.map(parsePollingLocation);
      }

      if (data.contests) {
        result.ballotContests = data.contests.map(parseContest);
      }
    } else {
      const errBody = await resp.text();
      console.error("[civic] voterInfo error:", resp.status, errBody);
      errors.push({
        source: "civic",
        message: `Google Civic voterInfo returned ${resp.status}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[civic] voterInfo fetch error:", message);
    errors.push({
      source: "civic",
      message: `Google Civic voterInfo failed: ${message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // ── representativeInfoByAddress ────────────────────────────────────────
  const repInfoUrl =
    `https://www.googleapis.com/civicinfo/v2/representatives` +
    `?key=${apiKey}&address=${encodeURIComponent(zip)}`;

  try {
    const resp = await fetchWithTimeout(repInfoUrl);
    if (resp.ok) {
      const data = (await resp.json()) as {
        normalizedInput?: { state?: string; city?: string };
        divisions?: Record<string, GoogleRepresentative>;
        offices?: { name?: string; divisionId?: string }[];
      };

      const stateCode = data.normalizedInput?.state?.toUpperCase() ?? "";
      if (stateCode) {
        result.stateCodes = [stateCode];
        result.districts = parseDistricts(
          data.divisions,
          data.normalizedInput?.state ?? "",
          stateCode,
        );
        result.districts.county =
          result.districts.county ?? data.normalizedInput?.city;

        // Load voter ID info for the state
        const voterIdInfo = getVoterIdInfoSync(stateCode);
        if (voterIdInfo) {
          result.voterIdInfo = voterIdInfo;
        }
      }
    } else {
      const errBody = await resp.text();
      console.error("[civic] repInfo error:", resp.status, errBody);
      errors.push({
        source: "civic",
        message: `Google Civic repInfo returned ${resp.status}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[civic] repInfo fetch error:", message);
    errors.push({
      source: "civic",
      message: `Google Civic repInfo failed: ${message}`,
      timestamp: new Date().toISOString(),
    });
  }

  result.errors = errors;

  // Cache if we got at least a state code (partial success is still cacheable)
  if (result.stateCodes.length > 0 || result.ballotContests) {
    cache.set(zip, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return NextResponse.json(result);
}
