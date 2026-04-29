import { NextRequest, NextResponse } from "next/server";
import {
  isDurableStoreConfigured,
  redisCommand,
} from "../../../lib/server/durable-store";

export const runtime = "nodejs";

interface PollingLocation {
  name: string;
  address: string;
  hours: string;
  notes: string;
}

interface CivicCandidate {
  name: string;
  party: string;
}

interface CivicContest {
  office: string;
  district: string;
  type: string;
  candidates: CivicCandidate[];
}

interface CivicApiResponse {
  pollingLocations?: PollingLocation[];
  earlyVoteSites?: PollingLocation[];
  contests?: CivicContest[];
  electionName?: string;
  county?: string;
  error?: string;
}

const LOOKUP_WINDOW_MS = 60 * 1000;
const LOOKUP_LIMIT = process.env.NODE_ENV === "production" ? 30 : 200;
const lookupBuckets = new Map<string, { count: number; resetAt: number }>();

function sanitizeAddress(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 200) return null;
  return trimmed;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function checkLookupLimit(ip: string): boolean {
  const now = Date.now();
  const existing = lookupBuckets.get(ip);
  if (!existing || now >= existing.resetAt) {
    lookupBuckets.set(ip, { count: 1, resetAt: now + LOOKUP_WINDOW_MS });
    return true;
  }
  if (existing.count >= LOOKUP_LIMIT) return false;
  existing.count++;
  return true;
}

async function checkLookupLimitAsync(ip: string): Promise<boolean> {
  if (!isDurableStoreConfigured()) return checkLookupLimit(ip);
  try {
    const key = `voter-choice:civic:${Math.floor(Date.now() / LOOKUP_WINDOW_MS)}:${ip}`;
    const count = Number((await redisCommand<number>(["INCR", key])) ?? 1);
    await redisCommand(["EXPIRE", key, Math.ceil(LOOKUP_WINDOW_MS / 1000) + 5]);
    return count <= LOOKUP_LIMIT;
  } catch (err) {
    console.error("Durable civic lookup limit failed:", err);
    return false;
  }
}

async function parseAddress(request: NextRequest): Promise<string | null> {
  try {
    const body = (await request.json()) as { address?: unknown };
    return typeof body.address === "string" ? body.address : null;
  } catch {
    return null;
  }
}

function extractLocation(loc: {
  address?: {
    locationName?: string;
    line1?: string;
    line2?: string;
    line3?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  pollingHours?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
}): PollingLocation {
  const addr = loc.address ?? {};
  const parts = [
    addr.line1,
    addr.line2,
    addr.line3,
    addr.city,
    addr.state,
    addr.zip,
  ].filter(Boolean);

  let hours = loc.pollingHours ?? "";
  if (loc.startDate && loc.endDate) {
    hours = hours
      ? `${loc.startDate} – ${loc.endDate}: ${hours}`
      : `${loc.startDate} – ${loc.endDate}`;
  }

  return {
    name: addr.locationName ?? "",
    address: parts.join(", "),
    hours,
    notes: loc.notes ?? "",
  };
}

function extractContest(contest: {
  type?: string;
  office?: string;
  district?: { name?: string; scope?: string };
  candidates?: { name?: string; party?: string }[];
}): CivicContest | null {
  if (!contest.office) return null;
  return {
    office: contest.office,
    district: contest.district?.name ?? "",
    type: contest.type ?? "General",
    candidates: (contest.candidates ?? []).map((c) => ({
      name: c.name ?? "Unknown",
      party: c.party ?? "",
    })),
  };
}

function extractCounty(data: {
  state?: { local_jurisdiction?: { name?: string } }[];
}): string {
  const localJurisdiction = data.state?.[0]?.local_jurisdiction;
  return localJurisdiction?.name ?? "";
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function fetchCivicData(
  sanitizedAddress: string,
  apiKey: string,
): Promise<NextResponse> {
  const url = `https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodeURIComponent(sanitizedAddress)}&key=${apiKey}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    // Google returns 400 for addresses with no election info
    if (response.status === 400) {
      return errorResponse(
        "No election information found for this address. Try a different address or check your county election website.",
        404,
      );
    }
    return errorResponse(
      "Unable to look up polling locations. Please try again later.",
      502,
    );
  }

  const data = await response.json();

  const contests = (data.contests ?? [])
    .map(extractContest)
    .filter((c: CivicContest | null): c is CivicContest => c !== null);

  const result: CivicApiResponse = {
    pollingLocations: (data.pollingLocations ?? []).map(extractLocation),
    earlyVoteSites: (data.earlyVoteSites ?? []).map(extractLocation),
    contests: contests.length > 0 ? contests : undefined,
    electionName: data.election?.name ?? undefined,
    county: extractCounty(data) || undefined,
  };

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return errorResponse("Forbidden.", 403);
  }

  if (!(await checkLookupLimitAsync(getClientIP(request)))) {
    return errorResponse(
      "Too many address lookups. Please try again later.",
      429,
    );
  }

  const address = await parseAddress(request);

  if (!address) {
    return errorResponse("Address is required.", 400);
  }

  const sanitized = sanitizeAddress(address);
  if (!sanitized) {
    return errorResponse(
      "Invalid address. Please provide a non-empty address under 200 characters.",
      400,
    );
  }

  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "Polling location service is temporarily unavailable.",
      503,
    );
  }

  try {
    return await fetchCivicData(sanitized, apiKey);
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return errorResponse(
        "Polling location lookup timed out. Please try again.",
        504,
      );
    }
    return errorResponse(
      "Unable to look up polling locations. Please try again later.",
      502,
    );
  }
}

export async function GET() {
  return errorResponse("Use POST for address lookup.", 405);
}
