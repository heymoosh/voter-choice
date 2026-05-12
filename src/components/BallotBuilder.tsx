"use client";

import { useState } from "react";
import type { ParsedBallot, BallotEntry } from "@/lib/types";
import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";
import { parseBallot, formatBallotHtml } from "@/lib/ballotParser";

type BallotBuilderProps = {
  language?: Language;
  preloadedBallot?: ParsedBallot | null;
};

export function BallotBuilder({
  language = "en",
  preloadedBallot = null,
}: BallotBuilderProps) {
  const [pasteText, setPasteText] = useState("");
  const [parsedBallot, setParsedBallot] = useState<ParsedBallot | null>(
    preloadedBallot,
  );
  const [parseError, setParseError] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualEntries, setManualEntries] = useState<BallotEntry[]>([
    { race: "", choice: "" },
  ]);

  function handlePaste() {
    setParseError(false);
    const result = parseBallot(pasteText);
    if (result) {
      setParsedBallot(result);
      setShowManual(false);
    } else {
      setParseError(true);
      setShowManual(true);
    }
  }

  function handleAddRow() {
    setManualEntries((prev) => [...prev, { race: "", choice: "" }]);
  }

  function handleRemoveRow(idx: number) {
    setManualEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleManualChange(
    idx: number,
    field: "race" | "choice",
    value: string,
  ) {
    setManualEntries((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function handleBuildManual() {
    const entries = manualEntries.filter(
      (e) => e.race.trim() && e.choice.trim(),
    );
    if (entries.length === 0) return;
    setParsedBallot({
      county: "My County",
      electionName: "My Election",
      date: new Date().toLocaleDateString(),
      entries,
    });
  }

  function handlePrint() {
    if (!parsedBallot) return;
    const html = formatBallotHtml(parsedBallot);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <section aria-labelledby="ballot-builder-heading" className="space-y-4">
      <h3
        id="ballot-builder-heading"
        className="text-lg font-bold text-gray-900"
      >
        Build My Ballot (Copy-Paste Path)
      </h3>

      {!parsedBallot && (
        <>
          {/* Paste area */}
          <div className="space-y-2">
            <label
              htmlFor="ballot-paste-input-field"
              className="block text-sm font-medium text-gray-700"
            >
              {tStr(language, "ballotPasteLabel")}
            </label>
            <textarea
              id="ballot-paste-input-field"
              data-testid="ballot-paste-input"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste your AI chatbot response here..."
            />
          </div>

          <button
            onClick={handlePaste}
            disabled={!pasteText.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-2 text-sm min-h-[40px]"
          >
            {tStr(language, "ballotPasteButton")}
          </button>

          {parseError && (
            <div
              role="alert"
              className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm"
            >
              {tStr(language, "ballotParseError")}
            </div>
          )}

          {/* Manual entry fallback */}
          {showManual && (
            <div
              data-testid="ballot-manual-entry"
              className="space-y-3 border border-gray-200 rounded-lg p-4"
            >
              <h4 className="font-semibold text-sm text-gray-700">
                {tStr(language, "ballotManualEntryLabel")}
              </h4>
              {manualEntries.map((entry, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      {tStr(language, "raceLabel")}
                    </label>
                    <input
                      type="text"
                      value={entry.race}
                      onChange={(e) =>
                        handleManualChange(idx, "race", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="e.g. US Senate"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      {tStr(language, "choiceLabel")}
                    </label>
                    <input
                      type="text"
                      value={entry.choice}
                      onChange={(e) =>
                        handleManualChange(idx, "choice", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  {manualEntries.length > 1 && (
                    <button
                      onClick={() => handleRemoveRow(idx)}
                      className="text-red-500 text-sm px-2 py-1 hover:text-red-700"
                      aria-label={tStr(language, "removeChoice")}
                    >
                      {tStr(language, "removeChoice")}
                    </button>
                  )}
                </div>
              ))}
              <div className="flex gap-3">
                <button
                  onClick={handleAddRow}
                  className="text-blue-600 text-sm underline hover:text-blue-800"
                >
                  + {tStr(language, "addChoice")}
                </button>
                <button
                  onClick={handleBuildManual}
                  className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700"
                >
                  {tStr(language, "ballotPasteButton")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Ballot Preview */}
      {parsedBallot && (
        <div className="space-y-3">
          <div
            data-testid="ballot-preview"
            className="border border-gray-200 rounded-lg p-4 bg-white font-mono text-sm"
          >
            <h4 className="font-bold mb-3">
              MY BALLOT — {parsedBallot.county} — {parsedBallot.electionName} —{" "}
              {parsedBallot.date}
            </h4>
            <table className="w-full">
              <tbody>
                {parsedBallot.entries.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="pr-4 font-semibold py-1">{entry.race}:</td>
                    <td className="py-1">{entry.choice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedBallot.reminder && (
              <p className="mt-3 text-xs text-gray-600 border-t pt-2">
                <strong>REMINDER:</strong> {parsedBallot.reminder}
              </p>
            )}
            <p className="mt-3 text-xs text-gray-400">
              {tStr(language, "ballotPrintDisclaimer")}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              data-testid="download-ballot-btn"
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-5 py-2 text-sm"
            >
              {tStr(language, "downloadBallot")}
            </button>
            <button
              onClick={() => {
                setParsedBallot(null);
                setPasteText("");
                setParseError(false);
                setShowManual(false);
              }}
              className="text-gray-600 text-sm underline hover:text-gray-800"
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
