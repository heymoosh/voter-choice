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
  DC: "District of Columbia",
};

export default function StateSelector({
  states,
  onSelect,
}: StateSelectorProps) {
  return (
    <div
      data-testid="state-selector"
      className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4"
      role="group"
      aria-labelledby="state-selector-label"
    >
      <h2
        id="state-selector-label"
        className="text-lg font-semibold text-yellow-900 mb-3"
      >
        This zip code spans multiple states. Which state are you voting in?
      </h2>
      <div className="flex flex-wrap gap-3">
        {states.map((code) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className="px-5 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] transition-colors"
          >
            {STATE_NAMES[code] ?? code}
          </button>
        ))}
      </div>
    </div>
  );
}
