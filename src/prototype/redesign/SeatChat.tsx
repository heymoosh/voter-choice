// @ts-nocheck
"use client";
/* Per-seat support chat for the delegation workspace — the "Ask anything
   about this seat" surface under the RepCard (alignment-first pivot: cards
   primary, chat secondary). Reuses the shipped chat visual language
   (.msg/.bubble log + .ws-input composer, classes ship globally in
   prototype.css) and the shipped AITimeoutBanner for error turns.

   Stateless view: the message log, error state, and budget tier live in App2
   (in browser memory only — chat is never persisted, matching the privacy
   page's contract). */

import React, { useEffect, useRef, useState } from "react";
import { AITimeoutBanner } from "../VoterChoiceApp";
import { stripChatMd } from "./chatBlocks";

/** Soft budget tiers that warrant a ribbon (hard blocks open the modal). */
const RIBBON_TIERS = {
  notice: "Community AI budget is 70%+ used this month.",
  soft_close: "Budget running low — your scorecard is safe either way.",
  handoff: "Budget nearly spent — your scorecard is safe either way.",
};

function chipPrompts(seat, userIssues, isRevealed) {
  const chips = [];
  const top = userIssues?.[0]?.interpretation;
  const second = userIssues?.[1]?.interpretation;
  if (top) chips.push(`What's their record on ${top.toLowerCase()}?`);
  chips.push("Who funds them?");
  if (second) chips.push(`What have they done about ${second.toLowerCase()}?`);
  else chips.push("What should I know about their record?");
  return chips;
}

export function SeatChat({
  seat,
  isRevealed,
  userIssues,
  messages,
  /** string (block-specific banner body) | true (generic retry banner) | falsy */
  errorState,
  budgetTier,
  onSend,
  onRetry,
  onHandoff,
  onShowBudgetOptions,
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);
  const log = messages || [];

  // Keep the latest turn in view as replies stream in (scoped scroll — never
  // jumps the page on mount).
  const lastLen = log.length > 0 ? log[log.length - 1].text?.length || 0 : 0;
  useEffect(() => {
    if (log.length > 0)
      endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [log.length, lastLen]);

  function send(text) {
    const t = (text ?? draft).trim();
    if (!t) return;
    setDraft("");
    onSend(t);
  }

  const subjectLabel = isRevealed
    ? seat.candidate?.name || seat.blindLabel
    : seat.blindLabel;
  const ribbon = budgetTier && RIBBON_TIERS[budgetTier];

  return (
    <div className="seat-chat" data-testid="seat-chat">
      <div className="cv2-block-head" style={{ marginTop: 24 }}>
        <div className="lab">Ask anything</div>
      </div>

      {log.map((msg, i) => (
        <div key={msg._id || "cm-" + i} className={"msg " + msg.who}>
          <div className="who">
            {msg.who === "user" ? "You" : "Voter Choice · AI"}
          </div>
          <div className="bubble">
            {msg.who === "user" ? msg.text : stripChatMd(msg.text) || "…"}
          </div>
        </div>
      ))}

      {errorState && (
        <AITimeoutBanner
          onRetry={onRetry}
          onHandoff={onHandoff}
          message={typeof errorState === "string" ? errorState : undefined}
        />
      )}
      <div ref={endRef} />

      <div className="ws-input">
        <div className="chips">
          {chipPrompts(seat, userIssues, isRevealed).map((c) => (
            <button key={c} className="chip" onClick={() => send(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="input-row">
          <input
            type="text"
            data-testid="seat-chat-input"
            placeholder={`Ask anything about ${subjectLabel}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            className="send"
            data-testid="seat-chat-send"
            onClick={() => send()}
            disabled={!draft.trim()}
          >
            Send
          </button>
        </div>
        <div className="meta">
          <span>
            Chat stays in this browser tab · don't type your name or address
          </span>
          {ribbon && (
            <span data-testid="budget-ribbon">
              {ribbon}{" "}
              <button className="linklike" onClick={onShowBudgetOptions}>
                See options →
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
