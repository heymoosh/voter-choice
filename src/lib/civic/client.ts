import type {
  CivicVoterInfoResponse,
  CivicRepresentativeResponse,
} from "./types";

const CIVIC_BASE_URL = "https://www.googleapis.com/civicinfo/v2";
const TIMEOUT_MS = 10_000;

function getApiKey(): string {
  const key = process.env.GOOGLE_CIVIC_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_CIVIC_API_KEY is not configured");
  }
  return key;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch voter info (elections, polling locations, contests) for a zip code.
 * API docs: https://developers.google.com/civic-information/docs/v2/voterinfo/voterInfoQuery
 */
export async function fetchVoterInfo(
  zip: string,
): Promise<{ data: CivicVoterInfoResponse | null; error: string | null }> {
  const key = getApiKey();
  const address = encodeURIComponent(`${zip} USA`);
  const url = `${CIVIC_BASE_URL}/voterinfo?key=${key}&address=${address}&officialOnly=false`;

  try {
    const response = await fetchWithTimeout(url, TIMEOUT_MS);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const msg =
        (errorBody as { error?: { message?: string } }).error?.message ??
        `Civic API error ${response.status}`;
      console.error("[civic/voterinfo] error:", msg, "zip:", zip);
      return { data: null, error: msg };
    }

    const data = (await response.json()) as CivicVoterInfoResponse;
    if (data.error) {
      console.error("[civic/voterinfo] API returned error:", data.error);
      return { data: null, error: data.error.message };
    }

    return { data, error: null };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const msg = isTimeout ? "Civic API timed out" : "Civic API unreachable";
    console.error("[civic/voterinfo]", msg, err);
    return { data: null, error: msg };
  }
}

/**
 * Fetch representative info (divisions, offices) — used for district mapping.
 * API docs: https://developers.google.com/civic-information/docs/v2/representatives/representativeInfoByAddress
 */
export async function fetchRepresentativeInfo(zip: string): Promise<{
  data: CivicRepresentativeResponse | null;
  error: string | null;
}> {
  const key = getApiKey();
  const address = encodeURIComponent(`${zip} USA`);
  const url = `${CIVIC_BASE_URL}/representatives?key=${key}&address=${address}&includeOffices=true&levels=country&levels=administrativeArea1&levels=administrativeArea2`;

  try {
    const response = await fetchWithTimeout(url, TIMEOUT_MS);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const msg =
        (errorBody as { error?: { message?: string } }).error?.message ??
        `Representatives API error ${response.status}`;
      console.error("[civic/representatives] error:", msg);
      return { data: null, error: msg };
    }

    const data = (await response.json()) as CivicRepresentativeResponse;
    return { data, error: null };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const msg = isTimeout
      ? "Representatives API timed out"
      : "Representatives API unreachable";
    console.error("[civic/representatives]", msg, err);
    return { data: null, error: msg };
  }
}
