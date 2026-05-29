"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { translations } from "@/lib/translations";
import {
  getByokKey,
  setByokKey,
  removeByokKey,
} from "@/lib/anthropic-client-byok";

// NEEDS-KEY: settings.title          — EN "Settings" / ES "Configuración"
// NEEDS-KEY: settings.langSection    — EN "Language" / ES "Idioma"
// NEEDS-KEY: settings.langEn         — EN "English" / ES "Inglés"
// NEEDS-KEY: settings.langEs         — EN "Español" / ES "Español"
// NEEDS-KEY: settings.byokSection    — EN "Your Anthropic API key" / ES "Tu clave de API de Anthropic"
// NEEDS-KEY: settings.byokHelp       — EN "Bring your own key to keep going when the community budget runs out." / ES "Usa tu propia clave para continuar cuando se agote el presupuesto comunitario."
// NEEDS-KEY: settings.byokPlaceholder— EN "sk-ant-…" / ES "sk-ant-…"
// NEEDS-KEY: settings.byokSave       — EN "Save" / ES "Guardar"
// NEEDS-KEY: settings.byokClear      — EN "Remove key" / ES "Eliminar clave"
// NEEDS-KEY: settings.byokSaved      — EN "Key saved." / ES "Clave guardada."
// NEEDS-KEY: settings.byokRemoved    — EN "Key removed." / ES "Clave eliminada."
// NEEDS-KEY: settings.dataSection    — EN "Your data" / ES "Tus datos"
// NEEDS-KEY: settings.dataResume     — EN "Resume from saved profile" / ES "Continuar desde perfil guardado"
// NEEDS-KEY: settings.dataExport     — EN "Export my profile (.txt)" / ES "Exportar mi perfil (.txt)"
// NEEDS-KEY: settings.dataReset      — EN "Reset everything" / ES "Restablecer todo"
// NEEDS-KEY: settings.privacyLink    — EN "Privacy" / ES "Privacidad"
// NEEDS-KEY: settings.methodologyLink— EN "Methodology" / ES "Metodología"
// NEEDS-KEY: settings.aboutLink      — EN "About" / ES "Acerca de"
// NOTE: "Saved key" label and "Close" aria-label are hardcoded (no keys in prototype)
// NOTE: "Doesn't look like an Anthropic key" validation error is hardcoded (no key in prototype)

const PLACEHOLDERS = {
  en: {
    title: "Settings",
    langSection: "Language",
    langEn: "English",
    langEs: "Español",
    byokSection: "Your Anthropic API key",
    byokHelp:
      "Bring your own key to keep going when the community budget runs out.",
    byokPlaceholder: "sk-ant-…",
    byokSave: "Save",
    byokClear: "Remove key",
    byokSaved: "Key saved.",
    byokRemoved: "Key removed.",
    dataSection: "Your data",
    dataResume: "Resume from saved profile",
    dataExport: "Export my profile (.txt)",
    dataReset: "Reset everything",
    privacyLink: "Privacy",
    methodologyLink: "Methodology",
    aboutLink: "About",
  },
  es: {
    title: "Configuración",
    langSection: "Idioma",
    langEn: "Inglés",
    langEs: "Español",
    byokSection: "Tu clave de API de Anthropic",
    byokHelp:
      "Usa tu propia clave para continuar cuando se agote el presupuesto comunitario.",
    byokPlaceholder: "sk-ant-…",
    byokSave: "Guardar",
    byokClear: "Eliminar clave",
    byokSaved: "Clave guardada.",
    byokRemoved: "Clave eliminada.",
    dataSection: "Tus datos",
    dataResume: "Continuar desde perfil guardado",
    dataExport: "Exportar mi perfil (.txt)",
    dataReset: "Restablecer todo",
    privacyLink: "Privacidad",
    methodologyLink: "Metodología",
    aboutLink: "Acerca de",
  },
} as const;

/** Mask an Anthropic key for display: first 7 chars + … + last 4 chars. */
function maskKey(k: string): string {
  if (k.length < 12) return k;
  return k.slice(0, 7) + "…" + k.slice(-4);
}

export interface SettingsPanelProps {
  /** Whether the drawer is visible. */
  open: boolean;
  /** Called when the user requests to close the panel. */
  onClose: () => void;
  /** Called when the user clicks "Reset everything". */
  onResetAll: () => void;
  /** Called when the user clicks "Export my profile (.txt)". */
  onExportProfile?: () => void;
  /** Called when the user clicks "Resume from saved profile". */
  onResumeProfile?: () => void;
  /** Navigation callbacks — host passes these so the panel can deep-link to
   *  static pages without coupling to Next.js router directly. */
  onNavigatePrivacy?: () => void;
  onNavigateMethodology?: () => void;
  onNavigateAbout?: () => void;
}

/**
 * Slide-in settings drawer opened from the nav cog.
 *
 * Three sections:
 *   1. Language  — EN / ES toggle buttons (reuses LanguageToggle state)
 *   2. BYOK      — Anthropic key input, save/clear, masked display
 *   3. Your data — export profile, resume, reset
 *
 * Ported from prototype-screens-c.jsx `SettingsPanel`.
 * Intended mount point: Navigation.tsx (or a layout-level wrapper).
 * The parent controls `open` and supplies all callback props.
 *
 * BYOK helpers: getByokKey / setByokKey / removeByokKey from
 * src/lib/anthropic-client-byok.ts (localStorage key:
 * "voter-choice:byok-anthropic-key").
 */
export function SettingsPanel({
  open,
  onClose,
  onResetAll,
  onExportProfile,
  onResumeProfile,
  onNavigatePrivacy,
  onNavigateMethodology,
  onNavigateAbout,
}: SettingsPanelProps) {
  const { lang, setLang } = useLanguage();
  const [keyDraft, setKeyDraft] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  // `mounted` trails `open` by one rAF so CSS transitions can fire on enter.
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

  // Drive the CSS enter transition: set mounted one frame after open=true.
  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Refresh saved key and reset draft when opened
  useEffect(() => {
    if (!open) return;
    setSavedKey(getByokKey());
    setKeyDraft("");
    setStatus(null);
    // Focus first interactive element
    const timer = setTimeout(() => {
      const el =
        drawerRef.current?.querySelector<HTMLElement>("button, input, a");
      el?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Resolve translations (fall back to placeholder if key missing)
  const tr = translations[lang] as unknown as Record<string, unknown>;
  const s = (tr.settings ?? {}) as Record<string, string>;
  const ph = PLACEHOLDERS[lang];

  function t(key: keyof typeof ph): string {
    return (s[key] as string | undefined) ?? ph[key];
  }

  function saveKey() {
    const k = keyDraft.trim();
    if (!k.startsWith("sk-ant-")) {
      setStatus({
        tone: "error",
        text: "Doesn’t look like an Anthropic key (should start with sk-ant-).",
      });
      return;
    }
    setByokKey(k);
    setSavedKey(k);
    setKeyDraft("");
    setStatus({ tone: "ok", text: t("byokSaved") });
  }

  function clearKey() {
    removeByokKey();
    setSavedKey(null);
    setStatus({ tone: "ok", text: t("byokRemoved") });
  }

  return (
    /* Overlay backdrop — fades in via opacity transition */
    <div
      className={[
        "fixed inset-0 bg-[oklch(0.18_0.018_240/0.32)] z-[1000] flex justify-end",
        "transition-opacity duration-150",
        mounted ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sx-ttl"
    >
      {/* Drawer — slides in from right via translate + opacity transition */}
      <aside
        ref={drawerRef}
        data-testid="settings-panel"
        className={[
          "w-full max-w-[440px]",
          "bg-paper border-l border-rule",
          "flex flex-col overflow-y-auto",
          "transition-all duration-[180ms] ease-out",
          mounted ? "translate-x-0 opacity-100" : "translate-x-2 opacity-40",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex justify-between items-center px-6 pt-5 pb-3 border-b border-rule-2">
          <h2
            id="sx-ttl"
            className="m-0 font-serif font-semibold text-[22px] leading-tight tracking-[-0.015em] text-ink"
          >
            {t("title")}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-transparent border-0 text-2xl cursor-pointer text-ink-2 px-[6px] leading-none hover:text-ink transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            &times;
          </button>
        </header>

        {/* ── Language section ── */}
        <section className="px-6 py-[22px] border-b border-rule-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 m-0 mb-3">
            {t("langSection")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {/* EN button */}
            <button
              className={[
                "flex items-center gap-[10px] px-[14px] py-3 rounded-lg text-left text-[13.5px] text-ink cursor-pointer transition-colors",
                "border",
                lang === "en"
                  ? "border-civic bg-gradient-to-b from-[oklch(0.96_0.025_170)] to-paper-2"
                  : "bg-paper-2 border-rule hover:border-ink-2",
              ].join(" ")}
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
            >
              <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] bg-ink text-paper-2 px-[7px] py-1 rounded-[4px]">
                EN
              </span>
              <span>{t("langEn")}</span>
            </button>
            {/* ES button */}
            <button
              className={[
                "flex items-center gap-[10px] px-[14px] py-3 rounded-lg text-left text-[13.5px] text-ink cursor-pointer transition-colors",
                "border",
                lang === "es"
                  ? "border-civic bg-gradient-to-b from-[oklch(0.96_0.025_170)] to-paper-2"
                  : "bg-paper-2 border-rule hover:border-ink-2",
              ].join(" ")}
              onClick={() => setLang("es")}
              aria-pressed={lang === "es"}
            >
              <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] bg-ink text-paper-2 px-[7px] py-1 rounded-[4px]">
                ES
              </span>
              <span>{t("langEs")}</span>
            </button>
          </div>
        </section>

        {/* ── BYOK section ── */}
        <section className="px-6 py-[22px] border-b border-rule-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 m-0 mb-3">
            {t("byokSection")}
          </h3>
          <p className="text-[12.5px] text-ink-3 leading-[1.5] m-0 mb-3">
            {t("byokHelp")}
          </p>

          {savedKey ? (
            /* Saved key display */
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-[14px] py-3 bg-paper-2 border border-rule rounded-md">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                  Saved key
                </span>
                <code className="font-mono text-[13px] text-ink bg-tag-bg px-2 py-1 rounded-[4px]">
                  {maskKey(savedKey)}
                </code>
              </div>
              <button
                onClick={clearKey}
                className="border border-[oklch(0.85_0.08_28)] text-vote-red bg-transparent rounded-md px-4 py-[10px] font-semibold text-[13px] cursor-pointer hover:bg-[oklch(0.96_0.04_28)] transition-colors min-h-[44px]"
              >
                {t("byokClear")}
              </button>
            </div>
          ) : (
            /* Key input */
            <div className="flex gap-2">
              <input
                type="password"
                placeholder={t("byokPlaceholder")}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveKey();
                }}
                spellCheck={false}
                autoComplete="off"
                aria-label={t("byokSection")}
                className={[
                  "flex-1 border border-rule bg-paper-2",
                  "px-[14px] py-[11px] font-mono text-[13px] text-ink",
                  "rounded-md outline-none",
                  "focus:border-civic transition-colors",
                  "placeholder:text-ink-3",
                ].join(" ")}
              />
              <button
                onClick={saveKey}
                disabled={!keyDraft.trim()}
                className="whitespace-nowrap border-0 bg-civic text-paper-2 rounded-md px-4 py-[10px] font-semibold text-[13px] cursor-pointer hover:bg-civic-2 transition-colors disabled:bg-rule disabled:text-ink-3 disabled:cursor-not-allowed min-h-[44px]"
              >
                {t("byokSave")}
              </button>
            </div>
          )}

          {/* Status message */}
          {status && (
            <div
              role="status"
              className={[
                "mt-[10px] px-3 py-[10px] text-[13px] rounded-md",
                status.tone === "ok"
                  ? "bg-[oklch(0.94_0.04_145)] text-[oklch(0.34_0.10_145)]"
                  : "bg-[oklch(0.94_0.05_28)] text-[oklch(0.40_0.14_28)]",
              ].join(" ")}
            >
              {status.text}
            </div>
          )}
        </section>

        {/* ── Your data section ── */}
        <section className="px-6 py-[22px] border-b border-rule-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 m-0 mb-3">
            {t("dataSection")}
          </h3>
          <ul className="list-none m-0 p-0 grid gap-1">
            <li>
              <button
                onClick={() => {
                  onResumeProfile?.();
                  onClose();
                }}
                className="flex justify-between items-center w-full bg-transparent border border-rule-2 rounded-md px-[14px] py-[11px] text-[13.5px] text-ink cursor-pointer text-left hover:border-ink-2 transition-colors min-h-[44px]"
              >
                <span>{t("dataResume")}</span>
                <span className="text-ink-3 font-mono text-sm">↑</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onExportProfile?.();
                }}
                className="flex justify-between items-center w-full bg-transparent border border-rule-2 rounded-md px-[14px] py-[11px] text-[13.5px] text-ink cursor-pointer text-left hover:border-ink-2 transition-colors min-h-[44px]"
              >
                <span>{t("dataExport")}</span>
                <span className="text-ink-3 font-mono text-sm">↓</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onResetAll();
                  onClose();
                }}
                className="flex justify-between items-center w-full bg-transparent border border-[oklch(0.90_0.04_28)] rounded-md px-[14px] py-[11px] text-[13.5px] text-vote-red cursor-pointer text-left hover:bg-[oklch(0.97_0.025_28)] hover:border-vote-red transition-colors min-h-[44px]"
              >
                <span>{t("dataReset")}</span>
                <span className="font-mono text-sm">×</span>
              </button>
            </li>
          </ul>
        </section>

        {/* Footer links */}
        <footer className="px-6 pt-[18px] pb-6 flex flex-col gap-2">
          <button
            onClick={() => {
              onNavigatePrivacy?.();
              onClose();
            }}
            className="text-[12.5px] text-civic underline underline-offset-[3px] text-left bg-transparent border-0 cursor-pointer p-0 hover:text-civic-2 transition-colors"
          >
            {t("privacyLink")}
          </button>
          <button
            onClick={() => {
              onNavigateMethodology?.();
              onClose();
            }}
            className="text-[12.5px] text-civic underline underline-offset-[3px] text-left bg-transparent border-0 cursor-pointer p-0 hover:text-civic-2 transition-colors"
          >
            {t("methodologyLink")}
          </button>
          <button
            onClick={() => {
              onNavigateAbout?.();
              onClose();
            }}
            className="text-[12.5px] text-civic underline underline-offset-[3px] text-left bg-transparent border-0 cursor-pointer p-0 hover:text-civic-2 transition-colors"
          >
            {t("aboutLink")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
