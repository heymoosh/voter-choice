"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { PollingLocationInfo } from "@/lib/civic/types";

interface PollingLocationProps {
  location: PollingLocationInfo;
}

export function PollingLocation({ location }: PollingLocationProps) {
  const { t } = useLanguage();

  return (
    <div className="metric-card" data-testid="polling-location">
      <p className="metric-label">{t.pollingLocationLabel}</p>
      {location.name && <p className="metric-value">{location.name}</p>}
      <p className="muted">{location.address}</p>
      {location.pollingHours && (
        <p className="muted">
          {t.pollingHoursLabel}: {location.pollingHours}
        </p>
      )}
      {location.notes && <p className="muted">{location.notes}</p>}
    </div>
  );
}
