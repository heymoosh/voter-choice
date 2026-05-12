export type ElectionType = "primary" | "general" | "runoff" | "special";

// --- Phase 3: Real Ballot Data types ---

export type VoterIdData = {
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
};

export type PollingLocation = {
  name: string;
  address: string;
  hours?: string;
};

export type BallotCandidate = {
  name: string;
  party?: string;
  phone?: string;
  url?: string;
};

export type BallotContest = {
  id: string;
  office: string;
  district?: string;
  candidates: BallotCandidate[];
};

export type LocationDistricts = {
  county?: string;
  congressionalDistrict?: string;
  stateSenateDistrict?: string;
  stateHouseDistrict?: string;
};

export type CandidateEnrichment = {
  votingRecord: string;
  topDonors: string;
  endorsements: string;
  citations: string[];
};

export type BallotData = {
  stateCode: string;
  stateName: string;
  zip: string;
  fetchedAt: string;
  districts: LocationDistricts;
  elections: Election[];
  registration: StateData["registration"];
  earlyVoting: StateData["earlyVoting"];
  votingRules: StateData["votingRules"];
  resources: StateData["resources"];
  pollingLocation: PollingLocation | null;
  ballotContests: BallotContest[];
  voterIdData: VoterIdData | null;
  errors: string[];
  apiFullError: boolean;
};

export type DataStatus =
  | { status: "idle" }
  | { status: "loading"; zip: string }
  | { status: "multi-state"; stateCodes: string[]; zip: string }
  | { status: "result"; ballotData: BallotData; zip: string }
  | { status: "not-found"; zip: string };

export type Election = {
  id: string;
  name: string;
  date: string;
  type: ElectionType;
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
};

// --- Phase 5: Chat, Ballot Download, Voter Profile ---

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AlignmentIssue = {
  issue: string;
  userPriority: string;
  score: number;
  rationale: string;
  sources: string[];
};

export type AlignmentScore = {
  candidate: string;
  overall: number;
  issues: AlignmentIssue[];
};

export type AlignmentScoresBlock = {
  race: string;
  scores: AlignmentScore[];
};

export type BallotEntry = {
  race: string;
  choice: string;
};

export type ParsedBallot = {
  county: string;
  electionName: string;
  date: string;
  entries: BallotEntry[];
  reminder?: string;
};

export type BudgetStatus = "ok" | "warning" | "critical" | "exhausted";

export type StateData = {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: {
    online: { available: boolean; deadline: string | null; url: string };
    byMail: { deadline: string; sincePostmarked: boolean };
    inPerson: { deadline: string; sincePostmarked: boolean };
    sameDayRegistration: boolean;
    registrationCheckUrl: string;
  };
  earlyVoting: {
    available: boolean;
    startDate: string | null;
    endDate: string | null;
    notes?: string;
  };
  votingRules: {
    idRequired: boolean;
    acceptedIds: string[];
    phonesAtPolls: "prohibited" | "allowed" | "varies";
    phonesAtPollsDetail: string;
    additionalRules: string[];
  };
  resources: {
    stateElectionWebsite: string;
    countyElectionLookup: string;
    sampleBallotLookup: string;
    pollingPlaceLookup: string;
  };
};
