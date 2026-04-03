import { describe, it, expect } from "vitest";
// Smoke tests: verify module exports exist.
// Full behavioral testing (toggle switches language, aria-label updates, aria-live,
// focus ring visible) is covered by E2e tests in Story 5.1/5.2.
// Note: vitest runs in node environment — React components cannot be rendered.
import LanguageToggle from "../components/LanguageToggle";

describe("LanguageToggle module exports", () => {
  it("exports LanguageToggle as a function (React component)", () => {
    expect(typeof LanguageToggle).toBe("function");
  });

  it("LanguageToggle has a displayName or name property", () => {
    expect(LanguageToggle.name).toBeTruthy();
  });
});
