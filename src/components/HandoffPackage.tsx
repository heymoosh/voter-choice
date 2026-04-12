"use client";

import { useState, useRef } from "react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Notice } from "./ui/Notice";
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

export function HandoffPackage({
  parsed,
  continuationPrompt,
}: HandoffPackageProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { lang } = useLanguage();
  const t = translations[lang];

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
    <div data-testid="chat-handoff-package" className="space-y-4">
      {/* Header */}
      <Notice variant="info">
        <p className="font-semibold text-base mb-1">{t.handoff.header}</p>
      </Notice>

      {/* Preamble text from the AI */}
      {parsed.preamble && (
        <div className="text-sm whitespace-pre-wrap">{parsed.preamble}</div>
      )}

      {/* Ballot So Far */}
      {parsed.ballot && (
        <Card>
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary mb-2">
            {t.handoff.ballotSoFar}
          </h4>
          <pre
            data-testid="ballot-preview"
            className="text-sm whitespace-pre-wrap font-mono bg-surface-high rounded-sm p-3"
          >
            {parsed.ballot}
          </pre>
          <div className="mt-2">
            <Button
              data-testid="download-ballot-btn"
              variant="cta"
              size="sm"
              onClick={() => openPrintableBallot(parsed.ballot!)}
            >
              {t.ballot.downloadBallot}
            </Button>
          </div>
        </Card>
      )}

      {/* Voter Profile */}
      {parsed.voterProfile && (
        <Card>
          <h4 className="font-semibold text-sm uppercase tracking-wide text-primary mb-2">
            {t.handoff.voterProfile}
          </h4>
          <pre className="text-sm whitespace-pre-wrap font-mono bg-surface-high rounded-sm p-3 max-h-48 overflow-y-auto">
            {parsed.voterProfile}
          </pre>
          <div className="mt-2">
            <Button
              data-testid="download-profile-btn"
              variant="ghost"
              size="sm"
              onClick={() => downloadProfileAsText(parsed.voterProfile!)}
            >
              {t.handoff.downloadProfile}
            </Button>
          </div>
        </Card>
      )}

      {/* Continuation Prompt */}
      <Card data-testid="chat-continuation-prompt">
        <h4 className="font-semibold text-sm uppercase tracking-wide text-primary mb-3">
          {t.handoff.continueHeader}
        </h4>
        <Button
          variant="cta"
          size="lg"
          onClick={handleCopy}
          className="w-full mb-3"
        >
          {copied ? t.handoff.copied : t.handoff.copyContinuation}
        </Button>

        <p className="text-sm text-on-surface-muted mb-2">
          {t.handoff.continueOn}
        </p>
        <div className="space-y-1">
          {AI_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-surface-high rounded-sm hover:bg-surface-low transition-colors text-sm font-medium text-on-surface"
            >
              {link.name}
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
            </a>
          ))}
        </div>
      </Card>
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
