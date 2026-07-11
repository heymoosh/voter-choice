// @ts-nocheck
"use client";
/* Keystone "PolisStand" — the blind agree/disagree/pass contribution step
   (card fb77d0bb, GAPS-RECONCILED-FOR-CODE.md §9).

   Ports design-handoff/keystone-canvas/src/screens-polis.jsx's PolisStand
   artboard (polis.css `.ps-*` vocabulary) verbatim: copy, layout, and class
   names are a literal port, not a re-expression — unlike PolisClose.tsx,
   this screen carries no party data at all (it's just agree/disagree/pass
   reactions), so there's no party-free conflict forcing a rewrite the way
   PolisClose's D/R/I convergence bars did.

   Sits between the invite (PolisEntry, a sibling lane) and the aggregate
   report (PolisClose/"standing" stage): a post-decision, optional moment.
   Answering is BLIND — no running tally is ever shown here, on purpose (see
   the lede below) — that's what makes it a genuine pol.is-style read rather
   than a bandwagon poll.

   Each click fires a best-effort POST to /api/polis/respond carrying the
   FULL accumulated answer set for this visit (not just the new answer) —
   collectPolisVector's upsert REPLACES the stored `responses` column
   wholesale on every write, so a partial payload would silently erase
   earlier answers in the same session. Never blocks the UI: write failures
   degrade to the same honest "noted, not aggregated" copy as a disabled
   flag (see recordedCopy) rather than surfacing an error. */

import React, { useState } from "react";
import { POLIS_STATEMENTS } from "../../lib/polis/statements";

export type PolisAnswer = "agree" | "disagree" | "pass";
export type PolisAnswers = Record<string, PolisAnswer>;
type WriteOutcome = "stored" | "skipped" | "error";

// ---------------------------------------------------------------------------
// Pure helpers (tested directly in PolisStand.test.ts)
// ---------------------------------------------------------------------------

export function countAnswered(answers: PolisAnswers): number {
  return Object.keys(answers).length;
}

export function progressLabel(answers: PolisAnswers, total: number): string {
  return `${countAnswered(answers)} of ${total} answered · anonymous · no running score`;
}

/** The full request body for POST /api/polis/respond. Always carries the
 *  WHOLE answer set (see file header — the write path replaces, not merges). */
export function buildRespondPayload(
  sessionToken: string,
  stateCode: string | null,
  answers: PolisAnswers,
) {
  return { sessionToken, stateCode, responses: { ...answers } };
}

/** Confirmation copy under a just-answered statement. Honest about whether
 *  the answer actually reached the aggregate: `outcome !== "stored"` covers
 *  both POLIS_VECTOR_COLLECTION_ENABLED being off and a network/write
 *  failure — from the voter's side both mean "this didn't leave my device,"
 *  so neither claims a false "it's in the aggregate now." */
export function recordedCopy(answer: PolisAnswer, outcome: WriteOutcome): string {
  if (outcome !== "stored") {
    return "Noted — thanks. Contribution collection isn't live yet, so this stays with you, not the aggregate.";
  }
  if (answer === "agree") {
    return "Thanks — that's in. No score, no reveal yet; you'll see the full picture at the end.";
  }
  if (answer === "disagree") {
    return "Disagreeing is just as useful — it's in, and we never single you out for it.";
  }
  return "That's fine too — passing doesn't count against you, and only real answers move the numbers.";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function StatementCard({
  statement,
  answer,
  outcome,
  onAnswer,
}: {
  statement: string;
  answer: PolisAnswer | undefined;
  outcome: WriteOutcome | null;
  onAnswer: (a: PolisAnswer | null) => void;
}) {
  const voted = answer != null;
  return (
    <div className={"ps-stmt" + (voted ? " voted" : "")}>
      <p className="q">{statement}</p>
      <div className="ps-react">
        {answer === "agree" ? (
          <button className="ps-btn agree chosen" type="button" disabled>
            ✓ You agreed
          </button>
        ) : (
          <button
            className="ps-btn agree"
            type="button"
            onClick={() => onAnswer("agree")}
          >
            Agree
          </button>
        )}
        {answer === "disagree" ? (
          <button className="ps-btn disagree chosen-no" type="button" disabled>
            ✕ You disagreed
          </button>
        ) : (
          <button
            className="ps-btn disagree"
            type="button"
            onClick={() => onAnswer("disagree")}
          >
            Disagree
          </button>
        )}
        {answer === "pass" ? (
          <button className="ps-btn pass chosen-pass" type="button" disabled>
            → You passed
          </button>
        ) : voted ? (
          <button
            className="ps-btn pass"
            type="button"
            onClick={() => onAnswer(null)}
          >
            Change
          </button>
        ) : (
          <button
            className="ps-btn pass"
            type="button"
            onClick={() => onAnswer("pass")}
          >
            Pass
          </button>
        )}
      </div>
      {voted && (
        <div className="ps-recorded">
          <span className="rk">✓ Recorded</span>{" "}
          {recordedCopy(answer, outcome ?? "stored")}
        </div>
      )}
    </div>
  );
}

export function PolisStand({
  stateCode,
  onDone,
  onSkip,
}: {
  stateCode: string | null;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [answers, setAnswers] = useState<PolisAnswers>({});
  const [outcome, setOutcome] = useState<WriteOutcome | null>(null);

  function handleAnswer(statement: string, next: PolisAnswer | null) {
    const nextAnswers: PolisAnswers = { ...answers };
    if (next === null) {
      delete nextAnswers[statement];
      setAnswers(nextAnswers);
      return; // "Change" only resets locally — nothing to write yet.
    }
    nextAnswers[statement] = next;
    setAnswers(nextAnswers);

    // Best-effort, fire-and-forget — never blocks the voter, never shows an
    // error. Sends the FULL accumulated set (see file header).
    void fetch("/api/polis/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildRespondPayload(sessionToken, stateCode, nextAnswers),
      ),
    })
      .then((res) => res.json())
      .then((json) => setOutcome(json.outcome === "stored" ? "stored" : "skipped"))
      .catch(() => setOutcome("error"));
  }

  const total = POLIS_STATEMENTS.length;

  return (
    <div className="polisstand2">
      <div className="ps-wrap">
        <span className="ps-k kick">
          <span className="star">★</span> Your scorecard&rsquo;s ready · this
          part&rsquo;s optional
        </span>
        <h1 className="ps-h1">
          You judged them on the record — <em>not the party.</em>
        </h1>
        <p className="ps-lede">
          Your scorecard is done and ready to print — this won&rsquo;t touch
          it. React to a few statements if you like. You answer blind — no
          running score — and at the end you&rsquo;ll see the full picture:
          where the groups line up, and where they don&rsquo;t.
        </p>

        <div className="ps-cards">
          {POLIS_STATEMENTS.map((statement) => (
            <StatementCard
              key={statement}
              statement={statement}
              answer={answers[statement]}
              outcome={outcome}
              onAnswer={(next) => handleAnswer(statement, next)}
            />
          ))}
        </div>
      </div>
      <div className="ps-foot">
        <div className="ps-foot-inner">
          <button className="btn-primary" type="button" onClick={onDone}>
            Done — show me the results →
          </button>
          <span className="prog">{progressLabel(answers, total)}</span>
          <button className="later" type="button" onClick={onSkip}>
            No thanks — back to my scorecard
          </button>
        </div>
      </div>
    </div>
  );
}
