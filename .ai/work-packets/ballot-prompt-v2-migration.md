# Work Packet: ballot-prompt-v2-migration

Status: implemented-pending-manual-review
Owner: orchestrator (route to coding agent after open user decisions are answered)
Source: chat session 2026-05-08 — review of `docs/BALLOT_PROMPT v2.md` against runtime ballot research flow
Branch: TBD (feature branch off `launch/production`)

## Intent

Migrate the in-product ballot research LLM and the copy/paste-to-external-LLM fallback to the v2 ballot prompt (EN + ES), and remove the candidate-card and proposition-card UI that v2 explicitly does not emit. v2 is a structural rewrite of voice and flow — three-act narrative, anonymized signal questions, hidden party labels — with guardrails matched to the existing runtime context block contract. The runtime context assembly (`buildContextBlock` and friends) is unchanged; only the system prompt content and the structured-block UI consumers change.

## Original User Intent

Verbatim from chat:
- "v2 replaces v1 in both the chat LLM and in the 'copy this prompt' but that's a code question, not a prompt question."
- "Hide the cards completely - I really dunno when I'll use them again."
- "Yeah we need the SP version. And it needs to be updated in the codebase for the SP version of the site as well."
- "Match the SP to the EN version 2"
- "Keep the party information on the backend, do not show in Act 1 or Act 2 - keep party information anonymized until the very end where we wrap up their decisions and give htem their recommended ballot choices based on what they value."
- "Actually I'd like a prompt for all the coding related work we generated in this session"

## Intent Interpretation

v2 is now the single source of truth for both the in-product chat (the Anthropic API call from `src/app/api/chat/route.ts`) and the "copy this prompt" external-LLM fallback (rendered when budget is exhausted). The Spanish v2 follows the same documentary voice as EN and replaces the inline `BALLOT_PROMPT_ES` constant in `src/lib/generatePrompt.ts`. Candidate cards and proposition cards are removed entirely — chat-text-only across the whole experience, in both languages. The runtime context block contract (`Path A` Civic-confirmed / `Path B` voter-pasted / `Path C` unconfirmed startDirectives in `buildContextBlock`) is preserved; v2 was rewritten to be compatible with that contract, so the context-block code does not need structural changes.

## Business Logic

Rules:
- Party labels must NEVER appear in any LLM output (Act 1, Act 2, Act 3, or ballot summary). The codebase does not enforce this — the prompt does. Verification must confirm both EN and ES prompts carry the explicit party-suppression language, end-to-end, into the rendered system prompt.
- Candidate names appear only in two places: Act 1 ballot check (verification, no party) and Act 3 (with evidence, no party). Act 2 stays anonymized as "Candidate A / Candidate B" — never named.
- The runtime context block is the LLM's ballot source of truth. The code already passes this in. Do not re-architect the context assembly.
- Three runtime ballot states (Path A: Civic-confirmed contests, Path B: voter-pasted sample ballot text, Path C: no contests confirmed) must continue to work. v2 prompt has explicit handling for all three; do not collapse them.
- The system prompt for EN is currently sourced from `docs/BALLOT_PROMPT.md` and compiled into `src/lib/generated/ballotPromptEn.generated.ts`. v2 should follow the same compile pattern.
- ES is currently inline in `src/lib/generatePrompt.ts`. Recommended target: ES moves to the same markdown→`.generated.ts` compile pattern as EN. This is a user decision listed below.

Assumptions:
- v1 (current `docs/BALLOT_PROMPT.md`) is archived under `docs/archive/` rather than deleted, in case rollback is needed.
- Filenames "BALLOT_PROMPT v2.md" and "BALLOT_PROMPT v2 ES.md" get renamed during migration to drop the "v2" suffix once they're canonical, so the codebase doesn't carry permanent "v2" tech debt in filenames.
- The compile script that generates `ballotPromptEn.generated.ts` from the markdown doc exists. Worker locates it (likely a `scripts/` file or a `package.json` script) and either repoints it at the new EN source path or renames the new source file to match the existing input path.

User-confirmed decisions:
- v2 EN replaces v1 EN in both in-product chat and copy/paste fallback.
- v2 ES replaces inline `BALLOT_PROMPT_ES` constant.
- ES matches the EN compile pattern: markdown source → generated TypeScript module.
- Canonical prompt filenames drop the `v2` suffix; v1 is archived under `docs/archive/`.
- Cards (`[CANDIDATES]` and `[PROPOSITION]`) are removed entirely — no candidate cards, no proposition cards anywhere, in either language.
- Spanish v2 matches EN v2 voice (documentary register).

Edge cases:
- A user mid-session when the deploy lands. The system prompt does not change mid-conversation; the existing chat finishes on v1. No live-migration logic needed.
- A user has a saved voter profile from a v1 session and starts a new session under v2. The voter profile format has not changed between v1 and v2, so this should work — verify in the returning-voter flow.
- A Spanish-language session with party-label suppression. Validate that `formatContestsBlockEs` (which already strips party from Civic data into Spanish headings) plus v2 ES prompt language produces zero party labels in rendered output.

Out of scope:
- Switching candidate research from `web_search` tool to a structured API. Muxin flagged separately: "we need to ensure we're pulling data via good sources, not just plain webfetch." That belongs in a follow-up packet.
- Word caps, length limits, and Act sequencing are deliberately set in the prompt. Do not enforce in code.
- Voice tweaks to either prompt. The prompts are the canonical voice artifact; this packet wires them in, it does not edit them.
- Any change to `src/app/api/civic/route.ts` or the Anthropic API call shape in `src/app/api/chat/route.ts`.
- Any change to `buildContextBlock`, `formatContestsBlock`, `formatUserSampleBallotBlock`, or other context-block helpers in `generatePrompt.ts`.

## Commercial Readiness

Applicability: launch (this is the production ballot tool).

Lanes in scope:
- product UX (voice and flow change in LLM output, card UI removal in both languages)
- privacy/data (party-label suppression is a privacy/values commitment of v2; verify it holds end-to-end)
- API/contracts (chat API and Civic API contracts unchanged; structured-block parsing contract is being removed and the chat UI must no longer expect it)
- deployment/config (compile-time generation of ES requires a new build step if migrating to the .generated.ts pattern)

User decisions resolved:
- ES moved to the EN compile pattern: markdown source → `.generated.ts` import.
- Canonical prompt filenames drop the `v2` suffix.
- v1 is archived under `docs/archive/` with a dated suffix.

Assumptions:
- The "copy this prompt" external-LLM fallback uses the same `generatePrompt()` output as the in-product chat. Worker should verify this; if it's a separate code path, it must also be updated.

## Operational Reproducibility

Setup:
- `npm install` (existing).
- Locate the prompt compile script. Worker checks `package.json` scripts and any `scripts/` directory to find what generates `ballotPromptEn.generated.ts`.

Configuration:
- No new env variables.
- No new provider IDs.

Provider setup:
- Not applicable.

Infrastructure/deployment:
- Standard Vercel deploy via `.github/workflows/deploy.yml` on `launch/production` push.

Database migrations:
- Not applicable.

Manual steps:
- Voice-check the Spanish v2 prompt with at least one Spanish-fluent reader before merge. The documentary voice is unusual for civic tools and a native-speaker gut-check should land before deploy.

Verification:
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` — confirm chat flow tests pass; update or remove any tests that depend on card rendering.
- Manual smoke test (see Evidence Plan).

Test quality:
- Add a regression test asserting `[CANDIDATES]` and `[PROPOSITION]` substrings never appear in rendered chat output during a real session in either language.
- Add a regression test asserting the rendered EN system prompt contains the exact phrase "Party stays hidden" and the rendered ES contains "El partido se mantiene oculto."

Critical logic trigger:
- privacy: party-label suppression is the core privacy/values commitment of v2. A code regression that re-enables card parsing or a prompt regression that drops the party-suppression language would silently break this. Both regressions need explicit test coverage.

## Scope

Touch:
- `docs/BALLOT_PROMPT v2.md` — rename or copy to canonical EN source path
- `docs/BALLOT_PROMPT v2 ES.md` — rename or copy to canonical ES source path
- `docs/BALLOT_PROMPT.md` — archive (move to `docs/archive/` with a dated suffix)
- The compile script that generates `src/lib/generated/ballotPromptEn.generated.ts` — repoint at the new EN source if filename changes; extend the same pattern to ES if user approves the recommendation
- `src/lib/generatePrompt.ts` — replace the inline `BALLOT_PROMPT_ES` constant with either an import from a new `.generated.ts` file (recommended) or the new v2 ES content inline (if user opts to keep inline)
- `src/lib/chatParser.ts` — remove the file and all its exports
- React components that render `CandidatesBlock` and `PropositionBlock` cards — remove the files (worker locates them; likely under `src/components/`)
- ChatPanel and any other consumers of `chatParser.ts` exports — remove imports, simplify display logic to render assistant messages as plain text only
- Any tests that depend on card rendering — update or remove
- Add a regression test for party-label suppression in the rendered system prompts (EN + ES)
- Add a regression test that no `[CANDIDATES]` or `[PROPOSITION]` strings appear in rendered chat output

Do not touch:
- `src/app/api/civic/route.ts` — Civic API integration is fine
- `src/app/api/chat/route.ts` — the Anthropic API call shape, web_search wiring, voter profile carry-over, and budget logic are all unchanged
- `buildContextBlock`, `formatContestsBlock`, `formatContestsBlockEs`, `formatUserSampleBallotBlock`, `formatUserSampleBallotBlockEs`, `formatBallotSourceBlock`, `formatCountyResourcesBlock`, `formatVoteByMailBlock`, and similar context-assembly helpers in `src/lib/generatePrompt.ts` — runtime context block contract is preserved
- The voter profile sandboxing markers (`[BEGIN USER VOTER PROFILE]` / `[END USER VOTER PROFILE]`) — format unchanged
- Web search tool wiring in the chat API — separate concern, future packet
- The frontend address-entry / Civic lookup flow in `BallotToolClient.tsx` and `ResearchLayout` — out of scope

## Ownership Audit

Concern: The system prompt that powers the ballot research LLM (EN + ES), the structured-block parser, and the card-rendering UI components.

Existing owner:
- EN prompt: `docs/BALLOT_PROMPT.md` (source) → `src/lib/generated/ballotPromptEn.generated.ts` (generated import target)
- ES prompt: inline `BALLOT_PROMPT_ES` constant in `src/lib/generatePrompt.ts`
- Structured block parsing: `src/lib/chatParser.ts`
- Card rendering: ChatPanel components (worker locates exact files under `src/components/`)

Neighboring owners:
- `src/lib/generatePrompt.ts` owns the runtime context block assembly. Out of scope for structural changes; the prompt content sourced from new files flows through this owner.
- `src/app/api/chat/route.ts` owns the Anthropic API call shape. Out of scope.
- `src/types/election.ts` and `src/types/ballotSource.ts` own the data types passed into the context block. Out of scope.

Files/modules/docs inspected:
- `docs/BALLOT_PROMPT.md`
- `docs/BALLOT_PROMPT v2.md`
- `docs/BALLOT_PROMPT v2 ES.md`
- `src/lib/generatePrompt.ts`
- `src/lib/generated/ballotPromptEn.generated.ts`
- `src/lib/chatParser.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/civic/route.ts`
- `AGENTS.md`, `CLAUDE.md`, `docs/ai-coding-practices/guardrails/work-packet-rules.md`

Reuse/edit targets:
- The existing EN compile pattern is the right reuse target for ES. Do not invent a new pattern.
- Removal of `chatParser.ts` and card components is clean deletion — no replacement abstraction.

New owner needed: no.

Overlap/bloat risks:
- Two sources of truth for ES (inline + markdown) if migration is incomplete. Worker must commit to one pattern and remove the other before merge.
- v1 sticking around in `docs/` as a "fallback" creates drift risk. Archive cleanly under `docs/archive/`.
- Card component files living in the codebase but never imported create dead-code drift. Delete the files; do not just remove imports.
- `chatParser.ts` regex left in place "for safety" creates a parser that runs but renders nothing — half-removed state. Delete the file.

Recommendation:
- Worker locates the EN compile script first and confirms with the user the ES migration approach (compile pattern vs. inline) before executing.
- Card UI removal is independent and can run in parallel with prompt migration.
- v1 archive is the last step before merge, so the working state is recoverable until the very end.

Execution constraints:
- Do not introduce a new prompt-loading mechanism.
- Do not leave the `[CANDIDATES]`/`[PROPOSITION]` regex in place.
- Do not add a feature flag to toggle v1 vs v2 — Muxin chose full replacement.
- Do not invent intermediate "stripped parser" or "no-op renderer" stubs.

## Acceptance Criteria

- The in-product chat at `/api/chat` uses v2 EN prompt content as the system prompt for English sessions, sourced from a single canonical file with no v1 content remaining anywhere in the runtime path.
- The in-product chat uses v2 ES prompt content as the system prompt for Spanish sessions, sourced from the same compile pattern as EN if the user approved that migration, OR inline if the user explicitly opted to keep ES inline.
- The "copy this prompt" external-LLM fallback emits v2 content (EN or ES depending on language selected), not v1.
- No `[CANDIDATES]` or `[PROPOSITION]` JSON metadata blocks appear in any rendered chat output during a real session in either language.
- The chat UI renders no candidate cards or proposition cards at any point in any language. All chat output is plain text.
- A grep of the codebase for `[CANDIDATES]` and `[PROPOSITION]` (excluding archived v1 file and the regression tests asserting their absence) returns zero matches.
- v1 prompt content is preserved in `docs/archive/` for rollback reference, not deleted from history.
- v2 ES has been read by a Spanish-fluent reader and the documentary voice is approved.
- All existing tests pass; new regression tests for party-label suppression and card-block absence pass.

## Verification

- 2026-05-08 execution evidence:
  - `npm run test` passed: 21 files, 242 tests.
  - `npm run lint` passed with existing complexity warnings.
  - `npm run build` passed.
  - `npm run e2e` passed: 64 Playwright tests. First sandboxed attempt failed because the web server could not bind to `0.0.0.0:3000`; rerun with approved escalation passed.
  - `git diff --check` passed.
  - Runtime parser/card references grep returned no `chatParser`, `StructuredCards`, `ResearchProgress`, `parseStructuredContent`, `computeProgress`, or structured block type references under `src/`.

- `npm run lint` clean
- `npm run test` clean (with new regression tests added)
- `npm run build` clean
- `npm run e2e` — chat flow tests pass; tests that previously asserted card rendering are updated or removed with reason recorded
- Manual smoke test in EN: fresh session, observe Act 1 cinematic open + ballot check (with candidate names, no party labels, ballot URL as full-visible markdown link), advance through Act 2 (anonymized signal questions, no candidate names, no party labels), reach Act 3 (named candidates with evidence, still no party labels), finish on the ballot summary. Confirm zero card UI renders at any point.
- Manual smoke test in ES: same flow in Spanish, same expectations.
- Manual smoke test of "copy this prompt" path: confirm the copied prompt text contains v2-specific markers (e.g., "ACT 1: OPEN THE STORY" in EN, "ACTO 1: ABRE LA HISTORIA" in ES) and contains zero v1-specific markers (e.g., "FIRST RESPONSE: ORIENTATION ONLY", "STRUCTURED OUTPUT FOR UI").
- Regression test: rendered EN system prompt contains "Party stays hidden"; rendered ES system prompt contains "El partido se mantiene oculto".
- Regression test: rendered chat output during a smoke session contains zero `[CANDIDATES]` or `[PROPOSITION]` substrings.

## Evidence Plan

Visual evidence:
- Screenshot of EN chat at Act 1 (cinematic open + ballot check rendered, no cards visible).
- Screenshot of EN chat at Act 2 (anonymized signal question rendered, no names, no cards).
- Screenshot of EN chat at Act 3 (named candidates with evidence in prose, no party labels, no cards).
- Same three screenshots in ES.
- Screenshot of the "copy this prompt" output containing v2 content and showing the v2 markers.

Behavior evidence:
- Walk through one full ballot (Act 1 → Act 2 → Act 3 → ballot summary) in EN; record that no card renders at any point and no party labels appear.
- Walk through same in ES.
- Returning-voter flow: load a voter profile from a previous session into a new v2 session and confirm the prompt's RETURNING VOTERS section fires (the prompt acknowledges the profile briefly without re-interviewing).

Business logic evidence:
- Rule: "no party labels in any chat output." Input: a Texas runoff ballot with both Republican and Democratic candidates passed via Civic data. Expected: zero "Republican", "Democrat", "GOP", "Dem" strings in the rendered chat across the whole session. Observed: confirm via session transcript inspection.
- Rule: "Path C startDirective continues to work." Input: a session where Civic returns no contests. Expected: the LLM produces the cinematic open plus a CTA bullet pointing to the county sample ballot link with full URL visible. Observed: confirm via smoke session transcript.

Persistence evidence:
- Voter profile from a prior session loads and the v2 RETURNING VOTERS flow fires in the next session.

Auth/security evidence:
- Confirm the system prompt does NOT contain the user's exact street address. The privacy contract from `buildContextBlock` is preserved; v2 was written assuming this.

Commercial readiness evidence:
- Vercel preview deploy of the change works end-to-end (EN flow + ES flow + copy-paste fallback) before merge to `launch/production`.

Operational evidence:
- The compile script (or build step) for the EN prompt runs cleanly in CI.
- If migrated, the ES compile step runs cleanly in CI and produces the equivalent `.generated.ts` import target.
- `package.json` scripts and `.github/workflows/deploy.yml` reflect any rename or addition.

Integration evidence:
- A real Anthropic API call against the v2 EN system prompt returns a v2-style response (e.g., the documentary "Picture [date]" cinematic open) when given a representative Path A context block.
- Same against v2 ES.

Regression evidence:
- All existing tests pass.
- New tests assert the absence of `[CANDIDATES]` and `[PROPOSITION]` substrings in rendered chat output.
- New tests assert the presence of party-suppression phrases in the rendered system prompts.

Proof standard:
- All six screenshots (EN×3, ES×3) showing the new flow with no cards and no party labels, plus a clean test run including the new regression tests, plus a Vercel preview deploy that passes the smoke checklist.

Non-proof:
- "Component compiles" is not enough — the card components must not render and must not be imported.
- "Prompt file replaced" is not enough — the runtime LLM call must use v2 content end-to-end and the rendered chat must show v2-shaped output.
- "Lint passes" is not enough — manual smoke tests in both languages are required.
- "Manually tested" without screenshots or transcript references is not enough.

## Anti-Solutions

- Keeping `chatParser.ts` with stub functions that "return empty arrays" — half-removed state. Delete the file.
- Adding a feature flag to switch between v1 and v2 prompts — Muxin chose full replacement.
- Inlining v2 ES as a constant when EN is generated from markdown — creates two sources of truth and makes future updates painful. Surface this as the user decision and proceed only after answer.
- Leaving v1 in `docs/BALLOT_PROMPT.md` as a "fallback" — archive it cleanly under `docs/archive/`.
- Comment-out card components instead of deleting them — code rot.
- Trying to enforce "no party labels" by post-processing LLM output to strip "Republican"/"Democrat" — the prompt is the source of truth; verify via tests, do not filter at runtime.
- Naming the new ES generated file inconsistently with EN (e.g., `es-prompt.ts` while EN is `ballotPromptEn.generated.ts`).
- Trying to handle "what if cards are wanted in the future" — they aren't. If they are, that's a future packet.
- Replacing the `[CANDIDATES]` regex in `chatParser.ts` with a different parser instead of removing the file — same drift risk.
- Renaming `BALLOT_PROMPT v2.md` to `BALLOT_PROMPT.md` without first archiving v1, leaving a window where v1 is lost from disk.

## Notes

- The compile pattern for EN: `docs/BALLOT_PROMPT.md` → `src/lib/generated/ballotPromptEn.generated.ts`. Worker should locate the script that performs this generation (likely a build script or a one-shot file under `scripts/`). The script either gets repointed at the new v2 source filename, or the v2 source gets renamed to match the existing input path.
- ES inline vs. compile pattern is the headline user decision in this packet. Strong recommendation to migrate ES to the compile pattern; surface the decision to Muxin before execution.
- Filenames currently have spaces ("BALLOT_PROMPT v2.md", "BALLOT_PROMPT v2 ES.md"). Spaces may break the compile script depending on how paths are quoted. Consider renaming to space-free canonical names during the rename step.
- Web search budget concern: Muxin flagged separately ("we need to ensure we're pulling data via good sources, not just plain webfetch") — out of scope here, but log as a follow-up packet titled something like `candidate-research-data-sources`.
- Voter profile format did not change between v1 and v2. Returning voters should work seamlessly. Verify in smoke test, do not migrate profile data.
- The `[CANDIDATES]` JSON schema in `chatParser.ts` includes a `party` field. This field already drives no UI behavior under v2 (the prompt was already updated to not emit `party`), but its presence in the type system is a smell. Removing the file removes the type.
- Both v2 prompt files have explicit language matching the runtime context block contract — `## RACES ON MY BALLOT` for EN, `## CONTIENDAS EN MI BOLETA` for ES — so no context-block code change is needed.
- v2 prompts explicitly tell the LLM not to ask for zip code, address, voter ID, or driver's license. The context block already passes zip + county + state + district. If the runtime ever stops passing this, the v2 prompts will start asking for it. This is a soft coupling; document it where the context-block helpers live or in a `Notes` section of `generatePrompt.ts` as part of this packet.
