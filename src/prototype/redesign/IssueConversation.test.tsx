// Bug #175: pole-disambiguation questions don't count against the question
// cap. The refinement prompt ALWAYS returns the full theme array (even on a
// conversational-only turn — "still include the fence with the array
// unchanged"), so `themes` is non-null on effectively every refinement reply;
// the old `!themes` proxy was always false, so the counter never incremented
// and the cap never tripped.
//
// The FIX must count a turn iff the model genuinely asked a
// pole/novel-concept disambiguation question — NOT on any trailing "?" (an
// ordinary "want to add anything else?" is within the prompt contract and
// would wrongly burn a DISAMBIGUATION_CAP slot, forcing early lock-in on a
// still-unresolved theme). The precise signal is the open-ended tail
// ("…or is it something else?") the prompt appends to EVERY disambiguation
// question and to NOTHING else; the parser surfaces it as
// `askedDisambiguationQuestion`. These tests exercise that signal through the
// real hook.
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
import { DISAMBIGUATION_OPEN_ENDED_TAIL } from "../../lib/alignment/poleVocabulary";

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

// A pole-disambiguation question exactly as the prompt renders it: the neutral
// question, then the shared open-ended tail. This is what MUST count.
const POLE_QUESTION = `On guns, are you more focused on protecting access to firearms, or on tightening gun laws? ${DISAMBIGUATION_OPEN_ENDED_TAIL}`;

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
  it("does NOT increment on a normal themed turn with no question at all (baseline)", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    mockNextReply(reply("Got it, added that to your list."));
    act(() => result.current.send("also housing costs"));

    mockNextReply(reply("Noted, keeping that as-is."));
    act(() => result.current.send("ok"));

    expect(systemPromptOfCall(1)).toContain(`asked 0 clarifying question(s)`);
  });

  it("does NOT increment on a themed turn ending in an ORDINARY '?' that is not a disambiguation question (over-count guard)", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    // Within the prompt contract, an everyday closing question. It ends in
    // "?" but is NOT a disambiguation question — it must NOT burn a slot.
    mockNextReply(reply("Got it — want to add anything else?"));
    act(() => result.current.send("guns matter to me"));

    mockNextReply(reply("Sounds good."));
    act(() => result.current.send("no that's it"));

    // The budget is untouched: the next prompt still advertises 0 asked.
    expect(systemPromptOfCall(1)).toContain(`asked 0 clarifying question(s)`);
    expect(systemPromptOfCall(1)).toContain(`${DISAMBIGUATION_CAP} remain`);
  });

  it("increments on a POLE-disambiguation question turn even though the reply also carries a full theme array", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    mockNextReply(reply(POLE_QUESTION));
    act(() => result.current.send("I care about guns"));

    // The reply carried themes — the exact condition the old `!themes` guard
    // excluded.
    expect(result.current.issues).toHaveLength(1);

    mockNextReply(reply("Thanks, noting that."));
    act(() => result.current.send("just access, mostly"));

    expect(systemPromptOfCall(1)).toContain(`asked 1 clarifying question(s)`);
    expect(systemPromptOfCall(1)).toContain(`1 remain`);
  });

  it("increments on a NOVEL-concept clarifying question that ends with the same open-ended tail", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    // A freeform novel-concept clarifying question — the prompt now tells the
    // model to close it with the same tail, so it counts the same way.
    mockNextReply(
      reply(
        `When you say "ranked choice", do you mean adopting it for federal elections — ${DISAMBIGUATION_OPEN_ENDED_TAIL}`,
      ),
    );
    act(() => result.current.send("I want ranked choice voting"));

    mockNextReply(reply("Understood."));
    act(() => result.current.send("federal, yes"));

    expect(systemPromptOfCall(1)).toContain(`asked 1 clarifying question(s)`);
  });

  it("does NOT increment when the tail appears mid-prose but the reply moves past it (soft one-per-turn / trailing-anchor guard)", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    // The tail is present but the reply CLOSES on a statement, not the
    // question — only a reply that ends on the question counts.
    mockNextReply(
      reply(
        `${POLE_QUESTION} Either way, I've kept your gun concern on the list.`,
      ),
    );
    act(() => result.current.send("guns matter to me"));

    mockNextReply(reply("Noted."));
    act(() => result.current.send("ok"));

    expect(systemPromptOfCall(1)).toContain(`asked 0 clarifying question(s)`);
  });

  it("trips atCap after DISAMBIGUATION_CAP disambiguation-question turns and suppresses the pole block on the next prompt", () => {
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES }),
    );

    // Ask DISAMBIGUATION_CAP tail-ending disambiguation questions, one per turn.
    for (let i = 0; i < DISAMBIGUATION_CAP; i++) {
      mockNextReply(reply(POLE_QUESTION));
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
    // Counting stops at the cap — never over-counts past it.
    expect(cappedPrompt).toContain(
      `asked ${DISAMBIGUATION_CAP} clarifying question(s)`,
    );
  });
});

// Regression: the host's onBudgetBlock must learn WHICH block code fired, not
// just that the turn failed. BUDGET_UPSTREAM_EXHAUSTED means the Anthropic
// account itself is on hold — a different cause than the community budget's
// own BUDGET_* codes — and App2's BudgetModal needs the code to avoid
// blaming the wrong thing (see App2.tsx's handleConvoBudgetBlock).
describe("useIssueConversation — forwards the block code to the host's onBudgetBlock", () => {
  it("passes the retry function AND the block code through unchanged", () => {
    const onBudgetBlock = vi.fn();
    const { result } = renderHook(() =>
      useIssueConversation({ seedIssues: SEED_ISSUES, onBudgetBlock }),
    );

    sendChatTurn.mockImplementationOnce((_args: any, cb: any) => {
      cb.onBudgetBlock("BUDGET_UPSTREAM_EXHAUSTED");
      return Promise.resolve();
    });
    act(() => result.current.send("also housing costs"));

    expect(onBudgetBlock).toHaveBeenCalledTimes(1);
    const [retry, code] = onBudgetBlock.mock.calls[0];
    expect(typeof retry).toBe("function");
    expect(code).toBe("BUDGET_UPSTREAM_EXHAUSTED");
  });
});
