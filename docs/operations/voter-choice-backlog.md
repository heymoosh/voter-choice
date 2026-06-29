# Voter Choice Backlog

Issues, monitoring gaps, data-quality concerns, and enhancement ideas. **Reorganized 2026-06-07 by product phase** (model below). Resolved items moved to `voter-choice-backlog-archive.md` on 2026-06-12 to keep the board live-state-only.

**Severity:** `P0` = blocking / silent bad data · `P1` = meaningful user impact · `P2` = improvement / polish · `idea` = not yet scoped

## ✍️ Adding cards (cheat sheet)

- New card = a block of text with a blank line around it. The board stamps `STATUS` + an id for you.
- Big task? Start the block with a **[P1] Bold title** and bullet the details underneath.
- `## Headings` group cards into phases (the purple tag on the board).
- `- DEPENDS ON: <other card title>` marks a blocker (fuzzy-matched; fix mis-matches on the board).
- Resolved work → `voter-choice-backlog-archive.md`. Full format rules: simple-kanban README.

## 🚦 Phasing model (2026-06-07 pivot)

Ballot upload/parse is too much friction for the target user, so the product ships in phases:

- **Phase 1 — Assess Congress (no ballot):** voting-record alignment + funding for US House/Senate, by address. Largely built; needs prod-hardening + redesign UX.
- **Phase 2 — Intermediary (TBD):** expand beyond Congress *without* full ballot ingestion.
- **Phase 3 — Accurate ballot ingestion (gated on traction / Ballotpedia):** upload/parse/extraction, party gates, measures, a reliable ballot source.
- **Cross-cutting / Operations:** quality + infra that applies regardless of phase.

---


## Phase 1 — Assess Congress (no ballot)

#### Resolve before Phase 1 public release — prod-hardening, NOT design-dependent:

**[P0] Replace the Sunday bill-tagging cron with a /schedule cloud cron (off the front-end API key)**
  - Also double check if any other backend work is using up the API key. API key should ONLY be used for front end user chat in the app.
  - WHY: `ingest-tag-bills.yml` still runs `schedule: cron: "0 9 * * 0"` on
  `origin/main`, calling the Anthropic **Batch API** with `ANTHROPIC_VOTER_API`
  (the *front-end* key). This drained the monthly budget (spikes 6/21 + 6/28).
  Verified 2026-06-28: nothing was ever switched — PR #177 (comments out the
  cron) is OPEN/unmerged, the `tagging-reminder.sh` SessionStart hook is NOT
  wired into settings, and no cloud cron exists.
  - DEPENDS ON: PR #177 merging first (disables the API cron). Until then, a
  new cloud cron would DOUBLE-run alongside the live API cron. (Muxin is
  handling the #177 merge separately.)
  - TASK: stand up a `/schedule` cloud cron (weekly, ~Sun) that runs the
  **subscription-based** tagger — the subagent/Max path
  (`scripts/ingest/tag-bills.ts`), NOT `tag-bills-batch.ts` and NOT
  `ANTHROPIC_VOTER_API`. Goal: automatic + free against the subscription,
  matching the owner directive that the front-end key is user-usage-only.
  - OPEN QUESTIONS to resolve at grooming/exec:
    - DB access from the cloud agent — does the scheduled cloud env get the
  prod `production` Neon `DATABASE_URL`? (tagging reads untagged bills + writes
  `issue_tags`.) Confirm secret plumbing before first run.
    - Scope/limit per run (untagged backlog ≈ 31.7k bills; honor
  `skip_reason`/migration 0007 so non-issue bills aren't re-submitted weekly).
    - Idempotency + a green/failure signal (replace the old workflow's failure
  webhook).
  - ON SUCCESS: delete the dead Sunday `schedule:` block entirely (keep
  `workflow_dispatch` for manual backfill), and either wire or retire
  `scripts/ops/tagging-reminder.sh` since the cadence is automated again.

**[P1] EPIC: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)**
- User found the results page "extremely overwhelming" with no guidance: "I entered this page with no idea of what you wanted me
to do. While the information is there, it took me a long time to understand what you would like me as a user to do."
- Resolve in this session: guided onboarding into results, information hierarchy (visible vs. progressive-revealed), color scheme
/ visual activation, scorecard layout + print styling, left/right panel arrangement, progress indicators.
- Design anchor — the layout/hierarchy/flow/color cards below depend on it.
- 2026-06-17 UPDATE: **DESIGN IS DONE** — delivered as `claude-code-handoff/` (DECISIONS.md + README.md + screens-*.jsx; Bold Flag palette). The design pass RESOLVES this anchor + ~18 UX cards. **IMPLEMENTATION is tracked by the EPIC card "Implement the Keystone redesign" and is BACKEND-GATED per surface** — the head-to-head, Polis report, funding-detail, and bill-detail surfaces depend on new backend (researched scoring f52273a5, Polis per-session data, chamber-median, tally/status) and must show honest "not available yet" states until that data exists. So the redesign cannot be marked *complete* until the backend track lands.
- STATUS: Done
<!-- card-id: e688d5a6-78fa-4e30-a31d-e5039ab31a9f -->

### General

**[P1] API usage hits limits but no details why**
- 2x in June I’ve received unexpected Anthropic emails that the monthly credits were used up. It’s uncertain whether these are real users (just more traffic), a bot, or something else.
- It could even be higher usage than we expected for the app. My core assumption is most people will NOT engage with the research chatbot (which appears on the candidate cards page). So most usage should only be at the issues step, where users describe their concerns and have Haiku parse their concerns.
- We need to be able to understand how Haiku is being used in each session to understand if its usage is related to behaviors.
- I am open to other suggestions and hypotheses for why I'm seeing unexpected usage, because I have not heavily marketed this app yet. I've only mentioned it in random blue sky replies or in small community forums for early testing. I was not expecting a lot of users, but I do not know if that could also be the case.
- Either way, I do not know if we have a built-in system to track this information automatically and be able to understand what's happening and where.
- It's also possible that my API key was compromised somehow, which means that we have not done due diligence in making sure that it's not exposed. 
- STATUS: Backlog
<!-- card-id: c160abf1-890d-4222-a8f6-6ee21b70ea29 -->

**[P1] Spanish translation covers only the top bar**
- "Spanish translation only translates top bar"
- i18n bug — es strings exist in `src/lib/translations.ts` but aren't applied to the app body. Mechanical, not design-coupled.
- NOTE: prerequisite to "[P1] Translations to major languages" — confirm dependency direction at grooming.
- STATUS: Review
<!-- card-id: d8059e2e-2cfd-4933-b2e9-fc3012ebb591 -->

**[P1] Settings button has no functionality**
- "Settings button does not show any functionality"
- Mechanical bug — renders but is a no-op. Wire a settings panel or remove before launch.
- STATUS: Review
<!-- card-id: 403ed2a6-1ddd-4c17-ba12-fed04efa32d1 -->

**Finish Spanish coverage for remaining redesign surfaces**
- After PR #168 wired the main body, these still render English: tier-intro paragraphs (Federal/Executive), SeatChat / RepCard / HandoffModal / ScorecardPrintView, App2 stage error strings (geocodefail/norep/dberror), IssueConversation refinement fallbacks. Add t() keys + ES.
- STATUS: Backlog
- DEPENDS ON: Spanish translation covers only the top bar
<!-- card-id: 7855fddd-e389-483c-9e55-163a4c011870 -->

**Wire "Export profile" in the App2 settings drawer**
- The settings drawer's Export button is inert in App2 (handler passed undefined). Adapt VoterChoiceApp's handleExportProfile to the App2 data model. (Surfaced building PR #169.)
- STATUS: Backlog
- DEPENDS ON: Settings button has no functionality
<!-- card-id: 79cfa416-df1d-4059-8f30-06bee50455fc -->

**Decide tablet/mobile Edit-Issues prominence**
- Edit IS reachable via the scorecard "Edit" button (PR #173) but a tester could not find it — discoverability, not a missing feature. Decide whether to make it more prominent; likely fold into held layout PRs #161 (results one-panel) / #164 (scorecard overhaul).
- STATUS: Backlog
<!-- card-id: 05b9ca68-e9ff-4701-aa1b-0ab86041871c -->

**[P2] Reconsider color scheme for emotional activation**
- "I think the color scheme is too subdued. You want to activate people. I think US Flag colors or variations therefore could
really bring the concept home."
- FOLDED 2026-06-26 (Muxin): the design session already answered this — the Bold Flag palette IS the flag-forward / emotional-activation color system. Tracked by the "Implement the Keystone redesign" EPIC (palette = default); no standalone color work. Closed.
- STATUS: Done
<!-- card-id: ffb7a832-6284-4f6d-92f3-497dee03c62a -->

### Top Bar

**[P2] Rename / reorganize top-bar + footer navigation**
- "It is confusing to me that the homepage is How It Works in the top bar. I would expect How It Works to be the page called
Methodology, which I think might be a bit of difficult word."
- "A lot of the links repeat from the top bar. I would keep About, Rename Support to Contact, and Privacy Policy."
- NOTE: complements existing nav/footer cards — reconcile at grooming.
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: b1a5f64a-cd8c-47a0-8cb5-d9eaf0794977 -->

**[P2] Add a "Why Now?" page for the fact snippets + the larger case**
- "I think another Page of Why Now? would be good where the fact snippets could live and you could make a larger case for the
site."
- STATUS: Review
<!-- card-id: 9031f1ce-e4f3-44c7-89c7-3bbb664be988 -->

### Home Page

**[P1] Strengthen homepage headline + CTA; de-clutter the hero**
- "I think Hold Congress to its record. is good for the website SEO, but it does not give me a sense of what this site is for. I
think a stronger, clearer CTA that folds in what the site does would be stronger."
- "While the 2 fact snippets are interesting, they clutter the visual and make the next action less clear."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: b4cc1c9e-b7c2-4442-ae5c-1a25af5272d3 -->

**[P2] Simplify the Registered Address entry box**
- "There is a lot happening in the Your Registered Address box, from title, to text box, to button, to text above and below, as
well as a popup if the question mark is clicked. I think I would only keep pull my reps button, the text box, and Enter Your
Registered Address."
- "Underneath that entry box, I would add Unsure? Read about how it work and how we use your data followed by 01 Enter your
address in addition to the text that was in the popup, then followed by steps 2 and 3."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 1850349c-0bcd-46d0-8b76-970d964389ba -->

### Issues / Lock-in

**[P1] Chat fails when community budget used up - unclear**
- After entering address, when sharing details about issues user cares about: An error message in small red text is displayed when community budget is completely used up (API calls Haiku for chatbot).
- This is unclear and doesn’t help the user: Understand why this is happening, or how to resolve it.
- The message needs to be much more clear that the budget is used up and resets (when) - and how to proceed if they want to use it ASAP (use their own API key). A CTA to the tip jar (secondary) to support others to keep using the website.
- STATUS: Review
<!-- card-id: 3fcf5217-758c-497b-aae4-69133fcf0b78 -->

**[P2] Make the "Lock These In" box bigger / more prominent**
- "I think the Lock Theses In box could be bigger."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 4b7e5a66-4013-4274-ac67-183ba240b92a -->

**[P2] Show jurisdiction context on the issues page, not as a separate results block**
- "I do not think that the Your seat at the national table is necessary, or at least not in its current form. I think adding this
to the issues page previously would be clearer. I.e. These are your issues 1 (decided on state level), 2 (decided on federal
level), etc."
- NOTE: overlaps the Fed/State issue-label work — reconcile at grooming.
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 9143a622-82fc-4ab1-8a19-90823453856a -->

### Results flow

**[P1] Add a guided orientation screen before rep review begins**
- "I would start with a page before this saying: Next, you will be shown your three representatives, where they stand on the
issues you care about, how they are funded and influenced. You can also find alternative candidates running for the seat. At the
bottom of the page, you will be asked to replace or keep the current representative. You will do this for all representatives and
can then print out your scorecard. Let's move to the first candidate."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 0b9d40c9-82ca-40e5-bf82-9a23bb4769f5 -->

**[P1] Reduce panel clutter in results — one visible panel, simpler progress**
- "The Your Issues and the Rep/Senator sections are both on the left and right. I think at most one should be visible, preferably
on the right. Additionally, the progress bar is not necessary if you keep the current set up of Reviewing Now, Not Yet Reviewed,
and Reviewed on the right."
- "Remove see where you stand until it's ready, there is so much here already."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 335829af-98e9-454e-a014-42f41eb95c7d -->

**[P1] Make "Print My Scorecard" discoverable after the last rep**
- "After you finish the third representative, it is not clear what to do next. You can miss easily miss the print my score card
button."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 1f77c3eb-909d-4ff2-95a6-180e89603da7 -->

**[P2] Distinguish + de-emphasize non-2026 representatives**
- "I am also not sure if it is worth adding the non-2026 representatives to the list. I would have a grey background instead of
white and state earlier that they are not up for election. I would also not include them in the score card."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 97eda1e0-9894-405e-8284-de18b546d43b -->

### Scorecard

**[P2] Include unpaid civic orgs and lobbying contacts**
- From Peter Scheipers: I wonder whether one could also include the politician's membership in unpaid civic organizations as well as lobbying contacts. I am not too familiar with the US system, but I believe that politicians have to disclose their memberships in civic organizations (with exceptions) and lobbyist organizations have to disclose if they pay more than USD 6000 to a single politician within a 6 month period. 
- PLAN — split into two tracks; very different data (2026-06-26):
  - NOTE: the card's "$6,000 / 6 months" figure is NOT a US rule (different jurisdiction).
  - Track A — civic-org memberships / positions (per-member, feasible): the annual Financial Disclosure "Positions Held Outside U.S. Government" schedule lists board/officer/trustee roles in orgs incl. non-profits/civic groups, paid or not. Source: House Clerk / Senate EFD FDs (PDF-heavy); OpenSecrets has FD-derived data (ProPublica API is dead). Cleanly attributable to one member.
  - Track B — lobbying (issue/industry-level, coarser): Lobbying Disclosure Act LD-2 quarterly filings name client/issues/chamber lobbied — rarely a specific member, so per-member attribution is weak. Senate LDA bulk XML/API + OpenSecrets aggregates. Better at issue/industry level than per-member.
  - Recommendation: small research SPIKE first to confirm source formats (structured vs FD-PDF parsing), licensing, per-member match feasibility — THEN scope. Likely ship Track A first; treat Track B as issue-level context, source-linked, labeled disclosure (not accusation).
- STATUS: Backlog
<!-- card-id: 797088b2-4667-4835-ad6c-a2b59a8cac06 -->

**[P2] Include stock transactions**
- Would it be an idea to include stock transactions? Supposedly, politicians need to make public their stock transactions above USD 1000. 
- PLAN — where the data lives + how to ingest (2026-06-26):
  - Legal basis: STOCK Act (2012) — House & Senate members file Periodic Transaction Reports (PTRs) for securities trades >$1,000 within 30–45 days, plus annual Financial Disclosure (FD) reports.
  - Authoritative (PDF-heavy, not API-friendly): House disclosures-clerk.house.gov; Senate efdsearch.senate.gov.
  - Practical free structured path: House/Senate Stock Watcher community datasets (normalized JSON of PTRs: member, ticker, buy/sell, amount RANGE, txn + disclosure dates) via public S3; spot-check vs the official portal.
  - Matching: join by member name → bioguide id (we already have House/Senate incumbents). INCUMBENTS ONLY — challengers/executives file no congressional PTRs.
  - Honesty/labeling: show amount RANGES (e.g. "$1,001–$15,000"), txn + disclosure dates; mark self-reported + lagged; link the official filing; never imply a vote↔trade causal link or wrongdoing.
  - Validate before building (fail-open, like congress-press): confirm the Stock Watcher datasets are still live + license permits redistribution.
  - Scope: ingest job + member_stock_transactions table + a scorecard influence-section render. Incumbents only.
- STATUS: Backlog
<!-- card-id: f4ed7ab6-bc45-482d-84d6-6bf014b2d355 -->

**[P1] Scorecard layout + print-quality overhaul**
- "The next step regarding the score card representatives was not clear as both, regardless of worth keeping or time to replace,
had the same checked box. There is not easy way of differentiating which one is to be kept or replaced. Additionally, I think that
the X/Y votes matched you would be better made into a percentage."
- "All headings could be a lot bigger."
- "I also think I would lead with the vote decisions rather than what I need to vote, my address, districts, etc."
- "I would also really recommend a white background for the site, so the scorecard look better when printed."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 78f5ce94-9b47-4857-b13b-f148af45c491 -->

### House/Senate parity

**[P1] Unify House and Senate candidate card design + info architecture**
- "Is it intentional that the screen for House vs Senate candidates is a bit different? One (senate) has expandable sections, all
sources from govtrack, and 'With you' vs 'Against you'; the other (house) doesn't have expandables, position examples are from
various sources, they're hidden unless you unhide the candidate, and it says 'Aligned' instead of 'With you'."
- Direction (Muxin): "Lean towards making default clean and lean and clear. Progressive info reveal to show the summary and
sources - just not all at once."
- NOTE: the "Aligned" vs "With you" label + source-display inconsistencies are also mechanical bugs; relates to "[P0] Design
Candidates UX flow".
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 05b995c8-2ca9-418a-b872-3cbeb17d0b3f -->

**[P1] Header and Footer are redundant**
- Privacy should be at the top after About
- Tip jar on far upper right corner
- Add Support to the top as well
- Footer - remove links, keep the voter choice and © 2025 Grey Bird LLC. All Rights Reserved.
- STATUS: Review
<!-- card-id: c9891a1f-ba31-4dce-bd1b-0ce372c9de12 -->

**[P2] Show a "polling place not published yet" note when Civic returns no location (far from election)**
  - Found 2026-06-16 (Muxin, during #127 review). On a NJ address ~140 days out, the polling-place panel's ADDRESS column is blank —
  Google Civic `voterinfo` doesn't return polling locations this far before Election Day. Behavior is correct (we never fabricate a
  location) but a blank column reads as broken/missing.
  - Ask: when there's no Civic polling location, render a short explanatory note in the ADDRESS slot instead of leaving it empty —
  e.g. "Polling places aren't published this far out — check back closer to Election Day, or use 'Find your polling place'." Tie it
  to the election-day countdown already shown.
  - Where: src/lib/civic-logistics.ts (the empty `pollingLocations` path) + the election-info / PollingStatusBar render (the ADDRESS
  column).
  - Stay honest — explain the empty state, don't invent an address. Related to the existing Google Civic `voterinfo` /
  early-vote-site backlog cards.
- STATUS: Review
<!-- card-id: 2d1e6f97-c0ce-4bc5-9179-1ee86d4d64ea -->

**[P1] Editing issues doesn't propagate — no new highlight card, Polis unchanged**
  - Found 2026-06-16 (Muxin, during #134 review). Adding a priority ("Congressional Accountability") on the standing/Polis stage
  produced NO new highlight card and Polis did not change.
  - Likely the SAME root cause as the duplicate-key warnings below: non-unique React keys make React drop/merge children, so the
  newly-added issue is silently omitted (and may not thread into the Polis scope data).
  - Repro: address → issue intake → workspace → edit issues, add a priority → expect a new highlight card + Polis update; saw
  neither.
  - Fix, two angles: (1) confirm an added issue actually flows into PolisClose's scope data; (2) fix the non-unique keys (card
  below).
  - Not caused by #134 (CSS-only); pre-existing in the edit-issues flow.
- STATUS: Review
<!-- card-id: 8e4ef0f3-8475-404e-b54d-cbe1153e6bf0 -->

**[P2] React duplicate-key warnings in issue list + prior-session seed**
  - Found 2026-06-16 (Muxin, during #134 review). Two console errors:
  - (a) `same key, 'AI safety, extreme wealth inequality, and lack of universal healthcare.'` — an issue concern/sourceText string
  used directly as a React key. Candidate sites: PolisClose.tsx:195 & :254 (`key={s.canonicalIssue}`), DelegationWorkspace.tsx:360,
  RepCard.tsx:179.
  - (b) `same key, '(prior session)'` — IssueConversation.tsx:68 sets every prior-session-seeded issue's sourceText to the literal
  "(prior session)"; if that feeds a list key, all seeded issues collide.
  - Impact: React drops/duplicates non-unique-keyed children → likely the proximate cause of the P1 above.
  - Fix: key every row by a stable unique id, never the concern text or the "(prior session)" literal.
- RESOLVED by PR #172 (draft — stable React keys; subsumed this card). Close when #172 merges.
- STATUS: To Do
- DECISION: defer — already built in held PR #172; rides with it, close when #172 merges.
<!-- card-id: 08e091a4-65ab-45b8-96c9-7b384ff46a43 -->

**[P0] Edit Issues missing in Tablet Mode**
- In both mobile and tablet screens, I cannot find the ‘left panel’ anywhere -no ability to edit my issues
- STATUS: Review
<!-- card-id: ef8d602c-223a-4188-828c-ed8126e404ab -->

**[P0] Design Candidates UX flow**
- Design is settled — see claude-code-handoff/design-session/screens-candidates.jsx + candidates.css; DECISIONS.md "Session 2" down-selected B · dedicated head-to-head (full-screen duel, challenger switcher, per-issue Δ ledger, Keep/Replace at foot). Do not port; use the design provided.
- When user decides to replace a rep, what happens? 
- Right now, candidates are simply listed below the rep if they are running for the seat.
- STATUS: Review
<!-- card-id: 6a1fb1fb-b93b-46e7-a2c4-1101a92be631 -->

**[P0] Run /security-review**
- STATUS: To Do
- DECISION: defer — Muxin skipped the evidence batch; do not run /security-review overnight.
<!-- card-id: 850b1220-9de9-4aee-814f-470b8096f164 -->

**[P0] Reset Polis count to 0 before launch**
- STATUS: To Do
- DECISION: defer — do NOT execute. Pin the exact reset mechanism (store/keys/script) read-only and surface a one-command action for launch. No prod mutation overnight.
<!-- card-id: 1f5e2506-106d-4d72-97ec-d85a2d8c214d -->

**[P0] Lower `CHAT_DAILY_SESSION_LIMIT` from 100 back to 10 before public launch**
- Flagged 2026-05-26, raised again 2026-05-28
- Owner: TBD
- During pre-launch dogfooding the per-IP daily session cap was raised above the production default so testers don't trip the limit while iterating: **10 → 30 (2026-05-26), then 30 → 100 (2026-05-28)** when active debugging kept hitting it. Current Vercel Production value: `CHAT_DAILY_SESSION_LIMIT=100`.
- Before opening the app to real users this MUST be reduced back to 10 — leaving it at 100 in production:
  - Costs more per abuser (a malicious IP can burn 10× the API quota)
  - Surfaces a less-defensive default for the Phase 9 budget continuity flow
  - Was never the intended steady-state cap
- **Action when ready to launch:**
  ```bash
  cd <launch-production worktree>
  # Remove the override (falls back to DEFAULT_DAILY_SESSION_LIMIT=10 in production)
  vercel env rm CHAT_DAILY_SESSION_LIMIT production --yes
  # Auto-deploy is DISABLED — a git push will NOT redeploy. Redeploy manually so the
  # running functions re-snapshot project env vars and the override is gone:
  vercel redeploy <latest-production-url> --target production
  ```
- **Verification:** after redeploy, `vercel env ls` should NOT list `CHAT_DAILY_SESSION_LIMIT` for Production. The default `process.env.NODE_ENV === "production" ? 10 : 20` in `src/lib/server/rate-limit.ts:4-5` then applies. Env changes only take effect on a _fresh_ deployment.
- **Why we raised it temporarily:** PR #45 fixed a sessionId regeneration bug (each page reload was consuming a fresh session slot). With that fix landed, a single user's session correctly counts as 1. But during the launch ramp it was practical to give dogfooders headroom rather than tune the cap precisely.
- **Caveat (noted 2026-05-28, updated same day):** the durable rate-limiter still fails _closed_ on ANY Upstash Redis error (`src/lib/server/rate-limit.ts:256-269`), so a Redis blip denies the request — but it now reports `code: "RATE_LIMIT_UNAVAILABLE"` (not `DAILY_LIMIT`), which the continuity overlay renders as a distinct "temporarily unavailable — try again" message instead of the misleading "Budget exhausted" copy. Raising `CHAT_DAILY_SESSION_LIMIT` won't help a Redis failure: if chat denies while the budget tier is still `normal`, suspect a Redis blip, not the cap.
- STATUS: To Do
- DECISION: defer — out-of-band Vercel env change; surface the `vercel env rm CHAT_DAILY_SESSION_LIMIT production` + redeploy commands for Muxin to run at launch.
<!-- card-id: 28bf87ec-8587-4d1f-acc7-ab5ff7467cf4 -->

**[P2] President/VP candidate card design does not match the standard card design**
- Flagged 2026-06-07, from FL ballot preview test
- The President & Vice President candidate card renders with a visibly different design from the other candidate cards.
- All candidate cards should share the exact same design/layout regardless of data mode (voting-record vs `web_search` "based on public statements" vs no-record). Audit `CandidateCard` in `src/prototype/VoterChoiceApp.tsx` so the modes are visually consistent. Presidential candidates
- STATUS: Review
<!-- card-id: 31145699-6396-44b3-915c-c30976551085 -->

**[P1] Translations to major languages**
- Flagged 2026-06-12 (pre-launch) — Muxin. DRAFT card; confirm the language set + wording.
- The app currently ships English + Spanish. Before public launch, add translations to major languages. The i18n plumbing already exists: `src/lib/translations.ts` (UI strings, en/es) and the en/es system-prompt variants (`ballotPromptEn.generated.ts` / `ballotPromptEs.generated.ts`, synced via `npm run sync:ballot-prompt`).
- **Language set (TBD — confirm):** a defensible starting point is the federally-relevant ballot languages under Voting Rights Act §203 — Spanish (done), plus Chinese, Vietnamese, Korean, Tagalog, and the Native American / Alaska Native language groups where covered jurisdictions require them. Choose the set deliberately rather than "all major world languages." (Suggested by Claude — confirm.)
- **Sequencing note:** Translation work depends on the final Phase 1 UX/UI — don't translate strings that are still changing. Blocks on the "[P1] Phase 1 UX/UI finalized (redesign complete)" milestone above (this carries forward the old "no translations until the UX is ironed out" instruction from the retired ES-locale card).
- STATUS: To Do
- DEPENDS ON: Phase 1 UX/UI finalized (redesign complete)
<!-- card-id: 2b325135-bafc-454f-b253-5bce21e05a13 -->

**[P1] EPIC: Phase 1 UX/UI finalized (redesign complete)**
- Flagged 2026-06-12 — Muxin. Milestone/umbrella card; rename or fold into your redesign tracking if you keep it elsewhere.
- The phasing model says Phase 1 is "largely built; needs prod-hardening + redesign UX." This card represents that redesign / UX-and-UI finalization as a single gate, so downstream work that can't start until the surface is stable has something concrete to block on.
- Added new Polis UI changes 6/15
- Not a code task in itself — it closes when the Phase 1 redesign UX/UI is locked.
- STATUS: To Do
- DEPENDS ON: [P1] EPIC: Implement the Keystone redesign (port design_handoff) — BACKEND-GATED
<!-- card-id: e18e65fd-faf8-4aaf-8c4f-cee2111725c6 -->

**[P1] EPIC: Complete Alignment work**
- **Umbrella tracker — not a code task in itself.** Closes when all the open alignment cards listed below are Done. Tracks the broader alignment-quality effort that began with `docs/alignment/PHASE2_HANDOFF.md` (the original 6-item backlog).
- **Item 1 (operationalize the shared pole anchor) SHIPPED — PR #114 (2026-06-15).** One typed artifact `src/lib/alignment/poleVocabulary.ts` (16 issues × pinned `in_favor`/`opposed` poles, `axis_type`, bill signals, disambiguation, version stamp) is now consumed by BOTH the bill tagger (`tag-bills.ts` / `_classify-batch.ts`) AND the live concern-resolver, with drift / doc-sync / single-source-grep tests. `TAGGER_VERSION` deliberately unchanged → **no DB re-tag**. This is the durable fix that closes the pole-direction drift the ~40–55% inversion came from.
- **⚠ Architecture correction (affects several cards below):** the live concern-resolver is NOT the legacy `[CONCERN_INTERPRETATION]` block in `docs/BALLOT_PROMPT.md`. PromptFleetV2 is ON in prod, so a voter's free-text concern → `canonicalIssue` + `stance` via `src/lib/prompts/theme-extraction.ts` (+ `theme-refinement.ts`), which share `CANONICAL_ISSUES_PROMPT_BLOCK` / `THEME_FIELDS_PROMPT_BLOCK`. `BALLOT_PROMPT.md` is the out-of-budget fallback only — editing it does NOT change live behavior.
- **Open alignment cards this tracker rolls up** (work them individually — this card is just the rollup):
  - Issue taxonomy is too broad for precise alignment matching (Review)
  - Sub-issue v2 — refine `coverage_access` before tagging it (Backlog)
  - `crime_public_safety` and `public_safety` — keep distinct, or deliberately merge? (To Do)
  - Alignment returns `kept: 0` silently for unmapped concerns (To Do)
  - `reproductive_rights` and `immigration` canonical issues have very thin tag coverage (To Do)
  - Alignment 2a — data-driven disambiguation trigger (Backlog)
  - Alignment 2b — in-chat pole disambiguation (not a theme-card) (Backlog)
  - Alignment 4 — per-vote rationale field (Backlog)
  - ~47% of state bills have no summary (Backlog)
  - No alignment data for non-legislative candidates (Backlog)
  - Second candidate missing alignment block when first has one (Backlog)
  - Web-search-based alignment scoring as fallback (idea)
- STATUS: To Do
- DECISION: defer — umbrella tracker, not a code task; surface, do not build.
<!-- card-id: f474c4b8-e8c0-4129-9a67-4705a1370efe -->

**[P1] Enable voter issue-event persistence in production (go-live steps)**
- Flagged 2026-06-15 — Muxin. Code shipped via PR (`feat/store-voter-issue-events`); these are the deploy-time actions to turn it ON. Until they run, the feature is **inert** — counters/Polis are unaffected and zero rows are written.
- Persists anonymous issue signals at session-end (state + canonical issue + stance + confidence + rank; the model's short label for off-topic/unmapped concerns). **NO session id, NO address, NO verbatim text** — rows are unlinkable. Gated behind `VOTER_ISSUE_EVENTS_ENABLED` (default OFF) and requires the `voter_issue_events` table.
- **Steps, in order:**
  1. **Apply the migration** `db/migrations/0005_add_voter_issue_events.sql` to the prod Neon DB. There is no drizzle journal — apply the raw SQL via the Neon SQL editor / psql. Confirm the table + two indexes exist.
  2. **Confirm the privacy copy is live** — the "Anonymous Issue Signals" section (`src/app/privacy/page.tsx`) describes this collection in the present tense, so it must be deployed before/with enabling.
  3. **Set the flag + redeploy** — `VOTER_ISSUE_EVENTS_ENABLED=true` in Vercel Production, then redeploy (env changes only take effect on a fresh deploy — same caveat as the `CHAT_DAILY_SESSION_LIMIT` card).
- **Status check (2026-06-15) — Plain English:** this feature needs a database table that was never actually created on the live DB, so it's silently doing nothing. I confirmed it's still missing while doing the sub-issue work — the `voter_issue_events` table doesn't exist in prod, i.e. **migration `0005` was never applied** (migration `0006` tried to add a column to it and got `relation "voter_issue_events" does not exist`). To turn the feature on, run `0005` on prod — and re-run `0006`'s two `voter_issue_events` lines too (column + index), since they were skipped for the same reason.
- **Consistency gate:** enable the flag in the SAME release the privacy copy goes live, so the policy never describes collection that isn't happening (or vice-versa).
- **Verify:** run a session to all-seats-verdicted, confirm rows in `voter_issue_events` (incl. ≥1 null-`canonical_issue` row carrying an `off_topic_label` if an off-topic concern was raised). Inspect via `npm run db:analytics-concerns`.
- **Kill-switch:** unset the flag + redeploy to stop collection instantly; counters/Polis are unaffected either way.
- ✅ DONE 2026-06-26 — LIVE & verified: rows persist for both the mapped-issue and off-topic-label paths, with only the 9 privacy-safe columns. Root cause was THREE compounding prod-config gaps, all fixed: (1) `VOTER_ISSUE_EVENTS_ENABLED` existed but was set to an EMPTY value (gate is `=== "true"`); (2) Vercel prod `DATABASE_URL` was EMPTY → the live app had no DB connection at runtime (`getDb()`→not-configured → silent return); (3) prod `voter_issue_events` lacked the `sub_issue` column — 0006's two `voter_issue_events` lines (column + index) applied to the production branch 2026-06-26. KEY gotcha: `vercel redeploy` reuses the original deployment's env snapshot — a fresh `vercel --prod` is required for env changes to take effect.
- STATUS: Done
<!-- card-id: 39a6b6e3-2a1c-4277-a295-b1cf44e3a6d6 -->

**[P0] Remove Fed Both and State labels from Issues**
- These tags labeled ‘both’ or ‘fed’ on Your Issues (on the screen where you evaluate candidates) are confusing - just remove the little tags entirely, not needed.
- STATUS: Done
<!-- card-id: e2d2a7a0-e314-4d47-a402-08e0fff9f672 -->

**[P1] Surface the bill summary in the vote detail (plumb bills.summary → narrative)**
- 2026-06-16 (Muxin, during #133 review). #133 fills `bills.summary` from CRS, but the contributing-vote "What it did" narrative
(`ContributingVote.narrative`, `src/lib/server/alignment.ts`) reads from `can_bill_narratives` (CAN2026, gated behind
`CAN2026_DISPLAY_ENABLED`) — never from `bills.summary`. So the CRS summary lands in the DB unused.
- Fix: in the alignment builder, fall back to `bills.summary` (CRS, public-domain, ungated) for `narrative` when no CAN2026 row
exists; label/append Congress.gov to the vote's sources. Result: bill detail shows summary + how-they-voted + sources, even while
CAN2026 stays gated.
- STATUS: Done
- DEPENDS ON: Integrate Congress.gov CRS bill summaries
<!-- card-id: a06450b8-ae7d-4e6f-8ad5-23cf5c02f42d -->

**[P0] Fix Edit Issues Conversation Flow**
- It took 6+ annoying turns to get the chatbot to take ‘congressional accountability’ because it would keep asking for disambiguation
- If it’s not in our database, flag it and ask for at most 2 clarifying questions, then lock in the users’ responses (all of them) to help us ID and tag bills
- STATUS: Done
<!-- card-id: 6cdedfa6-406c-4197-83af-cea6cd69d702 -->

**[P2] Implement the GovInfo BILLSUM fallback for CRS summaries**
- 2026-06-16 (follow-up to #133). `crs-summaries.ts` has `fetchCrsSummaryGovInfoFallback()` STUBBED (returns null), called when
the Congress.gov primary returns null. Implement it against GovInfo BILLSTATUS/BILLSUM bulk XML so an extended Congress.gov outage
doesn't blank federal bill summaries. Lightweight XML parse of the summaries element; cache aggressively.
- STATUS: Done
- DEPENDS ON: Integrate Congress.gov CRS bill summaries
<!-- card-id: 0f890cb0-3dba-40fb-be37-ac0df377286a -->

**[P2] Wire the batch tagger path to record skip_reason**
- 2026-06-16 (follow-up to #132). The realtime tagger (`scripts/ingest/tag-bills.ts` → `processBill`) now sets `bills.skip_reason`
when a bill returns zero tags, but the **batch** path (`scripts/ingest/tag-bills-batch.ts` → `processResults`, which processes 
Anthropic batch-API results) does NOT. Bills tagged via the batch path won't get a skip_reason, so they stay indistinguishable 
from "queued for tagging."
- Fix: call `inferSkipReason()` + `recordSkipReason()` from the batch `processResults` path when a bill's result yields zero valid
tags, mirroring the realtime path; add `billsSkipReasonWritten` to the batch counters/summary.
- STATUS: Done
- DEPENDS ON: No distinction between "not yet tagged" and "not an issue bill"
<!-- card-id: d1592733-9fc6-4b4c-adc2-f8b444872d23 -->

**[P1] Redesign Polis for effect**
- Design direction lives in claude-code-handoff/design-session/DECISIONS.md (Polis: out of the per-seat flow; standalone placement is still its own session). The old voter-choice-redesign-delta folder is gone — do not port; use the design provided.
- Too tiny, too small, too off the side
- Not impactful enough: We want to depolarize, and this is a thin scatterplot that’s not only hard to read but hard to care about
- STATUS: Done
<!-- card-id: bc774728-5153-409e-a13a-a8207dad0836 -->

**[P0] Backup to CAN2026**
- Is there an alternative way to provide bill summaries and why rep voted the way they did than using the CAN2026 as a source? In case we don’t hear back quickly enough?
- Investigate first - look for free, accessible, available data online that is at least as reputable as CAN2026’s sources and interpretation.
- Flag for user review before executing.
- STATUS: Done
<!-- card-id: 3d64a71d-68e4-4ebf-b761-91440ff63e56 -->

**[P0] Sanity check copy and text formatting**
- Ensuring that copy reflects what the app actually does
- Checking on format and layout - ensure consistency
- STATUS: Done
<!-- card-id: a4add889-8b50-4aca-8bb6-82441093dd59 -->

**[P1] "Community AI budget used up" modal misfires when the budget is NOT exhausted**
- Flagged 2026-06-05, from Muxin's preview test
- A voter who barely clicked around and NEVER used the chatbot was shown the "Community AI budget used up" continuity modal.
- Confirmed against live data: the community budget is at **estimatedSpendUSD ≈ $0.87 (1.7% of the $50 cap)** — nowhere near exhausted — and the new block tracker (`voter-choice:blocks:<day>:*`) recorded **zero** blocks, so no server-side budget gate fired.
- The modal is therefore a **client-side misfire**, likely introduced/exposed by the 2026-06-05 observability deploy's budget derivation (`realData.ts streamChatReply` maps a `status:"budget_exhausted"` 200 → BUDGET_EXHAUSTED; `resolveChatBlock`/`setBudgetExhausted` route to the modal).
- **Investigate:** what sets `budgetExhausted=true` on the client without a real server exhaustion (e.g. a per-race chat-intro response mis-parsed as budget_exhausted, or a stale flag). Same "blocking message that doesn't match reality" family as the rate-limit fail-closed.
- STATUS: Done
<!-- card-id: 46a3d077-02a7-4de5-810a-26625a908b49 -->

**[P1] Header and Footer available on app page (3 panel)**
- Footer not available once you go to the app page
- If you navigate back to the home page - without reloading or closing the tab - you lost your place in the app. Didn’t we used to have a resume session? We only remove data if they close a tab.
- STATUS: Done
<!-- card-id: abfc2ecf-0cbf-44e8-bf3d-ee1dbe949796 -->

**[P2] Tip Jar link is unpopulated**
- Flagged 2026-06-05, from Muxin's preview test
- The "TIP JAR" link (budget-exhausted continuity footer + "A tip keeps the budget alive for the next voter…") has no real destination/page yet.
- Populate it (tip/payment page or external link) before launch — a dead tip-jar link at the budget-exhaustion moment is a poor experience.
- STATUS: Done
<!-- card-id: 17b0ac28-91cd-494d-92eb-28d1d96b8bb6 -->

**[P1] Fix Gray Bird to Grey Bird - everywhere**
- This is the official LLC name - Grey Bird LLC
- Has to be accurate
- STATUS: Done
<!-- card-id: 843b96b1-88ac-4d16-93fc-4723869c82a5 -->

**[P2] `/terms` (full AI disclaimer) is not reachable from the app**
- Flagged 2026-06-07
- The prototype nav exposes How-it-works / Methodology / About / Privacy but not **Terms**, where the full "AI Can Make Mistakes" + "Verify with Official Sources" disclaimer lives (`src/app/terms/page.tsx`).
- The disclaimer is NOT dropped — it's also surfaced contextually in the research UI (`RacePatterns`, `AllVotesPanel`, `AlignmentDrilldown`) and on `/methodology` — but the dedicated Terms page should be linked (e.g. in the prototype footer beside Privacy) so it's reachable.
- Add a Terms link in `src/prototype/VoterChoiceApp.tsx`.
- STATUS: Done
<!-- card-id: 73bbe681-558e-4e4c-9e39-3291cb491c46 -->

#### Phase 1 alignment quality — Congress = federal; parallel data work, not redesign-blocking:

**[P1] `reproductive_rights` and `immigration` canonical issues have very thin tag coverage**
- Flagged 2026-05-15
- `reproductive_rights`: 619 tags (1.5% of corpus). `immigration`: 407 tags (1%). `border_security`: 155 tags (0.4%). These are the three thinnest canonical issues.
- **Impact:** Voters who care about reproductive rights or immigration will often see 0–2 contributing votes even for active state legislators, which reads as "this candidate doesn't address this issue" when the reality is "we don't have enough tagged bills." This is the most politically significant taxonomy gap given that reproductive rights is a top-tier voter concern in 2026.
- **Why thin:** State legislatures rarely have explicit "reproductive rights" bill language — bills are titled by their regulatory mechanism (gestational limits, clinic licensing, etc.). The tagger is less confident matching these to the canonical issue without explicit text, leading to low-confidence drops. Federal bills are better labeled but we have fewer of them.
- **Fix:** **Partly addressed (PR #114):** `src/lib/alignment/poleVocabulary.ts` now gives the tagger explicit pole definitions + bill signals for these issues, and widened `reproductive_rights` Pole B to cover contraception / IVF / Title-X / family-planning (so a contraception restriction no longer falls through to the wrong side). **But `TAGGER_VERSION` was deliberately NOT bumped, so no bills were re-tagged — the improved prompt only helps a FUTURE run.** Remaining (handoff item 6): run a focused re-tagging pass — bump `TAGGER_VERSION` (or target specific bill ids) — on states with relevant legislative histories (TX, FL, OH, GA, NC, AZ, WI for reproductive rights; TX, AZ, FL for immigration).
- **DECIDED 2026-06-17 (Muxin): TARGETED re-tag** (not a full-corpus TAGGER_VERSION bump). Build a bill-selector (the named states + keyword/title filters for repro/immigration topics) + a force-retag flag on the tagger, then re-tag just that subset via Claude Code subscription subagents (overnight batch). Surgical, low regression risk to other issues' tags. Validate the re-tagged subset against the gold gate before/after. The CODE (selector + force-retag flag) is buildable now; the prod re-tag RUN is the overnight subagent job.
- STATUS: Review
<!-- card-id: e782e72f-5c9c-41c5-aedc-7e95f586dbc4 -->

**[P1] Alignment 2b — in-chat pole disambiguation (not a theme-card)**
- 2026-06-16 (Muxin): handle contested-issue side-picking IN the intake chat, not a separate theme-card UI. Builds on #130
(axis_type-driven stance), which currently gives an honest no-score when a contested concern comes in with no side.
- Behavior: when a contested concern arrives neutral (the case #130 omits), the intake conversation ASKS a disambiguation question
instead of silently no-scoring. The question LEADS with what's in our DB — poleVocabulary's per-issue neutral question + its two 
pole labels / nearest canonical issues — AND ends open-ended ("…or is it something else?"), so the voter isn't boxed into our 
buckets.
- Matching: if the answer maps to a canonical issue/pole → set the stance and score against it. If it does NOT map → store the 
concern via the existing voter-issue storage / counters so the unmatched input feeds future tagging (this is why we store issue 
data).
- Scope: theme-refinement.ts already gets #130's [contested]/[valence] tags (shared block), so it knows which concerns to 
disambiguate; wire poleVocabulary's `disambiguation` question + pole labels into the chat turn and parse the answer back to a 
stance. No new theme-card component.
- Supersedes & replaces the old "Alignment 2b — in-chat pole disambiguation (not a theme-card)" card.
- STATUS: Review
- DEPENDS ON: Alignment 2a — data-driven disambiguation trigger
<!-- card-id: c6f8727b-0f81-4307-8451-35a399ba5f4b -->

**[P2] Alignment 4 — per-vote rationale field (design-only, from ALIGNMENT_DATA_MODEL.md)**
- Flagged 2026-06-15 — handoff item 4, no prior card.
- A per-contributing-vote rationale on `ContributingVote` / `AlignmentResult` (`src/lib/server/alignment.ts`), surfaced in `AlignmentDrilldown`. Where CAN curated context covers the vote (`can_candidate_key_votes.context`), populate from that prose. (Docs renamed "bridge" → "vote rationale" to avoid colliding with the Polis "bridge statements"; settled in docs, absent from code.)
- Additive; effectively depends on CAN data being displayed (see the CAN2026 display gate, blocked on attribution terms).
- CLOSED 2026-06-25 (Muxin): CAN context source confirmed dead (CAN2026 browser crawl → zero ingestable data, card e55381e2). Per-vote rationale is now delivered by the synthesized "member's stated reason" layer (PR #145, merged) surfaced via the Unified vote explainer (8ea00aad) — this card is redundant. Closed.
- STATUS: Done
<!-- card-id: 4d2fa4a5-3ee1-4038-8994-c7d489e62000 -->

**[P2] `crime_public_safety` and `public_safety` — keep distinct, or deliberately merge? (Muxin call)**
- Flagged 2026-05-15. **Reframed 2026-06-15 (pole-anchor work, PR #114):** these are NOT simply "redundant." `docs/alignment/POLE_VOCABULARY.md` + `src/lib/alignment/poleVocabulary.ts` now define them as **distinct axes** — `public_safety` = policing / use-of-force (police funding, enforcement powers, qualified immunity, accountability); `crime_public_safety` = sentencing / charging / incarceration (mandatory minimums, bail, sentencing reform, reentry) — with an explicit "do NOT cross-tag the same provision under both" rule.
- (Tag counts 5,499 / 3,800 are pre-cutover 2026-05-15; the 2026-06-06 re-tag changed totals.)
- So this is no longer an automatic "consolidate." Whether to MERGE into one parent with sub-issues is handoff **item 3** — a deliberate, validated mini-cutover (touches `canonicalIssues.ts` + the pole vocab + a targeted re-tag), not a rename-in-place. Decide intent first.
- **DECIDED 2026-06-17 (Muxin): KEEP DISTINCT** (status quo) — two separate top-level issues, no merge, no re-tag. Preserves the policing-vs-sentencing signal (#114). If hierarchical sub-issues roll out more broadly later (extending the healthcare pilot), revisit folding both under a "Crime & Public Safety" parent then.
- STATUS: Done
<!-- card-id: aab02053-d7dc-41ad-8984-570b6f1a9085 -->

**[P2] Sub-issue v2 — refine `coverage_access` before tagging it**
- **Plain English:** We split healthcare into 5 mini-topics. Four are sharp; the 5th — insurance/coverage — turned out to be a catch-all mush, so we left it OFF (those questions just use the old broad score — no worse than before). This card = sharpen "coverage" (or split it into Medicaid / Obamacare / uninsured), re-check, then switch it on.
- Flagged 2026-06-15, from the healthcare sub-issue pilot (PR #117) gold panel.
- `coverage_access` was the ONE facet the 3-juror Opus panel could not confirm — only **43% agreement even on the tagger's HIGH-confidence assignments** (vs 92–100% for `drug_prices` / `provider_costs` / `senior_care` / `mental_behavioral_health`). The tagger applies it to broad ACA / Medicaid / structural healthcare bills the panel reads as "general," not a specific facet. Zero wrong-facet contradictions — errors are "facet vs. general," so it was safe but imprecise.
- **Cutover decision (Muxin): shipped NULL** — no `coverage_access` rows on prod, so those concerns fall back to parent-level scoring (never worse). Re-enable only after tightening.
- **Fix:** tighten the `coverage_access` definition / `billSignals` in `src/lib/alignment/subIssues.ts` (+ `docs/alignment/SUB_ISSUE_VOCABULARY.md`), and/or SPLIT it (e.g. `medicaid` vs `aca_marketplace` vs `the_uninsured`); then re-run the healthcare-scoped `_subissue-*` re-tag + gold gate and insert the passing facet(s). Also reconsider whether to ship the medium-confidence tail of the 4 live facets (currently HIGH-conf only — 912 rows; ~2,449 medium/low left NULL).
- STATUS: Done
<!-- card-id: 5d23faba-728a-4c32-a7d1-91878b4711c8 -->

**[P1] Alignment 2a — data-driven disambiguation trigger (axis_type, not the LLM's confidence)**
- Flagged 2026-06-15 — direct follow-up to the Item-1 pole anchor (PR #114), which now exposes per-issue `axis_type` (12 contested / 4 valence).
- **The live bug:** `src/lib/prompts/theme-extraction.ts` `THEME_FIELDS_PROMPT_BLOCK` tells the model "Most priorities are aspirational → in_favor." For a **contested** issue + a value-only concern ("I care about guns", "I care about my kid's education"), the model silently assigns `in_favor` (= the Pole-A side — e.g. gun *access*, fossil energy, school *choice*) and scores against a guessed pole. 12 of 16 issues are contested, so this is the central case, not an edge.
- **Fix:** drive the stance decision off `axis_type` from `poleVocabulary.ts`. For a contested issue whose concern doesn't pick a side, OMIT the stance (honest no-score) instead of defaulting to `in_favor`; for `valence_dominant`, keep matching the consensus pole. Prompt-behavior change in `theme-extraction.ts` (+ `theme-refinement.ts`, which shares the block). No new UI. NOTE: Item 1 deliberately left this heuristic unchanged.
- **Caveat:** without 2b, a contested value-only concern then yields no alignment score (better than a wrong one) until the voter states a side. Best paired with 2b.
- STATUS: Done
<!-- card-id: d04b101f-123a-43c7-a874-396386ac44ed -->

**[P1] Store voter issue preferences for analysis**
- Flagged 2026-05-15 — requires design
- Pre-launch (Muxin, 2026-06-12): bumped ahead of Phase 1 public release
- **What:** Persist the `[CONCERN_INTERPRETATION]` output (voter's ranked canonical issues + stances) to a database table, anonymously, without any PII. This would let us run analysis: which issues voters in which states care most about, which canonical issues are being invented (indicating taxonomy gaps), how often voters express concerns outside the 15 canonical categories.
- **Why this matters:** The current taxonomy was built bottom-up from legislative data, not from what voters actually ask. Storing what voters ask would let us close the gap — both by expanding the vocabulary and by improving the tagging priority queue (tag more bills in the issues voters actually care about).
- **Pre-launch rationale (Muxin, 2026-06-12):** We should be using the same data that populates Polis — and it enables us to figure out what else to tag in the DB. Still anonymized.
- **What it requires before building:**
  - New DB table (`voter_concern_events` or similar) with columns: session_id (hashed), canonical_issue, resolved_stance, was_off_topic, confidence_level, state_code, timestamp
  - Privacy policy update: clarify that we store anonymous, non-PII issue preference signals. Current policy says we store "anonymous counts only — never who said what." This is consistent but needs explicit mention of concern signals.
  - UX: this data is already being sent to Anthropic as part of the chat context. The new part is persisting the structured output, not adding new collection.
  - A simple analytics query interface (even just SQL in the repo) to inspect the data.
- **Constraint:** Do not collect the voter's free-text verbatim — only the resolved canonical issue id and stance. Free text could be identifying.
- **Implemented 2026-06-15 (PR `feat/store-voter-issue-events`):** new `voter_issue_events` Postgres table written from the existing session-end `/api/counters` path (`recordConcernEvents` in `src/lib/server/counters.ts`); analytics via `npm run db:analytics-concerns`. **Two decisions refined the spec with Muxin:** (1) **no session id at all** — the original `session_id (hashed)` column was dropped, so rows store state + issue only and are unlinkable (dedup rides the existing Redis idempotency gate). (2) For off-topic/unmapped concerns we store the model's short label (not the voter's words) to surface taxonomy gaps. Privacy copy added. Code merges behind a default-OFF flag — see "Enable voter issue-event persistence in production" above for the go-live steps.
- STATUS: Done
<!-- card-id: ff008bd7-d5ad-422a-bdd9-22bfac6227cc -->

**[P1] Issue taxonomy is too broad for precise alignment matching**
- **Plain English:** Big topics like "healthcare" were too broad — "insulin prices" and "hospital monopolies" got the *same* score. Fix = add mini-topics under each big topic. We built that machine and ran it on healthcare (live in the data now): 4 mini-topics shipped, so a drug-price question now scores only on drug-price votes. Still to do: run the same machine on the other 15 big topics, and fix the messy "insurance" mini-topic (its own card below).
- Flagged 2026-05-15
- The 15 canonical issues (`healthcare_affordability`, `economy_jobs`, etc.) are high-level categories. A voter who cares about "insulin prices" and one who cares about "hospital monopolies" both resolve to `healthcare_affordability` and get the same alignment score, even if their actual concerns are distinct. Similarly, "crime" vs. "policing reform" both land in `crime_public_safety` with no way to distinguish stance at query time.
- **Impact on chat:** Alignment answers can feel generic or off-target for voters with specific policy concerns. The system will return votes that are technically related to the category but not the voter's actual position.
- **Longer-term fix:** Expand the canonical vocabulary (likely 30–50 issues) and re-tag the 67K bill corpus. **Update (PR #114):** stance-level *directionality* is now handled — `src/lib/alignment/poleVocabulary.ts` pins per-issue `in_favor`/`opposed` poles consumed by both tagger and resolver — so the remaining gap is finer *sub-issue* granularity (e.g. `healthcare_affordability:expand_coverage` vs `cost_containment`), not direction. A change here means coordinated edits to `canonicalIssues.ts` + `poleVocabulary.ts` + the live resolver `src/lib/prompts/theme-extraction.ts` (NOT `BALLOT_PROMPT.md` — off the live path) + a re-tagging run.
- **SHIPPED — hierarchical sub-issue layer + healthcare pilot (PR #117, 2026-06-15).** Chose layered (parent + optional `sub_issue`) over a flat 30–50 rewrite: `src/lib/alignment/subIssues.ts` (`sub-issue-v1`) adds optional topic facets beneath the 16 issues; facets INHERIT the parent pole (orthogonal to #114's direction work). `lookupAlignment` PREFERS sub-issue votes and FALLS BACK to parent when sparse → never worse than today. Schema: nullable `issue_tags.sub_issue` (+ `sub_tagger_version`/`sub_tagger_confidence`), migration `0006` (additive). Healthcare piloted end-to-end: all 6,494 bills re-tagged (Sonnet), 3-juror Opus gold gate passed (contradiction ≤5% all facets), **912 high-confidence rows cut over to prod** across 4 facets (`drug_prices` / `provider_costs` / `senior_care` / `mental_behavioral_health`). Live proof: a candidate scored 813/842 (parent) vs 29/29 `drug_prices`, 9/9 `provider_costs`. **`coverage_access` dropped (fuzzy — 43% panel agreement even at high confidence) → its own card below.** Prod sub_issue data is invisible to users until PR #117 deploys.
- **Remaining (keeps this card open):** roll out the other 15 families — data-only per family (sub_issue defs in `subIssues.ts` + `SUB_ISSUE_VOCABULARY.md`, scoped `_subissue-*` re-tag, gold gate); apply a sparsity gate (skip/coarsen families thinned by the June cutover, e.g. border/gun/immigration). Mechanism + tooling already built.
- **Related:** See "Store voter issue preferences" idea below.
- STATUS: Done
<!-- card-id: c9a51f25-70cd-495c-ab5e-0dda3d5765b6 -->

**[P1] Alignment returns `kept: 0` silently for unmapped concerns**
- Flagged 2026-05-15
- If Claude maps a voter concern to a canonical id that has very few tagged bills (e.g., `border_security` with only 155 tags, or `immigration` with 407), the alignment lookup will return `found: true` but very low `kept` counts. The voter sees a score like "1 of 47 votes" which looks like the candidate barely addressed the issue — when in reality there just aren't many tagged bills.
- **Impact:** Misleading sparsity signals, especially for federal-only issues (immigration, border) where state legislators rarely vote on them.
- **Fix options:** (a) Show a "limited data" notice when `total < 5` — **DONE** (`attachLimitedDataNotice` in `src/lib/server/alignment.ts:80` sets `result.notice`, rendered verbatim by the chat layer). Remaining: (b) fall back to web search when `total` is below a threshold; (c) expand the tag corpus for thin issues (overlaps the thin-coverage + re-tag cards). Narrow this card to (b)/(c), or close if (a) is deemed sufficient.
- STATUS: Done
<!-- card-id: c6263fc9-63ca-488a-926e-4d38d81bb7c6 -->

---

## Phase 2 — Intermediary [PROPOSED — refine later]

Expand beyond Congress without full ballot ingestion (non-legislative candidates via web search, state/local depth, engagement/Polis).

**[P1] ~47% of state bills have no summary — "can we find missing bill summaries?" (OpenStates has none; recover via full-text+LLM or accept title-only)**
- Flagged 2026-06-04, during alignment re-tag methodology validation on the `alignment-work` Neon branch
- **Finding (read-only DB audit):** `bills.summary` is missing on **47.4% of OpenStates (state) bills** — 31,813 of 67,048 — vs. only **7.5% of federal** (govtrack) bills. The text is **not hidden in our DB**: for these bills `raw_metadata->'openstates'` stores only a 4-field skeleton (`classification`, `id`, `identifier`, `session_id`); there is **no** `abstracts` / `summary` / `description` field anywhere (0 of 31,813). So this is an **ingest gap, not an extraction gap** — we never fetched/stored the abstract; it is not "present but unmapped."
- **Impact:** The bill-tagger (and the new pole-anchored alignment approach) reads `title` + `summary`. With no summary, ~half of state bills can only be judged on title, forcing low-confidence tags or honest "no-score" abstentions. In a 49-bill real-data eval the title-only state bills largely went to no-score (accurate, but it **thins alignment coverage on state/local races** — the bulk of the candidate universe).
- **Correction (2026-06-05, verified in code):** the ingest **already** requests `abstracts` and falls back to `subject` — `scripts/ingest/state-votes.ts`: `fetchOpenStatesJson` (~L475 adds `include=abstracts`); `buildBillRow` (~L741–783) sets `summary = abstracts[0].abstract ?? abstracts[0].note ?? subject`. So the nulls are NOT an ingest bug — OpenStates simply has **no abstract and no subject** for these ~31,813 bills. (The 4-field `raw_metadata` skeleton noted above is just what we chose to store; the abstract was already extracted to `summary` when one existed.)
- **Real recovery options:**
  - **(a)** Fetch each bill's **full text** (OpenStates exposes `versions[]` / `sources[]` links) and run an **LLM pass** to produce a short summary → backfill `bills.summary`. Biggest coverage lever for state races, but a real ingest + LLM job.
  - **(b)** Accept title-only and let the alignment tagger abstain (`no_score`) — honest but thinner (current behavior).
- **Where to look:** `scripts/ingest/state-votes.ts` (`buildBillRow`, `fetchOpenStatesJson`); the OpenStates v3 `/bills` response shape (`versions`, `sources`).
- **Related:** the "Issue taxonomy too broad" item, and the alignment pole-anchor work — now SHIPPED as `src/lib/alignment/poleVocabulary.ts` (PR #114), which the tagger reads alongside `title` + `summary`. Title-only state bills still go to honest no-score per the vocab's fall-through rule, so this summary gap remains the biggest lever for state-race coverage.
- STATUS: Backlog
<!-- card-id: 0338a55a-ee3f-4867-9611-2518a6ae9266 -->

**[P2] IL bill coverage lagging (31.8% — worst of high-volume states)**
- Flagged 2026-05-15
- Illinois has 8,379 bills — the largest state corpus — but only 31.8% are tagged. Sunday cron will close this slowly.
- If IL is a priority, a targeted manual tagging run (100 batches × 300 bills) would close it in one session.
- STATUS: Backlog
<!-- card-id: d16de86e-3e7d-4f59-bd63-15e7825344cc -->

**[Phase 2] [P1] No alignment data for non-legislative candidates (executive, judicial, local)**
- Flagged 2026-05-15
- The `candidates` table and `votes` table only contain state house/senate members and federal House/Senate members. Statewide executive candidates (Governor, Lt. Governor, Attorney General), judicial candidates (judges), county officials, city council, school board, and ballot measure races have no entries in the DB.
- **Impact:** For ballots that are entirely or mostly non-legislative (primaries, runoffs, off-cycle local elections), `lookup_alignment` returns `found: false` for every candidate. The entire chat session falls back to web search. Our proprietary voting record data plays no role. The May 26, 2026 Texas DEM runoff ballot is an example: Lt. Governor, AG, Court of Appeals, County Judge, District Clerk — none covered.
- **Partial mitigation:** Web-search-based alignment scoring (see idea below). Full fix requires new data sources (executive campaign finance, AG actions, bill signing records) — significant scope.
- STATUS: Backlog
<!-- card-id: f52273a5-38ee-4f58-a6fa-edb1d4b43c2b -->

**[P1] Second candidate missing alignment block when first has one**
- Flagged in Muxin's 2026-05-18 E2E run, needs verification
- In one observed session, the first candidate in a race had a complete alignment block, but the second candidate did not. The structural fallthrough for non-legislative candidates is already covered by the "No alignment data for non-legislative candidates" P1 above, but the web-search alignment fallback added in commit 5bc3585 was specifically intended to backfill these cases — and it didn't fire here.
- **Suspected cause:** The prompt path that routes to `web_search` for non-legislative candidates isn't being taken reliably. The model may be short-circuiting after the first candidate's lookup succeeds, or the per-candidate iteration may be silently skipping the fallback branch.
- **Verification needed:** Spot-check a session with a Texas non-legislative race (Lt. Governor, AG, Court of Appeals are all good test cases). Capture the AI's tool calls and confirm whether `lookup_alignment` falls through to web-search emission for each candidate that returns `found: false`. If it doesn't, file as a separate P1 with the tool-call transcript.
- STATUS: Backlog
<!-- card-id: f21e0941-57d0-42b4-b1b7-1c5a1f1a5705 -->

**[idea] Web-search-based alignment scoring as fallback when DB has no data**
- Flagged 2026-05-15 — requires design
- **What:** When `lookup_alignment` returns `found: false` (non-legislative candidate) or `total < threshold` (thin data), instruct the model to run a targeted web search for the candidate's public statements, endorsements, and actions on the issue — then emit a structured alignment assessment in the same `[ALIGNMENT_SCORES]` format, labeled with a different source type so the UI can render it differently.
- **Why it's viable:** The model already does this analysis in prose for non-legislative candidates. The change is making it structured and consistent rather than narrative. The model reads web search results and synthesizes "does this candidate support or oppose this concern?" It already knows how to do that reasoning — we'd just be capturing the output formally.
- **What it would look like in the scores block:**
  ```json
  {
    "canonicalIssue": "reproductive_rights",
    "issueLabel": "Reproductive Rights",
    "resolvedStance": "in_favor",
    "kept": null,
    "total": null,
    "sourceType": "web_search",
    "confidence": "medium",
    "evidence": [
      { "summary": "Endorsed by Planned Parenthood TX, May 2026", "url": "..." },
      {
        "summary": "Stated opposition to HB 1280 in campaign interview",
        "url": "..."
      }
    ]
  }
  ```
- **Key design constraints:**
  - Must be clearly labeled as "Based on public statements" — not "voting record." Different epistemics: voting records are facts, web search summaries are interpretations of available media.
  - Confidence degradation: `high` only for explicit on-record statements; `medium` for endorsements; `low` for inferred from affiliations.
  - Hallucination risk: model must cite sources for each evidence item. Any claim without a real URL should be dropped.
  - Source quality: partisan endorsement sites can be misleading. The model should weight official campaign statements, credentialed news coverage, and official government records over advocacy org summaries.
- **Implementation path:** Primarily a system prompt change + a UI change to render `sourceType: "web_search"` scores differently from `sourceType: "voting_record"` scores. No new backend required. Moderate prompt engineering effort. Low infrastructure cost.
- **Related:** Addresses "No alignment data for non-legislative candidates" [P1] above and "thin tag coverage" [P1] above.
- STATUS: Backlog
<!-- card-id: f5d6a886-da2c-4f0e-827c-fee3e3ebc035 -->

**[idea] Polis viz: usage tracker + social share**
- Flagged 2026-05-18 — growth / social-proof
- Two small additions to the Polis viz surface:
  1. Social-proof banner near the viz: "N voters in [county] have used this tool" — needs a counts query against the existing session/participation data.
  2. "Share this tool" CTA next to the viz, with prefilled copy and OG image.
- **Why:** Both are low-cost trust-builders and growth nudges. The counts banner especially helps in counties where the viz is still warming up — even a modest "47 voters in Travis County" reads as legitimacy.
- STATUS: Backlog
<!-- card-id: 2269ffae-a02c-4561-83c9-1d9a0661b910 -->

**[idea] Polis viz no longer gated on participation threshold**
- Flagged 2026-05-18 — design + QA tooling
- **Resolved by removing the gate (PR #116, 2026-06-15):** the original concern was that low-participation jurisdictions saw NO Polis viz (the old `thresholdMet` / 200-user minimum hid it). Rather than build a mock-data "preview mode" to work around the gate, the participation threshold was **removed entirely** — the party-free overlap cloud now renders for everyone regardless of participant count, so there is no longer a blocked state to preview around. This is the desired behavior.
- The originally-proposed `?devPolis=1` / `NEXT_PUBLIC_DEV_POLIS` mock-data path was therefore **never built and is not needed** (those flags do not exist in code).
- STATUS: Done
<!-- card-id: b762fd4e-2525-4b59-a4f9-6baafc2988ba -->

---

## Phase 3 — Accurate ballot ingestion (gated on traction / Ballotpedia)

All ballot upload/parse/extraction, party gates, measures, and a reliable ballot source. Pursue only if traction justifies the cost/effort.

**[P2 / idea] Open-primary party-selection flexibility + pre-print party confirmation**
- Flagged 2026-06-05 from R4 multi-state verification; DEFERRED by Muxin — core ballot accuracy is higher priority
- The party gate currently fires for ANY primary whose ballot spans multiple party lanes (`isPrimaryLike && racesSpanMultipleParties` in `VoterChoiceApp.tsx`), regardless of `getStateRule`. R4 testing on a WI open-primary ballot confirmed it fires for open primaries too.
- **Muxin's intended flow (scope creep, deferred):** at the gate, ask "which party do you want to vote for?"; if the voter doesn't know / wants to browse, let them **see BOTH parties**; then add a step **before printing the final ballot** that helps them choose which party to commit to (based on their answers/picks) and **confirm before the printout** — so an open-primary voter can browse everything and commit to one party only at print time (you may legally vote only one party's primary).
- Likely also wires `getStateRule` into the gate COPY (closed → "your registered party" + unaffiliated-voter notice; open → free choice; top-two → no gate). Not for this session.
- STATUS: Backlog
<!-- card-id: 8bc7e9e5-f4c1-4b70-bc71-347b06a9c9ff -->

**[P1] Party-primary FILTERING of the ballot ("2 Senate races")**
- Flagged 2026-06-03
- Rebuild task #25
- In a closed/semi-closed PRIMARY the ballot carries BOTH parties' primary contests. The gate captures the voter's party, but the displayed races are NOT yet filtered to that party → both the Democratic and Republican Senate primary show (the "2 Senate races" the user saw).
- Fix: thread the gate selection (registered_dem / registered_rep / unaffiliated→chosen party) into ballot derivation and filter partisan contests to the selected primary; keep non-partisan races. In a GENERAL election, show ALL candidates (no filter, no gate).
- Verify end-to-end with the real NJ June primary PDF (registered Dem → only DEM races) AND a November general scenario (all candidates, no gate).
- STATUS: Backlog
<!-- card-id: 2a68bab6-4dd7-4f21-817b-de9446085dac -->

**[P1] Google Civic `voterinfo` rarely returns the ballot (contests) — heavy reliance on upload/paste**
- Flagged 2026-06-03
- We DO request the ballot: `/api/civic` calls Google `civicinfo/v2/voterinfo` for `contests` (not just polling-location logistics). But Google's Civic election/ballot data is sparse and unreliable — Google deprecated much of it (the `representatives` endpoint shut down in 2025; `voterinfo` contest data is populated only for some elections, often only near election day, and is spotty by state). So for many addresses (incl. NJ) it returns 0 contests and the app correctly falls back to the upload/paste `BallotLookupNeeded` screen. This is a Google limitation, not our bug — but it means we **cannot rely on Civic for the ballot**.
- **Action (evaluate pre-launch):** add a more reliable ballot-contest source (e.g. BallotReady / Democracy Works, Ballotpedia, or per-state SOS feeds) so most users get an auto-pulled ballot instead of having to upload a sample ballot. Keep upload/paste as the universal fallback.
- STATUS: Backlog
<!-- card-id: fceacf73-1bd9-4120-9b5b-6fb27b39dbb2 -->

**[P1] "Pull my ballot →" submit button overflows the address card at desktop widths**
- Flagged 2026-05-26 — defer to mobile/responsiveness session
- After PR #48 fixed the button height (71px → 48px matching prototype `.addr-card .go`), the button now sticks OUT of the right edge of the address card instead of wrapping inside it. The card has a fixed max-width via `.addr-card` but the flex row containing input + button isn't clamping the button into the card's content area.
- **User screenshot:** address `260 West Atlantic Avenue, Audubon, NJ 0…` (truncated by the input's clear-X) and the green "Pull my ballot →" button visibly extending ~30-40px past the card's right border.
- **Likely fix paths to evaluate during the responsive pass:**
  - Constrain the input column with `flex: 1` / `min-width: 0` so it shrinks to make room for the button
  - Wrap the button below the input on narrower viewports via flex-wrap
  - Reduce the card's internal padding so the row fits cleanly
- **Scope:** part of the broader mobile responsiveness pass — verify against the prototype's responsive breakpoints in `prototype.css` (look for `@media` queries on `.addr-card`).
- STATUS: Backlog
<!-- card-id: e6d1fdd3-425a-4700-b1d8-b01dc1901b99 -->

**[P0] Run Contender 1 (Textract + Sonnet) on the bakeoff fixtures before locking C2 as the long-term extraction architecture**
- Flagged 2026-05-27 from `experiment/pdf-extraction-bakeoff` decision
- The PDF extraction bakeoff (Phases 0–6 on `experiment/pdf-extraction-bakeoff`) named three contenders. **Contender 1 (AWS Textract Forms + Claude Sonnet post-processor) was skipped in Phase 4 due to absent AWS credentials** (no `~/.aws/credentials`, no `AWS_*` env vars, no SSO cache). The bakeoff selected **Contender 2 (Sonnet vision direct)** as v1 winner with documented caveats:
  - C2 missed ~13% of NJ Camden candidates (87%, not a clean win).
  - C2 has 3 perception errors on FL Orange multi-district content (wrong Senator district 21 vs 25, hallucinated State Rep district 44, Circuit Judge with position/district transposed).
- Textract is purpose-built for forms — it may handle BOTH the NJ broken-text layer (form-native extraction) AND the FL multi-district perception errors (designed for structured tabular content). If C1 results justify, the v2 architecture may be **Textract-first with C2 as fallback**, not the other way around.
- **Worktree:** all C1 bakeoff work should happen on branch `experiment/pdf-extraction-bakeoff` or a fresh experiment branch, not in the production worktree. This branch never merges to `launch/production`; only the eventual v2 architecture PR (if results justify) would be a fresh branch off `launch/production` that ports the chosen production code.
- **Action when AWS credentials are available:**
  1. AWS account + IAM scoped user already provisioned via `experiments/pdf-extraction-bakeoff/infra/provision-scoped-user.mjs`. Put scoped credentials in the active experiment worktree's `.env.local`. Verify with `node experiments/pdf-extraction-bakeoff/infra/verify-aws-creds.mjs`.
  2. Run the C1 runner against the 4 fixtures (`nj-camden-2026-primary.pdf`, `tx-harris-2026-dem-runoff.pdf`, `tx-hidalgo-2026-bilingual.pdf`, `fl-orange-2026-composite.pdf`). Runner exists at `experiments/pdf-extraction-bakeoff/runners/01-textract-sonnet.ts` (committed `da7d915`).
  3. Re-run `npx tsx experiments/pdf-extraction-bakeoff/score.ts` to score the C1 cells.
  4. If C1 outperforms C2 on FL Orange AND ties/wins on NJ Camden, file a v2 architecture PR off `launch/production`. Otherwise, C2 stays as production extraction path.
- **Does NOT block v1 ship of C2.** This is a "lock the long-term architecture" gate, not a "ship the extraction path" gate.
- **References:**
  - Bakeoff branch: `experiment/pdf-extraction-bakeoff`
  - Decision doc: `experiments/pdf-extraction-bakeoff/decision.md` (winner: C2 with caveats)
  - Design spec: `experiments/pdf-extraction-bakeoff/decision-design.md`
  - Skipped C1 runner: `experiments/pdf-extraction-bakeoff/results/01-textract-sonnet/SKIPPED.md` on the bakeoff branch
- STATUS: Backlog
<!-- card-id: 31cbba83-eb2c-461c-99f6-1767a359bbfe -->

**[P1] C2 prompt engineering for multi-district disambiguation (post-launch)**
- Flagged 2026-05-27 from `experiment/pdf-extraction-bakeoff` decision
- On the FL Orange fixture, Contender 2 (Sonnet vision direct) produced three perception errors on multi-district content:
  - Senator district extracted as 21 instead of the actual 25 on the ballot.
  - Hallucinated State Representative district 44 (does not exist on the ballot).
  - Circuit Judge with position and district fields transposed.
- These are NOT non-ballot hallucinations and NOT schema/enum issues. They are model-capability or prompt-engineering gaps on disambiguating multi-district ballot content. The 2026-05-27 section_name enum expansion did NOT fix them.
- **Likely fixes to try once C2 is wired into production and we can iterate against real ballots:**
  - Add explicit prompt constraints for multi-district handling. Example: "If you see multiple district numbers near the same office label (e.g., '21 vs 25'), use the first one encountered after the office label."
  - Add a per-race confidence signal to the schema and surface a "low-confidence extraction" warning to the voter when an office has a district/position combination that the model wasn't sure about.
  - Test ablations: smaller crop windows per page, explicit page-region prompts, post-extraction district validation against a per-jurisdiction allowlist.
- **References:**
  - Bakeoff decision: `experiments/pdf-extraction-bakeoff/decision.md` § "Honest caveats" caveat 1
  - Bakeoff design: `experiments/pdf-extraction-bakeoff/decision-design.md` § "Known limitations of C2 (v1 winner as of 2026-05-27)"
- STATUS: Backlog
<!-- card-id: c107390e-0e28-4423-aaf3-9526aaff9d14 -->

**[idea / P2] Add Contender 3 (docling) as opt-in second path for amendment-heavy ballots**
- Flagged 2026-05-27 from `experiment/pdf-extraction-bakeoff` decision
- Bakeoff data shows docling + Sonnet post-processor (Contender 3) outperformed C2 on the FL Orange composite fixture (15/15 weighted vs 10.5/15). FL Orange is dominated by long-form prose office names (judicial retentions, constitutional amendments) and multi-district races — exactly the content where C3 captured 100% race coverage at 100% candidate completeness vs C2's 96%/94% with 3 perception errors.
- C3 was disqualified as v1 winner because it returned `{"sections": []}` on the NJ Camden broken-text-layer fixture (the bakeoff's motivating case). It cannot OCR; the spec dropped Tesseract preprocessing. So C3 is not a primary path candidate.
- **Why this matters in late 2026:** November 2026 general-election ballots in CA, FL, TX, and other states will surface a much higher fraction of proposition-heavy / amendment-heavy ballots than the spring primaries. If real-world telemetry shows C2's FL-Orange-shape failure mode recurring, C3 becomes a strong opt-in second path: route amendment-heavy ballots to C3, broken-text-layer ballots to C2.
- **Trigger to revisit:** when the production extraction telemetry surfaces ≥5% of ballots with the FL-Orange failure pattern (perception errors on multi-district content), or before the November 2026 general-election rollout, whichever comes first.
- **References:**
  - Bakeoff decision: `experiments/pdf-extraction-bakeoff/decision.md` § "Future levers"
  - C3 runner + results: `experiments/pdf-extraction-bakeoff/runners/03-docling-sonnet/` and `experiments/pdf-extraction-bakeoff/results/03-docling-sonnet/` on the bakeoff branch.
- STATUS: Backlog
<!-- card-id: 1ed1c65b-c4ed-4b3a-a5cd-53128c053ab8 -->

**[P1] Google Civic ballot lookup unreliable for Texas (and likely other states)**
- Structural, partially mitigated
- Harris County 77002 returns "0 races, Not confirmed" from Google Civic. The PDF ballot upload fallback works well (confirmed with real DEM Harris ballot). But users who don't know to upload a PDF will see the "not confirmed" state and may not realize there's a fallback.
- **Mitigation in place:** PDF upload is surfaced in the UI with a `<details>` section and clear instructions. pdfjs-dist extraction confirmed working.
- **Remaining gap:** No proactive prompt to upload when Civic lookup fails — user must discover the `<details>` section themselves.
- STATUS: Backlog
<!-- card-id: 7f8a78f3-9ef9-4d6e-bb3a-af3df78b7e4e -->

**[idea] AI plain-language "what's at stake" for ballot measures — alongside the official text**
- Flagged 2026-06-07 — deferred by Muxin (verbatim measure body shipped in PR #65)
- Build on `race.measureBody` (official ballot summary now captured verbatim during extraction — `extract-prompt.ts` → `Race.measureBody`, rendered in `PropositionCard`, `src/prototype/VoterChoiceApp.tsx`).
- Add an AI-generated plain-language summary + "If yes / If no" outcomes, fed the captured `measure_text` as its source. **Hard constraint (Muxin): render the AI summary IN ADDITION to the verbatim official text — never hide or replace the original.**
- Needs an honesty guard (no claims beyond the source) and adds a summarization call + token cost. The existing `PROPOSITION_DETAIL` mock path already shows the summary + If-yes/If-no shape this would populate from real data.
- STATUS: Backlog
<!-- card-id: a0405729-9a8f-461e-8bfd-49b145752925 -->

**[P1] PDF OCR fallback fires but still surfaces "scanned" message in some cases**
- Instrumented 2026-05-19, awaiting Muxin retry with browser console
- Muxin retried a real PDF upload and still saw the "scanned image, paste text" error after the Tesseract.js OCR fallback was added. The OCR path is wired correctly (`extractPdfText` → `ocrPdfPages` on <50 chars) but either Tesseract threw on import, or all pages returned <50 chars of text, or the canvas rendering failed silently.
- **Instrumentation added (2026-05-19):**
  - `console.log("[pdf-extract] ...")` at OCR start, per-page (with canvas dimensions + text length), at OCR done.
  - Per-page try/catch — single bad page no longer aborts the whole doc.
  - Canvas dimensions logged + zero-size guard added.
  - `canvas.toDataURL("image/png")` passed to Tesseract instead of the raw canvas (Tesseract v5 picky-input mitigation).
  - Distinct error message `pdfOcrFailed` for "OCR threw" vs. `pdfScannedError` for "OCR ran but returned nothing."
- **Next step:** voter retries upload, reports browser-console logs. Based on what fails, either tune the OCR parameters (PSM mode, character whitelist, scale), preprocess the image (binarize/contrast), or accept OCR as best-effort and prioritize the paste-fallback path.
- STATUS: Backlog
<!-- card-id: b1a14253-12ad-4030-9446-f4275f3b4c24 -->

**[P2] Detector threshold tuning from production telemetry**
- By-design
- `extract.detector_decision` telemetry is logged for every routing decision. Once we have ~100 real ballots through the route, pull the logs and tune `EXTRACTION_DETECTOR_DICT_FLOOR` / `_VOCAB_FLOOR` / `_PROPER_NOUN_FLOOR` in Vercel env without redeploying.
- Defaults are 0.6 / 5 / 5; the right floor depends on what real ballots look like in pdfjs's output.
- STATUS: Backlog
<!-- card-id: 69ed6fcd-09d9-47cc-b64f-8157e046cb89 -->

**[P2] Progressive UX during multi-page extraction**
- Out-of-scope follow-up from PDF bakeoff decision.md
- Worst-case 14-page Hidalgo bilingual ballots take ~90s wall-clock even with per-page parallelism. A single spinner reads as broken.
- Stream race results into the UI as each page's Sonnet call returns — the route returns once all pages stitch, but the client can show "found 5 races so far…" instead of waiting silently.
- STATUS: Backlog
<!-- card-id: 0708be5c-b49f-4183-b165-aac379e131f1 -->

**[P2] Hash-based caching for repeat PDF uploads**
- Out-of-scope follow-up from PDF bakeoff decision.md
- If a voter uploads the same PDF twice (page reload, tab close), the route currently re-spends $0.04–$0.55 of Sonnet vision.
- Hash the PDF on upload, cache by hash → JSON result (Redis with 7d TTL). Saves cost + latency on repeat uploads. Out of scope for v1 ship.
- STATUS: Backlog
<!-- card-id: 25d56ebf-9589-4e75-a36e-cf9c9b4d78f8 -->

**[P2] Surface early-vote site addresses + precinct numbers from Google Civic**
- Flagged 2026-06-12 — residual lifted from two cards resolved 2026-06-10 (now in the archive): "[P1] Election DATA must cover ANY upcoming election" and "[P1] Printable ballot shows generic placeholders". DRAFT card — revise wording as needed.
- Remaining from the 2026-06-10 address-logistics work (branch claude/alignment-election-data-rules-smlqus): the congress-assessment flow surfaces real polling place/hours, but early-vote SITE addresses and precinct numbers are not yet pulled through from the Google Civic `voterinfo` response when it carries them.
- Populate them into the workspace bar + printable scorecard. Honesty bar: never show a site or precinct we didn't actually resolve.
- STATUS: Backlog
<!-- card-id: 937407c8-a38d-4a1e-bdb5-ba53460ecb14 -->

**[P1] Hardcoded location/state data still leaks into the UI — make EVERYTHING address-derived**
- Flagged 2026-06-05, from Muxin's preview test
- Same class as the F12 "hardcoded Texas" fix, but more instances remain. On a NEW JERSEY address the UI still showed Texas/Harris-County leftovers: the left-panel footer link **"See party-gate (TX primary)"**, and the election-info "Show details" panel **"SOURCE · HARRIS COUNTY ELECTIONS"**.
- **Requirement (Muxin):** ALL locations, states, counties, jurisdictions, election-types must be variables populated after we ingest the address + ballot — never hardcoded.
- **Action:** sweep UI + data layers for literal "TX"/"Texas"/"Harris"/"primary"/county/state constants and replace each with an address/ballot-derived value. The "See party-gate (TX primary)" link is a dev affordance — remove or make dynamic for production.
- STATUS: Done
<!-- card-id: 054cbdca-c250-4634-b5e3-916a25d5e584 -->

---

## Cross-cutting / Operations (any phase)

**[P1] Bill-summary generation pipeline - subscription subagents, batched, ongoing**
- Generate `bills.plain_summary` (plain-language <=2-sentence summaries) so the vote card shows a real summary. The WIRING + a seed script (`scripts/ingest/summarize-bills.ts`, metered-API version) shipped in #136; THIS card is the generation RUN + ongoing pipeline.
- Mechanism (Muxin): run via Claude Code SUBSCRIPTION + subagents in BATCHES (zero metered-API cost; same approach as bill-tagging), NOT the metered API. Prioritize vote-referenced bills first, then the rest of the corpus.
- PIPELINE, not a one-off: make it repeatable / auto-run for newly-ingested bills so new vote-bills get summaries automatically.
- IMPORTANT - the per-vote DISPLAYED summary must combine BOTH pieces to be USEFUL: (1) what the bill is about (this card) AND (2) how/why the rep voted = the synthesized rationale (f9cc6279). They're composed in the Unified vote explainer (8ea00aad). The same subscription-subagent batched-pipeline approach applies to f9cc6279's rationale generation.
- Style: plain language, active voice, <=2 sentences, no title repetition, no trailing ellipsis, self-contained (rendering shows it in full or shows nothing).
- STATUS: Backlog
<!-- card-id: cf55573b-7d28-467e-b15b-3e07a0f5202f -->

**[P1] BACKEND: Polis report data — per-session response vectors + clustering**
- Gates the redesigned Polis REPORT (claude-code-handoff/screens-polis.jsx PolisReport). The new report leads with a PCA-style cluster map ('voters who answer alike sit together'), shows consensus statements that cleared 60%+ in EVERY cluster, and an honest 'divided' state.
- BLOCKER: our Polis currently stores only party x issue MARGINALS, not per-session answer vectors — so we cannot cluster. Needs: (a) store de-identified per-session response vectors, (b) PCA-style clustering, (c) per-group 60%+ consensus + divided-state logic. (Same schema gap flagged in the Phase-1 Polis viz work; bridges endpoint returns [] until this lands.)
- Privacy: de-identified aggregates only; never name who voted which way (design neutrality contract).
- STATUS: Review
<!-- card-id: 1d3d1843-34ed-4c66-ba9e-e20707900ed0 -->

**Unified vote explainer - bill summary + how they voted + why**
- One block in the vote detail combining: (1) what the bill was about - plain-language summary (bills.plain_summary, from #136); (2) how the member voted - roll-call; (3) why - the synthesized stated rationale (from f9cc6279), clearly labeled + source-linked.
- Degrade gracefully: when no rationale exists for a vote (common - members explain contested/messaging votes, rarely party-line/procedural ones), show 'no stated reason found' - never imply silence = no position (show-thin-records principle).
- DEPENDS ON both the bill-summary work (#136, 'Surface the bill summary in the vote detail') and the rationale layer (f9cc6279); formal dep below is the rationale layer (the long pole).
- STATUS: Backlog
<!-- card-id: 8ea00aad-bbaf-4482-875b-eb65d57b895a -->

**[P1] EPIC: Implement the Keystone redesign (port design_handoff) — BACKEND-GATED**
- Port the new design from claude-code-handoff/ (DECISIONS.md + README.md + screens-*.jsx) into src/prototype/redesign/*, surface-by-surface. Bold Flag palette as default. Evolve shipped components, don't fork.
- BACKEND-GATED per surface — a surface ships ONLY when its data exists; show honest 'not available yet' until then (no empty shells):
- - Candidates / head-to-head (6a1fb1fb) -> needs researched challenger/executive alignment scores (f52273a5). The challenger side has NO score data today.
- - Polis report -> needs per-session vectors + clustering (the Polis-report-data backend card above).
- - Funding-detail (FunderPanel) -> needs the chamber-median aggregate card. ✅ SHIPPED + LIVE 2026-06-25 (PR #152): MedianChip + "Raised vs. the median" scale wired onto the rep funding panel; honest dollar-only when no median. Backend #143 plumbed through delegationData -> peerComparison VM.
- - Bill-detail -> needs vote.tally/status card + plain summaries (cf55573b).
- - Orientation / results-layout / scorecard / homepage / why-now / statics / intake -> NO new backend; port freely.
- Preserve the design's honest-state discipline (PAC honesty, never blend roll-call/researched, donor-unavailable path, 'no votes match', divided Polis). Closes the ~18 design cards (e688d5a6 + UX cluster) as surfaces land.
- PROGRESS (2026-06-25, conductor): funding-detail surface integrated + deployed (the claude-code-handoff "Raised vs. the median" feature). MoneyGapH2H component is PORTED + tested but NOT wired — the head-to-head/duel surface doesn't exist yet (6a1fb1fb) and challenger alignment scores don't exist; wiring it would fabricate data. Remaining handoff surfaces stay backend-gated. Moved to Review for Muxin to assess the umbrella's remaining (gated) surfaces.
- STATUS: Review
<!-- card-id: c44193cf-134d-4685-8e98-159ab411cbd7 -->

**[P1] Header links unreachable on mobile after footer strip**
- Surfaced by PR #166 (header/footer consolidation).
- A pre-existing rule `.app-nav .links { display: none }` at <=767px hides the header link group. With the footer stripped to brand + copyright, Privacy / Support / About become unreachable on mobile.
- Add a mobile nav affordance (hamburger / overflow menu) so those links stay reachable on small screens. Applies to whichever nav design lands (#154 or #166).
- STATUS: Backlog
<!-- card-id: 23687b66-d005-44dd-86a3-d93664160f9b -->

**[P2] De-dup inline address steps vs the existing three-step walkthrough**
- Surfaced by PR #157 (simplify address box).
- The new inline 01/02/03 steps under the address box overlap in intent with the existing full-width HowItWorksWalkthrough ("From address to printed ballot in three steps") that also renders below the hero.
- Decide: keep both, fold one into the other, or i18n the new inline copy (currently EN-only).
- STATUS: Backlog
- DEPENDS ON: [P2] Simplify the Registered Address entry box
<!-- card-id: 8807920f-0f26-4430-878e-6c012f03835b -->

**[P2] Spanish/i18n for new redesign copy (Why Now? page, orientation screen)**
- Surfaced by PRs #155 (Why Now? page) and #160 (orientation screen).
- New page/screen body copy is English-only; nav labels were translated (en+es) but page bodies were not, matching existing static pages.
- Add ES (and other supported locales) when the redesign adopts t() keys for body copy.
- STATUS: Backlog
<!-- card-id: 694cfc22-9c20-47e9-b559-4667b9923bf7 -->

**[P2] CSS housekeeping: prune orphaned .addr-why-* and unused .lvl-tag rules**
- Surfaced by PRs #157 (address box) and #159 (jurisdiction inline).
- The (?) popup classes (.addr-why-btn/.addr-why-modal/.addr-why-close, .addr-card label .privacy) and the removed jurisdiction-chip .lvl-tag rules are now unused. Left in place to stay surgical; prune in a cleanup pass.
- STATUS: Backlog
<!-- card-id: 1ec90ed1-9222-4e81-a15e-2460767f0581 -->

**[P2] Remove dead Bitwarden DATABASE_URL fetch in deploy.yml**
- - Follow-up from the deploy.yml DATABASE_URL fix (02686df1). After dropping the `set_env DATABASE_URL "$DATABASE_URL"` push line, the workflow's "Pull secrets" step (deploy.yml ~lines 69-71) still fetches `DATABASE_URL` from Bitwarden Secrets Manager (secret id 90abeeed-130e-4707-86ff-b446003770c2) into `$GITHUB_ENV`, but nothing consumes it anymore (the test job at ~line 44 runs before the pull).
- ACTION: remove the dead Bitwarden DATABASE_URL fetch so CI stops pulling a prod DB secret it no longer uses. Verify no other step consumes `$DATABASE_URL` first.
- Low risk, cleanup-only. Blocked on the parent PR landing so the diffs don't conflict.
- STATUS: Backlog
<!-- card-id: babd56b0-73ff-4928-9f8f-c4e08bb4610f -->

**Double-check CAN2026: review the site thoroughly, page by page**
- Confirm what data CAN2026 (can2026.org) actually provides by going through the site THOROUGHLY, page by page — the initial research only fetched the landing page and may have missed bill summaries / vote-rationale / useful supplemental data living in specific sub-pages.
- Context: the quick fetch read CAN2026 as a constitutional-oversight documentation archive ("no evaluative conclusions"), but Muxin recalls some relevant data existing in specific parts of the site. CAN2026 could still be useful SUPPLEMENTAL info even if it isn't the primary summary/rationale source.
- Deliverable: a page-by-page inventory of what CAN2026 offers (summaries? vote rationale? oversight records?), access/format, and whether/how it complements the free backups in cards A/B. Flag for user review before acting.
- 2026-06-17 UPDATE: first pass (WebFetch) delivered a partial inventory but is NOT exhaustive — WebFetch CANNOT render the JS pages, so `/government-record` (the main data index) and `/2026-elections` were never actually loaded. REMAINING WORK = a real browser crawl (Playwright / headless, renders JS) that clicks every page, especially `/government-record`, to definitively determine if CAN has ingestable vote/rationale/bill data. KEY FACT (prod DB queried 2026-06-17): `can_candidate_key_votes` = 0 rows and `can_bill_narratives` = 0 rows — we have ingested ZERO CAN data, so this is purely about whether the SITE has anything worth a future ingest. This gates the #139 keep/close decision (gated per-vote rationale reads `can_candidate_key_votes.context`, currently empty).
- STATUS: Done
<!-- card-id: e55381e2-a02a-4b48-bb1f-4667108c7b38 -->

**[P1] BACKEND: Chamber-median FEC funding aggregate (per chamber/cycle)**
- Gates the redesign's funding comparison ('~3x the median House campaign' — design_handoff README 8.1, funding.chamberMedian).
- Compute median total raised per chamber per cycle from existing FEC donor data; expose on the seat. Comparison is chamber-median, NOT challenger-based (can't know a challenger before one is selected to compare). Used by the FunderPanel funding-detail expansion.
- STATUS: Done
<!-- card-id: 676bda25-cb71-4c7f-9e28-fcf34f686693 -->

**Synthesized "member's stated reason" vote-rationale layer**
- Build a clearly-labeled "why this member voted this way" layer. No FREE structured vote-rationale source exists (CQ Roll Call is the only true one and is enterprise-paywalled; ProPublica's API is dead) — so synthesize it.
- Approach: ingest Derek Willis's `congress-press` dataset (free bulk JSONL, 670K+ member press releases, daily updates, 2001-present); match releases to roll-call votes by bill number + date; optionally enrich with GovInfo Congressional Record floor statements; LLM-generate a plain-language "what the member said about this vote" blurb.
- Labeling: present as the member's STATED / inferred reasoning, source-linked — never as authoritative fact or a verified quote unless quoting verbatim.
- Caveats: coverage is structurally partial (members explain contested/messaging votes, rarely party-line or procedural ones); avoid Congressional Record "Personal Explanations" (those cover MISSED votes, ~half non-substantive); vet the congress-press license + underlying member-site ToS before redistribution.
- ✅ LEGAL PRE-APPROVED (2026-06-17, Muxin — FAIL-OPEN): PROCEED with ingestion + display UNLESS the legal finding (9a53647e) returns `VERDICT: BLOCKER` (an explicit redistribution prohibition / paid-license requirement). If it returns `ATTRIBUTION-REQUIRED`, IMPLEMENT the stated citation/attribution (source links + the required credit) and proceed. If `CLEAR`, just proceed. Do NOT block on ambiguity — default to proceed. Still runs AFTER 9a53647e (so it picks up any attribution requirement first). Generation via Claude Code subscription subagents (not metered API).
- STATUS: Done
- DEPENDS ON: Legal: clear congress-press dataset + member-site ToS for vote rationale
<!-- card-id: f9cc6279-41ea-463b-a29c-3cf26f617396 -->

**[P1] BACKEND: Roll-call tally + bill status ingest (vote.tally / vote.status)**
- Gates the redesign's bill-detail surface (design_handoff README 8.1): vote.tally ('Passed House 232-193') and vote.status ('Passed House, stalled in Senate'). We ingest the member's vote_cast but NOT the overall roll-call tally or bill lifecycle status.
- Ingest from Congress.gov / GovTrack: per-vote tally + bill status. Honest fallback (hide the line) where unavailable.
- STATUS: Done
<!-- card-id: f1e99999-0ccf-46a6-805e-ca60f414162c -->

**[P1] Issue extraction bundles multi-concern input into one issue (regression from #114)**
- BUG (reported 2026-06-17, Muxin, live review): a compound first message e.g. "AI safety and healthcare insurance costs" yields ONE issue named the literal phrase, instead of splitting into separate issues. The combined string matches no canonical issue -> "no voting record data for this topic" -> breaks vote evaluation. User: "it used to split and now bundles."
- ROOT CAUSE: `src/lib/prompts/theme-extraction.ts` allows splitting (1-5 themes) but has NO explicit rule to split a compound input. Regression correlates with PR #114 (c864a87), which appended the POLE DIRECTIONS block to CANONICAL_ISSUES_PROMPT_BLOCK -> makes canonical mapping feel load-bearing, so the model collapses compound input into one literal-named theme, especially when one concern ("AI safety") has no canonical id.
- FIX (minimal, prompt-behavioral -> verify LIVE): add an explicit split rule to the Rules block ('if the voter names multiple distinct concerns, emit a separate theme for each, even if one has no canonicalIssue'); regenerate theme-extraction golden; add a multi-issue extraction test.
- SEVERITY: high - every multi-concern cold-open input (very common: 'guns and abortion', 'housing and climate') currently breaks. Primary intake flow.
- RELATED: cousin of #138 (theme-refinement). SECONDARY taxonomy question (separate): 'AI safety' maps to no canonical issue -> even split it shows 'no data'; consider adding an AI/tech canonical issue.
- STATUS: Done
<!-- card-id: 31942302-b656-49a2-9ad8-53a2c2707564 -->

**Legal: clear congress-press dataset + member-site ToS for vote rationale**
- Gate before any press-release-derived vote rationale ships — blocks the rationale layer (f9cc6279).
- Vet (a) Derek Willis `congress-press` dataset license and (b) the underlying member-site terms of use, for our ingest + LLM synthesis + display-with-attribution.
- Context: members' press releases are public statements on official .gov sites (federal works are generally public-domain), but confirm the compiled dataset's license permits redistribution and that showing synthesized summaries with source links is OK. Low-but-nonzero risk; a due-diligence pass, not a big legal project.
- TASK (not Muxin-owned): conductor/subagent drafts a first-pass read — find + summarize the `congress-press` dataset's stated license/terms, spot-check a few member-site ToS.
- DECISION FRONT-LOADED (2026-06-17, Muxin — FAIL-OPEN): output a STRUCTURED verdict line — `VERDICT: CLEAR` | `VERDICT: ATTRIBUTION-REQUIRED — <exact requirement, e.g. how to credit congress-press / the member sites>` | `VERDICT: BLOCKER — <explicit prohibition / paid license>`. Muxin pre-approves proceeding on CLEAR or ATTRIBUTION-REQUIRED (the rationale layer f9cc6279 implements the attribution); ONLY a hard BLOCKER stops the rationale work. Do NOT escalate ambiguity — default to proceed. The finding feeds f9cc6279's attribution + is recorded in the morning summary.
- STATUS: Done
<!-- card-id: 9a53647e-36c5-420c-b00c-e2e76d99d551 -->

**[P2] `ingest-state-donors-monthly.yml` — ~21 states use best-effort download URLs**
- Flagged during build
- Several state donor download URLs were added as best-effort guesses without verification (AK, AR, CO, FL, HI, IN, KY, MA, MI, MN, MO, MS, NC, ND-cfis, NY, OH, OK, SC, TN, TX). These have `continue-on-error: true` and may silently fail on the monthly run.
- The existing donor data for these states is from the initial ingest and is correct; only future refreshes are at risk.
- **Fix:** Verify each URL manually before the first monthly run. Expected: June 2026.
- STATUS: Done
<!-- card-id: bc0e3955-16ad-4ad6-ad31-2ea8d4f10ce2 -->

**Integrate Congress.gov CRS bill summaries (free public-domain backup)**
- Free, public-domain backup for plain-language bill summaries — replaces CAN2026's summary need (per the [P0] Backup research, 2026-06-15).
- Source: Congress.gov API CRS summaries — endpoint /bill/{congress}/{type}/{number}/summaries; free api.data.gov key, ~5K req/hr; public domain, NO attribution strings.
- Hot fallback: GovInfo BILLSTATUS / BILLSUM bulk XML (identical CRS data) when the API is down.
- Caveats: in the 119th Congress CRS writes summaries for the INTRODUCED version only — some bills return empty, handle gracefully; summary text is HTML, sanitize before display; Congress.gov API had an undocumented multi-day outage (Aug 2025) with no SLA — cache aggressively.
- STATUS: Done
<!-- card-id: e70d609d-9b4b-4ad1-971c-1fbcba09f7bc -->

**[P1] No distinction between "not yet tagged" and "not an issue bill"**
- Flagged 2026-05-15
- Bills with zero `issue_tags` rows look identical in the DB whether they are:
  - Genuinely non-issue (procedural votes, budget line items, ceremonial resolutions, street renaming) — estimated ~30% of all bills
  - Legitimately untagged because the tagger hasn't reached them yet
- **Impact:** The 56.2% bill coverage figure overstates the gap. The real "taggable but untagged" figure is probably closer to 25–30%. Alignment scores for high-bill states (IL at 31.8%, TN at 35.6%) look sparse but some of that is structural.
- **Fix:** Add a `skip_reason` column to `bills` table (or a separate `bill_skips` table). When the tagger decides a bill is non-issue, record it explicitly. Then coverage reporting can separate "skipped non-issue" from "queued for tagging."
- **Tracking query:**
  ```sql
  SELECT COUNT(*) FROM bills b
  WHERE NOT EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id = b.id);
  -- Current: ~29,654 bills — mix of non-issue + untagged
  ```
- STATUS: Done
<!-- card-id: 032d3451-cfa9-4dcf-b6e1-5d54bc82ab2c -->

**Formatting / terminology consistency — deferred**
- Same concept named differently in different places — pick one term per concept. ~18 items from the copy audit.
- "Amend your issues" vs "Edit your issues" (EditIssuesModal) — standardize.
- Nav link ordering: AppNav vs in-page links (VoterChoiceApp).
- Eyebrow / kick label casing (PolisClose, RepCard confidence label).
- "Add something I forgot" → "Add something I missed" (IssueConversation).
- Spread across VoterChoiceApp.tsx (5), data.tsx (3), RepCard, PolisClose, IssueConversation.
- STATUS: Done
<!-- card-id: 0b7a6412-34b0-4274-83ec-b06a3ac3eb6c -->

**Copy-accuracy cleanup — deferred wording calls**
- Real wording problems from the copy audit that each need a small judgment (not mechanical). ~22 items.
- Dead links: VoterChoiceApp.tsx href="#" anchors that go nowhere — point at real targets or remove.
- "Tap a bill →" → "Tap a vote →" (VoterChoiceApp).
- IssueConversation / HandoffModal: privacy + progress wording nuance.
- ByokCard: "Saved. Chat now uses your account." → clarify the retry step.
- EditIssuesModal: "Re-rank, rename, add" → also mention "remove".
- Concentrated in VoterChoiceApp.tsx (11), about/page (2), EditIssuesModal, ByokCard.
- STATUS: Done
<!-- card-id: 35ed3262-ec67-494c-9919-4dd719bfa9a1 -->

**[P1] Reframe product copy: "ballot research" → "Congress assessment"**
- Default live app is the Congress scorecard (ballot flow is behind BALLOT_ENABLED), but ~20 strings still pitch a "research your ballot / printable ballot to take to the polls" tool — copy describes a different product than what loads.
- Decide the canonical framing (e.g. "Assess your representatives with AI"), then update consistently across surfaces.
- Site metadata — src/app/layout.tsx: title, openGraph.title, twitter.title, and both descriptions ("Research your ballot with AI…"); drop "printable ballot to take to the polls".
- About page — src/app/about/page.tsx: "free, non-partisan ballot research tool" framing.
- In-app strings — VoterChoiceApp.tsx ("Issues you voted on" → "Issues you cared about"), DelegationWorkspace.tsx (scorecard back-labels), BudgetModal.tsx (privacy line).
- Factual fix bundled here: VoterChoiceApp lede "34 Senate seats are on the ballot" → "33".
- ~20 flagged locations from the 2026-06-15 copy audit; re-audit those files when implementing.
- STATUS: Done
<!-- card-id: 26b49d49-8dfb-4dbd-ad19-d12046b7b802 -->

**[P1] Confirm `ingest-states.yml` cron is actually firing from main**
- Partially resolved 2026-05-15; mechanism updated 2026-06-15
- **Resolved (mechanism):** `ingest-states.yml` now self-schedules on `main` (`schedule: cron "30 7 * * *"`, daily 07:30 UTC), sharding 10 states/day by day-of-month % 5 so all 50 cycle every 5 days within the 250 req/day OpenStates limit. The earlier cross-branch `dispatch-state-ingest.yml` dispatcher (which fired `workflow_dispatch` onto `launch/production`) no longer exists — `main` is the canonical deploy branch now, so the dispatcher is unnecessary.
- **Remaining (monitor):** confirm the on-`main` cron has actually been running and the downstream ingest succeeds — `gh run list --workflow=ingest-states.yml`. Close once a green run is verified.
- STATUS: Done
<!-- card-id: f80ffd2b-5b5d-4274-bd1c-94b03784b5d5 -->

**[P2] Consolidate duplicate `AlignmentScore` type into one source of truth**
- Surfaced 2026-06-15 as a follow-up to the limited-data-notice wiring (the `kept: 0` card), which required editing the `AlignmentScore` shape in TWO places.
- `AlignmentScore` is defined twice: `src/lib/structured-blocks.ts` (server/canonical) and `src/prototype/realData.ts` (client prototype copy). Any field change must be made in both, so they can silently drift.
- **Fix:** one canonical definition (or a shared types module) that the other file imports — one source of truth for the data shape. Also covers the `redesign/delegationData.ts` consumer.
- **Constraint to respect:** the prototype is intentionally self-contained; confirm the import doesn't drag server-only code into the client bundle. Pick the canonical home accordingly.
- STATUS: Done
<!-- card-id: dfc934fd-ade1-4974-b781-db1aa9b79419 -->

**[P2] Delete drifted legacy frontend (supersedes #27)**
- Flagged 2026-06-07; the app IS the prototype now
- `src/app/page.tsx` now renders `<VoterChoiceApp/>` directly; `src/app/PageContent.tsx`, `src/components/BallotToolClient.tsx`, and related pre-rebuild landing code are dead. Remove them in a dedicated cleanup pass (the stale landing tests were already rewritten to the new shell).
- Perf follow-up: `src/app/layout.tsx` loads 6 Google Font families via `<link>` for the in-app mood/palette switcher, but production hardcodes `data-mood='civic'` — consider trimming to the Civic families (IBM Plex Sans/Serif/Mono) for the prod default to cut font payload.
- STATUS: Done
<!-- card-id: f3bfe5e0-dc5e-403b-bc38-2306e5c0965f -->

**[P1] Golden-address alignment smoke test — fail when alignment silently goes blank**
- The 2026-06-26 prod incident (empty `DATABASE_URL` + unapplied migration lines) silently blanked ALL alignment and only surfaced via manual testing — e2e stayed green because it asserts UI structure, not real data. This card adds a test that fails when a known address returns empty alignment. Complements (does not duplicate) the [P0] "Prod `DATABASE_URL` was EMPTY" migration audit and the schema-vs-migrations drift guard deferred in `claude-code-handoff/conductor-resume-2026-06-28.md`.
- Anchor on verified real data: John Cornyn (TX Senator) + `healthcare_affordability` — post-fix `lookupAlignment()` returns a non-empty result (≈18 healthcare votes observed at incident time). Assert `{ found: true, total >= 1, contributingVotes.length > 0 }` — a real WITH/AGAINST badge backed by actual votes, not just a rendered DOM node. `resolveCandidateId()` already handles "Cornyn."
- WHERE it must run: a PR-time test against a fresh CI DB would NOT catch this class (CI applies the migration → column exists → green, while prod sits behind). Run the assertion post-deploy against live prod, and/or add a deploy-time schema-vs-migrations drift check. A PR-time migrate+seed test only guards "code references a column no migration creates" — useful, but false confidence for THIS bug.
- Current e2e is 100% mock-based (no test DB), so this is NEW infra, not a quick add.
- STATUS: To Do
- DECISION (Muxin, 2026-06-28): build the deploy-time schema-vs-migrations drift check as the PRIMARY guard — cheapest, deterministic, and it targets this exact bug (prod sitting behind a migration). Layer the golden-address smoke (Cornyn / `healthcare_affordability` non-empty) on top as defense-in-depth once the drift check lands. (Alternatives weighed: post-deploy prod smoke — needs prod creds + a fail/rollback story; PR-time migrate+seed — cheapest but misses prod drift.)

**[P2] Add Playwright visual snapshots to key redesign surfaces**
- Catch unintended visual regressions automatically so manual review can focus only on intended design changes.
- Add `toHaveScreenshot()` baselines for the delegation workspace, rep card, scorecard, and home hero; gate by extending the existing e2e job in `.github/workflows/test.yml`.
- Caveat: visual snapshots are maintenance-heavy and flaky across CI environments — keep scope tight. Lower value than the golden-address data smoke test above; sequence it after that by priority, not as a hard dependency.
- STATUS: Backlog
