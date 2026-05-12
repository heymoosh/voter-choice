"use client";

import { useTranslation } from "@/lib/i18n/I18nContext";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  isLoading?: boolean;
}

export function ZipForm({ onSubmit, isLoading = false }: ZipFormProps) {
  const { t } = useTranslation();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const zip = (
      form.elements.namedItem("zip") as HTMLInputElement
    ).value.trim();
    onSubmit(zip);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="zip-code-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t.zipForm.label}
          </label>
          <input
            id="zip-code-input"
            name="zip"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            placeholder={t.zipForm.placeholder}
            autoComplete="postal-code"
            data-testid="zip-input"
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors min-h-[44px]"
            aria-label="Five-digit U.S. zip code"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          data-testid="zip-submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-3 text-lg font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none active:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isLoading ? t.loading : t.zipForm.submitButton}
        </button>
      </div>
    </form>
  );
}
