import type { BallotData } from "@/lib/types";

const TX_FIXTURE: BallotData = {
  stateCode: "TX",
  stateName: "Texas",
  zip: "73301",
  fetchedAt: new Date().toISOString(),
  districts: {
    county: "Travis County",
    congressionalDistrict: "25",
    stateSenateDistrict: "14",
    stateHouseDistrict: "48",
  },
  elections: [
    {
      id: "tx-2026-primary-runoff",
      name: "2026 Texas Primary Runoff",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
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
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: { deadline: "2026-10-05", sincePostmarked: true },
    inPerson: { deadline: "2026-10-05", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19",
    endDate: "2026-10-30",
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: [
      "Texas driver's license or ID card",
      "Texas Election Identification Certificate",
      "Texas personal ID card issued by DPS",
      "Texas concealed handgun license",
      "U.S. military ID with photo",
      "U.S. citizenship certificate with photo",
      "U.S. passport (book or card)",
    ],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail:
      "Texas law prohibits wireless communication devices in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
  pollingLocation: {
    name: "Travis County Precinct 4 - Community Center",
    address: "6800 Daffodil Terrace, Austin, TX 73301",
    hours: "7:00 AM - 7:00 PM",
  },
  ballotContests: [
    {
      id: "contest-0",
      office: "U.S. Senator",
      district: "Texas",
      candidates: [
        { name: "Jane Doe", party: "Democratic" },
        { name: "John Smith", party: "Republican" },
      ],
    },
    {
      id: "contest-1",
      office: "U.S. Representative",
      district: "Texas 25th Congressional District",
      candidates: [
        { name: "Maria Garcia", party: "Democratic" },
        { name: "Robert Johnson", party: "Republican" },
      ],
    },
  ],
  voterIdData: {
    state: "TX",
    voterIdRequired: true,
    idType: "strict-photo",
    acceptedIds: [
      "Texas driver's license or ID card",
      "Texas Election Identification Certificate",
      "U.S. passport (book or card)",
    ],
    exceptions:
      "Voters without acceptable ID can sign a Reasonable Impediment Declaration.",
    provisionalBallot: true,
    provisionalBallotRules: "Provide ID within 6 calendar days.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Wireless devices prohibited in voting room.",
    sourceUrl: "https://www.sos.texas.gov/elections/voter/photo-id.shtml",
    lastVerified: "2026-04-03",
  },
  errors: [],
  apiFullError: false,
};

const CA_FIXTURE: BallotData = {
  stateCode: "CA",
  stateName: "California",
  zip: "90210",
  fetchedAt: new Date().toISOString(),
  districts: {
    county: "Los Angeles County",
    congressionalDistrict: "33",
    stateSenateDistrict: "26",
    stateHouseDistrict: "50",
  },
  elections: [
    {
      id: "ca-2026-primary",
      name: "2026 California Primary Election",
      date: "2026-06-02",
      type: "primary",
      isPrimary: true,
      primaryType: "semi-closed",
    },
    {
      id: "ca-2026-general",
      name: "2026 California General Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-10-19",
      url: "https://registertovote.ca.gov/",
    },
    byMail: { deadline: "2026-10-19", sincePostmarked: true },
    inPerson: { deadline: "2026-11-03", sincePostmarked: false },
    sameDayRegistration: true,
    registrationCheckUrl: "https://voterstatus.sos.ca.gov/",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-05",
    endDate: "2026-11-02",
    notes: "All voters receive mail-in ballot automatically.",
  },
  votingRules: {
    idRequired: false,
    acceptedIds: [],
    phonesAtPolls: "allowed",
    phonesAtPollsDetail: "California allows phones at polling places.",
    additionalRules: ["All voters receive a mail-in ballot automatically"],
  },
  resources: {
    stateElectionWebsite: "https://www.sos.ca.gov/elections",
    countyElectionLookup:
      "https://www.sos.ca.gov/elections/voting-resources/county-elections-offices",
    sampleBallotLookup:
      "https://www.sos.ca.gov/elections/ballot-measures/qualified-ballot-measures",
    pollingPlaceLookup: "https://www.sos.ca.gov/elections/polling-place",
  },
  pollingLocation: {
    name: "Beverly Hills City Hall - Polling Place",
    address: "455 N Rexford Dr, Beverly Hills, CA 90210",
    hours: "7:00 AM - 8:00 PM",
  },
  ballotContests: [
    {
      id: "contest-0",
      office: "U.S. Senator",
      district: "California",
      candidates: [
        { name: "Alex Chen", party: "Democratic" },
        { name: "Linda Park", party: "Republican" },
      ],
    },
  ],
  voterIdData: {
    state: "CA",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "California does not require voters to show ID at the polls.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Any voter may cast a provisional ballot if eligibility is questioned.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Voters may use phones to access voting information inside the booth.",
    sourceUrl:
      "https://www.sos.ca.gov/elections/voter-registration/id-requirements",
    lastVerified: "2026-04-03",
  },
  errors: [],
  apiFullError: false,
};

const NH_FIXTURE: BallotData = {
  stateCode: "NH",
  stateName: "New Hampshire",
  zip: "03031",
  fetchedAt: new Date().toISOString(),
  districts: {
    county: "Hillsborough County",
    congressionalDistrict: "2",
    stateSenateDistrict: "12",
    stateHouseDistrict: "Hillsborough 21",
  },
  elections: [
    {
      id: "nh-2026-primary",
      name: "2026 New Hampshire Primary Election",
      date: "2026-09-08",
      type: "primary",
      isPrimary: true,
      primaryType: "semi-open",
    },
    {
      id: "nh-2026-general",
      name: "2026 New Hampshire General Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: false,
      deadline: null,
      url: "https://www.sos.nh.gov/elections/voters/register-vote",
    },
    byMail: { deadline: "2026-10-21", sincePostmarked: false },
    inPerson: { deadline: "2026-11-03", sincePostmarked: false },
    sameDayRegistration: true,
    registrationCheckUrl: "https://app.sos.nh.gov/Public/AbsenteeBallot.aspx",
  },
  earlyVoting: {
    available: false,
    startDate: null,
    endDate: null,
    notes: "New Hampshire does not have traditional early voting.",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: [
      "New Hampshire driver's license",
      "New Hampshire non-driver ID",
      "US passport or passport card",
      "NH voter ID card",
    ],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Cell phone use is prohibited inside polling places.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.sos.nh.gov/elections",
    countyElectionLookup:
      "https://www.sos.nh.gov/elections/voters/find-your-polling-place",
    sampleBallotLookup:
      "https://www.sos.nh.gov/elections/candidates/2026-elections",
    pollingPlaceLookup:
      "https://www.sos.nh.gov/elections/voters/find-your-polling-place",
  },
  pollingLocation: {
    name: "Amherst Town Hall",
    address: "2 Main St, Amherst, NH 03031",
    hours: "7:00 AM - 7:00 PM",
  },
  ballotContests: [
    {
      id: "contest-0",
      office: "U.S. Representative",
      district: "New Hampshire 2nd Congressional District",
      candidates: [
        { name: "Tom Wilson", party: "Democratic" },
        { name: "Sarah Brown", party: "Republican" },
      ],
    },
  ],
  voterIdData: {
    state: "NH",
    voterIdRequired: true,
    idType: "non-strict-photo",
    acceptedIds: [
      "New Hampshire driver's license",
      "US passport or passport card",
      "NH voter ID card (free)",
    ],
    exceptions: "Voters without ID may sign an affidavit of identity.",
    provisionalBallot: false,
    provisionalBallotRules:
      "New Hampshire does not use standard provisional ballots.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phone use is prohibited inside polling places.",
    sourceUrl: "https://www.sos.nh.gov/elections/voters/voter-id-law",
    lastVerified: "2026-04-03",
  },
  errors: [],
  apiFullError: false,
};

// AZ/NM multi-state fixture (for zip 86515)
const AZ_FIXTURE: BallotData = {
  stateCode: "AZ",
  stateName: "Arizona",
  zip: "86515",
  fetchedAt: new Date().toISOString(),
  districts: {
    county: "Apache County",
    congressionalDistrict: "1",
  },
  elections: [
    {
      id: "az-2026-primary",
      name: "2026 Arizona Primary Election",
      date: "2026-08-04",
      type: "primary",
      isPrimary: true,
      primaryType: "open",
    },
    {
      id: "az-2026-general",
      name: "2026 Arizona General Election",
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
      url: "https://servicearizona.com/voterRegistration",
    },
    byMail: { deadline: "2026-10-09", sincePostmarked: false },
    inPerson: { deadline: "2026-10-09", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://my.arizona.vote/PortalList.aspx",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-07",
    endDate: "2026-10-30",
    notes:
      "Arizona automatically sends mail ballots to permanent early voters.",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: [
      "Arizona driver's license or non-operating ID",
      "US passport or passport card",
      "US military ID",
      "Tribal enrollment card or other tribal ID",
    ],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail:
      "Arizona prohibits recording within 75 feet of a polling place entrance.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://azsos.gov/elections",
    countyElectionLookup: "https://azsos.gov/county-election-info",
    sampleBallotLookup: "https://my.arizona.vote/PortalList.aspx",
    pollingPlaceLookup: "https://my.arizona.vote/PortalList.aspx",
  },
  pollingLocation: {
    name: "Apache County Elections Office",
    address: "75 W Cleveland St, St. Johns, AZ 85936",
    hours: "7:00 AM - 7:00 PM",
  },
  ballotContests: [
    {
      id: "contest-0",
      office: "U.S. Representative",
      district: "Arizona 1st Congressional District",
      candidates: [
        { name: "David Lee", party: "Democratic" },
        { name: "Patricia White", party: "Republican" },
      ],
    },
  ],
  voterIdData: {
    state: "AZ",
    voterIdRequired: true,
    idType: "strict-photo",
    acceptedIds: [
      "Arizona driver's license or non-operating ID",
      "US passport or passport card",
    ],
    exceptions:
      "Without photo ID, two non-photo documents with name/address are accepted.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Voters without ID can cast a provisional ballot and provide ID within 5 business days.",
    phonesAtPolls: false,
    phonesAtPollsDetail:
      "Recording within 75 feet of a polling place entrance is prohibited.",
    sourceUrl:
      "https://azsos.gov/elections/voting-election/voters-frequently-asked-questions",
    lastVerified: "2026-04-03",
  },
  errors: [],
  apiFullError: false,
};

export const MOCK_FIXTURES: Record<string, BallotData> = {
  "73301": TX_FIXTURE,
  "90210": CA_FIXTURE,
  "03031": NH_FIXTURE,
  "86515": AZ_FIXTURE,
};

export function getMockFixture(zip: string): BallotData | null {
  return MOCK_FIXTURES[zip] ?? null;
}
