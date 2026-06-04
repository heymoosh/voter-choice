// @ts-nocheck
/* Prototype data layer — extracted VERBATIM from prototype-data.jsx +
   prototype-data-c.jsx. The ballot bindings (RACES / RACE_PATTERNS /
   ALIGNMENT_SCORES / PRESET_ISSUES) are `let` so Phase 2 can override them
   with real API data via the setters at the bottom; ES module live-bindings
   flow the real data into the verbatim accessors (getRacePatternsForRace,
   etc.) that the UI bundle imports + calls. */

/* ====================================================
   VOTER CHOICE · mock data
   ====================================================

   PORTABILITY CONTRACT (see prototype/COMPONENT_MAP.md):

   Data here is shaped to match the repo's existing
   TypeScript interfaces from src/lib/structured-blocks.ts
   and src/types/election.ts. Three top-level objects:

     • RACES               — matches deriveRaces() output (raceDeriver.ts)
                             Race { id, section, label, decided, candidates: [{name, party}] }

     • RACE_PATTERNS       — matches [RACE_PATTERNS] block (structured-blocks.ts)
                             keyed by raceId →
                             { race, candidates: RacePatternsCandidate[] }

     • ALIGNMENT_SCORES    — matches [ALIGNMENT_SCORES] block
                             keyed by raceId →
                             { race, entries: AlignmentScoresEntry[] }

     • PRESET_ISSUES       — matches [CONCERN_INTERPRETATION] block.entries
                             Each entry carries the canonicalIssue id used to
                             look up scores in ALIGNMENT_SCORES.

   DESIGN-DELTA FIELDS (must be added to the repo's interfaces
   when implementing this prototype). Marked inline with [Δ]:

     • ContributingVote.narrative?: string
         Curated 1-2 paragraph explanation of the vote's context,
         sourced from CAN2026 case files. The repo has no
         equivalent today; the drill-down currently shows only
         bill / vote / date / source.

     • DonorBucketSlice.isIssuePAC?: boolean
       DonorBucketSlice.alignsWith?: string (canonicalIssue)
         Flags a donor-coalition slice as an editorially-curated
         "named issue PAC" (e.g. AIPAC, Fairshake, EMILY's List).
         Surfaces the slice separately from generic industry
         buckets, and ties it to a specific issue when relevant.

     • RacePatternsCandidate.fundingMix?: { small, large, pac, total, cycle }
         Funding by source type (small-dollar / large individual /
         PAC). This is the "money map" visualization — orthogonal
         to donorCoalition (which is by industry/sector). Both can
         coexist on the same candidate.

   ==================================================== */

/* ────────── RACES ──────────
   Matches raceDeriver.ts → Race[].
   Candidates here are the THIN form (just name + party) — the
   rich data lives in RACE_PATTERNS and ALIGNMENT_SCORES below. */

// TEMP TEST SEED (Phase 2 — race-data seam). Real NJ Camden ballot so
// /api/race-data resolves real candidates (Booker/Norcross). The civic seam
// (Phase 2c) replaces this hardcoded value with applyRealRaces(fetchedBallot).
// stateCode for these is NJ (threaded as REAL_STATE_CODE below).
let RACES = [
  { id: 'us-senate',  section: 'Federal', label: 'U.S. Senate', decided: false,
    candidates: [
      { name: 'Cory Booker', party: 'Democratic' },
    ]},
  { id: 'us-house-cd-1',  section: 'Federal', label: 'U.S. House — CD-1', decided: false,
    candidates: [
      { name: 'Donald Norcross', party: 'Democratic' },
    ]},
  { id: 'county-commissioners', section: 'County', label: 'County Commissioners', decided: false, voteForN: 2,
    candidates: [
      { name: 'Louis Cappelli Jr', party: 'Democratic' },
      { name: 'Jonathan Young', party: 'Democratic' },
      { name: 'Vanetta Hawkins', party: 'Democratic' },
      { name: 'Constance Mercedes', party: 'Democratic' },
    ]},
];

// State code for the active ballot — set by the civic seam later; seeded NJ
// for the test ballot above. Read by realData.ts when calling /api/race-data.
let REAL_STATE_CODE = 'NJ';

/* ────────── PROPOSITION DETAIL ──────────
   The repo does NOT have a structured block for proposition
   detail today; rendering pulls from a separate API surface.
   For the prototype we store minimal copy keyed by raceId. */

const PROPOSITION_DETAIL = {
  'prop-1': {
    /* `kind` drives state-aware messaging. In TX, constitutional
       amendments on the November ballot are BINDING. By contrast,
       primary-election propositions in TX are ADVISORY — they
       signal voter preference but don't enact law. In production,
       the host sets this from CivicAPI proposition metadata +
       state rules. */
    kind: 'constitutional',
    state: 'TX',
    summary: 'Constitutional amendment to cap property tax increases at 3% per year for homeowners over 65.',
    ifYes:   'Seniors’ property taxes can rise no more than 3% annually. School districts argue this caps their main funding source.',
    ifNo:    'Current law stays. Annual increases on senior homestead exemptions follow appraisal district market values.',
  },
  'prop-4': {
    kind: 'bond',
    state: 'TX',
    summary: '$1.2B bond authorization for Harris County school district maintenance and new construction.',
    ifYes:   'District issues $1.2B in bonds. Median Harris County homeowner pays ~$84 more per year in property tax over the bond’s life.',
    ifNo:    'No bond issued. Maintenance backlog of $340M continues. Three planned schools delayed.',
  },
  'prop-7': {
    /* [Δ] Advisory variant — demonstrates non-binding banner.
       In real TX ballots, advisory props appear on PRIMARY election
       ballots, not the November general. This is a stand-in for the
       prototype so we can show the advisory framing alongside the
       binding ones. */
    kind: 'primary_advisory',
    state: 'TX',
    summary: 'Should the Texas Legislature expand the list of accepted forms of photo ID for voting?',
    ifYes:   'Signals to your party that you support expanding accepted ID forms (e.g. student IDs, expired military IDs). Does not change election law on its own — the legislature decides whether to draft a bill.',
    ifNo:    'Signals to your party that you oppose expanding the ID list. Current law stays unless the legislature acts on its own.',
  },
};

/* Proposition-kind metadata. Drives the "what this means" banner
   atop each PropositionCard. Hand-curated for the prototype — in
   production this is keyed by (state, electionType, propType). */
const PROPOSITION_KIND_META = {
  constitutional: {
    label: 'Constitutional amendment · binding',
    binding: true,
    tone: 'binding',
    blurb: 'A YES vote changes the Texas constitution. This is binding — if it passes statewide, it becomes law.',
  },
  bond: {
    label: 'Bond authorization · binding',
    binding: true,
    tone: 'binding',
    blurb: 'A YES vote lets the issuing district sell bonds (debt) and raise property taxes to repay them. Binding — if it passes, the bond gets issued.',
  },
  statute: {
    label: 'Ballot measure · binding',
    binding: true,
    tone: 'binding',
    blurb: 'A YES vote changes state law directly. Binding — if it passes statewide, it becomes law.',
  },
  primary_advisory: {
    label: 'Primary proposition · advisory only',
    binding: false,
    tone: 'advisory',
    blurb: 'In a TX primary, propositions are ADVISORY — they signal what the party’s voters care about but don’t become law on their own. They influence the party platform + how legislators prioritize bills.',
  },
  advisory: {
    label: 'Advisory vote · non-binding',
    binding: false,
    tone: 'advisory',
    blurb: 'This is non-binding. A YES vote does NOT enact law. It tells your legislators what voters in your district prioritize — they decide whether to act on it.',
  },
};

/* ────────── RACE_PATTERNS ──────────
   One entry per choice-type race. Matches RacePatternsBlock
   from structured-blocks.ts:
     { race, candidates: RacePatternsCandidate[] }

   RacePatternsCandidate fields (repo-defined):
     id, name, incumbent, priorRole?,
     donorCoalition: DonorBucketSlice[] | null,
     donorSource?, donorUnavailable?,
     endorsements: EndorsementEntry[] | null,
     platformAlignment: { kept, total } | null,
     retrospective: RetrospectiveEntry[] | null,
     valuesHighlight: ValuesHighlight | null,
     totalRaised?: number,
     donorDataSource?: "voting_record" | "web_search"

   [Δ] design-delta fields added by this prototype:
     fundingMix?: { small, large, pac, total, cycle }
     donorCoalition[].isIssuePAC?: boolean
     donorCoalition[].alignsWith?: string (canonicalIssue) */

let RACE_PATTERNS = {
  'us-senate-tx': {
    race: 'U.S. Senate — TX',
    candidates: [
      {
        id: 'cornyn',
        name: 'John Cornyn',
        incumbent: true,
        priorRole: 'Senator since 2002 · former Texas AG',
        platformAlignment: { kept: 38, total: 91 },
        donorCoalition: [
          { label: 'AIPAC', fullName: 'American Israel Public Affairs Committee',
            advocates: 'Pro-Israel foreign policy lobby; favors continued military aid + opposes restrictions on aid conditions.',
            percent: 7, amount: 436000, isIssuePAC: true, relevantToIssue: 'foreign_policy', pacStance: 'with' },
          { label: 'PhRMA', fullName: 'Pharmaceutical Research and Manufacturers of America',
            advocates: 'Pharmaceutical industry trade group · opposes Medicare drug-price negotiation + price caps.',
            percent: 4, amount: 340000, isIssuePAC: true, relevantToIssue: 'healthcare_affordability', pacStance: 'against' },
          { label: 'Eli Lilly PAC', fullName: 'Eli Lilly & Company corporate PAC',
            advocates: 'Pharma manufacturer (insulin · diabetes drugs). Opposes price-cap legislation that targets their products.',
            percent: 1, amount: 28000, isIssuePAC: true, relevantToIssue: 'healthcare_affordability', pacStance: 'against' },
          { label: 'Oil & Gas',      percent: 14, amount: 1200000 },
          { label: 'Banking',        percent: 8,  amount: 680000 },
          { label: 'Real estate',    percent: 5,  amount: 420000 },
          { label: 'Defense',        percent: 4,  amount: 310000 },
        ],
        donorDataSource: 'voting_record',
        totalRaised: 8400000,
        donorSource: { name: 'FEC · OpenSecrets', url: 'https://www.opensecrets.org' },
        endorsements: null,
        retrospective: null,
        valuesHighlight: null,
        // [Δ] design-delta
        fundingMix: { small: 8, large: 32, pac: 60, total: 8400000, cycle: '2020–2024 (last full term)' },
      },
      {
        id: 'allred',
        name: 'Colin Allred',
        incumbent: false,
        priorRole: 'House Rep (TX-32) since 2019',
        platformAlignment: { kept: 73, total: 91 },
        donorCoalition: [
          { label: 'EMILY’s List', fullName: 'EMILY’s List',
            advocates: 'Funds pro-choice Democratic women candidates. Favors codifying Roe-era abortion access.',
            percent: 6, amount: 252000, isIssuePAC: true, relevantToIssue: 'reproductive_rights', pacStance: 'with' },
          { label: 'LCV Action Fund', fullName: 'League of Conservation Voters Action Fund',
            advocates: 'Climate + environmental advocacy. Favors emissions caps, clean-energy subsidies, EPA enforcement.',
            percent: 3, amount: 130000, isIssuePAC: true, relevantToIssue: 'environment_climate', pacStance: 'with' },
          { label: 'Trial lawyers',      percent: 12, amount: 520000 },
          { label: 'Healthcare',         percent: 8,  amount: 340000 },
          { label: 'Education',          percent: 6,  amount: 260000 },
          { label: 'Tech',               percent: 4,  amount: 180000 },
        ],
        donorDataSource: 'voting_record',
        totalRaised: 4200000,
        donorSource: { name: 'FEC · OpenSecrets', url: 'https://www.opensecrets.org' },
        endorsements: null,
        retrospective: null,
        valuesHighlight: null,
        // [Δ] design-delta
        fundingMix: { small: 38, large: 41, pac: 21, total: 4200000, cycle: '2024 cycle' },
      },
    ],
  },

  'us-house-tx7': {
    race: 'U.S. House — TX‑7',
    candidates: [
      {
        id: 'hartman',
        name: 'Jordan Hartman',
        incumbent: true,
        priorRole: 'House Rep (TX-7) since 2022 · Energy & Commerce',
        platformAlignment: { kept: 67, total: 84 },
        donorCoalition: [
          { label: 'EMILY’s List', fullName: 'EMILY’s List',
            advocates: 'Funds pro-choice Democratic women candidates. Favors codifying Roe-era abortion access.',
            percent: 5, amount: 112000, isIssuePAC: true, relevantToIssue: 'reproductive_rights', pacStance: 'with' },
          { label: 'Healthcare workers',    percent: 20, amount: 412000 },
          { label: 'Education · NEA',  percent: 14, amount: 298000 },
          { label: 'Real estate',           percent: 10, amount: 214000 },
          { label: 'Energy',                percent: 7,  amount: 156000 },
        ],
        donorDataSource: 'voting_record',
        totalRaised: 2100000,
        donorSource: { name: 'FEC', url: 'https://www.fec.gov' },
        endorsements: null,
        retrospective: null,
        valuesHighlight: null,
        // [Δ]
        fundingMix: { small: 24, large: 51, pac: 25, total: 2100000, cycle: '2024 cycle' },
      },
      {
        id: 'olusola',
        name: 'Marisol Olusola',
        incumbent: false,
        priorRole: 'Former Harris County prosecutor · first-time candidate',
        // No legislative record → null
        platformAlignment: null,
        donorCoalition: [
          { label: 'Oil & Gas',                percent: 34, amount: 184000 },
          { label: 'Real estate',              percent: 21, amount: 112000 },
          { label: 'Small business assoc',     percent: 14, amount: 78000 },
        ],
        donorDataSource: 'voting_record',
        totalRaised: 540000,
        donorSource: { name: 'FEC', url: 'https://www.fec.gov' },
        endorsements: null,
        retrospective: null,
        valuesHighlight: null,
        // [Δ]
        fundingMix: { small: 11, large: 47, pac: 42, total: 540000, cycle: '2026 cycle (partial)' },
      },
    ],
  },

  'governor-tx': {
    race: 'Governor — TX',
    candidates: [
      {
        id: 'beto',
        name: 'Beto O’Rourke',
        incumbent: false,
        priorRole: 'Former House Rep (TX-16) · ran for Senate 2018, governor 2022',
        platformAlignment: { kept: 72, total: 88 },
        donorCoalition: [
          { label: 'Grassroots small-dollar',  percent: 71, amount: 4100000 },
          { label: 'Education',                percent: 5,  amount: 290000 },
          { label: 'Tech',                     percent: 4,  amount: 240000 },
        ],
        donorDataSource: 'voting_record',
        totalRaised: 5800000,
        donorSource: { name: 'FEC · OpenSecrets', url: 'https://www.opensecrets.org' },
        endorsements: null,
        retrospective: null,
        valuesHighlight: null,
        // [Δ]
        fundingMix: { small: 71, large: 24, pac: 5, total: 5800000, cycle: '2026 cycle (so far)' },
      },
      {
        id: 'abbott',
        name: 'Greg Abbott',
        incumbent: true,
        priorRole: 'Governor since 2015 · former TX Supreme Court justice',
        platformAlignment: { kept: 41, total: 88 },
        donorCoalition: [
          { label: 'PhRMA', fullName: 'Pharmaceutical Research and Manufacturers of America',
            advocates: 'Pharmaceutical industry trade group · opposes Medicare drug-price negotiation + price caps.',
            percent: 1, amount: 120000, isIssuePAC: true, relevantToIssue: 'healthcare_affordability', pacStance: 'against' },
          { label: 'Oil & Gas',      percent: 12, amount: 8400000 },
          { label: 'Real estate',    percent: 3,  amount: 2100000 },
          { label: 'Construction',   percent: 2,  amount: 1400000 },
          { label: 'Healthcare',     percent: 1,  amount: 640000 },
        ],
        donorDataSource: 'voting_record',
        totalRaised: 73000000,
        donorSource: { name: 'TX Ethics Commission', url: 'https://www.ethics.state.tx.us' },
        endorsements: null,
        retrospective: null,
        valuesHighlight: null,
        // [Δ]
        fundingMix: { small: 4, large: 36, pac: 60, total: 73000000, cycle: 'cumulative 2014–2024' },
      },
    ],
  },
};

/* ────────── ALIGNMENT_SCORES ──────────
   One entry per choice-type race. Matches AlignmentScoresBlock
   from structured-blocks.ts:
     { race, entries: AlignmentScoresEntry[] }

   AlignmentScoresEntry: { candidateId, scores: AlignmentScore[] | null, unavailable? }

   AlignmentScore fields (repo-defined):
     canonicalIssue, issueLabel, resolvedStance,
     sourceType: "voting_record" | "web_search",
     kept?, total?, contributingVotes?,
     confidence?, evidence?

   ContributingVote fields (repo-defined):
     billTitle, voteCast: "with" | "against", date, source: SourceRef

   [Δ] ContributingVote.narrative?: string
     Curated explanatory paragraph from CAN2026 case files.
     Repo's drill-down currently has no equivalent. */

let ALIGNMENT_SCORES = {
  'us-senate-tx': {
    race: 'U.S. Senate — TX',
    entries: [
      {
        candidateId: 'cornyn',
        scores: [
          {
            canonicalIssue: 'healthcare_affordability',
            issueLabel: 'Healthcare Affordability',
            resolvedStance: 'voter favors lower drug prices and Medicare drug-price negotiation',
            sourceType: 'voting_record',
            kept: 1, total: 5,
            contributingVotes: [
              {
                billTitle: 'HR-2 · Lower Drug Costs Act',
                voteCast: 'against',
                date: '2023-07-14',
                source: { name: 'CAN2026 case file', url: 'https://can2026.org/cases/hr2-2023' },
                // [Δ] narrative
                narrative: 'One of 49 GOP senators against. The bill capped insulin at $35/mo for Medicare beneficiaries and let HHS negotiate drug prices. Cornyn gave a 12-minute floor speech opposing price controls.',
              },
              {
                billTitle: 'IRA · Inflation Reduction Act',
                voteCast: 'against',
                date: '2022-08-07',
                source: { name: 'Congress.gov roll call', url: 'https://www.congress.gov' },
                // [Δ] narrative
                narrative: 'Voted against the IRA in a 51–50 party-line vote. Drug pricing provisions in this bill capped Medicare Part D out-of-pocket at $2,000/yr and let Medicare negotiate prices on 10 drugs starting 2026.',
              },
            ],
          },
          {
            canonicalIssue: 'housing_affordability',
            issueLabel: 'Housing Affordability',
            resolvedStance: 'voter favors stronger rent protections',
            sourceType: 'voting_record',
            kept: 1, total: 3,
            contributingVotes: [
              {
                billTitle: 'S-3692 · Stop Excessive Rent Increases Act',
                voteCast: 'against',
                date: '2024-02-22',
                source: { name: 'CAN2026 case file', url: 'https://can2026.org/cases/s3692-2024' },
                // [Δ]
                narrative: 'Voted to block consideration of a national 5% rent-cap proposal tied to corporate landlords (50+ units). Bill never reached the floor for a full vote.',
              },
              {
                billTitle: 'HR-7160 · SALT Cap Relief',
                voteCast: 'against',
                date: '2024-03-14',
                source: { name: 'Congress.gov roll call', url: 'https://www.congress.gov' },
                // [Δ]
                narrative: 'Voted to lift the $10k SALT cap for married filers. Primary beneficiaries are high-income households in high-tax states. Cornyn argued it offset blue-state-led federal tax burden.',
              },
            ],
          },
          {
            // Note: canonicalIssues.ts in the repo flags this list for
            // expansion. "Congressional accountability" is a proposed new
            // canonical id surfaced by this prototype.
            canonicalIssue: 'congressional_accountability',
            issueLabel: 'Congressional Accountability',
            resolvedStance: 'voter favors banning congressional stock trading',
            sourceType: 'voting_record',
            kept: 0, total: 2,
            contributingVotes: [
              {
                billTitle: 'S-1171 · PELOSI Act (stock trading ban)',
                voteCast: 'against',
                date: '2023-05-09',
                source: { name: 'CAN2026 case file', url: 'https://can2026.org/cases/s1171-2023' },
                // [Δ]
                narrative: 'Bill never reached a floor vote. Cornyn was a listed co-sponsor of an earlier 2020 version but withdrew. Has publicly opposed full bans, supports disclosure-only.',
              },
              {
                billTitle: 'S-2766 · TRUST in Congress Act',
                voteCast: 'against',
                date: '2024-09-18',
                source: { name: 'CAN2026 case file', url: 'https://can2026.org/cases/s2766-2024' },
                // [Δ]
                narrative: 'Voted against advancing the bill out of the Senate Homeland Security committee. Bill would have required members to put assets in qualified blind trusts.',
              },
            ],
          },
        ],
      },
      {
        candidateId: 'allred',
        scores: [
          {
            canonicalIssue: 'healthcare_affordability',
            issueLabel: 'Healthcare Affordability',
            resolvedStance: 'voter favors lower drug prices and Medicare drug-price negotiation',
            sourceType: 'voting_record',
            kept: 4, total: 4,
            contributingVotes: [
              {
                billTitle: 'HR-2 · Lower Drug Costs Act (House)',
                voteCast: 'with',
                date: '2023-07-12',
                source: { name: 'CAN2026 case file', url: 'https://can2026.org/cases/hr2-2023' },
                // [Δ]
                narrative: 'Voted for the House version. Co-signed a colleague letter pushing Senate leadership to bring it up for a floor vote.',
              },
              {
                billTitle: 'IRA · Inflation Reduction Act (House)',
                voteCast: 'with',
                date: '2022-08-12',
                source: { name: 'Congress.gov roll call', url: 'https://www.congress.gov' },
                // [Δ]
                narrative: 'Voted for the House version. Public statements highlighted the Medicare drug price negotiation provisions.',
              },
            ],
          },
          {
            canonicalIssue: 'housing_affordability',
            issueLabel: 'Housing Affordability',
            resolvedStance: 'voter favors stronger rent protections',
            sourceType: 'voting_record',
            kept: 3, total: 4,
            contributingVotes: [],
          },
          {
            canonicalIssue: 'congressional_accountability',
            issueLabel: 'Congressional Accountability',
            resolvedStance: 'voter favors banning congressional stock trading',
            sourceType: 'voting_record',
            kept: 2, total: 2,
            contributingVotes: [
              {
                billTitle: 'HR-336 · PELOSI Act (House companion)',
                voteCast: 'with',
                date: '2023-01-31',
                source: { name: 'CAN2026 case file', url: 'https://can2026.org/cases/hr336-2023' },
                // [Δ]
                narrative: 'Co-sponsored. Voted to advance the House version out of committee. Bill stalled before floor vote.',
              },
            ],
          },
        ],
      },
    ],
  },

  'us-house-tx7': {
    race: 'U.S. House — TX‑7',
    entries: [
      {
        candidateId: 'hartman',
        scores: [
          {
            canonicalIssue: 'healthcare_affordability', issueLabel: 'Healthcare Affordability',
            resolvedStance: 'voter favors lower drug prices',
            sourceType: 'voting_record', kept: 5, total: 5,
            contributingVotes: [],
          },
          {
            canonicalIssue: 'housing_affordability', issueLabel: 'Housing Affordability',
            resolvedStance: 'voter favors stronger rent protections',
            sourceType: 'voting_record', kept: 3, total: 4,
            contributingVotes: [],
          },
          {
            canonicalIssue: 'congressional_accountability', issueLabel: 'Congressional Accountability',
            resolvedStance: 'voter favors banning congressional stock trading',
            sourceType: 'voting_record', kept: 1, total: 2,
            contributingVotes: [],
          },
        ],
      },
      {
        candidateId: 'olusola',
        scores: null,
        unavailable: { reason: 'No legislative record — first-time candidate' },
      },
    ],
  },

  'governor-tx': {
    race: 'Governor — TX',
    entries: [
      {
        candidateId: 'beto',
        scores: [
          { canonicalIssue: 'healthcare_affordability', issueLabel: 'Healthcare Affordability',
            resolvedStance: 'voter favors lower drug prices', sourceType: 'voting_record',
            kept: 3, total: 4, contributingVotes: [] },
          { canonicalIssue: 'housing_affordability', issueLabel: 'Housing Affordability',
            resolvedStance: 'voter favors stronger rent protections', sourceType: 'voting_record',
            kept: 2, total: 3, contributingVotes: [] },
          { canonicalIssue: 'congressional_accountability', issueLabel: 'Congressional Accountability',
            resolvedStance: 'voter favors banning congressional stock trading', sourceType: 'voting_record',
            kept: 1, total: 1, contributingVotes: [] },
        ],
      },
      {
        candidateId: 'abbott',
        scores: [
          { canonicalIssue: 'healthcare_affordability', issueLabel: 'Healthcare Affordability',
            resolvedStance: 'voter favors lower drug prices', sourceType: 'voting_record',
            kept: 1, total: 3, contributingVotes: [] },
          { canonicalIssue: 'housing_affordability', issueLabel: 'Housing Affordability',
            resolvedStance: 'voter favors stronger rent protections', sourceType: 'voting_record',
            kept: 2, total: 4, contributingVotes: [] },
          { canonicalIssue: 'congressional_accountability', issueLabel: 'Congressional Accountability',
            resolvedStance: 'voter favors banning congressional stock trading', sourceType: 'voting_record',
            kept: 0, total: 1, contributingVotes: [] },
        ],
      },
    ],
  },
};

/* ────────── PRESET_ISSUES ──────────
   Matches ConcernInterpretationBlock.entries from structured-blocks.ts:
     { sourceType, sourceTagId? | sourceText?, rank, interpretation,
       canonicalIssue, stance?, confidence,
       disambiguationQuestion?, disambiguationOptions? }

   The `quotes` array is design-delta — the repo's
   interpretation field is a flat string. quotes are how we
   "show our work" to the user. */

let PRESET_ISSUES = [
  {
    sourceType: 'freeText',
    sourceText: 'my mom’s insulin keeps going up',
    rank: 1,
    interpretation: 'Lower insulin & drug prices',
    canonicalIssue: 'healthcare_affordability',
    stance: 'voter favors lower drug prices and Medicare drug-price negotiation',
    confidence: 'clear',
    // [Δ] quotes — how we anchor the interpretation back to user's words
    quotes: [
      { label: 'example', text: 'my mom’s insulin keeps going up' },
      { label: 'and',        text: 'copays are insane … formulary changes every year' },
    ],
  },
  {
    sourceType: 'freeText',
    sourceText: 'rent went up 11% last year',
    rank: 2,
    interpretation: 'Stronger rent + cost-of-living protections',
    canonicalIssue: 'housing_affordability',
    stance: 'voter favors stronger rent protections',
    confidence: 'clear',
    quotes: [
      { label: 'example', text: 'rent went up 11% last year' },
      { label: 'and',        text: 'the cost of basic stuff' },
    ],
  },
  {
    sourceType: 'freeText',
    sourceText: 'the stock trading thing — how is that still legal',
    rank: 3,
    interpretation: 'Ban congressional stock trading',
    // Note: canonicalIssues.ts flags expansion needed. This id is proposed.
    canonicalIssue: 'congressional_accountability',
    stance: 'voter favors banning congressional stock trading',
    confidence: 'clear',
    quotes: [
      { label: 'example', text: 'the stock trading thing — how is that still legal' },
      { label: 'and',        text: 'sick of watching Congress do nothing' },
    ],
  },
];

const SAMPLE_LONGFORM = `My mom's insulin keeps going up — she's on Medicare but the copays are insane, and her doctor keeps switching her meds because the formulary changes every year. My rent went up 11% last year and I'm not even in a fancy neighborhood. I want someone who's actually going to do something about the cost of basic stuff.

Honestly I'm also sick of watching Congress do nothing while we all just absorb it. Like the stock trading thing — how is that still legal.`;

/* POLLING_INFO mirrors the `PollingLocation` interface returned
   by /api/civic (src/app/api/civic/route.ts). Same field names —
   { name, address, hours, notes } — so the port is a direct swap
   (pollingLocations[0]).

   `precinct` and `electionDate` are NOT in the Civic API response.
   - precinct: comes from Harris County directly (or sample-ballot
     extraction). In the prototype we render it as a separate datum,
     and a real port should source it from the county-resources API
     once that lands. Today it is hidden from the bar if not present.
   - electionDate: comes from StateElectionData.elections[0].date. */
const POLLING_INFO = {
  // Civic-API shape (PollingLocation)
  name: 'Trini Mendell Elementary',
  address: '5750 Hartwick Rd, Houston, TX 77057',
  hours: '7:00 AM – 7:00 PM',
  notes: '',
  // Out-of-API extras (sourced separately at port time)
  precinct: '0364',
};

/* ────────── HELPERS ──────────
   Thin lookups. Components consume the structured shapes
   directly; helpers exist only so views don't have to
   know the storage layout. */

function getRacePatternsForRace(raceId) {
  return RACE_PATTERNS[raceId] || null;
}
function getCandidatePatterns(raceId, candidateId) {
  const block = RACE_PATTERNS[raceId];
  return block?.candidates?.find(c => c.id === candidateId) || null;
}
function getAlignmentScoresForRace(raceId) {
  return ALIGNMENT_SCORES[raceId] || null;
}
function getAlignmentEntryForCandidate(raceId, candidateId) {
  const block = ALIGNMENT_SCORES[raceId];
  return block?.entries?.find(e => e.candidateId === candidateId) || null;
}
function getScoreForIssue(alignmentEntry, canonicalIssue) {
  if (!alignmentEntry?.scores) return null;
  return alignmentEntry.scores.find(s => s.canonicalIssue === canonicalIssue) || null;
}

/* ────────── PARTY METADATA ──────────
   Used by view-layer to render pip / color / party badge.
   Doesn't ride on RacePatternsCandidate (repo doesn't store
   party there either — it lives on the deriveRaces Race output). */

const PARTY_META = {
  Democrat:    { code: 'D', pipClass: 'dem' },
  Republican:  { code: 'R', pipClass: 'rep' },
  Independent: { code: 'I', pipClass: 'ind' },
  Libertarian: { code: 'L', pipClass: 'ind' },
  Green:       { code: 'G', pipClass: 'ind' },
};

function getCandidateParty(raceId, candidateName) {
  const race = RACES.find(r => r.id === raceId);
  if (!race) return null;
  const c = race.candidates.find(x => x.name === candidateName);
  if (!c) return null;
  return { name: c.party, ...(PARTY_META[c.party] || { code: '?', pipClass: 'ind' }) };
}

Object.assign(window, {
  RACES,
  RACE_PATTERNS,
  ALIGNMENT_SCORES,
  PRESET_ISSUES,
  PROPOSITION_DETAIL,
  PROPOSITION_KIND_META,
  SAMPLE_LONGFORM,
  POLLING_INFO,
  PARTY_META,

  getRacePatternsForRace,
  getCandidatePatterns,
  getAlignmentScoresForRace,
  getAlignmentEntryForCandidate,
  getScoreForIssue,
  getCandidateParty,
});

/* ==================== prototype-data-c.jsx ==================== */
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
const TODAY_ISO = '2026-09-29';

/* Matches src/types/election.ts → StateElectionData (subset).
   The TX data file in the repo at src/data/states/TX.json is the
   canonical source — this mirrors its shape for the surfaces the
   prototype renders. */
const STATE_ELECTION_DATA = {
  stateCode: 'TX',
  stateName: 'Texas',
  lastUpdated: '2026-08-14',
  coverageStatus: 'confirmed',
  elections: [
    {
      id: 'tx-general-2026',
      name: '2026 General Election',
      date: '2026-11-03',
      type: 'general',
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: '2026-10-05', // ~6 days from TODAY_ISO → "yellow"
      url: 'https://www.votetexas.gov/register-to-vote/',
    },
    byMail: {
      deadline: '2026-10-05 (postmarked)',
      sincePostmarked: true,
    },
    inPerson: {
      deadline: '2026-10-05',
      sincePostmarked: false,
    },
    sameDayRegistration: false,
    registrationCheckUrl: 'https://teamrv-mvp.sos.texas.gov/MVP/mvp.do',
  },
  earlyVoting: {
    available: true,
    startDate: '2026-10-19', // 20 days from TODAY_ISO → "green"
    endDate: '2026-10-30',
    notes: 'In-person early voting only. Times vary by location.',
  },
  votingRules: {
    idRequired: true,
    acceptedIds: [
      'TX driver license',
      'TX election ID certificate',
      'TX personal ID card',
      'TX concealed handgun license',
      'US passport',
      'US military ID',
      'US citizenship certificate w/ photo',
    ],
    phonesAtPolls: 'prohibited',
    phonesAtPollsDetail:
      'Phones are prohibited within 100 feet of the polling place. Print or write down your ballot beforehand.',
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: 'https://www.votetexas.gov/',
    countyElectionLookup: 'https://www.harrisvotes.com/',
    sampleBallotLookup: 'https://www.harrisvotes.com/Voter/sample-ballot',
    pollingPlaceLookup: 'https://www.harrisvotes.com/Voter/polling-locations',
  },
  runoffRules: {
    hasRunoff: true,
    partyLockedToFirstRoundPrimary: true,
    ruleExplanation:
      'In a Texas primary runoff, you can only vote in the runoff for whichever party\u2019s primary you voted in. The general election is unaffected.',
  },
  primaryParticipation: {
    type: 'closed',
    behavior: 'advisory',
    ruleExplanationEn:
      'Texas runs a closed primary. Pick a party in March and you\u2019re locked to that party for any May runoff.',
    ruleExplanationEs:
      'Texas tiene una primaria cerrada. Si eliges un partido en marzo, quedas vinculado a ese partido para cualquier segunda vuelta en mayo.',
  },
  countyResources: {
    'Harris County': {
      name: 'Harris County',
      ballotLookup: 'https://www.harrisvotes.com/Voter/sample-ballot',
      pollingPlaces: 'https://www.harrisvotes.com/Voter/polling-locations',
      earlyVotingLocations: 'https://www.harrisvotes.com/Voter/polling-locations',
      electionsWebsite: 'https://www.harrisvotes.com/',
    },
  },
};

/* Computed deadline rows for rendering. Each row matches what
   getDeadlineStatus(dateISO, todayISO, lang) returns in repo. */
function computeDeadlineRow(labelKey, dateISO) {
  const today = new Date(TODAY_ISO + 'T00:00:00');
  const deadline = new Date(dateISO + 'T00:00:00');
  const daysLeft = Math.round((deadline - today) / 86400000);
  let color;
  if (daysLeft < 0) color = 'passed';
  else if (daysLeft <= 3) color = 'red';
  else if (daysLeft <= 14) color = 'yellow';
  else color = 'green';
  return { labelKey, date: dateISO, daysLeft, color };
}

function getDeadlineRows() {
  const r = STATE_ELECTION_DATA.registration;
  const ev = STATE_ELECTION_DATA.earlyVoting;
  const el = STATE_ELECTION_DATA.elections[0];
  return [
    computeDeadlineRow('deadline.registerOnline', r.online.deadline),
    computeDeadlineRow('deadline.earlyVotingStarts', ev.startDate),
    computeDeadlineRow('deadline.earlyVotingEnds', ev.endDate),
    computeDeadlineRow('deadline.electionDay', el.date),
  ];
}

Object.assign(window, {
  TODAY_ISO,
  STATE_ELECTION_DATA,
  computeDeadlineRow,
  getDeadlineRows,
});

export {
  RACES, RACE_PATTERNS, ALIGNMENT_SCORES, PRESET_ISSUES, PROPOSITION_DETAIL,
  PROPOSITION_KIND_META, SAMPLE_LONGFORM, POLLING_INFO, PARTY_META,
  STATE_ELECTION_DATA, TODAY_ISO,
  getRacePatternsForRace, getCandidatePatterns, getAlignmentScoresForRace,
  getAlignmentEntryForCandidate, getScoreForIssue, getCandidateParty,
  computeDeadlineRow, getDeadlineRows,
};

/* ─── Phase 2 real-data setters ───────────────────────────────────────────
   Override the mock `let` ballot bindings with real API data. ES module
   live-bindings flow the new values into the verbatim accessors above
   (getRacePatternsForRace, getAlignmentScoresForRace, …) that the UI calls. */
export function applyRealRaces(races) {
  RACES = races;
}
export function applyRaceData(raceId, racePatterns, alignmentScores) {
  if (racePatterns) RACE_PATTERNS = { ...RACE_PATTERNS, [raceId]: racePatterns };
  if (alignmentScores)
    ALIGNMENT_SCORES = { ...ALIGNMENT_SCORES, [raceId]: alignmentScores };
}

// Per-candidate web-research cache — card fallback when the DB has no record.
// Keyed by `${raceId}::${candidateName}` → { status: 'loading'|'done'|
// 'unavailable', summary? }. Caching the ATTEMPT (not just successes) stops
// no-record candidates from re-firing forever. Populated ONLY for revealed
// (non-blind) candidates; see the App's research effect.
let CANDIDATE_RESEARCH = {};
export function getCandidateResearch(key) {
  return CANDIDATE_RESEARCH[key];
}
export function setCandidateResearch(key, value) {
  CANDIDATE_RESEARCH = { ...CANDIDATE_RESEARCH, [key]: value };
}
export function setRealStateCode(code) {
  REAL_STATE_CODE = code;
}
export function getRealStateCode() {
  return REAL_STATE_CODE;
}

// Election type of the active ballot (primary / runoff / general / "").
// Set by realData.ts from the uploaded/pasted ballot; read to decide whether
// the party gate applies (primary/runoff → yes; general → no).
let REAL_ELECTION_TYPE = "";
export function setRealElectionType(t) {
  REAL_ELECTION_TYPE = t || "";
}
export function getRealElectionType() {
  return REAL_ELECTION_TYPE;
}
