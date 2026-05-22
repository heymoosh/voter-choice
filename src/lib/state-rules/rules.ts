/**
 * State party-gate rules table (Phase 5).
 *
 * SOLE source of truth for which states get a party gate, which options the
 * gate offers, and which statute backs the rule. Every rule is data — no
 * component branches on state name. Adding a new state means adding a row
 * here (and a fixture in state-rules.test.ts). Period.
 *
 * Ship targets (v1):
 *   - TX runoff overlay (semi-closed, §172.087)
 *   - PA closed primary (closed, 25 Pa. Code §2812)
 *   - CA top-two = NO ROW (lookup returns null)
 *
 * Template rows for GA, NY are kept as comments — they help future
 * contributors see the shape without making the v1 lookup non-null.
 *
 * See:
 *   - .ai/work-packets/redesign-phase-5-state-party-gates.md
 *   - docs/design/2026-redesign/Voter Choice Redesign.html §13 (rules table)
 */

import type { StateRule } from "./types";

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
};

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
};

/**
 * CA, GA, NY — template / no-row entries.
 *
 * California's top-two ("jungle") primary puts every candidate on one
 * ballot; there is NO gate. The lookup returns null for CA and the gate
 * route skips PartyGate entirely. We do not add a row.
 *
 * GA and NY are kept here as comments to help future contributors see
 * how the table grows. When wiring these up, copy a row into the array
 * below and add a fixture to state-rules.test.ts — no component edits.
 *
 * GA primary template (open + day-of choice, O.C.G.A. §21-2-224):
 *   {
 *     state: "GA",
 *     electionType: "primary",
 *     category: "open",
 *     statute: { code: "O.C.G.A. §21-2-224", text: "...", url: "..." },
 *     options: [
 *       { id: "pick_dem", label: "Show me the Democratic primary.", ballotTag: "DEM-primary" },
 *       { id: "pick_rep", label: "Show me the Republican primary.", ballotTag: "REP-primary" },
 *     ],
 *   }
 *
 * GA runoff would mirror TX_RUNOFF (locked to March choice). NY primary
 * would mirror PA_PRIMARY (closed with unaffiliated graceful path).
 */

/** Single source of truth — every shipped rule lives in this array. */
export const STATE_RULES: readonly StateRule[] = [TX_RUNOFF, PA_PRIMARY];
