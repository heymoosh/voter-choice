import { LanguageProvider } from "../lib/i18n";
import { ResearchModeProvider } from "../lib/researchMode";
import { BallotToolClient } from "../components/BallotToolClient";
import { PageContent } from "./PageContent";

// Force dynamic rendering so the Phase 2 cold-open flag (read from
// process.env.PROMPT_FLEET_V2 below) is evaluated at request time, not
// at build time. Without this Next.js statically pre-renders `/` and
// the flag value gets baked in at build, defeating the runtime gate
// the redesign relies on.
//
// The page wraps a client component (BallotToolClient) so per-request
// rendering adds negligible cost — the server boundary's only work is
// reading two env vars and rendering the shell.
//
// See .ai/work-packets/redesign-phase-2-free-form-cold-open.md.
export const dynamic = "force-dynamic";

export default function Home() {
  // Server-side env read for the redesign Phase 2 cold-open flag. We read
  // here (Server Component boundary) rather than via NEXT_PUBLIC_* so the
  // flag never leaks into the public bundle for unauthenticated users. The
  // boolean is threaded down through BallotToolClient → ResearchLayout →
  // ChatPanel; downstream ES locale callers still get the legacy flow even
  // when the flag is on (ChatPanel gates on lang === "en").
  //
  // See .ai/work-packets/redesign-phase-2-free-form-cold-open.md.
  const promptFleetV2Enabled =
    typeof process.env.PROMPT_FLEET_V2 === "string" &&
    process.env.PROMPT_FLEET_V2.length > 0;

  return (
    <LanguageProvider>
      <ResearchModeProvider>
        <div className="min-h-screen bg-surface font-sans flex flex-col">
          <PageContent>
            <BallotToolClient promptFleetV2Enabled={promptFleetV2Enabled} />
          </PageContent>
        </div>
      </ResearchModeProvider>
    </LanguageProvider>
  );
}
