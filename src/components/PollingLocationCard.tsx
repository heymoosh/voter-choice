"use client";

import { Notice } from "./ui/Notice";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

export interface PollingLocation {
  name: string;
  address: string;
  hours: string;
  notes: string;
}

interface PollingLocationCardProps {
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
  fallbackUrl?: string;
  electionDate?: string;
}

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
  const dateParam = date
    ? `&dates=${date.replace(/-/g, "")}T070000/${date.replace(/-/g, "")}T200000`
    : "";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&location=${eventLocation}${dateParam}`;
}

function generateIcsContent(
  title: string,
  location: string,
  hours: string,
  date?: string,
): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const dateStr = date ? date.replace(/-/g, "") : "";
  const dtStart = dateStr ? `${dateStr}T070000` : now;
  const dtEnd = dateStr ? `${dateStr}T200000` : now;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VoterChoice//EN",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${hours ? `Hours: ${hours}` : "Check with your county election office for hours."}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadIcs(
  title: string,
  location: string,
  hours: string,
  date?: string,
): void {
  const content = generateIcsContent(title, location, hours, date);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "election-day.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ── Icons ─────────────────────────────────────────────────── */

function DirectionsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z" />
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
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13zm-4-7h-3v3h-2v-3H8v-2h3V8h2v3h3v2z" />
    </svg>
  );
}

function AccessibleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
    </svg>
  );
}

/* ── Primary Location Card ─────────────────────────────────── */

function PrimaryLocationCard({
  location,
  earlyVoteSites,
  electionDate,
}: {
  location: PollingLocation;
  earlyVoteSites: PollingLocation[];
  electionDate?: string;
}) {
  const { lang } = useLanguage();
  const t = translations[lang].polling;

  const earlyHours = earlyVoteSites.length > 0 ? earlyVoteSites[0].hours : null;
  const earlyNotes = earlyVoteSites.length > 0 ? earlyVoteSites[0].notes : null;

  return (
    <div className="bg-surface-lowest overflow-hidden shadow-sm">
      {/* Location Info */}
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-start mb-4 md:mb-6">
          <div className="flex-grow min-w-0">
            <h3 className="text-xl md:text-2xl font-black text-on-surface leading-tight mb-1">
              {location.name || t.pollingPlace}
            </h3>
            <p className="text-on-surface-muted text-sm font-medium">
              {location.address}
            </p>
            {location.notes && (
              <div className="flex items-center gap-1.5 mt-1 text-on-surface-muted/80 font-medium">
                <AccessibleIcon />
                <span className="text-[11px] uppercase tracking-wide">
                  {t.adaAccessible}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8 bg-surface-low p-3 md:p-4">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-muted mb-1">
              {t.electionDayLabel}
            </span>
            <p className="text-xs font-black">{location.hours || "\u2014"}</p>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-muted mb-1">
              {t.earlyVotingLabel}
            </span>
            <p className="text-xs font-black">
              {earlyHours || earlyNotes || "\u2014"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() =>
              downloadIcs(
                t.electionDayLabel,
                location.address,
                location.hours,
                electionDate,
              )
            }
            className="w-full py-4 min-h-[48px] bg-primary text-on-primary font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all"
          >
            <CalendarAddIcon />
            {t.addToCalendarFull}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={directionsUrl(location.address)}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="polling-directions-link"
              className="py-3 min-h-[44px] bg-surface-high text-on-surface font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-surface-low transition-colors"
            >
              <DirectionsIcon />
              {t.directions}
            </a>
            <a
              href={generateCalendarUrl(
                t.electionDayLabel,
                location.address,
                electionDate,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 min-h-[44px] bg-surface-high text-on-surface font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-surface-low transition-colors"
            >
              <CalendarAddIcon />
              {t.addToCalendar}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Alternative Location Card ─────────────────────────────── */

function AlternativeLocationCard({ location }: { location: PollingLocation }) {
  const { lang } = useLanguage();
  const t = translations[lang].polling;

  return (
    <a
      href={directionsUrl(location.address)}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-6 bg-surface-low hover:bg-surface-lowest transition-all group border-l-4 border-transparent hover:border-primary"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h5 className="text-lg font-black group-hover:text-primary transition-colors">
            {location.name || t.pollingPlace}
          </h5>
          <p className="text-sm text-on-surface-muted">{location.address}</p>
          {location.notes && (
            <div className="flex items-center gap-1 text-on-surface-muted/80 font-medium">
              <AccessibleIcon />
              <span className="text-[10px] uppercase tracking-wide">
                {t.adaAccessible}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            {location.hours && (
              <span className="text-[10px] font-black bg-surface-high text-on-surface-muted px-2 py-0.5 uppercase tracking-tighter">
                {location.hours}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            {t.directions} &rarr;
          </span>
        </div>
      </div>
    </a>
  );
}

/* ── Main Exports ──────────────────────────────────────────── */

export function PollingLocationCard({
  pollingLocations,
  earlyVoteSites,
  fallbackUrl,
  electionDate,
}: PollingLocationCardProps) {
  const { lang } = useLanguage();
  const t = translations[lang].polling;

  const hasPolling = pollingLocations.length > 0;
  const hasEarly = earlyVoteSites.length > 0;

  if (!hasPolling && !hasEarly) {
    return (
      <div data-testid="civic-api-error-fallback">
        <Notice variant="info">
          <p>{t.fallbackMessage}</p>
          {fallbackUrl && (
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium text-sm mt-1 inline-block"
            >
              {t.fallbackLink}
            </a>
          )}
        </Notice>
      </div>
    );
  }

  const primary = pollingLocations[0] ?? earlyVoteSites[0];
  const alternatives = [
    ...pollingLocations.slice(1),
    ...(pollingLocations.length > 0 ? earlyVoteSites : earlyVoteSites.slice(1)),
  ];

  return (
    <div className="space-y-10">
      {/* Primary Recommendation */}
      <section>
        <div className="text-[11px] font-bold uppercase tracking-widest text-on-surface-muted mb-4">
          {t.primaryRecommendation}
        </div>
        <PrimaryLocationCard
          location={primary}
          earlyVoteSites={earlyVoteSites}
          electionDate={electionDate}
        />
      </section>

      {/* Alternative Locations */}
      {alternatives.length > 0 && (
        <section className="space-y-6">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-muted pb-2">
            {t.alternativeLocations}
          </h4>
          {alternatives.map((loc, i) => (
            <AlternativeLocationCard key={i} location={loc} />
          ))}
        </section>
      )}
    </div>
  );
}

export function PollingLocationFallback({
  fallbackUrl,
}: {
  fallbackUrl?: string;
}) {
  const { lang } = useLanguage();
  const t = translations[lang].polling;

  return (
    <div data-testid="civic-api-error-fallback">
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
        <h3 className="text-lg font-black text-on-surface">
          {t.countyFallbackTitle}
        </h3>
        <p className="text-sm text-on-surface-muted max-w-md mx-auto">
          {t.countyFallbackBody}
        </p>
        {fallbackUrl && (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary text-on-primary px-6 py-3 font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-all mt-2"
          >
            {t.countyFallbackLink}
          </a>
        )}
      </div>
    </div>
  );
}
