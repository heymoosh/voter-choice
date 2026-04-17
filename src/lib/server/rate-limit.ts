const CONCURRENT_LIMIT = 3;
const DAILY_SESSION_LIMIT = process.env.NODE_ENV === "production" ? 5 : 20;
const SESSION_MESSAGE_LIMIT = 60;

interface SessionEntry {
  count: number;
  lastActive: number;
}

interface DailyEntry {
  count: number;
  resetAt: number;
}

// Active sessions per IP (sessionId -> last active timestamp)
const activeSessions = new Map<string, Map<string, SessionEntry>>();

// Daily new session count per IP
const dailySessions = new Map<string, DailyEntry>();

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function cleanExpiredSessions(ip: string): void {
  const sessions = activeSessions.get(ip);
  if (!sessions) return;
  const now = Date.now();
  for (const [sid, entry] of sessions) {
    if (now - entry.lastActive > SESSION_TIMEOUT_MS) {
      sessions.delete(sid);
    }
  }
  if (sessions.size === 0) {
    activeSessions.delete(ip);
  }
}

function getDailyEntry(ip: string): DailyEntry {
  const now = Date.now();
  const existing = dailySessions.get(ip);
  if (existing && now < existing.resetAt) {
    return existing;
  }
  // Reset: next midnight UTC
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  const entry: DailyEntry = { count: 0, resetAt: tomorrow.getTime() };
  dailySessions.set(ip, entry);
  return entry;
}

export interface RateLimitResult {
  allowed: boolean;
  error?: string;
  code?: "SESSION_LIMIT" | "CONCURRENT_LIMIT" | "DAILY_LIMIT";
}

export function checkRateLimit(
  ip: string,
  sessionId: string,
  messageCount: number,
): RateLimitResult {
  // 1. Per-session message limit (client-reported, server-validated)
  if (messageCount > SESSION_MESSAGE_LIMIT) {
    return {
      allowed: false,
      error:
        "You've reached the message limit for this session. Copy the prompt below to continue in your own AI chatbot.",
      code: "SESSION_LIMIT",
    };
  }

  cleanExpiredSessions(ip);

  const sessions = activeSessions.get(ip) ?? new Map<string, SessionEntry>();
  const isNewSession = !sessions.has(sessionId);

  // 2. Concurrent session limit
  if (isNewSession && sessions.size >= CONCURRENT_LIMIT) {
    return {
      allowed: false,
      error:
        "Too many active sessions. Please close other tabs and try again, or copy the prompt to use in your own AI chatbot.",
      code: "CONCURRENT_LIMIT",
    };
  }

  // 3. Daily new session limit
  if (isNewSession) {
    const daily = getDailyEntry(ip);
    if (daily.count >= DAILY_SESSION_LIMIT) {
      return {
        allowed: false,
        error:
          "You've reached the daily session limit. Copy the prompt below to continue your ballot research in any free AI chatbot.",
        code: "DAILY_LIMIT",
      };
    }
    daily.count++;
  }

  // Track/update session
  sessions.set(sessionId, { count: messageCount, lastActive: Date.now() });
  activeSessions.set(ip, sessions);

  return { allowed: true };
}

export function releaseSession(ip: string, sessionId: string): void {
  const sessions = activeSessions.get(ip);
  if (sessions) {
    sessions.delete(sessionId);
    if (sessions.size === 0) {
      activeSessions.delete(ip);
    }
  }
}

// For testing
export function _resetForTesting(): void {
  activeSessions.clear();
  dailySessions.clear();
}
