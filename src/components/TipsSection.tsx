const tips = [
  'You can say "I don\'t know" or "I\'m not sure where I stand" — the AI will explain more and help you figure it out.',
  'You can ask it to research something for you ("Can you look up this candidate\'s voting record?").',
  'You can ask questions anytime ("What does this position actually do?" or "Why does this matter?").',
  "You're not taking a test. You're having a conversation. The AI works with you.",
];

export default function TipsSection() {
  return (
    <section
      aria-label="Tips for using the prompt"
      className="bg-gray-50 py-10 px-4 border-t border-gray-200"
    >
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Tips while you&apos;re in the conversation
        </h2>
        <ul className="space-y-3 mb-6">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-gray-700 text-base">
              <span
                aria-hidden="true"
                className="text-blue-600 font-bold mt-0.5"
              >
                →
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-sm">
          <strong>Important:</strong> AI can make mistakes. This is a research
          starting point. The prompt will link you to official sources so you
          can double-check anything that matters to you. Always verify
          information with your official state or county election website.
        </div>
      </div>
    </section>
  );
}
