import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Voter Choice",
  description:
    "Voter Choice privacy policy. How address lookup, AI chat, and local profile files are handled.",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 space-y-8 font-sans">
      <nav>
        <Link href="/" className="text-primary hover:underline text-sm">
          &larr; Back to Voter Choice
        </Link>
      </nav>

      <article className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Privacy Policy</h1>
        <p className="text-sm text-on-surface-muted">
          Effective April 12, 2026
        </p>

        <p className="text-on-surface">
          Voter Choice is operated by Grey Bird LLC. We built this tool to
          minimize data collection and to keep your ballot research under your
          control.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Minimal Data Collection
          </h2>
          <p className="text-on-surface">
            We do not use analytics, telemetry, tracking pixels, user accounts,
            or sign-ups. The app stores your language preference in your
            browser&apos;s localStorage so the interface can stay in English or
            Spanish across visits.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Zip Code Processing
          </h2>
          <p className="text-on-surface">
            A bare zip code can be processed in your browser to look up election
            information from static data files. If you enter a full address, it
            may be used for address autocomplete and polling-place lookup as
            described below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Chat Conversations
          </h2>
          <p className="text-on-surface">
            Chat conversations exist in your browser memory while the page is
            open. They are not intentionally stored, logged, or persisted by our
            servers. When you close or refresh the page, your conversation is
            gone from the app.
          </p>
          <p className="text-on-surface">
            Chat messages are sent to the Anthropic API for processing. We do
            not send your exact address to Anthropic unless you type it into the
            chat yourself. Please do not type your name, exact address, phone,
            email, or other identifying details into chat. For information about
            how Anthropic handles API data, see{" "}
            <a
              href="https://www.anthropic.com/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Anthropic&apos;s privacy policy
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            What We Cannot Provide
          </h2>
          <p className="text-on-surface">
            We do not create or store a combined record of who you are, where
            you live, and what you said in chat. That means if anyone asked us
            for “who said what and where they live,” we would not have that
            combined record to give them. This does not prevent disclosure by
            Google, Anthropic, Vercel, GitHub, Upstash, or other infrastructure
            providers for the data they process under their own policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Address Lookup
          </h2>
          <p className="text-on-surface">
            If you choose to enter your street address to find your polling
            place, the app may use Google Places in your browser for address
            autocomplete and sends the address to the Google Civic Information
            API through our server for polling-place and contest lookup. We do
            not intentionally log or store your address, and we do not include
            it in the AI chat prompt. For information about how Google handles
            this data, see{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google&apos;s privacy policy
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Voter Profile Uploads
          </h2>
          <p className="text-on-surface">
            If you upload a voter profile from a previous session, it is used in
            the current browser session. If you use the built-in AI chat, the
            profile is sent to Anthropic as chat context. We do not store the
            uploaded profile on our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Rate Limiting
          </h2>
          <p className="text-on-surface">
            To prevent abuse and protect the free chat budget, we use IP-based
            rate limiting. If durable production safeguards are configured, the
            counters may be stored in a Redis-compatible service. IP addresses
            are not intentionally logged, stored by this application for voter
            profiling, or shared by us with any third party for tracking.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">Contact</h2>
          <p className="text-on-surface">
            Questions about this policy? Reach out at{" "}
            <strong>Grey Bird LLC</strong>.
          </p>
        </section>
      </article>

      <footer className="text-sm text-on-surface-muted pt-6 mt-2">
        <p>&copy; 2026 Grey Bird LLC. All Rights Reserved.</p>
      </footer>
    </main>
  );
}
