"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import { ChatPanel } from "./ChatPanel";
import { PromptOutput } from "./PromptOutput";
import { BallotBuilder } from "./BallotBuilder";
import { AddressInput } from "./AddressInput";
import {
  PollingLocationCard,
  PollingLocationFallback,
} from "./PollingLocationCard";
import { getDeadlineStatus } from "../lib/getDeadlineStatus";
import { Notice } from "./ui/Notice";
import type { StateElectionData, DeadlineStatus } from "../types/election";
import type { Language } from "../lib/translations";
import type { PollingLocation } from "./PollingLocationCard";

type ResearchTab = "research" | "dates" | "id" | "polling";

interface PollingData {
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
}

type AddressStep = "input" | "loading" | "done" | "skipped" | "error";
type BudgetTier = "normal" | "notice" | "soft_close" | "handoff" | "exhausted";

interface BudgetStatus {
  tier: BudgetTier;
  percent: number;
}

interface ResearchLayoutProps {
  state: StateElectionData;
  zipCode: string;
  addressStep: AddressStep;
  pollingData: PollingData | null;
  onAddressSubmit: (address: string) => void;
  onAddressSkip: () => void;
  budgetStatus: BudgetStatus;
  budgetChecked: boolean;
  onBudgetUpdate: (budget: BudgetStatus) => void;
  voterProfile: string | null;
  promptText: string;
  copyPasteIsPrimary: boolean;
}

/* ── Icons ──────────────────────────────────────────────────── */

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
    </svg>
  );
}

function BadgeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M20 7h-5V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM9 12c.83 0 1.5.67 1.5 1.5S9.83 15 9 15s-1.5-.67-1.5-1.5S8.17 12 9 12zm3 6H6v-.75c0-1 2-1.5 3-1.5s3 .5 3 1.5V18zm1-9h-2V4h2v5zm5 7.5h-4V15h4v1.5zm0-3h-4V12h4v1.5z" />
    </svg>
  );
}

function LocationIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function DescriptionIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

function MapIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
    </svg>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function getDaysUntilElection(electionDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const election = new Date(electionDate + "T00:00:00");
  const diff = election.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getUpcomingElection(state: StateElectionData) {
  const today = new Date().toISOString().split("T")[0];
  return state.elections.find((e) => e.date >= today) ?? state.elections[0];
}

function hasPollingResults(data: PollingData | null): data is PollingData {
  return (
    data !== null &&
    (data.pollingLocations.length > 0 || data.earlyVoteSites.length > 0)
  );
}

/* ── Sidebar ─────────────────────────────────────────────────── */

const tabs: {
  key: ResearchTab;
  icon: typeof CalendarIcon;
  labelKey: keyof (typeof translations)["en"]["research"];
}[] = [
  { key: "dates", icon: CalendarIcon, labelKey: "tabDates" },
  { key: "id", icon: BadgeIcon, labelKey: "tabId" },
  { key: "polling", icon: LocationIcon, labelKey: "tabPolling" },
  { key: "research", icon: DescriptionIcon, labelKey: "tabBallot" },
];

function Sidebar({
  activeTab,
  onTabChange,
  state,
  lang,
}: {
  activeTab: ResearchTab;
  onTabChange: (tab: ResearchTab) => void;
  state: StateElectionData;
  lang: Language;
}) {
  const t = translations[lang];
  const upcoming = getUpcomingElection(state);
  const electionLabel = upcoming
    ? `${state.stateName} ${new Date(upcoming.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
    : state.stateName;

  return (
    <aside className="bg-surface-low h-full w-64 hidden md:flex flex-col p-4 shrink-0 overflow-y-auto border-r border-outline-variant/20">
      <div className="mb-8 px-2">
        <h2 className="text-lg font-bold text-primary uppercase tracking-wider">
          {t.research.sidebarTitle}
        </h2>
        <p className="text-xs text-on-surface-muted">
          {t.research.sidebarSubtitle}
        </p>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <div className="mb-2 px-2 py-1 text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.2em]">
          {electionLabel}
        </div>
        {tabs.map(({ key, icon: Icon, labelKey }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex items-center gap-3 px-3 py-3 text-left text-sm uppercase tracking-wider transition-colors ${
                isActive
                  ? "text-primary font-bold bg-surface-lowest"
                  : "text-on-surface-muted hover:text-primary hover:bg-surface-high"
              }`}
            >
              <Icon className={isActive ? "text-primary" : ""} />
              <span>{t.research[labelKey]}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <a
          href={state.registration.registrationCheckUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-primary text-on-primary py-3 px-4 font-bold text-sm uppercase tracking-widest text-center hover:opacity-90 transition-opacity"
        >
          {t.research.checkRegistration}
        </a>
      </div>
    </aside>
  );
}

/* ── Mobile Bottom Nav ───────────────────────────────────────── */

const mobileTabIcons: {
  key: ResearchTab;
  icon: typeof CalendarIcon;
  labelKey: keyof (typeof translations)["en"]["research"];
}[] = [
  { key: "research", icon: DescriptionIcon, labelKey: "navResearch" },
  { key: "dates", icon: CalendarIcon, labelKey: "tabDates" },
  { key: "polling", icon: MapIcon, labelKey: "tabPolling" },
];

function MobileBottomNav({
  activeTab,
  onTabChange,
  lang,
}: {
  activeTab: ResearchTab;
  onTabChange: (tab: ResearchTab) => void;
  lang: Language;
}) {
  const t = translations[lang];

  return (
    <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-high flex justify-around items-center py-3 border-t border-outline-variant/10 z-50">
      {mobileTabIcons.map(({ key, icon: Icon, labelKey }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex flex-col items-center ${
              isActive ? "text-primary" : "text-on-surface-muted"
            }`}
          >
            <Icon />
            <span className="text-[10px] font-bold mt-1">
              {t.research[labelKey]}
            </span>
          </button>
        );
      })}
    </footer>
  );
}

/* ── Tab Content: Dates ──────────────────────────────────────── */

function DeadlineRow({
  label,
  status,
}: {
  label: string;
  status: DeadlineStatus;
}) {
  const statusColors: Record<string, string> = {
    green: "text-primary bg-surface-lowest",
    yellow: "text-accent bg-surface-lowest",
    red: "text-red-700 bg-surface-lowest",
    passed: "text-on-surface-muted bg-surface-high",
  };

  return (
    <div className="flex justify-between items-center text-sm py-2">
      <span className="font-medium">{label}</span>
      <span
        className={`px-3 py-1 rounded-sm text-xs font-medium ${statusColors[status.color]}`}
      >
        {status.date} &mdash; {status.label}
      </span>
    </div>
  );
}

// eslint-disable-next-line complexity
function DatesView({ state }: { state: StateElectionData }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const today = new Date().toISOString().split("T")[0];
  const upcoming = getUpcomingElection(state);

  const earlyVotingActive =
    state.earlyVoting.available &&
    state.earlyVoting.startDate &&
    state.earlyVoting.endDate &&
    today >= state.earlyVoting.startDate &&
    today <= state.earlyVoting.endDate;

  const onlineStatus = state.registration.online.available
    ? getDeadlineStatus(state.registration.online.deadline!, today, lang)
    : null;
  const byMailStatus = getDeadlineStatus(
    state.registration.byMail.deadline,
    today,
    lang,
  );
  const inPersonStatus = getDeadlineStatus(
    state.registration.inPerson.deadline,
    today,
    lang,
  );

  const daysLeft = upcoming ? getDaysUntilElection(upcoming.date) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Election header + countdown */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-on-surface mb-2">
            {state.stateName}
          </h2>
          {upcoming && (
            <>
              <p className="text-lg font-medium">{upcoming.name}</p>
              <p className="text-on-surface-variant">{upcoming.date}</p>
              {earlyVotingActive && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-on-primary mt-2">
                  {lang === "es"
                    ? "Voto anticipado abierto"
                    : "Early Voting Open"}
                </span>
              )}
            </>
          )}
        </div>
        {daysLeft !== null && (
          <div className="bg-surface-high p-6 flex flex-col justify-center shrink-0">
            <span className="text-3xl font-black text-primary mb-1">
              {daysLeft}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
              {t.research.daysUntilElection}
            </span>
          </div>
        )}
      </div>

      {/* Registration Deadlines */}
      <div className="bg-surface-lowest p-6 border-l-4 border-primary">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-muted mb-4">
          {t.stateInfo.registrationDeadlines}
        </h3>
        <div className="space-y-1">
          {onlineStatus && (
            <DeadlineRow
              label={lang === "es" ? "En l\u00ednea" : "Online"}
              status={onlineStatus}
            />
          )}
          {!state.registration.online.available && (
            <p className="text-sm text-on-surface-muted">
              {lang === "es"
                ? "Registro en l\u00ednea: No disponible"
                : "Online registration: Not available"}
            </p>
          )}
          <DeadlineRow
            label={lang === "es" ? "Por correo" : "By mail"}
            status={byMailStatus}
          />
          <DeadlineRow
            label={lang === "es" ? "En persona" : "In person"}
            status={inPersonStatus}
          />
        </div>
        <div className="mt-4">
          <a
            href={state.registration.registrationCheckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm font-bold hover:underline"
          >
            {t.research.checkRegistration}
          </a>
        </div>
      </div>

      {/* Early Voting */}
      <div className="bg-surface-lowest p-6 border-l-4 border-accent">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-muted mb-3">
          {t.stateInfo.earlyVoting}
        </h3>
        {state.earlyVoting.available &&
        state.earlyVoting.startDate &&
        state.earlyVoting.endDate ? (
          <div>
            <p className="text-lg font-bold text-on-surface">
              {state.earlyVoting.startDate} &mdash; {state.earlyVoting.endDate}
            </p>
            {state.earlyVoting.notes && (
              <p className="text-sm text-on-surface-variant mt-1">
                {state.earlyVoting.notes}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-on-surface-muted">
            {t.stateInfo.earlyVotingNotAvailable}
          </p>
        )}
      </div>

      {/* Resources */}
      <div className="flex gap-6">
        <a
          href={state.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm font-bold hover:underline"
        >
          {t.stateInfo.countyElectionOffice}
        </a>
        <a
          href={state.resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm font-bold hover:underline"
        >
          {t.stateInfo.sampleBallot}
        </a>
      </div>
    </div>
  );
}

/* ── Tab Content: ID Requirements ────────────────────────────── */

function IdView({ state }: { state: StateElectionData }) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h2 className="text-3xl font-black text-on-surface">
        {t.research.tabId}
      </h2>

      {/* Voter ID */}
      <div className="bg-surface-lowest p-6 border-l-4 border-primary">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-muted mb-4">
          {t.stateInfo.voterId}
        </h3>
        {state.votingRules.idRequired ? (
          <div className="space-y-3">
            <p className="font-medium text-on-surface">
              {t.stateInfo.voterIdRequired}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {state.votingRules.acceptedIds.map((id) => (
                <div
                  key={id}
                  className="bg-surface-low p-3 text-sm text-on-surface"
                >
                  {id}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm">{t.stateInfo.voterIdNotRequired}</p>
        )}
      </div>

      {/* Phones at Polls */}
      <div className="bg-surface-lowest p-6 border-l-4 border-accent">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-muted mb-3">
          {t.stateInfo.phonesAtPolls}
        </h3>
        <p className="text-sm text-on-surface">
          {state.votingRules.phonesAtPollsDetail}
        </p>
      </div>

      {/* Resources */}
      <div>
        <a
          href={state.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm font-bold hover:underline"
        >
          {t.stateInfo.countyElectionOffice}
        </a>
      </div>
    </div>
  );
}

/* ── Tab Content: Polling Places ─────────────────────────────── */

function PollingView({
  state,
  addressStep,
  pollingData,
  onAddressSubmit,
  onAddressSkip,
}: {
  state: StateElectionData;
  addressStep: AddressStep;
  pollingData: PollingData | null;
  onAddressSubmit: (address: string) => void;
  onAddressSkip: () => void;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h2 className="text-3xl font-black text-on-surface">
        {t.research.tabPolling}
      </h2>

      {(addressStep === "input" || addressStep === "loading") && (
        <AddressInput
          onSubmit={onAddressSubmit}
          onSkip={onAddressSkip}
          isLoading={addressStep === "loading"}
        />
      )}

      {addressStep === "done" && hasPollingResults(pollingData) && (
        <PollingLocationCard
          pollingLocations={pollingData.pollingLocations}
          earlyVoteSites={pollingData.earlyVoteSites}
          fallbackUrl={state.resources.pollingPlaceLookup}
        />
      )}

      {(addressStep === "error" ||
        addressStep === "skipped" ||
        (addressStep === "done" && !hasPollingResults(pollingData))) && (
        <PollingLocationFallback
          fallbackUrl={state.resources.pollingPlaceLookup}
        />
      )}
    </div>
  );
}

/* ── Tab Content: Research ───────────────────────────────────── */

function ResearchView({
  state,
  zipCode,
  budgetStatus,
  budgetChecked,
  onBudgetUpdate,
  voterProfile,
  promptText,
  copyPasteIsPrimary,
  pollingData,
}: {
  state: StateElectionData;
  zipCode: string;
  budgetStatus: BudgetStatus;
  budgetChecked: boolean;
  onBudgetUpdate: (budget: BudgetStatus) => void;
  voterProfile: string | null;
  promptText: string;
  copyPasteIsPrimary: boolean;
  pollingData: PollingData | null;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const upcoming = getUpcomingElection(state);
  const daysLeft = upcoming ? getDaysUntilElection(upcoming.date) : null;
  const chatAvailable =
    budgetStatus.tier === "normal" || budgetStatus.tier === "notice";

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Historical Context + Countdown */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
                {t.research.historicalContext}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed italic border-l-2 border-outline-variant pl-4">
                &ldquo;{t.research.historicalContextQuote}&rdquo;
              </p>
            </div>
            {daysLeft !== null && (
              <div className="bg-surface-high p-6 flex flex-col justify-center">
                <span className="text-3xl font-black text-primary mb-1">
                  {daysLeft}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                  {t.research.daysUntilElection}
                </span>
              </div>
            )}
          </section>

          {/* Budget warning */}
          {copyPasteIsPrimary && (
            <Notice variant="warning">
              <p className="font-semibold mb-1">{t.budget.softClose}</p>
              <p className="text-xs text-on-surface-muted">
                {t.budget.resetNote}
              </p>
            </Notice>
          )}

          {/* Chat or copy/paste fallback */}
          {(chatAvailable || !budgetChecked) && (
            <ChatPanel
              state={state}
              zipCode={zipCode}
              pollingData={pollingData}
              onBudgetUpdate={onBudgetUpdate}
              voterProfile={voterProfile}
            />
          )}

          {/* Copy/paste prompt */}
          {copyPasteIsPrimary ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-base">
                {lang === "es"
                  ? "Copia este mensaje para investigar tu boleta"
                  : "Copy this prompt to research your ballot"}
              </h3>
              <PromptOutput promptText={promptText} />
            </div>
          ) : (
            <details className="group">
              <summary className="cursor-pointer text-sm text-primary font-medium hover:underline">
                {lang === "es"
                  ? "\u00bfPrefieres usar tu propio chatbot? Copia este mensaje"
                  : "Prefer to use your own AI chatbot? Copy this prompt"}
              </summary>
              <div className="mt-3">
                <PromptOutput promptText={promptText} />
              </div>
            </details>
          )}

          {/* Ballot Builder */}
          <BallotBuilder />
        </div>
      </div>
    </div>
  );
}

/* ── Main Layout ─────────────────────────────────────────────── */

export function ResearchLayout({
  state,
  zipCode,
  addressStep,
  pollingData,
  onAddressSubmit,
  onAddressSkip,
  budgetStatus,
  budgetChecked,
  onBudgetUpdate,
  voterProfile,
  promptText,
  copyPasteIsPrimary,
}: ResearchLayoutProps) {
  const [activeTab, setActiveTab] = useState<ResearchTab>("research");
  const { lang } = useLanguage();

  return (
    <div className="flex flex-1 overflow-hidden h-[calc(100vh-57px)]">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        state={state}
        lang={lang}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-surface overflow-hidden">
        {/* Research tab (always mounted to preserve chat state) */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${activeTab === "research" ? "" : "hidden"}`}
        >
          <ResearchView
            state={state}
            zipCode={zipCode}
            budgetStatus={budgetStatus}
            budgetChecked={budgetChecked}
            onBudgetUpdate={onBudgetUpdate}
            voterProfile={voterProfile}
            promptText={promptText}
            copyPasteIsPrimary={copyPasteIsPrimary}
            pollingData={pollingData}
          />
        </div>

        {/* Other tabs (mounted on demand) */}
        {activeTab === "dates" && (
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16">
            <DatesView state={state} />
          </div>
        )}

        {activeTab === "id" && (
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16">
            <IdView state={state} />
          </div>
        )}

        {activeTab === "polling" && (
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-16">
            <PollingView
              state={state}
              addressStep={addressStep}
              pollingData={pollingData}
              onAddressSubmit={onAddressSubmit}
              onAddressSkip={onAddressSkip}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
      />
    </div>
  );
}
