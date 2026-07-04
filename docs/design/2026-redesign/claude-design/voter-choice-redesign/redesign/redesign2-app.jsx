/* ====================================================
   VOTER CHOICE · 2026 redesign — app shell
   ====================================================
   Uses the SHIPPED HomeView + LoadingView + static pages verbatim
   (the repo home page is unchanged by this redesign — only the
   workspace/scorecard/polis are new). Wrapped in the shipped
   I18nProvider + NavProvider so AppNav, the header links, and the
   footer links all resolve exactly as in the repo.

   Flow mirrors the repo: home → loading → workspace → print / standing.
   ==================================================== */

const { useState: useStateA, useEffect: useEffectA } = React;

const ADDRESS2 = "1100 Congress Ave, Austin, TX 78701";
const STORE_KEY2 = "voter-choice:redesign2";

function loadState2() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY2)) || {};
  } catch {
    return {};
  }
}

function Tweaks2({ scope, setScope, blindMode, setBlind }) {
  return (
    <div className="tweaks2">
      <h4>Tweaks</h4>
      <div className="tweak2">
        <label>Who to show</label>
        <div className="seg2">
          <button
            className={scope === "fed" ? "on" : ""}
            onClick={() => setScope("fed")}
          >
            Federal only
          </button>
          <button
            className={scope === "both" ? "on" : ""}
            onClick={() => setScope("both")}
          >
            Federal + State
          </button>
        </div>
      </div>
      <div className="tweak2">
        <label>Assessment</label>
        <div className="seg2">
          <button
            className={blindMode ? "on" : ""}
            onClick={() => setBlind(true)}
          >
            Blind first
          </button>
          <button
            className={!blindMode ? "on" : ""}
            onClick={() => setBlind(false)}
          >
            Names shown
          </button>
        </div>
      </div>
      <p className="tw-note">
        Blind-first hides name &amp; party so you judge the record, then reveal.
      </p>
    </div>
  );
}

function App2() {
  const saved = loadState2();
  const [stage, setStage] = useStateA(saved.stage || "home");
  const [address, setAddress] = useStateA(saved.address || "");
  const [scope, setScope] = useStateA(saved.scope || "both");
  const [blindMode, setBlind] = useStateA(
    saved.blindMode !== undefined ? saved.blindMode : true,
  );
  const [verdicts, setVerdicts] = useStateA(saved.verdicts || {});
  const [activeSeatId, setActiveSeatId] = useStateA(
    saved.activeSeatId || DELEGATION[0].id,
  );
  const [revealed, setRevealed] = useStateA(
    () => new Set(saved.revealed || []),
  );

  useEffectA(() => {
    localStorage.setItem(
      STORE_KEY2,
      JSON.stringify({
        stage,
        address,
        scope,
        blindMode,
        verdicts,
        activeSeatId,
        revealed: [...revealed],
      }),
    );
  }, [stage, address, scope, blindMode, verdicts, activeSeatId, revealed]);

  function setVerdict(seatId, v) {
    setVerdicts((prev) => {
      const next = { ...prev };
      if (v) next[seatId] = v;
      else delete next[seatId];
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

  const addr = address || ADDRESS2;

  // Nav context — wires AppNav brand/links + footer links to stages.
  const PAGE_STAGES = { about: 1, methodology: 1, privacy: 1, tip: 1 };
  function navigate(page) {
    if (page === "home") return setStage("home");
    if (page === "howitworks") return setStage("home");
    if (PAGE_STAGES[page]) return setStage(page);
  }
  const navValue = { openSettings: () => {}, navigate, current: stage };

  function renderStage() {
    if (stage === "home") {
      return (
        <HomeView
          savedAddress={address}
          savedSession={null}
          onSubmit={(a) => {
            setAddress(a);
            setStage("loading");
          }}
          onResumeFromProfile={() => {
            setAddress(ADDRESS2);
            setStage("loading");
          }}
          onResumeSession={() => setStage("workspace")}
          onStartOver={() => {}}
          onNavigate={navigate}
        />
      );
    }
    if (stage === "loading") {
      return (
        <LoadingView address={addr} onDone={() => setStage("workspace")} />
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
          address={addr}
          scope={scope}
          verdicts={verdicts}
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
            <PolisClose polis={POLIS2} />
          </div>
        </div>
      );
    }
    // workspace
    return (
      <>
        <DelegationWorkspace
          address={addr}
          scope={scope}
          blindMode={blindMode}
          verdicts={verdicts}
          activeSeatId={activeSeatId}
          revealed={revealed}
          onReveal={reveal}
          onHide={hide}
          onVerdict={setVerdict}
          onSelectSeat={setActiveSeatId}
          onPrint={() => setStage("print")}
          onSeeStanding={() => setStage("standing")}
        />
        <Tweaks2
          scope={scope}
          setScope={setScope}
          blindMode={blindMode}
          setBlind={setBlind}
        />
      </>
    );
  }

  return <NavProvider value={navValue}>{renderStage()}</NavProvider>;
}

window.__voterChoiceReset = () => {
  localStorage.removeItem(STORE_KEY2);
  location.reload();
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <I18nProvider>
    <App2 />
  </I18nProvider>,
);
