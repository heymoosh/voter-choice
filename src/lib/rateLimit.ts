/**
 * In-memory per-IP rate limiter for the chat API route.
 *
 * Limits:
 * - 3 concurrent chat sessions per IP
 * - 5 new chat sessions per IP per day
 *
 * Session-level limit (60 messages) is enforced client-side by tracking
 * message count in React state and refusing to send beyond 60.
 */

interface IpRecord {
  date: string; // "YYYY-MM-DD"
  dailyCount: number;
  activeSessions: Set<string>;
}

// Module-level singleton
const ipMap = new Map<string, IpRecord>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getOrCreateRecord(ip: string): IpRecord {
  const existing = ipMap.get(ip);
  const currentDay = today();

  if (!existing || existing.date !== currentDay) {
    const record: IpRecord = {
      date: currentDay,
      dailyCount: 0,
      activeSessions: new Set(),
    };
    ipMap.set(ip, record);
    return record;
  }

  return existing;
}

export type RateLimitResult =
  | { allowed: true; sessionId: string }
  | { allowed: false; reason: "concurrent_limit" | "daily_limit" };

/**
 * Attempt to start a new chat session for the given IP.
 * Returns the sessionId on success or the reason for rejection.
 */
export function startSession(ip: string): RateLimitResult {
  const record = getOrCreateRecord(ip);

  if (record.activeSessions.size >= 3) {
    return { allowed: false, reason: "concurrent_limit" };
  }

  if (record.dailyCount >= 5) {
    return { allowed: false, reason: "daily_limit" };
  }

  const sessionId = `${ip}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  record.activeSessions.add(sessionId);
  record.dailyCount += 1;

  return { allowed: true, sessionId };
}

/**
 * End a chat session, freeing the concurrent slot.
 */
export function endSession(ip: string, sessionId: string): void {
  const record = ipMap.get(ip);
  if (record) {
    record.activeSessions.delete(sessionId);
  }
}

/**
 * Get current rate limit status for an IP (for testing/debugging).
 */
export function getRateLimitStatus(ip: string): {
  activeSessions: number;
  dailyCount: number;
} {
  const record = getOrCreateRecord(ip);
  return {
    activeSessions: record.activeSessions.size,
    dailyCount: record.dailyCount,
  };
}
