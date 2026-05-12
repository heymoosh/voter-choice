import type { StateData } from "./election";

export interface PollingLocation {
  name: string;
  address: string;
  hours?: string;
  notes?: string;
}

export interface Districts {
  county?: string;
  congressional?: string;
  stateSenate?: string;
  stateHouse?: string;
}

export interface Candidate {
  candidateId: string;
  name: string;
  party?: string;
  photoUrl?: string;
}

export interface BallotContest {
  contestId: string;
  name: string;
  type: string;
  candidates: Candidate[];
}

export interface VoterIdData {
  state: string;
  voterIdRequired: boolean;
  idType: string;
  acceptedIds: string[];
  exceptions: string;
  provisionalBallot: boolean;
  provisionalBallotRules: string;
  phonesAtPolls: boolean;
  phonesAtPollsDetail: string;
  sourceUrl: string;
  lastVerified: string;
}

export interface ApiError {
  source: "civic" | "candidate" | "unknown";
  message: string;
  code?: string;
}

export interface CandidateEnrichment {
  votingRecord: string;
  topDonors: string;
  endorsements: string;
  sources: string[];
}

export interface LiveElectionData extends StateData {
  pollingLocation?: PollingLocation;
  ballotContests?: BallotContest[];
  districts?: Districts;
  voterIdData?: VoterIdData;
  fetchedAt?: number;
  apiErrors?: ApiError[];
}
