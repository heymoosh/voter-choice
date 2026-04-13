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
      <div className="bg-surface-lowest p-2 border-b-2 border-primary flex items-end gap-2 shadow-sm">
        <div className="flex-grow">
          <label
            htmlFor="zip-input"
            className="block text-xs font-bold uppercase tracking-widest text-primary mb-1 px-1"
          >
            {t.zipForm.label}
          </label>
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
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-2xl font-bold p-1 placeholder:text-surface-high text-on-surface"
            placeholder={t.zipForm.placeholder}
            aria-describedby={errorMessage ? "zip-error" : undefined}
          />
        </div>
        <button
          data-testid="zip-submit"
          type="submit"
          className="bg-primary text-on-primary px-6 py-4 font-bold text-base hover:opacity-90 transition-opacity min-h-[44px] min-w-[44px]"
        >
          {lang === "en" ? "View Ballot" : "Ver Boleta"}
        </button>
      </div>
      {errorMessage && (
        <p
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          className="text-red-600 text-sm mt-2"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
