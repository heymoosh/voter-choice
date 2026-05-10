export interface Election {
  id: string;
  name: string;
  date: string;
  type: "primary" | "runoff" | "general" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface RegistrationMethod {
  available?: boolean;
  deadline: string;
  url?: string;
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
  startDate: string;
  endDate: string;
  notes: string;
}

export interface VotingRules {
  idRequired: boolean;
  acceptedIds: string[];
  phonesAtPolls: "allowed" | "prohibited" | "restricted";
  phonesAtPollsDetail: string;
  additionalRules: string[];
}

export interface StateResources {
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
  resources: StateResources;
}

export type DeadlineStatus = "open" | "upcoming" | "passed" | "unknown";

export interface DeadlineInfo {
  status: DeadlineStatus;
  label: string;
  date: string;
}

export interface StateInfoResult {
  stateData: StateData;
  nextElection: Election | null;
  registrationDeadline: DeadlineInfo;
}

export type BudgetTier = "normal" | "notice" | "soft-close" | "exhausted";

export interface BudgetStatus {
  tier: BudgetTier;
  percentUsed: number;
  chatAvailable: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
