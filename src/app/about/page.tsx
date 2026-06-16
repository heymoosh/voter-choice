import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Voter Choice",
  description:
    "Voter Choice is a free, non-partisan Congress-assessment tool built by Grey Bird LLC.",
};

export default function AboutPage() {
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
          About Voter Choice
        </div>

        {/* Title */}
        <h1 className="font-serif font-semibold text-[48px] max-sm:text-[36px] leading-none tracking-[-0.025em] text-ink mb-8 text-balance">
          A free, non-partisan Congress-assessment tool.
        </h1>

        {/* Article */}
        <article className="font-serif text-[17px] max-sm:text-[15.5px] leading-[1.65] text-ink [&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-[24px] [&_h2]:mt-10 [&_h2]:mb-[14px] [&_h2]:tracking-[-0.015em] [&_h2]:text-ink [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-[22px] [&_li]:mb-2 [&_a]:text-civic [&_a]:underline [&_a]:underline-offset-[3px] [&_code]:font-mono [&_code]:text-[14px] [&_code]:bg-tag-bg [&_code]:px-[6px] [&_code]:py-[2px] [&_code]:rounded">
          <p>
            Voter Choice is built and operated by <b>Grey Bird LLC</b>, a small
            independent shop. We made it because the gap between &ldquo;what a
            candidate says in their ads&rdquo; and &ldquo;what they actually
            voted on&rdquo; has gotten wider every cycle. We thought voters
            deserved a tool that closes it.
          </p>

          <h2>What we do</h2>
          <p>
            For every race on your ballot, we pull the{" "}
            <b>actual voting record</b> of incumbents (Congress.gov, state
            legislatures), the <b>funding picture</b> (FEC, OpenSecrets, state
            ethics commissions), and the <b>editorially-curated context</b>{" "}
            behind each vote (CAN2026 case files). We score how each candidate
            aligns with the issues you told us matter, vote by vote.
          </p>

          <h2>What we don&rsquo;t do</h2>
          <ul>
            <li>
              <b>No accounts.</b> No sign-up, no email, no password.
            </li>
            <li>
              <b>No tracking.</b> No analytics, no telemetry, no pixels.
            </li>
            <li>
              <b>No endorsement.</b> We don&rsquo;t tell you who to vote for. We
              show you what the candidates have done. The final choice is yours.
            </li>
            <li>
              <b>No data hoarding.</b> Your address, draft picks, and chat
              history live in your browser. If you close the tab and
              didn&rsquo;t save a profile, it&rsquo;s gone.
            </li>
          </ul>

          <h2>Who pays for this?</h2>
          <p>
            Server costs, Anthropic API budget, and the editorial work behind
            CAN2026 case files are funded by <b>Grey Bird LLC</b> and a small
            set of individual donors who explicitly do not buy a say in
            editorial. We publish a quarterly funding statement.
          </p>
          <p>
            When our community AI budget runs out, you can bring your own
            Anthropic API key (Settings &rarr; BYOK) or hand off to any chatbot
            with a portable prompt. We&rsquo;d rather pause than monetize you.
          </p>

          <h2>Get in touch</h2>
          <p>
            Reach Grey Bird LLC at{" "}
            <a href="mailto:muxin.li.pro@gmail.com">
              <code>muxin.li.pro@gmail.com</code>
            </a>
            . We answer.
          </p>
        </article>
      </div>
    </main>
  );
}
