/**
 * src/lib/pacSponsorClass.ts
 *
 * Who is behind a PAC — the sponsor class — derived ONLY from fields the
 * committee itself filed with the FEC (committee master: ORG_TP, CMTE_DSGN,
 * CMTE_TP, CONNECTED_ORG_NM).
 *
 * Exists because "takes $0 corporate PAC money" is a claim about ABSENCE, and
 * absence is only honest when the money that IS there has been classified.
 * `pac_committees.sector` answers "which industry"; it is NULL for 43% of
 * committees (1,645 of 3,809 on prod, 2026-08-20) because sector inference is
 * deliberately conservative. This module answers the narrower, more answerable
 * question — corporate-connected or not — which the FEC's own designation and
 * committee-type codes settle for most of those NULLs.
 *
 * Lives in src/lib (not scripts/ingest) for the same reason as
 * issuePacRules.ts: both the ingest backfill and the read/assembly layer need
 * one source of truth.
 *
 * SCOPE OF THE PLEDGE CLAIM (Muxin, 2026-08-20): the End Citizens United
 * "No Corporate PAC" pledge definition — business-connected PACs, i.e.
 * corporations AND trade associations/co-ops. `CORPORATE_PLEDGE_CLASSES` is
 * the one place that scope is defined; narrowing it to corporations only is a
 * one-line change here, not a rewrite of the callers.
 *
 * WHAT THIS MODULE WILL NOT DO: guess from a committee's NAME. An ideological
 * PAC called "Americans for Energy Independence" is not an energy-industry
 * PAC, and — the direction that actually matters for a $0 claim — a corporate
 * SSF whose filing left ORG_TP blank (Ernst & Young's and Deloitte's PACs both
 * do) must land in `unknown`, never in a "not corporate" bucket. Unknown
 * blocks the claim; that is the safe failure direction and the whole point.
 */

/** FEC committee-master fields this classification reads. All nullable. */
export interface PacSponsorFilingFields {
  /** ORG_TP — the committee's declared organization type. */
  orgType: string | null;
  /** CMTE_DSGN — committee designation. */
  designation: string | null;
  /** CMTE_TP — committee type. */
  committeeType: string | null;
  /** CONNECTED_ORG_NM — the sponsor an SSF is required to name. */
  connectedOrg: string | null;
}

export type PacSponsorClass =
  /** ORG_TP C/W — a corporation's separate segregated fund. */
  | "corporate"
  /** ORG_TP T/V — trade association or cooperative SSF. */
  | "trade"
  /** ORG_TP L — labor organization. */
  | "labor"
  /** ORG_TP M — membership organization. */
  | "membership"
  /** CMTE_DSGN D — a member's leadership PAC. */
  | "leadership"
  /** CMTE_TP X/Y/Z — party committee. */
  | "party"
  /** CMTE_DSGN U with no connected organization — non-connected PAC. */
  | "non_connected"
  /** Not resolvable from the filing. Blocks any $0-corporate claim. */
  | "unknown";

/**
 * The classes an End Citizens United-style "No Corporate PAC" pledge counts as
 * corporate money. Business-connected: corporations plus trade associations
 * and co-ops.
 */
export const CORPORATE_PLEDGE_CLASSES: ReadonlySet<PacSponsorClass> =
  new Set<PacSponsorClass>(["corporate", "trade"]);

export interface PacSponsorClassification {
  sponsorClass: PacSponsorClass;
  /** Provenance of the call, stored alongside it so a rule change is auditable. */
  method: string;
}

const ORG_TYPE_CLASSES: Record<string, PacSponsorClass> = {
  C: "corporate", // Corporation
  W: "corporate", // Corporation without capital stock
  T: "trade", // Trade association
  V: "trade", // Cooperative
  L: "labor", // Labor organization
  M: "membership", // Membership organization
};

const PARTY_COMMITTEE_TYPES = new Set(["X", "Y", "Z"]);

/** Committee types a non-connected PAC files under (PAC, hybrid, IE-only). */
const NON_CONNECTED_COMMITTEE_TYPES = new Set(["N", "O", "Q", "V", "W"]);

const norm = (value: string | null): string =>
  (value ?? "").trim().toUpperCase();

/**
 * Classify a committee from its own FEC filing. Never throws; anything the
 * filing does not settle comes back `unknown`.
 */
export function classifyPacSponsor(
  fields: PacSponsorFilingFields,
): PacSponsorClassification {
  const orgType = norm(fields.orgType);
  const designation = norm(fields.designation);
  const committeeType = norm(fields.committeeType);
  const connectedOrg = norm(fields.connectedOrg);

  // 1. The committee declared its organization type. Nothing beats that.
  const declared = ORG_TYPE_CLASSES[orgType];
  if (declared) return { sponsorClass: declared, method: "org-type-v1" };

  // 2. Party committees are a committee-type fact, not a sponsor inference.
  if (PARTY_COMMITTEE_TYPES.has(committeeType)) {
    return { sponsorClass: "party", method: "committee-type-v1" };
  }

  // 3. Leadership PACs (CMTE_DSGN D) are a member's own PAC. On prod, 556 of
  //    557 leadership PACs carry no ORG_TP at all, and they account for
  //    $34.3M of otherwise-unclassified money to 2026 non-incumbents — this
  //    single rule resolves more than half of the unknown dollars, from a
  //    field the committee filed.
  if (designation === "D") {
    return { sponsorClass: "leadership", method: "designation-v1" };
  }

  // 4. Non-connected PACs: CMTE_DSGN U (unauthorized) with no CONNECTED_ORG.
  //    An SSF must name the organization that sponsors it, so a PAC filing as
  //    unauthorized with that field blank has no corporate sponsor to name.
  //    Note the deliberate asymmetry: designation B (registered-filer SSFs
  //    such as the Ernst & Young and Deloitte PACs) is NOT covered here, and
  //    neither is a U committee that did name a connected org — both stay
  //    `unknown` rather than being called non-corporate.
  if (
    designation === "U" &&
    !connectedOrg &&
    NON_CONNECTED_COMMITTEE_TYPES.has(committeeType)
  ) {
    return { sponsorClass: "non_connected", method: "designation-v1" };
  }

  return { sponsorClass: "unknown", method: "unresolved-v1" };
}

/** True when this class counts as corporate money under the pledge scope. */
export function isPledgeCorporate(sponsorClass: PacSponsorClass): boolean {
  return CORPORATE_PLEDGE_CLASSES.has(sponsorClass);
}

/** Reader-facing name for a sponsor class. */
export const PAC_SPONSOR_CLASS_LABELS: Record<PacSponsorClass, string> = {
  corporate: "Corporate PAC",
  trade: "Trade association PAC",
  labor: "Labor union PAC",
  membership: "Membership organization PAC",
  leadership: "Leadership PAC",
  party: "Party committee",
  non_connected: "Non-connected PAC",
  unknown: "Unclassified",
};
