/**
 * Sub-issue taxonomy — an OPTIONAL hierarchical layer beneath the 16 canonical
 * issues, piloted on `healthcare_affordability`. The machine-readable derivative
 * of `docs/alignment/SUB_ISSUE_VOCABULARY.md`.
 *
 * WHY THIS EXISTS:
 * A canonical issue like `healthcare_affordability` bundles distinct topics
 * (drug prices, coverage access, provider costs, …). A sub-issue is a TOPIC
 * FACET of an existing `(bill, issue)` tag — it lets scoring PREFER votes on the
 * facet the voter actually cares about and FALL BACK to the parent issue when
 * those are sparse, so a score is never worse than today.
 *
 * INHERITS THE PARENT POLE AXIS. A sub-issue introduces NO new direction: it
 * reuses the parent's `in_favor | opposed` poles verbatim (see
 * `poleVocabulary.ts`). It only narrows WHICH bills count. The tagger and the
 * live resolver both consume this module (the tagger via
 * `renderTaggerSubIssueBlock`, the resolver via `renderResolverSubIssues`) so
 * they cannot drift.
 *
 * SOURCE OF TRUTH IS THE PROSE. `SUB_ISSUE_VOCABULARY.md` is the human-readable
 * artifact; this module mirrors its facts. When you edit the prose, mirror the
 * change here and bump `SUB_ISSUE_VOCABULARY_VERSION`. `subIssues.test.ts` fails
 * if the two drift on the id set or any parent.
 *
 * Pure data + pure functions only; no DB, no IO.
 */

import { CANONICAL_ISSUE_LABELS } from "../canonicalIssues";

export interface SubIssueEntry {
  /** Stable id, unique across all parents. */
  id: string;
  /** Canonical issue id this facet hangs under (must be a CANONICAL_ISSUE_LABELS key). */
  parent: string;
  /** Short human-readable label. */
  label: string;
  /** One-line description for the live resolver prompt. */
  resolverDescription: string;
  /** Provisions/topics that route a bill into this facet (tagger-only). */
  billSignals: string[];
  /** Kitchen-table phrasings that map to this facet. */
  exampleConcerns: string[];
}

/**
 * Version stamp. Rendered into both consumers' prompts so a tagger/resolver
 * mismatch is detectable. Bump on ANY sub-issue change.
 */
export const SUB_ISSUE_VOCABULARY_VERSION = "sub-issue-v1";

/**
 * Tagger version stamp for the sub-issue re-tag pass. Stored on the rows that
 * the re-tag insert writes (kept here so the taxonomy and the insert share one
 * constant). Bump when a re-tag is required.
 */
export const SUB_TAGGER_VERSION = "healthcare-sub-v1";

/**
 * The healthcare sub-issues. Keys MUST equal `entry.id` (enforced by the test);
 * every `parent` MUST be a canonical issue id (asserted at module scope below).
 */
export const SUB_ISSUES: Record<string, SubIssueEntry> = {
  drug_prices: {
    id: "drug_prices",
    parent: "healthcare_affordability",
    label: "Drug & Insulin Prices",
    resolverDescription:
      "the cost of prescription drugs and insulin, and how government negotiates or caps those prices.",
    billSignals: [
      "insulin / drug price caps",
      "Medicare Part D drug-price negotiation",
      "PBM (pharmacy benefit manager) reform",
    ],
    exampleConcerns: [
      "my mom's insulin costs are insane",
      "prescription drugs are too expensive",
      "Medicare should negotiate drug prices",
    ],
  },

  coverage_access: {
    id: "coverage_access",
    parent: "healthcare_affordability",
    label: "Insurance Coverage & Access",
    resolverDescription:
      "specific insurance-coverage mechanisms — marketplace enrollment windows, premium subsidies for individuals buying on ACA exchanges, Medicaid eligibility for a concrete population, coverage mandates, or protections for the uninsured. NOT general ACA overhaul, broad Medicaid restructuring, or bills primarily about healthcare spending levels.",
    billSignals: [
      // Concrete enrollment / eligibility mechanisms
      "marketplace / exchange enrollment window or SEP (special enrollment period)",
      "ACA premium-subsidy cliff / APTC (advance premium tax credit) for individual market",
      "Medicaid eligibility expansion to a specific population (e.g. postpartum, childless adults)",
      // Coverage rules for the uninsured / underinsured
      "individual mandate / coverage requirement",
      "uninsured-rate reduction / coverage gap",
      "short-term / association health plan coverage rules",
      // EXCLUDE: broad ACA repeal/replace, Medicaid block-grant, or general healthcare spending bills
      //   → those should remain at the parent healthcare_affordability level, not coverage_access
    ],
    exampleConcerns: [
      "I can't afford my premiums",
      "I lost my coverage / can't get insured",
      "I missed open enrollment and can't sign up",
      "close the coverage gap / expand Medicaid",
    ],
  },

  provider_costs: {
    id: "provider_costs",
    parent: "healthcare_affordability",
    label: "Hospital & Provider Costs",
    resolverDescription:
      "what hospitals and providers charge — surprise bills, price transparency, and market consolidation.",
    billSignals: [
      "surprise-billing protections",
      "price transparency",
      "provider-consolidation / anti-monopoly",
      "site-neutral payment",
    ],
    exampleConcerns: [
      "I got a surprise hospital bill",
      "hospitals charge whatever they want",
      "I can't tell what anything costs",
    ],
  },

  senior_care: {
    id: "senior_care",
    parent: "healthcare_affordability",
    label: "Medicare & Senior Care",
    resolverDescription:
      "Medicare benefits and care for older adults — Medicare Advantage rules and long-term / nursing-home care.",
    billSignals: [
      "Medicare benefits",
      "Medicare Advantage rules",
      "long-term / nursing-home care",
      "nursing-home staffing",
    ],
    exampleConcerns: [
      "protect Medicare",
      "nursing-home care is too expensive",
      "my parents need long-term care",
    ],
  },

  mental_behavioral_health: {
    id: "mental_behavioral_health",
    parent: "healthcare_affordability",
    label: "Mental & Behavioral Health",
    resolverDescription:
      "access to mental-health and addiction care — parity enforcement, treatment funding, and crisis services.",
    billSignals: [
      "mental-health parity enforcement",
      "SUD / opioid treatment funding",
      "988 crisis funding",
      "behavioral-health workforce",
    ],
    exampleConcerns: [
      "I can't find a therapist / mental-health care",
      "we need more addiction treatment",
      "fund the 988 crisis line",
    ],
  },
};

// Module-scope invariant: every parent must be a real canonical issue id
// (mirrors poleVocabulary.ts asserting against CANONICAL_ISSUE_LABELS).
for (const entry of Object.values(SUB_ISSUES)) {
  if (!(entry.parent in CANONICAL_ISSUE_LABELS)) {
    throw new Error(
      `subIssues: "${entry.id}" has unknown parent "${entry.parent}" (not a canonical issue id)`,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** All sub-issues whose parent is `parent` (empty if the parent has none). */
export function getSubIssuesForParent(parent: string): SubIssueEntry[] {
  return Object.values(SUB_ISSUES).filter((e) => e.parent === parent);
}

/** Look up a single sub-issue by id. */
export function getSubIssue(id: string): SubIssueEntry | undefined {
  return SUB_ISSUES[id];
}

/** True iff `id` exists AND its parent is exactly `parent`. */
export function isValidSubIssueForParent(id: string, parent: string): boolean {
  return SUB_ISSUES[id]?.parent === parent;
}

/**
 * Parse an untrusted sub-issue value from a model/tagger: returns the id if it
 * is a valid string sub-issue for `parent`, else null.
 */
export function parseAndValidateSubTag(
  rawSubIssue: unknown,
  parent: string,
): string | null {
  if (typeof rawSubIssue !== "string") return null;
  return isValidSubIssueForParent(rawSubIssue, parent) ? rawSubIssue : null;
}

// ---------------------------------------------------------------------------
// Renderers — pure string builders consumed by the two prompts.
// ---------------------------------------------------------------------------

/**
 * Concise sub-issue block for the live concern-RESOLVER. One line per sub-issue,
 * grouped under the parent, no bill_signals (those are tagger-only), so the
 * prompt stays within its length budget. Tells the model to emit a `subIssue`
 * ONLY when one clearly fits, else omit it.
 */
export function renderResolverSubIssues(): string {
  const parents = new Set(Object.values(SUB_ISSUES).map((e) => e.parent));
  const groups = [...parents]
    .map((parent) => {
      const lines = getSubIssuesForParent(parent)
        .map((e) => `    ${e.id} - ${e.resolverDescription}`)
        .join("\n");
      return `  ${parent}:\n${lines}`;
    })
    .join("\n");

  return `SUB-ISSUES (sub-issue ${SUB_ISSUE_VOCABULARY_VERSION}) — when the voter's concern clearly fits one of these facets of a parent issue, set "subIssue" to its id; if none clearly fits, OMIT "subIssue". A sub-issue inherits the parent issue's pole direction — it never changes the side.
${groups}
(sub-issue ${SUB_ISSUE_VOCABULARY_VERSION})`;
}

/**
 * Verbose sub-issue block for the bill TAGGER's system prompt: per sub-issue,
 * id + label + its bill_signals. Verbose is fine — the tagger system prompt is
 * cached across the run.
 */
export function renderTaggerSubIssueBlock(): string {
  const parents = new Set(Object.values(SUB_ISSUES).map((e) => e.parent));
  const groups = [...parents]
    .map((parent) => {
      const lines = getSubIssuesForParent(parent)
        .map(
          (e) =>
            `    ${e.id} (${e.label}):\n      bill_signals: ${e.billSignals.join("; ")}`,
        )
        .join("\n");
      return `  ${parent}:\n${lines}`;
    })
    .join("\n\n");

  return `SUB-ISSUE FACETS (sub-issue ${SUB_ISSUE_VOCABULARY_VERSION}) — a sub-issue is a topic facet of an existing (bill, issue) tag; it INHERITS the parent issue's pole direction (do NOT pick a new direction). Set "sub_issue" only when a bill clearly matches one facet's bill_signals; otherwise omit it.

${groups}`;
}
