import { BallotToolClient } from "@/components/BallotToolClient";

export const metadata = {
  title: "AI Ballot Research Tool — Know What You're Voting For",
  description:
    "Enter your zip code to get a customized AI prompt for researching your ballot. Works with Claude, ChatGPT, Gemini, Grok, and any free AI chatbot.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-blue-600 focus:font-semibold"
      >
        Skip to main content
      </a>

      <main
        id="main-content"
        className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-10"
      >
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            Know What You&apos;re Voting For
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enter your zip code and get a customized AI research prompt —
            pre-filled with your state&apos;s election dates, deadlines, and
            local links. Paste it into any free AI chatbot to start researching
            your ballot in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <span className="font-medium text-gray-700">Works with:</span>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Claude
            </a>
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              ChatGPT
            </a>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Gemini
            </a>
            <a
              href="https://grok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Grok
            </a>
          </div>
        </section>

        {/* Ballot tool */}
        <BallotToolClient />

        {/* Tips */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            Tips for using this prompt
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">→</span>
              You can say <strong>&quot;I don&apos;t know&quot;</strong> or{" "}
              <strong>&quot;I&apos;m not sure where I stand&quot;</strong> — the
              AI will explain more and help you figure it out.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">→</span>
              You can ask it to <strong>research something</strong> for you:
              &quot;Can you look up this candidate&apos;s voting record?&quot;
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">→</span>
              At the end, ask for a <strong>printable summary</strong> you can
              take to the polls.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">→</span>
              <strong>AI can make mistakes.</strong> Use it as a starting point
              and verify with official sources.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">→</span>
              Many states <strong>prohibit phones at polling places</strong>.
              Print your ballot summary or write it down before you go.
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 space-y-1 pb-4">
          <p>
            Share this tool with friends, family, or your community. It works
            for any U.S. state and any election.
          </p>
          <p>
            <em>
              Created by a human using AI tools, because everyone deserves to
              know what they&apos;re actually voting for.
            </em>
          </p>
        </footer>
      </main>
    </div>
  );
}
