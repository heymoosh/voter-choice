interface SessionRecord {
  messageCount: number;
  startedAt: number;
}

interface IPRecord {
  activeSessions: Set<string>;
  dailySessions: number;
  dayStartedAt: number;
}

const PER_SESSION_MESSAGE_LIMIT = 60;
const PER_IP_CONCURRENT_LIMIT = 3;
const PER_IP_DAILY_LIMIT = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const sessions = new Map<string, SessionRecord>();
const ipRecords = new Map<string, IPRecord>();

function getIPRecord(ip: string): IPRecord {
  let rec = ipRecords.get(ip);
  const now = Date.now();
  if (!rec || now - rec.dayStartedAt > ONE_DAY_MS) {
    rec = { activeSessions: new Set(), dailySessions: 0, dayStartedAt: now };
    ipRecords.set(ip, rec);
  }
  return rec;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function checkNewSession(ip: string): RateLimitResult {
  const rec = getIPRecord(ip);
  if (rec.activeSessions.size >= PER_IP_CONCURRENT_LIMIT) {
    return {
      allowed: false,
      reason: "Too many concurrent sessions from this IP.",
    };
  }
  if (rec.dailySessions >= PER_IP_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "Daily session limit reached for this IP.",
    };
  }
  return { allowed: true };
}

export function startSession(ip: string, sessionId: string): void {
  const rec = getIPRecord(ip);
  rec.activeSessions.add(sessionId);
  rec.dailySessions += 1;
  sessions.set(sessionId, { messageCount: 0, startedAt: Date.now() });
}

export function endSession(ip: string, sessionId: string): void {
  const rec = getIPRecord(ip);
  rec.activeSessions.delete(sessionId);
  sessions.delete(sessionId);
}

export function checkMessage(sessionId: string): RateLimitResult {
  const session = sessions.get(sessionId);
  if (!session) return { allowed: false, reason: "Session not found." };
  if (session.messageCount >= PER_SESSION_MESSAGE_LIMIT) {
    return { allowed: false, reason: "Session message limit reached." };
  }
  return { allowed: true };
}

export function recordMessage(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) session.messageCount += 1;
}
