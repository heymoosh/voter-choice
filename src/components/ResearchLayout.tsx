"use client";

import { useState, type ReactNode } from "react";
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
import type { StateElectionData } from "../types/election";
import type { Language } from "../lib/translations";
import type { BallotSourceSummary } from "../types/ballotSource";
import type { PollingLocation } from "./PollingLocationCard";

type ResearchTab = "research" | "dates" | "id" | "polling";

interface PollingData {
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
  contests?: {
    office: string;
    district: string;
    type: string;
    candidates: { name: string; party: string }[];
  }[];
  county?: string;
  source?: BallotSourceSummary;
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
  countyName?: string;
  userSampleBallotText?: string;
  onUserSampleBallotTextChange?: (text: string) => void;
  preResearchContext?: string;
  researchReady?: boolean;
  preResearchGate?: ReactNode;
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

function getContestCount(data: PollingData | null): number {
  return data?.contests?.length ?? 0;
}

function ballotStatusText(
  contestCount: number,
  lang: Language,
): { title: string; body: string } {
  if (contestCount > 0) {
    return {
      title:
        lang === "es"
          ? "Encontramos contiendas oficiales para tu dirección."
          : "Official contests found for your address.",
      body:
        lang === "es"
          ? `${contestCount} contienda${contestCount === 1 ? "" : "s"} se incluirán en la conversación. El asistente aún debe citar fuentes cuando investigue candidatos o propuestas.`
          : `${contestCount} race${contestCount === 1 ? "" : "s"} will be included in the conversation. The assistant still needs to cite sources when researching candidates or measures.`,
    };
  }

  return {
    title:
      lang === "es"
        ? "Aún no se confirmó tu boleta exacta."
        : "Exact ballot not confirmed yet.",
    body:
      lang === "es"
        ? "Seguiremos con enlaces oficiales e investigación pública. Si una fuente no confirma candidatos o contiendas, el asistente debe decirlo claramente."
        : "We'll continue with official source links and public research. If a source does not confirm candidates or contests, the assistant should say that plainly.",
  };
}

function ballotSourceLinks({
  source,
  state,
  countyName,
  lang,
}: {
  source?: BallotSourceSummary;
  state: StateElectionData;
  countyName?: string;
  lang: Language;
}) {
  const countyResource = countyName
    ? state.countyResources?.[countyName]
    : undefined;
  const countyLinks = countyResource
    ? [
        {
          label: `${countyResource.name} sample ballot`,
          url: countyResource.ballotLookup,
        },
        {
          label: `${countyResource.name} elections office`,
          url: countyResource.electionsWebsite,
        },
      ]
    : [];

  return [
    ...(source?.sourceLinks ?? []),
    ...countyLinks,
    {
      label:
        lang === "es"
          ? "Búsqueda estatal de boleta de muestra"
          : "State sample ballot lookup",
      url: state.resources.sampleBallotLookup,
    },
  ];
}

function BallotDataStatus({
  pollingData,
  lang,
  state,
  countyName,
}: {
  pollingData: PollingData | null;
  lang: Language;
  state: StateElectionData;
  countyName?: string;
}) {
  const contestCount = getContestCount(pollingData);
  const hasOfficialContests = contestCount > 0;
  const source = pollingData?.source;
  const { title, body } = ballotStatusText(contestCount, lang);
  const sourceLinks = ballotSourceLinks({ source, state, countyName, lang });

  return (
    <section
      data-testid="ballot-data-status"
      className="bg-surface-low border-l-4 border-primary p-4 text-sm text-on-surface-variant"
    >
      <p className="font-bold text-on-surface mb-1">{title}</p>
      <p>{body}</p>
      {source && (
        <p className="mt-2 text-xs text-on-surface-muted">
          {source.provider}: {source.message}
        </p>
      )}
      {!hasOfficialContests && (
        <ul className="mt-3 space-y-1 text-xs">
          {sourceLinks.map((link) => (
            <li key={`${link.label}-${link.url}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const SAMPLE_BALLOT_COPY = {
  en: {
    title: "Use my official sample ballot",
    withContests:
      "If you have a more specific sample ballot, paste it here to guide research.",
    withoutContests:
      "If automatic lookup did not confirm your races, paste your official ballot text here. Chat will use that list and verify candidates with public sources.",
    privacy:
      "Privacy: do not paste your name, exact address, phone, email, or other identifying details.",
    placeholder: "Paste text copied from your official sample ballot here...",
    applied: "Working ballot applied to chat.",
    apply: "Use this ballot",
    update: "Update chat",
    upload: "Upload .txt",
    appliedNotice:
      "The pasted ballot will be used to restart the research chat.",
    pdfNotice:
      "PDFs vary too much to extract text reliably here. Open the PDF, select the ballot text, copy it, and paste it into this box.",
    fileNotice:
      "For today, upload a .txt file or paste text copied from the official PDF.",
    loadedNotice: "Text loaded. Review it, then apply it to the chat.",
  },
  es: {
    title: "Usar mi boleta de muestra oficial",
    withContests:
      "Si tienes una boleta de muestra más específica, puedes pegarla aquí para guiar la investigación.",
    withoutContests:
      "Si la búsqueda automática no confirmó tus contiendas, pega el texto de tu boleta oficial aquí. El chat usará esa lista y verificará candidatos con fuentes públicas.",
    privacy:
      "Privacidad: no pegues tu nombre, dirección exacta, teléfono, correo electrónico ni otros datos identificables.",
    placeholder: "Pega aquí texto copiado de tu boleta de muestra oficial...",
    applied: "Boleta de trabajo aplicada al chat.",
    apply: "Usar esta boleta",
    update: "Actualizar chat",
    upload: "Cargar .txt",
    appliedNotice:
      "La boleta pegada se usará para reiniciar el chat de investigación.",
    pdfNotice:
      "Los PDFs varían demasiado para extraer texto de forma confiable aquí. Abre el PDF, selecciona el texto de la boleta, cópialo y pégalo en este cuadro.",
    fileNotice:
      "Para hoy, carga un archivo .txt o pega texto copiado desde el PDF oficial.",
    loadedNotice: "Texto cargado. Revisa el contenido y aplícalo al chat.",
  },
};

function sampleBallotCopy(lang: Language) {
  return SAMPLE_BALLOT_COPY[lang];
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.endsWith(".pdf");
}

function isTextFile(file: File): boolean {
  return file.name.endsWith(".txt") || file.type === "text/plain";
}

function UserSampleBallotInput({
  value,
  onChange,
  lang,
  hasOfficialContests,
}: {
  value: string;
  onChange: (text: string) => void;
  lang: Language;
  hasOfficialContests: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [notice, setNotice] = useState<string | null>(null);
  const canApply = draft.trim().length > 0 && draft.trim() !== value.trim();
  const copy = sampleBallotCopy(lang);

  function applyText() {
    const text = draft.trim();
    onChange(text);
    setNotice(copy.appliedNotice);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (isPdfFile(file)) {
      setNotice(copy.pdfNotice);
      return;
    }
    if (!isTextFile(file)) {
      setNotice(copy.fileNotice);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setDraft(text);
      setNotice(copy.loadedNotice);
    };
    reader.readAsText(file);
  }

  return (
    <section
      data-testid="user-sample-ballot-input"
      className="bg-surface-lowest border-l-4 border-accent p-4 md:p-6"
    >
      <div className="mb-4">
        <h3 className="font-black text-lg tracking-tight text-on-surface">
          {copy.title}
        </h3>
        <p className="text-sm text-on-surface-muted mt-1">
          {hasOfficialContests ? copy.withContests : copy.withoutContests}
        </p>
        <p className="text-xs text-on-surface-muted mt-2">{copy.privacy}</p>
      </div>

      <textarea
        data-testid="user-sample-ballot-textarea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={8}
        maxLength={12000}
        placeholder={copy.placeholder}
        className="w-full bg-surface-high px-4 py-3 text-sm text-on-surface border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-colors placeholder:text-on-surface-muted/50 resize-y"
      />

      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          data-testid="apply-user-sample-ballot"
          type="button"
          disabled={!canApply}
          onClick={applyText}
          className="bg-primary text-on-primary px-4 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {value.trim() ? copy.update : copy.apply}
        </button>
        <label className="text-xs font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer">
          {copy.upload}
          <input
            data-testid="user-sample-ballot-file"
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        {value.trim() && (
          <span
            data-testid="user-sample-ballot-applied"
            className="text-xs text-on-surface-muted"
          >
            {copy.applied}
          </span>
        )}
      </div>
      {notice && (
        <p className="mt-3 text-xs text-on-surface-muted" role="status">
          {notice}
        </p>
      )}
    </section>
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

      <nav
        className="flex flex-col gap-1 flex-1"
        role="tablist"
        aria-label={t.research.sidebarTitle}
      >
        <div className="mb-2 px-2 py-1 text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.2em]">
          {electionLabel}
        </div>
        {tabs.map(({ key, icon: Icon, labelKey }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
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
  { key: "id", icon: BadgeIcon, labelKey: "tabId" },
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
    <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-lowest shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-50 pb-[env(safe-area-inset-bottom)]">
      <nav
        className="flex justify-around items-stretch"
        role="tablist"
        aria-label="Mobile navigation"
      >
        {mobileTabIcons.map(({ key, icon: Icon, labelKey }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(key)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[56px] min-w-[44px] py-2 transition-colors ${
                isActive
                  ? "text-primary border-t-2 border-primary -mt-px"
                  : "text-on-surface-muted"
              }`}
            >
              <Icon />
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">
                {t.research[labelKey]}
              </span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
}

/* ── Tab Content: Election Timeline ─────────────────────────── */

function getTimelineStatus(
  dateStr: string,
  today: string,
  isRange?: { end: string },
): "passed" | "active" | "imminent" | "upcoming" {
  if (isRange) {
    if (today > isRange.end) return "passed";
    if (today >= dateStr && today <= isRange.end) return "active";
  } else {
    if (today > dateStr) return "passed";
  }
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  const daysUntil = Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntil <= 7) return "imminent";
  return "upcoming";
}

function formatTimelineDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d
    .toLocaleDateString("en-US", { month: "long", day: "2-digit" })
    .replace(/(\w+)\s(\d+)/, (_, m, day) => `${m.toUpperCase()} ${day}`);
}

function TimelineMilestone({
  date,
  label,
  badge,
  status,
  isLast,
}: {
  date: string;
  label: string;
  badge?: string;
  status: "passed" | "active" | "imminent" | "upcoming";
  isLast?: boolean;
}) {
  const dotColors: Record<string, string> = {
    passed: "bg-on-surface-muted/30",
    active: "bg-primary",
    imminent: "bg-accent",
    upcoming: "bg-on-surface-muted/50",
  };
  const badgeColors: Record<string, string> = {
    passed: "bg-surface-high text-on-surface-muted",
    active: "bg-primary text-on-primary",
    imminent: "bg-accent text-on-primary",
    upcoming: "bg-surface-high text-on-surface-muted",
  };
  const borderColor =
    status === "active" || status === "imminent"
      ? "border-primary"
      : "border-outline-variant/30";

  return (
    <div className="flex gap-3 md:gap-6">
      {/* Timeline track */}
      <div className="flex flex-col items-center w-4 shrink-0">
        <div className={`w-3 h-3 rounded-full ${dotColors[status]} shrink-0`} />
        {!isLast && (
          <div className={`w-px flex-1 ${dotColors[status]} opacity-40`} />
        )}
      </div>
      {/* Content */}
      <div className={`flex-1 min-w-0 pb-6 md:pb-8`}>
        <div
          className={`bg-surface-lowest p-4 md:p-6 border-l-4 ${borderColor}`}
        >
          <p className="text-xs text-on-surface-muted font-medium tracking-wide mb-1">
            {formatTimelineDate(date)}
          </p>
          <h4 className="text-lg font-bold text-on-surface mb-2">{label}</h4>
          {badge && (
            <span
              className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${badgeColors[status]}`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line complexity
function DatesView({
  state,
  onTabChange,
}: {
  state: StateElectionData;
  onTabChange: (tab: ResearchTab) => void;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const tl = t.timeline;
  const today = new Date().toISOString().split("T")[0];
  const upcoming = getUpcomingElection(state);

  if (!upcoming) return null;

  const electionDate = new Date(upcoming.date + "T00:00:00");
  const monthDay = electionDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  // Gather milestones from the election's own registration data
  const reg = upcoming.registration ?? state.registration;
  const ev = upcoming.earlyVoting ?? state.earlyVoting;
  const regDeadline = reg.online.deadline ?? reg.byMail.deadline;

  interface Milestone {
    date: string;
    label: string;
    badge?: string;
    status: "passed" | "active" | "imminent" | "upcoming";
  }

  const milestones: Milestone[] = [];

  if (regDeadline) {
    milestones.push({
      date: regDeadline,
      label: tl.registrationDeadline,
      badge: tl.strictDeadline,
      status: getTimelineStatus(regDeadline, today),
    });
  }

  if (ev.available && ev.startDate) {
    milestones.push({
      date: ev.startDate,
      label: tl.earlyVotingBegins,
      badge: tl.periodStarts,
      status: getTimelineStatus(
        ev.startDate,
        today,
        ev.endDate ? { end: ev.endDate } : undefined,
      ),
    });
  }

  if (ev.available && ev.endDate) {
    milestones.push({
      date: ev.endDate,
      label: tl.earlyVotingEnds,
      status: getTimelineStatus(ev.endDate, today),
    });
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4 md:mb-6">
          {tl.officialBadge}
        </span>
        <h2 className="text-3xl md:text-5xl font-black text-on-surface tracking-tighter leading-tight mb-4">
          {tl.headlinePrefix} {monthDay}{" "}
          <em className="not-italic font-black italic text-primary">
            {tl.headlineItalic}
          </em>
        </h2>
        <p className="text-on-surface-muted max-w-md mx-auto leading-relaxed">
          {tl.introText}
        </p>
      </div>

      {/* Timeline */}
      <div className="mb-8">
        {milestones.map((m) => (
          <TimelineMilestone
            key={m.date + m.label}
            date={m.date}
            label={m.label}
            badge={m.badge}
            status={m.status}
            isLast={false}
          />
        ))}
      </div>

      {/* Election Day Hero Card */}
      <div className="flex gap-4 md:gap-6 mb-12 md:mb-16">
        <div className="flex flex-col items-center w-4 shrink-0">
          <div className="w-4 h-4 rotate-45 bg-accent shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-surface-low p-6 md:p-10">
            <p className="text-4xl md:text-6xl font-black text-on-surface tracking-tighter mb-2">
              {electionDate.toLocaleDateString("en-US", {
                month: "long",
                day: "2-digit",
              })}
            </p>
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              {tl.electionDay}
            </span>
            <p className="text-xl md:text-2xl font-bold text-on-surface mb-4">
              {tl.pollsOpen}
            </p>
            <p className="text-on-surface-muted leading-relaxed mb-6">
              {tl.electionDayDescription}
            </p>
            <button
              onClick={() => onTabChange("polling")}
              className="inline-flex items-center gap-2 bg-surface-lowest px-6 py-3 font-bold text-sm text-primary hover:bg-surface-high transition-colors"
            >
              <LocationIcon />
              <span className="uppercase tracking-wider">
                {tl.findPrecinct}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Resources */}
      <div className="mt-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-muted text-center mb-8">
          {tl.quickAccess}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => onTabChange("id")}
            className="w-full flex items-center gap-4 bg-surface-lowest p-5 hover:bg-surface-low transition-colors text-left"
          >
            <BadgeIcon className="text-primary shrink-0" />
            <span className="font-bold text-on-surface uppercase tracking-wider text-sm">
              {tl.voterIdGuide}
            </span>
          </button>
          <a
            href={state.resources.sampleBallotLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 bg-surface-lowest p-5 hover:bg-surface-low transition-colors"
          >
            <DescriptionIcon className="text-primary shrink-0" />
            <span className="font-bold text-on-surface uppercase tracking-wider text-sm">
              {tl.sampleBallot}
            </span>
          </a>
          <button
            onClick={() => onTabChange("polling")}
            className="w-full flex items-center gap-4 bg-surface-lowest p-5 hover:bg-surface-low transition-colors text-left"
          >
            <LocationIcon className="text-primary shrink-0" />
            <span className="font-bold text-on-surface uppercase tracking-wider text-sm">
              {tl.pollingMap}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tab Content: ID Requirements (Editorial) ──────────────── */

const idCards: {
  iconPath: string;
  nameKey: keyof (typeof translations)["en"]["voterId"];
  descKey: keyof (typeof translations)["en"]["voterId"];
}[] = [
  {
    iconPath:
      "M20 7h-5V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM9 12c.83 0 1.5.67 1.5 1.5S9.83 15 9 15s-1.5-.67-1.5-1.5S8.17 12 9 12zm3 6H6v-.75c0-1 2-1.5 3-1.5s3 .5 3 1.5V18zm1-9h-2V4h2v5zm5 7.5h-4V15h4v1.5zm0-3h-4V12h4v1.5z",
    nameKey: "idTxDriverLicense",
    descKey: "idTxDriverLicenseDesc",
  },
  {
    iconPath:
      "M18 11V4c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-2 0H4V4h12v7zm4-7v16H2v2h20c1.1 0 2-.9 2-2V4h-2z",
    nameKey: "idElectionCert",
    descKey: "idElectionCertDesc",
  },
  {
    iconPath:
      "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM4 0h16v2H4V0zm0 22h16v2H4v-2zM12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm4 8H8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1z",
    nameKey: "idPersonalId",
    descKey: "idPersonalIdDesc",
  },
  {
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    nameKey: "idHandgun",
    descKey: "idHandgunDesc",
  },
  {
    iconPath:
      "M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z",
    nameKey: "idMilitary",
    descKey: "idMilitaryDesc",
  },
  {
    iconPath:
      "M5 4v14h14V4H5zm12 12H7V6h10v10zm-5-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z",
    nameKey: "idCitizenship",
    descKey: "idCitizenshipDesc",
  },
  {
    iconPath:
      "M21 5V3H3v2l8 9v5H6v2h12v-2h-5v-5l8-9zM5.66 5h12.69l-1.78 2H7.43L5.66 5zM12 13.16L9.21 10h5.58L12 13.16z",
    nameKey: "idPassport",
    descKey: "idPassportDesc",
  },
];

function IdView({ state }: { state: StateElectionData }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const tv = t.voterId;

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Editorial Header */}
      <section className="mb-8 md:mb-16 border-l-4 md:border-l-8 border-primary pl-4 md:pl-8">
        <span className="text-accent font-bold tracking-widest text-xs uppercase mb-2 block">
          {tv.stateLabel}
        </span>
        <h2 className="text-4xl md:text-7xl font-black text-on-surface tracking-tighter leading-none mb-4 md:mb-6">
          {tv.headline}
        </h2>
        <p className="text-lg md:text-xl text-on-surface-muted max-w-2xl font-medium leading-relaxed">
          {tv.introText}
        </p>
      </section>

      {/* Critical Warning Banner */}
      {state.votingRules.expirationRule && (
        <div className="bg-accent text-on-primary p-4 md:p-6 mb-8 md:mb-16 flex items-start gap-3 md:gap-4">
          <svg
            className="w-6 h-6 mt-0.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <div>
            <h3 className="font-black tracking-tight text-lg mb-1 uppercase">
              {tv.warningTitle}
            </h3>
            <p>{state.votingRules.expirationRule}</p>
          </div>
        </div>
      )}

      {/* Accepted Photo IDs */}
      {state.votingRules.idRequired && (
        <section className="mb-10 md:mb-24">
          <div className="flex items-baseline justify-between mb-6 md:mb-8">
            <h3 className="text-xl md:text-3xl font-black text-on-surface tracking-tight uppercase">
              {tv.acceptedTitle}
            </h3>
            <span className="h-px flex-grow mx-3 md:mx-6 bg-outline-variant/20" />
            <span className="text-primary font-bold text-sm whitespace-nowrap">
              {tv.approvedForms.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-outline-variant/20 border border-outline-variant/20 overflow-hidden">
            {idCards.map(({ iconPath, nameKey, descKey }, i) => (
              <div
                key={nameKey}
                className={`bg-surface-lowest p-4 md:p-8 hover:bg-surface transition-colors ${
                  i === idCards.length - 1
                    ? "md:col-span-2 flex items-start gap-4 md:gap-6"
                    : ""
                }`}
              >
                <svg
                  className="text-primary mb-3 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  width={i === idCards.length - 1 ? 36 : 28}
                  height={i === idCards.length - 1 ? 36 : 28}
                  aria-hidden="true"
                >
                  <path d={iconPath} />
                </svg>
                <div>
                  <h4 className="font-bold text-lg md:text-xl mb-1 text-on-surface">
                    {tv[nameKey]}
                  </h4>
                  <p className="text-on-surface-muted text-sm">{tv[descKey]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No ID? No Problem */}
      {state.votingRules.impedimentDeclaration && (
        <section className="mb-10 md:mb-24 bg-surface-low p-5 md:p-10 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl md:text-4xl font-black text-on-surface tracking-tighter mb-4">
              {tv.noIdTitle}
            </h3>
            <p className="text-base md:text-lg text-on-surface-muted mb-8 md:mb-10 max-w-xl">
              {tv.noIdText}{" "}
              <span className="font-bold text-primary">{tv.ridLabel}</span>{" "}
              {lang === "es"
                ? "y proporcionando un documento de apoyo."
                : "and providing a supporting document."}
            </p>
            {state.votingRules.supportingDocs && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
                <div>
                  <h5 className="text-xs font-black uppercase tracking-widest text-primary mb-4">
                    {tv.supportingDocsTitle}
                  </h5>
                  <ul className="space-y-3">
                    {state.votingRules.supportingDocs.slice(0, 4).map((doc) => (
                      <li
                        key={doc}
                        className="flex items-center gap-2 text-sm font-semibold"
                      >
                        <svg
                          className="w-4 h-4 text-primary shrink-0"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 sm:mt-0">
                  <h5 className="text-xs font-black uppercase tracking-widest text-primary mb-4 invisible sm:visible">
                    &nbsp;
                  </h5>
                  <ul className="space-y-3">
                    {state.votingRules.supportingDocs.slice(4).map((doc) => (
                      <li
                        key={doc}
                        className="flex items-center gap-2 text-sm font-semibold"
                      >
                        <svg
                          className="w-4 h-4 text-primary shrink-0"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="mt-8 md:mt-12">
              <a
                href="https://www.sos.state.tx.us/elections/forms/pol-sub/reasonable-impediment-declaration.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full md:w-auto text-center bg-primary text-on-primary px-6 md:px-8 py-4 font-bold tracking-tight hover:opacity-90 transition-opacity uppercase"
              >
                {tv.downloadDeclaration}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Phones at Polls */}
      <section className="mb-16 bg-surface-lowest p-6 border-l-4 border-accent">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-muted mb-3">
          {tv.phonesTitle}
        </h3>
        <p className="text-sm text-on-surface">
          {state.votingRules.phonesAtPollsDetail}
        </p>
      </section>

      {/* Footer */}
      <footer className="py-6 md:py-12 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-on-surface-muted font-medium text-sm italic text-center md:text-left">
          {tv.footerNotice}
        </p>
        <a
          href={state.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold uppercase tracking-widest text-on-surface-muted/40 hover:text-primary transition-colors"
        >
          {t.stateInfo.countyElectionOffice}
        </a>
      </footer>
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
  const t = translations[lang].polling;
  const upcoming = getUpcomingElection(state);
  const electionDate = upcoming?.date;

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Hero Search Section */}
      <section className="mb-8 md:mb-10">
        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-primary mb-4 md:mb-6 leading-none">
          {t.findYourPrecinct}
        </h2>
        <AddressInput
          onSubmit={onAddressSubmit}
          onSkip={onAddressSkip}
          isLoading={addressStep === "loading"}
        />
      </section>

      {/* Results */}
      {addressStep === "done" && hasPollingResults(pollingData) && (
        <PollingLocationCard
          pollingLocations={pollingData.pollingLocations}
          earlyVoteSites={pollingData.earlyVoteSites}
          fallbackUrl={state.resources.pollingPlaceLookup}
          electionDate={electionDate}
        />
      )}

      {/* Error / Skipped fallback */}
      {(addressStep === "error" ||
        (addressStep === "done" && !hasPollingResults(pollingData))) && (
        <PollingLocationFallback
          fallbackUrl={state.resources.pollingPlaceLookup}
        />
      )}

      {/* Skipped — show gentle prompt */}
      {addressStep === "skipped" && (
        <div className="bg-surface-low p-8 text-center space-y-4">
          <svg
            className="mx-auto text-on-surface-muted/40"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <p className="text-sm text-on-surface-muted">{t.noAddressYet}</p>
          {state.resources.pollingPlaceLookup && (
            <a
              href={state.resources.pollingPlaceLookup}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-primary font-bold text-sm hover:underline"
            >
              {t.countyFallbackLink}
            </a>
          )}
        </div>
      )}

      {/* Waiting for input — show prompt */}
      {addressStep === "input" && (
        <div className="text-center py-8">
          <p className="text-sm text-on-surface-muted">{t.noAddressYet}</p>
        </div>
      )}

      {/* Footer Note */}
      <footer className="mt-16 mb-8 text-center px-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-muted opacity-60">
          {t.pollDataNote}
        </p>
      </footer>
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
  countyName,
  userSampleBallotText,
  onUserSampleBallotTextChange,
  preResearchContext,
  researchReady = true,
  preResearchGate,
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
  countyName?: string;
  userSampleBallotText?: string;
  onUserSampleBallotTextChange?: (text: string) => void;
  preResearchContext?: string;
  researchReady?: boolean;
  preResearchGate?: ReactNode;
}) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const upcoming = getUpcomingElection(state);
  const daysLeft = upcoming ? getDaysUntilElection(upcoming.date) : null;
  const chatAvailable =
    budgetStatus.tier === "normal" || budgetStatus.tier === "notice";
  const hasOfficialContests = getContestCount(pollingData) > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-16 md:py-8 pb-20 md:pb-8">
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

          {/* Budget warning — warm editorial treatment */}
          {copyPasteIsPrimary && (
            <div className="bg-accent/10 border-t-4 border-accent p-6">
              <div className="flex items-start gap-4">
                <svg
                  className="w-5 h-5 mt-0.5 shrink-0 text-accent"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <div>
                  <h4 className="font-black text-lg text-on-surface mb-1 uppercase tracking-tight">
                    {t.budget.softClose}
                  </h4>
                  <p className="text-sm text-on-surface/80 leading-relaxed">
                    {t.budget.resetNote}
                  </p>
                </div>
              </div>
            </div>
          )}

          <BallotDataStatus
            pollingData={pollingData}
            lang={lang}
            state={state}
            countyName={countyName}
          />

          {!researchReady && preResearchGate}

          {onUserSampleBallotTextChange && (
            <UserSampleBallotInput
              value={userSampleBallotText ?? ""}
              onChange={onUserSampleBallotTextChange}
              lang={lang}
              hasOfficialContests={hasOfficialContests}
            />
          )}

          {/* Chat or copy/paste fallback */}
          {researchReady && (chatAvailable || !budgetChecked) && (
            <ChatPanel
              key={`chat-${userSampleBallotText ? userSampleBallotText.slice(0, 48) : "no-sample"}`}
              state={state}
              zipCode={zipCode}
              pollingData={pollingData}
              onBudgetUpdate={onBudgetUpdate}
              voterProfile={voterProfile}
              countyName={countyName}
              userSampleBallotText={userSampleBallotText}
              preResearchContext={preResearchContext}
            />
          )}

          {/* Copy/paste prompt — first-class editorial section */}
          {researchReady && (
            <section className={copyPasteIsPrimary ? "" : "mt-4"}>
              <div className="flex items-center gap-3 mb-4">
                <svg
                  className="text-primary shrink-0"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
                <div>
                  <h3 className="font-black text-lg tracking-tight text-on-surface">
                    {t.promptOutput.ownAiHeading}
                  </h3>
                  <p className="text-sm text-on-surface-muted">
                    {t.promptOutput.ownAiBody}
                  </p>
                </div>
              </div>
              <PromptOutput promptText={promptText} />
            </section>
          )}

          {/* Ballot Builder */}
          {researchReady && <BallotBuilder />}
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
  countyName,
  userSampleBallotText,
  onUserSampleBallotTextChange,
  preResearchContext,
  researchReady,
  preResearchGate,
}: ResearchLayoutProps) {
  const [activeTab, setActiveTab] = useState<ResearchTab>("research");
  const { lang } = useLanguage();

  return (
    <div className="flex flex-1 overflow-hidden h-[calc(100vh-49px)] md:h-[calc(100vh-57px)]">
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
            countyName={countyName}
            userSampleBallotText={userSampleBallotText}
            onUserSampleBallotTextChange={onUserSampleBallotTextChange}
            preResearchContext={preResearchContext}
            researchReady={researchReady}
            preResearchGate={preResearchGate}
          />
        </div>

        {/* Other tabs (mounted on demand) */}
        {activeTab === "dates" && (
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-16 md:py-8 pb-20 md:pb-8">
            <DatesView state={state} onTabChange={setActiveTab} />
          </div>
        )}

        {activeTab === "id" && (
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-16 md:py-8 pb-20 md:pb-8">
            <IdView state={state} />
          </div>
        )}

        {activeTab === "polling" && (
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-16 md:py-8 pb-20 md:pb-8">
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
