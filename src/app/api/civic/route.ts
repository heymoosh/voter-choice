import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface PollingLocation {
  name: string;
  address: string;
  hours: string;
  notes: string;
}

interface CivicApiResponse {
  pollingLocations?: PollingLocation[];
  earlyVoteSites?: PollingLocation[];
  error?: string;
}

function sanitizeAddress(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 200) return null;
  return trimmed;
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

  const result: CivicApiResponse = {
    pollingLocations: (data.pollingLocations ?? []).map(extractLocation),
    earlyVoteSites: (data.earlyVoteSites ?? []).map(extractLocation),
  };

  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return errorResponse("Address parameter is required.", 400);
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
