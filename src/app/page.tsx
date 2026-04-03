import { LanguageProvider } from "../lib/i18n";
import { LanguageToggle } from "../components/LanguageToggle";
import { BallotToolClient } from "../components/BallotToolClient";
import { PageContent } from "./PageContent";

export default function Home() {
  return (
    <LanguageProvider>
      <LanguageToggle />
      <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 space-y-8">
        <PageContent>
          <BallotToolClient />
        </PageContent>
      </main>
    </LanguageProvider>
  );
}
