/* ====================================================
   VOTER CHOICE · supplemental mock data (Pass C)
   ====================================================
   Adds repo-shaped data the new surfaces need:
     • STATE_ELECTION_DATA — matches src/types/election.ts → StateElectionData
     • TODAY_ISO — sets the "today" for deadline math (single source so the
                   prototype isn't time-dependent; in repo this comes from
                   getTodayInLatestUsZone() in src/lib/electionToday.ts)

   The data here is partial (only the fields the surfaces touch). Anything
   the StateElectionData interface requires but we don't render is omitted
   and flagged in COMPONENT_MAP.md.
   ==================================================== */

/* Frozen "today" for the demo. Real app reads from electionToday.ts.
   Set ~5 weeks before Nov 3 2026 so deadlines span all three color states:
     red    (≤3 days)    — registration online deadline
     yellow (≤14 days)   — early voting starts
     green  (>14 days)   — election day */
const TODAY_ISO = "2026-09-29";

/* Matches src/types/election.ts → StateElectionData (subset).
   The TX data file in the repo at src/data/states/TX.json is the
   canonical source — this mirrors its shape for the surfaces the
   prototype renders. */
const STATE_ELECTION_DATA = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-08-14",
  coverageStatus: "confirmed",
  elections: [
    {
      id: "tx-general-2026",
      name: "2026 General Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-10-05", // ~6 days from TODAY_ISO → "yellow"
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: {
      deadline: "2026-10-05 (postmarked)",
      sincePostmarked: true,
    },
    inPerson: {
      deadline: "2026-10-05",
      sincePostmarked: false,
    },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19", // 20 days from TODAY_ISO → "green"
    endDate: "2026-10-30",
    notes: "In-person early voting only. Times vary by location.",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: [
      "TX driver license",
      "TX election ID certificate",
      "TX personal ID card",
      "TX concealed handgun license",
      "US passport",
      "US military ID",
      "US citizenship certificate w/ photo",
    ],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail:
      "Phones are prohibited within 100 feet of the polling place. Print or write down your ballot beforehand.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.harrisvotes.com/",
    sampleBallotLookup: "https://www.harrisvotes.com/Voter/sample-ballot",
    pollingPlaceLookup: "https://www.harrisvotes.com/Voter/polling-locations",
  },
  runoffRules: {
    hasRunoff: true,
    partyLockedToFirstRoundPrimary: true,
    ruleExplanation:
      "In a Texas primary runoff, you can only vote in the runoff for whichever party\u2019s primary you voted in. The general election is unaffected.",
  },
  primaryParticipation: {
    type: "closed",
    behavior: "advisory",
    ruleExplanationEn:
      "Texas runs a closed primary. Pick a party in March and you\u2019re locked to that party for any May runoff.",
    ruleExplanationEs:
      "Texas tiene una primaria cerrada. Si eliges un partido en marzo, quedas vinculado a ese partido para cualquier segunda vuelta en mayo.",
  },
  countyResources: {
    "Harris County": {
      name: "Harris County",
      ballotLookup: "https://www.harrisvotes.com/Voter/sample-ballot",
      pollingPlaces: "https://www.harrisvotes.com/Voter/polling-locations",
      earlyVotingLocations:
        "https://www.harrisvotes.com/Voter/polling-locations",
      electionsWebsite: "https://www.harrisvotes.com/",
    },
  },
};

/* Computed deadline rows for rendering. Each row matches what
   getDeadlineStatus(dateISO, todayISO, lang) returns in repo. */
function computeDeadlineRow(labelKey, dateISO) {
  const today = new Date(TODAY_ISO + "T00:00:00");
  const deadline = new Date(dateISO + "T00:00:00");
  const daysLeft = Math.round((deadline - today) / 86400000);
  let color;
  if (daysLeft < 0) color = "passed";
  else if (daysLeft <= 3) color = "red";
  else if (daysLeft <= 14) color = "yellow";
  else color = "green";
  return { labelKey, date: dateISO, daysLeft, color };
}

function getDeadlineRows() {
  const r = STATE_ELECTION_DATA.registration;
  const ev = STATE_ELECTION_DATA.earlyVoting;
  const el = STATE_ELECTION_DATA.elections[0];
  return [
    computeDeadlineRow("deadline.registerOnline", r.online.deadline),
    computeDeadlineRow("deadline.earlyVotingStarts", ev.startDate),
    computeDeadlineRow("deadline.earlyVotingEnds", ev.endDate),
    computeDeadlineRow("deadline.electionDay", el.date),
  ];
}

Object.assign(window, {
  TODAY_ISO,
  STATE_ELECTION_DATA,
  computeDeadlineRow,
  getDeadlineRows,
});
