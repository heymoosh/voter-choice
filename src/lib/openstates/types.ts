export interface RawRow {
  [key: string]: unknown;
}

export interface OpenStatesRawTables {
  opencivicdata_person?: RawRow[];
  opencivicdata_personname?: RawRow[];
  opencivicdata_personidentifier?: RawRow[];
  opencivicdata_personlink?: RawRow[];
  opencivicdata_personsource?: RawRow[];
  opencivicdata_post?: RawRow[];
  opencivicdata_membership?: RawRow[];
  opencivicdata_division?: RawRow[];
  opencivicdata_jurisdiction?: RawRow[];
  opencivicdata_organization?: RawRow[];
  openstates_personoffice?: RawRow[];
  opencivicdata_voteevent?: RawRow[];
  opencivicdata_personvote?: RawRow[];
  opencivicdata_votecount?: RawRow[];
  opencivicdata_bill?: RawRow[];
  opencivicdata_billaction?: RawRow[];
  opencivicdata_billsponsorship?: RawRow[];
  opencivicdata_votesource?: RawRow[];
  opencivicdata_billsource?: RawRow[];
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface OpenStatesIdentifier {
  scheme: string;
  identifier: string;
}

export interface OpenStatesVoteSummary {
  voteEventId: string;
  date: string;
  motionText: string;
  result: string;
  counts: Array<{ option: string; value: number }>;
  personVote?: {
    option: string;
    note: string;
  };
  sources: SourceLink[];
}

export interface OpenStatesCandidateContext {
  stateCode: string;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  divisionId: string | null;
  officeLabel: string | null;
  officeRole: string | null;
  officeClassification: string | null;
  personId: string;
  displayName: string;
  otherNames: string[];
  familyName: string | null;
  givenName: string | null;
  primaryParty: string | null;
  incumbent: boolean;
  identifiers: OpenStatesIdentifier[];
  links: SourceLink[];
  sourceUrls: string[];
  recentVoteSummary: string | null;
  voteSummaries: OpenStatesVoteSummary[];
}

export interface OpenStatesDerivedData {
  generatedAt: string;
  records: OpenStatesCandidateContext[];
}

export interface CandidateLookup {
  stateCode: string;
  jurisdictionId?: string | null;
  officeLabel?: string | null;
  candidateName?: string | null;
}
