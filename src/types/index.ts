export interface Election {
  id: string;
  name: string;
  date: string; // ISO date string
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface RegistrationMethod {
  deadline: string | null; // ISO date string
  sincePostmarked?: boolean;
}

export interface OnlineRegistration extends RegistrationMethod {
  available: boolean;
  url: string | null;
}

export interface Registration {
  online: OnlineRegistration;
  byMail: RegistrationMethod & { sincePostmarked: boolean };
  inPerson: RegistrationMethod & { sincePostmarked: boolean };
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}

export interface EarlyVoting {
  available: boolean;
  startDate: string | null; // ISO date string
  endDate: string | null; // ISO date string
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

export type DeadlineLabel = "green" | "yellow" | "red" | "passed" | "na";

export interface DeadlineStatus {
  label: DeadlineLabel;
  text: string; // e.g. "12 days left" | "Passed" | "Not available"
  date: string | null; // formatted date string
}

export type LookupResultType = "single" | "multi" | "not-found";

export interface LookupResult {
  type: LookupResultType;
  states: string[]; // state codes
  selectedState: string | null;
  stateData: StateData | null;
  nextElection: Election | null;
}

export interface ZipToStateMap {
  [zipCode: string]: string[];
}
