import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Voter Choice",
  description:
    "Voter Choice privacy policy. We collect zero data. Your conversations stay in your browser.",
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
          Voter Choice is operated by Grey Bird LLC. We built this tool with one
          principle: <strong>we do not collect your data</strong>.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Zero Data Collection
          </h2>
          <p className="text-on-surface">
            We do not use cookies, localStorage, sessionStorage, IndexedDB, or
            any other browser storage mechanism. We do not use analytics,
            telemetry, or tracking of any kind. There are no user accounts and
            no sign-ups.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Zip Code Processing
          </h2>
          <p className="text-on-surface">
            The zip code you enter is processed entirely in your browser to look
            up election information from static data files. Your zip code is
            never sent to our servers or any third party.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Chat Conversations
          </h2>
          <p className="text-on-surface">
            Chat conversations exist in your browser memory only. They are not
            stored, logged, or persisted by our servers. When you close or
            refresh the page, your conversation is permanently gone.
          </p>
          <p className="text-on-surface">
            Chat messages are sent to the Anthropic API for processing. We do
            not log or store them on our end. For information about how
            Anthropic handles API data, see{" "}
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
            Address Lookup
          </h2>
          <p className="text-on-surface">
            If you choose to enter your street address to find your polling
            place, that address is sent to the Google Civic Information API
            through our server. We do not log or store your address. For
            information about how Google handles this data, see{" "}
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
            If you upload a voter profile from a previous session, it is used
            only for the current browser session and is not stored on our
            servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-on-surface">
            Rate Limiting
          </h2>
          <p className="text-on-surface">
            To prevent abuse, we use IP-based rate limiting that operates in
            server memory only. IP addresses are not logged, stored to disk, or
            shared with any third party. Rate limit counters are automatically
            cleared when the server restarts.
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
