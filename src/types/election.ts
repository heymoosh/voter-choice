export interface Election {
  id: string;
  name: string;
  date: string; // ISO date string YYYY-MM-DD
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface RegistrationOnline {
  available: boolean;
  deadline: string | null;
  url: string | null;
}

export interface RegistrationMethod {
  deadline: string | null;
  sincePostmarked: boolean;
}

export interface Registration {
  online: RegistrationOnline;
  byMail: RegistrationMethod;
  inPerson: RegistrationMethod;
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

export interface StateElectionData {
  readonly stateCode: string;
  readonly stateName: string;
  readonly lastUpdated: string;
  readonly elections: readonly Election[];
  readonly registration: Registration;
  readonly earlyVoting: EarlyVoting;
  readonly votingRules: VotingRules;
  readonly resources: Resources;
}

export type ZipLookupResult =
  | { type: "single-state"; stateCode: string }
  | { type: "multi-state"; states: string[] }
  | { type: "not-found" };

export type DeadlineStatus = "safe" | "warning" | "urgent" | "passed";
