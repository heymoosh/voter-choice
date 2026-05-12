"use client";

import { useState, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  parseBallotOutput,
  parseVoterProfile,
  ParsedBallot,
} from "@/lib/ballotParser";

interface BallotDownloadProps {
  /** Pre-parsed ballot from chat (Path A) */
  parsedBallot?: ParsedBallot | null;
  /** Pre-parsed voter profile from chat (Path A) */
  parsedProfile?: string | null;
  /** Election context for Path B display */
  county?: string;
  electionName?: string;
  electionDate?: string;
  /** State-specific phone policy */
  phonePolicyNote?: string;
  /** Path B mode: show paste areas */
  showPathB?: boolean;
}

interface ManualEntry {
  race: string;
  choice: string;
}

function generateBallotHtml(
  ballot: ParsedBallot,
  phonePolicyNote: string,
  siteUrl: string,
): string {
  const header = ballot.county
    ? `MY BALLOT — ${ballot.county}${ballot.electionName ? ` — ${ballot.electionName}` : ""}${ballot.electionDate ? ` — ${ballot.electionDate}` : ""}`
    : "MY BALLOT";

  const raceRows = ballot.races
    .map(
      (r) =>
        `<tr><td class="race">${r.race}</td><td class="choice">${r.choice}</td></tr>`,
    )
    .join("\n");

  const propRows =
    ballot.propositions.length > 0
      ? `<tr class="section-header"><td colspan="2">Propositions</td></tr>\n` +
        ballot.propositions
          .map(
            (p) =>
              `<tr><td class="race">${p.race}</td><td class="choice">${p.choice}</td></tr>`,
          )
          .join("\n")
      : "";

  const reminderRow = phonePolicyNote
    ? `<p class="reminder"><strong>REMINDER:</strong> ${phonePolicyNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${header}</title>
<style>
  body { font-family: Georgia, serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #000; }
  h1 { font-size: 18px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  td { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 14px; }
  .race { font-weight: 500; width: 60%; }
  .choice { font-weight: bold; }
  .section-header td { font-weight: bold; font-size: 15px; background: #f5f5f5; padding: 8px; }
  .reminder { font-size: 13px; background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin-top: 12px; }
  .footer { font-size: 11px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { margin: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
<h1>${header}</h1>
<table>
${raceRows}
${propRows}
</table>
${reminderRow}
<p class="footer">Generated with Voter Choice — ${siteUrl}<br>This document is your personal notes, not an official ballot.</p>
<p class="no-print" style="margin-top: 20px; text-align: center;">
  <button onclick="window.print()" style="padding: 10px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 15px; cursor: pointer;">Print This Ballot</button>
</p>
</body>
</html>`;
}

export default function BallotDownload({
  parsedBallot,
  parsedProfile,
  county,
  electionName,
  electionDate,
  phonePolicyNote = "",
  showPathB = false,
}: BallotDownloadProps) {
  const { t } = useLanguage();

  // Path B state
  const [pastedBallot, setPastedBallot] = useState("");
  const [pastedProfile, setPastedProfile] = useState("");
  const [parseError, setParseError] = useState(false);
  const [pathBBallot, setPathBBallot] = useState<ParsedBallot | null>(null);
  const [pathBProfile, setPathBProfile] = useState<string | null>(null);

  // Manual entry state
  const [showManual, setShowManual] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([
    { race: "", choice: "" },
  ]);

  // Which ballot to use
  const activeBallot =
    parsedBallot ??
    pathBBallot ??
    (showManual && manualEntries.some((e) => e.race && e.choice)
      ? {
          county,
          electionName,
          electionDate,
          races: manualEntries.filter((e) => e.race && e.choice),
          propositions: [],
          reminder: phonePolicyNote,
        }
      : null);

  const activeProfile = parsedProfile ?? pathBProfile;

  // Profile helper
  const handleParsePathB = useCallback(() => {
    setParseError(false);
    const result = parseBallotOutput(pastedBallot);
    if (!result) {
      setParseError(true);
      setShowManual(true);
      return;
    }
    setPathBBallot(result);
  }, [pastedBallot]);

  const handleParseProfile = useCallback(() => {
    const result = parseVoterProfile(pastedProfile);
    setPathBProfile(result ?? pastedProfile);
  }, [pastedProfile]);

  function handleDownloadBallot() {
    if (!activeBallot) return;
    const html = generateBallotHtml(
      activeBallot,
      phonePolicyNote,
      typeof window !== "undefined"
        ? window.location.origin
        : "voterchoice.org",
    );
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function handleDownloadProfile() {
    if (!activeProfile) return;
    const blob = new Blob([activeProfile], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voter-profile.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Ballot Preview + Download (Path A or after Path B parse) */}
      {activeBallot && (
        <div
          data-testid="ballot-preview"
          className="bg-white border border-gray-200 rounded-xl p-4"
        >
          <h3 className="font-bold text-gray-900 mb-3">
            {t("ballotPreviewTitle")}
          </h3>
          <div className="space-y-1 text-sm">
            {activeBallot.races.map((r, i) => (
              <div
                key={i}
                className="flex justify-between gap-4 py-1 border-b border-gray-100"
              >
                <span className="text-gray-700">{r.race}</span>
                <span className="font-semibold text-gray-900">{r.choice}</span>
              </div>
            ))}
            {activeBallot.propositions.length > 0 && (
              <>
                <p className="text-xs font-bold text-gray-500 uppercase mt-3 mb-1">
                  {t("ballotPropositions")}
                </p>
                {activeBallot.propositions.map((p, i) => (
                  <div
                    key={i}
                    className="flex justify-between gap-4 py-1 border-b border-gray-100"
                  >
                    <span className="text-gray-700">{p.race}</span>
                    <span className="font-semibold text-gray-900">
                      {p.choice}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              data-testid="download-ballot-btn"
              onClick={handleDownloadBallot}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {t("downloadBallotBtn")}
            </button>
            {activeProfile && (
              <button
                data-testid="download-profile-btn"
                onClick={handleDownloadProfile}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {t("downloadProfileBtn")}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">{t("ballotDisclaimer")}</p>
        </div>
      )}

      {/* Path B: paste-back area */}
      {showPathB && !activeBallot && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-900">{t("pathBPasteHeading")}</h3>
          <p className="text-sm text-gray-600">{t("pathBPasteInstructions")}</p>

          <div>
            <label
              htmlFor="ballot-paste-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("ballotPasteInputLabel")}
            </label>
            <textarea
              id="ballot-paste-input"
              data-testid="ballot-paste-input"
              value={pastedBallot}
              onChange={(e) => setPastedBallot(e.target.value)}
              placeholder={t("ballotPasteInputPlaceholder")}
              rows={8}
              className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {parseError && (
            <div
              role="alert"
              className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3"
            >
              {t("ballotParseError")}
            </div>
          )}

          <button
            onClick={handleParsePathB}
            disabled={!pastedBallot.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t("pathBGenerateBallot")}
          </button>
        </div>
      )}

      {/* Manual Entry Fallback */}
      {showManual && (
        <div
          data-testid="ballot-manual-entry"
          className="bg-white border border-gray-200 rounded-xl p-4 space-y-4"
        >
          <h3 className="font-bold text-gray-900">
            {t("ballotManualEntryTitle")}
          </h3>
          <div className="space-y-3">
            {manualEntries.map((entry, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={entry.race}
                  onChange={(e) => {
                    const updated = [...manualEntries];
                    updated[idx] = { ...updated[idx], race: e.target.value };
                    setManualEntries(updated);
                  }}
                  placeholder={t("ballotManualRaceLabel")}
                  aria-label={`${t("ballotManualRaceLabel")} ${idx + 1}`}
                  className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={entry.choice}
                  onChange={(e) => {
                    const updated = [...manualEntries];
                    updated[idx] = { ...updated[idx], choice: e.target.value };
                    setManualEntries(updated);
                  }}
                  placeholder={t("ballotManualCandidateLabel")}
                  aria-label={`${t("ballotManualCandidateLabel")} ${idx + 1}`}
                  className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() =>
                setManualEntries([...manualEntries, { race: "", choice: "" }])
              }
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + {t("ballotManualAddRace")}
            </button>
            <button
              onClick={() => {
                const valid = manualEntries.filter((e) => e.race && e.choice);
                if (valid.length === 0) return;
                setPathBBallot({
                  county,
                  electionName,
                  electionDate,
                  races: valid,
                  propositions: [],
                  reminder: phonePolicyNote,
                });
                setShowManual(false);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
            >
              {t("ballotManualGenerate")}
            </button>
          </div>
        </div>
      )}

      {/* Path B: voter profile paste */}
      {showPathB && !activeProfile && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-900">
            {t("pathBProfileHeading")}
          </h3>
          <textarea
            data-testid="ballot-paste-profile-input"
            value={pastedProfile}
            onChange={(e) => setPastedProfile(e.target.value)}
            placeholder={t("pathBPasteProfilePlaceholder")}
            rows={6}
            className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleParseProfile}
            disabled={!pastedProfile.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
          >
            {t("pathBGenerateProfile")}
          </button>
        </div>
      )}

      {/* Profile download (if profile loaded but no ballot yet) */}
      {activeProfile && !activeBallot && (
        <div className="flex gap-3">
          <button
            data-testid="download-profile-btn"
            onClick={handleDownloadProfile}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
          >
            {t("downloadProfileBtn")}
          </button>
        </div>
      )}
    </div>
  );
}
