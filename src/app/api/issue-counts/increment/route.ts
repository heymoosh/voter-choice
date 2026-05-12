/**
 * POST /api/issue-counts/increment
 * Increments the anonymous aggregate counter for an issue in a county.
 * - County FIPS is derived server-side from the session token (county slug)
 * - No PII stored; only aggregate counts
 * - Gracefully no-ops if Upstash is unavailable
 */

import { NextRequest, NextResponse } from "next/server";
import { incrementCount, isUpstashAvailable } from "@/lib/upstashClient";
import { CANONICAL_ISSUES } from "@/lib/canonicalIssues";

const VALID_ISSUE_SLUGS = new Set(CANONICAL_ISSUES.map((i) => i.key));

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Graceful degrade
  if (!isUpstashAvailable()) {
    return NextResponse.json({ success: true });
  }

  let issueSlug: string;
  let countyFips: string;

  try {
    const body = (await req.json()) as {
      issueSlug?: unknown;
      countyFips?: unknown;
    };

    if (
      typeof body.issueSlug !== "string" ||
      !VALID_ISSUE_SLUGS.has(body.issueSlug)
    ) {
      return NextResponse.json({ error: "Invalid issueSlug" }, { status: 400 });
    }

    if (typeof body.countyFips !== "string" || !body.countyFips.trim()) {
      return NextResponse.json(
        { error: "Missing countyFips" },
        { status: 400 },
      );
    }

    issueSlug = body.issueSlug;
    // Sanitize fips — allow only alphanumeric + hyphens/underscores
    countyFips = body.countyFips.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ok = await incrementCount(countyFips, issueSlug);

  return NextResponse.json({ success: ok });
}
