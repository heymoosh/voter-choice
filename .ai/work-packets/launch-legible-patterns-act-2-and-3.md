# Work Packet: launch-legible-patterns-act-2-and-3

Status: ready
Owner: orchestrator (Claude Opus, this session) → worker subagents (Sonnet)
Source: User redesign brief (in-conversation, 2026-05-08), reconciled with `docs/BALLOT_PROMPT.md` v3.
Branch: launch/production

## Intent

Re-architect Act 2 and Act 3 of the ballot research chat from a policy-interrogation flow into a four-pattern legibility dashboard. The voter brings their values; the tool compresses donor coalition shape, endorsement clusters, platform alignment (incumbents), and retrospective performance (incumbents) and lets the voter decide. The model never recommends.

## Original User Intent

> "I updated the ballot prompt. Please update the codebase where the ballot prompt is being used (chatbot, copy and paste..) let's hold off on ES until we nail our prompt and UX."

Followed by a redesign brief titled "VOTER CHOICE — REDESIGN BRIEF: LEGIBLE PATTERNS" (full text captured in conversation transcript) and a series of confirmations on:
- Keep the values-highlight feature (model picks one element per candidate that speaks to a voter value).
- Ship platform alignment in v1.
- Standardize donor buckets; let voters drill into individual donors.
- Anonymize → reveal → pick (no "lean" intermediate step).
- Different pattern set for propositions (research-driven).
- Defer Spanish / ES path until prompt and UX are settled.
- Reveal-on-tap (single button), stacked mobile layout with sticky donor-coalition strip — orchestrator's call.
- Bucket taxonomy + retrospective metric vocabulary owned by `docs/PATTERN_TAXONOMIES.md`.

## Intent Interpretation

The current chat surfaces UI for `[ISSUE_RANKER]` (Act 2 drag-rank) and `[RACE_FINAL_EVAL]` (Act 3 candidate match). The v3 prompt deprecates both blocks and emits `[VALUES_TAG_REQUEST]` (Act 2 multi-select) and `[RACE_PATTERNS]` (Act 3 four-pattern dashboard) instead. Without code changes the chat will render raw JSON. This packet brings the codebase to functional parity with the v3 prompt and adds the proposition pattern variant.

The platform-alignment ratio render (`{kept}/{total}`, dots, source chip, challenger-null, alignmentUnavailable) is salvage — extract from `RaceFinalEvaluation.tsx` rather than rebuild.

## Business Logic

Rules:
- The model never tells the voter who is "better." No `matchSummary`, no recommendation, no ranking.
- Party labels stay hidden throughout Acts 1–3 and the ballot summary. Anywhere a candidate is rendered, no party suffix.
- No individual donor names ever appear inside donor-coalition buckets — only the fixed taxonomy categories. Individual donors are reachable via a separate "see donors" affordance that links out to the source.
- Donor-coalition buckets must be drawn from the fixed vocabulary in `docs/PATTERN_TAXONOMIES.md`. Inconsistent buckets across candidates in the same race break the comparison and are not acceptable.
- Retrospective metrics for incumbents must come from the per-office vocabulary in `docs/PATTERN_TAXONOMIES.md`. Offices not on the list emit `retrospectiveUnavailable`.
- All pattern data points carry a Tier 1–3 source object with `name` and `url` when available. Tier 4 sources allowed only when labeled `[Advocacy: NAME]`.
- For incumbents whose data isn't assemblable in Tier 1–3 sources, the model emits the `<patternName>Unavailable` field rather than inventing data.
- For challengers, `platformAlignment: null` and `retrospective: null` (with `retrospectiveUnavailable.reason = "Challenger — no record in office yet"`).
- Anonymized → reveal → pick is the Act 3 flow. Reveal is a single tap (button labeled "Reveal candidates"). No "lean" intermediate step.
- Voter values tags drive at most one highlight per candidate per race. If the voter skipped Act 2, every candidate's `valuesHighlight` is `null`.

Assumptions:
- ES (Spanish) is held back: do not update `docs/BALLOT_PROMPT_ES.md`, do not add ES translation keys for the new components, leave ES paths in `ChatPanel.tsx` to fall through cleanly. EN is the only locale shipped this packet.
- Texas is the only state in scope; per-office retrospective metric vocabularies are written for Texas offices.
- The `[VOTER PICKED] race=… choice=… candidateName=…` and `[VOTER SKIPPED] race=…` user-message surface stays unchanged from v3.

User-confirmed decisions:
- Keep `valuesHighlight`. Constrain it to a single element string per candidate.
- Ship platform alignment in v1 even though it's the most demanding pattern to assemble.
- Donor bucket taxonomy is fixed; voters get a separate "see individual donors" affordance via the source chip.
- Anonymize → reveal-on-tap → pick. No lean.
- Mobile = stacked candidate sections + sticky donor-coalition comparison strip at top.
- Source chips = inline superscript footnote style (Perplexity-like), with a per-message footer listing all sources numbered.

Edge cases:
- 2-candidate race: stacked layout still applies; sticky comparison strip is still useful.
- 5–6 candidate race: stacked layout scales; sticky strip stays scrollable horizontally if too wide.
- Open-seat race (both challengers): two of four patterns are empty for both; donor coalition + endorsements carry the dashboard. Layout must not collapse.
- Proposition (no candidates): different pattern set per `docs/PATTERN_TAXONOMIES.md` proposition section. YES/NO labeled from the start, no anonymization. Render uses the same `[RACE_PATTERNS]` block but with proposition-flavored fields.
- Race where fewer than two patterns are assemblable: render whatever is available, the lead-in says "I could only assemble [N] of the four patterns for this race," voter can still pick or skip.
- Voter typed a candidate name in chat instead of using the Pick button: still flows to MY BALLOT but flagged `(verbal)`. Existing `ballot-utils.ts` behavior is preserved.

Out of scope:
- Spanish prompt or Spanish translations for new components.
- Per-pattern voter feedback affordance ("this pattern matters more to me") — explicitly skipped per user input #8.
- A "lean A / lean B" intermediate step.
- A `matchSummary` field on `[RACE_PATTERNS]` candidates.
- Renaming or reframing the platform-alignment label ("Voted in line with platform" stays).
- Editing `docs/BALLOT_PROMPT_ES.md` or `src/lib/generated/ballotPromptEs.generated.ts` beyond mechanical regen.

## Commercial Readiness

Applicability: launch
Lanes in scope: product UX, accessibility/responsive (mobile-first stacked layout), API/contracts (block schemas)
User decisions needed: none additional
Assumptions: none

## Operational Reproducibility

Setup: existing repo, `npm install`. No new dependencies expected; if any agent needs one, flag it before installing.
Configuration: no new env vars.
Provider setup: not applicable.
Infrastructure/deployment: not applicable.
Database migrations: not applicable.
Manual steps: none.
Verification: `npm run lint`, `npm run test`, `npm run build`, optional `npm run e2e`.
Test quality: existing vitest discipline. New components require unit tests covering rendered states, empty states, and reveal flow.
Critical logic trigger: not applicable (no auth/payments/privacy-deletion changes).

## Scope

Touch:
- `docs/PATTERN_TAXONOMIES.md` *(new)* — fixed donor bucket vocabulary + per-office retrospective metric vocabulary + proposition pattern set spec.
- `docs/BALLOT_PROMPT.md` — Act 3 section gains references to `docs/PATTERN_TAXONOMIES.md`. New "ACT 3.PROPOSITIONS" subsection covers the proposition pattern variant.
- `src/lib/generated/ballotPromptEn.generated.ts` — regenerated mechanically.
- `src/lib/structured-blocks.ts` — remove `[ISSUE_RANKER]` parser surface; remove the `[RACE_FINAL_EVAL]` parser; add `[VALUES_TAG_REQUEST]` parser; add `[RACE_PATTERNS]` parser. Both new parsers ship with `parseX`, `stripXBlocks`, `hasOpenXBlock`, `stripPartialXBlock` helpers.
- `src/lib/structured-blocks.test.ts` — drop tests for deleted parsers; add full coverage for new parsers (valid input, invalid lines skipped, partial-stream handling, empty arrays, value-highlight null variants, proposition variant of `[RACE_PATTERNS]`).
- `src/components/PlatformAlignmentRatio.tsx` *(new — extracted from `RaceFinalEvaluation.tsx`)* — render `{kept}/{total}`, dots, source chip, challenger-null, alignmentUnavailable. Behavior unchanged from current.
- `src/components/FunderBars.tsx` *(new — extracted)* — donor-coalition stacked bar render. Behavior unchanged from current.
- `src/components/SourceChip.tsx` *(new — extracted)* — single-source chip. Behavior unchanged from current; reused by both the new dashboard and the salvaged sub-components.
- `src/components/RacePatterns.tsx` *(new)* — the four-pattern dashboard. Anonymized-by-default with a "Reveal candidates" button. Stacked candidate sections; sticky donor-coalition comparison strip at the top of the dashboard. Inline numbered superscript source chips with a per-dashboard footer listing all sources.
- `src/components/ValuesTagSelector.tsx` *(new)* — multi-select chip set + free-text + skip; consumes parsed `[VALUES_TAG_REQUEST]` block; emits `[VOTER VALUES] tags=[...]` / `custom="..."` / `skipped`.
- `src/components/RacePatterns.test.tsx`, `src/components/ValuesTagSelector.test.tsx` *(new)* — unit tests for rendered states, empty states, reveal flow, pick/skip wiring.
- `src/components/ChatPanel.tsx` — delete `IssueRanker` import + `renderIssueRanker` + `IssueRankerLoadingPlaceholder`; delete `RaceFinalEvaluation` import + `renderRaceFinalEvaluation`; delete `[VOTER RANKED]` and `[VOTER RANKED SKIPPED]` send paths; add render branches for `[VALUES_TAG_REQUEST]` (using `ValuesTagSelector`) and `[RACE_PATTERNS]` (using `RacePatterns`). Update parser imports.
- `src/components/IssueRanker.tsx`, `src/components/IssueRanker.test.tsx` — delete after ChatPanel no longer references them.
- `src/components/RaceFinalEvaluation.tsx`, `src/components/RaceFinalEvaluation.test.tsx` — delete after sub-components are extracted and ChatPanel no longer references them.
- `src/lib/translations.ts` — remove keys: `issueRankerTitlePrefix`, `issueRankerInstruction`, `issueRankerSubmit`, `issueRankerSubmitting`, `issueRankerSubmitted`, `issueRankerSkip`, `issueRankerLoading`, `raceFinalPickPrefix`, `raceFinalSkip`, `raceFinalSubmitting`, `raceFinalLockedIn`, `raceFinalSkipped`, `raceFinalLoading`, `raceFinalChallengerNoRecord`, `raceFinalTopFundersHeading`, `raceFinalPlatformAlignmentHeading`, `raceFinalKeyVotesUnit`, `raceFinalCallToAction` from EN. Add new keys for `ValuesTagSelector` and `RacePatterns` (label, reveal-button, skip, pick, donors-link, etc.). Mirror EN-only changes; ES bodies stay on the legacy keys for now (don't churn ES).
- `src/components/ChatPanel.test.tsx` — replace deleted block/render assertions with new ones for `[VALUES_TAG_REQUEST]` and `[RACE_PATTERNS]` paths.
- `src/lib/generatePrompt.test.ts` — extend to assert the prompt references `docs/PATTERN_TAXONOMIES.md` and includes a proposition pattern subsection. Existing assertions stay.

Do not touch:
- `docs/BALLOT_PROMPT_ES.md`, `src/lib/generated/ballotPromptEs.generated.ts` content (regen is fine; do not edit by hand).
- ES translation bodies in `src/lib/translations.ts` for affected keys. Leaving stale ES bodies is fine for this packet — Spanish UI for the new components is explicitly out of scope.
- `src/components/HandoffPackage.tsx` — already handles `=== VOTER SESSION HANDOFF ===`.
- `src/components/BallotActions.tsx`, `src/lib/ballot-utils.ts` — already handle MY BALLOT and `=== MY VOTER PROFILE ===`.
- `src/components/ProfileUpload.tsx`, `src/components/BallotToolClient.tsx` (except where its `appendProfileContextToPrompt` integration calls remain stable).
- The pre-chat ballot pull, address handling, Texas runoff gate, profile upload — all stay as-is.

## Ownership Audit

Concern: structured-block parsers, Act 2 / Act 3 UI, ChatPanel render branching, prompt taxonomies.

Existing owners:
- `src/lib/structured-blocks.ts` owns block parsing for all chat-side structured outputs.
- `src/components/ChatPanel.tsx` owns chat-message rendering and structured-block dispatch.
- `src/components/RaceFinalEvaluation.tsx` currently owns the four-pattern render shape (its `PlatformAlignmentRatio`, `FunderBars`, `SourceChip` sub-components are the salvageable cores).
- `src/components/IssueRanker.tsx` owns the (deprecated) drag-rank Act 2 UI.
- `docs/BALLOT_PROMPT.md` is the single source of truth for the EN ballot prompt; mechanically synced into `src/lib/generated/ballotPromptEn.generated.ts` by `scripts/generate-ballot-prompt-module.mjs`.
- `src/lib/translations.ts` owns all UI strings.

Neighboring owners:
- `docs/SOURCE_TIERS.md` — source-tier definitions; stays canonical.
- `src/lib/generatePrompt.ts` — wraps the base prompt with election context. Already updated for v3 Acts; no further changes needed in this packet beyond optional taxonomy reference if the prompt update needs a pointer.

Files/modules/docs inspected:
- `src/lib/structured-blocks.ts` — current ISSUE_RANKER + RACE_FINAL_EVAL parsers.
- `src/components/ChatPanel.tsx` — render dispatch and `[VOTER RANKED]` / `[VOTER PICKED]` send paths.
- `src/components/RaceFinalEvaluation.tsx` — sub-component locations.
- `src/lib/translations.ts` — EN strings.
- `docs/BALLOT_PROMPT.md` — v3 prompt and Act 3 spec.

Reuse/edit targets: All listed in Scope > Touch. The salvaged sub-components are reused, not rebuilt.

New owner needed: yes — `docs/PATTERN_TAXONOMIES.md` becomes the canonical owner of the donor-bucket vocabulary and per-office retrospective metric vocabulary, referenced by `docs/BALLOT_PROMPT.md` and used as a verification reference for any prompt-side validation later. Boundary: the file holds *vocabularies and definitions only*, not chat-flow rules.

Overlap/bloat risks:
- Duplicating bucket taxonomies inline in the prompt would cause drift; the prompt must reference the file by name and quote the canonical taxonomy verbatim where the model needs it inline.
- Re-implementing `PlatformAlignmentRatio` instead of extracting it would create a parallel render of the same data shape. Forbidden.
- Building a new "SourceChip" parallel to `src/components/SourcedClaim.tsx` (which is your existing untracked superscript chip) would split the abstraction. The Perplexity-style footnote behavior should live in `SourcedClaim.tsx` (existing) — `SourceChip` (extracted) is the "labeled chip with name + URL" used for non-superscript cases (e.g., the per-pattern source). Two roles, two components, names disambiguated.

Recommendation: Three-phase execution by subagents (parallel where possible, sequential where dependencies require). Ownership audit fence is held: nobody invents a parallel parser, parallel ratio render, parallel taxonomy.

Execution constraints:
- Do not touch ES paths or ES content.
- Do not invent donor buckets outside `docs/PATTERN_TAXONOMIES.md`.
- Do not reintroduce `matchSummary`, `[ISSUE_RANKER]`, `[RACE_FINAL_EVAL]`, `[VOTER RANKED]` anywhere.
- Do not re-implement `PlatformAlignmentRatio` from scratch — extract it.
- Do not add new dependencies without flagging to orchestrator.

## Pattern taxonomies (canonical content for `docs/PATTERN_TAXONOMIES.md`)

### Donor bucket vocabulary (fixed, ~20 categories)

The model picks 2–4 per candidate from this list. Labels must be used verbatim. If a candidate's funding can't be expressed as 2–4 of these, emit `donorUnavailable`.

- Real estate & development
- Oil, gas & energy
- Healthcare industry
- Pharmaceutical & medical device
- Finance, banking & insurance
- Technology
- Legal industry
- Agriculture
- Telecom & utilities
- Retail & hospitality
- Trade unions (non-public-safety)
- Public safety unions
- Education employees
- Small individual donors (under $200)
- Large individual donors ($200+)
- Self-funded
- Party committees
- Issue-aligned PACs — \<issue\>  *(suffix the live issue, e.g., "Issue-aligned PACs — gun rights")*
- Other

### Retrospective metric vocabulary by office type (Texas)

Model selects 1–4 per incumbent. Names from the list verbatim. If the office isn't here or no metric is assemblable: emit `retrospectiveUnavailable`.

**District Attorney**
- Felony conviction rate
- Case backlog (open cases over 12 months)
- Exoneration count over term
- Average time to disposition
- Diversion program enrollment

**District / County Court Judge**
- Reversal rate on appeal
- Median case clearance time
- Pending caseload at term end
- Median time to first hearing

**Appellate Judge (state or federal)**
- Reversal rate by the higher court
- Authored opinions count
- Recusal rate

**County Commissioner / Commissioners Court**
- Bond program execution rate
- Property tax rate change over term
- Capital projects completed on time
- Public meeting attendance

**Sheriff / Constable**
- Reported crime trajectory in jurisdiction
- Response time trend
- Use-of-force incidents per 1k contacts
- Jail population vs. capacity

**City Council / Mayor**
- Budget vote alignment with platform
- Public meeting attendance
- Permit / housing approvals over term
- 311 / constituent service resolution rate

**State Representative / State Senator**
- Bills authored that became law
- Floor vote attendance
- Committee attendance
- Roll-call alignment with platform

**US Representative / US Senator**
- Bills authored that became law
- Floor vote attendance
- Bipartisan vote rate
- Constituent service responsiveness (where measurable)

### Proposition pattern set

Propositions don't fit the candidate pattern set. Substitute these four:

1. **Plain-English text.** What the measure literally does, in 2 sentences. Not the ballot title. Source: official ballot language + neutral analysis (League of Women Voters, Texas Legislative Council, Ballotpedia).
2. **Pro/con coalition shape.** Donor-bucket-style breakdown of who's funding YES vs. NO, drawn from TEC PAC filings for the proposition's campaign committees. Same vocabulary as candidate donor coalitions.
3. **Endorsement split.** Editorial boards, civic orgs, advocacy groups for vs. against, grouped by category. Same render as candidate endorsement clusters.
4. **Fiscal note + comparable history.** What the measure costs / changes (official fiscal note) and the outcome of the most directly comparable measure passed elsewhere or earlier. Source: official fiscal note + one cited comparison.

Propositions render labeled YES / NO from the start (no anonymization). The `[RACE_PATTERNS]` block is reused with field overrides:
- `name` = "YES on \<short measure title\>" / "NO on \<short measure title\>"
- `incumbent` = false (always)
- `priorRole` = the plain-English text
- `donorCoalition` = pro/con coalition shape
- `endorsements` = endorsement split for that side
- `platformAlignment` = null
- `retrospective` = the fiscal-note-plus-comparable-history pair (treated as 1–2 metric entries)

## Acceptance Criteria

- The chat no longer renders raw JSON for `[VALUES_TAG_REQUEST]` or `[RACE_PATTERNS]` — both are intercepted and rendered as React components.
- `[ISSUE_RANKER]` and `[RACE_FINAL_EVAL]` are gone from the codebase: zero string matches in `src/` outside of comments referencing legacy migration.
- `[VOTER RANKED]` and `[VOTER RANKED SKIPPED]` are gone from `ChatPanel.tsx`.
- `RacePatterns` renders all four patterns with empty states for unavailable / null variants; the dashboard doesn't visually break when a pattern is missing.
- The "Reveal candidates" button anonymizes candidates as A/B/C until tapped; after tap, names are visible and Pick/Skip become enabled.
- The values tag selector accepts 0–3 issue tags, plus the `show_ballot` and `custom` non-issue options, plus skip; sends the right `[VOTER VALUES]` payload for each.
- `docs/PATTERN_TAXONOMIES.md` exists and is referenced from `docs/BALLOT_PROMPT.md` Act 3 section.
- `docs/BALLOT_PROMPT.md` has a proposition pattern subsection that maps the four candidate patterns to the four proposition patterns and specifies labeled YES/NO rendering.
- The platform-alignment ratio render is preserved unchanged in behavior — extracted into its own file but rendering exactly the same `kept/total`, dots, source chip, challenger-null, alignmentUnavailable states.
- `npm run lint` clean (no new errors introduced; pre-existing complexity warnings are acceptable).
- `npm run test` all green (existing 297 passing tests stay green; new component tests added; deleted-component tests removed).
- `npm run build` succeeds.

## Verification

- `npm run lint` → no new errors.
- `npm run test` → all green.
- `npm run build` → succeeds.
- Grep audit:
  - `grep -rn "ISSUE_RANKER\|RACE_FINAL_EVAL\|VOTER RANKED\|matchSummary\|IssueRanker\|RaceFinalEvaluation" src/ docs/` returns zero matches outside of explicit migration / deletion comments.
  - `grep -rn "VALUES_TAG_REQUEST\|RACE_PATTERNS\|RacePatterns\|ValuesTagSelector" src/` returns the new component and parser usages.
- Manual chat smoke test (orchestrator runs after subagents land changes; not blocking for subagent verifier): start the dev server, run a Texas Harris County ballot research session, verify Act 1 → Act 2 (values tag chips render and submit) → Act 3 (anonymized dashboard, single-tap reveal, pick logs to MY BALLOT).

## Evidence Plan

Visual evidence: not generated by subagents; orchestrator captures after Phase 4 verification clears.
Behavior evidence: anonymized → reveal → pick flow exercised in `RacePatterns.test.tsx`. Values tag multi-select + free-text + skip exercised in `ValuesTagSelector.test.tsx`.
Business logic evidence: empty-state handling for `donorUnavailable`, `endorsementUnavailable`, `alignmentUnavailable`, `platformAlignment: null`, `retrospectiveUnavailable`, and `valuesHighlight: null` are all exercised in `RacePatterns.test.tsx`.
Persistence evidence: not applicable.
Auth/security evidence: not applicable.
Commercial readiness evidence: lint + test + build green; manual smoke test before merge.
Operational evidence: `npm run sync:ballot-prompt` regenerates the EN bundle from the updated `docs/BALLOT_PROMPT.md` cleanly.
Integration evidence: `ChatPanel.test.tsx` exercises the new dispatch paths.
Regression evidence: existing 297 tests stay green; new tests added.
Proof standard: `npm run test` clean + grep audit clean + the verifier subagent confirms acceptance criteria are observably met.
Non-proof: "the components compile" is not enough — the renderable states must be unit-tested.

## Anti-Solutions

- Reintroducing `matchSummary` or any model-generated "this candidate is better" string.
- Inventing donor buckets outside `docs/PATTERN_TAXONOMIES.md`.
- Including individual donor names inside donor-coalition buckets.
- Re-implementing `PlatformAlignmentRatio` instead of extracting it.
- Adding a "lean A / lean B" intermediate step.
- Adding a "promise tracking" / "campaign promise score" framing.
- Replacing "Voted in line with platform" label with anything else.
- Touching ES strings / ES doc content.
- Stubbing the new components as TODO placeholders without unit tests.
- Adding new npm dependencies without flagging.
- Skipping the per-message superscript footnote footer in favor of inline chips per claim.

## Notes

The work is split into four phases for subagent execution:

**Phase 1 (parallel — 3 subagents). PHASE 1 IS ADDITIVE ONLY — DO NOT DELETE DEPRECATED CODE; PHASE 3 HANDLES DELETIONS.**
- Agent A — Foundation (additive): write `docs/PATTERN_TAXONOMIES.md`; **add** new parsers + types to `src/lib/structured-blocks.ts` for `[VALUES_TAG_REQUEST]` and `[RACE_PATTERNS]` (`parseValuesTagRequestBlock`, `stripValuesTagRequestBlocks`, `hasOpenValuesTagRequestBlock`, `stripPartialValuesTagRequestBlock`, plus the same four for `RACE_PATTERNS`). Add the matching types: incumbent flag, priorRole, donorCoalition entries, donorUnavailable, endorsements + endorsementUnavailable, platformAlignment + alignmentSource + alignmentUnavailable, retrospective + retrospectiveUnavailable, valuesHighlight. Add tests to `structured-blocks.test.ts` for the new parsers (valid input, invalid lines skipped, partial-stream handling, empty arrays, nullable variants, proposition variant). DO NOT remove the existing ISSUE_RANKER or RACE_FINAL_EVAL parsers or their tests — those go in Phase 3.
- Agent B — Salvage (additive, behavior-preserving): extract `PlatformAlignmentRatio.tsx`, `FunderBars.tsx`, `SourceChip.tsx` from `RaceFinalEvaluation.tsx` into their own files under `src/components/`. Update `RaceFinalEvaluation.tsx` and its test to import from the new locations. The existing tests must remain green; no behavior changes. (Deletion of `RaceFinalEvaluation.tsx` itself happens in Phase 3.)
- Agent C — Prompt + taxonomy reference (additive): update `docs/BALLOT_PROMPT.md` to reference `docs/PATTERN_TAXONOMIES.md` from Act 3 (donor-coalition and retrospective sections). Add a new "ACT 3.PROPOSITIONS" subsection per this packet's proposition pattern set spec. Run `npm run sync:ballot-prompt`. Update `src/lib/generatePrompt.test.ts` if any new content needs new assertions (e.g., proposition pattern set is referenced, taxonomy file is referenced). Do NOT modify `docs/BALLOT_PROMPT_ES.md`.

**Phase 2 (single subagent — depends on Phase 1):**
- Agent D — New components: build `RacePatterns.tsx` (anonymize → reveal → pick, stacked candidates, sticky donor-coalition strip, inline numbered superscript source chips with per-dashboard footer) using the salvaged `PlatformAlignmentRatio` / `FunderBars` / `SourceChip` plus a new `EndorsementCluster` and `RetrospectiveStrip` (defined inline in `RacePatterns.tsx` is fine for v1). Build `ValuesTagSelector.tsx` (multi-select chips + free-text + skip). Add `RacePatterns.test.tsx` and `ValuesTagSelector.test.tsx` covering rendered states, empty states, reveal flow, pick/skip wiring, and the proposition variant of `RacePatterns`.

**Phase 3 (single subagent — depends on Phase 2):**
- Agent E — ChatPanel + translations + cleanup: update `ChatPanel.tsx` (delete IssueRanker/RaceFinalEvaluation render paths and `[VOTER RANKED]` send paths; add render dispatch for `[VALUES_TAG_REQUEST]` and `[RACE_PATTERNS]`); update `ChatPanel.test.tsx`. Update `src/lib/translations.ts` (delete obsolete EN keys, add new EN keys for the two new components; ES bodies for the deleted keys can be left as-is since unused — but the *interface* in `translations.ts` must drop the deleted keys cleanly). Delete `src/components/IssueRanker.tsx`, `src/components/IssueRanker.test.tsx`, `src/components/RaceFinalEvaluation.tsx`, `src/components/RaceFinalEvaluation.test.tsx` after confirming nothing else imports them. Run lint + tests.

**Phase 4 (verifier subagent):**
- Run `npm run lint`, `npm run test`, `npm run build`.
- Grep audit per Verification section.
- Walk the Acceptance Criteria list and report pass/fail for each, citing file paths and test names.
- Flag any silent gaps: missing tests, dead code, ES strings that became orphaned and need to be deleted later.
- Output a 1-page verification report. Do NOT make changes.

Source-chip naming clarification for Phase 2: keep `SourcedClaim.tsx` (existing untracked, unchanged) for inline-superscript footnote chips inside running prose. The new extracted `SourceChip.tsx` is the labeled-chip variant used adjacent to a pattern (e.g., next to the donor coalition stacked bar, next to the platform-alignment ratio). Two distinct visual roles, two components; do not merge.
