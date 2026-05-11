"use client";

interface StateSelectorProps {
  states: string[];
  onSelect: (stateCode: string) => void;
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "Washington D.C.",
};

export function StateSelector({ states, onSelect }: StateSelectorProps) {
  return (
    <div
      data-testid="state-selector"
      role="group"
      aria-labelledby="state-selector-label"
      className="bg-amber-50 border border-amber-200 rounded-lg p-4"
    >
      <p id="state-selector-label" className="text-gray-700 font-medium mb-3">
        This zip code spans multiple states. Which state are you voting in?
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        {states.map((code) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className="px-5 py-3 bg-white border-2 border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-blue-50 hover:border-blue-500 focus:bg-blue-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none active:bg-blue-100 transition-colors min-h-[44px]"
            aria-label={`Select ${STATE_NAMES[code] ?? code}`}
          >
            {STATE_NAMES[code] ?? code}
          </button>
        ))}
      </div>
    </div>
  );
}
