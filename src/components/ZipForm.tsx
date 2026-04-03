"use client";

import { useState, FormEvent } from "react";
import { useLanguage } from "../lib/i18n";

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
  const { t } = useLanguage();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onClearError();
    onSubmit(zip.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
    >
      <div className="flex-1">
        <label htmlFor="zip-input" className="sr-only">
          {t("form.label")}
        </label>
        <input
          id="zip-input"
          data-testid="zip-input"
          type="text"
          inputMode="numeric"
          placeholder={t("form.placeholder")}
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
        {t("form.submit")}
      </button>
      {error && (
        <div
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          className="w-full text-red-600 text-sm mt-1"
        >
          {t(error)}
        </div>
      )}
    </form>
  );
}
