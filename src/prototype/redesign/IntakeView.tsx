// @ts-nocheck
"use client";
/* Conversational issue intake at the cold-open stage — replaces the one-shot
   ColdOpenView in the redesign (the legacy app keeps its own). The shell,
   context line, and opening copy match the shipped cold open; the loop inside
   is the shared IssueConversation (extract → converse → lock). */

import React from "react";
import { AppNav } from "../VoterChoiceApp";
import { IssueConversation, useIssueConversation } from "./IssueConversation";

export function IntakeView({
  address,
  savedIssues,
  contextNote,
  onLock,
  onBudgetBlock,
}) {
  const convo = useIssueConversation({
    seedIssues: savedIssues && savedIssues.length ? savedIssues : null,
    onBudgetBlock,
  });

  return (
    <>
      <AppNav />
      <div className="coldopen">
        <div className="co-context">
          <b>{address}</b> · {contextNote || "your representatives"}
        </div>

        <div className="msg ai">
          <div className="who">Voter Choice · AI</div>
          <div className="bubble">
            <p>
              I've pulled your representatives' names. Before I walk you through
              their performance, I want to know what you're judging them on.
            </p>
            <p style={{ marginTop: "10px" }}>
              <b>What's been on your mind this year?</b> Things you wish
              Congress would actually do something about. Frustrations, hopes,
              fights you've watched in your community. Type as much or as little
              as you want — and once I propose a list, keep talking to me until
              it matches what you value.
            </p>
          </div>
        </div>

        <IssueConversation
          convo={convo}
          primaryLabel="Lock these in & meet your delegation →"
          onPrimary={onLock}
          placeholder="Things that have been on your mind. Frustrations, hopes, fights you've watched in your community…"
        />
      </div>
    </>
  );
}
