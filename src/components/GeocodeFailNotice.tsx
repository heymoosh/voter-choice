"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";
import { translations } from "@/lib/translations";

// NEEDS-KEY: errors.geocodeFailTitle — EN "[see prototype]" / ES "[see prototype]"
// NEEDS-KEY: errors.geocodeFailBody  — EN "[see prototype]" / ES "[see prototype]"
// NEEDS-KEY: errors.geocodeFailRetry — EN "Edit address" / ES "Editar dirección"
// NEEDS-KEY: errors.geocodeFailSkip  — EN "Enter ZIP instead" / ES "Ingresar código postal"
// NOTE: The following strings are hardcoded (no i18n key in prototype):
//   eyebrow: "Address lookup failed"
//   "You entered" label
//   Tip body text (including example address)

const PLACEHOLDERS = {
  en: {
    geocodeFailTitle: "We couldn't find that address",
    geocodeFailBody:
      "We looked, but couldn't locate your address on the map. Double-check the spelling — or enter your ZIP code below to find your ballot.",
    geocodeFailRetry: "Edit address",
    geocodeFailSkip: "Enter ZIP instead",
  },
  es: {
    geocodeFailTitle: "No pudimos encontrar esa dirección",
    geocodeFailBody:
      "Buscamos pero no localizamos tu dirección. Verifica la ortografía — o ingresa tu código postal para encontrar tu boleta.",
    geocodeFailRetry: "Editar dirección",
    geocodeFailSkip: "Ingresar código postal",
  },
} as const;

export interface GeocodeFailNoticeProps {
  /** The address string the user submitted (shown in the "You entered" row). */
  address?: string;
  /** Called when the user clicks "Edit address". */
  onEditAddress: () => void;
  /** Called when the user clicks "Enter ZIP instead". */
  onContinueWithZip: () => void;
}

/**
 * Full-page geocode failure view shown when the address submitted to
 * /api/civic cannot be resolved.
 *
 * Ported from prototype-screens-c.jsx `GeocodeFailView`.
 * Intended mount point: rendered by the page-level routing layer
 * (e.g. src/app/page.tsx or BallotToolClient.tsx) instead of the workspace
 * when a geocode error is returned. Replaces the inline error currently
 * surfaced inside AddressInput.tsx.
 *
 * Visual: centered card on paper background (see .gf-wrap / .gf-card in
 * prototype-c.css). Not a thin left-bordered Notice — uses a rounded card.
 */
export function GeocodeFailNotice({
  address,
  onEditAddress,
  onContinueWithZip,
}: GeocodeFailNoticeProps) {
  const { lang } = useLanguage();

  const tr = translations[lang] as unknown as Record<string, unknown>;
  const errors = (tr.errors ?? {}) as Record<string, string>;

  const title = errors.geocodeFailTitle ?? PLACEHOLDERS[lang].geocodeFailTitle;
  const body = errors.geocodeFailBody ?? PLACEHOLDERS[lang].geocodeFailBody;
  const retryLabel =
    errors.geocodeFailRetry ?? PLACEHOLDERS[lang].geocodeFailRetry;
  const skipLabel =
    errors.geocodeFailSkip ?? PLACEHOLDERS[lang].geocodeFailSkip;

  return (
    <div
      className="min-h-[calc(100vh-64px)] grid place-items-start place-content-center px-6 py-14 bg-paper"
      data-testid="geocode-fail-notice"
    >
      <div
        className={[
          "w-full max-w-[640px]",
          "bg-paper-2 border border-rule rounded-xl",
          "px-9 pt-9 pb-8",
          "shadow-[var(--shadow-card)]",
        ].join(" ")}
      >
        {/* Eyebrow badge — red tone, hardcoded (no key in prototype) */}
        <div className="inline-block font-mono text-[10.5px] uppercase tracking-[0.14em] text-vote-red bg-[oklch(0.96_0.04_28)] px-2 py-1 rounded mb-4">
          Address lookup failed
        </div>

        {/* Heading */}
        <h2 className="font-serif font-semibold text-[32px] leading-[1.1] tracking-[-0.02em] text-ink m-0 mb-[14px]">
          {title}
        </h2>

        {/* Body */}
        <p className="text-[15px] leading-[1.55] text-ink-2 m-0 mb-[22px]">
          {body}
        </p>

        {/* Attempted address row */}
        <div className="bg-paper border border-rule-2 rounded-md px-[14px] py-3 mb-[22px] flex items-center gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 shrink-0">
            You entered
          </span>
          <code className="font-mono text-[13px] text-ink break-all">
            {address || "(empty)"}
          </code>
        </div>

        {/* Actions */}
        <div className="flex gap-[10px] flex-wrap mb-[18px] items-center">
          <button
            onClick={onEditAddress}
            className="whitespace-nowrap bg-civic text-paper-2 border-0 rounded-lg px-5 py-3 font-semibold text-sm cursor-pointer hover:bg-civic-2 transition-colors min-h-[44px]"
          >
            ← {retryLabel}
          </button>
          <button
            onClick={onContinueWithZip}
            className="whitespace-nowrap bg-transparent border border-rule rounded-lg px-[18px] py-3 text-[13.5px] text-ink-2 cursor-pointer hover:border-ink-2 hover:text-ink transition-colors min-h-[44px]"
          >
            {skipLabel} →
          </button>
        </div>

        {/* Tip — hardcoded (no i18n key in prototype) */}
        <p className="text-[13px] text-ink-3 m-[14px_0_0] px-[14px] py-3 bg-paper rounded-md border-l-[3px] border-l-gold leading-[1.55]">
          <b>Tip:</b> if you just typed a ZIP, add a street like{" "}
          <code className="font-mono text-[12px] bg-tag-bg px-[5px] py-[2px] rounded-sm">
            5750 Hartwick Rd, Houston TX 77057
          </code>
          . If you typed a full address, double-check the state abbreviation and
          ZIP.
        </p>
      </div>
    </div>
  );
}
