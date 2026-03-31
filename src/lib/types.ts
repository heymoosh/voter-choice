export type DeadlineStatus = 'safe' | 'warning' | 'urgent' | 'passed';

export interface Election {
  id: string;
  name: string;
  date: string;
  type: 'primary' | 'general' | 'runoff' | 'special';
  isPrimary: boolean;
  primaryType: 'open' | 'closed' | 'semi-closed' | 'semi-open' | null;
}

export interface RegistrationMethod {
  available?: boolean;
  deadline: string | null;
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
  startDate: string | null;
  endDate: string | null;
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
  lastUpdated: string;
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: Resources;
}
