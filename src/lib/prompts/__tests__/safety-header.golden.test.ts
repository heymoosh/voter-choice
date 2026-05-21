import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SAFETY_HEADER, prependSafetyHeader } from "../safety-header";

// The golden file is the canonical source; SAFETY_HEADER must equal its trimmed bytes.
// See docs/design/2026-redesign/prompts.md §0 — the golden was copied verbatim from there.
function readGolden(): string {
  const goldenPath = path.resolve(
    process.cwd(),
    "src/lib/prompts/__tests__/safety-header.golden.md",
  );
  // Strip the single trailing newline introduced by the editor / Write tool so
  // SAFETY_HEADER and the golden compare as the same logical text.
  return fs.readFileSync(goldenPath, "utf8").replace(/\s+$/, "");
}

describe("SAFETY_HEADER", () => {
  it("matches the canonical golden file byte-for-byte (modulo trailing whitespace)", () => {
    const golden = readGolden();
    expect(SAFETY_HEADER).toBe(golden);
  });

  it("begins with the verbatim non-partisan framing sentence", () => {
    expect(
      SAFETY_HEADER.startsWith(
        "You are nonpartisan civic research. Three rules that always apply:",
      ),
    ).toBe(true);
  });

  it("contains the three numbered rules with the documented indentation", () => {
    // Two spaces before the number, five spaces on continuation lines —
    // protects against accidental reformatting.
    expect(SAFETY_HEADER).toContain(
      "  1. Never recommend a candidate or party unless the user\n     explicitly asks. Surface evidence, not verdicts.",
    );
    expect(SAFETY_HEADER).toContain(
      "  2. Never invent votes, donations, endorsements, or quotes.\n     If you don't know, name one public source the user can check.",
    );
    expect(SAFETY_HEADER).toContain(
      "  3. Don't echo back the user's full name, address, DOB, phone,\n     or ID even if they paste one. Use only city + state.",
    );
  });

  it("does not end with a trailing newline (the prepender adds the separator)", () => {
    expect(SAFETY_HEADER.endsWith("\n")).toBe(false);
  });
});

describe("prependSafetyHeader", () => {
  it("prepends SAFETY_HEADER + blank line before the body", () => {
    const body = "body";
    expect(prependSafetyHeader(body)).toBe(`${SAFETY_HEADER}\n\nbody`);
  });

  it("preserves the body verbatim including its own newlines", () => {
    const body = "line one\nline two\n";
    const out = prependSafetyHeader(body);
    expect(out.endsWith("\n\nline one\nline two\n")).toBe(true);
    expect(out.startsWith(SAFETY_HEADER)).toBe(true);
  });

  it("emits a deterministic shape: header, blank line, body — no extra wrapping", () => {
    const out = prependSafetyHeader("X");
    // The separator between header and body MUST be exactly one blank line
    // (i.e. "\n\n"), not collapsed to a single newline and not padded.
    const tail = out.slice(SAFETY_HEADER.length);
    expect(tail).toBe("\n\nX");
  });
});
