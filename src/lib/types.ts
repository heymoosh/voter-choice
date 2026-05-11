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
