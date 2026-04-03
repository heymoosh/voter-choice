import { describe, it, expect } from "vitest";
// Smoke tests: verify module exports exist and types are correct.
// Full behavioral testing (SSR hydration guard, localStorage sync,
// lang attribute, useLanguage hook) is covered by E2e tests in Story 5.1/5.2.
// Note: vitest runs in node environment — React hooks cannot be tested directly.
import {
  LANGUAGE_STORAGE_KEY,
  LanguageContext,
  LanguageProvider,
  useLanguage,
} from "../lib/i18n";

describe("i18n module exports", () => {
  it("exports LANGUAGE_STORAGE_KEY as voter-choice-lang", () => {
    expect(LANGUAGE_STORAGE_KEY).toBe("voter-choice-lang");
  });

  it("exports LanguageContext object", () => {
    expect(LanguageContext).toBeDefined();
    expect(typeof LanguageContext).toBe("object");
  });

  it("exports LanguageProvider as a function", () => {
    expect(typeof LanguageProvider).toBe("function");
  });

  it("exports useLanguage as a function", () => {
    expect(typeof useLanguage).toBe("function");
  });
});
