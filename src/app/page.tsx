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
              className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4"
            >
              Research your ballot with AI — for free
            </h1>
            <p className="text-lg text-gray-600 mb-4 max-w-2xl">
              Enter your zip code to get your state&apos;s election info and a
              customized research prompt. Paste it into any free AI chatbot and
              get a personalized guide to every race and issue on your ballot.
            </p>
            <p className="text-base text-gray-500 mb-6 max-w-2xl">
              Works with any of these free AI chatbots:
            </p>

            {/* Chatbot links */}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start mb-8">
              {CHATBOTS.map((bot) => (
                <a
                  key={bot.name}
                  href={bot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors min-h-[44px]"
                  aria-label={`${bot.name} — ${bot.desc}`}
                >
                  <span className="font-semibold">{bot.name}</span>
                  <span className="text-gray-400 text-xs">{bot.desc}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Main Tool */}
          <BallotTool />

          {/* Tips Section */}
          <section aria-labelledby="tips-heading" className="max-w-2xl mx-auto">
            <h2
              id="tips-heading"
              className="text-xl font-bold text-gray-900 mb-4"
            >
              Tips for getting the most out of it
            </h2>
            <div className="space-y-4">
              {TIPS.map((tip) => (
                <div
                  key={tip.heading}
                  className="bg-white rounded-xl border border-gray-100 p-4"
                >
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
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
      <footer className="bg-white border-t border-gray-200 px-4 py-6 mt-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ShareButton />
          </div>
          <p className="text-sm text-gray-500 text-center sm:text-right">
            Created by a human using AI tools. Not affiliated with any campaign
            or party.
          </p>
        </div>
      </footer>
    </div>
  );
}
