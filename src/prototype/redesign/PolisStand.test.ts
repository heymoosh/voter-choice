import { describe, it, expect } from "vitest";
import {
  countAnswered,
  progressLabel,
  buildRespondPayload,
  recordedCopy,
} from "./PolisStand";

describe("countAnswered", () => {
  it("counts every recorded statement, including pass", () => {
    expect(countAnswered({ a: "agree", b: "disagree", c: "pass" })).toBe(3);
  });

  it("is 0 for an empty answer set", () => {
    expect(countAnswered({})).toBe(0);
  });
});

describe("progressLabel", () => {
  it("formats 'X of N answered' with the honest no-tally suffix", () => {
    expect(progressLabel({ a: "agree" }, 3)).toBe(
      "1 of 3 answered · anonymous · no running score",
    );
  });

  it("uses the total, not the answered count, for the denominator", () => {
    expect(progressLabel({}, 3)).toBe(
      "0 of 3 answered · anonymous · no running score",
    );
  });
});

describe("buildRespondPayload", () => {
  it("carries the FULL answer set, not a single delta", () => {
    const payload = buildRespondPayload("tok-1", "TX", {
      a: "agree",
      b: "pass",
    });
    expect(payload).toEqual({
      sessionToken: "tok-1",
      stateCode: "TX",
      responses: { a: "agree", b: "pass" },
    });
  });

  it("passes through a null stateCode", () => {
    const payload = buildRespondPayload("tok-2", null, { a: "agree" });
    expect(payload.stateCode).toBeNull();
  });

  it("returns a fresh copy — mutating the input doesn't leak into the payload", () => {
    const answers = { a: "agree" as const };
    const payload = buildRespondPayload("tok-3", "TX", answers);
    answers.a = "disagree";
    expect(payload.responses.a).toBe("agree");
  });
});

describe("recordedCopy", () => {
  it("agree + stored: the canvas's exact confirmation copy", () => {
    expect(recordedCopy("agree", "stored")).toBe(
      "Thanks — that's in. No score, no reveal yet; you'll see the full picture at the end.",
    );
  });

  it("disagree + stored: the canvas's exact confirmation copy", () => {
    expect(recordedCopy("disagree", "stored")).toBe(
      "Disagreeing is just as useful — it's in, and we never single you out for it.",
    );
  });

  it("pass + stored: a parallel honest confirmation (canvas has no pass example)", () => {
    expect(recordedCopy("pass", "stored")).toMatch(/doesn't count against you/);
  });

  it("honest degrade: outcome 'skipped' never claims the answer joined the aggregate", () => {
    for (const answer of ["agree", "disagree", "pass"] as const) {
      const copy = recordedCopy(answer, "skipped");
      expect(copy).not.toMatch(/that's in/i);
      expect(copy).toMatch(/isn't live yet|stays with you/i);
    }
  });

  it("honest degrade: a write 'error' gets the SAME honest copy as 'skipped' — never a scary error", () => {
    expect(recordedCopy("agree", "error")).toBe(
      recordedCopy("agree", "skipped"),
    );
  });
});
