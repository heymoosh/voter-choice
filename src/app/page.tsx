import BallotTool from "@/components/BallotTool";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:rounded focus:border focus:border-blue-300 focus:shadow"
      >
        Skip to main content
      </a>

      <main
        id="main-content"
        className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8"
      >
        {/* Hero Section */}
        <header className="mb-10 text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Know What You&apos;re Voting For
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Enter your zip code to get a customized AI prompt you can paste into
            any free chatbot. It walks you through every race and issue on your
            specific ballot — based on real actions, not campaign ads.
          </p>
          <div
            className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-500"
            aria-label="Supported AI chatbots"
          >
            <span className="font-medium">Works with:</span>
            {[
              { name: "Claude", url: "https://claude.ai" },
              { name: "ChatGPT", url: "https://chatgpt.com" },
              { name: "Gemini", url: "https://gemini.google.com" },
              { name: "Grok", url: "https://grok.com" },
            ].map((bot) => (
              <a
                key={bot.name}
                href={bot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
              >
                {bot.name}
              </a>
            ))}
          </div>
        </header>

        {/* Main Tool */}
        <BallotTool />

        {/* Tips Section */}
        <section
          aria-labelledby="tips-heading"
          className="mt-12 bg-white rounded-xl border border-gray-200 p-6 space-y-3"
        >
          <h2 id="tips-heading" className="text-lg font-bold text-gray-900">
            Tips for Using the Prompt
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>
              You can say <strong>&quot;I don&apos;t know&quot;</strong> or{" "}
              <strong>&quot;I&apos;m not sure&quot;</strong> — the AI will
              explain more and help you figure it out.
            </li>
            <li>
              Ask it to <strong>research something</strong> for you: &quot;Can
              you look up this candidate&apos;s voting record?&quot;
            </li>
            <li>
              You&apos;re not taking a test. You&apos;re having a conversation.
              The AI works <em>with</em> you.
            </li>
            <li>
              At the end, it will give you a summary you can{" "}
              <strong>write down or print</strong> and take to the polls.
            </li>
          </ul>
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mt-2">
            <strong>Important:</strong> AI can make mistakes. This is a research{" "}
            <em>starting point</em>. Always verify with official sources before
            you vote.
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500 space-y-2">
          <p>
            <strong>Share this tool</strong> — it works for any U.S. state and
            any election.
          </p>
          <p>Created by a human using AI tools</p>
        </footer>
      </main>
    </div>
  );
}
