export function TipsSection() {
  return (
    <section aria-labelledby="tips-heading" className="space-y-4">
      <h2 id="tips-heading" className="text-xl font-bold text-gray-900">
        Tips for Using This Prompt
      </h2>
      <ul className="space-y-3">
        {[
          'You can say "I don\'t know" or "I\'m not sure where I stand" — the AI will explain more and help you figure it out.',
          'You can ask it to research something for you: "Can you look up this candidate\'s voting record?"',
          'You can ask questions anytime: "What does this position actually do?" or "Why does this matter?"',
          "You're not taking a test. You're having a conversation. The AI works with you.",
          "At the end, it'll give you a summary you can write down or print and take to the polls.",
        ].map((tip, i) => (
          <li key={i} className="flex gap-3 text-sm text-gray-700">
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p>
          <strong>Important:</strong> AI can make mistakes. This is a research
          starting point. The tool will link you to official sources so you can
          double-check anything that matters to you.
        </p>
      </div>
    </section>
  );
}
