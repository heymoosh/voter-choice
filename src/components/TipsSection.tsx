export function TipsSection() {
  return (
    <section
      aria-labelledby="tips-heading"
      className="bg-blue-50 rounded-xl border border-blue-100 p-6"
    >
      <h2 id="tips-heading" className="text-lg font-bold text-blue-900 mb-4">
        Tips for Using Your Prompt
      </h2>
      <ul className="space-y-2 text-sm text-blue-800">
        <li>
          You can say <strong>&quot;I don&apos;t know&quot;</strong> or{" "}
          <strong>&quot;I&apos;m not sure where I stand&quot;</strong> — the AI
          will explain more and help you figure it out.
        </li>
        <li>
          You can ask it to <strong>research something</strong> for you
          (&quot;Can you look up this candidate&apos;s voting record?&quot;)
        </li>
        <li>
          You can <strong>ask questions</strong> anytime (&quot;What does this
          position actually do?&quot; or &quot;Why does this matter?&quot;)
        </li>
        <li>
          At the end, you&apos;ll get a summary you can{" "}
          <strong>write down or print</strong> to bring to the polls.
        </li>
      </ul>
      <p className="text-xs text-blue-700 mt-4 border-t border-blue-200 pt-3">
        <strong>Important:</strong> AI can make mistakes. This is a research
        starting point. The tool links you to official sources so you can verify
        anything that matters to you.
      </p>
    </section>
  );
}
