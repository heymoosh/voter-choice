/* ====================================================
   VOTER CHOICE · 2026 redesign — delegation data
   ====================================================
   Shapes mirror the repo EXACTLY (see COMPONENT_MAP.md):
   - userIssues: ConcernInterpretationEntry[]  (+ [Δ] level routing)
   - candidate:  RacePatternsCandidate (donorCoalition, totalRaised, fundingMix)
   - alignmentEntry: AlignmentScoresEntry (scores w/ contributingVotes + narrative)
   New [Δ] fields for this redesign: attendance, eligibility, level.
   Names are fictional — never attach an invented record to a real person.
   ==================================================== */

const PLACE2 = { code: "TX", name: "Texas", capital: "Austin" };

const USER_ISSUES2 = [
  {
    canonicalIssue: "healthcare_affordability",
    interpretation: "Healthcare costs",
    level: "federal",
    quotes: [{ label: "you said", text: "I can't keep affording my insulin" }],
  },
  {
    canonicalIssue: "immigration",
    interpretation: "Immigration",
    level: "federal",
    quotes: [
      { label: "you said", text: "the border situation feels out of control" },
    ],
  },
  {
    canonicalIssue: "reproductive_rights",
    interpretation: "Reproductive rights",
    level: "state",
    quotes: [{ label: "you said", text: "women should make their own call" }],
  },
  {
    canonicalIssue: "property_taxes",
    interpretation: "Property taxes",
    level: "state",
    quotes: [{ label: "you said", text: "my tax bill went up again" }],
  },
  {
    canonicalIssue: "congressional_accountability",
    interpretation: "Hold them accountable",
    level: "both",
    quotes: [{ label: "you said", text: "half of them don't even show up" }],
  },
];

function issuesForLevel2(level) {
  return USER_ISSUES2.filter((i) => i.level === level || i.level === "both");
}

const PARTY_META2 = {
  Republican: { name: "Republican", code: "R", pipClass: "rep" },
  Democrat: { name: "Democrat", code: "D", pipClass: "dem" },
  Independent: { name: "Independent", code: "I", pipClass: "ind" },
};

const GT = { name: "GovTrack", url: "https://www.govtrack.us/" };
const TLO = {
  name: "Texas Legislature Online",
  url: "https://capitol.texas.gov/",
};
const FEC2 = { name: "FEC bulk filings", url: "https://www.fec.gov/" };

/* ---- DELEGATION SEATS ---- */
const DELEGATION = [
  {
    id: "seat-sen-a",
    section: "Washington — Federal",
    level: "federal",
    office: "U.S. Senate",
    districtLabel: "Texas (statewide)",
    blindLabel: "Your Senior U.S. Senator",
    partyName: "Republican",
    nextElection: { label: "Primary · Mar 3, 2026", onBallot2026: true },
    attendance: { missedPct: 1.4, of: "612 floor votes", band: "good" },
    eligibility: {
      severity: "warn",
      nextLabel: "Primary",
      date: "March 3, 2026",
      ruleHtml:
        "Texas runs an <b>open primary</b> — you may vote either party's ballot. But if it goes to a <b>May runoff</b>, you're locked to the <b>same party's</b> runoff (§172.087).",
      todo: { text: "Register by Feb 2", href: "#" },
    },
    candidate: {
      id: "c-hale",
      name: "Marcus Hale",
      incumbent: true,
      priorRole: "U.S. Senator since 2015",
      totalRaised: 18_400_000,
      fundingMix: { small: 15, large: 47, pac: 38, cycle: "2026 cycle" },
      donorSource: FEC2,
      donorCoalition: [
        { label: "Oil & Gas", percent: 33, amount: 6_100_000 },
        { label: "Real Estate", percent: 21, amount: 3_900_000 },
        { label: "Banking", percent: 17, amount: 3_200_000 },
        { label: "Trial Lawyers", percent: 13, amount: 2_400_000 },
        {
          label: "AFP Action",
          fullName: "Americans for Prosperity Action",
          amount: 1_100_000,
          isIssuePAC: true,
          relevantToIssue: "healthcare_affordability",
          pacStance: "against",
          advocates: "Opposes drug-price negotiation and ACA subsidy expansion",
        },
      ],
    },
    alignmentEntry: {
      candidateId: "c-hale",
      scores: [
        {
          canonicalIssue: "healthcare_affordability",
          issueLabel: "Healthcare costs",
          kept: 1,
          total: 5,
          contributingVotes: [
            {
              billTitle: "S 1339 · Insulin Price Cap Act",
              voteCast: "against",
              date: "2025-06-12",
              narrative:
                "Hale voted against capping insulin copays at $35/month, calling it price-fixing in floor remarks.",
              source: GT,
            },
            {
              billTitle: "S 2410 · Drug Price Negotiation Expansion",
              voteCast: "against",
              date: "2024-11-03",
              narrative:
                "Voted against letting Medicare negotiate 40 additional drug prices.",
              source: GT,
            },
            {
              billTitle: "S 870 · Rural Hospital Funding Act",
              voteCast: "with",
              date: "2025-02-20",
              narrative:
                "Co-sponsored and voted for expanded rural hospital stabilization grants.",
              source: GT,
            },
          ],
        },
        {
          canonicalIssue: "immigration",
          issueLabel: "Immigration",
          kept: 4,
          total: 5,
          contributingVotes: [
            {
              billTitle: "S 311 · Border Staffing & Technology Act",
              voteCast: "with",
              date: "2025-04-18",
              narrative:
                "Voted to fund 2,400 additional CBP officers and port-of-entry scanners.",
              source: GT,
            },
            {
              billTitle: "S 198 · Asylum Processing Reform",
              voteCast: "with",
              date: "2024-09-30",
              narrative:
                "Backed faster asylum adjudication with stricter eligibility screening.",
              source: GT,
            },
          ],
        },
        {
          canonicalIssue: "congressional_accountability",
          issueLabel: "Hold them accountable",
          kept: 3,
          total: 4,
          contributingVotes: [
            {
              billTitle: "S 1171 · Congressional Stock Trading Ban",
              voteCast: "with",
              date: "2025-03-11",
              narrative:
                "Voted to bar members and spouses from trading individual stocks in office.",
              source: GT,
            },
            {
              billTitle: "S 644 · Lobbying Transparency Act",
              voteCast: "with",
              date: "2024-07-22",
              narrative:
                "Supported 48-hour disclosure of lobbyist contacts with member offices.",
              source: GT,
            },
          ],
        },
      ],
    },
  },
  {
    id: "seat-sen-b",
    section: "Washington — Federal",
    level: "federal",
    office: "U.S. Senate",
    districtLabel: "Texas (statewide)",
    blindLabel: "Your Junior U.S. Senator",
    partyName: "Democrat",
    nextElection: { label: "Next up 2028", onBallot2026: false },
    attendance: { missedPct: 6.8, of: "612 floor votes", band: "mid" },
    eligibility: {
      severity: "info",
      nextLabel: "Not on your 2026 ballot",
      date: "next up 2028",
      ruleHtml:
        "Senate terms run six years — this seat isn't up until <b>2028</b>. The record still counts: it's what they're doing with the term you already gave them.",
      todo: null,
    },
    candidate: {
      id: "c-okafor",
      name: "Diane Okafor",
      incumbent: true,
      priorRole: "U.S. Senator since 2021",
      totalRaised: 22_900_000,
      fundingMix: { small: 43, large: 41, pac: 16, cycle: "2026 cycle" },
      donorSource: FEC2,
      donorCoalition: [
        { label: "Grassroots small-dollar", percent: 43, amount: 9_800_000 },
        { label: "Healthcare", percent: 18, amount: 4_100_000 },
        { label: "Trial Lawyers", percent: 16, amount: 3_600_000 },
        { label: "Tech", percent: 13, amount: 3_000_000 },
        {
          label: "PFAW Votes",
          fullName: "Patients First Action Fund",
          amount: 900_000,
          isIssuePAC: true,
          relevantToIssue: "healthcare_affordability",
          pacStance: "with",
          advocates: "Backs drug-price caps and out-of-pocket maximums",
        },
      ],
    },
    alignmentEntry: {
      candidateId: "c-okafor",
      scores: [
        {
          canonicalIssue: "healthcare_affordability",
          issueLabel: "Healthcare costs",
          kept: 5,
          total: 5,
          contributingVotes: [
            {
              billTitle: "S 1339 · Insulin Price Cap Act",
              voteCast: "with",
              date: "2025-06-12",
              narrative:
                "Okafor co-sponsored the $35 insulin copay cap and voted for it.",
              source: GT,
            },
            {
              billTitle: "S 2410 · Drug Price Negotiation Expansion",
              voteCast: "with",
              date: "2024-11-03",
              narrative:
                "Voted to expand Medicare drug-price negotiation to 40 more drugs.",
              source: GT,
            },
          ],
        },
        {
          canonicalIssue: "immigration",
          issueLabel: "Immigration",
          kept: 2,
          total: 4,
          contributingVotes: [
            {
              billTitle: "S 311 · Border Staffing & Technology Act",
              voteCast: "with",
              date: "2025-04-18",
              narrative:
                "Crossed party expectations to fund added border staffing and scanners.",
              source: GT,
            },
            {
              billTitle: "S 198 · Asylum Processing Reform",
              voteCast: "against",
              date: "2024-09-30",
              narrative:
                "Opposed the stricter asylum screening standard as too broad.",
              source: GT,
            },
          ],
        },
        {
          canonicalIssue: "congressional_accountability",
          issueLabel: "Hold them accountable",
          kept: 4,
          total: 4,
          contributingVotes: [
            {
              billTitle: "S 1171 · Congressional Stock Trading Ban",
              voteCast: "with",
              date: "2025-03-11",
              narrative:
                "Voted for the member stock-trading ban; already uses a blind trust.",
              source: GT,
            },
          ],
        },
      ],
    },
  },
  {
    id: "seat-house",
    section: "Washington — Federal",
    level: "federal",
    office: "U.S. House",
    districtLabel: "TX-21",
    blindLabel: "Your U.S. Representative",
    partyName: "Republican",
    nextElection: { label: "Primary · Mar 3, 2026", onBallot2026: true },
    attendance: { missedPct: 11.2, of: "724 floor votes", band: "bad" },
    eligibility: {
      severity: "warn",
      nextLabel: "Primary",
      date: "March 3, 2026",
      ruleHtml:
        "House seats are up <b>every two years</b> — this seat is on the 2026 ballot. Open primary; a March vote <b>locks you to that party's May runoff</b>.",
      todo: { text: "Register by Feb 2", href: "#" },
    },
    candidate: {
      id: "c-vance",
      name: "Theo Vance",
      incumbent: true,
      priorRole: "U.S. Representative since 2019",
      totalRaised: 4_200_000,
      fundingMix: { small: 15, large: 39, pac: 46, cycle: "2026 cycle" },
      donorSource: FEC2,
      donorCoalition: [
        { label: "Real Estate", percent: 31, amount: 1_300_000 },
        { label: "Oil & Gas", percent: 25, amount: 1_050_000 },
        { label: "Construction", percent: 17, amount: 720_000 },
        { label: "Banking", percent: 12, amount: 490_000 },
      ],
    },
    alignmentEntry: {
      candidateId: "c-vance",
      scores: [
        {
          canonicalIssue: "healthcare_affordability",
          issueLabel: "Healthcare costs",
          kept: 0,
          total: 4,
          contributingVotes: [
            {
              billTitle: "HR 3421 · Insulin Price Cap Act",
              voteCast: "against",
              date: "2025-06-10",
              narrative:
                "Vance voted against the House companion to the insulin copay cap.",
              source: GT,
            },
            {
              billTitle: "HR 812 · ACA Subsidy Extension",
              voteCast: "against",
              date: "2025-01-15",
              narrative:
                "Voted to let expanded marketplace subsidies lapse at year end.",
              source: GT,
            },
          ],
        },
        {
          canonicalIssue: "immigration",
          issueLabel: "Immigration",
          kept: 3,
          total: 3,
          contributingVotes: [
            {
              billTitle: "HR 144 · Border Staffing & Technology Act",
              voteCast: "with",
              date: "2025-04-15",
              narrative:
                "Voted for the House version funding CBP staffing and scanners.",
              source: GT,
            },
            {
              billTitle: "HR 2 · Secure the Border Act",
              voteCast: "with",
              date: "2024-05-11",
              narrative:
                "Backed resumed wall construction and tighter parole limits.",
              source: GT,
            },
          ],
        },
        {
          canonicalIssue: "congressional_accountability",
          issueLabel: "Hold them accountable",
          kept: 1,
          total: 5,
          contributingVotes: [
            {
              billTitle: "HR 345 · Congressional Stock Trading Ban",
              voteCast: "against",
              date: "2025-03-09",
              narrative:
                "Voted against the stock-trading ban; he actively trades individual equities.",
              source: GT,
            },
            {
              billTitle: "HR 901 · Lobbying Transparency Act",
              voteCast: "against",
              date: "2024-07-20",
              narrative:
                "Opposed 48-hour lobbyist-contact disclosure as burdensome.",
              source: GT,
            },
            {
              billTitle: "HRes 60 · Term-Limit Disclosure Resolution",
              voteCast: "with",
              date: "2024-02-09",
              narrative:
                "Supported the non-binding term-limit disclosure resolution.",
              source: GT,
            },
          ],
        },
      ],
    },
  },
  {
    id: "seat-st-sen",
    section: "Austin — State",
    level: "state",
    office: "Texas Senate",
    districtLabel: "SD-14",
    blindLabel: "Your State Senator",
    partyName: "Republican",
    nextElection: { label: "Primary · Mar 3, 2026", onBallot2026: true },
    attendance: null /* not reliably tracked at state level */,
    eligibility: {
      severity: "warn",
      nextLabel: "Primary",
      date: "March 3, 2026",
      ruleHtml:
        "Texas Senate seats run four years, staggered — <b>SD-14 is on the 2026 ballot</b>. Same open primary, same <b>runoff lock</b> down-ballot.",
      todo: { text: "Register by Feb 2", href: "#" },
    },
    candidate: {
      id: "c-bremer",
      name: "Russ Bremer",
      incumbent: true,
      priorRole: "State Senator since 2017",
      totalRaised: 2_600_000,
      fundingMix: { small: 11, large: 52, pac: 37, cycle: "2026 cycle" },
      donorSource: {
        name: "Texas Ethics Commission",
        url: "https://www.ethics.state.tx.us/",
      },
      donorCoalition: [
        { label: "Real Estate", percent: 36, amount: 940_000 },
        { label: "Oil & Gas", percent: 28, amount: 720_000 },
        { label: "Construction", percent: 16, amount: 410_000 },
      ],
    },
    alignmentEntry: {
      candidateId: "c-bremer",
      scores: [
        {
          canonicalIssue: "reproductive_rights",
          issueLabel: "Reproductive rights",
          kept: 0,
          total: 4,
          contributingVotes: [
            {
              billTitle: "SB 12 · Medical Exception Clarification",
              voteCast: "against",
              date: "2025-04-14",
              narrative:
                "Bremer voted against clarifying physician exceptions under the abortion ban.",
              source: TLO,
            },
            {
              billTitle: "SB 8 · Enforcement Expansion",
              voteCast: "against",
              date: "2025-05-02",
              narrative:
                "Voted with your position's opponents to expand private-suit enforcement.",
              source: TLO,
            },
          ],
        },
        {
          canonicalIssue: "property_taxes",
          issueLabel: "Property taxes",
          kept: 3,
          total: 4,
          contributingVotes: [
            {
              billTitle: "SB 4 · Homestead Exemption Increase",
              voteCast: "with",
              date: "2025-06-01",
              narrative: "Voted to raise the homestead exemption to $140K.",
              source: TLO,
            },
            {
              billTitle: "SB 31 · School District Tax Compression",
              voteCast: "with",
              date: "2025-05-20",
              narrative: "Backed state buy-down of school district M&O rates.",
              source: TLO,
            },
          ],
        },
        {
          canonicalIssue: "congressional_accountability",
          issueLabel: "Hold them accountable",
          kept: 1,
          total: 2,
          contributingVotes: [
            {
              billTitle: "SB 210 · Official Financial Disclosure",
              voteCast: "with",
              date: "2025-03-30",
              narrative:
                "Voted for expanded financial disclosure for state officials.",
              source: TLO,
            },
          ],
        },
      ],
    },
  },
  {
    id: "seat-st-house",
    section: "Austin — State",
    level: "state",
    office: "Texas House",
    districtLabel: "HD-47",
    blindLabel: "Your State Representative",
    partyName: "Democrat",
    nextElection: { label: "Primary · Mar 3, 2026", onBallot2026: true },
    attendance: null,
    eligibility: {
      severity: "warn",
      nextLabel: "Primary",
      date: "March 3, 2026",
      ruleHtml:
        "Texas House seats are up <b>every two years</b> — HD-47 is on the 2026 ballot. Open primary, with the same May <b>runoff lock</b>.",
      todo: { text: "Register by Feb 2", href: "#" },
    },
    candidate: {
      id: "c-marin",
      name: "Lucia Marín",
      incumbent: true,
      priorRole: "State Representative since 2023",
      totalRaised: 890_000,
      fundingMix: { small: 46, large: 38, pac: 16, cycle: "2026 cycle" },
      donorSource: {
        name: "Texas Ethics Commission",
        url: "https://www.ethics.state.tx.us/",
      },
      donorCoalition: [
        { label: "Grassroots small-dollar", percent: 46, amount: 410_000 },
        { label: "Education", percent: 21, amount: 190_000 },
        { label: "Trial Lawyers", percent: 18, amount: 160_000 },
      ],
    },
    alignmentEntry: {
      candidateId: "c-marin",
      scores: [
        {
          canonicalIssue: "reproductive_rights",
          issueLabel: "Reproductive rights",
          kept: 4,
          total: 4,
          contributingVotes: [
            {
              billTitle: "HB 81 · Medical Exception Clarification",
              voteCast: "with",
              date: "2025-04-12",
              narrative:
                "Marín co-authored the physician-exception clarification.",
              source: TLO,
            },
            {
              billTitle: "HB 220 · Contraception Access Protection",
              voteCast: "with",
              date: "2025-03-08",
              narrative: "Voted to protect contraception access statewide.",
              source: TLO,
            },
          ],
        },
        {
          canonicalIssue: "property_taxes",
          issueLabel: "Property taxes",
          kept: 2,
          total: 4,
          contributingVotes: [
            {
              billTitle: "SB 4 · Homestead Exemption Increase",
              voteCast: "with",
              date: "2025-06-01",
              narrative: "Voted for the homestead exemption increase.",
              source: TLO,
            },
            {
              billTitle: "SB 31 · School District Tax Compression",
              voteCast: "against",
              date: "2025-05-20",
              narrative:
                "Opposed rate compression, arguing it underfunds districts long-term.",
              source: TLO,
            },
          ],
        },
        {
          canonicalIssue: "congressional_accountability",
          issueLabel: "Hold them accountable",
          kept: 2,
          total: 2,
          contributingVotes: [
            {
              billTitle: "HB 410 · Official Financial Disclosure",
              voteCast: "with",
              date: "2025-03-28",
              narrative:
                "Voted for expanded financial disclosure for state officials.",
              source: TLO,
            },
          ],
        },
      ],
    },
  },
  {
    id: "seat-gov",
    section: "Statewide — Executive",
    level: "state",
    office: "Governor",
    districtLabel: "Texas — running for re-election",
    blindLabel: "Governor (on your 2026 ballot)",
    partyName: "Republican",
    researched: true,
    nextElection: { label: "Primary · Mar 3, 2026", onBallot2026: true },
    attendance: null,
    eligibility: {
      severity: "warn",
      nextLabel: "Primary",
      date: "March 3, 2026",
      ruleHtml:
        "Governor is a <b>statewide</b> race on the 2026 ballot. Open primary; runoff lock applies.",
      todo: { text: "Register by Feb 2", href: "#" },
    },
    candidate: {
      id: "c-sterling",
      name: "Pat Sterling",
      incumbent: true,
      priorRole: "Governor since 2019",
      totalRaised: 64_000_000,
      fundingMix: { small: 9, large: 58, pac: 33, cycle: "2026 cycle" },
      donorSource: {
        name: "Texas Ethics Commission",
        url: "https://www.ethics.state.tx.us/",
      },
      donorCoalition: [
        { label: "Real Estate", percent: 30, amount: 19_000_000 },
        { label: "Oil & Gas", percent: 25, amount: 16_000_000 },
        { label: "Banking", percent: 17, amount: 11_000_000 },
        { label: "Healthcare", percent: 11, amount: 7_000_000 },
      ],
    },
    /* No roll-call record — positions researched via web_search, cited. */
    positions: [
      {
        canonicalIssue: "reproductive_rights",
        issueLabel: "Reproductive rights",
        resolvedStance: "opposed",
        confidence: "high",
        evidence: [
          {
            summary:
              "Signed the 2021 heartbeat bill; pledged to defend it in re-election kickoff",
            url: "https://example.org/source-1",
          },
        ],
      },
      {
        canonicalIssue: "property_taxes",
        issueLabel: "Property taxes",
        resolvedStance: "in_favor",
        confidence: "high",
        evidence: [
          {
            summary: "Campaigned on a $51B property-tax relief package",
            url: "https://example.org/source-2",
          },
        ],
      },
      {
        canonicalIssue: "immigration",
        issueLabel: "Immigration",
        resolvedStance: "in_favor",
        confidence: "medium",
        evidence: [
          {
            summary: "Funded state border operations; program positions vary",
            url: "https://example.org/source-3",
          },
        ],
      },
    ],
  },
];

/* ---- POLIS scopes (per-person map + bridge statements) ---- */
const POLIS2 = {
  scopes: [
    {
      id: "county",
      label: "Travis County",
      seed: 7,
      sampleSize: 412,
      dotPhrase: "of your neighbors in Travis County",
      scopePhrase: "in Travis County",
      clusters: [
        {
          id: "cost",
          name: "Cost-of-living first",
          color: "oklch(0.58 0.10 160)",
          center: [-0.45, 0.3],
          n: 120,
        },
        {
          id: "local",
          name: "Schools & local services",
          color: "oklch(0.60 0.10 90)",
          center: [0.1, 0.55],
          n: 95,
        },
        {
          id: "security",
          name: "Border & public safety",
          color: "oklch(0.58 0.11 40)",
          center: [0.5, -0.2],
          n: 110,
        },
        {
          id: "rights",
          name: "Rights & climate",
          color: "oklch(0.55 0.10 280)",
          center: [-0.3, -0.45],
          n: 87,
        },
      ],
      you: [-0.12, 0.06],
      bridges: [
        {
          stmt: "Teachers here are underpaid for what we ask of them.",
          pct: 86,
        },
        {
          stmt: "Property-tax relief should come before new spending.",
          pct: 82,
        },
        {
          stmt: "Cap what people pay out-of-pocket for prescription drugs.",
          pct: 88,
        },
      ],
    },
    {
      id: "state",
      label: "Texas",
      seed: 13,
      sampleSize: 3847,
      dotPhrase: "of your fellow Texans",
      scopePhrase: "across Texas",
      clusters: [
        {
          id: "cost",
          name: "Cost-of-living first",
          color: "oklch(0.58 0.10 160)",
          center: [-0.42, 0.26],
          n: 115,
        },
        {
          id: "local",
          name: "Schools & local services",
          color: "oklch(0.60 0.10 90)",
          center: [0.14, 0.5],
          n: 88,
        },
        {
          id: "security",
          name: "Border & public safety",
          color: "oklch(0.58 0.11 40)",
          center: [0.44, -0.24],
          n: 138,
        },
        {
          id: "rights",
          name: "Rights & climate",
          color: "oklch(0.55 0.10 280)",
          center: [-0.34, -0.42],
          n: 79,
        },
      ],
      you: [-0.12, 0.06],
      bridges: [
        {
          stmt: "Fix the power grid before the next freeze — whatever it takes.",
          pct: 89,
        },
        {
          stmt: "Politicians shouldn't draw their own district maps.",
          pct: 81,
        },
        {
          stmt: "Cap what people pay out-of-pocket for prescription drugs.",
          pct: 87,
        },
      ],
    },
    {
      id: "national",
      label: "National",
      seed: 29,
      sampleSize: 28114,
      dotPhrase: "person, anywhere in the country,",
      scopePhrase: "across the country",
      clusters: [
        {
          id: "cost",
          name: "Cost-of-living first",
          color: "oklch(0.58 0.10 160)",
          center: [-0.4, 0.28],
          n: 126,
        },
        {
          id: "local",
          name: "Schools & local services",
          color: "oklch(0.60 0.10 90)",
          center: [0.12, 0.52],
          n: 104,
        },
        {
          id: "security",
          name: "Border & public safety",
          color: "oklch(0.58 0.11 40)",
          center: [0.46, -0.22],
          n: 112,
        },
        {
          id: "rights",
          name: "Rights & climate",
          color: "oklch(0.55 0.10 280)",
          center: [-0.32, -0.44],
          n: 98,
        },
      ],
      you: [-0.12, 0.06],
      bridges: [
        {
          stmt: "Protect Social Security and Medicare from benefit cuts.",
          pct: 91,
        },
        {
          stmt: "Ban members of Congress from trading individual stocks.",
          pct: 86,
        },
        {
          stmt: "Cap what people pay out-of-pocket for prescription drugs.",
          pct: 89,
        },
      ],
    },
  ],
};

Object.assign(window, {
  PLACE2,
  USER_ISSUES2,
  issuesForLevel2,
  PARTY_META2,
  DELEGATION,
  POLIS2,
});
