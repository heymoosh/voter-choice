"use client";

import type { PollingLocation as PollingLocationData } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

interface PollingLocationProps {
  pollingLocation?: PollingLocationData;
  isLoading?: boolean;
}

export default function PollingLocation({
  pollingLocation,
  isLoading = false,
}: PollingLocationProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div
        data-testid="data-loading"
        aria-busy="true"
        className="animate-pulse space-y-2"
      >
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (!pollingLocation) {
    return null;
  }

  const { locationName, address, pollingHours, notes } = pollingLocation;
  const addressLine = [address.line1, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div data-testid="polling-location" className="space-y-1">
      <h3 className="text-sm font-semibold text-gray-700">
        {t("pollingLocationHeading")}
      </h3>
      {locationName && (
        <p className="text-sm font-medium text-gray-900">{locationName}</p>
      )}
      {addressLine && <p className="text-sm text-gray-700">{addressLine}</p>}
      {pollingHours && <p className="text-xs text-gray-500">{pollingHours}</p>}
      {notes && <p className="text-xs text-gray-500 italic">{notes}</p>}
    </div>
  );
}
