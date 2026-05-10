import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Voter Choice",
  description: "Terms of use for the Voter Choice ballot research tool.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 10, 2026</p>

      <section className="prose prose-gray max-w-none space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Purpose</h2>
          <p className="text-gray-700">
            Voter Choice is a free civic education tool. It helps voters
            research their ballots using publicly available information and
            AI-generated summaries. It does <strong>not</strong> make voting
            recommendations.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">
            Not a substitute for official sources
          </h2>
          <p className="text-gray-700">
            AI-generated content can contain errors, omissions, or outdated
            information. Always verify election dates, registration deadlines,
            and candidate information with official government sources before
            making decisions.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">
            No political endorsements
          </h2>
          <p className="text-gray-700">
            Voter Choice does not endorse any candidate, party, ballot measure,
            or political position. The AI assistant is instructed to present
            factual information and help voters think through issues — not to
            advocate.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Acceptable use</h2>
          <p className="text-gray-700">
            You may use Voter Choice for personal civic research. You may not
            use it to generate political advertising, spam, disinformation, or
            any content intended to discourage voting.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Rate limits</h2>
          <p className="text-gray-700">
            To keep the service free and fair, we limit on-site chat to 60
            messages per session, 3 concurrent sessions per IP address, and 5
            new sessions per IP per day. These limits may change.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Disclaimer</h2>
          <p className="text-gray-700">
            This service is provided &ldquo;as is&rdquo; without warranty of any
            kind. We are not responsible for errors in AI-generated content or
            for decisions made based on information from this tool.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p className="text-gray-700">
            Questions?{" "}
            <a
              href="mailto:hello@voterchoice.app"
              className="text-blue-600 hover:underline"
            >
              hello@voterchoice.app
            </a>
          </p>
        </div>
      </section>

      <div className="mt-10">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
