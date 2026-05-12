import type { CivicElectionInfo } from "./types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: CivicElectionInfo;
  expiresAt: number;
}

// Server-side in-memory cache. Keyed by zip code.
// Lives for the lifetime of the Node.js process (Next.js server).
// Cache is per-session in development (each request may spin up a new serverless context).
const cache = new Map<string, CacheEntry>();

export function getCached(zip: string): CivicElectionInfo | null {
  const entry = cache.get(zip);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(zip);
    return null;
  }
  return entry.data;
}

export function setCached(zip: string, data: CivicElectionInfo): void {
  cache.set(zip, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}
