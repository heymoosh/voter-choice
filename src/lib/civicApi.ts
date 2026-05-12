/**
 * Google Civic Information API client.
 * SERVER-SIDE ONLY — never import in client components.
 */

import type {
  PollingLocation,
  BallotContest,
  Candidate,
  Districts,
} from "@/types/liveElection";

const CIVIC_API_BASE = "https://www.googleapis.com/civicinfo/v2";
const API_TIMEOUT_MS = 10_000;

export interface CivicApiResult {
  pollingLocation?: PollingLocation;
  ballotContests?: BallotContest[];
  districts?: Districts;
  electionName?: string;
  electionDate?: string;
}

interface CivicElectionData {
  election?: { name?: string; electionDay?: string };
  pollingLocations?: Array<{
    address?: {
      locationName?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    pollingHours?: string;
    notes?: string;
  }>;
  contests?: Array<{
    type?: string;
    office?: string;
    referendumTitle?: string;
    candidates?: Array<{
      name?: string;
      party?: string;
      photoUrl?: string;
      candidateUrl?: string;
    }>;
  }>;
  normalizedInput?: {
    city?: string;
    state?: string;
    zip?: string;
  };
  divisions?: Record<string, { name?: string }>;
}

function buildAddress(zip: string): string {
  return encodeURIComponent(`${zip} USA`);
}

function parsePollingLocation(
  loc: NonNullable<CivicElectionData["pollingLocations"]>[0],
): PollingLocation | undefined {
  if (!loc.address) return undefined;
  const { locationName, line1, line2, city, state, zip } = loc.address;
  const parts = [line1, line2, city, state, zip].filter(Boolean);
  return {
    name: locationName || "Polling Location",
    address: parts.join(", "),
    hours: loc.pollingHours,
    notes: loc.notes,
  };
}

function parseContests(
  contests: NonNullable<CivicElectionData["contests"]>,
): BallotContest[] {
  return contests.map((contest, idx) => {
    const name =
      contest.office || contest.referendumTitle || `Contest ${idx + 1}`;
    const candidates: Candidate[] = (contest.candidates || []).map(
      (c, cidx) => ({
        candidateId: `${idx}-${cidx}`,
        name: c.name || "Unknown Candidate",
        party: c.party,
        photoUrl: c.photoUrl,
      }),
    );
    return {
      contestId: String(idx),
      name,
      type: contest.type || "General",
      candidates,
    };
  });
}

function parseDistricts(
  divisions: NonNullable<CivicElectionData["divisions"]>,
  normalizedInput?: CivicElectionData["normalizedInput"],
): Districts {
  const districts: Districts = {};

  if (normalizedInput?.city && normalizedInput?.state) {
    districts.county = `${normalizedInput.city}, ${normalizedInput.state}`;
  }

  for (const [ocdId, div] of Object.entries(divisions)) {
    const name = div.name || ocdId;
    if (ocdId.includes("/cd:")) {
      districts.congressional = name;
    } else if (ocdId.includes("/sldu:")) {
      districts.stateSenate = name;
    } else if (ocdId.includes("/sldl:")) {
      districts.stateHouse = name;
    }
  }

  return districts;
}

export async function fetchCivicData(zip: string): Promise<CivicApiResult> {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_CIVIC_API_KEY not configured");
  }

  const address = buildAddress(zip);
  const url = `${CIVIC_API_BASE}/voterinfo?key=${apiKey}&address=${address}&electionId=2000`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try representatives endpoint as fallback for district info
      if (response.status === 400 || response.status === 404) {
        return await fetchRepresentativesFallback(zip, apiKey);
      }
      throw new Error(`Civic API error: ${response.status}`);
    }

    const data = (await response.json()) as CivicElectionData;
    const result: CivicApiResult = {};

    if (data.election) {
      result.electionName = data.election.name;
      result.electionDate = data.election.electionDay;
    }

    if (data.pollingLocations && data.pollingLocations.length > 0) {
      const parsed = parsePollingLocation(data.pollingLocations[0]);
      if (parsed) result.pollingLocation = parsed;
    }

    if (data.contests && data.contests.length > 0) {
      result.ballotContests = parseContests(data.contests);
    }

    if (data.divisions) {
      result.districts = parseDistricts(data.divisions, data.normalizedInput);
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === "AbortError") {
      throw new Error("Civic API timed out after 10 seconds");
    }
    throw error;
  }
}

async function fetchRepresentativesFallback(
  zip: string,
  apiKey: string,
): Promise<CivicApiResult> {
  const address = buildAddress(zip);
  const url = `${CIVIC_API_BASE}/representatives?key=${apiKey}&address=${address}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as {
      divisions?: Record<string, { name?: string }>;
      normalizedInput?: { city?: string; state?: string; zip?: string };
    };

    const result: CivicApiResult = {};
    if (data.divisions) {
      result.districts = parseDistricts(data.divisions, data.normalizedInput);
    }

    return result;
  } catch {
    clearTimeout(timeoutId);
    return {};
  }
}
