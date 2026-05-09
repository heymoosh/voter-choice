# Work Packet: launch-national-scope-generalization

Status: ready
Owner: orchestrator (Claude Opus, this session) → worker subagents (Sonnet)
Source: `.ai/project-briefs/voter-choice-alignment-engine-v2.md` § Phasing → Packet 1.
Branch: launch/production

## Intent

Take the Voter Choice tool from Texas-only to truly national. The runoff gate, the county resources, the state data fixtures, and the prompt's examples are all TX-flavored today. After this packet, the structure supports any of the 50 states, a representative set of states are populated with election data, and races we can't help with (local races, school boards, judicial in many states) are surfaced honestly in the UI rather than failing silently.

This is foundation work — no new product surface, no v2 features. The point is to clear the deck so v2 (alignment score, polis viz, etc.) doesn't keep bumping into TX-specific assumptions.

## Original User Intent

> "We are going to accept national ballots — everything's uploaded by users anyway — local ballot data is hard to get but it's all user driven and based on what their county provides. Look at the intent of the requirements rather than the specifics."

Plus the project brief's call for: scope = federal + state legislators across the 50 states; local races as honest gap; TX runoff gate becomes per-state config; county resources factored into per-state dictionary.

## Intent Interpretation

The TX-only assumption shows up in three places: the data fixtures (`getStateData.ts`), the runoff gate (`BallotToolClient.tsx`), and the prompt's examples and taxonomy doc. Generalize all three. Populate enough states to validate the structure but don't pretend we have perfect 2026 data for all 50 — populate TX (already correct) plus 5 high-traffic states with real but recent best-effort data, leave the rest as a clear scaffolding pattern that future state additions slot into.

The "local races: known gap" copy is the honesty tax. We don't have voting records for school boards, DAs in most jurisdictions, or city council members. The prompt and the UI both need to surface this when the user pastes a ballot containing such races.

## Business Logic

Rules:
- All TX-specific assumptions in the codebase get expressed as per-state config or removed. No string match on "TX", "Texas", "Harris" outside data files going forward.
- The runoff gate fires only when the active state's data declares the runoff disambiguation rule. States without runoffs (most of them) skip it.
- State data fixtures share a common type interface. New state additions follow the same shape.
- Prompt examples that referenced Texas-specific elements (Harris County DA, Houston Police Officers Union as endorsement category, etc.) become generic-but-believable examples that work for any U.S. ballot. Taxonomy doc retrospective metric vocabulary stays as office-typed (DA, judge, etc. — those are universal); city/county-specific examples get neutralized.
- "Local races: known gap" copy lives in: (a) the prompt's Act 1 ballot-check rules, (b) the prompt's Act 3 race-render rules (when no record can be assembled), (c) optionally a UI banner inside `ResearchLayout.tsx` if a paste-ballot detects local-race patterns — but UI banner is OPTIONAL for this packet; prompt-only is acceptable.
- Six states populated for v2 launch: TX (already done), CA, NY, FL, GA, NC. This set covers the major primary models (TX/GA/NC have party-locked runoffs; CA top-two open; NY closed primary; FL closed primary, no runoffs).

Assumptions:
- Spanish path stays held back per ongoing decision. Don't update ES translations or the ES prompt.
- Other 44 states' data is out of scope for this packet — they get added as users from those states arrive. The structure must make addition trivial (drop a fixture file in, register it).
- Runoff disambiguation logic only matters for primary or runoff election types. General elections aren't gated.
- The Texas runoff gate's specific business rule (you can only vote in the runoff of the party whose primary you voted in) generalizes to: each state declares whether its runoff is "party-locked to first-round primary." For states where the answer is "no," the gate doesn't render.

User-confirmed decisions:
- National federal + state scope confirmed.
- Local races stay an acknowledged gap, surfaced honestly.
- Six states populated for v2 launch (TX + CA + NY + FL + GA + NC).

Edge cases:
- A state with a primary AND no runoff (FL) — gate must not fire even if `election.type === "primary"`.
- A state with same-day registration (some) — current registration data shape supports this.
- A state with no early voting (a few) — current shape supports this.
- A user pastes a ballot from a state we haven't populated — the app must still serve them. Show a fallback "we don't have specific election deadlines for [state] yet" and proceed with general guidance (federal deadlines, generic voter ID guidance).
- A user pastes a ballot containing local races (city council, school board, etc.) — the prompt acknowledges them honestly: "we don't have voting records for [race name] — federal and state legislators are the only races we can score from public records."

Out of scope:
- Spanish path updates.
- All 50 state fixtures (only 6 ship in this packet).
- Vote ingestion pipeline (separate packet, packet 6).
- Alignment score (separate packet, packet 3).
- New product surface in this packet.

## Commercial Readiness

Applicability: launch
Lanes in scope: product UX (state-data fallback messaging), API/contracts (state data interface)
User decisions needed: none additional
Assumptions: none

## Operational Reproducibility

Setup: existing repo, `npm install`. No new dependencies.
Configuration: no new env vars.
Provider setup: not applicable.
Infrastructure: not applicable.
Database migrations: not applicable.
Manual steps: none.
Verification: `npm run lint`, `npm run test`, `npm run build`.
Test quality: existing vitest discipline. New tests cover state-data fallback path, generalized runoff gate, per-state config wiring.
Critical logic trigger: not applicable.

## Scope

Touch:
- `src/types/election.ts` — extend or refine `StateElectionData` to include explicit `runoffRules` (replaces implicit "TX is special") and any other fields needed for per-state config.
- `src/lib/getStateData.ts` — TX content stays unchanged. Add five new state files / branches: CA, NY, FL, GA, NC. Each populated with real-but-recent registration deadlines, voter ID rules, early voting, county lookup links (state-level for now; county-level can be sparse), runoff rules.
- `src/components/BallotToolClient.tsx` — `requiresTexasRunoffGate` renamed to `requiresRunoffGate`, parameterized on the state's `runoffRules.partyLockedToFirstRoundPrimary` flag. The TX-specific copy in `texasRunoffContextNote` becomes per-state copy or generic copy; the gate UI labels become state-aware (it should say "Texas runoff rule" only when the state is TX).
- `src/lib/translations.ts` — add new keys for the generalized runoff gate copy. Existing TX-specific translation strings stay (they're correct for TX); add new generic keys for non-TX states. ES bodies as EN copies for any new keys.
- `docs/BALLOT_PROMPT.md` — replace TX-specific examples in Act 1 / Act 3 (e.g., "Harris County District Attorney") with generic examples that work for any state. Add explicit "LOCAL RACES" handling in Act 1 and Act 3.
- `docs/PATTERN_TAXONOMIES.md` — review for TX-specific examples (e.g., Houston Federation of Teachers in endorsement category examples). Replace with generic examples; the office-typed retrospective metric vocabulary itself (DA, judge, etc.) stays.
- `src/lib/generated/ballotPromptEn.generated.ts` — regenerated mechanically.
- `src/lib/generatePrompt.test.ts` — update assertions that referenced removed TX-specific phrases. Add assertions for the new "local races: known gap" prompt content.
- `src/lib/getStateData.test.ts` if it exists — extend coverage for the new states.
- New file: `src/lib/states/` directory with one TypeScript module per state, each exporting a `StateElectionData` object. `getStateData.ts` imports them and dispatches on state code. (Optional refactor: if all 6 states fit cleanly in `getStateData.ts` itself, leave as-is. Pick the cleaner option.)

Do not touch:
- `docs/BALLOT_PROMPT_ES.md` and `src/lib/generated/ballotPromptEs.generated.ts` content — Spanish held back.
- ES translation bodies for existing keys.
- `src/components/RacePatterns.tsx`, `ValuesTagSelector.tsx`, `ChatPanel.tsx` — no v2 product surface in this packet.
- Budget logic, structured-blocks parsers — out of scope.
- Any of the v2 features (alignment score, drag-rank, polis viz, etc.).

## Ownership Audit

Concern: per-state election data, the runoff gate, prompt's national framing, taxonomy doc national applicability.

Existing owners:
- `src/lib/getStateData.ts` — single source of truth for state data; today only TX.
- `src/components/BallotToolClient.tsx` — owns the pre-research gating UI, including `TexasRunoffGate`.
- `docs/BALLOT_PROMPT.md` — single source of truth for the EN ballot prompt.
- `docs/PATTERN_TAXONOMIES.md` — donor bucket vocabulary and per-office retrospective metrics.

Reuse/edit targets:
- All listed in Scope > Touch. Existing structure (the `StateElectionData` shape, the `texasRunoffContextNote` function pattern) is the right shape; just generalized.

New owner needed:
- If the per-state files split out (`src/lib/states/`), that directory becomes the new owner. Boundary: each file holds one state's election data; `getStateData.ts` dispatches. If files don't split, no new owner.

Overlap/bloat risks:
- Don't double-own state data between fixtures and the prompt context. Prompt context block stays generated from fixtures (already does).
- Don't reintroduce TX-specific strings in places the fixture should own.

Recommendation: Two-agent parallel execution. One agent owns the data + runoff gate refactor (TypeScript work). The other owns the prompt + taxonomy generalization (markdown + prompt-test work). Verifier closes the loop.

Execution constraints:
- Do not change existing TX behavior. Texas users see exactly what they see today.
- Do not invent fake election data for any new state. Use real registration deadlines, voter ID rules, etc. from the state SoS or Vote.org as of today's date (2026-05-09). Where unsure, use the most recent known values; mark with a comment if a value is approximate.
- Do not break the prompt-sync test (`generatePrompt.test.ts > keeps the English runtime prompt synced with docs/BALLOT_PROMPT.md`).

## Acceptance Criteria

- The codebase has no remaining hard-coded "Texas" / "Harris" string references outside data fixtures, the TX state file, and the existing `texasRunoffContextNote` function (which is renamed and made state-aware).
- A user pasting a ballot for any of CA, NY, FL, GA, NC sees state-correct registration deadlines, voter ID rules, and early voting info.
- A user pasting a ballot for a state we haven't populated (e.g., Wyoming) sees a graceful fallback rather than a crash. The exact wording is up to implementation but must explicitly say "we don't have specific deadlines for [state] yet — here's general federal guidance." (Add a `getFallbackStateData(stateCode)` helper or equivalent.)
- The runoff gate fires only when the active state's `runoffRules.partyLockedToFirstRoundPrimary === true` AND the election is a primary or runoff. For TX users in a primary/runoff: behavior unchanged. For FL/CA/NY users in any election: gate does not render.
- The prompt's Act 1 and Act 3 sections include explicit "we don't have voting records for local races" copy.
- `BALLOT_PROMPT.md` and `PATTERN_TAXONOMIES.md` no longer use TX-specific cities, counties, or unions in their examples (DA / judge / commissioner office types stay; "Houston Police Officers Union" → generic "Public safety unions" example).
- `npm run lint` clean (no new errors).
- `npm run test` all green (existing 384 tests stay green; new state-fixture and generalized-gate tests added).
- `npm run build` succeeds.

## Verification

- `npm run lint` — no new errors.
- `npm run test` — full suite green.
- `npm run build` — succeeds.
- Grep audit: `grep -rn "Texas\|Harris\|TX\b" src/ docs/ --include="*.ts" --include="*.tsx" --include="*.md"` — surviving matches must be inside fixtures (`getStateData.ts` / `src/lib/states/TX.ts` if split), tests, or the explicit TX-runoff-rule text in the prompt's runoff gate section. No hard-coded TX outside those.
- Manual smoke test (orchestrator after subagents land): paste a CA address; verify CA-correct deadlines render. Paste a TX address; verify the runoff gate still appears. Paste a Wyoming address; verify graceful fallback.

## Evidence Plan

Visual evidence: not generated by subagents; orchestrator runs the smoke test.
Behavior evidence: state-fixture path exercised in tests for each populated state. Generalized runoff gate exercised: TX renders, FL doesn't.
Business logic evidence: fallback path for unpopulated states tested.
Persistence evidence: not applicable.
Auth/security evidence: not applicable.
Commercial readiness evidence: lint + test + build green.
Operational evidence: prompt-sync test passes (regen lands cleanly).
Integration evidence: address → state → fixture → prompt → chat path tested end-to-end via the existing `generatePrompt.test.ts` patterns.
Regression evidence: TX behavior unchanged; existing tests stay green.
Proof standard: verifier walks acceptance criteria with file/line evidence.
Non-proof: "the file compiles" is not enough. The fallback path must be exercised; the runoff gate state-awareness must be tested.

## Anti-Solutions

- Inventing fake election data for the new states. Use real values; mark approximations with a comment.
- Removing TX-specific behavior. TX still works exactly as today.
- Hard-coding state-specific logic in `BallotToolClient.tsx` (e.g., `if state === "FL" || state === "CA" ...`). Use the per-state config flag.
- Adding all 50 states with placeholder data. Six is the scope.
- Changing the prompt's voice or thesis (legible patterns stays; this packet is structural).
- Touching ES content.
- Adding npm dependencies.
- Reintroducing `[ISSUE_RANKER]`, `matchSummary`, or any deprecated v1 patterns.

## Notes

Two-phase execution by subagents:

**Phase 1 (parallel — 2 subagents):**
- **Agent A — Data + runoff gate refactor.** TypeScript work in `src/types/election.ts`, `src/lib/getStateData.ts` (or `src/lib/states/*.ts`), `src/components/BallotToolClient.tsx`, `src/lib/translations.ts`. Populates TX (unchanged) + CA + NY + FL + GA + NC. Generalizes the runoff gate. Adds fallback for unpopulated states. Tests for each. The TX runoff gate copy stays state-specific (it's a TX rule); other states get generic / no-gate behavior.
- **Agent B — Prompt + taxonomy national-ization.** Markdown work in `docs/BALLOT_PROMPT.md` and `docs/PATTERN_TAXONOMIES.md`. Replaces TX-specific city/county/union examples with generic ones. Adds explicit "local races: known gap" copy in Act 1 and Act 3. Runs `npm run sync:ballot-prompt`. Updates `generatePrompt.test.ts` accordingly.

**Phase 2 (verifier subagent):**
Run lint + test + build. Walk acceptance criteria. Grep audit for surviving TX-specific strings outside fixtures. Output verification report. Make zero edits.

Real state-data sources for Agent A to use (as of 2026-05-09):
- Registration deadlines: each state's Secretary of State website or Vote.org
- Voter ID rules: each state's SoS website or NCSL voter ID database (https://www.ncsl.org/elections-and-campaigns/voter-id)
- Early voting / mail voting: NCSL early voting database
- County lookup tools: each state SoS

If Agent A can't pin a specific value reliably, mark it with a `// TODO verify for 2026 cycle` comment and use the most recent known value. Better honest approximation than fabrication.
