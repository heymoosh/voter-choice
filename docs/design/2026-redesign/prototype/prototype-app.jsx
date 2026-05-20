/* ====================================================
   VOTER CHOICE · root app
   State machine, routing, persistence, tweaks
   ==================================================== */

const { useState: useStateA, useEffect: useEffectA } = React;

const STORAGE_KEY = 'voter-choice-prototype-v1';
const TWEAKS_KEY = 'voter-choice-tweaks-v1';

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "mood": "editorial",
  "palette": "civic",
  "treatment": "daylight"
}/*EDITMODE-END*/;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function loadTweaks() {
  try {
    const raw = localStorage.getItem(TWEAKS_KEY);
    if (!raw) return DEFAULT_TWEAKS;
    return Object.assign({}, DEFAULT_TWEAKS, JSON.parse(raw));
  } catch (e) { return DEFAULT_TWEAKS; }
}
function saveTweaks(t) {
  try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(t)); } catch (e) {}
}

function App() {
  const saved = loadState();
  const [view, setView] = useStateA(saved?.view || 'home');
  const [address, setAddress] = useStateA(saved?.address || '');
  const [themes, setThemes] = useStateA(saved?.themes || []);
  const [decisions, setDecisions] = useStateA(saved?.decisions || {});
  const [activeRaceId, setActiveRaceId] = useStateA(saved?.activeRaceId || RACES[0].id);

  const [tweaks, setTweaks] = useStateA(loadTweaks);
  const [tweaksOpen, setTweaksOpen] = useStateA(false);

  // Persist app state
  useEffectA(() => {
    saveState({ view, address, themes, decisions, activeRaceId });
  }, [view, address, themes, decisions, activeRaceId]);

  // Apply tweaks to body + persist
  useEffectA(() => {
    document.body.setAttribute('data-mood', tweaks.mood);
    document.body.setAttribute('data-palette', tweaks.palette);
    document.body.setAttribute('data-treatment', tweaks.treatment);
    saveTweaks(tweaks);
  }, [tweaks]);

  // Edit-mode protocol — listen BEFORE announcing
  useEffectA(() => {
    function onMsg(e) {
      const d = e?.data;
      if (!d || !d.type) return;
      if (d.type === '__activate_edit_mode') setTweaksOpen(true);
      if (d.type === '__deactivate_edit_mode') setTweaksOpen(false);
    }
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function updateTweaks(patch) {
    setTweaks(prev => {
      const next = { ...prev, ...patch };
      try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*'); } catch (e) {}
      return next;
    });
  }

  function closeTweaks() {
    setTweaksOpen(false);
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
  }

  function handleSubmitAddress(addr) {
    setAddress(addr);
    setView('loading');
  }

  function handleLoadingDone() {
    if (themes.length > 0) setView('workspace');
    else setView('coldopen');
  }

  function handleLockThemes(newThemes) {
    setThemes(newThemes);
    setActiveRaceId(RACES[0].id);
    setView('workspace');
  }

  function handleDecide(raceId, decision) {
    setDecisions(prev => ({ ...prev, [raceId]: decision }));
  }

  function handleUnpick(raceId) {
    setDecisions(prev => {
      const next = { ...prev };
      delete next[raceId];
      return next;
    });
  }

  function handleSelectRace(raceId) {
    setActiveRaceId(raceId);
  }

  function handlePrint() {
    setView('print');
  }

  function handleBackFromPrint() {
    setView('workspace');
  }

  function handleEditThemes() {
    setView('coldopen');
  }

  function handleBrandClick() {
    setView('home');
  }

  function handleReset() {
    if (!confirm('Start over? This clears your draft ballot and themes.')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    setView('home');
    setAddress('');
    setThemes([]);
    setDecisions({});
    setActiveRaceId(RACES[0].id);
  }

  // Dev/preview helper — also expose reset on window
  useEffectA(() => {
    window.__voterChoiceReset = handleReset;
  }, []);

  return (
    <>
      {view === 'home' && (
        <HomeView savedAddress={address} onSubmit={handleSubmitAddress} />
      )}
      {view === 'loading' && (
        <LoadingView address={address} onDone={handleLoadingDone} />
      )}
      {view === 'coldopen' && (
        <ColdOpenView address={address} onLock={handleLockThemes} savedThemes={themes} />
      )}
      {view === 'workspace' && (
        <WorkspaceView
          address={address}
          themes={themes}
          decisions={decisions}
          activeRaceId={activeRaceId}
          onDecide={handleDecide}
          onUnpick={handleUnpick}
          onSelectRace={handleSelectRace}
          onPrint={handlePrint}
          onEditThemes={handleEditThemes}
        />
      )}
      {view === 'print' && (
        <PrintView
          address={address}
          themes={themes}
          decisions={decisions}
          onBack={handleBackFromPrint}
        />
      )}

      <TweaksPanel
        tweaks={tweaks}
        onChange={updateTweaks}
        hidden={!tweaksOpen}
        onClose={closeTweaks}
      />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
