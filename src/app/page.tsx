import BallotTool from "@/components/BallotTool";
import ShareButton from "@/components/ShareButton";

const CHATBOTS = [
  { name: "Claude", url: "https://claude.ai", desc: "by Anthropic" },
  { name: "ChatGPT", url: "https://chatgpt.com", desc: "by OpenAI" },
  { name: "Gemini", url: "https://gemini.google.com", desc: "by Google" },
  { name: "Grok", url: "https://grok.com", desc: "by xAI" },
];

const TIPS = [
  {
    heading: 'Say "I don\'t know" anytime',
    body: "The AI will explain more and help you figure out where you stand — you're not being tested.",
  },
  {
    heading: "Ask it to research things",
    body: '"Can you look up this candidate\'s voting record?" or "Who funds this ballot measure?" — it\'ll dig in.',
  },
  {
    heading: "Ask questions",
    body: '"What does this position actually do?" or "Why does this matter?" — no question is too basic.',
  },
  {
    heading: "Print your summary",
    body: "Many states ban phones at the polling place. Print or write down your choices before you go.",
  },
  {
    heading: "AI can make mistakes",
    body: "This is a research starting point. The AI will link you to official sources so you can verify anything that matters.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <span className="text-xl font-bold text-blue-700">Voter Choice</span>
        </div>
      </header>

      <main id="main-content" className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <section
            aria-labelledby="hero-heading"
            className="text-center sm:text-left"
          >
            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight"
            >
              Know what you&apos;re voting for.{" "}
              <span className="text-blue-600">In minutes.</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl">
              Enter your zip code to get a personalized AI ballot research
              prompt. Paste it into any free AI chatbot and get a nonpartisan
              walkthrough of every race and issue on your specific ballot.
            </p>
            <p className="mt-2 text-base text-gray-500 max-w-2xl">
              No account needed. No data stored. Works with any AI chatbot.
            </p>

            {/* Chatbot links */}
            <div
              className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start"
              aria-label="Supported AI chatbots"
            >
              {CHATBOTS.map((bot) => (
                <a
                  key={bot.name}
                  href={bot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors min-h-[44px]"
                >
                  <span>{bot.name}</span>
                  <span className="text-gray-400 text-xs">{bot.desc}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Main Tool */}
          <section aria-label="Ballot research tool">
            <BallotTool />
          </section>

          {/* Tips Section */}
          <section aria-labelledby="tips-heading">
            <h2
              id="tips-heading"
              className="text-xl font-bold text-gray-900 mb-4"
            >
              Tips for using your prompt effectively
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {TIPS.map((tip) => (
                <div
                  key={tip.heading}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    {tip.heading}
                  </h3>
                  <p className="text-sm text-gray-600">{tip.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-6 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-between text-sm text-gray-500">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
            <span>
              Created by a human using AI tools — because everyone deserves to
              know what they&apos;re actually voting for.
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <ShareButton />
          </div>
        </div>
      </footer>
    </div>
  );
}
