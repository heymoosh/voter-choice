"use client";

import { useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import {
  getPlacesApiKey,
  readInputFromContainer,
  useGooglePlacesAutocomplete,
} from "../lib/useGooglePlacesAutocomplete";

type ErrorKey = "empty" | "invalid" | null;

interface ZipFormProps {
  onSubmit: (address: string) => void;
}

/** Extract a 5-digit zip code from an address string. */
export function extractZip(address: string): string | null {
  // Prefer ZIP after a two-letter state code (e.g. "TX 78701")
  const stateZip = address.match(/\b[A-Z]{2}\s+(\d{5})(?:-\d{4})?\b/i);
  if (stateZip) return stateZip[1];
  // Fallback: bare ZIP at end of string (e.g. user typed "78701")
  const endZip = address.match(/\b(\d{5})(?:-\d{4})?\s*$/);
  return endZip ? endZip[1] : null;
}

/** Extract a US state code from an address (e.g. "TX" from "Houston, TX, USA"). */
export function extractState(address: string): string | null {
  const match = address.match(/,\s*([A-Z]{2})\s*(?:,|\d|$)/i);
  return match ? match[1].toUpperCase() : null;
}

export function ZipForm({ onSubmit }: ZipFormProps) {
  const [value, setValue] = useState("");
  const [errorKey, setErrorKey] = useState<ErrorKey>(null);
  const { lang } = useLanguage();
  const t = translations[lang];
  const placesContainerRef = useRef<HTMLDivElement>(null);
  const innerInputRef = useRef<HTMLInputElement | null>(null);
  const hasPlacesKey = !!getPlacesApiKey();

  useGooglePlacesAutocomplete({
    containerRef: placesContainerRef,
    innerInputRef,
    onSelect: (address) => {
      setValue(address);
      setErrorKey(null);
    },
  });

  function handleManualChange(address: string) {
    setValue(address);
    if (errorKey) setErrorKey(null);
  }

  const errorMessage = errorKey ? t.errors[errorKey] : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let trimmed = value.trim();
    if (!trimmed && innerInputRef.current?.value) {
      trimmed = innerInputRef.current.value.trim();
    }
    if (!trimmed) trimmed = readInputFromContainer(placesContainerRef.current);
    if (!trimmed) {
      setErrorKey("empty");
      return;
    }
    const zip = extractZip(trimmed);
    if (!zip && !extractState(trimmed)) {
      setErrorKey("invalid");
      return;
    }
    setErrorKey(null);
    onSubmit(trimmed);
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
          {hasPlacesKey && <div ref={placesContainerRef} className="w-full" />}
          <input
            id="zip-input"
            data-testid="zip-input"
            type="text"
            value={value}
            onChange={(e) => handleManualChange(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-xl md:text-2xl font-bold p-1 placeholder:text-surface-high text-on-surface"
            placeholder={t.zipForm.placeholder}
            autoComplete="street-address"
            aria-describedby={errorMessage ? "zip-error" : "address-privacy"}
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
      <p
        id="address-privacy"
        className="text-[10px] text-on-surface-muted mt-2 px-1"
      >
        {t.zipForm.privacy}
      </p>
    </form>
  );
}
