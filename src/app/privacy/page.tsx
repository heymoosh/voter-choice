import type { Metadata } from "next";
import {
  StaticsPage,
  StaticsEffectiveDate,
  StaticsCopyrightFooter,
} from "../_components/StaticsPage";
import { NEVER_SELL_STATEMENT } from "../../lib/privacy-copy";

export const metadata: Metadata = {
  title: "Privacy Policy — Voter Choice",
  description:
    "Voter Choice privacy policy. How address lookup, AI chat, and local profile files are handled.",
};

export default function PrivacyPolicy() {
  return (
    <StaticsPage
      eyebrow="Privacy Policy"
      title="What stays here, what doesn't."
      meta={<StaticsEffectiveDate date="August 18, 2026" />}
      footer={<StaticsCopyrightFooter />}
    >
      {/* Intro */}
      <p>
        Voter Choice is operated by Grey Bird LLC. We built this tool to
        minimize data collection and to keep your research on your elected
        officials under your control.
      </p>

      {/* We Never Sell Your Data */}
      <h2>We Never Sell Your Data</h2>
      <p>{NEVER_SELL_STATEMENT}</p>

      {/* Minimal Data Collection */}
      <h2>Minimal Data Collection</h2>
      <p>
        We do not use third-party analytics, tracking pixels, user accounts, or
        sign-ups. We do record anonymous, content-free usage counts for AI calls
        to monitor operating cost (see <strong>Anonymous Usage Metrics</strong>{" "}
        below) &mdash; those records never include your words, your address, or
        your IP address. Across visits, your browser&apos;s localStorage keeps
        only your <strong>language preference</strong>, your{" "}
        <strong>chosen issues</strong>, and a{" "}
        <strong>state-level location</strong> (never your street address, and
        never a county) &mdash; plus, optionally, a{" "}
        <strong>bring-your-own Anthropic key</strong>. Your{" "}
        <strong>precise address</strong> and{" "}
        <strong>in-progress assessment</strong> are kept in sessionStorage only
        for the current browser tab and are cleared when you close it. None of
        this leaves your device unless you take an action that explicitly sends
        it.
      </p>

      {/* Chat Conversations */}
      <h2>Chat Conversations</h2>
      <p>
        Chat conversations exist in your browser memory while the page is open.
        They are not intentionally stored, logged, or persisted by our servers.
        When you close or refresh the page, your conversation is gone from the
        app.
      </p>
      <p>
        Chat messages are sent to the <strong>Anthropic API</strong> for
        processing. We do not send your exact address to Anthropic unless you
        type it into the chat yourself. Please do not type your name, exact
        address, phone, email, or other identifying details into chat. For
        information about how Anthropic handles API data, see{" "}
        <a
          href="https://www.anthropic.com/policies/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Anthropic&apos;s privacy policy
        </a>
        .
      </p>

      {/* BYOK — new from prototype */}
      <h2>Bring-Your-Own Key (BYOK)</h2>
      <p>
        If you save your own Anthropic API key in Settings, it is stored in your
        browser&apos;s localStorage <em>only</em> and is sent directly from your
        browser to <code>api.anthropic.com</code>. It does not pass through our
        server on any code path.
      </p>

      {/* What We Cannot Provide */}
      <h2>What We Cannot Provide</h2>
      <p>
        We do not create or store a combined record of who you are, where you
        live, and what you said in chat. That means if anyone asked us for
        &ldquo;who said what and where they live,&rdquo; we would not have that
        combined record to give them. This does not prevent disclosure by
        Google, Anthropic, Vercel, GitHub, Upstash, or other infrastructure
        providers for the data they process under their own policies.
      </p>

      {/* Anonymous Issue Signals */}
      <h2>Anonymous Issue Signals</h2>
      <p>
        To understand which issues matter to voters and to improve how we
        classify them, we keep anonymous records of the issue preferences you
        express &mdash; the issue itself, your stance on it, and your state.
        These signals carry <em>no</em> identifier that links them back to you
        or to each other, <em>no</em> address, and <em>none</em> of your
        verbatim words. They cannot be tied to a person or to any other signal,
        so they remain aggregate-analysis inputs rather than individual records.
      </p>

      {/* Anonymous Usage Metrics */}
      <h2>Anonymous Usage Metrics</h2>
      <p>
        To monitor operating cost and detect unusual volume or spending spikes,
        we keep anonymous per-request operational metrics for every AI call the
        app makes &mdash; both the chat conversation and the background
        candidate-research calls (used to fill in candidates with no voting
        record) &mdash; covering the model used, call counts, token totals, and
        an estimated cost figure. These records carry <em>no</em> identifier of
        any kind: no IP address, no session id, no user id, no address, and{" "}
        <em>none</em> of your words or the candidate/topic being researched.
        They cannot be tied to a person or to any other record. They are used
        only to understand aggregate cost and to catch abuse patterns; they are
        never used to profile, identify, or track individual users.
      </p>

      {/* Address Lookup */}
      <h2>Address Lookup</h2>
      <p>
        If you choose to enter your street address to find your polling place
        and elected officials, the app may use <strong>Google Places</strong> in
        your browser for address autocomplete; sends the address to the{" "}
        <strong>US Census Bureau</strong> to look up your representatives; and
        sends the address to the <strong>Google Civic Information API</strong>{" "}
        through our server for polling-place and contest lookup. We do not
        intentionally log or store your address, and we do not include it in the
        AI chat prompt. For information about how Google handles this data, see{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google&apos;s privacy policy
        </a>
        .
      </p>

      {/* Voter Profile Uploads */}
      <h2>Voter Profile Uploads</h2>
      <p>
        If you upload a voter profile from a previous session, it is used in the
        current browser session. If you use the built-in AI chat, the profile is
        sent to Anthropic as chat context. We do not store the uploaded profile
        on our servers.
      </p>

      {/* Rate Limiting */}
      <h2>Rate Limiting</h2>
      <p>
        To prevent abuse and protect the free chat budget, we use IP-based rate
        limiting. If durable production safeguards are configured, the counters
        may be stored in a Redis-compatible service. IP addresses are not
        intentionally logged, stored by this application for voter profiling, or
        shared by us with any third party for tracking.
      </p>

      {/* Contact */}
      <h2>Contact</h2>
      <p>
        Questions about this policy? Reach out at <strong>Grey Bird LLC</strong>
        :{" "}
        <a href="mailto:muxin.li.pro@gmail.com">
          <code>muxin.li.pro@gmail.com</code>
        </a>
        .
      </p>
    </StaticsPage>
  );
}
