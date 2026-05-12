import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";

type TipsSectionProps = {
  language?: Language;
};

export function TipsSection({ language = "en" }: TipsSectionProps) {
  const tips = [
    tStr(language, "tip1"),
    tStr(language, "tip2"),
    tStr(language, "tip3"),
    tStr(language, "tip4"),
    tStr(language, "tip5"),
  ];

  return (
    <section aria-labelledby="tips-heading" className="space-y-4">
      <h2 id="tips-heading" className="text-xl font-bold text-gray-900">
        {tStr(language, "tipsHeading")}
      </h2>
      <ul className="space-y-3">
        {tips.map((tip, i) => (
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
          <strong>{tStr(language, "tipsImportant")}</strong>{" "}
          {tStr(language, "tipsDisclaimer")}
        </p>
      </div>
    </section>
  );
}
