import { describe, it, expect } from "vitest";
import { TRANSLATIONS } from "./VoterChoiceApp";

/* Recursively collects every leaf key path in a TRANSLATIONS[lang] object,
   e.g. "repCard.attendanceShowsUp" or "whyNowPage.snippets.0.label". Used
   to assert en/es stay in lockstep — every surface that calls
   t("some.key") must have a real string on both sides, or the surface
   silently falls back to (broken) English. */
function collectKeyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(
    ([key, value]) => collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("VoterChoiceApp TRANSLATIONS (redesign i18n)", () => {
  it("has both en and es dictionaries", () => {
    expect(TRANSLATIONS.en).toBeDefined();
    expect(TRANSLATIONS.es).toBeDefined();
  });

  it("has an identical key shape between en and es (no missing translations)", () => {
    const enKeys = collectKeyPaths(TRANSLATIONS.en).sort();
    const esKeys = collectKeyPaths(TRANSLATIONS.es).sort();
    const missingFromEs = enKeys.filter((k) => !esKeys.includes(k));
    const missingFromEn = esKeys.filter((k) => !enKeys.includes(k));
    expect(missingFromEs).toEqual([]);
    expect(missingFromEn).toEqual([]);
  });

  it("has no empty-string leaf values in either language", () => {
    const enKeys = collectKeyPaths(TRANSLATIONS.en);
    const esKeys = collectKeyPaths(TRANSLATIONS.es);
    const getAt = (root: any, path: string) =>
      path.split(".").reduce((o, k) => (o == null ? o : o[k]), root);
    for (const k of enKeys) {
      expect(getAt(TRANSLATIONS.en, k), `en.${k}`).not.toBe("");
    }
    for (const k of esKeys) {
      expect(getAt(TRANSLATIONS.es, k), `es.${k}`).not.toBe("");
    }
  });

  // Surfaces wired up for "Finish Spanish coverage for remaining redesign
  // surfaces": tier-intro paragraphs, SeatChat, RepCard, HandoffModal,
  // ScorecardPrintView, App2 stage errors, IssueConversation fallbacks.
  // Also covers "Spanish/i18n for new redesign copy (Why Now? page,
  // orientation screen)": the WhyNowPage static page (PR #155) and the
  // guided OrientationView interstitial (PR #160), both previously
  // hardcoded in English despite the shared useI18n() mechanism already
  // being in scope for nav labels.
  const newSurfaceKeys: Array<[string, string]> = [
    ["scorecard", "tierFedWhat"],
    ["scorecard", "tierExecWhat"],
    ["seatChat", "askAnything"],
    ["seatChat", "inputPlaceholder"],
    ["seatChat", "chipRecordOn"],
    ["repCard", "attendanceShowsUp"],
    ["repCard", "withYou"],
    ["repCard", "seeFullRecord"],
    ["repCard", "worthKeeping"],
    ["repCard", "timeToReplace"],
    ["handoffModal", "lede"],
    ["handoffModal", "title"],
    ["scorecardPrint", "aligned"],
    ["scorecardPrint", "reviewBefore"],
    ["delegationError", "geocodeFailTitle"],
    ["delegationError", "noRepTitle"],
    ["delegationError", "dbErrorTitle"],
    ["intake", "updatedFallback"],
    ["intake", "notedFallback"],
    ["whyNowPage", "mastKicker"],
    ["whyNowPage", "title"],
    ["whyNowPage", "dek"],
    ["whyNowPage", "band1Kicker"],
    ["whyNowPage", "band1H2"],
    ["whyNowPage", "band1P1"],
    ["whyNowPage", "band1P2"],
    ["whyNowPage", "band1P3"],
    ["whyNowPage", "band2Kicker"],
    ["whyNowPage", "band2H2"],
    ["whyNowPage", "band2P"],
    ["whyNowPage", "band3Kicker"],
    ["whyNowPage", "band3Pull"],
    ["whyNowPage", "howKicker"],
    ["whyNowPage", "howH2"],
    ["whyNowPage", "ctaH2"],
    ["whyNowPage", "ctaP"],
    ["whyNowPage", "ctaButton"],
    ["whyNowPage", "ctaSub"],
    ["orientation", "kicker"],
    ["orientation", "heading"],
    ["orientation", "lede"],
    ["orientation", "step1Title"],
    ["orientation", "step1Body"],
    ["orientation", "step2Title"],
    ["orientation", "step2Body"],
    ["orientation", "step3Title"],
    ["orientation", "step3Body"],
    ["orientation", "continueLabel"],
    ["orientation", "metaMinutes"],
    ["orientation", "metaSeatSingular"],
    ["orientation", "metaSeatsPlural"],
  ];

  it.each(newSurfaceKeys)(
    "%s.%s exists with a non-empty string in en and es",
    (section, key) => {
      const enVal = (TRANSLATIONS.en as any)[section][key];
      const esVal = (TRANSLATIONS.es as any)[section][key];
      expect(typeof enVal).toBe("string");
      expect(typeof esVal).toBe("string");
      expect(enVal.length).toBeGreaterThan(0);
      expect(esVal.length).toBeGreaterThan(0);
    },
  );

  it("keeps the {var} substitution tokens usable via the t() vars contract", () => {
    // t() does str.replace(/\{key\}/g, value) — confirm the templated keys
    // still carry the {token} placeholders on both sides after translation.
    expect(TRANSLATIONS.en.seatChat.inputPlaceholder).toContain("{subject}");
    expect(TRANSLATIONS.es.seatChat.inputPlaceholder).toContain("{subject}");
    expect(TRANSLATIONS.en.repCard.seeFullRecord).toContain("{n}");
    expect(TRANSLATIONS.es.repCard.seeFullRecord).toContain("{n}");
    expect(TRANSLATIONS.en.handoffModal.lede).toContain("{reviewed}");
    expect(TRANSLATIONS.es.handoffModal.lede).toContain("{reviewed}");
    expect(TRANSLATIONS.en.delegationError.noRepTitle).toContain("{territory}");
    expect(TRANSLATIONS.es.delegationError.noRepTitle).toContain("{territory}");
    expect(TRANSLATIONS.en.orientation.metaSeatSingular).toContain("{n}");
    expect(TRANSLATIONS.es.orientation.metaSeatSingular).toContain("{n}");
    expect(TRANSLATIONS.en.orientation.metaSeatsPlural).toContain("{n}");
    expect(TRANSLATIONS.es.orientation.metaSeatsPlural).toContain("{n}");
  });

  it("has 2 whyNowPage fact snippets (value/unit/label/cite) in en and es", () => {
    // The keystone WhyNow artboard's problem band carries exactly two stats
    // (6 hrs/day fundraising · 94% incumbents win); the 435/34/1 figures live
    // in the brand band's .wn-ballot, not as a third stat card.
    for (const lang of ["en", "es"] as const) {
      const snippets = (TRANSLATIONS[lang] as any).whyNowPage.snippets;
      expect(Array.isArray(snippets)).toBe(true);
      expect(snippets).toHaveLength(2);
      for (const s of snippets) {
        expect(typeof s.value).toBe("string");
        expect(s.value.length).toBeGreaterThan(0);
        expect(typeof s.unit).toBe("string");
        expect(s.unit.length).toBeGreaterThan(0);
        expect(typeof s.label).toBe("string");
        expect(s.label.length).toBeGreaterThan(0);
        expect(typeof s.cite).toBe("string");
        expect(s.cite.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the orientation.heading <em> markup usable via dangerouslySetInnerHTML", () => {
    // OrientationView's ori-card h1 renders orientation.heading via
    // dangerouslySetInnerHTML (matching the tierFedWhat/tierExecWhat
    // pattern) so the <em> emphasis from the OrientationActivated artboard
    // survives translation.
    expect(TRANSLATIONS.en.orientation.heading).toContain("<em>");
    expect(TRANSLATIONS.en.orientation.heading).toContain("</em>");
    expect(TRANSLATIONS.es.orientation.heading).toContain("<em>");
    expect(TRANSLATIONS.es.orientation.heading).toContain("</em>");
  });

  it("keeps the WhyNow inline emphasis markup usable via dangerouslySetInnerHTML", () => {
    // WhyNowPage renders title / band2H2 / howH2 / band1P* / band3Pull via
    // dangerouslySetInnerHTML so the keystone WhyNow artboard's <em>/<b>/
    // lead-in/src emphasis survives translation on both sides.
    for (const lang of ["en", "es"] as const) {
      const wn = (TRANSLATIONS[lang] as any).whyNowPage;
      expect(wn.title).toContain("<em>");
      expect(wn.band2H2).toContain("<em>");
      expect(wn.howH2).toContain("<em>");
      expect(wn.band1P1).toContain('class="lead-in"');
      expect(wn.band3Pull).toContain('class="src"');
    }
  });

  it("has 3 whyNowPage ballot cells and 3 how-it-works steps in en and es", () => {
    for (const lang of ["en", "es"] as const) {
      const wn = (TRANSLATIONS[lang] as any).whyNowPage;
      expect(Array.isArray(wn.ballot)).toBe(true);
      expect(wn.ballot).toHaveLength(3);
      for (const c of wn.ballot) {
        expect(typeof c.value).toBe("string");
        expect(c.value.length).toBeGreaterThan(0);
        expect(typeof c.label).toBe("string");
        expect(c.label.length).toBeGreaterThan(0);
      }
      expect(Array.isArray(wn.steps)).toBe(true);
      expect(wn.steps).toHaveLength(3);
      for (const s of wn.steps) {
        expect(typeof s.title).toBe("string");
        expect(s.title.length).toBeGreaterThan(0);
        expect(typeof s.body).toBe("string");
        expect(s.body.length).toBeGreaterThan(0);
        expect(typeof s.tag).toBe("string");
        expect(s.tag.length).toBeGreaterThan(0);
      }
    }
  });
});
