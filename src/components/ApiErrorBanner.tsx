"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ApiErrorBannerProps {
  type: "partial" | "full";
  stateElectionUrl?: string;
  stateName?: string;
}

export function ApiErrorBanner({
  type,
  stateElectionUrl,
  stateName,
}: ApiErrorBannerProps) {
  const { t } = useLanguage();

  if (type === "partial") {
    return (
      <div
        className="notice notice-warning"
        data-testid="api-partial-error"
        role="status"
      >
        {t.apiPartialError}
        {stateElectionUrl && (
          <>
            {" "}
            <a
              href={stateElectionUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.stateElectionOfficeLinkText}
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="notice notice-error"
      data-testid="api-full-error"
      role="status"
    >
      {t.apiFullError.replace("{stateName}", stateName ?? "your state")}
      {stateElectionUrl && (
        <>
          {" "}
          <a href={stateElectionUrl} target="_blank" rel="noopener noreferrer">
            {t.stateElectionOfficeLinkText}
          </a>
        </>
      )}
    </div>
  );
}
