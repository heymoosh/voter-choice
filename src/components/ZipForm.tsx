"use client";
import { useState, FormEvent } from "react";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  disabled?: boolean;
}

export function ZipForm({ onSubmit, disabled }: ZipFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = (zip: string): string | null => {
    if (!zip.trim()) return "Please enter a zip code";
    if (!/^\d{5}$/.test(zip)) return "Please enter a valid 5-digit zip code";
    return null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor="zip-input"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Enter your 5-digit zip code
      </label>
      <div className="flex gap-2">
        <input
          id="zip-input"
          data-testid="zip-input"
          type="text"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. 73301"
          disabled={disabled}
          aria-describedby={error ? "zip-error-msg" : undefined}
          aria-invalid={!!error}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
        />
        <button
          type="submit"
          data-testid="zip-submit"
          disabled={disabled}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 min-h-[44px] min-w-[44px]"
        >
          Look up
        </button>
      </div>
      {error && (
        <p
          id="zip-error-msg"
          data-testid="zip-error"
          role="alert"
          aria-live="polite"
          className="mt-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </form>
  );
}
