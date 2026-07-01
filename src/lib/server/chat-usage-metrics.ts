/**
 * chat-usage-metrics.ts
 *
 * Anonymous per-request AI cost telemetry for the chat endpoint.
 *
 * Privacy guarantee: this module stores NO identifier of any kind.
 * No IP address, no session id, no user id, no address, no request body,
 * no prompt text. Operational numbers only: model, token counts, estimated
 * cost, and a call_kind discriminator ('chat' | 'research'). This mirrors
 * the voter_issue_events privacy contract:
 *   "NO identifier linking rows to a person (no session id), NO address,
 *    NO free-text verbatim"
 *
 * The write is:
 *  - Gated behind CHAT_USAGE_METRICS_ENABLED === "true" (default OFF so
 *    it does not write until the owner enables it on deploy).
 *  - Gated behind DATABASE_URL being set (getDb() !== DB_NOT_CONFIGURED).
 *  - Fully fail-soft: any error is swallowed + logged. A metrics-write
 *    failure NEVER breaks a chat response.
 *
 * Cost rates used (Claude Haiku 4.5 — the DEFAULT_ANTHROPIC_CHAT_MODEL):
 *   Input:        $1.00 / MTok
 *   Output:       $5.00 / MTok
 *   Cache write:  $1.25 / MTok  (5-min ephemeral)
 *   Cache read:   $0.10 / MTok
 *   Web search:   $0.01 / search
 */

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { chatUsageMetrics } from "../../../db/schema";

// ---------------------------------------------------------------------------
// Cost rates
// ---------------------------------------------------------------------------

/** Claude Haiku 4.5 pricing (USD per million tokens, per web-search request). */
export const HAIKU_4_5_RATES = {
  inputPerMTok: 1.0,
  outputPerMTok: 5.0,
  cacheWritePerMTok: 1.25,
  cacheReadPerMTok: 0.1,
  webSearchPerRequest: 0.01,
} as const;

// ---------------------------------------------------------------------------
// Cost helper
// ---------------------------------------------------------------------------

export interface UsageCounts {
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  webSearchCount: number;
}

/**
 * Pure function — computes the estimated USD cost for a single Haiku 4.5 call
 * given its usage counts. Safe to call in any context (no I/O).
 *
 * Returns a number rounded to 8 decimal places so it fits the
 * numeric(10,8) column without truncation on normal call sizes.
 */
export function estimateHaikuCostUsd(usage: UsageCounts): number {
  const inputCost =
    (usage.inputTokens / 1_000_000) * HAIKU_4_5_RATES.inputPerMTok;
  const outputCost =
    (usage.outputTokens / 1_000_000) * HAIKU_4_5_RATES.outputPerMTok;
  const cacheWriteCost =
    (usage.cacheWriteTokens / 1_000_000) * HAIKU_4_5_RATES.cacheWritePerMTok;
  const cacheReadCost =
    (usage.cacheReadTokens / 1_000_000) * HAIKU_4_5_RATES.cacheReadPerMTok;
  const searchCost = usage.webSearchCount * HAIKU_4_5_RATES.webSearchPerRequest;

  const total =
    inputCost + outputCost + cacheWriteCost + cacheReadCost + searchCost;

  // Round to 8 decimal places (matches numeric(10,8) column precision).
  return Math.round(total * 1e8) / 1e8;
}

// ---------------------------------------------------------------------------
// Row shape (for tests — validates NO identifier columns)
// ---------------------------------------------------------------------------

export interface ChatUsageMetricsRow {
  model: string;
  callKind: string;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  webSearchCount: number;
  estimatedCostUsd: string; // numeric → string for Drizzle insert
}

/**
 * Map a usage block and call metadata to a row ready for insert.
 * This function is pure (no I/O) and exported for unit testing.
 * The returned object has NO identifier fields.
 */
export function buildMetricsRow(
  usage: UsageCounts,
  opts: { model: string; callKind?: string },
): ChatUsageMetricsRow {
  const costUsd = estimateHaikuCostUsd(usage);
  return {
    model: opts.model,
    callKind: opts.callKind ?? "chat",
    inputTokens: usage.inputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheWriteTokens: usage.cacheWriteTokens,
    outputTokens: usage.outputTokens,
    webSearchCount: usage.webSearchCount,
    estimatedCostUsd: costUsd.toFixed(8),
  };
}

// ---------------------------------------------------------------------------
// Fail-soft recording hook
// ---------------------------------------------------------------------------

/**
 * Record one anonymous usage row for a chat API call.
 *
 * Fail-soft: any error (DB down, migration not applied, misconfiguration)
 * is caught, logged, and discarded. This call NEVER throws and NEVER
 * propagates to the HTTP response path.
 *
 * Gate: no-op unless both:
 *  1. CHAT_USAGE_METRICS_ENABLED === "true"
 *  2. DATABASE_URL is set (getDb() !== DB_NOT_CONFIGURED)
 */
export async function recordChatUsage(
  usage: UsageCounts,
  opts: { model: string; callKind?: string },
): Promise<void> {
  try {
    if (process.env.CHAT_USAGE_METRICS_ENABLED !== "true") return;

    const db = getDb();
    if (db === DB_NOT_CONFIGURED) return;

    const row = buildMetricsRow(usage, opts);
    await db.insert(chatUsageMetrics).values(row);
  } catch (err) {
    // Swallow — a metrics failure must never break a chat response.
    console.error("[chat-usage-metrics] insert failed:", err);
  }
}
