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
    // Iowa's own "No Party" ballot designation for a nomination-by-petition
    // candidate not affiliated with any party (Iowa Code ch. 44) — the
    // Iowa Secretary of State's official candidate list literally prints
    // "No Party" as the Party column value, distinct from generic IND
    // per the same precedent as NPA/NPP (a state's own literal ballot
    // label, preserved rather than collapsed into the generic bucket;
    // added building Iowa).
    | "NPI"
    // Constitution Party of Idaho — a real state-recognized minor party
    // under Idaho law, distinct from generic IND; unlike Idaho's
    // Democratic/Republican/Libertarian primaries (all three appeared as
    // contests on results.voteidaho.gov's official May 19, 2026 primary
    // results), no Constitution Party primary contest existed for either US
    // House district — its two 2026 federal filers went straight to the
    // general ballot (added building Idaho).
    | "CST"
    // The Kentucky Party — a real state-recognized minor party under
    // Kentucky law (listed in the KY SoS candidate-filings portal's own
    // official Party Affiliation list), distinct from generic IND (added
    // building Kentucky, mirroring the AIP/AKP/NPP/PF/LPF/FFP precedent
    // for a state's own recognized minor party).
    | "KYP"
    // Legal Marijuana Now — a real, state-recognized minor party under
    // Nebraska election law, distinct from generic IND (added building
    // Nebraska; the party label comes directly from the Nebraska Secretary
    // of State's own official candidate-filing spreadsheet, mirroring the
    // AIP/AKP/NPP/PF/LPF/FFP precedent of trusting an official source's own
    // party label over inventing a generic bucket).
    | "LMN"
    // Minnesota's Democratic-Farmer-Labor party — the state's actual
    // Democratic affiliate under Minnesota law (M.S. 200.02, subd. 7), not
    // a generic "DEM" — the official candidates.sos.mn.gov portal lists
    // party as "Democratic-Farmer-Labor" verbatim, never "Democratic"
    // (added building Minnesota, mirroring the AIP/AKP/NPP/PF/LPF/FFP
    // precedent for a state's own recognized major/minor party).
    | "DFL"
    // Working Class Party — read verbatim from the Illinois State Board of
    // Elections' own official candidate-filing "Party" field (the SBE portal
    // IS the official source of truth for a candidate's recorded party
    // affiliation here, so no separate party-list lookup was needed, unlike
    // AIP/PF/NPP/LPF/FFP which were cross-checked against a state's
    // published party list) (added building Illinois).
    | "WCP"
    // American Center Party — same sourcing basis as WCP above: read
    // verbatim from the Illinois SBE's own official candidate-filing record
    // (added building Illinois).
    | "ACP"
    // Socialist Workers Party — a real, nationally-recognized minor party
    // (not a one-off candidate-chosen ballot slogan), confirmed by two
    // independent 2026 New Jersey federal filings under this exact party
    // name (a US Senate candidate and a US House candidate), distinct from
    // generic IND (added building New Jersey, mirroring the GRE/LIB/AIP/
    // AKP/NPP/PF/LPF/FFP precedent for a real recognized minor party).
    | "SWP"
    // Washington's top-two primary law (I-872; RCW 29A.24.030-.050) is
    // materially different from every party code above: a candidate may
    // state ANY party preference of their choosing (up to 16 characters) on
    // their declaration of candidacy — it need NOT correspond to a
    // legally-recognized political party at all. The WA SoS's own candidate
    // portal (voter.votewa.gov/CandidateList.aspx) prints these
    // self-designated strings verbatim in its "Party Preference" column.
    // The six codes below preserve WA's literal self-designated labels
    // exactly as filed, per the same precedent as NPI/LMN/etc. (never
    // invent a generic bucket for an official source's own literal label) —
    // added building Washington. A future top-two-primary state build
    // (Washington and California are both top-two; Louisiana is unbuilt as
    // of this writing) should expect the same phenomenon and may need to
    // add further one-off codes rather than reusing these WA-specific ones.
    | "CAS" // "CASCADE" — the real, WA-registered Cascade Party.
    | "SNP" // "STATES NO PARTY PREFERENCE" — WA's literal self-designated
    // no-preference ballot label (RCW 29A.24.104); distinct from CA's NPP
    // (a legal registration status, not a self-designated preference).
    | "TRR" // "TRUMP REPUBLICAN" — a candidate's own self-designated
    // preference text, not a registered party.
    | "FTR" // "FIFTH REPUBLIC" — a candidate's own self-designated
    // preference text, not a registered party.
    | "SWP" // "SOCIALIST WORKERS" — corresponds to the real national
    // Socialist Workers Party, self-designated per WA's system.
    | "UNP" // "UNION" — a candidate's own self-designated preference text,
    // not a registered party.
    | null;
  isIncumbent: boolean;
  ballotStatus: OfficialBallotStatus;
  office?: "house" | "senate"; // per-entry override, for a fixture covering both chambers
}
