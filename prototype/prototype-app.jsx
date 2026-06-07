/* ====================================================
   VOTER CHOICE · root app
   ====================================================
   State machine + routing + persistence + tweaks +
   the Pass-B screen states (party gate, amend editor,
   budget exhausted, profile resume).
   ==================================================== */

const { useState: useStateA, useEffect: useEffectA, useCallback: useCallbackA } = React;

const STORAGE_KEY = 'voter-choice-prototype-v2';
const LEGACY_KEY  = 'voter-choice-prototype-v1';
const TWEAKS_KEY  = 'voter-choice-tweaks-v1';

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "mood": "civic",
  "palette": "civic",
  "treatment": "daylight"
}/*EDITMODE-END*/;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      return { ...legacy, issues: legacy.themes || [] };
    }
    return null;
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
  const [issues, setIssues] = useStateA(saved?.issues || saved?.themes || []);
  const [decisions, setDecisions] = useStateA(saved?.decisions || {});
  const [activeRaceId, setActiveRaceId] = useStateA(saved?.activeRaceId || RACES[0].id);

  // Pass-B modal/screen state
  const [amendOpen, setAmendOpen] = useStateA(false);
  const [budgetOpen, setBudgetOpen] = useStateA(false);
  const [resumeOpen, setResumeOpen] = useStateA(false);
  const [compareOpen, setCompareOpen] = useStateA(false);
  const [allVotesFor, setAllVotesFor] = useStateA(null); // { candidate, alignmentEntry }
  // The most recent amend delta + offer to thread into the chat
  const [amendDeltas, setAmendDeltas] = useStateA(null);
  // Chat input: appended messages (user prompts + mock AI replies)
  const [chatMessages, setChatMessages] = useStateA({}); // keyed by raceId → [{who, text}]

  // Pass-C state
  const [settingsOpen, setSettingsOpen] = useStateA(false);
  // Budget exhaustion — once the community AI budget runs out it stays
  // out for the session. Flips on when the user hits the handoff path;
  // in the repo this is driven by a real budget signal from the API.
  const [budgetExhausted, setBudgetExhausted] = useStateA(false);
  // Post-decision toast — shows once when every race is decided.
  const [toastDismissed, setToastDismissed] = useStateA(false);
  // Per-race AI timeout flags so the chat can surface AITimeoutBanner
  const [chatTimeouts, setChatTimeouts] = useStateA({}); // { [raceId]: true }
  // Saved snapshot used by HomeView's ResumeNudge to decide whether to show
  const savedSession = saved
    ? { issues: saved.issues || [], decisions: saved.decisions || {}, address: saved.address || '' }
    : null;

  // Blind candidate mode — candidates show as Candidate A/B until
  // user explicitly reveals on a per-candidate basis (sticky).
  const [blindMode, setBlindMode] = useStateA(saved?.blindMode !== false);
  const [revealedCandidates, setRevealedCandidates] = useStateA(new Set(saved?.revealedCandidates || []));

  const [tweaks, setTweaks] = useStateA(loadTweaks);
  const [tweaksOpen, setTweaksOpen] = useStateA(false);

  useEffectA(() => {
    saveState({ view, address, issues, decisions, activeRaceId, blindMode, revealedCandidates: [...revealedCandidates] });
  }, [view, address, issues, decisions, activeRaceId, blindMode, revealedCandidates]);

  useEffectA(() => {
    document.body.setAttribute('data-mood', tweaks.mood);
    document.body.setAttribute('data-palette', tweaks.palette);
    document.body.setAttribute('data-treatment', tweaks.treatment);
    saveTweaks(tweaks);
  }, [tweaks]);

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
    // Pass-C: simulate geocode failures for any address that is
    // obviously incomplete. The real app delegates to /api/civic;
    // here we fake it so the error views are demoable.
    const trimmed = (addr || '').trim();
    const looksLikeJustZip = /^\d{5}(-\d{4})?$/.test(trimmed);
    const looksTooShort    = trimmed.length < 6 && !looksLikeJustZip;
    if (looksTooShort) {
      setAddress(trimmed);
      setView('geocodefail');
      return;
    }
    // Demo trigger: if address contains "rural" we route to no-contested.
    if (/rural|noballot/i.test(trimmed)) {
      setAddress(trimmed);
      setView('nocontested');
      return;
    }
    setAddress(trimmed);
    setView('loading');
  }

  function handleLoadingDone() {
    if (issues.length > 0) setView('workspace');
    else setView('coldopen');
  }

  function handleLockIssues(newIssues) {
    setIssues(newIssues);
    setActiveRaceId(RACES[0].id);
    setView('workspace');
    // Scroll to top so the user lands at the top of the workspace,
    // not wherever ColdOpenView left them (which on mobile was often
    // the bottom of the issue list).
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      // Mobile: skip the ballot-pane landing page and open the
      // candidate chat overlay for race 1 immediately. The user just
      // told us what they care about — surface the first decision.
      if (window.matchMedia('(max-width: 767px)').matches) {
        window.__autoOpenChat = true;
      }
    }
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

  function handleReset() {
    if (!confirm('Start over? This clears your draft ballot and issues.')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {}
    setView('home');
    setAddress('');
    setIssues([]);
    setDecisions({});
    setActiveRaceId(RACES[0].id);
    setRevealedCandidates(new Set());
    setBlindMode(true);
  }

function handleRevealCandidate(candidateId) {
    setRevealedCandidates(prev => new Set([...prev, candidateId]));
  }
  function handleHideCandidate(candidateId) {
    // Inverse of reveal: re-anonymize a single previously-revealed
    // card without flipping global blind mode off and back on.
    setRevealedCandidates(prev => {
      const next = new Set(prev);
      next.delete(candidateId);
      return next;
    });
  }
  function handleToggleBlindMode() {
    setBlindMode(b => {
      const next = !b;
      // [Fix] When the user turns blind mode BACK ON, clear any
      // per-candidate reveals from the previous session. The
      // expectation is that BLIND means BLIND — not "blind except
      // the ones you already peeked at." Per-candidate reveals are
      // a one-off within-session affordance, not a permanent grant.
      if (next) setRevealedCandidates(new Set());
      return next;
    });
  }

  useEffectA(() => {
    window.__voterChoiceReset = handleReset;
  }, []);

  /* ─── Pass-B handlers ─────────────────────── */

  // Amendment editor: open and apply
  function handleApplyAmend(newIssues) {
    setIssues(newIssues);
    setAmendOpen(false);

    // Compute deltas vs previous decisions (mocked — random shift in range)
    const deltas = Object.entries(decisions).map(([raceId, d]) => {
      const race = RACES.find(r => r.id === raceId);
      const oldPct = 50 + Math.floor(Math.random() * 30) - 15;
      const shift = Math.floor(Math.random() * 14) - 7;
      const newPct = Math.max(0, Math.min(100, oldPct + shift));
      return {
        raceId,
        raceLabel: race?.label || raceId,
        pick: d.pick + (d.party ? ' (' + d.party + ')' : ''),
        oldPct,
        newPct,
        significant: Math.abs(shift) > 5,
      };
    });
    setAmendDeltas(deltas);
  }

  function handleClearDelta() { setAmendDeltas(null); }

  // Resume from saved profile (demo: load preset)
  function handleResumeProfile() {
    if (!SAMPLE_RESUME_PROFILE) {
      alert('Sample profile missing — check prototype-screens.jsx');
      return;
    }
    setIssues(SAMPLE_RESUME_PROFILE.issues);
    setDecisions(SAMPLE_RESUME_PROFILE.decisions);
    setAddress('1600 Pennsylvania Ave NW, Washington DC 20500');
    setActiveRaceId('us-senate-tx');
    setResumeOpen(false);
    setView('workspace');
  }

  // Chat input: add user msg + mock AI reply
  function handleSendChat(raceId, text) {
    const userMsg = { who: 'user', text };

    // Pass-C demo: typing "timeout" or "fail" simulates an AI error.
    if (/\b(timeout|fail|error)\b/i.test(text)) {
      setChatMessages(prev => ({
        ...prev,
        [raceId]: [...(prev[raceId] || []), userMsg],
      }));
      setChatTimeouts(prev => ({ ...prev, [raceId]: true }));
      return;
    }

    const aiMsg = mockAIReply(raceId, text);
    setChatMessages(prev => ({
      ...prev,
      [raceId]: [...(prev[raceId] || []), userMsg, aiMsg],
    }));
  }

  function handleRetryChat(raceId) {
    setChatTimeouts(prev => {
      const next = { ...prev };
      delete next[raceId];
      return next;
    });
    // Replay the last user message
    const msgs = chatMessages[raceId] || [];
    const last = [...msgs].reverse().find(m => m.who === 'user');
    if (last) {
      const aiMsg = mockAIReply(raceId, last.text);
      setChatMessages(prev => ({
        ...prev,
        [raceId]: [...(prev[raceId] || []), aiMsg],
      }));
    }
  }

  /* ─── Pass-C navigation ─── */
  function handleNavigate(target) {
    // 'howitworks' folds back to home (where the walkthrough lives).
    if (target === 'howitworks') {
      setView('home');
      setTimeout(() => {
        const el = document.querySelector('.hiw');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return;
    }
    if (target === 'home') { setView('home'); return; }
    if (target === 'about' || target === 'methodology' || target === 'privacy' || target === 'tip') {
      setView(target);
      return;
    }
  }
  useEffectA(() => { window.__navigate = handleNavigate; }, [view]);

  /* ─── Pass-C: settings handlers ─── */
  function handleExportProfile() {
    const blob = new Blob([buildPortablePrompt({
      address, issues, decisions,
      racesRemaining: RACES.length - Object.keys(decisions).length,
    })], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voter-choice-profile.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // Stable callbacks so context value identity doesn't change every render
  const navValue = React.useMemo(() => ({
    openSettings: () => setSettingsOpen(true),
    navigate: handleNavigate,
    current: view,
  }), [view]);

  return (
    <I18nProvider>
      <NavProvider value={navValue}>
      {view === 'home' && (
        <HomeView
          savedAddress={address}
          savedSession={savedSession}
          onSubmit={handleSubmitAddress}
          onResumeFromProfile={() => setResumeOpen(true)}
          onResumeSession={() => { if (issues.length || Object.keys(decisions).length) setView('workspace'); else setView('coldopen'); }}
          onStartOver={handleReset}
          onNavigate={handleNavigate}
        />
      )}
      {view === 'loading' && (
        <LoadingView address={address} onDone={handleLoadingDone} />
      )}
      {view === 'geocodefail' && (
        <>
          <AppNav />
          <main id="main-content">
            <GeocodeFailView
              address={address}
              onEditAddress={() => setView('home')}
              onContinueWithZip={() => setView('loading')}
            />
          </main>
        </>
      )}
      {view === 'nocontested' && (
        <>
          <AppNav />
          <main id="main-content">
            <NoContestedView
              stateData={STATE_ELECTION_DATA}
              county="Harris County"
              onBack={() => setView('home')}
              onBallotConfirmed={() => {
                // We fell back to county-level lookup — drop the
                // ungeocoded address string and replace with the
                // confirmed-county label so the workspace doesn't
                // display the user's failed input verbatim.
                setAddress('Harris County, TX');
                setView(issues.length ? 'workspace' : 'coldopen');
              }}
            />
          </main>
        </>
      )}
      {view === 'partygate' && (
        <PartyGate
          stateName="Texas"
          electionDate="March 3, 2026"
          onPick={(party) => { setView(issues.length ? 'workspace' : 'coldopen'); }}
          onSkip={() => { setView(issues.length ? 'workspace' : 'coldopen'); }}
        />
      )}
      {view === 'coldopen' && (
        <ColdOpenView address={address} onLock={handleLockIssues} savedIssues={issues} />
      )}
      {view === 'workspace' && (
        <WorkspaceView
          address={address}
          issues={issues}
          decisions={decisions}
          activeRaceId={activeRaceId}
          onDecide={handleDecide}
          onUnpick={handleUnpick}
          onSelectRace={handleSelectRace}
          onPrint={handlePrint}
          onEditIssues={() => setAmendOpen(true)}
          onSaveProfile={handleExportProfile}
          onContinueElsewhere={() => { setBudgetExhausted(true); setBudgetOpen(true); }}
          budgetExhausted={budgetExhausted}
          onOpenByok={() => setSettingsOpen(true)}
          onNavigate={handleNavigate}
          // chat input wiring
          chatMessages={chatMessages}
          onSendChat={handleSendChat}
          // AI timeout
          chatTimeouts={chatTimeouts}
          onRetryChat={handleRetryChat}
          // Compare + See all votes wiring
          onCompare={() => setCompareOpen(true)}
          onSeeAllVotes={(payload) => setAllVotesFor(payload)}
          // Amend delta + rescore offer
          amendDeltas={amendDeltas}
          onClearDelta={handleClearDelta}
          onViewPartyGate={() => setView('partygate')}
          blindMode={blindMode}
          revealedCandidates={revealedCandidates}
          onRevealCandidate={handleRevealCandidate}
          onHideCandidate={handleHideCandidate}
          onToggleBlindMode={handleToggleBlindMode}
        />
      )}
      {view === 'print' && (
        <PrintView
          address={address}
          issues={issues}
          decisions={decisions}
          onBack={handleBackFromPrint}
        />
      )}

      {view === 'about' && (
        <>
          <AppNav />
          <main id="main-content">
            <AboutPage onBack={() => setView('home')} />
          </main>
        </>
      )}
      {view === 'methodology' && (
        <>
          <AppNav />
          <main id="main-content">
            <MethodologyPage onBack={() => setView('home')} />
          </main>
        </>
      )}
      {view === 'privacy' && (
        <>
          <AppNav />
          <main id="main-content">
            <PrivacyPage onBack={() => setView('home')} />
          </main>
        </>
      )}

      {view === 'tip' && (
        <>
          <AppNav />
          <main id="main-content">
            <TipJarPage onBack={() => setView('home')} />
          </main>
        </>
      )}

      {/* Pass-B modals */}
      {amendOpen && (
        <AmendmentEditor
          issues={issues}
          decisionsCount={Object.keys(decisions).length}
          onApply={handleApplyAmend}
          onCancel={() => setAmendOpen(false)}
        />
      )}
      <BudgetExhaustedModal
        open={budgetOpen}
        address={address}
        issues={issues}
        decisions={decisions}
        racesRemaining={RACES.length - Object.keys(decisions).length}
        onClose={() => setBudgetOpen(false)}
      />
      <ProfileResumeModal
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onResume={handleResumeProfile}
      />
      {compareOpen && (
        <CompareModal
          open={compareOpen}
          race={RACES.find(r => r.id === activeRaceId)}
          issues={issues}
          blindMode={blindMode}
          revealedCandidates={revealedCandidates}
          onRevealCandidate={handleRevealCandidate}
          onClose={() => setCompareOpen(false)}
        />
      )}
      {allVotesFor && (
        <AllVotesPanel
          open={!!allVotesFor}
          candidate={allVotesFor.candidate}
          alignmentEntry={allVotesFor.alignmentEntry}
          blindMode={allVotesFor.blindMode}
          alias={allVotesFor.alias && `Candidate ${allVotesFor.alias}`}
          onClose={() => setAllVotesFor(null)}
        />
      )}

      {/* Post-decision toast — one-time, when every race is decided.
          Persists a localStorage flag so it never nags on return. */}
      {view === 'workspace'
        && Object.keys(decisions).length === RACES.length
        && !toastDismissed
        && !(() => { try { return localStorage.getItem('vc-decided-toast') === '1'; } catch (e) { return false; } })()
        && (
        <div className="pd-toast" role="status">
          <div className="pd-toast-head">
            <div>
              <div className="pd-toast-ttl">You decided all {RACES.length} races.</div>
              <div className="pd-toast-sub">Take your ballot to the booth — many polls don't allow phones.</div>
            </div>
            <button
              className="pd-toast-x"
              aria-label="Dismiss"
              onClick={() => { setToastDismissed(true); try { localStorage.setItem('vc-decided-toast', '1'); } catch (e) {} }}
            >×</button>
          </div>
          <div className="pd-toast-actions">
            <button className="pd-print" onClick={() => { setToastDismissed(true); handlePrint(); }}>Print ↗</button>
            <button className="pd-save" onClick={() => { setToastDismissed(true); handleExportProfile(); }}>Save .txt ↓</button>
            <button className="pd-tip" onClick={() => { setToastDismissed(true); try { localStorage.setItem('vc-decided-toast', '1'); } catch (e) {} handleNavigate('tip'); }}>Tip jar →</button>
          </div>
        </div>
      )}

      <TweaksPanel
        tweaks={tweaks}
        onChange={updateTweaks}
        hidden={!tweaksOpen}
        onClose={closeTweaks}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetAll={handleReset}
        onExportProfile={handleExportProfile}
        onResumeProfile={() => setResumeOpen(true)}
      />
      </NavProvider>
    </I18nProvider>
  );
}

/* Tiny mock AI for the chat input. The real ChatPanel.tsx
   streams from Anthropic with full RAG context. This stub just
   makes the input feel alive so users can demo the loop. */
function mockAIReply(raceId, userText) {
  const t = (userText || '').toLowerCase();
  const race = RACES.find(r => r.id === raceId);
  const racePatterns = getRacePatternsForRace(raceId);
  const incumbent = racePatterns?.candidates?.find(c => c.incumbent);
  const challenger = racePatterns?.candidates?.find(c => !c.incumbent);

  let body;
  if (/donor|fund|money|pac|cash/.test(t)) {
    body = `${incumbent?.name || 'The incumbent'}'s biggest 2024 donor industries were Oil & Gas ($1.2M) and Banking ($680k). ${challenger?.name || 'The challenger'} ran a more grassroots cycle. Tap "Compare" in the header for a side-by-side view, or scroll the candidate cards to see the money map.`;
  } else if (/vote|record|bill|hr-|s-\d/.test(t)) {
    body = `For ${race?.label || 'this race'}, the curated votes are visible on the incumbent's card — tap any alignment row to see them. The HR-2 and IRA votes are the clearest signal on healthcare; the PELOSI Act sequence is the clearest on stock-trading.`;
  } else if (/compare|side by side|both/.test(t)) {
    body = `Opening Compare for you. (Or hit the "Compare" button in the chat header above.)`;
  } else if (/skip|pass|move on/.test(t)) {
    body = `Got it — I'll keep this one in your "Decide at the polls" bucket. Hit Skip in the header to move to the next race.`;
  } else if (/help|how|stuck|don't know|dont know/.test(t)) {
    body = `Easiest path: start with the issue rows on the incumbent's card. Whichever has the lowest %, tap to read the actual votes. Then decide.`;
  } else {
    body = `(Demo response) Real AI here would pull from voting records, donor data, and the CAN2026 case files to answer "${userText}". For now: the candidate cards above carry the load-bearing facts.`;
  }
  return { who: 'ai', text: body };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
