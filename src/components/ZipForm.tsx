"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
}

export function ZipForm({ onSubmit }: ZipFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { lang } = useLanguage();
  const t = translations[lang];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError(t.errors.empty);
      return;
    }
    if (!/^\d{5}$/.test(value.trim())) {
      setError(t.errors.invalid);
      return;
    }
    setError(null);
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="zip-input" className="block text-sm font-medium mb-1">
        {t.zipForm.label}
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
          {t.zipForm.submit}
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
