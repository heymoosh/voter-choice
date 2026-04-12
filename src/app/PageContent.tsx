"use client";

import React from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

interface PageContentProps {
  children?: React.ReactNode;
}

export function PageContent({ children }: PageContentProps) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <>
      {/* Skip to main content link (translated) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-sm"
      >
        {t.a11y.skipToContent}
      </a>

      {/* Hero Section */}
      <section aria-labelledby="hero-heading">
        <h1
          id="hero-heading"
          className="text-4xl md:text-[3.5rem] md:leading-tight font-bold tracking-tight text-primary mb-4"
        >
          {t.hero.title}
        </h1>
        <p className="text-base text-on-surface mb-2">{t.hero.subtitle1}</p>
        <p className="text-sm text-on-surface-muted mb-4">{t.hero.subtitle2}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="font-medium text-on-surface-muted">
            {t.hero.worksWith}
          </span>
          {[
            { name: "Claude", url: "https://claude.ai" },
            { name: "ChatGPT", url: "https://chatgpt.com" },
            { name: "Gemini", url: "https://gemini.google.com" },
            { name: "Grok", url: "https://grok.com" },
          ].map(({ name, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {name}
            </a>
          ))}
        </div>
      </section>

      {/* Ballot Tool — children slot (BallotToolClient) */}
      {children}

      {/* Tips Section */}
      <section
        aria-labelledby="tips-heading"
        data-testid="tips-section"
        className="bg-surface-low rounded-sm p-6"
      >
        <h2
          id="tips-heading"
          className="text-xl font-bold mb-3 text-on-surface"
        >
          {t.tips.title}
        </h2>
        <ul className="list-disc list-inside space-y-2 text-on-surface text-sm">
          <li>{t.tips.tip1}</li>
          <li>{t.tips.tip2}</li>
          <li>{t.tips.tip3}</li>
          <li>{t.tips.tip4}</li>
        </ul>
        <p className="mt-3 text-sm bg-surface-lowest rounded-sm p-3 border-l-4 border-l-accent text-on-surface">
          <strong>{lang === "en" ? "Important:" : "Importante:"}</strong>{" "}
          {t.tips.disclaimer}
        </p>
      </section>

      {/* Footer */}
      <footer
        role="contentinfo"
        className="bg-surface-high rounded-sm p-6 text-sm text-on-surface-muted space-y-3"
      >
        <p>
          <strong className="text-on-surface">
            {lang === "en" ? "Share this tool" : "Comparte esta herramienta"}
          </strong>{" "}
          {t.footer.share}
        </p>
        <p>{t.footer.createdBy}</p>
        <p>
          {t.footer.basedOn}{" "}
          <a
            href="https://docs.google.com/document/d/1_you_ballot_research_prompt"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            {t.footer.promptLink}
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
          <a
            href="/privacy"
            className="underline text-primary hover:text-primary-dark"
          >
            {t.footer.privacyPolicy}
          </a>
          <a
            href="/terms"
            className="underline text-primary hover:text-primary-dark"
          >
            {t.footer.termsOfUse}
          </a>
        </div>
        <p>{t.footer.dataLastUpdated("April 12, 2026")}</p>
        <p>{t.footer.copyright}</p>
      </footer>
    </>
  );
}
