import { type NextRequest, NextResponse } from "next/server";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function upstashAvailable(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

async function upstashGet(key: string): Promise<number | null> {
  if (!upstashAvailable()) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string | null };
    return data.result ? parseInt(data.result, 10) : 0;
  } catch {
    return null;
  }
}

async function upstashKeys(pattern: string): Promise<string[]> {
  if (!upstashAvailable()) return [];
  try {
    const res = await fetch(
      `${UPSTASH_URL}/keys/${encodeURIComponent(pattern)}`,
      {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { result: string[] };
    return data.result ?? [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countyFips = searchParams.get("countyFips");

  if (!countyFips) {
    return NextResponse.json({ error: "countyFips required" }, { status: 400 });
  }

  // Graceful degradation when Upstash not configured
  if (!upstashAvailable()) {
    return NextResponse.json({
      countyFips,
      issueCounts: {},
      totalRespondents: null,
    });
  }

  try {
    const keyPattern = `count:${countyFips}:*`;
    const keys = await upstashKeys(keyPattern);

    const issueCounts: Record<string, number> = {};

    await Promise.all(
      keys.map(async (key) => {
        const parts = key.split(":");
        const issueSlug = parts.slice(2).join(":");
        const count = await upstashGet(key);
        if (issueSlug && count !== null) {
          issueCounts[issueSlug] = count;
        }
      }),
    );

    return NextResponse.json({
      countyFips,
      issueCounts,
      totalRespondents: null,
    });
  } catch {
    return NextResponse.json({
      countyFips,
      issueCounts: {},
      totalRespondents: null,
    });
  }
}
