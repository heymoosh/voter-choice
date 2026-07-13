// @ts-nocheck
"use client";
/* BYOK (bring-your-own-key) card — port of the shipped BudgetExhaustedByok
   (VoterChoiceApp.tsx) against the typed key store in
   src/lib/anthropic-client-byok.ts (no window.* globals). Shared by the
   budget modal and the handoff modal.

   Key contract (lib): localStorage only, read at call time, never sent to the
   Voter Choice server on any code path. */

import React, { useEffect, useState } from "react";
import {
  getByokKey,
  setByokKey,
  removeByokKey,
} from "../../lib/anthropic-client-byok";
import { useNav } from "../VoterChoiceApp";

function maskKey(k) {
  if (!k) return "";
  return k.length < 12 ? k : k.slice(0, 7) + "…" + k.slice(-4);
}

export function ByokCard({
  /** Called after a key is saved — the host wires this to "retry the blocked
   *  turn with the key" so Save & continue actually continues. */
  onKeySaved,
  onClose,
}) {
  const [keyDraft, setKeyDraft] = useState("");
  const [savedKey, setSavedKey] = useState(null);
  const [status, setStatus] = useState(null);
  const nav = useNav();

  useEffect(() => {
    setSavedKey(getByokKey());
  }, []);

  function saveKey() {
    const k = keyDraft.trim();
    if (!k.startsWith("sk-ant-")) {
      setStatus({
        tone: "error",
        text: "Doesn't look like an Anthropic key (should start with sk-ant-).",
      });
      return;
    }
    setByokKey(k);
    setSavedKey(k);
    setKeyDraft("");
    setStatus({ tone: "ok", text: "Saved — resend your last message to use your account." });
    onKeySaved?.();
  }

  function clearKey() {
    removeByokKey();
    setSavedKey(null);
    setStatus({ tone: "ok", text: "Removed. Back to the community budget." });
  }

  return (
    <section className="be-byok" aria-labelledby="be-byok-ttl">
      <h4 id="be-byok-ttl" className="be-byok-ttl">
        Have an Anthropic API key? Use it directly in Voter Choice.
      </h4>
      <p className="be-byok-sub">
        Your key stays in your browser. Never sent to our server. With your key,
        chat answers from the records already on the cards — live web lookups
        and challenger research stay paused.
      </p>
      {savedKey ? (
        <div className="be-byok-saved">
          <div className="be-byok-mask">
            <span className="be-byok-lab">Saved key</span>
            <code>{maskKey(savedKey)}</code>
          </div>
          <button className="be-byok-clear" onClick={clearKey}>
            Remove
          </button>
        </div>
      ) : (
        <div className="be-byok-row">
          <div className="be-byok-input-wrap">
            <input
              type="password"
              placeholder="sk-ant-..."
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveKey();
              }}
              spellCheck="false"
              autoComplete="off"
              aria-label="Anthropic API key"
              data-testid="byok-input"
            />
            <span className="be-byok-icon" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </span>
          </div>
          <button
            className="be-byok-save"
            onClick={saveKey}
            disabled={!keyDraft.trim()}
            data-testid="byok-save"
          >
            Save &amp; continue
          </button>
        </div>
      )}
      <p className="be-byok-hint">Starts with sk-ant-.</p>
      {status && (
        <p className={"be-byok-status " + status.tone}>{status.text}</p>
      )}

      <p className="be-tipjar">
        Voter Choice is free. If it helped, a tip helps keep it free —{" "}
        <a
          onClick={() => {
            nav?.navigate?.("tip");
            onClose?.();
          }}
          role="link"
          tabIndex={0}
        >
          TIP JAR
        </a>{" "}
        · not required.
      </p>
    </section>
  );
}
