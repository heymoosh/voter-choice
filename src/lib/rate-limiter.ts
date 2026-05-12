/**
 * In-memory rate limiter for the chat API route.
 * Resets on server restart (Vercel serverless: per-instance).
 * Per-IP concurrent sessions and daily session limits.
 */

interface IpRecord {
  activeSessions: Set<string>;
  dailySessions: number;
  dailyResetDate: string; // "YYYY-MM-DD"
}

const ipMap = new Map<string, IpRecord>();

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getRecord(ip: string): IpRecord {
  let rec = ipMap.get(ip);
  if (!rec) {
    rec = {
      activeSessions: new Set(),
      dailySessions: 0,
      dailyResetDate: todayStr(),
    };
    ipMap.set(ip, rec);
  }
  // Reset daily counter if day changed
  if (rec.dailyResetDate !== todayStr()) {
    rec.dailySessions = 0;
    rec.dailyResetDate = todayStr();
  }
  return rec;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "concurrent" | "daily" };

export const MAX_CONCURRENT_SESSIONS = 3;
// In test environments (MOCK_ANTHROPIC=true), bump limit to accommodate multiple test projects
export const MAX_DAILY_SESSIONS =
  process.env.MOCK_ANTHROPIC === "true" || process.env.NODE_ENV === "test"
    ? 50
    : 5;
export const MAX_MESSAGES_PER_SESSION = 60;

export function checkAndStartSession(
  ip: string,
  sessionId: string,
): RateLimitResult {
  const rec = getRecord(ip);
  if (rec.activeSessions.has(sessionId)) {
    return { allowed: true }; // Re-use existing session
  }
  if (rec.activeSessions.size >= MAX_CONCURRENT_SESSIONS) {
    return { allowed: false, reason: "concurrent" };
  }
  if (rec.dailySessions >= MAX_DAILY_SESSIONS) {
    return { allowed: false, reason: "daily" };
  }
  rec.activeSessions.add(sessionId);
  rec.dailySessions += 1;
  return { allowed: true };
}

export function endSession(ip: string, sessionId: string): void {
  const rec = ipMap.get(ip);
  if (rec) {
    rec.activeSessions.delete(sessionId);
  }
}
