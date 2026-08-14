import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  POLE_VOCABULARY,
  POLE_VOCABULARY_VERSION,
  CROSS_CUTTING_TAGGER_RULES,
  renderTaggerPoleBlock,
  renderResolverPoleDirections,
  renderDisambiguationQuestions,
  DISAMBIGUATION_OPEN_ENDED_TAIL,
  proseEndsWithDisambiguationTail,
  isContested,
} from "./poleVocabulary";
import { CANONICAL_ISSUE_LABELS } from "../canonicalIssues";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const canonicalIds = Object.keys(CANONICAL_ISSUE_LABELS);
const entries = Object.entries(POLE_VOCABULARY);

describe("pole vocabulary — coverage", () => {
  it("covers exactly the canonical issue ids (no missing, no extra)", () => {
    expect(new Set(Object.keys(POLE_VOCABULARY))).toEqual(
      new Set(canonicalIds),
    );
  });

  it("defines both poles (name + definition + >=1 bill signal) for every issue", () => {
    for (const [id, e] of entries) {
      for (const pole of ["in_favor", "opposed"] as const) {
        expect(e[pole].name, id).toBeTruthy();
        expect(e[pole].definition, id).toBeTruthy();
        expect(e[pole].billSignals.length, `${id}.${pole}`).toBeGreaterThan(0);
      }
    }
  });

  it("every contested issue has a question + exactly 2 options bound to both poles", () => {
    for (const [id, e] of entries) {
      if (e.axisType !== "contested") continue;
      expect(e.disambiguation?.question, id).toBeTruthy();
      expect(e.disambiguation?.options.length, id).toBe(2);
      expect(new Set(e.disambiguation!.options.map((o) => o.pole)), id).toEqual(
        new Set(["in_favor", "opposed"]),
      );
    }
  });

  it("valence_dominant issues carry no disambiguation block", () => {
    for (const [id, e] of entries) {
      if (e.axisType === "valence_dominant") {
        expect(e.disambiguation, id).toBeUndefined();
      }
    }
  });

  it("has the 14 contested / 8 valence_dominant split the doc declares", () => {
    const contested = entries.filter(([, e]) => e.axisType === "contested");
    const valence = entries.filter(
      ([, e]) => e.axisType === "valence_dominant",
    );
    expect(contested.length).toBe(14);
    expect(valence.length).toBe(8);
  });

  it("isContested() agrees with the entries", () => {
    for (const [id, e] of entries) {
      expect(isContested(id), id).toBe(e.axisType === "contested");
    }
  });
});

describe("pole vocabulary — doc sync (prose <-> module)", () => {
  const doc = readFileSync(
    path.join(REPO_ROOT, "docs/alignment/POLE_VOCABULARY.md"),
    "utf-8",
  );

  it("every issue appears as a doc entry heading", () => {
    for (const id of Object.keys(POLE_VOCABULARY)) {
      expect(doc.includes(`### ${id}`), id).toBe(true);
    }
  });

  it("each issue's axis_type matches the prose", () => {
    for (const [id, e] of entries) {
      const start = doc.indexOf(`### ${id}`);
      expect(start, `heading for ${id}`).toBeGreaterThanOrEqual(0);
      // Bound the section to the next entry heading so we read THIS issue's axis.
      const rest = doc.slice(start + 3);
      const nextHeading = rest.indexOf("\n### ");
      const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
      const m = section.match(
        /axis_type:\s*\*{0,2}(contested|valence_dominant)/,
      );
      expect(m?.[1], `axis_type for ${id}`).toBe(e.axisType);
    }
  });
});

describe("renderers — round-trip", () => {
  it("tagger block names every pole + includes every cross-cutting rule + the version", () => {
    const block = renderTaggerPoleBlock();
    for (const [id, e] of entries) {
      expect(block).toContain(id);
      expect(block).toContain(e.in_favor.name);
      expect(block).toContain(e.opposed.name);
    }
    for (const rule of CROSS_CUTTING_TAGGER_RULES) {
      expect(block).toContain(rule);
    }
    expect(block).toContain(POLE_VOCABULARY_VERSION);
  });

  it("resolver block carries every issue's pole names + the version", () => {
    const block = renderResolverPoleDirections();
    for (const [id, e] of entries) {
      expect(block).toContain(id);
      expect(block).toContain(e.in_favor.name);
      expect(block).toContain(e.opposed.name);
    }
    expect(block).toContain(POLE_VOCABULARY_VERSION);
  });

  it("resolver block tags each issue's axis_type so the model can key the stance rule on it", () => {
    const block = renderResolverPoleDirections();
    for (const [id, e] of entries) {
      const tag = e.axisType === "contested" ? "contested" : "valence";
      expect(block, id).toContain(`${id} [${tag}]`);
    }
    // valence_dominant is rendered as the shorter [valence] token that the
    // stance-rule prose names — the long literal must not leak into the prompt.
    expect(block).not.toContain("[valence_dominant]");
  });

  it("resolver block instructs OMITTING stance (no in_favor default) for a contested issue that doesn't pick a side", () => {
    const block = renderResolverPoleDirections();
    expect(block).toMatch(
      /\[contested\][^]*OMIT it \(do NOT default to in_favor\)/,
    );
  });
});

describe("single source of truth — consumers import the shared anchor", () => {
  const read = (rel: string) =>
    readFileSync(path.join(REPO_ROOT, rel), "utf-8");
  const tagger = read("scripts/ingest/tag-bills.ts");
  const classify = read("scripts/ingest/_classify-batch.ts");
  const resolver = read("src/lib/prompts/theme-extraction.ts");

  it("tag-bills imports the shared tagger renderer", () => {
    expect(tagger).toContain("renderTaggerPoleBlock");
    expect(tagger).toContain("alignment/poleVocabulary");
  });

  it("_classify-batch imports the shared tagger renderer", () => {
    expect(classify).toContain("renderTaggerPoleBlock");
    expect(classify).toContain("alignment/poleVocabulary");
  });

  it("theme-extraction imports the shared resolver renderer", () => {
    expect(resolver).toContain("renderResolverPoleDirections");
    expect(resolver).toContain("alignment/poleVocabulary");
  });

  it("neither tagger re-inlines the old issue-agnostic stance definition", () => {
    expect(tagger).not.toContain("a YEA vote supports / expands / funds");
    expect(classify).not.toContain("a YEA vote supports / expands / funds");
  });
});

// #175 — the open-ended disambiguation tail is the shared signal the
// theme-refinement prompt renders and the client's question-cap counter
// detects. These guard the two from drifting apart.
describe("disambiguation open-ended tail (#175 question-cap signal)", () => {
  it("the detector matches the exact rendered tail constant", () => {
    expect(
      proseEndsWithDisambiguationTail(DISAMBIGUATION_OPEN_ENDED_TAIL),
    ).toBe(true);
  });

  it("every rendered pole-disambiguation question ends with the tail", () => {
    const block = renderDisambiguationQuestions();
    for (const line of block.split("\n")) {
      const m = line.match(/^\s*question: "(.+)"\s*$/);
      if (m) {
        expect(proseEndsWithDisambiguationTail(m[1])).toBe(true);
      }
    }
  });

  it("does NOT match ordinary closing questions or statements", () => {
    expect(proseEndsWithDisambiguationTail("Want to add anything else?")).toBe(
      false,
    );
    expect(proseEndsWithDisambiguationTail("Does that sound right?")).toBe(
      false,
    );
    expect(proseEndsWithDisambiguationTail("I updated your list.")).toBe(false);
    // Present but not at the end → not a closing question.
    expect(
      proseEndsWithDisambiguationTail(
        "…or is it something else? Either way I kept it.",
      ),
    ).toBe(false);
  });

  it("tolerates a '...' ellipsis and a missing ellipsis", () => {
    expect(proseEndsWithDisambiguationTail("...or is it something else?")).toBe(
      true,
    );
    expect(
      proseEndsWithDisambiguationTail("guns — or is it something else?"),
    ).toBe(true);
  });
});
