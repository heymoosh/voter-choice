"use client";

import { useLanguage } from "@/lib/i18n";

interface ApiErrorBannerProps {
  type: "partial" | "full";
  stateElectionUrl?: string;
  stateName?: string;
}

export default function ApiErrorBanner({
  type,
  stateElectionUrl,
  stateName,
}: ApiErrorBannerProps) {
  const { t } = useLanguage();

  if (type === "full") {
    return (
      <div
        data-testid="api-full-error"
        role="alert"
        className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm"
      >
        <p className="font-semibold text-amber-800">{t("apiFullError")}</p>
        {stateElectionUrl && (
          <a
            href={stateElectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-700 underline hover:text-amber-900 mt-1 block"
          >
            {stateName
              ? `${stateName} election office`
              : "State election office"}{" "}
            &rarr;
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="api-partial-error"
      role="alert"
      className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm"
    >
      <p className="text-blue-700">
        {t("apiPartialError")}
        {stateElectionUrl && (
          <>
            {" "}
            <a
              href={stateElectionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-900"
            >
              {stateName
                ? `${stateName} election office`
                : "State election office"}
            </a>
            {" for complete details."}
          </>
        )}
      </p>
    </div>
  );
}
