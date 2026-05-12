import { describe, it, expect } from "vitest";
import { generateBallotHTML } from "../ballotDownload";
import type { BallotData } from "@/types/chat";

const sampleBallot: BallotData = {
  county: "Travis County",
  electionName: "Texas General Election",
  date: "November 3, 2026",
  entries: [
    { race: "U.S. Senate", pick: "Jane Doe" },
    { race: "Governor", pick: "John Smith" },
  ],
  propositions: [{ number: "Prop 1", vote: "YES" }],
  phonePolicy: "Texas law prohibits wireless devices in the voting room.",
};

describe("generateBallotHTML", () => {
  it("generates HTML containing the header", () => {
    const html = generateBallotHTML(sampleBallot, "en");
    expect(html).toContain("MY BALLOT");
    expect(html).toContain("Travis County");
    expect(html).toContain("Texas General Election");
    expect(html).toContain("November 3, 2026");
  });

  it("includes race entries", () => {
    const html = generateBallotHTML(sampleBallot, "en");
    expect(html).toContain("U.S. Senate");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("Governor");
    expect(html).toContain("John Smith");
  });

  it("includes propositions", () => {
    const html = generateBallotHTML(sampleBallot, "en");
    expect(html).toContain("Prop 1");
    expect(html).toContain("YES");
  });

  it("includes phone policy reminder", () => {
    const html = generateBallotHTML(sampleBallot, "en");
    expect(html).toContain("Texas law prohibits wireless devices");
  });

  it("uses Spanish labels for es locale", () => {
    const html = generateBallotHTML(sampleBallot, "es");
    expect(html).toContain("MI BOLETA");
    expect(html).toContain("Propuestas");
  });

  it("uses Vietnamese labels for vi locale", () => {
    const html = generateBallotHTML(sampleBallot, "vi");
    expect(html).toContain("PHIẾU BẦU CỦA TÔI");
  });

  it("uses Chinese labels for zh locale", () => {
    const html = generateBallotHTML(sampleBallot, "zh");
    expect(html).toContain("我的选票");
  });

  it("uses Arabic labels and RTL for ar locale", () => {
    const html = generateBallotHTML(sampleBallot, "ar");
    expect(html).toContain("ورقة اقتراعي");
    expect(html).toContain('dir="rtl"');
  });

  it("escapes HTML special characters in entries", () => {
    const ballotWithSpecialChars: BallotData = {
      entries: [{ race: 'Race <with> &Special& "Chars"', pick: "Candidate" }],
      propositions: [],
    };
    const html = generateBallotHTML(ballotWithSpecialChars, "en");
    expect(html).not.toContain("<with>");
    expect(html).toContain("&lt;with&gt;");
    expect(html).toContain("&amp;Special&amp;");
  });

  it("returns a valid HTML document", () => {
    const html = generateBallotHTML(sampleBallot, "en");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });
});
