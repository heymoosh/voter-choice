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
      <LanguageToggle />
      <PageContent />
    </LanguageProvider>
  );
}
