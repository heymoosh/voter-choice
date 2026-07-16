/**
 * scripts/congressional-rosters/nd-official-roster-2026.ts
 *
 * North Dakota's 2026 official congressional roster for the November 3,
 * 2026 general election — covers the single at-large US House seat. No US
 * Senate race appears on North Dakota's 2026 ballot (John Hoeven's Class
 * III seat runs to 2028; Kevin Cramer's Class II seat was up in 2024 and
 * runs to 2030 — confirmed absent: the SoS's own 2026 general election
 * Contest dropdown has no "United States Senator" option at all, only
 * "Representative in Congress" at the federal level). Built through the
 * same manual official-source pipeline as Arizona (card 637c2583), Texas
 * (card 8530a468), Oklahoma (card d9b1ef86), Alaska (card 8dd3c1b3), and
 * California (card c5a813bb's CA vertical slice), epic c5a813bb; this is
 * North Dakota's build.
 *
 * NORTH-DAKOTA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/north-dakota-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - North Dakota's official candidate source is the Secretary of State's
 *     VIP (Voter Information Portal) at vip.sos.nd.gov/candidatelist.aspx —
 *     an ASP.NET WebForms page, NOT Civix (Civix URLs follow the
 *     `<subdomain>.<state>elections.civixapps.com` pattern; ND's does not,
 *     and none of the Civix playbook's recognition signals — "IvisCbpUi"
 *     page titles, "POWERED BY gocivix.com" footer — appear anywhere on
 *     this portal). The Civix portal operational playbook does not apply
 *     here.
 *   - The portal is driven by a numeric `eid` (election ID) query
 *     parameter selecting which election's candidate list loads — there is
 *     no human-readable year/type in the URL itself, and eids are NOT
 *     contiguous by election type (found by probing sequential values):
 *     `eid=346` = 2026 Primary, `eid=347` = a 2025 Minot special election,
 *     `eid=348` = the 2026 GENERAL election (this fixture's source),
 *     `eid=349`/`350` errored. `eid=326` = 2022 General (used only to
 *     confirm the page's stable structure across cycles).
 *   - Selecting a contest is a true ASP.NET postback, not a URL parameter —
 *     appending `&cid=<value>` to the URL does nothing (confirmed by
 *     directly testing it); the page's Contest `<select>` must actually be
 *     changed and its `change` event fired (or a human would use the UI
 *     dropdown) to trigger the server-side postback that populates the
 *     results table. This build drove the postback via
 *     `mcp__claude-in-chrome__javascript_tool`, setting
 *     `#ctl00_ContentPlaceHolder1_ddlContest`'s value to `22055`
 *     ("Representative in Congress") and dispatching a `change` event,
 *     then clicking Search — the resulting "Candidate List Results" table
 *     is this fixture's direct source. WebFetch could not drive this
 *     interaction (it only ever sees the pre-postback default page state,
 *     confirmed by three separate WebFetch attempts against the same URL
 *     returning no candidate rows), unlike Texas's Civix portal, this
 *     wasn't a 403/bot-block — it's simply that a GET-only tool can't fire
 *     a WebForms `__doPostBack`.
 *   - The Contest dropdown's full option list (39 statewide/legislative/
 *     judicial/county contests) confirms there is no "United States
 *     Senator" contest anywhere in the 2026 general election — direct,
 *     positive confirmation of the no-Senate-race finding above, not an
 *     absence-of-evidence inference.
 *   - **Only two candidates qualified for the general ballot** — North
 *     Dakota's June 9, 2026 primary is fully certified and determined both
 *     parties' nominees outright (each was their party's sole primary
 *     filer per contemporaneous reporting; neither needed a primary
 *     contest). The Candidate List Results table for "Representative in
 *     Congress" returns exactly these two rows, no others:
 *     Julie Fedorchak (Republican) and Trygve Hammer (Democratic-NPL).
 *     No Libertarian, independent, or write-in filer appears — the
 *     independent-candidate petition-filing window (through Aug 31, 2026)
 *     was still open at this fixture's retrieval date, so this is the
 *     roster AS OF 2026-07-16, not a guarantee no independent will
 *     qualify later this cycle (see the NOT BEFORE follow-up card and the
 *     calendar dates below).
 *   - Party-code judgment call: North Dakota's Democratic Party is legally
 *     named the "Democratic-NPL Party" (a 1956 merger of the state
 *     Democratic Party with the historical Nonpartisan League) — it is the
 *     ND-specific name of the SAME national Democratic Party organization,
 *     not a distinct third party the way Arizona's AIP, Alaska's AKP,
 *     California's PF, Florida's LPF/FFP, or Kentucky's KYP each are. This
 *     is the opposite judgment call from those precedents: Hammer is coded
 *     with the existing `DEM` code, NOT a new `NPL` code — collapsing a
 *     state's own branding of a major party into the existing code, rather
 *     than fragmenting the enum for a distinction with no separate
 *     real-world party organization behind it. Fedorchak is coded `REP`
 *     (the portal lists her party as "Republican" verbatim).
 *   - INCUMBENCY was cross-checked against the official US House Clerk's
 *     member data feed (clerk.house.gov/xml/lists/MemberData.xml, a
 *     house.gov-domain source — house.gov's own human-facing
 *     "/representatives" page 403'd non-browser access, so the Clerk XML
 *     feed was used directly instead), NEVER from the candidate portal's
 *     own party label or this app's FEC-derived `candidates` table: Julie
 *     Fedorchak (R) is confirmed North Dakota's sitting at-large
 *     Representative, elected November 5, 2024, sworn in January 3, 2025 —
 *     matching the portal's listing exactly, no discrepancy.
 *   - District/office wiring: North Dakota's US House is a single at-large
 *     seat — races.ts's lookupChallengers zero-pads a numeric district of
 *     0 to districtKey "00" (see Alaska's and Wyoming's precedent); every
 *     House row below uses district "00", never null (null is reserved for
 *     a statewide Senate contest, which doesn't exist here).
 *   - Governing calendar dates (per the plan doc's item (e) — every
 *     still-governing date, not just pending nominations):
 *       - November 3, 2026 — general election day.
 *       - August 31, 2026, 4:00 p.m. — TWO deadlines coincide on this
 *         date, both the "sixty-fourth day before the election" per North
 *         Dakota Century Code: (1) NDCC 16.1-12-07's deadline for a
 *         nominated candidate to file written notice declining/
 *         withdrawing their general-election nomination (voids the
 *         certificate; a mailed notice must reach the Secretary of State
 *         within 48 hours after this deadline); (2) the SoS's own
 *         candidate calendar's "last day to circulate and file petitions
 *         for independent candidates" for the general election — so this
 *         is also the last date a new independent US House filer could
 *         join this race. After this date passes, this fixture's
 *         two-candidate field should be treated as materially more
 *         locked-in (an independent could no longer join; either
 *         nominee could still decline through Sept 2's 48-hour mail
 *         grace).
 *       - October 13, 2026, 4:00 p.m. — write-in candidacy filing deadline
 *         for the general election (per the SoS's candidate calendar).
 *       - No fixed date: NDCC 16.1-12-08 governs a vacancy arising AFTER
 *         ballots are already printed via a sticker-correction mechanism —
 *         event-triggered (a late death/disqualification), not a
 *         calendar deadline, so no date to record.
 *     A dated NOT BEFORE follow-up card should be opened per the epic's
 *     standing convention once this build lands, keyed to the August 31,
 *     2026 date above (the more consequential of the two, since it can
 *     add a new candidate, not just remove one).
 *
 * Sources:
 *   - https://vip.sos.nd.gov/candidatelist.aspx?eid=348 (ND Secretary of
 *     State VIP portal, "2026 General Election Contest/Candidate List",
 *     Contest = "Representative in Congress" (value 22055) — this
 *     fixture's direct source, retrieved 2026-07-16)
 *   - https://clerk.house.gov/xml/lists/MemberData.xml (incumbency
 *     cross-check only — official US House Clerk member data feed)
 *   - https://www.sos.nd.gov/elections/candidate/candidate-calendar (ND
 *     SoS's own candidate calendar — source of the governing-date findings
 *     above)
 *
 * Coverage: the single at-large US House seat. No Senate race this cycle.
 *
 * KNOWN LIMITATIONS:
 *   - This roster reflects the general-election candidate field AS OF
 *     2026-07-16. The independent-candidate petition window (through
 *     August 31, 2026) was still open at retrieval — see the governing
 *     calendar dates above and the dated follow-up card this build opens.
 *   - Names/party labels are recorded as they appear verbatim in the VIP
 *     portal's Candidate List Results table; not independently
 *     re-verified against a third document beyond the incumbency
 *     cross-check above (only two candidates exist, both already
 *     well-covered by contemporaneous ND Monitor / national reporting on
 *     this being a 2024 rematch — used as a spot-check only, never a
 *     primary source, per the SAFETY rule).
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const ND_STATE = "ND";
export const ND_ELECTION_YEAR = 2026;
// North Dakota's June 9, 2026 primary is fully certified — both major
// parties' nominations were determined outright (each candidate was their
// party's sole primary filer). Every row below reflects a determined
// general-ballot outcome, never a pending stage.
export const ND_STAGE = "general" as const;
export const ND_HOUSE_SOURCE_URLS = [
  "https://vip.sos.nd.gov/candidatelist.aspx?eid=348",
];
export const ND_RETRIEVED_AT = "2026-07-16";

// North Dakota's US House is a single at-large seat — races.ts's
// lookupChallengers zero-pads a numeric district of 0 to districtKey "00"
// (see Alaska's and Wyoming's precedent); every House row uses this
// district key, never null.
export const ND_HOUSE_DISTRICT = "00";

export const ND_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: ND_HOUSE_DISTRICT,
    name: "Julie Fedorchak",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: ND_HOUSE_DISTRICT,
    name: "Trygve Hammer",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
