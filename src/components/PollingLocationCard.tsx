"use client";

import { Card } from "./ui/Card";
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
}

function directionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function LocationEntry({ location }: { location: PollingLocation }) {
  const { lang } = useLanguage();
  const t = translations[lang].polling;

  return (
    <div>
      {location.name && (
        <p className="font-semibold text-on-surface">{location.name}</p>
      )}
      <p className="text-sm text-on-surface-muted">{location.address}</p>
      {location.hours && (
        <p className="text-sm text-on-surface-muted mt-0.5">
          <span className="font-medium">{t.hours}:</span> {location.hours}
        </p>
      )}
      {location.notes && (
        <p className="text-xs text-on-surface-muted mt-0.5">{location.notes}</p>
      )}
      <a
        href={directionsUrl(location.address)}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="polling-directions-link"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-1.5"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        {t.getDirections}
      </a>
    </div>
  );
}

export function PollingLocationCard({
  pollingLocations,
  earlyVoteSites,
  fallbackUrl,
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

  return (
    <div className="space-y-4">
      {hasPolling && (
        <Card data-testid="polling-location">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-on-surface-muted mb-2">
            {t.pollingPlace}
          </h3>
          <div className="space-y-4">
            {pollingLocations.map((loc, i) => (
              <LocationEntry key={i} location={loc} />
            ))}
          </div>
        </Card>
      )}

      {hasEarly && (
        <Card data-testid="early-vote-locations">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-on-surface-muted mb-2">
            {t.earlyVoteSites}
          </h3>
          <div className="space-y-4">
            {earlyVoteSites.map((loc, i) => (
              <LocationEntry key={i} location={loc} />
            ))}
          </div>
        </Card>
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
