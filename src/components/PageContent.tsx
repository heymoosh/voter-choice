"use client";

import { useLanguage } from "../lib/i18n";
import { BallotToolClient } from "./BallotToolClient";

export function PageContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            {t.hero.title}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg mb-4">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-gray-500">{t.hero.worksWith}</span>
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
                className="text-blue-600 hover:underline font-medium"
              >
                {name}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        <BallotToolClient />

        {/* Tips */}
        <section
          className="mt-12 pt-8 border-t border-gray-200"
          aria-labelledby="tips-heading"
        >
          <h2 id="tips-heading" className="text-lg font-semibold mb-4">
            {t.tips.heading}
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            {t.tips.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-500 italic">{t.tips.disclaimer}</p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>
            <strong className="text-gray-700">{t.footer.share}</strong>
          </p>
          <p>{t.footer.created}</p>
        </div>
      </footer>
    </div>
  );
}
