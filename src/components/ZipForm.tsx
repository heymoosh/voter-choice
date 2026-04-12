"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

type ErrorKey = "empty" | "invalid" | null;

interface ZipFormProps {
  onSubmit: (zip: string) => void;
}

export function ZipForm({ onSubmit }: ZipFormProps) {
  const [value, setValue] = useState("");
  const [errorKey, setErrorKey] = useState<ErrorKey>(null);
  const { lang } = useLanguage();
  const t = translations[lang];

  // Derive the display string from the current lang — not stored as a snapshot
  const errorMessage = errorKey ? t.errors[errorKey] : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setErrorKey("empty");
      return;
    }
    if (!/^\d{5}$/.test(value.trim())) {
      setErrorKey("invalid");
      return;
    }
    setErrorKey(null);
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor="zip-input"
        className="block text-xs font-medium uppercase tracking-wide text-on-surface-muted mb-1"
      >
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
            if (errorKey) setErrorKey(null);
          }}
          className="bg-surface-high border-b-2 border-outline-variant px-3 min-h-[44px] w-full rounded-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
          aria-describedby={errorMessage ? "zip-error" : undefined}
        />
        <button
          data-testid="zip-submit"
          type="submit"
          className="bg-primary text-on-primary px-4 min-h-[44px] min-w-[44px] rounded-sm font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 whitespace-nowrap transition-colors"
        >
          {t.zipForm.submit}
        </button>
      </div>
      {errorMessage && (
        <p
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          className="text-red-600 text-sm mt-1"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
