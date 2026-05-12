import { describe, it, expect } from "vitest";
import { buildPrompt, buildContextBlock } from "../promptBuilder";
import type { StateData } from "@/types/election";

const txStateData: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-runoff",
      name: "2026 Texas Primary Runoff",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
    {
      id: "tx-2026-general",
      name: "2026 Texas General Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-02-02",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: {
      deadline: "2026-02-02",
      sincePostmarked: true,
    },
    inPerson: {
      deadline: "2026-02-02",
      sincePostmarked: false,
    },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-02-17",
    endDate: "2026-02-28",
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license or ID card"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail:
      "Texas law prohibits wireless communication devices in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

describe("buildContextBlock", () => {
  it("includes the state name", () => {
    const result = buildContextBlock(txStateData, "73301");
    expect(result).toContain("Texas");
  });

  it("includes the zip code", () => {
    const result = buildContextBlock(txStateData, "73301");
    expect(result).toContain("73301");
  });

  it("includes the election name", () => {
    const result = buildContextBlock(txStateData, "73301");
    expect(result).toContain("Election");
  });

  it("includes registration deadline info", () => {
    const result = buildContextBlock(txStateData, "73301");
    expect(result).toContain("Registration deadlines");
  });

  it("includes voter ID information", () => {
    const result = buildContextBlock(txStateData, "73301");
    expect(result).toContain("Voter ID");
  });

  it("includes sample ballot link", () => {
    const result = buildContextBlock(txStateData, "73301");
    expect(result).toContain("votetexas.gov");
  });

  it("includes phones at polls policy", () => {
    const result = buildContextBlock(txStateData, "73301");
    expect(result).toContain("Phones at polls");
  });
});

describe("buildPrompt", () => {
  it("includes the base ballot prompt text", () => {
    const result = buildPrompt(txStateData, "73301");
    expect(result).toContain("nonpartisan civic research assistant");
  });

  it("includes the context block", () => {
    const result = buildPrompt(txStateData, "73301");
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("separates prompt and context with a divider", () => {
    const result = buildPrompt(txStateData, "73301");
    expect(result).toContain("---");
  });
});

describe("buildPrompt — Spanish locale", () => {
  it("uses Spanish prompt text in es mode", () => {
    const result = buildPrompt(txStateData, "73301", "es");
    expect(result).toContain("asistente cívico imparcial");
  });

  it("context block is in Spanish in es mode", () => {
    const result = buildContextBlock(txStateData, "73301", "es");
    expect(result).toContain("¡Hola!");
    expect(result).toContain("Voy a votar en");
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("Spanish context block uses Spanish labels", () => {
    const result = buildContextBlock(txStateData, "73301", "es");
    expect(result).toContain("Fechas límite de registro");
    expect(result).toContain("Votación anticipada");
    expect(result).toContain("Identificación para votar");
  });

  it("English context block still works correctly with explicit en locale", () => {
    const result = buildContextBlock(txStateData, "73301", "en");
    expect(result).toContain("Hi! I'm voting in");
    expect(result).toContain("Registration deadlines");
  });

  it("Spanish context block separates prompt and context with a divider", () => {
    const result = buildPrompt(txStateData, "73301", "es");
    expect(result).toContain("---");
  });
});

describe("buildPrompt — Vietnamese locale", () => {
  it("uses Vietnamese prompt text in vi mode", () => {
    const result = buildPrompt(txStateData, "73301", "vi");
    expect(result).toContain("trợ lý nghiên cứu dân sự");
  });

  it("Vietnamese context block contains state name and zip", () => {
    const result = buildContextBlock(txStateData, "73301", "vi");
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("Vietnamese context block uses Vietnamese labels", () => {
    const result = buildContextBlock(txStateData, "73301", "vi");
    expect(result).toContain("Thời hạn đăng ký");
    expect(result).toContain("Bỏ phiếu sớm");
    expect(result).toContain("Giấy tờ tùy thân để bỏ phiếu");
  });
});

describe("buildPrompt — Chinese locale", () => {
  it("uses Chinese prompt text in zh mode", () => {
    const result = buildPrompt(txStateData, "73301", "zh");
    expect(result).toContain("无党派公民研究助手");
  });

  it("Chinese context block contains state name and zip", () => {
    const result = buildContextBlock(txStateData, "73301", "zh");
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("Chinese context block uses Chinese labels", () => {
    const result = buildContextBlock(txStateData, "73301", "zh");
    expect(result).toContain("登记截止日期");
    expect(result).toContain("提前投票");
    expect(result).toContain("选民身份证件");
  });

  it("Chinese context block formats dates in Chinese style", () => {
    const result = buildContextBlock(txStateData, "73301", "zh");
    expect(result).toMatch(/\d{4}年\d{1,2}月\d{1,2}日/);
  });
});

describe("buildPrompt — Arabic locale", () => {
  it("uses Arabic prompt text in ar mode", () => {
    const result = buildPrompt(txStateData, "73301", "ar");
    expect(result).toContain("مساعد بحث مدني محايد");
  });

  it("Arabic context block contains state name and zip", () => {
    const result = buildContextBlock(txStateData, "73301", "ar");
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("Arabic context block uses Arabic labels", () => {
    const result = buildContextBlock(txStateData, "73301", "ar");
    expect(result).toContain("مواعيد التسجيل");
    expect(result).toContain("التصويت المبكر");
    expect(result).toContain("هوية الناخب");
  });
});
