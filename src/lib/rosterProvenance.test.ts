import { describe, expect, it } from "vitest";
import {
  fecFinanceOnlyProvenance,
  isSelectableReplacement,
  rosterProvenanceForBallotSource,
  userSuppliedRosterProvenance,
  type RosterCandidate,
} from "./rosterProvenance";

describe("roster provenance containment", () => {
  it("marks FEC candidate rows as finance-only and never selectable replacements", () => {
    const candidate: RosterCandidate = {
      id: "fec-H6TX07123",
      name: "Finance Filer",
      rosterProvenance: fecFinanceOnlyProvenance({
        election: "2026 general",
        retrievedAt: "2026-07-13T12:00:00.000Z",
        sourceUrl: "https://www.fec.gov/data/candidate/H6TX07123/",
      }),
    };

    expect(candidate.rosterProvenance).toMatchObject({
      sourceKind: "fec_campaign_finance",
      confidence: "finance_only",
      ballotStatus: "finance_record_only",
      selectableAsReplacement: false,
    });
    expect(isSelectableReplacement(candidate)).toBe(false);
  });

  it("allows only independently verified current-ballot roster candidates to be replacements", () => {
    const verified: RosterCandidate = {
      id: "official-1",
      name: "Verified Candidate",
      rosterProvenance: {
        sourceKind: "official_sample_ballot",
        election: "2026 general",
        retrievedAt: "2026-07-13T12:00:00.000Z",
        sourceLinks: [
          {
            label: "County sample ballot",
            url: "https://elections.example/ballot",
          },
        ],
        confidence: "verified_current_ballot",
        ballotStatus: "verified_current_ballot",
        selectableAsReplacement: true,
      },
    };

    expect(isSelectableReplacement(verified)).toBe(true);
  });

  it("threads Google Civic exact official contests as address/election-tied, not generic FEC evidence", () => {
    const provenance = rosterProvenanceForBallotSource(
      {
        provider: "Google Civic Information API",
        confidence: "exact_official",
        electionName: "2026 General Election",
        message: "Google Civic returned official contests for this address.",
        sourceLinks: [
          {
            label: "Google Civic Information API",
            url: "https://developers.google.com/civic-information",
          },
        ],
      },
      "2026-07-13T12:00:00.000Z",
    );

    expect(provenance).toMatchObject({
      sourceKind: "google_civic",
      election: "2026 General Election",
      confidence: "official_address_election_tied",
      ballotStatus: "verified_current_ballot",
      selectableAsReplacement: true,
    });
  });

  it("marks pasted/uploaded roster text as user-supplied and unverified", () => {
    const pasted = userSuppliedRosterProvenance({
      sourceKind: "user_pasted_ballot",
      election: "user pasted ballot",
      retrievedAt: "2026-07-13T12:00:00.000Z",
    });

    expect(pasted).toMatchObject({
      confidence: "unverified_user_supplied",
      ballotStatus: "user_supplied_unverified",
      selectableAsReplacement: false,
    });
  });

  it("preserves withdrawn/inactive rows as non-selectable even when source links remain", () => {
    const withdrawn: RosterCandidate = {
      id: "official-withdrawn",
      name: "Withdrawn Candidate",
      rosterProvenance: {
        sourceKind: "state_county_official_list",
        election: "2026 primary",
        retrievedAt: "2026-07-13T12:00:00.000Z",
        sourceLinks: [
          {
            label: "Official withdrawn list",
            url: "https://elections.example/withdrawn",
          },
        ],
        confidence: "verified_current_ballot",
        ballotStatus: "inactive_withdrawn",
        selectableAsReplacement: false,
      },
    };

    expect(isSelectableReplacement(withdrawn)).toBe(false);
  });
});
