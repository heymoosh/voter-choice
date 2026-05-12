"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CandidateDetail } from "./CandidateDetail";
import type { BallotContest } from "@/lib/civic/types";

interface BallotContestsProps {
  contests: BallotContest[];
  state?: string;
}

export function BallotContests({ contests, state }: BallotContestsProps) {
  const { t } = useLanguage();

  if (contests.length === 0) {
    return null;
  }

  return (
    <div className="ballot-contests-section" data-testid="ballot-contests">
      <p className="metric-label">{t.ballotContestsLabel}</p>
      <div className="contest-list">
        {contests.map((contest) => (
          <div key={contest.id} className="contest-card">
            <p className="contest-title">{contest.title}</p>
            {contest.subtitle && (
              <p className="contest-subtitle muted">{contest.subtitle}</p>
            )}
            {contest.district && (
              <p className="contest-district muted">{contest.district}</p>
            )}

            {contest.type === "referendum" && contest.referendumText && (
              <p className="referendum-text muted">{contest.referendumText}</p>
            )}

            {contest.type === "candidate" &&
              contest.candidates &&
              contest.candidates.length > 0 && (
                <div className="candidates-list">
                  {contest.candidates.map((candidate) => (
                    <CandidateDetail
                      key={candidate.id}
                      candidate={candidate}
                      office={contest.title}
                      state={state}
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
