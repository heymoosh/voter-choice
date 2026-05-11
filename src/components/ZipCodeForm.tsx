"use client";

import { useState } from "react";

interface ZipCodeFormProps {
  onSubmit: (zip: string) => void;
  isLoading?: boolean;
}

export function ZipCodeForm({ onSubmit, isLoading = false }: ZipCodeFormProps) {
  const [zipValue, setZipValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate(value: string): string | null {
    if (!value || value.trim() === "") {
      return "Please enter a zip code";
    }
    if (!/^\d{5}$/.test(value.trim())) {
      return "Please enter a valid 5-digit zip code";
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(zipValue);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSubmit(zipValue.trim());
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setZipValue(e.target.value);
    if (error) {
      setError(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="zip-input"
          className="text-sm font-medium text-gray-700"
        >
          Enter your 5-digit zip code
        </label>
        <div className="flex gap-2">
          <input
            id="zip-input"
            data-testid="zip-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={zipValue}
            onChange={handleChange}
            placeholder="e.g. 73301"
            className="flex-1 min-w-0 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby={error ? "zip-error" : undefined}
            aria-invalid={error ? "true" : "false"}
            disabled={isLoading}
          />
          <button
            type="submit"
            data-testid="zip-submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] min-h-[44px]"
          >
            {isLoading ? "Loading..." : "Look Up"}
          </button>
        </div>
        {error && (
          <p
            id="zip-error"
            data-testid="zip-error"
            role="alert"
            className="text-sm text-red-600 mt-1"
          >
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
