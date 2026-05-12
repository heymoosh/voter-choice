"use client";

import { useTranslation } from "@/lib/i18n/I18nContext";

export function TipsSection() {
  const { t } = useTranslation();

  const tips = [t.tips.item1, t.tips.item2, t.tips.item3, t.tips.item4];

  return (
    <section
      aria-labelledby="tips-heading"
      className="bg-blue-50 border border-blue-100 rounded-xl p-6"
    >
      <h2 id="tips-heading" className="text-lg font-bold text-blue-900 mb-4">
        {t.tips.heading}
      </h2>
      <ul className="space-y-3 text-sm text-blue-800">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-blue-500 font-bold mt-0.5" aria-hidden="true">
              →
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      <div
        role="note"
        className="mt-4 p-3 bg-white border border-blue-200 rounded-lg text-xs text-blue-700"
      >
        <strong>Important:</strong> {t.tips.chatbotNote}
      </div>
    </section>
  );
}
