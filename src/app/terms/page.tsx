import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Voter Choice",
  description:
    "Voter Choice terms of use. Election information is for research purposes only. Always verify with official sources.",
};

export default function TermsOfUse() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="max-w-[720px] mx-auto px-8 pt-14 pb-24">
        {/* Back link */}
        <Link
          href="/"
          className="inline-block text-[13.5px] text-civic pb-4 hover:underline underline-offset-[3px]"
        >
          ← Back
        </Link>

        {/* Eyebrow */}
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-civic mb-[10px]">
          Terms of Use
        </div>

        {/* Title */}
        <h1 className="font-serif font-semibold text-[48px] max-sm:text-[36px] leading-none tracking-[-0.025em] text-ink mb-8 text-balance">
          What we promise, and what we can&apos;t.
        </h1>

        {/* Meta — effective date */}
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-6">
          Effective April 12, 2026 &middot; Grey Bird LLC
        </p>

        {/* Article body */}
        <article className="font-serif text-[17px] max-sm:text-[15.5px] leading-[1.65] text-ink space-y-0 [&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-2xl [&_h2]:tracking-[-0.015em] [&_h2]:mt-10 [&_h2]:mb-3.5 [&_h2]:text-ink [&_p]:mb-4">
          <h2>Research Purposes Only</h2>
          <p>
            Election information provided by Voter Choice is for research
            purposes only. This tool is designed to help you explore what&apos;s
            on your ballot, not to serve as an official source of election
            information.
          </p>

          <h2>Verify with Official Sources</h2>
          <p>
            Always verify all dates, deadlines, polling locations, and
            requirements with your official state or county election website.
            Election rules and dates can change. Your state&apos;s Secretary of
            State website is the authoritative source.
          </p>

          <h2>AI Can Make Mistakes</h2>
          <p>
            The AI chat feature is powered by Claude, an AI assistant made by
            Anthropic. AI can make mistakes, hallucinate facts, or provide
            outdated information. Always check critical information &mdash; such
            as registration deadlines, voter ID requirements, and polling
            locations &mdash; against official sources before acting on it.
          </p>

          <h2>Not Affiliated with Government</h2>
          <p>
            Voter Choice is not affiliated with, endorsed by, or connected to
            any government agency, campaign, political party, or candidate. This
            is an independent, nonpartisan tool built to help voters research
            their ballot.
          </p>

          <h2>Chat Availability</h2>
          <p>
            The free AI chat feature has a limited monthly capacity. When chat
            is unavailable, you can always use the copy-and-paste prompt to
            research your ballot in any free AI chatbot (Claude, ChatGPT,
            Gemini, Grok, or others).
          </p>

          <h2>Election Data Updates</h2>
          <p>
            We update election data periodically. Check the &quot;Data last
            updated&quot; date shown on the site. If an election is approaching
            and the data looks outdated, verify directly with your state
            election office.
          </p>

          <h2>No Warranty</h2>
          <p>
            This tool is provided &quot;as is&quot; without warranty of any
            kind. Grey Bird LLC is not liable for any errors, omissions, or
            consequences arising from the use of this tool.
          </p>
        </article>

        {/* Footer */}
        <footer className="font-mono text-[11px] text-ink-3 pt-6 mt-2 border-t border-rule-2">
          <p>&copy; 2026 Grey Bird LLC. All Rights Reserved.</p>
        </footer>
      </div>
    </main>
  );
}
