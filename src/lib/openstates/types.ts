export type RawOpenStatesRecord = {
  person: {
    id: string;
    name: string;
    party?: string | null;
    identifiers?: string[];
    links?: string[];
  };
  office?: {
    title?: string | null;
    district?: string | null;
    state?: string | null;
    jurisdiction?: string | null;
    isIncumbent?: boolean;
  };
  votes?: Array<{
    billId: string;
    billTitle: string;
    date: string;
    option: string;
    sourceUrl?: string | null;
  }>;
};

export type CandidateVote = {
  billId: string;
  billTitle: string;
  date: string;
  option: string;
  sourceUrl: string | null;
};

export type CandidateContext = {
  personId: string;
  name: string;
  normalizedName: string;
  party: string | null;
  state: string | null;
  jurisdiction: string | null;
  officeTitle: string | null;
  district: string | null;
  isIncumbent: boolean;
  sourceLinks: string[];
  recentVotes: CandidateVote[];
};

export type DerivedOpenStatesData = {
  generatedAt: string;
  candidates: CandidateContext[];
};

export type CandidateLookupInput = {
  state?: string | null;
  officeTitle?: string | null;
  district?: string | null;
  candidateName: string;
};
