export interface Election {
  id: string;
  name: string;
  date: string; // ISO date
  type: 'primary' | 'general' | 'runoff' | 'special';
  isPrimary: boolean;
  primaryType: 'open' | 'closed' | 'semi-closed' | 'semi-open' | null;
}

export interface RegistrationMethod {
  deadline: string; // ISO date
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
  phonesAtPolls: 'prohibited' | 'allowed' | 'varies';
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
  stateCode: string;
  stateName: string;
  lastUpdated: string; // ISO date
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: Resources;
}

export interface ZipLookupResult {
  states: string[]; // state codes
  isMultiState: boolean;
}

export interface DeadlineStatus {
  date: string;
  daysRemaining: number | null;
  status: 'passed' | 'urgent' | 'warning' | 'good';
  statusText: string;
}
