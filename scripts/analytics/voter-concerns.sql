-- Reference analytics queries for voter_issue_events.
--
-- These read the anonymous issue-preference signals persisted at session-end
-- (state + issue + stance only; no identifier, no address, no verbatim text).
-- Run against the Neon DATABASE_URL via the Neon SQL editor / psql, or use
-- the companion runner: `npm run db:analytics-concerns`.

-- Goal 1: which canonical issues do voters in which states care most about?
-- (rank = 1 is the voter's top priority; lower avg rank = more often a top concern)
SELECT
  state_code,
  canonical_issue,
  COUNT(*)                              AS mentions,
  COUNT(*) FILTER (WHERE rank = 1)      AS top_priority_mentions,
  ROUND(AVG(rank)::numeric, 2)          AS avg_rank
FROM voter_issue_events
WHERE canonical_issue IS NOT NULL
GROUP BY state_code, canonical_issue
ORDER BY state_code, mentions DESC;

-- Goal 2: taxonomy gaps — concerns that fall OUTSIDE the 15 canonical issues.
-- Grouped by the model's short off-topic label so we can see what to add.
SELECT
  off_topic_label,
  confidence_level,
  COUNT(*) AS occurrences
FROM voter_issue_events
WHERE canonical_issue IS NULL
GROUP BY off_topic_label, confidence_level
ORDER BY occurrences DESC;

-- Goal 3: stance distribution per canonical issue.
SELECT
  canonical_issue,
  lower(resolved_stance) AS stance,
  COUNT(*)               AS n
FROM voter_issue_events
WHERE canonical_issue IS NOT NULL
  AND resolved_stance IS NOT NULL
GROUP BY canonical_issue, lower(resolved_stance)
ORDER BY canonical_issue, n DESC;
