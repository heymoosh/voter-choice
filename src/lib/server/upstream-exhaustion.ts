/**
 * Detects a SUSTAINED, account-level block on the shared Anthropic key — as
 * opposed to a transient per-minute rate limit — and the shared 503 payload
 * every AI route emits for it. Shared by /api/chat and /api/research-candidate
 * so the copy and the `code` stay identical instead of drifting per route.
 */
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Fields the Anthropic error body carries for the two sustained,
 * account-level blocks below — narrower than (and not covered by) the SDK's
 * own typed `ErrorObject` union, which doesn't model the 429 spend-cap
 * `details.error_code` field. Shapes verified against the current API docs
 * (platform.claude.com/docs/en/api/errors and .../api/rate-limits), not
 * assumed from memory.
 */
interface UpstreamErrorBody {
  error?: {
    type?: string;
    message?: string;
    details?: { error_code?: string };
  };
}

/**
 * True when `err` is a SUSTAINED, account-level block on the shared
 * Anthropic key — it stays blocked until someone raises a limit or fixes
 * billing — as opposed to a transient per-minute rate limit that clears on
 * its own within seconds. This is a DIFFERENT system from our own $50/mo
 * community budget (budget.ts): the two can be out of step, e.g. our tracked
 * spend reads 0% while the org's Anthropic account is capped. Three
 * documented shapes:
 *
 *   - 429 rate_limit_error, the usage tier's monthly spend cap: the response
 *     carries `error.details.error_code === "enforced_spend_limit_reached"`
 *     and — the docs' own fallback signal, in case that field ever moves —
 *     NO `retry-after` header ("the response has no retry-after header...
 *     [r]etrying... fails until access resumes"). An ordinary rate-limit 429
 *     always carries `retry-after`, so it never matches here.
 *   - 400 invalid_request_error, a self-configured org/workspace spend
 *     limit: message begins "You have reached your specified" (the two
 *     documented variants are "...API usage limits" and "...workspace API
 *     usage limits"). This is exactly what "raise the limit and it's fixed"
 *     describes.
 *   - 402 billing_error: a payment/billing problem on the account.
 */
export function isUpstreamAccountExhausted(
  err: InstanceType<typeof Anthropic.APIError>,
): boolean {
  const body = err.error as UpstreamErrorBody | undefined;
  const type = body?.error?.type;
  const message = body?.error?.message ?? "";
  if (err.status === 429) {
    if (body?.error?.details?.error_code === "enforced_spend_limit_reached") {
      return true;
    }
    // `err.headers` is typed as the SDK's `Headers` interface, which reads
    // like it should be `.get("retry-after")` — but the SDK actually
    // constructs this object via `createResponseHeaders` (core.js), which
    // wraps a plain object in a case-insensitive `Proxy` and is what's
    // attached to a real thrown APIError. Bracket access is correct at
    // runtime; do not "fix" this to `.get(...)`.
    return type === "rate_limit_error" && !err.headers?.["retry-after"];
  }
  if (err.status === 400) {
    return (
      type === "invalid_request_error" &&
      message.startsWith("You have reached your specified")
    );
  }
  return err.status === 402 && type === "billing_error";
}

/** `BlockReason` / response `code` for a sustained upstream account block. */
export const UPSTREAM_EXHAUSTED_CODE = "BUDGET_UPSTREAM_EXHAUSTED" as const;

/**
 * User-facing copy for a sustained upstream account block. Must not claim
 * OUR $50/mo community budget is what's exhausted (it may be nowhere near
 * it) — this is Anthropic's account-level limit, tracked separately from
 * budget.ts.
 */
export const UPSTREAM_EXHAUSTED_MESSAGE =
  "Voter Choice's shared AI access is temporarily on hold — this isn't our community budget (that's tracked separately and may still be healthy), it's a limit on the shared account itself. Paste your own Anthropic key below to keep going right now, or continue in another chatbot.";

/** The one 503 body every AI route emits for a sustained upstream block. */
export function upstreamExhaustedResponse(): Response {
  return Response.json(
    { error: UPSTREAM_EXHAUSTED_MESSAGE, code: UPSTREAM_EXHAUSTED_CODE },
    { status: 503 },
  );
}
