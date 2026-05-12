// Google Civic Information API response types
// Reference: https://developers.google.com/civic-information/docs/v2/representatives/representativeInfoByAddress

export interface CivicAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface CivicOfficial {
  name: string;
  address?: CivicAddress[];
  party?: string;
  phones?: string[];
  urls?: string[];
  photoUrl?: string;
  emails?: string[];
  channels?: { type: string; id: string }[];
}

export interface CivicOffice {
  name: string;
  divisionId: string;
  levels?: string[];
  roles?: string[];
  officialIndices?: number[];
}

export interface CivicDivisionLookup {
  [divisionId: string]: CivicDivision;
}

export interface CivicDivision {
  name: string;
  scope?: string;
  officeIndices?: number[];
  alsoKnownAs?: string[];
}

export interface CivicRepresentativeResponse {
  kind: string;
  normalizedInput?: CivicAddress;
  divisions?: CivicDivisionLookup;
  offices?: CivicOffice[];
  officials?: CivicOfficial[];
  error?: { code: number; message: string; status: string };
}

// voterInfoByAddress response
export interface CivicPollingLocation {
  address: CivicAddress;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
  notes?: string;
  pollingHours?: string;
  sources?: { name: string; official: boolean }[];
  startDate?: string;
  voterServices?: string;
  id?: string;
}

export interface CivicChannel {
  type: string;
  id: string;
}

export interface CivicCandidate {
  name: string;
  party?: string;
  candidateUrl?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  channels?: CivicChannel[];
  orderOnBallot?: number;
}

export interface CivicContest {
  type: "Referendum" | "Candidate" | "PartyLeader";
  ballotTitle?: string;
  ballotSubTitle?: string;
  district?: {
    id?: string;
    name: string;
    scope?: string;
  };
  level?: string[];
  numberElected?: number;
  numberVotingFor?: number;
  office?: string;
  primaryParty?: string;
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumBriefDescription?: string;
  referendumText?: string;
  referendumProStatement?: string;
  referendumConStatement?: string;
  referendumPassageThreshold?: string;
  referendumEffectOfAbstain?: string;
  referendumBallotResponsesUrl?: string;
  referendumUrl?: string;
  sources?: { name: string; official: boolean }[];
  candidates?: CivicCandidate[];
  roles?: string[];
}

export interface CivicElection {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId?: string;
  electionInfoUrl?: string;
}

export interface CivicVoterInfoResponse {
  kind?: string;
  election?: CivicElection;
  otherElections?: CivicElection[];
  pollingLocations?: CivicPollingLocation[];
  earlyVoteSites?: CivicPollingLocation[];
  dropOffLocations?: CivicPollingLocation[];
  contests?: CivicContest[];
  state?: CivicStateInfo[];
  mailOnly?: boolean;
  error?: { code: number; message: string; status: string };
}

export interface CivicElectionAdministrationBody {
  name?: string;
  electionInfoUrl?: string;
  electionRegistrationUrl?: string;
  electionRegistrationConfirmationUrl?: string;
  absenteeVotingInfoUrl?: string;
  votingLocationFinderUrl?: string;
  ballotInfoUrl?: string;
  electionRulesUrl?: string;
  voter_services?: string[];
  hoursOfOperation?: string;
  correspondenceAddress?: CivicAddress;
  physicalAddress?: CivicAddress;
}

export interface CivicStateInfo {
  name?: string;
  electionAdministrationBody?: CivicElectionAdministrationBody;
  local_jurisdiction?: {
    electionAdministrationBody?: CivicElectionAdministrationBody;
  };
}

// Internal unified types for the app's data model extension

export interface PollingLocationInfo {
  name?: string;
  address: string;
  pollingHours?: string;
  notes?: string;
}

export interface BallotContest {
  id: string;
  type: "candidate" | "referendum" | "other";
  title: string;
  subtitle?: string;
  district?: string;
  level?: string;
  candidates?: BallotCandidate[];
  referendumText?: string;
  referendumProStatement?: string;
  referendumConStatement?: string;
}

export interface BallotCandidate {
  id: string;
  name: string;
  party?: string;
  candidateUrl?: string;
  photoUrl?: string;
  channels?: { type: string; id: string }[];
}

export interface CivicElectionInfo {
  election?: {
    id: string;
    name: string;
    date: string;
  };
  pollingLocation?: PollingLocationInfo;
  ballotContests: BallotContest[];
  state?: string;
  county?: string;
  districts?: {
    congressional?: string;
    stateSenate?: string;
    stateHouse?: string;
  };
  dataSourceAttribution: string;
  fetchedAt: string;
  electionInfoUrl?: string;
}
