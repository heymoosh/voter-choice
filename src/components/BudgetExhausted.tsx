"use client";

/**
 * BudgetExhausted — out-of-budget continuity overlay (Phase 9, PR 7 reshape).
 *
 * Reframes community-budget exhaustion as continuity, not failure. Headline
 * is "Your ballot is saved. Keep going on any chatbot." — never apology
 * copy. Surfaces four chatbot deeplinks in strict alphabetical order (load-
 * bearing per packet), a copyable handoff prompt, an absolute reset
 * timestamp, a tip-jar link explicitly marked "not required," and a BYOK
 * affordance that stores the key in localStorage only.
 *
 * Render shape (PR 7): the component is a **modal overlay** rendered via
 * React Portal to `document.body` so the underlying workspace stays
 * mounted + interactive (per redesign feedback: "We still have all their
 * information"). Dismissable via the X button, backdrop click, or Escape.
 * Dismiss is a pure UI action — it does not undo the budget state. If the
 * user sends another chat call without a BYOK key, the route returns
 * `budget_exhausted` again and the overlay re-mounts.
 *
 * See `.ai/work-packets/redesign-phase-9-out-of-budget-handoff.md` for the
 * original surface and the redesign-phase-9 follow-up notes for the modal
 * pivot.
 */

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Four chatbot links — strict alphabetical order. Voter Choice is
 * nonpartisan and so is the AI-provider choice. Reordering this array
 * fails the snapshot test for a reason: alphabetical is part of the brand.
 */
const CHATBOT_LINKS = [
  { id: "claude", name: "Claude", url: "https://claude.ai" },
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com" },
  { id: "grok", name: "Grok", url: "https://x.com/grok" },
] as const;

export interface BudgetExhaustedProps {
  /** ISO timestamp when the community budget resets. */
  resetAt: string;
  /** Pre-rendered handoff prompt text the user can copy. */
  handoffPromptText: string;
  /** Fires with the entered BYOK key when the user clicks Save & continue. */
  onByokContinue: (key: string) => void;
  /** Fires when the user clicks Remove my key. Optional. */
  onByokRemove?: () => void;
  /** Currently stored BYOK key (if any). Affects the BYOK row UI. */
  storedByokKey: string | null;
  /** Fires when the user clicks Resume after the budget has reset. */
  onResume?: () => void;
  /**
   * PR 7 — dismiss the overlay. Workspace becomes visible/interactive
   * underneath again (chat input still gated until BYOK or budget reset,
   * but the user can review themes + decisions). Pure UI: does not undo
   * the budget state itself.
   */
  onDismiss: () => void;
}

/**
 * Format an ISO timestamp as "June 1, 12:00 AM UTC" — used for the
 * absolute reset-time line so the user can plan around the rollover.
 * jsdom doesn't always carry tz data; we build the components manually
 * from UTC-getters so tests are deterministic across runtimes.
 */
function formatResetTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const isPm = hours >= 12;
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const mm = String(minutes).padStart(2, "0");
  return `${month} ${day}, ${hour12}:${mm} ${isPm ? "PM" : "AM"} UTC`;
}

function daysUntil(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function maskKey(key: string): string {
  if (key.length <= 8) return "····";
  return `····${key.slice(-4)}`;
}

/**
 * Stable id for the headline so `aria-labelledby` on the dialog can point
 * at it. Module-level constant keeps the wiring trivially testable.
 */
const HEADLINE_ID = "budget-exhausted-headline";

export function BudgetExhausted(
  props: BudgetExhaustedProps,
): React.ReactElement | null {
  const {
    resetAt,
    handoffPromptText,
    onByokContinue,
    onByokRemove,
    storedByokKey,
    onResume,
    onDismiss,
  } = props;

  const [keyDraft, setKeyDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const resetText = useMemo(() => formatResetTime(resetAt), [resetAt]);
  const daysLeft = useMemo(() => daysUntil(resetAt), [resetAt]);

  // Track whether the reset has already passed so we can show the
  // "Resume" affordance. Recomputed on a 30s interval so the user
  // doesn't need to refresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const resetPassed = useMemo(() => {
    const t = new Date(resetAt).getTime();
    if (Number.isNaN(t)) return false;
    return now >= t;
  }, [resetAt, now]);

  // Portal SSR safety: gate on a `mounted` flag set by useEffect so the
  // server render returns null and hydration is consistent. Avoids the
  // typeof-document branch which mismatches hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape-to-dismiss. Attach to document so the listener fires no matter
  // where focus lives. Mounted-only so unmounted instances don't leak.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onDismiss();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(handoffPromptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may fail in restricted contexts; silently degrade.
    }
  }

  function handleSave() {
    const trimmed = keyDraft.trim();
    if (trimmed.length === 0) return;
    onByokContinue(trimmed);
    setKeyDraft("");
  }

  // Backdrop-click dismiss. Stop-propagation on the inner card so clicks
  // inside the dialog don't bubble up to the backdrop handler.
  function handleBackdropClick() {
    onDismiss();
  }
  function handleDialogClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  if (!mounted) return null;

  const overlay = (
    <div
      data-testid="budget-exhausted-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={HEADLINE_ID}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop — semi-transparent, click-to-dismiss. */}
      <div
        data-testid="budget-exhausted-backdrop"
        aria-hidden="true"
        onClick={handleBackdropClick}
        className="absolute inset-0 bg-black/50"
      />
      {/* Card — stop-propagation so backdrop click doesn't fire from inside. */}
      <div
        data-testid="budget-exhausted-screen"
        onClick={handleDialogClick}
        className="relative z-10 mx-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface px-6 py-8 text-on-surface shadow-xl"
      >
        <button
          type="button"
          data-testid="budget-exhausted-dismiss"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center text-xl font-bold text-on-surface-muted hover:text-on-surface"
        >
          ×
        </button>
        <header className="mb-8 pr-10">
          <h1
            id={HEADLINE_ID}
            data-testid="budget-exhausted-headline"
            className="font-black text-2xl md:text-3xl tracking-tight"
          >
            Your ballot is saved. Keep going on any chatbot.
          </h1>
          <p
            data-testid="budget-exhausted-reset"
            className="mt-3 text-sm text-on-surface-muted"
          >
            Community budget resets in {daysLeft} day{daysLeft === 1 ? "" : "s"}
            {" · "}
            {resetText}
          </p>
        </header>

        <section className="mb-8">
          <label className="text-xs font-black uppercase tracking-widest text-on-surface-muted">
            Paste this into any chatbot to keep going
          </label>
          <textarea
            data-testid="handoff-prompt-textarea"
            readOnly
            value={handoffPromptText}
            rows={8}
            className="mt-2 w-full bg-surface-low p-3 font-mono text-xs text-on-surface leading-relaxed"
          />
          <button
            type="button"
            data-testid="handoff-prompt-copy"
            onClick={handleCopy}
            className="mt-2 bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-primary hover:bg-primary/90"
          >
            {copied ? "Copied" : "Copy handoff prompt"}
          </button>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-muted">
            Continue on any chatbot
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CHATBOT_LINKS.map((link) => (
              <a
                key={link.id}
                data-testid={`chatbot-link-${link.id}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border border-outline-variant/40 bg-surface-lowest px-4 py-3 hover:bg-surface-low"
              >
                <span className="text-sm font-bold">{link.name}</span>
                <span className="text-on-surface-muted">→</span>
              </a>
            ))}
          </div>
        </section>

        <section className="mb-8 border-t border-outline-variant/30 pt-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-on-surface-muted">
            Have an Anthropic API key? Use it directly in Voter Choice
          </h2>
          <p
            data-testid="byok-privacy-copy"
            className="mt-2 text-xs text-on-surface-muted"
          >
            Your key stays in your browser. Never sent to our server.
          </p>
          {storedByokKey ? (
            <div className="mt-3 flex items-center justify-between bg-surface-low px-4 py-3">
              <span className="text-sm">
                Using your key &middot;{" "}
                <span className="font-mono">{maskKey(storedByokKey)}</span>
              </span>
              <button
                type="button"
                data-testid="byok-remove"
                onClick={() => onByokRemove?.()}
                className="text-xs font-bold uppercase tracking-widest text-accent hover:underline"
              >
                Remove my key
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                data-testid="byok-input"
                placeholder="sk-ant-..."
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                className="flex-1 border border-outline-variant/40 bg-surface-lowest px-3 py-2 font-mono text-sm"
                aria-label="Anthropic API key"
              />
              <button
                type="button"
                data-testid="byok-save"
                onClick={handleSave}
                className="bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-primary hover:bg-primary/90"
              >
                Save &amp; continue
              </button>
            </div>
          )}
          <p className="mt-2 text-[11px] text-on-surface-muted">
            Starts with <code>sk-ant-</code>.
          </p>
        </section>

        <p className="mb-4 text-xs italic text-on-surface-muted">
          Voter Choice is free. If it helped, a tip helps keep it free —{" "}
          <a
            data-testid="tip-jar-link"
            href="https://buymeacoffee.com/voterchoice"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Tip jar
          </a>{" "}
          &middot; not required.
        </p>

        {resetPassed ? (
          <button
            type="button"
            data-testid="resume-button"
            onClick={() => onResume?.()}
            className="mt-2 bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-primary hover:bg-primary/90"
          >
            Resume free chat
          </button>
        ) : null}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
