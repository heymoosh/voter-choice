"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  isLoading: boolean;
}

export function ZipForm({ onSubmit, isLoading }: ZipFormProps) {
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  function validate(value: string): string | null {
    if (!value.trim()) return t.zipForm.errors.required;
    if (!/^\d{5}$/.test(value.trim())) return t.zipForm.errors.invalid;
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(zip);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSubmit(zip.trim());
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setZip(e.target.value);
    if (error) setError(null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="zip-input-field"
          className="text-sm font-medium text-gray-700"
        >
          {t.zipForm.label}
        </label>
        <div className="flex gap-2">
          <input
            id="zip-input-field"
            data-testid="zip-input"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={zip}
            onChange={handleChange}
            placeholder={t.zipForm.placeholder}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "zip-error-msg" : undefined}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
          <button
            data-testid="zip-submit"
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 min-h-[44px] min-w-[44px] transition-colors"
          >
            {isLoading ? t.zipForm.loading : t.zipForm.submit}
          </button>
        </div>
        {error && (
          <p
            id="zip-error-msg"
            data-testid="zip-error"
            role="alert"
            aria-live="polite"
            className="text-red-600 text-sm"
          >
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
