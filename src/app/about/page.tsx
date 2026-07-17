import type { Metadata } from "next";
import { StaticsPage } from "../_components/StaticsPage";

export const metadata: Metadata = {
  title: "About — Voter Choice",
  description:
    "Voter Choice is a free, non-partisan Congress-assessment tool built by Grey Bird LLC.",
};

export default function AboutPage() {
  return (
    <StaticsPage
      eyebrow="About Voter Choice"
      title="A free, non-partisan Congress-assessment tool."
    >
      <p>
        Voter Choice is built and operated by <b>Grey Bird LLC</b>, a small
        independent shop. We made it because the gap between &ldquo;what a
        candidate says in their ads&rdquo; and &ldquo;what they actually voted
        on&rdquo; has gotten wider every cycle. We thought voters deserved a
        tool that closes it.
      </p>

      <h2>What we do</h2>
      <p>
        For every race on your ballot, we pull the <b>actual voting record</b>{" "}
        of incumbents (Congress.gov, state legislatures), the{" "}
        <b>funding picture</b> (FEC, OpenSecrets, state ethics commissions), and
        the <b>editorially-curated context</b> behind each vote (CAN2026 case
        files). We score how each candidate aligns with the issues you told us
        matter, vote by vote.
      </p>

      <h2>What we don&rsquo;t do</h2>
      <ul>
        <li>
          <b>No accounts.</b> No sign-up, no email, no password.
        </li>
        <li>
          <b>No tracking.</b> No third-party analytics, no ad pixels, no
          cross-site profiling.
        </li>
        <li>
          <b>No endorsement.</b> We don&rsquo;t tell you who to vote for. We
          show you what the candidates have done. The final choice is yours.
        </li>
        <li>
          <b>No data hoarding.</b> Your address, draft picks, and chat history
          live in your browser &mdash; close the tab without saving and
          they&rsquo;re gone. The one thing we keep is anonymous and aggregate:
          the issues you pick and your state &mdash; never your address, county,
          or anything that identifies you &mdash; used to show how priorities
          overlap across the country.
        </li>
      </ul>

      <h2>Who pays for this?</h2>
      <p>
        Server costs, Anthropic API budget, and the editorial work behind
        CAN2026 case files are funded by <b>Grey Bird LLC</b> and a small set of
        individual donors who explicitly do not buy a say in editorial.
      </p>
      <p>
        When our community AI budget runs out, you can bring your own Anthropic
        API key (Settings &rarr; BYOK) or hand off to any chatbot with a
        portable prompt. We&rsquo;d rather pause than monetize you.
      </p>

      <h2>Get in touch</h2>
      <p>
        Reach Grey Bird LLC at{" "}
        <a href="mailto:muxin.li.pro@gmail.com">
          <code>muxin.li.pro@gmail.com</code>
        </a>
        . We answer.
      </p>
    </StaticsPage>
  );
}
