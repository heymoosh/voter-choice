"use client";

import { useState, useRef, useCallback } from "react";
import {
  getStatesForZip,
  getStateData,
  getNextElection,
} from "@/lib/election-data";
import { generateCustomizedPrompt } from "@/lib/prompt-generator";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/translations";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  isValidProfile,
  generateProfileText,
  type VoterProfileData,
} from "@/lib/voter-profile";

export default function Home() {
  const { language } = useLanguage();
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState("");
  const [states, setStates] = useState<string[] | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [voterProfile, setVoterProfile] = useState<string | null>(null);
  const [profileError, setProfileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStates(null);
    setSelectedState(null);
    setCustomPrompt(null);

    if (!zipCode.trim()) {
      setError(t("zip.error.empty", language));
      return;
    }

    if (!/^\d{5}$/.test(zipCode)) {
      setError(t("zip.error.invalid", language));
      return;
    }

    const foundStates = getStatesForZip(zipCode);
    if (!foundStates) {
      setError(t("zip.error.notFound", language));
      return;
    }

    setStates(foundStates);

    if (foundStates.length === 1) {
      handleStateSelection(foundStates[0]);
    }
  };

  const handleStateSelection = useCallback(
    (stateCode: string) => {
      setSelectedState(stateCode);
      const stateData = getStateData(stateCode);

      if (!stateData) {
        setError(t("zip.error.invalid", language));
        return;
      }

      const nextElection = getNextElection(stateData);
      if (!nextElection) {
        setCustomPrompt(null);
        return;
      }

      const prompt = generateCustomizedPrompt(zipCode, stateData, nextElection);
      setCustomPrompt(prompt);
    },
    [zipCode, language],
  );

  const handleCopyToClipboard = async () => {
    if (!customPrompt) return;

    try {
      await navigator.clipboard.writeText(customPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const promptElement = document.getElementById("prompt-output");
      if (promptElement) {
        const range = document.createRange();
        range.selectNodeContents(promptElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!isValidProfile(text)) {
        setProfileError(
          "Invalid profile file. Please upload a .txt file downloaded from this tool.",
        );
        return;
      }
      setVoterProfile(text);
    };
    reader.readAsText(file);
  };

  const handleProfileDownload = () => {
    const profileData: VoterProfileData = {
      date: new Date().toISOString().split("T")[0],
      location: selectedState
        ? `${zipCode}, ${getStateData(selectedState)?.stateName ?? selectedState}`
        : zipCode || "Unknown",
      values: [],
      decisionStyle: [],
      personalContext: [],
      votingHistory: [],
      notes: [],
    };

    const text = generateProfileText(profileData);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voter-profile-${profileData.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stateData = selectedState ? getStateData(selectedState) : null;
  const nextElection = stateData ? getNextElection(stateData) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Skip to content
      </a>

      <main
        id="main-content"
        className="max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12"
      >
        {/* Header with language toggle */}
        <div className="flex justify-end mb-6">
          <LanguageToggle />
        </div>

        {/* Hero Section */}
        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("hero.title", language)}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            {t("hero.description", language)}
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("hero.worksWith", language)}
            </span>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Claude
            </a>
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ChatGPT
            </a>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Gemini
            </a>
            <a
              href="https://grok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Grok
            </a>
          </div>
        </section>

        {/* Voter Profile Upload */}
        <section className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleProfileUpload}
              className="sr-only"
              aria-label={t("profile.uploadLabel", language)}
              id="profile-upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            >
              {t("profile.upload", language)}
            </button>
            {voterProfile && (
              <span className="text-sm text-green-600 dark:text-green-400">
                ✓ Profile loaded
              </span>
            )}
            {profileError && (
              <span className="text-sm text-red-600 dark:text-red-400">
                {profileError}
              </span>
            )}
          </div>
        </section>

        {/* Zip Code Entry */}
        <section className="mb-8">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex-1">
              <label
                htmlFor="zip-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("zip.label", language)}
              </label>
              <input
                id="zip-input"
                data-testid="zip-input"
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg"
                placeholder={t("zip.placeholder", language)}
              />
            </div>
            <div className="sm:self-end">
              <button
                type="submit"
                data-testid="zip-submit"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors min-h-[44px] min-w-[44px]"
              >
                {t("zip.submit", language)}
              </button>
            </div>
          </form>

          {error && (
            <>
              <div
                data-testid="zip-error"
                role="alert"
                className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200"
              >
                {error}
              </div>
              {error === t("zip.error.notFound", language) && (
                <div
                  data-testid="not-found-message"
                  className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <a
                    href="https://www.usa.gov/election-office"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-red-700 dark:text-red-300 hover:underline"
                  >
                    {t("zip.error.notFoundLink", language)} →
                  </a>
                </div>
              )}
            </>
          )}
        </section>

        {/* Multi-State Selector */}
        {states && states.length > 1 && !selectedState && (
          <section className="mb-8">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-900 dark:text-yellow-200 mb-3">
                {t("multiState.prompt", language)}
              </p>
              <div
                className="flex flex-wrap gap-2"
                data-testid="state-selector"
              >
                {states.map((stateCode) => {
                  const data = getStateData(stateCode);
                  return (
                    <button
                      key={stateCode}
                      data-testid={`state-option-${stateCode.toLowerCase()}`}
                      onClick={() => handleStateSelection(stateCode)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                    >
                      {data?.stateName || stateCode}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* State Info Display */}
        {stateData && nextElection && (
          <section className="mb-8" data-testid="state-info">
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {stateData.stateName} Election Information
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                    {t("state.nextElection", language)}
                  </h3>
                  <p
                    className="text-lg font-medium text-gray-900 dark:text-white"
                    data-testid="election-name"
                  >
                    {nextElection.name}
                  </p>
                  <p
                    className="text-gray-700 dark:text-gray-300"
                    data-testid="election-date"
                  >
                    {new Date(nextElection.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div data-testid="registration-status">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                    {t("state.registrationDeadlines", language)}
                  </h3>
                  <ul className="space-y-2">
                    {stateData.registration.online.available && (
                      <li className="flex items-start gap-2">
                        <DeadlineIndicator
                          deadline={stateData.registration.online.deadline}
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          {t("state.online", language)}:{" "}
                          {new Date(
                            stateData.registration.online.deadline!,
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <DeadlineIndicator
                        deadline={stateData.registration.byMail.deadline}
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        {t("state.byMail", language)}:{" "}
                        {new Date(
                          stateData.registration.byMail.deadline!,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        (
                        {stateData.registration.byMail.sincePostmarked
                          ? "postmark"
                          : "received"}
                        )
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <DeadlineIndicator
                        deadline={stateData.registration.inPerson.deadline}
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        {t("state.inPerson", language)}:{" "}
                        {new Date(
                          stateData.registration.inPerson.deadline!,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </li>
                  </ul>
                </div>

                {stateData.earlyVoting.available && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                      {t("state.earlyVoting", language)}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {new Date(
                        stateData.earlyVoting.startDate!,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      –{" "}
                      {new Date(
                        stateData.earlyVoting.endDate!,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {stateData.earlyVoting.notes && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {" "}
                          ({stateData.earlyVoting.notes})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <a
                    href={stateData.resources.sampleBallotLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    {t("state.viewSampleBallot", language)}
                  </a>
                  <a
                    href={stateData.resources.countyElectionLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    {t("state.countyOffice", language)}
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* No Election Message */}
        {stateData && !nextElection && (
          <section className="mb-8">
            <div
              data-testid="no-election-message"
              className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
            >
              No upcoming elections found for {stateData.stateName}. Check{" "}
              <a
                href={stateData.resources.stateElectionWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {stateData.stateName} election website
              </a>{" "}
              for updates.
            </div>
          </section>
        )}

        {/* Customized Prompt Output */}
        {customPrompt && (
          <section className="mb-12">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {t("prompt.title", language)}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("prompt.description", language)}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button
                  onClick={handleCopyToClipboard}
                  data-testid="copy-button"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors min-h-[44px] min-w-[44px] whitespace-nowrap"
                >
                  {copied
                    ? t("prompt.copied", language)
                    : t("prompt.copy", language)}
                </button>
                <button
                  onClick={handleProfileDownload}
                  className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors whitespace-nowrap"
                >
                  {t("profile.download", language)}
                </button>
              </div>
            </div>

            {copied && (
              <div
                data-testid="copy-confirmation"
                role="status"
                aria-live="polite"
                className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 flex items-center gap-2"
              >
                <span>✓</span>
                <span>
                  {t("prompt.copied", language)} — paste it into any AI chatbot
                </span>
              </div>
            )}

            <div
              id="prompt-output"
              data-testid="prompt-output"
              className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto max-h-[600px] whitespace-pre-wrap font-mono text-sm text-gray-900 dark:text-gray-100"
            >
              {customPrompt}
            </div>
          </section>
        )}

        {/* Tips Section */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t("tips.title", language)}
          </h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                •
              </span>
              <span>{t("tips.1", language)}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                •
              </span>
              <span>{t("tips.2", language)}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                •
              </span>
              <span>{t("tips.3", language)}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                •
              </span>
              <span>
                <strong>
                  {language === "es" ? "Importante" : "Important"}:
                </strong>{" "}
                {t("tips.4", language)}
              </span>
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 pt-8">
          <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
            {t("footer.credit", language)}
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-500">
            {t("footer.share", language)}
          </p>
        </footer>
      </main>
    </div>
  );
}

function DeadlineIndicator({ deadline }: { deadline: string | null }) {
  if (!deadline) {
    return (
      <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mt-1.5" />
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let color = "bg-gray-400";
  let label = "Passed";

  if (diffDays >= 0) {
    if (diffDays <= 3) {
      color = "bg-red-500";
      label = "Urgent";
    } else if (diffDays <= 14) {
      color = "bg-yellow-500";
      label = "Soon";
    } else {
      color = "bg-green-500";
      label = "Upcoming";
    }
  }

  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${color} mt-1.5`}
      title={label}
      aria-label={label}
    />
  );
}
