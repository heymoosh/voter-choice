"use client";

import { useState } from "react";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
}

export function ZipForm({ onSubmit }: ZipFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError("Please enter a zip code");
      return;
    }
    if (!/^\d{5}$/.test(value.trim())) {
      setError("Please enter a valid 5-digit zip code");
      return;
    }
    setError(null);
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="zip-input" className="block text-sm font-medium mb-1">
        Enter your zip code
      </label>
      <div className="flex gap-2">
        <input
          id="zip-input"
          data-testid="zip-input"
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          className="border rounded px-3 min-h-[44px] w-full focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-describedby={error ? "zip-error" : undefined}
        />
        <button
          data-testid="zip-submit"
          type="submit"
          className="bg-blue-600 text-white px-4 min-h-[44px] min-w-[44px] rounded font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-800 whitespace-nowrap"
        >
          Find My Ballot Info
        </button>
      </div>
      {error && (
        <p
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          className="text-red-600 text-sm mt-1"
        >
          {error}
        </p>
      )}
    </form>
  );
}
