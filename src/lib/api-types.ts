/**
 * Types for the live data layer introduced in Phase 3.
 * These types extend the Phase 1-2 static data model.
 * UI components use LiveElectionData (the unified model); they don't
 * know which API provided which fields.
 */

// ---- Voter ID (static JSON per state) --------------------------------------

export interface VoterIdData {
  state: string;
  voterIdRequired: boolean;
  idType: string | null;
  acceptedIds: string[];
  exceptions: string;
  provisionalBallot: boolean;
  provisionalBallotRules: string;
  phonesAtPolls: boolean;
  phonesAtPollsDetail: string;
  sourceUrl: string;
  lastVerified: string;
}

// ---- Polling location (from Google Civic) ----------------------------------

export interface PollingLocation {
  locationName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  hours: string | null;
  notes: string | null;
}

// ---- Candidate (from Google Civic + optional enrichment) ------------------

export interface CandidateInfo {
  name: string;
  party: string | null;
  phone: string | null;
  email: string | null;
  candidateUrl: string | null;
  // Enrichment via Anthropic web_search (loaded on expand)
  enrichment?: CandidateEnrichment;
  enrichmentLoading?: boolean;
  enrichmentError?: string | null;
}

export interface CandidateEnrichment {
  summary: string;
  votingRecord: string;
  topDonors: string;
  endorsements: string;
  sources: string[];
  fetchedAt: string;
}

// ---- Ballot contest (from Google Civic) ------------------------------------

export interface BallotContest {
  type: "General" | "Primary" | "Referendum" | string;
  office: string;
  district: string | null;
  candidates: CandidateInfo[];
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumBrief?: string;
}

// ---- District info (from Google Civic) -------------------------------------

export interface DistrictInfo {
  county: string | null;
  congressionalDistrict: string | null;
  stateLegislativeUpper: string | null;
  stateLegislativeLower: string | null;
}

// ---- Live election data (unified model) ------------------------------------

export interface LiveElectionData {
  zip: string;
  stateName: string;
  stateCode: string;
  fetchedAt: string;
  // Sources
  civicDataAvailable: boolean;
  civicDataError: string | null;
  // Location
  pollingLocation: PollingLocation | null;
  districts: DistrictInfo | null;
  // Ballot
  contests: BallotContest[];
  // Voter ID (always from static JSON)
  voterIdData: VoterIdData | null;
}

// ---- API response shapes ---------------------------------------------------

export interface ElectionDataResponse {
  data: LiveElectionData | null;
  error: string | null;
  partial: boolean; // true when some (not all) sources succeeded
  fallback: boolean; // true when all APIs failed, only static data shown
}

export interface CandidateDetailResponse {
  enrichment: CandidateEnrichment | null;
  error: string | null;
}
