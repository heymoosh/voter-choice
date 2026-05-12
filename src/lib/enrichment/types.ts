export interface CandidateEnrichment {
  candidateId: string;
  candidateName: string;
  votingRecord?: string;
  topDonors?: string;
  endorsements?: string;
  issuePositions?: string;
  sourceUrls?: string[];
  fetchedAt: string;
  error?: string;
}

export interface EnrichmentRequest {
  candidateId: string;
  candidateName: string;
  party?: string;
  office?: string;
  state?: string;
}
