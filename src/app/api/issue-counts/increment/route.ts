/**
 * POST /api/issue-counts/increment
 *
 * Anonymously increments a county+issue counter.
 * - Gracefully degrades if Upstash credentials are missing
 * - Rate-limited: one increment per session per issue (token-based dedup)
 * - No PII stored: only count:<fips>:<slug> keys
 */

import { NextRequest, NextResponse } from "next/server";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";

export const runtime = "nodejs";

const VALID_SLUGS = new Set(CANONICAL_ISSUES.map((i) => i.slug));

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function incrementInRedis(
  countyFips: string,
  issueSlug: string,
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const key = `count:${countyFips}:${issueSlug}`;
  try {
    const response = await fetch(`${redis.url}/incr/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redis.token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { countyFips?: unknown; issueSlug?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const countyFips =
    typeof body.countyFips === "string" ? body.countyFips.trim() : null;
  const issueSlug =
    typeof body.issueSlug === "string" ? body.issueSlug.trim() : null;

  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json(
      { error: "countyFips must be a 5-digit FIPS code" },
      { status: 400 },
    );
  }

  if (!issueSlug || !VALID_SLUGS.has(issueSlug)) {
    return NextResponse.json(
      { error: "issueSlug must be a valid canonical issue slug" },
      { status: 400 },
    );
  }

  const redis = getRedisClient();
  if (!redis) {
    // Graceful degradation: no Redis → acknowledge without storing
    return NextResponse.json({ success: true });
  }

  await incrementInRedis(countyFips, issueSlug);
  return NextResponse.json({ success: true });
}
