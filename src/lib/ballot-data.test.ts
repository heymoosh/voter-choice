import { describe, it, expect } from "vitest";
import {
  lookupZip,
  getNextElection,
  formatDate,
  getDeadlineInfo,
  generateContextBlock,
  buildFullPrompt,
  type Election,
  type StateData,
} from "./ballot-data";
import { getTranslations } from "./translations";

// ---- Test fixtures ----------------------------------------------------------

const TX_ELECTIONS: Election[] = [
  {
    id: "tx-2026-primary",
    name: "2026 Texas Primary Election",
    date: "2026-03-03",
    type: "primary",
    isPrimary: true,
    primaryType: "open",
  },
  {
    id: "tx-2026-general",
    name: "2026 Texas General Election",
    date: "2026-11-03",
    type: "general",
    isPrimary: false,
    primaryType: null,
  },
];

const TX_STATE: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: TX_ELECTIONS,
  registration: {
    online: {
      available: true,
      deadline: "2026-10-05",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: { deadline: "2026-10-05", sincePostmarked: true },
    inPerson: { deadline: "2026-10-05", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19",
    endDate: "2026-10-30",
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license", "U.S. passport"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

// ---- lookupZip --------------------------------------------------------------

describe("lookupZip", () => {
  it("returns state codes for a known Texas zip", () => {
    const result = lookupZip("73301");
    expect(result).toEqual(["TX"]);
  });

  it("returns state codes for a known California zip", () => {
    const result = lookupZip("90210");
    expect(result).toEqual(["CA"]);
  });

  it("returns multiple state codes for a multi-state zip", () => {
    const result = lookupZip("86515");
    expect(result).toEqual(["AZ", "NM"]);
  });

  it("returns null for an unknown zip", () => {
    const result = lookupZip("00000");
    expect(result).toBeNull();
  });

  it("returns null for an out-of-range zip", () => {
    const result = lookupZip("99999");
    expect(result).toBeNull();
  });
});

// ---- getNextElection --------------------------------------------------------

describe("getNextElection", () => {
  it("returns the earliest upcoming election", () => {
    const today = new Date("2026-01-01");
    const result = getNextElection(TX_ELECTIONS, today);
    expect(result?.id).toBe("tx-2026-primary");
  });

  it("skips past elections", () => {
    const today = new Date("2026-06-01");
    const result = getNextElection(TX_ELECTIONS, today);
    expect(result?.id).toBe("tx-2026-general");
  });

  it("returns null if all elections are in the past", () => {
    const today = new Date("2027-01-01");
    const result = getNextElection(TX_ELECTIONS, today);
    expect(result).toBeNull();
  });

  it("includes election on today", () => {
    const today = new Date("2026-03-03");
    const result = getNextElection(TX_ELECTIONS, today);
    expect(result?.id).toBe("tx-2026-primary");
  });

  it("returns null for empty elections array", () => {
    const result = getNextElection([], new Date("2026-01-01"));
    expect(result).toBeNull();
  });
});

// ---- formatDate -------------------------------------------------------------

describe("formatDate", () => {
  it("formats a date string correctly", () => {
    expect(formatDate("2026-03-03")).toBe("March 3, 2026");
  });

  it("formats a date at year boundary without timezone shift", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("formats a date in November", () => {
    expect(formatDate("2026-11-03")).toBe("November 3, 2026");
  });

  it("formats a date in Spanish locale", () => {
    const result = formatDate("2026-03-03", "es");
    expect(result).toContain("2026");
    expect(result).toContain("marzo");
  });

  it("defaults to English when no lang arg provided", () => {
    expect(formatDate("2026-03-03")).toBe("March 3, 2026");
  });
});

// ---- getDeadlineInfo --------------------------------------------------------

describe("getDeadlineInfo", () => {
  it("returns null for null input", () => {
    expect(getDeadlineInfo(null)).toBeNull();
  });

  it("returns passed status for past deadline", () => {
    const result = getDeadlineInfo("2026-01-01", new Date("2026-03-01"));
    expect(result?.status).toBe("passed");
    expect(result?.label).toBe("Passed");
  });

  it("returns red status for <= 3 days", () => {
    // Use local midnight to match getDeadlineInfo's Date.UTC(local date parts) logic
    const today = new Date(2026, 2, 1); // March 1, 2026 local
    const result = getDeadlineInfo("2026-03-03", today);
    expect(result?.status).toBe("red");
    expect(result?.daysLeft).toBe(2);
  });

  it("returns yellow status for <= 14 days and > 3 days", () => {
    const today = new Date(2026, 2, 1); // March 1, 2026 local
    const result = getDeadlineInfo("2026-03-10", today);
    expect(result?.status).toBe("yellow");
    expect(result?.daysLeft).toBe(9);
  });

  it("returns green status for > 14 days", () => {
    const today = new Date(2026, 2, 1); // March 1, 2026 local
    const result = getDeadlineInfo("2026-04-01", today);
    expect(result?.status).toBe("green");
    expect(result?.daysLeft).toBe(31);
  });

  it("returns Today! label for daysLeft=0", () => {
    const today = new Date(2026, 2, 1); // March 1, 2026 local
    const result = getDeadlineInfo("2026-03-01", today);
    expect(result?.status).toBe("red");
    expect(result?.label).toBe("Today!");
  });

  it("returns singular label for 1 day", () => {
    const today = new Date(2026, 2, 1); // March 1, 2026 local
    const result = getDeadlineInfo("2026-03-02", today);
    expect(result?.label).toBe("1 day left");
  });
});

// ---- generateContextBlock ---------------------------------------------------

describe("generateContextBlock", () => {
  const today = new Date("2026-09-01");
  const election = getNextElection(TX_ELECTIONS, today)!;

  it("includes state name and zip in context", () => {
    const block = generateContextBlock(TX_STATE, "73301", election);
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("includes election name", () => {
    const block = generateContextBlock(TX_STATE, "73301", election);
    expect(block).toContain("2026 Texas General Election");
  });

  it("includes registration deadlines", () => {
    const block = generateContextBlock(TX_STATE, "73301", election);
    expect(block).toContain("Registration deadlines");
  });

  it("includes early voting dates", () => {
    const block = generateContextBlock(TX_STATE, "73301", election);
    expect(block).toContain("Early voting");
  });

  it("includes voter ID info", () => {
    const block = generateContextBlock(TX_STATE, "73301", election);
    expect(block).toContain("Voter ID");
    expect(block).toContain("Required");
  });

  it("includes sample ballot URL", () => {
    const block = generateContextBlock(TX_STATE, "73301", election);
    expect(block).toContain("ballot-board.html");
  });

  it("includes county election office URL", () => {
    const block = generateContextBlock(TX_STATE, "73301", election);
    expect(block).toContain("where.html");
  });

  it("handles null election gracefully", () => {
    const block = generateContextBlock(TX_STATE, "73301", null);
    expect(block).toContain("No upcoming elections found");
  });
});

// ---- buildFullPrompt --------------------------------------------------------

describe("buildFullPrompt", () => {
  it("includes the ballot prompt text", () => {
    const result = buildFullPrompt("My context here");
    expect(result).toContain("nonpartisan civic research assistant");
  });

  it("includes the context block", () => {
    const result = buildFullPrompt("My context here");
    expect(result).toContain("My context here");
  });

  it("separates prompt and context with a horizontal rule", () => {
    const result = buildFullPrompt("context");
    expect(result).toContain("---");
  });

  it("uses custom ballot prompt when provided", () => {
    const result = buildFullPrompt("context", "Custom prompt text");
    expect(result).toContain("Custom prompt text");
    expect(result).toContain("context");
  });
});

// ---- Spanish i18n context block -------------------------------------------

describe("generateContextBlock (Spanish)", () => {
  const today = new Date("2026-09-01");
  const election = getNextElection(TX_ELECTIONS, today)!;
  const t = getTranslations("es");

  it("generates context block in Spanish", () => {
    const block = generateContextBlock(TX_STATE, "73301", election, t);
    expect(block).toContain("Voy a votar en");
  });

  it("includes state name in Spanish context", () => {
    const block = generateContextBlock(TX_STATE, "73301", election, t);
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("includes Spanish election label", () => {
    const block = generateContextBlock(TX_STATE, "73301", election, t);
    expect(block).toContain("Elección:");
  });

  it("includes Spanish registration deadline label", () => {
    const block = generateContextBlock(TX_STATE, "73301", election, t);
    expect(block).toContain("Fechas límite de registro:");
  });

  it("includes Spanish early voting label", () => {
    const block = generateContextBlock(TX_STATE, "73301", election, t);
    expect(block).toContain("Votación anticipada:");
  });

  it("includes Spanish voter ID label", () => {
    const block = generateContextBlock(TX_STATE, "73301", election, t);
    expect(block).toContain("Identificación para votar:");
  });

  it("handles null election gracefully in Spanish", () => {
    const block = generateContextBlock(TX_STATE, "73301", null, t);
    expect(block).toContain("No se encontraron elecciones");
  });

  it("English context block unchanged when no lang arg", () => {
    const block = generateContextBlock(TX_STATE, "73301", election);
    expect(block).toContain("Hi! I'm voting in");
  });
});

// ---- getDeadlineInfo (Spanish labels) --------------------------------------

describe("getDeadlineInfo (with Spanish translations)", () => {
  const t = getTranslations("es");

  it("returns Spanish 'Pasada' for past deadline", () => {
    const result = getDeadlineInfo("2026-01-01", new Date("2026-03-01"), t);
    expect(result?.label).toBe("Pasada");
    expect(result?.status).toBe("passed");
  });

  it("returns Spanish '¡Hoy!' for today", () => {
    const today = new Date(2026, 2, 1);
    const result = getDeadlineInfo("2026-03-01", today, t);
    expect(result?.label).toBe("¡Hoy!");
  });

  it("returns Spanish 'Quedan N días' for multiple days", () => {
    const today = new Date(2026, 2, 1);
    const result = getDeadlineInfo("2026-03-10", today, t);
    expect(result?.label).toContain("9");
    expect(result?.label).toContain("días");
  });

  it("returns Spanish single day label for 1 day", () => {
    const today = new Date(2026, 2, 1);
    const result = getDeadlineInfo("2026-03-02", today, t);
    expect(result?.label).toBe("Queda 1 día");
  });
});
