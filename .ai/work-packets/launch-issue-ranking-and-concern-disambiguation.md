# Work Packet: launch-issue-ranking-and-concern-disambiguation

Status: completed — drag-rank issue priority + free-text concerns + interpretation gate shipped (commit 6cd6c98)
Owner: orchestrator (Claude Opus, this session) → worker subagents (Sonnet)
Source: `.ai/project-briefs/voter-choice-alignment-engine-v2.md` § Phasing → Packet 2.
Branch: launch/production

## Intent

Replace the flat multi-select values tag with a richer Act 2 surface that captures both ranked-by-priority issue chips and the user's own free-text concerns, then runs both through an LLM-driven interpretation gate so the user confirms (or edits) the canonical issue mapping before any alignment scoring happens. This is the input layer for the alignment score that ships in Packet 3.

## Original User Intent

From the v2 brief: "Free-text concerns with stance disambiguation. Users write concerns in their own words. The system extracts canonical topic(s). When stance isn't obvious from phrasing ('reproductive rights' — pro-choice or pro-life?), it asks one disambiguating question per topic before scoring." Plus: "Interpretation confirmation gate. Before any alignment score is computed, the user sees: 'We interpreted your concern as [X, Y, Z] — edit if this isn't right.'"

The user confirmed: drag-and-drop ranking (not weight slider, not tap-order), free-text and chips coexist, hold the no-labeled-guess line.

## Intent Interpretation

The current `ValuesTagSelector` lets the voter pick up to 3 chips (multi-select) and optionally type a single custom concern (mutually exclusive with chips). Replace with: chips support drag-rank, free-text becomes a sibling input that takes 0–3 short concerns, total ranked priorities cap at 3 entries (chip-or-free-text combined). After submit, the LLM emits a `[CONCERN_INTERPRETATION]` block listing each concern with its canonical issue mapping and stance interpretation; ambiguous concerns get a disambiguation question. The voter confirms or edits; confirmation gates the rest of the flow.

This is the input layer for the alignment score (Packet 3). Packet 2 ships the Act 2 surface and the interpretation gate; Packet 3 consumes the confirmed concern list to compute scores.

## Business Logic

Rules:

- Total of 3 ranked priorities cap, mixing chips and free-text. The cap is on the rank list, not separately per type.
- Drag-and-drop reorder via `@dnd-kit/sortable` (already in `package.json`). Numbered badges (1, 2, 3) reflect rank position.
- Free-text concern entry: user types one short concern at a time; submitting it adds it to the ranked list. Cap enforced. User can drag-reorder a free-text concern alongside chips.
- Visual distinction: chips and free-text concerns sit in the same ranked list but are visually distinguishable (italic or "custom" badge on free-text entries).
- Submitting Act 2 emits `[VOTER VALUES] ranked=[{type:"tag",id:"a",rank:1},{type:"freeText",text:"healthcare costs",rank:2},{type:"tag",id:"c",rank:3}]` OR `[VOTER VALUES] skipped` — same `skipped` semantic as today.
- The LLM responds with a `[CONCERN_INTERPRETATION]` block listing each ranked entry with its canonical interpretation, stance, confidence, and (when ambiguous) disambiguation options.
- The user confirms or edits via the new `ConcernInterpretation` UI. Confirmation emits `[VOTER CONFIRMED CONCERNS] confirmations=[...]` with the user's final mapping for each concern.
- No alignment score is computed in Packet 2 — that's Packet 3. The confirmed concern list is the artifact this packet produces; Packet 3 consumes it.
- Hold the no-labeled-guess line: the LLM does NOT recommend whether the voter "really means" pro-choice or pro-life. It says "the phrase 'reproductive rights' typically means abortion access; some voters use it to mean the opposite. Which lens do you want?" — a question, not a guess.

Assumptions:

- The existing `valuesHighlight` field on `RacePatternsCandidate` continues to work — the LLM uses the _confirmed_ concern list (not the raw chips) to populate it in Act 3. No schema change to RacePatterns yet (Packet 3 may extend if needed for alignment score).
- ES path stays held back. New translation keys ship EN only with EN copies in ES bodies.
- Drag-and-drop on mobile is acceptable per @dnd-kit/sortable defaults.

User-confirmed decisions:

- Drag-rank for issue priority, capped at 3.
- Free-text and chips coexist in the same ranked list.
- Hold no-labeled-guess for disambiguation; ask, don't guess.
- Single chat prompt with branching (already settled for candidates vs propositions); concern interpretation works for both paths.

Edge cases:

- Voter submits 0 chips and 0 free-text and skips → `[VOTER VALUES] skipped`. No interpretation block; flow proceeds without highlights (matches today's `valuesHighlight: null` behavior).
- Voter types a free-text concern that maps cleanly to a canonical issue with no ambiguity → interpretation block lists it with `confidence: "clear"` and no disambiguation options. Edit-and-confirm UI shows it as a confirmed mapping.
- Voter types a free-text concern that is genuinely off-topic ("I want to know about my dog") → LLM emits `confidence: "off_topic"` with no canonical mapping; user gets to remove it from their ranked list.
- Voter rejects an interpretation and re-types → flow re-runs interpretation. The chat handles this naturally.
- Voter confirms all without editing → fast path, single tap.

Out of scope:

- Alignment score computation (Packet 3).
- Backend pipeline for vote/donor data (Packet 6).
- Polis viz (Packet 5).
- Per-state proposition routing improvements (Packet 4).
- Spanish path content.

## Commercial Readiness

Applicability: launch
Lanes in scope: product UX (drag-rank, free-text input, interpretation gate), API/contracts (new structured block + payload shapes)
User decisions: none additional
Assumptions: none

## Operational Reproducibility

Setup: existing repo. `@dnd-kit/sortable` already in `package.json`; no new deps.
Configuration: no new env vars.
Provider/Infrastructure/Migrations: not applicable.
Manual steps: none.
Verification: lint + test + build.
Test quality: existing vitest discipline. New tests cover drag reorder, free-text add/remove, payload shape, interpretation block parse + render, confirmation send.

## Scope

Touch:

- `src/components/ValuesTagSelector.tsx` — add drag-rank for selected chips; add free-text input field; total cap 3 across chip + free-text; update submit payload to `ranked: [{type, id?, text?, rank}]` shape OR `"skipped"`.
- `src/components/ValuesTagSelector.test.tsx` — extend test coverage for drag reorder, free-text entry, total cap enforcement, new payload shape.
- `src/components/ConcernInterpretation.tsx` _(new)_ — renders a parsed `[CONCERN_INTERPRETATION]` block. For each entry: shows the user's original concern, the LLM's interpretation, the stance/confidence; if ambiguous, shows disambiguation options as a chip select; allows edit (re-type the original concern) or remove. Confirm button emits the confirmation payload.
- `src/components/ConcernInterpretation.test.tsx` _(new)_ — tests for clear-mapping render, ambiguous-mapping render with options, off-topic render, edit/remove flow, confirm payload shape.
- `src/lib/structured-blocks.ts` — add `[CONCERN_INTERPRETATION]` parser family (parse, strip, hasOpen, stripPartial). New types: `ConcernInterpretationEntry`, `ConcernInterpretationBlock`. Mirror the patterns of existing parsers.
- `src/lib/structured-blocks.test.ts` — tests for the new parser family.
- `src/components/ChatPanel.tsx` — add render branch for `[CONCERN_INTERPRETATION]` (uses `ConcernInterpretation`); add send path for `[VOTER CONFIRMED CONCERNS]`; update existing `[VOTER VALUES]` send path for the new ranked payload shape.
- `src/components/ChatPanel.test.tsx` — tests for the new dispatch + payload + confirmation flow.
- `src/lib/translations.ts` — new EN keys for the drag-rank UI, free-text input placeholder, interpretation gate copy. ES bodies as EN copies.
- `docs/BALLOT_PROMPT.md` — update Act 2 to: (a) emit `[VALUES_TAG_REQUEST]` as today; (b) accept the new `[VOTER VALUES] ranked=[...]` payload format; (c) emit `[CONCERN_INTERPRETATION]` block before any Act 3 work; (d) wait for `[VOTER CONFIRMED CONCERNS]` before proceeding to Act 3. Add the new block to the OUTPUT FORMAT section. Hold the no-labeled-guess line in the disambiguation rule.
- `src/lib/generated/ballotPromptEn.generated.ts` — regenerated mechanically.
- `src/lib/generatePrompt.test.ts` — assertions for the new prompt content.

Do not touch:

- `src/components/RacePatterns.tsx`, `RacePatterns.test.tsx` — Act 3 dashboard stays as-is.
- Per-state data, runoff gate, prompt taxonomies — Packet 1 work.
- Budget code.
- ES content.
- Any Packet 3+ surface (alignment score, polis viz, backend pipeline, proposition routing).

## Ownership Audit

Concern: Act 2 input UX, concern interpretation gate, ChatPanel dispatch additions, prompt's Act 2 + new block.

Existing owners:

- `src/components/ValuesTagSelector.tsx` — Act 2 UI.
- `src/lib/structured-blocks.ts` — block parsers (extend, don't fragment).
- `src/components/ChatPanel.tsx` — render dispatch + send paths.
- `docs/BALLOT_PROMPT.md` — single source for the EN prompt.
- `src/lib/translations.ts` — UI strings.

New owner needed:

- `src/components/ConcernInterpretation.tsx` — new owner of the interpretation gate UI. Boundary: the component renders a parsed block and emits a confirmation event; it does NOT call the LLM or hold network state. The chat panel handles send.

Reuse/edit targets: All listed in Scope > Touch.

Overlap/bloat risks:

- Don't fork the structured-blocks parser; add the new family to the existing file. Avoid creating a parallel parser.
- Don't reimplement chip rendering — `ValuesTagSelector` already has it. Just add drag + free-text on top.
- Don't extend `valuesHighlight` schema in this packet; consume the confirmed concerns in Act 3 prompt-side without a schema change.

Recommendation: Three-phase execution. Phase 1 has two parallel agents (one for `ValuesTagSelector` updates, one for the new `ConcernInterpretation` component + parser). Phase 2 wires it together in `ChatPanel` and updates the prompt. Phase 3 verifier audits.

Execution constraints:

- Do not introduce a "weight slider" or "tap-order ranking" — drag-rank only.
- Do not let the LLM "guess" stance for ambiguous concerns; ask one disambiguating question per ambiguous concern.
- Do not break existing `[VALUES_TAG_REQUEST]` emission or skip behavior.
- Do not couple the new component to network code.
- Do not touch ES translation bodies.
- Do not add npm dependencies (`@dnd-kit/sortable` already present).

## Acceptance Criteria

- `ValuesTagSelector` lets the user select up to 3 entries — chips, free-text, or any mix — and reorder them via drag.
- The submit payload format is `[VOTER VALUES] ranked=[{type,id?,text?,rank}, ...]` or `[VOTER VALUES] skipped`. Old format `tags=[...]` and `custom="..."` no longer emitted.
- New parser family for `[CONCERN_INTERPRETATION]` exists in `src/lib/structured-blocks.ts` with `parseX`, `stripX`, `hasOpenX`, `stripPartialX`.
- `ConcernInterpretation` renders three states per entry: clear mapping, ambiguous mapping with disambiguation options, off-topic. The user can edit, remove, or confirm.
- Confirmation emits `[VOTER CONFIRMED CONCERNS] confirmations=[...]` with the user's final mapping per entry.
- ChatPanel intercepts `[CONCERN_INTERPRETATION]` blocks and renders the component (not raw JSON).
- Prompt's Act 2 instructs the model to emit the interpretation block after `[VOTER VALUES]` and wait for `[VOTER CONFIRMED CONCERNS]` before Act 3.
- Prompt holds no-labeled-guess: model asks the disambiguation question; doesn't guess the user's stance.
- Lint clean, full test suite green, build succeeds.

## Verification

- `npm run lint` — no new errors.
- `npm run test` — full suite green. Test count grows from current 419.
- `npm run build` — succeeds.
- Grep audit:
  - `grep -rn "VOTER VALUES.*tags=\\[\\|VOTER VALUES.*custom=" src/` — should match only test fixtures or migration comments. Live emit path uses the new `ranked=` shape.
  - `grep -rn "CONCERN_INTERPRETATION\\|VOTER CONFIRMED CONCERNS" src/ docs/BALLOT_PROMPT.md` — confirms new block + payload referenced in the right places.
  - `grep -rn "ConcernInterpretation\\|parseConcernInterpretationBlock" src/` — confirms the new component + parser are wired.
- Manual smoke test (orchestrator runs after the packet lands): full E2E flow including chip + free-text entry, drag-reorder, ambiguous concern triggers disambiguation, user edits one mapping, confirms, Act 3 proceeds with the confirmed concerns.

## Anti-Solutions

- Reintroducing `[ISSUE_RANKER]`, `[VOTER RANKED]`, `matchSummary`, or any deprecated v1 shapes.
- A weight slider or tap-order ranking instead of drag-rank.
- Letting the LLM guess stance for ambiguous concerns instead of asking.
- Calling network code from `ConcernInterpretation` (it's a presentation component).
- Forking the structured-blocks parser into a separate file.
- Touching the Spanish prompt or ES bodies for any new key.
- Adding `pdfjs-dist` or any other npm dependency.
- Introducing alignment-score logic ahead of Packet 3.
- Altering `RacePatterns` or `[RACE_PATTERNS]` schema.
- Replacing the existing `[VALUES_TAG_REQUEST]` block — extend the flow, don't replace.

## Notes

Three-phase subagent execution:

**Phase 1 (parallel — 2 subagents):**

- **Agent A — ValuesTagSelector v2 (drag-rank + free-text):**
  Refactor `ValuesTagSelector.tsx` so the selected entries appear in a ranked list with drag-and-drop reorder via `@dnd-kit/sortable`. Add a free-text input below the chips that, on submit (Enter or button), appends a free-text entry to the ranked list. Total cap of 3 entries. Update the submit payload shape to `{ ranked: [{type:"tag",id} | {type:"freeText",text}, with rank index], skipped: false }` or `"skipped"`. Update `ValuesTagSelector.test.tsx` accordingly. Add new translation keys: `valuesTagSelectorFreeTextPlaceholder`, `valuesTagSelectorFreeTextAdd`, `valuesTagSelectorReorderHint`, `valuesTagSelectorRankBadge: (rank: number) => string`, etc.

- **Agent B — ConcernInterpretation component + parser:**
  Add `[CONCERN_INTERPRETATION]` parser family to `src/lib/structured-blocks.ts` mirroring the existing pattern. Schema:
  ```ts
  interface ConcernInterpretationEntry {
    sourceType: "tag" | "freeText";
    sourceTagId?: string;
    sourceText?: string;
    rank: number;
    interpretation: string;
    canonicalIssue?: string;
    stance?: string;
    confidence: "clear" | "low" | "off_topic";
    disambiguationOptions?: string[];
    disambiguationQuestion?: string;
  }
  interface ConcernInterpretationBlock {
    entries: ConcernInterpretationEntry[];
  }
  ```
  Add tests in `structured-blocks.test.ts`.
  Build `src/components/ConcernInterpretation.tsx`. Props: `block`, `onConfirm: (confirmations: ConfirmedConcern[]) => void`, `isSubmitting?`, `isSubmitted?`. For each entry: render the source concern, the interpretation, the confidence. If `confidence === "low"` and `disambiguationOptions` present, render the question + chip select; user must pick before confirming. If `confidence === "off_topic"`, render an explanation and an X to remove. Edit affordance for clear mappings: lets the user re-type the source concern (re-emits a re-interpretation request via a `[VOTER REINTERPRET] sourceRank=2 newText="..."` send path — Phase 2 wires this). The component is presentation-only; emits events; ChatPanel handles network.
  Add `ConcernInterpretation.test.tsx`.

**Phase 2 (single subagent — depends on Phase 1):**

- **Agent C — ChatPanel + prompt integration:**
  Update `ChatPanel.tsx` to:
  - Wire the new `ValuesTagSelector` payload format to a `[VOTER VALUES] ranked=[...]` send.
  - Add render branch for `[CONCERN_INTERPRETATION]` blocks via `ConcernInterpretation`.
  - Add send path for `[VOTER CONFIRMED CONCERNS] confirmations=[...]`.
  - Add send path for `[VOTER REINTERPRET] sourceRank=N newText="..."` (used by the edit affordance).
  - Update `ChatPanel.test.tsx`.
    Update `docs/BALLOT_PROMPT.md` Act 2:
  - Document the new `[VOTER VALUES] ranked=[...]` payload format the model receives.
  - Instruct the model to emit `[CONCERN_INTERPRETATION]` listing each ranked entry with interpretation, stance, confidence, and (when ambiguous) disambiguation options + a non-leading question.
  - Tell the model to wait for `[VOTER CONFIRMED CONCERNS]` before proceeding to Act 3.
  - Reference the no-labeled-guess line in the disambiguation rule.
  - Add `[CONCERN_INTERPRETATION]` and `[VOTER CONFIRMED CONCERNS]` to the OUTPUT FORMAT section.
    Run `npm run sync:ballot-prompt`. Update `generatePrompt.test.ts` with assertions on the new prompt content. Skip Spanish path entirely.

**Phase 3 (verifier subagent):**
Run lint + test + build. Walk acceptance criteria. Grep audit for old payload shapes vs new. Output verification report. Make zero edits.

Pinning down the source map for any agent that needs it:

- `@dnd-kit/sortable` reuse pattern: see git log for the deleted `IssueRanker.tsx` (commit pre-`bb355f8`) for the prior pattern.
- Existing parser shape: see `parseRacePatternsBlock` and `parseValuesTagRequestBlock` in `structured-blocks.ts` for the four-function quartet (parse, strip, hasOpen, stripPartial).
- Existing render-dispatch pattern: see `renderRacePatterns` and `renderValuesTagSelector` in `ChatPanel.tsx`.
- Existing prompt structure: Act 2 lives around lines 107–145 of `docs/BALLOT_PROMPT.md`.
