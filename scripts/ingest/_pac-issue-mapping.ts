/**
 * scripts/ingest/_pac-issue-mapping.ts
 *
 * Pure-FEC issue-PAC classification rules for federal-issue-pacs.ts.
 *
 * Rules are intentionally conservative. They only map committees whose public
 * agenda fits the existing canonical issue vocabulary; high-salience PAC axes
 * that do not exist yet (for example Israel policy and digital assets) are left
 * unclassified here until the issue vocabulary grows.
 */

import { CANONICAL_ISSUE_LABELS } from "../../src/lib/canonicalIssues";
import type { IssuePacLabel } from "./_bucket-mapping";

export type IssuePacStance = "in_favor" | "opposed" | "mixed";

export interface IssuePacClassification {
  canonicalIssue: string;
  stance: IssuePacStance;
  ruleName: string;
}

type PacIssueRule = {
  /** RegExp matches committee names; string matches exact FEC committee IDs. */
  match: RegExp | string;
  canonicalIssue: string;
  stance: IssuePacStance;
  name: string;
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
  },
  {
    match: "C00053553",
    canonicalIssue: "gun_rights_safety",
    stance: "in_favor",
    name: "nra-pvf-fec-id",
  },

  // Reproductive rights.
  {
    match:
      /\b(emily'?s\s+list|planned\s+parenthood|naral|reproductive\s+freedom\s+for\s+all|women\s+vote)\b/iu,
    canonicalIssue: "reproductive_rights",
    stance: "in_favor",
    name: "reproductive-rights-access",
  },
  {
    match:
      /\b(susan\s+b\.?\s+anthony|sba\s+pro[- ]life|national\s+right\s+to\s+life|right\s+to\s+life|pro[- ]life\s+america)\b/iu,
    canonicalIssue: "reproductive_rights",
    stance: "opposed",
    name: "reproductive-rights-restriction",
  },
  // Gun rights and safety. The current pole map treats in_favor as gun access.
  {
    match:
      /\b(nra|national\s+rifle\s+association|gun\s+owners\s+of\s+america|second\s+amendment|firearms?\s+policy|safari\s+club)\b/iu,
    canonicalIssue: "gun_rights_safety",
    stance: "in_favor",
    name: "gun-access",
  },
  {
    match:
      /\b(everytown|giffords|brady\s+(pac|campaign)|moms\s+demand\s+action|gun\s+safety)\b/iu,
    canonicalIssue: "gun_rights_safety",
    stance: "opposed",
    name: "gun-safety-regulation",
  },
  // Climate/environment and energy.
  {
    match:
      /\b(league\s+of\s+conservation\s+voters|lcv\s+(action|victory)|sierra\s+club|climate\s+hawks|environment\s+america|natural\s+resources\s+defense)\b/iu,
    canonicalIssue: "environment_climate",
    stance: "in_favor",
    name: "environment-climate",
  },
  {
    match:
      /\b(american\s+petroleum\s+institute|api\s+pac|independent\s+petroleum|oil\s+and\s+gas|natural\s+gas\s+pac|coal\s+pac)\b/iu,
    canonicalIssue: "energy_grid",
    stance: "in_favor",
    name: "fossil-energy",
  },

  // Healthcare affordability.
  {
    match:
      /\b(phrma|pharmaceutical\s+research|biotechnology\s+innovation|american\s+hospital\s+association|aha\s+pac|health\s+insurance\s+pac)\b/iu,
    canonicalIssue: "healthcare_affordability",
    stance: "opposed",
    name: "healthcare-industry-pricing",
  },

  // Education funding and school governance.
  {
    match:
      /\b(national\s+education\s+association|nea\s+fund|american\s+federation\s+of\s+teachers|aft\s+solidarity|education\s+votes)\b/iu,
    canonicalIssue: "education_funding",
    stance: "in_favor",
    name: "public-education-labor",
  },
  {
    match:
      /\b(school\s+choice|charter\s+schools?\s+action|american\s+federation\s+for\s+children|edchoice)\b/iu,
    canonicalIssue: "education_funding",
    stance: "opposed",
    name: "school-choice",
  },

  // Public safety / law enforcement.
  {
    match:
      /\b(fraternal\s+order\s+of\s+police|fop\s+pac|police\s+benevolent|sheriffs?\s+association|law\s+enforcement\s+alliance|fire\s+fighters?|iaff)\b/iu,
    canonicalIssue: "public_safety",
    stance: "in_favor",
    name: "public-safety-unions",
  },

  // Labor/economy and anti-labor economic groups.
  {
    match:
      /\b(afl[- ]cio|seiu|afscme|teamsters|uaw|unite\s+here|laborers'?|ibew|communications\s+workers|working\s+families)\b/iu,
    canonicalIssue: "economy_jobs",
    stance: "in_favor",
    name: "labor-economy",
  },
  {
    match:
      /\b(club\s+for\s+growth|u\.?s\.?\s+chamber\s+of\s+commerce|americans\s+for\s+prosperity|freedomworks)\b/iu,
    canonicalIssue: "economy_jobs",
    stance: "opposed",
    name: "anti-labor-tax-cut-economy",
  },
];

for (const rule of PAC_ISSUE_RULES) {
  if (!VALID_CANONICAL_ISSUES.has(rule.canonicalIssue)) {
    throw new Error(
      `_pac-issue-mapping has invalid canonical issue: ${rule.canonicalIssue}`,
    );
  }
}

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
  const issue = label.slice(ISSUE_PAC_LABEL_PREFIX.length).trim();
  return VALID_CANONICAL_ISSUES.has(issue) ? issue : null;
}
