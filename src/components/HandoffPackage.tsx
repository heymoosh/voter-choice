"use client";

import { useState, useRef } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import {
  openPrintableBallot,
  downloadProfileAsText,
} from "../lib/ballot-utils";

interface ParsedHandoff {
  ballot: string | null;
  voterProfile: string | null;
  handoffBlock: string | null;
  preamble: string;
}

const AI_LINKS = [
  { name: "Claude", url: "https://claude.ai" },
  { name: "ChatGPT", url: "https://chatgpt.com" },
  { name: "Gemini", url: "https://gemini.google.com" },
  { name: "Grok", url: "https://grok.com" },
];

export function parseHandoffMarkers(content: string): ParsedHandoff | null {
  const hasHandoff = content.includes("=== VOTER SESSION HANDOFF");
  const hasBallot = content.includes("MY BALLOT");
  const hasProfile = content.includes("MY VOTER PROFILE");

  if (!hasHandoff && !hasBallot && !hasProfile) return null;

  let ballot: string | null = null;
  let voterProfile: string | null = null;
  let handoffBlock: string | null = null;
  let preamble = content;

  // Extract ballot: MY BALLOT — ... until next section or end
  const ballotMatch = content.match(
    /^(MY BALLOT\s*[-—][\s\S]+?)(?=\n===|\n### |$)/m,
  );
  if (ballotMatch) {
    ballot = ballotMatch[1].trim();
    preamble = preamble.replace(ballotMatch[0], "");
  }

  // Extract voter profile: === MY VOTER PROFILE ... === END VOTER PROFILE ===
  const profileMatch = content.match(
    /=== MY VOTER PROFILE[\s\S]*?=== END VOTER PROFILE ===/,
  );
  if (profileMatch) {
    voterProfile = profileMatch[0].trim();
    preamble = preamble.replace(profileMatch[0], "");
  }

  // Extract handoff block: === VOTER SESSION HANDOFF ... === END HANDOFF ===
  const handoffMatch = content.match(
    /=== VOTER SESSION HANDOFF[\s\S]*?=== END HANDOFF ===/,
  );
  if (handoffMatch) {
    handoffBlock = handoffMatch[0].trim();
    preamble = preamble.replace(handoffMatch[0], "");
  }

  preamble = preamble.replace(/\n{3,}/g, "\n\n").trim();

  return { ballot, voterProfile, handoffBlock, preamble };
}

export function buildContinuationPrompt(
  basePrompt: string,
  voterProfile: string | null,
  handoffBlock: string | null,
): string {
  let prompt = basePrompt;
  if (voterProfile) {
    prompt +=
      "\n\n---\n\nHere is my voter profile from this session:\n\n" +
      voterProfile;
  }
  if (handoffBlock) {
    prompt += "\n\n---\n\nHere is my session handoff:\n\n" + handoffBlock;
  }
  prompt += "\n\nPlease continue where we left off.";
  return prompt;
}

interface HandoffPackageProps {
  parsed: ParsedHandoff;
  continuationPrompt: string;
}

function ErrorIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 11.5L11.5 4.5M11.5 4.5H6M11.5 4.5V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  );
}

function DescriptionIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

/* ── Usage Alert Panel ─────────────────────────────────────── */

function UsageAlertPanel() {
  const { lang } = useLanguage();
  const t = translations[lang];

  // Estimate days until month reset
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilReset = Math.max(
    1,
    Math.ceil((endOfMonth.getTime() - now.getTime()) / msPerDay),
  );

  return (
    <div className="bg-accent/10 p-4 md:p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 text-accent mb-2">
          <ErrorIcon />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            {t.handoff.usageAlert}
          </span>
        </div>
        <h4 className="text-xl md:text-2xl font-black text-on-surface leading-none mb-2">
          {t.handoff.budgetReached}
        </h4>
        <p className="text-sm text-on-surface/80 leading-snug">
          {t.handoff.budgetExplanation}
        </p>
      </div>
      <div className="mt-4">
        <div className="h-1 w-full bg-on-surface/10 overflow-hidden">
          <div className="h-full bg-accent w-full" />
        </div>
        <p className="text-[10px] font-bold mt-2 text-accent uppercase">
          {t.handoff.resetIn(daysUntilReset)}
        </p>
      </div>
    </div>
  );
}

/* ── Continue Session Panel ────────────────────────────────── */

function ContinueSessionPanel({
  parsed,
  continuationPrompt,
  copied,
  onCopy,
}: {
  parsed: ParsedHandoff;
  continuationPrompt: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];

  // Build a compact summary of the handoff data
  const handoffSummary = parsed.handoffBlock
    ? parsed.handoffBlock
        .replace(/=== VOTER SESSION HANDOFF ===/, "")
        .replace(/=== END HANDOFF ===/, "")
        .trim()
    : continuationPrompt.slice(0, 300);

  return (
    <div className="bg-surface-low p-4 md:p-6 flex flex-col justify-center gap-4 h-full">
      <div>
        <h5 className="text-xs font-black uppercase tracking-widest text-primary mb-1">
          {t.handoff.continueSession}
        </h5>
        <p className="text-sm text-on-surface-muted mb-4">
          {t.handoff.continueBody}
        </p>
      </div>
      <div className="space-y-4">
        {/* Session handoff data preview */}
        <div className="bg-surface-lowest p-3 border border-outline-variant/30">
          <pre className="text-[10px] text-on-surface-muted leading-relaxed font-mono whitespace-pre-wrap max-h-28 overflow-y-auto">
            {handoffSummary}
          </pre>
        </div>

        {/* Copy handoff button */}
        <button
          data-testid="copy-handoff-btn"
          onClick={onCopy}
          className="w-full flex items-center justify-center gap-3 bg-primary text-on-primary py-3 px-6 font-bold uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-[0.98] text-xs"
        >
          <CopyIcon />
          <span>{copied ? t.handoff.copied : t.handoff.copyHandoff}</span>
        </button>

        {/* Download buttons */}
        <div className="grid grid-cols-2 gap-2">
          {parsed.ballot && (
            <button
              data-testid="download-ballot-btn"
              onClick={() => openPrintableBallot(parsed.ballot!)}
              className="flex items-center justify-center gap-2 border border-primary text-primary py-2 px-2 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/5 transition-colors"
            >
              <DownloadIcon />
              <span>{t.handoff.partialBallot}</span>
            </button>
          )}
          {parsed.voterProfile && (
            <button
              data-testid="download-profile-btn"
              onClick={() => downloadProfileAsText(parsed.voterProfile!)}
              className="flex items-center justify-center gap-2 border border-primary text-primary py-2 px-2 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/5 transition-colors"
            >
              <DescriptionIcon />
              <span>{t.handoff.voterProfile}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── AI Links Panel ────────────────────────────────────────── */

function AiLinksPanel() {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <div className="bg-surface-high p-6 flex flex-col justify-center gap-3 h-full">
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted text-center">
        {t.handoff.continueAnalysisOn}
      </p>
      <div className="flex flex-col gap-2">
        {AI_LINKS.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-2 bg-surface-lowest hover:bg-surface-low transition-colors border-b-2 border-outline-variant/30 group"
          >
            <span className="text-sm font-bold text-on-surface">
              {link.name}
            </span>
            <span className="group-hover:translate-x-1 transition-transform text-on-surface-muted">
              <ArrowIcon />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Main HandoffPackage ───────────────────────────────────── */

export function HandoffPackage({
  parsed,
  continuationPrompt,
}: HandoffPackageProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopy() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      await navigator.clipboard.writeText(continuationPrompt);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in a temporary textarea
      const textarea = document.createElement("textarea");
      textarea.value = continuationPrompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div data-testid="chat-handoff-package">
      {/* Preamble text from the AI */}
      {parsed.preamble && (
        <div className="text-sm whitespace-pre-wrap mb-4 text-on-surface-muted">
          {parsed.preamble}
        </div>
      )}

      {/* Bento grid handoff card */}
      <div className="bg-surface-lowest border-t-4 border-primary shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-outline-variant/10">
          {/* Usage Alert (left) */}
          <div className="lg:col-span-4">
            <UsageAlertPanel />
          </div>

          {/* Continue Session (center) */}
          <div className="lg:col-span-5">
            <ContinueSessionPanel
              parsed={parsed}
              continuationPrompt={continuationPrompt}
              copied={copied}
              onCopy={handleCopy}
            />
          </div>

          {/* AI Links (right) */}
          <div className="lg:col-span-3">
            <AiLinksPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Build a client-side fallback handoff from conversation history */
export function buildClientFallbackHandoff(
  messages: { role: string; content: string }[],
  zipCode: string,
): ParsedHandoff {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const assistantMessages = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content);

  // Try to extract any ballot or profile content the AI already provided
  let ballot: string | null = null;
  let voterProfile: string | null = null;

  for (const msg of assistantMessages) {
    if (!ballot) {
      const ballotMatch = msg.match(
        /^(MY BALLOT\s*[-—][\s\S]+?)(?=\n===|\n### |$)/m,
      );
      if (ballotMatch) ballot = ballotMatch[1].trim();
    }
    if (!voterProfile) {
      const profileMatch = msg.match(
        /=== MY VOTER PROFILE[\s\S]*?=== END VOTER PROFILE ===/,
      );
      if (profileMatch) voterProfile = profileMatch[0].trim();
    }
  }

  // Build a basic handoff block from conversation content
  const handoffBlock = [
    "=== VOTER SESSION HANDOFF ===",
    `LOCATION: ${zipCode}`,
    "",
    "CONVERSATION SUMMARY:",
    ...userMessages.slice(1).map((m) => `- User: ${m.slice(0, 200)}`),
    "",
    "=== END HANDOFF ===",
  ].join("\n");

  return {
    ballot,
    voterProfile,
    handoffBlock,
    preamble: "",
  };
}
