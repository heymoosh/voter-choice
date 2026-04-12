"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
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
    <div className="bg-surface-lowest rounded-sm p-5 space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label
          htmlFor="address-input"
          className="block text-sm font-medium text-on-surface"
        >
          {t.addressLabel}
        </label>
        <input
          id="address-input"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t.addressPlaceholder}
          maxLength={200}
          disabled={isLoading}
          className="w-full bg-surface-high border-b-2 border-outline-variant px-3 py-2.5 text-base text-on-surface rounded-sm focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-muted disabled:opacity-50"
        />
        <p className="text-xs text-on-surface-muted">{t.privacyNote}</p>
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!address.trim() || isLoading}
          >
            {isLoading ? t.loadingLocations : t.lookUpButton}
          </Button>
          <button
            type="button"
            onClick={onSkip}
            disabled={isLoading}
            className="text-sm text-on-surface-muted hover:text-primary hover:underline transition-colors disabled:opacity-50"
          >
            {t.skipLink}
          </button>
        </div>
      </form>
    </div>
  );
}
