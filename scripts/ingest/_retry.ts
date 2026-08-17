/**
 * scripts/ingest/_retry.ts
 *
 * Shared retry/backoff helper for ingest scripts. Built for the state-votes
 * OpenStates outage (docs/operations/ingest-and-tagging-plan-2026-07-31.md
 * Phase 1): ~30 of 45 scheduled runs failed on OpenStates 502/504 gateway
 * timeouts and bare `terminated` socket errors, and the repo's de-facto
 * transient-error regex (`/fetch failed|ECONNRESET|ETIMEDOUT/i`) matches
 * NONE of the observed failures. `isTransientNetworkError` below is the
 * fix for that specific miss.
 *
 * Not yet adopted by the other 8+ private sleep()/retry-loop copies in this
 * repo (federal-candidates.ts, federal-donors.ts, etc.) — that migration is
 * a separate, deliberately deferred card (P3) so this diff stays reviewable.
 */

export type RetryOptions<T> = {
  label: string;
  op: (attempt: number) => Promise<T>;
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  totalBudgetMs?: number;
  jitter?: boolean;
  isRetryable?: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries `op` with exponential backoff, bounded by both an attempt count
 * and a wall-clock budget — the budget is what actually matters: a fast
 * attempt count can still blow past an acceptable runtime if each attempt
 * itself hangs near a long per-request timeout.
 */
export async function withRetry<T>({
  label,
  op,
  attempts = 4,
  baseDelayMs = 1000,
  maxDelayMs = 30_000,
  totalBudgetMs = 720_000,
  jitter = true,
  isRetryable = isTransientNetworkError,
  sleep: sleepFn = sleep,
}: RetryOptions<T>): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await op(attempt);
    } catch (error) {
      lastError = error;

      const retryable = isRetryable(error);
      const elapsedMs = Date.now() - startedAt;
      const isLastAttempt = attempt === attempts;
      const budgetExhausted = elapsedMs >= totalBudgetMs;

      if (!retryable || isLastAttempt || budgetExhausted) {
        throw error;
      }

      const rawDelay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const delayMs = jitter ? Math.floor(Math.random() * rawDelay) : rawDelay;
      const remainingBudgetMs = totalBudgetMs - elapsedMs;
      const waitMs = Math.max(0, Math.min(delayMs, remainingBudgetMs));

      console.warn(
        `[retry] ${label} attempt=${attempt}/${attempts} retryable_error=${flattenErrorChain(error, 1)} wait_ms=${waitMs}`,
      );
      await sleepFn(waitMs);
    }
  }

  // Unreachable — the loop always returns or throws — but satisfies TypeScript.
  throw lastError;
}

const TRANSIENT_CODES = new Set([
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
]);

const TRANSIENT_MESSAGE_RE =
  /terminated|other side closed|socket hang up|premature close|fetch failed|Connect Timeout|Headers Timeout|Body Timeout|The operation was aborted/iu;

const RETRYABLE_HTTP_STATUSES = new Set([
  408, 425, 429, 500, 502, 503, 504, 522, 524,
]);

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status);
}

/**
 * Walks `error.cause` chains and `AggregateError.errors` (depth-bounded) to
 * classify network-transient failures. The repo's prior de-facto regex
 * (`/fetch failed|ECONNRESET|ETIMEDOUT/i`) does not match a bare `terminated`
 * — the actual shape most OpenStates socket failures take — which is why
 * this exists as a real function instead of an inline regex.
 */
export function isTransientNetworkError(error: unknown, maxDepth = 8): boolean {
  const seen = new Set<unknown>();
  const queue: Array<{ value: unknown; depth: number }> = [
    { value: error, depth: 0 },
  ];

  while (queue.length > 0) {
    const { value, depth } = queue.shift()!;
    if (value == null || depth > maxDepth || seen.has(value)) continue;
    seen.add(value);

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const code = record.code;
      if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true;

      const message = record.message;
      if (typeof message === "string" && TRANSIENT_MESSAGE_RE.test(message)) {
        return true;
      }

      if ("cause" in record && record.cause != null) {
        queue.push({ value: record.cause, depth: depth + 1 });
      }

      const aggregateErrors = (value as { errors?: unknown }).errors;
      if (Array.isArray(aggregateErrors)) {
        for (const nested of aggregateErrors) {
          queue.push({ value: nested, depth: depth + 1 });
        }
      }
    } else if (typeof value === "string" && TRANSIENT_MESSAGE_RE.test(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Flattens an error's `.cause` chain (and AggregateError members) into one
 * printable string, depth-bounded and cycle-safe. `safeErrorMessage` in
 * state-votes.ts previously discarded `.cause` entirely, which is why the
 * OpenStates outage logs were undiagnosable — every failure just said
 * "fetch failed" with no indication of what actually broke underneath.
 */
export function flattenErrorChain(error: unknown, maxDepth = 8): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  let depth = 0;

  while (current != null && depth <= maxDepth && !seen.has(current)) {
    seen.add(current);

    if (current instanceof Error) {
      const code = (current as NodeJS.ErrnoException).code;
      parts.push(code ? `${current.message} (${code})` : current.message);

      const aggregateErrors = (current as { errors?: unknown }).errors;
      if (Array.isArray(aggregateErrors) && aggregateErrors.length > 0) {
        const nested = aggregateErrors
          .slice(0, 3)
          .map((e) => flattenErrorChain(e, Math.max(0, maxDepth - depth - 1)))
          .join(" | ");
        parts.push(`[aggregate: ${nested}]`);
      }

      current = (current as { cause?: unknown }).cause;
    } else if (typeof current === "string") {
      parts.push(current);
      current = undefined;
    } else {
      parts.push(String(current));
      current = undefined;
    }

    depth += 1;
  }

  return parts.join(" -> ");
}
