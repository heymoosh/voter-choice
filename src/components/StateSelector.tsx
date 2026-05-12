"use client";

import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";

type StateSelectorProps = {
  stateCodes: string[];
  onSelect: (stateCode: string) => void;
  language?: Language;
};

const STATE_NAMES: Record<string, string> = {
  TX: "Texas",
  CA: "California",
  NH: "New Hampshire",
  AZ: "Arizona",
  NM: "New Mexico",
};

export function StateSelector({
  stateCodes,
  onSelect,
  language = "en",
}: StateSelectorProps) {
  return (
    <div
      data-testid="state-selector"
      className="bg-blue-50 border border-blue-200 rounded-xl p-5"
      role="group"
      aria-labelledby="state-selector-heading"
    >
      <p id="state-selector-heading" className="text-gray-800 font-medium mb-3">
        {tStr(language, "stateSelectorPrompt")}
      </p>
      <div className="flex flex-wrap gap-3">
        {stateCodes.map((code) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className="bg-white border-2 border-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-700 font-semibold rounded-lg px-5 py-3 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            aria-label={`I am voting in ${STATE_NAMES[code] ?? code}`}
          >
            {STATE_NAMES[code] ?? code}
          </button>
        ))}
      </div>
    </div>
  );
}
