import type { LiveElectionData, CandidateRef, CandidateDetail } from "./types";

/**
 * Fetch live election data for a zip code.
 * Calls the app's own /api/civic route, which proxies to Google Civic API
 * and enriches the response with voter ID static data.
 */
export async function fetchElectionData(
  zipCode: string,
): Promise<LiveElectionData> {
  const response = await fetch(
    `/api/civic?zip=${encodeURIComponent(zipCode)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "unknown error");
    throw new Error(
      `Failed to fetch election data: ${response.status} — ${errorBody}`,
    );
  }

  const data: LiveElectionData = await response.json();
  return data;
}

/**
 * Fetch candidate enrichment data (voting record, donors, endorsements).
 * Calls the app's own /api/candidate-detail route, which uses Anthropic web_search.
 * Loaded lazily (only when user expands candidate panel).
 */
export async function fetchCandidateDetail(
  candidate: CandidateRef,
): Promise<CandidateDetail> {
  const response = await fetch("/api/candidate-detail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: candidate.name,
      office: candidate.office,
      state: candidate.state,
      party: candidate.party,
    }),
  });

  if (!response.ok && response.status !== 503) {
    throw new Error(`Failed to fetch candidate detail: ${response.status}`);
  }

  const data: CandidateDetail = await response.json();
  return data;
}
