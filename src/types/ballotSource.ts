export type BallotSourceConfidence =
  | "exact_official"
  | "exact_third_party"
  | "partial_official"
  | "source_links_only"
  | "not_found";

export interface BallotSourceLink {
  label: string;
  url: string;
}

export interface BallotSourceAttempt {
  provider: string;
  electionId?: string;
  electionName?: string;
  contestsFound: number;
}

export interface BallotSourceSummary {
  provider: string;
  confidence: BallotSourceConfidence;
  message: string;
  electionName?: string;
  sourceLinks: BallotSourceLink[];
  attempts?: BallotSourceAttempt[];
}
