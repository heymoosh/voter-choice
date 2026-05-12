"use client";

import type { PollingLocation as PollingLocationData } from "@/types/liveElection";
import { useTranslation } from "@/lib/i18n/I18nContext";

interface PollingLocationProps {
  location: PollingLocationData;
}

export function PollingLocation({ location }: PollingLocationProps) {
  const { t } = useTranslation();

  return (
    <section
      data-testid="polling-location"
      aria-labelledby="polling-location-heading"
    >
      <h3
        id="polling-location-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
      >
        {t.liveData?.pollingLocation ?? "Polling Location"}
      </h3>
      <div className="space-y-1 text-gray-900">
        <p className="font-medium">{location.name}</p>
        <p className="text-gray-600 text-sm">{location.address}</p>
        {location.hours && (
          <p className="text-gray-500 text-sm">{location.hours}</p>
        )}
        {location.notes && (
          <p className="text-gray-500 text-xs italic">{location.notes}</p>
        )}
      </div>
    </section>
  );
}
