/**
 * src/lib/polis/reportAssembly.ts
 *
 * Assemble the PolisReport contract from stored response vectors.
 *
 * The PolisReport is the output shape consumed by the redesigned Polis
 * visualization (PolisClose / PolisReport components). It leads with:
 *   - A cluster map ("voters who answer alike sit together")
 *   - CONSENSUS statements (>= 60% in every cluster)
 *   - An honest "divided" state when no consensus exists
 *
 * This module is PURE at the assembly layer: `assemblePolisReport` takes an
 * array of ResponseVector objects (already loaded from DB by the caller) and
 * returns the report. It does NOT query the DB itself. The caller (a route
 * handler or an API endpoint) is responsible for loading vectors.
 *
 * WIRING NOTE (follow-up card):
 *   A GET /api/polis/report endpoint should:
 *     1. Load vectors from `polis_response_vectors` (filtered by state/time).
 *     2. Pass them to `assemblePolisReport`.
 *     3. Return the PolisReportResult JSON.
 *   That endpoint is NOT built in this P1 slice — this function exposes the
 *   contract so the endpoint can be thin. See TODO below.
 *
 * TODO (route wiring — follow-up):
 *   src/app/api/polis/report/route.ts — minimal handler:
 *     import { assemblePolisReport } from "@/lib/polis/reportAssembly";
 *     // load vectors from DB by stateCode + optional time window
 *     // return NextResponse.json(assemblePolisReport(vectors));
 *
 * Privacy: inputs are already de-identified ResponseVector objects (no session
 * tokens, no PII). Outputs contain only aggregate statistics.
 */

import {
  clusterVectors,
  findConsensusStatements,
  detectDividedState,
  MIN_SESSIONS_TO_CLUSTER,
  DEFAULT_K,
  type ResponseVector,
  type Cluster,
  type ConsensusStatement,
  type DividedState,
} from "./clustering";

// ---------------------------------------------------------------------------
// Report contract types
// ---------------------------------------------------------------------------

/**
 * A cluster in the report: a group of voters who answered alike.
 *
 * `sharePercent` is the cluster's fraction of the total sample (0–100).
 * `centroid` is the cluster's mean answer on each statement (-1 to 1).
 *
 * FOLLOW-UP: add `dots: Array<{x: number; y: number}>` when PCA projection
 * is implemented (Phase 8b). Each dot would be a session projected into 2-D
 * space for the cluster map scatter plot.
 */
export interface ReportCluster {
  id: number;
  size: number;
  /** Percent of total sessions in this cluster (0–100, rounded). */
  sharePercent: number;
  centroid: Record<string, number>;
}

/** A statement that reached >=60% agreement in every cluster. */
export interface ReportConsensusStatement {
  statementId: string;
  /** Agreement percent in each cluster. */
  clusterAgreement: Array<{ clusterId: number; agreePct: number }>;
  /** Minimum agree-pct across clusters (the weakest link). */
  minAgreePct: number;
}

/** The assembled Polis report. */
export interface PolisReportResult {
  /** Total sessions used to assemble this report. */
  sampleSize: number;
  /**
   * Whether there are enough sessions to cluster meaningfully.
   * When false, clusters=[] and the UI should show a low-N fallback.
   */
  hasEnoughData: boolean;
  /** Clusters sorted by size descending. Empty when hasEnoughData=false. */
  clusters: ReportCluster[];
  /**
   * Statements that cleared >=60% in every cluster. Empty when hasEnoughData
   * is false or when the dataset is divided.
   */
  consensusStatements: ReportConsensusStatement[];
  /** Divided-state result. isDivided=false when hasEnoughData=false. */
  dividedState: DividedState;
  /**
   * Honest low-N message to surface when hasEnoughData=false.
   * Null when there IS enough data.
   */
  lowNMessage: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toReportCluster(
  cluster: Cluster,
  totalSessions: number,
): ReportCluster {
  return {
    id: cluster.id,
    size: cluster.size,
    sharePercent:
      totalSessions > 0 ? Math.round((cluster.size / totalSessions) * 100) : 0,
    centroid: cluster.centroid,
  };
}

function toReportConsensus(stmt: ConsensusStatement): ReportConsensusStatement {
  return {
    statementId: stmt.statementId,
    clusterAgreement: stmt.clusterAgreement.map((ca) => ({
      clusterId: ca.clusterId,
      agreePct: ca.agreePct,
    })),
    minAgreePct: stmt.minAgreePct,
  };
}

// ---------------------------------------------------------------------------
// Main assembly function
// ---------------------------------------------------------------------------

/**
 * Assemble the PolisReport from an array of de-identified response vectors.
 *
 * Handles all edge cases honestly:
 *   - N=0: returns empty report with hasEnoughData=false + lowNMessage
 *   - N < MIN_SESSIONS_TO_CLUSTER: same as above
 *   - N >= threshold but no consensus: divided state is set
 *   - Unanimous consensus: consensusStatements non-empty, isDivided=false
 *
 * @param vectors - De-identified response vectors. Caller loads from DB.
 * @param k - Number of clusters to find (default DEFAULT_K=3).
 */
export function assemblePolisReport(
  vectors: ResponseVector[],
  k: number = DEFAULT_K,
): PolisReportResult {
  const sampleSize = vectors.length;

  // Low-N fallback
  if (sampleSize < MIN_SESSIONS_TO_CLUSTER) {
    return {
      sampleSize,
      hasEnoughData: false,
      clusters: [],
      consensusStatements: [],
      dividedState: { isDivided: false, sharpestDivide: null },
      lowNMessage:
        sampleSize === 0
          ? "No responses yet. Be the first to share your priorities."
          : `Only ${sampleSize} response${sampleSize === 1 ? "" : "s"} so far — check back when more people have shared their priorities.`,
    };
  }

  // Cluster
  const rawClusters = clusterVectors(vectors, k);
  if (!rawClusters) {
    // Should not happen when sampleSize >= MIN_SESSIONS_TO_CLUSTER, but guard anyway
    return {
      sampleSize,
      hasEnoughData: false,
      clusters: [],
      consensusStatements: [],
      dividedState: { isDivided: false, sharpestDivide: null },
      lowNMessage: "Unable to cluster responses (no statements answered).",
    };
  }

  // Sort clusters by size descending
  const sortedClusters = [...rawClusters].sort((a, b) => b.size - a.size);

  // Consensus
  const rawConsensus = findConsensusStatements(vectors, rawClusters);

  // Divided state
  const dividedState = detectDividedState(vectors, rawClusters, rawConsensus);

  return {
    sampleSize,
    hasEnoughData: true,
    clusters: sortedClusters.map((c) => toReportCluster(c, sampleSize)),
    consensusStatements: rawConsensus.map(toReportConsensus),
    dividedState,
    lowNMessage: null,
  };
}
