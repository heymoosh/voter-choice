"use client";

import React from "react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import {
  parseAlignmentScores,
  stripAlignmentBlock,
  slugify,
} from "@/lib/alignmentParser";
import AlignmentBanner from "./AlignmentBanner";

interface ChatMessageProps {
  message: ChatMessageType;
  locale?: string;
  alignmentLabels?: {
    strongLabel?: string;
    mixedLabel?: string;
    weakLabel?: string;
    expandButton?: string;
    collapseButton?: string;
    parseError?: string;
    overallLabel?: string;
  };
}

export default function ChatMessage({
  message,
  alignmentLabels,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const alignmentScores = isUser ? null : parseAlignmentScores(message.content);
  const displayContent = isUser
    ? message.content
    : stripAlignmentBlock(message.content);

  return (
    <div
      data-testid={isUser ? "chat-message-user" : "chat-message-assistant"}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        }`}
      >
        <pre className="whitespace-pre-wrap font-sans">{displayContent}</pre>

        {/* Alignment banners for assistant messages */}
        {alignmentScores && alignmentScores.scores.length > 0 && (
          <div className="mt-3 space-y-2">
            {alignmentScores.scores.map((score) => (
              <AlignmentBanner
                key={slugify(score.candidate)}
                score={score}
                labels={alignmentLabels}
              />
            ))}
          </div>
        )}

        {/* Parse error for malformed alignment blocks */}
        {!isUser &&
          message.content.includes("[ALIGNMENT_SCORES]") &&
          !alignmentScores && (
            <p className="mt-2 text-xs text-amber-600">
              {alignmentLabels?.parseError ??
                "Alignment scores couldn't be generated for this response — try asking the AI to score the candidates again."}
            </p>
          )}
      </div>
    </div>
  );
}
