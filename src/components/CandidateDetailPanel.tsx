"use client";

import { useState } from "react";
import type { Candidate, CandidateEnrichment } from "@/types/liveElection";
import { useTranslation } from "@/lib/i18n/I18nContext";

interface CandidateDetailPanelProps {
  candidate: Candidate;
  race: string;
  state: string;
}

export function CandidateDetailPanel({
  candidate,
  race,
  state,
}: CandidateDetailPanelProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrichment, setEnrichment] = useState<CandidateEnrichment | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (enrichment) return; // already loaded

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidate.name,
          race,
          state,
        }),
      });
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data = (await res.json()) as CandidateEnrichment;
      setEnrichment(data);
    } catch (err) {
      setError(
        (err as Error).message || "Unable to load candidate information.",
      );
    } finally {
      setLoading(false);
    }
  };

  const viewRecordLabel =
    t.liveData?.candidateDetail?.viewRecord ?? "View voting record";
  const votingRecordLabel =
    t.liveData?.candidateDetail?.votingRecord ?? "Voting Record";
  const topDonorsLabel = t.liveData?.candidateDetail?.topDonors ?? "Top Donors";
  const endorsementsLabel =
    t.liveData?.candidateDetail?.endorsements ?? "Endorsements";

  return (
    <div
      data-testid="candidate-detail"
      className="py-2 border-b border-gray-100 last:border-0"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {candidate.photoUrl && (
            <img
              src={candidate.photoUrl}
              alt={candidate.name}
              className="w-8 h-8 rounded-full object-cover"
              loading="lazy"
            />
          )}
          <div>
            <span className="font-medium text-gray-900 text-sm">
              {candidate.name}
            </span>
            {candidate.party && (
              <span className="ml-2 text-xs text-gray-500">
                ({candidate.party})
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleExpand}
          aria-expanded={expanded}
          className="text-blue-600 text-xs underline hover:text-blue-700 focus:outline-2 focus:outline-blue-500 rounded"
        >
          {expanded ? "▲ Close" : `▼ ${viewRecordLabel}`}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 ml-10 p-3 bg-gray-50 rounded-lg text-sm">
          {loading && (
            <div
              data-testid="data-loading"
              role="status"
              aria-label="Loading candidate information"
              className="text-gray-500 text-xs animate-pulse"
            >
              Loading...
            </div>
          )}
          {error && <p className="text-red-600 text-xs">{error}</p>}
          {enrichment && !loading && (
            <div className="space-y-2">
              <div>
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">
                  {votingRecordLabel}
                </p>
                <p className="text-gray-600">{enrichment.votingRecord}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">
                  {topDonorsLabel}
                </p>
                <p className="text-gray-600">{enrichment.topDonors}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">
                  {endorsementsLabel}
                </p>
                <p className="text-gray-600">{enrichment.endorsements}</p>
              </div>
              {enrichment.sources.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">
                    Sources
                  </p>
                  <ul className="space-y-0.5">
                    {enrichment.sources.map((src, i) => (
                      <li key={i} className="text-gray-500 text-xs">
                        {src}
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
