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
  /** CMTE_TP O — an independent-expenditure-only committee (super PAC). */
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

/**
 * CMTE_TP O — independent-expenditure-only committee (super PAC). The one
 * committee type this module will clear from a blank filing; see rule 4.
 */
const IE_ONLY_COMMITTEE_TYPE = "O";

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
  //    Never fires on the Part 6a contribution path — federal-pac-sponsors.ts
  //    drops X/Y/Z in isAttributablePacCommittee before a row gets here. It IS
  //    live for the Part 6b independent-expenditure ingest, which shares
  //    buildCommitteeRow and does attribute party spenders. Not dead code.
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

  // 4. Non-connected PACs — CMTE_DSGN U with no CONNECTED_ORG, and
  //    deliberately ONLY committee type O (independent-expenditure-only).
  //
  //    The tempting wider predicate (types N/Q/V/W too) reads as "an SSF must
  //    name its sponsor, so U + blank means there is no corporate sponsor to
  //    name". It does not. That is the ordinary filing shape of industry and
  //    trade-association PACs: UNITED EGG ASSOCIATION EGGPAC (C00172841)
  //    files designation U, type Q, no ORG_TP, no connected org — and
  //    AMERICAN FRUIT & VEGETABLE PAC (C00828806), which gave $65k to 2026
  //    candidate committees, files the same shape with CONNECTED_ORG_NM
  //    literally "NONE", which arrives here blank because
  //    federal-pac-sponsors.ts normalizes the FEC's NONE/N/A placeholders to
  //    null. Two ABSENT fields would become `non_connected` — a class
  //    isPledgeCorporate() reports false for, i.e. a badge-CLEARING verdict
  //    read off missing data. Nothing downstream can catch that either:
  //    _export-sponsor-class-queue.ts only re-queues rows that are NULL or
  //    'unknown', so a committee auto-cleared here never reaches a human.
  //
  //    Type O is the one place a clearing verdict is structurally safe rather
  //    than merely likely: an IE-only committee may not contribute to a
  //    candidate committee at all, so no contribution row can ever rest on
  //    this answer. N/Q (ordinary PACs) and V/W (hybrids, which hold a
  //    contribution account) all can give, so they fall through to `unknown`.
  //
  //    The cost is real and intended: every contributing committee the wider
  //    rule used to clear returns to the `unknown` pool, where it blocks the
  //    claim AND surfaces in the curation queue for a human to settle.
  if (
    designation === "U" &&
    !connectedOrg &&
    committeeType === IE_ONLY_COMMITTEE_TYPE
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
