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
  district: string | null; // zero-padded House district, "01".."38"; null = statewide Senate contest
  name: string;
  party: "DEM" | "REP" | "LIB" | "GRE" | "AIP" | "IND" | null;
  isIncumbent: boolean;
  ballotStatus: OfficialBallotStatus;
  office?: "house" | "senate"; // per-entry override, for a fixture covering both chambers
}
