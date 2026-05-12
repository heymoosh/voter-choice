/**
 * Upstash Redis HTTP REST client for Phase 6 anonymous aggregate counters.
 * Gracefully degrades when credentials are missing — returns null/empty values.
 * No PII is ever written; keys follow the format: count:<county_fips>:<issue_slug>
 */

function getUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL;
}

function getToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN;
}

export function isUpstashAvailable(): boolean {
  return Boolean(getUrl() && getToken());
}

/**
 * Increment a counter by 1.
 * Returns true on success, false on error or if Upstash is unavailable.
 */
export async function incrementCount(
  countyFips: string,
  issueSlug: string,
): Promise<boolean> {
  if (!isUpstashAvailable()) return false;
  const url = getUrl()!;
  const token = getToken()!;
  const key = `count:${countyFips}:${issueSlug}`;
  try {
    const res = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get all issue counts for a county.
 * Returns a Record<issueSlug, count> or null if unavailable.
 */
export async function getCountyCounts(
  countyFips: string,
): Promise<Record<string, number> | null> {
  if (!isUpstashAvailable()) return null;
  const url = getUrl()!;
  const token = getToken()!;
  try {
    // Use KEYS pattern then MGET to batch-read
    const keysRes = await fetch(
      `${url}/keys/${encodeURIComponent(`count:${countyFips}:*`)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!keysRes.ok) return null;
    const keysData = (await keysRes.json()) as { result: string[] };
    const keys = keysData.result ?? [];
    if (keys.length === 0) return {};

    // MGET for all keys at once
    const mgetRes = await fetch(
      `${url}/mget/${keys.map(encodeURIComponent).join("/")}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!mgetRes.ok) return null;
    const mgetData = (await mgetRes.json()) as { result: (string | null)[] };

    const counts: Record<string, number> = {};
    keys.forEach((k, i) => {
      // Key format: count:<county_fips>:<issue_slug>
      const parts = k.split(":");
      const slug = parts.slice(2).join(":");
      counts[slug] = parseInt(mgetData.result[i] ?? "0", 10) || 0;
    });
    return counts;
  } catch {
    return null;
  }
}

/**
 * Get a single issue count.
 */
export async function getSingleCount(
  countyFips: string,
  issueSlug: string,
): Promise<number | null> {
  if (!isUpstashAvailable()) return null;
  const url = getUrl()!;
  const token = getToken()!;
  const key = `count:${countyFips}:${issueSlug}`;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string | null };
    return parseInt(data.result ?? "0", 10) || 0;
  } catch {
    return null;
  }
}
