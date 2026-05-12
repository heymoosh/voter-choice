"use client";

/**
 * LiveElectionPanel — Phase 3 live data display.
 * Shows polling location, ballot contests, candidate enrichment,
 * loading states, and error states.
 *
 * Uses data-testid attributes from PHASE3_SPEC.md.
 */

import { useState, useCallback } from "react";
import type {
  LiveElectionData,
  BallotContest,
  CandidateEnrichment,
} from "@/lib/api-types";
import { useLanguage } from "@/lib/i18n";

// ---- Skeleton loading component --------------------------------------------

function SkeletonLine({ width = "w-full" }: { width?: string }) {
  return (
    <div
      className={`h-4 bg-gray-200 rounded animate-pulse ${width}`}
      aria-hidden="true"
    />
  );
}

export function LoadingSkeleton() {
  return (
    <div
      data-testid="data-loading"
      aria-label="Loading election data"
      className="space-y-4"
    >
      <div className="space-y-2">
        <SkeletonLine width="w-1/3" />
        <SkeletonLine width="w-2/3" />
        <SkeletonLine width="w-1/2" />
      </div>
      <div className="space-y-2">
        <SkeletonLine width="w-1/4" />
        <SkeletonLine />
        <SkeletonLine />
        <SkeletonLine width="w-3/4" />
      </div>
    </div>
  );
}

// ---- Error banners ---------------------------------------------------------

export function PartialErrorBanner({
  stateElectionUrl,
  t,
}: {
  stateElectionUrl: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  return (
    <div
      data-testid="api-partial-error"
      role="alert"
      className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm"
    >
      <p>
        {t.dataPartialError}{" "}
        <a
          href={stateElectionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          {t.stateElectionWebsiteLink}
        </a>{" "}
        {t.dataVerifyLink}.
      </p>
    </div>
  );
}

export function FullErrorBanner({
  stateName,
  stateElectionUrl,
  t,
}: {
  stateName: string;
  stateElectionUrl: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  return (
    <div
      data-testid="api-full-error"
      role="alert"
      className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm"
    >
      <p>
        {t.dataFullError.replace("{stateName}", stateName)}{" "}
        <a
          href={stateElectionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          {t.stateElectionWebsiteLink}
        </a>{" "}
        {t.dataVerifyLink}.
      </p>
    </div>
  );
}

// ---- Polling location component --------------------------------------------

function PollingLocationSection({
  location,
  t,
}: {
  location: LiveElectionData["pollingLocation"];
  t: ReturnType<typeof useLanguage>["t"];
}) {
  if (!location) {
    return (
      <div
        data-testid="polling-location"
        className="mb-4 pb-4 border-b border-gray-100"
      >
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
          {t.pollingLocationLabel}
        </h3>
        <p className="text-sm text-gray-500">{t.pollingLocationNotFound}</p>
      </div>
    );
  }

  return (
    <div
      data-testid="polling-location"
      className="mb-4 pb-4 border-b border-gray-100"
    >
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
        {t.pollingLocationLabel}
      </h3>
      <p className="text-sm font-medium text-gray-800">
        {location.locationName}
      </p>
      <p className="text-sm text-gray-600">{location.address}</p>
      {location.hours && (
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-medium">{t.pollingLocationHours} </span>
          {location.hours}
        </p>
      )}
      {location.notes && (
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium">{t.pollingLocationNotes} </span>
          {location.notes}
        </p>
      )}
    </div>
  );
}

// ---- Candidate detail component --------------------------------------------

function CandidateDetail({
  candidate,
  office,
  state,
  t,
}: {
  candidate: BallotContest["candidates"][0];
  office: string;
  state: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrichment, setEnrichment] = useState<CandidateEnrichment | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleExpand = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (enrichment) return; // already loaded

    setLoading(true);
    setError(null);

    try {
      const resp = await fetch("/api/candidate-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidate.name,
          office,
          state,
        }),
      });
      const data = (await resp.json()) as {
        enrichment: CandidateEnrichment | null;
        error: string | null;
      };
      if (data.enrichment) {
        setEnrichment(data.enrichment);
      } else {
        setError(data.error ?? t.candidateResearchError);
      }
    } catch {
      setError(t.candidateResearchError);
    } finally {
      setLoading(false);
    }
  }, [open, enrichment, candidate.name, office, state, t]);

  return (
    <div data-testid="candidate-detail" className="mb-3 last:mb-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{candidate.name}</p>
          {candidate.party && (
            <p className="text-xs text-gray-500">{candidate.party}</p>
          )}
        </div>
        <button
          onClick={handleExpand}
          className="text-xs text-blue-700 underline hover:no-underline whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
          aria-expanded={open}
          aria-label={`${open ? t.closeVotingRecord : t.viewVotingRecord}: ${candidate.name}`}
        >
          {open ? t.closeVotingRecord : t.viewVotingRecord}
        </button>
      </div>

      {open && (
        <div className="mt-2 pl-3 border-l-2 border-blue-200">
          {loading && (
            <p className="text-xs text-gray-500 italic">
              {t.candidateResearching}
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {enrichment && (
            <div className="space-y-2 text-xs text-gray-700">
              {enrichment.summary && (
                <div>
                  <p className="font-medium text-gray-600 mb-0.5">
                    {t.candidateSummaryLabel}
                  </p>
                  <p>{enrichment.summary}</p>
                </div>
              )}
              {enrichment.votingRecord &&
                enrichment.votingRecord !== "Information not available" && (
                  <div>
                    <p className="font-medium text-gray-600 mb-0.5">
                      {t.candidateVotingRecordLabel}
                    </p>
                    <p>{enrichment.votingRecord}</p>
                  </div>
                )}
              {enrichment.topDonors &&
                enrichment.topDonors !== "Information not available" && (
                  <div>
                    <p className="font-medium text-gray-600 mb-0.5">
                      {t.candidateDonorsLabel}
                    </p>
                    <p>{enrichment.topDonors}</p>
                  </div>
                )}
              {enrichment.endorsements &&
                enrichment.endorsements !== "Information not available" && (
                  <div>
                    <p className="font-medium text-gray-600 mb-0.5">
                      {t.candidateEndorsementsLabel}
                    </p>
                    <p>{enrichment.endorsements}</p>
                  </div>
                )}
              {enrichment.sources && enrichment.sources.length > 0 && (
                <div>
                  <p className="font-medium text-gray-600 mb-0.5">
                    {t.candidateSourcesLabel}
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {enrichment.sources.map((src, i) => (
                      <li key={i} className="text-blue-700 truncate">
                        {src.startsWith("http") ? (
                          <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                          >
                            {src}
                          </a>
                        ) : (
                          src
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Ballot contests component ---------------------------------------------

function BallotContestsSection({
  contests,
  stateCode,
  t,
}: {
  contests: BallotContest[];
  stateCode: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  if (contests.length === 0) {
    return (
      <div
        data-testid="ballot-contests"
        className="mb-4 pb-4 border-b border-gray-100"
      >
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
          {t.ballotContestsLabel}
        </h3>
        <p className="text-sm text-gray-500">{t.ballotContestsNone}</p>
      </div>
    );
  }

  return (
    <div
      data-testid="ballot-contests"
      className="mb-4 pb-4 border-b border-gray-100"
    >
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
        {t.ballotContestsLabel}
      </h3>
      <div className="space-y-4">
        {contests.map((contest, ci) => (
          <div key={ci} className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-800 mb-0.5">
              {contest.office}
            </p>
            {contest.district && (
              <p className="text-xs text-gray-500 mb-2">{contest.district}</p>
            )}
            {contest.type === "Referendum" && contest.referendumBrief ? (
              <p className="text-xs text-gray-600 mb-2">
                {contest.referendumBrief}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  {t.candidatesLabel}
                </p>
                {contest.candidates.map((c, idx) => (
                  <CandidateDetail
                    key={idx}
                    candidate={c}
                    office={contest.office}
                    state={stateCode}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Data attribution footer -----------------------------------------------

function DataAttribution({
  fetchedAt,
  stateElectionUrl,
  t,
}: {
  fetchedAt: string;
  stateElectionUrl: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const date = new Date(fetchedAt);
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      data-testid="data-attribution"
      className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400"
    >
      <p>
        {t.dataAttributionLabel}{" "}
        <a
          href={stateElectionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          {t.stateElectionWebsiteLink}
        </a>
        .
      </p>
      <p className="mt-0.5">
        {t.dataLastUpdated.replace("{timestamp}", timeStr)}
      </p>
    </div>
  );
}

// ---- Main panel ------------------------------------------------------------

interface LiveElectionPanelProps {
  data: LiveElectionData;
  partial: boolean;
  fallback: boolean;
  stateElectionUrl: string;
}

export function LiveElectionPanel({
  data,
  partial,
  fallback,
  stateElectionUrl,
}: LiveElectionPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="mt-4">
      {/* Error banners */}
      {fallback && (
        <FullErrorBanner
          stateName={data.stateName}
          stateElectionUrl={stateElectionUrl}
          t={t}
        />
      )}
      {partial && !fallback && (
        <PartialErrorBanner stateElectionUrl={stateElectionUrl} t={t} />
      )}

      {/* Polling location */}
      <PollingLocationSection location={data.pollingLocation} t={t} />

      {/* Ballot contests */}
      <BallotContestsSection
        contests={data.contests}
        stateCode={data.stateCode}
        t={t}
      />

      {/* Data attribution */}
      <DataAttribution
        fetchedAt={data.fetchedAt}
        stateElectionUrl={stateElectionUrl}
        t={t}
      />
    </div>
  );
}
