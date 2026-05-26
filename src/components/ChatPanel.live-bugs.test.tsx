// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChatPanel } from "./ChatPanel";
import { LanguageProvider } from "../lib/i18n";
import type { StateElectionData } from "../types/election";

/* ──────────────────────────────────────────────────────────────
 * ChatPanel — live bug regression tests.
 *
 * Bug 3: when /api/chat returns 429 with `code: DAILY_LIMIT` (or any
 *        rate-limit code) OR 200 with `status: budget_exhausted`,
 *        BOTH the workspace `sendMessage` path AND the cold-open
 *        `submitColdOpen` path must call `onBudgetExhausted` so the
 *        BudgetExhausted overlay can open at the parent. Previously
 *        only the workspace path handled the 200 case, and neither
 *        path handled rate-limit codes — they fell into the inline
 *        "chat-disabled-message" stub.
 *
 * Bug 4: sessionId must persist across re-mounts of ChatPanel via
 *        sessionStorage so the per-IP daily-session counter on the
 *        server doesn't increment with every page reload.
 * ────────────────────────────────────────────────────────────── */

const txState: StateElectionData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-runoff",
      name: "2026 Texas Primary Runoff",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-04-27",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: { deadline: "2026-04-27", sincePostmarked: true },
    inPerson: { deadline: "2026-04-27", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-05-11",
    endDate: "2026-05-22",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited in voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

interface FetchCallRecord {
  url: string;
  body: Record<string, unknown> | null;
}

function captureFetch(responseBuilder: () => Response): {
  fetchMock: ReturnType<typeof vi.fn>;
  calls: FetchCallRecord[];
} {
  const calls: FetchCallRecord[] = [];
  const fetchMock = vi
    .fn()
    .mockImplementation((url: string, init?: RequestInit) => {
      let body: Record<string, unknown> | null = null;
      try {
        body = init?.body ? JSON.parse(init.body as string) : null;
      } catch {
        body = null;
      }
      calls.push({ url, body });
      return Promise.resolve(responseBuilder());
    });
  return { fetchMock, calls };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  contentType = "application/json",
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": contentType },
  });
}

describe("ChatPanel — live bug 3: 429 / budget_exhausted → onBudgetExhausted", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("routes a 429 DAILY_LIMIT from the cold-open path to onBudgetExhausted", async () => {
    const onBudgetExhausted = vi.fn();
    const { fetchMock } = captureFetch(() =>
      jsonResponse(
        {
          error:
            "You've reached the daily session limit. Copy the prompt below to continue your ballot research in any free AI chatbot.",
          code: "DAILY_LIMIT",
        },
        429,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageProvider>
        <ChatPanel
          state={txState}
          zipCode="73301"
          promptFleetV2Enabled
          onBudgetExhausted={onBudgetExhausted}
        />
      </LanguageProvider>,
    );

    const textarea = await screen.findByTestId("cold-open-textarea");
    fireEvent.change(textarea, { target: { value: "test concern text" } });
    fireEvent.click(screen.getByTestId("cold-open-send"));

    await waitFor(() => expect(onBudgetExhausted).toHaveBeenCalledTimes(1));
    const payload = onBudgetExhausted.mock.calls[0][0] as {
      handoffPromptText: string;
      resetAt: string;
    };
    expect(typeof payload.resetAt).toBe("string");
    expect(payload.resetAt.length).toBeGreaterThan(0);
    // The inline-text stub MUST NOT mount when the overlay is being
    // routed — that's the whole point of the fix.
    expect(screen.queryByTestId("chat-disabled-message")).toBeNull();
  });

  it("routes a 200 budget_exhausted from the cold-open path to onBudgetExhausted", async () => {
    const onBudgetExhausted = vi.fn();
    const { fetchMock } = captureFetch(() =>
      jsonResponse(
        {
          status: "budget_exhausted",
          resetAt: "2026-06-01T00:00:00Z",
          handoffPrompt: "## YOU ARE\n\nA civic research assistant…",
        },
        200,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageProvider>
        <ChatPanel
          state={txState}
          zipCode="73301"
          promptFleetV2Enabled
          onBudgetExhausted={onBudgetExhausted}
        />
      </LanguageProvider>,
    );

    const textarea = await screen.findByTestId("cold-open-textarea");
    fireEvent.change(textarea, { target: { value: "test concern text" } });
    fireEvent.click(screen.getByTestId("cold-open-send"));

    await waitFor(() => expect(onBudgetExhausted).toHaveBeenCalledTimes(1));
    const payload = onBudgetExhausted.mock.calls[0][0] as {
      handoffPromptText: string;
      resetAt: string;
    };
    expect(payload.handoffPromptText).toContain("YOU ARE");
    expect(payload.resetAt).toBe("2026-06-01T00:00:00Z");
  });

  it("does NOT route a generic error (e.g. validation 400) to onBudgetExhausted", async () => {
    const onBudgetExhausted = vi.fn();
    const { fetchMock } = captureFetch(() =>
      jsonResponse({ error: "Bad request", code: "VALIDATION_ERROR" }, 400),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageProvider>
        <ChatPanel
          state={txState}
          zipCode="73301"
          promptFleetV2Enabled
          onBudgetExhausted={onBudgetExhausted}
        />
      </LanguageProvider>,
    );

    const textarea = await screen.findByTestId("cold-open-textarea");
    fireEvent.change(textarea, { target: { value: "test concern text" } });
    fireEvent.click(screen.getByTestId("cold-open-send"));

    // Wait long enough for any potential async to flush — the assertion is
    // that the overlay is NOT triggered for non-budget errors.
    await new Promise((r) => setTimeout(r, 50));
    expect(onBudgetExhausted).not.toHaveBeenCalled();
  });
});

describe("ChatPanel — live bug 4: sessionId persists across remounts", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reuses the same sessionId across remounts via sessionStorage", async () => {
    // First mount → first cold-open fetch. Capture the sessionId.
    const { fetchMock: firstFetch, calls: firstCalls } = captureFetch(() =>
      jsonResponse({ error: "Not real", code: "VALIDATION_ERROR" }, 400),
    );
    vi.stubGlobal("fetch", firstFetch);

    const { unmount } = render(
      <LanguageProvider>
        <ChatPanel state={txState} zipCode="73301" promptFleetV2Enabled />
      </LanguageProvider>,
    );
    const firstTextarea = await screen.findByTestId("cold-open-textarea");
    fireEvent.change(firstTextarea, { target: { value: "first attempt" } });
    fireEvent.click(screen.getByTestId("cold-open-send"));
    await waitFor(() => expect(firstCalls.length).toBeGreaterThan(0));
    const firstSessionId = firstCalls[0].body?.sessionId as string;
    expect(typeof firstSessionId).toBe("string");
    expect(firstSessionId.length).toBeGreaterThan(0);

    unmount();

    // Second mount → second cold-open fetch. Must reuse the same sessionId.
    const { fetchMock: secondFetch, calls: secondCalls } = captureFetch(() =>
      jsonResponse({ error: "Not real", code: "VALIDATION_ERROR" }, 400),
    );
    vi.stubGlobal("fetch", secondFetch);

    render(
      <LanguageProvider>
        <ChatPanel state={txState} zipCode="73301" promptFleetV2Enabled />
      </LanguageProvider>,
    );
    const secondTextarea = await screen.findByTestId("cold-open-textarea");
    fireEvent.change(secondTextarea, { target: { value: "second attempt" } });
    fireEvent.click(screen.getByTestId("cold-open-send"));
    await waitFor(() => expect(secondCalls.length).toBeGreaterThan(0));
    const secondSessionId = secondCalls[0].body?.sessionId as string;

    expect(secondSessionId).toBe(firstSessionId);
  });

  it("generates a fresh sessionId when sessionStorage is empty (first visit)", async () => {
    // No sessionStorage → must generate one and persist it.
    expect(sessionStorage.getItem("voter-choice:sessionId")).toBeNull();

    const { fetchMock, calls } = captureFetch(() =>
      jsonResponse({ error: "Not real", code: "VALIDATION_ERROR" }, 400),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageProvider>
        <ChatPanel state={txState} zipCode="73301" promptFleetV2Enabled />
      </LanguageProvider>,
    );
    const textarea = await screen.findByTestId("cold-open-textarea");
    fireEvent.change(textarea, { target: { value: "first visit" } });
    fireEvent.click(screen.getByTestId("cold-open-send"));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const sessionId = calls[0].body?.sessionId as string;
    expect(typeof sessionId).toBe("string");
    expect(sessionId.length).toBeGreaterThan(0);
    // And it should have been persisted for the next mount.
    expect(sessionStorage.getItem("voter-choice:sessionId")).toBe(sessionId);
  });
});
