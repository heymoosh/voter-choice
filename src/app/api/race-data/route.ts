/**
 * POST /api/race-data
 *
 * Deterministic, LLM-free assembly of a race's candidate-card data. Takes the
 * race (label + section + state), its candidate roster, and the voter's ranked
 * issues (with canonical ids + stance), and returns the `RacePatternsBlock` +
 * `AlignmentScoresBlock` shapes the cards-first workspace renders directly.
 *
 * This replaces the prior chat-emitted-cards path: the workspace no longer
 * scrapes candidate cards out of an LLM message — it fetches them here. The
 * underlying lookups (`lookupDonorCoalition`, `lookupAlignment`) hit the same
 * backend DB the chat tools used; there is NO Anthropic call in this route.
 *
 * Rate-limited by IP (same pattern as /api/donors and /api/alignment).
 * Results cached for one hour via Vercel cache headers (the underlying data
 * is per-cycle static).
 */

import { NextRequest } from "next/server";
import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";
import {
  assembleRaceData,
  type RaceDataInput,
} from "../../../lib/server/race-data";
import { CANONICAL_ISSUE_LABELS } from "../../../lib/canonicalIssues";

const MAX_CANDIDATES = 20;
const MAX_ISSUES = 10;

interface ParsedBody {
  raceId: string;
  raceLabel: string;
  section: string;
  stateCode: string;
  candidates: { name: string; party?: string }[];
  issues: RaceDataInput["issues"];
  electionCycle?: string;
}

/** Validate + normalize the request body. Returns a 400 Response on failure. */
function parseBody(body: unknown): ParsedBody | Response {
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const raceId = typeof b.raceId === "string" ? b.raceId.trim() : "";
  const raceLabel = typeof b.raceLabel === "string" ? b.raceLabel.trim() : "";
  const section = typeof b.section === "string" ? b.section.trim() : "";
  const stateCode =
    typeof b.stateCode === "string" ? b.stateCode.trim().toUpperCase() : "";

  if (!raceLabel || raceLabel.length > 200) {
    return Response.json({ error: "Invalid raceLabel" }, { status: 400 });
  }
  if (!stateCode || stateCode.length > 4) {
    return Response.json({ error: "Invalid stateCode" }, { status: 400 });
  }

  if (!Array.isArray(b.candidates) || b.candidates.length > MAX_CANDIDATES) {
    return Response.json({ error: "Invalid candidates" }, { status: 400 });
  }
  const candidates: { name: string; party?: string }[] = [];
  for (const c of b.candidates) {
    if (typeof c !== "object" || c === null) continue;
    const rec = c as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name || name.length > 200) continue;
    candidates.push({
      name,
      party: typeof rec.party === "string" ? rec.party : undefined,
    });
  }

  // Issues are optional (voter may have skipped ranking). Validate each:
  // canonicalIssue must be in the known vocabulary; stance must be valid.
  // Drop malformed issues rather than 400-ing the whole request.
  const issues: RaceDataInput["issues"] = [];
  if (Array.isArray(b.issues)) {
    for (const raw of b.issues.slice(0, MAX_ISSUES)) {
      if (typeof raw !== "object" || raw === null) continue;
      const rec = raw as Record<string, unknown>;
      const canonicalIssue =
        typeof rec.canonicalIssue === "string" ? rec.canonicalIssue : "";
      if (!(canonicalIssue in CANONICAL_ISSUE_LABELS)) continue;
      const stance =
        rec.stance === "in_favor" || rec.stance === "opposed"
          ? rec.stance
          : "in_favor";
      issues.push({
        canonicalIssue,
        issueLabel:
          typeof rec.issueLabel === "string" ? rec.issueLabel : undefined,
        stance,
      });
    }
  }

  const electionCycle =
    typeof b.electionCycle === "string" &&
    /^\d{4}$/.test(b.electionCycle.trim())
      ? b.electionCycle.trim()
      : undefined;

  return {
    raceId,
    raceLabel,
    section,
    stateCode,
    candidates,
    issues,
    electionCycle,
  };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitOk = await checkCounterRateLimit(ip);
  if (!rateLimitOk) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (parsed instanceof Response) return parsed;

  try {
    const data = await assembleRaceData(parsed);
    // Per-cycle static data → cache aggressively at the edge, like /api/donors.
    return Response.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "race_data.error",
        raceId: parsed.raceId,
        raceLabel: parsed.raceLabel,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return Response.json(
      { error: "Failed to assemble race data" },
      { status: 500 },
    );
  }
}
