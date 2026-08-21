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
 * Reads a header value from `err.headers` regardless of whether it's a
 * plain-object-shaped map (today's SDK 0.39.0 — see `isUpstreamAccountExhausted`)
 * or a real `Headers`-like object exposing `.get(...)` (what a future SDK
 * version could hand us instead). Case-insensitive either way: a real
 * `Headers.get` already normalizes case, and the current Proxy shape does too.
 */
function retryAfterHeader(
  headers: InstanceType<typeof Anthropic.APIError>["headers"],
): string | null | undefined {
  if (headers && typeof (headers as { get?: unknown }).get === "function") {
    return (headers as unknown as { get: (name: string) => string | null }).get(
      "retry-after",
    );
  }
  return (headers as Record<string, string | null | undefined> | undefined)?.[
    "retry-after"
  ];
}

/**
 * True when `err` is a SUSTAINED, account-level block on the shared
 * Anthropic key — it stays blocked until someone raises a limit, fixes
 * billing, or Anthropic re-enables the org — as opposed to a transient
 * per-minute rate limit that clears on its own within seconds. This is a
 * DIFFERENT system from our own $50/mo community budget (budget.ts): the two
 * can be out of step, e.g. our tracked spend reads 0% while the org's
 * Anthropic account is capped. Five shapes, each verified live against
 * platform.claude.com before being added (never assumed from memory):
 *
 *   - 429 rate_limit_error, the usage tier's monthly spend cap: the response
 *     carries `error.details.error_code === "enforced_spend_limit_reached"`
 *     and — the docs' own fallback signal, in case that field ever moves —
 *     NO `retry-after` header ("the response has no retry-after header...
 *     [r]etrying... fails until access resumes"). An ordinary rate-limit 429
 *     always carries `retry-after`, so it never matches here. CONFIRMED:
 *     .../api/rate-limits documents this exact JSON shape verbatim.
 *   - 400 invalid_request_error, a self-configured org/workspace spend
 *     limit: message begins "You have reached your specified" (the two
 *     documented variants are "...API usage limits" and "...workspace API
 *     usage limits"). This is exactly what "raise the limit and it's fixed"
 *     describes. CONFIRMED: .../api/rate-limits states the message prefix
 *     verbatim.
 *   - 402 billing_error: a payment/billing problem on the account. CONFIRMED:
 *     .../api/errors lists this status+type in the documented HTTP error
 *     table.
 *   - 400, message begins "Your credit balance is too low" (prepaid credits
 *     exhausted, a DIFFERENT cause than the self-set spend limit above — no
 *     limit to raise, the account needs a top-up). NOT in the current
 *     platform.claude.com error docs (the errors/rate-limits pages fetched
 *     live for this fix don't mention "credit balance" at all), but STILL
 *     LIVE in production: multiple anthropics/claude-code GitHub issues
 *     reporting this exact message are open and recent as of Aug 2026 (a
 *     concern that this message "no longer exists" was floated during review
 *     but doesn't hold up against that evidence). Community reports disagree
 *     on the `error.type` value (some say `invalid_request_error`, one
 *     third-party error-taxonomy site labels it `insufficient_balance_error`)
 *     — since the type is unconfirmed, this branch matches on the message
 *     prefix ALONE, not `type`, so an unexpected type value can't cause a
 *     false negative here.
 *   - 403 permission_error: unconditional on status+type, no message anchor
 *     needed — CONFIRMED, .../api/errors documents the ENTIRE 403 type as
 *     "Your API key does not have permission to use the specified resource
 *     ... Check your organization's access and workspace settings," an
 *     API-key/org-permission problem by definition, not a per-request
 *     validation failure like 400's catch-all `invalid_request_error`.
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
    // Read defensively rather than assume one shape. Today (SDK 0.39.0),
    // `err.headers` is correctly typed as `Record<string, string | null |
    // undefined>` (core.d.ts) and is built by `createResponseHeaders`
    // (core.js) as a plain object wrapped in a case-insensitive `Proxy` —
    // bracket access is correct. But a real thrown APIError's `headers` is
    // an SDK internal, not a documented contract: a future SDK bump (a
    // dependabot PR already proposes 0.39.0 → 0.116.0) could hand us an
    // actual `Headers`-like object exposing only `.get(...)`, in which case
    // bracket access would silently read `undefined` and turn EVERY
    // ordinary rate-limited 429 into a false "account exhausted" match.
    // Handle both.
    return type === "rate_limit_error" && !retryAfterHeader(err.headers);
  }
  if (err.status === 400) {
    if (
      type === "invalid_request_error" &&
      message.startsWith("You have reached your specified")
    ) {
      return true;
    }
    // Prepaid credits exhausted — see the doc comment above for why this is
    // matched on message text alone, not `type`.
    return message.startsWith("Your credit balance is too low");
  }
  if (err.status === 402) {
    return type === "billing_error";
  }
  return err.status === 403 && type === "permission_error";
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
