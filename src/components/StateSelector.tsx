"use client";

import { ChangeEvent } from "react";
import { useLanguage } from "@/lib/i18n";

interface StateSelectorProps {
  stateCodes: string[];
  selectedState: string | null;
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
};

export default function StateSelector({
  stateCodes,
  selectedState,
  onSelect,
}: StateSelectorProps) {
  const { t, lang } = useLanguage();

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    onSelect(e.target.value);
  }

  return (
    <div
      className="bg-amber-50 border border-amber-200 rounded-xl p-4"
      role="region"
      aria-label="Multi-state zip code selector"
    >
      <p className="text-sm font-medium text-amber-800 mb-3">
        {t("stateSelectorPrompt")}
      </p>
      <label
        htmlFor="state-select"
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {lang === "es" ? "Selecciona tu estado" : "Select your state"}
      </label>
      <select
        id="state-select"
        data-testid="state-selector"
        value={selectedState ?? ""}
        onChange={handleChange}
        className="w-full sm:w-auto px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px] bg-white"
        aria-label="Select your state"
      >
        <option value="" disabled>
          {lang === "es" ? "— Selecciona un estado —" : "— Select a state —"}
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
