// TypeScript types for Voter Choice ballot research tool

export interface Election {
  id: string;
  name: string;
  date: string; // ISO date
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface RegistrationMethod {
  available?: boolean;
  deadline: string | null; // ISO date or null
  url?: string | null;
  sincePostmarked?: boolean;
}

export interface Registration {
  online: RegistrationMethod;
  byMail: RegistrationMethod;
  inPerson: RegistrationMethod;
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}

export interface EarlyVoting {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export interface VotingRules {
  idRequired: boolean;
  acceptedIds: string[];
  phonesAtPolls: "prohibited" | "allowed" | "varies";
  phonesAtPollsDetail: string;
  additionalRules: string[];
}

export interface Resources {
  stateElectionWebsite: string;
  countyElectionLookup: string;
  sampleBallotLookup: string;
  pollingPlaceLookup: string;
}

export interface StateData {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: Resources;
}

export enum DeadlineStatus {
  GREEN = "green",
  YELLOW = "yellow",
  RED = "red",
  PASSED = "passed",
}

export interface ZipLookup {
  [zipCode: string]: string[];
}

// ─── Phase 3: Live Election Data types ─────────────────────────────────────

export interface VoterIdInfo {
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

export interface Candidate {
  name: string;
  party?: string;
  candidateId?: string;
  phone?: string;
  email?: string;
  candidateUrl?: string;
  channels?: { type: string; id: string }[];
}

export interface BallotContest {
  office: string;
  district?: string;
  candidates: Candidate[];
}

export interface PollingLocation {
  locationName?: string;
  address: {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  notes?: string;
  pollingHours?: string;
  endDate?: string;
}

export interface PartialError {
  source: "civic" | "candidate-detail" | "unknown";
  message: string;
  timestamp: string;
}

export interface CivicDistricts {
  stateName?: string;
  stateCode?: string;
  county?: string;
  congressionalDistrict?: string;
  stateSenateDistrict?: string;
  stateHouseDistrict?: string;
}

export interface LiveElectionData {
  zipCode: string;
  stateCodes: string[];
  districts?: CivicDistricts;
  pollingLocation?: PollingLocation;
  earlyVoteSites?: PollingLocation[];
  ballotContests?: BallotContest[];
  voterIdInfo?: VoterIdInfo;
  electionName?: string;
  electionDate?: string;
  fetchedAt: string;
  errors?: PartialError[];
}

export interface CandidateRef {
  name: string;
  office: string;
  state: string;
  party?: string;
}

export interface CandidateDetail {
  votingRecord: string;
  topDonors: string;
  endorsements: string;
  citations: string[];
  fetchedAt: string;
}
