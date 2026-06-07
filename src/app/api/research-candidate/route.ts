/**
 * POST /api/research-candidate
 *
 * On-demand structured web research for ONE candidate, used as a card-level
 * fallback when the deterministic /api/race-data has no DB record (voting
 * record / funding) for them. Drives `researchAndPersistCandidate` (structured
 * Haiku + web_search) which returns per-issue AlignmentScore[] and persists
 * them to `candidate_data` for future lookups.
 *
 * The response shape changed from the old prose summary to structured scores:
 *   { scores: AlignmentScore[] }    — one or more issues found
 *   { unavailable: true }           — no citable sources found for any issue
 *   { error: string, code: string } — request error / service not configured
 *
 * ANONYMITY: the caller (workspace) MUST only invoke this for a candidate the
 * voter has revealed (blind mode off, or that card individually revealed). The
 * scores are keyed on the real name and contain it — rendering inside a
 * still-blinded card would blow anonymity. This route trusts the caller's gate.
 *
 * Rate-limited by IP (fail-open, same as /api/race-data). Budget usage is
 * recorded inside the sub-agent (recordUsageAsync), so spend stays visible.
 */
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRaceDataRateLimit } from "../../../lib/server/race-data-rate-limit";
import { researchAndPersistCandidate } from "../../../lib/server/candidate-data";

const MAX_FIELD = 300;
const MAX_ISSUES = 10;

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  if (!(await checkRaceDataRateLimit(ip))) {
    return Response.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const candidateName = str(b.candidateName);
  const jurisdiction = str(b.jurisdiction);
  const cycle = str(b.cycle) || "2026";

  if (
    !candidateName ||
    candidateName.length > MAX_FIELD ||
    jurisdiction.length > MAX_FIELD ||
    cycle.length > MAX_FIELD
  ) {
    return Response.json({ error: "Invalid fields" }, { status: 400 });
  }

  // issues: [{ canonicalIssue, issueLabel? }]
  const rawIssues = Array.isArray(b.issues) ? b.issues : [];
  const issues = rawIssues
    .slice(0, MAX_ISSUES)
    .filter(
      (i): i is { canonicalIssue: string; issueLabel?: string } =>
        i !== null &&
        typeof i === "object" &&
        typeof (i as Record<string, unknown>).canonicalIssue === "string" &&
        (i as Record<string, unknown>).canonicalIssue !== "",
    );

  if (issues.length === 0) {
    return Response.json(
      { error: "At least one issue is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_VOTER_API;
  if (!apiKey) {
    return Response.json(
      { error: "Research service is not configured" },
      { status: 500 },
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    const scores = await researchAndPersistCandidate(
      candidateName,
      jurisdiction || "unknown",
      cycle,
      issues,
      client,
    );
    if (scores.length === 0) {
      return Response.json({ unavailable: true });
    }
    return Response.json({ scores });
  } catch {
    return Response.json(
      { error: "Research failed", code: "RESEARCH_ERROR" },
      { status: 502 },
    );
  }
}
