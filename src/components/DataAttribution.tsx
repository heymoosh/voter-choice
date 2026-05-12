"use client";

import { useLanguage } from "@/lib/i18n";

interface DataAttributionProps {
  fetchedAt?: string;
  stateElectionUrl?: string;
}

export default function DataAttribution({
  fetchedAt,
  stateElectionUrl,
}: DataAttributionProps) {
  const { t } = useLanguage();

  const formattedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      data-testid="data-attribution"
      className="pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1"
    >
      <p>{t("dataAttribution")}</p>
      {formattedTime && (
        <p>
          {t("dataUpdated")} {formattedTime}
        </p>
      )}
      {stateElectionUrl && (
        <p>
          Verify at{" "}
          <a
            href={stateElectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            your state election office
          </a>
          .
        </p>
      )}
    </div>
  );
}
