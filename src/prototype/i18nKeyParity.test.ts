import { describe, it, expect } from "vitest";
import { TRANSLATIONS } from "./VoterChoiceApp";

/* Recursively collects every leaf key path in a TRANSLATIONS[lang] object,
   e.g. "repCard.attendanceShowsUp". Used to assert en/es stay in lockstep —
   every surface that calls t("some.key") must have a real string on both
   sides, or the surface silently falls back to (broken) English. */
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
  });
});
