export interface Election {
  id: string;
  name: string;
  date: string; // ISO date YYYY-MM-DD
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface RegistrationMethod {
  deadline: string | null; // ISO date
  sincePostmarked: boolean;
}

export interface OnlineRegistration extends RegistrationMethod {
  available: boolean;
  url: string | null;
}

export interface Registration {
  online: OnlineRegistration;
  byMail: RegistrationMethod;
  inPerson: RegistrationMethod;
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}

export interface EarlyVoting {
  available: boolean;
  startDate: string | null; // ISO date
  endDate: string | null; // ISO date
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
  lastUpdated: string; // ISO date
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: Resources;
}

export type ZipToStateMap = Record<string, string[]>;

export type DeadlineStatus = "passed" | "urgent" | "warning" | "ok" | "none";

export interface DeadlineInfo {
  date: string | null;
  status: DeadlineStatus;
  daysRemaining: number | null;
  label: string;
}
