/**
 * scripts/congressional-rosters/types.ts
 *
 * Shared fixture types for hand-transcribed state official-roster files
 * (e.g. az-official-roster-2026.ts). Extracted so per-state fixture files
 * don't depend on each other — each state's data file should only import
 * these shared types, never another state's fixture module.
 */

export type OfficialBallotStatus =
  | "qualified_for_primary_ballot"
  | "write_in_qualified"
  // Certified primary/runoff winner — the party's nominee for the general
  // ballot, per official election-night results (no distinct SoS "general
  // ballot certification" document exists yet at transcription time).
  | "qualified_for_general_ballot"
  // Filed an official declaration of intent to run as an independent, per
  // the SoS's independent-declaration tracking document — a preliminary
  // filing stage that precedes final petition-signature verification, not
  // yet a general-ballot certification.
  | "declared_general_ballot_intent"
  // One of the two finalists advancing to a still-pending primary runoff —
  // the party's nominee is NOT yet determined (added building Oklahoma's
  // roster, card d9b1ef86: OK's Aug 25, 2026 runoff was still in the future
  // at transcription time). Both finalists get a row with this status;
  // never promote either to qualified_for_general_ballot before the runoff
  // is certified — see the plan doc's SAFETY rule against inferring a
  // nominee from primary-round standings alone.
  | "runoff_pending";

export interface OfficialRosterEntry {
  // Zero-padded House district ("01".."38"), OR "00" for an at-large House
  // seat (Alaska — see races.ts's lookupChallengers, which zero-pads a
  // numeric district of 0 to "00"; a null district here would never match
  // that lookup). null = statewide Senate contest only.
  district: string | null;
  name: string;
  party:
    | "DEM"
    | "REP"
    | "LIB"
    | "GRE"
    | "AIP"
    | "IND"
    // "No Party Affiliation" — Alaska's Division of Elections lists filers
    // as "Nonpartisan" or "Undeclared" (distinct voter-registration
    // statuses, not a declared-independent candidacy like TX/OK's "IND");
    // both collapse to this existing FEC-side code (added building Alaska,
    // card... AK vertical slice) since the app has no separate concept for
    // the nuance and races.ts's PARTY_NAMES already maps NPA for FEC data.
    | "NPA"
    // Alaska's "Registered Alaskan Party" — a real state-recognized minor
    // party under Alaska law, distinct from generic IND (added building
    // Alaska, mirroring how AIP was added for Arizona's own state party).
    | "AKP"
    // California's "No Party Preference" ballot designation — a distinct
    // legal registration status (Cal. Elec. Code § 2151), not a declared
    // independent candidacy like TX/OK's generic IND; mirrors why AK added
    // NPA instead of reusing IND (added building California, card
    // c5a813bb's CA vertical slice).
    | "NPP"
    // California's Peace and Freedom Party — a real state-recognized minor
    // party (Cal. Elec. Code qualified-party status), distinct from generic
    // IND (added building California, mirroring the AIP/AKP precedent for
    // a state's own recognized minor party).
    | "PF"
    // Libertarian Party of Florida — a real state-recognized minor party
    // under Florida law, distinct from generic IND (added building Florida,
    // confirmed against dos.fl.gov's official political-parties list).
    | "LPF"
    // Florida Forward Party — a real state-recognized minor party under
    // Florida law, distinct from generic IND (added building Florida,
    // confirmed against dos.fl.gov's official political-parties list).
    | "FFP"
    // The Kentucky Party — a real state-recognized minor party under
    // Kentucky law (listed in the KY SoS candidate-filings portal's own
    // official Party Affiliation list), distinct from generic IND (added
    // building Kentucky, mirroring the AIP/AKP/NPP/PF/LPF/FFP precedent
    // for a state's own recognized minor party).
    | "KYP"
    | null;
  isIncumbent: boolean;
  ballotStatus: OfficialBallotStatus;
  office?: "house" | "senate"; // per-entry override, for a fixture covering both chambers
}
