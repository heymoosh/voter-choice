"use client";

import { useLanguage } from "@/lib/i18n";
import { BallotToolClient } from "./BallotToolClient";

const CHATBOTS = [
  { name: "Claude", href: "https://claude.ai" },
  { name: "ChatGPT", href: "https://chatgpt.com" },
  { name: "Gemini", href: "https://gemini.google.com" },
  { name: "Grok", href: "https://grok.com" },
];

export function PageContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Hero */}
        <header className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {t.hero.headline}
          </h1>
          <p className="mx-auto max-w-xl text-base text-gray-600 sm:text-lg">
            {t.hero.subtitle}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-gray-500">{t.hero.worksWith}</span>
            {CHATBOTS.map(({ name, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700"
              >
                {name}
              </a>
            ))}
          </div>
        </header>

        {/* Main tool */}
        <BallotToolClient />

        {/* Tips */}
        <section className="mt-12 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            {t.tips.title}
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            {t.tips.items.map((item, i) => (
              <li key={i}>
                <strong>{item.bold}</strong>
                {item.rest}
              </li>
            ))}
          </ul>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p className="mb-2">
            <strong className="text-gray-700">{t.footer.share}</strong>
          </p>
          <p>{t.footer.attribution}</p>
        </footer>
      </main>
    </div>
  );
}
