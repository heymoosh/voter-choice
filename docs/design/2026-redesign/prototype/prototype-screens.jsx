/* ====================================================
   VOTER CHOICE · Pass B screens
   ====================================================
   New screens + dialogs that complete the interaction set.
   Each is a small standalone component the host view mounts
   conditionally. See COMPONENT_MAP.md for repo targets.
   ==================================================== */

const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

/* ============ PartyGate ============
   Maps to: src/components/PartyGate.tsx (Phase 5)

   Repo behavior: shown when the user's state has a closed or
   semi-closed primary with party-lock-to-first-round-primary
   rules — i.e. picking a party in Round 1 locks the voter into
   that party for runoffs.

   Behavior is "advisory" (offer a skip) or "blocking" (must
   pick). This demo treats it as advisory.

   Demo trigger: the Tweaks panel has a "Show party gate" toggle
   (added below) so the screen is reachable end-to-end without
   changing the demo election to a primary. */
function PartyGate({ stateName, electionDate, onPick, onSkip }) {
  return (
    <>
      <AppNav />
      <div className="pg-wrap">
        <div className="pg-card">
          <div className="pg-eyebrow">Texas primary · March 3, 2026</div>
          <h2>Pick a party to research.</h2>
          <p className="pg-lede">
            Texas runs a <b>closed primary</b>. If there's a runoff, you can only vote in the runoff for whichever party's primary you chose in March. The general election in November is unaffected.
          </p>

          <div className="pg-options">
            <button className="pg-opt dem" onClick={() => onPick('Democratic')}>
              <div className="pg-pip" />
              <div className="pg-l">
                <div className="pg-ttl">Democratic primary</div>
                <div className="pg-sub">Research 12 contested Dem races.</div>
              </div>
              <span className="pg-arrow">→</span>
            </button>
            <button className="pg-opt rep" onClick={() => onPick('Republican')}>
              <div className="pg-pip" />
              <div className="pg-l">
                <div className="pg-ttl">Republican primary</div>
                <div className="pg-sub">Research 9 contested GOP races.</div>
              </div>
              <span className="pg-arrow">→</span>
            </button>
            <button className="pg-opt nope" onClick={onSkip}>
              <div className="pg-l">
                <div className="pg-ttl">Just the general election</div>
                <div className="pg-sub">Skip primaries · research the Nov 3 ballot only.</div>
              </div>
              <span className="pg-arrow">→</span>
            </button>
          </div>

          <p className="pg-foot">
            Texas requires this choice now because runoffs (May 26) lock you into the party of your first round. Source: <a href="#" className="pg-src">Texas Secretary of State · Election Code §172.086</a>.
          </p>
        </div>
      </div>
    </>
  );
}

/* ============ AmendmentEditor ============
   Maps to: ConcernInterpretation.tsx + AmendRescoreOffer.tsx (Phase 6)

   Shown as an inline overlay inside the workspace when the user
   clicks "EDIT" on the issues list in the left rail. Unlike the
   cold open, this version preserves all decided picks and shows
   how many would be affected by an issue change.

   Submit triggers `onApply(newIssues)` → host runs the rescore
   and shows AmendDeltaMessage in the chat. */
function AmendmentEditor({ issues, decisionsCount, onApply, onCancel }) {
  const [draft, setDraft] = useStateS(issues.map(i => ({ ...i })));
  const [newIssueText, setNewIssueText] = useStateS('');

  function move(idx, dir) {
    const next = [...draft];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((it, i) => { it.rank = i + 1; });
    setDraft(next);
  }
  function rename(idx, interpretation) {
    const next = [...draft];
    next[idx] = { ...next[idx], interpretation };
    setDraft(next);
  }
  function remove(idx) {
    const next = draft.filter((_, i) => i !== idx);
    next.forEach((it, i) => { it.rank = i + 1; });
    setDraft(next);
  }
  /* Multi-slot reorder for the drag handle (same as cold-open). */
  function reorderDraft(from, to) {
    if (from === to) return;
    const next = [...draft];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    next.forEach((it, i) => { it.rank = i + 1; });
    setDraft(next);
  }
  function addNew() {
    if (!newIssueText.trim()) return;
    const next = [...draft, {
      sourceType: 'freeText',
      sourceText: newIssueText.trim(),
      rank: draft.length + 1,
      interpretation: newIssueText.trim(),
      // Heuristic: map to a canonical issue we have data for. Real app would
      // round-trip through the AI for canonicalIssue assignment.
      canonicalIssue: guessCanonicalIssue(newIssueText.trim()),
      stance: '',
      confidence: 'clear',
      quotes: [{ label: 'just added', text: newIssueText.trim() }],
    }];
    setDraft(next);
    setNewIssueText('');
  }

  return (
    <div className="amend-modal">
      <div className="amend-card">
        <header className="amend-head">
          <div>
            <div className="amend-eyebrow">Amend your issues</div>
            <h3>Re-evaluate {decisionsCount} {decisionsCount === 1 ? 'pick' : 'picks'} against new priorities</h3>
          </div>
          <button className="amend-x" onClick={onCancel} aria-label="Close">×</button>
        </header>

        <p className="amend-help">
          Re-rank, rename, remove, or add issues. When you save, I'll re-score every candidate you've already picked and surface any whose score shifts past the noise floor.
        </p>

        <div className="amend-list">
          {draft.map((iss, i) => (
            <IssueRow
              key={iss.canonicalIssue || iss.sourceText || i}
              issue={iss}
              index={i}
              total={draft.length}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              onReorderTo={reorderDraft}
              onRename={(name) => rename(i, name)}
              onRemove={() => remove(i)}
            />
          ))}
        </div>

        <div className="amend-add">
          <input
            type="text"
            placeholder="Add a new issue — e.g. clean energy permitting, school book bans, immigration enforcement…"
            value={newIssueText}
            onChange={(e) => setNewIssueText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNew(); }}
          />
          <button className="amend-add-btn" disabled={!newIssueText.trim()} onClick={addNew}>+ Add</button>
        </div>

        <footer className="amend-foot">
          <button className="amend-cancel" onClick={onCancel}>Cancel</button>
          <button className="amend-apply" disabled={draft.length === 0} onClick={() => onApply(draft)}>
            Apply &amp; re-score →
          </button>
        </footer>
      </div>
    </div>
  );
}

// Quick heuristic mapping for the demo. Real app: AI extraction.
function guessCanonicalIssue(text) {
  const t = text.toLowerCase();
  if (/insulin|drug|medicare|health|hospital/.test(t)) return 'healthcare_affordability';
  if (/rent|housing|cost of living|mortgage/.test(t)) return 'housing_affordability';
  if (/stock|disclosure|congress|trading|term limits/.test(t)) return 'congressional_accountability';
  if (/climate|environment|carbon|emissions/.test(t)) return 'environment_climate';
  if (/abortion|reproductive|roe/.test(t)) return 'reproductive_rights';
  if (/gun|firearm|second amendment/.test(t)) return 'gun_rights_safety';
  if (/immigration|border|asylum/.test(t)) return 'immigration';
  if (/school|education|teacher/.test(t)) return 'education_funding';
  // Fallback — would surface as "Thin record on this issue" everywhere
  return 'unrecognized_issue';
}

/* ============ AmendDeltaMessage ============
   Maps to: src/components/AmendDeltaMessage.tsx (Phase 6)

   A chat bubble inserted after an amend. Lists the races whose
   aggregate alignment % shifted by more than the noise floor.
   Each row has a "Revisit" link that jumps to that race. */
function AmendDeltaMessage({ deltas, onRevisit }) {
  return (
    <div className="msg ai">
      <div className="who">Voter Choice · AI</div>
      <div className="bubble amend-delta">
        <p><b>Re-scored.</b> Here's how your prior picks shift against the new issue list:</p>
        <div className="ad-list">
          {deltas.map((d, i) => {
            const dir = d.newPct > d.oldPct ? 'up' : d.newPct < d.oldPct ? 'down' : 'flat';
            const diff = d.newPct - d.oldPct;
            return (
              <div className={"ad-row " + dir + (d.significant ? ' significant' : '')} key={i}>
                <div className="ad-race">
                  <div className="ad-tag">{d.significant ? 'REVISIT' : 'unchanged'}</div>
                  <div className="ad-name">{d.raceLabel}</div>
                  <div className="ad-pick">Your pick: {d.pick}</div>
                </div>
                <div className="ad-score">
                  <div className="ad-old">{d.oldPct}%</div>
                  <div className="ad-arrow">{dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'}</div>
                  <div className="ad-new">{d.newPct}%</div>
                  <div className="ad-diff">{diff > 0 ? '+' : ''}{diff} pts</div>
                </div>
                {d.significant && (
                  <button className="ad-revisit" onClick={() => onRevisit(d.raceId)}>Revisit →</button>
                )}
              </div>
            );
          })}
        </div>
        <p className="ad-foot">
          Only races where the change is bigger than 5pts get a REVISIT flag. The others stay on your ballot as-is.
        </p>
      </div>
    </div>
  );
}

/* ============ AmendRescoreOffer ============
   Maps to: src/components/AmendRescoreOffer.tsx (Phase 6)

   A small follow-up message after AmendDeltaMessage offering
   to walk through revisits in order. */
function AmendRescoreOffer({ revisitCount, onWalkthrough, onDismiss }) {
  if (revisitCount === 0) {
    return (
      <div className="msg ai">
        <div className="who">Voter Choice · AI</div>
        <div className="bubble">
          <p>None of your prior picks crossed the threshold for a revisit. Continue where you left off.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="msg ai">
      <div className="who">Voter Choice · AI</div>
      <div className="bubble">
        <p>Want me to walk you through the {revisitCount} {revisitCount === 1 ? 'race' : 'races'} flagged for revisit, one at a time?</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="rescore-yes" onClick={onWalkthrough}>Yes, walk me through them →</button>
          <button className="rescore-no" onClick={onDismiss}>No, I'll come back later</button>
        </div>
      </div>
    </div>
  );
}

/* ============ BudgetExhaustedModal ============
   Maps to: src/components/BudgetExhausted.tsx (Phase 9)

   Shown when the user clicks "Continue in another chatbot" OR
   automatically when the conversation has exceeded a budget
   threshold (mocked: 6+ decisions for demo).

   Renders a portable prompt the user can paste into any
   chatbot (Claude, ChatGPT, Gemini) to continue without losing
   their place. */
function BudgetExhaustedModal({ open, address, issues, decisions, racesRemaining, onClose }) {
  const [copied, setCopied] = useStateS(false);
  const textareaRef = useRefS(null);

  if (!open) return null;

  const portablePrompt = buildPortablePrompt({ address, issues, decisions, racesRemaining });

  function copyToClipboard() {
    if (textareaRef.current) {
      textareaRef.current.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {}
    }
  }

  return (
    <div className="be-modal-overlay" onClick={onClose}>
      <div className="be-modal" onClick={(e) => e.stopPropagation()}>
        <header className="be-head">
          <div>
            <div className="be-eyebrow">Continue elsewhere · context handoff</div>
            <h3>Take your research with you.</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <p className="be-lede">
          You've decided <b>{Object.keys(decisions).length}</b> of {Object.keys(decisions).length + racesRemaining} races. Copy the prompt below and paste it into any chatbot — Claude, ChatGPT, Gemini, Grok — to pick up where you left off. Voter Choice runs on AI budget that costs us money; we'd rather hand you off than burn through ours.
        </p>

        <div className="be-prompt">
          <div className="be-prompt-head">
            <span className="be-prompt-lab">Portable prompt</span>
            <button className="be-copy" onClick={copyToClipboard}>
              {copied ? '✓ Copied' : 'Copy →'}
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="be-prompt-text"
            readOnly
            value={portablePrompt}
          />
        </div>

        <div className="be-extras">
          <button className="be-ext-btn">
            <span className="be-ext-ic">↓</span>
            Also download my profile as .txt
          </button>
          <button className="be-ext-btn">
            <span className="be-ext-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </span>
            Print my draft ballot
          </button>
        </div>

        {/* BYOK inline — when AI budget runs out, the user has three
            options: continue elsewhere (portable prompt above), bring
            their own key (here), or tip-jar the next user's session.
            All three live in one modal so the user sees the full
            menu of alternatives, not just "go away to another bot." */}
        <BudgetExhaustedByok onClose={onClose} />

        <footer className="be-foot">
          Your address never leaves this device. The portable prompt above contains your issues + draft picks + the races still to decide — no personally-identifying information.
        </footer>
      </div>
    </div>
  );
}

/* ============ BudgetExhaustedByok ============
   Inline BYOK card inside BudgetExhaustedModal. The Settings drawer
   has the canonical version of this — this one is positioned at the
   handoff moment so the user sees BYOK as an alternative to "leave."

   Repo target: (new — embed into src/components/BudgetExhausted.tsx)
   Shares storage key with src/lib/anthropic-client-byok.ts. */
function BudgetExhaustedByok({ onClose }) {
  const [keyDraft, setKeyDraft] = useStateS('');
  const [savedKey, setSavedKey] = useStateS(null);
  const [status, setStatus] = useStateS(null);

  useEffectS(() => {
    setSavedKey(window.getByokKey ? window.getByokKey() : null);
  }, []);

  function saveKey() {
    const k = keyDraft.trim();
    if (!k.startsWith('sk-ant-')) {
      setStatus({ tone: 'error', text: "Doesn't look like an Anthropic key (should start with sk-ant-)." });
      return;
    }
    if (window.setByokKey) window.setByokKey(k);
    setSavedKey(k);
    setKeyDraft('');
    setStatus({ tone: 'ok', text: 'Saved. Chat now uses your account.' });
  }
  function clearKey() {
    if (window.removeByokKey) window.removeByokKey();
    setSavedKey(null);
    setStatus({ tone: 'ok', text: 'Removed. Back to the community budget.' });
  }
  function maskKey(k) {
    if (!k) return '';
    return k.length < 12 ? k : k.slice(0, 7) + '…' + k.slice(-4);
  }

  return (
    <section className="be-byok" aria-labelledby="be-byok-ttl">
      <h4 id="be-byok-ttl" className="be-byok-ttl">Have an Anthropic API key? Use it directly in Voter Choice.</h4>
      <p className="be-byok-sub">Your key stays in your browser. Never sent to our server.</p>
      {savedKey ? (
        <div className="be-byok-saved">
          <div className="be-byok-mask">
            <span className="be-byok-lab">Saved key</span>
            <code>{maskKey(savedKey)}</code>
          </div>
          <button className="be-byok-clear" onClick={clearKey}>Remove</button>
        </div>
      ) : (
        <div className="be-byok-row">
          <div className="be-byok-input-wrap">
            <input
              type="password"
              placeholder="sk-ant-..."
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
              spellCheck="false"
              autoComplete="off"
              aria-label="Anthropic API key"
            />
            <span className="be-byok-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </span>
          </div>
          <button className="be-byok-save" onClick={saveKey} disabled={!keyDraft.trim()}>
            Save &amp; continue
          </button>
        </div>
      )}
      <p className="be-byok-hint">Starts with sk-ant-.</p>
      {status && <p className={"be-byok-status " + status.tone}>{status.text}</p>}

      {/* Tip-jar mention — italic mono micro-copy, very low key. The
          intent is to acknowledge the community AI budget has a real
          cost, but not to extract anything. NOT REQUIRED is deliberate. */}
      <p className="be-tipjar">
        Voter Choice is free. If it helped, a tip helps keep it free —{' '}
        <a
          onClick={() => { window.__navigate && window.__navigate('tip'); onClose && onClose(); }}
          role="link"
          tabIndex={0}
        >TIP JAR</a> · not required.
      </p>
    </section>
  );
}

function buildPortablePrompt({ address, issues, decisions, racesRemaining }) {
  const issueList = issues.map((i, idx) =>
    `  ${idx + 1}. ${i.interpretation} — ${i.stance || 'stance not yet recorded'}`
  ).join('\n');

  const picks = Object.entries(decisions).map(([raceId, d]) => {
    const r = RACES.find(x => x.id === raceId);
    return `  • ${r?.label || raceId}: ${d.pick}${d.party ? ' (' + d.party + ')' : ''}${d.why ? ' — "' + d.why + '"' : ''}`;
  }).join('\n');

  // [Δ] Include the parsed remaining ballot so the receiving AI doesn't
  // have to re-extract the ballot from the user's address. This is the
  // single biggest accuracy + UX win for handoffs.
  const remainingRaces = RACES.filter(r => !decisions[r.id]);
  const remainingList = remainingRaces.map(r => {
    const cands = (r.candidates && r.candidates.length > 0)
      ? r.candidates.map(c => `${c.name} (${(c.party || '').slice(0, 1)})`).join(' vs. ')
      : '(ballot proposition — yes/no)';
    return `  • [${r.section}] ${r.label} — ${cands}`;
  }).join('\n');

  return `I'm researching my Nov 3, 2026 ballot for Harris County, TX.

I started in Voter Choice (a non-partisan tool that scores candidates on actual voting + donor records). Their AI budget is exhausted — I want to continue this conversation with you.

MY PRIORITIES (in order, with the direction I want):
${issueList}

DECISIONS SO FAR (${Object.keys(decisions).length} of ${Object.keys(decisions).length + racesRemaining} races):
${picks || '  (none yet)'}

STILL TO DECIDE (${racesRemaining} ${racesRemaining === 1 ? 'race' : 'races'}) — already parsed from my ballot:
${remainingList || '  (none — ballot complete)'}

For each remaining race above, please:
  1. Pull the candidates' actual voting records (if incumbents) from Congress.gov / state legislature data
  2. Pull their FEC / OpenSecrets donor breakdowns — break out small-donor % vs PAC %
  3. Score each candidate against my priorities above with SOURCED evidence (bill numbers, donor amounts, links)
  4. If a candidate has no record (first-time candidate), say so explicitly. Don't invent votes or donor amounts.
  5. For propositions, summarize what passing vs failing actually does — not the ballot title.

Start with whichever remaining race you think has the highest stakes. Ask me which race first if you're unsure.`;
}

/* ============ ProfileResumeModal ============
   Maps to: (new — feature on src/app/page.tsx)

   Opened by clicking "Drop your saved .txt profile →" on home.
   For the demo, the "use sample" button is the wired path —
   the file drop is a placeholder. */
function ProfileResumeModal({ open, onClose, onResume }) {
  if (!open) return null;

  return (
    <div className="be-modal-overlay" onClick={onClose}>
      <div className="be-modal pr-modal" onClick={(e) => e.stopPropagation()}>
        <header className="be-head">
          <div>
            <div className="be-eyebrow">Resume from saved profile</div>
            <h3>Drop your .txt profile.</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <p className="be-lede">
          If you saved your profile from a previous session, drop the .txt here. Your priorities and draft picks restore. Your address is still kept on this device only.
        </p>

        <div className="pr-dropzone">
          <div className="pr-drop-ic">↓</div>
          <div className="pr-drop-lab">Drop your saved profile here</div>
          <div className="pr-drop-or">or</div>
          <label className="pr-drop-file">
            Choose file…
            <input type="file" accept=".txt" style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="pr-sample" onClick={onResume}>
            Demo: load a sample profile →
          </button>
        </div>

        <footer className="be-foot">
          Your profile lives only on the device you saved it from. We don't store profiles on our servers — they'd just be another tracking vector.
        </footer>
      </div>
    </div>
  );
}

const SAMPLE_RESUME_PROFILE = {
  issues: [
    {
      sourceType: 'freeText',
      sourceText: 'previously saved profile',
      rank: 1,
      interpretation: 'Insulin & drug pricing',
      canonicalIssue: 'healthcare_affordability',
      stance: 'voter favors lower drug prices and Medicare drug-price negotiation',
      confidence: 'clear',
      quotes: [{ label: 'restored', text: 'from your saved .txt profile' }],
    },
    {
      sourceType: 'freeText',
      sourceText: 'previously saved profile',
      rank: 2,
      interpretation: 'Cost of living & rent',
      canonicalIssue: 'housing_affordability',
      stance: 'voter favors stronger rent protections',
      confidence: 'clear',
      quotes: [{ label: 'restored', text: 'from your saved .txt profile' }],
    },
  ],
  decisions: {
    'us-house-tx7': { pick: 'Jordan Hartman', party: 'D', why: 'previously saved — strong on healthcare', candidateName: 'Jordan Hartman' },
    'governor-tx':  { pick: 'Beto O\u2019Rourke', party: 'D', why: 'previously saved — grassroots funding base',  candidateName: 'Beto O\u2019Rourke' },
  },
};

/* ============ CompareModal ============
   Maps to: (new — wired from chat header Compare button)

   Mobile-first redesign: stacked issue-by-issue panels instead of
   a side-by-side table. Each issue row gets full width with two
   bars (Candidate A / B) shown one above the other, so percentages
   are always legible at any viewport.

   Blind mode hides candidate names; reveal toggle at top flips them. */
function CompareModal({ open, race, issues, blindMode, revealedCandidates, onRevealCandidate, onClose }) {
  const [expandedKey, setExpandedKey] = useStateS(null); // `${candidateId}|${canonicalIssue}`
  if (!open) return null;

  const patterns = getRacePatternsForRace(race.id);
  const alignmentBlk = getAlignmentScoresForRace(race.id);
  const candidates = patterns?.candidates || [];

  if (candidates.length < 2) return null;

  function displayLabel(cand, idx) {
    // Single source of truth (design-system core). Adapt its shape to
    // the {primary, secondary, isBlind, alias} this modal already uses.
    const id = getCandidateIdentity(cand, { blindMode, revealed: revealedCandidates, index: idx });
    return {
      primary: id.displayName,
      secondary: id.isBlind ? id.secondary : (cand.priorRole || ''),
      isBlind: id.isBlind,
      alias: id.alias,
    };
  }

  const labels = candidates.map((c, i) => displayLabel(c, i));
  const allBlind = labels.every(l => l.isBlind);
  const anyBlind = labels.some(l => l.isBlind);

  return (
    <div className="be-modal-overlay" onClick={onClose}>
      <div className="cmp-modal v2" onClick={(e) => e.stopPropagation()}>
        <header className="cmp-head">
          <div>
            <div className="be-eyebrow">Side-by-side · {race.label}</div>
            <h3>{allBlind ? 'Same record, same issues — names hidden.' : 'Same record, same issues, both candidates.'}</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        {/* Top header showing both candidates as A / B with reveal */}
        <div className="cmp-roster">
          {candidates.map((c, i) => {
            const lab = labels[i];
            return (
              <div className={"cmp-roster-card " + (lab.isBlind ? 'blind' : '')} key={c.id}>
                <div className="cmp-alias">Candidate {lab.alias}</div>
                <div className="cmp-roster-name">{lab.primary}</div>
                {!lab.isBlind && lab.secondary && (
                  <div className="cmp-roster-role">{lab.secondary}</div>
                )}
                {lab.isBlind && (
                  <button className="cmp-reveal" onClick={() => onRevealCandidate(c.id)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Reveal</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Per-issue stacked panels */}
        <div className="cmp-issues">
          {issues.map(iss => (
            <div className="cmp-issue-panel" key={iss.canonicalIssue}>
              <div className="cmp-issue-head">
                <div className="cmp-issue-name">{iss.interpretation}</div>
                {iss.stance && (
                  <div className="cmp-issue-stance">{iss.stance}</div>
                )}
              </div>

              {candidates.map((c, ci) => {
                const lab = labels[ci];
                const entry = alignmentBlk?.entries?.find(e => e.candidateId === c.id);
                const score = entry?.scores?.find(s => s.canonicalIssue === iss.canonicalIssue);
                const expandKey = `${c.id}|${iss.canonicalIssue}`;
                const isExpanded = expandedKey === expandKey;
                let body;
                if (!score && entry?.unavailable) {
                  body = <div className="cmp-score-row na">No legislative record</div>;
                } else if (!score) {
                  body = <div className="cmp-score-row na">—</div>;
                } else {
                  const pct = score.total > 0 ? Math.round((score.kept / score.total) * 100) : 0;
                  const tone = pct >= 65 ? '' : pct >= 50 ? 'mid' : 'low';
                  const hasVotes = !!(score.contributingVotes?.length);
                  body = (
                    <>
                      <div className={"cmp-score-row " + tone}>
                        <div className="cmp-bar">
                          <div className={"cmp-bar-fill " + tone} style={{ width: pct + '%' }} />
                        </div>
                        <div className="cmp-pct">{pct}<small>%</small></div>
                        <div className="cmp-meta">{score.kept} of {score.total} votes</div>
                      </div>
                      {hasVotes && (
                        <button
                          className="cmp-expand"
                          onClick={() => setExpandedKey(isExpanded ? null : expandKey)}
                        >
                          {isExpanded ? '▴ Hide votes' : `▾ View the ${score.contributingVotes.length} ${score.contributingVotes.length === 1 ? 'vote' : 'votes'}`}
                        </button>
                      )}
                      {isExpanded && hasVotes && (
                        <div className="cmp-votes">
                          {score.contributingVotes.map((v, vi) => (
                            <div className="cmp-vote" key={vi}>
                              <div className="cmp-vote-head">
                                <span className="cmp-vote-num">{(v.billTitle || '').split(' · ')[0]}</span>
                                <span className={"cmp-vote-badge " + (v.voteCast === 'with' ? 'yea' : v.voteCast === 'against' ? 'nay' : 'other')}>
                                  {v.voteCast === 'with' ? 'WITH YOU' : v.voteCast === 'against' ? 'AGAINST YOU' : '—'}
                                </span>
                              </div>
                              <div className="cmp-vote-ttl">{(v.billTitle || '').split(' · ')[1] || ''}</div>
                              {v.narrative && <p className="cmp-vote-narr">{(window.anonymizeText ? window.anonymizeText(v.narrative, { blindMode: lab.isBlind, realLastName: c.name?.split(' ').pop(), alias: lab.primary }) : v.narrative)}</p>}
                              <div className="cmp-vote-cite">
                                {v.source?.url ? (
                                  <a href={v.source.url} target="_blank" rel="noopener noreferrer">
                                    {v.source.name} →
                                  </a>
                                ) : (
                                  <span>{v.source?.name || 'Source pending'}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                }
                return (
                  <div className="cmp-cand-row" key={c.id}>
                    <div className="cmp-cand-tag">{lab.primary}</div>
                    <div className="cmp-cand-body">{body}</div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Funding mix panel — two horizontal bars stacked */}
          <div className="cmp-issue-panel funding">
            <div className="cmp-issue-head">
              <div className="cmp-issue-name">Funding mix</div>
              <div className="cmp-issue-stance">small / large individual / PAC</div>
            </div>
            {candidates.map((c, ci) => {
              const lab = labels[ci];
              return (
                <div className="cmp-cand-row" key={c.id}>
                  <div className="cmp-cand-tag">
                    {lab.primary}
                    {c.totalRaised && <span className="cmp-total">{window.__formatDollars ? window.__formatDollars(c.totalRaised) : '$' + c.totalRaised}</span>}
                  </div>
                  {c.fundingMix ? (
                    <div className="cmp-money-row">
                      <FundingMixBars mix={c.fundingMix} labelMin={15} />
                    </div>
                  ) : (
                    <div className="cmp-score-row na">—</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {anyBlind && (
          <footer className="cmp-foot">
            <span className="ic">⚠</span>
            <span className="cmp-foot-text">Candidate identities are hidden so you decide on the record. Tap <b>Reveal</b> at the top when you're ready to see who's who.</span>
          </footer>
        )}
      </div>
    </div>
  );
}

/* ============ AllVotesPanel ============
   Opened by clicking "See all votes →" on a candidate card. */
function AllVotesPanel({ open, candidate, alignmentEntry, blindMode, alias, onClose }) {
  const [filter, setFilter] = useStateS('all');
  if (!open || !candidate) return null;

  const anonCtx = { blindMode, realLastName: candidate?.name?.split(' ').pop(), alias };

  const allVotes = [];
  (alignmentEntry?.scores || []).forEach(score => {
    (score.contributingVotes || []).forEach(v => {
      allVotes.push({ ...v, issueLabel: score.issueLabel, canonicalIssue: score.canonicalIssue });
    });
  });

  const issueLabels = [...new Set(allVotes.map(v => v.canonicalIssue))];
  const filtered = filter === 'all' ? allVotes : allVotes.filter(v => v.canonicalIssue === filter);

  const headerName = blindMode ? alias : candidate.name;

  return (
    <div className="be-modal-overlay" onClick={onClose}>
      <div className="av-panel" onClick={(e) => e.stopPropagation()}>
        <header className="av-head">
          <div>
            <div className="be-eyebrow">{headerName} · all curated votes</div>
            <h3>{allVotes.length} votes across {issueLabels.length} of your issues</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="av-filters">
          <button className={"av-filter " + (filter === 'all' ? 'active' : '')} onClick={() => setFilter('all')}>
            All <span className="av-filter-ct">{allVotes.length}</span>
          </button>
          {issueLabels.map(ci => {
            const count = allVotes.filter(v => v.canonicalIssue === ci).length;
            const label = allVotes.find(v => v.canonicalIssue === ci).issueLabel;
            return (
              <button key={ci} className={"av-filter " + (filter === ci ? 'active' : '')} onClick={() => setFilter(ci)}>
                {label} <span className="av-filter-ct">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="av-list">
          {filtered.length === 0 && (
            <p style={{ padding: 20, color: 'var(--ink-3)', fontStyle: 'italic' }}>No votes on this issue yet.</p>
          )}
          {filtered.map((v, i) => (
            <div className="av-vote" key={i}>
              <div className="av-vote-head">
                <div>
                  <div className="av-vote-num">{(v.billTitle || '').split(' · ')[0]}</div>
                  <div className="av-vote-ttl">{(v.billTitle || '').split(' · ')[1] || ''}</div>
                </div>
                <div className={"vote-badge " + (v.voteCast === 'with' ? 'yea' : v.voteCast === 'against' ? 'nay' : 'other')}>
                  {v.voteCast === 'with' ? 'WITH YOU' : v.voteCast === 'against' ? 'AGAINST YOU' : '—'}
                </div>
              </div>
              <div className="av-vote-meta">
                <span className="av-vote-tag">{v.issueLabel}</span>
                <span>{new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {v.narrative && <p className="av-vote-narr">{(window.anonymizeText ? window.anonymizeText(v.narrative, anonCtx) : v.narrative)}</p>}
              <div className="av-vote-cite">
                <span className="src-chip">{v.source.name}</span>
                {v.source.url && <a className="src-link" href={v.source.url} target="_blank" rel="noopener noreferrer">View roll call →</a>}
              </div>
            </div>
          ))}
        </div>

        {/* Methodology footer — how we know "WITH/AGAINST you" */}
        <footer className="av-method">
          <div className="av-method-head">How we know</div>
          <p>
            <b>“With you” / “against you”</b> is computed by comparing each roll-call vote to your stated stance on the issue this bill touches.
          </p>
          <ul className="av-method-sources">
            <li>
              Vote data:{' '}
              <a href="https://www.congress.gov/roll-call-votes" target="_blank" rel="noopener noreferrer">Congress.gov · federal roll calls</a>{' · '}
              <a href="https://capitol.texas.gov/Reports/Daily/Default.aspx" target="_blank" rel="noopener noreferrer">TX Legislature daily reports</a>
            </li>
            <li>
              Narrative context:{' '}
              <a href="https://can2026.org" target="_blank" rel="noopener noreferrer">CAN2026 case files</a>{' · '}
              <a href="#" target="_blank" rel="noopener noreferrer">our methodology</a>
            </li>
            <li>
              Donor breakdowns:{' '}
              <a href="https://www.opensecrets.org" target="_blank" rel="noopener noreferrer">OpenSecrets</a>{' · '}
              <a href="https://www.fec.gov" target="_blank" rel="noopener noreferrer">FEC committee filings</a>
            </li>
          </ul>
          <p className="av-method-disclaim">
            We don’t generate vote claims from AI — if a vote isn’t in our database, we don’t show it. Every claim on every card links to a primary source.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* Helper used by CompareModal — money formatting now lives in
   prototype-shared.jsx; window.__formatDollars points at it. */

Object.assign(window, {
  PartyGate,
  AmendmentEditor,
  AmendDeltaMessage,
  AmendRescoreOffer,
  BudgetExhaustedModal,
  ProfileResumeModal,
  CompareModal,
  AllVotesPanel,
  SAMPLE_RESUME_PROFILE,
  buildPortablePrompt,
  guessCanonicalIssue,
});
