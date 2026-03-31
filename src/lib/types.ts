export type PrimaryType =
  | "open"
  | "closed"
  | "semi-closed"
  | "semi-open"
  | null;
export type ElectionType = "primary" | "general" | "runoff" | "special";
export type PhonePolicy = "prohibited" | "allowed" | "varies";
export type DeadlineStatus =
  | "green"
  | "yellow"
  | "red"
  | "passed"
  | "unavailable";

export interface Election {
  id: string;
  name: string;
  date: string;
  type: ElectionType;
  isPrimary: boolean;
  primaryType: PrimaryType;
}

export interface OnlineRegistration {
  available: boolean;
  deadline: string | null;
  url: string | null;
}

export interface MailRegistration {
  deadline: string;
  sincePostmarked: boolean;
}

export interface Registration {
  online: OnlineRegistration;
  byMail: MailRegistration;
  inPerson: MailRegistration;
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
  phonesAtPolls: PhonePolicy;
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

export interface DeadlineInfo {
  status: DeadlineStatus;
  daysRemaining: number | null;
  label: string;
}

export type AppState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "not-found"; zip: string }
  | { stage: "multi-state"; zip: string; states: string[] }
  | { stage: "found"; zip: string; stateData: StateData };
