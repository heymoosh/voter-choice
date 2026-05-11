export function TipsSection() {
  return (
    <section className="w-full rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <h2 className="text-lg font-bold text-gray-900">
        Tips for using the prompt
      </h2>
      <ul className="space-y-2 text-sm text-gray-700">
        <li className="flex gap-2">
          <span className="text-blue-500 mt-0.5 shrink-0">•</span>
          <span>
            You can say <strong>&ldquo;I don&apos;t know&rdquo;</strong> or{" "}
            <strong>&ldquo;I&apos;m not sure&rdquo;</strong> &mdash; the AI will
            explain more and help you figure it out.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-blue-500 mt-0.5 shrink-0">•</span>
          <span>
            Ask the AI to <strong>research a candidate</strong> for you
            (&ldquo;Can you look up this candidate&apos;s voting
            record?&rdquo;).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-blue-500 mt-0.5 shrink-0">•</span>
          <span>
            <strong>Ask questions anytime</strong> (&ldquo;What does this
            position actually do?&rdquo; or &ldquo;Why does this
            matter?&rdquo;).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-blue-500 mt-0.5 shrink-0">•</span>
          <span>
            At the end, the AI will give you a{" "}
            <strong>printable ballot summary</strong> to take to the polls.
          </span>
        </li>
      </ul>
      <p className="text-xs text-gray-500 border-t border-gray-100 pt-3 mt-2">
        <strong>Important:</strong> AI can make mistakes. This is a research
        starting point. Always verify important information with official
        sources.
      </p>
    </section>
  );
}
