/**
 * State party-gate rules table (Phase 5 + 5b comprehensive fill).
 *
 * SOLE source of truth for which states get a party gate, which options the
 * gate offers, and which statute backs the rule. Every rule is data — no
 * component branches on state name. Adding a new state means adding a row
 * here (and a fixture in state-rules.test.ts). Period.
 *
 * Coverage (v1 + 5b):
 *   - Closed primaries (party-registration required):
 *       CT, DE, DC, FL, KS, KY, MD, NV, NM, NY, OK, OR, PA, WY
 *   - Semi-closed primaries (registered + unaffiliated paths):
 *       AZ, CO, IA, NH, NJ, RI, WV
 *   - Runoff overlays (Texas-style party-lock):
 *       AL, AR, GA, MS, NC, OK, SC, TX
 *
 * No row (lookup returns null, gate is skipped):
 *   - Open primaries (any voter picks): AL, AR, GA, HI, IL, IN, MI, MN, MO,
 *     MS, MT, NC, ND, OH, SC, SD, TN, UT, VT, VA, WI
 *     (these have open primaries — runoff overlays for AL/AR/GA/MS/NC/SC
 *     ship as separate runoff rows above)
 *   - Top-two / jungle / top-four: AK, CA, LA, WA
 *   - Any (state, electionType) not enumerated below
 *
 * Citation strategy: statute codes are sourced from the canonical SOS-
 * curated per-state data files in src/data/states/*.json (each carries a
 * `checked` date and `primaryParticipation.ruleExplanationEn`). URLs are
 * the canonical SOS pages from those same files — we do not fork the URL
 * source of truth.
 *
 * See:
 *   - .ai/work-packets/redesign-phase-5-state-party-gates.md
 *   - docs/design/2026-redesign/Voter Choice Redesign.html §13 (rules table)
 */

import type { StateRule } from "./types";

// ---------------------------------------------------------------------------
// Runoff-overlay states (Texas pattern: party-lock to first-round primary)
// ---------------------------------------------------------------------------

/**
 * Texas — primary runoff overlay (§172.087). If a voter participated in
 * one party's primary, they may only vote in that same party's runoff
 * (semi-closed). Voters who skipped the primary may pick either runoff
 * (it stays open to them). "I'm not sure" routes to clarification.
 */
const TX_RUNOFF: StateRule = {
  state: "TX",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "Tex. Elec. Code §172.087",
    text: "If you voted in one party's March primary, you may only vote in that same party's runoff.",
    url: "https://statutes.capitol.texas.gov/Docs/EL/htm/EL.172.htm",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label: "I did not vote in the primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label: "I did not vote in the primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
  // URLs cite the canonical paths used elsewhere in the codebase
  // (src/data/states/TX.json — registrationCheckUrl + countyElectionLookup)
  // so we don't fork the URL source of truth.
  externalResources: {
    sosVoterLookupUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
    countyElectionsLocatorUrl: "https://www.votetexas.gov/voting/where.html",
    lookupInstructions:
      "Look up your March primary voting history through the Texas SOS Voter Lookup, or call your county elections office.",
  },
};

/** Georgia — runoff overlay (O.C.G.A. §21-2-501). Same shape as TX. */
const GA_RUNOFF: StateRule = {
  state: "GA",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "O.C.G.A. §21-2-501",
    text: "If you voted in one party's primary, you may only vote in that same party's runoff. Voters who skipped the primary may pick either runoff.",
    url: "https://sos.ga.gov/elections-division",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label: "I did not vote in the primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label: "I did not vote in the primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://mvp.sos.ga.gov/",
    countyElectionsLocatorUrl:
      "https://elections.sos.ga.gov/Elections/countyregistrars.do",
    lookupInstructions:
      "Look up your primary voting history at the Georgia My Voter Page, or contact your county registrar.",
  },
};

/** Alabama — runoff overlay (Ala. Code §17-13-101). */
const AL_RUNOFF: StateRule = {
  state: "AL",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "Ala. Code §17-13-101",
    text: "If you voted in one party's primary, you may only vote in that same party's runoff. Voters who skipped the primary may pick either runoff.",
    url: "https://www.sos.alabama.gov/alabama-votes",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label: "I did not vote in the primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label: "I did not vote in the primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://myinfo.alabamavotes.gov/voterview",
    countyElectionsLocatorUrl:
      "https://www.sos.alabama.gov/alabama-votes/county-election-offices",
    lookupInstructions:
      "Look up your primary voting history at the Alabama Voter Information Portal, or call your county election office.",
  },
};

/** Arkansas — runoff overlay (Ark. Code §7-7-202). */
const AR_RUNOFF: StateRule = {
  state: "AR",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "Ark. Code §7-7-202",
    text: "If you voted in one party's primary, you may only vote in that same party's runoff. Voters who skipped the primary may pick either runoff.",
    url: "https://www.sos.arkansas.gov/elections/",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label: "I did not vote in the primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label: "I did not vote in the primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://www.voterview.ar-nova.org/voterview",
    countyElectionsLocatorUrl:
      "https://www.sos.arkansas.gov/elections/county-clerks/",
    lookupInstructions:
      "Look up your primary voting history at the Arkansas Voter View, or call your county clerk.",
  },
};

/** Mississippi — runoff overlay (Miss. Code §23-15-781). */
const MS_RUNOFF: StateRule = {
  state: "MS",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "Miss. Code §23-15-781",
    text: "If you voted in one party's primary, you may only vote in that same party's runoff. Voters who skipped the primary may pick either runoff.",
    url: "https://www.sos.ms.gov/elections-voting",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label: "I did not vote in the primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label: "I did not vote in the primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
  externalResources: {
    sosVoterLookupUrl:
      "https://www.msegov.com/sos/voter_registration/AmIRegistered",
    countyElectionsLocatorUrl:
      "https://www.sos.ms.gov/elections-voting/circuit-clerks",
    lookupInstructions:
      "Look up your primary voting history at the Mississippi Voter Registration Lookup, or call your county circuit clerk.",
  },
};

/**
 * North Carolina — runoff (second-primary) overlay (N.C. Gen. Stat. §163-110).
 * NC's primary itself is OPEN — no primary row. Only the second-primary
 * (runoff) carries the party-lock rule.
 */
const NC_RUNOFF: StateRule = {
  state: "NC",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "N.C. Gen. Stat. §163-110",
    text: "If you voted in one party's first primary, you may only vote in that same party's second primary (runoff). Unaffiliated voters who skipped the primary may pick either runoff.",
    url: "https://www.ncsbe.gov/",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label:
        "I did not vote in the first primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label:
        "I did not vote in the first primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://vt.ncsbe.gov/RegLkup/",
    countyElectionsLocatorUrl:
      "https://www.ncsbe.gov/about-elections/county-board-elections/county-boards-elections",
    lookupInstructions:
      "Look up your first-primary voting history at the NC State Board of Elections lookup, or contact your county board of elections.",
  },
};

/**
 * Oklahoma — runoff overlay. OK is one of two states with BOTH a closed
 * primary AND a runoff overlay (the other is the TX runoff with no primary
 * row). The primary row is `OK_PRIMARY` below.
 */
const OK_RUNOFF: StateRule = {
  state: "OK",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "Okla. Stat. tit. 26 §1-104",
    text: "If you voted in one party's primary, you may only vote in that same party's runoff. Voters who skipped the primary may pick either runoff.",
    url: "https://www.elections.ok.gov/",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label: "I did not vote in the primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label: "I did not vote in the primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://okvoterportal.okelections.us/",
    countyElectionsLocatorUrl:
      "https://www.elections.ok.gov/county-election-board-information/",
    lookupInstructions:
      "Look up your primary voting history at the Oklahoma Voter Portal, or call your county election board.",
  },
};

/** South Carolina — runoff overlay (S.C. Code §7-13-15). */
const SC_RUNOFF: StateRule = {
  state: "SC",
  electionType: "runoff",
  category: "semi-closed",
  statute: {
    code: "S.C. Code §7-13-15",
    text: "If you voted in one party's primary, you may only vote in that same party's runoff. Voters who skipped the primary may pick either runoff.",
    url: "https://www.scvotes.net/",
  },
  options: [
    {
      id: "voted_dem_primary",
      label: "I voted in the Democratic primary.",
      ballotTag: "DEM-runoff",
    },
    {
      id: "voted_rep_primary",
      label: "I voted in the Republican primary.",
      ballotTag: "REP-runoff",
    },
    {
      id: "did_not_vote_dem_runoff",
      label: "I did not vote in the primary. Show me the Democratic runoff.",
      ballotTag: "DEM-runoff-open",
    },
    {
      id: "did_not_vote_rep_runoff",
      label: "I did not vote in the primary. Show me the Republican runoff.",
      ballotTag: "REP-runoff-open",
    },
    {
      id: "unsure",
      label: "I'm not sure. Help me figure out which runoff applies.",
      ballotTag: "UNSURE",
      clarification: true,
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://www.scvotes.net/check-your-registration",
    countyElectionsLocatorUrl:
      "https://www.scvotes.net/county-election-commissions",
    lookupInstructions:
      "Look up your primary voting history at the SC Votes lookup, or contact your county election commission.",
  },
};

// ---------------------------------------------------------------------------
// Closed-primary states (party-registration required; unaffiliated path)
// ---------------------------------------------------------------------------

/**
 * Pennsylvania — closed primary (25 Pa. Code §2812). Voters may only
 * participate in the primary of the party they registered with. v1
 * cannot read the precinct file, so we ask the voter their registration
 * party with a "we'll trust your answer" framing; unaffiliated voters
 * see a graceful blocker with a SOS re-registration link.
 */
const PA_PRIMARY: StateRule = {
  state: "PA",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "25 Pa. Code §2812",
    text: "Pennsylvania primary elections are closed: you may vote only in the primary of the party you registered with.",
    url: "https://www.pacode.com/secure/data/025/chapter183/chap183toc.html",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Pennsylvania closes its primaries to registered party members. If you are not registered with a party, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl:
      "https://www.pa.gov/en/agencies/vote/Voter-Registration.html",
    canSkipToGeneral: true,
  },
  // URLs cite the canonical paths used elsewhere in the codebase
  // (src/data/states/PA.json — registrationCheckUrl + countyElectionLookup)
  // so we don't fork the URL source of truth.
  externalResources: {
    sosVoterLookupUrl:
      "https://www.vote.pa.gov/Register-to-Vote/Pages/Voter-Registration-Search.aspx",
    countyElectionsLocatorUrl:
      "https://www.vote.pa.gov/Resources/Pages/Contact-Your-Election-Officials.aspx",
    lookupInstructions:
      "Check your registered party through the Pennsylvania Voter Registration Search, or contact your county elections office.",
  },
};

/** Connecticut — closed primary (Conn. Gen. Stat. §9-431, per packet; data file cites §9-395 for same rule). */
const CT_PRIMARY: StateRule = {
  state: "CT",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Conn. Gen. Stat. §9-431",
    text: "Connecticut primary elections are closed: you may vote only in the primary of the party you are enrolled with.",
    url: "https://portal.ct.gov/SOTS/Election-Services/Election-Information/Election-Information",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm enrolled as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm enrolled as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Connecticut closes its primaries to enrolled party members. If you are not enrolled with a party, you cannot vote in this primary — but you can enroll for next cycle, and you can still see general-election context now.",
    reregistrationUrl: "https://voterregistration.ct.gov/OLVR/welcome.do",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl: "https://portaldir.ct.gov/sots/LookUp.aspx",
    countyElectionsLocatorUrl:
      "https://portal.ct.gov/SOTS/Election-Services/Voter-Information/Town-Clerks",
    lookupInstructions:
      "Check your party enrollment at the Connecticut Voter Registration Lookup, or contact your town clerk.",
  },
};

/** Delaware — closed primary (Del. Code Title 15 §3110, per packet; data file cites §3101A for related rule). */
const DE_PRIMARY: StateRule = {
  state: "DE",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Del. Code Title 15 §3110",
    text: "Delaware primary elections are closed: you may vote only in the primary of the party you registered with.",
    url: "https://elections.delaware.gov/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Delaware closes its primaries to registered party members. If you are not registered with a party, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl: "https://ivote.de.gov/",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl: "https://ivote.de.gov/voterlogin.aspx",
    countyElectionsLocatorUrl:
      "https://elections.delaware.gov/information/countyoffices.shtml",
    lookupInstructions:
      "Check your registered party at the Delaware iVote portal, or contact your county elections office.",
  },
};

/** Florida — closed primary (Fla. Stat. §101.021). */
const FL_PRIMARY: StateRule = {
  state: "FL",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Fla. Stat. §101.021",
    text: "Florida primary elections are closed: you may vote only in the primary of the party you registered with. NPA and minor-party voters cannot vote in major-party primaries.",
    url: "https://dos.myflorida.com/elections/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Florida closes its primaries to registered party members. If you are registered with no party affiliation (NPA) or a minor party, you cannot vote in this major-party primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl:
      "https://registertovoteflorida.gov/en/Registration/Index",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl:
      "https://registration.elections.myflorida.com/CheckVoterStatus",
    countyElectionsLocatorUrl:
      "https://dos.myflorida.com/elections/for-voters/election-offices/",
    lookupInstructions:
      "Check your registered party at the Florida Voter Information Lookup, or contact your county supervisor of elections.",
  },
};

/**
 * Kansas — closed primary (Kan. Stat. §25-3301).
 * Packet hint listed KS as semi-closed; the SOS-curated data file in
 * src/data/states/KS.json classifies it as closed (~30% of KS voters are
 * unaffiliated and locked out of major-party primaries). Going with the
 * data-file ground truth.
 */
const KS_PRIMARY: StateRule = {
  state: "KS",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Kan. Stat. §25-3301",
    text: "Kansas primary elections are closed: you may vote only in the primary of the party you registered with.",
    url: "https://sos.ks.gov/elections/elections-home.html",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Kansas closes its primaries to registered party members. If you are unaffiliated, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl:
      "https://www.kssos.org/elections/elections_registration.html",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl:
      "https://www.kssos.org/elections/elections_voterquery.aspx",
    countyElectionsLocatorUrl:
      "https://www.kssos.org/elections/elections_county.html",
    lookupInstructions:
      "Check your registered party at the Kansas Voter Lookup, or contact your county election office.",
  },
};

/** Kentucky — closed primary (Ky. Rev. Stat. §116.044; data file cites §118.245 for related rule). */
const KY_PRIMARY: StateRule = {
  state: "KY",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Ky. Rev. Stat. §116.044",
    text: "Kentucky primary elections are closed: you may vote only in the primary of the party you registered with. Party affiliation must be set by December 31 of the prior year.",
    url: "https://elect.ky.gov/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Kentucky closes its primaries to registered party members. If you are not registered with a party, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl: "https://vrsws.sos.ky.gov/ovrweb/",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl: "https://vrsws.sos.ky.gov/VICweb/",
    countyElectionsLocatorUrl:
      "https://elect.ky.gov/About-Us/Pages/County-Clerks.aspx",
    lookupInstructions:
      "Check your registered party at the Kentucky Voter Information Center, or contact your county clerk.",
  },
};

/** Maryland — closed primary (Md. Code Ann., Elec. Law §3-202; data file cites §10-201 for related rule). */
const MD_PRIMARY: StateRule = {
  state: "MD",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Md. Code Ann., Elec. Law §3-202",
    text: "Maryland primary elections are closed: you may vote only in the primary of the party you registered with. Approximately 1 in 4 MD voters is unaffiliated and locked out of major-party primaries.",
    url: "https://elections.maryland.gov/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Maryland closes its primaries to registered party members. If you are unaffiliated, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl:
      "https://voterservices.elections.maryland.gov/OnlineVoterRegistration/InstructionsStep1",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl:
      "https://voterservices.elections.maryland.gov/votersearch",
    countyElectionsLocatorUrl:
      "https://elections.maryland.gov/about/county_boards.html",
    lookupInstructions:
      "Check your registered party at the Maryland Voter Search, or contact your local board of elections.",
  },
};

/** Nevada — closed primary (Nev. Rev. Stat. §293.287; data file cites §293.175 for related rule). */
const NV_PRIMARY: StateRule = {
  state: "NV",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Nev. Rev. Stat. §293.287",
    text: "Nevada primary elections are closed: you may vote only in the primary of the party you registered with. Nonpartisan and minor-party voters cannot vote in major-party primaries.",
    url: "https://www.nvsos.gov/sos/elections",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Nevada closes its primaries to registered party members. If you are registered as nonpartisan or with a minor party, you cannot vote in this major-party primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl:
      "https://www.nvsos.gov/sos/elections/voters/registering-to-vote",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl:
      "https://www.nvsos.gov/sos/elections/voters/view-your-voter-information",
    countyElectionsLocatorUrl:
      "https://www.nvsos.gov/sos/elections/voters/find-your-election-officials",
    lookupInstructions:
      "Check your registered party at the Nevada Voter Information Lookup, or contact your county clerk.",
  },
};

/** New Mexico — closed primary (N.M. Stat. §1-12-7; data file cites NMSA §1-8-16 for related rule). */
const NM_PRIMARY: StateRule = {
  state: "NM",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "N.M. Stat. §1-12-7",
    text: "New Mexico primary elections are closed: you may vote only in the primary of the party you registered with.",
    url: "https://www.sos.nm.gov/voting-and-elections/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "New Mexico closes its primaries to registered party members. If you are independent or unaffiliated, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl:
      "https://portal.sos.state.nm.us/OVR/WebPages/InstructionsStep1.aspx",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl: "https://voterportal.servis.sos.nm.gov/WhereToVote.aspx",
    countyElectionsLocatorUrl:
      "https://voterportal.servis.sos.nm.gov/WhereToVote.aspx",
    lookupInstructions:
      "Check your registered party at the New Mexico Voter Portal, or contact your county clerk.",
  },
};

/** New York — closed primary (N.Y. Elec. Law §5-300; data file cites §6-100). */
const NY_PRIMARY: StateRule = {
  state: "NY",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "N.Y. Elec. Law §5-300",
    text: "New York primary elections are closed: you may vote only in the primary of the party you are enrolled in. Enrollment changes take effect for the following year's primary.",
    url: "https://www.elections.ny.gov/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm enrolled as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm enrolled as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "New York closes its primaries to enrolled party members. If you are not enrolled with a party (independent, blank, or unaffiliated), you cannot vote in this primary — but you can enroll for next cycle, and you can still see general-election context now.",
    reregistrationUrl: "https://www.elections.ny.gov/register.html",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl: "https://voterlookup.elections.ny.gov/",
    countyElectionsLocatorUrl: "https://www.elections.ny.gov/CountyBoards.html",
    lookupInstructions:
      "Check your party enrollment at the New York Voter Lookup, or contact your county board of elections.",
  },
};

/**
 * Oklahoma — closed primary (Okla. Stat. tit. 26 §1-104).
 * OK is one of the few states with BOTH a closed primary and a party-locked
 * runoff. See OK_RUNOFF above for the runoff overlay. Both ship as
 * separate rows; the lookup discriminates on `electionType`.
 */
const OK_PRIMARY: StateRule = {
  state: "OK",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Okla. Stat. tit. 26 §1-104",
    text: "Oklahoma primary elections are closed (effective for 2026): you may vote only in the primary of the party you registered with. Both major parties run closed primaries this cycle.",
    url: "https://www.elections.ok.gov/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Oklahoma closes its primaries to registered party members for the 2026 cycle. If you are unaffiliated, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl: "https://okvoterportal.okelections.us/",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl: "https://okvoterportal.okelections.us/",
    countyElectionsLocatorUrl:
      "https://www.elections.ok.gov/county-election-board-information/",
    lookupInstructions:
      "Check your registered party at the Oklahoma Voter Portal, or contact your county election board.",
  },
};

/** Oregon — closed primary (Or. Rev. Stat. §247.121; data file cites ORS §249.025). */
const OR_PRIMARY: StateRule = {
  state: "OR",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Or. Rev. Stat. §247.121",
    text: "Oregon primary elections are closed: you may vote only in the primary of the party you registered with. Oregon conducts elections entirely by mail.",
    url: "https://sos.oregon.gov/voting/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Oregon closes its primaries to registered party members. If you are not registered with a party, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl:
      "https://sos.oregon.gov/voting/Pages/registeringwhereyoulive.aspx",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl: "https://sos.oregon.gov/voting/Pages/myvote.aspx",
    countyElectionsLocatorUrl:
      "https://sos.oregon.gov/voting/Pages/countyofficials.aspx",
    lookupInstructions:
      "Check your registered party at the Oregon MyVote lookup, or contact your county elections office.",
  },
};

/** Wyoming — closed primary (Wyo. Stat. §22-5-212; data file cites §22-5-101). */
const WY_PRIMARY: StateRule = {
  state: "WY",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "Wyo. Stat. §22-5-212",
    text: "Wyoming primary elections are closed: you may vote only in the primary of the party you registered with. Voters may change party affiliation at the polls on Election Day.",
    url: "https://sos.wyo.gov/elections/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Wyoming closes its primaries to registered party members — though you can change your party affiliation at the polls on Election Day. If you would rather plan ahead, the SOS link below lets you re-register before then. You can still see general-election context now.",
    reregistrationUrl: "https://sos.wyo.gov/elections/register.aspx",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl: "https://sos.wyo.gov/elections/register.aspx",
    countyElectionsLocatorUrl:
      "https://sos.wyo.gov/elections/countycontacts.aspx",
    lookupInstructions:
      "Check your registration at the Wyoming SOS portal, or contact your county clerk.",
  },
};

/** Washington, D.C. — closed primary (D.C. Code §1-1001.09; data file cites §1-1001.14). */
const DC_PRIMARY: StateRule = {
  state: "DC",
  electionType: "primary",
  category: "closed",
  statute: {
    code: "D.C. Code §1-1001.09",
    text: "District of Columbia primary elections are closed: you may vote only in the primary of the party you registered with.",
    url: "https://dcboe.org/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
  ],
  unaffiliatedPath: {
    message:
      "Washington, D.C. closes its primaries to registered party members. If you are unaffiliated or independent, you cannot vote in this primary — but you can re-register for next cycle, and you can still see general-election context now.",
    reregistrationUrl:
      "https://dcboe.org/Voters/Register-To-Vote/Online-Voter-Registration",
    canSkipToGeneral: true,
  },
  externalResources: {
    sosVoterLookupUrl:
      "https://dcboe.org/Voters/Register-To-Vote/Voter-Registration-Status",
    countyElectionsLocatorUrl: "https://dcboe.org/",
    lookupInstructions:
      "Check your registered party at the D.C. Board of Elections, or call the DCBOE.",
  },
};

// ---------------------------------------------------------------------------
// Semi-closed primary states (registered party + unaffiliated paths)
// ---------------------------------------------------------------------------

/**
 * Semi-closed shape: 4 options — registered DEM, registered REP, unaffiliated
 * → DEM, unaffiliated → REP. No `unaffiliatedPath` block because unaffiliated
 * voters CAN vote (just choose which party's ballot at the polls / in the
 * mail). Distinct from closed states where unaffiliated voters are locked out.
 */

/** Arizona — semi-closed primary (Ariz. Rev. Stat. §16-467). */
const AZ_PRIMARY: StateRule = {
  state: "AZ",
  electionType: "primary",
  category: "semi-closed",
  statute: {
    code: "Ariz. Rev. Stat. §16-467",
    text: "Arizona primary elections are semi-closed: registered party members vote in their party's primary; independent or no-party-preference voters may request either party's primary ballot.",
    url: "https://azsos.gov/elections",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
    {
      id: "unaffiliated_dem",
      label: "I'm unaffiliated — show me the Democratic primary.",
      ballotTag: "DEM-primary-open",
    },
    {
      id: "unaffiliated_rep",
      label: "I'm unaffiliated — show me the Republican primary.",
      ballotTag: "REP-primary-open",
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://my.arizona.vote/PortalList.aspx",
    countyElectionsLocatorUrl: "https://my.arizona.vote/PortalList.aspx",
    lookupInstructions:
      "Check your registration at the Arizona Voter Portal, or contact your county recorder.",
  },
};

/** Colorado — semi-closed primary (Colo. Rev. Stat. §1-7-201). */
const CO_PRIMARY: StateRule = {
  state: "CO",
  electionType: "primary",
  category: "semi-closed",
  statute: {
    code: "Colo. Rev. Stat. §1-7-201",
    text: "Colorado primary elections are semi-closed: registered party members vote in their party's primary; unaffiliated voters receive both party ballots and may return only one.",
    url: "https://www.coloradosos.gov/voter/pages/pub/home.xhtml",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
    {
      id: "unaffiliated_dem",
      label: "I'm unaffiliated — I'll return the Democratic primary ballot.",
      ballotTag: "DEM-primary-open",
    },
    {
      id: "unaffiliated_rep",
      label: "I'm unaffiliated — I'll return the Republican primary ballot.",
      ballotTag: "REP-primary-open",
    },
  ],
  externalResources: {
    sosVoterLookupUrl:
      "https://www.coloradosos.gov/voter/pages/pub/olvr/verifyNewVoter.xhtml",
    countyElectionsLocatorUrl:
      "https://www.coloradosos.gov/voter/pages/pub/home.xhtml",
    lookupInstructions:
      "Check your registration at the Colorado Voter Lookup, or contact your county clerk.",
  },
};

/**
 * Iowa — semi-closed primary (Iowa Code §43.41).
 * IA has day-of registration; an unaffiliated voter who picks a ballot
 * affiliates on the spot. We frame it as a semi-closed 4-option gate.
 */
const IA_PRIMARY: StateRule = {
  state: "IA",
  electionType: "primary",
  category: "semi-closed",
  statute: {
    code: "Iowa Code §43.41",
    text: "Iowa primary elections are semi-closed: registered party members vote in their party's primary; no-party (independent) voters may affiliate at the polls and request either party's ballot.",
    url: "https://sos.iowa.gov/elections/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
    {
      id: "unaffiliated_dem",
      label:
        "I'm no-party — I'll affiliate at the polls and vote the Democratic primary.",
      ballotTag: "DEM-primary-open",
    },
    {
      id: "unaffiliated_rep",
      label:
        "I'm no-party — I'll affiliate at the polls and vote the Republican primary.",
      ballotTag: "REP-primary-open",
    },
  ],
  externalResources: {
    sosVoterLookupUrl:
      "https://sos.iowa.gov/elections/voterreg/regtovote/search.aspx",
    countyElectionsLocatorUrl:
      "https://sos.iowa.gov/elections/auditors/auditorslist.html",
    lookupInstructions:
      "Check your registration at the Iowa SOS lookup, or contact your county auditor.",
  },
};

/** New Hampshire — semi-closed primary (N.H. Rev. Stat. §659:14). */
const NH_PRIMARY: StateRule = {
  state: "NH",
  electionType: "primary",
  category: "semi-closed",
  statute: {
    code: "N.H. Rev. Stat. §659:14",
    text: "New Hampshire primary elections are semi-open: registered party members vote in their party's primary; voters registered as 'undeclared' may request either party's ballot and may re-register as undeclared after voting.",
    url: "https://www.sos.nh.gov/elections",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
    {
      id: "unaffiliated_dem",
      label: "I'm undeclared — show me the Democratic primary.",
      ballotTag: "DEM-primary-open",
    },
    {
      id: "unaffiliated_rep",
      label: "I'm undeclared — show me the Republican primary.",
      ballotTag: "REP-primary-open",
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://app.sos.nh.gov/viphome",
    countyElectionsLocatorUrl: "https://app.sos.nh.gov/viphome",
    lookupInstructions:
      "Check your registration at the NH Voter Information Portal, or contact your town clerk.",
  },
};

/**
 * New Jersey — semi-closed primary (N.J. Stat. Ann. §19:5-1).
 * NJ allows unaffiliated voters to affiliate at the polls on primary day —
 * no `unaffiliatedPath` lock-out. 4-option semi-closed shape.
 */
const NJ_PRIMARY: StateRule = {
  state: "NJ",
  electionType: "primary",
  category: "semi-closed",
  statute: {
    code: "N.J. Stat. Ann. §19:5-1",
    text: "New Jersey primary elections are semi-closed: registered party members vote in their party's primary; unaffiliated voters may affiliate with a party at the polls on primary day.",
    url: "https://www.state.nj.us/state/elections/index.shtml",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm a registered Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm a registered Republican.",
      ballotTag: "REP-primary",
    },
    {
      id: "unaffiliated_dem",
      label:
        "I'm unaffiliated — I'll affiliate at the polls and vote the Democratic primary.",
      ballotTag: "DEM-primary-open",
    },
    {
      id: "unaffiliated_rep",
      label:
        "I'm unaffiliated — I'll affiliate at the polls and vote the Republican primary.",
      ballotTag: "REP-primary-open",
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://voter.svrs.nj.gov/registration-check",
    countyElectionsLocatorUrl:
      "https://www.nj.gov/state/elections/county-boards.shtml",
    lookupInstructions:
      "Check your registration at the New Jersey Voter Registration Check, or contact your county board of elections.",
  },
};

/** Rhode Island — semi-closed primary (R.I. Gen. Laws §17-9.1-23; data file cites §17-15-24). */
const RI_PRIMARY: StateRule = {
  state: "RI",
  electionType: "primary",
  category: "semi-closed",
  statute: {
    code: "R.I. Gen. Laws §17-9.1-23",
    text: "Rhode Island primary elections are semi-closed: registered party members vote in their party's primary; unaffiliated voters may request either party's ballot.",
    url: "https://vote.sos.ri.gov/",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
    {
      id: "unaffiliated_dem",
      label: "I'm unaffiliated — show me the Democratic primary.",
      ballotTag: "DEM-primary-open",
    },
    {
      id: "unaffiliated_rep",
      label: "I'm unaffiliated — show me the Republican primary.",
      ballotTag: "REP-primary-open",
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://vote.sos.ri.gov/",
    countyElectionsLocatorUrl:
      "https://vote.sos.ri.gov/Voter/LocalBoardsOfCanvassers",
    lookupInstructions:
      "Check your registration at the Rhode Island Voter Information Center, or contact your local board of canvassers.",
  },
};

/**
 * West Virginia — semi-closed primary (W. Va. Code §3-1-35; data file cites §3-4A-24).
 * REP is closed; DEM allows unaffiliated voters to participate. We model it
 * as the standard 4-option semi-closed shape — the lane labels do the work
 * of telling the voter what the parties currently permit. (If REP narrows
 * again, only the label changes — the rules table absorbs that as a data
 * edit; no component touch.)
 */
const WV_PRIMARY: StateRule = {
  state: "WV",
  electionType: "primary",
  category: "semi-closed",
  statute: {
    code: "W. Va. Code §3-1-35",
    text: "West Virginia primary elections are semi-closed: registered party members vote in their party's primary; the Democratic Party currently allows unaffiliated voters to vote in the Democratic primary.",
    url: "https://sos.wv.gov/elections/Pages/default.aspx",
  },
  options: [
    {
      id: "registered_dem",
      label: "I'm registered as a Democrat.",
      ballotTag: "DEM-primary",
    },
    {
      id: "registered_rep",
      label: "I'm registered as a Republican.",
      ballotTag: "REP-primary",
    },
    {
      id: "unaffiliated_dem",
      label: "I'm unaffiliated — show me the Democratic primary.",
      ballotTag: "DEM-primary-open",
    },
    {
      id: "unaffiliated_rep",
      label:
        "I'm unaffiliated — show me the Republican primary (if open this cycle).",
      ballotTag: "REP-primary-open",
    },
  ],
  externalResources: {
    sosVoterLookupUrl: "https://apps.sos.wv.gov/elections/voter/find.aspx",
    countyElectionsLocatorUrl:
      "https://sos.wv.gov/elections/Pages/CountyClerks.aspx",
    lookupInstructions:
      "Check your registration at the WV SOS Voter Lookup, or contact your county clerk.",
  },
};

// ---------------------------------------------------------------------------
// Template / no-row entries (kept for documentation)
// ---------------------------------------------------------------------------

/**
 * CA — no-row template.
 *
 * California's top-two ("jungle") primary puts every candidate on one
 * ballot; there is NO gate. The lookup returns null for CA and the gate
 * route skips PartyGate entirely. We do not add a row.
 *
 * Similarly:
 *   - AK uses a top-four open primary (Ballot Measure 2, 2020) → no row.
 *   - LA uses a jungle primary; its "runoff" is a general-election runoff
 *     between top-two (not party-locked) → no row for either electionType.
 *   - WA top-two → no row.
 *   - Open-primary states (AL/AR/GA/IL/IN/MI/MN/MO/MS/MT/NC/ND/OH/SC/SD/
 *     TN/UT/VT/VA/WI/HI) → no primary row. AL/AR/GA/MS/NC/SC ship runoff
 *     rows only (party-lock kicks in at the runoff stage).
 *
 * Adding a new state's rule is a row in the array below + a fixture in
 * state-rules.test.ts — no component edits. The GA and NY rules below
 * shipped as part of Phase 5b; this comment block remains as the canonical
 * "how to extend" reference for future contributors.
 */

/** Single source of truth — every shipped rule lives in this array. */
export const STATE_RULES: readonly StateRule[] = [
  // Runoff overlays
  TX_RUNOFF,
  GA_RUNOFF,
  AL_RUNOFF,
  AR_RUNOFF,
  MS_RUNOFF,
  NC_RUNOFF,
  OK_RUNOFF,
  SC_RUNOFF,
  // Closed primaries
  PA_PRIMARY,
  CT_PRIMARY,
  DE_PRIMARY,
  DC_PRIMARY,
  FL_PRIMARY,
  KS_PRIMARY,
  KY_PRIMARY,
  MD_PRIMARY,
  NV_PRIMARY,
  NM_PRIMARY,
  NY_PRIMARY,
  OK_PRIMARY,
  OR_PRIMARY,
  WY_PRIMARY,
  // Semi-closed primaries
  AZ_PRIMARY,
  CO_PRIMARY,
  IA_PRIMARY,
  NH_PRIMARY,
  NJ_PRIMARY,
  RI_PRIMARY,
  WV_PRIMARY,
];
