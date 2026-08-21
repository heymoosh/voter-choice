import { describe, it, expect, vi, beforeEach } from "vitest";

const streamChatReply = vi.fn();
const streamWithByok = vi.fn();
const hasByokKey = vi.fn();

vi.mock("../realData", () => ({
  streamChatReply: (...args: unknown[]) => streamChatReply(...args),
}));
vi.mock("../../lib/anthropic-client-byok", () => ({
  streamWithByok: (...args: unknown[]) => streamWithByok(...args),
  hasByokKey: () => hasByokKey(),
}));

import {
  sendChatTurn,
  sendViaByok,
  isByokActive,
  activateByok,
  deactivateByok,
} from "./chatTransport";

const ARGS = {
  messages: [{ role: "user" as const, content: "q" }],
  systemPrompt: "system",
  sessionId: "s1",
  messageCount: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  hasByokKey.mockReturnValue(false);
  sessionStorage.clear();
});

describe("sendChatTurn — server path", () => {
  it("routes BUDGET_* block codes to onBudgetBlock, never onError", async () => {
    streamChatReply.mockImplementation(async (_a, cb) =>
      cb.onError("unavailable", { status: 200, code: "BUDGET_EXHAUSTED" }),
    );
    const onBudgetBlock = vi.fn();
    const onError = vi.fn();
    await sendChatTurn(ARGS, { onText: vi.fn(), onError, onBudgetBlock });
    expect(onBudgetBlock).toHaveBeenCalledWith("BUDGET_EXHAUSTED");
    expect(onError).not.toHaveBeenCalled();
  });

  // Regression: a sustained upstream Anthropic-account block (org spend cap /
  // self-set spend limit / billing hold — route.ts's
  // isUpstreamAccountExhausted) must open the SAME continuity flow as a
  // community-budget block, even though it's a completely different cause.
  // CHAT_BUDGET_CODES is what makes that true — this locks in that the new
  // code is actually a member, not just present in the server's contract.
  it("routes BUDGET_UPSTREAM_EXHAUSTED to onBudgetBlock, never onError", async () => {
    streamChatReply.mockImplementation(async (_a, cb) =>
      cb.onError("unavailable", {
        status: 503,
        code: "BUDGET_UPSTREAM_EXHAUSTED",
      }),
    );
    const onBudgetBlock = vi.fn();
    const onError = vi.fn();
    await sendChatTurn(ARGS, { onText: vi.fn(), onError, onBudgetBlock });
    expect(onBudgetBlock).toHaveBeenCalledWith("BUDGET_UPSTREAM_EXHAUSTED");
    expect(onError).not.toHaveBeenCalled();
  });

  it("passes non-budget block codes through to onError with meta", async () => {
    streamChatReply.mockImplementation(async (_a, cb) =>
      cb.onError("unavailable", { status: 503, code: "SESSION_LIMIT" }),
    );
    const onBudgetBlock = vi.fn();
    const onError = vi.fn();
    await sendChatTurn(ARGS, { onText: vi.fn(), onError, onBudgetBlock });
    expect(onError).toHaveBeenCalledWith("unavailable", {
      status: 503,
      code: "SESSION_LIMIT",
    });
    expect(onBudgetBlock).not.toHaveBeenCalled();
  });

  it("falls back to onError for budget codes when no onBudgetBlock is given", async () => {
    streamChatReply.mockImplementation(async (_a, cb) =>
      cb.onError("unavailable", { status: 200, code: "BUDGET_EXHAUSTED" }),
    );
    const onError = vi.fn();
    await sendChatTurn(ARGS, { onText: vi.fn(), onError });
    expect(onError).toHaveBeenCalled();
  });
});

describe("sendChatTurn — BYOK path", () => {
  it("is server-first until the voter explicitly opts in", async () => {
    hasByokKey.mockReturnValue(true); // key saved but NOT activated
    streamChatReply.mockImplementation(async (_a, cb) => cb.onDone?.());
    await sendChatTurn(ARGS, { onText: vi.fn(), onError: vi.fn() });
    expect(streamChatReply).toHaveBeenCalled();
    expect(streamWithByok).not.toHaveBeenCalled();
  });

  it("routes through streamWithByok once activated, with the same prompt + messages", async () => {
    hasByokKey.mockReturnValue(true);
    activateByok();
    streamWithByok.mockImplementation(async (_req, cb) => {
      cb.onText("hi");
      cb.onDone();
    });
    const onText = vi.fn();
    await sendChatTurn(ARGS, { onText, onError: vi.fn() });
    expect(streamWithByok).toHaveBeenCalledWith(
      { systemPrompt: "system", messages: ARGS.messages },
      expect.anything(),
    );
    expect(streamChatReply).not.toHaveBeenCalled();
    expect(onText).toHaveBeenCalledWith("hi");
  });

  it("deactivates when the key is removed (activation flag alone is not enough)", () => {
    hasByokKey.mockReturnValue(true);
    activateByok();
    expect(isByokActive()).toBe(true);
    hasByokKey.mockReturnValue(false);
    expect(isByokActive()).toBe(false);
    deactivateByok();
    expect(isByokActive()).toBe(false);
  });

  it("surfaces a missing-key throw as an onError, not an unhandled rejection", async () => {
    streamWithByok.mockImplementation(() => {
      throw new Error("no byok key set");
    });
    const onError = vi.fn();
    await sendViaByok(ARGS, { onText: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith("byok-no-key");
  });
});
