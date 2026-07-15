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


## #1 PRIORITY — Accurate official congressional candidate rosters

**[P0] Nationwide official-source congressional candidate roster — every race, every candidate, always current**
- CARD TYPE: EPIC
- PLAN: docs/operations/nationwide-congressional-roster-plan.md
- PLANNING STATUS (2026-07-13): Follow-up planning is complete and persisted in the plan above, including the original mandate, authority/source rules, Alabama/FEC calendar complications, Ballotpedia sampling, data/application design, freshness SLA, progressive card catalog, Codex model tiers, rollout/rollback, and final robustness audit.
- EXECUTION STATUS (Muxin, 2026-07-14): IMPLEMENTATION AUTHORIZED. Wave 1 (F01/F02) and Wave 2 (F03/F04 + the F05/F06/F07 rehearsal corrections) are built. F05/F06 Done, F07 is the next card (To Do). Wave 3 national inventory fan-out (I05–I11) and Wave 4 (I12 consolidation, M13 schema+migration, M14 promotion engine) are pre-created; I12 is left un-GROOMED so the conductor confirms the I05–I11 fan-in before promoting; M13/M14 are pre-GROOMED. One unattended run flows F07 → I05–I11 → I12 → M13 → M14 and STOPS at M15. Every downstream gate is PRE-AUTHORIZED (see the plan's "Pre-authorized execution decisions") EXCEPT the two human stops: A25 (app-vs-official-source data sanity test) and C29 (public cutover).
- PRE-AUTHORIZATION (Muxin, 2026-07-14): Every gate downstream of M14 is pre-cleared to run unattended, fail-closed, per the plan's "Pre-authorized execution decisions" section — EXCEPT the two human stops A25 and C29. The conductor stamps each downstream card it creates/emits with the matching DECISION from that section (born decided) so the run never drip-feeds approvals; any reconciliation discrepancy, verifier failure, missing secret, or official mismatch stops the run. Nothing auto-exposes roster data to real users or mutates production — those happen only at A25 and C29. Muxin provisions the isolated staging Blob + Neon branch out of band and sets `ROSTER_STAGING_BLOB_TOKEN` + `ROSTER_STAGING_DATABASE_URL`; M15 only consumes them.
- HARD SANITY-TEST GATE (Muxin, 2026-07-14): Before A25 (pilot UI flow behind the flag) merges, and before ANY national fan-out or production cutover, STOP for an attended manual accuracy test — see the "[P0] MANUAL SANITY-TEST GATE" card below and the plan's Wave-5 gate. A25 and every fan-out/cutover card MUST carry `DEPENDS ON` that gate. Do not present roster data to real users until Muxin signs off on the app-vs-official-source comparison.
- PRIORITY LOCK (Muxin, 2026-07-13): This is the first and only backlog priority. Do not begin or continue any other backlog implementation until this card is finished.
- CURRENT STATE / INCIDENT HISTORY: A voter reported current November candidates missing while people who withdrew earlier in 2026 were displayed. The redesigned challenger list had been sourced from weekly FEC Form-2/campaign-filing data even though a campaign filing is not ballot qualification. PR #295 shipped containment so unverified FEC filers are no longer presented as current ballot candidates. The nationwide authoritative roster remains unresolved. Draft PR #296 contains the Texas Senate comparison/report history; it is not the nationwide solution.
- NON-NEGOTIABLE SOURCE DECISION: Do not scrape Ballotpedia or attempt to bypass its access controls. Build a federated official-source ingestion system using public state election-authority records. Start with the FEC-maintained directory of state election offices: https://www.fec.gov/introduction-campaign-finance/how-to-research-public-records/state-election-offices/
- KEY REALITY: This is not one universal scraper. Official sources include machine-readable downloads, searchable databases, HTML tables, spreadsheets, text PDFs, browser-rendered public portals, and election-specific certification documents. Build shared ingestion modes plus jurisdiction-specific configuration/adapters.
- AUTHORITY / SCOPE: Cover every expected federal contest published by the FEC/state authorities, including House and Senate, regular and special elections, and each applicable primary, runoff, and general-election stage. Include all FEC-listed jurisdictions that have a federal contest; do not silently omit DC or territorial delegate/resident-commissioner contests when applicable.
- ELECTION-STATE RULE: Model the exact jurisdiction, office, district, election date, regular/special flag, and stage. Preserve the official distinction between `filed`, `qualified`, `advanced`, `defeated`, `withdrawn`, `disqualified`, and `write-in`. A filing list is not a certified ballot list. Never infer a final general-election roster before the responsible authority publishes or certifies it; show an honest `official roster not yet published/certified` state instead.
- EXISTING APP SAFETY RULE: FEC records may enrich a candidate with campaign-finance history, but FEC status, incumbency, fundraising, or an old database row can never establish current ballot eligibility. Candidate identity/history must remain separate from an appearance on a specific ballot.
- ORIGINAL PROPOSED PLAN (historical baseline; superseded and fully resolved by the linked planning document):
  1. Build a national source inventory: for every jurisdiction, record the official landing page, election calendar, candidate publication, format, update cadence, access/robots/terms constraints, parser type, and fallback. Produce coverage statuses such as `automatable`, `manual official import`, `not yet published`, and `blocked`.
  2. Add a canonical election/roster model: separate election, contest, candidate identity, and candidate appearance/status. Store immutable source snapshots with source URL, official authority, retrieval time, publication/effective date, checksum, parser version, raw artifact reference, completeness, and provenance/confidence.
  3. Build reusable ingestion modes in this preference order: official CSV/XLSX/JSON/XML; official HTML; text-based official PDF; browser-rendered official public portal; human-downloaded official document imported through the same parser. Never bypass authentication, CAPTCHA, WAF, robots, or other technical controls. Use low-frequency requests, conditional retrieval where possible, and an identifying user agent/contact.
  4. Pilot representative jurisdictions: Texas plus a group covering high-volume ballots, databases, HTML, spreadsheets, PDFs, top-two systems, runoffs, write-ins, replacements/withdrawals, and special elections. Texas Senate remains a required regression fixture, not the only proof.
  5. Fan out national adapters: prefer configuration around shared parsers; custom code only for genuinely unusual sources. Every adapter ships with saved official fixtures, parser tests, completeness expectations, and documented failure/fallback behavior.
  6. Publish only validated complete snapshots: a candidate becomes selectable only for the exact election/stage for which an official authority reports the candidate as qualified/certified. Failed, truncated, malformed, or partial refreshes must never delete or deactivate the previously verified complete snapshot.
  7. Add national freshness/maintenance monitoring: generate a scheduled coverage report for missing contests, changed artifacts, additions/removals, withdrawals/replacements, stale sources, parser/schema failures, and human-review items. Use FEC and state filing/withdrawal/certification/primary/runoff/general dates to control refresh cadence, with higher frequency around changes and lower frequency outside active windows.
  8. Integrate through the app's existing database and race-resolution paths where appropriate. Plan migrations only when the current schema cannot represent exact-election roster appearances, snapshots, statuses, completeness, and provenance safely. The end-to-end path is address/race resolution -> exact upcoming contest -> latest verified official roster -> candidate details shown in the app.
- ORIGINAL REQUIRED VALIDATION / SANITY CHECKS (retained here and expanded into executable gates in the linked planning document):
  - Maintain an expected-contest inventory derived from current FEC/state calendars and compare it with every ingestion run.
  - Compare source row counts, parsed row counts, rejected rows, duplicate rows, and promoted rows. Large state-to-state differences must not be normalized away or treated as suspicious merely because they differ.
  - Fail closed when a source unexpectedly shrinks, changes schema, drops districts/parties, returns an error page, or produces an implausibly incomplete snapshot. Send it to review without replacing verified data.
  - Test high-volume and low-volume states, at-large districts, states without a Senate contest, top-two/top-four systems, runoffs, independents/minor parties, write-ins, withdrawals, disqualifications, replacements, special elections, and overlapping regular/special contests.
  - Cross-check parsed output against the official artifact and, where available, a second official publication or representative official sample ballots.
  - Verify in the real application flow that an address resolves to the correct upcoming race and that every qualified candidate for that race is visible with correct ballot name, party, office, district, election, source, and freshness.
  - Confirm that FEC-only, filed-only, defeated, withdrawn, and disqualified candidates cannot become selectable and that finance history is not erased when roster status changes.
- SAFE FALLBACKS: If an official site blocks automation or exposes no stable public download, use a human-downloaded official artifact, request an official bulk/public-record export, or mark the jurisdiction as requiring manual review. Do not invent data and do not work around access controls.
- ORIGINAL EXECUTION SHAPE (refined by the wave/card catalog in the linked planning document): source inventory and canonical model can begin in parallel; state adapters fan out only after their shared contract is approved; the completeness validator and app integration tests can proceed alongside adapter implementation; final promotion is sequential behind national verification. Use stronger review for election semantics, PDF/OCR extraction, source ambiguities, and final nationwide validation.
- PRIOR ESTIMATE ONLY: approximately 5–8 engineer-weeks for reliable initial national coverage by one engineer, potentially shorter in calendar time with parallel adapters. This is not a commitment and must be re-estimated after the source inventory and requested follow-up planning sessions.
- FOLLOW-UP PLANNING RECORD (Muxin, 2026-07-13): The linked planning document completes the requested follow-up sessions and scopes progressive implementation. The verbatim block remains preserved below. Planning completion is not authorization to start coding; the epic stays parked until Muxin separately authorizes implementation.
- ADDITIONAL REQUIREMENTS FROM MUXIN — VERBATIM (do not correct spelling, rewrite, summarize, or silently resolve during backlog edits):
  > Ensure you use a sanity check and include a testing/validation- for isntance, there's TONS of candidates for Alabama (I think nearly 33 for House alone) whereas TX only has like a dozen. Nobody gets left out. I would also want a scheduled or periodic scraper that repulls new data (can be based on upcoming election dates etc.) I don't see a scope for how to make sure the data is fresh and clean and updated/maintained. The data we do pull MUST work perfectly in the app - use exxisting database schemas where appropriate, etc. It must ensure that users of the app are able to actually see the correct candidate information on their upcoming ballot.
- NEXT ACTION: Run F07 → I05–I11 → I12 → M13 → M14 unattended on the roster lanes, stopping at M15 (staging wire-up, which waits on Muxin's out-of-band secrets). Downstream of M14, create/emit cards born-decided per the plan's "Pre-authorized execution decisions" and keep running, fail-closed, until a human stop (A25 data sanity test, or C29 cutover) or any discrepancy/failure. Never expose roster data to real users or mutate production outside A25/C29.
- GOAL_CONDITION: After separately authorized implementation, `npm run verify:congressional-rosters -- --year 2026` passes with every expected federal contest mapped to either a complete official qualified roster for the exact election stage or an evidenced `official_roster_not_yet_published` state; the address-to-upcoming-race app flow shows every qualified candidate from the latest verified complete official snapshot; and zero FEC-only, filed-only, defeated, withdrawn, disqualified, stale, unknown, or calendar-conflicted appearances are selectable.
- STATUS: Backlog
- DECISION: #1 PRIORITY / QUEUE LOCK — implementation AUTHORIZED (2026-07-14). Waves 1–2 built; F07 + Wave-3 (I05–I11) + Wave-4 (I12/M13/M14) queued to run unattended on the roster lanes, stopping at M15. Every downstream gate is pre-authorized fail-closed per the plan's "Pre-authorized execution decisions" EXCEPT the two human stops A25 (app-vs-source data sanity) and C29 (public cutover); the run never auto-exposes roster data to users or mutates production. Nothing else in the backlog may be implemented until this epic is finished.
<!-- card-id: c5a813bb-9223-4dc1-95aa-65637eb6940b -->

## Phase 1 — Assess Congress (no ballot)

#### Resolve before Phase 1 public release — prod-hardening, NOT design-dependent:

**[P2] Refactor the codebase**
- Do it if it makes sense for code maintainability - I’m assuming doing this will make the app more foolproof, run faster, be easier to audit and work better.

CLARIFICATION (Muxin, 2026-07-12): I rely on your judgement on how to make codebase better without breaking anything. How would we test for that? what would we even do? Most importantly - don't break things. Goal: make codebase better?
- STATUS: Backlog
- DECISION: Auto run the deployment - if it’s not destructive (and it shouldn’t be), I accept all recommendations on the approach.
<!-- card-id: fbe076b3-dbe8-4e03-a2f3-246229aff4b5 -->

**[P0] We need a deployment/test environment/server/branch?**
- Don’t know how to do this, but essentially how do we test the app’s new features without deploying it to the live app?
- SPEC (2026-06-30, approved): **Vercel Preview Deployments + a Neon test branch.** Each feature branch builds to an isolated preview URL (behind Vercel SSO); the preview env gets its own `DATABASE_URL` → a **Neon test branch** (child of prod, copy-on-write — same mechanism as the existing `alignment-work` branch), so feature testing + migrations NEVER touch prod data or live users.
- Build steps: (1) create a Neon `test`/`staging` branch; (2) set preview-scoped Vercel env (`DATABASE_URL` → test branch + non-prod flag defaults); (3) confirm preview deploys are enabled per-branch; (4) document the workflow + a re-branch cadence to refresh test data. ATTENDED (needs Vercel + Neon dashboard access).
- Enables: safe DB-migration testing (apply to the test branch first), the golden-address smoke (run against the test branch), pre-launch dogfooding on a private URL.
- Trade-offs (accepted): extra env surface (guard against a preview pointing at prod DB); Neon branch drifts from prod until re-branched; preview ≠ 100% prod mirror (Redis/rate-limit/cold-starts differ); SSO-gated so external testers need access.
- STATUS: Backlog
- DECISION: defer (unattended) — ATTENDED (Vercel + Neon dashboard setup); do not auto-run.
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
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
- STATUS: Backlog
- DECISION: defer (unattended) — ATTENDED build (cloud routine + Neon role/network setup needs your Claude/Neon dashboards); do not auto-run.
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: c86714c6-d3d7-4019-a03d-4d4c6816f7e4 -->

### General

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
- STATUS: Backlog
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: c160abf1-890d-4222-a8f6-6ee21b70ea29 -->

**[P1] Settings button has no functionality**
- "Settings button does not show any functionality"
- Mechanical bug — renders but is a no-op. Wire a settings panel or remove before launch.
- STATUS: Review
- DECISION: defer — Do not implement Settings until Muxin decides it is a real product need.
<!-- card-id: 403ed2a6-1ddd-4c17-ba12-fed04efa32d1 -->

**Finish Spanish coverage for remaining redesign surfaces**
- After PR #168 wired the main body, these still render English: tier-intro paragraphs (Federal/Executive), SeatChat / RepCard / HandoffModal / ScorecardPrintView, App2 stage error strings (geocodefail/norep/dberror), IssueConversation refinement fallbacks. Add t() keys + ES.
- STATUS: Backlog
- DEPENDS ON: Spanish translation covers only the top bar
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 7855fddd-e389-483c-9e55-163a4c011870 -->

**[P3] Decide tablet/mobile Edit-Issues prominence**
- Edit IS reachable via the scorecard "Edit" button (PR #173) but a tester could not find it — discoverability, not a missing feature.
- DEFERRED to P3 (2026-06-30): re-evaluate AFTER the redesign lands — may be moot once the new layout ships. Parked in Backlog until then.

CLARIFICATION (Muxin, 2026-07-12): we already have a redesigned app. I'll have to double check and see if this is still an issue.
- STATUS: Backlog
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 05b9ca68-e9ff-4701-aa1b-0ab86041871c -->

### Top Bar

**[P2] Rename / reorganize top-bar + footer navigation**
- "It is confusing to me that the homepage is How It Works in the top bar. I would expect How It Works to be the page called
Methodology, which I think might be a bit of difficult word."
- "A lot of the links repeat from the top bar. I would keep About, Rename Support to Contact, and Privacy Policy."
- NOTE: complements existing nav/footer cards — reconcile at grooming.
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: b1a5f64a-cd8c-47a0-8cb5-d9eaf0794977 -->

**[P2] Add a "Why Now?" page for the fact snippets + the larger case**
- "I think another Page of Why Now? would be good where the fact snippets could live and you could make a larger case for the
site."
- STATUS: Review
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 9031f1ce-e4f3-44c7-89c7-3bbb664be988 -->

### Home Page

**[P1] Strengthen homepage headline + CTA; de-clutter the hero**
- "I think Hold Congress to its record. is good for the website SEO, but it does not give me a sense of what this site is for. I
think a stronger, clearer CTA that folds in what the site does would be stronger."
- "While the 2 fact snippets are interesting, they clutter the visual and make the next action less clear."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: b4cc1c9e-b7c2-4442-ae5c-1a25af5272d3 -->

**[P2] Simplify the Registered Address entry box**
- "There is a lot happening in the Your Registered Address box, from title, to text box, to button, to text above and below, as
well as a popup if the question mark is clicked. I think I would only keep pull my reps button, the text box, and Enter Your
Registered Address."
- "Underneath that entry box, I would add Unsure? Read about how it work and how we use your data followed by 01 Enter your
address in addition to the text that was in the popup, then followed by steps 2 and 3."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 1850349c-0bcd-46d0-8b76-970d964389ba -->

### Issues / Lock-in

**[P2] Make the "Lock These In" box bigger / more prominent**
- "I think the Lock Theses In box could be bigger."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 4b7e5a66-4013-4274-ac67-183ba240b92a -->

**[P2] Show jurisdiction context on the issues page, not as a separate results block**
- "I do not think that the Your seat at the national table is necessary, or at least not in its current form. I think adding this
to the issues page previously would be clearer. I.e. These are your issues 1 (decided on state level), 2 (decided on federal
level), etc."
- NOTE: overlaps the Fed/State issue-label work — reconcile at grooming.
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 9143a622-82fc-4ab1-8a19-90823453856a -->

### Results flow

**[P1] Add a guided orientation screen before rep review begins**
- "I would start with a page before this saying: Next, you will be shown your three representatives, where they stand on the
issues you care about, how they are funded and influenced. You can also find alternative candidates running for the seat. At the
bottom of the page, you will be asked to replace or keep the current representative. You will do this for all representatives and
can then print out your scorecard. Let's move to the first candidate."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 0b9d40c9-82ca-40e5-bf82-9a23bb4769f5 -->

**[P1] Reduce panel clutter in results — one visible panel, simpler progress**
- "The Your Issues and the Rep/Senator sections are both on the left and right. I think at most one should be visible, preferably
on the right. Additionally, the progress bar is not necessary if you keep the current set up of Reviewing Now, Not Yet Reviewed,
and Reviewed on the right."
- "Remove see where you stand until it's ready, there is so much here already."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 335829af-98e9-454e-a014-42f41eb95c7d -->

**[P1] Make "Print My Scorecard" discoverable after the last rep**
- "After you finish the third representative, it is not clear what to do next. You can miss easily miss the print my score card
button."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 1f77c3eb-909d-4ff2-95a6-180e89603da7 -->

**[P2] Distinguish + de-emphasize non-2026 representatives**
- "I am also not sure if it is worth adding the non-2026 representatives to the list. I would have a grey background instead of
white and state earlier that they are not up for election. I would also not include them in the score card."
- STATUS: Review
- DEPENDS ON: Claude Design session — results-flow clarity, visual hierarchy & color system (user test 2026-06-16)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 97eda1e0-9894-405e-8284-de18b546d43b -->

### Scorecard

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
- STATUS: Backlog
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
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
- GROOMED (2026-07-01): AUTO may BUILD (migration + ingest code) + open a PR, but must NOT apply the migration or run the ingest against prod unattended — the prod write + Stock Watcher fetch is a human step. GOAL_CONDITION: `member_stock_transactions` migration + ingest script exist + tsc/tests green (no prod mutation).
- STATUS: Backlog
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
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
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
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
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 05b995c8-2ca9-418a-b872-3cbeb17d0b3f -->

**[P1] Header and Footer are redundant**
- Privacy should be at the top after About
- Tip jar on far upper right corner
- Add Support to the top as well
- Footer - remove links, keep the voter choice and © 2025 Grey Bird LLC. All Rights Reserved.
- STATUS: Review
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
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

**[P0] Edit Issues missing in Tablet Mode**
- In both mobile and tablet screens, I cannot find the ‘left panel’ anywhere -no ability to edit my issues
- STATUS: Review
<!-- card-id: ef8d602c-223a-4188-828c-ed8126e404ab -->

**[P0] Retrospective whole-app security audit**
- NOT `/security-review` — that command (and `/review`) only scans the current branch's pending diff, which the orchestrator already runs per-PR. This is the retrospective we never did after shipping a lot: step back, threat-model the whole app, poke holes, reinforce.
- Surfaces to cover: Anthropic API key exposure/usage (ties to "[P1] API usage hits limits") · chat/Haiku endpoints (rate-limit, input validation, prompt-injection, cost-abuse) · secrets in CI/deploy.yml (DATABASE_URL via Bitwarden → GITHUB_ENV) · address/geocode + DB query paths (PII, injection) · session + durable rate-limiter · public API routes (/api/counters, /api/delegation).
- AGENT-FIRST (reclassified 2026-07-01): an agent RUNS the whole threat-model pass unattended and opens a PR carrying a findings report + drafted follow-up cards. Your only step = review that PR and triage the follow-ups — a PR review at the end, NOT a mid-run stall.
- GOAL_CONDITION: a findings report doc (e.g. `docs/security/audit-2026-07.md`) exists covering every listed surface, each finding rated + paired with a proposed follow-up card; tsc/tests unaffected (analysis only — no app-code fix, no prod access).
- DECISION (updated 2026-07-01): AUTO MAY run the analysis pass + open the report PR; it must NOT fix-as-you-find and must NOT access prod. The per-PR /security-review stays as-is in the orchestrator.
- DECISION (2026-07-01): deliverable = findings REPORT + one triaged follow-up card per real issue; do NOT fix-as-you-find (keeps the orchestrator light, fixes reviewed individually). METHOD (attended single-pass vs multi-agent fan-out) is NOT pre-decided — Step 1 is to scope/triage the attack surface, and that breadth decides the method.
- STATUS: Backlog
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 850b1220-9de9-4aee-814f-470b8096f164 -->

**[P1] EPIC: Go-live launch gate (do these ONLY when flipping to public)**
- Umbrella — NOT in-scope work until we're ready to launch. Rolls up the final "flip to public" toggles so they don't get mistaken for normal work. Each member points a dependency at this card, so the AUTO lane never picks them early. Closes at go-live when all members are done.
- Members: Lower CHAT_DAILY_SESSION_LIMIT 100→10 · Reset Polis count to 0 · Translations to major languages.

CLARIFICATION (Muxin, 2026-07-12): good question - so we do not go live until I feel good abou tit. Which requires UX finalized, Polis being reset, language tnranslations, but possibly other things as well - is support easy to find? Do I have a CTA to work with me - inbound clients? Have I done more UX testing with beta users? Do I have my landing page? that's outside of this repo's concern but it's my conrern for going live right now.
- STATUS: Backlog
<!-- card-id: 0054bb72-cb87-46a6-987d-9cebaeb3e0eb -->

**[P1] Establish a launch-flag convention for pre-launch features**
- Make the ad-hoc env-flag pattern coherent so unfinished features can ship to prod but stay DARK to live users until a coordinated go-live flip (like a real product launch).
- Today it's ad-hoc — `NEXT_PUBLIC_BALLOT_ENABLED`, `CAN2026_DISPLAY_ENABLED`, `VOTER_ISSUE_EVENTS_ENABLED`, budget flags — with no single convention or inventory.
- TASK: (1) define a `LAUNCH_*` (or similar) flag convention, default OFF in prod; (2) inventory every not-yet-launched surface and give each a flag; (3) document the flip-list; (4) tie the flips into the "[P1] EPIC: Go-live launch gate" so go-live is one coordinated step.
- Pairs with the test-env card (test OFF prod) and the Go-live launch gate EPIC (the checklist); this is the on-prod "keep it dark" layer.
- AGENT-FIRST (reclassified 2026-07-01): an agent RUNS the codebase inventory + defines the `LAUNCH_*` convention (default-OFF) + drafts the flip-list in a PR, flagging each surface it's unsure is "pre-launch". Your step = confirm/prune the pre-launch set in that PR review — NOT a mid-run stall.
- GOAL_CONDITION: a PR adds a single `LAUNCH_*` flag helper/module (default-OFF in prod) + a documented flip-list enumerating every candidate not-yet-launched surface (each marked confirmed/uncertain), wired to the Go-live gate EPIC; tsc/tests green; no flag flipped ON.
- STATUS: Backlog
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: a09a77c8-b3b7-4315-a1b3-dbc03a881cff -->

**[P0] Reset Polis count to 0 before launch**
CLARIFICATION (Muxin, 2026-07-12): No idea, I rely on you to figure this out - all this means is, I've been doing tests on the app so it's counting my tests as actual voter info, but Polis should count real user's real issues and values. So the counter reset just makes sure my dirty test data doesn't muck up the Polis data.
- STATUS: To Do
- DEPENDS ON: [P1] EPIC: Go-live launch gate (do these ONLY when flipping to public)
- DECISION: defer — do NOT execute. Pin the exact reset mechanism (store/keys/script) read-only and surface a one-command action for launch. No prod mutation overnight.
- GROOMED: Ready/deferred: identify dirty-test Polis storage and prepare a reviewed one-command launch reset; no prod mutation overnight — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
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
- DEPENDS ON: [P1] EPIC: Go-live launch gate (do these ONLY when flipping to public)
- DECISION: defer — out-of-band Vercel env change; surface the `vercel env rm CHAT_DAILY_SESSION_LIMIT production` + redeploy commands for Muxin to run at launch.
- GROOMED: Ready: launch-time env removal, redeploy, and verification are explicit; attended/deferred, no overnight execution — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 28bf87ec-8587-4d1f-acc7-ab5ff7467cf4 -->

**[P1] Translations to major languages**
- Flagged 2026-06-12 (pre-launch) — Muxin. DRAFT card; confirm the language set + wording.
- The app currently ships English + Spanish. Before public launch, add translations to major languages. The i18n plumbing already exists: `src/lib/translations.ts` (UI strings, en/es) and the en/es system-prompt variants (`ballotPromptEn.generated.ts` / `ballotPromptEs.generated.ts`, synced via `npm run sync:ballot-prompt`).
- **Language set (TBD — confirm):** a defensible starting point is the federally-relevant ballot languages under Voting Rights Act §203 — Spanish (done), plus Chinese, Vietnamese, Korean, Tagalog, and the Native American / Alaska Native language groups where covered jurisdictions require them. Choose the set deliberately rather than "all major world languages." (Suggested by Claude — confirm.)
- **Sequencing note:** Translation work depends on the final Phase 1 UX/UI — don't translate strings that are still changing. Blocks on the "[P1] Phase 1 UX/UI finalized (redesign complete)" milestone above (this carries forward the old "no translations until the UX is ironed out" instruction from the retired ES-locale card).
- GO-LIVE GATE (2026-06-30): also a member of "[P1] EPIC: Go-live launch gate" — do NOT translate until launch prep. (Machine dep stays on Phase-1-UX since a card carries only one; the EPIC link is organizational.)

CLARIFICATION (Muxin, 2026-07-12): I think I briefly mentioned this in the app: we want to be able to support any language that is spoken in the United States. Although I don't think the right decision here is for us to create our own personally translated language for the entire app, I think it's more like we need to know where we go expose content to users and what content even needs to be translated. To make sure that if I just switch it to another language, it automatically translates across all those different pages and all those different user interfaces, that's the goal.
- STATUS: Backlog
- DEPENDS ON: Phase 1 UX/UI finalized (redesign complete)
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: 2b325135-bafc-454f-b253-5bce21e05a13 -->

**[P1] EPIC: Phase 1 UX/UI finalized (redesign complete)**
- Flagged 2026-06-12 — Muxin. Milestone/umbrella card; rename or fold into your redesign tracking if you keep it elsewhere.
- The phasing model says Phase 1 is "largely built; needs prod-hardening + redesign UX." This card represents that redesign / UX-and-UI finalization as a single gate, so downstream work that can't start until the surface is stable has something concrete to block on.
- Added new Polis UI changes 6/15
- Not a code task in itself — it closes when the Phase 1 redesign UX/UI is locked.

CLARIFICATION (Muxin, 2026-07-12): I'm currently working through this. We did a lot of big Keystone redesign, and I'm in the phase of debugging right now, but after it's actually done and I'm happy with it, then I would consider this closed.
- STATUS: To Do
- DEPENDS ON: [P1] EPIC: Implement the Keystone redesign (port design_handoff) — BACKEND-GATED
- GROOMED: Ready as attended milestone: close only after Keystone debugging is complete and Muxin is satisfied with UX/UI — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
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

CLARIFICATION (Muxin, 2026-07-12): Yeah, alignment overall is really tricky. What it really means is we try to evaluate how somebody voted on an issue and decide from there: did they vote in your favor or not? That's what alignment means.

I honestly don't even know what work is still in this category. If we have anything in our backlog that's still looking at this, I have not personally checked to see how accurate our current alignment strategy or setup is and how good it is at trying to figure out if somebody actually voted in your favor or not. I don't exactly know how to even test for this right now.

I think it's gonna be a lot of vibe checks, honestly, but also doing whatever we can to make sure that we have good data and that we're interpreting that data correctly and that we're surfacing that data correctly whenever somebody gives us an issue. Again, it'd be completely up to you to tell me how to best do this.
- STATUS: Backlog
- DECISION: defer — umbrella tracker, not a code task; surface, do not build.
<!-- card-id: f474c4b8-e8c0-4129-9a67-4705a1370efe -->

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

**[P1] #151 usage metrics miss the research sub-agent (the likely spike source)**
- Found 2026-06-30 reviewing held PR #151 (anon chat usage metrics). `recordChatUsage` only fires in the main chat SSE stream (`callKind:"chat"`, `src/app/api/chat/route.ts:1394`). The research sub-agent (`research-sub-agent.ts:161`) makes its OWN Haiku + web_search call and records only to the budget, never to `chat_usage_metrics` — so `call_kind:"research"` is never written and the most likely budget-spike driver is INVISIBLE in the table. As-is the metrics only partially answer "where is the Haiku spend going."
- Fix: also record the research sub-agent's model + token + web-search cost with `call_kind:"research"`. Do BEFORE relying on #151 to diagnose the budget.

CLARIFICATION (Muxin, 2026-07-12): I was mostly worried about whether or not my API usage was being exceeded and where exactly, so I don't actually know if we already have this. Did we already build everything out for figuring out and triaging:
- Where is usage happening?
- Where is my API spend happening across the app?
- Which interface, which specific service, which specific feature is using the API?
- How much, when?
so I can triage what happens if I see a big spike in usage? That's what the point of it is. I don't exactly know how to set it up, though.
- STATUS: Backlog
<!-- card-id: 69d3e007-48b8-4ca0-ad65-b652fbb2aea4 -->

**[P2] #175 pole-disambiguation questions don't count against the question cap**
- Found 2026-06-30 reviewing held PR #175 (in-chat pole disambiguation). The shared question-cap counter (`IssueConversation.tsx:159-165`) only increments when the model reply has NO theme fence (`askedAQuestion = !themes && /\?\s*$/`), but the refinement prompt ALWAYS returns the full theme array. So a turn that asks a pole question leaves `themes` non-null → the counter never increments → `atCap` never trips → the pole-disambiguation block is never suppressed. The advertised "count against budget / lock in at cap" hard-stop likely never engages — risking the exact "6+ annoying turns" failure the cap was built to prevent (only the soft one-per-turn / never-re-ask guard remains).
- Fix: make pole-disambiguation questions increment the cap counter. Prereq for shipping #175 safely.
- GROOMED (2026-07-01): CONFIRMED live bug — the `!themes` gate at `IssueConversation.tsx:158-165` means the cap counter never increments; this ALSO breaks the existing novel-concept disambiguation cap in shipped code. Ship as a STANDALONE PR against `IssueConversation.tsx` (NOT folded into #175, whose diff doesn't touch that file). This fix UNBLOCKS held PR #175. Auto-eligible.
- STATUS: Backlog
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 5d124201-b1ef-4065-a0a2-88d2004155a9 -->

**[P2] #146 empty k-means cluster silently suppresses all consensus statements**
- Found 2026-06-30 reviewing held PR #146 (polis clustering). `findConsensusStatements` (`src/lib/polis/clustering.ts:342-345`) treats an empty cluster (size 0) as a hard consensus failure (`allClear=false; break`), so with `DEFAULT_K=3` any empty cluster silently suppresses ALL consensus statements — the report's headline feature. Inconsistent with `detectDividedState` (`clustering.ts:412`) which correctly filters `c.size > 0`. Inert today (surface unwired); fix BEFORE wiring the Polis report surface. (Also `reportAssembly.ts:194` emits size-0 phantom clusters.)
- STATUS: To Do
- GROOMED: Ready: empty-cluster consensus and phantom-cluster behavior are pinpointed and regression-testable — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 174c8798-b17b-4d40-b17f-a317810ab423 -->

**[P0] Fix #171 polling-place note crash — `t(...) is not a function`**
- Found 2026-06-30 reviewing held PR #171. PR #171 added `polling.addressNotPublished` to `src/lib/translations.ts`, but the prototype renders from a SEPARATE inline `TRANSLATIONS` object in `VoterChoiceApp.tsx` whose `t()` reads that object, not `src/lib/translations.ts`. So `t('polling.addressNotPublished')` returned the literal path string, and the call site `t('polling.addressNotPublished')(days)` invoked a string as a function → `TypeError: t(...) is not a function`, crashing the polling panel whenever it's expanded with an empty address (real users, not dev-only).
- ✅ FIXED 2026-06-30 in the PR #171 branch (commit `0a42a7f`): added `addressNotPublished` as a `(days) => string` to the inline `TRANSLATIONS.polling` EN + ES blocks. tsc + lint clean, 2370 tests green. Rides with PR #171 — close when #171 merges.
- STATUS: Review
<!-- card-id: 4ebc2b68-8741-4def-8198-51de2cabb9c1 -->

**[P1] Fix #168 Spanish `{temas}` placeholder leak on the themes card**
- Found 2026-06-30 reviewing held PR #168. The Spanish themes card rendered the literal token: "Aquí hay 2 {temas} para empezar…". The ES `intake.starterAck` template used `{temas}` but `IssueConversation.tsx` substitutes the English token `{themes}`, so the ES token was never replaced.
- ✅ FIXED 2026-06-30 in the PR #168 branch (commit `cd4d63f`): changed the ES template token `{temas}` → `{themes}` so the existing `.replace("{themes}", themeWord)` substitutes it (themeWord = ES "temas"/"tema"). Now renders "Aquí hay 2 temas para empezar…". tsc + lint clean, 2370 tests green. Rides with PR #168 — close when #168 merges.
- STATUS: Review
<!-- card-id: da52c9b3-9c45-43d0-b619-464bdcd29506 -->

**[P2] Budget modal: link to the Anthropic Console for BYOK key creation**
- Surfaced 2026-06-30 reviewing PR #170 (budget-exhausted modal). The "Have an Anthropic API key? Use it directly in Voter Choice" section asks users to paste a key but doesn't link where to get one. Add a link to where users create a key — https://console.anthropic.com/settings/keys (label e.g. "Get a key →") — keeping the existing "free to create, you only pay for what you use" framing.
- GROOMED (2026-07-01): READY — add the link to BOTH BYOK sections (live `redesign/ByokCard.tsx` + legacy `VoterChoiceApp.tsx`). NOTE: the exact "free to create, you only pay for what you use" wording doesn't exist in code today; just add the link near the current sub-copy. Auto-eligible.
- STATUS: Backlog
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: a4a5215e-c5bd-4b52-89af-0b4d2e862873 -->

**[P1] Bill-summary generation pipeline - subscription subagents, batched, ongoing**
- Generate `bills.plain_summary` (plain-language <=2-sentence summaries) so the vote card shows a real summary. The WIRING + a seed script (`scripts/ingest/summarize-bills.ts`, metered-API version) shipped in #136; THIS card is the generation RUN + ongoing pipeline.
- Mechanism (Muxin): run via Claude Code SUBSCRIPTION + subagents in BATCHES (zero metered-API cost; same approach as bill-tagging), NOT the metered API. Prioritize vote-referenced bills first, then the rest of the corpus.
- PIPELINE, not a one-off: make it repeatable / auto-run for newly-ingested bills so new vote-bills get summaries automatically.
- IMPORTANT - the per-vote DISPLAYED summary must combine BOTH pieces to be USEFUL: (1) what the bill is about (this card) AND (2) how/why the rep voted = the synthesized rationale (f9cc6279). They're composed in the Unified vote explainer (8ea00aad). The same subscription-subagent batched-pipeline approach applies to f9cc6279's rationale generation.
- Style: plain language, active voice, <=2 sentences, no title repetition, no trailing ellipsis, self-contained (rendering shows it in full or shows nothing).
- NOTE (automation only): the auto-run/ongoing piece reuses the /schedule cloud-cron-runs-subscription-with-DB pattern proven by the tagging-cron card (formal dep below). The one-time generation RUN does NOT block on this — run it via subscription subagents anytime.
- STATUS: Backlog
- DEPENDS ON: [P0] Replace the Sunday bill-tagging cron with a /schedule cloud cron (off the front-end API key)
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: cf55573b-7d28-467e-b15b-3e07a0f5202f -->

**Unified vote explainer - bill summary + how they voted + why**
- One block in the vote detail combining: (1) what the bill was about - plain-language summary (bills.plain_summary, from #136); (2) how the member voted - roll-call; (3) why - the synthesized stated rationale (from f9cc6279), clearly labeled + source-linked.
- Degrade gracefully: when no rationale exists for a vote (common - members explain contested/messaging votes, rarely party-line/procedural ones), show 'no stated reason found' - never imply silence = no position (show-thin-records principle).
- DEPENDS ON both the bill-summary work and the rationale layer (f9cc6279). The rationale layer is DONE (PR #145); the open upstream is the bill-summary RUN — formal dep below.
- RESCOPED (2026-07-01, Muxin): the 3-part composition (bill summary + WITH/AGAINST roll-call badge + labeled memberRationale with source links) is ALREADY LIVE in `ContributingVoteCard` (`VoterChoiceApp.tsx` ~1310-1390). ONLY remaining piece = render an explicit "no stated reason found" element when a vote has no rationale (today the block is silently omitted). Reduce this card to that small UI addition. The bill-summary DEPENDS ON only affects the "what the bill was about" line for un-summarized bills — soft, non-blocking.
- STATUS: Backlog
- DEPENDS ON: Bill-summary generation pipeline - subscription subagents, batched, ongoing
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
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
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
<!-- card-id: c44193cf-134d-4685-8e98-159ab411cbd7 -->

**[P3] De-dup inline address steps vs the existing three-step walkthrough**
- Surfaced by PR #157 (simplify address box).
- The new inline 01/02/03 steps under the address box overlap in intent with the existing full-width HowItWorksWalkthrough ("From address to printed ballot in three steps") that also renders below the hero.
- DEFERRED to P3 (2026-06-30): re-evaluate AFTER the redesign lands — the inline steps + walkthrough may both change, so this de-dup may resolve itself. Parked in Backlog until then.

CLARIFICATION (Muxin, 2026-07-12): I don't really know what that means. Is there anything that's needed to hear?
- STATUS: To Do
- DEPENDS ON: [P2] Simplify the Registered Address entry box
- GROOMED: Ready/resolved: redesigned HomeView no longer renders the standalone walkthrough; verify and close with no product change — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 8807920f-0f26-4430-878e-6c012f03835b -->

**[P2] Spanish/i18n for new redesign copy (Why Now? page, orientation screen)**
- Surfaced by PRs #155 (Why Now? page) and #160 (orientation screen).
- New page/screen body copy is English-only; nav labels were translated (en+es) but page bodies were not, matching existing static pages.
- Add ES (and other supported locales) when the redesign adopts t() keys for body copy.
- STATUS: Backlog
- DECISION: stage — UX batch: include a before/after HTML comparison covering the changed state(s); do not merge or deploy this card independently. Muxin approves the combined UX batch before any merge.
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 694cfc22-9c20-47e9-b559-4667b9923bf7 -->

**[P2] CSS housekeeping: prune orphaned .addr-why-* and unused .lvl-tag rules**
- Surfaced by PRs #157 (address box) and #159 (jurisdiction inline).
- The (?) popup classes (.addr-why-btn/.addr-why-modal/.addr-why-close, .addr-card label .privacy) and the removed jurisdiction-chip .lvl-tag rules are now unused. Left in place to stay surgical; prune in a cleanup pass.
- STATUS: Backlog
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 1ec90ed1-9222-4e81-a15e-2460767f0581 -->

**[P2] Add Playwright visual snapshots to key redesign surfaces**
- Catch unintended visual regressions automatically so manual review can focus only on intended design changes.
- Add `toHaveScreenshot()` baselines for the delegation workspace, rep card, scorecard, and home hero; gate by extending the existing e2e job in `.github/workflows/test.yml`.
- Caveat: visual snapshots are maintenance-heavy and flaky across CI environments — keep scope tight. Lower value than the golden-address data smoke test above; sequence it after that by priority, not as a hard dependency.
- GROOMED (2026-07-01): parked in Backlog — attended by nature (first-generated baselines need a human to eyeball) and the e2e job is a REQUIRED status check, so flaky visual specs would deadlock PRs (add as a NON-required leg; generate baselines in the Ubuntu CI runner). Honors the card's own "after the golden-address smoke" ordering (that card is Backlog, blocked on the test-env).
 - STATUS: To Do
 - DECISION: stage — Build a review-only before/after HTML/contact-sheet harness. Visual differences inform human batch review only; do not make broad pixel diffs a merge blocker.
- STATUS: To Do
- GROOMED: Ready attended: four screenshot surfaces and non-required Ubuntu CI leg are specified; human baseline review remains required — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: d1d54852-fcda-40d1-9487-f0910383a8a2 -->

**[P0] Golden-address alignment smoke test (Cornyn / healthcare_affordability) — defense-in-depth on the drift guard**
- The defense-in-depth layer Muxin sequenced AFTER the deploy-time drift check (DECISION 2026-06-28: "layer the golden-address smoke on top once the drift check lands"). The drift check shipped in PR #179.
- Assert that a known real address/candidate returns NON-EMPTY alignment so a silent data-blank is caught even when the schema is technically present. Anchor: John Cornyn (TX Senator) + healthcare_affordability — lookupAlignment() should return { found: true, total >= 1, contributingVotes.length > 0 } (~18 healthcare votes observed at incident time). resolveCandidateId() already handles "Cornyn."
- WHERE it runs — RESOLVED 2026-06-30: run against the **Neon test branch** in the new test-env (the "seeded test DB" option; that's why this card DEPENDS ON the test-env card). The heavier alternative (post-deploy prod smoke) is set aside. The drift check (PR #179) already covers the "prod behind a migration" class; this catches "schema present but data empty."
- NEW infra, not a quick add.
- STATUS: To Do
- DEPENDS ON: We need a deployment/test environment/server/branch?
- GROOMED: Ready but blocked: seeded-Neon Cornyn healthcare assertion is explicit; waits on test environment — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 2baacd7e-901d-4407-8dcb-26ce56ed9fbc -->

**[P2] Harden check-schema-drift parser: strip SQL comments before splitting on `;`**
- - `scripts/ops/check-schema-drift.ts` `splitStatements()` splits each migration on `;` BEFORE `stripSqlComments()` runs, so a semicolon inside a `-- comment` fragments the statement. This split `0012_add_polis_response_vectors.sql`'s `CREATE TABLE` at a comment's `;`, tripped the unparsed-DDL guard, and would fail the deploy-time drift check. Worked around in PR #146 by removing the semicolons from the migration's comment prose.
- Fix: in `splitStatements`, strip comments FIRST, then split on `--> statement-breakpoint` and `;` (reorder the pipeline). Add a regression test: a migration whose `CREATE TABLE` body comment contains a `;` must parse to a complete statement.
- Why it matters: a mis-parsed `CREATE TABLE` leaves that object out of the expected schema, so the drift guard FAILS OPEN on it — the exact prod-behind failure the guard exists to catch.
- STATUS: To Do
- GROOMED: Ready: parser reorder and semicolon-in-comment regression test define a concrete proof — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: a06b360f-5017-45fc-b6c8-5ca67126b72d -->

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

CLARIFICATION (Muxin, 2026-07-12): I'm not sure which phase three cards are mislabeled. Is that what this gating setup claims? Anyway, between all of these, this is just a way to make sure that the orchestrator doesn't accidentally start working on something that's not on the current roadmap. I want it to only focus on phase one cards, which is why there's this gait where we don't even want to touch phase two cards unless phase one is done. I think I also have to give it approval because I'm not ready to start working on anything in phase two, Even if phase one is done, I think I need some validation and market feedback to tell me whether or not this project is even worth additional investment into phase two, if that makes sense.
- STATUS: To Do
- GROOMED: Ready attended: gate current Phase 2/3 sections; Phase 2 opens only after validation and explicit Muxin approval — 2026-07-12
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 6970765b-bce5-4850-94a5-f0e7e662f77e -->

**[GATE] Phase 1 complete → open Phase 2**
- Milestone GATE — NOT a buildable task; keep in Backlog. Stays here until Phase 1 is shippable and you decide to open Phase 2.
- Marking this Done unblocks every Phase 2 card that DEPENDS ON it (and, once the auto-promote loop ships, lets them flow Backlog→To Do). Keep the title EXACT/stable — DEPENDS ON matches on it.

CLARIFICATION (Muxin, 2026-07-12): I'm not sure which phase three cards are mislabeled. Is that what this gating setup claims? Anyway, between all of these, this is just a way to make sure that the orchestrator doesn't accidentally start working on something that's not on the current roadmap. I want it to only focus on phase one cards, which is why there's this gait where we don't even want to touch phase two cards unless phase one is done. I think I also have to give it approval because I'm not ready to start working on anything in phase two, Even if phase one is done, I think I need some validation and market feedback to tell me whether or not this project is even worth additional investment into phase two, if that makes sense.
- STATUS: Backlog
<!-- card-id: b5ecb804-6403-4c95-b7e0-4c7e8e99b3c9 -->

**[GATE] Phase 2 complete → open Phase 3**
- Milestone GATE — same idea, one phase up. NOT a buildable task; keep in Backlog until you open Phase 3.
- Marking this Done unblocks every Phase 3 card that DEPENDS ON it. Keep the title EXACT/stable.

CLARIFICATION (Muxin, 2026-07-12): I'm not sure which phase three cards are mislabeled. Is that what this gating setup claims? Anyway, between all of these, this is just a way to make sure that the orchestrator doesn't accidentally start working on something that's not on the current roadmap. I want it to only focus on phase one cards, which is why there's this gait where we don't even want to touch phase two cards unless phase one is done. I think I also have to give it approval because I'm not ready to start working on anything in phase two, Even if phase one is done, I think I need some validation and market feedback to tell me whether or not this project is even worth additional investment into phase two, if that makes sense.
- STATUS: Backlog
- DEPENDS ON: [GATE] Phase 1 complete → open Phase 2
<!-- card-id: 726d732a-9c49-4e1f-9473-0266ba78994b -->

**[P1] CI-gate hardening: design-gate spec-sync + component-minimization — PAUSED mid-implementation**
- Follow-up from PR #289 (issue-consistency gate + duplication ratchet). Investigating why 3 same-day PRs (#285, #286, #287) failed Design Parity CI on 2026-07-12 found the failures were the gate's own stale expectations, not real regressions (10a's e2e journey drifted from a duplicated inline copy; 05b flagged a data-dependent party-color class as missing structural vocabulary; 11a's marker probe asserted a ruling Round-4 reversed). Also addressed: component-level duplication (jscpd) only catches literal clones, not two independently-built components serving the same UI function — the exact thing that caused 11a's field-scale logic existing in both RepCard and HeadToHead.
- STATUS AT PAUSE (2026-07-12, branch `claude/visual-ci-gate-strategy-217oxv`, PR #289): (A) parity-gate expectation fixes for 05b/10a/11a — DONE, committed (`f093d99`), verified against the actual #285/#286/#287 branches via disposable worktree merges (all 3 go green). (B) jscpd scope widened to include e2e/helpers + scripts/design, new component-inventory.md + blocking inventory-gate script + advisory AI overlap-review workflow — code complete, unit-tested, committed as WIP (`9536bd5`), NOT yet verified end-to-end via e2e (build/e2e run was interrupted by the pause) and the advisory AI workflow has never been smoke-tested against a real ANTHROPIC_API_KEY secret. (C) reconciling with the parallel PR #284 (`fix/issue-alignment-rows`, different fix for the same "issues drop off surfaces" bug family) — not started.
- RESUME FROM: full engineering detail (files touched, exact verification done/not-done, next steps) is in the session's plan file (`so-are-we-checking-indexed-willow.md`) — ask to have that context re-loaded, or read the PR #289 diff + its description once updated. Immediate next steps: re-run e2e (`redesign-core`, `redesign-issue-consistency`, `redesign-record`, `redesign-issues` specs) against the refactored `e2e/helpers/redesign-mocks.ts`; smoke-test or drop `component-review.yml`; do the #284/#289 reconciliation; update PR #289's description.
- STATUS: Backlog
- DECISION: stage — Propose/build a risk-based UI gate: hard-fail only deterministic critical-flow, semantic, and accessibility regressions; produce HTML/contact-sheet diffs for human review; measure false positives and do not block intended design changes on pixel baselines.
- PARKED: P0 nationwide roster priority lock; prior_status=To Do; restore after epic closeout
<!-- card-id: 4a714dcb-b50e-4177-9a4f-0ca78ebc5fe9 -->

**[P0] MANUAL SANITY-TEST GATE — app-vs-official-source accuracy check before roster fan-out/cutover**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Muxin, 2026-07-14 — hard checkpoint requested before the nationwide roster data is trusted or shown to real users.
- TYPE: ATTENDED MANUAL GATE — this is NOT a code card. The conductor must STOP here and surface it to Muxin; it never auto-runs, never auto-merges, and is never self-vetted as complete.
- WHEN IT FIRES: Before A25 (pilot UI flow behind the flag) merges, and before ANY national fan-out (N21+) or production cutover (C29). A25 and every fan-out/cutover card MUST be created with `DEPENDS ON` this gate.
- WHAT TO TEST: Run the REAL app (preview/staging build) for 2–3 golden public addresses across at least TX, AL, and CA. For each resolved upcoming contest, compare the candidates the app displays against an INDEPENDENT reliable source — the state Secretary of State / election-authority official candidate list, plus a Ballotpedia spot-check. Confirm, per contest: no missing qualified candidate, no extra/withdrawn/defeated/filing-only candidate shown, correct ballot name / party / office / district / election stage, and an honest "roster not yet published/certified" state where the authority has not certified. Alabama is the high-volume stress case (do not hardcode a candidate count); Texas Senate is the standing regression.
- PASS CONDITION: Muxin confirms the app's displayed roster matches the official source for every tested contest (or the app honestly shows the not-yet-published state). Only then may fan-out/cutout cards proceed.
- FAIL HANDLING: File exact correction cards; do not advance to fan-out/cutover until re-tested clean.
- NOTE: This is the earlier, informal instance of what the plan later formalizes as Q27 (national Ballotpedia sample QA). Keep it — it gates the FIRST app-visible data, well before national QA.
- STATUS: Backlog
- DECISION: attended manual gate — do NOT auto-run or auto-merge; conductor stops and surfaces to Muxin for the app-vs-source comparison.
<!-- card-id: 041eddfa-9c44-4a02-8945-e7acb8052a14 -->

**[P0] I05 — National source inventory: AZ, AR, CO, CT, DE, FL, GA**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 3 (national source inventory) of the nationwide official-source congressional roster plan; created 2026-07-14 after F04 declared the contract fit-for-fan-out and the F05/F06/F07 corrections landed.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for AZ, AR, CO, CT, DE, FL, and GA; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01–F07 shared contract.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove AZ, AR, CO, CT, DE, FL, GA each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- SHIP: auto-pending-merge
- STATUS: In Progress
- DEPENDS ON: F07 — Official-source semantic combination invariants
- DECISION: authorized — external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only — no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: explicit seven-jurisdiction inventory scope, fail-closed safeguards, group-scoped verifier tests, and goal condition — 2026-07-14
- PARKED: cold-start: Step-3 zero-commit retry cap reached (2 relaunches produced no commits) - 2026-07-14
- LANE: roster-a
<!-- card-id: 96f404ab-3bba-4812-b020-85a40a17c2dc -->

**[P0] I07 — National source inventory: ME, MD, MA, MI, MN, MS, MO**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 3 (national source inventory) of the nationwide official-source congressional roster plan; created 2026-07-14 after F04 declared the contract fit-for-fan-out and the F05/F06/F07 corrections landed.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for ME, MD, MA, MI, MN, MS, and MO; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01–F07 shared contract.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove ME, MD, MA, MI, MN, MS, MO each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- SHIP: auto-pending-merge
- STATUS: In Progress
- DEPENDS ON: F07 — Official-source semantic combination invariants
- DECISION: authorized — external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only — no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: explicit seven-jurisdiction inventory scope, fail-closed safeguards, group-scoped verifier tests, and goal condition — 2026-07-14
- PARKED: hard context/turn ceiling exceeded (turns=120 tokens=156655) - session killed mid-card by the watchdog safety valve, never resumed - 2026-07-14
- LANE: roster-b
<!-- card-id: 10c84215-b264-4d23-a03c-84ed0f519142 -->

**[P0] I08 — National source inventory: MT, NE, NV, NH, NJ, NM, NY**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 3 (national source inventory) of the nationwide official-source congressional roster plan; created 2026-07-14 after F04 declared the contract fit-for-fan-out and the F05/F06/F07 corrections landed.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for MT, NE, NV, NH, NJ, NM, and NY; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01–F07 shared contract.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove MT, NE, NV, NH, NJ, NM, NY each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- SHIP: auto-pending-merge
- STATUS: In Progress
- DEPENDS ON: F07 — Official-source semantic combination invariants
- DECISION: authorized — external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only — no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: explicit seven-jurisdiction inventory scope, fail-closed safeguards, group-scoped verifier tests, and goal condition — 2026-07-14
- PARKED: hard context/turn ceiling exceeded (turns=83 tokens=232414) - session killed mid-card by the watchdog safety valve before Step 2 (create_worktree) completed, never resumed - 2026-07-14
- LANE: roster-a
<!-- card-id: 60ee4055-48c7-45cd-ae63-cad0f75c5394 -->

**[P0] I09 — National source inventory: NC, ND, OH, OK, OR, PA, RI**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 3 (national source inventory) of the nationwide official-source congressional roster plan; created 2026-07-14 after F04 declared the contract fit-for-fan-out and the F05/F06/F07 corrections landed.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for NC, ND, OH, OK, OR, PA, and RI; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01–F07 shared contract.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove NC, ND, OH, OK, OR, PA, RI each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- SHIP: auto-pending-merge
- STATUS: In Progress
- DEPENDS ON: F07 — Official-source semantic combination invariants
- DECISION: authorized — external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only — no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: explicit seven-jurisdiction inventory scope, fail-closed safeguards, group-scoped verifier tests, and goal condition — 2026-07-14
- PARKED: hard context/turn ceiling exceeded (turns=120 tokens=156655) - session killed mid-card by the watchdog safety valve, never resumed - 2026-07-14
- LANE: roster-a
<!-- card-id: 1c7e4a73-43ca-4f9b-bc7e-e6a7ee3f7d42 -->

**[P0] I10 — National source inventory: SC, SD, TN, UT, VT, VA, WA**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 3 (national source inventory) of the nationwide official-source congressional roster plan; created 2026-07-14 after F04 declared the contract fit-for-fan-out and the F05/F06/F07 corrections landed.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for SC, SD, TN, UT, VT, VA, and WA; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01–F07 shared contract.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove SC, SD, TN, UT, VT, VA, WA each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- SHIP: auto-pending-merge
- STATUS: To Do
- DEPENDS ON: F07 — Official-source semantic combination invariants
- DECISION: authorized — external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only — no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: explicit seven-jurisdiction inventory scope, fail-closed safeguards, group-scoped verifier tests, and goal condition — 2026-07-14
- LANE: roster-b
<!-- card-id: aa06eb1b-9ce0-4037-856d-fcc2431fd4a6 -->

**[P0] I11 — National source inventory: WV, WI, WY, AS, GU, MP, VI**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 3 (national source inventory) of the nationwide official-source congressional roster plan; created 2026-07-14 after F04 declared the contract fit-for-fan-out and the F05/F06/F07 corrections landed.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for WV, WI, WY, and the territorial delegate/resident-commissioner jurisdictions AS, GU, MP, and VI; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission. Do not silently omit any territorial delegate contest.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01–F07 shared contract; explicit handling for territorial delegate/resident-commissioner offices.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage; territorial delegate contests must not be dropped.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest (including territorial delegate seats) maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove WV, WI, WY, AS, GU, MP, VI each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- SHIP: auto-pending-merge
- STATUS: To Do
- DEPENDS ON: F07 — Official-source semantic combination invariants
- DECISION: authorized — external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only — no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: explicit seven-jurisdiction inventory scope (incl. territorial delegates), fail-closed safeguards, group-scoped verifier tests, and goal condition — 2026-07-14
- LANE: roster-a
<!-- card-id: 3a4eb627-7fec-403b-961b-1a24e5fbb29c -->

**[P0] I12 — National inventory consolidation and semantic gate**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 3 fan-in of the nationwide official-source congressional roster plan (docs/operations/nationwide-congressional-roster-plan.md, "I12 — National inventory consolidation and semantic gate"); pre-created 2026-07-14 to carry the unattended run from Wave 3 into Wave 4.
- PRECONDITION (fan-in): ALL of I05, I06, I07, I08, I09, I10, I11 must be Done before this card starts. The board parser honors only ONE DEPENDS ON per card (first-wins), so this card names I11 (last roster-a group) but its TRUE blocker is all seven I-groups. Confirm every I05–I11 is Done on the Step-0.5 readiness re-check before starting.
- OUTCOME: One consolidated national inventory proving all 56 jurisdictions are accounted for; every expected 2026 contest maps to an official-source path or evidenced explicit state; parser families and access constraints frozen; non-sensitive public golden addresses selected for later app testing; no placeholder/unknown adapter promoted.
- IN SCOPE: Fan-in of the seven I-group inventories into one validated national record; cross-group reconciliation against the F02 exact-contest oracle; freeze of parser-family classes and access constraints; selection of public golden addresses; EMIT the exact pilot and adapter cards (P16 Texas, P17 Alabama, P18 California, and one P19 card per still-unproven source/semantic class) as new Backlog cards — each born decided (stamp its DECISION from the plan's "Pre-authorized execution decisions" pilots clause: official-source reads only per the NON-NEGOTIABLE SOURCE DECISION, writes only to isolated staging, fail-closed) and pre-GROOMED so the run continues without a drip-feed approval.
- OUT OF SCOPE: Candidate ingestion, schema migration (M13), promotion engine (M14), staging provisioning (M15), the pilots themselves, production mutation, scheduled refreshes.
- SAFETY: Fail-closed if any I-group is incomplete or any jurisdiction lacks an official-source path/evidenced state — never consolidate a partial national inventory; no placeholder/unknown adapter card may be promoted; a filing list or calendar-only source can never be recorded as a qualified/certified roster.
- TESTS: A national consolidation verifier proves all 56 jurisdictions present, every F02 expected contest mapped, no unknown/placeholder adapter, and parser-family/access-constraint freeze internally consistent; it fails if any group is missing.
- GOAL_CONDITION: The national inventory verifier passes for all 56 jurisdictions with no silent omission and no placeholder adapter; the emitted pilot/adapter cards exist as Backlog cards; npm run check passes.
- SHIP: auto-pending-merge
- NOTE (2026-07-14): Left un-GROOMED deliberately — the I05–I11 fan-in is a single-dep parser limitation, so the conductor's Step-0.5 re-groom confirms all seven are Done before stamping GROOMED. This matches the plan's "after all seven are Done, create I12" intent while keeping the run unattended.
- STATUS: Backlog
- DEPENDS ON: I11 — National source inventory: WV, WI, WY, AS, GU, MP, VI
- DECISION: authorized — consolidation/verification over the already-saved I05–I11 evidence plus card emission only; any incidental re-fetch limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (no Ballotpedia, no access-control bypass). No candidate ingestion, migrations, or production mutation.
- LANE: roster-a
<!-- card-id: 98f2c3d4-ef46-4e72-85bc-02b2c4bec612 -->

**[P0] M13 — Canonical roster schema and migration (code only, no production)**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 4 of the nationwide official-source congressional roster plan (docs/operations/nationwide-congressional-roster-plan.md, "M13 — Canonical roster schema and migration"); pre-groomed 2026-07-14.
- OUTCOME: Migration code adding the exact-election, contest, identity, appearance, snapshot, promotion, and finance-link structures from the plan's canonical data model.
- IN SCOPE: Migration files and the corresponding schema types for the canonical roster model, plus unit-level schema tests. Migration code only.
- OUT OF SCOPE: Running the migration against any production or staging database; candidate ingestion; the promotion engine (M14); staging provisioning (M15); any production mutation.
- SAFETY: No migration is applied to a live database by this card; additive/non-destructive definitions only; no production data is read or written.
- TESTS: Schema/migration unit tests prove the new structures and their constraints compile and validate against fixtures.
- GOAL_CONDITION: The canonical schema and migration files exist with passing schema tests and no database application; npm run check passes.
- SHIP: auto-pending-merge
- STATUS: To Do
- DEPENDS ON: I12 — National inventory consolidation and semantic gate
- DECISION: authorized — writes migration files, schema types, and tests only; NO database connection, NO production/staging application, NO external service. Pure code; additive and reversible.
- GROOMED: ready: explicit code-only schema/migration scope, no-DB-application safeguard, and schema-test goal condition — 2026-07-14
- LANE: roster-a
<!-- card-id: 694e21ad-e864-44b1-a65b-dfc32f40a4e2 -->

**[P0] M14 — Private artifact abstraction and fail-closed promotion engine (TDD, fakes only)**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 4 of the nationwide official-source congressional roster plan (docs/operations/nationwide-congressional-roster-plan.md, "M14 — Private artifact abstraction and fail-closed promotion engine"); pre-groomed 2026-07-14.
- OUTCOME: A private-artifact storage abstraction and a fail-closed promotion engine proven, by TDD against fake Blob/database implementations, to retain the prior promoted snapshot in every failure case.
- IN SCOPE: The artifact-store interface plus a fake implementation; the promotion engine and its state machine; exhaustive failure-case tests (fetch failure, validation failure, partial/blocked coverage, calendar conflict) each proving the previously promoted snapshot is retained.
- OUT OF SCOPE: Real Blob/database wiring; staging/production resources (M15); scheduled ingestion; candidate ingestion; any production mutation.
- SAFETY: Every failure path is fail-closed — a failed acquisition/validation NEVER promotes and NEVER downgrades the last good snapshot; no real external service is contacted; all I/O goes through the fakes.
- TESTS: A TDD suite drives the engine entirely through fake Blob/database implementations; every enumerated failure case asserts prior-snapshot retention and no promotion.
- GOAL_CONDITION: The promotion engine passes its full fail-closed TDD suite against fakes with prior-snapshot retention proven for every failure case; npm run check passes.
- SHIP: auto-pending-merge
- STATUS: To Do
- DEPENDS ON: M13 — Canonical roster schema and migration
- DECISION: authorized — implementation and TDD against fake Blob/database only; NO real storage/database credentials, NO external service, NO production mutation. Pure code plus tests.
- GROOMED: ready: explicit fake-only TDD scope, fail-closed retention safeguard, and full-failure-case goal condition — 2026-07-14
- LANE: roster-a
<!-- card-id: 7e3b05a0-9c40-4eec-a3b0-67a4ab259411 -->

**[P0] M15 — Isolated staging wire-up and canary (consumes pre-provisioned secrets)**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 4 of the nationwide official-source congressional roster plan (docs/operations/nationwide-congressional-roster-plan.md, "M15 — Isolated staging resources" + "Pre-authorized execution decisions"); pre-groomed 2026-07-14 as an auto wire-up that consumes secrets Muxin provisions out of band.
- PRECONDITION (secrets): Muxin provisions the private Blob store and an isolated Neon staging branch OUT OF BAND and sets `ROSTER_STAGING_BLOB_TOKEN` and `ROSTER_STAGING_DATABASE_URL`. If EITHER secret is absent/empty, this card stops with an honest "staging not provisioned" state — it does NOT provision anything.
- OUTCOME: The roster artifact-store and promotion engine (M14) are wired to the pre-provisioned private Blob + isolated Neon staging branch, and a canary run proves connectivity and fail-closed behavior against staging only.
- IN SCOPE: Reading the two pre-set staging secrets; wiring M14's artifact-store/promotion abstraction to them; a canary that writes/reads a throwaway staging artifact and verifies fail-closed retention; applying M13's additive migration to the ISOLATED staging Neon branch only.
- OUT OF SCOPE: Provisioning or creating any cloud resource; writing/rotating secrets; ANY production database or Blob; pilots; live candidate data.
- SAFETY: Never provisions cloud resources and never writes secrets — it only consumes pre-set ones. Refuses to run against any URL that is not the isolated staging branch; production is never touched. Missing/empty secret → honest stop, never a guess or a provision.
- TESTS: Canary asserts staging connectivity via the two secrets, a round-trip artifact write/read against staging Blob, staging migration applied additively, and fail-closed retention on a simulated failure; no production endpoint is contacted.
- GOAL_CONDITION: Both staging secrets present → the canary proves staging wire-up + additive staging migration + fail-closed retention against staging only, and npm run check passes (Done). If EITHER secret is absent, the card does NOT complete and is NOT marked Done — it surfaces "staging not provisioned — set ROSTER_STAGING_BLOB_TOKEN + ROSTER_STAGING_DATABASE_URL" and holds for Muxin, so nothing downstream (pilots) runs without real staging.
- SHIP: auto-pending-merge
- STATUS: To Do
- DEPENDS ON: M14 — Private artifact abstraction and fail-closed promotion engine
- DECISION: authorized (pre-authorized per the plan's "Pre-authorized execution decisions", M15 clause) — CONSUMES pre-provisioned staging secrets and wires/canaries staging only; NEVER provisions cloud resources, NEVER writes secrets, NEVER touches production; missing secret → honest stop. Muxin sets `ROSTER_STAGING_BLOB_TOKEN` + `ROSTER_STAGING_DATABASE_URL` out of band.
- GROOMED: ready: consumes pre-set staging secrets, wires + canaries staging only, fail-closed on missing secret or any production reference — 2026-07-14
- LANE: roster-a
<!-- card-id: 93fb2bcb-4d2d-489e-9ef2-b13e6aad821c -->

**[P0] Resume I08 — National source inventory: MT, NE, NV, NH, NJ, NM, NY**
- - PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- - ORIGIN: Follow-up to parked card 60ee4055-48c7-45cd-ae63-cad0f75c5394 (I08), which was claimed on lane roster-a and then killed mid-card by the watchdog hard context/turn ceiling (turns=83 tokens=232414) before Step 2 (create_worktree) ever ran - no worktree exists to recover.
- - OUTCOME: Validator-clean, evidence-backed official-source inventory records for MT, NE, NV, NH, NJ, NM, and NY; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- - IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01-F07 shared contract.
- - OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- - SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- - TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- - GOAL_CONDITION: Focused tests prove MT, NE, NV, NH, NJ, NM, NY each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- - DECISION: authorized - external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only - no candidate ingestion, migrations, or production mutation.
- - GROOMED: ready: same scope as parked 60ee4055 (I08), refiled fresh after ceiling kill so it can be picked cleanly - 2026-07-14
- STATUS: To Do
- DEPENDS ON: F07 — Official-source semantic combination invariants
<!-- card-id: 19ce9e35-279a-497a-9fb0-caba9aa0237e -->

**[P0] Resume I07 — National source inventory: ME, MD, MA, MI, MN, MS, MO**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Follow-up to parked card 10c84215-b264-4d23-a03c-84ed0f519142 (I07), which was claimed on lane roster-b and then killed mid-card by the watchdog hard context/turn ceiling (turns=120 tokens=156655) before Step 3 (execute) produced any commits. Its worktree exists at /Users/Muxin/Documents/GitHub/voter-choice-worktrees/roster-b/wt-i07-national-source-inventory-me-md-ma-mi-mn-ms-mo-10c84215 (branch wt/roster-b/i07-national-source-inventory-me-md-ma-mi-mn-ms-mo-10c84215, zero commits ahead of base, no PR) and is left in place, not cleaned up, for reference.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for ME, MD, MA, MI, MN, MS, and MO; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01-F07 shared contract.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove ME, MD, MA, MI, MN, MS, MO each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- DECISION: authorized - external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only - no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: same scope as parked 10c84215 (I07), refiled fresh after ceiling kill so it can be picked cleanly - 2026-07-14
- STATUS: To Do
- DEPENDS ON: F07 — Official-source semantic combination invariants
<!-- card-id: 32f57ded-7143-4591-8f8d-6ef6ef27778f -->

**[P0] Resume I09 — National source inventory: NC, ND, OH, OK, OR, PA, RI**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Follow-up to parked card 1c7e4a73-43ca-4f9b-bc7e-e6a7ee3f7d42 (I09), which was claimed on lane roster-a and then killed mid-card by the watchdog hard context/turn ceiling (turns=120 tokens=156655). Its worktree (voter-choice-worktrees/roster-a/wt-i09-seven-state-source-inventory-wave3-1c7e4a73, branch wt/roster-a/i09-seven-state-source-inventory-wave3-1c7e4a73) survived the kill but carries zero commits ahead of origin/main - left in place, not cleaned up, for reference only.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for NC, ND, OH, OK, OR, PA, and RI; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01-F07 shared contract.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove NC, ND, OH, OK, OR, PA, RI each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- STATUS: To Do
- DEPENDS ON: F07 — Official-source semantic combination invariants
- DECISION: authorized - external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only - no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: same scope as parked 1c7e4a73 (I09), refiled fresh after ceiling kill so it can be picked cleanly - 2026-07-14
<!-- card-id: 165a071e-97e3-4fc5-899a-382d285511bb -->

**[P0] I06 — National source inventory: HI, ID, IL, IN, IA, KS, KY**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: Wave 3 (national source inventory) of the nationwide official-source congressional roster plan; created 2026-07-14 after F04 declared the contract fit-for-fan-out and the F05/F06/F07 corrections landed.
- OUTCOME: Validator-clean, evidence-backed official-source inventory records for HI, ID, IL, IN, IA, KS, and KY; every jurisdiction resolves to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions, built on the F01–F07 shared contract.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-in/consolidation (I12), pilots, and any source adapter outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster; failed/blocked/not-yet-published official sources remain explicit rather than guessed or normalized away; no aggregate record may count as exact contest coverage.
- TESTS: Group-scoped inventory verifier over the seven jurisdictions rejects missing coverage, non-official authority, incomplete metadata, or an unexplained coverage state; every expected 2026 contest for these states maps to an exact official-source path or evidenced explicit state.
- GOAL_CONDITION: Focused tests prove HI, ID, IL, IN, IA, KS, KY each have validator-clean official-source records or an evidenced explicit coverage state, with no silent omission; npm run check passes.
- SHIP: auto-pending-merge
- RELAUNCH: 1
- STATUS: Done
- DEPENDS ON: F07 — Official-source semantic combination invariants
- DECISION: authorized — external reads limited to official state election-authority sources per the epic's NON-NEGOTIABLE SOURCE DECISION (official landing pages/calendars/candidate publications only; low-frequency, identifying user agent; save reproducible fixtures; no Ballotpedia, no access-control bypass). Inventory/evidence only — no candidate ingestion, migrations, or production mutation.
- GROOMED: ready: explicit seven-jurisdiction inventory scope, fail-closed safeguards, group-scoped verifier tests, and goal condition — 2026-07-14
- LANE: roster-b
<!-- card-id: 7f780d4d-0a85-4850-8257-557913409063 -->

**[P0] F07 — Official-source semantic combination invariants**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: F04 seven-jurisdiction rehearsal correction.
- OUTCOME: Enforce valid source-role, format, parser-family, observation, availability, and coverage-state combinations.
- IN SCOPE: reject unsupported parser/format pairs, calendar-only/filling sources presented as qualified rosters, and inconsistent manual/filing/state mappings; preserve fail-closed source authority rules.
- SAFETY: filing list and calendar-only evidence can never establish qualified/certified availability; manual states remain explicit review-required states.
- GOAL_CONDITION: Focused negative tests reject every invalid semantic combination identified in F04 and retain valid official-source records; npm run check passes.
- SHIP: auto-pending-merge
- NOTE (2026-07-14): Next roster card after Codex's F06 (PR #312, merged). This is the last F04 correction card; Wave-3 national inventory fan-out (I05–I11) DEPENDS ON it.
- STATUS: Done
- DECISION: authorized — code + tests only, enforcing the F04 semantic-combination invariants; no external service, no migration, no production mutation.
- GROOMED: ready: explicit semantic-invariant scope, fail-closed safeguards, and focused negative-test predicate; code+tests only, no external service or migration — 2026-07-14
- LANE: roster-a
<!-- card-id: 4d7a6f37-e18f-4c41-8db8-20e79920db81 -->

**[P0] F06 — Reproducible official-source evidence and manual-import controls**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: F04 seven-jurisdiction rehearsal correction.
- OUTCOME: Make official-source evidence reproducible and manual coverage operationally complete.
- IN SCOPE: captured artifact/reference, checksum, retrieval result/time, publication/effective time, distinct technical-failure/legal-challenge states, and manual controlling-artifact/owner/due-date/calendar-trigger/non-filing replacement path.
- SAFETY: not-published requires a successful configured-channel check; source failure never becomes not-published; manual coverage never counts complete or promotable before its official artifact validates.
- GOAL_CONDITION: Focused tests reject a not-published claim without successful evidence and any manual/filing-only path lacking its required official replacement controls; npm run check passes.
SHIP: auto-pending-merge
- STATUS: Done
- GROOMED: ready: explicit evidence/manual-control outcome, fail-closed safeguards, and focused test predicate — 2026-07-13
<!-- card-id: 09af9aa2-d34f-4d02-a8d9-7682f397ad78 -->

**[P0] F05 — Exact contest-to-official-source coverage contract**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: F04 seven-jurisdiction rehearsal correction.
- OUTCOME: Model source paths against F02 exact contest identities, not aggregate jurisdiction records.
- IN SCOPE: district/seat, regular/special, date-stage-party lane identity; multiple sources per jurisdiction; duplicate source-scope rejection; seven-jurisdiction matrix including Alabama split, LA runoff semantics, CA/AK/DC/PR scope.
- SAFETY: A record cannot claim a contest not in the F02 oracle; no aggregate offices/dates/stages representation may count as exact coverage.
- GOAL_CONDITION: Focused tests fail for missing/incorrect district, seat, kind, date, stage, or party lane and pass only when every F03 expected contest has an exact official-source path or explicit evidenced state; npm run check passes.
- STATUS: Done
- GROOMED: ready: exact contract scope, safeguards, tests, and goal condition — 2026-07-13
- LANE: roster-a
<!-- card-id: d4446600-b85d-47f1-9e9e-048ca118df9f -->

**[P0] F04 — Seven-jurisdiction rehearsal review and contract correction gate**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- PLAN: docs/operations/nationwide-congressional-roster-plan.md
- ORIGIN: Wave 2 of the separately authorized nationwide official-source congressional roster plan.
- OUTCOME: Review the F03 evidence for AL, TX, CA, DC, AK, LA, and PR; adjudicate every authority, election-stage, access, format, and completeness gap; declare the shared contract fit for national fan-out only when every gap is resolved, or file exact blocking correction cards.
- IN SCOPE: Evidence review, contract tests/corrections required by the rehearsal, and a durable review record covering all seven jurisdictions and any resulting correction card IDs.
- OUT OF SCOPE: National inventory fan-out, live candidate ingestion, database migrations, production mutation, scheduled refreshes, and any Ballotpedia scraping or access-control bypass.
- SAFETY: Do not treat a state filing list as a certified ballot roster; do not approve fan-out across an unresolved conflict, missing official evidence, or unexplained source failure.
- TESTS: Re-run the F03 rehearsal suite and source-inventory verifier after any contract correction; verify the review record accounts for all seven jurisdictions and names each unresolved issue or correction card.
- GOAL_CONDITION: The review record accounts for AL, TX, CA, DC, AK, LA, and PR, records a fit-for-fan-out verdict only with zero unresolved rehearsal gaps, or lists exact blocking correction cards; npm run check passes.
- SHIP: auto-pending-merge
- PR: https://github.com/heymoosh/voter-choice/pull/304
- STATUS: Done
- GROOMED: ready: explicit rehearsal review gate, safeguards, tests, and goal condition — 2026-07-13
<!-- card-id: 00c62708-be54-4b89-afd4-4a9fa83823fc -->

**[P0] F03 — Official-source inventory rehearsal: AL, TX, CA, DC, AK, LA, PR**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- PLAN: docs/operations/nationwide-congressional-roster-plan.md
- ORIGIN: Wave 2 of the separately authorized nationwide official-source congressional roster plan.
- OUTCOME: Create validator-clean, evidence-backed official-source inventory records for Alabama, Texas, California, the District of Columbia, Alaska, Louisiana, and Puerto Rico; every jurisdiction must resolve to an official authority/source path or an explicit evidenced coverage state, never an unknown omission.
- IN SCOPE: Official election-authority landing pages, calendars, candidate-publication sources, source formats, access constraints, refresh cadence, parser-family classification, fallback manual-import procedure, and saved/reproducible evidence for these seven jurisdictions. The FEC state-election-office directory is discovery-only; do not scrape Ballotpedia or bypass access controls.
- OUT OF SCOPE: Candidate roster ingestion, database migrations, production mutation, scheduled refreshes, national fan-out, and source adapters outside these seven jurisdictions.
- SAFETY: A filing list cannot be represented as a qualified/certified roster. Failed, blocked, or not-yet-published official sources must remain explicit rather than being guessed or normalized away.
- TESTS: Add focused rehearsal fixtures/tests that reject missing jurisdiction coverage, non-official authority, incomplete source metadata, and an unexplained coverage state; verify the seven recorded jurisdictions against the source-inventory contract.
- GOAL_CONDITION: Focused F03 rehearsal tests prove AL, TX, CA, DC, AK, LA, and PR each have validator-clean official-source records or an evidenced explicit coverage state, with no unknown omission; npm run check passes.
- SHIP: auto-pending-merge
- PR: https://github.com/heymoosh/voter-choice/pull/303
- STATUS: Done
- GROOMED: ready: explicit seven-jurisdiction scope, safeguards, tests, and goal condition — 2026-07-13
<!-- card-id: 06577f2c-82f3-4656-94d5-89f931dfa5a3 -->
