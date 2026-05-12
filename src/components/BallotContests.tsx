"use client";

import type { BallotContest } from "@/types/liveElection";
import { CandidateDetailPanel } from "./CandidateDetailPanel";
import { useTranslation } from "@/lib/i18n/I18nContext";

interface BallotContestsProps {
  contests: BallotContest[];
  stateCode: string;
}

export function BallotContests({ contests, stateCode }: BallotContestsProps) {
  const { t } = useTranslation();

  if (contests.length === 0) {
    return (
      <section
        data-testid="ballot-contests"
        aria-labelledby="ballot-contests-heading"
      >
        <h3
          id="ballot-contests-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          {t.liveData?.ballotContests ?? "Ballot Contests"}
        </h3>
        <p className="text-gray-500 text-sm">
          No ballot contest data available for your location.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="ballot-contests"
      aria-labelledby="ballot-contests-heading"
    >
      <h3
        id="ballot-contests-heading"
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3"
      >
        {t.liveData?.ballotContests ?? "Ballot Contests"}
      </h3>
      <div className="space-y-4">
        {contests.map((contest) => (
          <div
            key={contest.contestId}
            className="border border-gray-200 rounded-lg p-3"
          >
            <p className="font-medium text-gray-900 text-sm mb-1">
              {contest.name}
            </p>
            <p className="text-xs text-gray-500 mb-2 capitalize">
              {contest.type}
            </p>
            {contest.candidates.length > 0 ? (
              <div>
                {contest.candidates.map((candidate) => (
                  <CandidateDetailPanel
                    key={candidate.candidateId}
                    candidate={candidate}
                    race={contest.name}
                    state={stateCode}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-xs">No candidates listed.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
