import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Voter Choice",
  description: "How Voter Choice protects your privacy.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 10, 2026</p>

      <section className="prose prose-gray max-w-none space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">What we collect</h2>
          <p className="text-gray-700">
            We collect <strong>nothing that identifies you.</strong> Voter
            Choice does not store your zip code, your chat messages, your voter
            profile, or any personal information on our servers. All session
            data lives in your browser memory only and is gone when you close
            the tab.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Budget tracking</h2>
          <p className="text-gray-700">
            To prevent runaway AI costs, we track a single aggregate monthly
            spend estimate in a server-side counter. This number is not tied to
            any individual user, IP address, or session identifier.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">
            Third-party AI providers
          </h2>
          <p className="text-gray-700">
            When you use on-site chat, your messages are sent to
            Anthropic&apos;s Claude API to generate responses. Anthropic&apos;s
            own{" "}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              privacy policy
            </a>{" "}
            applies to that data. We do not log what you send to the API.
          </p>
          <p className="text-gray-700 mt-2">
            When you use the copy/paste path, your messages go directly to
            whichever AI chatbot you choose (Claude, ChatGPT, etc.) and are
            governed by that service&apos;s policies.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">No tracking scripts</h2>
          <p className="text-gray-700">
            We do not load any analytics, advertising, error-tracking, or
            telemetry scripts. There are no cookies except what Next.js requires
            to serve the page.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Voter profiles</h2>
          <p className="text-gray-700">
            If you upload a voter profile, it is held in browser memory only. It
            is never sent to our servers. It is only included in the AI prompt
            payload when you send a chat message.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p className="text-gray-700">
            Questions about privacy? Email us at{" "}
            <a
              href="mailto:privacy@voterchoice.app"
              className="text-blue-600 hover:underline"
            >
              privacy@voterchoice.app
            </a>
            .
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
