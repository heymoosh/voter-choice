import type {
  BallotData,
  BallotContest,
  BallotCandidate,
  PollingLocation,
  LocationDistricts,
} from "@/lib/types";

const CIVIC_BASE_URL = "https://www.googleapis.com/civicinfo/v2/voterinfo";
const TIMEOUT_MS = 10_000;

// Raw shape returned by the Civic API (partial — only fields we use)
interface CivicRaw {
  rawInput: Record<string, string>;
  contests: CivicContest[];
  pollingLocations: CivicPollingLocation[];
  divisions: Record<string, { name: string }>;
}

interface CivicPollingLocation {
  address?: {
    locationName?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  pollingHours?: string;
}

interface CivicContest {
  type?: string;
  office?: string;
  district?: { name?: string; id?: string };
  candidates?: Array<{
    name?: string;
    party?: string;
    phone?: string;
    candidateUrl?: string;
  }>;
}

export async function fetchCivicData(zip: string): Promise<CivicRaw | null> {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) return null;

  const url = new URL(CIVIC_BASE_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("address", zip);
  url.searchParams.set("electionId", "2000"); // "upcoming elections" sentinel

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      rawInput: data.normalizedInput ?? {},
      contests: data.contests ?? [],
      pollingLocations: data.pollingLocations ?? [],
      divisions: data.divisions ?? {},
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export function normalizeCivicResponse(
  raw: CivicRaw,
  zip: string,
  stateCode: string,
  stateName: string,
): Pick<BallotData, "pollingLocation" | "ballotContests" | "districts"> {
  // Polling location
  let pollingLocation: PollingLocation | null = null;
  if (raw.pollingLocations && raw.pollingLocations.length > 0) {
    const pl = raw.pollingLocations[0];
    const addr = pl.address;
    if (addr) {
      const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.zip]
        .filter(Boolean)
        .join(", ");
      pollingLocation = {
        name: addr.locationName ?? "Polling Place",
        address: parts,
        hours: pl.pollingHours,
      };
    }
  }

  // Ballot contests
  const ballotContests: BallotContest[] = (raw.contests ?? []).map((c, i) => {
    const candidates: BallotCandidate[] = (c.candidates ?? []).map((cand) => ({
      name: cand.name ?? "Unknown Candidate",
      party: cand.party,
      phone: cand.phone,
      url: cand.candidateUrl,
    }));
    return {
      id: `contest-${i}`,
      office: c.office ?? c.type ?? "Office",
      district: c.district?.name,
      candidates,
    };
  });

  // Districts from OCD division IDs
  const districts: LocationDistricts = {};
  for (const [ocdId] of Object.entries(raw.divisions ?? {})) {
    const cdMatch = ocdId.match(/\/cd:(\d+)/);
    if (cdMatch) districts.congressionalDistrict = cdMatch[1];

    const slduMatch = ocdId.match(/\/sldu:(\d+)/);
    if (slduMatch) districts.stateSenateDistrict = slduMatch[1];

    const sldlMatch = ocdId.match(/\/sldl:(\d+)/);
    if (sldlMatch) districts.stateHouseDistrict = sldlMatch[1];

    if (ocdId.includes(`/state:${stateCode.toLowerCase()}/county:`)) {
      const countyMatch = ocdId.match(/\/county:([^/]+)/);
      if (countyMatch) districts.county = countyMatch[1].replace(/_/g, " ");
    }
  }

  void zip;
  void stateName;

  return { pollingLocation, ballotContests, districts };
}
