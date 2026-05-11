"use client";

const STATE_NAMES: Record<string, string> = {
  TX: "Texas",
  CA: "California",
  NH: "New Hampshire",
  AZ: "Arizona",
  NM: "New Mexico",
};

function getStateName(code: string): string {
  return STATE_NAMES[code] ?? code;
}

interface StateSelectorProps {
  states: string[];
  onSelect: (stateCode: string) => void;
}

export function StateSelector({ states, onSelect }: StateSelectorProps) {
  return (
    <div
      data-testid="state-selector"
      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <h2 className="text-base font-semibold text-gray-900 mb-2">
        This zip code spans multiple states
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Which state are you voting in?
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {states.map((code) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className={`
              min-h-[44px] px-6 py-2.5 rounded-lg font-semibold text-base
              bg-white border-2 border-blue-600 text-blue-600
              hover:bg-blue-50 active:bg-blue-100
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            `}
          >
            {getStateName(code)} ({code})
          </button>
        ))}
      </div>
    </div>
  );
}
