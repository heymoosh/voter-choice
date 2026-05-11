export type ElectionType = "primary" | "general" | "runoff" | "special";

export type Election = {
  id: string;
  name: string;
  date: string;
  type: ElectionType;
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
};

export type StateData = {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: {
    online: { available: boolean; deadline: string | null; url: string };
    byMail: { deadline: string; sincePostmarked: boolean };
    inPerson: { deadline: string; sincePostmarked: boolean };
    sameDayRegistration: boolean;
    registrationCheckUrl: string;
  };
  earlyVoting: {
    available: boolean;
    startDate: string | null;
    endDate: string | null;
    notes?: string;
  };
  votingRules: {
    idRequired: boolean;
    acceptedIds: string[];
    phonesAtPolls: "prohibited" | "allowed" | "varies";
    phonesAtPollsDetail: string;
    additionalRules: string[];
  };
  resources: {
    stateElectionWebsite: string;
    countyElectionLookup: string;
    sampleBallotLookup: string;
    pollingPlaceLookup: string;
  };
};
