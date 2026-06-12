/**
 * src/lib/issuePacRules.ts
 *
 * Pure-FEC issue-PAC classification rules — the single source of truth for
 * named issue-PAC editorial content (display name, full name, advocates blurb,
 * stance, canonical issue).
 *
 * Lives in src/lib (not scripts/ingest) because BOTH the ingest pipeline
 * (scripts/ingest/federal-issue-pacs.ts, via the _pac-issue-mapping.ts shim)
 * AND the render/assembly layer (src/lib/server/race-data.ts) need it. The
 * render layer recovers a PAC's display fields from the ruleName embedded in
 * the donor-bucket label, so cards stay in sync with this mapping even when a
 * DB row predates the metadata.
 *
 * Rules are intentionally conservative. They only map committees whose public
 * agenda fits the existing canonical issue vocabulary; high-salience PAC axes
 * that do not exist yet (for example Israel policy and digital assets) are left
 * unclassified here until the issue vocabulary grows.
 */

import { CANONICAL_ISSUE_LABELS } from "./canonicalIssues";

/** Donor-bucket label for an issue-aligned PAC cluster. */
export type IssuePacLabel = `Issue-aligned PACs — ${string}`;

export type IssuePacStance = "in_favor" | "opposed" | "mixed";

export interface IssuePacClassification {
  canonicalIssue: string;
  stance: IssuePacStance;
  ruleName: string;
  /** Short label shown in the named-PAC row (e.g. "PhRMA & Hospital PACs"). */
  displayName: string;
  /** Full formal name of the lead organization, when different from displayName. */
  fullName?: string;
  /** Plain-English description of what this PAC cluster advocates. */
  advocates?: string;
}

type PacIssueRule = {
  /** RegExp matches committee names; string matches exact FEC committee IDs. */
  match: RegExp | string;
  canonicalIssue: string;
  stance: IssuePacStance;
  name: string;
  /** Short label shown in the named-PAC row. */
  displayName: string;
  /** Full formal name, when different from displayName. */
  fullName?: string;
  /** Plain-English description of what this PAC cluster advocates. */
  advocates?: string;
};

export const ISSUE_PAC_LABEL_PREFIX = "Issue-aligned PACs — ";

const VALID_CANONICAL_ISSUES = new Set(Object.keys(CANONICAL_ISSUE_LABELS));

const PAC_ISSUE_RULES: PacIssueRule[] = [
  // High-confidence exact FEC committee IDs.
  {
    match: "C00193433",
    canonicalIssue: "reproductive_rights",
    stance: "in_favor",
    name: "emilys-list-fec-id",
    displayName: "EMILY's List",
    fullName: "Early Money Is Like Yeast",
    advocates: "Funds Democratic women candidates who support reproductive rights.",
  },
  {
    match: "C00053553",
    canonicalIssue: "gun_rights_safety",
    stance: "in_favor",
    name: "nra-pvf-fec-id",
    displayName: "NRA Political Victory Fund",
    fullName: "National Rifle Association Political Victory Fund",
    advocates: "Elects candidates who oppose firearm restrictions.",
  },

  // Reproductive rights.
  {
    match:
      /\b(emily'?s\s+list|planned\s+parenthood|naral|reproductive\s+freedom\s+for\s+all|women\s+vote)\b/iu,
    canonicalIssue: "reproductive_rights",
    stance: "in_favor",
    name: "reproductive-rights-access",
    displayName: "Reproductive Rights PACs",
    advocates: "Support abortion access and reproductive healthcare funding.",
  },
  {
    match:
      /\b(susan\s+b\.?\s+anthony|sba\s+pro[- ]life|national\s+right\s+to\s+life|right\s+to\s+life|pro[- ]life\s+america)\b/iu,
    canonicalIssue: "reproductive_rights",
    stance: "opposed",
    name: "reproductive-rights-restriction",
    displayName: "Anti-Abortion PACs",
    advocates: "Oppose abortion access; support state and federal restrictions.",
  },
  // Gun rights and safety. The current pole map treats in_favor as gun access.
  {
    match:
      /\b(nra|national\s+rifle\s+association|gun\s+owners\s+of\s+america|second\s+amendment|firearms?\s+policy|safari\s+club)\b/iu,
    canonicalIssue: "gun_rights_safety",
    stance: "in_favor",
    name: "gun-access",
    displayName: "Gun Rights PACs",
    advocates: "Oppose most firearm regulations; support gun ownership rights.",
  },
  {
    match:
      /\b(everytown|giffords|brady\s+(pac|campaign)|moms\s+demand\s+action|gun\s+safety)\b/iu,
    canonicalIssue: "gun_rights_safety",
    stance: "opposed",
    name: "gun-safety-regulation",
    displayName: "Gun Safety PACs",
    advocates: "Support background checks, red flag laws, and assault weapon restrictions.",
  },
  // Climate/environment and energy.
  {
    match:
      /\b(league\s+of\s+conservation\s+voters|lcv\s+(action|victory)|sierra\s+club|climate\s+hawks|environment\s+america|natural\s+resources\s+defense)\b/iu,
    canonicalIssue: "environment_climate",
    stance: "in_favor",
    name: "environment-climate",
    displayName: "Conservation & Climate PACs",
    advocates: "Support climate legislation, clean energy, and environmental protections.",
  },
  {
    match:
      /\b(american\s+petroleum\s+institute|api\s+pac|independent\s+petroleum|oil\s+and\s+gas|natural\s+gas\s+pac|coal\s+pac)\b/iu,
    canonicalIssue: "energy_grid",
    stance: "in_favor",
    name: "fossil-energy",
    displayName: "Oil & Gas Industry PACs",
    advocates: "Represent fossil fuel producers; often oppose climate regulations and clean energy mandates.",
  },

  // Healthcare affordability — industry PACs opposing price controls / negotiation.
  // Covers: PhRMA, big pharma companies (Eli Lilly, Pfizer, J&J, AbbVie,
  // Merck, Amgen, Bristol-Myers Squibb), health insurers (BCBS, UnitedHealth,
  // Aetna, Cigna), hospital associations, and biotech lobbies.
  {
    match:
      /\b(phrma|pharmaceutical\s+research|biotechnology\s+innovation|american\s+hospital\s+association|aha\s+pac|health\s+insurance\s+pac)\b/iu,
    canonicalIssue: "healthcare_affordability",
    stance: "opposed",
    name: "healthcare-industry-pricing",
    displayName: "PhRMA & Hospital PACs",
    fullName: "Pharmaceutical Research and Manufacturers of America (PhRMA) and allied health industry PACs",
    advocates: "Represent pharmaceutical and hospital industries; oppose drug price controls and Medicare negotiation.",
  },
  {
    match:
      /\b(eli\s+lilly|lilly\s+pac|pfizer\s+pac|johnson\s+&\s+johnson|janssen\s+pac|abbvie\s+pac|merck\s+pac|amgen\s+pac|bristol[- ]myers\s+squibb|bms\s+pac)\b/iu,
    canonicalIssue: "healthcare_affordability",
    stance: "opposed",
    name: "pharma-company-pacs",
    displayName: "Pharma Company PACs",
    advocates: "Major pharmaceutical manufacturers opposing price-cap legislation targeting their products.",
  },
  {
    match:
      /\b(blue\s+cross\s+blue\s+shield|bcbs\s+pac|unitedhealth\s+pac|aetna\s+pac|cigna\s+pac|humana\s+pac|cvs\s+health\s+pac|express\s+scripts)\b/iu,
    canonicalIssue: "healthcare_affordability",
    stance: "opposed",
    name: "health-insurer-pacs",
    displayName: "Health Insurer PACs",
    advocates: "Health insurance industry opposing the public option and broad healthcare reform.",
  },

  // Education funding and school governance.
  {
    match:
      /\b(national\s+education\s+association|nea\s+fund|american\s+federation\s+of\s+teachers|aft\s+solidarity|education\s+votes)\b/iu,
    canonicalIssue: "education_funding",
    stance: "in_favor",
    name: "public-education-labor",
    displayName: "Teachers & Education PACs",
    advocates: "Favor public school funding, teacher pay, and union organizing rights.",
  },
  {
    match:
      /\b(school\s+choice|charter\s+schools?\s+action|american\s+federation\s+for\s+children|edchoice)\b/iu,
    canonicalIssue: "education_funding",
    stance: "opposed",
    name: "school-choice",
    displayName: "School Choice PACs",
    advocates: "Favor charter schools, vouchers, and alternatives to public school funding.",
  },

  // Public safety / law enforcement.
  {
    match:
      /\b(fraternal\s+order\s+of\s+police|fop\s+pac|police\s+benevolent|sheriffs?\s+association|law\s+enforcement\s+alliance|fire\s+fighters?|iaff)\b/iu,
    canonicalIssue: "public_safety",
    stance: "in_favor",
    name: "public-safety-unions",
    displayName: "Police & Firefighter PACs",
    advocates: "Represent law enforcement and fire unions; favor public safety funding and personnel.",
  },

  // Labor/economy and anti-labor economic groups.
  {
    match:
      /\b(afl[- ]cio|seiu|afscme|teamsters|uaw|unite\s+here|laborers'?|ibew|communications\s+workers|working\s+families)\b/iu,
    canonicalIssue: "economy_jobs",
    stance: "in_favor",
    name: "labor-economy",
    displayName: "Labor Union PACs",
    advocates: "Favor worker rights, minimum wage increases, and union organizing.",
  },
  {
    match:
      /\b(club\s+for\s+growth|u\.?s\.?\s+chamber\s+of\s+commerce|americans\s+for\s+prosperity|freedomworks)\b/iu,
    canonicalIssue: "economy_jobs",
    stance: "opposed",
    name: "anti-labor-tax-cut-economy",
    displayName: "Business & Anti-Union PACs",
    advocates: "Favor deregulation, tax cuts, and oppose union organizing.",
  },
];

for (const rule of PAC_ISSUE_RULES) {
  if (!VALID_CANONICAL_ISSUES.has(rule.canonicalIssue)) {
    throw new Error(
      `issuePacRules has invalid canonical issue: ${rule.canonicalIssue}`,
    );
  }
}

/** ruleName → editorial classification, built once from the rules above. */
const RULE_BY_NAME: Map<string, IssuePacClassification> = new Map(
  PAC_ISSUE_RULES.map((rule) => [
    rule.name,
    {
      canonicalIssue: rule.canonicalIssue,
      stance: rule.stance,
      ruleName: rule.name,
      displayName: rule.displayName,
      ...(rule.fullName ? { fullName: rule.fullName } : {}),
      ...(rule.advocates ? { advocates: rule.advocates } : {}),
    },
  ]),
);

export function classifyPacCommittee(
  committeeId: string,
  committeeName: string,
): IssuePacClassification | null {
  const normalizedId = committeeId.trim().toUpperCase();
  const name = committeeName.trim();
  if (!normalizedId && !name) return null;

  for (const rule of PAC_ISSUE_RULES) {
    const matched =
      typeof rule.match === "string"
        ? normalizedId === rule.match
        : rule.match.test(name);
    if (!matched) continue;
    return {
      canonicalIssue: rule.canonicalIssue,
      stance: rule.stance,
      ruleName: rule.name,
      displayName: rule.displayName,
      ...(rule.fullName ? { fullName: rule.fullName } : {}),
      ...(rule.advocates ? { advocates: rule.advocates } : {}),
    };
  }

  // Extension point:
  // AIPAC / United Democracy Project and Fairshake-style crypto PACs are
  // deliberately not mapped until canonical issue axes such as
  // foreign_policy_israel or digital_assets exist. Keep their dollars in the
  // aggregate PACs bucket for now rather than inventing an unrelated issue.
  return null;
}

export function issuePacLabel(canonicalIssue: string): IssuePacLabel {
  if (!VALID_CANONICAL_ISSUES.has(canonicalIssue)) {
    throw new Error(
      `Invalid canonical issue for issue-PAC label: ${canonicalIssue}`,
    );
  }
  return `${ISSUE_PAC_LABEL_PREFIX}${canonicalIssue}`;
}

export function issueFromIssuePacLabel(label: string): string | null {
  if (!label.startsWith(ISSUE_PAC_LABEL_PREFIX)) return null;
  const rest = label.slice(ISSUE_PAC_LABEL_PREFIX.length).trim();
  // New format: "Issue-aligned PACs — <issue> — <ruleName>"; extract only the issue part.
  const issue = rest.includes(" — ") ? rest.split(" — ")[0]!.trim() : rest;
  return VALID_CANONICAL_ISSUES.has(issue) ? issue : null;
}

/**
 * Parse the ruleName (3rd " — " segment) from a donor-bucket label:
 * "Issue-aligned PACs — <issue> — <ruleName>" → "<ruleName>".
 * Returns null for the legacy 2-segment format (no ruleName) or non-PAC labels.
 */
export function ruleNameFromIssuePacLabel(label: string): string | null {
  if (!label.startsWith(ISSUE_PAC_LABEL_PREFIX)) return null;
  const rest = label.slice(ISSUE_PAC_LABEL_PREFIX.length);
  const parts = rest.split(" — ");
  if (parts.length < 2) return null;
  const ruleName = parts[parts.length - 1]!.trim();
  return ruleName || null;
}

/** Look up a rule's editorial classification (display fields, stance) by ruleName. */
export function issuePacDisplayFromRuleName(
  ruleName: string,
): IssuePacClassification | null {
  return RULE_BY_NAME.get(ruleName) ?? null;
}
