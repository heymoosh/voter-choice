import { describe, expect, it } from "vitest";
import { buildFullPrompt } from "@/lib/promptBuilder";
import {
  deriveOpenStatesData,
  lookupOpenStatesCandidate,
} from "@/lib/openstates/derive";
import type { OpenStatesRawTables } from "@/lib/openstates/types";
import type { StateData } from "@/types/state";

const stateData: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-05-11",
  elections: [
    {
      id: "tx-2026-general",
      name: "2026 Texas General Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-10-05",
      url: "https://example.test/register",
    },
    byMail: {
      deadline: "2026-10-05",
      sincePostmarked: true,
    },
    inPerson: {
      deadline: "2026-11-03",
      sincePostmarked: false,
    },
    sameDayRegistration: false,
    registrationCheckUrl: "https://example.test/check",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19",
    endDate: "2026-10-30",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail:
      "Texas law prohibits wireless devices in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://example.test/state",
    countyElectionLookup: "https://example.test/county",
    sampleBallotLookup: "https://example.test/sample",
    pollingPlaceLookup: "https://example.test/polls",
  },
};

const raw: OpenStatesRawTables = {
  opencivicdata_person: [
    {
      id: "ocd-person/1",
      name: "Jane Example",
      family_name: "Example",
      given_name: "Jane",
      primary_party: "Democratic",
      current_jurisdiction_id: "ocd-jurisdiction/1",
      current_role: {},
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      extras: {},
      image: "",
      gender: "",
      biography: "",
      birth_date: "",
      death_date: "",
      email: "",
    },
  ],
  opencivicdata_personname: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Jane Q. Example",
      note: "preferred",
      start_date: "2024-01-01",
      end_date: "",
      person_id: "ocd-person/1",
    },
  ],
  opencivicdata_personidentifier: [
    {
      id: "22222222-2222-2222-2222-222222222222",
      identifier: "https://example.test/profile/jane-example",
      scheme: "official",
      person_id: "ocd-person/1",
    },
  ],
  opencivicdata_personlink: [
    {
      id: "33333333-3333-3333-3333-333333333333",
      note: "campaign site",
      url: "https://example.test/jane",
      person_id: "ocd-person/1",
    },
  ],
  opencivicdata_personsource: [
    {
      id: "44444444-4444-4444-4444-444444444444",
      note: "official bio",
      url: "https://example.test/bio",
      person_id: "ocd-person/1",
    },
  ],
  opencivicdata_post: [
    {
      id: "post-1",
      label: "District 1",
      role: "state senator",
      division_id: "ocd-division/country:us/state:tx",
      organization_id: "org-1",
      maximum_memberships: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      extras: {},
    },
  ],
  opencivicdata_membership: [
    {
      id: "membership-1",
      person_name: "Jane Example",
      role: "state senator",
      start_date: "2024-01-01",
      end_date: "",
      organization_id: "org-1",
      person_id: "ocd-person/1",
      post_id: "post-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      extras: {},
    },
  ],
  opencivicdata_division: [
    {
      id: "ocd-division/country:us/state:tx",
      name: "Texas",
      country: "US",
      subtype1: "state",
      subid1: "tx",
      subtype2: "",
      subid2: "",
      subtype3: "",
      subid3: "",
      subtype4: "",
      subid4: "",
      subtype5: "",
      subid5: "",
      subtype6: "",
      subid6: "",
      subtype7: "",
      subid7: "",
      redirect_id: "",
    },
  ],
  opencivicdata_jurisdiction: [
    {
      id: "ocd-jurisdiction/1",
      name: "Texas Legislature",
      url: "https://example.test/jurisdiction",
      classification: "legislature",
      division_id: "ocd-division/country:us/state:tx",
      latest_bill_update: "2026-04-01T00:00:00Z",
      latest_people_update: "2026-04-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      extras: {},
    },
  ],
  opencivicdata_organization: [
    {
      id: "org-1",
      name: "Texas Senate",
      classification: "legislature",
      jurisdiction_id: "ocd-jurisdiction/1",
      parent_id: null,
      links: [],
      sources: [],
      other_names: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      extras: {},
    },
  ],
  openstates_personoffice: [
    {
      id: "55555555-5555-5555-5555-555555555555",
      classification: "legislator",
      address: "Capitol",
      voice: "555-555-0100",
      fax: "",
      name: "State Senator",
      person_id: "ocd-person/1",
    },
  ],
  opencivicdata_bill: [
    {
      id: "bill-1",
      identifier: "SB 1",
      title: "Sample Bill",
      classification: [],
      subject: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      extras: {},
    },
  ],
  opencivicdata_billaction: [
    {
      id: "66666666-6666-6666-6666-666666666666",
      description: "Passed the Senate",
      date: "2026-03-01",
      classification: [],
      order: 0,
      bill_id: "bill-1",
      organization_id: "org-1",
    },
  ],
  opencivicdata_billsource: [
    {
      id: "77777777-7777-7777-7777-777777777777",
      note: "bill text",
      url: "https://example.test/bill",
      bill_id: "bill-1",
    },
  ],
  opencivicdata_voteevent: [
    {
      id: "vote-1",
      identifier: "2026-03-01-roll-call",
      motion_text: "Final passage vote",
      motion_classification: [],
      start_date: "2026-03-01",
      result: "pass",
      bill_id: "bill-1",
      bill_action_id: "66666666-6666-6666-6666-666666666666",
      legislative_session_id: "session-1",
      organization_id: "org-1",
      order: 0,
      dedupe_key: "",
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
      extras: {},
    },
  ],
  opencivicdata_personvote: [
    {
      id: "88888888-8888-8888-8888-888888888888",
      option: "Yea",
      voter_name: "Jane Example",
      note: "supported",
      vote_event_id: "vote-1",
      voter_id: "ocd-person/1",
    },
  ],
  opencivicdata_votecount: [
    {
      id: "99999999-9999-9999-9999-999999999999",
      option: "Yea",
      value: 21,
      vote_event_id: "vote-1",
    },
  ],
  opencivicdata_votesource: [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      note: "roll call",
      url: "https://example.test/roll-call",
      vote_event_id: "vote-1",
    },
  ],
};

describe("OpenStates ETL", () => {
  it("derives a compact candidate context with office, incumbency, votes, and sources", () => {
    const derived = deriveOpenStatesData(raw);

    expect(derived.records).toHaveLength(1);

    const record = derived.records[0];
    expect(record.stateCode).toBe("TX");
    expect(record.displayName).toBe("Jane Example");
    expect(record.officeLabel).toBe("State Senator");
    expect(record.incumbent).toBe(true);
    expect(record.recentVoteSummary).toContain("1 recorded votes");
    expect(record.recentVoteSummary).toContain("1 support");
    expect(record.sourceUrls).toEqual(
      expect.arrayContaining([
        "https://example.test/bio",
        "https://example.test/jane",
        "https://example.test/bill",
        "https://example.test/roll-call",
      ]),
    );
  });

  it("finds a candidate by state, jurisdiction, office, and name", () => {
    const derived = deriveOpenStatesData(raw);
    const record = lookupOpenStatesCandidate(derived, {
      stateCode: "TX",
      jurisdictionId: "ocd-jurisdiction/1",
      officeLabel: "State Senator",
      candidateName: "Jane",
    });

    expect(record?.personId).toBe("ocd-person/1");
  });

  it("adds OpenStates context to the prompt when a candidate match exists", () => {
    const derived = deriveOpenStatesData(raw);
    const record = lookupOpenStatesCandidate(derived, {
      stateCode: "TX",
      officeLabel: "State Senator",
      candidateName: "Jane",
    });

    const prompt = buildFullPrompt(stateData, "73301", record);

    expect(prompt).toContain("OpenStates enrichment");
    expect(prompt).toContain("Jane Example");
    expect(prompt).toContain("State Senator");
  });
});
