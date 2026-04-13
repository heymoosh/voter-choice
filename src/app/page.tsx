import { LanguageProvider } from "../lib/i18n";
import { ResearchModeProvider } from "../lib/researchMode";
import { LanguageToggle } from "../components/LanguageToggle";
import { BallotToolClient } from "../components/BallotToolClient";
import { PageContent } from "./PageContent";

export default function Home() {
  return (
    <LanguageProvider>
      <ResearchModeProvider>
        <LanguageToggle />
        <div className="min-h-screen bg-surface font-sans flex flex-col">
          <PageContent>
            <BallotToolClient />
          </PageContent>
        </div>
      </ResearchModeProvider>
    </LanguageProvider>
  );
}
