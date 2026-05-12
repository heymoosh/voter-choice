"use client";

import type { ApiError } from "@/types/liveElection";
import { useTranslation } from "@/lib/i18n/I18nContext";

interface ApiErrorBannerProps {
  errors: ApiError[];
  isFullFailure?: boolean;
  stateElectionWebsite?: string;
  stateName?: string;
}

export function ApiErrorBanner({
  errors,
  isFullFailure = false,
  stateElectionWebsite,
  stateName,
}: ApiErrorBannerProps) {
  const { t } = useTranslation();

  if (errors.length === 0) return null;

  if (isFullFailure) {
    return (
      <div
        data-testid="api-full-error"
        role="alert"
        className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2"
      >
        <p className="font-semibold text-amber-900 text-sm">
          {t.liveData?.errors?.apiFull ??
            `We're having trouble loading live election data. Here's what we know about voting${stateName ? ` in ${stateName}` : ""}.`}
        </p>
        <p className="text-amber-800 text-sm">
          {stateElectionWebsite ? (
            <>
              Visit{" "}
              <a
                href={stateElectionWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-900 focus:outline-2 focus:outline-blue-500 rounded"
              >
                your state election office
              </a>{" "}
              for current dates and deadlines.
            </>
          ) : (
            "Visit your state election office for current dates and deadlines."
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="api-partial-error"
      role="alert"
      className="bg-blue-50 border border-blue-200 rounded-xl p-3"
    >
      <p className="text-blue-800 text-sm">
        {t.liveData?.errors?.apiPartial ??
          "Some election data is temporarily unavailable. The information shown is current."}{" "}
        {stateElectionWebsite && (
          <a
            href={stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-900 focus:outline-2 focus:outline-blue-500 rounded"
          >
            Full details at your state election office.
          </a>
        )}
      </p>
    </div>
  );
}
