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
      className="mt-4 p-4 bg-surface-lowest rounded-sm"
      role="dialog"
      aria-label="State selector"
    >
      <p className="font-medium mb-3">{t.stateSelector.prompt}</p>
      <div className="flex gap-2 flex-wrap">
        {states.map((code) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className="px-4 min-h-[44px] min-w-[44px] bg-surface-high text-primary rounded-sm font-semibold hover:bg-surface-low focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}
