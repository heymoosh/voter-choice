import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Voter Choice",
  description:
    "Voter Choice terms of use. Election information is for research purposes only. Always verify with official sources.",
};

export default function TermsOfUse() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 space-y-8 font-sans">
      <nav>
        <Link href="/" className="text-primary hover:underline text-sm">
          &larr; Back to Voter Choice
        </Link>
      </nav>

      <article className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Terms of Use</h1>
        <p className="text-sm text-on-surface-muted">
          Effective April 12, 2026
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Research Purposes Only
          </h2>
          <p className="text-on-surface">
            Election information provided by Voter Choice is for research
            purposes only. This tool is designed to help you explore what&apos;s
            on your ballot, not to serve as an official source of election
            information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Verify with Official Sources
          </h2>
          <p className="text-on-surface">
            Always verify all dates, deadlines, polling locations, and
            requirements with your official state or county election website.
            Election rules and dates can change. Your state&apos;s Secretary of
            State website is the authoritative source.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            AI Can Make Mistakes
          </h2>
          <p className="text-on-surface">
            The AI chat feature is powered by Claude, an AI assistant made by
            Anthropic. AI can make mistakes, hallucinate facts, or provide
            outdated information. Always check critical information — such as
            registration deadlines, voter ID requirements, and polling locations
            — against official sources before acting on it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Not Affiliated with Government
          </h2>
          <p className="text-on-surface">
            Voter Choice is not affiliated with, endorsed by, or connected to
            any government agency, campaign, political party, or candidate. This
            is an independent, nonpartisan tool built to help voters research
            their ballot.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Chat Availability
          </h2>
          <p className="text-on-surface">
            The free AI chat feature has a limited monthly capacity. When chat
            is unavailable, you can always use the copy-and-paste prompt to
            research your ballot in any free AI chatbot (Claude, ChatGPT,
            Gemini, Grok, or others).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Election Data Updates
          </h2>
          <p className="text-on-surface">
            We update election data periodically. Check the &quot;Data last
            updated&quot; date shown on the site. If an election is approaching
            and the data looks outdated, verify directly with your state
            election office.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">No Warranty</h2>
          <p className="text-on-surface">
            This tool is provided &quot;as is&quot; without warranty of any
            kind. Grey Bird LLC is not liable for any errors, omissions, or
            consequences arising from the use of this tool.
          </p>
        </section>
      </article>

      <footer className="text-sm text-on-surface-muted pt-6 mt-2">
        <p>&copy; 2026 Grey Bird LLC. All Rights Reserved.</p>
      </footer>
    </main>
  );
}
