"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

interface DataAttributionProps {
  fetchedAt?: string;
  stateElectionUrl?: string;
}

export function DataAttribution({
  fetchedAt,
  stateElectionUrl,
}: DataAttributionProps) {
  const { t } = useLanguage();

  const formattedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="data-attribution" data-testid="data-attribution">
      <p className="attribution-text muted">
        {t.dataAttributionText}
        {stateElectionUrl && (
          <>
            {" "}
            {t.dataAttributionVerify}{" "}
            <a
              href={stateElectionUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.stateElectionOfficeLinkText}
            </a>
          </>
        )}
      </p>
      {formattedTime && (
        <p className="attribution-time muted">
          {t.updatedAtLabel} {formattedTime}
        </p>
      )}
    </div>
  );
}
