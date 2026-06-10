import { describe, it, expect } from "vitest";
import {
  Can2026DriftError,
  buildOurBillIndex,
  buildOurCandidateIndex,
  checkSoftDrift,
  classifyChip,
  crosswalkBill,
  crosswalkCandidate,
  decodeEntities,
  deriveRaceId,
  extractBillNumber,
  extractLargestProps,
  ingestCan2026,
  normalizeRating,
  normalizeVoteCast,
  parseBills,
  parseBtnColors,
  parseDateLoose,
  parseIssuePacs,
  parseMoney,
  parsePayload,
  parseStateCard,
  resolveConfig,
  splitCardsDatasets,
  type ParsedRace,
} from "./can2026";
import {
  buildCan2026FixtureHtml,
  buildCan2026Payload,
  SENATE_CARD_AL,
  HOUSE_CARD_AZ,
  HOUSE_CARD_DE,
} from "./_can2026-fixture";

const payload = buildCan2026Payload();
const fixtureHtml = buildCan2026FixtureHtml();

function fakeFetch(html: string): typeof fetch {
  return (async () =>
    ({
      ok: true,
      status: 200,
      text: async () => html,
    }) as Response) as typeof fetch;
}

// ---------------------------------------------------------------------------
// Payload extraction + entity decoding
// ---------------------------------------------------------------------------

describe("decodeEntities", () => {
  it("decodes named and numeric entities in one pass", () => {
    expect(decodeEntities("&lt;td&gt; &quot;A &amp; B&quot; &#39;x&#39;")).toBe(
      "<td> \"A & B\" 'x'",
    );
    expect(decodeEntities("&#65;&#x42;")).toBe("AB");
    // Double-encoded stays single-decoded (no re-scan of output)
    expect(decodeEntities("&amp;lt;")).toBe("&lt;");
  });
});

describe("extractLargestProps", () => {
  it("picks the LARGEST props blob and entity-decodes it", () => {
    const decoded = extractLargestProps(fixtureHtml);
    expect(decoded).toContain("var CARDS");
    expect(decoded).toContain('CARDS["AL"]');
    expect(decoded).toContain("Updated May 22, 2026");
    expect(decoded).not.toContain("&quot;");
  });

  it("throws when no props attribute exists", () => {
    expect(() => extractLargestProps("<html></html>")).toThrow(/props/);
  });
});

// ---------------------------------------------------------------------------
// Dataset splitting / BILLS / BTN_COLORS
// ---------------------------------------------------------------------------

describe("splitCardsDatasets", () => {
  it("finds two datasets and resolves chambers via the marker texts", () => {
    const { datasets, datasetCount } = splitCardsDatasets(payload);
    expect(datasetCount).toBe(2);
    expect(datasets[0].chamber).toBe("senate");
    expect([...datasets[0].cards.keys()]).toEqual(["AL", "AR"]);
    expect(datasets[1].chamber).toBe("house");
    expect([...datasets[1].cards.keys()]).toEqual(["AZ", "DE"]);
    expect(datasets[0].cards.get("AL")).toContain("Steve Marshall");
  });
});

describe("parseBills", () => {
  it("parses the BILLS dictionary: key, title, narrative, procedural note", () => {
    const bills = parseBills(payload);
    expect(bills).not.toBeNull();
    expect(bills).toHaveLength(2);
    const ira = bills!.find((b) => b.canKey === "ira")!;
    expect(ira.title).toContain("Inflation Reduction Act (H.R. 5376)");
    expect(ira.billType).toBe("legislation");
    expect(ira.narrative).toContain("Largest climate investment");
    expect(ira.proceduralNote).toContain("budget reconciliation");
    const cares = bills!.find((b) => b.canKey === "cares")!;
    expect(cares.narrative).toContain("$2.2T pandemic relief");
    expect(cares.proceduralNote).toBeNull();
  });

  it("returns null when BILLS is missing", () => {
    expect(parseBills(buildCan2026Payload({ includeBills: false }))).toBeNull();
  });
});

describe("parseBtnColors", () => {
  it("parses state → hex pairs", () => {
    const colors = parseBtnColors(payload);
    expect(colors.AL).toBe("#cc2222");
    expect(colors.DE).toBe("#2244cc");
  });
});

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

describe("normalizeRating", () => {
  it("normalizes forecaster labels", () => {
    expect(normalizeRating("Toss-Up")).toBe("toss_up");
    expect(normalizeRating("Lean R")).toBe("lean_r");
    expect(normalizeRating("Likely Democrat")).toBe("likely_d");
    expect(normalizeRating("Solid R")).toBe("safe_r"); // Solid → safe
    expect(normalizeRating("Safe Republican")).toBe("safe_r");
  });
});

describe("normalizeVoteCast", () => {
  it("maps both datasets' class variants onto one vocabulary", () => {
    expect(normalizeVoteCast("y", "Yea")).toBe("yea");
    expect(normalizeVoteCast("yea", "Yea")).toBe("yea");
    expect(normalizeVoteCast("n", "Nay")).toBe("nay");
    expect(normalizeVoteCast("nay", "Nay")).toBe("nay");
    expect(normalizeVoteCast("na", "N/A")).toBe("na");
  });
  it("lets a verbatim N/A qualifier override the class", () => {
    expect(normalizeVoteCast("y", "N/A -- Not yet senator")).toBe("na");
  });
});

describe("classifyChip (tag-safer overload)", () => {
  it("disambiguates rating vs party label by chip TEXT, not class", () => {
    expect(classifyChip("tag-safer", "Safe R").kind).toBe("rating");
    expect(classifyChip("tag-safer", "Republican").kind).toBe("party");
    expect(classifyChip("tag-flag", "Watch List").kind).toBe("flag");
  });
});

describe("parseMoney / parseDateLoose", () => {
  it("parses $11.88M / $1,866,426 / ~$9.67M", () => {
    expect(parseMoney("11.88M")).toBe(11_880_000);
    expect(parseMoney("1,866,426")).toBe(1_866_426);
    expect(parseMoney("~$9.67M")).toBe(9_670_000);
    expect(parseMoney("n/a")).toBeNull();
  });
  it("parses loose dates, rejects month-only and prose", () => {
    expect(parseDateLoose("Aug. 7, 2022")).toBe("2022-08-07");
    expect(parseDateLoose("March 31, 2026")).toBe("2026-03-31");
    expect(parseDateLoose("Jul. 2017")).toBeNull();
    expect(parseDateLoose("No floor vote yet")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Card parsing — Senate
// ---------------------------------------------------------------------------

describe("parseStateCard (senate AL)", () => {
  const race: ParsedRace = parseStateCard("AL", SENATE_CARD_AL, "senate")[0];

  it("derives the deterministic race id and race fields", () => {
    expect(race.id).toBe("AL-senate");
    expect(deriveRaceId("AL", "senate", null)).toBe("AL-senate");
    expect(race.chamber).toBe("senate");
    expect(race.district).toBeNull();
    expect(race.raceStatus).toBe("open_seat");
    expect(race.isOpenSeat).toBe(true);
    expect(race.senateClass).toBe("II");
    expect(race.raceSummary).toContain("Alabama Senate");
    expect(race.overallStateRating).toBe("Safe Republican");
    expect(race.retirementContext).toContain("not seeking reelection");
    expect(race.electoralBaseline).toBe("Trump won by 29 points");
    expect(race.rawHtml).toContain("member-card");
  });

  it("captures CAN's own chip + the three forecasters, raw preserved", () => {
    const byRater = Object.fromEntries(race.ratings.map((r) => [r.rater, r]));
    expect(byRater.can_own.rating).toBe("safe_r");
    expect(byRater.can_own.ratingRaw).toBe("Safe R");
    expect(byRater.cook.rating).toBe("lean_r");
    expect(byRater.sabato.rating).toBe("likely_r");
    expect(byRater.inside_elections.rating).toBe("safe_r");
    expect(byRater.cook.raterType).toBe("forecaster");
  });

  it("parses the candidate with key votes, normalization + verbatim raw", () => {
    expect(race.candidates).toHaveLength(1);
    const cand = race.candidates[0];
    expect(cand.canName).toBe("Steve Marshall (R)");
    expect(cand.party).toBe("R");
    expect(cand.recordType).toBe("ballot_2026");
    expect(cand.incumbentStatus).toBe("open_seat_nominee");
    expect(cand.primaryResultPct).toBe(62.5);
    expect(cand.narrativeSummary).toContain("Attorney General");

    expect(cand.keyVotes).toHaveLength(3);
    const [ira, cares, arp] = cand.keyVotes;
    expect(ira.billLabel).toBe("Inflation Reduction Act (H.R. 5376)");
    expect(ira.dataBillKey).toBe("ira");
    expect(ira.voteCast).toBe("nay");
    expect(ira.voteCastRaw).toBe("Nay");
    expect(ira.voteDate).toBe("2022-08-07");
    expect(ira.voteDateRaw).toBe("Aug. 7, 2022");
    expect(ira.context).toContain("reconciliation");
    expect(ira.source).toBe("--");

    expect(cares.voteCast).toBe("yea");
    expect(cares.voteCastRaw).toBe("Yea (procedural)");
    expect(cares.proceduralNote).toBe("procedural");
    expect(cares.source).toBe("Senate.gov");

    expect(arp.voteCast).toBe("na");
    expect(arp.voteCastRaw).toBe("N/A -- Not yet senator");
    expect(arp.dataBillKey).toBeNull();
  });

  it("parses the donor trail header, sectors, and structured issue PACs", () => {
    const trail = race.candidates[0].donorTrail!;
    expect(trail.cycleWindow).toBe("2025-2026");
    expect(trail.totalRaised).toBe(11_880_000);
    expect(trail.cashOnHand).toBe(9_670_000);
    expect(trail.cashOnHandAsOf).toBe("2026-03-31");
    expect(trail.pacSharePct).toBe(22);
    expect(trail.note).toContain("AIPAC career total");

    expect(trail.sectors).toHaveLength(2);
    expect(trail.sectors[0].sectorLabelRaw).toBe("Ideology/Single-Issue");
    expect(trail.sectors[0].amount).toBe(1_866_426);
    // verbatim raw kept; normalization is separate
    expect(trail.sectors[1].sectorLabelRaw).toBe("Securities and Investment");
    expect(trail.sectors[1].sectorLabel).toBe("Securities & Investment");

    const pacs = race.candidates[0].issuePacs;
    const aipac = pacs.find((p) => p.pacName === "AIPAC")!;
    expect(aipac.amount).toBe(237_577);
    expect(aipac.windowType).toBe("career");
    expect(aipac.confirmed).toBe(true);
    const fairshake = pacs.find((p) => p.pacName === "Fairshake")!;
    expect(fairshake.confirmed).toBe(false); // negative assertion preserved
    expect(fairshake.amount).toBeNull();
    expect(fairshake.cycleWindow).toBe("2026");
  });

  it("parses finance metrics, the DATA GAP box, and the source-box citations", () => {
    const metrics = race.candidates[0].financeMetrics;
    expect(metrics).toHaveLength(1);
    expect(metrics[0].metricLabelRaw).toBe("Unitemized small-dollar donations");
    expect(metrics[0].amount).toBe(412_338);

    expect(race.annotations).toHaveLength(1);
    expect(race.annotations[0].annotationType).toBe("data_gap");
    expect(race.annotations[0].body).toContain("No documented dark money");

    expect(race.citations).toHaveLength(3);
    expect(race.citations[0].sourceOrg).toBe("Cook Political Report");
    expect(race.citations[1].fecCommitteeId).toBe("C00835959");
    expect(race.citations[2].sourceOrg).toBe("NPR");
    expect(race.citations[2].citationDate).toBe("2026-05-21");
  });
});

describe("parseStateCard (sitting member not on the 2026 ballot)", () => {
  it("classifies record_type and next_election_year", () => {
    const parsed = parsePayload(payload);
    const ar = parsed.races.find((r) => r.id === "AR-senate")!;
    const cotton = ar.candidates[0];
    expect(cotton.canName).toBe("Sen. Tom Cotton [R-AR]");
    expect(cotton.recordType).toBe("current_member_not_on_ballot");
    expect(cotton.nextElectionYear).toBe(2028);
    expect(cotton.incumbentStatus).toBe("current_not_on_ballot");
    expect(cotton.keyVotes[0].voteCast).toBe("nay"); // vote-nay variant
    expect(cotton.keyVotes[0].proceduralNote).toContain("Live Pair");
  });
});

// ---------------------------------------------------------------------------
// Card parsing — House
// ---------------------------------------------------------------------------

describe("parseStateCard (house AZ, district section)", () => {
  const race = parseStateCard("AZ", HOUSE_CARD_AZ, "house")[0];

  it("derives the district id and disambiguates the overloaded tag-safer chip", () => {
    expect(race.id).toBe("AZ-house-06");
    expect(race.district).toBe("06");
    // tag-tossup text "Toss-Up" is the rating; tag-safer text "Republican"
    // is a party label, NOT a "safe_r" rating.
    expect(race.canOwnRating).toBe("toss_up");
    expect(race.canOwnRatingRaw).toBe("Toss-Up");
    expect(race.electoralBaseline).toBe("Harris +1 (2024)");
    expect(race.flags).toEqual(
      expect.arrayContaining(["watch_list", "committee_power"]),
    );
  });

  it("parses the house member's vote with the vote-yea class variant", () => {
    const kv = race.candidates[0].keyVotes[0];
    expect(kv.billLabel).toBe("One Big Beautiful Bill Act (H.R. 1)");
    expect(kv.voteCast).toBe("yea");
    expect(kv.voteDate).toBe("2025-05-22");
  });
});

describe("parseStateCard (house DE, pending profile)", () => {
  const race = parseStateCard("DE", HOUSE_CARD_DE, "house")[0];

  it("maps the at-large pending profile", () => {
    expect(race.id).toBe("DE-house-00");
    expect(race.raceStatus).toBe("pending_profile");
    expect(race.overallStateRating).toBe("Safe Democrat");
    expect(race.electoralBaseline).toBe("Harris +13 (2024)");
    expect(race.candidates).toHaveLength(0);
  });

  it("captures the pending what-we-know / what-is-pending / ETA prose", () => {
    const types = race.annotations.map((a) => a.annotationType).sort();
    expect(types).toEqual([
      "pending_eta",
      "pending_what_is_pending",
      "pending_what_we_know",
    ]);
    const known = race.annotations.find(
      (a) => a.annotationType === "pending_what_we_know",
    )!;
    expect(known.body).toContain("At-large seat");
  });
});

// ---------------------------------------------------------------------------
// Full payload + drift gate
// ---------------------------------------------------------------------------

describe("parsePayload", () => {
  it("parses the whole fixture payload and counts rows", () => {
    const parsed = parsePayload(payload);
    expect(parsed.contentUpdatedLabel).toBe("Updated May 22, 2026");
    expect(parsed.templateVersion).toBe("aigenerated v201");
    expect(parsed.datasetCount).toBe(2);
    expect(parsed.races.map((r) => r.id).sort()).toEqual([
      "AL-senate",
      "AR-senate",
      "AZ-house-06",
      "DE-house-00",
    ]);
    expect(parsed.stats.senateRaces).toBe(2);
    expect(parsed.stats.houseRaces).toBe(2);
    expect(parsed.stats.pendingProfiles).toBe(1);
    expect(parsed.stats.candidates).toBe(3);
    expect(parsed.stats.keyVotes).toBe(5);
    expect(parsed.stats.donorTrails).toBe(1);
    expect(parsed.stats.donorSectors).toBe(2);
    expect(parsed.stats.billNarratives).toBe(2);
  });

  it("idempotent key derivation: same payload → same race ids", () => {
    const a = parsePayload(payload).races.map((r) => r.id);
    const b = parsePayload(payload).races.map((r) => r.id);
    expect(a).toEqual(b);
  });

  it("hard-aborts when there is only one CARDS dataset", () => {
    expect(() => parsePayload(buildCan2026Payload({ datasets: 1 }))).toThrow(
      Can2026DriftError,
    );
  });

  it("hard-aborts when BILLS is missing", () => {
    expect(() =>
      parsePayload(buildCan2026Payload({ includeBills: false })),
    ).toThrow(/BILLS/);
  });
});

describe("checkSoftDrift", () => {
  it("flags counts outside ±20% of the doc §7 expectations", () => {
    const ok = checkSoftDrift({
      keyVotes: 1160,
      donorTrails: 167,
      ratings: 404,
    } as never);
    expect(ok).toEqual([]);
    const drifted = checkSoftDrift({
      keyVotes: 5,
      donorTrails: 167,
      ratings: 600,
    } as never);
    expect(drifted).toHaveLength(2);
    expect(drifted[0]).toContain("key votes");
  });
});

// ---------------------------------------------------------------------------
// Crosswalk (exact-only, never fuzzy)
// ---------------------------------------------------------------------------

describe("candidate crosswalk", () => {
  const index = buildOurCandidateIndex([
    {
      id: "govtrack-300027",
      fullName: "Sen. Tom Cotton [R-AR]",
      state: "AR",
      office: "senate",
    },
    {
      id: "fec-H6AZ06310",
      fullName: "Juan Ciscomani",
      state: "AZ",
      office: "house",
    },
    // Two same-named candidates → ambiguous
    { id: "dup-1", fullName: "John Smith", state: "AL", office: "senate" },
    { id: "dup-2", fullName: "John Smith", state: "AL", office: "senate" },
    // state/office from decoration + jurisdiction when columns are null
    {
      id: "govtrack-412742",
      fullName: "Rep. Pat Ryan [D-NY18]",
      state: null,
      office: null,
      jurisdiction: "federal-house",
    },
  ]);

  it("matches decorated incumbent names exactly by name + state + office", () => {
    const r = crosswalkCandidate(
      { canName: "Sen. Tom Cotton [R-AR]", state: "AR", office: "senate" },
      index,
    );
    expect(r.ourCandidateId).toBe("govtrack-300027");
    expect(r.matchMethod).toBe("exact_name_jurisdiction");
    expect(r.matchConfidence).toBe("1.000");
    expect(r.reviewLog).toBeNull();
  });

  it("matches CAN's '(R)'-decorated print names", () => {
    const r = crosswalkCandidate(
      { canName: "Juan Ciscomani (R)", state: "AZ", office: "house" },
      index,
    );
    expect(r.ourCandidateId).toBe("fec-H6AZ06310");
  });

  it("falls back to name-decoration/jurisdiction when columns are null", () => {
    const r = crosswalkCandidate(
      { canName: "Pat Ryan (D)", state: "NY", office: "house" },
      index,
    );
    expect(r.ourCandidateId).toBe("govtrack-412742");
  });

  it("NEVER auto-merges ambiguous matches — logs for review instead", () => {
    const r = crosswalkCandidate(
      { canName: "John Smith (R)", state: "AL", office: "senate" },
      index,
    );
    expect(r.ourCandidateId).toBeNull();
    expect(r.matchMethod).toBe("unmatched");
    expect(r.reviewLog).toContain("AMBIGUOUS");
    expect(r.reviewLog).toContain("dup-1");
  });

  it("reports no-match as unmatched", () => {
    const r = crosswalkCandidate(
      { canName: "Nobody Here (D)", state: "AK", office: "senate" },
      index,
    );
    expect(r.ourCandidateId).toBeNull();
    expect(r.reviewLog).toContain("UNMATCHED");
  });
});

describe("bill crosswalk", () => {
  it("extracts bill numbers from printed labels", () => {
    expect(extractBillNumber("Inflation Reduction Act (H.R. 5376)")).toBe(
      "hr5376",
    );
    expect(extractBillNumber("GENIUS Act (S. 1582)")).toBe("s1582");
    expect(extractBillNumber("Kavanaugh nomination")).toBeNull();
  });

  it("matches exactly one bill via the govtrack id pattern, else unmatched", () => {
    const index = buildOurBillIndex([
      { id: "govtrack-hr5376-117", title: "Inflation Reduction Act of 2022" },
      // Two HR1s across congresses → ambiguous → unmatched
      { id: "govtrack-hr1-115", title: "Tax Cuts and Jobs Act" },
      { id: "govtrack-hr1-119", title: "One Big Beautiful Bill Act" },
    ]);
    expect(crosswalkBill("Inflation Reduction Act (H.R. 5376)", index)).toEqual(
      { ourBillId: "govtrack-hr5376-117", matchMethod: "exact" },
    );
    expect(crosswalkBill("Tax Cuts and Jobs Act (H.R. 1)", index)).toEqual({
      ourBillId: null,
      matchMethod: "unmatched",
    });
    expect(crosswalkBill("Unknown Act (S. 9999)", index)).toEqual({
      ourBillId: null,
      matchMethod: "unmatched",
    });
  });
});

describe("parseIssuePacs", () => {
  it("keeps negative assertions as confirmed=false rows", () => {
    const pacs = parseIssuePacs(
      "Fairshake spent ~$1.97M in the 2024 race; AIPAC career total $44,518. No 2026 Fairshake confirmed.",
      "2025-2026",
    );
    const fairshake = pacs.filter((p) => p.pacName === "Fairshake");
    expect(fairshake.some((p) => p.confirmed && p.amount === 1_970_000)).toBe(
      true,
    );
    expect(fairshake.some((p) => !p.confirmed && p.amount === null)).toBe(true);
    expect(pacs.find((p) => p.pacName === "AIPAC")!.amount).toBe(44_518);
  });
});

// ---------------------------------------------------------------------------
// Config + end-to-end dry run (no DB, no live network — fixture only)
// ---------------------------------------------------------------------------

describe("resolveConfig", () => {
  it("defaults to the live URL, no file, live run", () => {
    const c = resolveConfig({}, ["node", "x"]);
    expect(c.sourceUrl).toBe("https://can2026.org/2026-elections");
    expect(c.filePath).toBeNull();
    expect(c.dryRun).toBe(false);
  });
  it("parses --file / --url / --dry-run", () => {
    const c = resolveConfig({}, [
      "node",
      "x",
      "--file",
      "./snap.html",
      "--url",
      "https://example.test/x",
      "--dry-run",
    ]);
    expect(c.filePath).toBe("./snap.html");
    expect(c.sourceUrl).toBe("https://example.test/x");
    expect(c.dryRun).toBe(true);
  });
});

describe("ingestCan2026 (dry run against the fixture)", () => {
  it("parses end-to-end and reports counts without touching a DB", async () => {
    const counts = await ingestCan2026({
      fetcher: fakeFetch(fixtureHtml),
      env: {},
      argv: ["node", "can2026.ts", "--dry-run"],
    });
    expect(counts.datasets).toBe(2);
    expect(counts.races).toBe(4);
    expect(counts.candidates).toBe(3);
    expect(counts.keyVotes).toBe(5);
    expect(counts.billNarratives).toBe(2);
  });

  it("aborts on hard drift before any row writes", async () => {
    const html = buildCan2026FixtureHtml(buildCan2026Payload({ datasets: 1 }));
    await expect(
      ingestCan2026({
        fetcher: fakeFetch(html),
        env: {},
        argv: ["node", "can2026.ts", "--dry-run"],
      }),
    ).rejects.toThrow(Can2026DriftError);
  });
});
