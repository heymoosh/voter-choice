"use client";

import React from "react";

// NEEDS-KEY: errors.dismissAriaLabel — EN "Dismiss" / ES "Descartar"

interface ErrorBannerAction {
  label: string;
  onClick: () => void;
}

export interface ErrorBannerProps {
  /** "warn" renders a gold-toned banner; "error" renders a red-toned banner. */
  tone?: "warn" | "error";
  title?: string;
  body?: string;
  primary?: ErrorBannerAction;
  secondary?: ErrorBannerAction;
  onClose?: () => void;
}

/**
 * Generic inline error/notice banner.
 *
 * Ported from prototype-components-c.jsx `ErrorBanner`.
 * Intended mount points: composed into AITimeoutBanner; usable anywhere
 * a non-fatal inline error needs to surface.
 *
 * Translates .err-banner CSS to Tailwind v4 token utilities.
 */
export function ErrorBanner({
  tone = "warn",
  title,
  body,
  primary,
  secondary,
  onClose,
}: ErrorBannerProps) {
  const isError = tone === "error";

  return (
    <div
      role="alert"
      className={[
        "grid gap-3 p-[14px_16px] rounded-lg items-start",
        "border",
        // grid columns: icon | body | close button (auto when onClose present)
        onClose ? "grid-cols-[28px_1fr_auto]" : "grid-cols-[28px_1fr]",
        // tone-specific bg + border
        isError
          ? "bg-[oklch(0.96_0.04_28)] border-[oklch(0.84_0.10_28)]"
          : "bg-[oklch(0.96_0.04_75)] border-[oklch(0.86_0.08_75)]",
      ].join(" ")}
    >
      {/* Icon circle */}
      <div
        aria-hidden="true"
        className={[
          "w-6 h-6 rounded-full grid place-items-center",
          "font-mono font-bold text-sm",
          isError ? "bg-vote-red text-paper-2" : "bg-gold text-ink",
        ].join(" ")}
      >
        {isError ? "⨯" : "!"}
      </div>

      {/* Body */}
      <div>
        {title && (
          <div className="font-semibold text-sm text-ink mb-1">{title}</div>
        )}
        {body && (
          <div className="text-[13.5px] text-ink-2 leading-relaxed mb-[10px]">
            {body}
          </div>
        )}
        {(primary || secondary) && (
          <div className="flex gap-[10px] flex-wrap">
            {primary && (
              <button
                onClick={primary.onClick}
                className="whitespace-nowrap bg-ink text-paper-2 border-0 rounded-md px-[14px] py-2 text-[12.5px] font-semibold cursor-pointer hover:bg-ink-2 transition-colors min-h-[44px]"
              >
                {primary.label}
              </button>
            )}
            {secondary && (
              <button
                onClick={secondary.onClick}
                className="whitespace-nowrap bg-transparent border border-rule rounded-md px-[14px] py-2 text-[12.5px] text-ink-2 cursor-pointer hover:border-ink-2 hover:text-ink transition-colors min-h-[44px]"
              >
                {secondary.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Optional dismiss */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="bg-transparent border-0 text-ink-3 cursor-pointer text-lg leading-none px-[6px] hover:text-ink transition-colors"
        >
          &times;
        </button>
      )}
    </div>
  );
}
