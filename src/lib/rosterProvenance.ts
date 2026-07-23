import type { BallotSourceSummary } from "../types/ballotSource";

export interface RosterSourceLink {
  label: string;
  url: string;
}

export type RosterSourceKind =
  | "official_sample_ballot"
  | "state_county_official_list"
  | "official_state_roster"
  | "google_civic"
  | "user_pasted_ballot"
  | "user_uploaded_ballot"
  | "fec_campaign_finance"
  | "source_links_only";

export type RosterConfidence =
  | "verified_current_ballot"
  | "official_address_election_tied"
  | "unverified_user_supplied"
  | "partial_source_links_only"
  | "finance_only";

export type RosterBallotStatus =
  | "verified_current_ballot"
  | "user_supplied_unverified"
  | "source_links_only"
  | "finance_record_only"
  | "inactive_withdrawn";

export interface RosterProvenance {
  sourceKind: RosterSourceKind;
  election: string | null;
  retrievedAt: string;
  sourceLinks: RosterSourceLink[];
  confidence: RosterConfidence;
  ballotStatus: RosterBallotStatus;
  selectableAsReplacement: boolean;
}

export interface RosterCandidate {
  id: string;
  name: string;
  rosterProvenance?: RosterProvenance | null;
}

export function fecFinanceOnlyProvenance(params: {
  election: string | null;
  retrievedAt: string;
  sourceUrl?: string;
}): RosterProvenance {
  return {
    sourceKind: "fec_campaign_finance",
    election: params.election,
    retrievedAt: params.retrievedAt,
    sourceLinks: params.sourceUrl
      ? [{ label: "FEC candidate filing", url: params.sourceUrl }]
      : [],
    confidence: "finance_only",
    ballotStatus: "finance_record_only",
    selectableAsReplacement: false,
  };
}

/**
 * State Secretary-of-State candidate roster (e.g. azsos.gov's
 * qualified-for-primary PDF) — an official, ballot-qualification-tied source.
 * Promotes into the "verified" render bucket (isSelectableReplacement) with
 * no RepCard changes needed.
 */
export function officialStateRosterProvenance(params: {
  election: string | null;
  retrievedAt: string;
  sourceUrl: string;
}): RosterProvenance {
  return {
    sourceKind: "official_state_roster",
    election: params.election,
    retrievedAt: params.retrievedAt,
    sourceLinks: [{ label: "Official state roster", url: params.sourceUrl }],
    confidence: "official_address_election_tied",
    ballotStatus: "verified_current_ballot",
    selectableAsReplacement: true,
  };
}

export function isSelectableReplacement(candidate: RosterCandidate): boolean {
  const provenance = candidate.rosterProvenance;
  return Boolean(
    provenance?.selectableAsReplacement === true &&
    provenance.ballotStatus === "verified_current_ballot" &&
    (provenance.confidence === "verified_current_ballot" ||
      provenance.confidence === "official_address_election_tied"),
  );
}

export function rosterProvenanceForBallotSource(
  source: BallotSourceSummary,
  retrievedAt: string,
): RosterProvenance {
  if (source.confidence === "exact_official") {
    return {
      sourceKind: "google_civic",
      election: source.electionName ?? null,
      retrievedAt,
      sourceLinks: source.sourceLinks,
      confidence: "official_address_election_tied",
      ballotStatus: "verified_current_ballot",
      selectableAsReplacement: true,
    };
  }

  return {
    sourceKind: "google_civic",
    election: source.electionName ?? null,
    retrievedAt,
    sourceLinks: source.sourceLinks,
    confidence: "partial_source_links_only",
    ballotStatus: "source_links_only",
    selectableAsReplacement: false,
  };
}

export function userSuppliedRosterProvenance(params: {
  sourceKind: "user_pasted_ballot" | "user_uploaded_ballot";
  election: string | null;
  retrievedAt: string;
}): RosterProvenance {
  return {
    sourceKind: params.sourceKind,
    election: params.election,
    retrievedAt: params.retrievedAt,
    sourceLinks: [],
    confidence: "unverified_user_supplied",
    ballotStatus: "user_supplied_unverified",
    selectableAsReplacement: false,
  };
}
