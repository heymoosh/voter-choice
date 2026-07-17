import type { Metadata } from "next";
import { StaticsPage } from "../_components/StaticsPage";

export const metadata: Metadata = {
  title: "Methodology — Voter Choice",
  description:
    "How Voter Choice scores candidates: issues from you, votes from official roll-call data, donor data from FEC and state filings.",
};

export default function MethodologyPage() {
  return (
    <StaticsPage eyebrow="Methodology" title="How we score candidates.">
      <h2>Step 1 &middot; Issues come from you</h2>
      <p>
        Every score in this app traces back to <b>your own words</b>. When you
        type your concerns in the cold open, we extract canonical issues + a
        directional stance (&ldquo;favors lower drug prices&rdquo;). You
        confirm, rename, or remove before any scoring happens. We don&rsquo;t
        pre-bake an issue list and check boxes against it.
      </p>

      <h2>Step 2 &middot; Votes come from official roll-call data</h2>
      <ul>
        <li>
          Federal:{" "}
          <a
            href="https://www.congress.gov/roll-call-votes"
            target="_blank"
            rel="noopener noreferrer"
          >
            Congress.gov roll-call votes
          </a>
          .
        </li>
        <li>
          State: per-state legislative reporting via{" "}
          <a
            href="https://openstates.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStates
          </a>{" "}
          and your state legislature&rsquo;s official records.
        </li>
      </ul>
      <p>
        For each issue, our editorial team selects 2–5 &ldquo;case file&rdquo;
        votes — the bills that most directly test the issue. Every score on a
        candidate card is computed from these case file votes only. If we
        don&rsquo;t have a curated case file for an issue &times; jurisdiction,
        the score reads <i>&ldquo;thin record&rdquo;</i> instead of guessing.
      </p>

      <h2>Step 3 &middot; Donor data comes from FEC + state filings</h2>
      <ul>
        <li>
          Federal candidates:{" "}
          <a
            href="https://www.fec.gov"
            target="_blank"
            rel="noopener noreferrer"
          >
            FEC
          </a>{" "}
          +{" "}
          <a
            href="https://www.opensecrets.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenSecrets
          </a>
          .
        </li>
        <li>
          State candidates: your state&rsquo;s ethics commission or campaign
          finance disclosure office.
        </li>
        <li>
          <b>Named issue PACs</b> are editorially vetted — we only break a PAC
          out separately if it has a public stated agenda we can cite.
        </li>
      </ul>

      <h2>
        Step 4 &middot; &ldquo;With you / against you&rdquo; is your stance vs.
        the vote
      </h2>
      <p>
        If you said you favor lower drug prices, a vote FOR Medicare drug-price
        negotiation reads &ldquo;WITH YOU.&rdquo; A vote AGAINST reads
        &ldquo;AGAINST YOU.&rdquo; When the record is mixed, we show the raw
        vote — never a softened summary.
      </p>

      <h2>AI&rsquo;s role</h2>
      <p>
        The AI&rsquo;s job is to <b>route + summarize</b>, not to invent. It
        pulls from our structured database (votes, donors, narratives) and
        presents them. It does not generate vote claims. If a vote isn&rsquo;t
        in our database, we don&rsquo;t show it.
      </p>

      <h2>Mistakes</h2>
      <p>
        We will make them. When we do, we publish a correction and update the
        case file. Every claim links to a primary source so you can verify
        yourself. If you find one, email{" "}
        <a href="mailto:muxin.li.pro@gmail.com">
          <code>muxin.li.pro@gmail.com</code>
        </a>
        .
      </p>
    </StaticsPage>
  );
}
