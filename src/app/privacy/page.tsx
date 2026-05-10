import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Voter Choice",
  description: "How Voter Choice handles your data.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: 2026-05-10</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Our Core Privacy Promise
            </h2>
            <p>
              Voter Choice is designed to store nothing. We do not collect,
              store, or share any personal information about you, your ballot
              choices, or your location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              What We Do Not Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your zip code or location data</li>
              <li>Your chat messages or ballot research</li>
              <li>Your name, email address, or any identifying information</li>
              <li>Cookies, tracking pixels, or device fingerprints</li>
              <li>Any analytics data tied to individuals</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              How the AI Chat Works
            </h2>
            <p>
              When you use the AI chat feature, your messages are sent to
              Anthropic&apos;s Claude API to generate responses.
              Anthropic&apos;s privacy policy governs that data. We do not log
              or store the content of your conversations on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Voter Profile Files
            </h2>
            <p>
              If you upload or download a voter profile, that file lives only in
              your browser memory during your session and on your own device if
              you download it. We never send profile content to our servers — it
              goes directly to the AI API during your session.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Budget Tracking
            </h2>
            <p>
              We track aggregate monthly spending on the AI API (not tied to any
              individual user) to enforce our monthly budget cap. This is an
              anonymous cost counter — we cannot connect it to any specific
              person.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Third-Party Services
            </h2>
            <p>
              We do not load any third-party analytics, advertising, or tracking
              scripts. The only external requests from this tool are to the
              Anthropic API (for AI responses) and to election information links
              you choose to click.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Contact
            </h2>
            <p>
              Questions about this privacy policy? This tool is open source. You
              can review the code or file an issue on our repository.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
