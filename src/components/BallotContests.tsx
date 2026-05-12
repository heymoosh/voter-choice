"use client";

import { useState } from "react";
import type {
  BallotContest,
  Candidate,
  CandidateDetail,
  LiveElectionData,
} from "@/lib/types";
import { fetchCandidateDetail } from "@/lib/electionData";
import { useLanguage } from "@/lib/i18n";

interface CandidateCardProps {
  candidate: Candidate;
  office: string;
  stateCode: string;
}

function CandidateCard({ candidate, office, stateCode }: CandidateCardProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    if (detail) return; // Already fetched

    setLoading(true);
    setError(null);
    try {
      const result = await fetchCandidateDetail({
        name: candidate.name,
        office,
        state: stateCode,
        party: candidate.party,
      });
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="candidate-detail"
      className="border border-gray-200 rounded-lg p-3 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900 text-sm">{candidate.name}</p>
          {candidate.party && (
            <p className="text-xs text-gray-500">{candidate.party}</p>
          )}
        </div>
        <button
          onClick={handleExpand}
          className="text-xs text-blue-600 hover:text-blue-800 underline shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-expanded={expanded}
          aria-label={`${t("viewVotingRecord")}: ${candidate.name}`}
        >
          {t("viewVotingRecord")}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
          {loading && (
            <div
              data-testid="data-loading"
              aria-busy="true"
              className="animate-pulse space-y-1"
            >
              <p className="text-xs text-gray-400">{t("candidateLoading")}</p>
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-4/5" />
              <div className="h-3 bg-gray-200 rounded w-3/5" />
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          {detail && !loading && (
            <div className="space-y-2 text-xs text-gray-700">
              <div>
                <p className="font-semibold text-gray-800">Voting Record</p>
                <p className="mt-0.5">{detail.votingRecord}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Top Donors</p>
                <p className="mt-0.5">{detail.topDonors}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Endorsements</p>
                <p className="mt-0.5">{detail.endorsements}</p>
              </div>
              {detail.citations.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-800">Sources</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {detail.citations.slice(0, 3).map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {url}
                        </a>
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

interface BallotContestsProps {
  liveData?: LiveElectionData;
  contests?: BallotContest[];
  stateCode?: string;
  isLoading?: boolean;
}

export default function BallotContests({
  liveData,
  contests,
  stateCode,
  isLoading = false,
}: BallotContestsProps) {
  const { t } = useLanguage();

  const contestList = contests ?? liveData?.ballotContests;
  const state = stateCode ?? liveData?.stateCodes[0] ?? "";

  if (isLoading) {
    return (
      <div
        data-testid="data-loading"
        aria-busy="true"
        className="animate-pulse space-y-3"
      >
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!contestList || contestList.length === 0) {
    return null;
  }

  return (
    <div data-testid="ballot-contests" className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">
        {t("ballotContestsHeading")}
      </h3>
      <div className="space-y-3">
        {contestList.map((contest, idx) => (
          <div key={idx} className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {contest.office}
              </p>
              {contest.district && (
                <p className="text-xs text-gray-500">{contest.district}</p>
              )}
            </div>
            {contest.candidates.length > 0 && (
              <div className="space-y-2 ml-2">
                {contest.candidates.map((candidate, cidx) => (
                  <CandidateCard
                    key={cidx}
                    candidate={candidate}
                    office={contest.office}
                    stateCode={state}
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
