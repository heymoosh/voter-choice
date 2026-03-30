import { BallotToolClient } from "../components/BallotToolClient";

export const metadata = {
  title: "AI Ballot Research Tool — Know What You're Voting For",
  description:
    "Enter your zip code to get a customized AI ballot research prompt. Free, nonpartisan, works with any chatbot.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>

      {/* Hero */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Know What You&apos;re Voting For
          </h1>
          <p className="text-gray-600 text-base sm:text-lg mb-4">
            Enter your zip code to get a customized AI ballot research prompt.
            Paste it into any free AI chatbot to research candidates based on
            what they&apos;ve actually done.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-gray-500">Works with:</span>
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
                className="text-blue-600 hover:underline font-medium"
              >
                {name}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        <BallotToolClient />

        {/* Tips */}
        <section
          className="mt-12 pt-8 border-t border-gray-200"
          aria-labelledby="tips-heading"
        >
          <h2 id="tips-heading" className="text-lg font-semibold mb-4">
            Tips for the conversation
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              You can say <strong>&ldquo;I don&apos;t know&rdquo;</strong> or{" "}
              <strong>&ldquo;I&apos;m not sure&rdquo;</strong> — the AI will
              help you figure it out
            </li>
            <li>
              Ask it to <strong>research something</strong> for you (&ldquo;Can
              you look up this candidate&apos;s voting record?&rdquo;)
            </li>
            <li>
              You can <strong>ask questions</strong> anytime (&ldquo;What does
              this position actually do?&rdquo;)
            </li>
            <li>
              At the end, it&apos;ll give you a{" "}
              <strong>printable ballot summary</strong> you can take to the
              polls
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-500 italic">
            AI can make mistakes. This is a research starting point — the tool
            links to official sources so you can verify anything that matters.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>
            <strong className="text-gray-700">Share this tool</strong> with
            voters in your community
          </p>
          <p>Created by a human using AI tools</p>
        </div>
      </footer>
    </div>
  );
}
