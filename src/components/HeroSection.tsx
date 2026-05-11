const chatbots = [
  {
    name: "Claude",
    url: "https://claude.ai",
    description: "Anthropic's AI assistant",
  },
  {
    name: "ChatGPT",
    url: "https://chatgpt.com",
    description: "OpenAI's AI assistant",
  },
  {
    name: "Gemini",
    url: "https://gemini.google.com",
    description: "Google's AI assistant",
  },
  { name: "Grok", url: "https://grok.com", description: "xAI's AI assistant" },
];

export default function HeroSection() {
  return (
    <header className="bg-blue-700 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
          Know what you&apos;re voting for — in 5 minutes.
        </h1>
        <p className="text-blue-100 text-lg mb-2">
          Enter your zip code to get a customized research prompt for your
          specific ballot. Paste it into any free AI chatbot and let it walk you
          through every race and issue.
        </p>
        <p className="text-blue-200 text-base mb-6">
          No account needed. No data stored. Works with any of these free AI
          tools:
        </p>
        <ul className="flex flex-wrap gap-3" aria-label="Supported AI chatbots">
          {chatbots.map((bot) => (
            <li key={bot.name}>
              <a
                href={bot.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${bot.name} — ${bot.description} (opens in new tab)`}
                className="inline-block bg-white text-blue-800 font-semibold px-4 py-2 rounded-lg text-sm min-h-[44px] flex items-center hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700 transition-colors"
              >
                {bot.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
