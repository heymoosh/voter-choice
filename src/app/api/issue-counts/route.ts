import { NextRequest, NextResponse } from "next/server";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";

// Upstash Redis REST client (lightweight, no SDK dependency)
async function redisCommand(
  url: string,
  token: string,
  command: string[],
): Promise<unknown> {
  const res = await fetch(
    `${url}/${command.map(encodeURIComponent).join("/")}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const data = await res.json();
  return data.result;
}

async function redisPost(
  url: string,
  token: string,
  command: unknown[],
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const data = await res.json();
  return data.result;
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

const validSlugs = new Set(CANONICAL_ISSUES.map((i) => i.slug));

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countyFips = searchParams.get("countyFips");

  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json(
      { error: "countyFips must be a 5-digit FIPS code" },
      { status: 400 },
    );
  }

  const redis = getRedisConfig();
  if (!redis) {
    // Graceful degradation: return empty counts
    const empty: Record<string, number> = {};
    CANONICAL_ISSUES.forEach((i) => (empty[i.slug] = 0));
    return NextResponse.json({
      countyFips,
      issueCounts: empty,
      totalRespondents: null,
    });
  }

  try {
    const keys = CANONICAL_ISSUES.map((i) => `count:${countyFips}:${i.slug}`);

    // Fetch all counts in a pipeline (MGET)
    const result = (await redisPost(redis.url, redis.token, [
      "MGET",
      ...keys,
    ])) as (string | null)[];

    const issueCounts: Record<string, number> = {};
    CANONICAL_ISSUES.forEach((issue, idx) => {
      issueCounts[issue.slug] = parseInt(result?.[idx] ?? "0", 10) || 0;
    });

    return NextResponse.json({
      countyFips,
      issueCounts,
      totalRespondents: null,
    });
  } catch (err) {
    console.error("issue-counts GET error:", err);
    // Graceful degradation
    const empty: Record<string, number> = {};
    CANONICAL_ISSUES.forEach((i) => (empty[i.slug] = 0));
    return NextResponse.json({
      countyFips,
      issueCounts: empty,
      totalRespondents: null,
    });
  }
}

export async function POST(req: NextRequest) {
  // Same-origin check
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: { countyFips?: string; issueSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { countyFips, issueSlug } = body;

  if (!countyFips || !/^\d{5}$/.test(countyFips)) {
    return NextResponse.json(
      { error: "countyFips must be a 5-digit FIPS code" },
      { status: 400 },
    );
  }

  if (!issueSlug || !validSlugs.has(issueSlug)) {
    return NextResponse.json(
      { error: "issueSlug must be a valid canonical issue slug" },
      { status: 400 },
    );
  }

  const redis = getRedisConfig();
  if (!redis) {
    // Graceful degradation: act as if succeeded
    return NextResponse.json({ success: true });
  }

  try {
    const key = `count:${countyFips}:${issueSlug}`;
    await redisCommand(redis.url, redis.token, ["INCR", key]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("issue-counts POST error:", err);
    // Graceful degradation
    return NextResponse.json({ success: true });
  }
}
