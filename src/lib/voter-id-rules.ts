/**
 * Per-state voter-ID rules — replaces the hardcoded Texas demo list (and the
 * "check vote.gov" interim) so the printed ballot + polling bar show the real
 * requirement for the voter's state.
 *
 * ACCURACY POSTURE (matches the "no fabricated wrong-state specifics" standard):
 *   - `required` (the load-bearing signal — does this voter need ID) is from the
 *     NCSL "Voter ID Requirements by State" classification and is treated as
 *     accurate for all 50 states + DC.
 *   - `note` is a one-line, per-state description of the requirement + the
 *     fallback (affidavit / provisional). Verified categories; wording reviewed.
 *   - `acceptedIds` is rendered ONLY for entries marked `verified: true` — today
 *     just TX and GA, whose lists come from the official state SoS sites. For
 *     every other ID-required state the UI shows the note + "confirm the exact
 *     accepted-ID list at your state election office" instead of an unverified
 *     list. The representative lists below are kept for reference / future
 *     verification but are NOT shown until `verified` is set.
 *
 * Maintenance: voter-ID laws change (NC and MO both moved categories since 2024).
 * Re-check against the state election site before flipping `verified: true`.
 */

export interface VoterIdRule {
  /** Do most in-person voters need ID for their ballot to count normally? The
   *  HAVA first-time-mail-registrant exception does NOT flip this to true. */
  required: boolean;
  /** Accepted ID forms. Rendered to the voter ONLY when `verified` is true. */
  acceptedIds: string[];
  /** One-line, voter-facing description of the rule + the fallback. */
  note: string;
  /** True only when `acceptedIds` is confirmed from an official state source. */
  verified?: boolean;
}

export const VOTER_ID_RULES: Record<string, VoterIdRule> = {
  // ── Strict photo ID ──
  AR: {
    required: true,
    acceptedIds: [],
    note: "Photo ID required. Without it you vote a provisional ballot, which counts only if you confirm your identity with the county by the Monday after the election.",
  },
  GA: {
    required: true,
    verified: true,
    acceptedIds: [
      "Georgia driver's license (even if expired)",
      "Free Georgia voter ID card",
      "US passport",
      "Valid US/Georgia government employee photo ID",
      "US military photo ID",
      "Valid tribal photo ID",
    ],
    note: "Photo ID required. Without it you vote a provisional ballot; it counts only if you show ID to the county registrar within 3 days. A free voter ID card is available.",
  },
  IN: {
    required: true,
    acceptedIds: [],
    note: "Photo ID issued by Indiana or the US government (name matching the poll book) required. Without it you vote provisionally and follow up with the county within ~10 days.",
  },
  KS: {
    required: true,
    acceptedIds: [],
    note: "Photo ID required. Without it you vote a provisional ballot, which counts only if you provide ID to the county before the official canvass.",
  },
  MS: {
    required: true,
    acceptedIds: [],
    note: "Photo ID required. Without it you vote an affidavit ballot, which counts only if you show ID to the circuit clerk within 5 days. A free voter ID card is available.",
  },
  NH: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you may sign a challenged-voter affidavit and vote; the state mails a verification letter afterward.",
  },
  OH: {
    required: true,
    acceptedIds: [],
    note: "Photo ID required. Without it you vote a provisional ballot, which counts only if you provide ID to the board of elections within 4 days.",
  },
  TN: {
    required: true,
    acceptedIds: [],
    note: "Federal or Tennessee government photo ID required (most student and out-of-state IDs are not accepted). Without it you vote provisionally and must show ID within 2 business days.",
  },
  WI: {
    required: true,
    acceptedIds: [],
    note: "Photo ID required. Without it you vote a provisional ballot, which counts only if you show ID to the clerk by the Friday after the election. A free state ID is available.",
  },

  // ── Non-strict photo ID (affidavit / vouching / provisional-counted) ──
  AL: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you may still vote if two poll workers identify you; otherwise you vote provisionally.",
  },
  FL: {
    required: true,
    acceptedIds: [],
    note: "Photo-and-signature ID requested. If your ID lacks a signature you're asked for a second ID; without acceptable ID you vote provisionally.",
  },
  ID: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you may sign a personal-identification affidavit at the polls and vote a regular ballot.",
  },
  KY: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. If you can't produce one you may vote after an impediment affirmation, or if a poll worker who knows you confirms your identity.",
  },
  LA: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you may sign a voter affidavit and vote a regular ballot.",
  },
  MI: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you sign an affidavit and vote a regular ballot that is counted.",
  },
  MO: {
    required: true,
    acceptedIds: [],
    note: "Government photo ID requested. Without one you may vote provisionally (counts if your signature matches) or return the same day with photo ID. A free state ID is available.",
  },
  MT: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested; a non-photo ID (utility bill, bank statement, paycheck, or government document) is also accepted. Without any, you vote provisionally.",
  },
  NE: {
    required: true,
    acceptedIds: [],
    note: "Photo ID required (2023 law). Without it you may attest in limited cases or vote provisionally and provide ID by the deadline. A free state ID is available.",
  },
  NC: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you may file an ID Exception Form (e.g. reasonable impediment) or vote provisionally and bring ID to the county board — your ballot still counts.",
  },
  RI: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you vote a provisional ballot, which counts if your signature matches the registration record.",
  },
  SC: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you may vote provisionally after signing a reasonable-impediment affidavit — the ballot counts unless challenged.",
  },
  SD: {
    required: true,
    acceptedIds: [],
    note: "Photo ID requested. Without it you may sign a personal-identification affidavit at the polls and vote a regular ballot.",
  },
  TX: {
    required: true,
    verified: true,
    acceptedIds: [
      "Texas driver's license (DPS)",
      "Texas Election Identification Certificate (DPS)",
      "Texas personal ID card (DPS)",
      "Texas handgun license (DPS)",
      "US military photo ID",
      "US citizenship certificate with photo",
      "US passport (book or card)",
    ],
    note: "Photo ID required (expired ≤4 yrs for ages 18–69; no expiry limit for 70+). Without one you may sign a Reasonable Impediment Declaration and show a supporting document (voter registration certificate, utility bill, bank statement, government check, paycheck, or birth certificate).",
  },
  WV: {
    required: true,
    acceptedIds: [],
    note: "ID requested (photo or several non-photo documents). Without any, an adult who has known you ≥6 months may confirm your identity, or you vote provisionally.",
  },

  // ── Strict non-photo ID ──
  AZ: {
    required: true,
    acceptedIds: [],
    note: "ID required — one photo ID with name and address, or two non-photo documents (utility bill, bank statement, vehicle registration, voter card, etc.). Without it you vote provisionally and provide ID within 5 business days.",
  },
  ND: {
    required: true,
    acceptedIds: [],
    note: "North Dakota has no voter registration; show ID proving name, current residential address, and date of birth. Without it you vote a set-aside ballot and provide valid ID before the canvass.",
  },
  WY: {
    required: true,
    acceptedIds: [],
    note: "ID required (2021 law); both photo and certain non-photo documents are accepted. Without acceptable ID you vote a provisional ballot. A free ID is available from Driver Services.",
  },

  // ── Non-strict non-photo ID ──
  AK: {
    required: true,
    acceptedIds: [],
    note: "ID requested (photo or a current utility bill, bank statement, paycheck, or government document with name and address). A poll worker who knows you may waive it; otherwise you vote a questioned ballot.",
  },
  CO: {
    required: true,
    acceptedIds: [],
    note: "Colorado votes primarily by mail; for in-person voting ID is requested but many non-photo documents qualify. First-time mail registrants may need to provide ID.",
  },
  CT: {
    required: true,
    acceptedIds: [],
    note: "ID requested (photo ID, Social Security card, or a pre-printed document with name and address). Without one you may sign an affidavit on the official checklist and vote a regular ballot.",
  },
  DE: {
    required: true,
    acceptedIds: [],
    note: "ID requested. Without one you sign an affidavit of affirmation at the polls and vote a regular ballot.",
  },
  IA: {
    required: true,
    acceptedIds: [],
    note: "ID requested. Without one a registered voter who knows you may attest to your identity, or you vote provisionally and provide ID by the deadline.",
  },
  OK: {
    required: true,
    acceptedIds: [],
    note: "ID requested — a government-issued document or your free voter ID card. Without it you may vote provisionally after signing a sworn affidavit.",
  },
  UT: {
    required: true,
    acceptedIds: [],
    note: "ID requested — one photo ID, or two documents proving name and current residence. Without it you vote provisionally. Utah votes primarily by mail.",
  },
  VA: {
    required: true,
    acceptedIds: [],
    note: "ID requested. Without one you may sign an ID Confirmation Statement and vote a regular ballot, or vote provisionally. A free voter photo ID is available.",
  },

  // ── No ID required for most in-person voters (HAVA first-time-mail exception applies) ──
  CA: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: a first-time voter who registered by mail without providing an ID number may be asked to show ID.",
  },
  HI: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without verified ID may be asked to present identification.",
  },
  IL: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without an ID number may be asked to show ID.",
  },
  ME: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without verified ID may be asked to present identification.",
  },
  MD: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without verified ID may be asked to show ID.",
  },
  MA: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without verified ID, or inactive voters, may be asked to show ID.",
  },
  MN: {
    required: false,
    acceptedIds: [],
    note: "No ID required to vote in person once you are registered. (ID/proof of residence is needed only to register, including same-day at the polls.)",
  },
  NV: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters; identity is confirmed by signature match. Exception: first-time mail registrants without verified ID may be asked to show ID.",
  },
  NJ: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without providing ID at registration may be asked to show identification.",
  },
  NM: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters; you may be asked to state your name, address, and year of birth. Exception: first-time mail registrants without verified ID may be asked to show ID.",
  },
  NY: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without verified ID may be asked to show ID.",
  },
  OR: {
    required: false,
    acceptedIds: [],
    note: "Oregon votes by mail; no ID is required at a drop site for registered voters. (ID is used only when registering.)",
  },
  PA: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters at a given polling place must show ID (photo or non-photo, such as a utility bill or bank statement).",
  },
  VT: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without verified ID may be asked to show ID.",
  },
  WA: {
    required: false,
    acceptedIds: [],
    note: "Washington votes by mail; no ID is required at a voting center for registered voters. (ID/proof is used only when registering.)",
  },
  DC: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: first-time voters who registered by mail without verified ID may be asked to show ID.",
  },
};

/** Lookup by 2-letter state code (case-insensitive). Null when unknown. */
export function getVoterIdRule(stateCode: string): VoterIdRule | null {
  if (!stateCode) return null;
  return VOTER_ID_RULES[stateCode.toUpperCase()] ?? null;
}
