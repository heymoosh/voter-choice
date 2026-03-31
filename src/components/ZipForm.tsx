"use client";

import { useState, FormEvent } from "react";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  error: string | null;
  onClearError: () => void;
}

export default function ZipForm({
  onSubmit,
  error,
  onClearError,
}: ZipFormProps) {
  const [zip, setZip] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onClearError();

    if (!zip.trim()) {
      onSubmit("");
      return;
    }

    if (!/^\d{5}$/.test(zip.trim())) {
      onSubmit(zip.trim());
      return;
    }

    onSubmit(zip.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
    >
      <div className="flex-1">
        <label htmlFor="zip-input" className="sr-only">
          Zip Code
        </label>
        <input
          id="zip-input"
          data-testid="zip-input"
          type="text"
          inputMode="numeric"
          placeholder="Enter your 5-digit zip code"
          value={zip}
          onChange={(e) => {
            setZip(e.target.value);
            if (error) onClearError();
          }}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "zip-error" : undefined}
          maxLength={5}
        />
      </div>
      <button
        type="submit"
        data-testid="zip-submit"
        className="px-6 py-3 bg-[#1e3a5f] text-white rounded-lg font-semibold text-lg hover:bg-[#2a4a73] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors min-w-[100px] min-h-[48px]"
      >
        Go
      </button>
      {error && (
        <div
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          className="w-full text-red-600 text-sm mt-1 sm:absolute sm:top-full sm:left-0 sm:mt-2"
        >
          {error}
        </div>
      )}
    </form>
  );
}
