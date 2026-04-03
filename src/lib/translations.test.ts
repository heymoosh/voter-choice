import { describe, it, expect } from "vitest";
import { translations } from "./translations";
import type { Language } from "./translations";

const LANGUAGES: Language[] = ["en", "es"];

describe("translations", () => {
  it("has entries for both languages", () => {
    expect(translations.en).toBeDefined();
    expect(translations.es).toBeDefined();
  });

  LANGUAGES.forEach((lang) => {
    describe(`${lang} record`, () => {
      it("has hero translations", () => {
        expect(translations[lang].hero.title).toBeTruthy();
        expect(translations[lang].hero.subtitle1).toBeTruthy();
        expect(translations[lang].hero.subtitle2).toBeTruthy();
        expect(translations[lang].hero.worksWith).toBeTruthy();
      });

      it("has zipForm translations", () => {
        expect(translations[lang].zipForm.label).toBeTruthy();
        expect(translations[lang].zipForm.placeholder).toBeTruthy();
        expect(translations[lang].zipForm.submit).toBeTruthy();
      });

      it("has loading translation", () => {
        expect(translations[lang].loading).toBeTruthy();
      });

      it("has error translations", () => {
        expect(translations[lang].errors.empty).toBeTruthy();
        expect(translations[lang].errors.invalid).toBeTruthy();
        expect(translations[lang].errors.notFound).toBeTruthy();
        expect(translations[lang].errors.multiState).toBeTruthy();
        expect(typeof translations[lang].errors.noElection).toBe("function");
        expect(translations[lang].errors.noElection("Texas")).toBeTruthy();
        expect(translations[lang].errors.noElection("Texas")).toContain(
          "Texas",
        );
      });

      it("has stateInfo translations", () => {
        expect(translations[lang].stateInfo.election).toBeTruthy();
        expect(translations[lang].stateInfo.electionType).toBeTruthy();
        expect(translations[lang].stateInfo.registrationDeadlines).toBeTruthy();
        expect(translations[lang].stateInfo.earlyVoting).toBeTruthy();
        expect(translations[lang].stateInfo.voterId).toBeTruthy();
        expect(translations[lang].stateInfo.voterIdRequired).toBeTruthy();
        expect(translations[lang].stateInfo.voterIdNotRequired).toBeTruthy();
        expect(translations[lang].stateInfo.phonesAtPolls).toBeTruthy();
        expect(translations[lang].stateInfo.sampleBallot).toBeTruthy();
        expect(translations[lang].stateInfo.countyElectionOffice).toBeTruthy();
        expect(
          translations[lang].stateInfo.earlyVotingNotAvailable,
        ).toBeTruthy();
        expect(translations[lang].stateInfo.deadlinePassed).toBeTruthy();
        expect(
          typeof translations[lang].stateInfo.deadlineStatus,
        ).toBe("function");
        expect(translations[lang].stateInfo.deadlineStatus(5)).toContain("5");
        expect(
          translations[lang].stateInfo.registrationDeadlinePassed,
        ).toBeTruthy();
      });

      it("has stateSelector translations", () => {
        expect(translations[lang].stateSelector.prompt).toBeTruthy();
        expect(translations[lang].stateSelector.selectButton).toBeTruthy();
      });

      it("has promptOutput translations", () => {
        expect(translations[lang].promptOutput.title).toBeTruthy();
        expect(translations[lang].promptOutput.instructions).toBeTruthy();
        expect(translations[lang].promptOutput.copyButton).toBeTruthy();
        expect(translations[lang].promptOutput.copiedButton).toBeTruthy();
      });

      it("has tips translations", () => {
        expect(translations[lang].tips.title).toBeTruthy();
        expect(translations[lang].tips.tip1).toBeTruthy();
        expect(translations[lang].tips.tip2).toBeTruthy();
        expect(translations[lang].tips.tip3).toBeTruthy();
        expect(translations[lang].tips.tip4).toBeTruthy();
        expect(translations[lang].tips.disclaimer).toBeTruthy();
      });

      it("has footer translations", () => {
        expect(translations[lang].footer.share).toBeTruthy();
        expect(translations[lang].footer.createdBy).toBeTruthy();
        expect(translations[lang].footer.basedOn).toBeTruthy();
        expect(translations[lang].footer.promptLink).toBeTruthy();
      });

      it("has a11y translations", () => {
        expect(translations[lang].a11y.skipToContent).toBeTruthy();
        expect(translations[lang].a11y.languageToggleLabel).toBeTruthy();
      });

      it("has no undefined or null values in top-level keys", () => {
        const record = translations[lang];
        const topKeys = Object.keys(record) as (keyof typeof record)[];
        topKeys.forEach((key) => {
          expect(record[key]).not.toBeNull();
          expect(record[key]).not.toBeUndefined();
        });
      });
    });
  });

  describe("Spanish error messages", () => {
    it("matches spec reference: empty zip", () => {
      expect(translations.es.errors.empty).toBe(
        "Por favor ingresa un código postal",
      );
    });

    it("matches spec reference: invalid zip", () => {
      expect(translations.es.errors.invalid).toBe(
        "Por favor ingresa un código postal válido de 5 dígitos",
      );
    });

    it("matches spec reference: not found", () => {
      expect(translations.es.errors.notFound).toContain(
        "Aún no tenemos datos para este código postal",
      );
    });

    it("noElection interpolates state name in Spanish", () => {
      const msg = translations.es.errors.noElection("Texas");
      expect(msg).toContain("Texas");
      expect(msg).toMatch(/[Nn]o se encontraron/);
    });
  });

  describe("Spanish footer", () => {
    it("matches spec reference: createdBy", () => {
      expect(translations.es.footer.createdBy).toBe(
        "Creado por una persona usando herramientas de IA",
      );
    });
  });
});
