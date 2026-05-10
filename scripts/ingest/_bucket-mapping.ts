/**
 * scripts/ingest/_bucket-mapping.ts
 *
 * v1 keyword matching — TODO refine via OpenSecrets industry codes in a follow-up.
 *
 * Shared donor-bucket mapping helper for federal-donors.ts and state-donors.ts.
 * Maps raw employer names / industry strings to the canonical donor-bucket
 * vocabulary from docs/PATTERN_TAXONOMIES.md.
 *
 * Unmatched employers fall through to "Other". Call sites are responsible for
 * deciding whether to emit "Other" explicitly or simply omit the row.
 *
 * Multi-keyword overlap: first matching rule wins (rules are checked in order).
 */

// ---------------------------------------------------------------------------
// Canonical bucket vocabulary (verbatim from docs/PATTERN_TAXONOMIES.md)
// ---------------------------------------------------------------------------

export const DONOR_BUCKET_LABELS = [
  "Real estate & development",
  "Oil, gas & energy",
  "Healthcare industry",
  "Pharmaceutical & medical device",
  "Finance, banking & insurance",
  "Technology",
  "Legal industry",
  "Agriculture",
  "Telecom & utilities",
  "Retail & hospitality",
  "Trade unions (non-public-safety)",
  "Public safety unions",
  "Education employees",
  "Small individual donors (under $200)",
  "Large individual donors ($200+)",
  "Self-funded",
  "Party committees",
  "Other",
] as const;

export type DonorBucketLabel = (typeof DONOR_BUCKET_LABELS)[number];

// Issue-aligned PACs use a suffixed form: "Issue-aligned PACs — <issue>"
// This is not in the fixed list above because the suffix is dynamic.
export type IssuePacLabel = `Issue-aligned PACs — ${string}`;

export type AnyBucketLabel = DonorBucketLabel | IssuePacLabel;

// ---------------------------------------------------------------------------
// Keyword rules (ordered — first match wins)
// ---------------------------------------------------------------------------
// Each rule is [pattern, bucket]. Longer / more specific patterns should come
// before broader ones (e.g., "Pharmaceutical" before "Healthcare") to avoid
// false positives.

type BucketRule = [RegExp, DonorBucketLabel];

const BUCKET_RULES: BucketRule[] = [
  // Self-funded — check first because "Self Employed Energy Consultant" should
  // NOT match Oil, gas & energy; the person is self-employed, not an employer.
  // Self-funded is detected by the calling script via FEC self-contribution
  // fields — the keyword here is a safety net for employer field edge cases.
  [/\bself[- ]employed\b|\bself[- ]funded\b/iu, "Self-funded"],

  // Party committees — PAC names or employer names indicating party orgs.
  [
    /\b(republican|democratic|democrat|gop)\s+(party|national|committee|state)\b|\brnc\b|\bdnc\b|\bdcc\b|\bnrcc\b|\bnrsc\b|\bdscc\b|party\s+committee/iu,
    "Party committees",
  ],

  // Public safety unions — check before "Trade unions" to win on overlap.
  [
    /\bpolice\b|\bfop\b|fraternal\s+order\s+of\s+police|\bsheriff\b|\bfire\s*fighter|\bfirefighter\b|\bfire\s+department\b|\biafff?\b|\biacp\b/iu,
    "Public safety unions",
  ],

  // Education employees.
  [
    /\b(teacher|nea|aft|american\s+federation\s+of\s+teachers|education\s+association|national\s+education|university|college|school\s+district|community\s+college|public\s+school)\b/iu,
    "Education employees",
  ],

  // Trade unions (non-public-safety).
  [
    /\buaw\b|teamster|\bafl\s*[-–]?\s*cio\b|\blabor\s+union\b|\btrades\b|\bunited\s+auto\b|\bunited\s+steel\b|\bunited\s+mine\b|\bcarpenter|\belectrical\s+workers|\bcommunications\s+workers|\bservice\s+employees\b|\bseiu\b|\bifpte\b|\bibew\b|\bafscme\b/iu,
    "Trade unions (non-public-safety)",
  ],

  // Pharmaceutical & medical device — check before Healthcare to win on overlap.
  [
    /\bpharma\b|\bpharmaceutical\b|\bbiotech(nology)?\b|\bbiomed\b|\bmerck\b|\bpfizer\b|\bbristol[- ]myers\b|\beli\s+lilly\b|\babbvie\b|\bjohnson\s*&?\s*johnson\b|\bj\s*&\s*j\b|\bmedtronic\b|\bstryker\b|\bboston\s+scientific\b|\bastrazeneca\b|\bnovartis\b|\bgenentech\b|\bgsk\b|\bglaxo\b|\bbayer\b|\broche\b|\bsanofi\b|\bamgen\b|\bbiogen\b|\billumina\b|\bvaccine\b/iu,
    "Pharmaceutical & medical device",
  ],

  // Healthcare industry.
  [
    /\bhospital\b|\bhealth\s+(system|network|care|services|center|plan|insurance)\b|\bmedical\s+(center|group|clinic|associates)\b|\bclinic\b|\bnursing\b|\bphysician\b|\bdoctor\b|\bdentist\b|\boptom|\bchiropract|\bhmo\b|\bmanaged\s+care\b|\bcare\s+network\b|\bblue\s+(cross|shield)\b|\bhealthcare\b|\bhealth\b.*\b(provider|system|plan)\b/iu,
    "Healthcare industry",
  ],

  // Oil, gas & energy — check after Pharmaceutical so "AbbVie energy" doesn't match.
  // Note: company names like ConocoPhillips and ExxonMobil are compound words
  // and do not have internal word boundaries, so we match without \b.
  [
    /\boil\b|\bgas\b|\bpetroleum\b|conocophillips|chevron|exxon|mobil|\bshell\b|\bbp\b\s|conoco\b|\bphillips\s+66\b|\bmarathon\s+(oil|petroleum)\b|\bvalero\b|\bhess\b|\bhalliburton\b|\bschlumberger\b|\bbaker\s+hughes\b|\bnational\s+fuel\b|\bpipeline\b|\bliquefied\s+natural\b|\blng\b|\brefinery\b|\bdrilling\b|\bexploration\b.*\bproduction\b|\benergy\s+(company|corp|inc|llc|resources)\b|\brenewable\s+energy\b|\bsolar\b.*\benergy\b|\bwind\s+energy\b|\bnuclear\b.*\benergy\b|\bcoal\b|\bmining\b/iu,
    "Oil, gas & energy",
  ],

  // Telecom & utilities.
  [
    /\btelecom\b|\btelecommunication|\bverizon\b|\bat&?t\b|\bt[- ]mobile\b|\bcomcast\b|\bcharter\b|\bspectrum\b|\bcenturylink\b|\blumen\b|\bfrontier\s+comm|\bsprint\b|\bxfinity\b|\butility\b|\butilities\b|\belectric\s+(coop|company|utility)\b|\bgas\s+company\b|\bwater\s+utility\b|\bpublic\s+service\s+(company|corp)\b|\bpse&?g\b|\bdominion\b|\bexelon\b|\bsouthern\s+company\b|\bnext\s*era\b|\baes\s+corp\b|\bpge\b|\bpacific\s+gas\b|\bconsolidated\s+edison\b|\bcon\s+ed\b/iu,
    "Telecom & utilities",
  ],

  // Finance, banking & insurance.
  [
    /\bbank\b|\binsurance\b|\bcapital\b.*\b(group|management|partners|one)\b|\binvestment\b|\bwealth\s+management\b|\bfinancial\b|\bjp\s*morgan\b|\bgoldman\s+sachs\b|\bmorgan\s+stanley\b|\bwells\s+fargo\b|\bcitibank\b|\bcitigroup\b|\bbank\s+of\s+america\b|\buses\s+bancorp\b|\bpnc\s+bank\b|\btd\s+bank\b|\bsuntrust\b|\bregions\s+bank\b|\bfidelity\b|\bblackrock\b|\bvanguard\b|\bstate\s+street\b|\bredrock\b.*\bcapital\b|\bhedge\s+fund\b|\bprivate\s+equity\b|\bventure\s+capital\b|\bvc\s+firm\b|\bsecurities\b|\bexchange\b|\btrading\b/iu,
    "Finance, banking & insurance",
  ],

  // Technology.
  [
    /\btech(nology)?\b|\bsoftware\b|\bgoogle\b|\bmeta\b|\bfacebook\b|\bmicrosoft\b|\bamazon\b|\bapple\b|\bnvidia\b|\bintel\b|\bamd\b|\boracle\b|\bsalesforce\b|\badobe\b|\bnetflix\b|\buber\b|\blyft\b|\bairbnb\b|\btwitter\b|\bx\s+corp\b|\bsnap\s+inc\b|\bpalantir\b|\bcrowdstrike\b|\bcloud\s+computing\b|\bsaas\b|\bsemiconductor\b|\bcybersecurity\b|\bdata\s+center\b|\bartificial\s+intelligence\b|\bai\s+company\b/iu,
    "Technology",
  ],

  // Legal industry.
  [
    /\blaw\s+(firm|office|group|llp|llc|pllc|pc)\b|\blegal\b|\battorney\b|\blawyer\b|\bcounsel\b|\btrial\s+lawyer|\blitigat|\barbitrat|\bllp\b|\bpllc\b/iu,
    "Legal industry",
  ],

  // Agriculture.
  [
    /\bfarm\b|\bfarming\b|\bagriculture\b|\bagricultural\b|\bcrop\b|\bcattle\b|\bbovine\b|\bpoultry\b|\blivestock\b|\bdairy\b|\bsoy\b|\bcorn\s+(grower|farm)\b|\bgrain\b|\borchard\b|\bharvest\b|\birrigation\b|\bagribusiness\b|\bfood\s+processing\b|\bmeat\s+packing\b|\bcargill\b|\barcher\s+daniels\b|\badm\b|\bbunge\b|\btyson\b|\bsimplot\b/iu,
    "Agriculture",
  ],

  // Real estate & development.
  [
    /\breal\s+estate\b|\brealtor\b|\bproperty\b|\bdeveloper\b|\bdevelopment\b|\breit\b|\bhousing\b|\bmortgage\b|\bhomebuilder\b|\blennar\b|\bdr\s+horton\b|\bpulte\b|\btoll\s+brothers\b|\bkb\s+homes?\b|\bcbre\b|\bjll\b|\bjones\s+lang\b|\blandlord\b|\bapartment\b|\bcommercial\s+real\s+estate\b|\bleasing\b|\bnewmark\b|\bcushman\b|\bwakefield\b/iu,
    "Real estate & development",
  ],

  // Retail & hospitality.
  [
    /\bretail\b|\brestaurant\b|\bhotel\b|\bhospitality\b|\bwalmart\b|\btarget\b|\bkroger\b|\bcostco\b|\bsam('s)?\s+club\b|\bwhole\s+foods\b|\bstarbucks\b|\bmcdonald's?\b|\bburger\s+king\b|\bchick[- ]fil|\bwendy's?\b|\byum\s+brands\b|\bmarriott\b|\bhilton\b|\bhyatt\b|\bihg\b|\bwyndham\b|\bfour\s+seasons\b|\bcasino\b|\bgaming\b.*\b(corp|inc|llc)\b|\bdarden\b|\blowe's?\b|\bhome\s+depot\b|\bstores?\s+inc\b/iu,
    "Retail & hospitality",
  ],
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map an employer name (and optional occupation) to a donor bucket label.
 *
 * Returns the matched label, or null if no rule matches.
 * Callers should treat null as "Other".
 *
 * Notes:
 * - First matching rule wins.
 * - "Self Employed Energy Consultant" → "Self-funded" (not "Oil, gas & energy")
 *   because the self-employment rule is checked first.
 * - "ConocoPhillips" → "Oil, gas & energy" (matches /conoco/).
 * - Empty or whitespace-only input → null.
 */
export function mapEmployerToBucket(
  employer: string,
  _occupation?: string,
): DonorBucketLabel | null {
  const trimmed = employer.trim();
  if (!trimmed) return null;

  for (const [pattern, bucket] of BUCKET_RULES) {
    if (pattern.test(trimmed)) return bucket;
  }

  return null;
}

/**
 * Classify an individual contribution by dollar amount into the appropriate
 * individual-donor bucket.
 */
export function bucketIndividualByAmount(
  amount: number,
): "Small individual donors (under $200)" | "Large individual donors ($200+)" {
  return amount < 200
    ? "Small individual donors (under $200)"
    : "Large individual donors ($200+)";
}
