const SESSION_MESSAGE_LIMIT = 60;
const IP_CONCURRENT_LIMIT = 3;
const IP_DAILY_NEW_SESSIONS = 5;

interface SessionRecord {
  messageCount: number;
  startedAt: number;
}

interface IpRecord {
  activeSessions: number;
  dailySessions: number;
  lastDayReset: number;
}

const sessions = new Map<string, SessionRecord>();
const ipRecords = new Map<string, IpRecord>();

function getDayKey(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getIpRecord(ip: string): IpRecord {
  const today = getDayKey();
  let record = ipRecords.get(ip);
  if (!record || record.lastDayReset !== today) {
    record = { activeSessions: 0, dailySessions: 0, lastDayReset: today };
    ipRecords.set(ip, record);
  }
  return record;
}

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "session_limit" | "concurrent_limit" | "daily_limit";
    };

export function checkSessionLimit(sessionId: string): RateLimitResult {
  const session = sessions.get(sessionId);
  if (session && session.messageCount >= SESSION_MESSAGE_LIMIT) {
    return { allowed: false, reason: "session_limit" };
  }
  return { allowed: true };
}

export function checkIpLimits(
  ip: string,
  isNewSession: boolean,
): RateLimitResult {
  const record = getIpRecord(ip);

  if (record.activeSessions >= IP_CONCURRENT_LIMIT) {
    return { allowed: false, reason: "concurrent_limit" };
  }

  if (isNewSession && record.dailySessions >= IP_DAILY_NEW_SESSIONS) {
    return { allowed: false, reason: "daily_limit" };
  }

  return { allowed: true };
}

export function startSession(sessionId: string, ip: string) {
  sessions.set(sessionId, { messageCount: 0, startedAt: Date.now() });
  const record = getIpRecord(ip);
  record.activeSessions++;
  record.dailySessions++;
}

export function recordMessage(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) session.messageCount++;
}

export function endSession(sessionId: string, ip: string) {
  sessions.delete(sessionId);
  const record = ipRecords.get(ip);
  if (record && record.activeSessions > 0) record.activeSessions--;
}
