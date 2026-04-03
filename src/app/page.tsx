import { LanguageProvider } from "../lib/i18n";
import { LanguageToggle } from "../components/LanguageToggle";
import { PageContent } from "../components/PageContent";

export const metadata = {
  title: "AI Ballot Research Tool — Know What You're Voting For",
  description:
    "Enter your zip code to get a customized AI ballot research prompt. Free, nonpartisan, works with any chatbot.",
};

export default function Home() {
  return (
    <LanguageProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>
      <LanguageToggle />
      <PageContent />
    </LanguageProvider>
  );
}
