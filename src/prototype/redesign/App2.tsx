// @ts-nocheck
"use client";
/* App shell for the congress-assessment experience — port of
   docs/design/2026-redesign/…/redesign/redesign2-app.jsx with the real data
   flow wired in (the design file's flow was home → loading → workspace over
   static mocks):

     home → loading (delegation + state data fetch)
          → coldopen (issue intake — the SHIPPED ColdOpenView, kept between
            loading and workspace exactly as the legacy flow does)
          → analyzing (per-seat /api/race-data) → workspace
          → print / standing (+ static pages, honest failure states)

   Phase 1 renders the representatives returned by /api/delegation. */

import React, { useEffect, useRef, useState } from "react";
import {
  I18nProvider,
  NavProvider,
  AppNav,
  ErrorBanner,
  HomeView,
  LoadingView,
  ColdOpenView,
  AboutPage,
  MethodologyPage,
  PrivacyPage,
  TipJarPage,
} from "../VoterChoiceApp";
import { downloadProfileAsText } from "../../lib/ballot-utils";
import { DelegationWorkspace } from "./DelegationWorkspace";
import { HandoffModal } from "./HandoffModal";
import { ScorecardPrintView } from "./ScorecardPrintView";
import { PolisClose } from "./PolisClose";
import {
  fetchDelegation,
  loadAllSeatCardData,
  loadStateElectionData,
  buildSeats,
  decorateIssues,
  deadlineRowsFor,
  pollingFallback,
  preloadSeatResearch,
  getSeatResearch,
  submitSessionCounters,
  buildScorecardProfileText,
} from "./delegationData";
import { loadPolisScopes } from "./polisAdapter";

const STORE_KEY2 = "voter-choice:redesign2";

function loadState2() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY2)) || {};
  } catch {
    return {};
  }
}

/* Honest failure states (geocode / territory / data outage) in the design's
   visual language — AppNav + the shipped ErrorBanner. */
function DelegationErrorView({ tone, title, body, onEditAddress, onRetry }) {
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
          primary={{ label: "Edit address", onClick: onEditAddress }}
          secondary={
            onRetry ? { label: "Try again", onClick: onRetry } : undefined
          }
        />
      </main>
    </>
  );
}

/* Standing stage lock state — below the privacy threshold there is no map. */
function StandingLocked({ countToUnlock, onBack }) {
  return (
    <section className="polis">
      <div className="polis-lede">
        <div className="kick">One last thing</div>
        <h2>See where you stand — soon.</h2>
        <p>
          This view unlocks once enough people near you have finished their
          scorecards
          {typeof countToUnlock === "number" && countToUnlock > 0
            ? ` — about ${countToUnlock.toLocaleString("en-US")} more sessions to go.`
            : "."}{" "}
          No individual responses are ever stored, so the map only exists in
          aggregate.
        </p>
        <button className="back2" onClick={onBack}>
          ← Back to your scorecard
        </button>
      </div>
    </section>
  );
}

function App2Inner() {
  const saved = loadState2();
  const [stage, setStage] = useState(() => {
    // Workspace-family stages need refetched data — resume via loading.
    const s = saved.stage || "home";
    if (
      [
        "workspace",
        "print",
        "standing",
        "coldopen",
        "analyzing",
        "loading",
      ].includes(s)
    ) {
      return saved.address ? "resume" : "home";
    }
    return s;
  });
  const [address, setAddress] = useState(saved.address || "");
  const blindMode = true;
  const [verdicts, setVerdicts] = useState(saved.verdicts || {});
  const [activeSeatId, setActiveSeatId] = useState(saved.activeSeatId || null);
  const [revealed, setRevealed] = useState(() => new Set(saved.revealed || []));
  const [issues, setIssues] = useState(saved.issues || []);
  const [showHandoff, setShowHandoff] = useState(false);

  // Fetched (not persisted — refetched on resume)
  const [delegation, setDelegation] = useState(null);
  const [stateData, setStateData] = useState(null);
  const [seats, setSeats] = useState([]);
  const [failure, setFailure] = useState(null);
  const [polisScopes, setPolisScopes] = useState(null);
  const [, setResearchTick] = useState(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(
      STORE_KEY2,
      JSON.stringify({
        stage,
        address,
        verdicts,
        activeSeatId,
        revealed: [...revealed],
        issues,
      }),
    );
  }, [stage, address, verdicts, activeSeatId, revealed, issues]);

  // Resume: re-run the pipeline silently for a returning session.
  useEffect(() => {
    if (stage === "resume") {
      void startLookup(address, { resuming: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startLookup(addr, { resuming = false } = {}) {
    setFailure(null);
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
    setStateData(sd);
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
      county: delegationResult.county,
      userConcerns: decorated.map((i) => i.canonicalIssue).filter(Boolean),
    }).then(setPolisScopes);
    setStage("workspace");
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "auto" });
  }

  function setVerdict(seatId, v) {
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
          county: delegation.county,
          issues,
        });
      }
      return next;
    });
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
        county: delegation.county,
        issues,
      });
    }
    setStage("standing");
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

  function saveProfile() {
    downloadProfileAsText(
      buildScorecardProfileText({ seats, issues, verdicts, districtsLine }),
    );
  }

  function startOver() {
    try {
      localStorage.removeItem(STORE_KEY2);
    } catch {
      /* ignore */
    }
    setAddress("");
    setIssues([]);
    setVerdicts({});
    setRevealed(new Set());
    setDelegation(null);
    setSeats([]);
    setStage("home");
  }

  // Nav context — wires AppNav brand/links + footer links to stages.
  const PAGE_STAGES = { about: 1, methodology: 1, privacy: 1, tip: 1 };
  function navigate(page) {
    if (page === "home") return setStage("home");
    if (page === "howitworks") return setStage("home");
    if (PAGE_STAGES[page]) return setStage(page);
  }
  const navValue = { openSettings: () => {}, navigate, current: stage };

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
          savedSession={null}
          onSubmit={(a) => {
            setAddress(a);
            void startLookup(a);
          }}
          onResumeFromProfile={() => {}}
          onResumeSession={() => {}}
          onStartOver={startOver}
          onNavigate={navigate}
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
        <ColdOpenView
          address={address}
          savedIssues={issues.length > 0 ? issues : null}
          contextNote="your 3 members of Congress"
          onLock={(locked) => void analyze(delegation, stateData, locked)}
        />
      );
    }
    if (stage === "geocodefail") {
      return (
        <DelegationErrorView
          tone="warn"
          title="We couldn't place that address"
          body="Try the full street address, city, and ZIP — the district lookup needs a real street address to find your representatives."
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
          title={`${failure?.territoryName || "Your area"} has no voting member of Congress`}
          body="Residents here aren't represented by a voting House member or Senators — that's a fact about the system, not your address. We'd rather say so than fake a delegation."
          onEditAddress={() => setStage("home")}
        />
      );
    }
    if (stage === "dberror") {
      return (
        <DelegationErrorView
          tone="error"
          title="Our records are unavailable right now"
          body="We found your district but couldn't load the delegation records. Try again in a minute."
          onEditAddress={() => setStage("home")}
          onRetry={() => void startLookup(address)}
        />
      );
    }
    if (stage === "about") return <AboutPage onBack={() => setStage("home")} />;
    if (stage === "methodology")
      return <MethodologyPage onBack={() => setStage("home")} />;
    if (stage === "privacy")
      return <PrivacyPage onBack={() => setStage("home")} />;
    if (stage === "tip") return <TipJarPage onBack={() => setStage("home")} />;
    if (stage === "print") {
      return (
        <ScorecardPrintView
          address={address}
          seats={seats}
          issues={issues}
          verdicts={verdicts}
          stateData={stateData}
          pollingInfo={pollingFallback()}
          districtsLine={districtsLine}
          onBack={() => setStage("workspace")}
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
              <StandingLocked
                countToUnlock={
                  polisScopes && polisScopes.length > 0
                    ? polisScopes[polisScopes.length - 1].countToUnlock
                    : null
                }
                onBack={() => setStage("workspace")}
              />
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
          title="Let's start from your address"
          body="We couldn't restore your previous session's data."
          onEditAddress={startOver}
        />
      );
    }
    return (
      <>
        <DelegationWorkspace
          address={address}
          stateName={delegation?.stateName}
          seats={seats}
          userIssues={issues}
          pollingInfo={pollingFallback()}
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
          activeSeatId={activeSeatId}
          revealed={revealed}
          onReveal={reveal}
          onHide={hide}
          onVerdict={setVerdict}
          onSelectSeat={setActiveSeatId}
          onPrint={() => setStage("print")}
          onSaveProfile={saveProfile}
          onContinueElsewhere={() => setShowHandoff(true)}
          onSeeStanding={seeStanding}
        />
        {showHandoff && (
          <HandoffModal
            seats={seats}
            issues={issues}
            verdicts={verdicts}
            districtsLine={districtsLine}
            onClose={() => setShowHandoff(false)}
          />
        )}
      </>
    );
  }

  return <NavProvider value={navValue}>{renderStage()}</NavProvider>;
}

export default function App2() {
  return (
    <I18nProvider>
      <App2Inner />
    </I18nProvider>
  );
}
