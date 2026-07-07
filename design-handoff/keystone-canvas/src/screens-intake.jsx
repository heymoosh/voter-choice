/* ====================================================
   "DEFINING YOUR ISSUES" — end-to-end flow, new design
   Intake cold-open → AI proposes + BOUNDED disambiguation (one tap,
   not a back-and-forth) → locked with jurisdiction → then the seeded
   edit-issues modal and the re-score delta. Bold Flag white ground.
   ==================================================== */

/* shared bits */
function IqMsg({ who, children }) {
  return (
    <div className={"iq-msg " + who}>
      <div className="iq-who">{who === "user" ? "You" : "Voter Choice · AI"}</div>
      <div className="iq-bubble">{children}</div>
    </div>
  );
}

function IqRow({ rank, name, you, juris, added }) {
  return (
    <div className={"iq-row" + (added ? " added" : "")}>
      <span className="iq-grip">⋮⋮</span>
      <span className="iq-rank">{rank}</span>
      <span className="iq-name">{name}{added && <span className="iq-newtag" style={{ marginLeft: 8 }}>New</span>}{you && <span className="you">“{you}”</span>}</span>
      <span className="iq-acts"><button className="iq-act">✎</button><button className="iq-act">✕</button></span>
    </div>
  );
}

function IqComposer({ chips, placeholder, primary, lock }) {
  return (
    <div className="iq-foot">
      <div className="iq-foot-inner">
        {chips && chips.length > 0 && (
          <div className="iq-chips">{chips.map((c) => <button key={c} className="iq-chip">{c}</button>)}</div>
        )}
        {lock
          ? <button className="iq-send iq-lock btn-primary">{primary}</button>
          : (
            <div className="iq-composer">
              <textarea placeholder={placeholder}></textarea>
              <button className="iq-send">Send →</button>
            </div>
          )}
        <div className="iq-privacy"><span className="dot">●</span> Nothing leaves your browser until you lock these in</div>
      </div>
    </div>
  );
}

function IqShell({ step, children, foot }) {
  return (
    <div className="screen" data-palette="white">
      <div className="iq">
        <div className="flagbar"><i></i><i></i><i></i></div>
        <SCNav />
        <div className="iq-ctx"><span className="b">1100 Congress Ave, Austin, TX 78701 · your 3 members of Congress</span><span className="step">{step}</span></div>
        <div className="iq-stage"><div className="iq-conv">{children}</div></div>
        {foot}
      </div>
    </div>
  );
}

/* 1 · COLD OPEN — the ask */
function IntakeAsk() {
  return (
    <IqShell step="Step 1 of 3 · your issues" foot={<IqComposer placeholder="Things that have been on your mind — frustrations, hopes, fights you've watched in your community…" />}>
      <div className="iq-ask">
        <span className="ask-k kick"><span className="star">★</span> Before you meet your delegation</span>
        <h1>What should your representatives be <em>working on?</em></h1>
        <p>I've pulled your three members of Congress. Before I show you their records, tell me what you're judging them on — in your own words. As much or as little as you like.</p>
        <IqMsg who="ai">What's been on your mind this year that you wish Washington would actually do something about?</IqMsg>
      </div>
    </IqShell>
  );
}

/* 2 · PROPOSE + conversational disambiguation (quick replies, not a quiz) */
function IntakePropose() {
  return (
    <IqShell step="Step 1 of 3 · refine" foot={<IqComposer chips={["That's not quite right — let me explain", "Add something I forgot"]} placeholder="Tell me in your own words — what's biting hardest?" />}>
      <IqMsg who="user">Drug prices are insane, my rent keeps climbing, and honestly the economy in general.</IqMsg>
      <IqMsg who="ai">Got it — two clear ones are below. When you say <b>“the economy in general,”</b> what's biting hardest — the cost of everyday life, jobs and pay, taxes? <b>Tell me in your own words below</b>, or tap a quick reply if one fits.</IqMsg>

      <div className="iq-card">
        <div className="iq-card-head"><h4>Your issues so far</h4><span className="of">2 clear · 1 to pin down</span></div>
        <div className="iq-rows">
          <IqRow rank="1" name="Healthcare &amp; drug costs" you="drug prices are insane" juris="FEDERAL" />
          <IqRow rank="2" name="Housing &amp; rent affordability" you="my rent keeps climbing" juris="STATE" />
        </div>
      </div>

      <div className="iq-quick">
        <div className="iq-quick-lab">Quick replies</div>
        <div className="iq-opts">
          <button className="iq-opt">Cost of living &amp; inflation</button>
          <button className="iq-opt">Jobs &amp; wages</button>
          <button className="iq-opt">Taxes</button>
          <button className="iq-opt multi">All of it</button>
        </div>
      </div>
    </IqShell>
  );
}

/* 3 · LOCKED — jurisdiction summary + lock CTA */
function IntakeLocked() {
  return (
    <IqShell step="Step 1 of 3 · ready" foot={<IqComposer lock primary="Lock these in & meet your delegation →" />}>
      <IqMsg who="user">Cost of living &amp; inflation — that's the one.</IqMsg>
      <IqMsg who="ai">Perfect. Here's your final list. Re-rank or rename anything; otherwise you're ready to meet your delegation.</IqMsg>

      <div className="iq-card">
        <div className="iq-card-head"><h4>Your issues — make them yours.</h4><span className="of">3 issues · edit freely</span></div>
        <div className="iq-card-sub">Drag to re-rank · click a name to rename · remove anything that's not yours.</div>
        <div className="iq-rows">
          <IqRow rank="1" name="Healthcare &amp; drug costs" juris="FEDERAL" />
          <IqRow rank="2" name="Cost of living &amp; inflation" juris="FEDERAL" />
          <IqRow rank="3" name="Housing &amp; rent affordability" juris="STATE" />
        </div>
      </div>

      <div className="iq-locked">
        <span className="tick">✓</span>
        <div>
          <div className="lt">Your issues are set.</div>
          <div className="ls">These travel with every record we show you.</div>
        </div>
      </div>
    </IqShell>
  );
}

/* 4 · EDIT ISSUES from the workspace — seeded modal (with disambiguation) */
function EditIssues() {
  return (
    <div className="screen" data-palette="white">
      <div className="iq" style={{ position: "relative" }}>
        {/* dimmed workspace behind */}
        <div className="amd-back">
          <div className="flagbar"><i></i><i></i><i></i></div>
          <SCNav />
          <div className="res-context"><span className="rc-back">← Seats</span><span className="rc-issues"><span className="rc-lab">Your issues</span><span className="chip-issue">Healthcare &amp; drug costs</span><span className="chip-issue">Cost of living</span><span className="chip-issue edit">Edit</span></span></div>
          <div style={{ padding: "40px" }}><div className="rcard" style={{ maxWidth: 560, margin: "0 auto" }}><div className="rcard-head"><div className="rcard-avatar">?</div><div className="rcard-who"><div className="blind">This seat's incumbent</div></div></div></div></div>
        </div>

        <div className="amd-overlay">
          <div className="amd-modal">
            <div className="flagbar"><i></i><i></i><i></i></div>
            <div className="amd-head">
              <div>
                <div className="amd-eyebrow">Amend your issues</div>
                <h3>Re-rank, rename, add — or tell me what's changed.</h3>
              </div>
              <button className="amd-x">×</button>
            </div>
            <div className="amd-body">
              <p className="amd-lede">Your verdicts are kept. When you apply, I re-score every member against the new list and flag any whose alignment shifts past the noise floor.</p>

              <IqMsg who="user">Add immigration — it matters to me now.</IqMsg>

              <div className="iq-card">
                <div className="iq-card-head"><h4>Your issues</h4><span className="of">4 issues</span></div>
                <div className="iq-rows">
                  <IqRow rank="1" name="Healthcare &amp; drug costs" juris="FEDERAL" />
                  <IqRow rank="2" name="Cost of living &amp; inflation" juris="FEDERAL" />
                  <IqRow rank="3" name="Housing &amp; rent affordability" juris="STATE" />
                  <IqRow rank="4" name="Immigration &amp; border" juris="FEDERAL" added />
                </div>
              </div>

              <IqMsg who="ai">Added. <b>“Immigration”</b> covers a lot of ground — say a little about what you care about most, and I'll measure them on that. A quick reply works too.</IqMsg>
              <div className="iq-quick">
                <div className="iq-quick-lab">Quick replies</div>
                <div className="iq-opts">
                  <button className="iq-opt">Border security &amp; enforcement</button>
                  <button className="iq-opt">Legal immigration &amp; visas</button>
                  <button className="iq-opt">Asylum &amp; the courts</button>
                  <button className="iq-opt multi">Their overall record</button>
                </div>
              </div>
              <div className="amd-composer">
                <textarea placeholder="In your own words — what about immigration matters to you?"></textarea>
                <button className="iq-send">Send →</button>
              </div>
            </div>
            <div className="amd-foot">
              <button className="amd-cancel">Cancel — keep my current issues</button>
              <button className="amd-apply">Apply &amp; re-score →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 5 · RE-SCORE DELTA — what changed, with REVISIT flags */
function EditRescored() {
  return (
    <IqShell step="Re-scored · verdicts kept" foot={<IqComposer lock primary="Back to your delegation →" />}>
      <IqMsg who="user">Apply &amp; re-score.</IqMsg>
      <div className="iq-delta">
        <div className="iq-delta-head"><span className="k">Re-scored against 4 issues</span><h3>Two seats are worth another look.</h3></div>
        <div className="ad-list">
          <div className="ad-row significant">
            <div className="ad-race"><div className="ad-tag">Revisit</div><div className="ad-name">U.S. House · TX-21</div></div>
            <div className="ad-score"><span className="ad-old">58%</span><span className="ad-arrow down">↓</span><span className="ad-new down">41%</span></div>
            <button className="ad-revisit">Revisit →</button>
          </div>
          <div className="ad-row significant">
            <div className="ad-race"><div className="ad-tag">Revisit</div><div className="ad-name">U.S. Senate · Class II</div></div>
            <div className="ad-score"><span className="ad-old">82%</span><span className="ad-arrow up">↑</span><span className="ad-new up">86%</span></div>
            <button className="ad-revisit">Revisit →</button>
          </div>
        </div>
        <div className="ad-foot">Only members whose alignment moved more than 5 points (or gained / lost a scoreable record) get a <b>Revisit</b> flag. Your keep / replace verdicts are unchanged either way.</div>
      </div>
    </IqShell>
  );
}

Object.assign(window, { IntakeAsk, IntakePropose, IntakeLocked, EditIssues, EditRescored });
