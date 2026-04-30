import { NextRequest, NextResponse } from "next/server";
import {
  isDurableStoreConfigured,
  redisCommand,
} from "../../../lib/server/durable-store";
import type {
  BallotSourceAttempt,
  BallotSourceConfidence,
  BallotSourceSummary,
} from "../../../types/ballotSource";

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
  source: BallotSourceSummary;
  error?: string;
}

interface CivicElection {
  id?: string;
  name?: string;
  electionDay?: string;
}

interface CivicVoterInfoData {
  pollingLocations?: Parameters<typeof extractLocation>[0][];
  earlyVoteSites?: Parameters<typeof extractLocation>[0][];
  contests?: Parameters<typeof extractContest>[0][];
  election?: CivicElection;
  otherElections?: CivicElection[];
  state?: { local_jurisdiction?: { name?: string } }[];
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

function hasLocations(data: {
  pollingLocations?: unknown[];
  earlyVoteSites?: unknown[];
}): boolean {
  return Boolean(
    (data.pollingLocations && data.pollingLocations.length > 0) ||
      (data.earlyVoteSites && data.earlyVoteSites.length > 0),
  );
}

function sourceMessage(confidence: BallotSourceConfidence): string {
  if (confidence === "exact_official") {
    return "Google Civic returned official contests for this address.";
  }
  if (confidence === "partial_official") {
    return "Google Civic returned official voting information, but no contest list for this address.";
  }
  return "No exact contest list was returned. Use official election links or a sample ballot to confirm candidates.";
}

function sourceSummary(params: {
  confidence: BallotSourceConfidence;
  electionName?: string;
  attempts: BallotSourceAttempt[];
}): BallotSourceSummary {
  return {
    provider: "Google Civic Information API",
    confidence: params.confidence,
    message: sourceMessage(params.confidence),
    electionName: params.electionName,
    sourceLinks: [
      {
        label: "Google Civic Information API",
        url: "https://developers.google.com/civic-information",
      },
    ],
    attempts: params.attempts,
  };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function fetchCivicData(
  sanitizedAddress: string,
  apiKey: string,
): Promise<NextResponse> {
  const attempts: BallotSourceAttempt[] = [];
  const first = await fetchVoterInfo(sanitizedAddress, apiKey);
  const firstContests = extractContests(first);
  attempts.push({
    provider: "Google Civic voterinfo",
    electionId: first.election?.id,
    electionName: first.election?.name,
    contestsFound: firstContests.length,
  });

  if (firstContests.length > 0) {
    return NextResponse.json(
      buildCivicResponse(first, firstContests, "exact_official", attempts),
    );
  }

  const retryElections = await getRetryElections(
    first,
    apiKey,
    sanitizedAddress,
  );
  for (const election of retryElections) {
    if (!election.id) continue;
    const next = await fetchVoterInfo(sanitizedAddress, apiKey, election.id);
    const contests = extractContests(next);
    attempts.push({
      provider: "Google Civic voterinfo",
      electionId: election.id,
      electionName: election.name,
      contestsFound: contests.length,
    });
    if (contests.length > 0) {
      return NextResponse.json(
        buildCivicResponse(next, contests, "exact_official", attempts),
      );
    }
  }

  const confidence = hasLocations(first)
    ? "partial_official"
    : "source_links_only";
  return NextResponse.json(buildCivicResponse(first, [], confidence, attempts));
}

async function fetchVoterInfo(
  sanitizedAddress: string,
  apiKey: string,
  electionId?: string,
): Promise<CivicVoterInfoData> {
  const url = new URL("https://www.googleapis.com/civicinfo/v2/voterinfo");
  url.searchParams.set("address", sanitizedAddress);
  url.searchParams.set("key", apiKey);
  if (electionId) url.searchParams.set("electionId", electionId);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    // Google returns 400 for addresses with no election info. Treat that as
    // source-links-only rather than a broken product path.
    if (response.status === 400) {
      return {};
    }
    throw new Error(`Google Civic voterinfo failed: ${response.status}`);
  }

  return await response.json();
}

function extractContests(data: {
  contests?: Parameters<typeof extractContest>[0][];
}): CivicContest[] {
  return (data.contests ?? [])
    .map(extractContest)
    .filter((c: CivicContest | null): c is CivicContest => c !== null);
}

async function fetchElectionList(apiKey: string): Promise<CivicElection[]> {
  const url = new URL("https://www.googleapis.com/civicinfo/v2/elections");
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { elections?: CivicElection[] };
  return data.elections ?? [];
}

async function getRetryElections(
  first: { election?: CivicElection; otherElections?: CivicElection[] },
  apiKey: string,
  address: string,
): Promise<CivicElection[]> {
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 370);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const stateHints = stateHintsFromAddress(address);
  const listed = await fetchElectionList(apiKey);
  const candidates = [
    ...(first.otherElections ?? []),
    ...(first.election ? [first.election] : []),
    ...listed.filter((e) => {
      const isUpcoming =
        !e.electionDay ||
        (e.electionDay >= today && e.electionDay <= cutoffISO);
      if (!isUpcoming) return false;
      if (stateHints.length === 0) return true;
      return stateHints.some((hint) =>
        e.name?.toLowerCase().includes(hint.toLowerCase()),
      );
    }),
  ];

  const seen = new Set<string>();
  return candidates
    .filter((e) => {
      if (!e.id || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .slice(0, 8);
}

function stateHintsFromAddress(address: string): string[] {
  if (/\bTX\b|Texas/i.test(address)) return ["Texas"];
  if (/\bCA\b|California/i.test(address)) return ["California"];
  if (/\bNH\b|New Hampshire/i.test(address)) return ["New Hampshire"];
  if (/\bAZ\b|Arizona/i.test(address)) return ["Arizona"];
  if (/\bNM\b|New Mexico/i.test(address)) return ["New Mexico"];
  return [];
}

function buildCivicResponse(
  data: CivicVoterInfoData,
  contests: CivicContest[],
  confidence: BallotSourceConfidence,
  attempts: BallotSourceAttempt[],
): CivicApiResponse {
  const result: CivicApiResponse = {
    pollingLocations: (data.pollingLocations ?? []).map(extractLocation),
    earlyVoteSites: (data.earlyVoteSites ?? []).map(extractLocation),
    contests: contests.length > 0 ? contests : undefined,
    electionName: data.election?.name ?? undefined,
    county: extractCounty(data) || undefined,
    source: sourceSummary({
      confidence,
      electionName: data.election?.name ?? undefined,
      attempts,
    }),
  };

  return result;
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
