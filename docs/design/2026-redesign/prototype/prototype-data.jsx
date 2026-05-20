/* ====================================================
   VOTER CHOICE · mock data
   Races, candidates, donors, key votes
   ==================================================== */

const RACES = [
  {
    id: 'us-house-tx7',
    label: 'U.S. House · TX‑7',
    section: 'Federal',
    type: 'choice',
    candidates: [
      {
        name: 'Jordan Hartman',
        party: 'Democrat',
        partyCode: 'D',
        partyClass: 'dem',
        incumbent: true,
        years: 4,
        // alignment by theme name (will be matched flexibly)
        alignment: {
          'healthcare': 91,
          'cost of living': 84,
          'rent': 84,
          'accountability': 72,
          'stock trading': 68,
          'labor': 64,
          'jobs': 64,
        },
        defaultAlignment: 72,
        donors: [
          { industry: 'Healthcare workers PAC', amount: '$412k', color: 'oklch(0.40 0.075 170)', flex: 1.4 },
          { industry: 'Education · NEA', amount: '$298k', color: 'oklch(0.50 0.10 200)', flex: 1.0 },
          { industry: 'Real estate', amount: '$214k', color: 'oklch(0.76 0.10 75)', flex: 0.8, lightText: true },
          { industry: 'Energy', amount: '$156k', color: 'oklch(0.55 0.10 30)', flex: 0.6 },
          { industry: 'Tech', amount: '$120k', color: 'oklch(0.55 0.04 240)', flex: 0.5 },
        ],
        keyVotes: [
          { bill: 'HR-2', name: 'Lower Drug Costs Act', vote: 'Yea', themes: ['Healthcare'] },
          { bill: 'HR-4501', name: 'China outsourcing tariff', vote: 'Skipped', themes: ['Labor', 'Jobs'] },
        ],
        bio: 'Third-term Democrat, came up through Houston city council. Sits on Energy & Commerce.',
      },
      {
        name: 'Marisol Olusola',
        party: 'Republican',
        partyCode: 'R',
        partyClass: 'rep',
        incumbent: false,
        years: 0,
        alignment: {},
        defaultAlignment: null, // no record
        donors: [
          { industry: 'Energy · O&G', amount: '$184k', color: 'oklch(0.55 0.10 30)', flex: 1.2 },
          { industry: 'Real estate', amount: '$112k', color: 'oklch(0.76 0.10 75)', flex: 0.9, lightText: true },
          { industry: 'Small business assoc', amount: '$78k', color: 'oklch(0.50 0.05 60)', flex: 0.5 },
        ],
        keyVotes: [],
        bio: 'First-time candidate, former Harris County prosecutor. Filed in March 2026.',
      },
    ],
  },
  {
    id: 'us-senate-tx',
    label: 'U.S. Senate · TX',
    section: 'Federal',
    type: 'choice',
    candidates: [
      {
        name: 'Colin Allred',
        party: 'Democrat',
        partyCode: 'D',
        partyClass: 'dem',
        incumbent: false,
        years: 6, // as House
        alignment: {
          'healthcare': 89,
          'cost of living': 81,
          'rent': 81,
          'accountability': 87,
          'stock trading': 88,
          'labor': 79,
          'jobs': 79,
        },
        defaultAlignment: 80,
        donors: [
          { industry: 'Trial lawyers', amount: '$520k', color: 'oklch(0.45 0.10 280)', flex: 1.5 },
          { industry: 'Healthcare', amount: '$340k', color: 'oklch(0.40 0.075 170)', flex: 1.1 },
          { industry: 'Education', amount: '$260k', color: 'oklch(0.50 0.10 200)', flex: 0.9 },
          { industry: 'Tech', amount: '$180k', color: 'oklch(0.55 0.04 240)', flex: 0.7 },
        ],
        keyVotes: [],
        bio: 'Three-term House Democrat (TX-32), former NFL linebacker. Running statewide.',
      },
      {
        name: 'John Cornyn',
        party: 'Republican',
        partyCode: 'R',
        partyClass: 'rep',
        incumbent: true,
        years: 22,
        alignment: {
          'healthcare': 42,
          'cost of living': 51,
          'rent': 51,
          'accountability': 55,
          'stock trading': 38,
          'labor': 45,
          'jobs': 56,
        },
        defaultAlignment: 48,
        donors: [
          { industry: 'Energy · O&G', amount: '$1.2M', color: 'oklch(0.55 0.10 30)', flex: 1.8 },
          { industry: 'Banking & finance', amount: '$680k', color: 'oklch(0.45 0.08 220)', flex: 1.2 },
          { industry: 'Real estate', amount: '$420k', color: 'oklch(0.76 0.10 75)', flex: 0.9, lightText: true },
          { industry: 'Defense', amount: '$310k', color: 'oklch(0.40 0.05 80)', flex: 0.8 },
        ],
        keyVotes: [],
        bio: 'Fourth-term Republican senator, former Texas attorney general.',
      },
    ],
  },
  {
    id: 'governor-tx',
    label: 'Governor · TX',
    section: 'State',
    type: 'choice',
    candidates: [
      {
        name: 'Beto O\u2019Rourke',
        party: 'Democrat',
        partyCode: 'D',
        partyClass: 'dem',
        incumbent: false,
        years: 6,
        alignment: {
          'healthcare': 85,
          'cost of living': 79,
          'rent': 79,
          'accountability': 84,
          'stock trading': 82,
          'labor': 86,
          'jobs': 86,
        },
        defaultAlignment: 82,
        donors: [
          { industry: 'Grassroots small-dollar', amount: '$4.1M', color: 'oklch(0.40 0.075 170)', flex: 2.0 },
          { industry: 'Education', amount: '$290k', color: 'oklch(0.50 0.10 200)', flex: 0.8 },
          { industry: 'Tech', amount: '$240k', color: 'oklch(0.55 0.04 240)', flex: 0.7 },
        ],
        keyVotes: [],
        bio: 'Former TX-16 House member, ran for Senate in 2018 and for governor in 2022.',
      },
      {
        name: 'Greg Abbott',
        party: 'Republican',
        partyCode: 'R',
        partyClass: 'rep',
        incumbent: true,
        years: 12,
        alignment: {
          'healthcare': 38,
          'cost of living': 54,
          'rent': 54,
          'accountability': 48,
          'stock trading': 42,
          'labor': 35,
          'jobs': 62,
        },
        defaultAlignment: 47,
        donors: [
          { industry: 'Energy · O&G', amount: '$8.4M', color: 'oklch(0.55 0.10 30)', flex: 2.4 },
          { industry: 'Real estate', amount: '$2.1M', color: 'oklch(0.76 0.10 75)', flex: 1.2, lightText: true },
          { industry: 'Construction', amount: '$1.4M', color: 'oklch(0.50 0.06 60)', flex: 0.9 },
          { industry: 'Healthcare', amount: '$640k', color: 'oklch(0.40 0.075 170)', flex: 0.6 },
        ],
        keyVotes: [],
        bio: 'Three-term Republican governor, former Texas Supreme Court justice.',
      },
    ],
  },
  {
    id: 'prop-1',
    label: 'Prop 1 · Property tax',
    section: 'Propositions',
    type: 'proposition',
    summary: 'Constitutional amendment to cap property tax increases at 3% per year for homeowners over 65.',
    sumIfYes: 'Seniors\u2019 property taxes can rise no more than 3% annually. School districts argue this caps their main funding source.',
    sumIfNo: 'Current law stays. Annual increases on senior homestead exemptions follow appraisal district market values.',
  },
  {
    id: 'prop-4',
    label: 'Prop 4 · School bonds',
    section: 'Propositions',
    type: 'proposition',
    summary: '$1.2B bond authorization for Harris County school district maintenance and new construction.',
    sumIfYes: 'District issues $1.2B in bonds. Median Harris County homeowner pays ~$84 more per year in property tax over the bond\u2019s life.',
    sumIfNo: 'No bond issued. Maintenance backlog of $340M continues. Three planned schools delayed.',
  },
];

const SAMPLE_LONGFORM = `My mom's insulin keeps going up — she's on Medicare but the copays are insane, and her doctor keeps switching her meds because the formulary changes every year. My rent went up 11% last year and I'm not even in a fancy neighborhood. I want someone who's actually going to do something about the cost of basic stuff.

Honestly I'm also sick of watching Congress do nothing while we all just absorb it. Like the stock trading thing — how is that still legal.`;

const PRESET_THEMES = [
  {
    id: 't1',
    name: 'Healthcare costs & drug pricing',
    keywords: ['healthcare', 'drug', 'pricing'],
    quotes: [
      { label: 'your words', text: 'my mom\u2019s insulin keeps going up' },
      { label: 'and', text: 'copays are insane … formulary changes every year' },
    ],
  },
  {
    id: 't2',
    name: 'Cost of living & rent',
    keywords: ['cost of living', 'rent'],
    quotes: [
      { label: 'your words', text: 'rent went up 11% last year' },
      { label: 'and', text: 'the cost of basic stuff' },
    ],
  },
  {
    id: 't3',
    name: 'Congressional accountability & stock trading',
    keywords: ['accountability', 'stock trading'],
    quotes: [
      { label: 'your words', text: 'sick of watching Congress do nothing' },
      { label: 'and', text: 'the stock trading thing — how is that still legal' },
    ],
  },
];

const POLLING_INFO = {
  name: 'Trini Mendell Elementary',
  address: '5750 Hartwick Rd, Houston TX 77057',
  precinct: '0364',
  hours: '7:00 AM – 7:00 PM',
  bring: 'TX driver\u2019s license or state ID',
  earlyWindow: 'Oct 21 – Oct 31',
  electionDate: 'Tue Nov 3, 2026',
};

window.RACES = RACES;
window.SAMPLE_LONGFORM = SAMPLE_LONGFORM;
window.PRESET_THEMES = PRESET_THEMES;
window.POLLING_INFO = POLLING_INFO;
