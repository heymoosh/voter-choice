"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useLanguage } from "@/lib/i18n";
import type { Translations } from "@/lib/translations";

interface ZipFormProps {
  onSubmit: (zipCode: string) => void;
  isLoading?: boolean;
}

export default function ZipForm({ onSubmit, isLoading = false }: ZipFormProps) {
  const [rawValue, setRawValue] = useState("");
  const [errorKey, setErrorKey] = useState<keyof Translations | null>(null);
  const { t } = useLanguage();

  // Derive display value: only digits, max 5 chars
  const zipCode = rawValue.replace(/\D/g, "").slice(0, 5);

  function validate(raw: string): keyof Translations | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return "zipErrorEmpty";
    }
    if (!/^\d{5}$/.test(trimmed)) {
      return "zipErrorInvalid";
    }
    return null;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrorKey = validate(rawValue);
    if (validationErrorKey) {
      setErrorKey(validationErrorKey);
      return;
    }
    setErrorKey(null);
    onSubmit(zipCode);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setRawValue(e.target.value);
    if (errorKey) {
      setErrorKey(null);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleKeyDown(_e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter handled by form submit
  }

  const errorMessage = errorKey ? t(errorKey) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label
            htmlFor="zip-code-input"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {t("zipInputLabel")}
          </label>
          <input
            id="zip-code-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={10}
            data-testid="zip-input"
            value={rawValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t("zipInputPlaceholder")}
            aria-label="5-digit US zip code"
            aria-describedby={errorMessage ? "zip-error-msg" : undefined}
            aria-invalid={errorMessage ? "true" : "false"}
            className={`w-full px-4 py-3 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-h-[48px]
              ${
                errorMessage
                  ? "border-red-400 focus:border-red-400 focus:ring-red-300"
                  : "border-gray-300 focus:border-blue-500"
              }`}
            disabled={isLoading}
          />
          {errorMessage && (
            <p
              id="zip-error-msg"
              data-testid="zip-error"
              role="alert"
              aria-live="polite"
              className="mt-2 text-sm text-red-600 flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errorMessage}
            </p>
          )}
        </div>
        <div className="sm:self-end">
          <button
            type="submit"
            data-testid="zip-submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[48px] min-w-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t("zipSubmitLoading")}
              </span>
            ) : (
              t("zipSubmitButton")
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
