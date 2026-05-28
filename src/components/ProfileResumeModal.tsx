"use client";

/*
 * ProfileResumeModal
 *
 * Dropzone modal opened from home's "Drop your saved .txt profile →" link.
 * The user drops or selects a .txt voter-profile file; the file text is parsed
 * with extractVoterProfile (from ballot-utils.ts) and passed up via onResume.
 *
 * Prop contract:
 *   open:     boolean          – controls visibility; null return when false.
 *   onClose:  () => void       – close without resuming (× button / backdrop / Esc).
 *   onResume: (parsed: string) => void
 *             – called with the raw voter-profile block string extracted from
 *               the .txt file.  extractVoterProfile returns the full
 *               "=== MY VOTER PROFILE ... === END VOTER PROFILE ===" block, or
 *               null if the file doesn't contain a recognisable profile.
 *               If null, an error message is shown and onResume is NOT called.
 *
 * NEEDS-KEY: profileResume.eyebrow — EN "Resume from saved profile" / ES "Reanudar desde perfil guardado"
 * NEEDS-KEY: profileResume.title   — EN "Drop your .txt profile." / ES "Sube tu perfil .txt."
 * NEEDS-KEY: profileResume.lede    — EN "If you saved your profile from a previous session, drop the .txt here. Your priorities and draft picks restore. Your address is still kept on this device only." / ES "Si guardaste tu perfil de una sesión anterior, suéltalo aquí. Tus prioridades y selecciones se restauran. Tu dirección sigue en este dispositivo únicamente."
 * NEEDS-KEY: profileResume.dropLabel  — EN "Drop your saved profile here" / ES "Suelta tu perfil guardado aquí"
 * NEEDS-KEY: profileResume.dropOr     — EN "or" / ES "o"
 * NEEDS-KEY: profileResume.chooseFile — EN "Choose file…" / ES "Elegir archivo…"
 * NEEDS-KEY: profileResume.errorInvalid — EN "This file doesn't contain a recognised voter profile. Make sure you downloaded the correct .txt file." / ES "Este archivo no contiene un perfil de votante reconocido. Asegúrate de haber descargado el archivo .txt correcto."
 * NEEDS-KEY: profileResume.footer     — EN "Your profile lives only on the device you saved it from. We don't store profiles on our servers — they'd just be another tracking vector." / ES "Tu perfil vive únicamente en el dispositivo desde el que lo guardaste. No almacenamos perfiles en nuestros servidores."
 * NEEDS-KEY: profileResume.close      — EN "Close" / ES "Cerrar"
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { extractVoterProfile } from "@/lib/ballot-utils";
import { useLanguage } from "@/lib/i18n";

export interface ProfileResumeModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the raw voter-profile block string (the === MY VOTER PROFILE … === END === text). */
  onResume: (parsed: string) => void;
}

export function ProfileResumeModal({
  open,
  onClose,
  onResume,
}: ProfileResumeModalProps) {
  const { lang } = useLanguage();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Focus the × on open
  useEffect(() => {
    if (open) {
      firstFocusRef.current?.focus();
    }
  }, [open]);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".txt")) {
        setError(
          /* NEEDS-KEY: profileResume.errorInvalid */
          lang === "es"
            ? "Este archivo no contiene un perfil de votante reconocido. Asegúrate de haber descargado el archivo .txt correcto."
            : "This file doesn't contain a recognised voter profile. Make sure you downloaded the correct .txt file.",
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result;
        if (typeof text !== "string") {
          setError(
            lang === "es"
              ? "No se pudo leer el archivo."
              : "Could not read the file.",
          );
          return;
        }
        const profile = extractVoterProfile(text);
        if (!profile) {
          setError(
            /* NEEDS-KEY: profileResume.errorInvalid */
            lang === "es"
              ? "Este archivo no contiene un perfil de votante reconocido. Asegúrate de haber descargado el archivo .txt correcto."
              : "This file doesn't contain a recognised voter profile. Make sure you downloaded the correct .txt file.",
          );
          return;
        }
        setError(null);
        onResume(profile);
      };
      reader.readAsText(file);
    },
    [lang, onResume],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be re-selected after an error
    e.target.value = "";
  }

  if (!open) return null;

  return (
    /* Overlay — bg-ink/60, click-to-close */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prm-title"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] sm:p-6 sm:pt-[12vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink/60" />

      {/* Card — stopPropagation so backdrop click doesn't fire from inside */}
      <div
        className="relative z-10 w-full max-w-md rounded-lg border border-rule bg-paper shadow-[0_1px_0_var(--rule),0_30px_60px_-30px_oklch(0.18_0.018_240_/_0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 px-7 pt-8 pb-0">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">
              {/* NEEDS-KEY: profileResume.eyebrow */}
              {lang === "es"
                ? "Reanudar desde perfil guardado"
                : "Resume from saved profile"}
            </div>
            <h3
              id="prm-title"
              className="font-serif text-[1.35rem] font-semibold leading-tight text-ink"
            >
              {/* NEEDS-KEY: profileResume.title */}
              {lang === "es" ? "Sube tu perfil .txt." : "Drop your .txt profile."}
            </h3>
          </div>
          <button
            ref={firstFocusRef}
            type="button"
            aria-label={
              /* NEEDS-KEY: profileResume.close */
              lang === "es" ? "Cerrar" : "Close"
            }
            onClick={onClose}
            className="flex-none mt-0.5 flex h-9 w-9 items-center justify-center rounded-md font-mono text-xl text-ink-3 hover:bg-paper-2 hover:text-ink transition-colors"
          >
            ×
          </button>
        </header>

        {/* Lede */}
        <p className="px-7 pt-4 pb-0 text-[14px] leading-relaxed text-ink-2">
          {/* NEEDS-KEY: profileResume.lede */}
          {lang === "es"
            ? "Si guardaste tu perfil de una sesión anterior, suéltalo aquí. Tus prioridades y selecciones se restauran. Tu dirección sigue en este dispositivo únicamente."
            : "If you saved your profile from a previous session, drop the .txt here. Your priorities and draft picks restore. Your address is still kept on this device only."}
        </p>

        {/* Dropzone */}
        <div className="px-7 pt-5 pb-1">
          <div
            role="region"
            aria-label={
              /* NEEDS-KEY: profileResume.dropLabel */
              lang === "es"
                ? "Suelta tu perfil guardado aquí"
                : "Drop your saved profile here"
            }
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={[
              "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 transition-colors cursor-default",
              dragOver
                ? "border-civic bg-civic-soft"
                : "border-rule-2 bg-paper-2 hover:border-civic",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className="text-2xl text-ink-3 select-none"
            >
              ↓
            </span>
            <span className="text-[13.5px] text-ink-2 text-center">
              {/* NEEDS-KEY: profileResume.dropLabel */}
              {lang === "es"
                ? "Suelta tu perfil guardado aquí"
                : "Drop your saved profile here"}
            </span>
            <span className="text-[12px] text-ink-3">
              {/* NEEDS-KEY: profileResume.dropOr */}
              {lang === "es" ? "o" : "or"}
            </span>
            <label className="inline-flex cursor-pointer items-center rounded border border-rule bg-paper px-3 py-1.5 text-[13px] text-civic hover:bg-paper-2 transition-colors min-h-[36px]">
              {/* NEEDS-KEY: profileResume.chooseFile */}
              {lang === "es" ? "Elegir archivo…" : "Choose file…"}
              <input
                type="file"
                accept=".txt"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        {/* Inline error */}
        {error && (
          <p
            role="alert"
            className="mx-7 mt-3 rounded border border-[oklch(0.85_0.08_28)] bg-[oklch(0.96_0.02_28)] px-4 py-2.5 text-[13px] text-[oklch(0.40_0.14_28)]"
          >
            {error}
          </p>
        )}

        {/* Footer */}
        <footer className="px-7 pt-5 pb-7">
          <p className="text-[12px] leading-relaxed text-ink-3">
            {/* NEEDS-KEY: profileResume.footer */}
            {lang === "es"
              ? "Tu perfil vive únicamente en el dispositivo desde el que lo guardaste. No almacenamos perfiles en nuestros servidores."
              : "Your profile lives only on the device you saved it from. We don’t store profiles on our servers — they’d just be another tracking vector."}
          </p>
        </footer>
      </div>
    </div>
  );
}
