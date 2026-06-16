// @ts-nocheck
"use client";
/* Conversational issue loop — ONE component for both hosts:
     · IntakeView (cold open): first turn extracts starter themes, follow-up
       turns refine them in conversation until the voter locks the list.
     · EditIssuesModal (workspace): same loop seeded with the locked issues —
       discuss, confirm, then Apply & re-score.

   User feedback that drove this surface: "I really want to give it more
   feedback about what I value, especially to those topics it proposes." The
   old cold open was one-shot; this one converses.

   Turn contract:
     turn 1  → buildThemeExtractionPrompt (JSON-only, shipped golden prompt)
     turn 2+ → buildThemeRefinementPrompt (prose + full updated array in a
               fenced block; client-edited themes re-injected EVERY turn so
               manual rerank/rename/remove between turns is respected)

   All sends go through chatTransport — budget blocks preserve the
   conversation and bubble up to the host (which opens the budget modal). */

import React, { useRef, useState } from "react";
import { IssueRow } from "../VoterChoiceApp";
import { getChatSessionId } from "../realData";
import { buildThemeExtractionPrompt } from "../../lib/prompts/theme-extraction";
import {
  buildThemeRefinementPrompt,
  DISAMBIGUATION_CAP,
} from "../../lib/prompts/theme-refinement";
import { parseThemeExtraction } from "../../lib/prompts/parse-theme-extraction";
import { parseThemeRefinement } from "../../lib/prompts/parse-theme-refinement";
import { sendChatTurn } from "./chatTransport";
import { stripChatMd } from "./chatBlocks";

/* Map LLM themes → the issue shape the UI + scoring consume (port of the
   shipped themesToIssues; IssueRow renders interpretation + quotes,
   toApiIssues reads canonicalIssue/interpretation/stance). */
function themesToIssues(themes, sourceText) {
  return themes.map((t, i) => ({
    sourceType: "freeText",
    sourceText,
    rank: i + 1,
    interpretation: t.name,
    canonicalIssue: t.canonicalIssue,
    stance: t.stance,
    confidence: "clear",
    quotes: (t.quotes || []).map((text, qi) => ({
      label: qi === 0 ? "example" : "and",
      text,
    })),
  }));
}

/* Map issues back to the Theme[] shape the refinement prompt re-injects. */
function issuesToThemes(issues) {
  return issues.map((iss) => ({
    name: iss.interpretation,
    quotes: (iss.quotes || []).map((q) => q.text),
    ...(iss.canonicalIssue ? { canonicalIssue: iss.canonicalIssue } : {}),
    ...(iss.stance ? { stance: iss.stance } : {}),
  }));
}

export function useIssueConversation({ seedIssues, onBudgetBlock }) {
  const [issues, setIssues] = useState(seedIssues || []);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const apiHistoryRef = useRef([]);
  // How many clarifying/disambiguation questions the assistant has asked this
  // conversation. Re-injected into every refinement prompt so the model caps
  // at DISAMBIGUATION_CAP and locks the concept in instead of looping (the
  // "6+ annoying turns" bug). Counted client-side too, so the cap holds even
  // if the model drifts past the prompt instruction.
  const clarifyCountRef = useRef(0);
  const sourceTextRef = useRef(seedIssues?.length ? "(prior session)" : "");
  // Latest issues for the refinement prompt — sends read the ref, not the
  // closure, so manual edits between turns always reach the model.
  const issuesRef = useRef(issues);
  issuesRef.current = issues;

  function applyIssueList(next) {
    next.forEach((it, i) => {
      it.rank = i + 1;
    });
    setIssues(next);
  }

  function runTurn(text) {
    const isExtraction = issuesRef.current.length === 0;
    setBusy(true);
    setError(null);

    const systemPrompt = isExtraction
      ? buildThemeExtractionPrompt({ userInput: text })
      : buildThemeRefinementPrompt({
          currentThemesJson: JSON.stringify(issuesToThemes(issuesRef.current)),
          clarifyingQuestionsAsked: clarifyCountRef.current,
        });
    const messages = isExtraction
      ? [{ role: "user", content: text }]
      : [...apiHistoryRef.current, { role: "user", content: text }];

    let acc = "";
    sendChatTurn(
      {
        messages,
        systemPrompt,
        sessionId: getChatSessionId(),
        messageCount: messages.length,
      },
      {
        onText: (chunk) => {
          acc += chunk;
        },
        onDone: () => {
          setBusy(false);
          if (isExtraction) {
            let themes = [];
            try {
              themes = parseThemeExtraction(acc);
            } catch {
              themes = [];
            }
            if (themes.length === 0) {
              // No canonical match — fall back to the raw text as a custom
              // issue. The IssueRow faded label ("no voting record data")
              // communicates the gap; no blocking, no tracking mention.
              const label =
                text.length > 60 ? text.slice(0, 60).trim() + "…" : text;
              themes = [{ name: label, quotes: [text] }];
            }
            sourceTextRef.current = text;
            apiHistoryRef.current = [
              ...messages,
              { role: "assistant", content: acc },
            ];
            applyIssueList(themesToIssues(themes, text));
            setLog((prev) => [
              ...prev,
              {
                who: "ai",
                text: `Here are ${themes.length} starter issue${themes.length !== 1 ? "s" : ""} to work from — re-rank, rename, remove, or keep telling me what you value and I'll adjust them.`,
              },
            ]);
          } else {
            const { prose, themes } = parseThemeRefinement(acc);
            apiHistoryRef.current = [
              ...messages,
              { role: "assistant", content: acc },
            ];
            // Count a clarifying/disambiguation question: a prose reply that
            // ends in a question mark and didn't lock anything new in (no theme
            // array change). The re-injected count caps the loop at
            // DISAMBIGUATION_CAP on the next turn. Once at the cap we stop
            // counting — the prompt is already in lock-in mode.
            const askedAQuestion =
              !themes && /\?\s*$/.test((prose || "").trim());
            if (askedAQuestion && clarifyCountRef.current < DISAMBIGUATION_CAP) {
              clarifyCountRef.current += 1;
            }
            if (themes) {
              applyIssueList(
                themesToIssues(themes, sourceTextRef.current || text),
              );
            }
            setLog((prev) => [
              ...prev,
              {
                who: "ai",
                text:
                  stripChatMd(prose) ||
                  (themes ? "Updated your list below." : "Noted."),
              },
            ]);
          }
        },
        onBudgetBlock: () => {
          // Preserve the conversation; the host opens the budget modal and
          // may hand back a retry that replays this very turn.
          setBusy(false);
          setLog((prev) => prev.slice(0, -1));
          setDraft(text);
          onBudgetBlock?.(() => send(text));
        },
        onError: (reason) => {
          setBusy(false);
          setLog((prev) => prev.slice(0, -1));
          setDraft(text);
          const sentence =
            typeof reason === "string" && reason.includes(" ") ? reason : null;
          setError(
            sentence ||
              "I couldn't read your message just now — please try again.",
          );
        },
      },
    );
  }

  function send(text) {
    const t = (text ?? "").trim();
    if (!t || busy) return;
    setDraft("");
    setLog((prev) => [...prev, { who: "user", text: t }]);
    runTurn(t);
  }

  return {
    issues,
    setIssues: applyIssueList,
    log,
    busy,
    error,
    draft,
    setDraft,
    send,
  };
}

export function IssueConversation({
  convo,
  /** "Lock these in & start →" (intake) / "Apply & re-score →" (edit). */
  primaryLabel,
  onPrimary,
  /** Composer placeholder for the first message. */
  placeholder,
}) {
  const { issues, setIssues, log, busy, error, draft, setDraft, send } = convo;

  function moveIssue(idx, dir) {
    const next = [...issues];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setIssues(next);
  }

  function reorderIssue(from, to) {
    if (from === to) return;
    const next = [...issues];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setIssues(next);
  }

  const chips =
    issues.length > 0
      ? [
          "That's not quite right — let me explain",
          "Tell me why you picked these",
          "Add something I missed",
        ]
      : [];

  return (
    <div className="issue-convo" data-testid="issue-conversation">
      {log.map((msg, i) => (
        <div key={"ic-" + i} className={"msg " + msg.who}>
          <div className="who">
            {msg.who === "user" ? "You" : "Voter Choice · AI"}
          </div>
          <div className="bubble">{msg.text}</div>
        </div>
      ))}

      {busy && (
        <div className="msg ai">
          <div className="who">Voter Choice · AI</div>
          <div className="bubble">
            <p style={{ color: "var(--ink-2)", fontStyle: "italic" }}>
              {issues.length === 0
                ? "Reading what you wrote — pulling out the issues I hear…"
                : "Thinking about that — adjusting your list…"}
            </p>
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="themes-card" data-testid="issue-themes-card">
          <div className="th-head">
            <h4>Your issues — make them yours.</h4>
            <span className="of">{issues.length} issues · edit freely</span>
          </div>
          <p className="th-sub">
            Use the arrows to re-rank · click a name to rename · Remove to delete an issue · or keep talking
            to me below and I'll adjust them.
          </p>

          {issues.map((iss, i) => (
            <IssueRow
              key={`${i}-${iss.canonicalIssue || iss.interpretation || iss.sourceText}`}
              issue={iss}
              index={i}
              total={issues.length}
              onMoveUp={() => moveIssue(i, -1)}
              onMoveDown={() => moveIssue(i, 1)}
              onReorderTo={reorderIssue}
              onRename={(name) => {
                const next = [...issues];
                next[i] = { ...next[i], interpretation: name };
                setIssues(next);
              }}
              onRemove={() => setIssues(issues.filter((_, j) => j !== i))}
            />
          ))}

          <div className="th-foot">
            <button
              className="lock"
              onClick={() => onPrimary(issues)}
              disabled={issues.length === 0 || busy}
              data-testid="issue-primary"
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      )}

      <div className="co-input" style={{ marginTop: 14 }}>
        {chips.length > 0 && (
          <div className="chips" style={{ marginBottom: 8 }}>
            {chips.map((c) => (
              <button
                key={c}
                className="chip"
                disabled={busy}
                onClick={() => send(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <textarea
          placeholder={
            issues.length === 0
              ? placeholder
              : "Tell me more about what you value, ask why I picked these, or add what I missed…"
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          data-testid="issue-convo-input"
        />
        <div className="row">
          <span className="hint">
            Your issue list stays in your browser until you lock it in
          </span>
          <button
            className="send"
            onClick={() => send(draft)}
            disabled={!draft.trim() || busy}
            data-testid="issue-convo-send"
          >
            Send →
          </button>
        </div>
        {error && (
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "var(--danger, #b3261e)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
