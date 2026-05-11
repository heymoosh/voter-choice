// State election data types matching PROJECT_SPEC.md data model

export interface Election {
  id: string;
  name: string;
  date: string; // ISO date
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface Registration {
  online: {
    available: boolean;
    deadline: string | null; // ISO date
    url: string | null;
  };
  byMail: {
    deadline: string; // ISO date
    sincePostmarked: boolean;
  };
  inPerson: {
    deadline: string; // ISO date
    sincePostmarked: boolean;
  };
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}

export interface EarlyVoting {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string;
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

export type DeadlineStatus = "green" | "yellow" | "red" | "passed";

export interface DeadlineInfo {
  date: string | null;
  daysLeft: number | null;
  status: DeadlineStatus | "not-available";
  label: string;
}
