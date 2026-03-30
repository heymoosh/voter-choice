import { BallotToolClient } from "../components/BallotToolClient";

export default function Home() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <section aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="text-3xl font-bold mb-3">
          Free AI Ballot Research Tool
        </h1>
        <p className="text-gray-700 mb-2">
          Enter your zip code to get a customized AI ballot research prompt.
          Paste it into any free AI chatbot to research what&apos;s on your
          ballot — candidates, propositions, and local races.
        </p>
        <p className="text-gray-700 mb-4">
          The AI conversation happens in your own chatbot session. This tool
          does not store any data or run an AI.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="font-medium text-gray-600">Works with:</span>
          {[
            { name: "Claude", url: "https://claude.ai" },
            { name: "ChatGPT", url: "https://chatgpt.com" },
            { name: "Gemini", url: "https://gemini.google.com" },
            { name: "Grok", url: "https://grok.com" },
          ].map(({ name, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {name}
            </a>
          ))}
        </div>
      </section>

      {/* Ballot Tool — all interactive logic */}
      <BallotToolClient />

      {/* Tips Section */}
      <section aria-labelledby="tips-heading" data-testid="tips-section">
        <h2 id="tips-heading" className="text-xl font-bold mb-3">
          Tips for using the prompt
        </h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
          <li>
            You can say <strong>&quot;I don&apos;t know&quot;</strong> or{" "}
            <strong>&quot;I&apos;m not sure where I stand&quot;</strong> — the
            AI will explain more and help you figure it out.
          </li>
          <li>
            You can ask it to <strong>research something</strong> for you
            (&quot;Can you look up this candidate&apos;s voting record?&quot;).
          </li>
          <li>
            You can <strong>ask questions</strong> anytime (&quot;What does this
            position actually do?&quot; or &quot;Why does this matter?&quot;).
          </li>
          <li>
            You&apos;re not taking a test. You&apos;re having a conversation.
            The AI works <em>with</em> you.
          </li>
        </ul>
        <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          <strong>Important:</strong> AI can make mistakes. This is a research
          starting point. Verify important information with official sources.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t pt-6 text-sm text-gray-500 space-y-2">
        <p>
          <strong>Share this tool</strong> with friends, family, or your
          community. It works for any U.S. state and any election.
        </p>
        <p>Created by a human using AI tools.</p>
        <p>
          Based on the{" "}
          <a
            href="https://docs.google.com/document/d/1_you_ballot_research_prompt"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Free AI Ballot Research Prompt
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
