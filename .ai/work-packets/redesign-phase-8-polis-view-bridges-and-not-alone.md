# Work Packet: redesign-phase-8-polis-view-bridges-and-not-alone

Status: **UI shipped; data pipeline (8b) deferred** — `PolisOverlay` UI was rebuilt as part of the 2026 redesign rollout (PRs #34–43 + `8be27ff` `PROMPT_FLEET_V2` flag flip), deployed to production at `688f718`. The view surfaces an honest empty state until the Phase 8b SQL aggregate pipeline (priority-overlap bars + bridge statements) lands and the ~150 in-county finished-sessions threshold is met for the named-cluster compass. Phase 8b remains open. See `docs/REDESIGN_2026_SHIPPED.md`.
Owner: orchestrator
Source: docs/design/2026-redesign/README.md §5 — Phase 8 (Polis view: bridges and "you're not alone" first)
Branch: launch/production

## Intent

Update `PolisOverlay` to show three readings of the user's county: (a) priority-overlap bars — "of voters in your county, X% also ranked [theme] in their top four"; (b) bridge statements — items where 80%+ of every cluster agreed; (c) named-cluster compass with cluster names describing shared priorities, not party labels. Bars and bridge statements ship first (SQL aggregates, no ML). Compass requires ~150 in-county finished sessions to cluster meaningfully and hides until threshold met.

## Original User Intent

From `docs/design/2026-redesign/README.md` §5 Phase 8: "Update `PolisOverlay` to show three readings: (a) priority-overlap bars — 'of voters in your county, X% also ranked [theme] in their top four'; (b) bridge statements — items where 80%+ of every cluster agreed; (c) named-cluster compass with cluster names describing shared priorities, not party labels."

And from the design brief §11 ("The Polis view, made to say something"): "The current scatter — Dem / Rep / Open dots placed at random — has no information density. A random plot teaches nothing. A real Polis view says: 'here's what you share with strangers in this county, here's where consensus crosses partisan lines, and here are the shapes of how people actually cluster.'"

## Intent Interpretation

The current Polis view is a random scatter that conveys no information. The redesign replaces it with three concrete readings, each making a claim:

1. **"You're not alone" priority-overlap bars.** For each of the user's 4 ranked themes, show what percentage of finished sessions in their county also ranked that theme in their top four. SQL aggregate; no ML; ships first.
2. **Bridge statements.** Statements where 80%+ of every cluster agreed, regardless of partisan lean. Headline insight ("Members of Congress should not trade individual stocks while in office — 93% Service-first, 89% Pocketbook moderates, 94% Civic libertarians"). Again, SQL aggregate; no ML; ships first.
3. **Named-cluster compass.** PCA over priority ranks + agree/disagree statements; two highest-variance components as axes; post-hoc-labeled clusters by their shared top priorities (NEVER by party registration). "Unaligned" (~12-15%) is a real cluster. Requires ~150 in-county sessions to cluster meaningfully; hide until threshold met.

Bars and bridges are the first ship. Compass follows once data accumulates. No identity stored — only counts.

Phase 8 depends on Phase 2 (themes data) and Phase 3 (decisions/agreements from chat). It produces a separate visual surface — likely on a dedicated route or pane — that pulls aggregate data from a new server endpoint.

## Business Logic

Rules:

- Three readings, each independently shippable: overlap bars, bridge statements, named-cluster compass. Ship bars + bridges first.
- Overlap bars: per-theme "of voters in your county, X% also ranked [theme] in their top four." Computed via SQL aggregate over the sessions table (no ML).
- Bridge statements: agree/disagree statements where 80%+ of every cluster agreed. SQL aggregate; clusters are post-hoc-labeled (no live ML required for bridges if cluster labels are stored on session rows).
- Named-cluster compass: PCA over priority ranks + agree/disagree statements; two highest-variance components as axes; clusters labeled by their shared top priorities, never by party registration. Hide until ~150 in-county finished sessions exist.
- "Unaligned" is a real cluster (typically 12-15%). Do not force every dot into a named group.
- No identity stored. Only counts. No `user_id` or session-PII in aggregate queries.
- Honest empty state: when in-county session count is below threshold for the compass, show "not enough data yet — N of 150 sessions needed." Bars/bridges may still render if threshold is lower for those (TBD).
- The Polis view is **opt-in or post-decision**: it surfaces after the user has decided enough to have meaningful priorities/agreements. Doesn't compete with workspace focus.
- Cluster naming: post-hoc by an analyst or by a deterministic algorithm based on top-3 shared priorities ("Service-first progressives," "Pocketbook moderates," "Civic libertarians," "Unaligned"). Never partisan.

Assumptions:

- The sessions table or an equivalent persistence layer stores finished sessions with theme ranks and agree/disagree responses. If not, this packet's scope expands to define the persistence schema as well — which is non-trivial.
- The county-level aggregate queries can be served by the existing Postgres / DB layer with new endpoints in `src/app/api/polis/route.ts`.
- PCA can run server-side via a simple numerical library or pre-computed offline; live PCA on every request is unnecessary.

User-confirmed decisions:

- Bars + bridges ship in v1. Compass deferred until ~150 sessions/county.
- Persistence of finished sessions: relies on existing infrastructure if present; if not, this packet narrows to bars (which need only the priorities table) and surfaces "compass / bridges require session storage" as a follow-up.

Edge cases:

- User's county has zero finished sessions: bars empty; show "no data yet — your session will be the first counted." Bridges/compass also empty.
- User's county has some sessions but below threshold: bars/bridges render; compass hidden with honest "not enough data."
- A theme on the user's list has never been ranked by anyone else (rare in a populated county): bar shows 0% with explicit "you might be the first" framing.
- Bridge query returns zero statements (no statements have 80%+ agreement across all clusters): show "no bridge statements yet — needs more data" not an empty list.
- Cluster labels become stale (analyst hasn't relabeled in a long time): show timestamp; OK to ship slightly stale labels.
- The aggregation query is slow (>2s): show loading state; cache server-side with a short TTL.
- A user moves between counties mid-session: the Polis view re-queries for the new county.

Out of scope:

- Real-time clustering on each request (offline / scheduled compute).
- Per-state Polis views (county-scoped only in v1).
- Cross-cycle longitudinal analysis (this cycle's data only).
- Influencer / engagement metrics (Polis is an aggregate civic insight tool, not a social-media analog).
- User-submitted statements for clustering (use a fixed statement list curated by the project).

## Commercial Readiness

Applicability: launch (but compass is gated by data accumulation)

Lanes in scope:

- product UX (a new visual surface)
- accessibility/responsive (bars, statements, compass each must be readable to screen readers — narrative alternatives where the visual is the data)
- privacy/data (no identity stored; only counts; aggregate queries cannot return single-user data)
- API/contracts (new `/api/polis` endpoints for bars / bridges / compass)
- observability/support (logging aggregate query latency, cluster threshold gating)
- legal/compliance prompt (no recommendation / persuasion in cluster labels; honest "Unaligned" cluster preserved)

User decisions needed:

- whether to ship bars-only in v1 if session-storage isn't ready (see Assumptions). Decision: ship what's possible; defer the rest with honest "needs more data."

Assumptions:

- The session storage and persistence shape for finished sessions either exists or is acceptable scope-expansion. Worker investigates first; if missing, narrows scope.

## Operational Reproducibility

Setup:

- `npm install`

Configuration:

- DB connection (existing)
- optional `POLIS_COMPASS_THRESHOLD` env (default 150)

Provider setup:

- no new providers (uses existing DB)

Infrastructure/deployment:

- Vercel manual deploy via `deploy.yml`
- Possibly a scheduled cron (Phase 5 of design brief §15 mentions hourly updates) for cluster relabeling

Database migrations:

- possibly new `sessions_polis` view or aggregate table — if so, captured as a migration file.

Manual steps:

- After deploy: verify `/api/polis/bars`, `/api/polis/bridges`, `/api/polis/compass` endpoints return expected shapes; verify the Polis view renders bars + bridges if data exists, and the honest empty state otherwise.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — visit Polis view; assert bars render with mocked data; bridges render; compass hidden under threshold
- `bash scripts/ai-verify.sh`

Test quality:

- Aggregate query unit tests: given a known sessions fixture, expected percentages, observed match.
- Bridge query unit tests: 80%+ threshold logic.
- Compass threshold tests: hides under N, renders above.
- Cluster-label tests: ensure no party-label leakage (cluster names never contain "Democrat," "Republican," etc.).

Critical logic trigger:

- privacy (aggregate queries; no identity)
- business rule (cluster labels never partisan; "Unaligned" preserved)

## Scope

Touch:

- `src/components/PolisOverlay.tsx` — restructure into three readings (bars, bridges, compass).
- `src/app/api/polis/route.ts` — extend or split into `/api/polis/bars`, `/api/polis/bridges`, `/api/polis/compass`.
- new `src/lib/server/polis/aggregates.ts` — SQL aggregate functions for bars and bridges.
- new `src/lib/server/polis/clusters.ts` — compass logic (PCA + label lookup).
- possibly new migration / view: `sessions_polis` aggregating finished sessions with priority ranks + agreements.
- tests for aggregate queries, threshold gating, cluster-label hygiene.

Do not touch:

- `main`
- `BALLOT_PROMPT.md` / generated modules
- Cold-open UI (Phase 2)
- Workspace shell (Phase 3)
- Candidate cards (Phase 4)
- State party gates (Phase 5)
- Theme amendment (Phase 6)
- Printable PDF (Phase 7)
- Out-of-budget (Phase 9)

## Ownership Audit

Concern: county-aggregate visualizations, cluster labeling, aggregate-query privacy
Existing owner: `src/components/PolisOverlay.tsx`, `src/app/api/polis/route.ts`
Neighboring owners:

- session persistence (existing or new — investigate)
- workspace state: `src/components/BallotToolClient.tsx` (Phase 3)
- theme data shape (Phase 2)

Files/modules/docs inspected:

- `docs/design/2026-redesign/README.md` §5 Phase 8
- `docs/design/2026-redesign/Voter Choice Redesign.html` §11
- `src/components/PolisOverlay.tsx`
- `src/app/api/polis/route.ts`

Reuse/edit targets:

- Restructure `PolisOverlay.tsx` rather than replace.
- Extend `polis/route.ts` into multiple endpoints.

New owner needed: yes — `src/lib/server/polis/` directory owns aggregate logic.

Overlap/bloat risks:

- Computing the same aggregate in multiple places (bars endpoint AND a workspace pre-fetch) — cache layer.
- Cluster labels stored in code AND in a DB table — single source of truth.
- Live PCA on every request — offline / scheduled compute.

Recommendation:

- Build SQL aggregates for bars and bridges first. Compass via offline PCA + label lookup. Cache at the endpoint layer.

Execution constraints:

- Workers must NOT use party labels for clusters. Cluster names describe shared priorities.
- Workers must NOT force every session into a named cluster — "Unaligned" is real.
- Workers must NOT expose any session-level identifying data through aggregate endpoints. Counts only.
- Workers must NOT silently show "no data" — empty states are explicit honesty.
- Workers must NOT ship the compass before the threshold is met for the user's county.

## Acceptance Criteria

- `/api/polis/bars?county=X` returns per-theme overlap percentages computed from finished sessions in that county.
- `/api/polis/bridges?county=X` returns statements with 80%+ agreement across all clusters.
- `/api/polis/compass?county=X` returns cluster shape + dot positions when session count ≥ threshold; otherwise returns `{ status: "below_threshold", count: N, threshold: 150 }`.
- The Polis view in the UI renders:
  - Overlap bars with the user's themes labeled and percentages shown.
  - Bridge statements list with cluster agreement percentages.
  - Compass when threshold met, otherwise the explicit "needs N more sessions" message.
- Cluster labels in code, tests, and DB never contain partisan strings ("Democrat," "Republican," "Independent," "DEM," "REP," etc.). Asserted by lint or test.
- "Unaligned" cluster appears when the data shows it (typically 12-15%); not forced.
- Aggregate queries never return user-identifying data — only counts. Asserted by query review and test.
- `npm run lint`, `npm run test`, `npm run build` pass.
- `npm run e2e` Polis-view path passes.

## Test Plan

Maps each acceptance criterion to a test file path and the shape of the assertion. Per `docs/ai-coding-practices/guardrails/test-driven-development.md`, tests are written BEFORE implementation and the red phase is verified via `scripts/ai-tdd-red.sh`.

| AC | Test file | Test shape |
|---|---|---|
| `/api/polis/bars?county=X` returns per-theme overlap percentages from SQL aggregate | `src/app/api/polis/bars/route.test.ts` | seed test DB with known sessions fixture for county "Travis"; GET `/api/polis/bars?county=Travis`; expected: response `[{theme, percent}, ...]` where `percent` matches hand-computed value for fixture; observed: exact percentages |
| `/api/polis/bridges?county=X` returns statements with 80%+ agreement across ALL clusters | `src/app/api/polis/bridges/route.test.ts` | fixture with statement A at 93/89/94, statement B at 93/75/94; expected: response contains statement A only; observed: A present, B absent |
| Bridge threshold logic: strict 80% across every cluster | `src/lib/server/polis/aggregates.test.ts` | parameterized: `[93,89,94] → bridge; [93,75,94] → not bridge; [80,80,80] → bridge (inclusive); [79,99,99] → not bridge` | per-case pass |
| `/api/polis/compass` returns cluster shape when ≥ threshold; otherwise structured below-threshold | `src/app/api/polis/compass/route.test.ts` | with N=150 sessions; expected: `{clusters:[…], dots:[…]}`; with N=50; expected: `{status:"below_threshold", count:50, threshold:150}`; observed: match |
| `PolisOverlay` renders bars with user themes + percentages | `src/components/PolisOverlay.test.tsx` | mock bars endpoint; expected: each theme label visible AND percentage text matches mocked value; observed: match |
| `PolisOverlay` renders bridge statements with cluster percentages | `src/components/PolisOverlay.test.tsx` | mock bridges endpoint; expected: list of statements each annotated with per-cluster `%`; observed: match |
| Compass hidden below threshold, honest "needs N more" message shown | `src/components/PolisOverlay.test.tsx` | mock compass endpoint with `below_threshold`; expected: compass element absent, message matches `/needs \d+ more sessions/i`; observed: match |
| Cluster labels never contain partisan strings | `src/lib/server/polis/clusters.test.ts` | iterate over all cluster labels in `clusters.ts`; expected: each label fails regex `/democrat|republican|independent|\bdem\b|\brep\b/i`; observed: zero matches |
| "Unaligned" cluster appears when emerging from data, not forced | `src/lib/server/polis/clusters.test.ts` | input: fixture session distribution producing ~13% unaligned; expected: cluster array contains `{label:"Unaligned", percent:~13}`; for fixture with 0 unaligned, no Unaligned cluster; observed: per-case match |
| Aggregate queries return counts only, no identity fields | `src/lib/server/polis/aggregates.test.ts` | run each aggregate against a seeded fixture; expected: response shape contains no `user_id`, `session_id`, `name`, `address`, etc. (assert via key allowlist); observed: pass |
| User's county zero sessions: explicit empty state | `src/components/PolisOverlay.test.tsx` | mock all three endpoints with empty fixtures; expected: copy matches `/no data yet|your session will be the first/i`; observed: present |
| County change mid-session re-queries | `src/components/PolisOverlay.integration.test.tsx` | render with county A → switch to county B; expected: 3 endpoints re-called with county=B; observed: match |
| E2E Polis-view path | `e2e/polis-view.spec.ts` | navigate to polis route; verify bars + bridges render and compass shows honest empty state; observed: pass |
| `npm run lint`, `npm run test`, `npm run build` green | n/a — covered by `bash scripts/ai-verify.sh` | not test-shape applicable; reviewer-enforced |

### Red-phase ritual for this packet

SQL aggregate functions first: write `src/lib/server/polis/aggregates.test.ts` with known-fixture inputs and expected percentages — red-verify against the missing module. Next the bridge threshold parameterized cases (same file) — red-fails because the threshold function doesn't exist. The cluster-label hygiene test (`clusters.test.ts`) and the no-identity-in-aggregates assertion come third, both red-failing for the same reason. Then route tests (`bars/route.test.ts`, `bridges/route.test.ts`, `compass/route.test.ts`) — red-fail because the endpoint handlers haven't been split yet. UI tests (`PolisOverlay.test.tsx`) red-fail last. Implement in the order: aggregates module → clusters module → split endpoints → restructure `PolisOverlay` into the three readings → wire honest empty states + threshold gating. If session persistence schema isn't ready, narrow scope per the User-confirmed decision and surface the gap. Capture every red-phase output.

## Verification

- `npm run lint` clean.
- `npm run test` passing — including aggregate query tests, threshold gating, label hygiene.
- `npm run build` successful.
- `npm run e2e` — visit Polis view; verify bars + bridges render; compass hidden under threshold.
- `bash scripts/ai-verify.sh` clean.
- Manual smoke: visit Polis view in preview; verify all three readings or honest empty states.

## Evidence Plan

Visual evidence:

- Screenshot of bars rendering with user's themes and percentages.
- Screenshot of bridge statements list.
- Screenshot of compass (mocked threshold met) OR honest "needs N more sessions" empty state.

Behavior evidence:

- E2E test outputs.
- Test names: bars-render-with-data, bridges-80-threshold, compass-hidden-below-threshold.

Business logic evidence:

- Rule: "No party labels in clusters" — code lint / test asserting cluster names don't contain forbidden strings.
- Rule: "Unaligned is real" — fixture with naturally-emerging unaligned percentage; expected non-empty unaligned cluster.
- Rule: "No identity in aggregates" — query review and integration test; expected output contains only counts/percentages.

Persistence evidence:

- Aggregate query results vary as session count changes; refresh after a new session shows updated percentages.

Auth/security evidence:

- Aggregate endpoints don't leak per-session data. Reviewed query outputs.

Commercial readiness evidence:

- Privacy lane: no user_id in any response.
- Accessibility lane: bars and compass have screen-reader narrative alternatives ("Healthcare access: 78% of voters in your county also rank this in their top four").

Operational evidence:

- `npm run lint`, `npm run test`, `npm run build`, `npm run e2e` output.

Integration evidence:

- Preview deploy URL + screenshot of bars + bridges with real DB data (or stubbed for v1 if data isn't accumulated yet).

Regression evidence:

- Existing `/api/polis/route.ts` consumers (if any) still work or are explicitly migrated.

Proof standard:

- A reviewer can visit the Polis view, see bars with their themes / county percentages, see bridge statements with cluster agreement, and either see the compass or an honest "needs more sessions" — with no partisan labels and no identity leakage.

Non-proof:

- "Bars render" alone — must include the privacy and label-hygiene checks.
- A scatter plot that doesn't carry the "you're not alone" framing.

## Anti-Solutions

- Do not use party labels for clusters — never "Democrats," "Republicans," "Independents."
- Do not force every dot into a named cluster; "Unaligned" is real.
- Do not expose session-level identifying data through aggregates.
- Do not silently render empty visualizations — explicit empty states.
- Do not ship the compass before threshold (~150 sessions/county) is met for the user's county.
- Do not use a random scatter as a fallback; if data is missing, say so.
- Do not run live PCA on every page load — offline / scheduled compute.
- Do not let bridge statement queries return statements where any cluster fell below 80% — strict threshold.

## Notes

- The design brief §11 shows the three readings in detail. Mirror the structure: bars on the left, bridge statements in the middle, compass on the right (or stacked vertically).
- Cluster naming: "Service-first progressives," "Pocketbook moderates," "Civic libertarians," "Unaligned" are the named clusters from the prototype. Use as starting set; allow re-labeling as data evolves.
- PCA can be precomputed and stored as a `cluster_coordinates` view, refreshed hourly via a scheduled task (Vercel cron or similar).
- Consider an analytics-style page at `/polis/<county>` accessible from a workspace link — separate from the active session.
- A "Method" footer block per the design brief (`Method · PCA over priority ranks + agree/disagree statements`) builds trust through transparency.
- Watch for very small counties — if a county has <50 finished sessions, even bars/bridges may not be reliable. Consider showing the data only above a per-reading minimum.
