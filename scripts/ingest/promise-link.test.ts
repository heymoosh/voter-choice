/**
 * scripts/ingest/promise-link.test.ts
 *
 * Tests for the linker's pure functions — action-side resolution, direction,
 * link-row assembly, and pole-response parsing. No network, no DB.
 */

import { describe, it, expect } from "vitest";
import {
  voteActionSide,
  sponsorActionSide,
  directionFor,
  buildLinkRows,
  buildPoleSystemPrompt,
  parsePoleResponse,
  LINK_METHOD,
  LINKER_VERSION,
  type VoteMatch,
  type CosponsorMatch,
} from "./promise-link";

describe("voteActionSide", () => {
  it("YEA takes the bill's stance_lens side", () => {
    expect(voteActionSide("yea", "in_favor")).toBe("in_favor");
    expect(voteActionSide("yea", "opposed")).toBe("opposed");
  });

  it("NAY takes the opposite side", () => {
    expect(voteActionSide("nay", "in_favor")).toBe("opposed");
    expect(voteActionSide("nay", "opposed")).toBe("in_favor");
  });

  it("non-directional casts are not evidence of direction", () => {
    expect(voteActionSide("present", "in_favor")).toBeNull();
    expect(voteActionSide("absent", "in_favor")).toBeNull();
    expect(voteActionSide("not_voting", "opposed")).toBeNull();
  });

  it("unknown stance_lens yields null rather than a guess", () => {
    expect(voteActionSide("yea", "neutral")).toBeNull();
  });
});

describe("sponsorActionSide", () => {
  it("putting your name on a bill takes the bill's side", () => {
    expect(sponsorActionSide("in_favor")).toBe("in_favor");
    expect(sponsorActionSide("opposed")).toBe("opposed");
    expect(sponsorActionSide("junk")).toBeNull();
  });
});

describe("directionFor", () => {
  it("matching sides move toward the promise; mismatched move against", () => {
    expect(directionFor("in_favor", "in_favor")).toBe("toward");
    expect(directionFor("opposed", "opposed")).toBe("toward");
    expect(directionFor("in_favor", "opposed")).toBe("against");
    expect(directionFor("opposed", "in_favor")).toBe("against");
  });
});

describe("buildLinkRows", () => {
  const promise = { id: "pr_abc" };
  const votes: VoteMatch[] = [
    { voteId: "v1", billId: "b1", voteCast: "yea", stanceLens: "in_favor" },
    { voteId: "v2", billId: "b2", voteCast: "nay", stanceLens: "in_favor" },
    { voteId: "v3", billId: "b3", voteCast: "absent", stanceLens: "in_favor" },
  ];
  const cosponsors: CosponsorMatch[] = [
    { cosponsorId: "c1", billId: "b4", role: "sponsor", stanceLens: "opposed" },
    {
      cosponsorId: "c2",
      billId: "b5",
      role: "cosponsor",
      stanceLens: "in_favor",
    },
  ];

  it("builds one row per directional action with the right refs", () => {
    const rows = buildLinkRows(promise, "in_favor", votes, cosponsors);
    expect(rows).toHaveLength(4); // absent vote skipped

    const voteRow = rows.find((r) => r.voteId === "v1");
    expect(voteRow).toMatchObject({
      promiseId: "pr_abc",
      actionType: "vote",
      voteId: "v1",
      billId: null, // vote rows set vote_id only (schema contract)
      cosponsorId: null,
      direction: "toward",
      evidenceLevel: "activity",
      linkMethod: LINK_METHOD,
    });

    const nayRow = rows.find((r) => r.voteId === "v2");
    expect(nayRow?.direction).toBe("against");

    const sponsorRow = rows.find((r) => r.cosponsorId === "c1");
    expect(sponsorRow).toMatchObject({
      actionType: "sponsorship",
      billId: "b4", // sponsorship rows carry bill_id too (schema contract)
      voteId: null,
      direction: "against", // opposed bill vs in_favor promise
    });

    const cosponsorRow = rows.find((r) => r.cosponsorId === "c2");
    expect(cosponsorRow).toMatchObject({
      actionType: "cosponsorship",
      direction: "toward",
    });
  });

  it("flips every direction when the promise takes the other side", () => {
    const rows = buildLinkRows(promise, "opposed", votes, cosponsors);
    expect(rows.find((r) => r.voteId === "v1")?.direction).toBe("against");
    expect(rows.find((r) => r.voteId === "v2")?.direction).toBe("toward");
    expect(rows.find((r) => r.cosponsorId === "c1")?.direction).toBe("toward");
  });

  it("every row is labeled activity — the linker never over-credits", () => {
    const rows = buildLinkRows(promise, "in_favor", votes, cosponsors);
    expect(rows.every((r) => r.evidenceLevel === "activity")).toBe(true);
  });
});

describe("parsePoleResponse", () => {
  it("parses the two valid sides", () => {
    expect(parsePoleResponse('{"side": "in_favor"}')).toBe("in_favor");
    expect(parsePoleResponse('{"side": "opposed"}')).toBe("opposed");
  });

  it("tolerates markdown fences", () => {
    expect(parsePoleResponse('```json\n{"side": "opposed"}\n```')).toBe(
      "opposed",
    );
  });

  it("anything malformed or unknown is unclear — never a guessed side", () => {
    expect(parsePoleResponse('{"side": "unclear"}')).toBe("unclear");
    expect(parsePoleResponse('{"side": "yes"}')).toBe("unclear");
    expect(parsePoleResponse("not json")).toBe("unclear");
    expect(parsePoleResponse("")).toBe("unclear");
    expect(parsePoleResponse("[]")).toBe("unclear");
  });
});

describe("prompt and provenance contracts", () => {
  it("system prompt embeds the shared pole vocabulary and the unclear rule", () => {
    const prompt = buildPoleSystemPrompt();
    expect(prompt).toContain("in_favor");
    expect(prompt).toContain("opposed");
    expect(prompt).toContain("unclear");
    // The shared renderer's version stamp — proves the tagger and the
    // linker consume the same vocabulary module.
    expect(prompt).toContain("pole-vocab-v1");
  });

  it("link_method names the join, the linker version, and the model", () => {
    expect(LINK_METHOD).toContain("issue_tag_join");
    expect(LINK_METHOD).toContain(LINKER_VERSION);
    expect(LINK_METHOD.split("+").length).toBe(3);
  });
});
