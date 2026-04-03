import BallotToolClient from "../components/BallotToolClient";
import { LanguageProvider } from "../lib/i18n";

const CHATBOTS = [
  { name: "Claude", url: "https://claude.ai" },
  { name: "ChatGPT", url: "https://chatgpt.com" },
  { name: "Gemini", url: "https://gemini.google.com" },
  { name: "Grok", url: "https://grok.com" },
];

export default function Home() {
  return (
    <LanguageProvider>
    <div className="min-h-screen flex flex-col">
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="bg-[#1e3a5f] text-white py-12 px-4 sm:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Research Your Ballot with AI
            </h1>
            <p className="text-lg sm:text-xl text-gray-200 mb-6 max-w-2xl mx-auto">
              Enter your zip code, get a customized prompt, and paste it into
              any free AI chatbot to research every race on your ballot.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {CHATBOTS.map((bot) => (
                <a
                  key={bot.name}
                  href={bot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors min-h-[44px] flex items-center"
                >
                  {bot.name}
                </a>
              ))}
            </div>
            <div className="max-w-md mx-auto">
              <BallotToolClient />
            </div>
          </div>
        </section>

        {/* Tips Section */}
        <section className="py-10 px-4 sm:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">
              Tips for Using AI Ballot Research
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>
                  You can say &quot;I don&apos;t know&quot; or &quot;I&apos;m
                  not sure where I stand&quot; — the AI will explain more and
                  help you figure it out
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>
                  Ask it to research something for you (&quot;Can you look up
                  this candidate&apos;s voting record?&quot;)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>
                  Ask questions anytime (&quot;What does this position actually
                  do?&quot; or &quot;Why does this matter?&quot;)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>
                  You&apos;re not taking a test. You&apos;re having a
                  conversation. The AI works with you.
                </span>
              </li>
              <li className="flex gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <span className="text-yellow-600 font-bold">⚠</span>
                <span>
                  AI can make mistakes. This is a research starting point.
                  Always verify with official sources — the tool links you to
                  them.
                </span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-8 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto text-center text-sm text-gray-500 space-y-2">
          <p className="font-medium text-gray-700">
            Share this tool with friends and family
          </p>
          <p>Created by a human using AI tools</p>
        </div>
      </footer>
    </div>
    </LanguageProvider>
  );
}
