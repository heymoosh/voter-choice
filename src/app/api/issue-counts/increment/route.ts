import { type NextRequest, NextResponse } from "next/server";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function upstashAvailable(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

async function upstashIncr(key: string): Promise<boolean> {
  if (!upstashAvailable()) return false;
  try {
    const res = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

const VALID_SLUGS = new Set(CANONICAL_ISSUES.map((i) => i.slug));

interface IncrementRequest {
  countyFips: string;
  issueSlug: string;
}

export async function POST(request: NextRequest) {
  // Same-origin check
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && !origin.includes(host.split(":")[0])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: IncrementRequest;
  try {
    body = (await request.json()) as IncrementRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { countyFips, issueSlug } = body;

  if (!countyFips || typeof countyFips !== "string") {
    return NextResponse.json(
      { error: "countyFips string required" },
      { status: 400 },
    );
  }

  if (!issueSlug || typeof issueSlug !== "string") {
    return NextResponse.json(
      { error: "issueSlug string required" },
      { status: 400 },
    );
  }

  // Validate FIPS: must be 5 digits
  if (!/^\d{5}$/.test(countyFips)) {
    return NextResponse.json(
      { error: "Invalid countyFips format" },
      { status: 400 },
    );
  }

  // Validate issue slug is canonical
  if (
    !VALID_SLUGS.has(issueSlug as (typeof CANONICAL_ISSUES)[number]["slug"])
  ) {
    return NextResponse.json({ error: "Unknown issueSlug" }, { status: 400 });
  }

  // Graceful degradation: if Upstash not configured, succeed silently
  if (!upstashAvailable()) {
    return NextResponse.json({ success: true });
  }

  const key = `count:${countyFips}:${issueSlug}`;
  await upstashIncr(key);

  return NextResponse.json({ success: true });
}
