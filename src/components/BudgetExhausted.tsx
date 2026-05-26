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

import React, { useState, useMemo, useEffect, useRef } from "react";
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

  // Move focus into the overlay on mount so `aria-modal` actually means
  // something for screen-reader users. We focus the dismiss (X) button as
  // the safe initial target — it's a unanimous escape hatch and doesn't
  // commit any irreversible action. We do NOT block tabbing out of the
  // overlay (task: "let assistive tech users read state underneath"); the
  // aria-modal attribute is the announcement contract.
  const dismissButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!mounted) return;
    dismissButtonRef.current?.focus();
  }, [mounted]);

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
      {/* Backdrop — ink @ ~60% opacity, click-to-dismiss. */}
      <div
        data-testid="budget-exhausted-backdrop"
        aria-hidden="true"
        onClick={handleBackdropClick}
        className="absolute inset-0 bg-ink/60"
      />
      {/* Card — paper bg with rule border + shadow-card; stop-propagation so backdrop click doesn't fire from inside. */}
      <div
        data-testid="budget-exhausted-screen"
        onClick={handleDialogClick}
        className="relative z-10 mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-rule bg-paper px-7 py-9 text-ink shadow-[0_1px_0_var(--rule),0_30px_60px_-30px_oklch(0.18_0.018_240_/_0.18)]"
      >
        <button
          ref={dismissButtonRef}
          type="button"
          data-testid="budget-exhausted-dismiss"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md font-mono text-xl text-ink-3 hover:bg-paper-2 hover:text-ink"
        >
          ×
        </button>
        <header className="mb-8 pr-10">
          <h1
            id={HEADLINE_ID}
            data-testid="budget-exhausted-headline"
            className="font-serif text-2xl font-semibold leading-tight tracking-tight text-ink md:text-3xl"
          >
            Your ballot is saved. Keep going on any chatbot.
          </h1>
          <p
            data-testid="budget-exhausted-reset"
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3"
          >
            Community budget resets in {daysLeft} day{daysLeft === 1 ? "" : "s"}
            {" · "}
            {resetText}
          </p>
        </header>

        <section className="mb-8">
          <label className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            Paste this into any chatbot to keep going
          </label>
          <textarea
            data-testid="handoff-prompt-textarea"
            readOnly
            value={handoffPromptText}
            rows={8}
            className="mt-2 w-full rounded-md border border-rule bg-paper-2 p-3 font-mono text-xs leading-relaxed text-ink"
          />
          {/* PR C — sentence-case sans primary CTA per prototype primary
              treatment. Mono uppercase is reserved for micro-labels. */}
          <button
            type="button"
            data-testid="handoff-prompt-copy"
            onClick={handleCopy}
            className="mt-2 rounded-lg bg-civic px-4 py-2.5 text-[13.5px] font-semibold text-paper-2 hover:bg-civic-2"
          >
            {copied ? "Copied" : "Copy handoff prompt"}
          </button>
        </section>

        <section className="mb-8">
          {/* `Continue on any chatbot` reads as a section divider — keep
              mono uppercase per the audit's eyebrow-label reservation. */}
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            Continue on any chatbot
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* PR C — sentence-case sans labels on the chatbot link cards
                (CTAs, not dividers). Card chrome is unchanged; only the
                inner text label drops mono uppercase tracking. */}
            {CHATBOT_LINKS.map((link) => (
              <a
                key={link.id}
                data-testid={`chatbot-link-${link.id}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-md border border-rule bg-paper-2 px-4 py-3 hover:border-civic hover:bg-paper"
              >
                <span className="text-[13.5px] font-semibold text-ink">
                  {link.name}
                </span>
                <span aria-hidden="true" className="text-civic">
                  →
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="mb-8 border-t border-rule pt-6">
          <h2 className="font-serif text-lg font-semibold tracking-tight text-ink">
            Have an Anthropic API key? Use it directly in Voter Choice
          </h2>
          <p
            data-testid="byok-privacy-copy"
            className="mt-2 text-sm text-ink-2"
          >
            Your key stays in your browser. Never sent to our server.
          </p>
          {storedByokKey ? (
            <div className="mt-3 flex items-center justify-between rounded-md border border-rule bg-paper-2 px-4 py-3">
              <span className="text-sm text-ink">
                Using your key &middot;{" "}
                <span className="font-mono">{maskKey(storedByokKey)}</span>
              </span>
              {/* PR C — sentence-case sans destructive secondary. */}
              <button
                type="button"
                data-testid="byok-remove"
                onClick={() => onByokRemove?.()}
                className="text-[12.5px] font-semibold text-vote-red hover:underline"
              >
                Remove my key
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label
                htmlFor="byok-input-field"
                className="sr-only font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3"
              >
                Anthropic API key
              </label>
              <input
                id="byok-input-field"
                type="password"
                data-testid="byok-input"
                placeholder="sk-ant-..."
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                className="flex-1 rounded-md border border-rule bg-paper-2 px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-3/70"
                aria-label="Anthropic API key"
              />
              {/* PR C — sentence-case sans primary CTA. */}
              <button
                type="button"
                data-testid="byok-save"
                onClick={handleSave}
                className="rounded-lg bg-civic px-4 py-2.5 text-[13.5px] font-semibold text-paper-2 hover:bg-civic-2"
              >
                Save &amp; continue
              </button>
            </div>
          )}
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
            Starts with <code className="font-mono">sk-ant-</code>.
          </p>
        </section>

        <p className="mb-4 font-mono text-[10.5px] italic uppercase tracking-[0.1em] text-ink-3">
          Voter Choice is free. If it helped, a tip helps keep it free —{" "}
          <a
            data-testid="tip-jar-link"
            href="https://buymeacoffee.com/voterchoice"
            target="_blank"
            rel="noopener noreferrer"
            className="text-civic underline hover:text-civic-2"
          >
            Tip jar
          </a>{" "}
          &middot; not required.
        </p>

        {/* PR C — sentence-case sans primary CTA. */}
        {resetPassed ? (
          <button
            type="button"
            data-testid="resume-button"
            onClick={() => onResume?.()}
            className="mt-2 rounded-lg bg-civic px-4 py-2.5 text-[13.5px] font-semibold text-paper-2 hover:bg-civic-2"
          >
            Resume free chat
          </button>
        ) : null}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
