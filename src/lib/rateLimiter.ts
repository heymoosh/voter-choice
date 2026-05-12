/**
 * In-memory per-IP rate limiter for the chat API route.
 * Limits: MAX_CONCURRENT concurrent sessions, MAX_DAILY new sessions per day,
 * MAX_MESSAGES messages per session.
 */

export const MAX_CONCURRENT = 3;
export const MAX_DAILY = 5;
export const MAX_MESSAGES_PER_SESSION = 60;

interface RateLimitEntry {
  activeSessions: Set<string>;
  dailySessions: number;
  dailyReset: string; // YYYY-MM-DD
}

const ipStore = new Map<string, RateLimitEntry>();

function today(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function getOrCreate(ip: string): RateLimitEntry {
  let entry = ipStore.get(ip);
  if (!entry) {
    entry = {
      activeSessions: new Set(),
      dailySessions: 0,
      dailyReset: today(),
    };
    ipStore.set(ip, entry);
  }
  // Reset daily counter if day changed
  if (entry.dailyReset !== today()) {
    entry.dailySessions = 0;
    entry.dailyReset = today();
  }
  return entry;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "concurrent_limit" | "daily_limit" };

/**
 * Try to start a new session for the given IP.
 * Returns allowed=true and registers the session if under limits.
 */
export function tryStartSession(
  ip: string,
  sessionId: string,
): RateLimitResult {
  const entry = getOrCreate(ip);

  if (entry.activeSessions.size >= MAX_CONCURRENT) {
    return { allowed: false, reason: "concurrent_limit" };
  }
  if (entry.dailySessions >= MAX_DAILY) {
    return { allowed: false, reason: "daily_limit" };
  }

  entry.activeSessions.add(sessionId);
  entry.dailySessions += 1;
  return { allowed: true };
}

/** Release a session (call when chat window closes or session ends) */
export function endSession(ip: string, sessionId: string): void {
  const entry = ipStore.get(ip);
  if (entry) {
    entry.activeSessions.delete(sessionId);
  }
}

/** Check if a session has exceeded the per-session message limit */
export function isSessionAtMessageLimit(messageCount: number): boolean {
  return messageCount >= MAX_MESSAGES_PER_SESSION;
}

/** Exposed for testing only */
export function _clearForTesting(): void {
  ipStore.clear();
}
