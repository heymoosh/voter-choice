export type ElectionType = "primary" | "general" | "runoff" | "special";

export type PrimaryType =
  | "open"
  | "closed"
  | "semi-closed"
  | "semi-open"
  | null;

export interface Election {
  id: string;
  name: string;
  date: string;
  type: ElectionType;
  isPrimary: boolean;
  primaryType: PrimaryType;
}

export interface RegistrationDeadline {
  available?: boolean;
  deadline: string | null;
  url: string | null;
}

export interface Registration {
  online: RegistrationDeadline;
  byMail: {
    deadline: string | null;
    sincePostmarked: boolean;
  };
  inPerson: {
    deadline: string | null;
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
  phonesAtPolls: "prohibited" | "allowed" | "varies";
  phonesAtPollsDetail?: string;
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

export interface SelectedElectionSummary {
  election: Election | null;
  registrationStatus: string;
  formattedDate: string | null;
}
