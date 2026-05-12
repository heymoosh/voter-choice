"use client";

import BallotTool from "@/components/BallotTool";
import ShareButton from "@/components/ShareButton";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";

const CHATBOTS = [
  {
    name: "Claude",
    url: "https://claude.ai",
    descKey: "chatbotDescClaude" as const,
  },
  {
    name: "ChatGPT",
    url: "https://chatgpt.com",
    descKey: "chatbotDescChatGPT" as const,
  },
  {
    name: "Gemini",
    url: "https://gemini.google.com",
    descKey: "chatbotDescGemini" as const,
  },
  {
    name: "Grok",
    url: "https://grok.com",
    descKey: "chatbotDescGrok" as const,
  },
];

const TIPS_KEYS = [
  { headingKey: "tip1Heading" as const, bodyKey: "tip1Body" as const },
  { headingKey: "tip2Heading" as const, bodyKey: "tip2Body" as const },
  { headingKey: "tip3Heading" as const, bodyKey: "tip3Body" as const },
  { headingKey: "tip4Heading" as const, bodyKey: "tip4Body" as const },
  { headingKey: "tip5Heading" as const, bodyKey: "tip5Body" as const },
];

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-blue-700">
            {t("appName")}
          </span>
          <LanguageToggle />
        </div>
      </header>

      <main id="main-content" className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <section
            aria-labelledby="hero-heading"
            className="text-center sm:text-left"
          >
            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight"
            >
              {t("heroHeadline")}{" "}
              <span className="text-blue-600">
                {t("heroHeadlineHighlight")}
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl">
              {t("heroSubtitle")}
            </p>
            <p className="mt-2 text-base text-gray-500 max-w-2xl">
              {t("heroSubtitleNote")}
            </p>

            {/* Chatbot links */}
            <div
              className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start"
              aria-label={t("heroChatbotsLabel")}
            >
              {CHATBOTS.map((bot) => (
                <a
                  key={bot.name}
                  href={bot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors min-h-[44px]"
                >
                  <span>{bot.name}</span>
                  <span className="text-gray-400 text-xs">
                    {t(bot.descKey)}
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* Main Tool */}
          <section aria-label="Ballot research tool">
            <BallotTool />
          </section>

          {/* Tips Section */}
          <section aria-labelledby="tips-heading">
            <h2
              id="tips-heading"
              className="text-xl font-bold text-gray-900 mb-4"
            >
              {t("tipsSectionHeading")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {TIPS_KEYS.map((tip) => (
                <div
                  key={tip.headingKey}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    {t(tip.headingKey)}
                  </h3>
                  <p className="text-sm text-gray-600">{t(tip.bodyKey)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-6 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between text-sm text-gray-500">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
            <span>{t("footerCredit")}</span>
          </div>
          <div className="flex gap-4 items-center">
            <ShareButton />
          </div>
        </div>
      </footer>
    </div>
  );
}
