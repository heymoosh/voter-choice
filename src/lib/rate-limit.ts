export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

const MAX_MESSAGES_PER_SESSION = 60;
const MAX_CONCURRENT_SESSIONS_PER_IP = 3;
const MAX_DAILY_SESSIONS_PER_IP = 5;

export class RateLimiter {
  private sessionMessages = new Map<string, number>();
  private ipConcurrentSessions = new Map<string, Set<string>>();
  private ipDailySessions = new Map<
    string,
    { count: number; resetAt: number }
  >();

  async checkNewSession(ip: string): Promise<RateLimitResult> {
    const daily = this.getDailyRecord(ip);
    if (daily.count >= MAX_DAILY_SESSIONS_PER_IP) {
      return {
        allowed: false,
        reason: `Daily session limit reached (max ${MAX_DAILY_SESSIONS_PER_IP}/day)`,
      };
    }

    const concurrent = this.ipConcurrentSessions.get(ip)?.size ?? 0;
    if (concurrent >= MAX_CONCURRENT_SESSIONS_PER_IP) {
      return {
        allowed: false,
        reason: `Too many concurrent sessions (max ${MAX_CONCURRENT_SESSIONS_PER_IP})`,
      };
    }

    return { allowed: true };
  }

  async recordNewSession(ip: string, sessionId: string): Promise<void> {
    if (!this.ipConcurrentSessions.has(ip)) {
      this.ipConcurrentSessions.set(ip, new Set());
    }
    this.ipConcurrentSessions.get(ip)!.add(sessionId);

    const daily = this.getDailyRecord(ip);
    daily.count++;
    this.ipDailySessions.set(ip, daily);
  }

  async endSession(ip: string, sessionId: string): Promise<void> {
    this.ipConcurrentSessions.get(ip)?.delete(sessionId);
    this.sessionMessages.delete(sessionId);
  }

  async checkMessage(sessionId: string): Promise<RateLimitResult> {
    const count = this.sessionMessages.get(sessionId) ?? 0;
    if (count >= MAX_MESSAGES_PER_SESSION) {
      return {
        allowed: false,
        reason: `Message limit reached (max ${MAX_MESSAGES_PER_SESSION} per session)`,
      };
    }
    return { allowed: true };
  }

  async recordMessage(sessionId: string): Promise<void> {
    this.sessionMessages.set(
      sessionId,
      (this.sessionMessages.get(sessionId) ?? 0) + 1,
    );
  }

  private getDailyRecord(ip: string): { count: number; resetAt: number } {
    const now = Date.now();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const resetAt = midnight.getTime();

    const existing = this.ipDailySessions.get(ip);
    if (!existing || now >= existing.resetAt) {
      return { count: 0, resetAt };
    }
    return existing;
  }
}

export const rateLimiter = new RateLimiter();
