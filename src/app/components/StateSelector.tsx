"use client";

const STATE_NAMES: Record<string, string> = {
  TX: "Texas",
  CA: "California",
  NH: "New Hampshire",
  AZ: "Arizona",
  NM: "New Mexico",
  AL: "Alabama",
  AK: "Alaska",
  AR: "Arkansas",
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
  NJ: "New Jersey",
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
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

interface StateSelectorProps {
  stateCodes: string[];
  onSelect: (code: string) => void;
}

export function StateSelector({ stateCodes, onSelect }: StateSelectorProps) {
  return (
    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="font-medium text-gray-900 mb-3">
        This ZIP code spans multiple states. Which state are you voting in?
      </p>
      <select
        data-testid="state-selector"
        onChange={(e) => {
          if (e.target.value) onSelect(e.target.value);
        }}
        defaultValue=""
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] bg-white"
        aria-label="Select your state"
      >
        <option value="" disabled>
          Select your state…
        </option>
        {stateCodes.map((code) => (
          <option key={code} value={code}>
            {STATE_NAMES[code] ?? code}
          </option>
        ))}
      </select>
    </div>
  );
}
