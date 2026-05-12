import { NextRequest } from "next/server";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";

function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!validateOrigin(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { countyFips: string; issueSlug: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { countyFips, issueSlug } = body;

  if (!countyFips || !/^\d{4,5}$/.test(countyFips)) {
    return new Response(
      JSON.stringify({ error: "countyFips must be a 4-5 digit FIPS code" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const validSlug = CANONICAL_ISSUES.find((i) => i.slug === issueSlug);
  if (!validSlug) {
    return new Response(
      JSON.stringify({ error: `Unknown issueSlug: ${issueSlug}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!baseUrl || !token) {
    // Graceful degradation — no-op when Redis not configured
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const key = `count:${countyFips}:${issueSlug}`;
    const res = await fetch(`${baseUrl}/incr/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Redis INCR failed: ${res.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
