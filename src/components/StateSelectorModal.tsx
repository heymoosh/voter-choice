"use client";

const STATE_NAMES: Record<string, string> = {
  TX: "Texas", CA: "California", NH: "New Hampshire",
  AZ: "Arizona", NM: "New Mexico", NY: "New York",
  FL: "Florida", WA: "Washington", OR: "Oregon",
};

interface StateSelectorModalProps {
  stateCodes: string[];
  onSelect: (stateCode: string) => void;
  onCancel: () => void;
}

export function StateSelectorModal({
  stateCodes,
  onSelect,
  onCancel,
}: StateSelectorModalProps) {
  return (
    <div
      data-testid="state-selector"
      role="dialog"
      aria-modal="true"
      aria-labelledby="state-selector-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h2
          id="state-selector-title"
          className="text-lg font-semibold mb-2"
        >
          Which state are you voting in?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          This zip code spans multiple states.
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {stateCodes.map((code) => (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[44px] font-medium"
            >
              {STATE_NAMES[code] ?? code}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 min-h-[44px]"
          aria-label="Cancel state selection"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
