"use client";

import { useState, FormEvent, KeyboardEvent } from "react";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  isLoading: boolean;
}

export default function ZipForm({ onSubmit, isLoading }: ZipFormProps) {
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate(value: string): string | null {
    if (!value.trim()) return "Please enter a zip code";
    if (!/^\d{5}$/.test(value.trim()))
      return "Please enter a valid 5-digit zip code";
    return null;
  }

  function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
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
    if (e.key === "Enter") {
      handleSubmit();
    }
  }

  function handleChange(value: string) {
    // Only allow digits
    const digits = value.replace(/\D/g, "").slice(0, 5);
    setZip(digits);
    if (error && validate(digits) === null) {
      setError(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Zip code lookup form">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="zip-input" className="sr-only">
            Enter your 5-digit zip code
          </label>
          <input
            id="zip-input"
            data-testid="zip-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your zip code (e.g. 73301)"
            className={`w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] ${
              error
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500"
            }`}
            aria-describedby={error ? "zip-error" : undefined}
            aria-invalid={error ? "true" : undefined}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          data-testid="zip-submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] transition-colors"
        >
          {isLoading ? "Looking up…" : "Look Up My Ballot"}
        </button>
      </div>
      {error && (
        <p
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          aria-live="polite"
          className="mt-2 text-red-600 text-sm"
        >
          {error}
        </p>
      )}
    </form>
  );
}
