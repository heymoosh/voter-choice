/**
 * Election-data completeness audit (backlog P1: "Election DATA must cover ANY
 * upcoming election for the address").
 *
 * Asserts, for every jurisdiction JSON in src/data/states/:
 *  1. The 2026-11-03 general election is present with type "general".
 *  2. No voter-facing "TODO" markers remain (notes are rendered to voters).
 *  3. Every election carries a `lastVerified` date (sourcing discipline).
 *  4. On a post-primary date, the resolved upcoming election is NOT a stale
 *     past primary — findUpcomingElection picks the general/runoff ahead.
 *  5. General elections never trigger a party gate (getStateRule null).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { findUpcomingElection } from "./getStateData";
import { getStateRule } from "./state-rules/lookup";
import type { StateElectionData } from "../types/election";

vi.mock("./electionToday", () => ({
  getTodayInLatestUsZone: () => MOCK_TODAY,
}));

let MOCK_TODAY = "2026-06-10";

const STATE_CODES = [
  "AK",
  "AL",
  "AR",
  "AZ",
  "CA",
  "CO",
  "CT",
  "DC",
  "DE",
  "FL",
  "GA",
  "HI",
  "IA",
  "ID",
  "IL",
  "IN",
  "KS",
  "KY",
  "LA",
  "MA",
  "MD",
  "ME",
  "MI",
  "MN",
  "MO",
  "MS",
  "MT",
  "NC",
  "ND",
  "NE",
  "NH",
  "NJ",
  "NM",
  "NV",
  "NY",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VA",
  "VT",
  "WA",
  "WI",
  "WV",
  "WY",
] as const;

async function loadRawStateJson(
  code: string,
): Promise<Record<string, unknown>> {
  const mod = (await import(`../data/states/${code}.json`)) as {
    default: Record<string, unknown>;
  };
  return mod.default;
}

describe("election data completeness (51 jurisdictions)", () => {
  beforeEach(() => {
    MOCK_TODAY = "2026-06-10";
  });

  it.each(STATE_CODES)(
    "%s carries the 2026-11-03 general election",
    async (code) => {
      const data = (await loadRawStateJson(
        code,
      )) as unknown as StateElectionData;
      const general = data.elections.find(
        (e) => e.date === "2026-11-03" && e.type === "general",
      );
      expect(
        general,
        `${code} is missing the 2026-11-03 general`,
      ).toBeDefined();
    },
  );

  it.each(STATE_CODES)("%s has no voter-facing TODO markers", async (code) => {
    const raw = await loadRawStateJson(code);
    // _sources is maintainer metadata, never rendered — exclude it.
    const { _sources: _ignored, ...voterFacing } = raw as {
      _sources?: unknown;
    } & Record<string, unknown>;
    const serialized = JSON.stringify(voterFacing);
    expect(
      /TODO/i.test(serialized),
      `${code} still contains a TODO marker in voter-facing data`,
    ).toBe(false);
  });

  it.each(STATE_CODES)("%s elections all carry lastVerified", async (code) => {
    const data = (await loadRawStateJson(code)) as unknown as StateElectionData;
    for (const election of data.elections) {
      expect(
        election.lastVerified,
        `${code} election ${election.id} is missing lastVerified`,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it.each(STATE_CODES)(
    "%s resolves a FUTURE election on a post-primary date (never stuck on a past primary)",
    async (code) => {
      MOCK_TODAY = "2026-10-01";
      const data = (await loadRawStateJson(
        code,
      )) as unknown as StateElectionData;
      const upcoming = findUpcomingElection(data.elections);
      expect(upcoming, `${code} resolved no election`).not.toBeNull();
      expect(
        upcoming!.date >= MOCK_TODAY,
        `${code} resolved ${upcoming!.id} (${upcoming!.date}) — a PAST election — on ${MOCK_TODAY}`,
      ).toBe(true);
    },
  );

  it.each(STATE_CODES)(
    "%s general election never triggers a party gate",
    (code) => {
      expect(getStateRule(code, "general")).toBeNull();
    },
  );
});
