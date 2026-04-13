import { LanguageProvider } from "../lib/i18n";
import { LanguageToggle } from "../components/LanguageToggle";
import { BallotToolClient } from "../components/BallotToolClient";
import { PageContent } from "./PageContent";

export default function Home() {
  return (
    <LanguageProvider>
      <LanguageToggle />
      <div className="min-h-screen bg-surface font-sans">
        <PageContent>
          <BallotToolClient />
        </PageContent>
      </div>
    </LanguageProvider>
  );
}
