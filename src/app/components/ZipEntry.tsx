"use client";

import { useState, KeyboardEvent } from "react";

interface ZipEntryProps {
  onSubmit: (zip: string) => void;
  isLoading?: boolean;
}

export function ZipEntry({ onSubmit, isLoading = false }: ZipEntryProps) {
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate(value: string): string | null {
    if (!value.trim()) return "Please enter a zip code";
    if (!/^\d{5}$/.test(value.trim()))
      return "Please enter a valid 5-digit zip code";
    return null;
  }

  function handleSubmit() {
    const trimmed = zip.trim();
    const err = validate(trimmed);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
  }

  function handleChange(value: string) {
    setZip(value);
    if (error) {
      const err = validate(value.trim());
      if (!err) setError(null);
    }
  }

  return (
    <div className="w-full">
      <label
        htmlFor="zip-input"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Enter your ZIP code
      </label>
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <input
          id="zip-input"
          data-testid="zip-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={5}
          value={zip}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 73301"
          aria-describedby={error ? "zip-error" : undefined}
          aria-invalid={!!error}
          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
          disabled={isLoading}
        />
        <button
          data-testid="zip-submit"
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="rounded-lg bg-blue-600 text-white px-6 py-3 font-semibold text-base hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 min-h-[44px] min-w-[120px] whitespace-nowrap"
        >
          {isLoading ? "Looking up…" : "Look up my ballot"}
        </button>
      </div>
      {error && (
        <p
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          aria-live="polite"
          className="mt-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
