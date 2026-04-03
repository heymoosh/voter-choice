"use client";

import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

interface StateSelectorModalProps {
  states: string[];
  onSelect: (stateCode: string) => void;
}

export function StateSelectorModal({
  states,
  onSelect,
}: StateSelectorModalProps) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <div
      data-testid="state-selector"
      className="mt-4 p-4 border rounded-lg bg-white shadow-sm"
      role="dialog"
      aria-label="State selector"
    >
      <p className="font-medium mb-3">{t.stateSelector.prompt}</p>
      <div className="flex gap-2 flex-wrap">
        {states.map((code) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className="px-4 min-h-[44px] min-w-[44px] border-2 border-blue-600 text-blue-600 rounded font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-800"
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}
