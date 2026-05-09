export interface Election {
  id: string;
  name: string;
  date: string; // ISO YYYY-MM-DD
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
  registration?: Registration;
  earlyVoting?: EarlyVoting;
}

export interface Registration {
  online: {
    available: boolean;
    deadline: string | null; // ISO date or null
    url: string;
  };
  byMail: {
    deadline: string;
    sincePostmarked: boolean;
  };
  inPerson: {
    deadline: string;
    sincePostmarked: boolean;
  };
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}

export interface EarlyVoting {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  notes?: string;
}

export interface VotingRules {
  idRequired: boolean;
  acceptedIds: string[];
  expirationRule?: string;
  impedimentDeclaration?: string;
  supportingDocs?: string[];
  phonesAtPolls: "prohibited" | "allowed" | "varies";
  phonesAtPollsDetail: string;
  additionalRules: string[];
}

export interface VoteByMail {
  universal: boolean;
  eligibility: string[];
  applicationDeadline: string;
  returnDeadline: string;
  returnDeadlinePlain: string;
  applicationUrl: string;
  officialRulesUrl: string;
}

export interface Resources {
  stateElectionWebsite: string;
  countyElectionLookup: string;
  sampleBallotLookup: string;
  pollingPlaceLookup: string;
  importantDates?: string;
  voterIdInfo?: string;
  earlyVotingInfo?: string;
}

export interface CountyResource {
  name: string;
  ballotLookup: string;
  ballotLookupInstructions?: string;
  pollingPlaces: string;
  earlyVotingLocations: string;
  electionsWebsite: string;
}

export interface RunoffRules {
  hasRunoff: boolean;
  /**
   * True when a voter is locked into the party whose primary they voted in.
   * The runoff gate renders only when this is true AND the upcoming election
   * is a primary or runoff. States without this rule (most states) skip the gate.
   */
  partyLockedToFirstRoundPrimary: boolean;
  /**
   * The explanatory text shown inside the runoff gate UI.
   * Only used when partyLockedToFirstRoundPrimary === true.
   */
  ruleExplanation?: string;
}

export interface StateElectionData {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  /**
   * "confirmed" — data has been verified for the current cycle.
   * "unconfirmed" — fallback data; specific deadlines for this state are not yet available.
   */
  coverageStatus?: "confirmed" | "unconfirmed";
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  voteByMail?: VoteByMail;
  resources: Resources;
  runoffRules: RunoffRules;
  countyResources?: Record<string, CountyResource>;
}

export type StatusColor = "green" | "yellow" | "red" | "passed";

export interface DeadlineStatus {
  date: string;
  daysLeft: number;
  label: string;
  color: StatusColor;
}

export type LookupResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "multi-state"; states: string[] }
  | { status: "found"; state: StateElectionData }
  | { status: "not-found" }
  | { status: "no-election"; state: StateElectionData }
  | { status: "error"; message: string };

export interface CustomizedPrompt {
  basePrompt: string;
  contextBlock: string;
  fullText: string;
}
