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
    onInputChange: setValue,
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
      <div className="bg-paper-2 border border-rule rounded-[10px] p-[18px] pb-4 shadow-[0_1px_0_var(--rule-2),0_10px_30px_-20px_oklch(0.18_0.018_240/0.12)] focus-within:border-civic transition-colors">
        <label className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 mb-[10px]">
          <span>{t.zipForm.label}</span>
          <span className="text-civic">
            {lang === "es"
              ? "Permanece en este dispositivo"
              : "Stays on this device"}
          </span>
        </label>
        {/*
          fix-2-live-bugs (Bug 1) — the flex .row MUST contain only the
          input + button, matching the prototype `.addr-card .row` rule
          (docs/design/2026-redesign/prototype/prototype.css:155). Having
          the autocomplete hint inside the row stretched the button to
          ~71px because of default `align-items: stretch`. Hint copy now
          lives BELOW the row as a sibling within the card.
        */}
        <div className="flex gap-2">
          <div className="flex-grow">
            {hasPlacesKey && (
              <div ref={placesContainerRef} className="w-full" />
            )}
            <input
              id="zip-input"
              data-testid="zip-input"
              type="text"
              value={value}
              onChange={(e) => handleManualChange(e.target.value)}
              className={
                hasPlacesKey
                  ? "sr-only"
                  : "w-full bg-paper border border-rule rounded-lg px-4 py-[14px] text-[15px] text-ink placeholder:text-ink-3 outline-none focus:border-civic transition-colors"
              }
              placeholder={t.zipForm.placeholder}
              autoComplete="street-address"
              aria-describedby={errorMessage ? "zip-error" : "address-privacy"}
              aria-label={t.zipForm.label}
            />
          </div>
          <button
            data-testid="zip-submit"
            type="submit"
            // Prototype `.addr-card .go`: padding 0 24px, font 14.5px, no
            // fixed height. Flex row defaults to align-items: stretch so
            // the button matches the input height (~48px = 14px y-pad × 2
            // + 15px line).
            className="bg-civic text-paper-2 border-0 rounded-lg px-6 text-[14.5px] font-semibold whitespace-nowrap hover:bg-civic-2 transition-colors"
          >
            {lang === "en" ? "Pull my ballot →" : "Ver Boleta"}
          </button>
        </div>
        {hasPlacesKey && (
          <p className="text-[10px] text-ink-3 px-1 mt-2">
            {lang === "es"
              ? "Empieza a escribir y elige tu dirección del menú."
              : "Start typing and choose your address from the dropdown."}
          </p>
        )}
      </div>
      {errorMessage && (
        <p
          id="zip-error"
          data-testid="zip-error"
          role="alert"
          className="text-vote-red text-sm mt-2"
        >
          {errorMessage}
        </p>
      )}
      <p
        id="address-privacy"
        className="text-[12.5px] text-ink-3 mt-3 leading-relaxed"
      >
        {t.zipForm.privacy}
      </p>
    </form>
  );
}
