# Voter Choice Backlog

**PICK UP FIRST, before any other card:** `[P0][GATE] STOP-SHIP` (card id `e840c072`, moved to the top of the Cross-cutting section below — search for it) — STATUS: In Progress, not Done. Its own gate found real false-pass bugs in itself (6 of 13 "PASS" scenarios don't actually match the design); the fix is planned but not built. Read that card's full note stack before touching anything else Keystone/design-related — Stage B stays mechanically blocked (via DEPENDS ON) until it's genuinely done and re-verified, not just claimed. **Standing rule (Muxin, 2026-07-08): no work that affects the UI — including a backend/data change that merely renders into a Keystone-scoped surface, not just visual/design-experience changes — proceeds until this card passes a genuine re-verified gate run. Non-UI work (data pipelines, ops, ingest, alignment-data-quality, telemetry, etc.) is NOT gated by this and stays safe for an unattended overnight run.** **Order (Muxin, 2026-07-09): STOP-SHIP first, then — only after it passes a HUMAN visual sign-off, not a self-vet (see its card) — the 8 FE/Keystone cards clustered right after it, before any other Cross-cutting card.** Remove this banner once that card is back to STATUS: Done.

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

### General

**[P3] Decide tablet/mobile Edit-Issues prominence**
- Edit IS reachable via the scorecard "Edit" button (PR #173) but a tester could not find it — discoverability, not a missing feature.
- DEFERRED to P3 (2026-06-30): re-evaluate AFTER the redesign lands — may be moot once the new layout ships. Parked in Backlog until then.
- STATUS: Backlog
<!-- card-id: 05b9ca68-e9ff-4701-aa1b-0ab86041871c -->

### Top Bar

### Home Page

### Issues / Lock-in

### Results flow

### Scorecard

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
- STATUS: To Do
- DEPENDS ON: [P1] EPIC: Go-live launch gate (do these ONLY when flipping to public)
- DECISION: defer — do NOT execute. Pin the exact reset mechanism (store/keys/script) read-only and surface a one-command action for launch. No prod mutation overnight.
- GROOMED: ready: DECISION already narrows scope to pin-mechanism-only/no-prod-mutation; go-live gate dep already linked + 2026-07-08
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
- GROOMED: ready: exact commands + verification steps on card; go-live gate dep already linked + 2026-07-08
<!-- card-id: 28bf87ec-8587-4d1f-acc7-ab5ff7467cf4 -->

**[P1] Translations to major languages**
- Flagged 2026-06-12 (pre-launch) — Muxin.
- The app currently ships English + Spanish via hand-authored TS objects (`src/lib/translations.ts`) — not a scalable pattern for adding languages.
- **RESOLVED (Muxin, 2026-07-08):** build every language we reasonably can, not a fixed short list. This now splits into two cards: "[P1] Rebuild i18n on a scalable locale pipeline + build out the full VRA §203 language tier" (Spanish + Chinese/Vietnamese/Korean/Tagalog, curated/reviewed) and "[P2] Add a machine-translate fallback (e.g. Google Translate widget) for languages beyond the curated tier" (everything else, so the app isn't EN-only for anyone). This card is now an umbrella over those two.
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

#### Phase 1 alignment quality — Congress = federal; parallel data work, not redesign-blocking:

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

#### 🔒 Design-fidelity gate — work this cluster first, before anything else in Cross-cutting (Muxin, 2026-07-09)

STOP-SHIP first, validate it actually works, then these 8 FE/Keystone cards it gates — in that order, ahead of every other card below. Everything else in Cross-cutting stays fine to run in parallel/after (non-UI, not gated).

**[P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)**
- Muxin 2026-07-08 (live review): two failures — (1) the repo cannot yet produce 1:1 fidelity to design work: the parity gate (scripts/design/parity-gate.ts, PR #242) merged the same morning the 5 Keystone PRs were called review-ready, is wired into ZERO CI workflows, and structurally covers only 3/27 scenarios; the PRs' 'self-vet clean' verdicts came from code-reading agents that never rendered anything. (2) The page-by-page HTML review artifact (keystone-contact-sheet.html) doesn't properly load: 15MB monolithic file with 56 base64-inlined images, screenshots viewport-cropped at ~900px (Why Now cut off, Results funding invisible below the fold), and missing states (Tip Jar, Loading, candidates overview, interaction sub-states).
- PLAN (authoritative): docs/operations/keystone-fidelity-fix-plan-2026-07-08.md — Phase 0 live-verify the scares (does funding data actually render? the 0/3-vs-2-issues rail count), Phase 1 rebuild the review artifact (parity-gallery full-page capture engine, per-section pages + index, committed to repo, verified-loadable DoD), Phase 2 enforce design:parity-gate as a required CI check on Keystone-touching PRs + expand STRUCTURAL_PROBES from 3 to all portable scenarios (absorbs card af7fa077's scope), Phase 3 process change (gate-green before PR opens; gate report = required GOAL_EVIDENCE; code-reading review demoted to pre-check), Phase 4 re-audit PRs #230/#236/#237/#240/#243 under the new harness and produce the true per-section gap list.
- Incident detail + raw findings: docs/operations/keystone-parity-failure-handoff-2026-07-08.md.
- STOP-SHIP scope: the 5 open Keystone PRs stay held drafts; every other Keystone card DEPENDS ON this card; nothing design-related merges until Phase 4's re-audit is delivered and Muxin lifts the hold. Muxin 2026-07-08 (reaffirmed after Phase 4): the fidelity tooling itself (PRs #244/#245/#246) is NOT yet trustworthy — Phase 4 found real false-pass/false-fail bugs in it — so no FE UI/Keystone work of any kind resumes until the tooling is completely integrated (all 4 tooling-fix cards below reach Done, #244/#245/#246 merged) AND Muxin has reviewed the result; only then does FE UI work continue.
- GOAL_CONDITION: parity-gate runs as a required CI check on Keystone-touching PRs; review artifact v2 is committed, full-page, covers all scenarios incl. Tip Jar/Loading, and verified loadable; STRUCTURAL_PROBES cover all portable scenarios (or carry explicit per-scenario waivers); Phase 4 re-audit report delivered with per-section gate results for all 5 open PRs; AND the 4 Phase-4-discovered tooling-fix cards (622fe2dd, 50c20164, 4b7f2068, 1b4b943d) are Done, so the gate has no known false-pass/false-fail gaps before it's trusted as Phase 4's final authority.
- MECHANICAL AUDIT 2026-07-08: verified every Keystone/design card's DEPENDS ON actually resolves through this card (claim_next_eligible only skips a card whose dependency isn't Done — prose alone doesn't block it). Found and fixed 3 cards with no dependency at all (e5f379e2, 466d6efb, 3cb46afd — one, e5f379e2, was sitting in STATUS: To Do and immediately pickable); added a defense-in-depth DEPENDS ON directly on the b7c7178d epic too (close_completed_epics doesn't check an epic's own DEPENDS ON before auto-closing it — only whether its children are Done — so this matters). Also closed af7fa077 as Done/superseded (PR #244 already absorbed its exact scope) so it can't collide with the tooling work. PRs #244/#245/#246 have no backlog cards of their own; they're held via draft status + explicit "(HELD — STOP-SHIP)" PR titles + an explicit PR comment instead, since the self-vet-merge policy's design-experience/tooling classification has no STOP-SHIP-aware carve-out yet — that durable fix is filed on the simple-kanban board (claude-config lane, card 157c48a9 "Self-vet-merge policy needs a design-fidelity-tooling carve-out under an active STOP-SHIP"), which also absorbs Phase 3's 3 remaining conductor-skill bullets. Needs a dedicated claude-config-lane session to build.
- ORIGIN: Muxin, live review 2026-07-08 ('nothing else gets done or merged until these are addressed')
- PROGRESS (2026-07-08): Phase 0 done — no live bugs, findings at docs/operations/keystone-phase0-findings-2026-07-08.md. Phase 2 built (parity gate wired into CI, 3→7 structural probes + 20 documented waivers, zero silent skips) — held draft PR #244 for your review (needs a branch-protection setting from you post-merge). Phase 1 done (review artifact rebuilt: docs/design-review/, 28/28 scenarios, scroll-trap capture bug fixed + confirms the funding panel was always rendering fine) — held draft PR #245 for your review. Phase 3's repo-scoped piece done (CI regenerates + comments the review artifact on every Keystone PR; GOAL_CONDITION convention added to this file's cheat sheet above) — held draft PR #246. Phase 3's conductor-skill piece (~/.claude/skills, a separate claude-config repo) is NOT done — needs a separate session against that repo.
- PROGRESS (2026-07-08, Phase 4 — re-audit complete): full findings at docs/operations/keystone-phase4-audit-2026-07-08.md. Headline: the "10 gate-flagged gaps" from card 466d6efb reproduce identically on all 5 held PRs — none of them the cause, already tracked there (updated with today's severity data). Two things are genuinely new: (1) PR #236 and #237 each ship a new screen the gate's capture scripts never actually reach — both PASS today but are unverified, not confirmed-good; (2) PR #243 will BREAK ~20 gate scenarios repo-wide the moment it merges (a shared helper assumes the old single-seat layout) — confirmed zero *new* regressions once patched, but the fix needs to ship with/before the merge. Filed 4 mechanical tooling-fix cards (622fe2dd, 50c20164, 4b7f2068, 1b4b943d).
- RESOLVED 2026-07-08: the #230 nav/hero "conflict" was a false alarm — it was a diagnostic-worktree artifact (test-merging #230 into the not-yet-merged tooling branch), not a real product decision; resolves itself via ordinary rebase once #230 is up for real review. The reachWorkspace() sequencing question is answered below (own tooling PR, not bundled into #243). 05c-candidates-overview eyeball stays deferred until #243 itself is under review.
- PROGRESS (2026-07-08, scaffolding merged): PRs #244, #245, #246 all merged to main (in that dependency order, 2 rebase conflicts resolved — both the same known 08b-howitworks scenario collision, resolved consistently each time). The parity-gate CI check is live but not yet marked "required" in GitHub branch protection (Muxin action, still pending). Now building the 4 tooling-fix cards (622fe2dd, 50c20164, 4b7f2068, 1b4b943d) in worktree wt-keystone-phase4-tooling-fixes as the last piece of Stage A.
- STAGE A COMPLETE (2026-07-08): PR #247 (the 4 tooling-fix cards) merged to main (squash 1fb9fffb), on top of #244/#245/#246. Final verified gate state, confirmed via #247's own CI: 16/27 pass, 10 fail — exactly the known baseline (the 8 pre-existing gaps + 10c/10d now correctly explained by a documented waiver, not silently failing) — 2 skipped, zero unexplained regressions. 3 of 4 fix cards fully Done (622fe2dd, 50c20164, 4b7f2068). The 4th (1b4b943d) is code-complete (capture() written, verified against PR #243's real markup) but stays PARKED — no canvas ref PNG exists anywhere in the repo for the 05c-candidates-overview artboard, and none can be fabricated; genuinely needs a fresh Claude Design canvas session from Muxin. Not treating this as a Stage A blocker: it's narrow, explicitly flagged (not silent), and doesn't cast doubt on the other 26 scenarios. Also still pending, external/out-of-band: Muxin flipping parity-gate to "required" in GitHub branch-protection settings.
- CONCURRENCY INCIDENT 2026-07-08 (resolved): a second, unattended orchestrate-pipeline conductor (launched earlier, forgotten about) was independently operating on this same repo/board while this session worked the same card — it built its own (empty, no-op) worktree for this card, correctly caught and fixed one of this session's mistakes (1b4b943d's premature Done-marking), but also left a card mid-flight (2c177f54, CAN2026 translation) when stopped. Confirmed via `ps`: PID 55567 (the conductor) + 3 watchdog instances, all pointed at this repo, running since 3:36pm. Stopped safely via the per-repo sentinel (`touch ~/.conductor-stop-voter-choice-3961724253`, not the global kill-switch, so it didn't affect any other repos' overnight runs) — confirmed all 7 processes exited cleanly. card 2c177f54 keeps its STATUS: In Progress + its worktree (wt-translate-can2026-curated-context-section-in-repcard-2c177f54, 3 modified files, uncommitted) intentionally intact so a future session's cold-start/resume logic picks it back up correctly instead of losing the WIP. No other work was lost; the empty duplicate STOP-SHIP worktree it created was removed (nothing unique in it).
- STOP-SHIP LIFTED (2026-07-08): marked Done per the above DECISION — Stage A verifiably complete. This closes the card-level gate that blocked Stage B's cards from being picked up; it does NOT touch the SEPARATE, always-standing self-vet-merge rule that a genuine FE design-experience change holds for Muxin's PR review regardless of card status — the 5 held Keystone PRs (#230/#236/#237/#240/#243) still require her explicit review before merging (that's Stage C). Follow-up card 1b4b943d (05c ref PNG, needs a canvas session) stays open and PARKED, untouched by this closure — it doesn't block anything since nothing depends on it.
- CORRECTION 2026-07-08: two things caught while closing out the last piece of Stage A. (1) The "16/27 pass, 10 fail... confirmed via #247's own CI" figure above was wrong — that was a local dev-machine run, not CI. This entry's own restated number ("13/27 pass, 12 fail") was ALSO wrong — see CORRECTED TALLY note below for the real figures. (2) 1b4b943d's "genuinely needs a fresh Claude Design canvas session" framing was ALSO wrong for the same underlying reason as the STAGE A COMPLETE note's 05c caveat — the search that produced it only checked design-handoff/keystone-canvas/. Muxin pointed at design-handoff/design_handoff_voter_choice_redesign/ (untracked, newer), which has the real screens-delegation.jsx source + a working standalone canvas viewer. Captured the ref PNG from it and shipped PR #248 (squash 2dce6f3e) — see 1b4b943d, now Done. (3) NEW finding from comparing CI runs: 4 scenarios (01-orientation-activated, 09a/09b/09c-intake) were failing in CI with capture() timeouts ("locator.waitFor: Timeout 15000ms exceeded") that didn't reproduce locally. Root cause found, fixed, independently verified — see CORRECTED TALLY note below.
- CORRECTED TALLY 2026-07-08 (verified independently, not just claimed): the gate's own summary line format is "N/27 gated scenarios passed" — the 27 counts only GATED (non-skipped) scenarios, NOT the full total (29 = 27 gated + 2 skipped). I misread this twice above. The TRUE original baseline (#247's and #248's CI runs, pulled directly via gh api): 13 pass / 14 fail / 2 skip / 29 total — 14 fails, not 12; I'd missed 02d-results-allvotes-sheet and 04-scorecard in my manual count, though both were already tracked as known gaps on card 466d6efb, so nothing new was hiding there. The CI-only timeout on 01/09a/09b/09c: root cause confirmed by a peer session's deeper investigation (not dev-server cold-compile as I'd guessed) — those 4 scenarios' capture() called reachColdOpen()/reachOrientation() without mocking /api/delegation first, unlike every other scenario in the file; CI has no DATABASE_URL, so the unmocked call resolves to a real "db_unavailable" → the app's own "dberror" stage instead of "coldopen", and issue-convo-input never renders, burning the full 15s timeout every run — a deterministic logic bug, not flakiness or slowness. It only passed locally because a dev's .env.local carries real prod DB creds, masking the missing mock. Fixed in PR #249 (squash 864a26fd) by adding the same mockDelegation()/mockChatLocal() calls every other scenario already uses — I independently confirmed the diff matches this description (gh pr diff 249) and independently re-pulled 3 separate CI runs myself (28980562168, 28980826040, 28981143672 — one from the PR, one workflow_dispatch, one the post-merge push to main) — all three byte-for-byte identical: 16/27 gated scenarios passed, 2 skipped, zero "capture failed" lines. That's 16 pass / 11 fail / 2 skip / 29 total, deterministic across all 3 runs. The CI-timeout piece of this card's GOAL_CONDITION is genuinely, independently verified done. The false-pass piece (below) is NOT — that's the one still open.
- REOPENED 2026-07-08 — STOP-SHIP LIFTED WAS PREMATURE, "Stage A complete" retracted: Muxin spot-checked the gate evidence I showed her (05a-candidates-parity, marked PASS) against the actual screenshots and immediately caught that the live app doesn't render anything close to the design's 3-card overview — a real false pass, not a documentation nit like the earlier correction. I went back and eyeballed all 10 "PASS" scenarios that had their structural (DOM) check skipped/waived — meaning the visual pixel-diff ratio was the ONLY thing deciding pass/fail for them. **6 of 10 are confirmed false passes**, not just 05a: 06-homehero (different headline copy, missing product-preview mockup), 08d-tipjar (live page has zero nav/footer chrome vs the ref), 10a-polis-entry (ref shows an opinion-map invite screen that has no live equivalent), 11a-fieldmoneygap + 11b-scalestates (both compare against a whole-field money-gap chart that "isn't wired in the repo at all" per the scenario's own note). 4 checked out genuinely fine: 02c-results-votes-drilldown, 03-color-bold-flag, 08e-loading, 11c-moneygaph2h. (02a/02b/05b weren't re-checked by eye but have real structural PASS backing them, not visual-only — lower risk.) Side-by-side evidence for all 10, ref vs live vs my eyeball verdict: https://claude.ai/code/artifact/ea926885-534f-417c-aac0-fdded9c76ab3
- ROOT CAUSE (confirmed, not theorized): the visual check downscales both images to 480px wide and counts differing pixels. Most of any UI screen, by area, is whitespace — so two completely different screens can still score a low diff ratio if both are mostly-white backgrounds with modest text/color on top. This is a structural weakness of raw pixel-diffing, not a one-off implementation bug, and it only bites when there's no structural check as backup — true for 10 of the 13 scenarios that were passing.
- MUXIN'S APPROVED REMEDIATION PLAN (2026-07-08, live) — try the real fix first, escalate only where it can't work: **Option 1 (primary): require a real structural probe everywhere a scenario currently relies on visual-only.** Two sub-parts: (A) 10a-polis-entry, 11a-fieldmoneygap, 11b-scalestates are testing UI that flatly doesn't exist in the app yet, per their own notes — same situation as the already-correctly-skipped 05c-candidates-overview and 10b-polis-contribute. These just need `automatable` flipped from "yes" to "no" (mechanical, zero algorithm work, not yet done). (B) 05a-candidates-parity, 06-homehero, 08d-tipjar ARE testing real, currently-existing screens — these need genuine structural probes written (not necessarily literal canvas-class-token matching, since several of these components deliberately use non-literal class vocabulary by design — check for presence of the actual key structural elements the design calls for, e.g. does the page render its nav/footer shell at all for 08d-tipjar). **Option 2 (escalation, scenario-by-scenario only): if a real structural signal genuinely can't be found for one of the (B) scenarios, use a smarter visual-similarity check (e.g. SSIM) for that specific scenario instead of the raw pixel-diff — not a blanket rewrite of the whole visual-check algorithm.** None of this is done yet.
- ALSO STILL OPEN, discovered along the way: (1) PR #249 (merged and independently verified, see CORRECTED TALLY note above) fixed the CI-only capture timeouts on 09a-intake-ask/09b/09c-intake-locked — they now PASS instead of timing out, but like the 6 confirmed false-passes above, their structural check is skipped/waived too, so they're UNAUDITED — same false-pass risk, not yet eyeballed, could easily be a 7th/8th/9th. (2) Fixing those timeouts let 01-orientation-activated's structural check actually run for the first time in CI: 17 of 18 design classes missing — a real, large gap; a peer session independently traced this to the same already-documented HANDOFF-EXACT-MATCH.md §1.1 gap (OrientationView is a bare div), and it's consistent with what card 466d6efb's CONTEXT line already listed — not a surprise, just newly visible. (3) CI's `parity-gate-report` artifact upload (the diff PNGs) has silently never worked — `actions/upload-artifact@v4` excludes dotfile directories by default, and the gate writes to `.parity-gate-out/`; one-line fix (`include-hidden-files: true`), not yet done. None of these are blockers on their own, but they're real and undone.
- NOT DONE — explicit gate before this card can go back to STATUS: Done: (a) the CI-timeout fix (PR #249) IS independently verified working — 3 separate real CI runs, byte-for-byte identical, confirmed above, that part is closed; (b) the false-pass fix is NOT yet done or verified — Phase A/B below haven't been built yet, only planned. Both (a) staying true on re-check and (b) actually landing + being re-verified (not just claimed) are required before Stage B resumes. This is deliberately redundant with the STATUS field below — read this note, not just the status column.
- PROGRESS since the premature closure: PR #248 (05c-candidates-overview ref PNG, squash 2dce6f3e) and PR #249 (fix the CI-only timeout on 01/09a/09b/09c, squash 864a26fd) both merged and are NOT affected by this reopening — both are legitimate, narrow fixes, independently verified. Local `main` is at 864a26fd.
- DECISION (original, 2026-07-08, live, partially superseded above): staged execution authorized: Stage A (this scaffolding, including the 4 fix cards) → once verified complete, proceed automatically (no further check-in needed) into Stage B (the actual FE UI fixes: card 466d6efb's 10 gate-flagged gaps + PR #230/#236/#237/#240/#243's own outstanding items) using the completed gate as authority → Stage C is ONE unified review session using the regenerated HTML artifact (docs/design-review/), not piecemeal PR-by-PR review. Do not re-ask at each step; only escalate genuine intent-ambiguity, same as the standing operating rule.
- NEXT SESSION — pick up in this order: (1) Phase A: flip `automatable: "yes"` → `"no"` for 10a-polis-entry/11a-fieldmoneygap/11b-scalestates in scripts/design/parity-gallery-scenarios.ts, update their notes to say why (matches 05c/10b precedent) — quick, safe, do first. (2) Phase B: write real structural probes for 05a-candidates-parity/06-homehero/08d-tipjar per the plan above; escalate to a visual-similarity check only where structural genuinely can't apply. (3) Eyeball-audit 09a-intake-ask/09b-intake-propose/09c-intake-locked the same way (same artifact/methodology as the linked evidence page) since they're newly-passing and unaudited. (4) Fold 01-orientation-activated's confirmed 17/18-missing-classes gap into card 466d6efb's list if not already reflected there. (5) Fix the CI artifact-upload bug (`include-hidden-files: true` in .github/workflows/design-parity.yml). (6) Once all of the above is done and re-verified (structural probes actually catch what they're meant to, full gate re-run shows an honest, stable tally), mark this card STATUS: Done again and only then flip parity-gate to "required" in GitHub branch protection (still Muxin's action, still pending) and let Stage B proceed. Known housekeeping, not urgent: worktree wt-05c-candidates-overview-ref-1b4b943d hits the documented stale-worktree EPERM bug (project memory) and needs Muxin to remove it manually; card 2c177f54's orphaned WIP (worktree wt-translate-can2026-curated-context-section-in-repcard-2c177f54) is still intentionally untouched.
- BROADENED STANDING RULE (Muxin, 2026-07-08, reaffirmed): no work that affects the UI proceeds until this card passes a genuine, re-verified gate run — not just design-experience/visual changes, but ANY backend/data change that changes what renders into a Keystone-scoped surface (e.g. Polis bridges/divided data, per card 840a9ed2 below). Non-UI work (data pipelines, ops, ingest, alignment-data-quality, telemetry, cron, i18n copy bugs unrelated to Keystone, etc.) is explicitly NOT gated by this and is safe for an unattended overnight conductor to keep working — see the file's top banner. This session did a backlog-wide audit (not a code build) to make that mechanical before letting an overnight run loose: found + fixed 2 more Keystone/parity-tooling-adjacent cards sitting ungated in To Do (e373b3dc "duplicate Privacy link" — entangled with the 08c parity-gate scenario; 840a9ed2 "wire real Polis bridges/divided data" — changes what the Polis report screens render, and 10c/10d are exactly the scenarios this card's own gate fix touches) — both now DEPENDS ON this card. No FE/tooling code was touched this session — a worktree was opened to start the NEXT SESSION plan below, then intentionally rolled back (zero commits, removed cleanly) in favor of doing this dependency-graph audit first, per Muxin's direction.
- RECON NOTES for whoever picks up the NEXT SESSION plan below (saves re-discovery): (a) Phase A's premise needs a small correction — 10a-polis-entry/11a-fieldmoneygap/11b-scalestates are currently `automatable: "proxy"` in scripts/design/parity-gallery-scenarios.ts, not `"yes"` as originally written; "proxy" still runs the full visual pixel-diff against each scenario's real ref PNG (gate.ts only skips both checks on `"no"`), which is exactly how they've been silently false-passing — flip to `"no"` (matching 10b-polis-contribute's exact convention: note text, no `capture()`, no STRUCTURAL_WAIVERS entry) rather than "yes → no" as literally written. (b) Phase B needs a genuinely new mechanism, not literal reuse of STRUCTURAL_PROBES: that array (parity-gate.ts) only supports literal design-source class-token diffing (via componentName + designFile), and 05a/06/08d are each already documented in STRUCTURAL_WAIVERS as confirmed NON-literal ports (RepCard's cv2-*, HomeView's hp-hero/addr-*, the shared StaticPage shell's sp-* vs. TipJarPage's own tip-* — zero class-token overlap with the canvas source by design) — literal-class probing would just re-find the same zero-overlap result. Add a second probe kind (e.g. an element-presence/key-structural-marker check against the REPO's own real selectors — "does the page render its nav/footer chrome at all," "does a 3-card structure exist," etc., per Muxin's approved plan wording above) instead. Each new probe must genuinely FAIL against today's unfixed app (that's the honest signal that closes this STOP-SHIP) and be designed to flip to PASS once Stage B's FE fixes land — if a new probe passes against the current, confirmed-still-broken app, the probe itself is wrong.
- SEQUENCING + STRUCTURE (Muxin, 2026-07-09): this cluster (this card + the 8 cards it gates, moved to the top of Cross-cutting above) is worked FIRST, before every other card on the board — a single-lane conductor should not touch anything else until this reaches Done. Everything else in Cross-cutting stays safe for an unattended run in parallel/after (unchanged from the BROADENED STANDING RULE above).
- ONE CARD, NOT SIX (Muxin, 2026-07-09): the NEXT SESSION plan's 6 steps stay a single card — splitting them would just scatter one coherent gate-repair job across cards with no independent value on their own. Internally it's two phases: **Build** (steps 1, 2, 4, 5 — flip the 3 non-automatable scenarios, write the 3 new structural probes, fold in the orientation gap, fix the CI artifact-upload bug) runs and self-verifies normally; **Validate** (step 3's eyeball-audit + step 6's re-run) ends in a hard human checkpoint, not a self-vet — see next note. Large/planner+workflow given the scope; the two phases can share one worktree/PR.
- HUMAN VISUAL VALIDATION GATE (Muxin, 2026-07-09) — mandatory, no exceptions: once Build is done and the automated gate re-run is clean (no known false-pass/false-fail gaps), do NOT flip STATUS: Done on the strength of that alone. Build a side-by-side "what the design wanted vs. what's actually built in the repo" HTML comparison for any 3 FE scenarios (conductor's pick — pick ones that exercise the new structural-probe mechanism, e.g. 05a-candidates-parity/06-homehero/08d-tipjar), attach/link it on this card, set STATUS: Review, and stop — Muxin judges it herself. Only her explicit approval flips this to Done. This mirrors memory `feedback_visual_selfvet_insufficient`: a code-reading or automated-only verdict is never sufficient for visual/design work.
- APPLIES TO ALL KEYSTONE PRs (Muxin, 2026-07-09): this same gate — fixed parity-gate green AND Muxin's own side-by-side visual sign-off, not the pre-STOP-SHIP self-vet — is now the required bar for every currently-open/held Keystone PR (#230/#236/#237/#240/#243) and their backing epics (d83cf5ec, b7c7178d), which she is treating as REJECTED as currently self-vetted. See the rejection notes added to those two cards below. No visual Keystone work of any kind is called Done without going through it.
- RESET TO TO DO (Muxin, 2026-07-09): was left `In Progress` with zero in-flight work — no worktree, no branch, no commits (the prior worktree was opened then intentionally rolled back). `In Progress` with nothing on disk is invisible to BOTH the conductor's fresh-pick path (Step 0 only scans `To Do`) and its cold-start resume path (which requires a matching `wt/<LANE>/*` worktree to recognize a card as mid-flight) — so it would silently never get picked up. Reset to `To Do` so a fresh conductor run claims it normally; combined with its new position at the top of Cross-cutting above, this is what actually makes "picked up first" mechanical rather than just prose.
- CLAIMED 2026-07-09: picked up directly (not via the autonomous conductor loop — Muxin asked to stay at this level and review the work herself before anything self-merges). Worktree `wt-stop-ship-fidelity-fix-e840c072` / branch `wt/stop-ship-fidelity-fix-e840c072` off `main` @ 864a26fd. Delegated build agent works the NEXT SESSION plan's Build phase (steps 1,2,4,5) then Validate phase (step 3's eyeball-audit + step 6's re-run, ending in the HUMAN VISUAL VALIDATION GATE side-by-side HTML artifact). Agent stops at STATUS: Review — no self-vet-merge, no auto-Done; Muxin judges the artifact directly.
- BUILD+VALIDATE DONE, AWAITING SIGN-OFF (2026-07-10): 4 commits on the worktree branch above (c477adaf/71b432af/51ffe596/3665075f), working tree clean, nothing pushed, no PR opened, backlog file untouched by the branch (verified). Gate tally: 16/27 gated-pass before → 10/24 after (pass count dropped on purpose — 05a-candidates-parity/06-homehero/08d-tipjar now have a real structural probe and genuinely fail it; 10a-polis-entry/11a-fieldmoneygap/11b-scalestates flipped to not-automatable instead of silently passing against the wrong screen). typecheck/2725 vitest tests/lint all clean. Eyeball-audit of the 6 previously-unverified scenarios (05a/06/08d + 09a/09b/09c-intake, newly-passing and unaudited): 5 confirmed false-passes, 1 genuine borderline call (08d-tipjar — copy/structure match, palette + one emphasis state don't). Full report: `docs/operations/keystone-stopship-validation-2026-07-09.md` on that branch. Side-by-side visual evidence (both build-agent's report AND my own direct spot-check of 2 of the 6 image pairs, not taken on the report's word alone): https://claude.ai/code/artifact/09c3b10e-180f-42cb-ba69-19cad67d356c — same root cause across all 6: the live app still renders its civic palette, not the Bold Flag system the canvas specifies (matches the already-tracked Keystone redesign gap, not a new finding). Your call next — approve, reject, or flag specific scenarios (08d-tipjar especially). Nothing merges/flips to Done until you rule.
- MUXIN'S RULING (2026-07-10): "I agree NONE of them passed. And no - the tip jar does NOT pass. The goal was to match the design. it did NOT match." All 6 confirmed genuine false-passes — she explicitly overruled the "borderline" framing on 08d-tipjar; it's a clean fail like the other 5, not a maybe. This IS the HUMAN VISUAL VALIDATION GATE sign-off: it confirms the rebuilt gate tooling's re-audit was accurate (if anything the tooling under-called 08d, it didn't over-call anything) — the gate-fix work itself is validated, not just claimed. STILL OUTSTANDING before this card can go STATUS: Done: (1) the tooling-fix branch (wt/stop-ship-fidelity-fix-e840c072) is committed but not pushed/PR'd/merged to main yet — asked Muxin whether to push+PR it now; (2) flipping parity-gate to "required" in GitHub branch protection is still Muxin's own action, repeatedly noted as pending across every prior progress note on this card, still not done. Do not treat the visual sign-off alone as satisfying the card's full GOAL_CONDITION — those two items remain.
- TOOLING PR MERGED, ITEM (2) STILL HELD (2026-07-10): PR #250 (wt/stop-ship-fidelity-fix-e840c072 → main) pushed, CI checked, squash-merged. `test`/`e2e`/`mutation`/`review-gallery` all green; `parity-gate` itself reports fail on CI, but that's expected — it's the same 10/24 gated-pass tally the local report already predicted, driven entirely by real still-unfixed Keystone surfaces (not a regression from this PR's tooling-only diff, which was re-verified file-by-file before merge: gate script, scenarios file, CI workflow, docs/design-review/ + report only, zero product/FE source touched). Item (2) — flipping parity-gate to "required" in branch protection — explicitly NOT done yet: Muxin asked to understand the mechanism first; explained that "required" only mechanically blocks merging on a red check, it says nothing about whether the check's PASS verdict is trustworthy — tonight only validated the gate's FAIL-side accuracy (6/6 confirmed real false-passes by eyeball), never its PASS-side (no scenario has yet been genuinely fixed + re-confirmed PASS by eyeball). Recommended holding "required" until one true-positive exists. Muxin's response: build that true positive — she directed starting Stage B on 08d-tipjar specifically (subagent-built, HTML visual sign-off required same as tonight, not self-vet-only per `feedback_visual_selfvet_insufficient`). That work is being scoped as a new card/worktree now; this card stays STATUS: Review until she rules on the tip-jar fix and on item (2).
- STATUS: Review
- DECISION: SUPERSEDED IN PART — the "Stage A verified complete, proceed automatically into Stage B" clause below no longer holds; re-blocking Stage B mechanically (STATUS reverted from Done) per the standing rule Muxin gave this same session: nothing moves to Stage B with Stage A work still pending. Everything else in the original DECISION (the Stage A→B→C shape itself, Stage C as one unified review, the 5 held Keystone PRs needing her explicit review regardless of card status) still stands — only the "Stage A is done" premise is retracted. Original text preserved below for the historical record.
<!-- card-id: e840c072-1bd9-4dc0-aebe-8a19867aed03 -->

**[P1][Keystone] Polis "Where you stand" report redesign — BUILT, held for sign-off (PR #266)**
- Built 2026-07-10 under Muxin's live direction — the "true positive" Stage-B build the STOP-SHIP card's 2026-07-10 note scoped, pointed at the Polis report surface instead of 08d-tipjar. Subagent-built, party-free (#116).
- WHAT: editorial Bold-Flag chrome port of the "Where you stand" report (PolisClose.tsx) + a REAL pol.is opinion map (k-means + PCA 2-D projection, new src/lib/polis/pca.ts) → 3 scattered opinion clusters (Group A/B/C, gold "You") + per-group convergence dots/chips on every statement (converge on common ground, spread on the divides). KEY: the clusters are opinion groups by answer-similarity, NEVER D/R/I — reconciles with #116 (the canvas's own source calls the map pol.is answer-similarity groups, not party); this reverses the earlier single-cloud simplification per Muxin's "I don't see multiple cluster clouds like the Keystone design".
- PR #266 (draft, HELD) — stacked on #265 (the p1-wire backend-data branch, card 840a9ed2); merge #265 first, GitHub retargets #266 to main. Branch wt/keystone-polis-report-redesign, commits 63e59c44→26052f1f→6dc9ee05.
- VERIFY: npm check green (2828 tests incl. 18 PCA unit tests + party-free key-allowlist privacy tests); parity-gate 10c/10d PASS (0.052/0.046 ≤0.18; structural pre-waived for the #116 divergence — gate logic/waivers UNtouched, only 10c/10d capture fixtures updated).
- Design-vs-build comparison artifact (canvas 10c/10d beside the built UI + honest delta ledger): https://claude.ai/code/artifact/b61afaec-465a-4383-a9b7-b333a233349e
- SHIPS DARK until POLIS_VECTOR_COLLECTION_ENABLED flips on in prod (empty polis_response_vectors → honest single-cloud low-N fallback, no fabricated clusters). Screenshots use real assembleClusterMap output over a synthetic 3-archetype seed (scripts/dev/seed-polis-clusters.ts, prod-refusing, never run against a live DB).
- FOLLOW-UP (flagged, not hidden): the map clusters the state-scoped population while the per-group chips cluster the national selection scope — two separate k-means runs in prod (labels/colors always match, membership may differ); align the scopes later.
- SIGN-OFF: requires Muxin's side-by-side visual sign-off, not a self-vet (feedback_visual_selfvet_insufficient) — the mandatory human validation gate. Nothing merges until she rules AND STOP-SHIP (e840c072) clears.
- ORIGIN: Muxin live direction 2026-07-10 ("build the design as instructed" → Polis redesign FE)
- STATUS: Review
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
<!-- card-id: 5a28e880-e2c0-4cfc-9f33-d3d9bb68e523 -->

**Polis blind-voting step (PolisStand): is this still an intended feature to build?**
- GAP found via the copy-diff report (PR #233 section 10) + confirmed as Phase 4's one "not automatable" scenario (10b-polis-contribute, PR #234): the canvas's PolisStand - a blind agree/disagree/pass reaction step before the aggregate report - does not exist anywhere in the repo. Confirmed via full read of PolisClose.tsx + repo-wide grep for Agree/Disagree/Pass/PolisStand-style markup: zero matches. This is the single largest scope item among the Keystone proxy gaps - a real feature build, not a copy or styling fix. Full context + the exact open question: design-handoff/keystone-canvas/PROXY-GAPS-FOR-CLAUDE-DESIGN.md section 9.
TASK: Muxin takes the open question to the Claude Design canvas session, then this card gets a DECISION before build - likely Large/planner+workflow given the scope (new UI surface + data model for blind per-statement votes).
ORIGIN: Keystone parity-gallery proxy gap, PR #234 + PR #233 review, 2026-07-07
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- DECISION: approved (2026-07-07, Claude Design via design-handoff/keystone-canvas/GAPS-RECONCILED-FOR-CODE.md §9) — BUILD. PolisStand (blind agree/disagree/pass, no running tally while voting) already exists in design-handoff/keystone-canvas/src/screens-polis.jsx (committed PR #231, artboard polis-stand). Genuinely does not exist in the repo yet - build as a new post-decision moment between the invite and the aggregate report. Likely Large: new UI surface + a data model for storing blind per-statement votes.
- GROOMED: ready: design fully specified by Claude Design, no open product question remains + 2026-07-07
<!-- card-id: fb77d0bb-74ee-43d6-9b72-cc14c90c8a1b -->

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
- STOP-SHIP AUDIT 2026-07-08: this card had no dependency and was immediately pickable — found during the backlog-wide gate audit (see e840c072's progress notes). It's a markup fix on the exact page the parity gate's 08c scenario probes, so it's gated behind STOP-SHIP like every other Keystone/parity-gate-adjacent card, not left open for an unattended run to touch mid-fix.
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- GROOMED: ready: explicit GOAL_CONDITION + specific scenario named + 2026-07-08
<!-- card-id: e373b3dc-f248-49bd-9b66-5085bcf860fe -->

**[P1] Wire real Polis bridges/divided data instead of the permanent empty sentinel**
- RESCOPED (Muxin, 2026-07-08): this was framed as "which of two backends to unify onto," but that's already decided — e2455f56 (approved 2026-07-07) picked population-level, party-free (no D/R/I breakdown). The actual reason Polis shows nothing today isn't an undecided product question, it's that no one wired the approved math to real data. Don't block displaying Polis on anything — this is the concrete unblock.
- CURRENT STATE (verified 2026-07-08 against origin/main): the pieces mostly already exist — `polis_response_vectors` schema is live (migration 0012), and `collectPolisVector()` IS wired into `/api/counters` (gated on `POLIS_VECTOR_COLLECTION_ENABLED`, confirm it's flipped ON in prod — same ops-toggle pattern as `CHAT_USAGE_METRICS_ENABLED`; `src/lib/polis/collectVector.ts`'s own header comment saying "NOT WIRED" is stale, ignore it). `computeBridges`/`computeDivided` in `src/lib/server/polis/aggregates.ts` are written and unit-tested, but `/api/polis/bridges` and `/api/polis/compass` still hard-return the `no_bridges_yet`/`below_threshold` sentinel — they were never updated to query real data. A separate module (`src/lib/polis/clustering.ts` + `reportAssembly.ts`, from PR #146) already knows how to turn raw response vectors into per-statement agreement percentages, but computes per-k-means-cluster (60% each), not population-level (80%, no clusters) — don't wire that one in as-is; it doesn't match the approved design.
- TASK: (1) confirm `POLIS_VECTOR_COLLECTION_ENABLED=true` in Vercel prod; (2) write a population-level aggregation (tally agree/disagree/pass per statement across ALL response vectors, no cluster split) over `polis_response_vectors` and feed it into `computeBridges`/`computeDivided`; (3) wire `/api/polis/bridges` and `/api/polis/compass` to call it instead of the hardcoded sentinel.
- GOAL_CONDITION: with real rows in `polis_response_vectors` (e.g. via the synthetic-seed card 337ad25a locally), `/api/polis/bridges` and `/api/polis/compass` return actual bridge/divided statements instead of `no_bridges_yet`/`below_threshold`.
- STOP-SHIP AUDIT 2026-07-08: this card had no dependency and was immediately pickable — found during the backlog-wide gate audit (see e840c072's progress notes). Wiring real data changes what the Polis report screen actually renders, and 10c/10d-polis-report-* are two of the exact scenarios the parity gate is being fixed to probe honestly right now — shipping this mid-fix would move the target. Gated behind STOP-SHIP like the other Keystone-surface cards (fb77d0bb, the local-only synthetic-seed card, is NOT gated — it never touches rendering or prod).
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- GROOMED: ready: rescoped from an undecided-backend question to a concrete wiring task — schema/collection/compute functions already exist, just need the population-level query + two routes wired + 2026-07-08
<!-- card-id: 840a9ed2-20db-4876-9142-7caecb44a387 -->

**Tidy stale MoneyGapH2H comment references left after dead-code removal**
- One prose-comment mention of MoneyGapH2H remains after it was deleted as dead code -- harmless (not code/imports), just a stale doc reference. (A second mention, in peerComparison.ts, was already fixed by the card 0e87d755 code-review pass, 2026-07-08.)
- File: scripts/design/parity-gallery-scenarios.ts:1151 -- a descriptive `note` string, e.g. "MoneyGapH2H (exported from MoneyGap.tsx) is not wired into HeadToHead.tsx"; still substantively true (the export no longer exists at all, vs. merely being unwired) but names a component that no longer exists. Left as an editorial call at review time rather than auto-fixed.
- TASK: update or remove this comment mention so it no longer references a component that does not exist.
- GOAL_CONDITION: grep -rn MoneyGapH2H scripts/design/parity-gallery-scenarios.ts returns no results.
- ORIGIN: follow-up from card 0e87d755 (Remove MoneyGapH2H as dead code), 2026-07-08
- CHAIN: 1
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- GROOMED: ready: exact grep-based GOAL_CONDITION on card, STOP-SHIP dep already linked + 2026-07-08
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
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
- GROOMED: ready: sequencing confirmed (Muxin, 2026-07-08) — standing Stage A->B->C flow already authorized on card e840c072, no per-PR check-in needed; STOP-SHIP dependency already holds it until Stage A finishes + 2026-07-08
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

**[P0] Golden-address alignment smoke test (Cornyn / healthcare_affordability) — defense-in-depth on the drift guard**
- The defense-in-depth layer Muxin sequenced AFTER the deploy-time drift check (DECISION 2026-06-28: "layer the golden-address smoke on top once the drift check lands"). The drift check shipped in PR #179.
- Assert that a known real address/candidate returns NON-EMPTY alignment so a silent data-blank is caught even when the schema is technically present. Anchor: John Cornyn (TX Senator) + healthcare_affordability — lookupAlignment() should return { found: true, total >= 1, contributingVotes.length > 0 } (~18 healthcare votes observed at incident time). resolveCandidateId() already handles "Cornyn."
- WHERE it runs — RESOLVED 2026-06-30: run against the **Neon test branch** in the new test-env (the "seeded test DB" option; that's why this card DEPENDS ON the test-env card). The heavier alternative (post-deploy prod smoke) is set aside. The drift check (PR #179) already covers the "prod behind a migration" class; this catches "schema present but data empty."
- NEW infra, not a quick add.
- STATUS: To Do
- DEPENDS ON: We need a deployment/test environment/server/branch?
- GROOMED: ready: exact assertion spec (Cornyn/healthcare_affordability) on card; test-env dep already linked + 2026-07-08
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
- DECISION (Muxin, 2026-07-08, via card 6aa18301): this is an ops toggle, not go-live-gated — flip it ON now. ACTION: set `CHAT_USAGE_METRICS_ENABLED=true` in Vercel prod env, then redeploy (env changes only take effect on a fresh deployment) — then confirm rows start appearing in `chat_usage_metrics`.
- ATTENDED: Vercel dashboard check + env flip (out-of-band).
- Follow-up from card c160abf1-890d-4222-a8f6-6ee21b70ea29 '[P1] API usage hits limits but no details why' (auto-filed 2026-07-01).
- STATUS: To Do
- DECISION: defer (unattended) — pure Vercel dashboard env-flip + redeploy, no code to build; ATTENDED out-of-band action for Muxin
- GROOMED: ready: single clear Vercel-dashboard check, ATTENDED + 2026-07-08
- PARKED: needs Muxin: confirm CHAT_USAGE_METRICS_ENABLED flipped ON in Vercel prod + redeployed (no code change, dashboard-only) 2026-07-08
<!-- card-id: 7eb03d21-f494-4bd8-8ea7-7cc2409786a5 -->

**Build a lightweight admin/ops view over chat_usage_metrics**
- Data is captured (chat + research, content-free) but there is no dashboard/query surface to see call counts / token totals / spend-by-callKind over time.
- The original 'no visibility into why usage spikes' complaint is not closed until Muxin can look at this without hand-writing SQL via db-exec.ts.
- Follow-up from card c160abf1-890d-4222-a8f6-6ee21b70ea29 '[P1] API usage hits limits but no details why' (auto-filed 2026-07-01).
- STATUS: To Do
- DEPENDS ON: Verify CHAT_USAGE_METRICS_ENABLED is actually turned on in prod
- GROOMED: ready: clear scope (query surface over chat_usage_metrics), dep already linked + 2026-07-08
<!-- card-id: 6247a0dd-a376-402e-95c4-f27dd8682448 -->

**[P2] Translate CAN2026 curated-context section in RepCard (CanContextSection/RATING_LABELS)**
- English-only today; renders nothing until the CAN2026 ingest runs (display also gated by CAN2026_DISPLAY_ENABLED). Translate when that surface ships.
- Follow-up from card 7855fddd 'Finish Spanish coverage for remaining redesign surfaces' (auto-filed 2026-07-01).
- STATUS: In Progress
- GROOMED: ready: narrow translation task, named component/strings + 2026-07-08
<!-- card-id: 2c177f54-c10f-422c-be20-1e9d28d578a3 -->

**Render member stock transactions in the UI**
- Member profile / candidate card influence section reading member_stock_transactions: ticker, asset, buy/sell, amount RANGE (never a point estimate), txn + disclosure dates, official filing link. Sanitize/validate filing_url before rendering as href (security review note: value originates from an unauthenticated community dataset).
- Follow-up from card f4ed7ab6 '[P2] Include stock transactions' (auto-filed 2026-07-02).
- STATUS: To Do
- DEPENDS ON: Apply migration 0013 and run stock-transactions ingest live (ATTENDED)
- GROOMED: ready: specific fields + sanitize-filing_url note on card, dep already linked + 2026-07-08
<!-- card-id: 8b17a03a-6818-46d0-822f-240b789df27b -->

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
- STATUS: To Do
- DEPENDS ON: Classify CHAT_USAGE_METRICS_ENABLED: go-live flip vs ops toggle
- GROOMED: ready: 4 named flags + helper module, additive/no-behavior-change + 2026-07-08
<!-- card-id: 73ed075e-337d-44c3-b853-8124617b6a83 -->

**Re-check the language set against the 2026 VRA §203 determination once published**
- This spike used the 2021 Census §203 determination (latest as of 2026-07-02). The next determination is expected ~Dec 2026 (5-yr cycle). If the translation BUILD lands after it publishes, re-verify the language list + jurisdiction counts before shipping.
- Informational/timing-dependent. Follow-up from spike d885108b (auto-filed 2026-07-02).
- STATUS: Backlog
- DEPENDS ON: none
<!-- card-id: 88ede995-4678-4df1-ad1a-ae3e588ac188 -->

**[P2] Baseline analysis of chat_usage_metrics — verify the "most usage is the issues step" assumption**
- Traces to the open core of "[P1] API usage hits limits but no details why": "My core assumption is most people will NOT engage with the research chatbot... most usage should only be at the issues step" and "We need to be able to understand how Haiku is being used in each session to understand if its usage is related to behaviors." The CAPTURE half (that card's PR + the #151 research-sub-agent fix), the prod-flag verification, and the ops view are all separately filed — but no card actually runs the analysis and answers the question.
- TASK: once metrics are flowing in prod, query >=7 days of `chat_usage_metrics` (read-only, via scripts/ops/db-exec.ts) and write a short findings note: per-endpoint call/token breakdown, share of sessions that touch the research chatbot vs. issues-step parsing only, top-N sessions by tokens, and any anomalous sessions (unusually high call counts or token totals).
- Explicitly confirm or refute the stated assumption, and establish the post-PR-#177 baseline (the Sunday-cron drain is already stopped) so a future "credits used up" email can be attributed from data instead of guesswork.
- Content-free data only (counts/tokens/endpoint/timestamp per the 2026-07-01 DECISION) — no message text, no PII in the note.
- Read-only against prod; no schema change, no deploy, no app code. DEPENDS ON: Verify CHAT_USAGE_METRICS_ENABLED is actually turned on in prod.
- GOAL_CONDITION: A findings note exists quantifying >=7 days of prod chat_usage_metrics — per-endpoint calls/tokens, research-chat vs issues-step session share, top-N sessions by tokens, anomalies flagged — and explicitly confirms or refutes the "most usage is the issues step" assumption; no app code, schema, or prod data changed.
- ORIGIN: proposed by propose-cards 2026-07-02 from epic [P1] API usage hits limits but no details why (c160abf1-890d-4222-a8f6-6ee21b70ea29)
- STATUS: To Do
- GROOMED: ready: explicit GOAL_CONDITION + dep already on card + 2026-07-08
- PARKED: blocked: needs CHAT_USAGE_METRICS_ENABLED confirmed ON in prod (7eb03d21, ATTENDED) + >=7d of data before analysis can run 2026-07-10
- LANE: e
<!-- card-id: b36e8fb9-bfdf-4df6-8667-557c537f87c9 -->

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

**Anonymous chat-cost telemetry undercounts multi-round turns (recordChatUsage sees only the last round)**
- - Follow-up from 9596413f (per-round budget recording): while fixing recordUsageAsync to record every round, found that recordChatUsage (the separate anonymous per-request cost-telemetry table) has the same root-cause bug and was deliberately left alone (out of this card's scope, which was specifically recordUsageAsync/the durable budget store).
- WHY: usage.input/output/etc. in the /api/chat streaming loop are OVERWRITTEN by each round's message_start/message_delta (each round is an independent Anthropic API call), not accumulated. recordChatUsage is still called ONCE at the very end of the turn with whatever usage holds at that point — i.e. only the LAST round's numbers. A multi-round tool-use turn silently undercounts its true cost in this telemetry table (earlier rounds are dropped), though the real durable budget spend is now correct (fixed in 9596413f).
- TASK: give recordChatUsage the same per-round treatment — call it once per round (or accumulate a separate running total across rounds and call it once at the end with the true sum) so the telemetry table reflects real per-request cost for multi-round turns.
- GOAL_CONDITION: a simulated 2-round tool-use chat turn records a recordChatUsage total (or per-round sum) equal to round1 + round2 tokens, not just round2 (unit test).
- Originating card: Record chat usage incrementally per round (close the TOCTOU budget race fully) (9596413f-ebcb-49c0-a3e2-21bb3e3d5bff).
- CHAIN: 1
- STATUS: Review
- GROOMED: ready: explicit GOAL_CONDITION + fix approach on card + 2026-07-08
- LANE: d
<!-- card-id: 11f15795-97fa-4e3d-a4a0-3dff5d8392dd -->

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
- REJECTED 2026-07-09 (Muxin): the held PRs under this epic (#230/#236/#237/#240/#243) were self-vetted by code-reading agents before the STOP-SHIP false-pass discovery (card e840c072) and are not trusted as-is. None of them — nor anything else under this epic — is called Done until it's re-validated against the FIXED parity gate (post Stage-A) AND Muxin's own side-by-side visual sign-off (design intent vs. what's actually in the repo), same methodology as e840c072's validation step. No visual Keystone work skips this gate. This does not change the card's own DEPENDS ON below — it stays blocked until b7c7178d resolves, and b7c7178d itself is now blocked on e840c072.
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
- REJECTED 2026-07-09 (Muxin): same rejection as sibling epic d83cf5ec — the 5 held PRs this epic's Phase 6 resumes (#230/#236/#237/#240/#243) were self-vetted before the STOP-SHIP false-pass discovery and are not trusted. Phase 6 does not resume, and this card does not go Done, until it's re-validated against the fixed parity gate (e840c072) AND Muxin's own side-by-side visual sign-off. No visual Keystone work skips this gate.
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

**Seed synthetic Polis response-vector data for local manual QA**
- Muxin asked (2026-07-07, reviewing PR #234): "can we create data for Polis so we can test out the UI?" A fresh local dev DB shows the zero-participant StandingLocked state, not the populated consensus report/personalized-stat/zoom-toggle experience. TASK: write a script (scripts/dev/seed-polis-data.ts or similar) that inserts a realistic batch (~100-150) of synthetic polis_response_vectors rows spread across a few states, into the LOCAL dev DB by default, so the existing built Polis states can be clicked through manually with real-looking numbers.
SCOPE NOTE: this only helps test what's ALREADY built (the party-free overlap cloud, personalized stat, zoom toggle, low-N/zero-N honest states). It does NOT unlock PolisStand (the blind-voting step - doesn't exist in code regardless of data, see card fb77d0bb) or change the bridging-threshold methodology (60%-per-party-group vs 80%-population, see card e2455f56).
GOAL_CONDITION: running the seed script against local dev, then loading the Polis screen in a browser, shows the consensus report + personalized stat + zoom toggle with non-zero realistic numbers.
ORIGIN: Muxin, live review of PR #234, 2026-07-07
- STATUS: To Do
- DEPENDS ON: [P0] We need a deployment/test environment/server/branch?
- GROOMED: ready: explicit GOAL_CONDITION + scope note on card + 2026-07-08
- LANE: c
<!-- card-id: 337ad25a-56ce-4e4a-9876-5c826a110ca5 -->

**[P2] Port the intake conversation shell (composer/chips/chat) onto the Keystone .iq-* CSS system**
- ORIGIN card c1a43c39 (Intake locked state confirm screen, PR #236): the intake conversation shell (IntakeView/IssueConversation composer + chips + chat bubbles) still rides on public/prototype.css older .coldopen/.themes-card classes, not the canvas .iq-* system — HANDOFF-EXACT-MATCH.md section 9 already flags this surface as VERIFY/not-yet-ported. This is a class-system port (visual), distinct from the specific additive UI gaps already tracked in cards 61e728fb (step-context strip + serif headline) and 5750087f (quick-replies) — those add new elements, this is the underlying CSS/class migration for what already exists.
CHAIN: 1
- STATUS: Backlog
- DEPENDS ON: Intake locked state: is IntakeLocked meant to ship as its own screen?
<!-- card-id: a545f45d-4e3c-46b3-85df-507402c66c3f -->

**[P1] Rebuild i18n on a scalable locale pipeline + build out the full VRA §203 language tier**
- Traces to Muxin's 2026-07-08 ruling on "Muxin sign-off on the shipped translation-set tier(s)" (c981fa96): build every language we reasonably can, not a fixed short list — but the CURRENT architecture (src/lib/translations.ts, ~2000 lines of hand-authored en/es TS objects, Language = "en" | "es" hardcoded, consumed via src/lib/i18n.tsx) can't scale to N languages without linear per-language authoring effort and drift risk.
- TASK: replace the hardcoded TS objects with a locale-resource pipeline — one canonical source-of-truth (e.g. locales/en.json), a real i18n loader (e.g. next-intl, since this is a Next.js App Router app) instead of the hand-rolled src/lib/i18n.tsx context, and a generation script (mirroring the existing sync:ballot-prompt precedent) that diffs en.json against each target locale and machine-translates only new/changed keys — so adding a language is "run the script," not "hand-write a ~700-line file."
- SCOPE: build out the full VRA §203 tier once the pipeline exists — Chinese, Vietnamese, Korean, Tagalog (Spanish already ships). The AI system-prompt variants (ballotPromptEn.generated.ts / ballotPromptEs.generated.ts) are HIGHER-STAKES than UI copy (they're instructions to the model, not just display strings). Muxin will NOT be reviewing translations by hand (2026-07-08) — so build an automated fidelity check into the generation script itself (e.g. back-translate each generated prompt variant to English and diff against the original for meaning-preserving equivalence, or a dedicated LLM-judge pass checking the translated instructions still say the same thing) rather than gating on a human eyeball.
- Sequencing: still blocked on the redesign landing (don't extract/translate strings that are still changing) — same as the parent "Translations to major languages" epic.
- GOAL_CONDITION: en.json is the single source of strings (no duplicate hand-authored per-language TS objects); adding Chinese/Vietnamese/Korean/Tagalog requires running one script, not hand-editing N files; app renders correctly end-to-end in at least one newly-added language.
- ORIGIN: Muxin, 2026-07-08 (language-tier + i18n-architecture ruling)
- STATUS: To Do
- DEPENDS ON: Phase 1 UX/UI finalized (redesign complete)
- GROOMED: ready: concrete architecture + scope + GOAL_CONDITION, blocked on redesign landing (normal dependency wait) + 2026-07-08
<!-- card-id: c846efa0-c6ab-4cea-a04f-398674069470 -->

**[P2] Add a machine-translate fallback (e.g. Google Translate widget) for languages beyond the curated tier**
- Traces to Muxin's 2026-07-08 ruling: for any language outside the curated/reviewed tier (VRA §203 set), don't hand-build a dedicated locale — offer a lightweight machine-translate affordance instead (e.g. the embeddable Google Translate widget, or an on-demand call to a translation API) so the app isn't EN-only for everyone else.
- TASK: evaluate the Google Translate "Website Translator" widget (or an equivalent client-side/API approach) for coverage, quality caveats on civic/legal terminology, accessibility (ARIA/screen-reader interplay), and whether it can be scoped to skip the AI chat surfaces (machine pre-translating a live LLM conversation is a different, riskier problem than translating static UI copy).
- Explicitly NOT a substitute for the curated §203 tier — those get real, reviewed translations via the new i18n pipeline; this is the safety net for everything else.
- GOAL_CONDITION: a visitor whose browser/OS language isn't in the curated tier sees a visible, working "translate this page" affordance; the curated-tier languages are unaffected (no double-translation).
- ORIGIN: Muxin, 2026-07-08 (language-tier ruling)
- STATUS: To Do
- DEPENDS ON: Rebuild i18n on a scalable locale pipeline + build out the full VRA §203 language tier
- GROOMED: ready: concrete scope + GOAL_CONDITION, blocked on the i18n-architecture card (normal dependency wait) + 2026-07-08
<!-- card-id: 78d00750-2a39-4c3b-8330-0f89ca46e2f8 -->

**Verify MPI LEP-population figures directly before external citation**
- migrationpolicy.org's LEP-by-language chart returned HTTP 403 to automated fetch; the Chinese/Vietnamese/Korean LEP figures (1.6M/850K/630K) came from corroborated search snippets, not a primary fetch. Manual browser check before citing externally (PR desc / public doc).
- Follow-up from spike d885108b (auto-filed 2026-07-02).
- STATUS: To Do
- GROOMED: ready: single manual browser-check task, ATTENDED + 2026-07-08
- PARKED: ATTENDED: automatable research follow-up done + merged (PR #255, docs/research/vra-203-language-set-spike.md); the literal MANUAL browser visit to migrationpolicy.org (blocked by 403 to every automated tool) still needs a human before external citation — needs Muxin 2026-07-10
- LANE: e
<!-- card-id: 4268c35d-e72f-49bf-bd18-b41afde0b67c -->

**[P2] BUILD: Civic-org positions (Track A) + lobbying issue-context (Track B)**
- Ingest FD 'Positions Held Outside U.S. Government' per member (bioguide-keyed) and LDA LD-2 issue-level lobbying context (client x issue x chamber, NOT member-keyed).
- RESOLVED (Muxin, 2026-07-08): the spike (docs/research/civic-orgs-lobbying-spike.md, 2026-07-01) already found data we CAN use for both tracks — this isn't blocked on new legal research, it already has a safe path:
  - **Track B (lobbying issue-context) ships first, no legal question at all** — the LDA API (lda.gov) is a statutorily-mandated public dataset with a clean attribution-only license, no EIGA/commercial restriction. Only open item is labeling: always frame as "X lobbied the [chamber] on [issue]," never implying a specific member was contacted (LD-2 filings never name an individual member).
  - **Track A (civic-org positions) ships citation-linked** — 5 U.S.C. app. 4 § 105(c) restricts commercial/solicitation use of FD data, which is genuinely ambiguous for this app; the spike's own mitigation is to build read-only and always link back to the official filing (never claim to be the disclosure of record) — the same "disclosure not accusation" pattern already used for donor/stock-transaction data elsewhere in this app. Source: Senate EFD e-filed HTML (cleanest, no OCR) + House Clerk PDF text-extraction as fallback. Do ONE live check of OpenSecrets Personal Finances currency (a `memPFDprofile` API call or bulk-CSV pull) before deciding whether to use it instead of raw-portal parsing — public evidence suggests it may be stale (no 118th/119th Congress data found).
  - Housekeeping: docs/research/civic-orgs-lobbying-spike.md exists only in a side worktree, never committed to main — re-add it when building this so the citations above are traceable.
- GOAL_CONDITION: Track B — `lobbying_issue_activity` table (client × issue-area × chamber × quarter) populated from lda.gov, rendered as issue-level context only, never attached to an individual member. Track A — `member_civic_positions` table (bioguide-keyed) populated from Senate EFD/House Clerk filings, every surfaced position links to its official source filing.
- CI NOTE: PR #257 merged 2026-07-10, CI green. deploy.yml FAILING (repo-wide, unrelated to this card) — Playwright headless_shell missing in scripts/design/capture-shared.test.ts, broken since 2026-07-08 19:48 across 15+ consecutive main deploys. Card left at Review pending that fix; not merge-blocked, deploy-blocked.
- STATUS: Review
- GROOMED: ready: spike already found a usable path for both tracks (Track B clean/no-legal-question, Track A citation-linked mitigation) — no longer blocked on undecided legal research + 2026-07-08
- LANE: c
<!-- card-id: f5eaa16c-a84e-4a38-8ea2-31cf23d4e156 -->

**Build the Track A civic-positions ingest (Senate EFD / House Clerk) — schema already shipped**
- FOLLOW-UP from f5eaa16c (PR #257): Track A shipped SCHEMA-ONLY. The member_civic_positions table + drizzle schema are live on main, but the ingest script was deferred because efdsearch.senate.gov returned "Site Under Maintenance" on every live verification attempt during the build (repeated POST to /search/report/data/, confirmed via curl) — did not want to ship a scraper against unseen markup.
- TASK: once efdsearch.senate.gov is reachable, build the Senate EFD ingest (cleanest, e-filed HTML, no OCR) with House Clerk PDF text-extraction as fallback, populating member_civic_positions (bioguide-keyed). Per the accepted decision on f5eaa16c: citation-linked — every surfaced position links to its official source filing (the "disclosure not accusation" pattern). Do ONE live currency check of OpenSecrets Personal Finances (memPFDprofile API or bulk CSV) before deciding raw-portal parsing vs OpenSecrets.
- GOAL_CONDITION: member_civic_positions populated from Senate EFD/House Clerk filings; every row carries a link to its official source filing; spot-check a sample against the live portal.
- ORIGIN: deferred sub-task of f5eaa16c, 2026-07-10 (Senate EFD under maintenance during build)
- STATUS: Backlog
<!-- card-id: b9d7325b-9a79-4c34-9772-fd4dc9e3a965 -->

**[P1][GATE] Gate can PASS on visual-only evidence — close the false-pass class**
- ORIGIN: 2026-07-10, surfaced while validating the crop fix (#261). Same class as STOP-SHIP e840c072's remediation (05a/06/08d got structural probes; these didn't — the crop bug was masking them by failing them).
- FINDING: ~11 automatable scenarios have ONLY the visual check (no structural/content probe). The downscaled visual diff is copy/detail-tolerant, so a different-but-similarly-massed light page passes. Confirmed live false-passes on unbuilt pages: 04-scorecard, 10c, 10d (different screens, ratio ~0.05). 08c-privacy passes visually with a missing dek (copy invisible).
- FIX: guard so no scenario reports OVERALL PASS on visual-only evidence (needs a passing structural OR content probe). Drops overall PASS 16→~5 until real probes are written for the genuine visual-only matches — honest lower tally. Each page built the Tip-Jar way closes its own hole via its ContentProbe.
- GOAL_CONDITION: no automatable scenario reports OVERALL PASS on visual-only evidence; 04/10c/10d correctly FAIL; 08c copy verified.
- BLOCKS: flipping parity-gate to a "required" GitHub check — don't make it required until this lands.
- STATUS: To Do
- DEPENDS ON: [P0][GATE] STOP-SHIP: Fix the design-fidelity pipeline + rebuild the design-review artifact (no Keystone build/merge until Done)
<!-- card-id: 605c7695-8377-4607-9d17-874e90a8aa82 -->

**Investigate a stronger per-row idempotency key for stock transactions**
- buildExternalId uses a composite string key (dataset+filing+ticker+description+date+type+amount+owner) — neither source carries a per-row id. Measure real collision rate after first live ingest; decide if parsing official PDFs for a row index is warranted.
- Follow-up from card f4ed7ab6 '[P2] Include stock transactions' (auto-filed 2026-07-02).
- STATUS: Done
- DEPENDS ON: Apply migration 0013 and run stock-transactions ingest live (ATTENDED)
- DECISION: INVESTIGATED 2026-07-10 (first live ingest, 14,466 rows): collision rate 176/14,466 = 1.2%, across 150 externalId groups. Instrumented measurement: 108 groups byte-identical duplicates (source listed the same txn twice) + 42 groups differ ONLY in a non-key field (disclosure_date / asset_type variance = same economic txn, minor metadata diff). ZERO genuinely-distinct transactions collapsed. RECOMMENDATION: parsing source PDFs for a per-row id is NOT warranted — it would recover 0 real rows for large effort. Composite key is sufficient. Close unless Muxin wants the PDF-index path anyway.
- GROOMED: ready: clear measurement task, dep (live ingest) already linked + 2026-07-08
<!-- card-id: 5b6b24e5-0880-46a7-bd9f-bcff81b62c3b -->

**[P2] Spot-check ingested stock transactions against the official House/Senate disclosure portals**
- Traces to "[P2] Include stock transactions" PLAN: "House/Senate Stock Watcher community datasets ... via public S3; spot-check vs the official portal" — the ingest, UI render, idempotency, and dataset-liveness monitor cards are filed, but no card validates our ingested rows against the authoritative filings.
- TASK: after the live ingest runs, sample >=20 rows from `member_stock_transactions` across >=5 members (both chambers) and compare each field — member, ticker, buy/sell, amount RANGE, transaction date, disclosure date — against the matching PTR on disclosures-clerk.house.gov / efdsearch.senate.gov.
- Output a short findings note: per-field match rate, every discrepancy listed, and an explicit go/no-go on trusting the Stock Watcher path for the UI render card. Complements (does not duplicate) the ongoing dataset-liveness monitor card: this is one-time row-level accuracy validation of OUR ingested data.
- Read-only against prod (scripts/ops/db-exec.ts); no schema change, no app code, no prod write. DEPENDS ON: Apply migration 0013 and run stock-transactions ingest live (ATTENDED).
- GOAL_CONDITION: A findings note exists comparing >=20 sampled member_stock_transactions rows (>=5 members, both chambers) field-by-field against the official House/Senate portal filings, with per-field match rates, all discrepancies enumerated, and an explicit go/no-go for the UI render card; nothing in prod is modified.
- ORIGIN: proposed by propose-cards 2026-07-02 from epic [P2] Include stock transactions (f4ed7ab6-bc45-482d-84d6-6bf014b2d355)
- STATUS: Done
- DEPENDS ON: Apply migration 0013 and run stock-transactions ingest live (ATTENDED)
- DECISION: RESOLVED — GO (Muxin ratified 2026-07-10). Spot-check of 14,290 rows passed integrity + provenance: 0 amount_low>amount_high, 0 null filing_url (citation requirement met), filing URLs reachable (House PDFs 200; Senate EFD 302 session-gate = valid), host allowlist held perfectly. Source-data anomalies (garbage-in, not ingest bugs): 17 rows/0.12%% with impossible dates — now filtered at ingest time by PR #264 (hasImplausibleDates). Dedup verified 0 real loss (see 5b6b24e5). DECISION: accept this integrity+reachability GO as sufficient; DO NOT build the full per-field-vs-parsed-PTR comparison (House PDF OCR) NOR a structured-source cross-reference — the community datasets ARE the already-parsed-PDF data, so re-validating is largely circular and not worth the effort. Stock Watcher path is trusted for the UI render card 8b17a03a.
- GROOMED: ready: explicit GOAL_CONDITION + dep already on card + 2026-07-08
- LANE: e
<!-- card-id: 997c2d64-7248-49d4-8452-a520396dc386 -->

**Apply migration 0013 and run stock-transactions ingest live (ATTENDED)**
- Apply db/migrations/0013_add_member_stock_transactions.sql to prod (additive — db-exec.ts --file ... --yes per convention), then DATABASE_URL=<neon> npx tsx scripts/ingest/stock-transactions.ts --live; verify row counts + spot-check members against official filings.
- Follow-up from card f4ed7ab6 '[P2] Include stock transactions' (auto-filed 2026-07-02).
- GOAL_CONDITION: member_stock_transactions populated in prod (count > 0), spot-checked sample matches source PTRs, no batch aborts in the run log.
- STATUS: Done
- DEPENDS ON: Add per-row bounds/chunking + filing_url host allowlist to the stock-transactions ingest (security-review follow-up)
- DECISION: approved (Muxin, 2026-07-08) — run the migration + live ingest. Security hardening (bounds/chunking, filing_url allowlist) tracked as its own follow-up card (a3fbfc79) rather than inline prose — depends on it so a bad row can't abort the batch. Consolidates duplicate card 7d78e3d2 (same action, closed as duplicate).
- GROOMED: ready: migration + ingest steps concrete, dedup + security dependency resolved, DECISION approved + 2026-07-08
<!-- card-id: 8a1edadb-7e91-4194-a37c-677f6c87e22d -->

**[P1][GATE] Fix parity-gate crop detection — false-FAILs on narrow-card scenarios**
- ORIGIN: 2026-07-10, under STOP-SHIP e840c072. About/How-it-works were visually approved but the gate's visual check still reported FAIL (~0.35).
- ROOT CAUSE: detectContentBBox required a bright run ≥50% of the fixed 1600px lightbox frame; the lightbox scales tall artboards to a narrower card (~340–730px) → every row rejected, crop skipped, dark chrome left in the diff → ratio inflated to ~0.28–0.52 on matching pages.
- FIX: PR #261 (squash bbca0b44) — key the row/col threshold off the card's own detected width + a 0.15-of-frame floor.
- RESULT (full design:parity-gate --all, identical screenshots): 6 genuine false-FAILs flip visual→PASS (04-scorecard, 08a-about, 08b-howitworks, 08c-privacy, 10c, 10d); 02d/07-whynow/09d stay FAIL with honest lower ratios; 18 already-cropping scenarios byte-identical. Threshold 0.18 well-calibrated (matches 0.01–0.08, gaps 0.23–0.32).
- EVIDENCE: https://claude.ai/code/artifact/48567741-d01c-420f-94d3-075337a6eb23
- STATUS: Done
<!-- card-id: 25b697b7-354b-408d-8630-af48c95891ca -->

**Fix singular deadline bug in stateInfo.deadlineStatus (n=1)**
- - stateInfo.deadlineStatus(days) at src/lib/translations.ts:655 (EN) and :1349 (ES) has the identical n=1 pluralization bug fixed in deadline.daysLeft: renders "1 days left"/"Quedan 1 días" at n=1. Currently only asserted with days=5, so untested at n=1.
- FIX: same n===1 singular branch as deadline.daysLeft; add a unit test at n=1 for both locales.
- Originating card: 975bc054 Fix singular deadline label copy (found during its build).
- CHAIN: 3
- STATUS: Done
- GROOMED: ready: exact file/line fix + test spec on card + 2026-07-08
- LANE: e
<!-- card-id: 0400c20b-462e-413f-b27b-d80772e6dc82 -->

**Add per-row bounds/chunking + filing_url host allowlist to the stock-transactions ingest (security-review follow-up)**
- Traces to the security-review findings on card f4ed7ab6 that were never split into their own card: (a) batch upsert aborts wholesale on one oversized/out-of-range row (numeric(14,2) overflow, btree external_id size) — add per-row bounds checking + chunking so one bad row doesn't drop the whole batch; (b) filing_url is dataset-controlled and silently overwritable on upsert conflict — add a host allowlist and/or change-alerting before it's trusted for rendering (also referenced on card 8b17a03a, "Render member stock transactions in the UI").
- TASK: (a) add per-row validation/bounds-checking + chunked upserts to scripts/ingest/stock-transactions.ts; (b) add a host allowlist (or equivalent validation) for filing_url before persisting/rendering it.
- GOAL_CONDITION: a synthetic oversized/out-of-range row no longer aborts the whole batch (only that row is skipped/logged); filing_url is validated against an allowlist (or otherwise sanitized) before being persisted.
- ORIGIN: split out from "Apply migration 0013 and run stock-transactions ingest live" per Muxin's 2026-07-08 ruling (fix it, but track separately as its own follow-up).
- STATUS: Done
- GROOMED: ready: two named fixes (bounds/chunking, filing_url allowlist), exact file + GOAL_CONDITION on card + 2026-07-08
- LANE: d
<!-- card-id: a3fbfc79-dc2f-44a8-a9eb-64c33046777e -->

**Monitor Stock Watcher dataset liveness + provenance**
- Card's original S3 bucket URLs returned 403 (2026-07-02); ingest now points at community GitHub-hosted JSON (mutable branch tips, no pinning/checksums, no LICENSE published). Add a lightweight liveness/anomaly check before this becomes a scheduled job; consider pinning or diff-alerting (security review low findings).
- Follow-up from card f4ed7ab6 '[P2] Include stock transactions' (auto-filed 2026-07-02).
- STATUS: Done
- GROOMED: ready: clear scope (liveness/anomaly check, pinning or diff-alerting) + 2026-07-08
- LANE: d
<!-- card-id: cde905bb-d0e8-42f9-9e3b-2c3fd64d9246 -->
