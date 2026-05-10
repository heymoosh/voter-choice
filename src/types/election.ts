export type ZipLookupResult =
  | { status: "single"; stateCode: string }
  | { status: "multi"; stateCodes: string[] }
  | { status: "not-found" }
  | { status: "invalid" };

export interface Election {
  id: string;
  name: string;
  date: string;
  type: "primary" | "runoff" | "general";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-open" | "semi-closed" | null;
}

export interface RegistrationInfo {
  online: { available: boolean; deadline: string | null; url: string | null };
  byMail: { deadline: string | null; sincePostmarked: boolean };
  inPerson: { deadline: string | null; sincePostmarked: boolean };
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
  phonesAtPolls: "allowed" | "prohibited" | "varies";
  phonesAtPollsDetail: string;
  additionalRules: string[];
}

export interface StateElectionData {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: RegistrationInfo;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: {
    stateElectionWebsite: string;
    countyElectionLookup: string;
    sampleBallotLookup: string;
    pollingPlaceLookup: string;
  };
}

export type DeadlineStatus = "urgent" | "approaching" | "on-track" | "closed";

export type ZipToStateMap = Record<string, string[]>;
