"use client";

import React, { useState } from "react";
import { parseBallot } from "@/lib/ballotParser";
import { downloadBallotHTML } from "@/lib/ballotDownload";
import type { BallotData } from "@/types/chat";
import type { Locale } from "@/lib/i18n/types";

interface BallotBuilderLabels {
  sectionHeading?: string;
  pasteAreaLabel?: string;
  pasteInstructions?: string;
  parseErrorMessage?: string;
  manualEntryHeading?: string;
  manualAddRaceButton?: string;
  downloadButton?: string;
  previewHeading?: string;
  disclaimer?: string;
}

interface BallotBuilderProps {
  locale?: Locale;
  labels?: BallotBuilderLabels;
}

interface ManualEntry {
  race: string;
  pick: string;
}

export default function BallotBuilder({
  locale = "en",
  labels,
}: BallotBuilderProps) {
  const [pasteText, setPasteText] = useState("");
  const [parsedBallot, setParsedBallot] = useState<BallotData | null>(null);
  const [parseError, setParseError] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([
    { race: "", pick: "" },
  ]);
  const [showManual, setShowManual] = useState(false);

  const handlePasteChange = (text: string) => {
    setPasteText(text);
    setParseError(false);
    if (!text.trim()) {
      setParsedBallot(null);
      return;
    }
    const result = parseBallot(text);
    if (result) {
      setParsedBallot(result);
      setParseError(false);
    } else {
      setParsedBallot(null);
      setParseError(true);
    }
  };

  const handleManualChange = (
    idx: number,
    field: "race" | "pick",
    value: string,
  ) => {
    setManualEntries((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const addManualEntry = () => {
    setManualEntries((prev) => [...prev, { race: "", pick: "" }]);
  };

  const buildManualBallot = (): BallotData => ({
    entries: manualEntries.filter((e) => e.race.trim() && e.pick.trim()),
    propositions: [],
  });

  const effectiveBallot =
    parsedBallot ?? (showManual ? buildManualBallot() : null);

  const handleDownload = () => {
    if (effectiveBallot) {
      downloadBallotHTML(effectiveBallot, locale);
    }
  };

  return (
    <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {labels?.sectionHeading ?? "Build My Ballot"}
      </h2>

      {/* Path B: Paste area */}
      <div>
        <label
          htmlFor="ballot-paste-input"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {labels?.pasteAreaLabel ?? "Paste your AI ballot output here"}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {labels?.pasteInstructions ??
            "After your AI conversation, copy the 'MY BALLOT' section and paste it here."}
        </p>
        <textarea
          id="ballot-paste-input"
          data-testid="ballot-paste-input"
          value={pasteText}
          onChange={(e) => handlePasteChange(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          placeholder="Paste your ballot output here..."
        />
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
          {labels?.parseErrorMessage ??
            "We couldn't read that format. Try copying just the 'MY BALLOT' section from your AI conversation, or enter your choices manually below."}
          <button
            onClick={() => setShowManual(true)}
            className="block mt-1 text-xs underline hover:no-underline focus:outline-none"
          >
            Enter choices manually instead
          </button>
        </div>
      )}

      {/* Manual entry fallback */}
      {showManual && (
        <div
          data-testid="ballot-manual-entry"
          className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4"
        >
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {labels?.manualEntryHeading ?? "Enter Ballot Choices Manually"}
          </h3>
          {manualEntries.map((entry, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                placeholder="Race name"
                value={entry.race}
                onChange={(e) =>
                  handleManualChange(idx, "race", e.target.value)
                }
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="My choice"
                value={entry.pick}
                onChange={(e) =>
                  handleManualChange(idx, "pick", e.target.value)
                }
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <button
            onClick={addManualEntry}
            className="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline"
          >
            {labels?.manualAddRaceButton ?? "Add Race"}
          </button>
        </div>
      )}

      {/* Ballot preview */}
      {effectiveBallot && effectiveBallot.entries.length > 0 && (
        <div>
          <h3
            data-testid="ballot-preview"
            className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2"
          >
            {labels?.previewHeading ?? "Ballot Preview"}
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
            {effectiveBallot.entries.map((entry, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {entry.race}
                </span>
                <span className="text-gray-900 dark:text-gray-100">
                  {entry.pick}
                </span>
              </div>
            ))}
            {effectiveBallot.propositions.map((prop, idx) => (
              <div key={`prop-${idx}`} className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Prop {prop.number}
                </span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">
                  {prop.vote}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {labels?.disclaimer ??
              "This is your personal reference, not an official ballot. Verify all information at your state election office."}
          </p>

          <button
            data-testid="download-ballot-btn"
            onClick={handleDownload}
            className="mt-3 w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {labels?.downloadButton ?? "Download / Print My Ballot"}
          </button>
        </div>
      )}
    </div>
  );
}
