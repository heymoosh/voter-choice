import { NextRequest } from "next/server";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";

type IssueCountsResponse = {
  countyFips: string;
  issueCounts: Record<string, number>;
  totalRespondents: null;
};

async function getRedisCount(
  baseUrl: string,
  token: string,
  key: string,
): Promise<number> {
  const res = await fetch(`${baseUrl}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { result: string | null };
  return data.result ? parseInt(data.result, 10) || 0 : 0;
}

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const countyFips = searchParams.get("countyFips");

  if (!countyFips || !/^\d{4,5}$/.test(countyFips)) {
    return new Response(
      JSON.stringify({ error: "countyFips is required (4-5 digit FIPS code)" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!baseUrl || !token) {
    // Graceful degradation: return zeroed counts
    const issueCounts: Record<string, number> = {};
    for (const issue of CANONICAL_ISSUES) {
      issueCounts[issue.slug] = 0;
    }
    return new Response(
      JSON.stringify({
        countyFips,
        issueCounts,
        totalRespondents: null,
      } satisfies IssueCountsResponse),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const issueCounts: Record<string, number> = {};
    await Promise.all(
      CANONICAL_ISSUES.map(async (issue) => {
        const key = `count:${countyFips}:${issue.slug}`;
        issueCounts[issue.slug] = await getRedisCount(baseUrl, token, key);
      }),
    );

    return new Response(
      JSON.stringify({
        countyFips,
        issueCounts,
        totalRespondents: null,
      } satisfies IssueCountsResponse),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
