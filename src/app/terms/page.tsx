import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Voter Choice",
  description: "Terms of use for the Voter Choice ballot research tool.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Back to Voter Choice
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: 2026-05-10</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              What This Tool Is
            </h2>
            <p>
              Voter Choice is a free, nonpartisan tool that helps U.S. voters
              research their ballots using AI. It is a research starting point,
              not a substitute for your own judgment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Guarantees
            </h2>
            <p>
              AI can make mistakes. Election rules, deadlines, and candidate
              information change. Always verify information with your
              state&apos;s official election authority before making decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Nonpartisan Use
            </h2>
            <p>
              This tool is designed to be nonpartisan. It is not affiliated with
              any political party, candidate, or campaign. Do not use this tool
              to spread misinformation or to manipulate voters.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Acceptable Use
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the tool for personal ballot research</li>
              <li>
                Share the tool with others who want to research their ballots
              </li>
              <li>Do not attempt to circumvent rate limits or abuse the API</li>
              <li>Do not use the tool to generate political misinformation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Limitation of Liability
            </h2>
            <p>
              This tool is provided &quot;as is&quot; without warranties of any
              kind. We are not responsible for errors in AI-generated content or
              for decisions you make based on this tool.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Changes
            </h2>
            <p>
              We may update these terms as the tool evolves. Continued use of
              the tool after changes constitutes acceptance of the updated
              terms.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
