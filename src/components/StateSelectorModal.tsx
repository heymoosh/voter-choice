"use client";

interface StateSelectorProps {
  stateCodes: string[];
  onSelect: (code: string) => void;
}

// Map of state codes to state names
const STATE_NAMES: Record<string, string> = {
  AZ: "Arizona",
  CA: "California",
  NM: "New Mexico",
  NH: "New Hampshire",
  TX: "Texas",
};

export function StateSelectorModal({
  stateCodes,
  onSelect,
}: StateSelectorProps) {
  return (
    <div
      data-testid="state-selector"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
      role="region"
      aria-label="State selector"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        This zip code spans multiple states
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Which state are you voting in?
      </p>
      <div className="flex flex-col gap-2">
        {stateCodes.map((code) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 min-h-[44px]"
            aria-label={`Select ${STATE_NAMES[code] ?? code}`}
          >
            {STATE_NAMES[code] ?? code} ({code})
          </button>
        ))}
      </div>
    </div>
  );
}
