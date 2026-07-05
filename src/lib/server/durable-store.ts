type RedisValue = string | number;
type RedisCommand = RedisValue[];

interface RedisResponse<T> {
  result?: T;
  error?: string;
}

export function isDurableStoreConfigured(): boolean {
  return Boolean(getRedisConfig());
}

let unconfiguredWarned = false;

/**
 * True when the durable store is UNCONFIGURED (missing/empty KV env) *and* we
 * are running in production — a misconfiguration that must fail closed rather
 * than silently fall back to per-instance in-memory state. On serverless, that
 * fallback lets every fresh instance believe $0 has been spent and 0 requests
 * made, silently defeating the shared budget and rate-limit caps. (An EMPTY
 * prod env var once darkened this app's whole DB layer for 42 days — silent
 * misconfig is the enemy.)
 *
 * Emits ONE loud structured error the first time it fires so the misconfig is
 * visible in logs. Non-production keeps the in-memory fallback unchanged. This
 * covers ONLY the unconfigured state; a configured-but-erroring store (a Redis
 * hiccup) keeps its existing per-call error semantics.
 */
export function durableStoreUnconfiguredInProd(): boolean {
  const failClosed =
    process.env.NODE_ENV === "production" && !isDurableStoreConfigured();
  if (failClosed && !unconfiguredWarned) {
    unconfiguredWarned = true;
    console.error(
      JSON.stringify({
        level: "error",
        event: "durable_store_unconfigured",
        message:
          "Durable store (Redis/KV) is unconfigured in production. Failing closed: chat budget is treated as exhausted and rate limiting denies requests. Set KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).",
      }),
    );
  }
  return failClosed;
}

/** Reset the one-shot unconfigured warning latch. Testing only. */
export function _resetDurableStoreWarningForTesting(): void {
  unconfiguredWarned = false;
}

function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  if (!url || !token) return null;
  return { url, token };
}

export async function redisCommand<T>(
  command: RedisCommand,
): Promise<T | null> {
  const config = getRedisConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Durable store request failed: ${response.status}`);
  }

  const payload = (await response.json()) as RedisResponse<T>;
  if (payload.error) {
    throw new Error(`Durable store command failed: ${payload.error}`);
  }
  return payload.result ?? null;
}

/**
 * Enumerate every key matching `pattern` using non-blocking SCAN iteration.
 *
 * Drop-in replacement for `redisCommand<string[]>(["KEYS", pattern])`. KEYS is
 * O(N) over the ENTIRE keyspace and blocks the single-threaded Redis while it
 * runs — a real problem because this store also backs the app's rate limiters.
 * SCAN walks the keyspace in bounded `COUNT`-sized slices without blocking.
 *
 * Contract parity with KEYS: returns the full, de-duplicated set of matching
 * keys. SCAN can return the same key more than once across iterations and can
 * return an empty slice with a non-zero cursor, so we dedupe via a Set and
 * loop until the cursor returns to "0" — never truncating early. Returns [] if
 * the store isn't configured (matching `redisCommand` returning null).
 */
export async function redisScanKeys(
  pattern: string,
  count = 200,
): Promise<string[]> {
  if (!getRedisConfig()) return [];

  const seen = new Set<string>();
  let cursor = "0";
  do {
    const reply = await redisCommand<[string, string[]]>([
      "SCAN",
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      count,
    ]);
    if (!reply) break;
    const [nextCursor, keys] = reply;
    for (const key of keys ?? []) seen.add(key);
    cursor = String(nextCursor);
  } while (cursor !== "0");

  return Array.from(seen);
}
