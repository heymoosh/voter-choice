/* ====================================================
   VOTER CHOICE · shared components
   Used across views; exported to window
   ==================================================== */

const { useState, useEffect, useRef } = React;

/* ============ NAV ============ */
function AppNav({ onBrandClick, showLang = true }) {
  return (
    <nav className="app-nav">
      <div className="brand" onClick={onBrandClick}>
        <span className="mark">V</span>
        <span>Voter Choice</span>
      </div>
      <div className="links">
        <a>How it works</a>
        <a>The record</a>
        <a>About</a>
      </div>
      {showLang && <button className="lang">EN · ES</button>}
    </nav>
  );
}

/* ============ THEME ROW ============ */
function ThemeRow({ theme, index, total, onMoveUp, onMoveDown, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(theme.name);

  function commit() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <div className="theme-row">
      <div className="ord">
        <button onClick={onMoveUp} disabled={index === 0} aria-label="Move up">▲</button>
        <button onClick={onMoveDown} disabled={index === total - 1} aria-label="Move down">▼</button>
      </div>
      <div className="rank">{index + 1}</div>
      <div className="body">
        <div className="nm">
          {editing ? (
            <input
              className="name-edit"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(theme.name); setEditing(false); } }}
            />
          ) : (
            <>
              <span>{theme.name}</span>
              <button className="edit-pencil" onClick={() => setEditing(true)}>rename</button>
            </>
          )}
        </div>
        <div className="quotes">
          {theme.quotes.map((q, i) => (
            <div className="quote" key={i}>
              <span className="lab">{q.label}</span>
              <em>"{q.text}"</em>
            </div>
          ))}
        </div>
      </div>
      <div className="acts">
        <button className="danger" onClick={onRemove}>REMOVE</button>
      </div>
    </div>
  );
}

/* ============ CANDIDATE CARD ============ */
function CandidateCard({ candidate, themes, picked, onPick, onUnpick }) {
  // compute alignment for each theme
  const alignments = themes.map(t => {
    const lc = t.name.toLowerCase();
    let score = candidate.defaultAlignment;
    for (const key of Object.keys(candidate.alignment || {})) {
      if (lc.includes(key)) {
        score = candidate.alignment[key];
        break;
      }
    }
    return { name: t.name, score, themeId: t.id };
  });

  const hasRecord = candidate.defaultAlignment !== null && candidate.defaultAlignment !== undefined;

  return (
    <div className="cand-card">
      <div className="head2">
        <div className="photo" />
        <div>
          <div className="name">{candidate.name}</div>
          <div className="sub">
            <span className={"pip " + candidate.partyClass}></span>
            {candidate.party}
            {candidate.incumbent ? ' · Incumbent' : ' · Challenger'}
          </div>
        </div>
        <div className="tenure">
          {candidate.years > 0 ? 'Years in office' : 'New candidate'}
          {candidate.years > 0 && <b>{candidate.years}</b>}
        </div>
      </div>

      {candidate.bio && (
        <div style={{ fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: '14px', fontStyle: 'italic' }}>
          {candidate.bio}
        </div>
      )}

      <div className="grid">
        <div className="alignment">
          <div className="lab">Alignment with your priorities</div>
          {hasRecord ? alignments.map((a, i) => {
            const fillClass = a.score >= 75 ? '' : a.score >= 55 ? ' mid' : ' low';
            return (
              <div className="align-row" key={i}>
                <span className="topic" title={a.name}>
                  {a.name.length > 18 ? a.name.slice(0, 16) + '…' : a.name}
                </span>
                <span className="barwrap"><span className={"barfill" + fillClass} style={{ width: a.score + '%' }}></span></span>
                <span className="pct">{a.score}%</span>
              </div>
            );
          }) : (
            <div style={{ fontSize: '13px', color: 'var(--ink-3)', fontStyle: 'italic', paddingTop: '8px' }}>
              No legislative record to compare against. First-time candidate — judge on policy statements and donor base instead.
            </div>
          )}
        </div>

        <div className="donors">
          <div className="lab">2024 cycle · top donor industries</div>
          <div className="donor-bar">
            {candidate.donors.map((d, i) => (
              <span key={i} style={{ flex: `${d.flex} 1 0`, background: d.color, color: d.lightText ? 'var(--ink)' : undefined }}>
                {d.industry.split(' ')[0]}
              </span>
            ))}
          </div>
          <div className="donor-list">
            {candidate.donors.slice(0, 3).map((d, i) => (
              <div className="row" key={i}>
                <span className="sw" style={{ background: d.color }}></span>
                <span>{d.industry}</span>
                <span className="amt">{d.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cand-actions">
        <button>See the votes →</button>
        {picked ? (
          <button className="picked" onClick={onUnpick}>☑ Picked — undo</button>
        ) : (
          <button className="add" onClick={onPick}>☑ Pick {candidate.name.split(' ').pop()}</button>
        )}
      </div>
    </div>
  );
}

/* ============ PROPOSITION CARD ============ */
function PropositionCard({ race, decision, onVote, onUnvote }) {
  return (
    <div className="prop-card">
      <div className="ttl">{race.label}</div>
      <p className="sub">{race.summary}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--civic)', marginBottom: '4px' }}>If yes</div>
          <div style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}>{race.sumIfYes}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--vote-red)', marginBottom: '4px' }}>If no</div>
          <div style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}>{race.sumIfNo}</div>
        </div>
      </div>

      <div className="twobtn">
        <button
          className={decision === 'Yes' ? 'yes-picked' : ''}
          onClick={() => decision === 'Yes' ? onUnvote() : onVote('Yes')}
        >
          {decision === 'Yes' ? '☑ Yes' : 'Yes'}
        </button>
        <button
          className={decision === 'No' ? 'no-picked' : ''}
          onClick={() => decision === 'No' ? onUnvote() : onVote('No')}
        >
          {decision === 'No' ? '☑ No' : 'No'}
        </button>
      </div>
    </div>
  );
}

/* ============ BALLOT PANE (right) ============ */
function BallotPane({ races, decisions, activeRaceId, address, onSelectRace, onPrint }) {
  const decidedCount = Object.keys(decisions).length;
  const totalCount = races.length;
  const canPrint = decidedCount > 0;

  // group by section
  const sections = {};
  races.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r);
  });

  return (
    <aside className="ws-ballot">
      <div className="b-head">
        <div className="row">
          <h3>Your ballot</h3>
          <span className="sub">{decidedCount}/{totalCount} · Draft</span>
        </div>
        <address>{address || '—'} · Precinct {POLLING_INFO.precinct}</address>
      </div>

      <div className="b-list">
        {Object.entries(sections).map(([section, rs]) => (
          <div key={section}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink-3)', padding: '14px 0 4px' }}>{section}</div>
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

      <div className="b-foot">
        <button className="primary" disabled={!canPrint} onClick={onPrint}>
          <span>Print my ballot (PDF)</span><span className="arrow">→</span>
        </button>
        <button>
          <span>Save my profile (.txt)</span><span className="arrow">↓</span>
        </button>
        <button>
          <span>Continue in another chatbot</span><span className="arrow">↗</span>
        </button>
      </div>
    </aside>
  );
}

/* ============ TWEAKS PANEL ============ */
function TweaksPanel({ tweaks, onChange, hidden, onClose }) {
  const blurbs = {
    'editorial|civic|daylight':          'current. Newsreader serif, teal accent, cream paper.',
    'editorial|civic|inkwell':           'Newsreader on ink. Late-night reading.',
    'editorial|constitutional|daylight': 'Editorial type, navy primary. Signing-document gravitas.',
    'editorial|constitutional|inkwell':  'Navy lifts to luminous blue on dark.',
    'editorial|newsprint|daylight':      'Serif on paper, near-monochrome. Op-ed page.',
    'editorial|newsprint|inkwell':       'White-on-black newsprint.',
    'civic|civic|daylight':              'Plex Serif, wider tracking. Bureaucratic.',
    'civic|civic|inkwell':               'Government form, after hours.',
    'civic|constitutional|daylight':     'Plex Serif + navy. Closest to treasury document.',
    'civic|constitutional|inkwell':      'Treasury blueprint mode.',
    'civic|newsprint|daylight':          'Plex Serif on warm newsprint. Census-bureau.',
    'civic|newsprint|inkwell':           'Carbon-copy form.',
    'manifesto|civic|daylight':          'Space Grotesk, all-caps, red underline. Loud.',
    'manifesto|civic|inkwell':           'Manifesto on dark. Concert poster.',
    'manifesto|constitutional|daylight': 'All-caps + navy. Yard sign.',
    'manifesto|constitutional|inkwell':  'Caps on midnight blue. Rally.',
    'manifesto|newsprint|daylight':      'Caps, red underline, no chroma. Broadsheet.',
    'manifesto|newsprint|inkwell':       'Stencil. Pamphlet aesthetic.',
  };

  const key = tweaks.mood + '|' + tweaks.palette + '|' + tweaks.treatment;
  const label = (tweaks.mood[0].toUpperCase() + tweaks.mood.slice(1)) + ' · ' +
    ({civic:'Civic green',constitutional:'Const. ink',newsprint:'Newsprint'})[tweaks.palette] + ' · ' +
    (tweaks.treatment[0].toUpperCase() + tweaks.treatment.slice(1));

  if (hidden) return null;

  return (
    <aside className="tweaks">
      <header>
        <h4>Tweaks</h4>
        <button className="close" onClick={onClose}>×</button>
      </header>
      <div className="body-inner">
        <div className="row">
          <label>Type mood</label>
          <div className="seg">
            <button className={tweaks.mood === 'editorial' ? 'active' : ''} onClick={() => onChange({ mood: 'editorial' })}>Editorial</button>
            <button className={tweaks.mood === 'civic' ? 'active' : ''} onClick={() => onChange({ mood: 'civic' })}>Civic</button>
            <button className={tweaks.mood === 'manifesto' ? 'active' : ''} onClick={() => onChange({ mood: 'manifesto' })}>Manifesto</button>
          </div>
        </div>
        <div className="row">
          <label>Palette</label>
          <div className="seg">
            <button className={tweaks.palette === 'civic' ? 'active' : ''} onClick={() => onChange({ palette: 'civic' })}>Civic green</button>
            <button className={tweaks.palette === 'constitutional' ? 'active' : ''} onClick={() => onChange({ palette: 'constitutional' })}>Const. ink</button>
            <button className={tweaks.palette === 'newsprint' ? 'active' : ''} onClick={() => onChange({ palette: 'newsprint' })}>Newsprint</button>
          </div>
        </div>
        <div className="row">
          <label>Treatment</label>
          <div className="seg two">
            <button className={tweaks.treatment === 'daylight' ? 'active' : ''} onClick={() => onChange({ treatment: 'daylight' })}>Daylight</button>
            <button className={tweaks.treatment === 'inkwell' ? 'active' : ''} onClick={() => onChange({ treatment: 'inkwell' })}>Inkwell</button>
          </div>
        </div>
        <div className="hint"><b>{label}</b><span> — {blurbs[key] || 'explore.'}</span></div>
      </div>
    </aside>
  );
}

Object.assign(window, {
  AppNav,
  ThemeRow,
  CandidateCard,
  PropositionCard,
  BallotPane,
  TweaksPanel,
});
