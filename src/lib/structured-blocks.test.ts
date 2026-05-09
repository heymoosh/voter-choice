import { describe, it, expect } from "vitest";
import {
  parseValuesTagRequestBlock,
  stripValuesTagRequestBlocks,
  hasOpenValuesTagRequestBlock,
  stripPartialValuesTagRequestBlock,
  parseRacePatternsBlock,
  stripRacePatternsBlocks,
  hasOpenRacePatternsBlock,
  stripPartialRacePatternsBlock,
} from "./structured-blocks";

/* ── Values Tag Request ─────────────────────────────────────────── */

const wellFormedValuesTag = [
  "[VALUES_TAG_REQUEST]",
  '{"id":"a","label":"Crime / public safety"}',
  '{"id":"b","label":"Property taxes"}',
  '{"id":"c","label":"Public schools"}',
  '{"id":"d","label":"Healthcare access"}',
  '{"id":"e","label":"Housing affordability"}',
  '{"id":"show_ballot","label":"Show me what\'s being discussed on this ballot"}',
  '{"id":"custom","label":"Name my own"}',
  "[/VALUES_TAG_REQUEST]",
].join("\n");

describe("parseValuesTagRequestBlock", () => {
  it("parses a well-formed block with multiple items", () => {
    const result = parseValuesTagRequestBlock(
      `Lead-in prose.\n\n${wellFormedValuesTag}\n\nMore.`,
    );
    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(7);
    expect(result?.items[0]).toEqual({
      id: "a",
      label: "Crime / public safety",
    });
    expect(result?.items[5].id).toBe("show_ballot");
    expect(result?.items[6].id).toBe("custom");
  });

  it("skips malformed JSON lines but keeps well-formed ones", () => {
    const mixed = [
      "[VALUES_TAG_REQUEST]",
      '{"id":"a","label":"Crime / public safety"}',
      "this is not json at all",
      '{"id":"b","label":"Property taxes"}',
      '{"id":"c","label":"Bad JSON',
      "[/VALUES_TAG_REQUEST]",
    ].join("\n");
    const result = parseValuesTagRequestBlock(mixed);
    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(2);
    expect(result?.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("returns null when fewer than 2 valid items remain", () => {
    const oneItem = [
      "[VALUES_TAG_REQUEST]",
      '{"id":"a","label":"Crime / public safety"}',
      "broken line",
      "[/VALUES_TAG_REQUEST]",
    ].join("\n");
    expect(parseValuesTagRequestBlock(oneItem)).toBeNull();
  });

  it("returns null when no block is present", () => {
    expect(parseValuesTagRequestBlock("just regular prose")).toBeNull();
    expect(parseValuesTagRequestBlock("")).toBeNull();
  });

  it("uses the LAST block when multiple appear", () => {
    const first = [
      "[VALUES_TAG_REQUEST]",
      '{"id":"a","label":"First A"}',
      '{"id":"b","label":"First B"}',
      "[/VALUES_TAG_REQUEST]",
    ].join("\n");
    const second = [
      "[VALUES_TAG_REQUEST]",
      '{"id":"x","label":"Second X"}',
      '{"id":"y","label":"Second Y"}',
      '{"id":"z","label":"Second Z"}',
      "[/VALUES_TAG_REQUEST]",
    ].join("\n");
    const combined = `${first}\n\n${second}`;
    const result = parseValuesTagRequestBlock(combined);
    expect(result?.items).toHaveLength(3);
    expect(result?.items[0].id).toBe("x");
  });

  it("skips items missing id or label", () => {
    const block = [
      "[VALUES_TAG_REQUEST]",
      '{"id":"a","label":"Valid"}',
      '{"id":"","label":"Empty id"}',
      '{"label":"No id"}',
      '{"id":"b","label":""}',
      '{"id":"c","label":"Also valid"}',
      "[/VALUES_TAG_REQUEST]",
    ].join("\n");
    const result = parseValuesTagRequestBlock(block);
    expect(result?.items).toHaveLength(2);
    expect(result?.items.map((i) => i.id)).toEqual(["a", "c"]);
  });
});

describe("stripValuesTagRequestBlocks", () => {
  it("removes the block and trims whitespace", () => {
    const content = `Lead-in prose.\n\n${wellFormedValuesTag}\n\nTrailing prose.`;
    const stripped = stripValuesTagRequestBlocks(content);
    expect(stripped).not.toContain("[VALUES_TAG_REQUEST");
    expect(stripped).not.toContain("[/VALUES_TAG_REQUEST");
    expect(stripped).toContain("Lead-in prose.");
    expect(stripped).toContain("Trailing prose.");
  });

  it("returns empty string for empty input", () => {
    expect(stripValuesTagRequestBlocks("")).toBe("");
  });
});

describe("hasOpenValuesTagRequestBlock", () => {
  it("returns true when an open tag has no matching close", () => {
    const partial = [
      "Lead-in prose.",
      "[VALUES_TAG_REQUEST]",
      '{"id":"a","label":"Crime / public safety"}',
    ].join("\n");
    expect(hasOpenValuesTagRequestBlock(partial)).toBe(true);
  });

  it("returns false for a complete block", () => {
    expect(hasOpenValuesTagRequestBlock(wellFormedValuesTag)).toBe(false);
  });

  it("returns false when no values-tag block is present", () => {
    expect(hasOpenValuesTagRequestBlock("just some prose, no markers")).toBe(
      false,
    );
    expect(hasOpenValuesTagRequestBlock("")).toBe(false);
  });

  it("returns true when one block is closed and another is open", () => {
    const closedThenOpen = [
      wellFormedValuesTag,
      "",
      "More prose.",
      "[VALUES_TAG_REQUEST]",
      '{"id":"a","label":"Crime / public safety"}',
    ].join("\n");
    expect(hasOpenValuesTagRequestBlock(closedThenOpen)).toBe(true);
  });
});

describe("stripPartialValuesTagRequestBlock", () => {
  it("returns prose before an open tag, trimmed", () => {
    const partial = [
      "Lead-in prose.",
      "",
      "[VALUES_TAG_REQUEST]",
      '{"id":"a","label":"Crime / public safety"}',
    ].join("\n");
    expect(stripPartialValuesTagRequestBlock(partial)).toBe("Lead-in prose.");
  });

  it("returns content unchanged when the block is closed", () => {
    const content = `Lead-in.\n\n${wellFormedValuesTag}\n\nTrailing.`;
    expect(stripPartialValuesTagRequestBlock(content)).toBe(content);
  });

  it("returns content unchanged when there is no values-tag block", () => {
    expect(stripPartialValuesTagRequestBlock("just prose")).toBe("just prose");
    expect(stripPartialValuesTagRequestBlock("")).toBe("");
  });
});

/* ── Race Patterns ──────────────────────────────────────────────── */

const wellFormedRacePatterns = [
  '[RACE_PATTERNS race="Harris County District Attorney"]',
  '{"id":"A","name":"Alice Adeyemi","incumbent":true,"priorRole":"Current DA, Harris County since 2019","donorCoalition":[{"label":"Legal industry","percent":42},{"label":"Small individual donors (under $200)","percent":31},{"label":"Large individual donors ($200+)","percent":27}],"donorSource":{"name":"TEC filings","url":"https://www.ethics.state.tx.us/data/search/cf/"},"endorsements":[{"name":"Houston Police Officers Union","category":"labor"},{"name":"Houston Chronicle editorial board","category":"media"}],"endorsementSource":{"name":"Ballotpedia","url":"https://ballotpedia.org/"},"platformAlignment":{"kept":8,"total":12},"alignmentSource":{"name":"Vote Smart","url":"https://justfacts.votesmart.org/"},"retrospective":[{"metric":"Felony conviction rate","value":"74%","trend":"stable","period":"2019–2023","source":{"name":"Harris County DA Annual Report","url":"https://example.gov/da-report"}}],"valuesHighlight":{"issueTag":"a","element":"Endorsed by Houston Police Officers Union"}}',
  '{"id":"B","name":"Ben Caldwell","incumbent":false,"priorRole":"Former federal prosecutor, Southern District of Texas","donorCoalition":[{"label":"Finance, banking & insurance","percent":55},{"label":"Large individual donors ($200+)","percent":45}],"donorSource":{"name":"TEC filings","url":"https://www.ethics.state.tx.us/data/search/cf/"},"endorsements":[{"name":"Texas Criminal Defense Lawyers Association","category":"advocacy"}],"endorsementSource":{"name":"Vote411","url":"https://www.vote411.org/"},"platformAlignment":null,"retrospective":null,"retrospectiveUnavailable":{"reason":"Challenger — no record in office yet"},"valuesHighlight":null}',
  "[/RACE_PATTERNS]",
].join("\n");

describe("parseRacePatternsBlock", () => {
  it("parses a well-formed block with 2 candidates", () => {
    const result = parseRacePatternsBlock(
      `Lead-in.\n\n${wellFormedRacePatterns}\n\nTrailing.`,
    );
    expect(result).not.toBeNull();
    expect(result?.race).toBe("Harris County District Attorney");
    expect(result?.candidates).toHaveLength(2);

    const alice = result?.candidates[0];
    expect(alice?.id).toBe("A");
    expect(alice?.name).toBe("Alice Adeyemi");
    expect(alice?.incumbent).toBe(true);
    expect(alice?.priorRole).toBe("Current DA, Harris County since 2019");
    expect(alice?.donorCoalition).toHaveLength(3);
    expect(alice?.donorCoalition?.[0]).toEqual({
      label: "Legal industry",
      percent: 42,
    });
    expect(alice?.donorSource?.name).toBe("TEC filings");
    expect(alice?.endorsements).toHaveLength(2);
    expect(alice?.endorsements?.[0]).toEqual({
      name: "Houston Police Officers Union",
      category: "labor",
    });
    expect(alice?.platformAlignment).toEqual({ kept: 8, total: 12 });
    expect(alice?.alignmentSource?.name).toBe("Vote Smart");
    expect(alice?.retrospective).toHaveLength(1);
    expect(alice?.retrospective?.[0].metric).toBe("Felony conviction rate");
    expect(alice?.retrospective?.[0].trend).toBe("stable");
    expect(alice?.retrospective?.[0].source.name).toBe(
      "Harris County DA Annual Report",
    );
    expect(alice?.valuesHighlight).toEqual({
      issueTag: "a",
      element: "Endorsed by Houston Police Officers Union",
    });

    const ben = result?.candidates[1];
    expect(ben?.id).toBe("B");
    expect(ben?.incumbent).toBe(false);
    expect(ben?.platformAlignment).toBeNull();
    expect(ben?.retrospective).toBeNull();
    expect(ben?.retrospectiveUnavailable?.reason).toBe(
      "Challenger — no record in office yet",
    );
    expect(ben?.valuesHighlight).toBeNull();
  });

  it("skips malformed JSON lines but keeps well-formed ones", () => {
    const mixed = [
      '[RACE_PATTERNS race="State Senate District 7"]',
      '{"id":"A","name":"Jane Doe","incumbent":true,"donorCoalition":null,"endorsements":null,"platformAlignment":{"kept":5,"total":10},"retrospective":null,"valuesHighlight":null}',
      "this is not json",
      '{"id":"B","name":"John Roe","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"C","name":"Broken',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(mixed);
    expect(result).not.toBeNull();
    expect(result?.candidates).toHaveLength(2);
    expect(result?.candidates.map((c) => c.id)).toEqual(["A", "B"]);
  });

  it("returns null when fewer than 2 valid candidates remain", () => {
    const oneCandidate = [
      '[RACE_PATTERNS race="Mayor"]',
      '{"id":"A","name":"Solo","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B"}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    expect(parseRacePatternsBlock(oneCandidate)).toBeNull();
  });

  it("returns null when no block is present", () => {
    expect(parseRacePatternsBlock("just regular prose")).toBeNull();
    expect(parseRacePatternsBlock("")).toBeNull();
  });

  it("uses the LAST block when multiple appear", () => {
    const first = [
      '[RACE_PATTERNS race="first race"]',
      '{"id":"A","name":"A1","incumbent":true,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"B1","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const second = [
      '[RACE_PATTERNS race="second race"]',
      '{"id":"X","name":"X2","incumbent":true,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"Y","name":"Y2","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"Z","name":"Z2","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const combined = `${first}\n\n${second}`;
    const result = parseRacePatternsBlock(combined);
    expect(result?.race).toBe("second race");
    expect(result?.candidates).toHaveLength(3);
  });

  it("handles donorUnavailable and endorsementUnavailable", () => {
    const block = [
      '[RACE_PATTERNS race="District Court Judge"]',
      '{"id":"A","name":"Alice Judge","incumbent":true,"donorUnavailable":{"reason":"No TEC filings found"},"endorsementUnavailable":{"reason":"No major endorsements publicized"},"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob Challenger","incumbent":false,"donorCoalition":[{"label":"Legal industry","percent":60},{"label":"Self-funded","percent":40}],"donorSource":{"name":"TEC","url":"https://ethics.state.tx.us/"},"endorsements":null,"endorsementUnavailable":{"reason":"No endorsements found"},"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].donorUnavailable?.reason).toBe(
      "No TEC filings found",
    );
    expect(result?.candidates[0].endorsementUnavailable?.reason).toBe(
      "No major endorsements publicized",
    );
    expect(result?.candidates[0].donorCoalition).toBeNull();
    expect(result?.candidates[1].donorCoalition).toHaveLength(2);
    expect(result?.candidates[1].endorsementUnavailable?.reason).toBe(
      "No endorsements found",
    );
  });

  it("handles alignmentUnavailable for incumbents with no assemblable data", () => {
    const block = [
      '[RACE_PATTERNS race="Constable Precinct 1"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":null,"alignmentUnavailable":{"reason":"No platform archive found for this office"},"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].alignmentUnavailable?.reason).toBe(
      "No platform archive found for this office",
    );
    expect(result?.candidates[0].platformAlignment).toBeNull();
  });

  it("handles retrospectiveUnavailable for offices not on the vocabulary list", () => {
    const block = [
      '[RACE_PATTERNS race="County Treasurer"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"retrospectiveUnavailable":{"reason":"No standard performance metrics published for this office"},"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"retrospectiveUnavailable":{"reason":"Challenger — no record in office yet"},"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].retrospectiveUnavailable?.reason).toBe(
      "No standard performance metrics published for this office",
    );
    expect(result?.candidates[1].retrospectiveUnavailable?.reason).toBe(
      "Challenger — no record in office yet",
    );
    expect(result?.candidates[0].retrospective).toBeNull();
  });

  it("handles valuesHighlight null when voter skipped Act 2", () => {
    const block = [
      '[RACE_PATTERNS race="Sheriff"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].valuesHighlight).toBeNull();
    expect(result?.candidates[1].valuesHighlight).toBeNull();
  });

  it("treats valuesHighlight with empty element as null", () => {
    const block = [
      '[RACE_PATTERNS race="City Council"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":{"issueTag":"b","element":""}}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    // Element is empty string — should be treated as null (no highlight to surface)
    expect(result?.candidates[0].valuesHighlight).toBeNull();
  });

  it("clamps donor percent to 0–100", () => {
    const block = [
      '[RACE_PATTERNS race="State Rep District 12"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":[{"label":"Real estate & development","percent":120},{"label":"Oil, gas & energy","percent":-5}],"donorSource":{"name":"TEC","url":"https://ethics.state.tx.us/"},"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].donorCoalition?.[0].percent).toBe(100);
    expect(result?.candidates[0].donorCoalition?.[1].percent).toBe(0);
  });

  it("handles retrospective with multiple metrics", () => {
    const block = [
      '[RACE_PATTERNS race="State Senator District 15"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":null,"platformAlignment":{"kept":10,"total":15},"alignmentSource":{"name":"Vote Smart"},"retrospective":[{"metric":"Bills authored that became law","value":"3","trend":"stable","period":"2021–2024","source":{"name":"Texas Legislature Online","url":"https://capitol.texas.gov/"}},{"metric":"Floor vote attendance","value":"94%","trend":"improving","period":"2021–2024","source":{"name":"Texas Senate records","url":"https://senate.texas.gov/"}}],"valuesHighlight":{"issueTag":"c","element":"Authored HB 1234 expanding school funding"}}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"retrospectiveUnavailable":{"reason":"Challenger — no record in office yet"},"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].retrospective).toHaveLength(2);
    expect(result?.candidates[0].retrospective?.[1].metric).toBe(
      "Floor vote attendance",
    );
    expect(result?.candidates[0].retrospective?.[1].trend).toBe("improving");
    expect(result?.candidates[0].alignmentSource?.name).toBe("Vote Smart");
  });

  it("skips retrospective entries missing required fields", () => {
    const block = [
      '[RACE_PATTERNS race="US Representative District 7"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":[{"metric":"Bills authored that became law","value":"5","trend":"stable","period":"2021–2024","source":{"name":"Congress.gov","url":"https://congress.gov/"}},{"metric":"Bad entry, no source"}],"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    // Only the valid entry with a source survives
    expect(result?.candidates[0].retrospective).toHaveLength(1);
    expect(result?.candidates[0].retrospective?.[0].metric).toBe(
      "Bills authored that became law",
    );
  });

  // Proposition variant: reuses [RACE_PATTERNS] with proposition-specific overrides
  it("handles the proposition variant (incumbent: false, platformAlignment: null, fiscal note in retrospective)", () => {
    const propBlock = [
      '[RACE_PATTERNS race="Proposition A — Municipal Bond 2024"]',
      '{"id":"YES","name":"YES on Prop A","incumbent":false,"priorRole":"Authorizes $500M in bonds for road infrastructure over 5 years. Funded by property tax levy increases of approximately 1.2 cents per $100 valuation.","donorCoalition":[{"label":"Real estate & development","percent":62},{"label":"Finance, banking & insurance","percent":38}],"donorSource":{"name":"TEC PAC filings","url":"https://www.ethics.state.tx.us/"},"endorsements":[{"name":"Greater Houston Partnership","category":"business"},{"name":"Houston Chronicle","category":"media"}],"endorsementSource":{"name":"Vote411","url":"https://www.vote411.org/"},"platformAlignment":null,"retrospective":[{"metric":"Fiscal note","value":"$500M over 5 years","trend":"stable","period":"2024–2029","source":{"name":"City of Houston CFO Office","url":"https://houstontx.gov/finance/"}}],"valuesHighlight":null}',
      '{"id":"NO","name":"NO on Prop A","incumbent":false,"priorRole":"Authorizes $500M in bonds for road infrastructure over 5 years. Funded by property tax levy increases of approximately 1.2 cents per $100 valuation.","donorCoalition":[{"label":"Small individual donors (under $200)","percent":100}],"donorSource":{"name":"TEC PAC filings","url":"https://www.ethics.state.tx.us/"},"endorsements":[{"name":"Texans for Fiscal Responsibility","category":"advocacy"}],"endorsementSource":{"name":"Ballotpedia","url":"https://ballotpedia.org/"},"platformAlignment":null,"retrospective":[{"metric":"Comparable measure","value":"Dallas 2019 bond passed; completion rate 78% by 2023","trend":"stable","period":"2019–2023","source":{"name":"Dallas Open Data Portal","url":"https://dallascityhall.com/"}}],"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");

    const result = parseRacePatternsBlock(propBlock);
    expect(result).not.toBeNull();
    expect(result?.race).toBe("Proposition A — Municipal Bond 2024");
    expect(result?.candidates).toHaveLength(2);

    const yes = result?.candidates[0];
    expect(yes?.id).toBe("YES");
    expect(yes?.name).toBe("YES on Prop A");
    expect(yes?.incumbent).toBe(false);
    expect(yes?.priorRole).toContain("Authorizes $500M");
    expect(yes?.donorCoalition).toHaveLength(2);
    expect(yes?.platformAlignment).toBeNull();
    expect(yes?.retrospective).toHaveLength(1);
    expect(yes?.retrospective?.[0].metric).toBe("Fiscal note");
    expect(yes?.valuesHighlight).toBeNull();

    const no = result?.candidates[1];
    expect(no?.id).toBe("NO");
    expect(no?.endorsements?.[0].name).toBe("Texans for Fiscal Responsibility");
    expect(no?.retrospective?.[0].metric).toBe("Comparable measure");
  });

  it("requires incumbent boolean — rejects candidate without it", () => {
    const block = [
      '[RACE_PATTERNS race="Some Race"]',
      // Missing incumbent field — should be skipped
      '{"id":"A","name":"Alice"}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    // Only B is valid — fewer than 2 candidates
    expect(parseRacePatternsBlock(block)).toBeNull();
  });

  /* ── EndorsementEntry new fields: orgUrl + partisanLean ─────── */

  it("preserves orgUrl on an endorsement entry when set to a non-empty string", () => {
    const block = [
      '[RACE_PATTERNS race="City Council Place 1"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":[{"name":"League of Women Voters","category":"civic","orgUrl":"https://lwv.org","partisanLean":"nonpartisan"}],"endorsementSource":{"name":"LWV","url":"https://lwv.org"},"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    const endorsement = result?.candidates[0].endorsements?.[0];
    expect(endorsement?.orgUrl).toBe("https://lwv.org");
  });

  it('preserves partisanLean "partisan"', () => {
    const block = [
      '[RACE_PATTERNS race="County Commissioner Pct 2"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":[{"name":"Harris County Democratic Party","category":"party","partisanLean":"partisan"}],"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].endorsements?.[0].partisanLean).toBe(
      "partisan",
    );
  });

  it('preserves partisanLean "nonpartisan"', () => {
    const block = [
      '[RACE_PATTERNS race="County Commissioner Pct 2"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":[{"name":"League of Women Voters","category":"civic","partisanLean":"nonpartisan"}],"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].endorsements?.[0].partisanLean).toBe(
      "nonpartisan",
    );
  });

  it('preserves partisanLean "mixed"', () => {
    const block = [
      '[RACE_PATTERNS race="County Commissioner Pct 2"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":[{"name":"Texas Tribune","category":"media","partisanLean":"mixed"}],"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    expect(result?.candidates[0].endorsements?.[0].partisanLean).toBe("mixed");
  });

  it("drops an invalid partisanLean value but keeps the rest of the entry", () => {
    const block = [
      '[RACE_PATTERNS race="City Council Place 2"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":[{"name":"Some Org","category":"civic","orgUrl":"https://example.com","partisanLean":"liberal"}],"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    const endorsement = result?.candidates[0].endorsements?.[0];
    // Entry survives
    expect(endorsement?.name).toBe("Some Org");
    expect(endorsement?.category).toBe("civic");
    // orgUrl is still kept (it was valid)
    expect(endorsement?.orgUrl).toBe("https://example.com");
    // Invalid partisanLean is dropped
    expect(endorsement?.partisanLean).toBeUndefined();
  });

  it("drops empty-string orgUrl rather than keeping a useless empty value", () => {
    const block = [
      '[RACE_PATTERNS race="City Council Place 3"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":[{"name":"Some Org","category":"labor","orgUrl":""}],"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    const endorsement = result?.candidates[0].endorsements?.[0];
    expect(endorsement?.name).toBe("Some Org");
    expect(endorsement?.orgUrl).toBeUndefined();
  });

  it("parses an endorsement that omits both new fields (backward compat)", () => {
    const block = [
      '[RACE_PATTERNS race="Mayor"]',
      '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":null,"endorsements":[{"name":"Houston Chronicle editorial board","category":"media"}],"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":null,"endorsements":null,"platformAlignment":null,"retrospective":null,"valuesHighlight":null}',
      "[/RACE_PATTERNS]",
    ].join("\n");
    const result = parseRacePatternsBlock(block);
    const endorsement = result?.candidates[0].endorsements?.[0];
    expect(endorsement?.name).toBe("Houston Chronicle editorial board");
    expect(endorsement?.category).toBe("media");
    expect(endorsement?.orgUrl).toBeUndefined();
    expect(endorsement?.partisanLean).toBeUndefined();
  });
});

describe("stripRacePatternsBlocks", () => {
  it("removes the block and trims whitespace", () => {
    const content = `Lead-in prose.\n\n${wellFormedRacePatterns}\n\nTrailing prose.`;
    const stripped = stripRacePatternsBlocks(content);
    expect(stripped).not.toContain("[RACE_PATTERNS");
    expect(stripped).not.toContain("[/RACE_PATTERNS");
    expect(stripped).toContain("Lead-in prose.");
    expect(stripped).toContain("Trailing prose.");
  });

  it("returns empty string for empty input", () => {
    expect(stripRacePatternsBlocks("")).toBe("");
  });
});

describe("hasOpenRacePatternsBlock", () => {
  it("returns true when an open tag has no matching close", () => {
    const partial = [
      "Lead-in prose.",
      '[RACE_PATTERNS race="Harris County DA"]',
      '{"id":"A","name":"Alice","incumbent":true}',
    ].join("\n");
    expect(hasOpenRacePatternsBlock(partial)).toBe(true);
  });

  it("returns false for a complete block", () => {
    expect(hasOpenRacePatternsBlock(wellFormedRacePatterns)).toBe(false);
  });

  it("returns false when no race-patterns tag is present", () => {
    expect(hasOpenRacePatternsBlock("just prose")).toBe(false);
    expect(hasOpenRacePatternsBlock("")).toBe(false);
  });

  it("does not false-match a similarly-prefixed token", () => {
    expect(hasOpenRacePatternsBlock("[RACE_PATTERNS_FOO]")).toBe(false);
  });

  it("returns true when one block is closed and another is open", () => {
    const closedThenOpen = [
      wellFormedRacePatterns,
      "",
      "More prose.",
      '[RACE_PATTERNS race="Sheriff"]',
      '{"id":"A","name":"x","incumbent":true}',
    ].join("\n");
    expect(hasOpenRacePatternsBlock(closedThenOpen)).toBe(true);
  });
});

describe("stripPartialRacePatternsBlock", () => {
  it("returns prose before an open tag, trimmed", () => {
    const partial = [
      "Lead-in prose.",
      "",
      '[RACE_PATTERNS race="Harris County DA"]',
      '{"id":"A","name":"Alice","incumbent":true}',
    ].join("\n");
    expect(stripPartialRacePatternsBlock(partial)).toBe("Lead-in prose.");
  });

  it("returns content unchanged when the block is closed", () => {
    const content = `Lead-in.\n\n${wellFormedRacePatterns}\n\nTrailing.`;
    expect(stripPartialRacePatternsBlock(content)).toBe(content);
  });

  it("returns content unchanged when there is no race-patterns tag", () => {
    expect(stripPartialRacePatternsBlock("just prose")).toBe("just prose");
    expect(stripPartialRacePatternsBlock("")).toBe("");
  });
});
