"use client";

import { useState } from "react";

interface StateSelectorModalProps {
  stateCodes: string[];
  onSelect: (stateCode: string) => void;
}

const STATE_NAMES: Record<string, string> = {
  AZ: "Arizona",
  NM: "New Mexico",
  TX: "Texas",
  CA: "California",
  NH: "New Hampshire",
};

export default function StateSelectorModal({
  stateCodes,
  onSelect,
}: StateSelectorModalProps) {
  const [selected, setSelected] = useState(stateCodes[0]);

  return (
    <div
      data-testid="state-selector"
      className="bg-white rounded-xl shadow-md p-6 my-4 border border-gray-200"
      role="group"
      aria-labelledby="state-selector-heading"
    >
      <h3
        id="state-selector-heading"
        className="text-lg font-semibold text-gray-800 mb-3"
      >
        This zip code spans multiple states. Which state are you voting in?
      </h3>
      <div className="space-y-2">
        {stateCodes.map((code) => (
          <label
            key={code}
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 min-h-[48px]"
          >
            <input
              type="radio"
              name="state-selection"
              value={code}
              checked={selected === code}
              onChange={() => setSelected(code)}
              className="w-5 h-5 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-gray-800 font-medium">
              {STATE_NAMES[code] || code}
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={() => onSelect(selected)}
        className="mt-4 px-6 py-3 bg-[#1e3a5f] text-white rounded-lg font-semibold hover:bg-[#2a4a73] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors min-h-[48px]"
      >
        Continue
      </button>
    </div>
  );
}
