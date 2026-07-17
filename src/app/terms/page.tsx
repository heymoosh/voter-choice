import type { Metadata } from "next";
import {
  StaticsPage,
  StaticsEffectiveDate,
  StaticsCopyrightFooter,
} from "../_components/StaticsPage";

export const metadata: Metadata = {
  title: "Terms of Use — Voter Choice",
  description:
    "Voter Choice terms of use. Election information is for research purposes only. Always verify with official sources.",
};

export default function TermsOfUse() {
  return (
    <StaticsPage
      eyebrow="Terms of Use"
      title="What we promise, and what we can't."
      meta={<StaticsEffectiveDate date="April 12, 2026" />}
      footer={<StaticsCopyrightFooter />}
    >
      <h2>Research Purposes Only</h2>
      <p>
        Election information provided by Voter Choice is for research purposes
        only. This tool is designed to help you explore what&apos;s on your
        ballot, not to serve as an official source of election information.
      </p>

      <h2>Verify with Official Sources</h2>
      <p>
        Always verify all dates, deadlines, polling locations, and requirements
        with your official state or county election website. Election rules and
        dates can change. Your state&apos;s Secretary of State website is the
        authoritative source.
      </p>

      <h2>AI Can Make Mistakes</h2>
      <p>
        The AI chat feature is powered by Claude, an AI assistant made by
        Anthropic. AI can make mistakes, hallucinate facts, or provide outdated
        information. Always check critical information &mdash; such as
        registration deadlines, voter ID requirements, and polling locations
        &mdash; against official sources before acting on it.
      </p>

      <h2>Not Affiliated with Government</h2>
      <p>
        Voter Choice is not affiliated with, endorsed by, or connected to any
        government agency, campaign, political party, or candidate. This is an
        independent, nonpartisan tool built to help voters research their
        ballot.
      </p>

      <h2>Chat Availability</h2>
      <p>
        The free AI chat feature has a limited monthly capacity. When chat is
        unavailable, you can always use the copy-and-paste prompt to research
        your ballot in any free AI chatbot (Claude, ChatGPT, Gemini, Grok, or
        others).
      </p>

      <h2>Election Data Updates</h2>
      <p>
        We update election data periodically. Check the &quot;Data last
        updated&quot; date shown on the site. If an election is approaching and
        the data looks outdated, verify directly with your state election
        office.
      </p>

      <h2>No Warranty</h2>
      <p>
        This tool is provided &quot;as is&quot; without warranty of any kind.
        Grey Bird LLC is not liable for any errors, omissions, or consequences
        arising from the use of this tool.
      </p>
    </StaticsPage>
  );
}
