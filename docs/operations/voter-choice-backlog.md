# Voter Choice Backlog

Issues, monitoring gaps, data-quality concerns, and enhancement ideas. **Reorganized 2026-06-07 by product phase** (model below). Resolved items moved to `voter-choice-backlog-archive.md` on 2026-06-12 to keep the board live-state-only.

**Severity:** `P0` = blocking / silent bad data · `P1` = meaningful user impact · `P2` = improvement / polish · `idea` = not yet scoped

## ✍️ Adding cards (cheat sheet)

- New card = a block of text with a blank line around it. The board stamps `STATUS` + an id for you.
- Big task? Start the block with a **[P1] Bold title** and bullet the details underneath.
- `## Headings` group cards into phases (the purple tag on the board).
- `- DEPENDS ON: <other card title>` marks a blocker (fuzzy-matched; fix mis-matches on the board).
- **Keystone/design cards:** `GOAL_CONDITION` must name specific `npm run design:parity-gate` scenario IDs the card must pass (e.g. "parity-gate passes 04-scorecard, 09d-edit-issues") — or say explicitly why a scenario is waived — plus full-page before/after screenshots attached (`npm run design:review-gallery`). Prose like "matches the canvas" is not a valid goal condition. Per `docs/operations/keystone-fidelity-fix-plan-2026-07-08.md` Phase 3 — a build worker runs the gate locally and iterates until green *before* opening the PR; the gate report (exit code + per-scenario results) is the required `GOAL_EVIDENCE`, and a code-reading self-vet alone is never sufficient for design work (memory `feedback_visual_selfvet_insufficient`).
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

**[P0] We need a deployment/test environment/server/branch?**
- Don’t know how to do this, but essentially how do we test the app’s new features without deploying it to the live app?
- SPEC (2026-06-30, approved): **Vercel Preview Deployments + a Neon test branch.** Each feature branch builds to an isolated preview URL (behind Vercel SSO); the preview env gets its own `DATABASE_URL` → a **Neon test branch** (child of prod, copy-on-write — same mechanism as the existing `alignment-work` branch), so feature testing + migrations NEVER touch prod data or live users.
- Build steps: (1) create a Neon `test`/`staging` branch; (2) set preview-scoped Vercel env (`DATABASE_URL` → test branch + non-prod flag defaults); (3) confirm preview deploys are enabled per-branch; (4) document the workflow + a re-branch cadence to refresh test data. ATTENDED (needs Vercel + Neon dashboard access).
- Enables: safe DB-migration testing (apply to the test branch first), the golden-address smoke (run against the test branch), pre-launch dogfooding on a private URL.
- Trade-offs (accepted): extra env surface (guard against a preview pointing at prod DB); Neon branch drifts from prod until re-branched; preview ≠ 100% prod mirror (Redis/rate-limit/cold-starts differ); SSO-gated so external testers need access.
- STATUS: To Do
- DECISION: defer (unattended) — ATTENDED (Vercel + Neon dashboard setup); do not auto-run.
- GROOMED: ready: approved SPEC + enumerated build steps; ATTENDED/dashboard card, routes SURFACE unattended + 2026-07-01
- PARKED: needs Muxin external setup: create Neon test branch + Vercel preview env (dashboard access, no agent path) 2026-07-03
<!-- card-id: 446b9327-0e99-42ae-9924-589749281854 -->

**[P0] Replace the Sunday bill-tagging cron with a /schedule cloud cron (off the front-end API key)**
  - Also double check if any other backend work is using up the API key. API key should ONLY be used for front end user chat in the app.
  - WHY: `ingest-tag-bills.yml` still runs `schedule: cron: "0 9 * * 0"` on
  `origin/main`, calling the Anthropic **Batch API** with `ANTHROPIC_VOTER_API`
  (the *front-end* key). This drained the monthly budget (spikes 6/21 + 6/28).
  Verified 2026-06-28: PR #177 (disables the cron) was OPEN/unmerged. UPDATE
  2026-06-30: **PR #177 MERGED** — the Sunday `schedule:` API cron is now OFF on
  main, so the front-end-key drain is stopped. (`tagging-reminder.sh` hook still
  unwired; no cloud cron yet.)
  - WAS blocked on PR #177 (now MERGED 2026-06-30, so the double-run risk is
  gone). Remaining blocker before the cloud cron: the OPEN QUESTION below — can
  the /schedule cloud runner auth as the subscription + reach the prod Neon DB?
  - TASK: stand up a `/schedule` cloud routine (weekly, ~Sun) that tags on the
  **subscription** via the SUBAGENT/Workflow path (port `_pole-retag.workflow.js`'s
  one-Sonnet-agent-per-~100-bill-batch logic) — NOT by running `tag-bills.ts` or
  `tag-bills-batch.ts`: VERIFIED 2026-06-30 both call the metered API key
  (`new Anthropic({apiKey})` + `messages.create`), so running them inside a
  routine would STILL burn metered credits. Only the agent's OWN subagent work
  bills to the subscription. DB I/O via the pure scripts
  `_export-untagged-batches.ts` + `insert-issue-tags.ts`.
  - VERIFIED 2026-06-30 (Claude Code docs): routines run on the SUBSCRIPTION by
  default (not metered API), and CAN reach the prod DB — set `DATABASE_URL` as a
  routine env var + switch the environment's Network access to Custom and
  allowlist the Neon host (default "Trusted" blocks outbound with a 403). ⚠ No
  secrets store yet: env vars are visible to anyone who can edit the environment,
  so use a LEAST-PRIVILEGE Neon role/branch for the routine, not the full prod URL.
  - REMAINING (exec):
    - Routine limits: 4 vCPU / 16 GB, min schedule interval 1hr (weekly OK),
  per-account daily run cap, max-runtime UNDOCUMENTED — design bounded-batch-per-run
  + resume so a 31.7k-bill backfill survives a cutoff.
    - Scope/limit per run (untagged backlog ≈ 31.7k bills; honor
  `skip_reason`/migration 0007 so non-issue bills aren't re-submitted weekly).
    - Idempotency + a green/failure signal (replace the old workflow's failure
  webhook).
  - ON SUCCESS: delete the dead Sunday `schedule:` block entirely (keep
  `workflow_dispatch` for manual backfill), and either wire or retire
  `scripts/ops/tagging-reminder.sh` since the cadence is automated again.
- DECISION (2026-07-01): write target = DIRECT to prod `issue_tags`, gated by the `_retag-gold-check.ts` gold gate before persisting each batch. Scope INCLUDES writing a net-new general untagged-bill tagging workflow (subagent path, modeled on `_pole-retag.workflow.js`) — the existing workflows are specific re-tags, and the only general tagger today is the metered `tag-bills.ts`, which we are NOT using.
- STATUS: To Do
- DECISION: defer (unattended) — ATTENDED build (cloud routine + Neon role/network setup needs your Claude/Neon dashboards); do not auto-run.
- GROOMED: ready: WHY/TASK/verified-constraints/remaining-exec all present, no blocking unknown + 2026-07-07
- PARKED: needs Muxin: /schedule cloud cron setup + subscription auth (external); drain already stopped by merged #177 2026-07-03
<!-- card-id: c86714c6-d3d7-4019-a03d-4d4c6816f7e4 -->

**[P1] Refactor the codebase**
- Do it if it makes sense for code maintainability - I’m assuming doing this will make the app more foolproof, run faster, be easier to audit and work better.
- Note - on 7-7-26 I updated the status back to backlog instead of done
- SUPERSEDED 2026-07-04: this card was unrunnable as written (too vague to execute); replaced by card 66123a2b, which produced a scoped proposal doc (docs/operations/refactor-proposal-2026-07.md, PR #225) with 6 concrete candidates for Muxin to greenlight individually. Closing this card now that the scoping work is done.
- STATUS: Done
- DECISION: Auto run the deployment - if it’s not destructive (and it shouldn’t be), I accept all recommendations on the approach.
<!-- card-id: 026d900e-8c7b-47e6-a7ba-bd0aad3e6bde -->

### General

**[P3] Decide tablet/mobile Edit-Issues prominence**
- Edit IS reachable via the scorecard "Edit" button (PR #173) but a tester could not find it — discoverability, not a missing feature.
- DEFERRED to P3 (2026-06-30): re-evaluate AFTER the redesign lands — may be moot once the new layout ships. Parked in Backlog until then.
- STATUS: Backlog
<!-- card-id: 05b9ca68-e9ff-4701-aa1b-0ab86041871c -->

**Finish Spanish coverage for remaining redesign surfaces**
- After PR #168 wired the main body, these still render English: tier-intro paragraphs (Federal/Executive), SeatChat / RepCard / HandoffModal / ScorecardPrintView, App2 stage error strings (geocodefail/norep/dberror), IssueConversation refinement fallbacks. Add t() keys + ES.
- STATUS: Done
- GROOMED: ready: named surfaces + t()+ES approach; UI -> HOLD lane; GC: listed surfaces render ES + 2026-07-01
<!-- card-id: 7855fddd-e389-483c-9e55-163a4c011870 -->

**[P1] API usage hits limits but no details why**
- 2x in June I’ve received unexpected Anthropic emails that the monthly credits were used up. It’s uncertain whether these are real users (just more traffic), a bot, or something else.
- It could even be higher usage than we expected for the app. My core assumption is most people will NOT engage with the research chatbot (which appears on the candidate cards page). So most usage should only be at the issues step, where users describe their concerns and have Haiku parse their concerns.
- We need to be able to understand how Haiku is being used in each session to understand if its usage is related to behaviors.
- I am open to other suggestions and hypotheses for why I'm seeing unexpected usage, because I have not heavily marketed this app yet. I've only mentioned it in random blue sky replies or in small community forums for early testing. I was not expecting a lot of users, but I do not know if that could also be the case.
- Either way, I do not know if we have a built-in system to track this information automatically and be able to understand what's happening and where.
- It's also possible that my API key was compromised somehow, which means that we have not done due diligence in making sure that it's not exposed. 
- GROOMED (2026-06-30): startable unit is an ANALYSIS first — define which per-session Haiku metrics we can capture WITHOUT violating the privacy policy (aggregate per-session call counts / tokens / endpoint / timestamp; NO concern-text content, NO PII), THEN instrument from that spec. The "key compromised / exposed" hypothesis overlaps the retrospective security audit — share findings.
- DECISION (2026-07-01, Muxin): APPROVED to record content-free per-session Haiku usage — call counts, token totals, endpoint, timestamp; NO message text, NO PII — AND update the privacy-page copy ("no analytics/telemetry" / "IPs not logged") so it stays truthful. Instrument-half should COORDINATE with held PR #151 (which adds `chat_usage_metrics` but misses the research sub-agent — see cross-cutting card), not build a parallel path.
- AGENT-FIRST (reclassified 2026-07-01): an agent RUNS the metric spec + builds the content-free per-session instrumentation (stacking on / folding into #151's `chat_usage_metrics`, incl. the research sub-agent path) + drafts the privacy-copy edit, all in a PR. Your step = review that PR, especially the privacy-page wording — a PR review, NOT a mid-run stall. Must NOT deploy or mutate prod.
- GOAL_CONDITION: a PR adds per-session content-free usage capture (call count / tokens / endpoint / timestamp; NO text, NO PII) covering the chat + research-sub-agent paths, plus the matching privacy-page copy edit; tsc/tests green; nothing deployed. (Sequenced with #151 — don't fork a parallel metrics path.)
- STATUS: Done
- DECISION: approved (formalized from Muxin's 2026-07-01 card note) — content-free per-session usage capture (call counts/tokens/endpoint/timestamp; NO message text, NO PII) + privacy-page copy edit, coordinated with PR #151 chat_usage_metrics (no parallel path); PR ONLY — must NOT deploy or mutate prod
<!-- card-id: c160abf1-890d-4222-a8f6-6ee21b70ea29 -->

**[P1] Settings button has no functionality**
- "Settings button does not show any functionality"
- Mechanical bug — renders but is a no-op. Wire a settings panel or remove before launch.
- STATUS: Done
<!-- card-id: 403ed2a6-1ddd-4c17-ba12-fed04efa32d1 -->

### Top Bar

**[P2] Rename / reorganize top-bar + footer navigation**
- "It is confusing to me that the homepage is How It Works in the top bar. I would expect How It Works to be the page called
Methodology, which I think might be a bit of difficult word."
- "A lot of the links repeat from the top bar. I would keep About, Rename Support to Contact, and Privacy Policy."
- NOTE: complements existing nav/footer cards — reconcile at grooming.
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: b1a5f64a-cd8c-47a0-8cb5-d9eaf0794977 -->

**[P2] Add a "Why Now?" page for the fact snippets + the larger case**
- "I think another Page of Why Now? would be good where the fact snippets could live and you could make a larger case for the
site."
- STATUS: Done
<!-- card-id: 9031f1ce-e4f3-44c7-89c7-3bbb664be988 -->

### Home Page

**[P2] Simplify the Registered Address entry box**
- "There is a lot happening in the Your Registered Address box, from title, to text box, to button, to text above and below, as
well as a popup if the question mark is clicked. I think I would only keep pull my reps button, the text box, and Enter Your
Registered Address."
- "Underneath that entry box, I would add Unsure? Read about how it work and how we use your data followed by 01 Enter your
address in addition to the text that was in the popup, then followed by steps 2 and 3."
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 1850349c-0bcd-46d0-8b76-970d964389ba -->

**[P1] Strengthen homepage headline + CTA; de-clutter the hero**
- "I think Hold Congress to its record. is good for the website SEO, but it does not give me a sense of what this site is for. I
think a stronger, clearer CTA that folds in what the site does would be stronger."
- "While the 2 fact snippets are interesting, they clutter the visual and make the next action less clear."
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: b4cc1c9e-b7c2-4442-ae5c-1a25af5272d3 -->

### Issues / Lock-in

**[P2] Show jurisdiction context on the issues page, not as a separate results block**
- "I do not think that the Your seat at the national table is necessary, or at least not in its current form. I think adding this
to the issues page previously would be clearer. I.e. These are your issues 1 (decided on state level), 2 (decided on federal
level), etc."
- NOTE: overlaps the Fed/State issue-label work — reconcile at grooming.
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 9143a622-82fc-4ab1-8a19-90823453856a -->

**[P2] Make the "Lock These In" box bigger / more prominent**
- "I think the Lock Theses In box could be bigger."
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 4b7e5a66-4013-4274-ac67-183ba240b92a -->

### Results flow

**[P1] Reduce panel clutter in results — one visible panel, simpler progress**
- "The Your Issues and the Rep/Senator sections are both on the left and right. I think at most one should be visible, preferably
on the right. Additionally, the progress bar is not necessary if you keep the current set up of Reviewing Now, Not Yet Reviewed,
and Reviewed on the right."
- "Remove see where you stand until it's ready, there is so much here already."
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 335829af-98e9-454e-a014-42f41eb95c7d -->

**[P2] Distinguish + de-emphasize non-2026 representatives**
- "I am also not sure if it is worth adding the non-2026 representatives to the list. I would have a grey background instead of
white and state earlier that they are not up for election. I would also not include them in the score card."
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 97eda1e0-9894-405e-8284-de18b546d43b -->

**[P1] Make "Print My Scorecard" discoverable after the last rep**
- "After you finish the third representative, it is not clear what to do next. You can miss easily miss the print my score card
button."
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 1f77c3eb-909d-4ff2-95a6-180e89603da7 -->

**[P1] Add a guided orientation screen before rep review begins**
- "I would start with a page before this saying: Next, you will be shown your three representatives, where they stand on the
issues you care about, how they are funded and influenced. You can also find alternative candidates running for the seat. At the
bottom of the page, you will be asked to replace or keep the current representative. You will do this for all representatives and
can then print out your scorecard. Let's move to the first candidate."
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 0b9d40c9-82ca-40e5-bf82-9a23bb4769f5 -->

### Scorecard

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
- GROOMED (2026-07-01): AUTO may BUILD (migration + ingest code) + open a PR, but must NOT apply the migration or run the ingest against prod unattended — the prod write + Stock Watcher fetch is a human step. GOAL_CONDITION: `member_stock_transactions` migration + ingest script exist + tsc/tests green (no prod mutation).
- STATUS: Done
<!-- card-id: f4ed7ab6-bc45-482d-84d6-6bf014b2d355 -->

**[P1] Scorecard layout + print-quality overhaul**
- "The next step regarding the score card representatives was not clear as both, regardless of worth keeping or time to replace,
had the same checked box. There is not easy way of differentiating which one is to be kept or replaced. Additionally, I think that
the X/Y votes matched you would be better made into a percentage."
- "All headings could be a lot bigger."
- "I also think I would lead with the vote decisions rather than what I need to vote, my address, districts, etc."
- "I would also really recommend a white background for the site, so the scorecard look better when printed."
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 78f5ce94-9b47-4857-b13b-f148af45c491 -->

**[P2] Include unpaid civic orgs and lobbying contacts**
- From Peter Scheipers: I wonder whether one could also include the politician's membership in unpaid civic organizations as well as lobbying contacts. I am not too familiar with the US system, but I believe that politicians have to disclose their memberships in civic organizations (with exceptions) and lobbyist organizations have to disclose if they pay more than USD 6000 to a single politician within a 6 month period. 
- PLAN — split into two tracks; very different data (2026-06-26):
  - NOTE: the card's "$6,000 / 6 months" figure is NOT a US rule (different jurisdiction).
  - Track A — civic-org memberships / positions (per-member, feasible): the annual Financial Disclosure "Positions Held Outside U.S. Government" schedule lists board/officer/trustee roles in orgs incl. non-profits/civic groups, paid or not. Source: House Clerk / Senate EFD FDs (PDF-heavy); OpenSecrets has FD-derived data (ProPublica API is dead). Cleanly attributable to one member.
  - Track B — lobbying (issue/industry-level, coarser): Lobbying Disclosure Act LD-2 quarterly filings name client/issues/chamber lobbied — rarely a specific member, so per-member attribution is weak. Senate LDA bulk XML/API + OpenSecrets aggregates. Better at issue/industry level than per-member.
  - Recommendation: small research SPIKE first to confirm source formats (structured vs FD-PDF parsing), licensing, per-member match feasibility — THEN scope. Likely ship Track A first; treat Track B as issue-level context, source-linked, labeled disclosure (not accusation).
- GROOMED (2026-06-30): CONFIRMED — do the research SPIKE first; the ingest BUILD is a follow-on card scoped from the spike's output. Build deferred to spike findings.
- AGENT-FIRST (reclassified 2026-07-01): the spike RUNS unattended — an agent produces the two-track source inventory (formats, license/terms found, per-member match feasibility) + a go/no-go recommendation per track, in a PR. The licensing/product judgment (redistribution OK? surface lobbying?) rides on the FOLLOW-ON build card the spike scopes, not here — so nothing stalls waiting on you until that build card.
- GOAL_CONDITION: a findings doc inventories Track A (FD "Positions Held") + Track B (LDA LD-2) — source format, license/terms, per-member match feasibility each answered — with a go/no-go per track + a drafted follow-on build card. Research only; no ingest, no prod write.
- STATUS: Done
<!-- card-id: 797088b2-4667-4835-ad6c-a2b59a8cac06 -->

### House/Senate parity

**[P1] EPIC: Go-live launch gate (do these ONLY when flipping to public)**
- Umbrella — NOT in-scope work until we're ready to launch. Rolls up the final "flip to public" toggles so they don't get mistaken for normal work. Each member points a dependency at this card, so the AUTO lane never picks them early. Closes at go-live when all members are done.
- Members: Lower CHAT_DAILY_SESSION_LIMIT 100→10 · Reset Polis count to 0 · Translations to major languages.
- STATUS: To Do
- DECISION: defer (unattended) - card's own PARKED note says this is a manual go-live gate Muxin flips herself at launch; conductor must never auto-build
- GROOMED: ready: umbrella tracker, members named, closes at go-live + 2026-07-04
- PARKED: not an executable task — manual go-live gate Muxin flips herself at launch; conductor must never auto-build this 2026-07-05
<!-- card-id: 0054bb72-cb87-46a6-987d-9cebaeb3e0eb -->

**[P0] Reset Polis count to 0 before launch**
- STATUS: Backlog
- DEPENDS ON: [P1] EPIC: Go-live launch gate (do these ONLY when flipping to public)
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
- STATUS: Backlog
- DEPENDS ON: [P1] EPIC: Go-live launch gate (do these ONLY when flipping to public)
- DECISION: defer — out-of-band Vercel env change; surface the `vercel env rm CHAT_DAILY_SESSION_LIMIT production` + redeploy commands for Muxin to run at launch.
<!-- card-id: 28bf87ec-8587-4d1f-acc7-ab5ff7467cf4 -->

**[P1] Translations to major languages**
- Flagged 2026-06-12 (pre-launch) — Muxin. DRAFT card; confirm the language set + wording.
- The app currently ships English + Spanish. Before public launch, add translations to major languages. The i18n plumbing already exists: `src/lib/translations.ts` (UI strings, en/es) and the en/es system-prompt variants (`ballotPromptEn.generated.ts` / `ballotPromptEs.generated.ts`, synced via `npm run sync:ballot-prompt`).
- **Language set (TBD — confirm):** a defensible starting point is the federally-relevant ballot languages under Voting Rights Act §203 — Spanish (done), plus Chinese, Vietnamese, Korean, Tagalog, and the Native American / Alaska Native language groups where covered jurisdictions require them. Choose the set deliberately rather than "all major world languages." (Suggested by Claude — confirm.)
- **Sequencing note:** Translation work depends on the final Phase 1 UX/UI — don't translate strings that are still changing. Blocks on the "[P1] Phase 1 UX/UI finalized (redesign complete)" milestone above (this carries forward the old "no translations until the UX is ironed out" instruction from the retired ES-locale card).
- GO-LIVE GATE (2026-06-30): also a member of "[P1] EPIC: Go-live launch gate" — do NOT translate until launch prep. (Machine dep stays on Phase-1-UX since a card carries only one; the EPIC link is organizational.)
- STATUS: Backlog
- DEPENDS ON: Phase 1 UX/UI finalized (redesign complete)
<!-- card-id: 2b325135-bafc-454f-b253-5bce21e05a13 -->

**[P1] EPIC: Phase 1 UX/UI finalized (redesign complete)**
- Flagged 2026-06-12 — Muxin. Milestone/umbrella card; rename or fold into your redesign tracking if you keep it elsewhere.
- The phasing model says Phase 1 is "largely built; needs prod-hardening + redesign UX." This card represents that redesign / UX-and-UI finalization as a single gate, so downstream work that can't start until the surface is stable has something concrete to block on.
- Added new Polis UI changes 6/15
- Not a code task in itself — it closes when the Phase 1 redesign UX/UI is locked.
- STATUS: Backlog
- DEPENDS ON: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
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
- GROOMED: ready: umbrella tracker, rolls up named alignment sub-cards + 2026-07-04
- PARKED: not an executable task — umbrella tracker card, closes only when its listed alignment sub-cards are Done; conductor must never auto-build the tracker card itself 2026-07-05
<!-- card-id: f474c4b8-e8c0-4129-9a67-4705a1370efe -->

**[P1] Establish a launch-flag convention for pre-launch features**
- Make the ad-hoc env-flag pattern coherent so unfinished features can ship to prod but stay DARK to live users until a coordinated go-live flip (like a real product launch).
- Today it's ad-hoc — `NEXT_PUBLIC_BALLOT_ENABLED`, `CAN2026_DISPLAY_ENABLED`, `VOTER_ISSUE_EVENTS_ENABLED`, budget flags — with no single convention or inventory.
- TASK: (1) define a `LAUNCH_*` (or similar) flag convention, default OFF in prod; (2) inventory every not-yet-launched surface and give each a flag; (3) document the flip-list; (4) tie the flips into the "[P1] EPIC: Go-live launch gate" so go-live is one coordinated step.
- Pairs with the test-env card (test OFF prod) and the Go-live launch gate EPIC (the checklist); this is the on-prod "keep it dark" layer.
- AGENT-FIRST (reclassified 2026-07-01): an agent RUNS the codebase inventory + defines the `LAUNCH_*` convention (default-OFF) + drafts the flip-list in a PR, flagging each surface it's unsure is "pre-launch". Your step = confirm/prune the pre-launch set in that PR review — NOT a mid-run stall.
- GOAL_CONDITION: a PR adds a single `LAUNCH_*` flag helper/module (default-OFF in prod) + a documented flip-list enumerating every candidate not-yet-launched surface (each marked confirmed/uncertain), wired to the Go-live gate EPIC; tsc/tests green; no flag flipped ON.
- STATUS: Done
- GROOMED: ready: AGENT-FIRST spec + explicit GOAL_CONDITION on card + 2026-07-01
<!-- card-id: a09a77c8-b3b7-4315-a1b3-dbc03a881cff -->

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
- STATUS: Done
<!-- card-id: 8e4ef0f3-8475-404e-b54d-cbe1153e6bf0 -->

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
- STATUS: Done
<!-- card-id: 2d1e6f97-c0ce-4bc5-9179-1ee86d4d64ea -->

**[P1] Unify House and Senate candidate card design + info architecture**
- "Is it intentional that the screen for House vs Senate candidates is a bit different? One (senate) has expandable sections, all
sources from govtrack, and 'With you' vs 'Against you'; the other (house) doesn't have expandables, position examples are from
various sources, they're hidden unless you unhide the candidate, and it says 'Aligned' instead of 'With you'."
- Direction (Muxin): "Lean towards making default clean and lean and clear. Progressive info reveal to show the summary and
sources - just not all at once."
- NOTE: the "Aligned" vs "With you" label + source-display inconsistencies are also mechanical bugs; relates to "[P0] Design
Candidates UX flow".
- STATUS: Done
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
<!-- card-id: 05b995c8-2ca9-418a-b872-3cbeb17d0b3f -->

**[P0] Edit Issues missing in Tablet Mode**
- In both mobile and tablet screens, I cannot find the ‘left panel’ anywhere -no ability to edit my issues
- STATUS: Done
<!-- card-id: ef8d602c-223a-4188-828c-ed8126e404ab -->

**[P1] Header and Footer are redundant**
- Privacy should be at the top after About
- Tip jar on far upper right corner
- Add Support to the top as well
- Footer - remove links, keep the voter choice and © 2025 Grey Bird LLC. All Rights Reserved.
- STATUS: Done
<!-- card-id: c9891a1f-ba31-4dce-bd1b-0ce372c9de12 -->

**[P0] Retrospective whole-app security audit**
- NOT `/security-review` — that command (and `/review`) only scans the current branch's pending diff, which the orchestrator already runs per-PR. This is the retrospective we never did after shipping a lot: step back, threat-model the whole app, poke holes, reinforce.
- Surfaces to cover: Anthropic API key exposure/usage (ties to "[P1] API usage hits limits") · chat/Haiku endpoints (rate-limit, input validation, prompt-injection, cost-abuse) · secrets in CI/deploy.yml (DATABASE_URL via Bitwarden → GITHUB_ENV) · address/geocode + DB query paths (PII, injection) · session + durable rate-limiter · public API routes (/api/counters, /api/delegation).
- AGENT-FIRST (reclassified 2026-07-01): an agent RUNS the whole threat-model pass unattended and opens a PR carrying a findings report + drafted follow-up cards. Your only step = review that PR and triage the follow-ups — a PR review at the end, NOT a mid-run stall.
- GOAL_CONDITION: a findings report doc (e.g. `docs/security/audit-2026-07.md`) exists covering every listed surface, each finding rated + paired with a proposed follow-up card; tsc/tests unaffected (analysis only — no app-code fix, no prod access).
- DECISION (updated 2026-07-01): AUTO MAY run the analysis pass + open the report PR; it must NOT fix-as-you-find and must NOT access prod. The per-PR /security-review stays as-is in the orchestrator.
- DECISION (2026-07-01): deliverable = findings REPORT + one triaged follow-up card per real issue; do NOT fix-as-you-find (keeps the orchestrator light, fixes reviewed individually). METHOD (attended single-pass vs multi-agent fan-out) is NOT pre-decided — Step 1 is to scope/triage the attack surface, and that breadth decides the method.
- STATUS: Done
- DECISION: approved (formalized from Muxin's 2026-07-01 card notes) — read-only whole-app threat-model pass; deliverable = findings report PR (docs/security/audit-2026-07.md) + one drafted follow-up card per real issue; must NOT fix-as-you-find, must NOT access prod
<!-- card-id: 850b1220-9de9-4aee-814f-470b8096f164 -->

#### Phase 1 alignment quality — Congress = federal; parallel data work, not redesign-blocking:

**[P1] `reproductive_rights` and `immigration` canonical issues have very thin tag coverage**
- Flagged 2026-05-15
- `reproductive_rights`: 619 tags (1.5% of corpus). `immigration`: 407 tags (1%). `border_security`: 155 tags (0.4%). These are the three thinnest canonical issues.
- **Impact:** Voters who care about reproductive rights or immigration will often see 0–2 contributing votes even for active state legislators, which reads as "this candidate doesn't address this issue" when the reality is "we don't have enough tagged bills." This is the most politically significant taxonomy gap given that reproductive rights is a top-tier voter concern in 2026.
- **Why thin:** State legislatures rarely have explicit "reproductive rights" bill language — bills are titled by their regulatory mechanism (gestational limits, clinic licensing, etc.). The tagger is less confident matching these to the canonical issue without explicit text, leading to low-confidence drops. Federal bills are better labeled but we have fewer of them.
- **Fix:** **Partly addressed (PR #114):** `src/lib/alignment/poleVocabulary.ts` now gives the tagger explicit pole definitions + bill signals for these issues, and widened `reproductive_rights` Pole B to cover contraception / IVF / Title-X / family-planning (so a contraception restriction no longer falls through to the wrong side). **But `TAGGER_VERSION` was deliberately NOT bumped, so no bills were re-tagged — the improved prompt only helps a FUTURE run.** Remaining (handoff item 6): run a focused re-tagging pass — bump `TAGGER_VERSION` (or target specific bill ids) — on states with relevant legislative histories (TX, FL, OH, GA, NC, AZ, WI for reproductive rights; TX, AZ, FL for immigration).
- **DECIDED 2026-06-17 (Muxin): TARGETED re-tag** (not a full-corpus TAGGER_VERSION bump). Build a bill-selector (the named states + keyword/title filters for repro/immigration topics) + a force-retag flag on the tagger, then re-tag just that subset via Claude Code subscription subagents (overnight batch). Surgical, low regression risk to other issues' tags. Validate the re-tagged subset against the gold gate before/after. The CODE (selector + force-retag flag) is buildable now; the prod re-tag RUN is the overnight subagent job.
- STATUS: Done
- DECISION: approved (Muxin 2026-07-02, batched sit-down — aligned with conductor recommendations)
- GROOMED: ready: Muxin already DECIDED targeted re-tag approach; selector + force-retag flag buildable now (overnight run itself needs separate go-ahead, like cf55573b) + 2026-07-04
<!-- card-id: e782e72f-5c9c-41c5-aedc-7e95f586dbc4 -->

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
- DEPENDS ON: [GATE] Phase 1 complete → open Phase 2
<!-- card-id: 0338a55a-ee3f-4867-9611-2518a6ae9266 -->

**[P2] IL bill coverage lagging (31.8% — worst of high-volume states)**
- Flagged 2026-05-15
- Illinois has 8,379 bills — the largest state corpus — but only 31.8% are tagged. Sunday cron will close this slowly.
- If IL is a priority, a targeted manual tagging run (100 batches × 300 bills) would close it in one session.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 1 complete → open Phase 2
<!-- card-id: d16de86e-3e7d-4f59-bd63-15e7825344cc -->

**[Phase 2] [P1] No alignment data for non-legislative candidates (executive, judicial, local)**
- Flagged 2026-05-15
- The `candidates` table and `votes` table only contain state house/senate members and federal House/Senate members. Statewide executive candidates (Governor, Lt. Governor, Attorney General), judicial candidates (judges), county officials, city council, school board, and ballot measure races have no entries in the DB.
- **Impact:** For ballots that are entirely or mostly non-legislative (primaries, runoffs, off-cycle local elections), `lookup_alignment` returns `found: false` for every candidate. The entire chat session falls back to web search. Our proprietary voting record data plays no role. The May 26, 2026 Texas DEM runoff ballot is an example: Lt. Governor, AG, Court of Appeals, County Judge, District Clerk — none covered.
- **Partial mitigation:** Web-search-based alignment scoring (see idea below). Full fix requires new data sources (executive campaign finance, AG actions, bill signing records) — significant scope.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 1 complete → open Phase 2
<!-- card-id: f52273a5-38ee-4f58-a6fa-edb1d4b43c2b -->

**[P1] Second candidate missing alignment block when first has one**
- Flagged in Muxin's 2026-05-18 E2E run, needs verification
- In one observed session, the first candidate in a race had a complete alignment block, but the second candidate did not. The structural fallthrough for non-legislative candidates is already covered by the "No alignment data for non-legislative candidates" P1 above, but the web-search alignment fallback added in commit 5bc3585 was specifically intended to backfill these cases — and it didn't fire here.
- **Suspected cause:** The prompt path that routes to `web_search` for non-legislative candidates isn't being taken reliably. The model may be short-circuiting after the first candidate's lookup succeeds, or the per-candidate iteration may be silently skipping the fallback branch.
- **Verification needed:** Spot-check a session with a Texas non-legislative race (Lt. Governor, AG, Court of Appeals are all good test cases). Capture the AI's tool calls and confirm whether `lookup_alignment` falls through to web-search emission for each candidate that returns `found: false`. If it doesn't, file as a separate P1 with the tool-call transcript.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 1 complete → open Phase 2
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
- DEPENDS ON: [GATE] Phase 1 complete → open Phase 2
<!-- card-id: f5d6a886-da2c-4f0e-827c-fee3e3ebc035 -->

**[idea] Polis viz: usage tracker + social share**
- Flagged 2026-05-18 — growth / social-proof
- Two small additions to the Polis viz surface:
  1. Social-proof banner near the viz: "N voters in [county] have used this tool" — needs a counts query against the existing session/participation data.
  2. "Share this tool" CTA next to the viz, with prefilled copy and OG image.
- **Why:** Both are low-cost trust-builders and growth nudges. The counts banner especially helps in counties where the viz is still warming up — even a modest "47 voters in Travis County" reads as legitimacy.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 1 complete → open Phase 2
<!-- card-id: 2269ffae-a02c-4561-83c9-1d9a0661b910 -->

---

## Phase 3 — Accurate ballot ingestion (gated on traction / Ballotpedia)

All ballot upload/parse/extraction, party gates, measures, and a reliable ballot source. Pursue only if traction justifies the cost/effort.

**[P2 / idea] Open-primary party-selection flexibility + pre-print party confirmation**
- Flagged 2026-06-05 from R4 multi-state verification; DEFERRED by Muxin — core ballot accuracy is higher priority
- The party gate currently fires for ANY primary whose ballot spans multiple party lanes (`isPrimaryLike && racesSpanMultipleParties` in `VoterChoiceApp.tsx`), regardless of `getStateRule`. R4 testing on a WI open-primary ballot confirmed it fires for open primaries too.
- **Muxin's intended flow (scope creep, deferred):** at the gate, ask "which party do you want to vote for?"; if the voter doesn't know / wants to browse, let them **see BOTH parties**; then add a step **before printing the final ballot** that helps them choose which party to commit to (based on their answers/picks) and **confirm before the printout** — so an open-primary voter can browse everything and commit to one party only at print time (you may legally vote only one party's primary).
- Likely also wires `getStateRule` into the gate COPY (closed → "your registered party" + unaffiliated-voter notice; open → free choice; top-two → no gate). Not for this session.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: 8bc7e9e5-f4c1-4b70-bc71-347b06a9c9ff -->

**[P1] Party-primary FILTERING of the ballot ("2 Senate races")**
- Flagged 2026-06-03
- Rebuild task #25
- In a closed/semi-closed PRIMARY the ballot carries BOTH parties' primary contests. The gate captures the voter's party, but the displayed races are NOT yet filtered to that party → both the Democratic and Republican Senate primary show (the "2 Senate races" the user saw).
- Fix: thread the gate selection (registered_dem / registered_rep / unaffiliated→chosen party) into ballot derivation and filter partisan contests to the selected primary; keep non-partisan races. In a GENERAL election, show ALL candidates (no filter, no gate).
- Verify end-to-end with the real NJ June primary PDF (registered Dem → only DEM races) AND a November general scenario (all candidates, no gate).
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: 2a68bab6-4dd7-4f21-817b-de9446085dac -->

**[P1] Google Civic `voterinfo` rarely returns the ballot (contests) — heavy reliance on upload/paste**
- Flagged 2026-06-03
- We DO request the ballot: `/api/civic` calls Google `civicinfo/v2/voterinfo` for `contests` (not just polling-location logistics). But Google's Civic election/ballot data is sparse and unreliable — Google deprecated much of it (the `representatives` endpoint shut down in 2025; `voterinfo` contest data is populated only for some elections, often only near election day, and is spotty by state). So for many addresses (incl. NJ) it returns 0 contests and the app correctly falls back to the upload/paste `BallotLookupNeeded` screen. This is a Google limitation, not our bug — but it means we **cannot rely on Civic for the ballot**.
- **Action (evaluate pre-launch):** add a more reliable ballot-contest source (e.g. BallotReady / Democracy Works, Ballotpedia, or per-state SOS feeds) so most users get an auto-pulled ballot instead of having to upload a sample ballot. Keep upload/paste as the universal fallback.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
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
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
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
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
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
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
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
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: 1ed1c65b-c4ed-4b3a-a5cd-53128c053ab8 -->

**[P1] Google Civic ballot lookup unreliable for Texas (and likely other states)**
- Structural, partially mitigated
- Harris County 77002 returns "0 races, Not confirmed" from Google Civic. The PDF ballot upload fallback works well (confirmed with real DEM Harris ballot). But users who don't know to upload a PDF will see the "not confirmed" state and may not realize there's a fallback.
- **Mitigation in place:** PDF upload is surfaced in the UI with a `<details>` section and clear instructions. pdfjs-dist extraction confirmed working.
- **Remaining gap:** No proactive prompt to upload when Civic lookup fails — user must discover the `<details>` section themselves.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: 7f8a78f3-9ef9-4d6e-bb3a-af3df78b7e4e -->

**[idea] AI plain-language "what's at stake" for ballot measures — alongside the official text**
- Flagged 2026-06-07 — deferred by Muxin (verbatim measure body shipped in PR #65)
- Build on `race.measureBody` (official ballot summary now captured verbatim during extraction — `extract-prompt.ts` → `Race.measureBody`, rendered in `PropositionCard`, `src/prototype/VoterChoiceApp.tsx`).
- Add an AI-generated plain-language summary + "If yes / If no" outcomes, fed the captured `measure_text` as its source. **Hard constraint (Muxin): render the AI summary IN ADDITION to the verbatim official text — never hide or replace the original.**
- Needs an honesty guard (no claims beyond the source) and adds a summarization call + token cost. The existing `PROPOSITION_DETAIL` mock path already shows the summary + If-yes/If-no shape this would populate from real data.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
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
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: b1a14253-12ad-4030-9446-f4275f3b4c24 -->

**[P2] Detector threshold tuning from production telemetry**
- By-design
- `extract.detector_decision` telemetry is logged for every routing decision. Once we have ~100 real ballots through the route, pull the logs and tune `EXTRACTION_DETECTOR_DICT_FLOOR` / `_VOCAB_FLOOR` / `_PROPER_NOUN_FLOOR` in Vercel env without redeploying.
- Defaults are 0.6 / 5 / 5; the right floor depends on what real ballots look like in pdfjs's output.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: 69ed6fcd-09d9-47cc-b64f-8157e046cb89 -->

**[P2] Progressive UX during multi-page extraction**
- Out-of-scope follow-up from PDF bakeoff decision.md
- Worst-case 14-page Hidalgo bilingual ballots take ~90s wall-clock even with per-page parallelism. A single spinner reads as broken.
- Stream race results into the UI as each page's Sonnet call returns — the route returns once all pages stitch, but the client can show "found 5 races so far…" instead of waiting silently.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: 0708be5c-b49f-4183-b165-aac379e131f1 -->

**[P2] Hash-based caching for repeat PDF uploads**
- Out-of-scope follow-up from PDF bakeoff decision.md
- If a voter uploads the same PDF twice (page reload, tab close), the route currently re-spends $0.04–$0.55 of Sonnet vision.
- Hash the PDF on upload, cache by hash → JSON result (Redis with 7d TTL). Saves cost + latency on repeat uploads. Out of scope for v1 ship.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: 25d56ebf-9589-4e75-a36e-cf9c9b4d78f8 -->

**[P2] Surface early-vote site addresses + precinct numbers from Google Civic**
- Flagged 2026-06-12 — residual lifted from two cards resolved 2026-06-10 (now in the archive): "[P1] Election DATA must cover ANY upcoming election" and "[P1] Printable ballot shows generic placeholders". DRAFT card — revise wording as needed.
- Remaining from the 2026-06-10 address-logistics work (branch claude/alignment-election-data-rules-smlqus): the congress-assessment flow surfaces real polling place/hours, but early-vote SITE addresses and precinct numbers are not yet pulled through from the Google Civic `voterinfo` response when it carries them.
- Populate them into the workspace bar + printable scorecard. Honesty bar: never show a site or precinct we didn't actually resolve.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 2 complete → open Phase 3
<!-- card-id: 937407c8-a38d-4a1e-bdb5-ba53460ecb14 -->

---

## Cross-cutting / Operations (any phase)

**[P1] Bill-summary generation pipeline - subscription subagents, batched, ongoing**
- Generate `bills.plain_summary` (plain-language <=2-sentence summaries) so the vote card shows a real summary. The WIRING + a seed script (`scripts/ingest/summarize-bills.ts`, metered-API version) shipped in #136; THIS card is the generation RUN + ongoing pipeline.
- Mechanism (Muxin): run via Claude Code SUBSCRIPTION + subagents in BATCHES (zero metered-API cost; same approach as bill-tagging), NOT the metered API. Prioritize vote-referenced bills first, then the rest of the corpus.
- PIPELINE, not a one-off: make it repeatable / auto-run for newly-ingested bills so new vote-bills get summaries automatically.
- IMPORTANT - the per-vote DISPLAYED summary must combine BOTH pieces to be USEFUL: (1) what the bill is about (this card) AND (2) how/why the rep voted = the synthesized rationale (f9cc6279). They're composed in the Unified vote explainer (8ea00aad). The same subscription-subagent batched-pipeline approach applies to f9cc6279's rationale generation.
- Style: plain language, active voice, <=2 sentences, no title repetition, no trailing ellipsis, self-contained (rendering shows it in full or shows nothing).
- NOTE (automation only): the auto-run/ongoing piece reuses the /schedule cloud-cron-runs-subscription-with-DB pattern proven by the tagging-cron card (formal dep below). The one-time generation RUN does NOT block on this — run it via subscription subagents anytime.
- STATUS: To Do
- DEPENDS ON: [P0] Replace the Sunday bill-tagging cron with a /schedule cloud cron (off the front-end API key)
- DECISION: defer (unattended) - card's own PARKED note: needs Muxin's explicit go-ahead for this long-lived subscription batch job (not a PR-shaped task)
- GROOMED: ready: mechanism pinned (subscription subagents, batched); GC: before->after plain_summary counts; dep-blocked on tagging-cron + 2026-07-01
- PARKED: needs Muxin go-ahead: subscription batch generation RUN (long-lived job, not a PR-shaped card) 2026-07-03
<!-- card-id: cf55573b-7d28-467e-b15b-3e07a0f5202f -->

**Unified vote explainer - bill summary + how they voted + why**
- One block in the vote detail combining: (1) what the bill was about - plain-language summary (bills.plain_summary, from #136); (2) how the member voted - roll-call; (3) why - the synthesized stated rationale (from f9cc6279), clearly labeled + source-linked.
- Degrade gracefully: when no rationale exists for a vote (common - members explain contested/messaging votes, rarely party-line/procedural ones), show 'no stated reason found' - never imply silence = no position (show-thin-records principle).
- DEPENDS ON both the bill-summary work and the rationale layer (f9cc6279). The rationale layer is DONE (PR #145); the open upstream is the bill-summary RUN — formal dep below.
- RESCOPED (2026-07-01, Muxin): the 3-part composition (bill summary + WITH/AGAINST roll-call badge + labeled memberRationale with source links) is ALREADY LIVE in `ContributingVoteCard` (`VoterChoiceApp.tsx` ~1310-1390). ONLY remaining piece = render an explicit "no stated reason found" element when a vote has no rationale (today the block is silently omitted). Reduce this card to that small UI addition. The bill-summary DEPENDS ON only affects the "what the bill was about" line for un-summarized bills — soft, non-blocking.
- STATUS: To Do
- DEPENDS ON: Bill-summary generation pipeline - subscription subagents, batched, ongoing
- DECISION: defer (unattended) - card's own PARKED note: blocked on unbuilt bill-summary (cf55573b) + rationale layer (f9cc6279), also a FE design-experience feature
- GROOMED: ready: rescoped to one UI element (no-stated-reason fallback, VoterChoiceApp ~1310-1390); UI -> HOLD + 2026-07-01
- PARKED: blocked on unbuilt bill-summary (cf55573b) + rationale layer (f9cc6279); also a FE design-experience feature 2026-07-03
<!-- card-id: 8ea00aad-bbaf-4482-875b-eb65d57b895a -->

**[P1] EPIC: Implement the Keystone redesign (port design_handoff) — BACKEND-GATED**
- Port the new design from design-handoff/ (DECISIONS.md + README.md + screens-*.jsx) into src/prototype/redesign/*, surface-by-surface. Bold Flag palette as default. Evolve shipped components, don't fork.
- BACKEND-GATED per surface — a surface ships ONLY when its data exists; show honest 'not available yet' until then (no empty shells):
- - Candidates / head-to-head (6a1fb1fb) -> needs researched challenger/executive alignment scores (f52273a5). The challenger side has NO score data today.
- - Polis report -> needs per-session vectors + clustering (the Polis-report-data backend card above).
- - Funding-detail (FunderPanel) -> needs the chamber-median aggregate card. ✅ SHIPPED + LIVE 2026-06-25 (PR #152): MedianChip + "Raised vs. the median" scale wired onto the rep funding panel; honest dollar-only when no median. Backend #143 plumbed through delegationData -> peerComparison VM.
- - Bill-detail -> needs vote.tally/status card + plain summaries (cf55573b).
- - Orientation / results-layout / scorecard / homepage / why-now / statics / intake -> NO new backend; port freely.
- Preserve the design's honest-state discipline (PAC honesty, never blend roll-call/researched, donor-unavailable path, 'no votes match', divided Polis). Closes the ~18 design cards (e688d5a6 + UX cluster) as surfaces land.
- PROGRESS (2026-06-25, conductor): funding-detail surface integrated + deployed (the design-handoff "Raised vs. the median" feature). MoneyGapH2H component is PORTED + tested but NOT wired — the head-to-head/duel surface doesn't exist yet (6a1fb1fb) and challenger alignment scores don't exist; wiring it would fabricate data. Remaining handoff surfaces stay backend-gated. Moved to Review for Muxin to assess the umbrella's remaining (gated) surfaces.
- STATUS: To Do
- DECISION: defer (unattended) - per Muxin's 2026-06-26 decision, Keystone redesign EPIC proceeds as its own dedicated future session, surface-by-surface, not a single auto-picked task
- GROOMED: ready: umbrella tracker, per-surface backend-gating already specified + 2026-07-04
- PARKED: not an executable task — Keystone redesign umbrella EPIC; Muxin's 2026-06-26 decision was to do this as a dedicated future session, surface-by-surface via its own member cards, not a single auto-picked task 2026-07-05
<!-- card-id: c44193cf-134d-4685-8e98-159ab411cbd7 -->

**[P3] De-dup inline address steps vs the existing three-step walkthrough**
- Surfaced by PR #157 (simplify address box).
- The new inline 01/02/03 steps under the address box overlap in intent with the existing full-width HowItWorksWalkthrough ("From address to printed ballot in three steps") that also renders below the hero.
- DEFERRED to P3 (2026-06-30): re-evaluate AFTER the redesign lands — the inline steps + walkthrough may both change, so this de-dup may resolve itself. Parked in Backlog until then.
- STATUS: Backlog
<!-- card-id: 8807920f-0f26-4430-878e-6c012f03835b -->

**[P2] Add Playwright visual snapshots to key redesign surfaces**
- Catch unintended visual regressions automatically so manual review can focus only on intended design changes.
- Add `toHaveScreenshot()` baselines for the delegation workspace, rep card, scorecard, and home hero; gate by extending the existing e2e job in `.github/workflows/test.yml`.
- Caveat: visual snapshots are maintenance-heavy and flaky across CI environments — keep scope tight. Lower value than the golden-address data smoke test above; sequence it after that by priority, not as a hard dependency.
- GROOMED (2026-07-01): parked in Backlog — attended by nature (first-generated baselines need a human to eyeball) and the e2e job is a REQUIRED status check, so flaky visual specs would deadlock PRs (add as a NON-required leg; generate baselines in the Ubuntu CI runner). Honors the card's own "after the golden-address smoke" ordering (that card is Backlog, blocked on the test-env).
- STATUS: Backlog
<!-- card-id: d1d54852-fcda-40d1-9487-f0910383a8a2 -->

**[P0] Golden-address alignment smoke test (Cornyn / healthcare_affordability) — defense-in-depth on the drift guard**
- The defense-in-depth layer Muxin sequenced AFTER the deploy-time drift check (DECISION 2026-06-28: "layer the golden-address smoke on top once the drift check lands"). The drift check shipped in PR #179.
- Assert that a known real address/candidate returns NON-EMPTY alignment so a silent data-blank is caught even when the schema is technically present. Anchor: John Cornyn (TX Senator) + healthcare_affordability — lookupAlignment() should return { found: true, total >= 1, contributingVotes.length > 0 } (~18 healthcare votes observed at incident time). resolveCandidateId() already handles "Cornyn."
- WHERE it runs — RESOLVED 2026-06-30: run against the **Neon test branch** in the new test-env (the "seeded test DB" option; that's why this card DEPENDS ON the test-env card). The heavier alternative (post-deploy prod smoke) is set aside. The drift check (PR #179) already covers the "prod behind a migration" class; this catches "schema present but data empty."
- NEW infra, not a quick add.
- STATUS: Backlog
- DEPENDS ON: We need a deployment/test environment/server/branch?
<!-- card-id: 2baacd7e-901d-4407-8dcb-26ce56ed9fbc -->

**[GATE] Phase 1 complete → open Phase 2**
- Milestone GATE — NOT a buildable task; keep in Backlog. Stays here until Phase 1 is shippable and you decide to open Phase 2.
- Marking this Done unblocks every Phase 2 card that DEPENDS ON it (and, once the auto-promote loop ships, lets them flow Backlog→To Do). Keep the title EXACT/stable — DEPENDS ON matches on it.
- STATUS: Backlog
<!-- card-id: b5ecb804-6403-4c95-b7e0-4c7e8e99b3c9 -->

**[GATE] Phase 2 complete → open Phase 3**
- Milestone GATE — same idea, one phase up. NOT a buildable task; keep in Backlog until you open Phase 3.
- Marking this Done unblocks every Phase 3 card that DEPENDS ON it. Keep the title EXACT/stable.
- STATUS: Backlog
<!-- card-id: 726d732a-9c49-4e1f-9473-0266ba78994b -->

**Verify CHAT_USAGE_METRICS_ENABLED is actually turned on in prod**
- recordChatUsage (chat route + research paths) is a no-op unless CHAT_USAGE_METRICS_ENABLED=true in the deploy env. Confirm on Vercel prod, else chat_usage_metrics stays empty despite migration 0011 being applied.
- ATTENDED: Vercel dashboard check (out-of-band).
- Follow-up from card c160abf1-890d-4222-a8f6-6ee21b70ea29 '[P1] API usage hits limits but no details why' (auto-filed 2026-07-01).
- STATUS: Backlog
<!-- card-id: 7eb03d21-f494-4bd8-8ea7-7cc2409786a5 -->

**Build a lightweight admin/ops view over chat_usage_metrics**
- Data is captured (chat + research, content-free) but there is no dashboard/query surface to see call counts / token totals / spend-by-callKind over time.
- The original 'no visibility into why usage spikes' complaint is not closed until Muxin can look at this without hand-writing SQL via db-exec.ts.
- Follow-up from card c160abf1-890d-4222-a8f6-6ee21b70ea29 '[P1] API usage hits limits but no details why' (auto-filed 2026-07-01).
- STATUS: Backlog
- DEPENDS ON: Verify CHAT_USAGE_METRICS_ENABLED is actually turned on in prod
<!-- card-id: 6247a0dd-a376-402e-95c4-f27dd8682448 -->

**[P2] Translate CAN2026 curated-context section in RepCard (CanContextSection/RATING_LABELS)**
- English-only today; renders nothing until the CAN2026 ingest runs (display also gated by CAN2026_DISPLAY_ENABLED). Translate when that surface ships.
- Follow-up from card 7855fddd 'Finish Spanish coverage for remaining redesign surfaces' (auto-filed 2026-07-01).
- STATUS: Backlog
<!-- card-id: 2c177f54-c10f-422c-be20-1e9d28d578a3 -->

**[P2] BUILD: Civic-org positions (Track A) + lobbying issue-context (Track B)**
- Ingest FD 'Positions Held Outside U.S. Government' per member (bioguide-keyed) and LDA LD-2 issue-level lobbying context (client x issue x chamber, NOT member-keyed).
- Carries three explicit OPEN DECISIONS for Muxin (deliberately not decided by the spike): (1) EIGA statutory fit for redistributing FD-derived data, (2) OpenSecrets currency fallback for Track A, (3) whether/how to surface non-member-attributable lobbying for Track B.
- Scope from docs/research/civic-orgs-lobbying-spike.md (spike card 797088b2, auto-filed 2026-07-01).
- STATUS: Backlog
<!-- card-id: f5eaa16c-a84e-4a38-8ea2-31cf23d4e156 -->

**Apply migration 0013 and run stock-transactions ingest live (ATTENDED)**
- Apply db/migrations/0013_add_member_stock_transactions.sql to prod (additive — db-exec.ts --file ... --yes per convention), then DATABASE_URL=<neon> npx tsx scripts/ingest/stock-transactions.ts --live; verify row counts + spot-check members against official filings.
- SETTLE FIRST (security review, PR for f4ed7ab6): (a) batch upsert aborts wholesale on one oversized/out-of-range row (numeric(14,2) overflow, btree external_id size) — add per-row bounds/chunking; (b) filing_url is dataset-controlled and silently overwritable on upsert conflict — consider host allowlist / URL-change alerting.
- Follow-up from card f4ed7ab6 '[P2] Include stock transactions' (auto-filed 2026-07-02).
- STATUS: Backlog
<!-- card-id: 8a1edadb-7e91-4194-a37c-677f6c87e22d -->

**Render member stock transactions in the UI**
- Member profile / candidate card influence section reading member_stock_transactions: ticker, asset, buy/sell, amount RANGE (never a point estimate), txn + disclosure dates, official filing link. Sanitize/validate filing_url before rendering as href (security review note: value originates from an unauthenticated community dataset).
- Follow-up from card f4ed7ab6 '[P2] Include stock transactions' (auto-filed 2026-07-02).
- STATUS: Backlog
- DEPENDS ON: Apply migration 0013 and run stock-transactions ingest live (ATTENDED)
<!-- card-id: 8b17a03a-6818-46d0-822f-240b789df27b -->

**Investigate a stronger per-row idempotency key for stock transactions**
- buildExternalId uses a composite string key (dataset+filing+ticker+description+date+type+amount+owner) — neither source carries a per-row id. Measure real collision rate after first live ingest; decide if parsing official PDFs for a row index is warranted.
- Follow-up from card f4ed7ab6 '[P2] Include stock transactions' (auto-filed 2026-07-02).
- STATUS: Backlog
- DEPENDS ON: Apply migration 0013 and run stock-transactions ingest live (ATTENDED)
<!-- card-id: 5b6b24e5-0880-46a7-bd9f-bcff81b62c3b -->

**Monitor Stock Watcher dataset liveness + provenance**
- Card's original S3 bucket URLs returned 403 (2026-07-02); ingest now points at community GitHub-hosted JSON (mutable branch tips, no pinning/checksums, no LICENSE published). Add a lightweight liveness/anomaly check before this becomes a scheduled job; consider pinning or diff-alerting (security review low findings).
- Follow-up from card f4ed7ab6 '[P2] Include stock transactions' (auto-filed 2026-07-02).
- STATUS: Backlog
<!-- card-id: cde905bb-d0e8-42f9-9e3b-2c3fd64d9246 -->

**[P3][docs] Confirm the privacy notice discloses address egress to the US Census Bureau and Google Civic**
- INFO/legal: code handles the entered address cleanly (never logged/stored) but Census (keyless) + Google Civic is the sole point where voter PII leaves the system — confirm the privacy notice states this.
- FIX: verify/update the privacy notice. Refs: census-geocode.ts:144; civic/route.ts:286. Overlaps the privacy-copy work in card c160abf1 / PR #181.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Review
- GROOMED: GROOMED (2026-07-02): approved by Muxin 2026-07-02 — PR HELD for her wording eyeball (privacy copy). GOAL: privacy notice discloses address egress to US Census Bureau + Google Civic
<!-- card-id: 34415c86-4937-4f1a-9a41-e42d9383df30 -->

**Migrate existing ad-hoc flags onto isLaunchFlagEnabled()**
- Route CAN2026_DISPLAY_ENABLED / VOTER_ISSUE_EVENTS_ENABLED / POLIS_VECTOR_COLLECTION_ENABLED / CHAT_USAGE_METRICS_ENABLED through the new src/lib/launch-flags.ts helper (LAUNCH_ prefix) for single-source-of-truth reads. Card a09a77c8 deliberately kept the convention additive (no rewire, no behavior change).
- Do AFTER Muxin confirms the pre-launch set at PR review. Follow-up from card a09a77c8 (auto-filed 2026-07-02).
- STATUS: Backlog
<!-- card-id: 73ed075e-337d-44c3-b853-8124617b6a83 -->

**Classify CHAT_USAGE_METRICS_ENABLED: go-live flip vs ops toggle**
- DECISION for Muxin: does this internal cost-telemetry flag belong on the go-live flip-list (pre_launch_dark) or is it just an operational toggle? Currently marked UNCERTAIN in LAUNCH_FLAG_REGISTRY + docs/operations/launch-flip-list.md.
- Overlaps card c160abf1 / PR #181 (which added the metric). Follow-up from card a09a77c8 (auto-filed 2026-07-02).
- STATUS: Backlog
- DEPENDS ON: none
<!-- card-id: 6aa18301-d349-4ee5-9ff4-27ebcde7c33f -->

**Muxin sign-off on the shipped translation-set tier(s)**
- DECISION for Muxin: which tiers to build. Spike recommends Tier 1 = Chinese/Vietnamese/Korean/Tagalog (all §203-triggered Asian-language groups); Tier 2 = Cambodian/Khmer, Navajo (if AI/AN pursued); Tier 3 = likely skip. Separately decide whether to add population-driven non-§203 languages (Arabic, Russian) as an explicitly-labeled choice.
- Evidence in docs/research/vra-203-language-set-spike.md. Unblocks the '[P1] Translations to major languages' epic's language-set TBD. Follow-up from spike d885108b (auto-filed 2026-07-02).
- STATUS: Backlog
<!-- card-id: c981fa96-a3f4-4596-bf2f-9205858bfdc2 -->

**Re-check the language set against the 2026 VRA §203 determination once published**
- This spike used the 2021 Census §203 determination (latest as of 2026-07-02). The next determination is expected ~Dec 2026 (5-yr cycle). If the translation BUILD lands after it publishes, re-verify the language list + jurisdiction counts before shipping.
- Informational/timing-dependent. Follow-up from spike d885108b (auto-filed 2026-07-02).
- STATUS: Backlog
- DEPENDS ON: none
<!-- card-id: 88ede995-4678-4df1-ad1a-ae3e588ac188 -->

**Verify MPI LEP-population figures directly before external citation**
- migrationpolicy.org's LEP-by-language chart returned HTTP 403 to automated fetch; the Chinese/Vietnamese/Korean LEP figures (1.6M/850K/630K) came from corroborated search snippets, not a primary fetch. Manual browser check before citing externally (PR desc / public doc).
- Follow-up from spike d885108b (auto-filed 2026-07-02).
- STATUS: Backlog
- DEPENDS ON: none
<!-- card-id: 4268c35d-e72f-49bf-bd18-b41afde0b67c -->

**[P2] Baseline analysis of chat_usage_metrics — verify the "most usage is the issues step" assumption**
- Traces to the open core of "[P1] API usage hits limits but no details why": "My core assumption is most people will NOT engage with the research chatbot... most usage should only be at the issues step" and "We need to be able to understand how Haiku is being used in each session to understand if its usage is related to behaviors." The CAPTURE half (that card's PR + the #151 research-sub-agent fix), the prod-flag verification, and the ops view are all separately filed — but no card actually runs the analysis and answers the question.
- TASK: once metrics are flowing in prod, query >=7 days of `chat_usage_metrics` (read-only, via scripts/ops/db-exec.ts) and write a short findings note: per-endpoint call/token breakdown, share of sessions that touch the research chatbot vs. issues-step parsing only, top-N sessions by tokens, and any anomalous sessions (unusually high call counts or token totals).
- Explicitly confirm or refute the stated assumption, and establish the post-PR-#177 baseline (the Sunday-cron drain is already stopped) so a future "credits used up" email can be attributed from data instead of guesswork.
- Content-free data only (counts/tokens/endpoint/timestamp per the 2026-07-01 DECISION) — no message text, no PII in the note.
- Read-only against prod; no schema change, no deploy, no app code. DEPENDS ON: Verify CHAT_USAGE_METRICS_ENABLED is actually turned on in prod.
- GOAL_CONDITION: A findings note exists quantifying >=7 days of prod chat_usage_metrics — per-endpoint calls/tokens, research-chat vs issues-step session share, top-N sessions by tokens, anomalies flagged — and explicitly confirms or refutes the "most usage is the issues step" assumption; no app code, schema, or prod data changed.
- ORIGIN: proposed by propose-cards 2026-07-02 from epic [P1] API usage hits limits but no details why (c160abf1-890d-4222-a8f6-6ee21b70ea29)
- STATUS: Backlog
<!-- card-id: b36e8fb9-bfdf-4df6-8667-557c537f87c9 -->

**[P2] Spot-check ingested stock transactions against the official House/Senate disclosure portals**
- Traces to "[P2] Include stock transactions" PLAN: "House/Senate Stock Watcher community datasets ... via public S3; spot-check vs the official portal" — the ingest, UI render, idempotency, and dataset-liveness monitor cards are filed, but no card validates our ingested rows against the authoritative filings.
- TASK: after the live ingest runs, sample >=20 rows from `member_stock_transactions` across >=5 members (both chambers) and compare each field — member, ticker, buy/sell, amount RANGE, transaction date, disclosure date — against the matching PTR on disclosures-clerk.house.gov / efdsearch.senate.gov.
- Output a short findings note: per-field match rate, every discrepancy listed, and an explicit go/no-go on trusting the Stock Watcher path for the UI render card. Complements (does not duplicate) the ongoing dataset-liveness monitor card: this is one-time row-level accuracy validation of OUR ingested data.
- Read-only against prod (scripts/ops/db-exec.ts); no schema change, no app code, no prod write. DEPENDS ON: Apply migration 0013 and run stock-transactions ingest live (ATTENDED).
- GOAL_CONDITION: A findings note exists comparing >=20 sampled member_stock_transactions rows (>=5 members, both chambers) field-by-field against the official House/Senate portal filings, with per-field match rates, all discrepancies enumerated, and an explicit go/no-go for the UI render card; nothing in prod is modified.
- ORIGIN: proposed by propose-cards 2026-07-02 from epic [P2] Include stock transactions (f4ed7ab6-bc45-482d-84d6-6bf014b2d355)
- STATUS: Backlog
<!-- card-id: 997c2d64-7248-49d4-8452-a520396dc386 -->

**[P1] Execute the documented LAUNCH_* flip-list at go-live (member of the Go-live launch gate EPIC)**
- Traces to "[P1] Establish a launch-flag convention for pre-launch features" TASK (4): "tie the flips into the '[P1] EPIC: Go-live launch gate' so go-live is one coordinated step" — the gate EPIC's filed members cover the chat-limit reset, Polis reset, and translations, but no card actually performs the coordinated flag flip.
- TASK (ATTENDED, at launch only): walk the flip-list produced by the launch-flag convention PR, flip every CONFIRMED flag ON in prod env config, redeploy via fresh `vercel --prod` (never `vercel redeploy` — it reuses old env), and verify each listed surface is visible on the live site. Flags still marked uncertain are skipped and escalated to Muxin, never flipped.
- Membership: "[P1] EPIC: Go-live launch gate (do these ONLY when flipping to public)". DEPENDS ON: [P1] Establish a launch-flag convention for pre-launch features (the flip-list + helper must be merged first).
- GOAL_CONDITION: Before: every flip-list surface is dark in prod. After: every flag marked confirmed on the documented flip-list is ON in prod, a fresh production deploy is live, and each listed surface is verified visible on the live site; no uncertain/unconfirmed flag was flipped.
- ORIGIN: proposed by propose-cards 2026-07-02 from epic [P1] Establish a launch-flag convention for pre-launch features (a09a77c8-b3b7-4315-a1b3-dbc03a881cff)
- STATUS: To Do
- DECISION: defer (unattended) - ATTENDED-at-launch-only task per its own PARKED note; formalizes the defer its sibling go-live-gate cards already carry
- GROOMED: ready: clear task + GOAL_CONDITION; stated blocker (a09a77c8) already Done, no live dependency + 2026-07-04
- PARKED: ATTENDED-at-launch-only task (flips live prod flags + fresh vercel --prod deploy) — member of the Go-live launch gate EPIC, must never run before actual launch; missing the DECISION: defer its sibling gate cards carry 2026-07-05
<!-- card-id: 44c7b8c0-4f0c-43c7-ad35-e38e2afed0d9 -->

**Decide i18n approach for the legacy prototype VoterChoiceApp inline translations**
- - src/prototype/VoterChoiceApp.tsx (legacy ballot app behind NEXT_PUBLIC_BALLOT_ENABLED) carries its own inline TRANSLATIONS + binary EN/ES toggle, independent of src/lib i18n; the switcher is also a binary toggle (~2571, 3882-3890).
- - A real 3rd user-facing locale needs a decision here: port the prototype to the shared registry, generalize its inline system, or accept en/es-only in the legacy surface. Product-judgment call, not mechanical.
- - Discovered while building card 63ebc159-26e3-4079-a14d-838fb95f1b90 (i18n plumbing generalization).
- CHAIN: 1
- STATUS: Backlog
<!-- card-id: 4a0ff3eb-e0d0-4722-998f-5cda588aaeb0 -->

**[P2] Run the --live STOCK Act PTR ingest against prod (APPROVED)**
- - DECISION: approved (Muxin 2026-07-02, batched sit-down) — run AFTER the 2 medium findings card is Done and migration 0013 is applied (additive; conductor applies via db-exec.ts per standing policy).
- TASK: run the ingest script with DATABASE_URL + --live; verify row counts + spot sample; report before→after.
- GOAL_CONDITION: member_stock_transactions populated in prod (count > 0), spot-checked sample matches source PTRs, no batch aborts in the run log.
- CHAIN: 1
- STATUS: Backlog
<!-- card-id: 7d78e3d2-d815-48b6-b6a8-7711c2f24eab -->

**Fix singular deadline bug in stateInfo.deadlineStatus (n=1)**
- - stateInfo.deadlineStatus(days) at src/lib/translations.ts:655 (EN) and :1349 (ES) has the identical n=1 pluralization bug fixed in deadline.daysLeft: renders "1 days left"/"Quedan 1 días" at n=1. Currently only asserted with days=5, so untested at n=1.
- FIX: same n===1 singular branch as deadline.daysLeft; add a unit test at n=1 for both locales.
- Originating card: 975bc054 Fix singular deadline label copy (found during its build).
- CHAIN: 3
- STATUS: Backlog
<!-- card-id: 0400c20b-462e-413f-b27b-d80772e6dc82 -->

**Anonymous chat-cost telemetry undercounts multi-round turns (recordChatUsage sees only the last round)**
- - Follow-up from 9596413f (per-round budget recording): while fixing recordUsageAsync to record every round, found that recordChatUsage (the separate anonymous per-request cost-telemetry table) has the same root-cause bug and was deliberately left alone (out of this card's scope, which was specifically recordUsageAsync/the durable budget store).
- WHY: usage.input/output/etc. in the /api/chat streaming loop are OVERWRITTEN by each round's message_start/message_delta (each round is an independent Anthropic API call), not accumulated. recordChatUsage is still called ONCE at the very end of the turn with whatever usage holds at that point — i.e. only the LAST round's numbers. A multi-round tool-use turn silently undercounts its true cost in this telemetry table (earlier rounds are dropped), though the real durable budget spend is now correct (fixed in 9596413f).
- TASK: give recordChatUsage the same per-round treatment — call it once per round (or accumulate a separate running total across rounds and call it once at the end with the true sum) so the telemetry table reflects real per-request cost for multi-round turns.
- GOAL_CONDITION: a simulated 2-round tool-use chat turn records a recordChatUsage total (or per-round sum) equal to round1 + round2 tokens, not just round2 (unit test).
- Originating card: Record chat usage incrementally per round (close the TOCTOU budget race fully) (9596413f-ebcb-49c0-a3e2-21bb3e3d5bff).
- CHAIN: 1
- STATUS: Backlog
<!-- card-id: 11f15795-97fa-4e3d-a4a0-3dff5d8392dd -->

**[P3] Decide whether to prettier-format Markdown docs, given a demonstrated content-corruption bug**
- - Discovered while building 843ac43c ([P3] One-time prettier format sweep): prettier mangles snake_case identifiers sitting next to italic-asterisk emphasis on the same line (e.g. `axis_type: **contested** *(reclassified...)*` became `axis*type: **contested** *(reclassified...)_`) — a real content corruption, not cosmetic. Caught in docs/alignment/POLE_VOCABULARY.md only because poleVocabulary.test.ts asserts on it; the identical signature was found (via a scripted grep) in 5 more docs with zero test coverage: docs/ALIGNMENT_DATA_MODEL.md, docs/alignment/ALIGNMENT_LEDGER.md, docs/alignment/FUNDRAISING_POLE_MAP.md, docs/design/2026-redesign/F1_EXTRACTION_HANDOFF.md, docs/operations/BILL_TAG_AUDIT.md.
- The format sweep (PR #221) excluded ALL Markdown docs from formatting rather than just the ones caught, since the corruption isn't provably confined to what one narrow regex catches.
- DECIDE: (a) leave Markdown out of format:check/format scope permanently (add a .prettierignore for docs), (b) find/pin a prettier version or markdown-parser config that doesn't mis-parse snake_case-adjacent-emphasis, or (c) manually reformat docs and accept the review burden of checking for corruption each time.
- CHAIN: 1
- STATUS: Backlog
<!-- card-id: 36484268-c4ba-4764-a83b-c781f3ed7fa9 -->

**[P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)**
- - Muxin: my earlier Bold Flag palette pass (public/prototype.css, worktree wt-apply-the-bold-flag-palette-as-the-default) was NOT the real design source -- design-handoff/ (then claude-code-handoff/) was incomplete. The actual spec is "Voter Choice - Keystone Design Session (Standalone).html" (a self-contained, bundled interactive canvas -- must be rendered in a browser to inspect; source is compressed/not greppable as plain text) cross-checked against the repo in HANDOFF-EXACT-MATCH.md (both now under design-handoff/keystone-canvas/, per the new design-handoff root convention -- see the standing-rule card).
- HANDOFF-EXACT-MATCH.md is authoritative: "treat every approved artboard as the frontend spec: exact layout, exact component structure, exact classes/tokens, exact copy unless flagged. Where canvas and repo disagree, canvas wins for anything visual/structural... do not take direction from the canvas and reinterpret; port it."
- Section 0 of that doc already resolves approved-vs-reference-only per section (11 sections: Orientation, Results, Color, Scorecard, Candidates, Homepage, Why Now, Statics, Intake, Polis, Money-gap) -- only ONE artboard per section is the design, the rest are rejected alternates kept for the record.
- Section 1 gives per-section repo-vs-canvas status: Orientation = CONFIRMED GAP (current OrientationView doesn't match OrientationActivated at all -- no flagbar, no ori-card treatment, no numbered steps). Money-gap = CONFIRMED CORRECT (peerComparison.ts matches exactly). Most others (Results, Color/palette, Scorecard, Candidates, Homepage, Why Now, Statics, Intake, Polis) are UNVERIFIED (component exists, structure plausible, pixel/class parity not confirmed against canvas).
- Section 3 lists genuinely open items to NOT build as final: homepage headline voice (3 options, unpicked), "Lock these in" box (not designed yet), Polis nav placement (already resolved, not open), Polis Phase 8b data pipeline (data gate, not a design gap).
- Section 5's recommended order: (1) fix OrientationView first -- confirmed gap, anchor screen; (2) confirm/port the Bold Flag palette into public/redesign2.css's actual consumed token set BEFORE anything else (my earlier pass targeted prototype.css; redesign2.css consumes the same custom-property names cascading from prototype.css's :root, so verify whether that's sufficient or whether redesign2.css needs its own explicit port -- check first, don't assume); (3) then work the VERIFY list section by section, screenshotting each stage at the canvas's 1180px content width and diffing against the approved artboard.
- GOAL_CONDITION: every section in HANDOFF-EXACT-MATCH.md section 0's table renders matching its approved artboard (verified via side-by-side screenshot comparison), OrientationView specifically fixed first, and no reference-only/rejected artboard gets built.
ORIGIN: Muxin, live conversation 2026-07-04 (supersedes/corrects the Bold Flag palette-only attempt from earlier this session)
- UNBLOCK 2026-07-07: root cause of the interpretation/rework loop = missing design source; recovery + parity-pipeline plan at docs/operations/keystone-design-source-plan-2026-07.md (see the [P0] TOP PRIORITY card above — resume this epic only through its Phase 6).
- STATUS: Review
- DEPENDS ON: [P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline
- DECISION: approved (Muxin 2026-07-05, live sit-down) — kick off now via planner + Workflow, section-by-section per card's own build order; port canvas exactly (HANDOFF-EXACT-MATCH.md wins on visual/structural disagreement, never reinterpret); consolidated contact-sheet Artifact required before any section is called done; PR(s) held for her review as a genuine design-experience change
- GROOMED: ready: has GOAL_CONDITION, section-by-section verified/unverified table, recommended build order + 2026-07-04
<!-- card-id: d83cf5ec-0f8e-4951-9243-fe7edefa4f67 -->

**[P1] Roll Bold Flag palette out as the app-wide default (flip layout.tsx civic→white for the redesign app)**
- - ROOT CAUSE of 8/11 Keystone sections still rendering old teal: src/app/layout.tsx hardcodes `<body data-mood="civic" data-palette="civic">` app-wide, and it's PINNED by src/app/civic-default.test.tsx (from a prior 'Civic mood as production default' decision). Only 4 components locally override to data-palette="white" (OrientationView, HeadToHead, MoneyGap, HomeView); everything else (Results workspace, RepCard, ScorecardPrintView, WhyNow, statics, Intake, Polis) inherits teal.
- - PROPOSED FIX (from PR #230 ship agent): have App2.tsx set data-palette="white" on document.body on mount, scoped to the congress-assessment app only (layout.tsx is shared with the legacy ballot app behind NEXT_PUBLIC_BALLOT_ENABLED — do NOT globally flip it).
- - JUDGMENT CALL: this is a product decision (is Bold Flag the real default now?) + contradicts a pinned test invariant — needs Muxin's sign-off before building.
- - PARENT: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- - CHAIN: 1
- - FOLLOW-UP from card d83cf5ec (Keystone exact-match), surfaced by PR #230 contact sheet 2026-07-05
- STATUS: Review
- DEPENDS ON: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- DECISION: approved (Muxin 2026-07-05, live) — flip the congress-assessment redesign app to Bold Flag white (scoped in App2.tsx, NOT global layout.tsx which stays civic for the legacy ballot app); build into the Keystone PR #230 branch so she reviews the corrected result together
<!-- card-id: 08fc47ab-5e6f-47e8-9d2a-605401cf6862 -->

**[P1] Why Now page: rebuild to the canvas's 3-movement structure (colored bands + closing CTA)**
- - GAP found by PR #230 contact sheet: repo WhyNowPage is a single flat column; canvas has 3 colored 'movement' bands (problem → 2026 moment → how it works), a numbered how-it-works 3-step block, and a closing CTA button block. Structural, not just palette.
- - Design-experience change — needs Muxin's review, not auto-buildable.
- - PARENT: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- - CHAIN: 1
- - FOLLOW-UP from card d83cf5ec (Keystone exact-match) 2026-07-05
- STATUS: To Do
- DEPENDS ON: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- GROOMED: ready: exact structural gap + canvas reference named; review-hold is a ship-time gate not a readiness gap + 2026-07-07
<!-- card-id: b6685223-522b-4061-b69d-6aa4ab84d349 -->

**[P1] Intake cold-open: add step-context strip + large serif headline over the chat card**
- - GAP found by PR #230 contact sheet: repo IntakeView renders a compact centered card; canvas's IntakeAsk has a step-context strip + a large serif headline over a wider chat card. Structural.
- - Design-experience change — needs Muxin's review.
- - SPLIT 2026-07-07: the quick-replies prompt-contract gap that used to live on this card is now its own card ("Intake quick-replies: per-turn bounded options for disambiguation questions") — different kind of work (prompt engineering, not UI).
- - PARENT: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- - CHAIN: 1
- - FOLLOW-UP from card d83cf5ec (Keystone exact-match) 2026-07-05
- STATUS: To Do
- DEPENDS ON: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- GROOMED: ready (UI scope only, after split): step-context strip + serif headline gap named against canvas IntakeAsk + 2026-07-07
<!-- card-id: 61e728fb-6d0d-417b-96d9-6620525387e6 -->

**[P2] Results 'see all votes' sheet: group votes by issue with per-vote collapse**
- - GAP found during Keystone Results verify: repo's AllVotesPanel (in the ~7000-line shared VoterChoiceApp.tsx) renders a flat, always-expanded, filter-chip list; canvas's res-allvotes artboard groups votes by issue with per-issue subheaders + per-vote collapse (only one expanded by default).
- - Left unfixed intentionally — AllVotesPanel is shared across many screens, wider blast radius than a surgical pass warranted.
- - Design-experience change — needs Muxin's review.
- - PARENT: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- - CHAIN: 1
- - FOLLOW-UP from card d83cf5ec (Keystone exact-match) 2026-07-05
- STATUS: To Do
- DEPENDS ON: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- GROOMED: ready: exact gap + fix direction + blast-radius note already on the card + 2026-07-07
<!-- card-id: 5b728f9b-3285-4a2d-9394-616108d0301e -->

**[P1] Intake quick-replies: per-turn bounded options for disambiguation questions**
- GAP found by PR #230 contact sheet / Intake section verify pass: canvas's IntakeAsk shows per-turn bounded 'Quick replies' (2-4 tappable options tied to the specific disambiguation question); repo's IssueConversation has none.
- Needs a prompt-contract change to theme-refinement.ts + a parser change + UI wiring; touches the #175 disambiguation-cap logic. Real prompt-engineering task, not just UI.
- Design-experience + prompt change — needs Muxin's review.
- PARENT: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- CHAIN: 1
- FOLLOW-UP from card d83cf5ec (Keystone exact-match) — split out of 61e728fb 2026-07-07 (bundled two different kinds of work: UI restructure vs. prompt-contract change)
- STATUS: To Do
- DEPENDS ON: [P1] EPIC: Match the Keystone design EXACTLY (canvas is the spec, not a moodboard)
- GROOMED: ready: split out of 61e728fb, same evidence (canvas gap + exact files + #175 tie-in) already established + 2026-07-07
<!-- card-id: 5750087f-ad8e-4553-8a86-2cb8d72fa4ab -->

**[P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline**
- WHY (root cause, found 2026-07-07): 6 of ~10 Keystone screens have NO local JSX source (orientation, home, whynow, statics, intake, polis) — only ref PNGs + the compiled 2.5MB standalone bundle, whose identifiers don't survive compilation (grep-verified: OrientationActivated/HomeHero/ori-card ≈ 0 readable hits). Verbatim porting was literally impossible for those screens, so every "interpreted the design as guidance" rework traces here. Compounding: design-handoff/ + .keystone-canvas-refs/ are UNTRACKED (fresh-worktree workers never see the spec at all), and HANDOFF-EXACT-MATCH.md §2 states a superseded copy policy.
- FULL PLAN: **docs/operations/keystone-design-source-plan-2026-07.md** — read it FIRST; it carries the exact canvas-export prompt, phase-by-phase goal conditions, the review-artifact spec, and the fallback path.
- STEP 0 (ATTENDED, Muxin): export the missing screens-*.jsx + latest screens.css from the claude.ai Keystone canvas session using the plan doc §3 prompt → paste the full reply chain into design-handoff/keystone-canvas/export-raw.md. Agents WAIT for that file — do not start Phase 1 without it (plan §5 fallback = Playwright DOM+CSS extraction from the bundle, only if Muxin says the canvas is unrecoverable).
- THEN (agents, plan §4): Phase 1 split/verify export → ONE complete-spec commit (design-handoff/ + .keystone-canvas-refs/) · Phase 2 fix HANDOFF-EXACT-MATCH.md (§2 copy policy → adjudication; headline voice RESOLVED = Activation ★) · Phase 3 per-surface copy-diff report for Muxin to rule line-by-line (NO copy ships before his verdicts) · Phase 4 before/after full-page parity gallery (all 29 artboards, ref | before | after @ 1180px, changed-in-PR badges) as the standing review artifact · Phase 5 pixel+structural parity gate as design-card definition-of-done (supersedes/absorbs card 97685b26's class-coverage checker) · Phase 6 resume PR #230 + the 4 residual gap cards under the new harness.
- DECISIONS locked 2026-07-07 (Muxin, live): commit the spec = YES; copy = adjudicated via diff report, not blanket-verbatim; review format = full app PAGE screenshots before AND after, every artboard every time (never a components-only assembled page); homepage headline = the design's Activation ★ voice.
- Gates the entire Keystone exact-match effort — the EPIC (d83cf5ec) now DEPENDS ON this card.
- PROGRESS 2026-07-07: Phase 1 DONE — export-raw.md verified (split complete/faithful, no elisions, named classes present, screens.css white-palette block complete; one genuine gap flagged: no funding/money-gap screen in the new export, design-session/screens-funding.jsx remains sole source for those 3 artboards) and committed via PR #231 (merged, deployed). Verification notes: design-handoff/keystone-canvas/PHASE1-VERIFICATION.md. Phase 2 DONE — HANDOFF-EXACT-MATCH.md updated via PR #232 (merged, deployed): §2 copy policy now adjudicated per-item (no agent judgment call), §3 headline voice marked RESOLVED (Activation ★), §4 file map repointed at keystone-canvas/src/ as porting source (funding stays on design-session/, per the Phase 1 gap). Phase 3 DONE (report delivered, ruling pending) — copy-diff report at design-handoff/keystone-canvas/COPY-DIFF-REPORT.md, PR #233 (OPEN, DRAFT, auto-merge NOT enabled — needs Muxin's line-by-line ruling per §2). ~150 differing/missing items across 9 of 11 sections (Color + Money-gap had none — Money-gap has no recovered canvas source, confirmed-correct against the older design-session/ copy). Nothing ships from this PR until she rules item-by-item. Phase 4 DONE (tool delivered, format confirmation pending) — reusable before/after parity-gallery script at scripts/design/parity-gallery.ts + scripts/design/parity-gallery-scenarios.ts (`npm run design:parity-gallery`), PR #234 (OPEN, DRAFT, auto-merge NOT enabled — needs Muxin to confirm the gallery FORMAT before it becomes the standing review tool). Coverage: 20/28 artboards fully automated, 7/28 documented proxies (real product gaps, each justified by reading the actual component — e.g. no field-money-gap wiring, no Polis blind-voting UI built yet), 1/28 genuinely not automatable (10b-polis-contribute — feature doesn't exist). Smoke test passed clean (main vs main: zero changed badges, full coverage) after a fresh-worktree re-verification caught and fixed 2 bugs a background run had self-reported as already-fixed but weren't actually in the committed code (turbopack panic on symlinked node_modules; a leaked temp worktree on dev-server-start failure) — see PR #234 for the fix commit. PR #233 UPDATE 2026-07-07: Muxin ruled on every row (canvas/repo/custom per section) — recorded in the report; Statics Privacy/Tip-jar/Loading rows and a few structural-implication rows still marked NEEDS RULING/FLAG inline. 7 of the 8 documented proxy gaps from PR #234, plus PolisStand (surfaced during the ruling pass) and Muxin's own flagged candidates-overview conflict, are now written up in design-handoff/keystone-canvas/PROXY-GAPS-FOR-CLAUDE-DESIGN.md with a paste-ready prompt for the Claude Design canvas session, and each got its own Backlog card (DEPENDS ON this EPIC) so nothing ships before Muxin's ruling: c1a43c39 (Intake locked), 4936d17b (Polis entry), e2455f56 (Polis split/bridging), be126dc5 (field money-gap), 0e87d755 (money-gap H2H), 5192287a (candidates overview — likely Large), fb77d0bb (PolisStand — likely Large). GAP RECONCILIATION 2026-07-07: Claude Design answered all 9 flagged gaps (design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md, PR #235 merged+deployed) — 4 build directly from the already-committed canvas source, no new design needed (c1a43c39 IntakeLocked, 4936d17b PolisEntry full invite, e2455f56 Polis divided report + threshold re-expressed as population-level/party-free, fb77d0bb PolisStand); 1 needed new design, now delivered (5192287a candidates overview → drill-down, screens-delegation.jsx + delegation.css); 2 closed (be126dc5 field money-gap scale — won't build, chamber-median supersedes; 0e87d755 MoneyGapH2H — reworded to a dead-code removal task). All 6 actionable cards: DECISION recorded, GROOMED, DEPENDS ON cleared, promoted to To Do — ready for the pipeline. Phases 5–6 remain; card stays In Progress, not Done, until Phase 6.
- STOP-SHIP 2026-07-08 (Muxin, live review): Phase 5's gate shipped un-enforced (no CI wiring, 3/27 structural probes) and the review artifact failed her page-by-page review (15MB monolith, viewport-cropped shots) — all Keystone work + merges frozen behind card e840c072 ([P0][GATE] STOP-SHIP); plan at docs/operations/keystone-fidelity-fix-plan-2026-07-08.md. Phase 6 resumes only after its Phase 4 re-audit.
CARD TYPE: EPIC
- STATUS: Review
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- DECISION: approved (Muxin 2026-07-07, live) — top priority; step 0 is ATTENDED (his canvas export), Phases 1–2 auto-runnable once export-raw.md exists; Phases 3–4 end in Muxin review; no copy ships without his per-item verdicts.
- GROOMED: ready: full phase-by-phase plan + goal conditions per phase (keystone-design-source-plan-2026-07.md) + 2026-07-07
<!-- card-id: b7c7178d-a115-4adc-8c7b-3f09ebb94479 -->

**Intake locked state: is IntakeLocked meant to ship as its own screen?**
- GAP found reviewing the Keystone parity-gallery (PR #234) + copy-diff report (PR #233): the canvas's IntakeLocked is a distinct pre-lock confirmation state (green "your issues are set" banner, drag-to-rerank) that doesn't exist in the repo's intake flow - it goes straight from the conversational refinement loop onward. Full context + the exact open question: design-handoff/keystone-canvas/PROXY-GAPS-FOR-CLAUDE-DESIGN.md section 2.
TASK: Muxin takes the open question to the Claude Design canvas session, then this card gets a DECISION before build.
ORIGIN: Keystone parity-gallery proxy gap, PR #234 + PR #233 review, 2026-07-07
- STATUS: Review
- DECISION: approved (2026-07-07, Claude Design via design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §2) — BUILD, no new design needed. IntakeLocked already exists in design-handoff/keystone-canvas/src/screens-intake.jsx (committed PR #231, artboard iq-locked): a discrete pre-lock confirm state, intended to ship, NOT superseded by the conversational loop (the loop leads INTO it). Wire into IntakeView.tsx/IssueConversation.tsx as a distinct confirm step before lock.
- GROOMED: ready: design fully specified by Claude Design, no open product question remains + 2026-07-07
<!-- card-id: c1a43c39-2b51-4bd3-af6c-3e569f6f0695 -->

**Polis entry screen: was the dedicated PolisEntry invite/preview screen meant to replace today's one-line link?**
- GAP found reviewing the Keystone parity-gallery (PR #234): the canvas's PolisEntry is a dedicated invite screen with a preview scatter-plot teaser; the repo removed the equivalent entry point (confirmed via e2e/redesign-core.spec.ts's own comment) in favor of a single inline link. Full context + the exact open question: design-handoff/keystone-canvas/PROXY-GAPS-FOR-CLAUDE-DESIGN.md section 3.
TASK: Muxin takes the open question to the Claude Design canvas session, then this card gets a DECISION before build.
ORIGIN: Keystone parity-gallery proxy gap, PR #234 review, 2026-07-07
- STATUS: Review
- DECISION: approved (2026-07-07, Claude Design via design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §3) — BUILD the full invite, not the one-line link. PolisEntry already exists in design-handoff/keystone-canvas/src/screens-polis.jsx (committed PR #231, artboard polis-entry). Per decision #7: optional invite AFTER the scorecard/print, never gating the printout.
- GROOMED: ready: design fully specified by Claude Design, no open product question remains + 2026-07-07
<!-- card-id: 4936d17b-c6db-47f9-8bce-0beca648cbef -->

**Polis report: should a "where it split" section (non-consensus statements) be added, and should the bridging threshold change?**
- GAP found reviewing the Keystone parity-gallery (PR #234) + copy-diff report (PR #233): the canvas's PolisReport has a divided/split state honestly showing statements that DIDN'T reach consensus; PolisClose.tsx only ever surfaces statements that cleared the bar. Also: canvas's bridging threshold is 60%+ agreement within EACH party group (D/R/I) separately; the repo's is 80%+ of the overall population with no party breakdown (a deliberate party-free pivot, #116). Full context + the exact open questions: design-handoff/keystone-canvas/PROXY-GAPS-FOR-CLAUDE-DESIGN.md section 4.
TASK: Muxin takes the open questions to the Claude Design canvas session, then this card gets a DECISION before build.
ORIGIN: Keystone parity-gallery proxy gap, PR #234 + PR #233 review, 2026-07-07
- STATUS: Review
- DECISION: approved (2026-07-07, Claude Design via design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §4) — BUILD the divided/split branch in PolisClose.tsx from canvas artboard polis-divided (screens-polis.jsx, committed PR #231). Bridging threshold: RE-EXPRESS as population-level (no D/R/I breakdown) - KEEP the existing party-free product decision (#116); the design principle (common ground only where it clears a high bar, honest when it doesn't) is preserved without reintroducing party grouping.
- GROOMED: ready: design fully specified by Claude Design, no open product question remains + 2026-07-07
<!-- card-id: e2455f56-6f5c-4aa4-89f5-34f84e5848ff -->

**Candidates overview: build the 3-card alignment-score summary screen with click-through to the existing deep-dive view**
- Muxin (2026-07-07, reviewing PR #233): "I'd want to use the canvas version [a 3-card overview, every seat with its own alignment score], but then when someone clicks into one of the candidates it ought to open up a deeper review into that person... it could be a bigger UI and UX change than I'm thinking off the bat."
CONFIRMED by reading DelegationWorkspace.tsx: this flow does not exist. The repo only ever renders one seat (activeSeatId) at a time with a compact seat-strip rail - never all seats as scored summary cards. Building this means: (a) a new overview screen with CandidateParity-style cards + alignment scores per seat, (b) a click interaction opening the existing deep single-seat RepCard/DelegationWorkspace view, (c) deciding how the existing seat-strip rail relates to the new overview (redundant? kept as in-seat navigation? something else?).
Full context + the exact open question for Claude Design: design-handoff/keystone-canvas/PROXY-GAPS-FOR-CLAUDE-DESIGN.md section 8.
TASK: Muxin takes the open question to the Claude Design canvas session to confirm the click-through interaction, then this card gets a DECISION before build - likely Large/planner+workflow given the scope.
ORIGIN: Muxin, live review of PR #233, 2026-07-07
- STATUS: Review
- DECISION: approved (2026-07-07, Claude Design via design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §8) — BUILD. Confirms Muxin's direction: the 3-card scored overview IS the entry point; clicking a card opens the EXISTING deep single-seat view UNCHANGED (no redesign). New design source: design-handoff/keystone-canvas/src/screens-delegation.jsx + delegation.css (committed PR #235) - DelegationOverview/SeatCard/SeatDeepView/SeatRail/DelegationFlow. Add a '<- All seats' back control; keep the seat-strip rail as in-context lateral nav. Wire into DelegationWorkspace.tsx as a navigation layer only. Likely Large given the new overview screen + verdict-sync wiring.
- GROOMED: ready: design fully specified by Claude Design, no open product question remains + 2026-07-07
<!-- card-id: 5192287a-c190-47f0-8d7b-00b013fc76f8 -->

**Polis blind-voting step (PolisStand): is this still an intended feature to build?**
- GAP found via the copy-diff report (PR #233 section 10) + confirmed as Phase 4's one "not automatable" scenario (10b-polis-contribute, PR #234): the canvas's PolisStand - a blind agree/disagree/pass reaction step before the aggregate report - does not exist anywhere in the repo. Confirmed via full read of PolisClose.tsx + repo-wide grep for Agree/Disagree/Pass/PolisStand-style markup: zero matches. This is the single largest scope item among the Keystone proxy gaps - a real feature build, not a copy or styling fix. Full context + the exact open question: design-handoff/keystone-canvas/PROXY-GAPS-FOR-CLAUDE-DESIGN.md section 9.
TASK: Muxin takes the open question to the Claude Design canvas session, then this card gets a DECISION before build - likely Large/planner+workflow given the scope (new UI surface + data model for blind per-statement votes).
ORIGIN: Keystone parity-gallery proxy gap, PR #234 + PR #233 review, 2026-07-07
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- DECISION: approved (2026-07-07, Claude Design via design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §9) — BUILD. PolisStand (blind agree/disagree/pass, no running tally while voting) already exists in design-handoff/keystone-canvas/src/screens-polis.jsx (committed PR #231, artboard polis-stand). Genuinely does not exist in the repo yet - build as a new post-decision moment between the invite and the aggregate report. Likely Large: new UI surface + a data model for storing blind per-statement votes.
- GROOMED: ready: design fully specified by Claude Design, no open product question remains + 2026-07-07
<!-- card-id: fb77d0bb-74ee-43d6-9b72-cc14c90c8a1b -->

**Seed synthetic Polis response-vector data for local manual QA**
- Muxin asked (2026-07-07, reviewing PR #234): "can we create data for Polis so we can test out the UI?" A fresh local dev DB shows the zero-participant StandingLocked state, not the populated consensus report/personalized-stat/zoom-toggle experience. TASK: write a script (scripts/dev/seed-polis-data.ts or similar) that inserts a realistic batch (~100-150) of synthetic polis_response_vectors rows spread across a few states, into the LOCAL dev DB by default, so the existing built Polis states can be clicked through manually with real-looking numbers.
SCOPE NOTE: this only helps test what's ALREADY built (the party-free overlap cloud, personalized stat, zoom toggle, low-N/zero-N honest states). It does NOT unlock PolisStand (the blind-voting step - doesn't exist in code regardless of data, see card fb77d0bb) or change the bridging-threshold methodology (60%-per-party-group vs 80%-population, see card e2455f56).
GOAL_CONDITION: running the seed script against local dev, then loading the Polis screen in a browser, shows the consensus report + personalized stat + zoom toggle with non-zero realistic numbers.
ORIGIN: Muxin, live review of PR #234, 2026-07-07
- STATUS: Backlog
<!-- card-id: 337ad25a-56ce-4e4a-9876-5c826a110ca5 -->

**[P2] Port the intake conversation shell (composer/chips/chat) onto the Keystone .iq-* CSS system**
- ORIGIN card c1a43c39 (Intake locked state confirm screen, PR #236): the intake conversation shell (IntakeView/IssueConversation composer + chips + chat bubbles) still rides on public/prototype.css older .coldopen/.themes-card classes, not the canvas .iq-* system — HANDOFF-EXACT-MATCH.md section 9 already flags this surface as VERIFY/not-yet-ported. This is a class-system port (visual), distinct from the specific additive UI gaps already tracked in cards 61e728fb (step-context strip + serif headline) and 5750087f (quick-replies) — those add new elements, this is the underlying CSS/class migration for what already exists.
CHAIN: 1
- STATUS: Backlog
- DEPENDS ON: Intake locked state: is IntakeLocked meant to ship as its own screen?
<!-- card-id: a545f45d-4e3c-46b3-85df-507402c66c3f -->

**[P1] Scorecard print view: port the canvas's "Not on your ballot this year" section for non-2026 seats**
- GAP found via the Keystone design-source recovery plan's Phase 6 residual-gaps list (docs/operations/keystone-design-source-plan-2026-07.md, §4 Phase 6: "Scorecard non-2026 rows") — confirmed against the recovered canvas source design-handoff/keystone-canvas/src/screens-scorecard.jsx.
- Canvas's Scorecard artboard has a second section below "My decisions" labeled "Not on your ballot this year": each non-2026 seat renders as a `dec notup` row with a neutral `—` badge, a "Not up until <year>" verdict pill, and the note "Shown for context · no decision needed this election."
- Repo's src/prototype/redesign/ScorecardPrintView.tsx (~line 41-46) instead FILTERS these seats out entirely before rendering: `scorecardSeats = seats.filter(s => s.nextElection?.onBallot2026 !== false)`, with a comment citing the prior product decision "reps not up for election in 2026 are excluded from the printed scorecard."
- That exclusion traces to the (shipped, STATUS: Done) card "[P2] Distinguish + de-emphasize non-2026 representatives": "I would also not include them in the score card." The recovered Keystone canvas source reverses that call — it shows them, but confined to a clearly-labeled non-decision context section. This is a genuine content/structure conflict between the current implementation and the newer design source, not a novel idea.
- Design-experience change that reverses a previously shipped, explicit-feedback-driven product decision — needs Muxin's review/sign-off before build; not auto-buildable as-is.
- TASK (once approved): port the canvas's "Not on your ballot this year" section structure/classNames verbatim into ScorecardPrintView.tsx — render seats with `onBallot2026 === false` in a separate section below the decisions list, each with a neutral badge, a "Not up until <year>" pill, and context-only copy (no verdict/alignment score rendered for these rows).
- PARENT: [P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline (Phase 6 residual-gaps list); also a member of [P1] EPIC: Match the Keystone design EXACTLY.
- GOAL_CONDITION: Before: ScorecardPrintView.tsx filters out every seat with onBallot2026 === false so none render on the printed sheet. After: the printed scorecard additionally renders a "Not on your ballot this year" section listing those seats with a distinct non-decision badge/pill matching screens-scorecard.jsx's structure, gated on Muxin's sign-off to reverse the prior exclusion decision; tsc + existing ScorecardPrintView tests green.
- PARENT: b7c7178d-a115-4adc-8c7b-3f09ebb94479
- ORIGIN: proposed by propose-cards 2026-07-07 from epic [P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline (b7c7178d-a115-4adc-8c7b-3f09ebb94479)
- STOP-SHIP AUDIT 2026-07-08: this card had NO mechanical dependency until now — was sitting in To Do, immediately pickable by claim_next_eligible despite the live STOP-SHIP. Fixed; see e840c072's progress notes for the full audit.
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- GROOMED: ready: clear file/section spec + stated GOAL_CONDITION; approval-worthy (reverses a shipped decision) routed to Vet 2026-07-07
<!-- card-id: e5f379e2-cbb6-4128-af92-0ee3f541d247 -->

**Fix duplicate "Privacy" link causing a Playwright strict-mode violation (08c static-privacy scenario)**
- - Found while fixing the parity-gallery tool (PR #238, 2026-07-08): the 08c static-privacy scenario fails a strict-mode click because two elements both match the accessible name "Privacy" on the same page (likely one in the footer nav + one elsewhere, e.g. a static-pages sub-nav). Confirmed as genuine and pre-existing (fails identically on both the pre-fix and post-fix parity-gallery runs, unrelated to the IntakeLocked interstitial fix).
TASK: find the duplicate "Privacy"-labelled link/element and disambiguate (unique aria-label, or scope the selector/test to one) so exactly one accessible "Privacy" target exists per page.
GOAL_CONDITION: parity-gallery + e2e can target the Privacy link/page unambiguously; no strict-mode violation.
ORIGIN: parity-gallery fix verification, PR #238, 2026-07-08
- STATUS: Backlog
<!-- card-id: e373b3dc-f248-49bd-9b66-5085bcf860fe -->

**Decide: unify the two Polis consensus/divided backends (aggregates.ts 80%-population vs clustering.ts 60% k-means)**
- FOLLOW-UP from card e2455f56 (Polis where-it-split section), discovered 2026-07-08: the repo has TWO independent Polis consensus/divided backends with different thresholds:
1. src/lib/server/polis/aggregates.ts (computeBridges/computeDivided) - 80%+ population-level, party-free. WIRED to /api/polis/bridges + PolisClose.tsx, but v1-sentinel (always returns [] in prod - no per-statement persistence yet).
2. src/lib/polis/clustering.ts + reportAssembly.ts (from PR #146) - 60%+ k-means cluster-based, already computes dividedState/sharpestDivide against REAL polis_response_vectors data, but NOT wired into PolisClose.tsx.
e2455f56 built the where-it-split UI on backend #1 (matches the card's explicit "80%+ of the overall population" framing), since that is what actually reaches the UI today. But backend #2 already has real data flowing through it and backend #1 does not (blocked on Phase 8b persistence). Worth a deliberate decision: unify onto one backend, or keep both scoped to different phases/purposes?
CHAIN: 1
- STATUS: Backlog
- DEPENDS ON: Polis report: should a "where it split" section (non-consensus statements) be added, and should the bridging threshold change?
<!-- card-id: 840a9ed2-20db-4876-9142-7caecb44a387 -->

**Tidy stale MoneyGapH2H comment references left after dead-code removal**
- One prose-comment mention of MoneyGapH2H remains after it was deleted as dead code -- harmless (not code/imports), just a stale doc reference. (A second mention, in peerComparison.ts, was already fixed by the card 0e87d755 code-review pass, 2026-07-08.)
- File: scripts/design/parity-gallery-scenarios.ts:1151 -- a descriptive `note` string, e.g. "MoneyGapH2H (exported from MoneyGap.tsx) is not wired into HeadToHead.tsx"; still substantively true (the export no longer exists at all, vs. merely being unwired) but names a component that no longer exists. Left as an editorial call at review time rather than auto-fixed.
- TASK: update or remove this comment mention so it no longer references a component that does not exist.
- GOAL_CONDITION: grep -rn MoneyGapH2H scripts/design/parity-gallery-scenarios.ts returns no results.
- ORIGIN: follow-up from card 0e87d755 (Remove MoneyGapH2H as dead code), 2026-07-08
- CHAIN: 1
- STATUS: Backlog
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
<!-- card-id: 3cb46afd-e554-4d1f-90ef-cd7afb022ca7 -->

**Keystone Phase 6: close the 10 gate-flagged design gaps + land PR #230 under the new parity gate**
- - Traces to "[P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline" (b7c7178d), Phase 6: "resume PR #230 + the 4 residual gap cards under the new harness."
- CONTEXT: the Phase 5 parity gate (npm run design:parity-gate) now exists and is verified. Running it --all against the current app surfaces 10 scenarios with genuine, real design divergence from the Keystone canvas source (not tooling bugs — spot-checked against the ref PNGs): 02d-results-allvotes-sheet, 04-scorecard, 07-whynow, 08a-about, 08b-howitworks, 08c-privacy, 09d-edit-issues, 10c/10d-polis-report-*, plus 01-orientation-activated failing its structural (missing design classNames) check specifically.
- TASK: use the new gate's report as the authoritative punch list to finish PR #230 ("[P1] EPIC: Match the Keystone design EXACTLY", card d83cf5ec, currently open/draft/held for review) — close each genuine gap the gate flags, re-run the gate per surface, and treat a clean gate run as that surface's definition-of-done per the Phase 5 plan.
- NEEDS MUXIN: PR #230 and several related design PRs (#236 intake-locked, #237 polis-entry, #240 polis-report-split) are already open and held for her design-experience review — this task should be sequenced with her rulings on those rather than run blind against a moving target. Flag for a decision on sequencing before building starts.
- GOAL_CONDITION: PR #230 (or its successor) merges with  reporting 0 gate-failing scenarios (or every remaining failure explicitly documented as an accepted/out-of-scope divergence, not silently ignored).
- PROGRESS (2026-07-08, STOP-SHIP Phase 4 re-audit): confirmed reproducible — this exact 10-scenario list fails identically across all 5 held PRs (#230/#236/#237/#240/#243), none of them the cause. Full severity/diff-ratio data + per-PR cross-reference: docs/operations/keystone-phase4-audit-2026-07-08.md. One correction: 10c/10d's failure on PR #240 is partly a stale test mock (false-fail, tracked separately), not pure design divergence — see that doc before treating 10c/10d as a straight design gap.
- PARENT: b7c7178d-a115-4adc-8c7b-3f09ebb94479
- CHAIN: 1
- STATUS: Backlog
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
<!-- card-id: 466d6efb-0938-40e7-872a-b4529a9deb70 -->

**Polis contribute-a-statement screen (10b-polis-contribute): is this still an intended feature to build?**
- Traces to "[P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline" (b7c7178d) Phase 4 progress note: of the 28 parity-gallery scenarios, 7 became documented-proxy gap cards and 20 are fully automated — but scenario 10b-polis-contribute is called out separately as "genuinely not automatable ... feature doesn't exist" in the repo today, and it never appears in the later GAP RECONCILIATION pass (design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md, PR #235) that resolved the other flagged Polis gaps.
- Every sibling Polis-section artboard from that same inventory already has its own filed decision card and a Claude Design ruling: "Polis entry screen ... PolisEntry" (4936d17b), "Polis blind-voting step (PolisStand) ..." (fb77d0bb), "Polis report: should a 'where it split' section ..." (e2455f56). 10b-polis-contribute is the one Polis artboard from the epic's own inventory with no card and no reconciliation entry — not a novel idea, a stated but un-actioned item.
- DECISION needed for Muxin: is the canvas's contribute-a-statement flow (a user submitting their own view/statement into the Polis process) still an intended feature? If yes, route it through the same Claude Design reconciliation path used for the other Polis gaps before any build card is scoped. If no, mark it an accepted/documented divergence so the Phase 5 parity gate stops flagging it as an open gap.
- Decision card only — no code change, no build, until Muxin rules.
- GOAL_CONDITION: A DECISION is recorded on the card: either (a) 10b-polis-contribute is still wanted and gets routed through the same Claude Design reconciliation path as the other Polis gaps (PolisEntry/PolisStand/Polis-report) before a build card is scoped, or (b) it's explicitly declared out of scope and the parity-gate's 10b-polis-contribute scenario is reclassified as an accepted/documented divergence instead of an open gap.
- PARENT: b7c7178d-a115-4adc-8c7b-3f09ebb94479
- ORIGIN: proposed by propose-cards 2026-07-08 from epic [P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline (b7c7178d-a115-4adc-8c7b-3f09ebb94479)
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- GROOMED: ready: decision-only ask, clear yes/no question, traces to named epic + sibling pattern, GOAL_CONDITION stated + 2026-07-08
<!-- card-id: 65e655e9-a90e-4cd0-8c31-ce80d96f8995 -->

**Resolve remaining NEEDS RULING/FLAG rows in the Keystone copy-diff report (Statics: Privacy/Tip-jar/Loading)**
- Traces to the "[P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline" epic's Phase 3 progress note (2026-07-07): Muxin ruled on every row of design-handoff/keystone-canvas/COPY-DIFF-REPORT.md except the Statics section's Privacy/Tip-jar/Loading rows and a few structural-implication rows, which remain marked NEEDS RULING/FLAG inline.
- PR #233 (the copy-diff report PR, OPEN/DRAFT, auto-merge not enabled) cannot proceed to ship any copy changes until every flagged row has a recorded ruling, per the epic's own Phase 2 policy that copy is adjudicated per-item rather than blanket-verbatim.
- TASK: walk the remaining flagged rows in the Statics section of COPY-DIFF-REPORT.md, get Muxin's ruling on each (canvas / repo / custom, per the established per-item adjudication process), and record the decision inline in the report.
- Decision/documentation only — no copy or code ships from this card; PR #233 stays draft until every row is ruled.
- GOAL_CONDITION: Every row in COPY-DIFF-REPORT.md's Statics section (Privacy/Tip-jar/Loading rows plus the flagged structural-implication rows) carries a recorded ruling — zero remaining NEEDS RULING/FLAG markers in that section — and PR #233 is explicitly unblocked (ready to merge, or the remaining gap is documented as its own scoped follow-up) rather than left silently stalled.
- PARENT: b7c7178d-a115-4adc-8c7b-3f09ebb94479
- ORIGIN: proposed by propose-cards 2026-07-08 from epic [P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline (b7c7178d-a115-4adc-8c7b-3f09ebb94479)
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- GROOMED: ready: specific rows named (Statics: Privacy/Tip-jar/Loading), clear TASK + GOAL_CONDITION, approval-worthy copy-judgment routed to Vet + 2026-07-08
<!-- card-id: 1a83ead4-f9dc-416a-b344-3fdd76f36299 -->

**[P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)**
- Muxin 2026-07-08 (live review): two failures — (1) the repo cannot yet produce 1:1 fidelity to design work: the parity gate (scripts/design/parity-gate.ts, PR #242) merged the same morning the 5 Keystone PRs were called review-ready, is wired into ZERO CI workflows, and structurally covers only 3/27 scenarios; the PRs' 'self-vet clean' verdicts came from code-reading agents that never rendered anything. (2) The page-by-page HTML review artifact (keystone-contact-sheet.html) doesn't properly load: 15MB monolithic file with 56 base64-inlined images, screenshots viewport-cropped at ~900px (Why Now cut off, Results funding invisible below the fold), and missing states (Tip Jar, Loading, candidates overview, interaction sub-states).
- PLAN (authoritative): docs/operations/keystone-fidelity-fix-plan-2026-07-08.md — Phase 0 live-verify the scares (does funding data actually render? the 0/3-vs-2-issues rail count), Phase 1 rebuild the review artifact (parity-gallery full-page capture engine, per-section pages + index, committed to repo, verified-loadable DoD), Phase 2 enforce design:parity-gate as a required CI check on Keystone-touching PRs + expand STRUCTURAL_PROBES from 3 to all portable scenarios (absorbs card af7fa077's scope), Phase 3 process change (gate-green before PR opens; gate report = required GOAL_EVIDENCE; code-reading review demoted to pre-check), Phase 4 re-audit PRs #230/#236/#237/#240/#243 under the new harness and produce the true per-section gap list.
- Incident detail + raw findings: docs/operations/keystone-parity-failure-handoff-2026-07-08.md.
- STOP-SHIP scope: the 5 open Keystone PRs stay held drafts; every other Keystone card DEPENDS ON this card; nothing design-related merges until Phase 4's re-audit is delivered and Muxin lifts the hold. Muxin 2026-07-08 (reaffirmed after Phase 4): the fidelity tooling itself (PRs #244/#245/#246) is NOT yet trustworthy — Phase 4 found real false-pass/false-fail bugs in it — so no FE UI/Keystone work of any kind resumes until the tooling is completely integrated (all 4 tooling-fix cards below reach Done, #244/#245/#246 merged) AND Muxin has reviewed the result; only then does FE UI work continue.
- GOAL_CONDITION: parity-gate runs as a required CI check on Keystone-touching PRs; review artifact v2 is committed, full-page, covers all scenarios incl. Tip Jar/Loading, and verified loadable; STRUCTURAL_PROBES cover all portable scenarios (or carry explicit per-scenario waivers); Phase 4 re-audit report delivered with per-section gate results for all 5 open PRs; AND the 4 Phase-4-discovered tooling-fix cards (622fe2dd, 50c20164, 4b7f2068, 1b4b943d) are Done, so the gate has no known false-pass/false-fail gaps before it's trusted as Phase 4's final authority.
- MECHANICAL AUDIT 2026-07-08: verified every Keystone/design card's DEPENDS ON actually resolves through this card (claim_next_eligible only skips a card whose dependency isn't Done — prose alone doesn't block it). Found and fixed 3 cards with no dependency at all (e5f379e2, 466d6efb, 3cb46afd — one, e5f379e2, was sitting in STATUS: To Do and immediately pickable); added a defense-in-depth DEPENDS ON directly on the b7c7178d epic too (close_completed_epics doesn't check an epic's own DEPENDS ON before auto-closing it — only whether its children are Done — so this matters). Also closed af7fa077 as Done/superseded (PR #244 already absorbed its exact scope) so it can't collide with the tooling work. PRs #244/#245/#246 have no backlog cards of their own; they're held via draft status + explicit "(HELD — STOP-SHIP)" PR titles + an explicit PR comment instead, since the self-vet-merge policy's design-experience/tooling classification has no STOP-SHIP-aware carve-out yet — that durable fix is filed on the simple-kanban board (claude-config lane, card 157c48a9 "Self-vet-merge policy needs a design-fidelity-tooling carve-out under an active STOP-SHIP"), which also absorbs Phase 3's 3 remaining conductor-skill bullets. Needs a dedicated claude-config-lane session to build.
- ORIGIN: Muxin, live review 2026-07-08 ('nothing else gets done or merged until these are addressed')
- PROGRESS (2026-07-08): Phase 0 done — no live bugs, findings at docs/operations/keystone-phase0-findings-2026-07-08.md. Phase 2 built (parity gate wired into CI, 3→7 structural probes + 20 documented waivers, zero silent skips) — held draft PR #244 for your review (needs a branch-protection setting from you post-merge). Phase 1 done (review artifact rebuilt: docs/design-review/, 28/28 scenarios, scroll-trap capture bug fixed + confirms the funding panel was always rendering fine) — held draft PR #245 for your review. Phase 3's repo-scoped piece done (CI regenerates + comments the review artifact on every Keystone PR; GOAL_CONDITION convention added to this file's cheat sheet above) — held draft PR #246. Phase 3's conductor-skill piece (~/.claude/skills, a separate claude-config repo) is NOT done — needs a separate session against that repo.
- PROGRESS (2026-07-08, Phase 4 — re-audit complete): full findings at docs/operations/keystone-phase4-audit-2026-07-08.md. Headline: the "10 gate-flagged gaps" from card 466d6efb reproduce identically on all 5 held PRs — none of them the cause, already tracked there (updated with today's severity data). Two things are genuinely new: (1) PR #236 and #237 each ship a new screen the gate's capture scripts never actually reach — both PASS today but are unverified, not confirmed-good; (2) PR #243 will BREAK ~20 gate scenarios repo-wide the moment it merges (a shared helper assumes the old single-seat layout) — confirmed zero *new* regressions once patched, but the fix needs to ship with/before the merge. Filed 4 mechanical tooling-fix cards (622fe2dd, 50c20164, 4b7f2068, 1b4b943d), all Backlog pending grooming. THREE THINGS NEED YOUR CALL, not something I should guess: (a) PR #230 won't even merge with the gate tooling — a genuine conflict between its hardcoded-copy hero + `howitworks` nav target vs. the tooling branch's i18n hero + `methodology` target; (b) whether the reachWorkspace() fix for #243 ships bundled in #243 or as an immediate companion PR; (c) 05c-candidates-overview (PR #243's core screen) has no ref PNG so the gate can't grade it at all — recommend you eyeball it directly, screenshots sitting in the still-live diagnostic worktree voter-choice-worktrees/phase4-audit-243. Nothing merged, nothing fixed beyond the 3 tooling PRs already listed above — STOP-SHIP stays in effect until you review this and say otherwise.
- STATUS: Review
<!-- card-id: e840c072-1bd9-4dc0-aebe-8a19867aed03 -->

**[P1] Fix stale gate captures: 09c-intake-locked and 10a-polis-entry never reach the new screens they test**
- - Phase 4 STOP-SHIP re-audit finding (docs/operations/keystone-phase4-audit-2026-07-08.md): both scenarios PASS today but are false-passes. 09c-intake-locked stops one step before clicking "Lock these in", so it never reaches the new IntakeLocked.tsx screen PR #236 ships. 10a-polis-entry still clicks the old one-line "where you stand" link instead of navigating to the new polisEntry stage PR #237 wires into App2.tsx. Both PRs' actual core deliverables are currently unverified by the gate, not confirmed-good.
- TASK: update both scenario capture() functions in scripts/design/parity-gallery-scenarios.ts to click through to the actual new screens, and update their stale note text.
- GOAL_CONDITION: 09c-intake-locked's capture reaches the post-lock IntakeLocked screen; 10a-polis-entry's capture reaches the new polisEntry stage; both gate structurally/visually against the real new content.
- ORIGIN: Phase 4 re-audit, background agent phase4-audit-batch-a, 2026-07-08
- STATUS: Backlog
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
<!-- card-id: 622fe2dd-f86b-4b07-beb9-903464d8468e -->

**[P1] Fix 10c/10d Polis-report gate mocks (false-fail on PR #240) + document the approved party-free waiver**
- - Phase 4 STOP-SHIP re-audit finding (docs/operations/keystone-phase4-audit-2026-07-08.md): live-verified PR #240's "where it split" feature is built correctly (population-level %, no D/R/I breakdown, copy matches the approved spec). The gate FAILs 10c/10d anyway because parity-gallery-scenarios.ts's mockBridges() never stubs a divided field, so the gate always tests the feature's absence, not its correctness. Once fixed, the remaining visual diff (~0.38-0.52) is the expected result of the approved party-free divergence from canvas (DECISION #116), not a bug.
- TASK: update the 10c/10d scenario mocks to feed real divided-statement data; once real content is being tested, add a documented STRUCTURAL_WAIVERS-style entry (or per-scenario threshold note) explaining the expected residual visual diff from the intentional party-free redesign, so it stops reading as an open failure.
- GOAL_CONDITION: 10c/10d gate against real divided-statement content; any remaining visual diff is either under threshold or carries an explicit waiver citing DECISION #116.
- ORIGIN: Phase 4 re-audit, background agent phase4-audit-batch-b, 2026-07-08
- STATUS: Backlog
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
<!-- card-id: 50c20164-6d09-4957-bfd2-a02a20872d70 -->

**[P0] Fix shared reachWorkspace() capture helper before/with PR #243 — breaks ~20 gate scenarios repo-wide once it merges**
- - Phase 4 STOP-SHIP re-audit finding (docs/operations/keystone-phase4-audit-2026-07-08.md): PR #243 makes the new DelegationOverview screen the default entry point (seatOverviewOpen defaults true), but the shared reachWorkspace() helper in scripts/design/parity-gallery-scenarios.ts (used by ~20 of 27 scenarios) still assumes landing directly on the old single-seat rail (.b-row). Confirmed via a reverted local patch: with a one-line fix (click through the overview's seat card first when present), PR #243 gates identically to the other 4 held PRs (16/27, same baseline failures) - zero new regressions. Without the fix, the ENTIRE gate suite breaks for every future PR the moment #243 merges to main, not just this PR.
- NEEDS MUXIN: should this fix ship bundled into PR #243 itself, or as a same-day companion PR merged immediately after? Sequencing call, not filed as a decision here - flagging on the STOP-SHIP card.
- GOAL_CONDITION: reachWorkspace() (and any e2e helper sharing the same assumption) clicks through DelegationOverview's seat card when present before waiting on .b-row; re-running the full gate against a merged #243+tooling branch returns to the same ~16/27 baseline with no new capture-failure regressions.
- ORIGIN: Phase 4 re-audit, background agent phase4-audit-batch-b, 2026-07-08
- STATUS: Backlog
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
<!-- card-id: 4b7f2068-f7cb-406f-98b2-94c06e7a4aa4 -->

**Wire a real capture() + export a canvas ref PNG for 05c-candidates-overview**
- - Phase 4 STOP-SHIP re-audit finding (docs/operations/keystone-phase4-audit-2026-07-08.md): this scenario exists as a placeholder (automatable: "no" hardcoded) with no capture() function AND no canvas ref PNG in .keystone-canvas-refs/ - it cannot be pixel-graded on any branch, ever, until both exist. Manual inspection (temp capture, reverted) shows PR #243's overview screen renders correctly: 2 scored seat cards with roll-call/funding data, third seat shown as "Not on your ballot this year - next up 2030".
- TASK: export a canvas ref PNG for design-handoff/keystone-canvas/src/screens-delegation.jsx's artboard (may need a Claude Design canvas session - flag if so), then write a real capture() function for 05c-candidates-overview in scripts/design/parity-gallery-scenarios.ts.
- GOAL_CONDITION: 05c-candidates-overview has both a ref PNG and a working capture(), gates normally like the other scenarios.
- ORIGIN: Phase 4 re-audit, background agent phase4-audit-batch-b, 2026-07-08
- STATUS: Backlog
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
<!-- card-id: 1b4b943d-4229-4896-a129-21e6341820b5 -->

**[P3] Expand parity-gate STRUCTURAL_PROBES coverage beyond the initial 3 scenarios**
- - Traces to the Phase 5 parity gate (scripts/design/parity-gate.ts, npm run design:parity-gate).
- CONTEXT: STRUCTURAL_PROBES currently only covers 3 of 27 gated scenarios (01-orientation-activated, 02a-results-main, 02b-results-funding-expanded) — by design, per the file's own header comment: most components predate the Keystone canvas-export recovery and were only ever built to be functionally equivalent, not a literal verbatim class-name port, so asserting literal classNames there would flag noise, not real regressions.
- TASK: as more surfaces get confirmed as verbatim canvas ports (tracked via the Phase 6 gap-closing work), add their STRUCTURAL_PROBES entries so the gate's structural (className-coverage) check covers them too, not just the visual pixel-diff.
- GOAL_CONDITION: none yet — this is exploratory/ongoing follow-on work, not a single atomic deliverable; scope it down when picked up.
- PARENT: b7c7178d-a115-4adc-8c7b-3f09ebb94479
- CHAIN: 1
- SUPERSEDED 2026-07-08: STOP-SHIP Phase 2 (PR #244, held) already expands STRUCTURAL_PROBES from 3 to 7 with 20 documented waivers covering every gateable scenario — this card's exact scope. Closing as superseded rather than leaving it to be picked up separately and collide with #244.
- STATUS: Done
<!-- card-id: af7fa077-6c2a-4748-8f0e-2d5724492e7d -->

**[P2] Translate residual English redesign strings outside the 7 finished surfaces**
- Verification pass inventory: WebSearchAlignmentRow ('From public statements…', 'WITH YOU', 'Medium conf.'); App2's 4th DelegationErrorView call site ('data evaporated' resume fallback); DelegationWorkspace 'all-done' banner + IssueDeltaBanner; HandoffModal provider/BYOK buttons ('Copy & open Claude', 'Download as .txt'); alignment block header 'Aligns with your issues' / 'Thin record on this issue'; blind-mode chrome ('IDENTITY HIDDEN', 'REVEAL'); FundingMixPanel internals; home-hero copy.
- Same t() mechanism as PR for 7855fddd; EN must stay byte-identical (e2e literal assertions).
- Follow-up from card 7855fddd 'Finish Spanish coverage for remaining redesign surfaces' (auto-filed 2026-07-01).
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: de3fe11e-b61d-4c5d-809d-e9fc0ffbc617 -->

**Cherry-pick top-bar How It Works → methodology destination fix from closed #154**
- - Recon 2026-07-02: closed PR #154 (wt/rename-reorg-nav, superseded by merged #166) contains one independently-useful unshipped commit 3928895 — clarify the top-bar How It Works destination (→ methodology) + trim duplicate footer links (footer part now moot post-#166).
- TASK: cherry-pick just the top-bar destination fix onto a fresh branch off main; drop anything #166 already covers. Branch wt/rename-reorg-nav retained locally.
- Originating card: [P2] Rename / reorganize top-bar + footer navigation (Done, superseded by #166).
- CHAIN: 1
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): approved by Muxin 2026-07-02. GOAL: top-bar How It Works links to methodology (from closed #154 commit 3928895); footer part dropped (moot post-#166)
<!-- card-id: c87333be-4e6f-47e5-b6cb-5512209f301f -->

**[P2] Build the pixel+structural design parity gate (Keystone epic Phase 5)**
- Traces to "[P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline" (b7c7178d) Phase 5: "pixel+structural parity gate as design-card definition-of-done (supersedes/absorbs card 97685b26's class-coverage checker)" — Phases 1-4 are delivered (PRs #231, #232, #233, #234) but Phase 5 itself has never been filed as its own actionable card.
- TASK: extend the parity-gallery tooling (scripts/design/parity-gallery.ts, PR #234) with (a) an automated pixel-diff against each section's approved artboard beyond a documented tolerance, and (b) the class-name-coverage check already scoped in card 97685b26 (flag any design-source className with zero occurrence in the ported files). Wire the combined check as the definition-of-done gate a Keystone section must pass before being marked complete; close 97685b26 as superseded once this ships.
- GOAL_CONDITION: A single command (e.g. `npm run check:design-fidelity <section>`) exists that fails when the ported repo code's pixel diff against the approved artboard exceeds a documented tolerance OR a design-source className has zero occurrence in the ported files; card 97685b26 is closed as superseded once this ships.
- PARENT: b7c7178d-a115-4adc-8c7b-3f09ebb94479
- ORIGIN: proposed by propose-cards 2026-07-08 from epic [P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline (b7c7178d-a115-4adc-8c7b-3f09ebb94479)
- STATUS: Done
- DEPENDS ON: Muxin confirming the parity-gallery FORMAT (PR #234 is still open/draft) — this gate extends that tool's output, so its shape needs to be locked first.
- GROOMED: ready: clear outcome + specific target files + stateable GOAL_CONDITION; blocked on PR #234 format confirmation (own DEPENDS ON) 2026-07-08
<!-- card-id: 390be8ca-9b95-4970-864a-7d4011122dc3 -->

**[P2] Build a design-source-vs-ported-code class-coverage checker**
- - Muxin wants DETERMINISTIC, PROGRAMMATIC enforcement that ported code actually honors the design source -- not just a written reminder to "read the source first" (see companion card: standing rule for reading design source before porting). A human/agent can still skip the step; a script can't be skipped as easily if it's wired into the workflow.
- PROPOSAL: a class-name-coverage checker. For a given design source file (design-handoff/design-session/screens-*.jsx + its matching *.css, or the design-handoff/<subfolder> Muxin currently points to) and its mapped repo target file(s) (per design-handoff/keystone-canvas/HANDOFF-EXACT-MATCH.md section 4's file map):
  1. Parse the design source JSX for every literal className token (static strings; skip dynamic/templated ones).
  2. Parse the ported repo file(s) (the .tsx component + whichever .css file it pulls from) for the same tokens.
  3. Report any design-source class name with NO occurrence anywhere in the ported files -- that's a strong signal a whole structural piece (a tooltip, a per-row bar, a badge) got dropped or reinterpreted instead of ported, exactly the class of bug found this session (missing pac-term/pac-tip, missing fi-track).
  4. Known limitation: won't catch renamed classes (this repo prefixes with cv2- for example) or reordering -- needs either a documented rename-mapping per section, or a looser fuzzy-match tolerant of prefix differences. Scope this out before building.
- Where this could run: a one-off `npm run check:design-fidelity <section>` command a builder runs before marking a Keystone section done, OR wired as a lightweight CI check triggered when a PR touches both a design-handoff/<subfolder> file and its mapped repo target (only meaningful if someone edits the design source itself, which is rare -- more likely useful as a manual pre-merge gate the conductor runs for every remaining Keystone section: Scorecard, Candidates, Homepage, Why Now, Statics, Intake, Polis, Money-gap-in-duel).
- Not urgent/blocking -- the remaining Keystone sections can proceed under the standing rule (companion card) in the meantime; this is the belt-and-suspenders automated version once someone has bandwidth to build and validate it against a couple of already-fixed sections (Results/funding, from this session) before trusting it on new ones.
ORIGIN: Muxin, live conversation 2026-07-04 (explicit request for "deterministic, programmatic enforcement on honoring the design code")
- STATUS: Done
- DEPENDS ON: [P0] TOP PRIORITY: Recover the Keystone design source (canvas export) + stand up the parity pipeline
- GROOMED: ready: concrete algorithm + limitations scoped, but superseded/absorbed by b7c7178d Phase 5 (added DEPENDS ON) + 2026-07-07
<!-- card-id: 97685b26-867d-46bb-9970-077bd5837f36 -->

**Remove MoneyGapH2H as dead code — the PAC-% footnote is the intended head-to-head funding treatment**
- RESOLVED 2026-07-07 by Claude Design (design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §7, PR #235): the canvas's HeadToHead (Section 5, artboard cand-b, the picked direction B) uses the simple PAC-% funding footnote, not a money-gap scale — that footnote IS the intended treatment. MoneyGapH2H (exported from MoneyGap.tsx) was unused exploration - confirmed by grep, zero usages outside its own file/test.
TASK: delete MoneyGapH2H (component + its dedicated test in MoneyGap.test.tsx) and confirm HeadToHead.tsx's existing PAC-percentage footnote is untouched/still correct. Small, low-risk removal - no behavior change, dead code only.
GOAL_CONDITION: MoneyGapH2H no longer exists in MoneyGap.tsx or its test file; `npm run check` (lint+typecheck+test) passes; HeadToHead.tsx's funding footnote renders unchanged.
ORIGIN: Keystone parity-gallery proxy gap, PR #234 review, 2026-07-07
- STATUS: Done
- DECISION: approved (2026-07-07, Claude Design via design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §7) — remove as dead code, trivial/low-risk.
- GROOMED: ready: concrete removal task, goal condition stated + 2026-07-07
<!-- card-id: 0e87d755-6f66-4ca9-90da-28990e2f919e -->

**[P2] Translate party display names in RepCard (PARTY_META2)**
- Republican/Democrat/Independent shown as English cognates; PARTY_META2 is a module-level const without access to t() — needs restructuring into a function taking t().
- Follow-up from card 7855fddd 'Finish Spanish coverage for remaining redesign surfaces' (auto-filed 2026-07-01).
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: bb6c19ce-c885-4132-8624-e394b95a69f2 -->

**[P2] Budget modal: link to the Anthropic Console for BYOK key creation**
- Surfaced 2026-06-30 reviewing PR #170 (budget-exhausted modal). The "Have an Anthropic API key? Use it directly in Voter Choice" section asks users to paste a key but doesn't link where to get one. Add a link to where users create a key — https://console.anthropic.com/settings/keys (label e.g. "Get a key →") — keeping the existing "free to create, you only pay for what you use" framing.
- GROOMED (2026-07-01): READY — add the link to BOTH BYOK sections (live `redesign/ByokCard.tsx` + legacy `VoterChoiceApp.tsx`). NOTE: the exact "free to create, you only pay for what you use" wording doesn't exist in code today; just add the link near the current sub-copy. Auto-eligible.
- STATUS: Done
<!-- card-id: a4a5215e-c5bd-4b52-89af-0b4d2e862873 -->

**Field money-gap scale: is a whole-field (3+ candidate) comparison scale still wanted?**
- GAP found reviewing the Keystone parity-gallery (PR #234): the canvas's whole-field view compares 3+ candidates on one scale; RepCard.tsx's <MoneyGapScale> has no `field` prop and only ever renders a single-subject comparison. Full context + the exact open question: design-handoff/keystone-canvas/PROXY-GAPS-FOR-CLAUDE-DESIGN.md section 5.
TASK: Muxin takes the open question to the Claude Design canvas session, then this card gets a DECISION before build.
ORIGIN: Keystone parity-gallery proxy gap, PR #234 review, 2026-07-07
- STATUS: Done
- DECISION: closed (2026-07-07, Claude Design via design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §5) — WON'T BUILD. No field scale exists on the canvas or in the repo; the shipped single-subject-vs-chamber-median comparison (MoneyGap.tsx, peerComparison.ts) IS the intended design. A 3+ scale would be a new component with no design behind it.
<!-- card-id: be126dc5-23ae-40d2-86a8-5d49a264fc46 -->

**[P2] Draft a scoped "refactor the codebase" proposal for Muxin**
- - Muxin approved (2026-07-02): the standing [P2] Refactor card is unrunnable as written; produce a concrete scoped proposal instead.
- TASK: analysis-only — survey the codebase for the highest-leverage, lowest-risk refactor targets (duplication, dead code, oversized modules, test gaps); output a short proposal doc with candidate scopes, effort, risk, and recommended sequencing. NO code changes.
- GOAL_CONDITION: proposal doc exists listing >=3 concrete scoped refactor candidates with effort/risk each; Muxin can approve scopes from it.
- CHAIN: 1
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: 66123a2b-1d26-40d0-8829-6348537ca7c2 -->

**[P2][security] Fail closed (or loudly warn) when the durable store is unconfigured in production**
- Two LOW findings: an unconfigured KV/Upstash silently fails OPEN to per-instance state (resets to $0/0 each cold start), defeating the global budget + rate limits. The 42-day empty-DATABASE_URL precedent shows the trigger is plausible.
- FIX: in prod treat missing/empty KV config as fail-closed for budget + rate-limit; loud startup warning + deploy/health check asserting KV vars present. Refs: budget.ts:141,239; rate-limit.ts:251-252; durable-store.ts:9-20.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- DECISION: approved (Muxin 2026-07-02, batched sit-down — aligned with conductor recommendations)
- GROOMED: GROOMED (2026-07-02): GOAL: with durable store unconfigured under NODE_ENV=production, budget resolves fail-closed (exhausted) + rate-limit denies + loud startup warning (probe: unset KV vars in prod mode → blocked, not $0-reset). SEQ: after de208d84 (shared budget.ts)
<!-- card-id: 26b67304-3ad7-4e22-9ae1-f23e402d8583 -->

**[P3][ci] Workflows: explicit least-privilege permissions blocks**
- - Split 1/3 of 9caf3e82 (GitHub Actions least-privilege + supply-chain pinning) per groom 2026-07-02 — one pass per PR.
- TASK: every .github/workflows/*.yml (11 files) declares explicit permissions: (default contents: read, elevated per-job only as needed).
- GOAL_CONDITION: grep shows a permissions block in each workflow; CI still green on a no-op PR.
- CHAIN: 1
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: 0fbf6198-9e22-4f3a-bd68-e1a398a77a02 -->

**[P3] One-time prettier format sweep — 206 pre-existing files fail format:check**
- - Discovered while building 69d3e007 ([P1] #151 usage metrics miss the research sub-agent): `npm run format:check` warns on 206 files on origin/main — pre-existing drift, untouched by that change.
- - CI is unaffected today (test.yml runs eslint via `npm run lint`, not format:check). Only matters if format:check is ever added to CI.
- - TASK: one-time `npm run format` sweep in a dedicated PR (no logic changes), so format:check could become a CI gate later.
- - CHAIN: 1
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: 843ac43c-6288-481c-882e-1f33d596ac6d -->

**[P3][security] Add baseline security headers / CSP (report-only first)**
- - Add a baseline security-header set for the Next.js app; the app currently has NO CSP / security headers anywhere (no headers() in next.config, no middleware, none in vercel.json). Discovered while doing card 20be9d4f (BYOK replaceAll redaction + CSP review).
- Start REPORT-ONLY to avoid breakage: `Content-Security-Policy-Report-Only` with `connect-src` covering https://api.anthropic.com + Neon + Census geocoder + Vercel, plus `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors none`. Validate against the running app (incl. BYOK direct-to-Anthropic fetch + Next hydration inline styles) before enforcing.
- ORIGIN: auto-filed follow-up from card 20be9d4f (from security audit 850b1220 / docs/security/audit-2026-07.md).
- CHAIN: 1
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): CHAIN:1 backend-security hardening (report-only first), unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: 332e7d3b-f24b-40f5-987e-900f721ea6e5 -->

**Runtime IP-format validation in getClientIP**
- - Follow-up from 892121ee (XFF normalization): the shared helper trusts header shape — a garbage rightmost hop can still become a rate-limit bucket key. Validate IPv4/IPv6 format and fall back to "unknown" on garbage.
- Originating card: [P2][security] Normalize client-IP derivation (X-Forwarded-For) across all routes (892121ee).
- CHAIN: 1
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): backend CHAIN:1 follow-up, parent Done. GOAL: getClientIP validates IPv4/IPv6 shape, garbage hop falls back to "unknown" (unit test)
<!-- card-id: 75a2ba13-4f42-485e-9fdc-7c0d970f2f42 -->

**Record chat usage incrementally per round (close the TOCTOU budget race fully)**
- - Follow-up from de208d84 (fan-out cap): recordUsageAsync still runs once at stream end, so spend lands in the durable store only after a turn completes; the mid-run re-check narrows but does not close the window. Move to per-round incremental recording.
- Originating card: [P1][security] Cap per-round tool fan-out and add an in-flight budget circuit-breaker to /api/chat (de208d84).
- CHAIN: 1
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): backend CHAIN:1, parent Done. GOAL: recordUsageAsync runs per round; durable spend reflects usage before turn completes (test)
<!-- card-id: 9596413f-ebcb-49c0-a3e2-21bb3e3d5bff -->

**Wire collectPolisVector() into a live caller**
- src/lib/polis/collectVector.ts has no caller anywhere (not even behind its own flag); its TODO says wire into src/app/api/counters/route.ts alongside recordConcernEvents. Flipping POLIS_VECTOR_COLLECTION_ENABLED does nothing until this lands.
- Surfaced by card a09a77c8 launch-flag inventory (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: da97390d-9cde-4f00-abb2-fc36d440d6a5 -->

**[P3][ci] Workflows: pin all uses: to commit SHAs**
- - Split 2/3 of 9caf3e82 per groom 2026-07-02.
- TASK: pin every uses: in .github/workflows/*.yml to a full commit SHA (comment the human-readable tag alongside).
- GOAL_CONDITION: grep shows zero unpinned uses: tags across workflows; CI green.
- CHAIN: 1
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: a800bca9-43c7-4f81-987f-79ad94f71592 -->

**[P1] Treat Claude Design handoffs as front-end CODE to port, not "guidelines" to reinterpret — DONE**
- THE REAL, GENERAL PATTERN (2026-07-04, Muxin): Muxin regularly shares design handoffs from Claude Design here, and they often contain REAL front-end code (sometimes a full interactive app, sometimes partial), not just visual references or a moodboard. This repo's orchestrator/conductor kept treating these handoffs as "guidelines" to take inspiration from and reinterpret, when they should be treated as front-end code to port/integrate directly. Today's instance (industry breakdown rendered as one stacked bar instead of per-row bars, PAC definition as a static paragraph instead of a hover tooltip, wrong column order, wrong heading copy) was caused by exactly this: reverse-engineering structure from screenshots instead of reading the real JSX/CSS source that was already in the repo.
- RESOLVED SCOPE + MECHANISM (per Muxin, live grooming 2026-07-04): a structural, repo-wide convention, not a per-epic reminder.
  1. **Renamed the root folder** `claude-code-handoff/` → `design-handoff/`. Anything under this root is, by convention, front-end CODE to port -- never a moodboard, never "inspiration."
  2. **Subfolders split design sessions.** Muxin drops each handoff into its own subfolder under `design-handoff/`; whichever subfolder she currently points to is what's active/in-scope. Existing subfolders: `design-session/` (Results/funding partial handoff), `representatives-only/`, `uploads/`, and the new `keystone-canvas/` (today's two files: the standalone Keystone canvas HTML + `HANDOFF-EXACT-MATCH.md`, moved off repo root into this subfolder).
  3. **Practical porting rule:** CSS is reused/ported verbatim (prefer importing/scoping the design source's CSS directly over hand-transcribing rules -- transcription is where drift creeps in); JSX structure + classNames are ported verbatim, with only real data-binding/state/routing logic layered in (the design-session files are static mockups, so full literal file drop-in isn't possible -- structure and styling are, and that's the part that was getting reinterpreted).
  4. **Blocking first step:** before writing any markup for a design-handoff-sourced surface, read and port the matching subfolder's source file(s) first. Screenshots/canvas-cross-checks are a fallback ONLY for surfaces with no corresponding source file in the pointed-to subfolder.
  5. **Standing rule now lives in `AGENTS.md`** (read every session, not buried in one epic's handoff doc) so it's binding the next time any design card is picked up.
  6. **Enforcement backstop:** pairs with the deterministic class-coverage checker proposed in card 97685b26 (build later, not blocking this card) as an automated pre-merge gate.
- Updated all repo references (code comments in HeadToHead.tsx/MoneyGap.tsx/candidates.css/redesign2.css/redesign-duel.spec.ts, and the sibling backlog cards) from `claude-code-handoff` to `design-handoff`.
- GOAL_CONDITION: `design-handoff/` exists (old `claude-code-handoff/` name gone) with `design-session/`, `representatives-only/`, `uploads/`, `keystone-canvas/` subfolders; `keystone-canvas/` contains the standalone HTML + HANDOFF-EXACT-MATCH.md; `grep -r "claude-code-handoff"` across tracked/live files (excluding the frozen archive doc) returns 0 hits; AGENTS.md contains the standing design-handoff rule. All met as of this session.
ORIGIN: Muxin, live conversation 2026-07-04 (superseding the narrower "read design source for Keystone" framing this card originally had)
- STATUS: Done
<!-- card-id: 6ec55319-47bc-4a66-9fc0-3575f0f81837 -->

**[P3][security] Harden dangerouslySetInnerHTML usage in redesign i18n rendering**
- Some redesign copy is rendered via dangerouslySetInnerHTML with string interpolation (surfaced during the Spanish-coverage self-vet on PR #182). Not currently exploitable — interpolated values are static translation strings + DB numerics — but it is a latent XSS surface. Harden by escaping/sanitizing interpolated values or switching to safe React rendering where the HTML formatting isn't required.

ORIGIN: auto-filed follow-up (conductor self-vet, 2026-07-03)
Originating card: 7855fddd — Finish Spanish coverage for remaining redesign surfaces (PR #182)
CHAIN: 1
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): CHAIN:1 backend-security hardening, unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: 36424855-6b99-47e9-bffe-86d800ab76b3 -->

**Escape untrusted-framing delimiters in retrieved + voter-profile content**
- - Follow-up from a3ae72be review: frameUntrustedRetrievedData (and the mirrored appendVoterProfile pattern) do not escape a literal [END UNTRUSTED RETRIEVED DATA] inside the wrapped content, so adversarial retrieved text can spoof an early close and inject instructions after it. Neutralize the delimiter string inside payloads at both call sites (e.g. zero-width break or replacement), consistently.
- Originating card: [P3][security] Frame research/web_search tool_result content as untrusted (a3ae72be).
- CHAIN: 1
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: ff872ee2-b23e-4163-b7e4-f556f0390ce4 -->

**[P3][ci] GitHub Actions least-privilege + supply-chain pinning**
- Clusters three INFO/LOW hardening findings: default GITHUB_TOKEN scope, actions pinned to mutable tags (incl. third-party dorny/paths-filter), and an unverified bws binary that receives the master Bitwarden token.
- FIX: permissions: contents: read on all workflows (elevate per-job as needed); pin all uses: to commit SHAs; verify a pinned SHA-256 of the bws zip. Refs: all 11 .github/workflows/*.yml; bws install in deploy.yml:46 + 7 ingest workflows.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- SUPERSEDED 2026-07-04: fully covered by its 3 split PRs (one pass per PR per groom 2026-07-02) — permissions blocks (0fbf6198, PR #222), SHA-pinning (a800bca9, PR #223), bws checksum (586dffed, PR #224). Closing this umbrella card now that all three are shipped.
- STATUS: Done
<!-- card-id: 9caf3e82-56a9-4a5a-990f-ee95f3771c23 -->

**Extract shared validateOrigin helper across the four AI routes**
- - Follow-up from 80822a9f: validateOrigin logic is now duplicated across chat, civic, extract-ballot, research-candidate. Extract one shared server helper (mirroring client-ip.ts) and migrate the four routes.
- Originating card: [P2][security] Harden /api/research-candidate (80822a9f).
- CHAIN: 1
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): backend CHAIN:1, parent Done. GOAL: one shared validateOrigin helper consumed by all four AI routes; grep shows no duplicated origin logic; tests green
<!-- card-id: 40d0e666-a127-48c6-b462-3f878e9fcc17 -->

**[P3][ci] Verify bws (Bitwarden Secrets) download against a pinned SHA-256**
- - Split 3/3 of 9caf3e82 per groom 2026-07-02. Conductor default (engineering trivia): compute the current release zip's SHA-256, pin it in the workflow, fail the job on mismatch; bump hash on deliberate upgrades.
- GOAL_CONDITION: deploy workflow verifies the bws zip hash before use; tampered/changed zip fails the job.
- CHAIN: 1
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: 586dffed-6d58-430b-8a3d-d197007f95f9 -->

**[P3][ci] Remove curl --insecure on CO/OK/TX donor bulk downloads and add checksum verification**
- LOW data-poisoning: --insecure/-k on donor bulk downloads means MITM-substituted content is ingested into prod donor_aggregates with no integrity check.
- FIX: drop --insecure; pin the CA / fetch intermediate; add a content checksum before ingest. Refs: .github/workflows/ingest-state-donors-monthly.yml:140,238,256.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: Step 0.5 re-groom pass (2026-07-04): unambiguously ready, no approval-worthy gate; auto-stamped
<!-- card-id: 2c4b10f8-09fe-41f8-8b37-762396838287 -->

**[P2] Spanish/i18n for new redesign copy (Why Now? page, orientation screen)**
- Surfaced by PRs #155 (Why Now? page) and #160 (orientation screen).
- New page/screen body copy is English-only; nav labels were translated (en+es) but page bodies were not, matching existing static pages.
- Add ES (and other supported locales) when the redesign adopts t() keys for body copy.
- STATUS: Done
- GROOMED: ready: two named surfaces (Why Now?, orientation), add t() keys + ES; UI -> HOLD + 2026-07-01
<!-- card-id: 694cfc22-9c20-47e9-b559-4667b9923bf7 -->

**[P2] Fix the 2 medium stock-ingest findings before any --live run**
- - From PR #184's self-vet (2026-07-02), approved by Muxin in the batched sit-down: (1) one oversized/out-of-range source value aborts the whole upsert batch — make it skip+log the row instead; (2) dataset-controlled filing_url is excluded from the upsert key and can silently overwrite official links — include it or guard overwrites. Also (low) validate URL scheme/host on ingest.
- GOAL_CONDITION: unit tests — a batch containing one bad row upserts the rest and logs the skip; an official filing_url is not clobbered by a divergent later row.
- CHAIN: 1
- STATUS: Done
- DECISION: approved — Muxin approved the 2 stock-ingest fixes in the batched sit-down (per card body); backend, self-vettable
- GROOMED: GROOMED (2026-07-02): backend CHAIN:1, parent merged (#184). GOAL: batch with one bad row upserts the rest + logs skip; official filing_url not clobbered (unit tests)
<!-- card-id: 6d650c0d-79b6-4c2d-836d-2b65c3b3550c -->

**[P3][security] Defense-in-depth for the browser-stored BYOK key (replaceAll redaction + CSP review)**
- INFO: BYOK key handling is already correct (localStorage-only, never sent to server/logged); optional hardening around the documented residual XSS-reads-localStorage tradeoff.
- FIX: use replaceAll in the BYOK error-sanitization path; review/tighten app CSP. Refs: src/lib/anthropic-client-byok.ts:148; app CSP config.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): GOAL: BYOK error sanitization uses replaceAll (all key occurrences redacted); CSP review = documented finding only
<!-- card-id: 20be9d4f-52d6-48da-b90f-308a1974da9a -->

**Consolidate duplicate deadline strings in translations.ts**
- - src/lib/translations.ts carries a second near-duplicate set: deadlinePassed / deadlineStatus (en ~654-655, es ~1348-1349) alongside the deadline.{passed,today,daysLeft} block getDeadlineStatus now consumes. Audit consumers of the older keys and consolidate to one source.
- - Backend-only cleanup; pre-existing, not introduced by ac767bba.
- - Discovered during review of card ac767bba-d4bc-4470-b540-39d3545f2ecb.
- CHAIN: 2
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): approved by Muxin 2026-07-02 (CHAIN:2 human-groomed). GOAL: single deadline-string source in translations.ts; old duplicate keys removed, consumers migrated, tests green
<!-- card-id: 353429c8-3cea-4199-bf22-4306da09986a -->

**Fix singular deadline label copy: '1 days left' / 'Quedan 1 días'**
- - Deadline labels render grammatically wrong at n=1 in both locales ('1 days left', 'Quedan 1 días') — faithful to pre-refactor behavior, now trivially fixable in the registry's deadline.daysLeft functions.
- - USER-FACING COPY change (needs Muxin's eyes per UI rule).
- - Discovered during review of card ac767bba-d4bc-4470-b540-39d3545f2ecb.
- CHAIN: 2
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): approved by Muxin 2026-07-02 (CHAIN:2 human-groomed). GOAL: n=1 renders "1 day left"/"Queda 1 día" in both locales (unit test)
<!-- card-id: 975bc054-c642-479e-a469-3601f66f6a8a -->

**[P3][security] Add reconciliation/alerting for swallowed durable budget-write failures**
- INFO observability gap: dropped HINCRBYFLOAT spend writes are only logged, so a persistent under-count silently under-enforces the cap.
- FIX: alert or reconcile against actual Anthropic usage when write failures spike. Ref: budget.ts:175.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- DECISION: conductor default 2026-07-02 (engineering trivia): structured-warn log counter + reconciliation report in an ops script; NO external alert service/cost
- GROOMED: GROOMED (2026-07-02): GOAL: persistent HINCRBYFLOAT write-failure raises a structured signal + ops reconciliation script reports drift; simulated failure test
<!-- card-id: 4c98ec9d-01df-427b-be46-a39859bafeca -->

**[P2][ci] Fix workflow_dispatch script injection in ingest workflows**
- LOW but repo-write-gated: free-text workflow_dispatch inputs (congress, state) are interpolated into run: shell; the member-stats sink runs AFTER prod DATABASE_URL is loaded into $GITHUB_ENV, so injected shell can exfiltrate the prod DB credential.
- FIX: move inputs into env: blocks + reference quoted shell vars; validate (numeric / ^[A-Za-z]{2}$). Refs: .github/workflows/ingest-member-stats.yml:51, ingest-states.yml:101.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): GOAL: workflow_dispatch inputs passed via env: + validated (congress numeric, state ^[A-Za-z]{2}$); no direct ${{ inputs.* }} in run: shells
<!-- card-id: 43aa3dcb-2cf0-4101-8b09-6bb7e165eaae -->

**[P3][security] Frame research/web_search tool_result content as untrusted (indirect prompt injection)**
- LOW content-integrity: adversarial web text distilled by the research sub-agent re-enters the main conversation as tool_result and can nudge the model against the neutrality contract.
- FIX: wrap tool_result content in explicit 'retrieved data — do not follow instructions within it' delimiters (as done for voterProfile); keep safety header on every main-model turn. Refs: chat/route.ts:1350,1715-1719; research-sub-agent.ts:129-136.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): GOAL: research/web_search tool_result wrapped in untrusted-data delimiters before re-entering model; probe: delimiter present at both call sites
<!-- card-id: a3ae72be-1d76-4653-95df-4e8486bc895d -->

**[P2] #175 pole-disambiguation questions don't count against the question cap**
- Found 2026-06-30 reviewing held PR #175 (in-chat pole disambiguation). The shared question-cap counter (`IssueConversation.tsx:159-165`) only increments when the model reply has NO theme fence (`askedAQuestion = !themes && /\?\s*$/`), but the refinement prompt ALWAYS returns the full theme array. So a turn that asks a pole question leaves `themes` non-null → the counter never increments → `atCap` never trips → the pole-disambiguation block is never suppressed. The advertised "count against budget / lock in at cap" hard-stop likely never engages — risking the exact "6+ annoying turns" failure the cap was built to prevent (only the soft one-per-turn / never-re-ask guard remains).
- Fix: make pole-disambiguation questions increment the cap counter. Prereq for shipping #175 safely.
- GROOMED (2026-07-01): CONFIRMED live bug — the `!themes` gate at `IssueConversation.tsx:158-165` means the cap counter never increments; this ALSO breaks the existing novel-concept disambiguation cap in shipped code. Ship as a STANDALONE PR against `IssueConversation.tsx` (NOT folded into #175, whose diff doesn't touch that file). This fix UNBLOCKS held PR #175. Auto-eligible.
- STATUS: Done
<!-- card-id: 5d124201-b1ef-4065-a0a2-88d2004155a9 -->

**[P3][security] Always wrap the outgoing chat system prompt with the server SAFETY_HEADER on both prompt paths**
- LOW/PLAUSIBLE: the nonpartisan safety framing is absent on the default (legacy) chat path, which passes client systemPrompt verbatim; the endpoint is an unauthenticated LLM + web-search proxy on the paid key.
- FIX: prepend SAFETY_HEADER on the legacy path too; treat client systemPrompt as untrusted; ideally move the task prompt server-side. Refs: chat/route.ts:497-502,534,554.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): GOAL: both legacy chat prompt returns wrapped by prependSafetyHeader like v2 path; probe: both prompt paths begin with SAFETY_HEADER
<!-- card-id: 3ca1698a-2064-4b6c-a848-a0a28754e730 -->

**[P2][security] Validate and sanitize canonicalIssue on the /api/counters write path**
- LOW cross-user data-integrity: unvalidated 64-char canonicalIssue strings (incl. ':') are written to the shared aggregate + reflected to all users in polis panels; colon injection skews % shares.
- FIX: drop concerns whose canonicalIssue not in CANONICAL_ISSUE_LABELS (mirror race-data); sanitizeKeySegment before Redis-key use. Refs: counters/route.ts:62; counters.ts:172.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): GOAL: /api/counters drops canonicalIssue not in CANONICAL_ISSUE_LABELS + sanitizeKeySegment before Redis-key use; probe: unknown/":"-bearing value not persisted
<!-- card-id: 51fa96e7-a2fd-4852-9798-c9632a837279 -->

**[P2][security] Rate-limit, cache, and de-KEYS the /api/polis endpoints**
- MEDIUM unauthenticated DoS amplification: all four /api/polis GETs have no throttle/origin check and each drives a blocking Redis KEYS scan against the shared metered store that also backs the rate limiters.
- FIX: add rate-limit + validateOrigin + edge Cache-Control; replace KEYS pattern:* with SCAN or a precomputed aggregate key. Refs: polis/route.ts:291, bars/route.ts:107, bridges/route.ts:57, compass/route.ts:66; counters.ts:630,662,561,581,320.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- DECISION: approved (Muxin 2026-07-02, batched sit-down — aligned with conductor recommendations)
- GROOMED: GROOMED (2026-07-02): GOAL: all 4 /api/polis GETs enforce rate-limit + validateOrigin + edge Cache-Control; counters.ts has 0 remaining KEYS commands (SCAN/precomputed). Independent; SIZE=L
<!-- card-id: c538771a-3326-46f5-84f2-03d39c8b2950 -->

**[P2][security] Harden /api/research-candidate: add validateOrigin + a fail-closed per-caller spend limit + cache short-circuit**
- MEDIUM unauthenticated cross-site denial-of-wallet (merged from 3 verification passes): no validateOrigin (unlike sibling AI routes), fail-open XFF-spoofable limiter, always spends (no cache short-circuit).
- FIX: add validateOrigin(); low fail-closed per-IP+session spend cap; short-circuit on cached candidate_data; use hardened getClientIP. Refs: research-candidate/route.ts:44-62; candidate-data.ts:159; race-data-rate-limit.ts.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- DECISION: approved (Muxin 2026-07-02, batched sit-down — aligned with conductor recommendations)
- GROOMED: GROOMED (2026-07-02): GOAL: cross-origin POST to /api/research-candidate rejected by validateOrigin (403, matching sibling AI routes) + cached candidate short-circuits with zero sub-agent spend. SEQ: after 892121ee — reuse its hardened getClientIP
<!-- card-id: 80822a9f-bb5d-4e74-b246-ef33b0573bc0 -->

**[P1][security] Cap per-round tool fan-out and add an in-flight budget circuit-breaker to /api/chat**
- HIGH denial-of-wallet: toolUseBlocks is Promise.all'd with no length cap and the budget is checked only once at admission — a crafted request can fan out to hundreds of billable searches across 10 rounds.
- FIX: slice toolUseBlocks to a small N/round; per-request cap on research_candidate/web_search; re-check getBudgetStatusAsync between rounds + abort on tier flip; record usage incrementally (also closes the TOCTOU race). Refs: chat/route.ts:1306,1253,1516,1384; budget.ts:149.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- DECISION: approved (Muxin 2026-07-02, batched sit-down — aligned with conductor recommendations)
- GROOMED: GROOMED (2026-07-02): GOAL: per-round billable tool-call cap (default 4) + round loop aborts when getBudgetStatusAsync flips exhausted mid-run (test mocks mid-loop flip). SEQ: after ec0c0ce3 (shared files)
<!-- card-id: de208d84-8af8-4890-b60b-fc059621de35 -->

**[P1][security] Enforce the exhausted-budget hard-stop on the durable tier, not a per-instance in-memory flag**
- HIGH: the $50 Anthropic cap is non-functional under Vercel horizontal scaling — the exhausted-budget block at chat/route.ts:830 is gated on a per-instance in-memory flag (wasHandoffServed()) instead of the durable tier, so most lambdas keep billing past the cap.
- FIX: drop the `&& wasHandoffServed()` qualifier and block unconditionally on tier==='exhausted' (or plumb the durable handoffServed flag through getBudgetStatusAsync). Refs: src/app/api/chat/route.ts:830, src/lib/server/budget.ts:243-250,316-319.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- DECISION: approved (Muxin 2026-07-02, batched sit-down — aligned with conductor recommendations)
- GROOMED: GROOMED (2026-07-02): GOAL: tier=exhausted from durable store blocks on a fresh lambda (wasHandoffServed()=false) — exhausted branch taken, no billing. SEQ: shares budget.ts+chat/route.ts with de208d84 — series only
<!-- card-id: ec0c0ce3-c511-4b7e-bbac-d336c0fd716b -->

**[P2][security] Normalize client-IP derivation (X-Forwarded-For) across all routes**
- The per-IP caps backstopping every abuse control are spoofable/inconsistent — race-data keys on the raw XFF header; others trust the leftmost value. Underpins the two HIGH + research-candidate MEDIUM findings.
- FIX: route every limiter through one hardened getClientIP; document the trusted-proxy assumption. Refs: race-data/route.ts:141; getClientIP usages in chat, research-candidate, counters.
- From the security audit (card 850b1220 '[P0] Retrospective whole-app security audit'); details + code refs in docs/security/audit-2026-07.md (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: GROOMED (2026-07-02): GOAL: one hardened getClientIP for all rate-limit routes; spoofed multi-value XFF resolves to trusted-proxy client IP (unit test)
<!-- card-id: 892121ee-b173-48f3-9250-72814acb1c5d -->

**[P1] Fix #168 Spanish `{temas}` placeholder leak on the themes card**
- Found 2026-06-30 reviewing held PR #168. The Spanish themes card rendered the literal token: "Aquí hay 2 {temas} para empezar…". The ES `intake.starterAck` template used `{temas}` but `IssueConversation.tsx` substitutes the English token `{themes}`, so the ES token was never replaced.
- ✅ FIXED 2026-06-30 in the PR #168 branch (commit `cd4d63f`): changed the ES template token `{temas}` → `{themes}` so the existing `.replace("{themes}", themeWord)` substitutes it (themeWord = ES "temas"/"tema"). Now renders "Aquí hay 2 temas para empezar…". tsc + lint clean, 2370 tests green. Rides with PR #168 — close when #168 merges.
- STATUS: Done
<!-- card-id: da52c9b3-9c45-43d0-b619-464bdcd29506 -->

**[P0] Fix #171 polling-place note crash — `t(...) is not a function`**
- Found 2026-06-30 reviewing held PR #171. PR #171 added `polling.addressNotPublished` to `src/lib/translations.ts`, but the prototype renders from a SEPARATE inline `TRANSLATIONS` object in `VoterChoiceApp.tsx` whose `t()` reads that object, not `src/lib/translations.ts`. So `t('polling.addressNotPublished')` returned the literal path string, and the call site `t('polling.addressNotPublished')(days)` invoked a string as a function → `TypeError: t(...) is not a function`, crashing the polling panel whenever it's expanded with an empty address (real users, not dev-only).
- ✅ FIXED 2026-06-30 in the PR #171 branch (commit `0a42a7f`): added `addressNotPublished` as a `(days) => string` to the inline `TRANSLATIONS.polling` EN + ES blocks. tsc + lint clean, 2370 tests green. Rides with PR #171 — close when #171 merges.
- STATUS: Done
<!-- card-id: 4ebc2b68-8741-4def-8198-51de2cabb9c1 -->

**[P1] Set up phase gating — gate Phase 2/3 behind [GATE] epic cards**
- Make the orchestrator work ONLY Phase 1 + Cross-cutting until a phase is explicitly opened. Full spec: docs/operations/PHASE-GATING-HANDOFF.md.
- WHY: today's picker only draws from `To Do`, so Backlog is already safe — but the planned auto-promote loop (simple-kanban card 0da3916b) will auto-move *ready* Backlog cards into To Do. The `DEPENDS ON` gate is what stops it jumping ahead into Phase 2/3 once that loop ships.
- PLAN: (1) create 2 gate epics in Backlog — `[GATE] Phase 1 complete → open Phase 2` and `[GATE] Phase 2 complete → open Phase 3` (keep titles EXACT/stable). (2) Wire `- DEPENDS ON: <gate>` onto each genuinely-phase-2 card (→P1 gate) and each genuinely-phase-3 card (→P2 gate). (3) Audit the To Do column — move any real Phase 2/3 card back to Backlog. Cross-cutting + Phase 1 cards get NO gate.
- To open a phase later: drag its gate card to Done (once the auto-promote loop ships, that one move promotes the unblocked cards).
- STATE (verified 2026-07-01): the Phase 2 (6) + Phase 3 (14) sections are CLEAN — all 20 non-Done cards sit in Backlog and none carry an existing `DEPENDS ON`, so wiring is mechanical: every Phase 2 card → `[GATE] Phase 1 complete → open Phase 2`, every Phase 3 card → `[GATE] Phase 2 complete → open Phase 3`.
- Do NOT gate the `## Cross-cutting / Operations` section — that's where the live To Do/Review work is (Keystone redesign, Spanish/i18n, #171 crash fix, budget-modal BYOK, #175, CSS housekeeping, etc.); cross-cutting runs regardless of phase.
- NOT urgent today: auto mode ALREADY only works Phase 1 + Cross-cutting — all 14 To Do cards are Phase 1 (8) or Cross-cutting (6), zero Phase 2/3 cards are in To Do, and the picker only draws from To Do. This gate is future-proofing for the coming auto-promote loop (Backlog→To Do), the only path that could promote a ready Phase 2/3 Backlog card early.
- Apply via the prose_kanban helpers (o.append_card for the gates, o.apply_dependency for each link) — avoid hand-editing the md — and do it while no orchestrator is running / the board file isn't open, so live STATUS lines aren't clobbered.
- ATTENDED / not an AUTO build — board restructure needs product judgment on the mislabeled Phase 3 cards. Kept in Backlog.
- STATUS: Done
<!-- card-id: 6970765b-bce5-4850-94a5-f0e7e662f77e -->

**Fold getDeadlineStatus label strings into the locale registry**
- - src/lib/getDeadlineStatus.ts computeLabel still branches on lang === 'es' with 3 inline Spanish label strings (Passed / Today / N days left) outside the Translations registry; a 3rd locale would silently get English deadline labels.
- - Dormant at runtime today (only test + prototype comment reference it); zero behavior impact until a 3rd locale ships.
- - Discovered while building card 63ebc159-26e3-4079-a14d-838fb95f1b90 (i18n plumbing generalization).
- CHAIN: 1
- STATUS: Done
- GROOMED: ready: one file, three strings, GC = registry-sourced labels + es output identical; CHAIN:1 backend-optimizing + 2026-07-02
<!-- card-id: ac767bba-d4bc-4470-b540-39d3545f2ecb -->

**[P2] Generalize the i18n plumbing from hardcoded en/es to N locales (no new translations)**
- Traces to "[P1] Translations to major languages": the epic says "the i18n plumbing already exists" but it is hardcoded to two locales — `type Language = "en" | "es"` in src/lib/translations.ts, `VALID_LANGUAGES: Language[] = ["en", "es"]` in src/lib/i18n.tsx, and en/es-only prompt-variant selection in src/lib/generatePrompt.ts + src/app/api/chat/route.ts (ballotPromptEn/Es.generated.ts via `npm run sync:ballot-prompt`).
- TASK: refactor so adding a locale means registering data only — a strings object satisfying the `Translations` interface + a generated prompt variant — with no edits to consumer components or the language switcher logic. Extend the sync:ballot-prompt script to handle N variants.
- Scope guard: pure plumbing — ship ZERO new user-facing languages and change ZERO en/es strings, so it does NOT wait on the Phase-1-UX-finalized gate, the go-live gate, or Muxin's tier sign-off (any approved tier needs this first).
- Surfaces: src/lib/translations.ts, src/lib/i18n.tsx, src/lib/generatePrompt.ts, src/app/api/chat/route.ts, scripts behind sync:ballot-prompt, plus i18n.test.tsx / translations.test.ts.
- GOAL_CONDITION: A PR after which registering a third locale requires only new data files (Translations strings object + generated prompt variant) and one registry entry — no consumer-component edits; en/es runtime behavior unchanged; tsc + existing i18n/translations/generatePrompt tests green; no new language exposed in the UI.
- ORIGIN: proposed by propose-cards 2026-07-02 from epic [P1] Translations to major languages (2b325135-bafc-454f-b253-5bce21e05a13)
- STATUS: Done
- GROOMED: ready: pinned surfaces + stated GOAL_CONDITION; pure plumbing refactor, no user-facing change + 2026-07-02
<!-- card-id: 63ebc159-26e3-4079-a14d-838fb95f1b90 -->

**[P2] CSS housekeeping: prune orphaned .addr-why-* and unused .lvl-tag rules**
- Surfaced by PRs #157 (address box) and #159 (jurisdiction inline).
- The (?) popup classes (.addr-why-btn/.addr-why-modal/.addr-why-close, .addr-card label .privacy) and the removed jurisdiction-chip .lvl-tag rules are now unused. Left in place to stay surgical; prune in a cleanup pass.
- STATUS: Done
- GROOMED: ready: named selectors to prune; GC: grep-clean + build green, no render change + 2026-07-01
<!-- card-id: 1ec90ed1-9222-4e81-a15e-2460767f0581 -->

**[P2] #146 empty k-means cluster silently suppresses all consensus statements**
- Found 2026-06-30 reviewing held PR #146 (polis clustering). `findConsensusStatements` (`src/lib/polis/clustering.ts:342-345`) treats an empty cluster (size 0) as a hard consensus failure (`allClear=false; break`), so with `DEFAULT_K=3` any empty cluster silently suppresses ALL consensus statements — the report's headline feature. Inconsistent with `detectDividedState` (`clustering.ts:412`) which correctly filters `c.size > 0`. Inert today (surface unwired); fix BEFORE wiring the Polis report surface. (Also `reportAssembly.ts:194` emits size-0 phantom clusters.)
- STATUS: Done
- GROOMED: ready (Step 0.5 self-groom): precise fix at clustering.ts:342-345 (filter c.size>0 mirroring detectDividedState:412) + reportAssembly.ts:194; clustering.ts on main; inert surface, no prod/judgment; testable + 2026-07-02
<!-- card-id: 174c8798-b17b-4d40-b17f-a317810ab423 -->

**[P2] Research spike: confirm the major-language translation set (VRA §203 coverage)**
- Traces directly to the open TBD in "[P1] Translations to major languages": "Language set (TBD — confirm)... Choose the set deliberately rather than 'all major world languages.' (Suggested by Claude — confirm.)"
- TASK: research which languages are required/recommended for federal-relevant coverage under the Voting Rights Act §203 minority-language provisions — confirm or correct the suggested candidate list (Chinese, Vietnamese, Korean, Tagalog, and applicable Native American / Alaska Native language groups) against actual §203-covered jurisdictions, with citations.
- Output a findings doc proposing a confirmed language set (beyond the existing Spanish) with sourcing per language, ready for Muxin's sign-off — unblocks the parent card's TBD without committing to i18n build work.
- Research/desk-work only — does NOT touch src/lib/translations.ts, the ballot-prompt en/es variants, or any UI copy; does NOT wait on the Phase-1-UX-finalized gate since no strings are touched.
- Mirrors the existing spike-before-build pattern already used on this board (e.g. the civic-orgs/lobbying and stock-transactions cards).
- GOAL_CONDITION: A findings doc exists listing a recommended language set (each language paired with its VRA §203 / jurisdictional legal basis and source citation), explicitly confirming or revising the epic's suggested list; no translation strings, prompt variants, or UI copy are changed.
- ORIGIN: proposed by propose-cards 2026-07-01 from epic [P1] Translations to major languages (2b325135-bafc-454f-b253-5bce21e05a13)
- STATUS: Done
- GROOMED: ready: machine-proposed, explicit GOAL_CONDITION (findings doc); recommend promote + 2026-07-01
<!-- card-id: d885108b-5f48-47e6-b7b7-9fcedddc41a1 -->

**[P2] Harden check-schema-drift parser: strip SQL comments before splitting on `;`**
- - `scripts/ops/check-schema-drift.ts` `splitStatements()` splits each migration on `;` BEFORE `stripSqlComments()` runs, so a semicolon inside a `-- comment` fragments the statement. This split `0012_add_polis_response_vectors.sql`'s `CREATE TABLE` at a comment's `;`, tripped the unparsed-DDL guard, and would fail the deploy-time drift check. Worked around in PR #146 by removing the semicolons from the migration's comment prose.
- Fix: in `splitStatements`, strip comments FIRST, then split on `--> statement-breakpoint` and `;` (reorder the pipeline). Add a regression test: a migration whose `CREATE TABLE` body comment contains a `;` must parse to a complete statement.
- Why it matters: a mis-parsed `CREATE TABLE` leaves that object out of the expected schema, so the drift guard FAILS OPEN on it — the exact prod-behind failure the guard exists to catch.
- STATUS: Done
- GROOMED: ready (Step 0.5 self-groom): specific parser reorder in check-schema-drift.ts splitStatements (strip comments before split) + regression test; file on main; no prod/judgment; testable + 2026-07-02
<!-- card-id: a06b360f-5017-45fc-b6c8-5ca67126b72d -->
