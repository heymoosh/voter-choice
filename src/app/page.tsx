"use client";

import { BallotTool } from "@/components/BallotTool";
import { TipsSection } from "@/components/TipsSection";
import { Footer } from "@/components/Footer";
import { LanguageToggle } from "@/components/LanguageToggle";
import { HtmlLangUpdater } from "@/components/HtmlLangUpdater";
import { I18nProvider, useTranslation } from "@/lib/i18n/I18nContext";

const CHATBOTS = [
  { name: "Claude", href: "https://claude.ai" },
  { name: "ChatGPT", href: "https://chatgpt.com" },
  { name: "Gemini", href: "https://gemini.google.com" },
  { name: "Grok", href: "https://grok.com" },
];

function PageContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed language toggle — always visible */}
      <LanguageToggle />
      <HtmlLangUpdater />

      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {t.hero.headline}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-xl mx-auto">
            {t.hero.subtitle}
          </p>

          {/* Supported chatbots */}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {CHATBOTS.map(({ name, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 focus:bg-gray-50 focus:border-gray-300 focus:outline-2 focus:outline-blue-500 transition-colors"
              >
                {name}
              </a>
            ))}
          </div>
        </header>

        {/* Main App — BallotTool provides its own I18nProvider */}
        <BallotTool />

        {/* Tips Section */}
        <div className="mt-10">
          <TipsSection />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <PageContent />
    </I18nProvider>
  );
}
