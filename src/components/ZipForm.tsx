"use client";

import { useState } from "react";
import { TEST_IDS } from "@/types/testids";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
}

export function ZipForm({ onSubmit }: ZipFormProps) {
  const [zipInput, setZipInput] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = zipInput.trim();

    if (!trimmed) {
      setZipError("Please enter a zip code");
      return;
    }
    if (!/^\d{5}$/.test(trimmed)) {
      setZipError("Please enter a valid 5-digit zip code");
      return;
    }

    setZipError(null);
    onSubmit(trimmed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZipInput(e.target.value);
    if (zipError) setZipError(null);
  };

  return (
    <section className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit} noValidate>
        <label
          htmlFor={TEST_IDS.ZIP_INPUT}
          className="block text-lg font-semibold text-gray-800 mb-2"
        >
          Enter your zip code
        </label>
        <div className="flex gap-2">
          <input
            id={TEST_IDS.ZIP_INPUT}
            data-testid={TEST_IDS.ZIP_INPUT}
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={zipInput}
            onChange={handleChange}
            placeholder="e.g. 90210"
            className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            aria-describedby={zipError ? "zip-error-msg" : undefined}
            aria-invalid={zipError ? "true" : "false"}
          />
          <button
            data-testid={TEST_IDS.ZIP_SUBMIT}
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-6 py-3 rounded-lg text-lg transition-colors min-w-[120px]"
          >
            Look up
          </button>
        </div>
        {zipError && (
          <p
            id="zip-error-msg"
            data-testid={TEST_IDS.ZIP_ERROR}
            role="alert"
            className="mt-2 text-red-600 text-sm font-medium"
          >
            {zipError}
          </p>
        )}
      </form>
    </section>
  );
}
