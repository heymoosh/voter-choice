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
        className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        {t.a11y.skipToContent}
      </a>

      {/* Hero Section */}
      <section aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="text-3xl font-bold mb-3">
          {t.hero.title}
        </h1>
        <p className="text-gray-700 mb-2">{t.hero.subtitle1}</p>
        <p className="text-gray-700 mb-4">{t.hero.subtitle2}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="font-medium text-gray-600">{t.hero.worksWith}</span>
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
              className="text-blue-600 underline"
            >
              {name}
            </a>
          ))}
        </div>
      </section>

      {/* Ballot Tool — children slot (BallotToolClient) */}
      {children}

      {/* Tips Section */}
      <section aria-labelledby="tips-heading" data-testid="tips-section">
        <h2 id="tips-heading" className="text-xl font-bold mb-3">
          {t.tips.title}
        </h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
          <li>{t.tips.tip1}</li>
          <li>{t.tips.tip2}</li>
          <li>{t.tips.tip3}</li>
          <li>{t.tips.tip4}</li>
        </ul>
        <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          <strong>{lang === "en" ? "Important:" : "Importante:"}</strong>{" "}
          {t.tips.disclaimer}
        </p>
      </section>

      {/* Footer */}
      <footer
        role="contentinfo"
        className="border-t pt-6 text-sm text-gray-500 space-y-2"
      >
        <p>
          <strong>
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
            className="underline"
          >
            {t.footer.promptLink}
          </a>
          .
        </p>
      </footer>
    </>
  );
}
