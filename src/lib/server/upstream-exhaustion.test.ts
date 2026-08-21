/**
 * src/lib/server/upstream-exhaustion.test.ts
 *
 * Unit tests for the shared sustained-account-block detector, isolated from
 * both call sites (/api/chat, /api/research-candidate). Shapes are taken
 * from the current Anthropic API docs (platform.claude.com/docs/en/api/errors,
 * .../api/rate-limits), not assumed — see isUpstreamAccountExhausted's doc
 * comment.
 */
import { describe, it, expect } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import {
  isUpstreamAccountExhausted,
  upstreamExhaustedResponse,
  UPSTREAM_EXHAUSTED_CODE,
} from "./upstream-exhaustion";

/** Build a real Anthropic.APIError (or subclass) via the SDK's own
 *  `.generate()`, exactly as core.js does when a real response comes back
 *  non-OK. `headers` defaults to no `retry-after`, matching the documented
 *  spend-cap / spend-limit shapes. */
function apiError(
  status: number,
  errorBody: { type?: string; message?: string; details?: unknown },
  headers: Record<string, string> = {},
): InstanceType<typeof Anthropic.APIError> {
  return (
    Anthropic as unknown as {
      APIError: {
        generate: (
          ...args: unknown[]
        ) => InstanceType<typeof Anthropic.APIError>;
      };
    }
  ).APIError.generate(
    status,
    { type: "error", error: errorBody, request_id: "req_test" },
    undefined,
    headers,
  );
}

describe("isUpstreamAccountExhausted", () => {
  it("is true for a 429 tier spend-cap block (enforced_spend_limit_reached, no retry-after)", () => {
    const err = apiError(429, {
      type: "rate_limit_error",
      message: "You have reached your API usage limits.",
      details: { error_code: "enforced_spend_limit_reached" },
    });
    expect(isUpstreamAccountExhausted(err)).toBe(true);
  });

  it("is true for the same spend-cap block via the retry-after fallback when details.error_code is absent", () => {
    const err = apiError(429, {
      type: "rate_limit_error",
      message: "You have reached your API usage limits.",
      // No `details` field — exercises the documented fallback signal: a
      // spend-cap 429 never carries retry-after.
    });
    expect(isUpstreamAccountExhausted(err)).toBe(true);
  });

  it("is false for an ordinary 429 rate limit (has retry-after, no spend-cap error_code)", () => {
    const err = apiError(
      429,
      {
        type: "rate_limit_error",
        message: "Number of requests has exceeded your rate limit.",
      },
      { "retry-after": "2" },
    );
    expect(isUpstreamAccountExhausted(err)).toBe(false);
  });

  it("is true for a 400 self-set org/workspace spend-limit block", () => {
    const err = apiError(400, {
      type: "invalid_request_error",
      message: "You have reached your specified API usage limits.",
    });
    expect(isUpstreamAccountExhausted(err)).toBe(true);
  });

  it("is false for an ordinary malformed-request 400", () => {
    const err = apiError(400, {
      type: "invalid_request_error",
      message: "messages: at least one message is required.",
    });
    expect(isUpstreamAccountExhausted(err)).toBe(false);
  });

  it("is true for a 402 billing_error", () => {
    const err = apiError(402, {
      type: "billing_error",
      message: "There's an issue with your billing or payment information.",
    });
    expect(isUpstreamAccountExhausted(err)).toBe(true);
  });

  it("is false for a plain 500", () => {
    const err = apiError(500, {
      type: "api_error",
      message: "Internal server error",
    });
    expect(isUpstreamAccountExhausted(err)).toBe(false);
  });
});

describe("upstreamExhaustedResponse", () => {
  it("emits the shared 503 payload", async () => {
    const res = upstreamExhaustedResponse();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe(UPSTREAM_EXHAUSTED_CODE);
    expect(body.error).not.toBe("");
  });
});
