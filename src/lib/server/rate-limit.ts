import { isDurableStoreConfigured, redisCommand } from "./durable-store";

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
const SESSION_TIMEOUT_SECONDS = SESSION_TIMEOUT_MS / 1000;

function secondsUntilNextUtcMidnight(): number {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((tomorrow.getTime() - Date.now()) / 1000));
}

function dayKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function rateKey(ip: string, suffix: string): string {
  return `voter-choice:rate:${dayKey()}:${ip}:${suffix}`;
}

function sessionLimitResult(): RateLimitResult {
  return {
    allowed: false,
    error:
      "You've reached the message limit for this session. Copy the prompt below to continue in your own AI chatbot.",
    code: "SESSION_LIMIT",
  };
}

function concurrentLimitResult(): RateLimitResult {
  return {
    allowed: false,
    error:
      "Too many active sessions. Please close other tabs and try again, or copy the prompt to use in your own AI chatbot.",
    code: "CONCURRENT_LIMIT",
  };
}

function dailyLimitResult(): RateLimitResult {
  return {
    allowed: false,
    error:
      "You've reached the daily session limit. Copy the prompt below to continue your ballot research in any free AI chatbot.",
    code: "DAILY_LIMIT",
  };
}

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
  cleanExpiredSessions(ip);

  const sessions = activeSessions.get(ip) ?? new Map<string, SessionEntry>();
  const existing = sessions.get(sessionId);
  const isNewSession = !sessions.has(sessionId);
  const reportedCount =
    Number.isFinite(messageCount) && messageCount > 0
      ? Math.floor(messageCount)
      : 1;
  const authoritativeCount = existing
    ? Math.max(existing.count + 1, reportedCount)
    : reportedCount;

  // 1. Per-session message limit. The client reports its message count for UX,
  // but the server refuses under-reporting by incrementing its own session state.
  if (authoritativeCount > SESSION_MESSAGE_LIMIT) {
    return sessionLimitResult();
  }

  // 2. Concurrent session limit
  if (isNewSession && sessions.size >= CONCURRENT_LIMIT) {
    return concurrentLimitResult();
  }

  // 3. Daily new session limit
  if (isNewSession) {
    const daily = getDailyEntry(ip);
    if (daily.count >= DAILY_SESSION_LIMIT) {
      return dailyLimitResult();
    }
    daily.count++;
  }

  // Track/update session
  sessions.set(sessionId, {
    count: authoritativeCount,
    lastActive: Date.now(),
  });
  activeSessions.set(ip, sessions);

  return { allowed: true };
}

async function checkDurableRateLimit(
  ip: string,
  sessionId: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const sessionMessagesKey = rateKey(ip, `session:${sessionId}:messages`);
  const activeSessionsKey = rateKey(ip, "active-sessions");
  const dailySeenKey = rateKey(ip, `seen:${sessionId}`);
  const dailyCountKey = rateKey(ip, "daily-sessions");
  const sessionCount = Number(
    (await redisCommand<number>(["INCR", sessionMessagesKey])) ?? 1,
  );
  await redisCommand(["EXPIRE", sessionMessagesKey, SESSION_TIMEOUT_SECONDS]);

  if (sessionCount > SESSION_MESSAGE_LIMIT) {
    return sessionLimitResult();
  }

  await redisCommand([
    "ZREMRANGEBYSCORE",
    activeSessionsKey,
    0,
    now - SESSION_TIMEOUT_MS,
  ]);
  const existingScore = await redisCommand<string>([
    "ZSCORE",
    activeSessionsKey,
    sessionId,
  ]);
  const isNewSession = existingScore === null;
  await redisCommand(["ZADD", activeSessionsKey, now, sessionId]);
  await redisCommand(["EXPIRE", activeSessionsKey, SESSION_TIMEOUT_SECONDS]);

  const activeCount = Number(
    (await redisCommand<number>(["ZCARD", activeSessionsKey])) ?? 0,
  );
  if (isNewSession && activeCount > CONCURRENT_LIMIT) {
    await redisCommand(["ZREM", activeSessionsKey, sessionId]);
    await redisCommand(["DEL", sessionMessagesKey]);
    return concurrentLimitResult();
  }

  if (isNewSession) {
    const dayTtl = secondsUntilNextUtcMidnight();
    const markedSeen = await redisCommand<string>([
      "SET",
      dailySeenKey,
      "1",
      "EX",
      dayTtl,
      "NX",
    ]);
    if (markedSeen) {
      const dailyCount = Number(
        (await redisCommand<number>(["INCR", dailyCountKey])) ?? 1,
      );
      await redisCommand(["EXPIRE", dailyCountKey, dayTtl]);
      if (dailyCount > DAILY_SESSION_LIMIT) {
        await redisCommand(["ZREM", activeSessionsKey, sessionId]);
        await redisCommand(["DEL", sessionMessagesKey]);
        await redisCommand(["DEL", dailySeenKey]);
        return dailyLimitResult();
      }
    }
  }

  return { allowed: true };
}

export async function checkRateLimitAsync(
  ip: string,
  sessionId: string,
  messageCount: number,
): Promise<RateLimitResult> {
  if (!isDurableStoreConfigured()) {
    return checkRateLimit(ip, sessionId, messageCount);
  }
  try {
    return await checkDurableRateLimit(ip, sessionId);
  } catch (err) {
    console.error("Durable rate limit failed:", err);
    return {
      allowed: false,
      error: "Rate limit service is temporarily unavailable.",
      code: "DAILY_LIMIT",
    };
  }
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
