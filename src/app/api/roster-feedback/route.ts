/**
 * POST /api/roster-feedback
 *
 * "Missing a rep? Something look wrong? Help us improve our ballot
 * accuracy." — the post-launch correction channel for roster/ballot
 * errors (card "[P1] Ballot-accuracy feedback intake"). No auth; the only
 * PII risk is whatever the voter chooses to type into `message`.
 *
 * Rate-limited by IP, same durable infrastructure as /api/counters.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, DB_NOT_CONFIGURED } from "../../../../db/client";
import { rosterFeedback } from "../../../../db/schema";
import { checkRosterFeedbackRateLimit } from "../../../lib/server/roster-feedback-rate-limit";
import { getClientIP } from "../../../lib/server/client-ip";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const MAX_MESSAGE_LENGTH = 2000;
const MAX_SHORT_FIELD_LENGTH = 128;
const MAX_APP_CONTEXT_JSON_LENGTH = 4000;

interface RosterFeedbackBody {
  message: string;
  state: string | null;
  office: string | null;
  district: string | null;
  candidateRef: string | null;
  appContext: Record<string, unknown> | null;
}

function trimmedString(v: unknown, maxLength: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

function validateBody(body: unknown): RosterFeedbackBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.message !== "string") return null;
  const message = b.message.trim();
  if (message.length === 0) return null;
  if (message.length > MAX_MESSAGE_LENGTH) return null;

  // appContext: optional plain object, size-capped by its serialized length
  // so a caller can't smuggle an oversized payload through this field.
  let appContext: Record<string, unknown> | null = null;
  if (b.appContext !== undefined && b.appContext !== null) {
    if (typeof b.appContext !== "object" || Array.isArray(b.appContext)) {
      return null;
    }
    try {
      const serialized = JSON.stringify(b.appContext);
      if (serialized.length > MAX_APP_CONTEXT_JSON_LENGTH) return null;
      appContext = b.appContext as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return {
    message,
    state: trimmedString(b.state, 4)?.toUpperCase() ?? null,
    office: trimmedString(b.office, MAX_SHORT_FIELD_LENGTH),
    district: trimmedString(b.district, MAX_SHORT_FIELD_LENGTH),
    candidateRef: trimmedString(b.candidateRef, MAX_SHORT_FIELD_LENGTH),
    appContext,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIP(request);

  const rateLimitOk = await checkRosterFeedbackRateLimit(ip);
  if (!rateLimitOk) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded." },
      { status: 429 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }

  const body = validateBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    // Honest failure, not a silent drop: a submitted report that can't be
    // stored must not tell the voter it succeeded.
    return NextResponse.json(
      { ok: false, error: "Feedback storage is not configured." },
      { status: 503 },
    );
  }

  try {
    await db.insert(rosterFeedback).values({
      state: body.state,
      office: body.office,
      district: body.district,
      candidateRef: body.candidateRef,
      message: body.message,
      appContext: body.appContext,
    });
  } catch (err) {
    console.error("[roster-feedback] insert failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to store feedback." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
