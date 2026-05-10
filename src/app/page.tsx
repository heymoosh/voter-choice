"use client";

import { useState } from "react";
import {
  lookupStatesByZip,
  getStateData,
  getNextElection,
  getDeadlineStatus,
  formatDate,
} from "@/lib/election-data";
import { generateCustomPrompt } from "@/lib/prompt-generator";
import { useI18n } from "@/lib/i18n";
import { translations } from "@/lib/translations";
import type { StateElectionData } from "@/types/election";
import type { Language, T } from "@/lib/translations";

export default function Home() {
  const { lang, t, setLang } = useI18n();
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState("");
  const [states, setStates] = useState<string[] | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateData, setStateData] = useState<StateElectionData | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStates(null);
    setSelectedState(null);
    setStateData(null);
    setCustomPrompt("");

    if (!zipCode.trim()) return setError(t.errorEmptyZip);
    if (!/^\d{5}$/.test(zipCode)) return setError(t.errorInvalidZip);

    const foundStates = lookupStatesByZip(zipCode);
    if (!foundStates) return setError(t.errorZipNotFound);

    setStates(foundStates);
    if (foundStates.length === 1) applyState(foundStates[0], lang);
  };

  const applyState = (stateCode: string, currentLang: Language) => {
    setSelectedState(stateCode);
    const data = getStateData(stateCode);
    if (!data) return setError(t.errorStateNotFound);
    setStateData(data);
    setCustomPrompt(generateCustomPrompt(zipCode, data, currentLang));
  };

  const handleLanguageToggle = () => {
    const newLang: Language = lang === "en" ? "es" : "en";
    setLang(newLang);
    if (stateData)
      setCustomPrompt(generateCustomPrompt(zipCode, stateData, newLang));
    if (error)
      setError(
        translateError(error, translations[lang], translations[newLang]),
      );
  };

  const election = stateData ? getNextElection(stateData) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        {t.skipToContent}
      </a>

      <div className="fixed top-4 right-4 z-50">
        <button
          data-testid="language-toggle"
          onClick={handleLanguageToggle}
          aria-label={t.languageToggleLabel}
          className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          {t.switchToCode}
        </button>
      </div>

      <main id="main" className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <HeroSection t={t} />

        <ZipForm
          zipCode={zipCode}
          error={error}
          t={t}
          onZipChange={setZipCode}
          onSubmit={handleSubmit}
        />

        {states && states.length > 1 && !selectedState && (
          <MultiStateSelector
            states={states}
            t={t}
            onSelect={(code) => applyState(code, lang)}
          />
        )}

        {stateData && (
          <StateResult
            stateData={stateData}
            election={election}
            lang={lang}
            t={t}
          />
        )}

        {error === t.errorZipNotFound && <NotFoundMessage error={error} />}

        {customPrompt && <PromptOutput prompt={customPrompt} t={t} />}

        <TipsSection lang={lang} t={t} />

        <footer className="text-center text-gray-600 py-8 border-t border-gray-200">
          <p className="mb-2 font-medium">{t.footerShare}</p>
          <p className="text-sm">{t.footerAttribution}</p>
        </footer>
      </main>
    </div>
  );
}

function translateError(err: string, oldT: T, newT: T): string {
  if (err === oldT.errorEmptyZip) return newT.errorEmptyZip;
  if (err === oldT.errorInvalidZip) return newT.errorInvalidZip;
  if (err === oldT.errorZipNotFound) return newT.errorZipNotFound;
  if (err === oldT.errorStateNotFound) return newT.errorStateNotFound;
  return err;
}

function HeroSection({ t }: { t: T }) {
  return (
    <section className="text-center mb-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.heroTitle}</h1>
      <p className="text-xl text-gray-700 mb-4">{t.heroSubtitle}</p>
      <p className="text-gray-600 mb-6">{t.heroDescription}</p>
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <a
          href="https://claude.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Claude
        </a>
        <span className="text-gray-400">•</span>
        <a
          href="https://chatgpt.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          ChatGPT
        </a>
        <span className="text-gray-400">•</span>
        <a
          href="https://gemini.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Gemini
        </a>
        <span className="text-gray-400">•</span>
        <a
          href="https://grok.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Grok
        </a>
      </div>
    </section>
  );
}

function ZipForm({
  zipCode,
  error,
  t,
  onZipChange,
  onSubmit,
}: {
  zipCode: string;
  error: string;
  t: T;
  onZipChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <section className="bg-white rounded-lg shadow-md p-6 mb-8">
      <form onSubmit={onSubmit} noValidate>
        <label
          htmlFor="zip-input"
          className="block text-lg font-medium text-gray-900 mb-2"
        >
          {t.zipInputLabel}
        </label>
        <div className="flex gap-4">
          <input
            id="zip-input"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={zipCode}
            onChange={(e) => onZipChange(e.target.value)}
            placeholder={t.zipInputPlaceholder}
            data-testid="zip-input"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            aria-describedby={error ? "zip-error" : undefined}
          />
          <button
            type="submit"
            data-testid="zip-submit"
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[120px]"
          >
            {t.zipSubmitButton}
          </button>
        </div>
        {error && (
          <p
            id="zip-error"
            data-testid="zip-error"
            role="alert"
            aria-live="polite"
            className="mt-2 text-red-600"
          >
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

function MultiStateSelector({
  states,
  t,
  onSelect,
}: {
  states: string[];
  t: T;
  onSelect: (code: string) => void;
}) {
  return (
    <section className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t.multiStatePrompt}
      </h2>
      <div className="flex flex-wrap gap-4" data-testid="state-selector">
        {states.map((stateCode) => (
          <button
            key={stateCode}
            onClick={() => onSelect(stateCode)}
            className="px-6 py-3 bg-gray-100 hover:bg-blue-100 border border-gray-300 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
          >
            {stateCode}
          </button>
        ))}
      </div>
    </section>
  );
}

function StateResult({
  stateData,
  election,
  lang,
  t,
}: {
  stateData: StateElectionData;
  election: StateElectionData["elections"][0] | null;
  lang: Language;
  t: T;
}) {
  if (!election) return <NoElectionMessage stateData={stateData} t={t} />;
  return (
    <StateInfoCard
      stateData={stateData}
      election={election}
      lang={lang}
      t={t}
    />
  );
}

function StateInfoCard({
  stateData,
  election,
  lang,
  t,
}: {
  stateData: StateElectionData;
  election: StateElectionData["elections"][0];
  lang: Language;
  t: T;
}) {
  const locale = lang === "es" ? "es" : "en-US";
  return (
    <section
      data-testid="state-info"
      className="bg-white rounded-lg shadow-md p-6 mb-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {stateData.stateName} Election Information
      </h2>
      <div className="space-y-4">
        <ElectionInfo election={election} t={t} locale={locale} />
        <RegistrationSection stateData={stateData} locale={locale} t={t} />
        {stateData.earlyVoting.available && (
          <EarlyVotingSection stateData={stateData} locale={locale} t={t} />
        )}
        <ResourcesSection stateData={stateData} t={t} />
      </div>
    </section>
  );
}

function ElectionInfo({
  election,
  t,
  locale,
}: {
  election: StateElectionData["elections"][0];
  t: T;
  locale: string;
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{t.upcomingElection}</h3>
      <p data-testid="election-name" className="text-gray-700">
        {election.name}
      </p>
      <p data-testid="election-date" className="text-gray-600">
        {formatDate(election.date, locale)}
      </p>
      {election.isPrimary && (
        <p className="text-gray-600">
          {t.electionType}: {election.primaryType} {t.primarySuffix}
        </p>
      )}
    </div>
  );
}

function RegistrationSection({
  stateData,
  locale,
  t,
}: {
  stateData: StateElectionData;
  locale: string;
  t: T;
}) {
  const { registration } = stateData;
  return (
    <div data-testid="registration-status">
      <h3 className="font-semibold text-gray-900 mb-2">
        {t.registrationDeadlines}
      </h3>
      <div className="space-y-2">
        {registration.online.available && registration.online.deadline && (
          <DeadlineItem
            label={t.registrationOnline}
            deadline={registration.online.deadline}
            locale={locale}
            t={t}
          />
        )}
        <DeadlineItem
          label={t.registrationByMail}
          deadline={registration.byMail.deadline}
          note={
            registration.byMail.sincePostmarked
              ? t.postmarkDate
              : t.receivedDate
          }
          locale={locale}
          t={t}
        />
        <DeadlineItem
          label={t.registrationInPerson}
          deadline={registration.inPerson.deadline}
          locale={locale}
          t={t}
        />
      </div>
      {registration.sameDayRegistration && (
        <p className="mt-2 text-green-700 font-medium">
          {t.sameDayRegistration}
        </p>
      )}
    </div>
  );
}

function EarlyVotingSection({
  stateData,
  locale,
  t,
}: {
  stateData: StateElectionData;
  locale: string;
  t: T;
}) {
  const { earlyVoting } = stateData;
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{t.earlyVotingTitle}</h3>
      <p className="text-gray-700">
        {formatDate(earlyVoting.startDate!, locale)} {t.earlyVotingThrough}{" "}
        {formatDate(earlyVoting.endDate!, locale)}
      </p>
      {earlyVoting.notes && (
        <p className="text-gray-600 text-sm">{earlyVoting.notes}</p>
      )}
    </div>
  );
}

function ResourcesSection({
  stateData,
  t,
}: {
  stateData: StateElectionData;
  t: T;
}) {
  const { resources, registration } = stateData;
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{t.resources}</h3>
      <ul className="space-y-1">
        <li>
          <a
            href={resources.sampleBallotLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {t.sampleBallotLookup}
          </a>
        </li>
        <li>
          <a
            href={resources.countyElectionLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {t.countyElectionOffice}
          </a>
        </li>
        <li>
          <a
            href={registration.registrationCheckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {t.checkRegistrationStatus}
          </a>
        </li>
      </ul>
    </div>
  );
}

function NoElectionMessage({
  stateData,
  t,
}: {
  stateData: StateElectionData;
  t: T;
}) {
  return (
    <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
      <p data-testid="no-election-message" className="text-gray-900">
        {t.noElectionBefore} {stateData.stateName}. {t.noElectionCheck}{" "}
        <a
          href={stateData.resources.stateElectionWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {t.noElectionLinkText}
        </a>{" "}
        {t.noElectionAfter}
      </p>
    </section>
  );
}

function NotFoundMessage({ error }: { error: string }) {
  return (
    <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
      <p data-testid="not-found-message" className="text-gray-900 mb-2">
        {error}
      </p>
    </section>
  );
}

function PromptOutput({ prompt, t }: { prompt: string; t: T }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {t.promptSectionTitle}
      </h2>
      <p className="text-gray-700 mb-4">{t.promptInstructions}</p>
      <div className="relative">
        <pre
          data-testid="prompt-output"
          className="bg-gray-50 border border-gray-300 rounded-md p-4 overflow-x-auto whitespace-pre-wrap break-words text-sm mb-4 max-h-96 overflow-y-auto"
        >
          {prompt}
        </pre>
        <button
          onClick={handleCopy}
          data-testid="copy-button"
          className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {copied ? t.copiedButton : t.copyButton}
        </button>
        {copied && (
          <span
            data-testid="copy-confirmation"
            className="ml-3 text-green-600 font-medium"
            role="status"
            aria-live="polite"
          >
            {t.copiedStatus}
          </span>
        )}
      </div>
    </section>
  );
}

function TipsSection({ lang, t }: { lang: Language; t: T }) {
  return (
    <section className="bg-blue-50 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t.tipsTitle}</h2>
      <ul className="space-y-2 text-gray-700">
        <TipDontKnow lang={lang} />
        <TipVotingRecords lang={lang} />
        <li>
          •{" "}
          {lang === "en"
            ? 'Ask questions anytime: "What does this position actually do?" or "Why does this matter?"'
            : 'Haz preguntas en cualquier momento: "¿Qué hace exactamente este cargo?" o "¿Por qué es importante esto?"'}
        </li>
        <TipAIMistakes lang={lang} />
        <li>
          •{" "}
          {lang === "en"
            ? "Many states prohibit phones at polling places. Print or write down your final ballot choices"
            : "Muchos estados prohíben los teléfonos en los lugares de votación. Imprime o anota tus decisiones finales de boleta"}
        </li>
      </ul>
    </section>
  );
}

function TipDontKnow({ lang }: { lang: Language }) {
  if (lang === "es") {
    return (
      <li>
        • Puedes decir <strong>&quot;No sé&quot;</strong> o{" "}
        <strong>&quot;No estoy seguro/a de mi postura&quot;</strong> — la IA te
        explicará más
      </li>
    );
  }
  return (
    <li>
      • You can say <strong>&quot;I don&apos;t know&quot;</strong> or{" "}
      <strong>&quot;I&apos;m not sure where I stand&quot;</strong> — the AI will
      explain more
    </li>
  );
}

function TipVotingRecords({ lang }: { lang: Language }) {
  if (lang === "es") {
    return (
      <li>
        • Pídele que{" "}
        <strong>
          investigue los historiales de votación de los candidatos
        </strong>{" "}
        y sus trayectorias
      </li>
    );
  }
  return (
    <li>
      • Ask it to <strong>research candidates&apos; voting records</strong> and
      track records
    </li>
  );
}

function TipAIMistakes({ lang }: { lang: Language }) {
  if (lang === "es") {
    return (
      <li>
        • <strong>La IA puede cometer errores.</strong> Este es un punto de
        partida para investigar — verifica con fuentes oficiales
      </li>
    );
  }
  return (
    <li>
      • <strong>AI can make mistakes.</strong> This is a research starting point
      — verify with official sources
    </li>
  );
}

function DeadlineItem({
  label,
  deadline,
  note,
  locale,
  t,
}: {
  label: string;
  deadline: string;
  note?: string;
  locale: string;
  t: T;
}) {
  const { isPassed, daysRemaining, status } = getDeadlineStatus(deadline);

  const statusColors = {
    passed: "text-gray-500",
    urgent: "text-red-600",
    warning: "text-yellow-700",
    good: "text-green-700",
  };

  const statusText = isPassed
    ? t.deadlinePassed
    : daysRemaining === 0
      ? t.deadlineToday
      : daysRemaining === 1
        ? t.deadlineDayLeft
        : t.deadlineDaysLeft(daysRemaining);

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-700">
        {label}: {formatDate(deadline, locale)}
        {note && <span className="text-gray-500 text-sm"> ({note})</span>}
      </span>
      <span className={`font-medium ${statusColors[status]}`}>
        {statusText}
      </span>
    </div>
  );
}
