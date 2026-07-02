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
import { AITimeoutBanner, useI18n } from "../VoterChoiceApp";
import { stripChatMd } from "./chatBlocks";

/** Soft budget tiers that warrant a ribbon (hard blocks open the modal). */
const RIBBON_TIER_KEYS = {
  notice: "seatChat.budgetNotice",
  soft_close: "seatChat.budgetSoftClose",
  handoff: "seatChat.budgetHandoff",
};

function chipPrompts(seat, userIssues, isRevealed, t) {
  const chips = [];
  const top = userIssues?.[0]?.interpretation;
  const second = userIssues?.[1]?.interpretation;
  if (top) chips.push(t("seatChat.chipRecordOn", { issue: top.toLowerCase() }));
  chips.push(t("seatChat.chipWhoFunds"));
  if (second)
    chips.push(t("seatChat.chipDoneAbout", { issue: second.toLowerCase() }));
  else chips.push(t("seatChat.chipRecordGeneric"));
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
  const { t } = useI18n();
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
    const trimmed = (text ?? draft).trim();
    if (!trimmed) return;
    setDraft("");
    onSend(trimmed);
  }

  const subjectLabel = isRevealed
    ? seat.candidate?.name || seat.blindLabel
    : seat.blindLabel;
  const ribbonKey = budgetTier && RIBBON_TIER_KEYS[budgetTier];
  const ribbon = ribbonKey && t(ribbonKey);

  return (
    <div className="seat-chat" data-testid="seat-chat">
      <div className="cv2-block-head" style={{ marginTop: 24 }}>
        <div className="lab">{t("seatChat.askAnything")}</div>
      </div>

      {log.map((msg, i) => (
        <div key={msg._id || "cm-" + i} className={"msg " + msg.who}>
          <div className="who">
            {msg.who === "user" ? t("intake.userWho") : t("intake.aiWho")}
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
          {chipPrompts(seat, userIssues, isRevealed, t).map((c) => (
            <button key={c} className="chip" onClick={() => send(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="input-row">
          <input
            type="text"
            data-testid="seat-chat-input"
            placeholder={t("seatChat.inputPlaceholder", {
              subject: subjectLabel,
            })}
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
            {t("seatChat.sendBtn")}
          </button>
        </div>
        <div className="meta">
          <span>{t("seatChat.chatHint")}</span>
          {ribbon && (
            <span data-testid="budget-ribbon">
              {ribbon}{" "}
              <button className="linklike" onClick={onShowBudgetOptions}>
                {t("seatChat.seeOptions")}
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
