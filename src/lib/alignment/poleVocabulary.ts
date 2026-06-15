/**
 * Shared directionality anchor — the machine-readable derivative of
 * `docs/alignment/POLE_VOCABULARY.md`.
 *
 * WHY THIS EXISTS (see docs/alignment/SHARED_ANCHOR_SPEC.md):
 * The alignment score is an XNOR (`computeVoteAlignment`, src/lib/server/alignment.ts)
 * between a bill's `stance_lens` (set by the tagger) and a voter's resolved `stance`
 * (set by the runtime concern-resolver) — both `in_favor | opposed`, both measured
 * against a canonical issue. For a contested issue like `gun_rights_safety`,
 * "in_favor" has no inherent direction, so the two prompts can silently read it
 * opposite ways and the XNOR inverts with high confidence. This module pins, in ONE
 * place, exactly what `in_favor`/`opposed` mean per issue, and BOTH consumers import
 * it (the tagger via `renderTaggerPoleBlock`, the live theme-resolver via
 * `renderResolverPoleDirections`) so they cannot drift.
 *
 * SOURCE OF TRUTH IS THE PROSE. `POLE_VOCABULARY.md` is the human-readable rationale
 * (means-traps, cross-issue routing, omnibus rules). This module mirrors its
 * directional facts. When you edit the prose, mirror the change here and bump
 * `POLE_VOCABULARY_VERSION`. `poleVocabulary.test.ts` fails if the two drift on the
 * issue set or any `axis_type`.
 *
 * INTERFACE-PRESERVING: the enum stays `in_favor | opposed`; nothing about
 * `computeVoteAlignment`, the DB schema, or the UI changes. Only the *meaning* the
 * two prompts attach to the enum becomes pinned and shared.
 */

export type AxisType = "contested" | "valence_dominant";
export type Pole = "in_favor" | "opposed";

export interface PoleDefinition {
  /** Short pole name, e.g. "Gun access / rights". */
  name: string;
  /** Plain-language definition of what advancing this pole means. */
  definition: string;
  /** Provisions whose YEA advances this pole (the prose `bill_signals`). */
  billSignals: string[];
}

/** A kitchen-table concern → which pole it resolves to. `null` = value-only
 *  (no side; a contested issue must disambiguate it). */
export interface ExampleConcern {
  text: string;
  pole: Pole | null;
}

export interface DisambiguationOption {
  label: string;
  pole: Pole;
}

export interface Disambiguation {
  /** Neutral question that does not hint at a "right" answer. */
  question: string;
  /** Exactly two options, ordered [in_favor, opposed]. */
  options: [DisambiguationOption, DisambiguationOption];
}

export interface PoleVocabularyEntry {
  axisType: AxisType;
  /** Pole A ≡ in_favor. */
  in_favor: PoleDefinition;
  /** Pole B ≡ opposed. */
  opposed: PoleDefinition;
  exampleConcerns: ExampleConcern[];
  /** Required iff `axisType === "contested"`; absent for valence_dominant. */
  disambiguation?: Disambiguation;
  /** Optional means-trap / cross-issue / omnibus note for the tagger prompt. */
  notes?: string;
}

/**
 * Version stamp (SHARED_ANCHOR_SPEC §6). Rendered into both consumers' prompts so
 * a tagger/resolver mismatch is detectable. Bump on ANY pole/axis change.
 */
export const POLE_VOCABULARY_VERSION = "pole-vocab-v1";

/**
 * Cross-cutting tagger rules — global, not per-issue. Exported as one constant so
 * the renderer and the drift test reference the same strings.
 */
export const CROSS_CUTTING_TAGGER_RULES = [
  "FALL-THROUGH = NO-SCORE: a bill matching neither pole (procedural, administrative, out-of-scope) must NOT default to a pole — return no tag for that issue. Never let an untaggable bill resolve to in_favor.",
  "OMNIBUS / BUNDLED: when one bill advances BOTH poles, tag by the dominant provision; if genuinely co-equal, return no tag and defer the vote's meaning to curated context (CAN). The tendency read absorbs the residual.",
  "PER-(BILL, ISSUE): stance_lens is stored per (bill, issue) pair — the same bill can carry opposite orientations under two overlapping issues (border-wall funding = opposed under immigration, in_favor under border_security). Both are correct.",
] as const;

/**
 * The 16 canonical issues with pinned poles. Mirrors docs/alignment/POLE_VOCABULARY.md.
 * Keys MUST match src/lib/canonicalIssues.ts exactly (enforced by the drift test).
 */
export const POLE_VOCABULARY: Record<string, PoleVocabularyEntry> = {
  gun_rights_safety: {
    axisType: "contested",
    in_favor: {
      name: "Gun access / rights",
      definition:
        "protect or expand the right to own and carry firearms; remove or block restrictions.",
      billSignals: [
        "national concealed-carry reciprocity",
        "repealing waiting periods",
        "blocking new bans",
        "protecting private/unlicensed sales",
        "suppressor deregulation (Hearing Protection Act)",
        "arming teachers / school staff",
        "campus-carry expansion",
      ],
    },
    opposed: {
      name: "Gun regulation / safety",
      definition: "tighten access to firearms to reduce gun violence.",
      billSignals: [
        "universal background checks",
        "assault-weapon or high-capacity magazine bans",
        "red-flag / ERPO laws",
        "waiting periods",
        "raising the purchase age",
      ],
    },
    exampleConcerns: [
      { text: "protect my Second Amendment rights", pole: "in_favor" },
      {
        text: "I'm scared of school shootings / fewer guns on the street",
        pole: "opposed",
      },
      { text: "I care about guns", pole: null },
    ],
    disambiguation: {
      question:
        "On guns, are you more focused on protecting access to firearms, or on tightening gun laws?",
      options: [
        { label: "Protect access", pole: "in_favor" },
        { label: "Tighten gun laws", pole: "opposed" },
      ],
    },
    notes:
      "Orientation: rights = in_favor (Pole A = expand the nominal subject, firearms). Omnibus crime bills often bundle gun provisions — defer the vote's meaning to curated context (CAN) where it exists; the tendency read absorbs the rest.",
  },

  healthcare_affordability: {
    axisType: "valence_dominant",
    in_favor: {
      name: "Expand coverage & cap costs (government action)",
      definition: "government expands coverage, caps prices, funds subsidies.",
      billSignals: [
        "insulin / drug price caps",
        "Medicare drug-price negotiation",
        "ACA subsidy expansion",
        "Medicaid expansion",
        "surprise-billing protections",
      ],
    },
    opposed: {
      name: "Market-based / limit government role",
      definition:
        "reduce government mandates and spending; rely on market competition.",
      billSignals: [
        "ACA repeal",
        "block-granting Medicaid",
        "HSA expansion",
        "repealing the IRA drug-negotiation provisions",
        "association health plans",
      ],
    },
    exampleConcerns: [
      { text: "my mom's insulin costs are insane", pole: "in_favor" },
      { text: "I can't afford my premiums", pole: "in_favor" },
      {
        text: "government shouldn't run healthcare / fewer mandates",
        pole: "opposed",
      },
    ],
    notes:
      "Means-trap — a Nay on a specific mechanism must surface as 'voted against this particular mechanism' with the rationale visible, never a bare 'against.' Valence-dominant ⇒ no forced question, but an explicitly anti-government concern resolves to Pole B. Tiebreak: tag by primary operative mechanism — a bill whose core act is a tax cut/repeal that reduces the government's fiscal role (medical-device-tax repeal, mandate-penalty repeal, HSA expansion) is opposed even when marketed as cost relief. This does NOT capture refundable subsidies like ACA premium credits, which expand the government role → in_favor.",
  },

  housing_affordability: {
    axisType: "valence_dominant",
    in_favor: {
      name: "Expand affordability / supply / tenant support",
      definition: "actions that aim to lower housing cost or expand access.",
      billSignals: [
        "housing subsidies / vouchers",
        "affordable-housing funding",
        "zoning/permitting reform to build more",
        "first-time buyer support",
        "tenant protections",
      ],
    },
    opposed: {
      name: "Cut housing programs / reduce government role",
      definition: "reduce housing subsidies or federal housing involvement.",
      billSignals: [
        "cutting HUD / voucher funding",
        "repealing affordability mandates",
      ],
    },
    exampleConcerns: [
      { text: "rent keeps going up", pole: "in_favor" },
      { text: "I'll never afford a house", pole: "in_favor" },
    ],
    notes:
      "Hardest valence case. Within Pole A two opposing means both claim to lower rent — tenant protections / rent control vs build-more / deregulate zoning; the binary captures the outcome (lower cost) not the means split. Mixed-bill tiebreak: a bill with BOTH a Pole-A signal (supply/tenant/subsidy) AND a Pole-B signal (cut HUD/voucher funding) → the funding cut dominates → opposed; zoning/permitting preemption alone (no funding cut) stays in_favor. Tag rent control by nominal intent (lower cost → in_favor), never by disputed economic effect.",
  },

  immigration: {
    axisType: "contested",
    in_favor: {
      name: "Welcoming / expand legal immigration & protections",
      definition: "expand legal pathways and protections for immigrants.",
      billSignals: [
        "path to citizenship",
        "DACA / TPS codification",
        "raising refugee or visa caps",
        "in-state tuition",
        "protections against removal",
      ],
    },
    opposed: {
      name: "Restrictive / enforcement-first",
      definition: "reduce immigration and increase enforcement / removal.",
      billSignals: [
        "border-wall funding",
        "mandatory E-Verify",
        "asylum limits",
        "increased ICE / detention funding",
        "Remain-in-Mexico-style policies",
        "lowering refugee/visa caps",
        "cutting family or diversity visa categories",
      ],
    },
    exampleConcerns: [
      {
        text: "protect the dreamers / immigrants strengthen our community",
        pole: "in_favor",
      },
      {
        text: "secure the border / too many people coming illegally",
        pole: "opposed",
      },
      { text: "I care about immigration", pole: null },
    ],
    disambiguation: {
      question:
        "On immigration, are you more focused on expanding legal pathways and protections, or on tightening enforcement and border security?",
      options: [
        { label: "Expand pathways", pole: "in_favor" },
        { label: "Tighten enforcement", pole: "opposed" },
      ],
    },
    notes:
      "Overlaps the separate border_security issue — a concern specifically about border enforcement maps better to border_security (where enforcement is Pole A); immigration is the broad axis. Cross-tag bills that genuinely touch both, with the orientation fixed independently per issue.",
  },

  border_security: {
    axisType: "contested",
    in_favor: {
      name: "Strengthen border enforcement",
      definition: "increase physical/personnel border security and deterrence.",
      billSignals: [
        "border-wall funding",
        "more Border Patrol agents",
        "detention capacity",
        "asylum restrictions at the border",
        "rapid-expulsion measures",
      ],
    },
    opposed: {
      name: "Limit enforcement / humane & legal-pathway approach",
      definition:
        "de-emphasize hardline enforcement; prioritize processing and asylum access.",
      billSignals: [
        "cutting wall funding",
        "alternatives to detention",
        "expanding asylum processing",
        "ending family separation",
      ],
    },
    exampleConcerns: [
      { text: "secure the border / stop illegal crossings", pole: "in_favor" },
      {
        text: "treat asylum seekers humanely / stop caging kids",
        pole: "opposed",
      },
      { text: "I care about the border", pole: null },
    ],
    disambiguation: {
      question:
        "On the border, are you more focused on strengthening border enforcement, or on expanding processing and legal pathways?",
      options: [
        { label: "Strengthen enforcement", pole: "in_favor" },
        { label: "Humane processing", pole: "opposed" },
      ],
    },
    notes:
      "Tightly overlaps immigration; border_security is enforcement-centric, immigration is the broad axis. Orientations fixed independently per issue.",
  },

  economy_jobs: {
    axisType: "contested",
    in_favor: {
      name: "Public investment & worker protections",
      definition:
        "government spending/programs and labor protections to create jobs and raise wages.",
      billSignals: [
        "infrastructure spending",
        "jobs programs",
        "minimum-wage increases",
        "pro-union (e.g. PRO Act)",
        "expanded unemployment",
      ],
    },
    opposed: {
      name: "Deregulation & lower taxes (market-led growth)",
      definition: "reduce taxes/regulation to spur private growth.",
      billSignals: [
        "corporate/income tax cuts",
        "deregulation",
        "right-to-work",
        "spending cuts",
      ],
    },
    exampleConcerns: [
      { text: "can't find a good-paying job / wages are too low", pole: null },
      {
        text: "taxes and regulations are killing small business",
        pole: "opposed",
      },
      { text: "invest in workers / raise the minimum wage", pole: "in_favor" },
    ],
    disambiguation: {
      question:
        "On the economy, are you more focused on public investment and worker protections to create jobs, or on lower taxes and fewer regulations to spur private growth?",
      options: [
        { label: "Public investment", pole: "in_favor" },
        { label: "Lower taxes & deregulation", pole: "opposed" },
      ],
    },
    notes:
      "The means ARE the poles here; the split is ~50/50 and party-correlated, and outcome-only phrasing ('more jobs') does not reveal side — so the disambiguation gate is required.",
  },

  education_funding: {
    axisType: "contested",
    in_favor: {
      name: "Increase public-education funding & access",
      definition: "increase funding for and access to public education.",
      billSignals: [
        "public-school funding increases",
        "Title I",
        "student-loan relief",
        "universal pre-K",
        "teacher pay",
      ],
    },
    opposed: {
      name: "School choice / limit federal spending",
      definition: "expand school choice and limit federal education spending.",
      billSignals: [
        "voucher / ESA programs",
        "cutting the Dept. of Education",
        "block grants",
        "opposing loan forgiveness",
      ],
    },
    exampleConcerns: [
      {
        text: "schools are underfunded / teachers deserve better pay",
        pole: "in_favor",
      },
      {
        text: "my kid's school is failing, I want options / school choice",
        pole: "opposed",
      },
      { text: "I care about my kid's education", pole: null },
    ],
    disambiguation: {
      question:
        "On education, are you more focused on increasing funding for public schools, or on expanding school choice like vouchers and charters?",
      options: [
        { label: "Fund public schools", pole: "in_favor" },
        { label: "Expand school choice", pole: "opposed" },
      ],
    },
    notes:
      "Charter bills straddle (public funding + choice mechanism) — tag by the dominant mechanism: new choice/voucher authority → opposed; pure public-school funding → in_favor.",
  },

  public_safety: {
    axisType: "contested",
    in_favor: {
      name: "Policing / enforcement capacity",
      definition:
        "expand policing and enforcement capacity. Subject is policing/enforcement, NOT the 'safety' outcome (see means-trap note).",
      billSignals: [
        "police funding increases",
        "tougher enforcement powers",
        "qualified-immunity protection",
      ],
    },
    opposed: {
      name: "Reform & prevention",
      definition: "police reform and prevention through community investment.",
      billSignals: [
        "police accountability",
        "ending qualified immunity",
        "diversion / community-investment programs",
      ],
    },
    exampleConcerns: [
      { text: "I don't feel safe walking home", pole: null },
      { text: "fund the police", pole: "in_favor" },
      { text: "stop police violence / accountability", pole: "opposed" },
    ],
    disambiguation: {
      question:
        "On public safety, are you more focused on stronger policing and enforcement, or on reform and prevention through community investment?",
      options: [
        { label: "Stronger policing", pole: "in_favor" },
        { label: "Reform & prevention", pole: "opposed" },
      ],
    },
    notes:
      "Means-trap: funding crime prevention / community-investment programs advances Pole B (opposed), NOT Pole A, even though it 'funds public safety.' Boundary with crime_public_safety (distinct axis): public_safety = policing / use-of-force (police funding, enforcement powers, qualified immunity, accountability); crime_public_safety = sentencing / charging / incarceration. Do NOT cross-tag the same provision under both; route a use-of-force concern → public_safety, a sentencing/incarceration concern → crime_public_safety.",
  },

  crime_public_safety: {
    axisType: "contested",
    in_favor: {
      name: "Tough-on-crime / enforcement",
      definition:
        "tougher charging, sentencing, and incarceration to deter crime.",
      billSignals: [
        "mandatory minimums",
        "more police",
        "cash-bail retention",
        "tougher penalties",
      ],
    },
    opposed: {
      name: "Criminal-justice reform",
      definition: "reform sentencing, charging, and incarceration.",
      billSignals: [
        "bail reform",
        "sentencing reform",
        "decriminalization",
        "reentry programs",
      ],
    },
    exampleConcerns: [
      { text: "crime is out of control", pole: "in_favor" },
      {
        text: "mass incarceration is wrong / reform the system",
        pole: "opposed",
      },
      { text: "I care about crime", pole: null },
    ],
    disambiguation: {
      question:
        "On crime, are you more focused on tougher enforcement and penalties, or on reforming the justice system?",
      options: [
        { label: "Tougher enforcement", pole: "in_favor" },
        { label: "Justice reform", pole: "opposed" },
      ],
    },
    notes:
      "Boundary with public_safety (distinct sub-domains): crime_public_safety = sentencing / charging / incarceration; public_safety = policing / use-of-force. Do NOT cross-tag the same provision under both. Means note: reform / reentry bills are Pole B even though they aim to reduce crime. Omnibus crime bills bundling Pole-A minimums with Pole-B reentry → tag by dominant provision; defer to curated context (CAN) where co-equal.",
  },

  property_taxes: {
    axisType: "contested",
    in_favor: {
      name: "Lower / cap property taxes",
      definition: "lower or cap property taxes paid by owners.",
      billSignals: [
        "property-tax caps",
        "homestead exemptions",
        "rollbacks",
        "assessment limits",
      ],
    },
    opposed: {
      name: "Maintain tax base for services",
      definition:
        "maintain or raise the property-tax base to fund schools and services.",
      billSignals: [
        "opposing caps",
        "raising rates/assessments to fund schools/services",
      ],
    },
    exampleConcerns: [
      { text: "my property taxes are crushing me", pole: "in_favor" },
      { text: "we need to fund our schools and services", pole: "opposed" },
      { text: "property taxes are a big issue for me", pole: null },
    ],
    disambiguation: {
      question:
        "On property taxes, are you more focused on lowering or capping what you pay, or on keeping funding for schools and local services?",
      options: [
        { label: "Lower my taxes", pole: "in_favor" },
        { label: "Fund schools & services", pole: "opposed" },
      ],
    },
    notes:
      "A genuine opposite-outcome contest (not a means-trap) — the disambiguation gate is required. School levy & bond elections run ~50/50.",
  },

  water_infrastructure: {
    axisType: "valence_dominant",
    in_favor: {
      name: "Fund / strengthen water infrastructure & standards",
      definition:
        "fund and strengthen water infrastructure and enforceable quality standards.",
      billSignals: [
        "water-infrastructure funding",
        "lead-pipe replacement",
        "drought/flood resilience",
        "dam/reservoir investment",
        "enforceable water-quality / contaminant standards (PFAS, lead) — strengthening → in_favor, rollback → opposed",
      ],
    },
    opposed: {
      name: "Limit federal spending / local-only",
      definition: "limit federal water spending; leave it to local government.",
      billSignals: [
        "cutting infrastructure funds",
        "opposing federal water programs",
      ],
    },
    exampleConcerns: [
      {
        text: "our water isn't safe / we keep flooding or running dry",
        pole: "in_favor",
      },
    ],
    notes:
      "Strongly valence — near-universal support for clean, reliable water; Pole B is essentially 'don't spend federal money.' No forced question.",
  },

  energy_grid: {
    axisType: "contested",
    in_favor: {
      name: "Expand fossil / conventional production",
      definition:
        "boost fossil & conventional energy production (oil, gas, coal) and the grid that carries it. Subject is fossil/conventional production, NOT 'energy' generically (see means-trap note).",
      billSignals: [
        "oil/gas leasing",
        "pipeline approvals",
        "LNG exports",
        "blocking emissions rules",
        "nuclear expansion (zero-emission but firm baseload → ruled Pole A)",
      ],
    },
    opposed: {
      name: "Clean-energy transition / restrict fossil",
      definition: "shift to renewables and cut emissions.",
      billSignals: [
        "renewable tax credits",
        "emissions limits",
        "blocking new fossil leases",
        "grid electrification",
      ],
    },
    exampleConcerns: [
      { text: "drill, baby, drill / energy independence", pole: "in_favor" },
      { text: "we need clean energy / fight climate change", pole: "opposed" },
      { text: "my electric bill is too high / blackouts", pole: null },
    ],
    disambiguation: {
      question:
        "On energy, are you more focused on expanding domestic production including oil and gas, or on shifting to clean energy and cutting emissions?",
      options: [
        { label: "Expand production", pole: "in_favor" },
        { label: "Clean transition", pole: "opposed" },
      ],
    },
    notes:
      "Means-trap: funding / expanding CLEAN energy (renewables, electrification) advances Pole B (opposed), NOT Pole A — do not tag in_favor merely because a bill 'funds energy.' Mixed-bill tiebreak: 'all-of-the-above'/IRA-style bills fund both → tag by dominant provision; if co-equal, no-score + defer to curated context (CAN). Rulings: nuclear → Pole A (firm conventional baseload); carbon-capture (CCS) → Pole A (extends fossil-plant life). Overlaps environment_climate — orientation fixed INDEPENDENTLY per issue; route cost/reliability/source → energy_grid, emissions/nature/climate → environment_climate; NEVER score a stance resolved under one issue against a bill lens tagged under the other.",
  },

  reproductive_rights: {
    axisType: "contested",
    in_favor: {
      name: "Protect / expand access",
      definition: "protect or expand access to abortion and reproductive care.",
      billSignals: [
        "codifying Roe",
        "protecting clinic access",
        "funding reproductive care",
        "protecting contraception / IVF",
      ],
    },
    opposed: {
      name: "Restrict reproductive access",
      definition: "restrict access to abortion and reproductive care.",
      billSignals: [
        "abortion bans/limits",
        "defunding providers",
        "fetal-personhood",
        "restricting medication abortion",
        "contraception-coverage restrictions / Title X gag rule",
        "IVF restrictions or personhood measures affecting IVF",
        "defunding family planning",
      ],
    },
    exampleConcerns: [
      { text: "protect a woman's right to choose", pole: "in_favor" },
      { text: "I'm pro-life / protect the unborn", pole: "opposed" },
      { text: "reproductive rights", pole: null },
    ],
    disambiguation: {
      question:
        "On reproductive policy, are you more focused on protecting access to abortion and contraception, or on restricting it?",
      options: [
        { label: "Protect access", pole: "in_favor" },
        { label: "Restrict access", pole: "opposed" },
      ],
    },
    notes:
      "Canonical 'same phrase, opposite meanings' case ('reproductive rights' is used both ways). Neutral phrasing is essential. Pole B is scoped to reproductive ACCESS broadly (incl. contraception/IVF/Title-X/family-planning), not just abortion, so a contraception restriction cannot fall into Pole A and invert.",
  },

  environment_climate: {
    axisType: "contested",
    in_favor: {
      name: "Climate action / environmental protection",
      definition:
        "stronger government action to cut emissions and protect natural areas.",
      billSignals: [
        "emissions limits",
        "clean-energy incentives",
        "conservation / public-lands protection",
        "EPA authority",
      ],
    },
    opposed: {
      name: "Deregulation / limit climate mandates",
      definition: "roll back climate regulation and mandates.",
      billSignals: [
        "rolling back EPA rules",
        "opening public lands to drilling",
        "blocking climate spending",
      ],
    },
    exampleConcerns: [
      { text: "we have to act on climate change", pole: "in_favor" },
      { text: "climate regulations kill jobs / overreach", pole: "opposed" },
      { text: "I care about the environment", pole: null },
    ],
    disambiguation: {
      question:
        "On the environment, are you more focused on stronger government action to cut emissions and protect natural areas, or on reducing regulations to lower costs and support energy and business growth?",
      options: [
        { label: "Stronger action", pole: "in_favor" },
        { label: "Limit regulations", pole: "opposed" },
      ],
    },
    notes:
      "Rulings: permitting / NEPA reform → judge by dominant effect (fast-tracks fossil → Pole B; fast-tracks clean transmission → Pole A; co-equal → no-score + curated context); carbon-capture → Pole A. Mixed bills → dominant provision. Overlaps energy_grid — orientation fixed INDEPENDENTLY per issue; route emissions/nature/climate → environment_climate, cost/reliability/source → energy_grid; NEVER score a stance resolved under one issue against a bill lens tagged under the other. Most 'environment' concerns lean Pole A.",
  },

  election_integrity: {
    axisType: "contested",
    in_favor: {
      name: "Voting access / expand participation",
      definition:
        "expand ballot access and participation. Subject = ballot ACCESS; the 'integrity' frame in the id does NOT set direction.",
      billSignals: [
        "automatic / same-day registration",
        "mail-voting expansion",
        "restoring the Voting Rights Act",
        "early voting",
      ],
    },
    opposed: {
      name: "Voting restrictions / security-first",
      definition: "tighten voting rules and restrict access.",
      billSignals: [
        "voter-ID requirements",
        "voter-roll purges",
        "limiting mail / drop boxes",
        "restricting early voting",
      ],
    },
    exampleConcerns: [
      {
        text: "make it easier to vote / stop voter suppression",
        pole: "in_favor",
      },
      {
        text: "we need voter ID / secure elections / stop fraud",
        pole: "opposed",
      },
      { text: "election integrity", pole: null },
    ],
    disambiguation: {
      question:
        "On elections, are you more focused on expanding access and making voting easier, or on tightening rules like ID requirements to prevent fraud?",
      options: [
        { label: "Expand access", pole: "in_favor" },
        { label: "Tighten rules", pole: "opposed" },
      ],
    },
    notes:
      "ORIENTATION LOCK (high inversion risk). Subject = ballot access / the franchise. The word 'integrity' in the id is a partisan frame and does NOT set direction. Any provision that restricts voter access (voter-ID, roll purges, drop-box / mail limits) = opposed, regardless of the bill's title — even a bill literally named 'Election Integrity Act.' Fall-through: a bill that neither expands nor restricts voter access (redistricting, ECRA / certification, campaign-finance disclosure, audits) = no-score, never default to a pole.",
  },

  congressional_accountability: {
    axisType: "valence_dominant",
    in_favor: {
      name: "Stronger ethics & accountability",
      definition:
        "stronger congressional ethics, transparency, and accountability.",
      billSignals: [
        "congressional stock-trading bans",
        "transparency / disclosure",
        "closing the lobbying revolving door",
      ],
    },
    opposed: {
      name: "Status quo / weaker rules",
      definition: "maintain the status quo or weaker accountability rules.",
      billSignals: [
        "voting against stock-trading bans",
        "opposing transparency measures",
      ],
    },
    exampleConcerns: [
      { text: "members of Congress shouldn't trade stocks", pole: "in_favor" },
      {
        text: "politicians are corrupt / more transparency in Congress",
        pole: "in_favor",
      },
    ],
    notes:
      "Overwhelming consensus on Pole A — the canonical Polis 'bridge statement' theme. Rare opposed constituency; no forced question. Scope (halo-label guard): restrict to consensus ethics/transparency. EXCLUDE (a) term limits — a contested governance mechanism, not consensus accountability; (b) partisan single-target oversight / investigation bills — do NOT cross-tag these into this issue and auto-resolve them to Pole A.",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getPoleEntry(issue: string): PoleVocabularyEntry | undefined {
  return POLE_VOCABULARY[issue];
}

export function isContested(issue: string): boolean {
  return POLE_VOCABULARY[issue]?.axisType === "contested";
}

// ---------------------------------------------------------------------------
// Renderers — pure string builders consumed by the two prompts.
// ---------------------------------------------------------------------------

/**
 * Full per-issue pole block for the bill TAGGER's system prompt: names +
 * definitions + bill_signals, plus the cross-cutting tagger rules. Verbose is
 * fine — the tagger system prompt is cached across the run.
 */
export function renderTaggerPoleBlock(): string {
  const issues = Object.entries(POLE_VOCABULARY)
    .map(([id, e]) => {
      const a = `    in_favor (Pole A) = ${e.in_favor.name}: ${e.in_favor.definition}\n      bill_signals: ${e.in_favor.billSignals.join("; ")}`;
      const b = `    opposed (Pole B) = ${e.opposed.name}: ${e.opposed.definition}\n      bill_signals: ${e.opposed.billSignals.join("; ")}`;
      const note = e.notes ? `\n    note: ${e.notes}` : "";
      return `  ${id} [${e.axisType}]:\n${a}\n${b}${note}`;
    })
    .join("\n\n");

  return `POLE DEFINITIONS (pole-vocab ${POLE_VOCABULARY_VERSION}) — for each issue, "stance_lens" answers: does voting YEA advance Pole A (in_favor) or Pole B (opposed)?

${issues}

CROSS-CUTTING RULES:
- ${CROSS_CUTTING_TAGGER_RULES.join("\n- ")}`;
}

/**
 * Concise per-issue pole directions for the live concern-RESOLVER (the theme
 * builders). One line per issue, no bill_signals (those are tagger-only), so the
 * prompt stays within its length budget. Pins the meaning of in_favor/opposed so
 * an explicit concern maps to the same pole the tagger scored bills against.
 */
export function renderResolverPoleDirections(): string {
  const lines = Object.entries(POLE_VOCABULARY)
    .map(
      ([id, e]) =>
        `  ${id} [${e.axisType}] — in_favor=${e.in_favor.name}; opposed=${e.opposed.name}`,
    )
    .join("\n");

  return `POLE DIRECTIONS (pole-vocab ${POLE_VOCABULARY_VERSION}) — when you set "stance", in_favor/opposed mean these FIXED per-issue sides, NOT "good vs bad". Match the voter's words to the side that fits; if their words don't pick a side, omit "stance".
${lines}`;
}
