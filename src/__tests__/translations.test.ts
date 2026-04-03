import { describe, it, expect } from "vitest";
import { EN, ES, getTranslation } from "../lib/translations";

// Helper: recursively collect all string leaf values from a nested object
function collectStrings(obj: unknown, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") {
        result[path] = v;
      } else {
        Object.assign(result, collectStrings(v, path));
      }
    }
  }
  return result;
}

describe("EN record completeness", () => {
  const enStrings = collectStrings(EN);

  it("has at least 40 translation keys", () => {
    expect(Object.keys(enStrings).length).toBeGreaterThanOrEqual(40);
  });

  it("has no empty string values", () => {
    for (const [key, value] of Object.entries(enStrings)) {
      expect(value, `EN.${key} should not be empty`).not.toBe("");
    }
  });

  it("has no undefined values", () => {
    for (const [key, value] of Object.entries(enStrings)) {
      expect(value, `EN.${key} should not be undefined`).toBeDefined();
    }
  });
});

describe("ES record completeness", () => {
  const esStrings = collectStrings(ES);

  it("has at least 40 translation keys", () => {
    expect(Object.keys(esStrings).length).toBeGreaterThanOrEqual(40);
  });

  it("has no empty string values", () => {
    for (const [key, value] of Object.entries(esStrings)) {
      expect(value, `ES.${key} should not be empty`).not.toBe("");
    }
  });

  it("has no undefined values", () => {
    for (const [key, value] of Object.entries(esStrings)) {
      expect(value, `ES.${key} should not be undefined`).toBeDefined();
    }
  });
});

describe("EN and ES have matching key structure", () => {
  it("both records have the same number of translation keys", () => {
    const enKeys = Object.keys(collectStrings(EN)).sort();
    const esKeys = Object.keys(collectStrings(ES)).sort();
    expect(enKeys).toEqual(esKeys);
  });
});

describe("getTranslation", () => {
  it("returns correct EN string for form.label", () => {
    expect(getTranslation("en", "form.label")).toBe("Zip Code");
  });

  it("returns correct ES string for form.label", () => {
    expect(getTranslation("es", "form.label")).toBe("Código postal");
  });

  it("returns correct EN string for errors.zipEmpty", () => {
    expect(getTranslation("en", "errors.zipEmpty")).toBe(
      "Please enter a zip code",
    );
  });

  it("returns correct ES string for errors.zipEmpty", () => {
    expect(getTranslation("es", "errors.zipEmpty")).toBe(
      "Por favor ingresa un código postal",
    );
  });

  it("returns correct EN string for prompt.copyButton", () => {
    expect(getTranslation("en", "prompt.copyButton")).toBe("Copy to Clipboard");
  });

  it("returns correct ES string for prompt.copyButton", () => {
    expect(getTranslation("es", "prompt.copyButton")).toBe(
      "Copiar en el portapapeles",
    );
  });

  it("returns correct EN string for a11y.langToggleToEs", () => {
    expect(getTranslation("en", "a11y.langToggleToEs")).toBe(
      "Switch to Spanish",
    );
  });

  it("returns correct ES string for a11y.langChangedToEs", () => {
    expect(getTranslation("es", "a11y.langChangedToEs")).toBe(
      "Idioma cambiado a español",
    );
  });

  it("falls back to key for unknown path", () => {
    expect(getTranslation("en", "nonexistent.key")).toBe("nonexistent.key");
  });

  it("falls back to key for partially valid path", () => {
    expect(getTranslation("es", "form.nonexistent")).toBe("form.nonexistent");
  });
});

describe("required key groups exist", () => {
  it("EN has hero keys", () => {
    expect(EN.hero.headline).toBeDefined();
    expect(EN.hero.subtitle).toBeDefined();
  });

  it("EN has form keys", () => {
    expect(EN.form.label).toBeDefined();
    expect(EN.form.placeholder).toBeDefined();
    expect(EN.form.submit).toBeDefined();
    expect(EN.form.continue).toBeDefined();
  });

  it("EN has all error keys", () => {
    expect(EN.errors.zipEmpty).toBeDefined();
    expect(EN.errors.zipInvalid).toBeDefined();
    expect(EN.errors.zipNotFound).toBeDefined();
    expect(EN.errors.multiState).toBeDefined();
    expect(EN.errors.deadlinePassed).toBeDefined();
    expect(EN.errors.noElection).toBeDefined();
    expect(EN.errors.findElectionWebsite).toBeDefined();
  });

  it("EN has stateInfo keys", () => {
    expect(EN.stateInfo.registrationDeadlines).toBeDefined();
    expect(EN.stateInfo.earlyVoting).toBeDefined();
    expect(EN.stateInfo.voterId).toBeDefined();
    expect(EN.stateInfo.phonesAtPolls).toBeDefined();
    expect(EN.stateInfo.electionWebsite).toBeDefined();
    expect(EN.stateInfo.sampleBallot).toBeDefined();
  });

  it("EN has deadline keys", () => {
    expect(EN.deadline.daysLeft).toBeDefined();
    expect(EN.deadline.dayLeft).toBeDefined();
    expect(EN.deadline.today).toBeDefined();
    expect(EN.deadline.tomorrow).toBeDefined();
    expect(EN.deadline.passed).toBeDefined();
    expect(EN.deadline.notAvailable).toBeDefined();
  });

  it("EN has prompt keys", () => {
    expect(EN.prompt.heading).toBeDefined();
    expect(EN.prompt.instructions).toBeDefined();
    expect(EN.prompt.copyButton).toBeDefined();
    expect(EN.prompt.copiedButton).toBeDefined();
  });

  it("EN has tips keys including all 5 tips", () => {
    expect(EN.tips.heading).toBeDefined();
    expect(EN.tips.tip1).toBeDefined();
    expect(EN.tips.tip2).toBeDefined();
    expect(EN.tips.tip3).toBeDefined();
    expect(EN.tips.tip4).toBeDefined();
    expect(EN.tips.tip5).toBeDefined();
  });

  it("EN has footer keys", () => {
    expect(EN.footer.share).toBeDefined();
    expect(EN.footer.credit).toBeDefined();
  });

  it("EN has a11y keys", () => {
    expect(EN.a11y.skipToContent).toBeDefined();
    expect(EN.a11y.langToggleToEs).toBeDefined();
    expect(EN.a11y.langToggleToEn).toBeDefined();
    expect(EN.a11y.langChangedToEs).toBeDefined();
    expect(EN.a11y.langChangedToEn).toBeDefined();
  });

  it("ES has all the same groups with non-empty strings", () => {
    expect(ES.hero.headline).toBeTruthy();
    expect(ES.form.label).toBeTruthy();
    expect(ES.errors.zipEmpty).toBeTruthy();
    expect(ES.stateInfo.registrationDeadlines).toBeTruthy();
    expect(ES.deadline.daysLeft).toBeTruthy();
    expect(ES.prompt.copyButton).toBeTruthy();
    expect(ES.tips.heading).toBeTruthy();
    expect(ES.footer.credit).toBeTruthy();
    expect(ES.a11y.langChangedToEs).toBeTruthy();
  });
});
