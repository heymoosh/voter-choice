"use client";

import { useState } from "react";
import {
  parseBallotBlock,
  renderBallotHtml,
  type ParsedBallot,
} from "@/lib/ballotParser";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface BallotDownloadProps {
  /**
   * Pre-parsed ballot from the chat path (Path A).
   * If provided, shows the ballot immediately.
   */
  chatBallot: ParsedBallot | null;
}

interface ManualEntry {
  race: string;
  pick: string;
}

export function BallotDownload({ chatBallot }: BallotDownloadProps) {
  const { t, language } = useLanguage();
  const [pasteText, setPasteText] = useState("");
  const [parsedBallot, setParsedBallot] = useState<ParsedBallot | null>(null);
  const [parseError, setParseError] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([
    { race: "", pick: "" },
  ]);
  const [manualBallot, setManualBallot] = useState<ParsedBallot | null>(null);

  const activeBallot = chatBallot ?? parsedBallot ?? manualBallot;

  function handlePaste() {
    const result = parseBallotBlock(pasteText);
    if (result) {
      setParsedBallot(result);
      setParseError(false);
      setShowManual(false);
    } else {
      setParseError(true);
      setParsedBallot(null);
    }
  }

  function addManualEntry() {
    setManualEntries((prev) => [...prev, { race: "", pick: "" }]);
  }

  function updateManualEntry(
    idx: number,
    field: "race" | "pick",
    value: string,
  ) {
    setManualEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  }

  function buildManualBallot() {
    const validEntries = manualEntries.filter(
      (e) => e.race.trim() && e.pick.trim(),
    );
    if (validEntries.length === 0) return;

    const ballot: ParsedBallot = {
      header: "MY BALLOT — Manual Entry",
      entries: validEntries.map((e) => ({ race: e.race, pick: e.pick })),
      raw: "",
    };
    setManualBallot(ballot);
  }

  function downloadBallot(ballot: ParsedBallot) {
    const html = renderBallotHtml(ballot, language);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      // Fallback: download file
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-ballot.html";
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return (
    <div className="ballot-download-section">
      <h3 className="section-eyebrow">{t.ballotSectionTitle}</h3>

      {/* Path A: Chat ballot already available */}
      {chatBallot && (
        <div className="ballot-from-chat">
          <div className="ballot-preview" data-testid="ballot-preview">
            <p className="ballot-preview-header">{chatBallot.header}</p>
            <ul className="ballot-entries">
              {chatBallot.entries.map((e, i) => (
                <li key={i}>
                  <strong>{e.race}:</strong> {e.pick}
                </li>
              ))}
            </ul>
          </div>
          <button
            className="button button-primary"
            data-testid="download-ballot-btn"
            onClick={() => downloadBallot(chatBallot)}
            type="button"
          >
            {t.downloadBallotBtn}
          </button>
        </div>
      )}

      {/* Path B: Paste input */}
      {!chatBallot && (
        <div className="ballot-paste-section">
          <p className="paste-instructions">{t.ballotPasteLabel}</p>
          <textarea
            className="ballot-paste-input"
            data-testid="ballot-paste-input"
            onChange={(e) => {
              setPasteText(e.target.value);
              setParseError(false);
            }}
            placeholder={t.ballotPastePlaceholder}
            rows={8}
            value={pasteText}
          />
          <button
            className="button button-secondary"
            data-testid="ballot-parse-btn"
            disabled={!pasteText.trim()}
            onClick={handlePaste}
            type="button"
          >
            {t.ballotPasteBtn}
          </button>

          {parseError && (
            <div className="notice notice-error" role="alert">
              <p>{t.ballotParseError}</p>
              <button
                className="button button-ghost"
                onClick={() => {
                  setParseError(false);
                  setShowManual(true);
                }}
                type="button"
              >
                {t.ballotManualEntryTitle}
              </button>
            </div>
          )}

          {parsedBallot && (
            <div>
              <div className="ballot-preview" data-testid="ballot-preview">
                <p className="ballot-preview-header">{parsedBallot.header}</p>
                <ul className="ballot-entries">
                  {parsedBallot.entries.map((e, i) => (
                    <li key={i}>
                      <strong>{e.race}:</strong> {e.pick}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className="button button-primary"
                data-testid="download-ballot-btn"
                onClick={() => downloadBallot(parsedBallot)}
                type="button"
              >
                {t.downloadBallotBtn}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual entry fallback */}
      {showManual && (
        <div className="ballot-manual-entry" data-testid="ballot-manual-entry">
          <h4>{t.ballotManualEntryTitle}</h4>
          {manualEntries.map((entry, idx) => (
            <div key={idx} className="manual-entry-row">
              <input
                className="manual-race-input"
                onChange={(e) => updateManualEntry(idx, "race", e.target.value)}
                placeholder="Race or measure name"
                type="text"
                value={entry.race}
              />
              <input
                className="manual-pick-input"
                onChange={(e) => updateManualEntry(idx, "pick", e.target.value)}
                placeholder="Your choice"
                type="text"
                value={entry.pick}
              />
            </div>
          ))}
          <button
            className="button button-ghost"
            onClick={addManualEntry}
            type="button"
          >
            + Add entry
          </button>
          <button
            className="button button-secondary"
            onClick={buildManualBallot}
            type="button"
          >
            Generate ballot
          </button>

          {manualBallot && (
            <div>
              <div className="ballot-preview" data-testid="ballot-preview">
                <p className="ballot-preview-header">{manualBallot.header}</p>
                <ul className="ballot-entries">
                  {manualBallot.entries.map((e, i) => (
                    <li key={i}>
                      <strong>{e.race}:</strong> {e.pick}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className="button button-primary"
                data-testid="download-ballot-btn"
                onClick={() => downloadBallot(manualBallot)}
                type="button"
              >
                {t.downloadBallotBtn}
              </button>
            </div>
          )}
        </div>
      )}

      {activeBallot && (
        <p className="ballot-note notice notice-muted">{t.ballotNote}</p>
      )}
    </div>
  );
}
