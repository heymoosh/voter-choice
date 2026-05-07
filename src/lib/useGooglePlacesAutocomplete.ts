"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";

/** Recursively search through nested shadow DOMs for an <input>. */
export function findDeepInput(
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

export function getPlacesApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
}

function readPlaceFormattedAddress(place: Record<string, unknown>): string {
  return (
    (place.formattedAddress as string | undefined) ??
    (place.formatted_address as string | undefined) ??
    ""
  );
}

async function addressFromSelectEvent(e: Event): Promise<string> {
  const eventData = e as unknown as {
    place?: Record<string, unknown>;
    placePrediction?: { toPlace?: () => Record<string, unknown> };
  };
  const place =
    eventData.placePrediction?.toPlace?.() ?? eventData.place ?? undefined;
  if (!place) return "";

  const address = readPlaceFormattedAddress(place);
  if (address) return address;

  const fetchFn = place.fetchFields as
    | ((opts: { fields: string[] }) => Promise<unknown>)
    | undefined;
  if (!fetchFn) return "";

  await fetchFn.call(place, { fields: ["formattedAddress"] });
  return readPlaceFormattedAddress(place);
}

export function readInputFromContainer(
  container: HTMLDivElement | null,
): string {
  if (!container) return "";
  return findDeepInput(container)?.value.trim() ?? "";
}

export function useGooglePlacesAutocomplete({
  containerRef,
  innerInputRef,
  onSelect,
  onInputChange,
  enabled = true,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  innerInputRef: MutableRefObject<HTMLInputElement | null>;
  onSelect: (address: string) => void;
  onInputChange?: (address: string) => void;
  enabled?: boolean;
}) {
  const attachedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onInputChangeRef = useRef(onInputChange);
  onSelectRef.current = onSelect;
  onInputChangeRef.current = onInputChange;

  useEffect(() => {
    const apiKey = getPlacesApiKey();
    if (!enabled || !apiKey || !containerRef.current || attachedRef.current) {
      return;
    }

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
        "display:block;width:100%;--gmpx-color-surface:transparent;--gmpx-font-size-base:1.25rem;--gmpx-font-weight-base:700;",
      );

      const handleSelect = async (e: Event) => {
        try {
          const address = await addressFromSelectEvent(e);
          if (address) {
            onSelectRef.current(address);
            return;
          }
        } catch {
          // Manual input remains usable if enrichment fails.
        }

        const fallback = innerInputRef.current?.value.trim();
        if (fallback) onSelectRef.current(fallback);
      };

      el.addEventListener("gmp-placeselect", handleSelect);
      el.addEventListener("gmp-select", handleSelect);
      containerRef.current.appendChild(el);

      let retries = 0;
      const poll = () => {
        const input = findDeepInput(el) ?? findDeepInput(containerRef.current!);
        if (input) {
          innerInputRef.current = input;
          if (onInputChangeRef.current) {
            input.addEventListener("input", () => {
              onInputChangeRef.current?.(input.value);
            });
          }
        } else if (retries < 50) {
          retries++;
          if (retries < 10) requestAnimationFrame(poll);
          else setTimeout(poll, 100);
        }
      };
      requestAnimationFrame(poll);
    }

    init().catch(() => {});
  }, [containerRef, enabled, innerInputRef]);
}
