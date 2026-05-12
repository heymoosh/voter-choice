import { afterEach, describe, expect, it, vi } from "vitest";
import { loadStateData } from "@/lib/stateDataLoader";
import type { StateData } from "@/types/state";

const mockStateData: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-general",
      name: "2026 Texas General Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
    {
      id: "tx-2026-primary",
      name: "2026 Texas Primary Election",
      date: "2026-03-03",
      type: "primary",
      isPrimary: true,
      primaryType: "open",
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-10-05",
      url: "https://www.votetexas.gov",
    },
    byMail: { deadline: "2026-10-05", sincePostmarked: true },
    inPerson: { deadline: "2026-11-03", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19",
    endDate: "2026-10-30",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license", "Texas ID card"],
    phonesAtPolls: "prohibited",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

describe("loadStateData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads state data and builds a prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockStateData),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadStateData("TX", "73301");

    expect(fetchMock).toHaveBeenCalledWith("/api/state/TX");
    expect(result.stateData).toEqual(mockStateData);
    expect(result.prompt).toContain("Texas");
    expect(result.prompt).toContain("73301");
  });

  it("throws when the API responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(loadStateData("ZZ", "00000")).rejects.toThrow(
      "State data unavailable",
    );
  });
});
