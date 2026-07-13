/* ====================================================
   VOTER CHOICE · components
   ====================================================
   See prototype/COMPONENT_MAP.md for the repo target of each
   component. Inline headers reference the matching file.

   Pattern: each component accepts props shaped like the
   repo's parsed structured-block payload. Design-delta fields
   are marked with [Δ] in the data file and consumed here.
   ==================================================== */

const { useState, useEffect, useRef } = React;

/* ============ AppNav ============
   Maps to: src/components/Navigation.tsx (header strip).
   Pass C: wires Settings cog + LanguageToggle and reads navigation
   handlers from NavContext (provided at App root).

   Repo equivalent: same composition pattern — LanguageToggle slots
   into the right-hand side, settings opens a drawer hoisted at the
   layout level. */
function AppNav({ onBrandClick }) {
  // Defensive: i18n + nav contexts may not exist in storybook-style
  // standalone renders. Default to no-op + EN labels.
  const i18n = (typeof useI18n === 'function') ? useI18n() : { t: (k) => k.split('.').pop() };
  const nav  = (typeof useNav  === 'function') ? useNav()  : { openSettings: () => {}, navigate: () => {}, current: 'home' };
  const { t } = i18n;
  const { openSettings, navigate, current } = nav;

  return (
    <nav className="app-nav" data-current={current || 'home'} aria-label="Main">
      <div
        className="brand"
        onClick={onBrandClick || (() => navigate('home'))}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (onBrandClick || (() => navigate('home')))();
          }
        }}
        aria-label="Voter Choice home"
      >
        <span className="mark" aria-hidden="true">V</span>
        <span>Voter Choice</span>
      </div>
      <div className="links">
        <a onClick={() => navigate('howitworks')} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate('howitworks'); }}>{t('nav.howItWorks')}</a>
        <a onClick={() => navigate('methodology')} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate('methodology'); }}>{t('nav.methodology')}</a>
        <a onClick={() => navigate('about')} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate('about'); }}>{t('nav.about')}</a>
      </div>
      <div className="nav-right">
        {typeof LanguageToggle === 'function' && <LanguageToggle />}
        <button
          className="nav-cog"
          onClick={openSettings}
          aria-label={t('nav.settings')}
          title={t('nav.settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

/* ============ IssueRow ============
   Used in the cold open to render one inferred issue row
   the user can reorder / rename / remove.

   Maps to: src/components/ConcernInterpretation.tsx (one row
   of the interpretation list). The repo today is read-only —
   editing affordances are part of Phase 6 (mid-flow amend).
   Reorder/rename/remove are design-delta in this prototype. */
function IssueRow({ issue, index, total, onMoveUp, onMoveDown, onRename, onRemove, onReorderTo }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue.interpretation);
  const rowRef = React.useRef(null);
  const drag = React.useRef({ active: false, startY: 0, dy: 0, currentIdx: index });
  const [dragging, setDragging] = useState(false);
  const [dropIdx, setDropIdx] = useState(null);

  function commit() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  /* ====== Drag & drop (pointer events — works on touch + mouse).
     Bound to the whole row so on mobile the entire card is a drag
     surface. We bail out if the pointerdown landed on an interactive
     descendant (button / input) so rename + remove still work. */
  function isInteractive(target) {
    return !!target.closest && !!target.closest('button, input, a, textarea, select');
  }
  function onHandleDown(e) {
    if (editing) return;
    if (isInteractive(e.target) && !e.target.closest('.drag-handle, .theme-row')) return;
    // On desktop, only the .drag-handle initiates drag; on mobile the
    // whole row does. We detect "mobile" by viewport — same threshold
    // as the CSS rule that toggles .ord button pointer-events.
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (!isMobile && !e.target.closest('.drag-handle')) return;
    // On mobile, bail if the user tapped a button/input inside the row
    // (rename, remove, edit pencil). The row's pointer-events:none on
    // those is handled in CSS too, but belt-and-suspenders.
    if (isMobile && isInteractive(e.target)) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    drag.current = { active: true, startY: e.clientY, dy: 0, currentIdx: index, rowH: rowRef.current?.offsetHeight || 80 };
    setDragging(true);
    setDropIdx(index);
  }
  function onHandleMove(e) {
    if (!drag.current.active) return;
    const dy = e.clientY - drag.current.startY;
    drag.current.dy = dy;
    if (rowRef.current) rowRef.current.style.transform = `translateY(${dy}px)`;
    const slots = Math.round(dy / drag.current.rowH);
    const target = Math.max(0, Math.min(total - 1, index + slots));
    if (target !== drag.current.currentIdx) {
      drag.current.currentIdx = target;
      setDropIdx(target);
    }
  }
  function onHandleUp(e) {
    if (!drag.current.active) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    const finalIdx = drag.current.currentIdx;
    drag.current.active = false;
    setDragging(false);
    setDropIdx(null);
    if (rowRef.current) rowRef.current.style.transform = '';
    if (finalIdx !== index && onReorderTo) onReorderTo(index, finalIdx);
  }

  return (
    <div
      ref={rowRef}
      className={"theme-row" + (dragging ? ' dragging' : '') + (dropIdx === index && !dragging ? ' drop-target' : '')}
      onPointerDown={onHandleDown}
      onPointerMove={onHandleMove}
      onPointerUp={onHandleUp}
      onPointerCancel={onHandleUp}
    >
      <div className="ord">
        <span
          className="drag-handle"
          aria-label="Drag to re-rank"
          role="button"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="6" cy="4" r="1" /><circle cx="10" cy="4" r="1" />
            <circle cx="6" cy="8" r="1" /><circle cx="10" cy="8" r="1" />
            <circle cx="6" cy="12" r="1" /><circle cx="10" cy="12" r="1" />
          </svg>
        </span>
        <div className="ord-arrows">
          <button onClick={onMoveUp} disabled={index === 0} aria-label="Move up">▲</button>
          <button onClick={onMoveDown} disabled={index === total - 1} aria-label="Move down">▼</button>
        </div>
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
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(issue.interpretation); setEditing(false); } }}
            />
          ) : (
            <>
              <span>{issue.interpretation}</span>
              <button className="edit-pencil" onClick={() => setEditing(true)}>rename</button>
            </>
          )}
        </div>
        <div className="quotes">
          {(issue.quotes || []).map((q, i) => (
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

/* ====================================================
   CANDIDATE CARD COMPOSITION
   ====================================================
   The hero visual is built from four named sub-components
   that each map cleanly to a repo file:

     CandidateCardHeader   → (new — repo doesn't have this
                              factored out yet; embedded in
                              RacePatterns.tsx)
     AlignmentScoreBanner  → src/components/AlignmentScoreBanner.tsx
     AlignmentDrilldown    → src/components/AlignmentDrilldown.tsx
     FunderBars            → src/components/FunderBars.tsx
   ==================================================== */

/* ============ CandidateCard ============
   Thin wrapper. State (which issue is expanded) lives here so
   the banner and drilldown share one source of truth.

   props (repo-shaped):
     candidate:        RacePatternsCandidate   (id, name, incumbent, ...,
                                                 donorCoalition, totalRaised,
                                                 fundingMix [Δ])
     alignmentEntry:   AlignmentScoresEntry    (candidateId, scores | null, unavailable?)
     userIssues:       ConcernInterpretationEntry[]
     party:            { name, code, pipClass }
     priorRoleOverride?: string                (display polish)
     picked, onPick, onUnpick: control props */
function CandidateCard({ candidate, alignmentEntry, userIssues, party, picked, onPick, onUnpick, onSeeAllVotes, blindMode, globalBlindMode, isRevealed, alias, onReveal, onHide, peerTotals }) {
  const [expandedIssue, setExpandedIssue] = useState(null);
  /* Progressive disclosure: money trail (funding mix + named PACs +
     industry breakdown) is collapsed by default on mobile, expanded
     on desktop. This keeps the decision UI (header + alignment +
     Pick button) tight on phones while preserving the editorial
     evidence one tap away. */
  const [moneyOpen, setMoneyOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches
  );
  const hasAnyScore = !!(alignmentEntry?.scores?.length);
  const totalVotes = alignmentEntry?.issues?.reduce((n, i) => n + (i.contributingVotes?.length || 0), 0) || 0;

  // Anonymization context — passed all the way down so narrative
  // text doesn't leak the candidate's last name in blind mode.
  const anonCtx = { blindMode, realLastName: candidate.name?.split(' ').pop(), alias };

  return (
    <div className="cv2-card">
      <CandidateCardHeader
        candidate={candidate}
        party={party}
        blindMode={blindMode}
        isRevealed={isRevealed}
        alias={alias}
        onReveal={onReveal}
        onHide={onHide}
      />

      <AlignmentScoreBanner
        candidate={candidate}
        alignmentEntry={alignmentEntry}
        userIssues={userIssues}
        expandedIssue={expandedIssue}
        onToggleIssue={(canonicalIssue) =>
          setExpandedIssue(expandedIssue === canonicalIssue ? null : canonicalIssue)}
        anonCtx={anonCtx}
      />

      {/* See all votes — primary "evidence" CTA, always visible right
          below the alignment summary. */}
      {hasAnyScore && (
        <div className="cv2-see-all-bridge">
          <button
            className="cv2-see-all-inline"
            onClick={onSeeAllVotes}
          >
            See all {totalVotes || ''} votes →
          </button>
        </div>
      )}

      {/* Progressive-disclosure: Money trail block (collapsible). */}
      <div className={"cv2-disclose " + (moneyOpen ? 'open' : '')}>
        <button
          className="cv2-disclose-toggle"
          aria-expanded={moneyOpen}
          aria-controls={`mt-${candidate.id}`}
          onClick={() => setMoneyOpen(v => !v)}
        >
          <span className="cv2-disclose-lab">
            <span className="cv2-disclose-eyebrow">Funding & influence</span>
            <span className="cv2-disclose-title">Money trail</span>
            {/* Two-line summary so the user sees the bottom line
                (total + peer comparison) before the mix breakdown. */}
            <span className="cv2-disclose-summary">
              {(typeof candidate.totalRaised === 'number') && (
                <span className="cv2-disclose-stat">
                  <b>{formatDollars(candidate.totalRaised)}</b> raised
                  {(() => {
                    const peer = computePeerLabel(candidate.totalRaised, peerTotals);
                    return peer ? <> <span className="cv2-disclose-peer">· {peer}</span></> : null;
                  })()}
                </span>
              )}
              {candidate.fundingMix && (
                <span className="cv2-disclose-mix">
                  {fundingMixSummary(candidate.fundingMix)}
                </span>
              )}
            </span>
          </span>
          <span className="cv2-disclose-chev" aria-hidden="true">
            {moneyOpen ? (
              <>Hide <span className="cv2-disclose-arrow">▴</span></>
            ) : (
              <>Show details <span className="cv2-disclose-arrow">▾</span></>
            )}
          </span>
        </button>
        <div
          id={`mt-${candidate.id}`}
          className="cv2-disclose-body"
          hidden={!moneyOpen}
        >
          <FunderBars
            donorCoalition={candidate.donorCoalition}
            totalRaised={candidate.totalRaised}
            donorDataSource={candidate.donorDataSource}
            donorSource={candidate.donorSource}
            donorUnavailable={candidate.donorUnavailable}
            /* [Δ] design-delta */
            fundingMix={candidate.fundingMix}
            userIssues={userIssues}
            peerTotals={peerTotals}
          />
        </div>
      </div>

      <div className="cv2-actions">
        {picked ? (
          <button className="pick picked" onClick={onUnpick}>
            <span className="ck">✓</span>
            <span>Picked — undo</span>
          </button>
        ) : (
          <button className="pick" onClick={onPick}>
            <span className="ck">☐</span>
            <span>Pick {blindMode ? alias : candidate.name.split(' ').pop()}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ============ FundingMixBars ============
   SHARED funding-mix visualization: stacked small/large/PAC bar +
   full legend with dollar-threshold descriptors. Used by both the
   candidate-card Money trail AND the Compare modal so the two never
   drift. Previously each surface hand-rolled its own bar markup.

   Repo target: (new — recommended src/components/FundingMixBars.tsx).
   Consolidates what the repo renders inline in FunderBars + the
   compare grid today.

   props:
     mix: { small, large, pac }  (percentages, 0–100) [Δ fundingMix]
     labelMin: hide the inline % label on segments narrower than this
               (default 12) so tiny segments don't show cramped text */
function FundingMixBars({ mix, labelMin = 12 }) {
  if (!mix) return null;
  return (
    <div className="fmix">
      <div className="fmix-bar" role="img" aria-label="Funding by source type">
        <div className="seg small" style={{ flexBasis: mix.small + '%' }}>
          {mix.small >= labelMin && <span className="pct">{mix.small}%</span>}
        </div>
        <div className="seg large" style={{ flexBasis: mix.large + '%' }}>
          {mix.large >= labelMin && <span className="pct">{mix.large}%</span>}
        </div>
        <div className="seg pac" style={{ flexBasis: mix.pac + '%' }}>
          {mix.pac >= labelMin && <span className="pct">{mix.pac}%</span>}
        </div>
      </div>
      <div className="fmix-legend">
        <div><span className="sw small" /> <b>{mix.small}%</b> Small donors <small>&lt;$200</small></div>
        <div><span className="sw large" /> <b>{mix.large}%</b> Large donors <small>≥$200</small></div>
        <div><span className="sw pac" /> <b>{mix.pac}%</b> PACs <small>groups &amp; lobbies</small></div>
      </div>
    </div>
  );
}

/* ============ fundingMixSummary ============
   Inline summary string used by the Money trail disclosure header
   so the user gets a teaser without expanding. Reads from
   candidate.fundingMix [Δ]. All three buckets shown when present
   (small + large + PAC) — earlier version dropped large donors,
   which mis-represents campaigns that lean heavily on large
   individual checks. */
function fundingMixSummary(mix) {
  if (!mix) return 'tap to view';
  const parts = [];
  if (mix.small != null) parts.push(`${mix.small}% small donors`);
  if (mix.large != null) parts.push(`${mix.large}% large donors`);
  if (mix.pac   != null) parts.push(`${mix.pac}% PACs`);
  return parts.join(' · ');
}

/* ============ computePeerLabel ============
   Thin wrapper over the shared getPeerComparison (design-system core).
   Returns just the label string for the Money-trail disclosure teaser. */
function computePeerLabel(totalRaised, peerTotals) {
  const cmp = getPeerComparison(totalRaised, peerTotals);
  return cmp ? cmp.label : null;
}

/* ============ CandidateCardHeader ============ */
function CandidateCardHeader({ candidate, party, blindMode, isRevealed, alias, onReveal, onHide }) {
  const yearsMatch = (candidate.priorRole || '').match(/since (\d{4})/i);
  const years = yearsMatch ? new Date().getFullYear() - parseInt(yearsMatch[1], 10) : 0;
  const isFirstTime = /first-time/i.test(candidate.priorRole || '') || (!yearsMatch && !candidate.incumbent);

  // In blind mode, hide name + party + role + tenure. Show only an alias
  // and a "Reveal who this is" button. Everything below stays visible.
  if (blindMode) {
    return (
      <div className="cv2-head blind">
        <div className="cv2-photo blind" />
        <div className="cv2-id">
          <div className="cv2-name blind">{alias || 'Candidate'}</div>
          <div className="cv2-sub blind">
            <span className="cv2-tag">Identity hidden · judge by record</span>
          </div>
        </div>
        <button className="cv2-reveal" onClick={onReveal} title="Reveal who this is">
          <svg className="reveal-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="lab">Reveal</span>
        </button>
      </div>
    );
  }

  return (
    <div className="cv2-head">
      <div className="cv2-photo" />
      <div className="cv2-id">
        <div className="cv2-name">{candidate.name}</div>
        <div className="cv2-sub">
          {party && <span className={"cv2-pip " + party.pipClass} />}
          {party && <span>{party.name}</span>}
          <span className="cv2-tag">
            {candidate.incumbent ? 'Incumbent' : (isFirstTime ? 'First-time' : 'Challenger')}
          </span>
        </div>
      </div>
      {/* [Fix] When the user is in global blind mode but has
          revealed THIS candidate, expose a Hide button so they
          can re-anonymize this card without flipping the global
          toggle. Sits where the tenure block lives in the
          revealed-but-not-blinded state, so it occupies the
          same column without disrupting the grid. */}
      {isRevealed ? (
        <button className="cv2-reveal hide" onClick={onHide} title="Hide this candidate again">
          <svg className="reveal-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          <span className="lab">Hide</span>
        </button>
      ) : years > 0 ? (
        <div className="cv2-tenure">
          <div className="num">{years}</div>
          <div className="unit">yrs in office</div>
        </div>
      ) : isFirstTime ? (
        <div className="cv2-tenure no-record">
          <div className="unit unit-lg">No record yet</div>
        </div>
      ) : null}
    </div>
  );
}

/* ============ AlignmentScoreBanner ============
   Maps to: src/components/AlignmentScoreBanner.tsx

   Repo today: renders alignment ratio (e.g. "3 of 5") per
   issue with a chip showing kept/total. Bars + drill-down
   toggle are this prototype's design-delta.

   props:
     candidate, alignmentEntry, userIssues, expandedIssue, onToggleIssue */
function AlignmentScoreBanner({ candidate, alignmentEntry, userIssues, expandedIssue, onToggleIssue, anonCtx }) {
  // No legislative record case
  if (alignmentEntry?.scores === null && alignmentEntry?.unavailable) {
    return (
      <div className="cv2-issues">
        <div className="cv2-block-head">
          <div className="lab">Aligns with your issues</div>
        </div>
        <div className="cv2-norecord">
          <p>{alignmentEntry.unavailable.reason}.</p>
          <p>Judge instead on the <a>policy statements they’ve made publicly</a> and the donor base below.</p>
        </div>
      </div>
    );
  }

  // Compute overall average % across the user's issues (only ones with scores)
  const rowsData = (userIssues || []).map(iss => {
    const score = getScoreForIssue(alignmentEntry, iss.canonicalIssue);
    return { issue: iss, score };
  });
  const scored = rowsData.filter(r => r.score && r.score.total > 0);
  const overallPct = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.score.kept / r.score.total) * 100, 0) / scored.length)
    : null;

  return (
    <div className="cv2-issues">
      <div className="cv2-block-head">
        <div className="lab">Aligns with your issues</div>
        {overallPct !== null && (
          <div className="overall"><b>{overallPct}%</b> avg</div>
        )}
      </div>

      {rowsData.map(({ issue, score }) => (
        <AlignmentIssueRow
          key={issue.canonicalIssue}
          issue={issue}
          score={score}
          candidate={candidate}
          isOpen={expandedIssue === issue.canonicalIssue}
          onToggle={() => onToggleIssue(issue.canonicalIssue)}
          anonCtx={anonCtx}
        />
      ))}
    </div>
  );
}

/* ── single row of the banner (private to AlignmentScoreBanner) ── */
function AlignmentIssueRow({ issue, score, candidate, isOpen, onToggle, anonCtx }) {
  const pct = score && score.total > 0 ? Math.round((score.kept / score.total) * 100) : null;
  const tone = pct === null ? '' : pct >= 65 ? '' : pct >= 50 ? 'mid' : 'low';
  const hasVotes = !!(score?.contributingVotes?.length);

  return (
    <div className={"cv2-iss-row" + (isOpen ? " open" : "") + (hasVotes ? " has-drill" : "")}>
      <button className="cv2-iss-head" onClick={hasVotes ? onToggle : undefined} aria-expanded={isOpen}>
        <div className="topic">
          <div className="name">{issue.interpretation}</div>
          <div className="cv2-bar">
            <div className={"fill " + tone} style={{ width: (pct || 0) + '%' }} />
          </div>
          {score && score.total > 0 ? (
            <div className="meta">
              Aligned on <b>{score.kept}</b> of <b>{score.total}</b> {score.total === 1 ? 'vote' : 'votes'}
              {hasVotes ? '' : ' · detail not yet curated'}
            </div>
          ) : (
            <div className="meta thin">Thin record on this issue</div>
          )}
        </div>
        <div className={"pct " + tone}>
          {pct !== null ? <>{pct}<small>%</small></> : <small>n/a</small>}
          {hasVotes && <span className="chev">{isOpen ? '▴' : '▾'}</span>}
        </div>
      </button>

      {isOpen && hasVotes && (
        <AlignmentDrilldown score={score} candidate={candidate} anonCtx={anonCtx} />
      )}
    </div>
  );
}

/* ============ AlignmentDrilldown ============
   Maps to: src/components/AlignmentDrilldown.tsx

   Repo today: bill title + voteCast badge + date + source chip.
   This prototype adds curated narrative paragraph (sourced from
   CAN2026 case files) and a "Issue PACs funding this candidate
   on this issue" callout — both marked [Δ].

   props:
     score:     AlignmentScore (canonicalIssue, issueLabel, kept, total,
                                contributingVotes[])
     candidate: RacePatternsCandidate (used to filter donorCoalition
                                       for issue-PAC callout) */
function AlignmentDrilldown({ score, candidate, anonCtx }) {
  const pct = score && score.total > 0 ? Math.round((score.kept / score.total) * 100) : 0;

  // [Δ] Find issue-PACs from this candidate's donorCoalition that
  // alignsWith this canonical issue.
  const issuePacs = (candidate.donorCoalition || []).filter(
    slice => slice.isIssuePAC && (slice.relevantToIssue === score.canonicalIssue || slice.alignsWith === score.canonicalIssue),
  );

  // Anonymize the candidate label used in "Issue PACs funding X on this"
  const candidateLabel = anonCtx?.blindMode
    ? (anonCtx.alias || 'this candidate')
    : candidate.name.split(' ').pop();

  return (
    <div className="cv2-drill">
      <div className="cv2-drill-head">
        <span className="lab">Why {pct}%?</span>
        <span className="meta">Tap a bill →</span>
      </div>

      <div className="cv2-votes">
        {score.contributingVotes.map((v, i) => (
          <ContributingVoteCard key={i} vote={v} anonCtx={anonCtx} />
        ))}
      </div>

      {issuePacs.length > 0 && (
        <div className="cv2-issue-pacs">
          <div className="lab">
            Issue PACs funding {candidateLabel} on this
          </div>
          {issuePacs.map((p, i) => (
            <div className="cv2-issue-pac" key={i}>
              <span className="sw" style={{ background: 'oklch(0.55 0.10 30)' }} />
              <span className="name">{p.label}</span>
              <span className="amt">{formatDollars(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── single curated vote card (private to AlignmentDrilldown) ── */
function ContributingVoteCard({ vote, anonCtx }) {
  const voteClass = vote.voteCast === 'with' ? 'yea' : vote.voteCast === 'against' ? 'nay' : 'other';
  const voteLabel = vote.voteCast === 'with' ? 'WITH YOU' : vote.voteCast === 'against' ? 'AGAINST YOU' : '—';
  const narrative = anonymizeText(vote.narrative, anonCtx);
  return (
    <div className="cv2-vote">
      <div className="cv2-vote-head">
        <div className="bill">
          <span className="num">{vote.billTitle.split(' · ')[0] || vote.billTitle}</span>
          <span className="ttl">{vote.billTitle.split(' · ')[1] || ''}</span>
        </div>
        <div className={"vote-badge " + voteClass}>{voteLabel}</div>
      </div>
      <div className="cv2-vote-date">{formatDate(vote.date)}</div>
      {narrative && <p className="cv2-vote-narr">{narrative}</p>}
      <div className="cv2-vote-cite">
        <span className="src-chip">{vote.source.name}</span>
        {vote.source.url && (
          <a href={vote.source.url} className="src-link" target="_blank" rel="noopener noreferrer">
            View roll call →
          </a>
        )}
      </div>
    </div>
  );
}

/* ============ FunderBars ============
   Maps to: src/components/FunderBars.tsx

   Repo today: renders donorCoalition as a stacked
   horizontal bar + a list of slices with $.

   This prototype adds two things, both marked [Δ]:
     1. fundingMix money-map (small / large / PAC)
     2. Named issue-PAC rows broken out from the rest
        of donorCoalition (via isIssuePAC flag)

   props:
     donorCoalition:    DonorBucketSlice[] | null
     totalRaised:       number | undefined
     donorDataSource:   "voting_record" | "web_search" | undefined
     donorSource:       SourceRef | undefined
     donorUnavailable:  { reason } | undefined
     fundingMix [Δ]:  { small, large, pac, total, cycle } | undefined */
function FunderBars({ donorCoalition, totalRaised, donorDataSource, donorSource, donorUnavailable, fundingMix, userIssues, peerTotals }) {
  if (!donorCoalition && donorUnavailable) {
    return (
      <div className="cv2-funding">
        <div className="cv2-block-head"><div className="lab">Funding mix</div></div>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic', margin: 0 }}>
          {donorUnavailable.reason}.
        </p>
      </div>
    );
  }
  if (!donorCoalition) return null;

  // Separate issue-PACs (named) from generic industry slices.
  const issuePACs = donorCoalition.filter(s => s.isIssuePAC);
  const industries = donorCoalition.filter(s => !s.isIssuePAC);

  // ── PAC partial-coverage math ─────────────────────────────
  // Three cases:
  //   • fully covered — named-PAC $ ≈ implied PAC total
  //   • partial      — we identify some, not all
  //   • zero         — we have nothing curated, but the candidate
  //                    still takes PAC money (the original gap case)
  const namedPacTotal = issuePACs.reduce((s, p) => s + (p.amount || 0), 0);
  const impliedPacTotal = fundingMix && typeof totalRaised === 'number'
    ? Math.round(totalRaised * (fundingMix.pac / 100))
    : null;
  const uncatPacTotal = impliedPacTotal !== null ? Math.max(0, impliedPacTotal - namedPacTotal) : null;
  const pctIdentified = impliedPacTotal && impliedPacTotal > 0
    ? Math.round((namedPacTotal / impliedPacTotal) * 100)
    : null;

  // Peer comparison — single source of truth (design-system core).
  // We keep the local peerCandidate/peerLabel names the render below
  // expects, but derive them from getPeerComparison so the thresholds
  // never drift from the Money-trail teaser.
  const peerCmp = getPeerComparison(totalRaised, peerTotals);
  const peerCandidate = peerCmp ? peerCmp.peer : null;
  const peerLabel = peerCmp ? { kind: peerCmp.kind, text: peerCmp.label } : null;
  // Scale: total widths in the head-to-head map are normalized to the LARGER of the two totals
  const peerScaleMax = peerCandidate ? Math.max(totalRaised, peerCandidate.total) : totalRaised;

  return (
    <div className="cv2-funding">
      <div className="cv2-block-head">
        <div className="lab">Funding mix <small className="cv2-sub-lab">by source type</small></div>
        <div className="overall">
          {/* When the comparison rails are active, the dollar totals
              live adjacent to their bars — so we drop $$ from the
              header to avoid duplicating it. Keep cycle metadata. */}
          {!(fundingMix && peerCandidate && peerLabel) && totalRaised !== undefined && <b>{formatDollars(totalRaised)}</b>}
          {!(fundingMix && peerCandidate && peerLabel) && totalRaised !== undefined && fundingMix?.cycle && <> · </>}
          {fundingMix?.cycle && <span className="cv2-cycle">{fundingMix.cycle}</span>}
        </div>
      </div>

      {/* [Δ] v4 — Comparison rails.
          Promotes the "X× more/less raised" signal from a tiny pill to a
          headline stat, AND adds a proportional ghost rail for the peer
          right below the main bar — same x-axis, same scale, so the
          length difference reads visually before you read the multiplier.
          The segmented mix-by-source bar is preserved untouched. */}
      {fundingMix && peerCandidate && peerLabel && (() => {
        const isMore = peerLabel.kind === 'more';
        const multiplier = isMore
          ? (totalRaised / peerCandidate.total).toFixed(1)
          : (peerCandidate.total / totalRaised).toFixed(1);
        const maxTotal = Math.max(totalRaised, peerCandidate.total);
        const thisPct = (totalRaised / maxTotal) * 100;
        const peerPct = (peerCandidate.total / maxTotal) * 100;
        // Show a % label only when the segment is wide enough on screen
        const showSegLabel = (segPct) => (segPct * thisPct / 100) >= 8;
        return (
          <div className={"cv2-compare-rails " + peerLabel.kind}>
            {/* Headline — typographic only.
                No arrows, no colored background: "more" / "less"
                is a neutral magnitude fact. Readers decide whether
                raising more (or less) is a good thing. */}
            <div className="cv2-cr-headline">
              <span className="cv2-cr-mult">{multiplier}×</span>
              <span className="cv2-cr-dir">{isMore ? 'MORE' : 'LESS'}</span>
              <span className="cv2-cr-ctx">raised than {peerCandidate.aliasOrName}</span>
            </div>
            <div className="cv2-cr-rail-row this">
              <span className="cv2-cr-total">{formatDollars(totalRaised)}</span>
              <div className="cv2-cr-rail-track">
                <div className="cv2-cr-rail this-rail" style={{ width: thisPct + '%' }} role="img" aria-label="Funding by source type">
                  <div className="seg small" style={{ flexBasis: fundingMix.small + '%' }}>
                    {showSegLabel(fundingMix.small) && <span className="pct">{fundingMix.small}%</span>}
                  </div>
                  <div className="seg large" style={{ flexBasis: fundingMix.large + '%' }}>
                    {showSegLabel(fundingMix.large) && <span className="pct">{fundingMix.large}%</span>}
                  </div>
                  <div className="seg pac" style={{ flexBasis: fundingMix.pac + '%' }}>
                    {showSegLabel(fundingMix.pac) && <span className="pct">{fundingMix.pac}%</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="cv2-cr-rail-row peer">
              <span className="cv2-cr-total">{formatDollars(peerCandidate.total)}</span>
              <div className="cv2-cr-rail-track">
                <div className="cv2-cr-rail peer-rail" style={{ width: peerPct + '%' }} aria-label={peerCandidate.aliasOrName + ' total raised'} role="img" />
              </div>
            </div>
            <div className="cv2-money-legend cv2-cr-legend">
              <div><span className="sw small" /> <b>{fundingMix.small}%</b> Small donors <small>&lt;$200</small></div>
              <div><span className="sw large" /> <b>{fundingMix.large}%</b> Large donors <small>≥$200</small></div>
              <div><span className="sw pac" /> <b>{fundingMix.pac}%</b> PACs <small>groups &amp; lobbies</small></div>
            </div>
            {/* PAC gloss — plain-English definition that explains both
                what a PAC is and why a high % matters. Always visible
                as a muted footnote, single line typographically. */}
            <p className="cv2-pac-gloss">
              <b>PAC</b> = Political Action Committee — companies, unions, or advocacy groups that pool donations to back candidates. High PAC share signals reliance on organized interests over individual voters.
            </p>
          </div>
        );
      })()}

      {/* Fallback: no peer to compare against — original single money map. */}
      {fundingMix && !(peerCandidate && peerLabel) && (
        <div className="cv2-money-map-wrap">
          <div className="cv2-money-map" role="img" aria-label="Funding by source type">
            <div className="seg small" style={{ flexBasis: fundingMix.small + '%' }}>
              {fundingMix.small >= 12 && <span className="pct">{fundingMix.small}%</span>}
            </div>
            <div className="seg large" style={{ flexBasis: fundingMix.large + '%' }}>
              {fundingMix.large >= 12 && <span className="pct">{fundingMix.large}%</span>}
            </div>
            <div className="seg pac" style={{ flexBasis: fundingMix.pac + '%' }}>
              {fundingMix.pac >= 12 && <span className="pct">{fundingMix.pac}%</span>}
            </div>
          </div>
          <div className="cv2-money-legend">
            <div><span className="sw small" /> <b>{fundingMix.small}%</b> Small donors <small>&lt;$200</small></div>
            <div><span className="sw large" /> <b>{fundingMix.large}%</b> Large donors <small>≥$200</small></div>
            <div><span className="sw pac" /> <b>{fundingMix.pac}%</b> PACs <small>groups &amp; lobbies</small></div>
          </div>
          <p className="cv2-pac-gloss">
            <b>PAC</b> = Political Action Committee — companies, unions, or advocacy groups that pool donations to back candidates. High PAC share signals reliance on organized interests over individual voters.
          </p>
        </div>
      )}

      {/* Named issue-PACs. Subtitle clarifies what this section is. */}
      {issuePACs.length > 0 && (
        <div className="cv2-named-pacs">
          <div className="lab">
            Named issue PACs
            <small className="cv2-sub-lab">organized groups we&rsquo;ve vetted, each with a publicly stated agenda</small>
          </div>
          {issuePACs.map((p, i) => {
            const userIssue = (userIssues || []).find(
              iss => iss.canonicalIssue === p.relevantToIssue
            );
            const showAlignment = !!userIssue && !!p.pacStance;
            const conflictsWithUser = showAlignment && p.pacStance === 'against';
            return (
              <div className="cv2-pac-row v2" key={i}>
                <div className="cv2-pac-top">
                  <span className="sw" style={{ background: issuePACSwatch(p.relevantToIssue) }} />
                  <span className="name">{p.label}</span>
                  <span className="amt">{formatDollars(p.amount)}</span>
                </div>
                {p.fullName && p.fullName !== p.label && (
                  <div className="cv2-pac-full">{p.fullName}</div>
                )}
                {p.advocates && (
                  <div className="cv2-pac-advocates">{p.advocates}</div>
                )}
                {showAlignment && (
                  <div className={"cv2-pac-flag " + (conflictsWithUser ? 'conflict' : 'align')}>
                    <span className="ic">{conflictsWithUser ? '⚠' : '✓'}</span>
                    <span className="msg">
                      {conflictsWithUser
                        ? <>Conflicts with your priority: <b>{userIssue.interpretation}</b></>
                        : <>Aligns with your priority: <b>{userIssue.interpretation}</b></>}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* [Δ] PAC coverage callout — moved BELOW the named PACs so readers
          first see what we DO have, then learn about what we don't. */}
      {impliedPacTotal !== null && impliedPacTotal > 0 && (
        issuePACs.length === 0 ? (
          <div className="cv2-pac-gap">
            <span className="ic">!</span>
            <span>
              About <b>{formatDollars(impliedPacTotal)}</b> ({fundingMix.pac}%) came from PACs,
              but we haven't yet identified specific issue-PACs behind that money.
              We only name PACs when we can attribute them to a public agenda
              — see the industry breakdown below for the categorical view.
            </span>
          </div>
        ) : pctIdentified !== null && pctIdentified < 75 ? (
          <div className="cv2-pac-gap partial">
            <span className="ic">!</span>
            <span>
              Named PACs above account for <b>{formatDollars(namedPacTotal)}</b> of
              an estimated <b>{formatDollars(impliedPacTotal)}</b> in total PAC money
              ({pctIdentified}%). The remaining <b>{formatDollars(uncatPacTotal)}</b> hasn't
              been editorially curated yet — it may include other issue-PACs we haven't profiled.
              Don't assume the named PACs are the whole picture.
            </span>
          </div>
        ) : null
      )}

      {/* Industry breakdown — same data but grouped differently.
          [Fix] Industries usually only cover the top sectors; the
          remainder is uncategorized small-dollar / unclassified donors.
          We now render that tail explicitly as a final "Unclassified"
          segment + row, so the bar reads as a true 100% and the gap
          isn't silently swallowed. */}
      {industries.length > 0 && (() => {
        const namedIndustryPct = industries.reduce((s, d) => s + (d.percent || 0), 0);
        const namedIndustryAmt = industries.reduce((s, d) => s + (d.amount || 0), 0);
        const otherPct = Math.max(0, 100 - namedIndustryPct);
        const otherAmt = typeof totalRaised === 'number'
          ? Math.max(0, totalRaised - namedIndustryAmt)
          : null;
        const showOther = otherPct >= 2;
        return (
          <div className="cv2-industry">
            <div className="lab">
              Industry breakdown
              <small className="cv2-sub-lab">all contributions grouped by sector (individuals + PACs combined)</small>
            </div>
            <div className="cv2-industry-bar" aria-hidden="true">
              {industries.map((d, i) => (
                <span key={i} style={{ flex: `${d.percent} 1 0`, background: industrySwatch(d.label) }} />
              ))}
              {showOther && (
                <span className="other-seg" style={{ flex: `${otherPct} 1 0` }} />
              )}
            </div>
            <div className="cv2-industry-list">
              {industries.slice(0, 4).map((d, i) => (
                <div className="row" key={i}>
                  <span className="sw" style={{ background: industrySwatch(d.label) }} />
                  <span className="name">{d.label}</span>
                  <span className="pct">{d.percent}%</span>
                  <span className="amt">{formatDollars(d.amount)}</span>
                </div>
              ))}
              {showOther && (
                <div className="row other" key="other">
                  <span className="sw other-sw" />
                  <span className="name">
                    Outside named sectors
                    <small>Mostly small-dollar &amp; individual donations that don&rsquo;t fit a single sector tag. They&rsquo;re counted in the Funding mix bar above.</small>
                  </span>
                  <span className="pct">{otherPct}%</span>
                  <span className="amt">{otherAmt !== null ? formatDollars(otherAmt) : '—'}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {donorSource && (
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)',
          letterSpacing: '0.04em', marginTop: 12, textAlign: 'left',
        }}>
          Source: {donorSource.name}
          {donorDataSource === 'web_search' && ' · web search'}
        </div>
      )}
    </div>
  );
}

/* ── render helpers ── */
/* formatDollars + anonymizeText now live in prototype-shared.jsx
   (design-system core) so every surface uses one implementation.
   They're available here as bare globals. */

/* anonymizeText now lives in prototype-shared.jsx (design-system core). */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function issuePACSwatch(alignsWith) {
  const map = {
    healthcare_affordability: 'oklch(0.40 0.075 170)',
    reproductive_rights:      'oklch(0.50 0.16 320)',
    environment_climate:      'oklch(0.45 0.10 145)',
    foreign_policy:           'oklch(0.45 0.10 280)',
  };
  return map[alignsWith] || 'oklch(0.55 0.10 30)';
}
/* Industry colors are LABEL-keyed (not index-keyed) so the same
   sector reads the same color everywhere it appears across the
   app — Oil & Gas is always crude-rust, Banking is always navy,
   Healthcare is always sage-teal, etc. Unknown industries fall
   back to a stable hash-picked color from the fallback ring,
   so even uncatalogued sectors don't collide across rows. */
const INDUSTRY_COLORS = {
  'oil & gas':              'oklch(0.42 0.10 35)',    // dark crude
  'banking':                'oklch(0.38 0.10 250)',   // deep navy
  'real estate':            'oklch(0.58 0.06 65)',    // wheat
  'defense':                'oklch(0.42 0.06 115)',   // olive
  'trial lawyers':          'oklch(0.42 0.11 350)',   // burgundy
  'healthcare':             'oklch(0.50 0.09 175)',   // sage teal
  'healthcare workers':     'oklch(0.50 0.09 175)',
  'education':              'oklch(0.50 0.08 295)',   // mauve
  'education · nea':        'oklch(0.50 0.08 295)',
  'tech':                   'oklch(0.55 0.10 220)',   // sky blue
  'construction':           'oklch(0.55 0.10 55)',    // amber
  'energy':                 'oklch(0.62 0.12 90)',    // gold-yellow
  'grassroots small-dollar':'oklch(0.50 0.10 145)',   // meadow green
  'small business assoc':   'oklch(0.58 0.10 25)',    // terracotta
};
const INDUSTRY_FALLBACK = [
  'oklch(0.45 0.08 195)',   // dim cyan
  'oklch(0.50 0.08 330)',   // dusty rose
  'oklch(0.48 0.07 155)',   // moss
  'oklch(0.55 0.08 12)',    // brick
  'oklch(0.45 0.06 270)',   // indigo
  'oklch(0.60 0.08 95)',    // straw
];
function industrySwatch(label) {
  if (!label) return INDUSTRY_FALLBACK[0];
  const key = String(label).trim().toLowerCase();
  if (INDUSTRY_COLORS[key]) return INDUSTRY_COLORS[key];
  // Stable hash so unknown labels keep the same color across renders
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return INDUSTRY_FALLBACK[h % INDUSTRY_FALLBACK.length];
}

/* ============ PropositionCard ============
   No repo target yet — proposition rendering inside ChatPanel
   is freeform AI text today. Worth factoring out in Phase 4
   if propositions get richer than a yes/no toggle. */
function PropositionCard({ race, decision, onVote, onUnvote }) {
  const detail = PROPOSITION_DETAIL[race.id];
  if (!detail) return null;
  const kindMeta = (window.PROPOSITION_KIND_META || {})[detail.kind] || null;
  return (
    <div className="prop-card">
      <div className="ttl">{race.label}</div>

      {/* Kind banner — the load-bearing thing for binding vs advisory.
          Tone-color flips so advisory looks visually distinct. */}
      {kindMeta && (
        <div className={"prop-kind " + kindMeta.tone}>
          <div className="prop-kind-head">
            <span className="prop-kind-tag">{kindMeta.label}</span>
            {detail.state && <span className="prop-kind-state">{detail.state}</span>}
          </div>
          <p className="prop-kind-blurb">{kindMeta.blurb}</p>
        </div>
      )}

      <p className="sub">{detail.summary}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--civic)', marginBottom: 4 }}>If yes</div>
          <div style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{detail.ifYes}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--vote-red)', marginBottom: 4 }}>If no</div>
          <div style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{detail.ifNo}</div>
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

/* ============ BallotPane ============
   Maps to: src/components/BallotPane.tsx (already shipped).

   No structural changes from the repo today other than that
   this prototype lets ballot rows be clickable to focus the
   chat — see the data-cursor parity comment in
   COMPONENT_MAP.md (rows are cursor:default in the repo, this
   prototype makes them tappable because tapping is the only
   way to open the chat on mobile in Pattern B). */
function BallotPane({ races, decisions, activeRaceId, address, onSelectRace, onPrint, onSaveProfile, onContinueElsewhere }) {
  const decidedCount = Object.keys(decisions).length;
  const totalCount = races.length;
  const canPrint = decidedCount > 0;

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
    </aside>
  );
}

/* ============ TweaksPanel ============
   Prototype-only. Not present in the repo.
   Used to A/B the design tokens during early design exploration. */
function TweaksPanel({ tweaks, onChange, hidden, onClose }) {
  const blurbs = {
    'civic|civic|daylight':              'DEFAULT — Plex Serif, civic teal, cream paper.',
    'civic|civic|inkwell':               'Civic, after hours.',
    'civic|constitutional|daylight':     'Plex Serif + navy. Treasury document.',
    'editorial|civic|daylight':          'Editorial serif, teal accent, cream paper.',
    'editorial|civic|inkwell':           'Editorial on ink.',
    'manifesto|civic|daylight':          'Space Grotesk, all-caps, red underline.',
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
  IssueRow,
  CandidateCard,
  CandidateCardHeader,
  AlignmentScoreBanner,
  AlignmentDrilldown,
  FunderBars,
  FundingMixBars,
  PropositionCard,
  BallotPane,
  TweaksPanel,
});
