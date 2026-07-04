// @ts-nocheck
"use client";
/* Continue-elsewhere actions shared by the budget modal and the handoff
   modal: per-chatbot "Copy & open" buttons and a .txt download.

   Copy-first pattern: portable prompts routinely exceed URL limits and only
   some chatbots support a prefill query param — so every button copies the
   prompt to the clipboard, THEN opens the chatbot, and confirms "Copied —
   paste to continue." Uniform behavior beats four different deeplink
   behaviors. */

import React, { useState } from "react";
import { useI18n } from "../VoterChoiceApp";

const CHATBOTS = [
  { name: "Claude", url: "https://claude.ai/new" },
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Gemini", url: "https://gemini.google.com/app" },
  { name: "Grok", url: "https://grok.com/" },
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable (permissions / older browser) — textarea
    // fallback, same approach the shipped modals use.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function HandoffActions({ prompt, downloadFilename }) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(null);

  async function copyAndOpen(bot) {
    await copyText(prompt);
    setConfirmed(bot.name);
    setTimeout(() => setConfirmed(null), 2500);
    window.open(bot.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="be-extras be-extras--col" data-testid="handoff-actions">
      <div className="be-extras-bots">
        {CHATBOTS.map((bot) => (
          <button
            key={bot.name}
            className="be-ext-btn"
            onClick={() => copyAndOpen(bot)}
          >
            <span className="be-ext-ic" aria-hidden="true">
              ↗
            </span>
            {confirmed === bot.name
              ? t("handoffModal.copiedPasteToContinue")
              : t("handoffModal.copyAndOpen", { bot: bot.name })}
          </button>
        ))}
      </div>
      {downloadFilename && (
        <button
          className="be-ext-btn"
          onClick={() => downloadTextFile(prompt, downloadFilename)}
          data-testid="handoff-download"
        >
          <span className="be-ext-ic">↓</span>
          {t("handoffModal.downloadTxt")}
        </button>
      )}
    </div>
  );
}
