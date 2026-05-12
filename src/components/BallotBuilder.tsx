"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  parseBallot,
  type BallotData,
  type BallotChoice,
} from "@/lib/structured-output";

// ---- Types -----------------------------------------------------------------

interface BallotBuilderProps {
  /** Called when a ballot is successfully parsed or manually built */
  onBallotReady: (ballot: BallotData) => void;
  /** Prefilled from chat if available */
  initialBallot?: BallotData | null;
}

// ---- Ballot Preview --------------------------------------------------------

export function BallotPreview({
  ballot,
  lang,
}: {
  ballot: BallotData;
  lang: string;
}) {
  const { t } = useLanguage();
  const dir = lang === "ar" ? "rtl" : "ltr";

  function handlePrint() {
    const content = `
      <!DOCTYPE html>
      <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="UTF-8">
        <title>My Ballot</title>
        <style>
          body { font-family: Georgia, serif; font-size: 14pt; margin: 2cm; color: #000; background: #fff; }
          h1 { font-size: 18pt; border-bottom: 2px solid #000; padding-bottom: 8pt; }
          h2 { font-size: 13pt; margin-top: 16pt; margin-bottom: 4pt; }
          .choice { margin: 4pt 0; }
          .race { font-weight: bold; }
          .pick { margin-left: 16pt; }
          .disclaimer { margin-top: 24pt; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 8pt; }
          @media print { body { margin: 1cm; } }
        </style>
      </head>
      <body>
        <h1>MY BALLOT${ballot.county ? ` — ${ballot.county}` : ""}${ballot.electionName ? ` — ${ballot.electionName}` : ""}${ballot.electionDate ? ` — ${ballot.electionDate}` : ""}</h1>
        ${ballot.choices.map((c) => `<div class="choice"><span class="race">${escHtml(c.race)}:</span> <span class="pick">${escHtml(c.pick)}</span></div>`).join("")}
        ${ballot.propositions.length > 0 ? `<h2>Propositions</h2>${ballot.propositions.map((p) => `<div class="choice"><span class="race">${escHtml(p.number)}:</span> <span class="pick">${escHtml(p.vote)}</span></div>`).join("")}` : ""}
        ${ballot.phonePolicy ? `<p style="margin-top:16pt;font-size:10pt;"><strong>REMINDER:</strong> ${escHtml(ballot.phonePolicy)}</p>` : ""}
        <div class="disclaimer">
          Generated with Voter Choice Tool<br>
          ${t.ballotPrivacyNote}
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(content);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }

  return (
    <div
      data-testid="ballot-preview"
      className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-900 text-lg">
          {t.ballotPreviewTitle}
        </h3>
        <button
          data-testid="download-ballot-btn"
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          {t.downloadBallotBtn}
        </button>
      </div>

      {ballot.county && (
        <p className="text-sm text-gray-500">
          {ballot.county}
          {ballot.electionName ? ` — ${ballot.electionName}` : ""}
          {ballot.electionDate ? ` — ${ballot.electionDate}` : ""}
        </p>
      )}

      {ballot.choices.length > 0 && (
        <div className="space-y-2">
          {ballot.choices.map((choice, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm border-b border-gray-100 pb-2 last:border-0"
            >
              <span className="font-medium text-gray-700 min-w-0 flex-1">
                {choice.race}
              </span>
              <span className="text-blue-700 font-semibold shrink-0">
                {choice.pick}
              </span>
            </div>
          ))}
        </div>
      )}

      {ballot.propositions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Propositions
          </p>
          {ballot.propositions.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm border-b border-gray-100 pb-2 last:border-0"
            >
              <span className="font-medium text-gray-700 flex-1">
                Prop {p.number}
              </span>
              <span
                className={`font-bold ${p.vote === "YES" ? "text-green-700" : "text-red-700"}`}
              >
                {p.vote}
              </span>
            </div>
          ))}
        </div>
      )}

      {ballot.phonePolicy && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          <strong>REMINDER:</strong> {ballot.phonePolicy}
        </p>
      )}

      <p className="text-xs text-gray-400 italic">{t.ballotPrivacyNote}</p>
    </div>
  );
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- BallotBuilder ---------------------------------------------------------

export function BallotBuilder({
  onBallotReady,
  initialBallot,
}: BallotBuilderProps) {
  const { t, lang } = useLanguage();
  const [pasteText, setPasteText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualRaces, setManualRaces] = useState<BallotChoice[]>([
    { race: "", pick: "" },
  ]);
  const [ballot, setBallot] = useState<BallotData | null>(
    initialBallot ?? null,
  );

  // Sync with initialBallot when it changes (e.g., from chat)
  useEffect(() => {
    if (initialBallot) {
      setBallot(initialBallot);
    }
  }, [initialBallot]);

  function handlePasteBuild() {
    setParseError(null);
    const result = parseBallot(pasteText);
    if (result.ok && result.data) {
      setBallot(result.data);
      onBallotReady(result.data);
      setShowManual(false);
    } else {
      setParseError(t.ballotParseError);
      setShowManual(true);
    }
  }

  function handleManualBuild() {
    const validRaces = manualRaces.filter(
      (r) => r.race.trim() && r.pick.trim(),
    );
    if (validRaces.length === 0) return;
    const ballotData: BallotData = {
      choices: validRaces,
      propositions: [],
      raw: validRaces.map((r) => `${r.race}: ${r.pick}`).join("\n"),
    };
    setBallot(ballotData);
    onBallotReady(ballotData);
  }

  function updateRace(i: number, field: "race" | "pick", value: string) {
    setManualRaces((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  }

  if (ballot) {
    return (
      <div className="space-y-4">
        <BallotPreview ballot={ballot} lang={lang} />
        <button
          onClick={() => {
            setBallot(null);
            setParseError(null);
          }}
          className="text-sm text-blue-700 underline hover:no-underline focus:outline-none"
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Path B: Paste section */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2 text-base">
          {t.ballotPathBTitle}
        </h3>
        <p className="text-sm text-gray-500 mb-3">{t.ballotPasteLabel}</p>
        <textarea
          data-testid="ballot-paste-input"
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            setParseError(null);
          }}
          placeholder={t.ballotPastePlaceholder}
          rows={6}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={t.ballotPasteLabel}
        />
        <button
          onClick={handlePasteBuild}
          disabled={!pasteText.trim()}
          className="mt-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        >
          {t.ballotPasteBtn}
        </button>

        {parseError && (
          <p
            role="alert"
            className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2"
          >
            {parseError}
          </p>
        )}
      </div>

      {/* Manual entry fallback */}
      <div>
        <button
          onClick={() => setShowManual((v) => !v)}
          className="text-sm text-blue-700 underline hover:no-underline focus:outline-none"
          aria-expanded={showManual}
        >
          {t.ballotManualEntryLabel}
        </button>

        {showManual && (
          <div data-testid="ballot-manual-entry" className="mt-4 space-y-3">
            {manualRaces.map((row, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1">
                  <label className="sr-only">
                    {t.ballotManualRaceLabel} {i + 1}
                  </label>
                  <input
                    type="text"
                    value={row.race}
                    onChange={(e) => updateRace(i, "race", e.target.value)}
                    placeholder={t.ballotManualRaceLabel}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="sr-only">
                    {t.ballotManualPickLabel} {i + 1}
                  </label>
                  <input
                    type="text"
                    value={row.pick}
                    onChange={(e) => updateRace(i, "pick", e.target.value)}
                    placeholder={t.ballotManualPickLabel}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() =>
                  setManualRaces((prev) => [...prev, { race: "", pick: "" }])
                }
                className="text-sm text-blue-700 underline hover:no-underline focus:outline-none"
              >
                + {t.ballotManualAddRow}
              </button>
              <button
                onClick={handleManualBuild}
                disabled={manualRaces.every(
                  (r) => !r.race.trim() || !r.pick.trim(),
                )}
                className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                {t.ballotManualBuildBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
