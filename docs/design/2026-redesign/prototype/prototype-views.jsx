/* ====================================================
   VOTER CHOICE · views
   Top-level screens: Home, Loading, ColdOpen, Workspace, Print
   ==================================================== */

const { useState: useStateV, useEffect: useEffectV, useRef: useRefV } = React;

/* ============ HOME ============ */
function HomeView({ savedAddress, onSubmit }) {
  const [addr, setAddr] = useStateV(savedAddress || '');

  function submit() {
    if (!addr.trim()) return;
    onSubmit(addr.trim());
  }

  return (
    <>
      <AppNav />
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
            <div className="resume">Been here before? <a>Drop your saved .txt profile →</a></div>
          </div>
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

      <footer className="hp-foot">
        <div className="l">Voter Choice</div>
        <ul>
          <li><a>Ballot data</a></li>
          <li><a>Methodology</a></li>
          <li><a>Privacy</a></li>
          <li><a>Support</a></li>
        </ul>
        <div>© 2026 · Gray Bird LLC</div>
      </footer>
    </>
  );
}

/* ============ LOADING ============ */
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

/* ============ COLD OPEN ============ */
function ColdOpenView({ address, onLock, savedThemes }) {
  const [phase, setPhase] = useStateV(savedThemes && savedThemes.length ? 'review' : 'prompt');
  const [draft, setDraft] = useStateV('');
  const [submittedText, setSubmittedText] = useStateV('');
  const [themes, setThemes] = useStateV(savedThemes || []);
  const [thinking, setThinking] = useStateV(false);

  function fillSample() {
    setDraft(SAMPLE_LONGFORM);
  }

  function send() {
    if (!draft.trim()) return;
    setSubmittedText(draft.trim());
    setThinking(true);
    setPhase('thinking');
    setTimeout(() => {
      setThemes(PRESET_THEMES.map(t => ({ ...t })));
      setThinking(false);
      setPhase('review');
    }, 1200);
  }

  function moveTheme(idx, dir) {
    const next = [...themes];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setThemes(next);
  }

  function rename(idx, name) {
    const next = [...themes];
    next[idx] = { ...next[idx], name };
    setThemes(next);
  }

  function remove(idx) {
    setThemes(themes.filter((_, i) => i !== idx));
  }

  function startOver() {
    setPhase('prompt');
    setDraft(submittedText);
    setSubmittedText('');
    setThemes([]);
  }

  function lockIn() {
    if (themes.length === 0) return;
    onLock(themes);
  }

  return (
    <>
      <AppNav />
      <div className="coldopen">
        <div className="co-context"><b>{address}</b> · Harris County, TX‑7 · 14 races on your ballot</div>

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
                  <p style={{ color: 'var(--ink-2)', fontStyle: 'italic' }}>Reading what you wrote — pulling out the themes I hear…</p>
                ) : (
                  <p>Got it. Here's what I heard — <b>{themes.length} theme{themes.length !== 1 ? 's' : ''}</b>, each anchored in the words you actually used. Re-rank, rename, or remove. Once you lock these in, every candidate's record gets scored against this list.</p>
                )}
              </div>
            </div>

            {phase === 'review' && (
              <div className="themes-card">
                <div className="th-head">
                  <h4>What you actually said.</h4>
                  <span className="of">{themes.length} themes · inferred</span>
                </div>
                <p className="th-sub">Use the arrows to re-rank · click a name to rename · I show my work so you can correct me.</p>

                {themes.map((t, i) => (
                  <ThemeRow
                    key={t.id}
                    theme={t}
                    index={i}
                    total={themes.length}
                    onMoveUp={() => moveTheme(i, -1)}
                    onMoveDown={() => moveTheme(i, 1)}
                    onRename={(name) => rename(i, name)}
                    onRemove={() => remove(i)}
                  />
                ))}

                <div className="th-foot">
                  <button className="secondary" onClick={startOver}>← Let me rewrite my message</button>
                  <button className="lock" onClick={lockIn} disabled={themes.length === 0}>Lock these in &amp; start the ballot →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ============ WORKSPACE ============ */
function WorkspaceView({ address, themes, decisions, activeRaceId, onDecide, onUnpick, onSelectRace, onPrint, onEditThemes }) {
  const races = RACES;
  const activeRace = races.find(r => r.id === activeRaceId) || races[0];
  const activeIdx = races.findIndex(r => r.id === activeRace.id);
  const decision = decisions[activeRace.id];

  const [whyDraft, setWhyDraft] = useStateV(decision?.why || '');
  const [showWhyFor, setShowWhyFor] = useStateV(null);

  // reset why-draft when active race changes
  useEffectV(() => {
    setWhyDraft(decisions[activeRace.id]?.why || '');
    setShowWhyFor(null);
  }, [activeRace.id]);

  const decidedCount = Object.keys(decisions).length;
  const progressPct = Math.round((decidedCount / races.length) * 100);

  // sections for left rail
  const sections = {};
  races.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r);
  });

  function pickCandidate(candidate) {
    setShowWhyFor(candidate.name);
    setWhyDraft('');
  }

  function commitPick(candidate, why) {
    onDecide(activeRace.id, {
      pick: candidate.name,
      party: candidate.partyCode,
      why: why.trim(),
      candidateName: candidate.name,
    });
    setShowWhyFor(null);
    // auto-advance to next undecided race
    setTimeout(() => {
      const nextIdx = races.findIndex((r, i) => i > activeIdx && !decisions[r.id] && r.id !== activeRace.id);
      if (nextIdx >= 0) onSelectRace(races[nextIdx].id);
    }, 600);
  }

  function voteProp(value) {
    setShowWhyFor('__prop__');
    // jump directly to a why prompt for props
    onDecide(activeRace.id, {
      pick: value,
      party: null,
      why: '',
      candidateName: null,
    });
    setShowWhyFor(null);
    setTimeout(() => {
      const nextIdx = races.findIndex((r, i) => i > activeIdx && !decisions[r.id] && r.id !== activeRace.id);
      if (nextIdx >= 0) onSelectRace(races[nextIdx].id);
    }, 600);
  }

  function skipRace() {
    const nextIdx = (activeIdx + 1) % races.length;
    onSelectRace(races[nextIdx].id);
  }

  // build AI text for current race
  const incumbent = activeRace.candidates?.find(c => c.incumbent);
  const challenger = activeRace.candidates?.find(c => !c.incumbent);

  return (
    <>
      <AppNav />
      <div className="ws-wrap">
        {/* LEFT RAIL */}
        <aside className="ws-rail">
          <div className="progress">
            <div className="top"><span>Progress</span><span>{decidedCount} / {races.length}</span></div>
            <div className="big">{progressPct}% decided</div>
            <div className="bar"><div className="fill" style={{ width: progressPct + '%' }}></div></div>
          </div>

          <div className="priorities">
            <div className="top">
              <span className="lab">Your priorities</span>
              <button className="edit" onClick={onEditThemes}>EDIT</button>
            </div>
            <ol>
              {themes.map(t => <li key={t.id}>{t.name}</li>)}
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
                      <span>{r.label.replace(/^[^·]+·\s*/, '')}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="foot">
            <a>Restart session</a>
            <a>Methodology</a>
            <a>Get help</a>
          </div>
        </aside>

        {/* CHAT CENTER */}
        <section className="ws-chat">
          <header className="head">
            <div className="title">
              <small>Race {activeIdx + 1} of {races.length}</small>
              {activeRace.label}
            </div>
            <div className="h-act">
              <button onClick={skipRace}>Skip</button>
              {activeRace.type === 'choice' && <button>Compare both</button>}
            </div>
          </header>

          <div className="body">
            <div className="msg ai">
              <div className="who">Voter Choice · AI</div>
              <div className="bubble">
                {activeRace.type === 'choice' ? (
                  <>
                    <p>This is <b>{activeRace.label}</b>. Two candidates on your ballot — <b>{incumbent?.name}</b> ({incumbent?.party}) and <b>{challenger?.name}</b> ({challenger?.party}). Here's how the incumbent's record scores against your priorities:</p>
                    {incumbent && (
                      <CandidateCard
                        candidate={incumbent}
                        themes={themes}
                        picked={decision?.candidateName === incumbent.name}
                        onPick={() => commitPick(incumbent, `${incumbent.name.split(' ').pop()} — incumbent. ${themes[0]?.name || 'priorities'} alignment looked strongest.`)}
                        onUnpick={() => onUnpick(activeRace.id)}
                      />
                    )}
                  </>
                ) : (
                  <p>This is <b>{activeRace.label}</b>, a ballot proposition. Here's what's at stake:</p>
                )}
              </div>
            </div>

            {activeRace.type === 'choice' && challenger && (
              <div className="msg ai">
                <div className="who">Voter Choice · AI</div>
                <div className="bubble">
                  <p>And here's the challenger — {challenger.incumbent ? 'incumbent' : 'no legislative record yet'}:</p>
                  <CandidateCard
                    candidate={challenger}
                    themes={themes}
                    picked={decision?.candidateName === challenger.name}
                    onPick={() => commitPick(challenger, `${challenger.name.split(' ').pop()}. ${challenger.incumbent ? 'Stronger alignment on my top priorities.' : 'First-time candidate, no record to score yet.'}`)}
                    onUnpick={() => onUnpick(activeRace.id)}
                  />
                </div>
              </div>
            )}

            {activeRace.type === 'proposition' && (
              <div className="msg ai">
                <div className="who">Voter Choice · AI</div>
                <div className="bubble">
                  <PropositionCard
                    race={activeRace}
                    decision={decision?.pick}
                    onVote={(v) => voteProp(v)}
                    onUnvote={() => onUnpick(activeRace.id)}
                  />
                </div>
              </div>
            )}

            {decision && (
              <div className="msg ai">
                <div className="who">Voter Choice · AI</div>
                <div className="bubble">
                  <p>Logged: <b>{decision.pick}{decision.party ? ` (${decision.party})` : ''}</b> for {activeRace.label}.</p>
                  {decision.why && <p style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>"{decision.why}"</p>}
                  <p style={{ marginTop: '8px', fontSize: '13.5px', color: 'var(--ink-2)' }}>You can edit the note in the ballot pane any time. Or click a different race in the left rail to keep going.</p>
                </div>
              </div>
            )}
          </div>

          <div className="ws-input">
            <div className="chips">
              <button className="chip">Show me {incumbent?.name?.split(' ').pop() || 'the incumbent'}'s key votes</button>
              <button className="chip">Compare donor bases</button>
              <button className="chip" onClick={skipRace}>Skip — I've decided</button>
            </div>
            <div className="input-row">
              <input type="text" placeholder={`Ask anything about ${activeRace.label}…`} />
              <button className="send">Send</button>
            </div>
            <div className="meta">
              <span>Auto-saving to your device · nothing leaves your browser</span>
              <span>Race {activeIdx + 1} / {races.length}</span>
            </div>
          </div>
        </section>

        {/* RIGHT BALLOT PANE */}
        <BallotPane
          races={races}
          decisions={decisions}
          activeRaceId={activeRace.id}
          address={address}
          onSelectRace={onSelectRace}
          onPrint={onPrint}
        />
      </div>
    </>
  );
}

/* ============ PRINT VIEW ============ */
function PrintView({ address, themes, decisions, onBack }) {
  const races = RACES;
  // group decisions by section
  const sections = {};
  races.forEach(r => {
    if (!decisions[r.id]) return;
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push({ race: r, decision: decisions[r.id] });
  });

  // include undecided as unchecked rows
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
            <div className="cell"><div className="k">Bring</div><div className="v">{POLLING_INFO.bring}</div></div>
            <div className="cell"><div className="k">Early voting</div><div className="v">{POLLING_INFO.earlyWindow}</div></div>
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
              <div className="gtitle">Themes you voted on</div>
              <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {themes.map((t, i) => (
                  <div key={t.id}>{i + 1}. {t.name}</div>
                ))}
              </div>
            </div>
          </div>

          <footer className="print-foot">
            <div className="l">
              <b>Built with Voter Choice</b>
              Free · non-partisan · voterchoice.app
            </div>
            <div className="sig">Signed at the booth</div>
          </footer>
        </div>
      </div>
    </>
  );
}

Object.assign(window, {
  HomeView,
  LoadingView,
  ColdOpenView,
  WorkspaceView,
  PrintView,
});
