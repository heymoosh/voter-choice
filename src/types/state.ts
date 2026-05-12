export type Election = {
  id: string;
  name: string;
  date: string;
  type: string;
  isPrimary: boolean;
  primaryType: string | null;
};

export type RegistrationRules = {
  online: {
    available: boolean;
    deadline: string | null;
    url: string | null;
  };
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
};

export type EarlyVotingRules = {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string;
};

export type VotingRules = {
  idRequired: boolean;
  acceptedIds: string[];
  phonesAtPolls: "allowed" | "prohibited" | "varies";
  phonesAtPollsDetail: string;
  additionalRules: string[];
};

export type StateResources = {
  stateElectionWebsite: string;
  countyElectionLookup: string;
  sampleBallotLookup: string;
  pollingPlaceLookup: string;
};

export type StateData = {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: RegistrationRules;
  earlyVoting: EarlyVotingRules;
  votingRules: VotingRules;
  resources: StateResources;
};
