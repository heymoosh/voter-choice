import { describe, it, expect, vi, afterEach } from "vitest";
import {
  seatOverviewAlignmentPct,
  seatIssueAlignmentRows,
  issuesForSeatCard,
  deriveMoneyInfluence,
  deriveIssueMoneyVerdict,
  deriveVoteLinkage,
  fetchDelegation,
  type UserIssue,
  type DonorCoalitionSlice,
} from "./delegationData";

const vote = (canonicalIssue: string, kept: number, total: number) => ({
  canonicalIssue,
  issueLabel: canonicalIssue,
  resolvedStance: "in_favor",
  sourceType: "voting_record",
  kept,
  total,
});

const issue = (
  canonicalIssue: string,
  interpretation: string,
  level: "federal" | "state" = "federal",
): UserIssue => ({ canonicalIssue, interpretation, level });

describe("seatOverviewAlignmentPct", () => {
  it("averages per-issue percentages, same formula as the deep-view banner", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: {
        candidateId: "c1",
        scores: [vote("healthcare_affordability", 3, 4), vote("housing", 2, 5)],
      },
    };
    const userIssues = [
      issue("healthcare_affordability", "Lower drug prices"),
      issue("housing", "Housing affordability"),
    ];
    // (75 + 40) / 2 = 57.5 -> rounds to 58
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBe(58);
  });

  it("returns null (honest gap) when no user issue has a scoreable record", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: { candidateId: "c1", scores: [] },
    };
    const userIssues = [issue("healthcare_affordability", "Lower drug prices")];
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBeNull();
  });

  it("returns null when alignmentEntry itself is null (unresolved seat)", () => {
    const seat = { level: "federal" as const, alignmentEntry: null };
    const userIssues = [issue("healthcare_affordability", "Lower drug prices")];
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBeNull();
  });

  it("scopes to the seat's level — a state-only issue doesn't factor into a federal seat's score", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: {
        candidateId: "c1",
        scores: [vote("healthcare_affordability", 4, 4)],
      },
    };
    const userIssues = [
      issue("healthcare_affordability", "Lower drug prices", "federal"),
      issue("state_only_issue", "A state-only issue", "state"),
    ];
    // only the federal issue counts -> 100%, not diluted by the state one
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBe(100);
  });
});

describe("Dallas TX senior senator fixture — every scored issue gets its own row (2026-07-12 fix)", () => {
  // Prod repro: user issues = Grocery costs / Education keeping pace with AI
  // (tagged education_funding, a "state"-lean canonical issue) / Healthcare
  // affordability, on a federal Senate seat. AllVotesPanel (which reads
  // alignmentEntry.scores directly, unfiltered by level) correctly showed
  // votes for both Education and Healthcare — proving the seat's own data
  // considered Education in-scope — while the card's per-issue rows dropped
  // Education entirely and left Healthcare's row reading identically to what
  // the banner reported as the aggregate (61%, 11/18), because Healthcare
  // was the only issue issuesForLevel let through.
  const seat = {
    level: "federal" as const,
    alignmentEntry: {
      candidateId: "c1",
      scores: [
        vote("healthcare_affordability", 11, 18),
        vote("education_funding", 1, 5), // real record exists for this seat
      ],
    },
  };
  const userIssues = [
    issue("economy_jobs", "Grocery costs", "both"), // no scoreable record
    issue("education_funding", "Education keeping pace with AI", "state"),
    issue("healthcare_affordability", "Healthcare affordability", "federal"),
  ];

  it("issuesForSeatCard admits Education despite its state lean, because this seat's data scores it", () => {
    expect(
      issuesForSeatCard(userIssues, seat).map((i) => i.canonicalIssue),
    ).toEqual([
      "economy_jobs",
      "education_funding",
      "healthcare_affordability",
    ]);
  });

  it("renders all 3 rows with per-issue fractions — Education no longer dropped, Healthcare no longer misread as the aggregate", () => {
    expect(seatIssueAlignmentRows(seat, userIssues)).toEqual([
      { label: "Grocery costs", pct: null, fraction: null },
      { label: "Education keeping pace with AI", pct: 20, fraction: "1/5" },
      { label: "Healthcare affordability", pct: 61, fraction: "11/18" },
    ]);
  });

  it("banner aggregate now sums across every scored issue, not just the one issuesForLevel let through", () => {
    // avg(20%, 61.1%) = 40.56 -> rounds to 41, distinct from Healthcare's own 61%
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBe(41);
  });
});

describe("issuesForSeatCard", () => {
  it("still excludes an off-level issue with no scoreable record for this seat", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: {
        candidateId: "c1",
        scores: [vote("healthcare_affordability", 4, 4)],
      },
    };
    const userIssues = [
      issue("healthcare_affordability", "Lower drug prices", "federal"),
      issue("state_only_issue", "A state-only issue", "state"),
    ];
    expect(
      issuesForSeatCard(userIssues, seat).map((i) => i.canonicalIssue),
    ).toEqual(["healthcare_affordability"]);
  });

  it("does not falsely admit an off-level issue when the seat has no alignmentEntry at all (unresolved seat)", () => {
    const seat = { level: "federal" as const, alignmentEntry: null };
    const userIssues = [
      issue("state_only_issue", "A state-only issue", "state"),
    ];
    expect(issuesForSeatCard(userIssues, seat)).toEqual([]);
  });
});

describe("seatIssueAlignmentRows", () => {
  it("returns one row per level-scoped user issue, with pct + raw fraction", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: {
        candidateId: "c1",
        scores: [vote("healthcare_affordability", 3, 4)],
      },
    };
    const userIssues = [issue("healthcare_affordability", "Lower drug prices")];
    expect(seatIssueAlignmentRows(seat, userIssues)).toEqual([
      { label: "Lower drug prices", pct: 75, fraction: "3/4" },
    ]);
  });

  it("is null-honest (not zero) for an issue with no scoreable record", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: { candidateId: "c1", scores: [] },
    };
    const userIssues = [issue("housing", "Housing affordability")];
    expect(seatIssueAlignmentRows(seat, userIssues)).toEqual([
      { label: "Housing affordability", pct: null, fraction: null },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Money-influence derivations (money-redesign v2 — GAPS-AND-DATA-AUDIT.md §B1)
// ---------------------------------------------------------------------------

const moneyScore = (
  canonicalIssue: string,
  resolvedStance: "in_favor" | "opposed",
  votes: Array<"with" | "against">,
  kept?: number,
  total?: number,
) => ({
  canonicalIssue,
  resolvedStance,
  kept: kept ?? votes.filter((v) => v === "with").length,
  total: total ?? votes.length,
  contributingVotes: votes.map((voteCast) => ({ voteCast })),
});

const pac = (
  label: string,
  alignsWith: string,
  issuePacStance: "in_favor" | "opposed" | "mixed",
  amount = 1_000_000,
): DonorCoalitionSlice => ({
  label,
  amount,
  isIssuePAC: true,
  alignsWith,
  issuePacStance,
});

const rankedIssue = (
  canonicalIssue: string,
  interpretation: string,
  rank: number,
  stance?: string,
): UserIssue => ({
  canonicalIssue,
  interpretation,
  level: "federal",
  rank,
  stance,
});

describe("deriveMoneyInfluence", () => {
  const userIssues = [
    rankedIssue("healthcare_affordability", "Lower drug prices", 1),
    rankedIssue("housing", "Housing affordability", 2),
  ];
  const donorCoalition = [
    pac(
      "PhRMA & Hospital PACs",
      "healthcare_affordability",
      "opposed",
      1_000_000,
    ),
    pac("Labor Union PACs", "housing", "in_favor", 500_000),
  ];
  const alignmentEntry = {
    scores: [
      moneyScore("healthcare_affordability", "in_favor", [
        "with",
        "with",
        "against",
      ]),
      moneyScore("housing", "in_favor", ["with", "with"]),
    ],
  };

  it("aggregates donors'-way / your-way across every issue with a matching PAC + curated votes", () => {
    const seat = { candidate: { donorCoalition }, alignmentEntry };
    // healthcare: PAC opposed vs user in_favor -> conflicts -> dots ['a','a','w'] (k=1,n=3)
    // housing: PAC in_favor vs user in_favor -> aligned -> dots ['w','w'] (k=2,n=2)
    // total k=3, n=5 -> 60%; your-way = (2+2)/5 = 80%
    expect(deriveMoneyInfluence(seat, userIssues)).toEqual({
      pct: 60,
      k: 3,
      n: 5,
      yourWayPct: 80,
      topDollarAgainst: {
        amount: 1_000_000,
        issue: "Lower drug prices",
        canonicalIssue: "healthcare_affordability",
      },
    });
  });

  it("honest-null: donorCoalition is null", () => {
    const seat = { candidate: { donorCoalition: null }, alignmentEntry };
    expect(deriveMoneyInfluence(seat, userIssues)).toBeNull();
  });

  it("honest-null: donorCoalition is an empty array", () => {
    const seat = { candidate: { donorCoalition: [] }, alignmentEntry };
    expect(deriveMoneyInfluence(seat, userIssues)).toBeNull();
  });

  it("honest-null: candidate is null (unresolved seat)", () => {
    const seat = { candidate: null, alignmentEntry };
    expect(deriveMoneyInfluence(seat, userIssues)).toBeNull();
  });

  it("honest-null: challenger with no roll-calls (scores not an array)", () => {
    const seat = {
      candidate: { donorCoalition },
      alignmentEntry: { scores: null },
    };
    expect(deriveMoneyInfluence(seat, userIssues)).toBeNull();
  });

  it("honest-null: PAC clusters have no canonical-issue stance ('mixed')", () => {
    const seat = {
      candidate: {
        donorCoalition: [
          pac("Crypto PACs", "healthcare_affordability", "mixed"),
        ],
      },
      alignmentEntry,
    };
    expect(deriveMoneyInfluence(seat, userIssues)).toBeNull();
  });

  it("honest-null: PAC matches an issue but there are no curated votes to score", () => {
    const seat = {
      candidate: { donorCoalition },
      alignmentEntry: {
        scores: [
          {
            canonicalIssue: "healthcare_affordability",
            resolvedStance: "in_favor",
            kept: 3,
            total: 4,
            contributingVotes: [],
          },
          moneyScore("housing", "in_favor", []),
        ],
      },
    };
    expect(deriveMoneyInfluence(seat, userIssues)).toBeNull();
  });

  it("topDollarAgainst is null when the rank-1 issue's PAC aligns with the user (not against)", () => {
    const seat = {
      candidate: {
        donorCoalition: [
          pac(
            "Teachers & Education PACs",
            "healthcare_affordability",
            "in_favor",
          ),
        ],
      },
      alignmentEntry: {
        scores: [moneyScore("healthcare_affordability", "in_favor", ["with"])],
      },
    };
    expect(
      deriveMoneyInfluence(seat, [
        rankedIssue("healthcare_affordability", "Lower drug prices", 1),
      ])?.topDollarAgainst,
    ).toBeNull();
  });

  it("topDollarAgainst is null when no user issue is explicitly rank 1", () => {
    const seat = { candidate: { donorCoalition }, alignmentEntry };
    const unranked = userIssues.map((i) => ({ ...i, rank: undefined }));
    expect(deriveMoneyInfluence(seat, unranked)?.topDollarAgainst).toBeNull();
  });
});

describe("deriveIssueMoneyVerdict", () => {
  const pacs = [
    pac("PhRMA & Hospital PACs", "healthcare_affordability", "opposed"),
  ];
  const alignedPacs = [
    pac("Teachers & Education PACs", "healthcare_affordability", "in_favor"),
  ];

  it("returns null when no matching issue-PAC exists for this score's issue", () => {
    const score = moneyScore("housing", "in_favor", ["with"]);
    expect(deriveIssueMoneyVerdict(score, pacs)).toBeNull();
  });

  it("returns null when the matching PAC has a 'mixed' stance", () => {
    const score = moneyScore("healthcare_affordability", "in_favor", ["with"]);
    const mixedPacs = [pac("Crypto PACs", "healthcare_affordability", "mixed")];
    expect(deriveIssueMoneyVerdict(score, mixedPacs)).toBeNull();
  });

  it("v-mixed: vote with the user, money conflicts (whiteboard frame 1 #1)", () => {
    const score = moneyScore("healthcare_affordability", "in_favor", [], 5, 6);
    expect(deriveIssueMoneyVerdict(score, pacs)).toEqual({
      cls: "v-mixed",
      label: "Votes yes, money says no",
    });
  });

  it("v-against: no vote record, money conflicts (whiteboard frame 1 #2)", () => {
    const score = {
      canonicalIssue: "healthcare_affordability",
      resolvedStance: "in_favor" as const,
      kept: 0,
      total: 0,
    };
    expect(deriveIssueMoneyVerdict(score, pacs)).toEqual({
      cls: "v-against",
      label: "No record, money against",
    });
  });

  it("v-with: vote with the user, money aligns (whiteboard frame 1 #3)", () => {
    const score = moneyScore("healthcare_affordability", "in_favor", [], 4, 4);
    expect(deriveIssueMoneyVerdict(score, alignedPacs)).toEqual({
      cls: "v-with",
      label: "Votes & money align",
    });
  });

  it("v-against: vote against the user, money conflicts (not in the whiteboard; worst-case bucket)", () => {
    const score = moneyScore("healthcare_affordability", "in_favor", [], 1, 6);
    expect(deriveIssueMoneyVerdict(score, pacs)).toEqual({
      cls: "v-against",
      label: "Votes no, money against",
    });
  });

  it("v-with: no vote record, money aligns (not in the whiteboard)", () => {
    const score = {
      canonicalIssue: "healthcare_affordability",
      resolvedStance: "in_favor" as const,
      kept: 0,
      total: 0,
    };
    expect(deriveIssueMoneyVerdict(score, alignedPacs)).toEqual({
      cls: "v-with",
      label: "No record, money aligns",
    });
  });

  it("v-mixed: vote against the user, money aligns (not in the whiteboard)", () => {
    const score = moneyScore("healthcare_affordability", "in_favor", [], 1, 6);
    expect(deriveIssueMoneyVerdict(score, alignedPacs)).toEqual({
      cls: "v-mixed",
      label: "Votes no, money aligns",
    });
  });
});

describe("deriveVoteLinkage", () => {
  it("keys scored PAC rows, unscored PAC rows, industry rows, and small/large by the FundingSources row name", () => {
    const donorCoalition: DonorCoalitionSlice[] = [
      pac(
        "PhRMA & Hospital PACs",
        "healthcare_affordability",
        "opposed",
        1_000_000,
      ),
      pac("Labor Union PACs", "housing", "in_favor", 500_000),
      { label: "Energy sector", amount: 300_000, isIssuePAC: false },
    ];
    const seat = {
      candidate: {
        donorCoalition,
        fundingMix: { small: 40, large: 0 },
      },
      alignmentEntry: {
        scores: [
          moneyScore("healthcare_affordability", "in_favor", [
            "with",
            "with",
            "against",
          ]),
          // housing has no matching score at all -> Labor Union PACs is unscored
        ],
      },
    };

    const linkage = deriveVoteLinkage(seat);
    expect(linkage.get("small")).toEqual({ kind: "small" });
    expect(linkage.has("large")).toBe(false); // fundingMix.large === 0
    expect(linkage.get("PhRMA & Hospital PACs")).toEqual({
      kind: "scored",
      k: 1,
      n: 3,
      dots: ["a", "a", "w"],
    });
    expect(linkage.get("Labor Union PACs")).toEqual({ kind: "unscored" });
    expect(linkage.get("Energy sector")).toEqual({ kind: "industry" });
  });

  it("honest-null-shaped: no donorCoalition, no fundingMix -> empty map, not an error", () => {
    const seat = {
      candidate: { donorCoalition: null },
      alignmentEntry: { scores: null },
    };
    expect(deriveVoteLinkage(seat).size).toBe(0);
  });

  it("agrees with deriveMoneyInfluence's k/n by construction (GAPS §E, one derivation core)", () => {
    const userIssues = [
      rankedIssue("healthcare_affordability", "Lower drug prices", 1),
      rankedIssue("housing", "Housing affordability", 2),
    ];
    const donorCoalition = [
      pac("PhRMA & Hospital PACs", "healthcare_affordability", "opposed"),
      pac("Labor Union PACs", "housing", "in_favor"),
    ];
    const alignmentEntry = {
      scores: [
        moneyScore("healthcare_affordability", "in_favor", [
          "with",
          "with",
          "against",
        ]),
        moneyScore("housing", "in_favor", ["with", "with"]),
      ],
    };
    const seat = { candidate: { donorCoalition }, alignmentEntry };

    const influence = deriveMoneyInfluence(seat, userIssues);
    const linkage = deriveVoteLinkage(seat);
    let summedK = 0;
    let summedN = 0;
    for (const entry of linkage.values()) {
      if (entry.kind === "scored") {
        summedK += entry.k;
        summedN += entry.n;
      }
    }
    expect(summedK).toBe(influence?.k);
    expect(summedN).toBe(influence?.n);
  });
});

// Regression for the 2026-07-22 whiteboard-v4 visual-audit bug: the gallery's
// realistic seat fixture (scripts/design/parity-gallery-scenarios.ts
// `mockSeatRaceDataMedian`, mirrored in e2e/helpers/redesign-mocks.ts) has an
// issue-PAC that keys its issue via `relevantToIssue` (not `alignsWith` — the
// alias every other fixture above uses) the way real /api/race-data payloads
// sometimes do, per DonorCoalitionSlice's own doc comment. That fixture
// ALSO omitted `issuePacStance` entirely. Every unit fixture above already
// set both `alignsWith` and `issuePacStance` via the `pac()` helper, so they
// never exercised this combination — the money-verdict block, the
// `.iss-verdict` chip, and the FundingSources `src-votes` sub-block all
// silently rendered honest-null in the gallery even though a scoreable vote
// existed, and no unit test caught it.
describe("issue-PAC keyed by relevantToIssue (real mock-data shape parity)", () => {
  const userIssues = [
    rankedIssue("healthcare_affordability", "Lower insulin & drug prices", 1),
  ];
  const scoredEntry = {
    scores: [
      moneyScore("healthcare_affordability", "in_favor", ["with"], 5, 6),
    ],
  };
  // Matches parity-gallery-scenarios.ts's "Better Care Action Fund" entry
  // shape exactly, keyed via `relevantToIssue` like the real fixture.
  const pacMissingStance: DonorCoalitionSlice = {
    label: "Better Care Action Fund",
    amount: 500_000,
    isIssuePAC: true,
    relevantToIssue: "healthcare_affordability",
    advocates: "Lower prescription drug prices & expanded coverage",
  };

  it("honest-null (not a bug): relevantToIssue-keyed PAC with no issuePacStance can't be scored", () => {
    const seat = {
      candidate: { donorCoalition: [pacMissingStance] },
      alignmentEntry: scoredEntry,
    };
    expect(deriveMoneyInfluence(seat, userIssues)).toBeNull();
    expect(
      deriveIssueMoneyVerdict(scoredEntry.scores[0], [pacMissingStance]),
    ).toBeNull();
    expect(deriveVoteLinkage(seat).get("Better Care Action Fund")).toEqual({
      kind: "unscored",
    });
  });

  it("scores once issuePacStance is set, via relevantToIssue same as alignsWith", () => {
    const pacWithStance: DonorCoalitionSlice = {
      ...pacMissingStance,
      issuePacStance: "in_favor",
    };
    const seat = {
      candidate: { donorCoalition: [pacWithStance] },
      alignmentEntry: scoredEntry,
    };
    expect(deriveMoneyInfluence(seat, userIssues)).toEqual({
      pct: 100,
      k: 1,
      n: 1,
      yourWayPct: 100,
      topDollarAgainst: null,
    });
    expect(
      deriveIssueMoneyVerdict(scoredEntry.scores[0], [pacWithStance]),
    ).toEqual({ cls: "v-with", label: "Votes & money align" });
    expect(deriveVoteLinkage(seat).get("Better Care Action Fund")).toEqual({
      kind: "scored",
      k: 1,
      n: 1,
      dots: ["w"],
    });
  });
});

describe("fetchDelegation — retryable is derived from HTTP status class", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetchResolved(status: number, body: unknown = {}) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      }),
    );
  }

  // 400: our own request was malformed (e.g. address too short) — not an
  // outage, and retrying won't help. Must render the honest "bad address"
  // copy, not "our service is down".
  it("a 400 is NOT retryable", async () => {
    stubFetchResolved(400, { error: "Invalid address" });
    const result = await fetchDelegation("ab");
    expect(result).toEqual({ status: "geocode_failed", retryable: false });
  });

  // 429: the shared rate limiter tripped. Not an outage either, and a
  // "Try again" button here would just re-trip the limiter.
  it("a 429 is NOT retryable", async () => {
    stubFetchResolved(429, { error: "Too many requests" });
    const result = await fetchDelegation("123 Main St, Austin, TX 78701");
    expect(result).toEqual({ status: "geocode_failed", retryable: false });
  });

  // 502: geocodeAddressToDistrict itself failed — the one case the route
  // doc calls out as "geocoder down (retryable)".
  it("a 502 IS retryable", async () => {
    stubFetchResolved(502, { status: "geocode_failed" });
    const result = await fetchDelegation("123 Main St, Austin, TX 78701");
    expect(result).toEqual({ status: "geocode_failed", retryable: true });
  });

  // Any other 5xx should be treated the same as the 502 case.
  it("a 500 IS retryable", async () => {
    stubFetchResolved(500, {});
    const result = await fetchDelegation("123 Main St, Austin, TX 78701");
    expect(result).toEqual({ status: "geocode_failed", retryable: true });
  });

  // A thrown network/abort error (offline, DNS failure, etc.) never reaches
  // an HTTP status at all — that's still our/network's fault, retryable.
  it("a thrown network error IS retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const result = await fetchDelegation("123 Main St, Austin, TX 78701");
    expect(result).toEqual({ status: "geocode_failed", retryable: true });
  });

  // A 200 whose body says the address didn't match: genuine no-match,
  // not retryable — the existing (pre-PR) behavior, still correct.
  it("a 200 geocode_failed body is NOT retryable", async () => {
    stubFetchResolved(200, { status: "geocode_failed" });
    const result = await fetchDelegation("not a real address");
    expect(result).toEqual({ status: "geocode_failed", retryable: false });
  });
});
