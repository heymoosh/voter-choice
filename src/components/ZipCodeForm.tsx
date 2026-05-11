"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";

interface ZipCodeFormProps {
  onSubmit: (zip: string) => void;
  loading?: boolean;
}

export function ZipCodeForm({ onSubmit, loading = false }: ZipCodeFormProps) {
  const [zip, setZip] = useState("");
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

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    // Allow input as-is (so non-numeric input can be validated on submit)
    // but limit to 5 characters max for UX
    const val = e.target.value.slice(0, 5);
    setZip(val);
    // Clear error on change
    if (error) setError(null);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationError = validate(zip);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit(zip.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="zip-code-input"
          className="text-sm font-medium text-gray-700"
        >
          Enter your 5-digit zip code
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="zip-code-input"
            data-testid="zip-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={zip}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Let form handle it
              }
            }}
            placeholder="e.g. 78701"
            aria-describedby={error ? "zip-error-msg" : undefined}
            aria-invalid={error ? "true" : "false"}
            className={`
              flex-1 min-h-[44px] px-4 py-2.5 text-base rounded-lg border-2 outline-none
              transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${error ? "border-red-500 bg-red-50" : "border-gray-300 bg-white hover:border-gray-400"}
              text-gray-900 placeholder-gray-400
            `}
            disabled={loading}
            autoComplete="postal-code"
          />
          <button
            data-testid="zip-submit"
            type="submit"
            disabled={loading}
            className={`
              min-h-[44px] min-w-[44px] px-6 py-2.5 rounded-lg font-semibold text-base
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${
                loading
                  ? "bg-blue-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
              }
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                Looking up...
              </span>
            ) : (
              "Look Up"
            )}
          </button>
        </div>

        {/* Error message — always in DOM for stable layout, shown conditionally */}
        <div
          id="zip-error-msg"
          data-testid="zip-error"
          role="alert"
          aria-live="polite"
          className={`text-sm text-red-600 min-h-[20px] ${error ? "visible" : "invisible"}`}
        >
          {error ?? " "}
        </div>
      </div>
    </form>
  );
}
