/**
 * In-memory rate limiter for the /api/chat route.
 * Tracks: per-IP daily session counts and concurrent sessions.
 * These limits are approximate (per Node.js process instance).
 */

const MAX_DAILY_SESSIONS = 5;
const MAX_CONCURRENT_SESSIONS = 3;
const MAX_MESSAGES_PER_SESSION = 60;

type DayKey = string; // YYYY-MM-DD
type IpKey = string;

// Daily session counts: IP -> { date, count }
const dailyCounts = new Map<IpKey, { date: DayKey; count: number }>();
// Active concurrent sessions: IP -> count
const activeSessions = new Map<IpKey, number>();

function todayKey(): DayKey {
  return new Date().toISOString().slice(0, 10);
}

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "daily_limit" | "concurrent_limit" | "session_limit";
    };

/**
 * Check if a new session is allowed for the given IP.
 * If allowed, increments the counters.
 */
export function checkSessionLimit(ip: string): RateLimitResult {
  const today = todayKey();

  // Check concurrent sessions
  const concurrent = activeSessions.get(ip) ?? 0;
  if (concurrent >= MAX_CONCURRENT_SESSIONS) {
    return { allowed: false, reason: "concurrent_limit" };
  }

  // Check daily limit
  const daily = dailyCounts.get(ip);
  if (daily && daily.date === today && daily.count >= MAX_DAILY_SESSIONS) {
    return { allowed: false, reason: "daily_limit" };
  }

  // Increment counters
  activeSessions.set(ip, concurrent + 1);
  if (daily && daily.date === today) {
    daily.count++;
  } else {
    dailyCounts.set(ip, { date: today, count: 1 });
  }

  return { allowed: true };
}

/**
 * Release a session for the given IP (call when session ends).
 */
export function releaseSession(ip: string): void {
  const current = activeSessions.get(ip) ?? 0;
  if (current <= 1) {
    activeSessions.delete(ip);
  } else {
    activeSessions.set(ip, current - 1);
  }
}

/**
 * Check if a message count is within per-session limits.
 */
export function checkMessageLimit(messageCount: number): RateLimitResult {
  if (messageCount > MAX_MESSAGES_PER_SESSION) {
    return { allowed: false, reason: "session_limit" };
  }
  return { allowed: true };
}

export { MAX_MESSAGES_PER_SESSION };
