import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Voter Choice",
  description:
    "Voter Choice privacy policy. How address lookup, AI chat, and local profile files are handled.",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-paper py-14 px-8 pb-24">
      <div className="max-w-[720px] mx-auto">
        {/* Back link */}
        <nav className="mb-0">
          <Link
            href="/"
            className="text-civic text-[13.5px] hover:underline underline-offset-[3px] pb-4 inline-block"
          >
            &larr; Back
          </Link>
        </nav>

        {/* Eyebrow + Title */}
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-civic mb-[10px]">
          Privacy Policy
        </div>
        <h1 className="font-serif font-semibold text-5xl leading-none tracking-[-0.025em] mb-8 text-wrap-balance text-ink md:text-[48px] text-[36px]">
          What stays here, what doesn&apos;t.
        </h1>

        {/* Meta — effective date */}
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-6">
          Effective April 12, 2026 &middot; Grey Bird LLC
        </p>

        {/* Article body */}
        <article className="font-serif text-[17px] leading-[1.65] text-ink space-y-0">
          {/* Intro */}
          <p className="mb-4">
            Voter Choice is operated by Grey Bird LLC. We built this tool to
            minimize data collection and to keep your ballot research under your
            control.
          </p>

          {/* Minimal Data Collection */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Minimal Data Collection
          </h2>
          <p className="mb-4">
            We do not use analytics, telemetry, tracking pixels, user accounts,
            or sign-ups. The app stores your{" "}
            <strong>language preference</strong> in your browser&apos;s
            localStorage so the interface can stay in English or Spanish across
            visits. It also stores your <strong>draft ballot picks</strong> and
            (optionally) a <strong>bring-your-own Anthropic key</strong> in
            localStorage. None of this leaves your device unless you take an
            action that explicitly sends it.
          </p>

          {/* Zip Code Processing */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Zip Code Processing
          </h2>
          <p className="mb-4">
            A bare zip code can be processed in your browser to look up election
            information from static data files. If you enter a full address, it
            may be used for address autocomplete and polling-place lookup as
            described below.
          </p>

          {/* Chat Conversations */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Chat Conversations
          </h2>
          <p className="mb-4">
            Chat conversations exist in your browser memory while the page is
            open. They are not intentionally stored, logged, or persisted by our
            servers. When you close or refresh the page, your conversation is
            gone from the app.
          </p>
          <p className="mb-4">
            Chat messages are sent to the <strong>Anthropic API</strong> for
            processing. We do not send your exact address to Anthropic unless
            you type it into the chat yourself. Please do not type your name,
            exact address, phone, email, or other identifying details into chat.
            For information about how Anthropic handles API data, see{" "}
            <a
              href="https://www.anthropic.com/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-civic underline underline-offset-[3px]"
            >
              Anthropic&apos;s privacy policy
            </a>
            .
          </p>

          {/* BYOK — new from prototype */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Bring-Your-Own Key (BYOK)
          </h2>
          <p className="mb-4">
            If you save your own Anthropic API key in Settings, it is stored in
            your browser&apos;s localStorage <em>only</em> and is sent directly
            from your browser to{" "}
            <code className="font-mono text-[14px] bg-tag-bg px-1.5 py-0.5 rounded">
              api.anthropic.com
            </code>
            . It does not pass through our server on any code path.
          </p>

          {/* What We Cannot Provide */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            What We Cannot Provide
          </h2>
          <p className="mb-4">
            We do not create or store a combined record of who you are, where
            you live, and what you said in chat. That means if anyone asked us
            for &ldquo;who said what and where they live,&rdquo; we would not
            have that combined record to give them. This does not prevent
            disclosure by Google, Anthropic, Vercel, GitHub, Upstash, or other
            infrastructure providers for the data they process under their own
            policies.
          </p>

          {/* Anonymous Issue Signals */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Anonymous Issue Signals
          </h2>
          <p className="mb-4">
            To understand which issues matter to voters and to improve how we
            classify them, we keep anonymous records of the issue preferences
            you express &mdash; the issue itself, your stance on it, and your
            state. These signals carry <em>no</em> identifier that links them
            back to you or to each other, <em>no</em> address, and <em>none</em>{" "}
            of your verbatim words. They cannot be tied to a person or to any
            other signal, so they remain aggregate-analysis inputs rather than
            individual records.
          </p>

          {/* Anonymous Usage Metrics */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Anonymous Usage Metrics
          </h2>
          <p className="mb-4">
            To monitor operating cost and detect unusual volume or spending
            spikes, we keep anonymous per-request operational metrics for AI
            chat calls &mdash; the model used, token counts, and an estimated
            cost figure. These records carry <em>no</em> identifier of any kind:
            no IP address, no session id, no user id, no address, and{" "}
            <em>none</em> of your words. They cannot be tied to a person or to
            any other record. They are used only to understand aggregate cost
            and to catch abuse patterns; they are never used to profile,
            identify, or track individual users.
          </p>

          {/* Address Lookup */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Address Lookup
          </h2>
          <p className="mb-4">
            If you choose to enter your street address to find your polling
            place, the app may use <strong>Google Places</strong> in your
            browser for address autocomplete and sends the address to the{" "}
            <strong>Google Civic Information API</strong> through our server for
            polling-place and contest lookup. We do not intentionally log or
            store your address, and we do not include it in the AI chat prompt.
            For information about how Google handles this data, see{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-civic underline underline-offset-[3px]"
            >
              Google&apos;s privacy policy
            </a>
            .
          </p>

          {/* Voter Profile Uploads */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Voter Profile Uploads
          </h2>
          <p className="mb-4">
            If you upload a voter profile from a previous session, it is used in
            the current browser session. If you use the built-in AI chat, the
            profile is sent to Anthropic as chat context. We do not store the
            uploaded profile on our servers.
          </p>

          {/* Rate Limiting */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Rate Limiting
          </h2>
          <p className="mb-4">
            To prevent abuse and protect the free chat budget, we use IP-based
            rate limiting. If durable production safeguards are configured, the
            counters may be stored in a Redis-compatible service. IP addresses
            are not intentionally logged, stored by this application for voter
            profiling, or shared by us with any third party for tracking.
          </p>

          {/* Contact */}
          <h2 className="font-serif font-semibold text-2xl tracking-[-0.015em] mt-10 mb-3.5 text-ink">
            Contact
          </h2>
          <p className="mb-4">
            Questions about this policy? Reach out at{" "}
            <strong>Grey Bird LLC</strong>:{" "}
            <a
              href="mailto:muxin.li.pro@gmail.com"
              className="text-civic underline underline-offset-[3px]"
            >
              <code className="font-mono text-[14px] bg-tag-bg px-1.5 py-0.5 rounded">
                muxin.li.pro@gmail.com
              </code>
            </a>
            .
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
