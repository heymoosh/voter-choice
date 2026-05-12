"use client";

import { useTranslation } from "@/lib/i18n/I18nContext";

interface DataAttributionProps {
  fetchedAt?: number;
  stateElectionWebsite?: string;
}

export function DataAttribution({
  fetchedAt,
  stateElectionWebsite,
}: DataAttributionProps) {
  const { t } = useTranslation();

  const formattedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const attributionText =
    t.liveData?.attribution ??
    "Election data from Google Civic Information and live web search via Anthropic.";
  const lastUpdatedLabel = t.liveData?.lastUpdated ?? "Updated";
  const verifyText = "Verify at";

  return (
    <div
      data-testid="data-attribution"
      className="text-xs text-gray-400 space-y-0.5 pt-2 border-t border-gray-100"
    >
      <p>{attributionText}</p>
      <p className="flex flex-wrap gap-1">
        {formattedTime && (
          <span>
            {lastUpdatedLabel} {formattedTime}.
          </span>
        )}
        {stateElectionWebsite && (
          <span>
            {verifyText}{" "}
            <a
              href={stateElectionWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 focus:outline-2 focus:outline-blue-500 rounded"
            >
              state election office
            </a>
            .
          </span>
        )}
      </p>
    </div>
  );
}
