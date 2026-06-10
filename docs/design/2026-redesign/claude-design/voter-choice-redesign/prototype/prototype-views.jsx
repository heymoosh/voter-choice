/* ====================================================
   VOTER CHOICE · views
   ====================================================
   See prototype/COMPONENT_MAP.md for repo targets.

   Views own state-shape orchestration and pass repo-shaped
   props down to leaf components (CandidateCard, FunderBars,
   etc.). All data lookups go through the helper functions
   from prototype-data.jsx so the view layer never knows the
   storage layout.
   ==================================================== */

const { useState: useStateV, useEffect: useEffectV, useRef: useRefV } = React;

/* ============ HomeView ============
   Maps to: src/app/page.tsx + src/components/AddressInput.tsx
   Pass C adds: ResumeNudge, HowItWorksWalkthrough, DeadlineMeter strip. */
function HomeView({ savedAddress, savedSession, onSubmit, onResumeFromProfile, onResumeSession, onStartOver, onNavigate }) {
  // Always start the address field empty. We DON'T prefill savedAddress
  // because the user might have typed an exploratory / invalid string
  // last time (or it's stale enough that they'd rather retype). The
  // placeholder shows a realistic example.
  const [addr, setAddr] = useStateV('');
  const { t } = useI18n();
  const hasDraft = savedSession && (
    Object.keys(savedSession.decisions || {}).length > 0 ||
    (savedSession.issues || []).length > 0
  );

  function submit() {
    if (!addr.trim()) return;
    onSubmit(addr.trim());
  }

  return (
    <>
      <AppNav />
      <main id="main-content">
      <section className="hp-hero">
        <div>
          <div className="eyebrow"><span className="star">★</span> November 3, 2026 · America's 250th election</div>
          <h1>Hold Congress to its <em>record.</em></h1>
          <p className="lede">All 435 House seats and 34 Senate seats are on the ballot. Before you vote, see how your incumbents actually voted — and who paid for the campaign.</p>

          <div className="addr-card">
            <label><span>Your registered address</span> <span className="privacy">Stays on this device</span></label>
            <div className="row">
              <input
                type="text"
                placeholder="1600 Pennsylvania Ave NW, Washington DC 20500"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              />
              <button className="go" onClick={submit} disabled={!addr.trim()}>Pull my ballot →</button>
            </div>
            <div className="hint">
              <span><span className="dot"></span>No account</span>
              <span><span className="dot"></span>No tracking</span>
              <span><span className="dot"></span>Civic API · address never stored</span>
            </div>
            <div className="resume">
              Been here before?{' '}
              <a onClick={onResumeFromProfile} style={{ cursor: 'pointer' }} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onResumeFromProfile(); }}>
                Drop your saved .txt profile →
              </a>
            </div>
          </div>

          {hasDraft && (
            <ResumeNudge
              saved={savedSession}
              totalRaces={RACES.length}
              onResume={onResumeSession}
              onStartOver={onStartOver}
            />
          )}
        </div>

        <div className="stat-stack">
          <div className="stat">
            <div className="v">6<small>hrs / day</small></div>
            <div className="l">average time a member of Congress spends fundraising, per training materials shown to incoming freshmen.</div>
            <div className="cite">Source · Issue One, 2024 · CBS 60 Minutes</div>
          </div>
          <div className="stat alt">
            <div className="v">94<small>%</small></div>
            <div className="l">of House incumbents who ran for re-election in 2024 won. Without a record check, every November is a coin flip.</div>
            <div className="cite">Source · OpenSecrets · FEC filings</div>
          </div>
        </div>
      </section>

      <HowItWorksWalkthrough />
      </main>

      <footer className="hp-foot">
        <div className="l">Voter Choice</div>
        <ul>
          <li><a onClick={() => onNavigate && onNavigate('methodology')} role="link" tabIndex={0}>Methodology</a></li>
          <li><a onClick={() => onNavigate && onNavigate('about')} role="link" tabIndex={0}>About</a></li>
          <li><a onClick={() => onNavigate && onNavigate('privacy')} role="link" tabIndex={0}>Privacy</a></li>
          <li><a onClick={() => onNavigate && onNavigate('tip')} role="link" tabIndex={0}>Tip jar</a></li>
          <li><a href="mailto:muxin.li.pro@gmail.com">Support</a></li>
        </ul>
        <div>© 2026 · Gray Bird LLC</div>
      </footer>
    </>
  );
}

/* ============ LoadingView ============ */
function LoadingView({ address, onDone }) {
  const [step, setStep] = useStateV(0);
  const steps = [
    'Geocoding address',
    'Looking up your precinct',
    'Pulling federal & state races',
    'Loading donor history',
  ];

  useEffectV(() => {
    if (step >= steps.length) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 600);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <>
      <AppNav />
      <div className="loading-screen">
        <div className="loading-card">
          <div className="pulse"></div>
          <h2>Pulling your ballot.</h2>
          <div className="addr">{address}</div>
          <ul>
            {steps.map((s, i) => (
              <li key={i} className={i < step ? 'done' : (i === step ? 'active' : '')}>
                <span className="ck"></span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/* ============ ColdOpenView ============
   Maps to: src/components/ColdOpenInput.tsx + ConcernInterpretation.tsx

   onLock receives an array of ConcernInterpretationEntry-shaped
   objects (with the design-delta `quotes` field). */
function ColdOpenView({ address, onLock, savedIssues }) {
  const [phase, setPhase] = useStateV(savedIssues && savedIssues.length ? 'review' : 'prompt');
  const [draft, setDraft] = useStateV('');
  const [submittedText, setSubmittedText] = useStateV('');
  const [issues, setIssues] = useStateV(savedIssues || []);
  const [thinking, setThinking] = useStateV(false);

  function fillSample() { setDraft(SAMPLE_LONGFORM); }

  function send() {
    if (!draft.trim()) return;
    setSubmittedText(draft.trim());
    setThinking(true);
    setPhase('thinking');
    setTimeout(() => {
      setIssues(PRESET_ISSUES.map(t => ({ ...t })));
      setThinking(false);
      setPhase('review');
    }, 1200);
  }

  function moveIssue(idx, dir) {
    const next = [...issues];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    // re-rank (1-based)
    next.forEach((it, i) => { it.rank = i + 1; });
    setIssues(next);
  }

  /* Move a row from `from` to `to` — used by the drag handle.
     Unlike moveIssue() which swaps adjacent rows, this splices so
     a single long drag can travel multiple slots in one motion. */
  function reorderIssue(from, to) {
    if (from === to) return;
    const next = [...issues];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    next.forEach((it, i) => { it.rank = i + 1; });
    setIssues(next);
  }

  function rename(idx, interpretation) {
    const next = [...issues];
    next[idx] = { ...next[idx], interpretation };
    setIssues(next);
  }

  function remove(idx) {
    const next = issues.filter((_, i) => i !== idx);
    next.forEach((it, i) => { it.rank = i + 1; });
    setIssues(next);
  }

  function startOver() {
    setPhase('prompt');
    setDraft(submittedText);
    setSubmittedText('');
    setIssues([]);
  }

  function lockIn() {
    if (issues.length === 0) return;
    onLock(issues);
  }

  return (
    <>
      <AppNav />
      <div className="coldopen">
        <div className="co-context"><b>{address}</b> · Harris County, TX‑7 · 5 races on your ballot</div>

        <div className="msg ai">
          <div className="who">Voter Choice · AI</div>
          <div className="bubble">
            <p>I've pulled your sample ballot. Before I walk you through races, I want to know what <i>you're</i> judging candidates on — in your words, not from a pre-built list.</p>
            <p style={{ marginTop: '10px' }}><b>What's been on your mind this year?</b> Things you wish Congress would actually do something about. Frustrations, hopes, fights you've watched in your community. Type as much or as little as you want.</p>
          </div>
        </div>

        {phase === 'prompt' && (
          <>
            <div className="co-input">
              <textarea
                placeholder="Things that have been on your mind. Frustrations, hopes, fights you've watched in your community…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="row">
                <span className="hint">Auto-saving to your device · nothing leaves your browser yet</span>
                <button className="send" onClick={send} disabled={!draft.trim()}>Send →</button>
              </div>
            </div>
            <div className="starter-chips" style={{ marginTop: '12px', marginLeft: '4px' }}>
              <button className="sc" onClick={fillSample}>Not sure where to start — show me an example</button>
              <button className="sc">Use a starter profile</button>
            </div>
          </>
        )}

        {(phase === 'thinking' || phase === 'review') && (
          <>
            <div className="msg user">
              <div className="who">You</div>
              <div className="bubble">{submittedText}</div>
            </div>

            <div className="msg ai">
              <div className="who">Voter Choice · AI</div>
              <div className="bubble">
                {thinking ? (
                  <p style={{ color: 'var(--ink-2)', fontStyle: 'italic' }}>Reading what you wrote — pulling out the issues I hear…</p>
                ) : (
                  <p>Got it. Here's what I heard — <b>{issues.length} issue{issues.length !== 1 ? 's' : ''}</b>, each anchored in the words you actually used. Re-rank, rename, or remove. Once you lock these in, every candidate's record gets scored against this list, vote by vote.</p>
                )}
              </div>
            </div>

            {phase === 'review' && (
              <div className="themes-card">
                <div className="th-head">
                  <h4>What you actually said.</h4>
                  <span className="of">{issues.length} issues · inferred</span>
                </div>
                <p className="th-sub">Use the arrows to re-rank · click a name to rename · I show my work so you can correct me.</p>

                {issues.map((iss, i) => (
                  <IssueRow
                    key={iss.canonicalIssue || iss.sourceText || i}
                    issue={iss}
                    index={i}
                    total={issues.length}
                    onMoveUp={() => moveIssue(i, -1)}
                    onMoveDown={() => moveIssue(i, 1)}
                    onReorderTo={reorderIssue}
                    onRename={(name) => rename(i, name)}
                    onRemove={() => remove(i)}
                  />
                ))}

                <div className="th-foot">
                  <button className="secondary" onClick={startOver}>← Let me rewrite my message</button>
                  <button className="lock" onClick={lockIn} disabled={issues.length === 0}>Lock these in &amp; start the ballot →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ============ WorkspaceView ============
   Maps to: src/components/ResearchLayout.tsx (the 3-pane shell)
            src/components/BallotToolClient.tsx (state owner)
            src/components/ChatPanel.tsx (center column)
            src/components/BallotPane.tsx (right column)

   This view orchestrates the 3-pane layout and pulls
   structured-block-shaped data from helpers in prototype-data.jsx
   to feed CandidateCard. */
function WorkspaceView({ address, issues, decisions, activeRaceId, onDecide, onUnpick, onSelectRace, onPrint, onEditIssues, onSaveProfile, onContinueElsewhere, budgetExhausted, onOpenByok, onNavigate, chatMessages, onSendChat, chatTimeouts, onRetryChat, onCompare, onSeeAllVotes, amendDeltas, onClearDelta, onViewPartyGate, blindMode, revealedCandidates, onRevealCandidate, onHideCandidate, onToggleBlindMode }) {
  const races = RACES;
  const activeRace = races.find(r => r.id === activeRaceId) || races[0];
  const activeIdx = races.findIndex(r => r.id === activeRace.id);
  const decision = decisions[activeRace.id];

  const [mobileChatOpen, setMobileChatOpen] = useStateV(() => {
    if (typeof window !== 'undefined' && window.__autoOpenChat) {
      window.__autoOpenChat = false;
      return true;
    }
    return false;
  });

  useEffectV(() => { setMobileChatOpen(false); }, [activeRace.id]);

  function selectAndOpenChat(raceId) {
    onSelectRace(raceId);
    setTimeout(() => setMobileChatOpen(true), 0);
  }

  const decidedCount = Object.keys(decisions).length;
  const progressPct = Math.round((decidedCount / races.length) * 100);

  const sections = {};
  races.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r);
  });

  function commitPick(candidate, why) {
    onDecide(activeRace.id, {
      pick: candidate.name,
      party: getCandidateParty(activeRace.id, candidate.name)?.code || null,
      why: why.trim(),
      candidateName: candidate.name,
    });
    setMobileChatOpen(false);
    setTimeout(() => {
      const nextIdx = races.findIndex((r, i) => i > activeIdx && !decisions[r.id] && r.id !== activeRace.id);
      if (nextIdx >= 0) onSelectRace(races[nextIdx].id);
    }, 600);
  }

  function voteProp(value) {
    onDecide(activeRace.id, { pick: value, party: null, why: '', candidateName: null });
    setMobileChatOpen(false);
    setTimeout(() => {
      const nextIdx = races.findIndex((r, i) => i > activeIdx && !decisions[r.id] && r.id !== activeRace.id);
      if (nextIdx >= 0) onSelectRace(races[nextIdx].id);
    }, 600);
  }

  function skipRace() {
    const nextIdx = (activeIdx + 1) % races.length;
    onSelectRace(races[nextIdx].id);
  }

  // Determine race type: empty candidates => proposition
  const isProposition = !activeRace.candidates || activeRace.candidates.length === 0;

  // Local state for the chat input field
  const [chatInput, setChatInput] = useStateV('');
  function handleSend() {
    const t = chatInput.trim();
    if (!t) return;
    onSendChat(activeRace.id, t);
    setChatInput('');
  }

  // For choice races, pull rich candidate data via helpers
  const racePatterns  = getRacePatternsForRace(activeRace.id);
  const alignmentBlk  = getAlignmentScoresForRace(activeRace.id);
  const richCandidates = racePatterns?.candidates || [];

  const showResumeBar = !decision && activeRace;

  return (
    <div className="ws-shell">
      <AppNav />
      <PollingStatusBar
        pollingInfo={POLLING_INFO}
        stateData={STATE_ELECTION_DATA}
        rows={getDeadlineRows()}
      />
      <div className="ws-wrap" data-mobile-chat={mobileChatOpen ? 'open' : 'closed'}>

        {/* LEFT RAIL */}
        <aside className="ws-rail">
          <div className="progress">
            <div className="top"><span>Progress</span><span>{decidedCount} / {races.length}</span></div>
            <div className="big">{progressPct}% decided</div>
            <div className="bar"><div className="fill" style={{ width: progressPct + '%' }}></div></div>
          </div>

          <div className="priorities">
            <div className="top">
              <span className="lab">Your issues</span>
              <button className="edit" onClick={onEditIssues}>EDIT</button>
            </div>
            <ol>
              {issues.map(iss => <li key={iss.canonicalIssue}>{iss.interpretation}</li>)}
            </ol>
          </div>

          {Object.entries(sections).map(([section, rs]) => (
            <div key={section}>
              <div className="seclabel">{section}</div>
              <ul className="race-list">
                {rs.map(r => {
                  const isActive = r.id === activeRace.id;
                  const isDone = !!decisions[r.id];
                  return (
                    <li
                      key={r.id}
                      className={(isDone ? 'done ' : '') + (isActive ? 'active' : '')}
                      onClick={() => onSelectRace(r.id)}
                    >
                      <span className="ind"></span>
                      <span>{r.label.replace(/^U\.S\.\s+/, '')}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {Object.entries(sections).map(([section, rs]) => (
            <div key={section}>
              <div className="seclabel">{section}</div>
              <ul className="race-list">
                {rs.map(r => {
                  const isActive = r.id === activeRace.id;
                  const isDone = !!decisions[r.id];
                  return (
                    <li
                      key={r.id}
                      className={(isDone ? 'done ' : '') + (isActive ? 'active' : '')}
                      onClick={() => onSelectRace(r.id)}
                    >
                      <span className="ind"></span>
                      <span>{r.label.replace(/^U\.S\.\s+/, '')}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="foot">
            <a onClick={() => { if (confirm('Restart session? This clears your draft ballot and issues.')) window.__voterChoiceReset && window.__voterChoiceReset(); }} role="link" tabIndex={0}>Restart session</a>
            <a onClick={() => { const nav = window.__navigate; nav && nav('methodology'); }} role="link" tabIndex={0}>Methodology</a>
            <a onClick={onViewPartyGate} style={{ cursor: 'pointer' }} role="link" tabIndex={0}>See party-gate (TX primary)</a>
          </div>
        </aside>

        {/* CHAT CENTER */}
        <section className="ws-chat">
          <header className="head">
            <button
              className="ws-mobile-back ws-mobile-back-hide-desktop"
              onClick={() => setMobileChatOpen(false)}
              aria-label="Back to ballot"
            >←</button>
            <div className="title">
              <small>Race {activeIdx + 1} of {races.length}</small>
              {activeRace.label}
            </div>
            <div className="h-act">
              {!isProposition && (
                <button
                  className={"blind-toggle " + (blindMode ? 'on' : 'off')}
                  onClick={onToggleBlindMode}
                  title={blindMode ? 'Show candidate names' : 'Hide candidate names'}
                >
                  <svg className="blind-toggle-ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {blindMode ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M1 1l22 22" />
                      </>
                    ) : (
                      <>
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                  <span className="lab">{blindMode ? 'Blind' : 'Names'}</span>
                </button>
              )}
              <button onClick={skipRace}>Skip</button>
              {!isProposition && <button onClick={onCompare}>Compare</button>}
            </div>
          </header>

          <div className="body">
            {!isProposition && richCandidates.map((cand, idx) => {
              const alignmentEntry = alignmentBlk?.entries?.find(e => e.candidateId === cand.id);
              const party = getCandidateParty(activeRace.id, cand.name);
              const isPicked = decision?.candidateName === cand.name;
              const isBlind = blindMode && !revealedCandidates?.has(cand.id);
              const alias = String.fromCharCode(65 + idx); // A, B, C

              // Compute peer totals so each FunderBars can show how much more
              // or less this candidate raised vs the others in the race.
              const peerTotals = richCandidates.map((c, i) => {
                const peerBlind = blindMode && !revealedCandidates?.has(c.id);
                return {
                  id: c.id,
                  total: c.totalRaised || 0,
                  fundingMix: c.fundingMix || null,
                  aliasOrName: peerBlind ? `Candidate ${String.fromCharCode(65 + i)}` : c.name.split(' ').pop(),
                };
              });

              return (
                <div className="msg ai" key={cand.id}>
                  <div className="who">Voter Choice · AI</div>
                  <div className="bubble">
                    {idx === 0 ? (
                      isBlind
                        ? <p>Two candidates for <b>{activeRace.label}</b>. I'm hiding their names so you decide on the record, not the brand. Here's <b>Candidate {alias}</b>:</p>
                        : <p>This is <b>{activeRace.label}</b>. Two on your ballot. Here's the {cand.incumbent ? 'incumbent' : 'longer-tenure candidate'} — each percentage is clickable to see the votes behind it.</p>
                    ) : (
                      isBlind
                        ? <p>And <b>Candidate {alias}</b>:</p>
                        : <p>And the {cand.incumbent ? 'incumbent' : (alignmentEntry?.scores === null ? 'challenger — no legislative record yet' : 'challenger')}:</p>
                    )}
                    <CandidateCard
                      candidate={cand}
                      alignmentEntry={alignmentEntry}
                      userIssues={issues}
                      party={party}
                      picked={isPicked}
                      onPick={() => commitPick(cand, isBlind
                          ? `Candidate ${alias} — strongest record on ${issues[0]?.interpretation || 'my top issue'}.`
                          : `${cand.name.split(' ').pop()} — ${cand.incumbent ? 'stronger record on ' + (issues[0]?.interpretation || 'my top issue') : 'first-time candidate, judging on donor base'}.`
                      )}
                      onUnpick={() => onUnpick(activeRace.id)}
                      onSeeAllVotes={() => onSeeAllVotes({ candidate: cand, alignmentEntry, blindMode: isBlind, alias })}
                      blindMode={isBlind}
                      globalBlindMode={blindMode}
                      isRevealed={blindMode && !isBlind}
                      alias={`Candidate ${alias}`}
                      onReveal={() => onRevealCandidate(cand.id)}
                      onHide={() => onHideCandidate(cand.id)}
                      peerTotals={peerTotals}
                    />
                  </div>
                </div>
              );
            })}

            {isProposition && (
              <div className="msg ai">
                <div className="who">Voter Choice · AI</div>
                <div className="bubble">
                  <p>This is <b>{activeRace.label}</b>, a ballot proposition. Here's what's at stake:</p>
                  <PropositionCard
                    race={activeRace}
                    decision={decision?.pick}
                    onVote={(v) => voteProp(v)}
                    onUnvote={() => onUnpick(activeRace.id)}
                  />
                </div>
              </div>
            )}

            {/* Pass-B: appended user/AI chat messages */}
            {(chatMessages?.[activeRace.id] || []).map((msg, i) => (
              <div key={'cm-' + i} className={'msg ' + msg.who}>
                <div className="who">{msg.who === 'user' ? 'You' : 'Voter Choice · AI'}</div>
                <div className="bubble">{msg.text}</div>
              </div>
            ))}

            {/* Pass-C: AI timeout / error inline */}
            {chatTimeouts && chatTimeouts[activeRace.id] && (
              <AITimeoutBanner
                onRetry={() => onRetryChat && onRetryChat(activeRace.id)}
                onHandoff={onContinueElsewhere}
              />
            )}

            {/* Pass-B: amend delta + rescore offer (shows once after Apply) */}
            {amendDeltas && amendDeltas.length > 0 && (
              <>
                <AmendDeltaMessage
                  deltas={amendDeltas}
                  onRevisit={(rid) => { onSelectRace(rid); onClearDelta(); }}
                />
                <AmendRescoreOffer
                  revisitCount={amendDeltas.filter(d => d.significant).length}
                  onWalkthrough={() => {
                    const first = amendDeltas.find(d => d.significant);
                    if (first) onSelectRace(first.raceId);
                    onClearDelta();
                  }}
                  onDismiss={onClearDelta}
                />
              </>
            )}

            {decision && (
              <div className="msg ai">
                <div className="who">Voter Choice · AI</div>
                <div className="bubble">
                  <p>Logged: <b>{decision.pick}{decision.party ? ` (${decision.party})` : ''}</b> for {activeRace.label}.</p>
                  {decision.why && <p style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>"{decision.why}"</p>}
                  <p style={{ marginTop: '8px', fontSize: '13.5px', color: 'var(--ink-2)' }}>You can edit the note in the ballot pane any time. Or jump to a different race.</p>
                </div>
              </div>
            )}
          </div>

          <div className="ws-input">
            <div className="chips">
              <button className="chip">Show me {(() => {
                const firstC = richCandidates[0];
                if (!firstC) return 'the incumbent';
                const isFirstBlind = blindMode && !revealedCandidates?.has(firstC.id);
                if (isFirstBlind) return 'Candidate A';
                return firstC.name?.split(' ').pop() || 'the incumbent';
              })()}'s key votes</button>
              <button className="chip">Compare donor bases</button>
              <button className="chip" onClick={skipRace}>Skip — I've decided</button>
            </div>
            <div className="input-row">
              <input
                type="text"
                placeholder={`Ask anything about ${activeRace.label}…`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              />
              <button className="send" onClick={handleSend} disabled={!chatInput.trim()}>Send</button>
            </div>
            <div className="meta">
              <span>Auto-saving to your device · nothing leaves your browser</span>
              <span>Race {activeIdx + 1} / {races.length}</span>
            </div>
          </div>
        </section>

        {/* RIGHT BALLOT PANE — primary on mobile */}
        <aside className="ws-ballot">
          {showResumeBar && (
            <div className="ws-mobile-resume" style={{ display: 'none' }} data-show-on-mobile>
              <div className="l">
                <div className="lab">Currently deciding</div>
                <div className="name">{activeRace.label}</div>
              </div>
              <button className="resume" onClick={() => setMobileChatOpen(true)}>Resume <span>→</span></button>
            </div>
          )}
          <style dangerouslySetInnerHTML={{ __html: `
            @media (max-width: 767px) { [data-show-on-mobile] { display: flex !important; } }
          `}} />

          <BallotPaneInner
            races={races}
            decisions={decisions}
            activeRaceId={activeRace.id}
            address={address}
            issues={issues}
            onEditIssues={onEditIssues}
            onSelectRace={selectAndOpenChat}
            onPrint={onPrint}
            onSaveProfile={onSaveProfile}
            onContinueElsewhere={onContinueElsewhere}
            budgetExhausted={budgetExhausted}
            onOpenByok={onOpenByok}
            onNavigate={onNavigate}
          />
        </aside>
      </div>
    </div>
  );
}

/* Inner content for the ballot pane.
   Identical to BallotPane in prototype-components.jsx minus the
   outer <aside>; lets the workspace wrap the Resume bar around it
   for mobile.

   Maps to: src/components/BallotPane.tsx */
function BallotPaneInner({ races, decisions, activeRaceId, address, issues, onEditIssues, onSelectRace, onPrint, onSaveProfile, onContinueElsewhere, budgetExhausted, onOpenByok, onNavigate }) {
  const decidedCount = Object.keys(decisions).length;
  const totalCount = races.length;
  const canPrint = decidedCount > 0;

  const sections = {};
  races.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r);
  });

  return (
    <>
      <div className="b-head">
        <div className="row">
          <h3>Your ballot</h3>
          <span className="sub">{decidedCount}/{totalCount} · Draft</span>
        </div>
        <address>{address || '—'} · Precinct {POLLING_INFO.precinct}</address>
      </div>

      {/* Mobile/tablet edit-issues entry — the left rail (which holds
          "Your issues · EDIT" on desktop) is hidden below 1024px, so
          surface the same affordance here. Hidden on desktop via CSS. */}
      {onEditIssues && issues && issues.length > 0 && (
        <div className="b-issues-edit">
          <div className="b-issues-head">
            <span className="b-issues-lab">Your issues</span>
            <button className="b-issues-btn" onClick={onEditIssues}>Edit ranking →</button>
          </div>
          <ol className="b-issues-list">
            {issues.map((iss, i) => (
              <li key={i}><span className="n">{i + 1}</span>{iss.interpretation}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="b-list">
        {Object.entries(sections).map(([section, rs]) => (
          <div key={section}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', padding: '14px 0 4px' }}>{section}</div>
            {rs.map(r => {
              const d = decisions[r.id];
              const isActive = r.id === activeRaceId;
              const isDone = !!d;
              return (
                <div
                  key={r.id}
                  className={"b-row " + (isDone ? "done " : "pending ") + (isActive ? "active " : "")}
                  onClick={() => onSelectRace(r.id)}
                >
                  <div className="ck" />
                  <div>
                    <div className="race">{r.label}</div>
                    <div className="pick">{isDone ? (d.pick + (d.party ? ' (' + d.party + ')' : '')) : (isActive ? 'Deciding now…' : 'Not yet decided')}</div>
                    {d && d.why && <div className="why">"{d.why}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {budgetExhausted ? (
        <BudgetExhaustedFoot
          canPrint={canPrint}
          onPrint={onPrint}
          onSaveProfile={onSaveProfile}
          onContinueElsewhere={onContinueElsewhere}
          onOpenByok={onOpenByok}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="b-foot">
          <button className="primary" disabled={!canPrint} onClick={onPrint}>
            <span>Print my ballot (PDF)</span><span className="arrow">→</span>
          </button>
          <button onClick={onSaveProfile}>
            <span>Save my voting plan (.txt)</span><span className="arrow">↓</span>
          </button>
          <small className="b-foot-note">Your issues and picks — no personal info collected.</small>
          <button onClick={onContinueElsewhere}>
            <span>Continue in another chatbot</span><span className="arrow">↗</span>
          </button>
        </div>
      )}
    </>
  );
}

/* ============ BudgetExhaustedFoot ============
   Replaces the normal ballot-pane footer when the community AI
   budget runs out. The complaint about the live app: it claims
   "next steps in right panel" but it's not obvious what to do.
   This makes the two ways to keep going (BYOK / handoff) the
   visually dominant actions, with print/save below and tip-jar
   as a quiet line.

   Repo target: a `budgetExhausted` branch inside BallotPane.tsx's
   footer, driven by the same budget-state signal that opens
   BudgetExhausted.tsx. */
function BudgetExhaustedFoot({ canPrint, onPrint, onSaveProfile, onContinueElsewhere, onOpenByok, onNavigate }) {
  return (
    <div className="b-foot exhausted">
      <div className="bx-banner">
        <span className="bx-banner-dot" aria-hidden="true"></span>
        <div>
          <div className="bx-banner-ttl">Community AI budget used up</div>
          <div className="bx-banner-sub">Your draft is safe. Two ways to keep going:</div>
        </div>
      </div>

      <button className="bx-cta primary" onClick={onOpenByok}>
        <span className="bx-cta-ico" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </span>
        <span className="bx-cta-lab">
          <span className="bx-cta-main">Use your own API key</span>
          <span className="bx-cta-sub">Keep chatting here · key stays on device</span>
        </span>
        <span className="arrow">→</span>
      </button>

      <button className="bx-cta" onClick={onContinueElsewhere}>
        <span className="bx-cta-ico" aria-hidden="true">↗</span>
        <span className="bx-cta-lab">
          <span className="bx-cta-main">Continue in another chatbot</span>
          <span className="bx-cta-sub">Copy your research into Claude, ChatGPT, Gemini…</span>
        </span>
        <span className="arrow">→</span>
      </button>

      <div className="bx-secondary">
        <button disabled={!canPrint} onClick={onPrint}>Print ballot →</button>
        <button onClick={onSaveProfile}>Save .txt ↓</button>
      </div>

      <p className="bx-tip">
        Voter Choice is free. A tip keeps the budget alive for the next voter —{' '}
        <a onClick={() => onNavigate && onNavigate('tip')} role="link" tabIndex={0}>tip jar</a> · not required.
      </p>
    </div>
  );
}

/* ============ PrintView ============
   Maps to: src/components/PrintBallot.tsx (Phase 7 in brief) */
function PrintView({ address, issues, decisions, onBack }) {
  const races = RACES;
  const sections = {};
  races.forEach(r => {
    if (!decisions[r.id]) return;
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push({ race: r, decision: decisions[r.id] });
  });

  const undecided = races.filter(r => !decisions[r.id]);

  return (
    <>
      <AppNav onBrandClick={onBack} />
      <div className="print-wrap">
        <div className="print-header">
          <h2>Your printable ballot</h2>
          <div className="actions">
            <button onClick={onBack}>← Back to ballot</button>
            <button className="primary" onClick={() => window.print()}>Print / save as PDF</button>
          </div>
        </div>

        <div className="print-sheet">
          <header className="ph-head">
            <div className="l">
              My Ballot · {POLLING_INFO.electionDate}
              <small>Voter Choice · voterchoice.app</small>
            </div>
            <div className="r">
              <b>Precinct {POLLING_INFO.precinct}</b>
              {POLLING_INFO.name}<br />
              {POLLING_INFO.address}<br />
              Polls {POLLING_INFO.hours}
            </div>
          </header>

          <div className="voter-meta">
            <div className="cell"><div className="k">Address</div><div className="v" style={{ fontSize: '12px' }}>{address}</div></div>
            <div className="cell"><div className="k">District</div><div className="v">U.S. House TX‑7</div></div>
            <div className="cell cell-bring">
              <div className="k">Bring (any one)</div>
              <ul className="v print-id-list">
                {STATE_ELECTION_DATA.votingRules.acceptedIds.map(id => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </div>
            <div className="cell"><div className="k">Early voting</div><div className="v">{new Date(STATE_ELECTION_DATA.earlyVoting.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(STATE_ELECTION_DATA.earlyVoting.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>
          </div>

          <div className="ballot-list">
            {Object.entries(sections).map(([section, items]) => (
              <div className="ballot-group" key={section}>
                <div className="gtitle">{section}</div>
                {items.map(({ race, decision }) => (
                  <div className="br checked" key={race.id}>
                    <div className="bx"></div>
                    <div>
                      <div className="race-name">{race.label}</div>
                      <div className="pick-name">
                        {decision.pick}
                        {decision.party && <span className="party">{decision.party === 'D' ? 'DEM' : decision.party === 'R' ? 'REP' : decision.party}</span>}
                      </div>
                      {decision.why && <div className="my-note">"{decision.why}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {undecided.length > 0 && (
              <div className="ballot-group">
                <div className="gtitle" style={{ color: 'var(--ink-3)' }}>Decide at the polls</div>
                {undecided.map(race => (
                  <div className="br" key={race.id}>
                    <div className="bx"></div>
                    <div>
                      <div className="race-name">{race.label}</div>
                      <div className="pick-name" style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontWeight: 400 }}>
                        Decide at the polls
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ballot-group" style={{ marginBottom: 0 }}>
              <div className="gtitle">Issues you voted on</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {issues.map((iss, i) => (
                  <div key={iss.canonicalIssue}>{i + 1}. {iss.interpretation}</div>
                ))}
              </div>
            </div>
          </div>

          <footer className="print-foot">
            <div className="l">
              <b>Built with Voter Choice</b>
              Free · non-partisan · voterchoice.app
            </div>
          </footer>
          <div className="print-serial">
            <span>Generated {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span>Ref · VC-{Math.random().toString(36).slice(2, 8).toUpperCase()}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, {
  HomeView, LoadingView, ColdOpenView, WorkspaceView, PrintView,
});
