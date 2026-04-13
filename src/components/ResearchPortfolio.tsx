"use client";

import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import {
  parseBallotContent,
  type BallotRace,
  type BallotProposition,
} from "../lib/parseBallotContent";
import {
  openPrintableBallot,
  downloadProfileAsText,
} from "../lib/ballot-utils";
import type { PollingLocation } from "./PollingLocationCard";

/* ── Types ─────────────────────────────────────────────────── */

interface PollingData {
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
}

interface ResearchPortfolioProps {
  ballotText: string;
  profileText: string | null;
  pollingData: PollingData | null;
  electionName?: string;
  onBackToChat: () => void;
}

/* ── Helpers ───────────────────────────────────────────────── */

function directionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function generateCalendarUrl(
  title: string,
  location: string,
  date?: string,
): string {
  const eventTitle = encodeURIComponent(title);
  const eventLocation = encodeURIComponent(location);
  // Default to a reasonable election day time range
  const dateParam = date
    ? `&dates=${date.replace(/-/g, "")}T070000/${date.replace(/-/g, "")}T200000`
    : "";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&location=${eventLocation}${dateParam}`;
}

/* ── Icons ─────────────────────────────────────────────────── */

function PrintIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
    </svg>
  );
}

function CalendarAddIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13zm-4-7h-3v3h-2v-3H8v-2h3v-3h2v3h3v2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
    </svg>
  );
}

function BallotIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 17h8v-2H8v2zm0-4h8v-2H8v2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
    </svg>
  );
}

function ArrowBackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
}

function DescriptionIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

function EventRepeatIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M21 12V6c0-1.1-.9-2-2-2h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V10h14v2h2zm-5.36 8c.43 1.45 1.77 2.5 3.36 2.5 1.93 0 3.5-1.57 3.5-3.5S20.93 15.5 19 15.5c-1.59 0-2.93 1.05-3.36 2.5H12v2h3.64zM19 17.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z" />
    </svg>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function PortfolioHeader({ electionName }: { electionName?: string }) {
  const { lang } = useLanguage();
  const t = translations[lang].portfolio;

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
          {t.badge}
        </span>
        {electionName && (
          <span className="text-on-surface-muted text-xs uppercase tracking-widest font-bold">
            {electionName}
          </span>
        )}
      </div>
      <h1 className="text-3xl md:text-5xl font-black text-on-surface tracking-tighter leading-none">
        {t.title}
      </h1>
      <p className="text-lg text-on-surface-variant leading-relaxed">
        {t.subtitle}
      </p>
    </header>
  );
}

function PrintBallotButton({ ballotText }: { ballotText: string }) {
  const { lang } = useLanguage();
  const t = translations[lang].portfolio;

  return (
    <button
      onClick={() => openPrintableBallot(ballotText)}
      className="w-full bg-primary text-white flex items-center justify-between p-6 group active:scale-[0.98] transition-all rounded-sm shadow-sm"
    >
      <div className="text-left">
        <span className="block text-xs uppercase tracking-[0.2em] font-bold mb-1 opacity-80">
          {t.primaryAction}
        </span>
        <span className="text-xl md:text-2xl font-black">{t.printBallot}</span>
      </div>
      <PrintIcon />
    </button>
  );
}

function ProfileDownloadCard({ profileText }: { profileText: string }) {
  const { lang } = useLanguage();
  const t = translations[lang].portfolio;

  return (
    <div className="w-full bg-surface-low border border-outline-variant/30 p-6 relative overflow-hidden flex flex-col gap-6">
      <div className="absolute top-0 right-0 pt-4 pr-4">
        <span className="bg-accent text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
          {translations[lang].portfolio.badge}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 bg-white p-3 shadow-sm border border-outline-variant/20">
            <DescriptionIcon />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">
              {t.profileManifest}
            </span>
            <h3 className="text-lg font-black text-on-surface mb-0.5 break-all">
              {t.profileFilename}
            </h3>
            <p className="text-xs font-mono text-on-surface-variant opacity-70">
              {t.profileSize}
            </p>
          </div>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed w-full">
          {t.profileDescription}
        </p>
      </div>
      <div className="space-y-4">
        <button
          onClick={() => downloadProfileAsText(profileText)}
          className="w-full py-4 bg-primary text-white font-black text-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <DownloadIcon />
          {t.downloadProfile}
        </button>
        <div className="flex items-start gap-3 pt-2 border-t border-outline-variant/20">
          <span className="text-primary shrink-0 mt-0.5">
            <ShieldIcon />
          </span>
          <p className="text-[11px] leading-relaxed text-on-surface-variant">
            <span className="font-black text-on-surface uppercase tracking-wider">
              {t.privacyProtocol}
            </span>{" "}
            {t.privacyDetail}
          </p>
        </div>
      </div>
    </div>
  );
}

function VotingDestinationSection({
  pollingData,
}: {
  pollingData: PollingData;
}) {
  const { lang } = useLanguage();
  const t = translations[lang].portfolio;
  const primary =
    pollingData.pollingLocations[0] || pollingData.earlyVoteSites[0];

  if (!primary) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-outline-variant/30 pb-4">
        <h3 className="text-2xl font-black tracking-tight uppercase">
          {t.votingDestination}
        </h3>
      </div>
      <div className="bg-surface-low p-6 rounded-sm space-y-6 border border-outline-variant/20">
        <div className="space-y-4">
          <h3 className="text-2xl font-black">{primary.name}</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-primary shrink-0 mt-0.5">
                <LocationIcon />
              </span>
              <div>
                <p className="font-bold">{primary.address}</p>
              </div>
            </div>
            {primary.hours && (
              <div className="flex items-start gap-3">
                <span className="text-primary shrink-0 mt-0.5">
                  <ScheduleIcon />
                </span>
                <div>
                  <p className="font-bold">{primary.hours}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <a
            href={directionsUrl(primary.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-primary text-white py-3 font-bold text-sm text-center hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <LocationIcon />
            {t.getDirections}
          </a>
          <a
            href={generateCalendarUrl("Election Day", primary.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface-high text-primary p-3 flex items-center justify-center active:scale-95 transition-transform border border-outline-variant/20"
            aria-label={t.addToCalendar}
          >
            <CalendarAddIcon />
          </a>
        </div>

        {/* Early voting schedule */}
        {pollingData.earlyVoteSites.length > 0 && (
          <div className="pt-6 border-t border-outline-variant/30 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-primary">
                <EventRepeatIcon />
              </span>
              <h4 className="text-lg font-black uppercase tracking-tight">
                {t.earlyVotingSchedule}
              </h4>
            </div>
            <div className="space-y-3">
              {pollingData.earlyVoteSites.map((site, i) => (
                <div
                  key={i}
                  className="bg-white p-4 shadow-sm border border-outline-variant/10"
                >
                  <div className="text-primary font-black text-xs uppercase tracking-widest mb-2">
                    {site.name}
                  </div>
                  {site.hours && (
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">
                        {site.address}
                      </span>
                      <span className="font-bold">{site.hours}</span>
                    </div>
                  )}
                  {site.notes && (
                    <p className="text-xs text-on-surface-muted mt-1">
                      {site.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-on-surface-muted pt-2">
          {t.pollingDataNote}
        </p>
      </div>
    </div>
  );
}

function CandidateSelectionCard({ race }: { race: BallotRace }) {
  const isFirst = false; // Could highlight first race with primary border
  return (
    <div
      className={`bg-surface-lowest border-l-4 ${isFirst ? "border-primary" : "border-outline-variant"} p-4 md:p-6 space-y-3 md:space-y-4`}
    >
      <div>
        <span className="text-xs uppercase font-black tracking-widest text-accent mb-2 block">
          {race.office}
        </span>
        <h4 className="text-xl md:text-3xl font-black leading-tight mb-1">
          {race.candidate}
        </h4>
        {race.party && (
          <p className="text-xs text-on-surface-muted uppercase font-bold tracking-wider">
            {race.party}
          </p>
        )}
      </div>
      {race.reason && (
        <p className="text-sm italic text-on-surface-variant leading-relaxed">
          &ldquo;{race.reason}&rdquo;
        </p>
      )}
    </div>
  );
}

function SelectedCandidatesSection({ races }: { races: BallotRace[] }) {
  const { lang } = useLanguage();
  const t = translations[lang].portfolio;

  if (races.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-outline-variant/30 pb-4">
        <h3 className="text-2xl font-black tracking-tight uppercase">
          {t.selectedCandidates}
        </h3>
        <span className="text-on-surface-muted text-xs font-bold">
          {t.selectionsCount(races.length)}
        </span>
      </div>
      <div className="flex flex-col gap-8">
        {races.map((race, i) => (
          <CandidateSelectionCard key={i} race={race} />
        ))}
      </div>
    </div>
  );
}

function PropositionVoteCard({ prop }: { prop: BallotProposition }) {
  const isYes = prop.vote === "yes";
  return (
    <div className="bg-surface-low p-6 rounded-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xl font-black mb-1">{prop.number}</h4>
          {prop.title && (
            <p className="text-xs font-bold text-on-surface-muted uppercase tracking-widest">
              {prop.title}
            </p>
          )}
        </div>
        <span
          className={`px-4 py-1 text-xs font-black uppercase ${
            isYes ? "bg-primary text-white" : "bg-on-surface-variant text-white"
          }`}
        >
          {isYes ? "Yes" : "No"}
        </span>
      </div>
      {prop.description && (
        <p className="text-on-surface-variant leading-relaxed text-sm">
          {prop.description}
        </p>
      )}
    </div>
  );
}

function BallotMeasuresSection({
  propositions,
}: {
  propositions: BallotProposition[];
}) {
  const { lang } = useLanguage();
  const t = translations[lang].portfolio;

  if (propositions.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-outline-variant/30 pb-4">
        <h3 className="text-2xl font-black tracking-tight uppercase">
          {t.ballotMeasures}
        </h3>
        <span className="text-on-surface-muted text-xs font-bold">
          {t.decisionsCount(propositions.length)}
        </span>
      </div>
      <div className="flex flex-col gap-6">
        {propositions.map((prop, i) => (
          <PropositionVoteCard key={i} prop={prop} />
        ))}
      </div>
    </div>
  );
}

function PortfolioFooter({ ballotText }: { ballotText: string }) {
  const { lang } = useLanguage();
  const t = translations[lang].portfolio;

  return (
    <div className="pt-8 md:pt-12 pb-8 border-t-2 border-on-surface space-y-6 md:space-y-8">
      {/* Civic Integrity Notice */}
      <div className="bg-surface-high/50 p-6 border-l-4 border-primary">
        <h5 className="text-xs font-black uppercase mb-2">
          {t.civicIntegrityTitle}
        </h5>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {t.civicIntegrityBody}
        </p>
      </div>

      {/* Share + Final Print CTA */}
      <div className="flex flex-col gap-4">
        <button className="flex items-center gap-3 font-bold text-primary active:opacity-60 py-2">
          <ShareIcon />
          <span>{t.shareTemplate}</span>
        </button>

        <div className="w-full bg-white border border-outline-variant/30 p-5 md:p-8 rounded-sm space-y-4 md:space-y-6 shadow-sm">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="bg-surface-low p-3 md:p-5 rounded-xl flex items-center justify-center border border-outline-variant/10">
              <span className="text-primary">
                <BallotIcon />
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-on-surface tracking-tighter uppercase">
              {t.readyToVote}
            </h2>
          </div>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            {t.readyToVoteBody}
          </p>
          <button
            onClick={() => openPrintableBallot(ballotText)}
            className="w-full bg-primary text-white py-6 flex items-center justify-center gap-3 shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <PrintIcon />
            <span className="text-2xl font-black uppercase tracking-tight">
              {t.printBallot}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export function ResearchPortfolio({
  ballotText,
  profileText,
  pollingData,
  electionName,
  onBackToChat,
}: ResearchPortfolioProps) {
  const { lang } = useLanguage();
  const t = translations[lang].portfolio;

  const parsed = parseBallotContent(ballotText);
  const hasPolling =
    pollingData &&
    (pollingData.pollingLocations.length > 0 ||
      pollingData.earlyVoteSites.length > 0);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-8 lg:px-20 pb-24 md:pb-8 bg-surface">
      <div className="max-w-xl mx-auto space-y-8 md:space-y-12">
        {/* Back button */}
        <button
          onClick={onBackToChat}
          className="flex items-center gap-2 text-sm font-bold text-primary hover:opacity-80 transition-opacity"
        >
          <ArrowBackIcon />
          {t.backToChat}
        </button>

        {/* Header */}
        <PortfolioHeader electionName={electionName} />

        {/* Primary Actions */}
        <div className="flex flex-col gap-4">
          <PrintBallotButton ballotText={ballotText} />
          {profileText && <ProfileDownloadCard profileText={profileText} />}
        </div>

        {/* Polling Location */}
        {hasPolling && <VotingDestinationSection pollingData={pollingData} />}

        {/* Candidate Selections */}
        <SelectedCandidatesSection races={parsed.races} />

        {/* Ballot Measures */}
        <BallotMeasuresSection propositions={parsed.propositions} />

        {/* Footer */}
        <PortfolioFooter ballotText={ballotText} />
      </div>
    </div>
  );
}
