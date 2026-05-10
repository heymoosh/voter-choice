import { describe, it, expect } from "vitest";
import { translations } from "@/lib/translations";

describe("translations", () => {
  describe("English translations", () => {
    const en = translations.en;

    it("has hero title", () => {
      expect(en.hero.title).toBeTruthy();
      expect(en.hero.title.length).toBeGreaterThan(0);
    });

    it("has zip form labels", () => {
      expect(en.zipForm.label).toBeTruthy();
      expect(en.zipForm.placeholder).toBeTruthy();
      expect(en.zipForm.submit).toBeTruthy();
    });

    it("has all error messages", () => {
      expect(en.errors.emptyZip).toBeTruthy();
      expect(en.errors.invalidZip).toBeTruthy();
      expect(en.errors.notFound).toBeTruthy();
    });

    it("has state info labels", () => {
      expect(en.stateInfo.registrationDeadlines).toBeTruthy();
      expect(en.stateInfo.earlyVoting).toBeTruthy();
      expect(en.stateInfo.voterId).toBeTruthy();
    });

    it("has prompt labels", () => {
      expect(en.prompt.heading).toBeTruthy();
      expect(en.prompt.copyButton).toBeTruthy();
      expect(en.prompt.copyConfirmation).toBeTruthy();
    });

    it("has tips", () => {
      expect(en.tips.tip1).toBeTruthy();
      expect(en.tips.tip2).toBeTruthy();
      expect(en.tips.tip3).toBeTruthy();
      expect(en.tips.tip4).toBeTruthy();
    });

    it("has footer content", () => {
      expect(en.footer.privacy).toBeTruthy();
      expect(en.footer.terms).toBeTruthy();
    });

    it("has deadline status labels", () => {
      expect(en.deadlineStatus.passed).toBeTruthy();
      expect(en.deadlineStatus.urgent).toBeTruthy();
      expect(en.deadlineStatus.daysLeft).toBeTruthy();
    });

    it("has chat labels", () => {
      expect(en.chat.heading).toBeTruthy();
      expect(en.chat.send).toBeTruthy();
    });

    it("has profile labels", () => {
      expect(en.profile.upload).toBeTruthy();
      expect(en.profile.download).toBeTruthy();
    });
  });

  describe("Spanish translations", () => {
    const es = translations.es;

    it("has Spanish hero title", () => {
      expect(es.hero.title).toBeTruthy();
      expect(es.hero.title).not.toBe(translations.en.hero.title);
    });

    it("has Spanish zip form labels", () => {
      expect(es.zipForm.label).toBeTruthy();
      expect(es.zipForm.submit).toBeTruthy();
    });

    it("has Spanish error messages", () => {
      expect(es.errors.emptyZip).toBeTruthy();
      expect(es.errors.invalidZip).toBeTruthy();
    });

    it("has Spanish state info labels", () => {
      expect(es.stateInfo.registrationDeadlines).toBeTruthy();
      expect(es.stateInfo.earlyVoting).toBeTruthy();
    });

    it("has Spanish prompt labels", () => {
      expect(es.prompt.heading).toBeTruthy();
      expect(es.prompt.copyButton).toBeTruthy();
    });

    it("Spanish language toggle label is English", () => {
      expect(es.languageToggle.label).toBe("English");
    });

    it("English language toggle label is Spanish", () => {
      expect(translations.en.languageToggle.label).toBe("Español");
    });
  });

  describe("translation completeness", () => {
    const enKeys = Object.keys(translations.en);
    const esKeys = Object.keys(translations.es);

    it("Spanish has all top-level sections as English", () => {
      for (const key of enKeys) {
        expect(esKeys).toContain(key);
      }
    });
  });
});
