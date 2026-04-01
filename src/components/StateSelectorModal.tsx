"use client";

import { useLanguage } from "@/lib/i18n";

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
};

interface StateSelectorModalProps {
  states: string[];
  onSelect: (stateCode: string) => void;
  zip: string;
}

export function StateSelectorModal({
  states,
  onSelect,
  zip,
}: StateSelectorModalProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        {t.stateSelector.title}
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        {t.stateSelector.description(zip)}
      </p>
      <label
        htmlFor="state-selector"
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        {t.stateSelector.label}
      </label>
      <select
        id="state-selector"
        data-testid="state-selector"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onSelect(e.target.value);
        }}
        className="min-h-[44px] w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>
          {t.stateSelector.placeholder}
        </option>
        {states.map((code) => (
          <option key={code} value={code}>
            {STATE_NAMES[code] ?? code}
          </option>
        ))}
      </select>
    </div>
  );
}
