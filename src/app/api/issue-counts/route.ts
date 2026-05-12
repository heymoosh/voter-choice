/**
 * GET /api/issue-counts?countyFips=<fips>
 *
 * Returns anonymous aggregate issue counts for a county.
 * Gracefully degrades if Upstash credentials are missing.
 * Privacy: only count:<fips>:<slug> keys — no PII stored.
 */

import { NextRequest, NextResponse } from "next/server";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";

export const runtime = "nodejs";

type IssueCounts = Record<string, number>;

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function getCountsFromRedis(
  countyFips: string,
): Promise<IssueCounts | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  const slugs = CANONICAL_ISSUES.map((i) => i.slug);
  const keys = slugs.map((s) => `count:${countyFips}:${s}`);

  try {
    // MGET via Upstash REST API
    const response = await fetch(`${redis.url}/mget/${keys.join("/")}`, {
      headers: { Authorization: `Bearer ${redis.token}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const results: (string | null)[] = data.result ?? [];

    const counts: IssueCounts = {};
    slugs.forEach((slug, i) => {
      const raw = results[i];
      counts[slug] = raw != null ? parseInt(String(raw), 10) || 0 : 0;
    });
    return counts;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const countyFips = searchParams.get("countyFips");

  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json(
      { error: "countyFips must be a 5-digit string" },
      { status: 400 },
    );
  }

  const issueCounts = await getCountsFromRedis(countyFips);

  if (!issueCounts) {
    // Graceful degradation: no Redis credentials → empty counts
    return NextResponse.json({
      countyFips,
      issueCounts: {},
      totalRespondents: null,
    });
  }

  return NextResponse.json({
    countyFips,
    issueCounts,
    totalRespondents: null, // intentional — we don't track unique respondents
  });
}
