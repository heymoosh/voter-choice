/**
 * Per-state voter-ID rules — replaces the hardcoded Texas demo list (and the
 * "check vote.gov" interim) so the printed ballot + polling bar show the real
 * requirement for the voter's state.
 *
 * ACCURACY POSTURE (matches the "no fabricated wrong-state specifics" standard):
 *   - `required` and the broad CATEGORY (strict/non-strict photo, strict/non-strict
 *     non-photo, no-ID) are from the NCSL "Voter ID Requirements by State"
 *     classification and are treated as accurate for all 50 states + DC.
 *   - `note` is a CATEGORY-LEVEL description for unverified states — it states the
 *     requirement type and the general fallback (provisional / affidavit) but does
 *     NOT assert state-specific procedural specifics (exact cure deadlines, free-ID
 *     availability). Those vary per state and are NOT verified here, so each note
 *     directs the voter to confirm them at their state election office. Only TX and
 *     GA carry state-specific note text + accepted-ID lists, sourced from the
 *     official state SoS sites and marked `verified: true`.
 *   - `acceptedIds` is rendered to the voter ONLY when `verified: true`.
 *
 * To promote a state to full per-state detail: confirm its accepted-ID list AND its
 * procedural specifics against the official state election site, write a per-state
 * `note`, set `verified: true`. Voter-ID laws change (NC and MO both moved categories
 * since 2024) — re-check before flipping.
 */

export interface VoterIdRule {
  /** Do most in-person voters need ID for their ballot to count normally? The
   *  HAVA first-time-mail-registrant exception does NOT flip this to true. */
  required: boolean;
  /** Accepted ID forms. Rendered to the voter ONLY when `verified` is true. */
  acceptedIds: string[];
  /** Voter-facing description of the rule + fallback. Category-level unless
   *  `verified` (then per-state, from an official source). */
  note: string;
  /** True only when `acceptedIds` + `note` are confirmed from an official source. */
  verified?: boolean;
}

// Category-level notes — honest about the requirement + general fallback, with no
// unverified per-state procedural specifics (cure deadlines, free-ID availability).
const STRICT_PHOTO =
  "Photo ID required. Without an accepted photo ID you typically vote a provisional ballot and must show ID by a state deadline for it to count — confirm the accepted IDs and the cure deadline at your state election office.";
const NONSTRICT_PHOTO =
  "Photo ID requested. If you don't have one you can usually still vote — by signing an affidavit, by a poll worker confirming you, or via a provisional ballot that is counted — but confirm the exact rules at your state election office.";
const STRICT_NONPHOTO =
  "ID required (a photo ID isn't necessarily required — some non-photo documents qualify). Without it you typically vote provisionally and must provide ID by a state deadline — confirm the accepted documents and the deadline at your state election office.";
const NONSTRICT_NONPHOTO =
  "ID requested (photo or certain non-photo documents). If you don't have one you can usually still vote by affidavit or provisional ballot — confirm the exact rules at your state election office.";
// No-ID note carries only the federal HAVA exception (a federal rule, not a
// per-state specific), so it's accurate for every no-ID state.
const NO_ID =
  "No ID required for most in-person voters. Exception: a first-time voter who registered by mail without providing an ID may be asked to show identification.";

export const VOTER_ID_RULES: Record<string, VoterIdRule> = {
  // ── Strict photo ID ──
  AR: { required: true, acceptedIds: [], note: STRICT_PHOTO },
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
  IN: { required: true, acceptedIds: [], note: STRICT_PHOTO },
  KS: { required: true, acceptedIds: [], note: STRICT_PHOTO },
  MS: { required: true, acceptedIds: [], note: STRICT_PHOTO },
  NH: { required: true, acceptedIds: [], note: STRICT_PHOTO },
  OH: { required: true, acceptedIds: [], note: STRICT_PHOTO },
  TN: { required: true, acceptedIds: [], note: STRICT_PHOTO },
  WI: { required: true, acceptedIds: [], note: STRICT_PHOTO },

  // ── Non-strict photo ID (affidavit / vouching / provisional-counted) ──
  AL: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  FL: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  ID: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  KY: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  LA: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  MI: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  MO: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  MT: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  NE: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  NC: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  RI: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  SC: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
  SD: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },
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
  WV: { required: true, acceptedIds: [], note: NONSTRICT_PHOTO },

  // ── Strict non-photo ID ──
  AZ: { required: true, acceptedIds: [], note: STRICT_NONPHOTO },
  ND: { required: true, acceptedIds: [], note: STRICT_NONPHOTO },
  WY: { required: true, acceptedIds: [], note: STRICT_NONPHOTO },

  // ── Non-strict non-photo ID ──
  AK: { required: true, acceptedIds: [], note: NONSTRICT_NONPHOTO },
  CO: { required: true, acceptedIds: [], note: NONSTRICT_NONPHOTO },
  CT: { required: true, acceptedIds: [], note: NONSTRICT_NONPHOTO },
  DE: { required: true, acceptedIds: [], note: NONSTRICT_NONPHOTO },
  IA: { required: true, acceptedIds: [], note: NONSTRICT_NONPHOTO },
  OK: { required: true, acceptedIds: [], note: NONSTRICT_NONPHOTO },
  UT: { required: true, acceptedIds: [], note: NONSTRICT_NONPHOTO },
  VA: { required: true, acceptedIds: [], note: NONSTRICT_NONPHOTO },

  // ── No ID required for most in-person voters (federal HAVA exception applies) ──
  CA: { required: false, acceptedIds: [], note: NO_ID },
  HI: { required: false, acceptedIds: [], note: NO_ID },
  IL: { required: false, acceptedIds: [], note: NO_ID },
  ME: { required: false, acceptedIds: [], note: NO_ID },
  MD: { required: false, acceptedIds: [], note: NO_ID },
  MA: { required: false, acceptedIds: [], note: NO_ID },
  MN: {
    required: false,
    acceptedIds: [],
    note: "No ID required to vote in person once you are registered. (ID/proof of residence is needed only to register, including same-day at the polls.)",
  },
  NV: { required: false, acceptedIds: [], note: NO_ID },
  NJ: { required: false, acceptedIds: [], note: NO_ID },
  NM: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters; you may be asked to state your name, address, and year of birth. Exception: a first-time voter who registered by mail without verified ID may be asked to show identification.",
  },
  NY: { required: false, acceptedIds: [], note: NO_ID },
  OR: {
    required: false,
    acceptedIds: [],
    note: "Oregon votes by mail; no ID is required at a drop site for registered voters. (ID is used only when registering.)",
  },
  PA: {
    required: false,
    acceptedIds: [],
    note: "No ID required for most in-person voters. Exception: a first-time voter at a given polling place must show ID (photo or non-photo, such as a utility bill or bank statement).",
  },
  VT: { required: false, acceptedIds: [], note: NO_ID },
  WA: {
    required: false,
    acceptedIds: [],
    note: "Washington votes by mail; no ID is required at a voting center for registered voters. (ID/proof is used only when registering.)",
  },
  DC: { required: false, acceptedIds: [], note: NO_ID },
};

/** Lookup by 2-letter state code (case-insensitive). Null when unknown. */
export function getVoterIdRule(stateCode: string): VoterIdRule | null {
  if (!stateCode) return null;
  return VOTER_ID_RULES[stateCode.toUpperCase()] ?? null;
}
