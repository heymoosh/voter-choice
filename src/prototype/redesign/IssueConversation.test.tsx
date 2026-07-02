// Bug #175: pole-disambiguation questions don't count against the question
// cap. The refinement prompt ALWAYS returns the full theme array (even on a
// conversational-only turn — "still include the fence with the array
// unchanged"), so `themes` is non-null on effectively every refinement
// reply. The clarify-count logic used `!themes` as a proxy for "this turn
// only asked a question, it didn't update anything" — that proxy is now
// always false, so the counter never increments and the cap never trips.
//
// These tests exercise the REAL client-side signal (a reply whose prose ends
// in "?" — the shape every clarifying/disambiguation question takes per the
// theme-refinement prompt contract) independent of whether themes is also
// present, and prove the cap trips once that signal has fired
// DISAMBIGUATION_CAP times.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const sendChatTurn = vi.fn();
vi.mock("./chatTransport", () => ({
  sendChatTurn: (...args: unknown[]) => sendChatTurn(...(args as [any, any])),
}));
vi.mock("../realData", () => ({
  getChatSessionId: () => "test-session-id",
}));

import { useIssueConversation } from "./IssueConversation";
import { DISAMBIGUATION_CAP } from "../../lib/prompts/theme-refinement";

const SEED_ISSUES = [
  {
    sourceType: "freeText",
    sourceText: "guns",
    rank: 1,
    interpretation: "Gun ownership concerns",
    canonicalIssue: "gun_rights_safety",
    confidence: "clear",
    quotes: [{ label: "example", text: "I care about guns" }],
  },
];

const SAME_THEME_JSON = [
  {
    name: "Gun ownership concerns",
    quotes: ["I care about guns"],
    canonicalIssue: "gun_rights_safety",
  },
];

/** Build a raw model reply: prose + the fenced theme array LAST (the shipped
 *  contract — the refinement prompt always emits the fence, per-turn,
 *  whether or not anything changed). */
function reply(prose: string, themes: unknown[] = SAME_THEME_JSON): string {
  return `${prose}\n\`\`\`json\n${JSON.stringify(themes)}\n\`\`\``;
}

/** Script the NEXT sendChatTurn call to synchronously stream `raw` back. */
function mockNextReply(raw: string) {
  sendChatTurn.mockImplementationOnce((_args: any, cb: any) => {
    cb.onText(raw);
    cb.onDone();
    return Promise.resolve();
  });
}

function systemPromptOfCall(i: number): string {
  return sendChatTurn.mock.calls[i][0].systemPrompt;
}

beforeEach(() => {
  sendChatTurn.mockReset();
});

describe("useIssueConversation — disambiguation question-cap counting (#175)", () => {
  it("does NOT increment the counter on a normal themed turn with no question (baseline, guards over-counting)", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    mockNextReply(reply("Got it, added that to your list."));
    act(() => result.current.send("also housing costs"));

    mockNextReply(reply("Noted, keeping that as-is."));
    act(() => result.current.send("ok"));

    // Second call's prompt should still advertise the FULL budget — nothing
    // was ever counted as a question.
    expect(systemPromptOfCall(1)).toContain(`asked 0 clarifying question(s)`);
  });

  it("increments the counter on a disambiguation question turn EVEN THOUGH the reply also carries a full theme array", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    mockNextReply(
      reply(
        "On guns, are you more focused on protecting access to firearms, or on restricting them — or is it something else?",
      ),
    );
    act(() => result.current.send("I care about guns"));

    // The reply carried themes — confirm this turn really did return a
    // parseable theme array (the exact condition the old `!themes` guard
    // would have excluded).
    expect(result.current.issues).toHaveLength(1);

    mockNextReply(reply("Thanks, noting that."));
    act(() => result.current.send("just access, mostly"));

    // The NEXT turn's prompt is built from the count BEFORE this reply, so
    // it must reflect the question we just asked: 1 spent, 1 remaining.
    expect(systemPromptOfCall(1)).toContain(`asked 1 clarifying question(s)`);
    expect(systemPromptOfCall(1)).toContain(`1 remain`);
  });

  it("only counts a trailing question mark — a mid-sentence '?' that the reply doesn't end on is not counted (soft one-per-turn guard)", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    mockNextReply(
      reply(
        "Wait, are you sure? Anyway, I've kept it on your list as you described it.",
      ),
    );
    act(() => result.current.send("guns matter to me"));

    mockNextReply(reply("Noted."));
    act(() => result.current.send("ok"));

    expect(systemPromptOfCall(1)).toContain(`asked 0 clarifying question(s)`);
  });

  it("trips atCap after DISAMBIGUATION_CAP question turns and suppresses the disambiguation block on the next prompt", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    // Ask DISAMBIGUATION_CAP separate disambiguation questions, one per turn.
    for (let i = 0; i < DISAMBIGUATION_CAP; i++) {
      mockNextReply(
        reply(`Quick check on that one — could you say more about it?`),
      );
      act(() => result.current.send(`answer ${i}`));
    }

    // One more turn to inspect the prompt built AFTER the cap was reached.
    mockNextReply(reply("Locking that in for you."));
    act(() => result.current.send("final answer"));

    const cappedPrompt = systemPromptOfCall(DISAMBIGUATION_CAP);
    expect(cappedPrompt).toContain("NO CLARIFYING QUESTIONS LEFT");
    expect(cappedPrompt).toContain("LOCK IN the concept now");
    // The pole-disambiguation block is suppressed entirely once atCap.
    expect(cappedPrompt).not.toContain("POLE DISAMBIGUATION");

    // Counting stops at the cap — never advertises a negative remainder or
    // an asked-count above the cap.
    expect(cappedPrompt).toContain(
      `asked ${DISAMBIGUATION_CAP} clarifying question(s)`,
    );
  });
});
