/**
 * In-memory cache for election data API responses.
 * Cache is per zip code per session. TTL: 1 hour.
 * Lives in module scope — Next.js server module caching handles persistence
 * across requests within the same server process.
 */

import type { LiveElectionData } from "./api-types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: LiveElectionData;
  expiresAt: number;
}

// Module-level cache — server-side only
const cache = new Map<string, CacheEntry>();

export function getCached(zip: string): LiveElectionData | null {
  const entry = cache.get(zip);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(zip);
    return null;
  }
  return entry.data;
}

export function setCached(zip: string, data: LiveElectionData): void {
  cache.set(zip, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearCache(): void {
  cache.clear();
}
