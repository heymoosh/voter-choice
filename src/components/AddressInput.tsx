"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

interface AddressInputProps {
  onSubmit: (address: string) => void;
  onSkip: () => void;
  isLoading: boolean;
}

export function AddressInput({
  onSubmit,
  onSkip,
  isLoading,
}: AddressInputProps) {
  const [address, setAddress] = useState("");
  const { lang } = useLanguage();
  const t = translations[lang].polling;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="address-input"
          className="block text-[11px] font-bold uppercase tracking-widest text-on-surface-muted mb-1 ml-1"
        >
          {t.enterAddressLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-grow relative">
            <input
              id="address-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.addressPlaceholder}
              maxLength={200}
              disabled={isLoading}
              className="w-full bg-surface-high border-0 border-b-2 border-outline-variant/20 focus:border-primary focus:ring-0 text-base md:text-lg font-bold py-3 px-4 transition-colors placeholder:text-on-surface-muted/50 disabled:opacity-50 min-h-[44px]"
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-muted/50"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
            </svg>
          </div>
          <button
            type="submit"
            disabled={!address.trim() || isLoading}
            className="bg-primary text-on-primary px-6 py-3 font-bold uppercase text-xs tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
          >
            {isLoading ? t.loadingLocations : t.searchButton}
          </button>
        </div>
      </form>

      <div className="p-4 bg-surface-low flex items-start gap-3">
        <svg
          className="text-primary shrink-0 mt-0.5"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
        </svg>
        <p className="text-xs leading-relaxed text-on-surface-muted font-medium">
          {t.privacyBadge}
        </p>
      </div>

      <button
        type="button"
        onClick={onSkip}
        disabled={isLoading}
        className="text-sm text-on-surface-muted hover:text-primary hover:underline transition-colors disabled:opacity-50"
      >
        {t.skipLink}
      </button>
    </div>
  );
}
