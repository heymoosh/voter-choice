export interface Election {
  id: string;
  name: string;
  date: string; // ISO date "YYYY-MM-DD"
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface Registration {
  online: {
    available: boolean;
    deadline: string | null;
    url: string | null;
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

export type DeadlineUrgency = "ok" | "warning" | "urgent" | "passed" | "na";

export interface DeadlineStatus {
  date: string | null;
  daysLeft: number | null;
  label: string; // "12 days left" | "Passed" | "Not available"
  urgency: DeadlineUrgency;
}

export interface RegistrationStatuses {
  online: DeadlineStatus;
  byMail: DeadlineStatus;
  inPerson: DeadlineStatus;
  allPassed: boolean;
}
