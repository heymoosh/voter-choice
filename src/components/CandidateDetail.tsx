"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { BallotCandidate } from "@/lib/civic/types";
import type { CandidateEnrichment } from "@/lib/enrichment/types";

interface CandidateDetailProps {
  candidate: BallotCandidate;
  office?: string;
  state?: string;
}

export function CandidateDetail({
  candidate,
  office,
  state,
}: CandidateDetailProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrichment, setEnrichment] = useState<CandidateEnrichment | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function loadEnrichment() {
    if (enrichment || loading) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ name: candidate.name });
      if (candidate.party) params.set("party", candidate.party);
      if (office) params.set("office", office);
      if (state) params.set("state", state);

      const res = await fetch(
        `/api/candidate/${encodeURIComponent(candidate.id)}?${params.toString()}`,
      );

      if (!res.ok) {
        throw new Error(`Enrichment failed: ${res.status}`);
      }

      const data = (await res.json()) as CandidateEnrichment;
      if (data.error) {
        setError(data.error);
      } else {
        setEnrichment(data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load candidate info",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !enrichment && !loading) {
      void loadEnrichment();
    }
  }

  return (
    <div className="candidate-card" data-testid="candidate-detail">
      <div className="candidate-header">
        <div className="candidate-info">
          <span className="candidate-name">{candidate.name}</span>
          {candidate.party && (
            <span className="candidate-party">{candidate.party}</span>
          )}
        </div>
        <button
          className="button button-ghost candidate-expand"
          onClick={handleToggle}
          aria-expanded={expanded}
          type="button"
        >
          {expanded ? t.candidateCollapse : t.candidateExpand}
        </button>
      </div>

      {expanded && (
        <div className="candidate-enrichment">
          {loading && (
            <div
              data-testid="data-loading"
              className="loading-skeleton"
              aria-busy="true"
            >
              <div className="skeleton-line skeleton-line-wide" />
              <div className="skeleton-line skeleton-line-medium" />
            </div>
          )}

          {error && <p className="muted">{t.candidateEnrichmentError}</p>}

          {enrichment && !loading && (
            <div className="enrichment-content">
              {enrichment.votingRecord && (
                <div className="enrichment-section">
                  <p className="metric-label">{t.candidateVotingRecord}</p>
                  <p className="muted">{enrichment.votingRecord}</p>
                </div>
              )}
              {enrichment.topDonors && (
                <div className="enrichment-section">
                  <p className="metric-label">{t.candidateTopDonors}</p>
                  <p className="muted">{enrichment.topDonors}</p>
                </div>
              )}
              {enrichment.endorsements && (
                <div className="enrichment-section">
                  <p className="metric-label">{t.candidateEndorsements}</p>
                  <p className="muted">{enrichment.endorsements}</p>
                </div>
              )}
              {enrichment.issuePositions && (
                <div className="enrichment-section">
                  <p className="metric-label">{t.candidateIssuePositions}</p>
                  <p className="muted">{enrichment.issuePositions}</p>
                </div>
              )}
              {enrichment.sourceUrls && enrichment.sourceUrls.length > 0 && (
                <div className="enrichment-sources">
                  <p className="metric-label">{t.candidateSources}</p>
                  <ul className="source-list">
                    {enrichment.sourceUrls.slice(0, 3).map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link"
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
