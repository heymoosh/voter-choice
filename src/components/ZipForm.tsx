"use client";

import { useState, FormEvent, KeyboardEvent } from "react";
import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";

type ZipFormProps = {
  onSubmit: (zip: string) => void;
  language?: Language;
};

export function ZipForm({ onSubmit, language = "en" }: ZipFormProps) {
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate(value: string): string | null {
    if (!value.trim()) return tStr(language, "zipError");
    if (!/^\d{5}$/.test(value.trim())) return tStr(language, "zipErrorInvalid");
    return null;
  }

  function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    const validationError = validate(zip);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit(zip.trim());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSubmit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      aria-label={tStr(language, "lookupFormLabel")}
      noValidate
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="zip-input"
          className="text-sm font-semibold text-gray-700"
        >
          {tStr(language, "zipLabel")}
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            id="zip-input"
            data-testid="zip-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => {
              setZip(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={tStr(language, "zipPlaceholder")}
            aria-label={tStr(language, "zipInputLabel")}
            aria-describedby={error ? "zip-error" : undefined}
            aria-invalid={error ? "true" : "false"}
            className="border border-gray-300 rounded-lg px-4 py-3 text-base w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
          <button
            data-testid="zip-submit"
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-6 py-3 text-base min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {tStr(language, "zipSubmit")}
          </button>
        </div>
      </div>
      {error && (
        <p
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          aria-live="polite"
          className="text-red-600 text-sm font-medium"
        >
          {error}
        </p>
      )}
    </form>
  );
}
