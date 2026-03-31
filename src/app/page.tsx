import { BallotToolClient } from "@/components/BallotToolClient";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Hero */}
        <header className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Free AI Ballot Research Tool
          </h1>
          <p className="mx-auto max-w-xl text-base text-gray-600 sm:text-lg">
            Enter your zip code below to get a customized AI research prompt
            pre-filled with your state&apos;s election dates, deadlines, and
            voting rules. Copy it and paste into any free AI chatbot to get
            started.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-gray-500">Works with:</span>
            {[
              { name: "Claude", href: "https://claude.ai" },
              { name: "ChatGPT", href: "https://chatgpt.com" },
              { name: "Gemini", href: "https://gemini.google.com" },
              { name: "Grok", href: "https://grok.com" },
            ].map(({ name, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700"
              >
                {name}
              </a>
            ))}
          </div>
        </header>

        {/* Main tool */}
        <BallotToolClient />

        {/* Tips */}
        <section className="mt-12 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Tips for using the prompt
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>You can say &quot;I don&apos;t know&quot;</strong> — the
              AI will explain more and help you figure it out.
            </li>
            <li>
              <strong>Ask for research</strong> — try &quot;Can you look up this
              candidate&apos;s voting record?&quot;
            </li>
            <li>
              <strong>Ask questions anytime</strong> — &quot;What does this
              position actually do?&quot; or &quot;Why does this matter?&quot;
            </li>
            <li>
              <strong>AI can make mistakes.</strong> This is a research starting
              point. The prompt links you to official sources so you can
              double-check anything.
            </li>
            <li>
              <strong>Many states prohibit phones at the polls.</strong> Write
              down or print your ballot picks — you can bring written notes but
              may not be able to use your phone.
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p className="mb-2">
            <strong className="text-gray-700">Share this tool</strong> with
            friends, family, or your community. It works for any U.S. state and
            any election.
          </p>
          <p>Created by a human using AI tools.</p>
        </footer>
      </main>
    </div>
  );
}
