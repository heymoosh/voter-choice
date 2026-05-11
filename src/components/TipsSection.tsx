export function TipsSection() {
  return (
    <section
      aria-labelledby="tips-heading"
      className="bg-blue-50 border border-blue-100 rounded-xl p-6"
    >
      <h2 id="tips-heading" className="text-lg font-bold text-blue-900 mb-4">
        Tips for your conversation
      </h2>
      <ul className="space-y-3 text-sm text-blue-800">
        <li className="flex gap-2">
          <span className="text-blue-500 font-bold mt-0.5" aria-hidden="true">
            →
          </span>
          <span>
            You can say <strong>&ldquo;I don&apos;t know&rdquo;</strong> or{" "}
            <strong>&ldquo;I&apos;m not sure where I stand&rdquo;</strong> — the
            AI will explain more and help you figure it out.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-blue-500 font-bold mt-0.5" aria-hidden="true">
            →
          </span>
          <span>
            You can ask it to <strong>research something</strong> for you (e.g.,
            &ldquo;Can you look up this candidate&apos;s voting record?&rdquo;).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-blue-500 font-bold mt-0.5" aria-hidden="true">
            →
          </span>
          <span>
            You can <strong>ask questions</strong> anytime (&ldquo;What does
            this position actually do?&rdquo; or &ldquo;Why does this
            matter?&rdquo;).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-blue-500 font-bold mt-0.5" aria-hidden="true">
            →
          </span>
          <span>
            At the end, the AI will give you a{" "}
            <strong>summary you can print</strong> and take to the polls.
          </span>
        </li>
      </ul>
      <div
        role="note"
        className="mt-4 p-3 bg-white border border-blue-200 rounded-lg text-xs text-blue-700"
      >
        <strong>Important:</strong> AI can make mistakes. This is a research{" "}
        <em>starting point</em>. The tool will link you to official sources so
        you can double-check anything that matters to you.
      </div>
    </section>
  );
}
