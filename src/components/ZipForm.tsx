"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  disabled?: boolean;
}

export function ZipForm({ onSubmit, disabled = false }: ZipFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const { t } = useLanguage();

  function validate(zip: string): string {
    if (!zip || zip.trim() === "") {
      return t.zipForm.errorEmpty;
    }
    if (!/^\d{5}$/.test(zip.trim())) {
      return t.zipForm.errorInvalid;
    }
    return "";
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const msg = validate(value);
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="zip-input"
          className="text-base font-semibold text-gray-900"
        >
          {t.zipForm.label}
        </label>
        <div className="flex flex-wrap gap-2">
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
              if (error) setError("");
            }}
            disabled={disabled}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "zip-error" : undefined}
            placeholder={t.zipForm.placeholder}
            className="w-40 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            data-testid="zip-submit"
            disabled={disabled}
            className="min-h-[44px] min-w-[120px] rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {t.zipForm.submit}
          </button>
        </div>
        {/* Error container — always in DOM, populated on error */}
        <div
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className={`text-sm font-medium text-red-600 ${error ? "" : "hidden"}`}
        >
          {error}
        </div>
      </div>
    </form>
  );
}
