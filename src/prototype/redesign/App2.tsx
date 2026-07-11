// @ts-nocheck
"use client";
/* App shell for the congress-assessment experience — port of
   docs/design/2026-redesign/…/redesign/redesign2-app.jsx with the real data
   flow wired in (the design file's flow was home → loading → workspace over
   static mocks):

     home → loading (delegation + state data fetch)
          → coldopen (conversational issue intake — IntakeView hosts the
            shared IssueConversation loop: extract → converse → lock)
          → analyzing (per-seat /api/race-data) → workspace
          → print / standing (+ static pages, honest failure states)

   Phase 1 renders the representatives returned by /api/delegation. */

import React, { useEffect, useRef, useState } from "react";
import {
  I18nProvider,
  useI18n,
  NavProvider,
  AppNav,
  ErrorBanner,
  HomeView,
  LoadingView,
  AboutPage,
  MethodologyPage,
  PrivacyPage,
  TipJarPage,
  SettingsPanel,
  WhyNowPage,
} from "../VoterChoiceApp";
import { DelegationWorkspace } from "./DelegationWorkspace";
import { HeadToHead } from "./HeadToHead";
import { HandoffModal } from "./HandoffModal";
import { ScorecardPrintView } from "./ScorecardPrintView";
import { PolisClose } from "./PolisClose";
import { PolisEntry } from "./PolisEntry";
import { IntakeView } from "./IntakeView";
import { EditIssuesModal } from "./EditIssuesModal";
import {
  fetchDelegation,
  loadAllSeatCardData,
  loadStateElectionData,
  fetchBallotLogistics,
  pollingInfoFromLogistics,
  buildSeats,
  decorateIssues,
  deadlineRowsFor,
  pollingFallback,
  preloadSeatResearch,
  getSeatResearch,
  submitSessionCounters,
  issuesForLevel,
  seatAlignmentPct,
  computeSeatDeltas,
  resetSeatResearch,
  resetChallengerResearch,
} from "./delegationData";
import { loadPolisScopes } from "./polisAdapter";
import { getChatSessionId } from "../realData";
import { buildSeatChatSystemPrompt } from "./seatChatPrompt";
import { resolveChatBlock } from "./chatBlocks";
import { sendChatTurn, activateByok } from "./chatTransport";
import { BudgetModal } from "./BudgetModal";
import { buildScorecardHandoffPrompt } from "./handoffText";

// Durable (localStorage): the only thing kept across a tab close — the user's
// issues ("Polis" data) plus a state-level location. Never a county or the
// precise address.
const POLIS_KEY = "voter-choice:polis-v1";
// Session working state (sessionStorage): precise address + in-progress
// assessment. Survives a same-tab reload, wiped when the tab closes.
const SESSION_KEY = "voter-choice:session-v1";
// Legacy key that durably stored the precise address — purged on mount.
const LEGACY_KEY = "voter-choice:redesign2";

function loadPolis() {
  try {
    return JSON.parse(localStorage.getItem(POLIS_KEY)) || {};
  } catch {
    return {};
  }
}

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {};
  } catch {
    return {};
  }
}

/* Honest failure states (geocode / territory / data outage) in the design's
   visual language — AppNav + the shipped ErrorBanner. */
function DelegationErrorView({ tone, title, body, onEditAddress, onRetry }) {
  const { t } = useI18n();
  return (
    <>
      <AppNav />
      <main
        id="main-content"
        style={{ maxWidth: 720, margin: "48px auto", padding: "0 20px" }}
      >
        <ErrorBanner
          tone={tone}
          title={title}
          body={body}
          primary={{
            label: t("delegationError.editAddress"),
            onClick: onEditAddress,
          }}
          secondary={
            onRetry
              ? { label: t("delegationError.tryAgain"), onClick: onRetry }
              : undefined
          }
        />
      </main>
    </>
  );
}

/* Standing stage empty state — shown only when nobody has finished anywhere
   yet (genuinely zero sessions). There is no participation threshold; the map
   renders as soon as a single person has finished. */
function StandingLocked({ onBack }) {
  return (
    <section className="polis">
      <div className="polis-lede">
        <div className="kick">One last thing</div>
        <h2>You&rsquo;re the first one here.</h2>
        <p>
          No one has finished a scorecard yet, so there&rsquo;s no one to map
          you against — for now. Check back soon: the map appears the moment
          someone else finishes. No individual responses are ever stored, so it
          only ever exists in aggregate.
        </p>
        <button className="back2" onClick={onBack}>
          ← Back to your scorecard
        </button>
      </div>
    </section>
  );
}

/* Guided orientation interstitial — shown once, AFTER the user locks in their
   issues and BEFORE the first representative is shown for review. Sets
   expectations for the per-rep review loop (record · money · alternatives →
   keep/replace → scorecard). Not skippable/remembered: it's a single click on
   the happy path, and the edit-issues re-score path bypasses it entirely
   (analyze() is called directly there), so a returning reviewer never sees it
   again within a session unless they re-run the cold open.

   Bold Flag / Keystone parity: markup + classes ported verbatim from
   design-handoff/keystone-canvas/src/screens-orientation.jsx's
   OrientationActivated per HANDOFF-EXACT-MATCH.md §1. AppNav (not canvas's
   SCNav) still carries the app's real nav — the flag hairline + card
   treatment are scoped to .ori-body in redesign2.css so the Bold Flag white
   palette doesn't bleed into AppNav's shared civic styling. */
function OrientationView({ onContinue }) {
  const { t } = useI18n();
  return (
    <div className="screen orientation ori">
      <div className="flagbar">
        <i></i>
        <i></i>
        <i></i>
      </div>
      <AppNav />
      <div className="ori-body">
        <div className="ori-card activated">
          <div className="ori-ey">
            <span className="kick">
              <span className="star" aria-hidden="true">
                ★
              </span>{" "}
              {t("orientation.kick")}
            </span>
          </div>
          <h1>{t("orientation.heading")}</h1>
          <p className="ori-lede">{t("orientation.lede")}</p>
          <div className="ori-steps">
            <div className="ori-step">
              <span className="n">1</span>
              <div>
                <div className="st-t">{t("orientation.step1Title")}</div>
                <div className="st-d">{t("orientation.step1Body")}</div>
              </div>
            </div>
            <div className="ori-step">
              <span className="n">2</span>
              <div>
                <div className="st-t">{t("orientation.step2Title")}</div>
                <div className="st-d">{t("orientation.step2Body")}</div>
              </div>
            </div>
            <div className="ori-step">
              <span className="n">3</span>
              <div>
                <div className="st-t">{t("orientation.step3Title")}</div>
                <div className="st-d">{t("orientation.step3Body")}</div>
              </div>
            </div>
          </div>
          <div className="ori-cta">
            <button
              className="btn-primary"
              onClick={onContinue}
              data-testid="orientation-continue"
            >
              {t("orientation.continueLabel")}
            </button>
            <span className="ori-meta">{t("orientation.meta")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function App2Inner() {
  const { t } = useI18n();
  // Purge any precise address left by the old single-localStorage-record scheme.
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
  }
  const savedSession = loadSession();
  const savedPolis = loadPolis();
  const [stage, setStage] = useState(() => {
    // Workspace-family stages need refetched data — resume via loading. After a
    // tab close sessionStorage is empty, so address is absent and this falls back
    // to "home"; on a same-tab reload the address survives and we resume.
    const s = savedSession.stage || "home";
    if (
      [
        "workspace",
        "print",
        "polisEntry",
        "standing",
        "coldopen",
        "orientation",
        "analyzing",
        "loading",
      ].includes(s)
    ) {
      return savedSession.address ? "resume" : "home";
    }
    return s;
  });
  const [address, setAddress] = useState(savedSession.address || "");
  const blindMode = true;
  const [verdicts, setVerdicts] = useState(savedSession.verdicts || {});
  // Successor picks — the challenger chosen in the head-to-head duel when a
  // seat is verdicted "replace". Keyed by seat id → challenger id. Rides to the
  // scorecard/print alongside the verdict (the answer to "what happens when you
  // replace?"). Cleared whenever the verdict leaves "replace".
  const [picks, setPicks] = useState(savedSession.picks || {});
  // Which seat's full-screen head-to-head duel is open (null = none).
  const [duelSeatId, setDuelSeatId] = useState(null);
  const [activeSeatId, setActiveSeatId] = useState(
    savedSession.activeSeatId || null,
  );
  // Delegation-overview navigation layer: true = 3-card scored overview,
  // false = the (unchanged) deep single-seat view for activeSeatId. Lifted
  // here (not local to DelegationWorkspace) because that component
  // unmounts/remounts across sibling stages (duel, print, standing) — a
  // returning duel/print flow must land back on the seat it left, not reset
  // to the overview. Defaults to the overview on a fresh session; a resumed
  // session restores wherever the user left off.
  const [seatOverviewOpen, setSeatOverviewOpen] = useState(
    savedSession.seatOverviewOpen ?? true,
  );
  const [revealed, setRevealed] = useState(
    () => new Set(savedSession.revealed || []),
  );
  const [issues, setIssues] = useState(savedPolis.issues || []);
  // State-level location only, kept durably with the issues so the Polis
  // aggregate survives a tab close. County is never stored (privacy) — the
  // viz shows state + national only.
  const [coarseLoc, setCoarseLoc] = useState(() => ({
    stateCode: savedPolis.stateCode ?? null,
    stateName: savedPolis.stateName ?? null,
  }));
  const [showHandoff, setShowHandoff] = useState(false);

  // Seat chat — in browser memory ONLY (never persisted; the privacy contract
  // is that chat history dies with the tab). Keyed by seat id.
  const [chatMessages, setChatMessages] = useState({});
  const [chatTimeouts, setChatTimeouts] = useState({});
  const [budgetTier, setBudgetTier] = useState(null);
  const prevChatSeatRef = useRef(null);
  // Budget modal: null | { blocked } — blocked=true means a turn was refused.
  // pendingRetryRef holds a zero-arg replay of the refused turn (seat chat or
  // an issue-conversation turn) for "Retry with my key".
  const [budgetModal, setBudgetModal] = useState(null);
  const pendingRetryRef = useRef(null);

  // Edit-issues loop: modal visibility + post-re-score deltas.
  const [editIssuesOpen, setEditIssuesOpen] = useState(false);
  const [issueDeltas, setIssueDeltas] = useState(null);

  // Fetched (not persisted — refetched on resume)
  const [delegation, setDelegation] = useState(null);
  const [stateData, setStateData] = useState(null);
  const [pollingInfo, setPollingInfo] = useState(null);
  const [seats, setSeats] = useState([]);
  const [failure, setFailure] = useState(null);
  const [polisScopes, setPolisScopes] = useState(null);
  const [, setResearchTick] = useState(0);
  const submittedRef = useRef(false);
  // Issues locked at the cold open, held while the orientation interstitial is
  // shown; consumed by its CTA, which kicks off analyze() into the workspace.
  const pendingLockedIssuesRef = useRef(null);

  // Durable: issues + state-level location only. Survives tab close.
  useEffect(() => {
    try {
      localStorage.setItem(
        POLIS_KEY,
        JSON.stringify({
          issues,
          stateCode: coarseLoc.stateCode,
          stateName: coarseLoc.stateName,
        }),
      );
    } catch {}
  }, [issues, coarseLoc]);

  // Session working state: precise address + in-progress assessment. Survives a
  // same-tab reload, cleared by the browser when the tab closes.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          stage,
          address,
          verdicts,
          picks,
          activeSeatId,
          revealed: [...revealed],
          seatOverviewOpen,
        }),
      );
    } catch {}
  }, [
    stage,
    address,
    verdicts,
    picks,
    activeSeatId,
    revealed,
    seatOverviewOpen,
  ]);

  // Resume: re-run the pipeline silently for a returning session.
  useEffect(() => {
    if (stage === "resume") {
      void startLookup(address, { resuming: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startLookup(addr, { resuming = false } = {}) {
    setFailure(null);
    if (!resuming) {
      // A fresh address means a fresh assessment: clear any prior session's
      // issues/verdicts so the cold open runs its intake (the AI asks about
      // your issues) instead of jumping straight to ranking saved issues.
      setIssues([]);
      setVerdicts({});
      setPicks({});
      setDuelSeatId(null);
      setRevealed(new Set());
      setActiveSeatId(null);
      setChatMessages({});
      setChatTimeouts({});
      prevChatSeatRef.current = null;
    }
    setStage("loading");
    const result = await fetchDelegation(addr);
    if (result.status === "geocode_failed") {
      setFailure({ kind: "geocode", retryable: result.retryable });
      setStage("geocodefail");
      return;
    }
    if (result.status === "no_representation") {
      setFailure({ kind: "norep", territoryName: result.territoryName });
      setStage("norep");
      return;
    }
    if (result.status === "db_unavailable") {
      setFailure({ kind: "dberror" });
      setStage("dberror");
      return;
    }
    let sd;
    try {
      sd = await loadStateElectionData(result.stateCode);
    } catch {
      setFailure({ kind: "dberror" });
      setStage("dberror");
      return;
    }
    setDelegation(result);
    setCoarseLoc({
      stateCode: result.stateCode,
      stateName: result.stateName,
    });
    setStateData(sd);
    // Real address-based logistics (polling place / hours / early voting)
    // via /api/civic — best-effort; the honest fallback renders meanwhile.
    void fetchBallotLogistics(addr, sd).then((logistics) => {
      if (logistics) setPollingInfo(pollingInfoFromLogistics(logistics, sd));
    });
    if (resuming && issues.length > 0) {
      await analyze(result, sd, issues);
    } else {
      setStage("coldopen");
    }
  }

  async function analyze(delegationResult, sd, lockedIssues) {
    setStage("analyzing");
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "auto" });
    const decorated = decorateIssues(lockedIssues);
    setIssues(decorated);
    const cards = await loadAllSeatCardData(delegationResult, decorated);
    const built = buildSeats(delegationResult, cards, sd);
    setSeats(built);
    setActiveSeatId((prev) =>
      prev && built.some((s) => s.id === prev) ? prev : built[0]?.id,
    );
    // Web-search fallback for members without a DB record — fire and forget.
    preloadSeatResearch(built, decorated, delegationResult.stateCode, () =>
      setResearchTick((t) => t + 1),
    );
    // Polis preview/scopes — best-effort, never blocks the workspace.
    void loadPolisScopes({
      stateCode: delegationResult.stateCode,
      stateName: delegationResult.stateName,
      userConcerns: decorated.map((i) => i.canonicalIssue).filter(Boolean),
    }).then(setPolisScopes);
    setStage("workspace");
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "auto" });
    return built;
  }

  /* ─── Edit issues → deterministic re-score (no LLM: analyze() re-runs the
     per-seat /api/race-data fetch, so this works even at budget exhaustion).
     Verdicts are preserved; seats whose aggregate alignment shifts past the
     noise floor get a REVISIT flag in the delta banner. ─── */
  async function handleApplyIssues(newIssues) {
    setEditIssuesOpen(false);
    const before = new Map(seats.map((s) => [s.id, seatAlignmentPct(s)]));
    // Re-fire web research only when the SCOREABLE issue set actually changed —
    // rerank/rename-only edits must not re-burn research spend.
    const canon = (list) =>
      JSON.stringify(
        [...new Set(list.map((i) => i.canonicalIssue).filter(Boolean))].sort(),
      );
    if (canon(newIssues) !== canon(issues)) {
      resetSeatResearch();
      resetChallengerResearch();
    }
    const built = await analyze(delegation, stateData, newIssues);
    setIssueDeltas(computeSeatDeltas(before, built));
  }

  /* ─── Seat chat (ported from the shipped WorkspaceView's chat handlers) ─── */

  // "New session" for the budget soft-close gate = this tab's chat session has
  // never sent a turn. Tracked in sessionStorage (like the session id itself)
  // so a same-tab reload doesn't re-flag an in-progress session as new.
  const CHAT_STARTED_KEY = "voter-choice:chat-started-v1";
  function consumeIsNewSession() {
    try {
      if (sessionStorage.getItem(CHAT_STARTED_KEY)) return false;
      sessionStorage.setItem(CHAT_STARTED_KEY, "1");
    } catch {
      /* private mode — treat every tab as new */
    }
    return true;
  }

  // Map the {who,text} chat log → the chat route's {role,content}, dropping any
  // empty in-flight AI bubble so it never leaks into history.
  function mapChatHistory(seatId) {
    return (chatMessages[seatId] || [])
      .filter((m) => !(m.who === "ai" && !m.text))
      .map((m) => ({
        role: m.who === "user" ? "user" : "assistant",
        content: m.text,
      }));
  }

  // Append a fresh AI bubble and stream a real /api/chat reply into it. The
  // bubble is tracked by a unique `_id` (not "last") so concurrent sends to
  // the same seat never cross-contaminate. `apiMessages` ends on the user turn.
  function runChatStream(seatId, apiMessages) {
    setChatTimeouts((prev) => {
      if (!prev[seatId]) return prev;
      const next = { ...prev };
      delete next[seatId];
      return next;
    });

    const aiId =
      "ai-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    setChatMessages((prev) => ({
      ...prev,
      [seatId]: [...(prev[seatId] || []), { who: "ai", text: "", _id: aiId }],
    }));

    const seat = seats.find((s) => s.id === seatId);
    const systemPrompt = buildSeatChatSystemPrompt({
      seat,
      userIssues: issuesForLevel(issues, seat?.level || "federal"),
      stateCode: delegation?.stateCode || "",
      isRevealed: !blindMode || revealed.has(seatId),
      research: getSeatResearch(seatId),
    });
    const prevSeat = prevChatSeatRef.current;
    prevChatSeatRef.current = seatId;

    sendChatTurn(
      {
        messages: apiMessages,
        systemPrompt,
        sessionId: getChatSessionId(),
        messageCount: apiMessages.length,
        isNewSession: consumeIsNewSession(),
        activeRaceId: seatId,
        prevActiveRaceId: prevSeat || undefined,
      },
      {
        onBudgetTier: (tier) => setBudgetTier(tier),
        onText: (chunk) =>
          setChatMessages((prev) => ({
            ...prev,
            [seatId]: (prev[seatId] || []).map((m) =>
              m._id === aiId ? { ...m, text: m.text + chunk } : m,
            ),
          })),
        onBudgetBlock: () => {
          // Drop the empty bubble, stash the refused turn for "Retry with my
          // key", and open the budget modal in its blocked framing.
          setChatMessages((prev) => ({
            ...prev,
            [seatId]: (prev[seatId] || []).filter((m) => m._id !== aiId),
          }));
          pendingRetryRef.current = () => runChatStream(seatId, apiMessages);
          setBudgetModal({ blocked: true });
        },
        onError: (reason, meta) => {
          // Drop the (empty/partial) AI bubble first — whichever surface shows.
          setChatMessages((prev) => ({
            ...prev,
            [seatId]: (prev[seatId] || []).filter((m) => m._id !== aiId),
          }));
          const blk = resolveChatBlock(meta?.code);
          // BYOK errors arrive as user-facing sentences (auth, quota) — show
          // them verbatim; transport codes ("network", "stream") fall back to
          // the generic retry banner.
          const sentence =
            typeof reason === "string" && reason.includes(" ") ? reason : null;
          setChatTimeouts((prev) => ({
            ...prev,
            [seatId]: blk.message || sentence || true,
          }));
        },
      },
    );
  }

  // Soft-tier "See options →" (nothing refused yet) → informational framing.
  function handleBudgetBlock() {
    setBudgetModal({ blocked: false });
  }

  // An issue-conversation turn (intake or edit modal) hit the budget gate:
  // the loop preserved its state and handed us a zero-arg replay.
  function handleConvoBudgetBlock(retry) {
    pendingRetryRef.current = retry;
    setBudgetModal({ blocked: true });
  }

  // "Retry with my key": explicit BYOK opt-in, then replay the refused turn
  // through the transport (now BYOK-direct, sticky for this session).
  function handleRetryWithKey() {
    const retry = pendingRetryRef.current;
    activateByok();
    setBudgetModal(null);
    if (retry) {
      pendingRetryRef.current = null;
      retry();
    }
  }

  function handleSendChat(seatId, text) {
    const prior = mapChatHistory(seatId);
    // Drop dangling trailing user turn(s) — left by a prior FAILED send (no
    // assistant reply) or a still-empty in-flight send. Without this the
    // payload would be [..., user, user], which the chat API rejects.
    while (prior.length && prior[prior.length - 1].role === "user") prior.pop();
    setChatMessages((prev) => ({
      ...prev,
      [seatId]: [...(prev[seatId] || []), { who: "user", text }],
    }));
    runChatStream(seatId, [...prior, { role: "user", content: text }]);
  }

  function handleRetryChat(seatId) {
    // The failed turn's empty AI bubble was already removed; the log ends on
    // the user's question. Trim trailing assistant turns so the payload ends
    // on `user` (the route's contract), then replay.
    const history = mapChatHistory(seatId);
    while (history.length && history[history.length - 1].role === "assistant")
      history.pop();
    if (history.length === 0) return;
    runChatStream(seatId, history);
  }

  function setVerdict(seatId, v, pickId) {
    // Keep the successor pick in sync with the verdict: a non-"replace" verdict
    // (keep / undo) clears any pick; a "replace" with a chosen challenger
    // records it. pickId === undefined leaves the existing pick untouched.
    setPicks((prev) => {
      const next = { ...prev };
      if (v !== "replace") {
        delete next[seatId];
      } else if (pickId !== undefined) {
        if (pickId) next[seatId] = pickId;
        else delete next[seatId];
      }
      return next;
    });
    setVerdicts((prev) => {
      const next = { ...prev };
      if (v) next[seatId] = v;
      else delete next[seatId];
      // Session-end counters: fire once when the whole delegation is done.
      if (
        !submittedRef.current &&
        delegation &&
        seats.length > 0 &&
        seats.every((s) => next[s.id])
      ) {
        submittedRef.current = true;
        void submitSessionCounters({
          stateCode: delegation.stateCode,
          issues,
        });
      }
      return next;
    });
  }

  // Delegation-overview navigation: opening a seat card leaves the overview
  // for that seat's (unchanged) deep view; the "← All seats" control returns.
  function openSeatFromOverview(seatId) {
    setActiveSeatId(seatId);
    setSeatOverviewOpen(false);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "auto" });
  }
  function backToOverview() {
    setSeatOverviewOpen(true);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "auto" });
  }

  // Head-to-head duel: open from a seat's "Time to replace", record from its
  // Keep / Replace foot. Replace records the verdict AND the chosen successor.
  function openDuel(seatId) {
    setActiveSeatId(seatId);
    setDuelSeatId(seatId);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "auto" });
  }
  function duelKeep(seatId) {
    setVerdict(seatId, "keep");
    setDuelSeatId(null);
  }
  function duelReplace(seatId, pickId) {
    setVerdict(seatId, "replace", pickId ?? null);
    setDuelSeatId(null);
  }
  const reveal = (id) => setRevealed((p) => new Set([...p, id]));
  const hide = (id) =>
    setRevealed((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });

  function seeStanding() {
    if (!submittedRef.current && delegation) {
      submittedRef.current = true;
      void submitSessionCounters({
        stateCode: delegation.stateCode,
        issues,
      });
    }
    setStage("standing");
  }

  // Optional Polis invite/preview — replaces the old one-line "where you
  // stand among your neighbors" link, which used to jump straight to
  // "standing". Now that link opens this dedicated screen instead, and the
  // screen itself offers "See where I stand" (→ seeStanding) or "No thanks"
  // (→ back to the workspace). Purely a stage change: it never touches
  // verdicts, printing, or the counters submit — those are unaffected
  // whether or not this screen is ever opened.
  function openPolisEntry() {
    setStage("polisEntry");
  }

  const districtsLine = delegation
    ? [
        delegation.districtLabel
          ? `U.S. House ${delegation.districtLabel}`
          : null,
        `U.S. Senate ${delegation.stateName} (statewide)`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  function startOver() {
    try {
      localStorage.removeItem(POLIS_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setAddress("");
    setIssues([]);
    setCoarseLoc({ stateCode: null, stateName: null });
    setVerdicts({});
    setPicks({});
    setDuelSeatId(null);
    setRevealed(new Set());
    setDelegation(null);
    setPollingInfo(null);
    setSeats([]);
    setChatMessages({});
    setChatTimeouts({});
    prevChatSeatRef.current = null;
    setSeatOverviewOpen(true);
    setStage("home");
  }

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Nav context — wires AppNav brand/links + footer links to stages.
  const PAGE_STAGES = {
    about: 1,
    methodology: 1,
    privacy: 1,
    tip: 1,
    whynow: 1,
  };
  function navigate(page) {
    if (page === "home") return setStage("home");
    if (page === "howitworks") return setStage("home");
    if (PAGE_STAGES[page]) return setStage(page);
  }
  const navValue = {
    openSettings: () => setSettingsOpen(true),
    navigate,
    current: stage,
  };

  const unlockedScopes = (polisScopes || []).filter((s) => !s.locked);
  const polisPreview =
    unlockedScopes.length > 0
      ? {
          sampleSize: unlockedScopes[0].sampleSize,
          label: unlockedScopes[0].label,
        }
      : null;

  function renderStage() {
    if (stage === "home") {
      return (
        <HomeView
          savedAddress={address}
          savedSession={address ? { issues, decisions: verdicts } : null}
          onSubmit={(a) => {
            setAddress(a);
            void startLookup(a);
          }}
          onResumeFromProfile={() => {}}
          onResumeSession={() => {
            // In-tab nav: data still in memory — jump straight back.
            // Post-reload-from-home: issues/verdicts in storage, seats gone — refetch silently.
            if (seats.length > 0) setStage("workspace");
            else if (address) void startLookup(address, { resuming: true });
          }}
          onStartOver={startOver}
          onNavigate={navigate}
          totalRaces={seats.length || undefined}
        />
      );
    }
    if (stage === "loading" || stage === "resume") {
      return <LoadingView address={address} onDone={() => {}} />;
    }
    if (stage === "analyzing") {
      return (
        <LoadingView address={address} onDone={() => {}} variant="analyzing" />
      );
    }
    if (stage === "coldopen") {
      return (
        <IntakeView
          address={address}
          savedIssues={issues.length > 0 ? issues : null}
          contextNote="your 3 members of Congress"
          onLock={(locked) => {
            // Issues are locked → show the guided orientation interstitial
            // before the first representative. Its CTA runs analyze().
            pendingLockedIssuesRef.current = locked;
            setStage("orientation");
          }}
          onBudgetBlock={handleConvoBudgetBlock}
        />
      );
    }
    if (stage === "orientation") {
      return (
        <OrientationView
          onContinue={() => {
            const locked = pendingLockedIssuesRef.current ?? issues;
            pendingLockedIssuesRef.current = null;
            void analyze(delegation, stateData, locked);
          }}
        />
      );
    }
    if (stage === "geocodefail") {
      return (
        <DelegationErrorView
          tone="warn"
          title={t("delegationError.geocodeFailTitle")}
          body={t("delegationError.geocodeFailBody")}
          onEditAddress={() => setStage("home")}
          onRetry={
            failure?.retryable ? () => void startLookup(address) : undefined
          }
        />
      );
    }
    if (stage === "norep") {
      return (
        <DelegationErrorView
          tone="warn"
          title={t("delegationError.noRepTitle", {
            territory:
              failure?.territoryName || t("delegationError.noRepTitleFallback"),
          })}
          body={t("delegationError.noRepBody")}
          onEditAddress={() => setStage("home")}
        />
      );
    }
    if (stage === "dberror") {
      return (
        <DelegationErrorView
          tone="error"
          title={t("delegationError.dbErrorTitle")}
          body={t("delegationError.dbErrorBody")}
          onEditAddress={() => setStage("home")}
          onRetry={() => void startLookup(address)}
        />
      );
    }
    // About/Methodology/Privacy/Tip share the StaticPage shell. The legacy
    // app (VoterChoiceApp.tsx's own view-switch) already wraps these same
    // 4 pages in <AppNav/><main id="main-content">; App2 was missing that
    // wrapper entirely, leaving these routes with no top nav. flagbar is
    // the Bold Flag hairline (matches OrientationView's own chrome, and
    // canvas's StaticPageVC — design-handoff/keystone-canvas/src/
    // screens-statics.jsx), added only here since App2 is bf-app-only.
    if (stage === "about")
      return (
        <>
          <div className="flagbar">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <AppNav />
          <main id="main-content">
            <AboutPage onBack={() => setStage("home")} />
          </main>
        </>
      );
    if (stage === "whynow")
      return <WhyNowPage onBack={() => setStage("home")} />;
    if (stage === "methodology")
      return (
        <>
          <div className="flagbar">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <AppNav />
          <main id="main-content">
            <MethodologyPage onBack={() => setStage("home")} />
          </main>
        </>
      );
    if (stage === "privacy")
      return (
        <>
          <div className="flagbar">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <AppNav />
          <main id="main-content">
            <PrivacyPage onBack={() => setStage("home")} />
          </main>
        </>
      );
    if (stage === "tip")
      return (
        <>
          <div className="flagbar">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <AppNav />
          <main id="main-content">
            <TipJarPage onBack={() => setStage("home")} />
          </main>
        </>
      );
    if (stage === "print") {
      return (
        <ScorecardPrintView
          address={address}
          seats={seats}
          issues={issues}
          verdicts={verdicts}
          picks={picks}
          stateData={stateData}
          pollingInfo={pollingInfo ?? pollingFallback()}
          districtsLine={districtsLine}
          onBack={() => setStage("workspace")}
        />
      );
    }
    if (stage === "polisEntry") {
      return (
        <PolisEntry
          seatsCount={seats.length}
          onPrint={() => setStage("print")}
          onSeeStanding={seeStanding}
          onSkip={() => setStage("workspace")}
        />
      );
    }
    if (stage === "standing") {
      return (
        <div className="standing2">
          <AppNav onBrandClick={() => setStage("workspace")} />
          <div className="standing2-wrap">
            <button className="back2" onClick={() => setStage("workspace")}>
              ← Back to your scorecard
            </button>
            {unlockedScopes.length > 0 ? (
              <PolisClose polis={{ scopes: unlockedScopes }} />
            ) : (
              <StandingLocked onBack={() => setStage("workspace")} />
            )}
          </div>
        </div>
      );
    }
    // workspace
    if (seats.length === 0) {
      // Data evaporated (e.g. failed resume) — fall back to home.
      return (
        <DelegationErrorView
          tone="warn"
          title={t("delegationError.dataEvaporatedTitle")}
          body={t("delegationError.dataEvaporatedBody")}
          onEditAddress={startOver}
        />
      );
    }
    // Full-screen head-to-head duel — replaces the workspace surface while open
    // (reached from a seat's "Time to replace"). Records keep/replace + the
    // chosen successor via the existing verdict flow, then returns here.
    const duelSeat =
      duelSeatId && seats.find((s) => s.id === duelSeatId)
        ? seats.find((s) => s.id === duelSeatId)
        : null;
    if (duelSeat) {
      return (
        <>
          <HeadToHead
            seat={duelSeat}
            userIssues={issuesForLevel(issues, duelSeat.level)}
            stateCode={delegation?.stateCode || ""}
            verdict={verdicts[duelSeat.id] || null}
            pickId={picks[duelSeat.id] || null}
            onKeep={() => duelKeep(duelSeat.id)}
            onReplace={(pickId) => duelReplace(duelSeat.id, pickId)}
            onClose={() => setDuelSeatId(null)}
            onShowBudgetOptions={handleBudgetBlock}
          />
        </>
      );
    }
    return (
      <>
        <DelegationWorkspace
          address={address}
          stateName={delegation?.stateName}
          seats={seats}
          userIssues={issues}
          pollingInfo={pollingInfo ?? pollingFallback()}
          stateData={stateData}
          deadlineRows={
            stateData
              ? deadlineRowsFor(
                  stateData,
                  new Date().toISOString().slice(0, 10),
                )
              : []
          }
          researchFor={getSeatResearch}
          polisPreview={polisPreview}
          blindMode={blindMode}
          verdicts={verdicts}
          picks={picks}
          activeSeatId={activeSeatId}
          revealed={revealed}
          onReveal={reveal}
          onHide={hide}
          onVerdict={setVerdict}
          onOpenDuel={openDuel}
          onSelectSeat={setActiveSeatId}
          onPrint={() => setStage("print")}
          onContinueElsewhere={() => setShowHandoff(true)}
          onSeeStanding={openPolisEntry}
          chatMessages={chatMessages}
          chatTimeouts={chatTimeouts}
          budgetTier={budgetTier}
          onSendChat={handleSendChat}
          onRetryChat={handleRetryChat}
          onShowBudgetOptions={handleBudgetBlock}
          onEditIssues={() => setEditIssuesOpen(true)}
          issueDeltas={issueDeltas}
          onRevisitSeat={(seatId) => {
            setActiveSeatId(seatId);
            setIssueDeltas(null);
          }}
          onDismissDeltas={() => setIssueDeltas(null)}
          overviewOpen={seatOverviewOpen}
          onOpenSeat={openSeatFromOverview}
          onBackToOverview={backToOverview}
        />
        {showHandoff && (
          <HandoffModal
            seats={seats}
            issues={issues}
            verdicts={verdicts}
            districtsLine={districtsLine}
            stateName={delegation?.stateName}
            researchFor={getSeatResearch}
            onClose={() => setShowHandoff(false)}
          />
        )}
        {editIssuesOpen && (
          <EditIssuesModal
            issues={issues}
            onApply={(next) => void handleApplyIssues(next)}
            onCancel={() => setEditIssuesOpen(false)}
            onBudgetBlock={handleConvoBudgetBlock}
          />
        )}
      </>
    );
  }

  return (
    <NavProvider value={navValue}>
      {renderStage()}
      {/* Budget modal overlays ANY stage — intake conversations hit the gate
          before the workspace exists. */}
      {budgetModal && (
        <BudgetModal
          blocked={budgetModal.blocked}
          prompt={buildScorecardHandoffPrompt({
            seats,
            issues,
            verdicts,
            districtsLine,
            stateName: delegation?.stateName,
            researchFor: getSeatResearch,
          })}
          onClose={() => setBudgetModal(null)}
          onRetryWithKey={
            budgetModal.blocked && pendingRetryRef.current
              ? handleRetryWithKey
              : undefined
          }
        />
      )}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetAll={startOver}
        onExportProfile={undefined}
        onResumeProfile={undefined}
      />
    </NavProvider>
  );
}

export default function App2() {
  return (
    <I18nProvider>
      <App2Inner />
    </I18nProvider>
  );
}
