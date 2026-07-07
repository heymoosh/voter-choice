/* Assembles the keystone design review onto the canvas. */
const { DesignCanvas, DCSection, DCArtboard, DCPostIt } = window;

function CanvasApp() {
  return (
    <DesignCanvas>

      <DCSection id="orientation" title="1 · The orientation screen — direction picked, now activated" subtitle="Teammates picked layout A (Guided Tour) as best of the three, and asked for the brighter red-white-blue / white-contrast energy of the activating style. Top card = the resolved pick.">
        <DCPostIt top={150} left={64} width={184}>RESOLVED: Guided-Tour layout on the Bold Flag white ground (same UI as results + scorecard), activated with a flag hairline + navy/red accents. The three originals stay below for reference. Nav: “Methodology” → “How it works” (the brand mark already returns home).</DCPostIt>
        <DCArtboard id="ori-pick" label="★ Recommended · Guided Tour, activated" width={1180} height={720}><OrientationActivated /></DCArtboard>
        <DCArtboard id="ori-a" label="A · Guided Tour (original, warm)" width={1180} height={720}><OrientationA /></DCArtboard>
        <DCArtboard id="ori-b" label="B · Mission Checklist" width={1180} height={720}><OrientationB /></DCArtboard>
        <DCArtboard id="ori-c" label="C · The Briefing" width={1180} height={720}><OrientationC /></DCArtboard>
      </DCSection>

      <DCSection id="results" title="2 · Recommended results layout — one panel, rail = progress" subtitle="One visible panel (center). The right rail IS the progress (Reviewing / Not yet / Reviewed) — no separate bar, no left issues panel.">
        <DCPostIt top={150} left={64} width={184}>Issues + jurisdiction moved into the slim context strip (voting logistics — polling place, dates, IDs — live on the scorecard, not here, so this page stays focused on assessing the rep). Funding is a glance summary that expands to the full FunderBars (named PACs + industry mix) — nothing’s dropped. Non-2026 senator greyed + excluded. “Print my scorecard” unlocks after the last seat.</DCPostIt>
        <DCArtboard id="res-main" label="Review surface — blind rep card + progress rail (Bold Flag)" width={1180} height={820}><ResultsScreen palette="white" /></DCArtboard>
        <DCPostIt top={150} left={1292} width={184}>MUXIN: the EXPANDED funding, now on Bold Flag. “Funders &amp; influence ▾” opens the full money trail — total + small/large/PAC mix + the industry breakdown. “PACs” carries a tooltip with the definition (hover/tap — shown open here). The honest “we can’t yet attribute these PACs” note sits at the FOOT. Comparison is vs. the median House campaign (no challenger needed).</DCPostIt>
        <DCArtboard id="res-funding" label="Funding expanded — the full money trail / FunderBars (Bold Flag)" width={1180} height={1128}><ResultsScreen palette="white" expand="funding" /></DCArtboard>
        <DCPostIt top={150} left={2520} width={184}>MUXIN: “what does it look like when you select a vote?” Tapping an issue opens the roll-call votes behind its score — the bill, how they voted (YEA/NAY), whether it matched your position, the one-line summary, date + source. The issue list stays intact above; the detail is its own clean panel below it.</DCPostIt>
        <DCArtboard id="res-votes" label="Select a vote — per-issue roll-call drilldown (Bold Flag)" width={1180} height={1212}><ResultsScreen palette="white" expand="votes" /></DCArtboard>
        <DCPostIt top={150} left={3748} width={184}>MUXIN: “see all votes — it’s a lot, shouldn’t appear by default, but available.” The full record opens over the dimmed surface: filter by With you / Against you / issue. Click any vote to expand what the bill actually does, the roll-call tally, its status, and how this rep voted — each links to the official roll-call.</DCPostIt>
        <DCArtboard id="res-allvotes" label="See all votes — full record sheet (it’s a lot — one tap away)" width={1180} height={980}><ResultsScreen palette="white" allVotes /></DCArtboard>
      </DCSection>

      <DCSection id="color" title="3 · Color & activation — Bold Flag confirmed" subtitle="Same screen, two grounds — kept here as the record of the call. Bold Flag (white ground, red-white-blue) is now THE palette and is applied across every screen above and below.">
        <DCPostIt top={150} left={64} width={184}>CONFIRMED: B · Bold Flag (white ground) — bolder red-white-blue, prints clean, and now the system the whole canvas runs on. A · Civic Activated (warm editorial paper) shown for the honest before/after.</DCPostIt>
        <DCArtboard id="col-white" label="★ B · Bold Flag (white ground)" width={760} height={600}><ResultsScreen palette="white" compact /></DCArtboard>
        <DCArtboard id="col-warm" label="A · Civic Activated (warm paper)" width={760} height={600}><ResultsScreen palette="warm" compact /></DCArtboard>
      </DCSection>

      <DCSection id="scorecard" title="4 · Scorecard — print-ready &amp; grayscale-safe" subtitle="White sheet · decisions lead · matches as % · keep vs replace differentiated by SHAPE + icon + text, so it survives a black-and-white printer.">
        <DCPostIt top={150} left={64} width={184}>Grayscale-safe: Keep = filled badge + ✓, Replace = outlined badge + ⇄, and the % carries a ✓ / ⚠ glyph — the read holds with no color. Address/logistics demoted to a footer strip. Non-2026 seat shown for context, excluded from decisions.</DCPostIt>
        <DCArtboard id="sc-sheet" label="Printable scorecard" width={780} height={900}><Scorecard /></DCArtboard>
      </DCSection>

      <DCSection id="candidates" title="5 · Design Candidates — what “Time to replace” opens" subtitle="The next big slice. The live prototype already has a successor chooser; this brings it onto the Bold Flag system and explores three directions for the moment a voter picks “replace.” Skim left→right; the building-block card is first.">
        <DCPostIt top={150} left={64} width={184}>UNIFIED CARD: House · Senate · President share one card — a provenance badge (filled “Roll-call record” vs dashed “Researched · cited”) carries the only real difference, so legislators and executives never get blended. This is the parity ask (House/Senate + President/VP) resolved in one system.</DCPostIt>
        <DCArtboard id="cand-card" label="Building block · one card, every seat (provenance badge)" width={1180} height={560}><CandidateParity /></DCArtboard>
        <DCPostIt top={150} left={1292} width={184}>THREE DIRECTIONS for what “replace” opens — same data, same Bold Flag system. A grows inline under the rep card (lowest friction, keeps you in the flow). B is a focused full-screen duel. C is a browsable shortlist that drives a focus pane. Switchers in B and C are live — click the challenger tabs / rows.</DCPostIt>
        <DCArtboard id="cand-a" label="A · Inline ranked chooser (evolves current code — incumbent pinned, blind-first, select = decision)" width={1180} height={860}><ReplaceInline /></DCArtboard>
        <DCArtboard id="cand-b" label="B · Dedicated head-to-head compare (full-screen duel · switch the challenger)" width={1180} height={720}><HeadToHead /></DCArtboard>
        <DCArtboard id="cand-c" label="C · Split — ranked shortlist → focused compare (click a name to focus)" width={1180} height={720}><SplitCompare /></DCArtboard>
      </DCSection>

      <DCSection id="home" title="6 · Homepage hero — activated &amp; de-cluttered" subtitle="Card b4cc1c9e. Applies the Bold Flag system to the front door, sharpens the CTA so it says what the site does, and previews the actual product instead of leading with stats.">
        <DCPostIt top={150} left={64} width={184}>DE-CLUTTER: the two fact snippets (6 hrs/day fundraising · 94% incumbents win) leave the hero — they belong on the new “Why Now?” page. The right column now PREVIEWS the product: a blind assessment card that becomes a printable scorecard, so the hero shows what you get. ADDRESS BOX simplified (card 1850349c): label + field + “Pull my representatives,” with the reassurance + steps folded under one “how it works · your data” line. ★ pick on the headline is the activation copy.</DCPostIt>
        <DCArtboard id="home-hero" label="★ Homepage hero — Bold Flag, product-preview right rail" width={1180} height={720}><HomeHero /></DCArtboard>
        <DCArtboard id="home-voices" label="Headline voices — pick the hook" width={1180} height={470}><HeadlineVoices /></DCArtboard>
      </DCSection>

      <DCSection id="whynow" title="7 · “Why Now?” page — the larger case" subtitle="Card 9031f1ce. The long-form editorial that makes the argument and gives the two hero fact snippets a proper home. Pairs with the “Why now” nav link. Adapted from the founder's framing.">
        <DCPostIt top={150} left={64} width={184}>STRUCTURE: three movements — the problem (money buys attention) → the moment (2026: every House seat + ⅓ of the Senate) → how the app answers it (judge the record, not the messaging). The two fact stats pulled off the hero (6 hrs/day · 94% re-elected) live here now. Open fullscreen to read top-to-bottom.</DCPostIt>
        <DCArtboard id="wn-page" label="Why Now? — full editorial page (scroll / open fullscreen)" width={1180} height={2880}><WhyNow /></DCArtboard>
      </DCSection>

      <DCSection id="statics" title="8 · Static pages — the editorial template, everywhere" subtitle="Cards b1a5f64a + c9891a1f + the “apply Why-Now style everywhere” directive. About / How it works / Privacy / Tip jar now share one editorial shell (masthead + kicker + prose), plus a Bold Flag loading state and the reorganized footer. Real copy from the live app.">
        <DCPostIt top={150} left={64} width={184}>ONE SHELL: every top-level page uses StaticPageVC — flag hairline, shared nav, left-aligned serif masthead, kicker, and a readable serif prose column. FOOTER reorg (b1a5f64a · c9891a1f): Privacy now sits right after About, trimmed to brand + “© 2026 Grey Bird LLC”, Tip jar + Support de-emphasized after a divider. The footer renders at the foot of each page.</DCPostIt>
        <DCArtboard id="st-about" label="About" width={1180} height={1360}><AboutVC /></DCArtboard>
        <DCArtboard id="st-how" label="How it works (was “Methodology”)" width={1180} height={1390}><HowItWorksVC /></DCArtboard>
        <DCArtboard id="st-privacy" label="Privacy" width={1180} height={1370}><PrivacyVC /></DCArtboard>
        <DCArtboard id="st-tip" label="Tip jar" width={1180} height={910}><TipJarVC /></DCArtboard>
        <DCArtboard id="st-loading" label="Loading state — Bold Flag" width={1180} height={720}><LoadingVC /></DCArtboard>
      </DCSection>

      <DCSection id="intake" title="9 · Defining your issues — end to end" subtitle="Cards 6cdedfa6 + ef8d602c + 9143a622. The full “what do you care about” flow on the Bold Flag system — cold open → AI proposes → bounded disambiguation → locked, then editing issues from the workspace → re-score. Read left→right.">
        <DCPostIt top={150} left={64} width={184}>The conversation stays primary: the cold open and every refine turn are free text where the voter shares what they care about in their own words. When something's genuinely ambiguous (“the economy,” “immigration”) the AI asks in-line and offers optional <b>quick replies</b> as a shortcut — never a forced multiple-choice. Every issue carries a JURISDICTION tag (who actually controls it). Editing from the candidate screen opens the same loop seeded with your issues, with its own composer → Apply re-scores and flags seats to Revisit (verdicts never touched).</DCPostIt>
        <DCArtboard id="iq-ask" label="1 · Cold open — the ask" width={1180} height={720}><IntakeAsk /></DCArtboard>
        <DCArtboard id="iq-propose" label="2 · AI proposes + asks in-conversation (free text first, quick replies optional)" width={1180} height={860}><IntakePropose /></DCArtboard>
        <DCArtboard id="iq-locked" label="3 · Locked — jurisdiction summary, ready to start" width={1180} height={800}><IntakeLocked /></DCArtboard>
        <DCArtboard id="iq-edit" label="4 · Edit issues from the workspace — seeded modal, converse or quick-reply" width={1180} height={1020}><EditIssues /></DCArtboard>
        <DCArtboard id="iq-delta" label="5 · Apply → re-scored, with Revisit flags (verdicts kept)" width={1180} height={680}><EditRescored /></DCArtboard>
      </DCSection>

      <DCSection id="polis" title="10 · Polis — the opinion map + “Where we agree” (not a nav tab)" subtitle="Card bc774728. Borrows pol.is directly — a PCA-style opinion MAP (voters who answer alike cluster into groups) paired with the consensus statements that BRIDGE those groups. Entry point is AFTER the scorecard, never before: we don't get between the voter and their printout.">
        <DCPostIt top={150} left={64} width={184}>PLACEMENT (resolved with the founder): the scorecard + print come FIRST, ungated — then Polis is an optional “one more thing,” fully skippable. ① CONTRIBUTE = react to a few statements. ② DISPLAY = the “Where America agrees” report (foot of Why Now + shareable). Borrowed from pol.is: an opinion-map scatter (“we don't all answer alike” → groups) leading into the consensus statements (“and yet these cleared every group”). Dots/percentages are illustrative.</DCPostIt>
        <DCArtboard id="polis-entry" label="⓪ Entry point — the optional invite once the scorecard's ready (after print, skippable)" width={1180} height={760}><PolisEntry /></DCArtboard>
        <DCArtboard id="polis-stand" label="① Contribute — BLIND voting (no running tally; disagreeing is never singled out)" width={1180} height={820}><PolisStand /></DCArtboard>
        <DCArtboard id="polis-report" label="②a Display — the honest report: map + common ground + what split" width={1180} height={2280}><PolisReport /></DCArtboard>
        <DCArtboard id="polis-divided" label="②b When there ISN'T common ground — the honest, neutral state" width={1180} height={1640}><PolisReport divided /></DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CanvasApp />);
