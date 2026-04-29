"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

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

/** Recursively search through nested shadow DOMs for an <input>. */
function findDeepInput(
  root: Element | DocumentFragment,
): HTMLInputElement | null {
  const input = root.querySelector("input");
  if (input) return input;
  for (const child of root.querySelectorAll("*")) {
    if (child.shadowRoot) {
      const deep = findDeepInput(child.shadowRoot);
      if (deep) return deep;
    }
  }
  return null;
}

/**
 * Attach a PlaceAutocompleteElement to the container.
 * Only requires "Places API (New)" — does NOT need the full Maps JS API.
 */
function useGooglePlaces(
  containerRef: React.RefObject<HTMLDivElement | null>,
  innerInputRef: React.MutableRefObject<HTMLInputElement | null>,
  onSelect: (address: string) => void,
) {
  const attachedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey || !containerRef.current || attachedRef.current) return;

    async function init() {
      const { setOptions, importLibrary } = await import(
        "@googlemaps/js-api-loader"
      );
      setOptions({ key: apiKey! });
      const placesLib = (await importLibrary(
        "places",
      )) as typeof google.maps.places;

      if (!containerRef.current || attachedRef.current) return;
      attachedRef.current = true;

      const el = new placesLib.PlaceAutocompleteElement({
        componentRestrictions: { country: "us" },
        types: ["address"],
      });

      el.setAttribute(
        "style",
        "width:100%; --gmpx-color-surface: transparent; --gmpx-font-size-base: 1.25rem; --gmpx-font-weight-base: 700;",
      );

      // --- Event-based capture (primary path) ---
      const handleSelect = async (e: Event) => {
        const place = (e as unknown as Record<string, unknown>).place as
          | Record<string, unknown>
          | undefined;

        // Try formattedAddress directly
        if (place?.formattedAddress) {
          onSelectRef.current(place.formattedAddress as string);
          return;
        }
        // Try fetchFields
        try {
          const fetchFn = place?.fetchFields as
            | ((opts: { fields: string[] }) => Promise<unknown>)
            | undefined;
          if (fetchFn) {
            await fetchFn.call(place, {
              fields: ["formattedAddress"],
            });
            if (place?.formattedAddress) {
              onSelectRef.current(place.formattedAddress as string);
              return;
            }
          }
        } catch {
          // Ignore autocomplete enrichment failures; the manual input remains usable.
        }
        // Fall back to inner input
        if (innerInputRef.current?.value) {
          onSelectRef.current(innerInputRef.current.value);
          return;
        }
        // Last resort: try el.value (some web components expose this)
        const elValue = (el as unknown as Record<string, unknown>)
          .value as string;
        if (elValue) {
          onSelectRef.current(elValue);
        }
      };

      el.addEventListener("gmp-placeselect", handleSelect);
      el.addEventListener("gmp-select", handleSelect);

      containerRef.current.appendChild(el);

      // --- Locate the inner <input> (handles nested shadow DOMs) ---
      let retries = 0;
      const poll = () => {
        // Search the element itself and the container
        const input = findDeepInput(el) ?? findDeepInput(containerRef.current!);
        if (input) {
          innerInputRef.current = input;
        } else if (retries < 50) {
          retries++;
          // Use increasing delays: rAF for the first few, then setTimeout
          if (retries < 10) {
            requestAnimationFrame(poll);
          } else {
            setTimeout(poll, 100);
          }
        }
      };
      requestAnimationFrame(poll);
    }

    init().catch(() => {});
  }, [containerRef, innerInputRef]);
}

export function ZipForm({ onSubmit }: ZipFormProps) {
  const [value, setValue] = useState("");
  const [errorKey, setErrorKey] = useState<ErrorKey>(null);
  const { lang } = useLanguage();
  const t = translations[lang];
  const placesContainerRef = useRef<HTMLDivElement>(null);
  const innerInputRef = useRef<HTMLInputElement | null>(null);
  const hasPlacesKey = !!process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  useGooglePlaces(placesContainerRef, innerInputRef, (address) => {
    setValue(address);
    setErrorKey(null);
  });

  const errorMessage = errorKey ? t.errors[errorKey] : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let trimmed = value.trim();
    // Fallback: read the actual inner input if React state is empty
    if (!trimmed && innerInputRef.current?.value) {
      trimmed = innerInputRef.current.value.trim();
    }
    // Last resort: try el.value or any input in the container
    if (!trimmed && placesContainerRef.current) {
      const deepInput = findDeepInput(placesContainerRef.current);
      if (deepInput?.value) {
        trimmed = deepInput.value.trim();
      }
    }
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
            onChange={(e) => {
              setValue(e.target.value);
              if (errorKey) setErrorKey(null);
            }}
            className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none text-xl md:text-2xl font-bold p-1 placeholder:text-surface-high text-on-surface ${
              hasPlacesKey ? "mt-2" : ""
            }`}
            placeholder={t.zipForm.placeholder}
            autoComplete="off"
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
