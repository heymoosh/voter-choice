# Voter Choice Backlog — Archive (Resolved)

Append-only record of resolved/shipped backlog items, moved out of the live board
(`voter-choice-backlog.md`) on 2026-06-12 to keep the tracker live-state-only.
Cards are preserved verbatim as they were when resolved. Newest archival at top of
each batch; not maintained as a live Kanban board.

---

**[P1] Election DATA must cover ANY upcoming election for the address, and gate logic must follow each state's rules**

**Status:** RESOLVED 2026-06-10 (branch claude/alignment-election-data-rules-smlqus) — all 51
STATUS: Done
state JSONs verified against 2026 SoS sources (every election stamped lastVerified+source; the
2026-11-03 general everywhere; LA rebuilt; runoffs added for AL/AR/GA/MS/OK/SC/SD/TX), a
completeness test asserts post-primary dates resolve a FUTURE election, and the party gate now
consults getStateRule (open/top-two/general → no gate; closed/semi-closed/runoff-lock → statute-
cited copy). Original note kept below for context.

**Broader requirement (Muxin, 2026-06-05):** this is not just "include the November general." The
election data resolved for a given ADDRESS must include ANY/ALL upcoming elections (primary,
runoff, general, special, municipal), and the app must decide which gate to apply — _if any_ —
from that `(state × electionType)`'s rules (closed primary → party gate; general → no gate; open
primary → different ask; etc.). Make it fully address- + date- + rule-driven, never assuming one
election type. The original (narrower) note follows.

The _architecture_ is correct and already (state × election)-aware: `src/lib/state-rules/`
is keyed by `(state, electionType)` (closed / semi-closed / open / top-two / runoff), and a
missing `(state, electionType)` row means **no gate** — so GENERAL elections correctly skip
the party question (in November you may vote for any candidate, so we should NOT ask "are you
a registered Democrat/Republican?"). `getStateData.findUpcomingElection()` is date-driven
(earliest election with `date >= today`).

THE GAP is DATA completeness/freshness. Each `src/data/states/<ST>.json` `elections[]` array
must contain the upcoming GENERAL (`2026-11-03`) + future elections with correct `type`. If a
state lists only the past primary, `findUpcomingElection` falls back to the LAST element (the
primary) → the app stays stuck on the primary party-gate after the primary date. **Suspected
cause of the NJ primary gate still appearing on/after 2026-06-03.**

**Action:** audit every `src/data/states/*.json` — ensure each carries the 2026 general (+ any
runoff) with correct dates/types; add a test asserting that on a post-primary date the resolved
election is the general and the gate is skipped.

**[P1] Printable ballot shows generic placeholders, not real ADDRESS-based voting logistics**

**Status:** LARGELY RESOLVED 2026-06-10 (branch claude/alignment-election-data-rules-smlqus) —
STATUS: Done
the congress-assessment flow now fires a best-effort /api/civic lookup from the address and
surfaces the real polling place/hours (honest source labels) into the workspace bar + printable
scorecard; the legacy workspace loads the real per-state JSON (verified deadlines, voter-ID,
statutory hours) instead of the fallback shape. Remaining: early-vote SITE addresses and
precinct numbers when civic carries them. Original note kept below for context.

The print/header logistics block is honestly driven by the real STATE (the voter-ID rule is
correct — e.g. NJ "No ID required for most in-person voters…"), but the ADDRESS-specific fields
are still placeholders: **DISTRICT** renders `—`, and **polling place / hours / early voting**
show the generic "Look up your polling place, hours & early voting at vote.gov." This is the
deliberate honest interim from the F12 fix (don't fabricate logistics we haven't resolved).

**Action:** populate from the voter's address — congressional/legislative **district**, **polling
place**, **hours**, and **early-voting locations**. The Google Civic `voterinfo` response the app
already calls returns `pollingLocations` + `earlyVoteSites` + division/district info (`POST /api/civic`
→ `{contests, pollingLocations, …}`); surface those into the print + workspace logistics block, and
keep the vote.gov line only as the fallback when civic returns nothing. Supersedes the older
"state-specific SOS links + real county" note in REBUILD_STATUS. Honesty bar: never show an address
or polling place we didn't actually resolve.

**[P2] WI has 0% donor coverage (honest, but notable)**

**Status:** Documented, no action needed
STATUS: Done

WI source deleted 2026-05-14 after finding implausibly large amounts ($26M for state senator from `wi_cfis_bulk`). WI has no electronic filing mandate — structural ceiling. Chat will not show donor data for WI candidates. This is correct behavior.

**[P0 — FIXED 2026-05-15] `healthcare_access` wrong canonical id in system prompt example**

**Status:** Fixed in `docs/BALLOT_PROMPT.md` + regenerated, commit pending
STATUS: Done

The `[CONCERN_INTERPRETATION]` example in the system prompt showed `"canonicalIssue":"healthcare_access"` — a string that doesn't exist in the `issue_tags` table. When Claude followed this example for health-related voter concerns, `lookup_alignment` returned no contributing votes (correct format, zero results), and the chat fell back to web search instead of using the voting record database.

**Fix applied:** Corrected example to `healthcare_affordability`. Added explicit vocabulary list of all 15 valid ids to the system prompt rules so the model cannot invent variants.

**Monitoring:** After the API cap is lifted and chat is functional, spot-check a session where a voter mentions "healthcare costs" and confirm the alignment tool is called with `healthcare_affordability`, not a variant.

**[P1 — FIXED 2026-05-18] Ranked priorities reorder showed letter ids instead of issue labels**

**Status:** Fixed in `fix/launch-prod-feedback` (commit 1054bcb)
STATUS: Done

The `SortableItem` in `src/components/ValuesTagSelector.tsx` rendered `item.id` (e.g., `"a"`, `"b"`, `"d"`) instead of `item.label` in the drag-rank list. The single-letter ids worked correctly as click handles for the chip picker but bled through to the reorder UI, leaving voters staring at "a / b / d" with no idea what they were prioritizing.

**Fix applied:** Pass `block.items` into `SortableItem` and look up the human label by id. Regression test added.

**Monitoring:** Visual smoke — confirm the drag-rank surface in step 2 shows issue labels like "Crime / public safety" rather than letters.

**[P1 — FIXED 2026-05-18] Reveal Candidates was required before picking and was one-way**

**Status:** Fixed in `fix/launch-prod-feedback` (commit 1054bcb)
STATUS: Done

Anonymous-first ranking is the whole point of the candidate cards — voters should pick on alignment, not on name recognition. The original flow inverted that: the Reveal Candidates button was a precondition for picking, and once clicked, names couldn't be hidden again.

**Fix applied in `src/components/RacePatterns.tsx`:** Pick is now decoupled from reveal; voters can choose "Candidate A" while names stay hidden. The button toggles between **Reveal Candidates** and **Hide Names**. New `racePatternsHideButton` translation key (en + es).

**Monitoring:** Confirm a voter can pick a candidate without revealing names, and the button text correctly flips between reveal/hide.

**[P1 — FIXED 2026-05-18] No proactive ballot / voter-profile CTA — voter had to text-prompt the AI**

**Status:** Fixed in `fix/launch-prod-feedback` (commits 1054bcb + 3f72b26)
STATUS: Done

After finishing a ballot, voters had no obvious way to get the printable ballot and voter-profile deliverable — they had to type a request into the chat and hope the model interpreted it. Muxin's E2E run had to text-prompt explicitly.

- **Two-part fix:**

1. `docs/BALLOT_PROMPT.md` (en + es) now instructs the model to emit `[MY BALLOT]` / `[MY VOTER PROFILE]` / `[SESSION HANDOFF]` blocks **automatically** when the voter finishes a ballot or signals "done" — no "would you like a profile?" gate. Regenerated `ballotPromptEn.generated.ts` / `ballotPromptEs.generated.ts` via `npm run sync:ballot-prompt`.
2. New safety-net button in `ChatPanel.tsx` ("Generate my voter profile and printable ballot", sticky bottom) that dispatches the canned request to the model — guarantees voters can always reach the deliverable even when the model misses the proactive cue.

**Monitoring:** Post-deploy, observe a few full sessions to see whether the proactive emission lands without the button being clicked. If the safety net is being clicked frequently, the prompt cue isn't reliable enough.

**[P2 — FIXED 2026-05-18] Streaming structured blocks rendered as raw JSON / text mess**

**Status:** Fixed in `fix/launch-prod-feedback` (commit 3f72b26)
STATUS: Done

While the model streamed a structured block (race-patterns, alignment-scores, values-tag-request, concern-interpretation), the in-flight JSON/markdown leaked into the chat surface and looked broken. Loading placeholders for each block type now render an `animate-pulse` container + inline Loader SVG + contextual copy until the block is parseable.

**Monitoring:** Throttle the network in devtools and watch a chat response — placeholders should appear in place of raw text for each of the four block types.

**[P2] deploy.yml `vercel env add` failures were silently swallowed**

**Status:** Fixed 2026-05-15
STATUS: Done

All `vercel env add` calls previously used `2>/dev/null || true`. ANTHROPIC_VOTER_API was not landing in production deployments; `/api/chat` returned 500. Fixed with explicit `::notice::`/`::error::` logging.

**[P1 — FIXED 2026-05-18] Budget meter overestimated spend by ~3x (Sonnet pricing constants on a Haiku-priced model)**

**Status:** Fixed in `fix/launch-prod-feedback` (commit 3f72b26). Full audit: `docs/operations/budget-cap-investigation-2026-05-18.md`
STATUS: Done

The chat route switched to `claude-haiku-4-5-20251001` on 2026-05-08 but the cost constants in `src/lib/budget.ts` were never updated from Sonnet pricing. Real Anthropic spend was tracked correctly on the Anthropic Console, but the app's internal meter was running ~3x high — which tripped the $50/mo soft cap when actual spend was closer to $17. This is the root cause of what voters experienced as a "monthly limit reached" message during Muxin's launch-week testing.

**Fix applied:** Constants updated to Haiku 4.5 pricing: $1 input / $5 output / $0.10 cached read / $1.25 cache write. The $50 cap is unchanged — the math correction effectively gives ~3x headroom, which matches the actual budget we wanted.

**Monitoring:** Cross-check `budget.ts`-reported spend against the Anthropic Console weekly for the next month to confirm the meter and reality stay in sync. If the model is ever swapped again, this is the file to update.

**[P2 — FIXED 2026-05-18] "Finish this later" visible after budget exhaustion (re-triggered the gate)**

**Status:** Fixed in `fix/launch-prod-feedback` (commit 3f72b26)
STATUS: Done

After the budget cap was hit, the "Finish this later" button remained visible — clicking it just re-triggered the exhaustion gate, which was confusing. Now hidden when `budgetStatus.tier` is `soft_close`, `handoff`, or `exhausted`.

**Monitoring:** Force a `soft_close` tier locally and confirm the button is gone.

**[P2 — FIXED 2026-05-18] Budget-exhausted copy confused voters as a personal API limit**

**Status:** Fixed in `fix/launch-prod-feedback` (commit 3f72b26)
STATUS: Done

The exhaustion message read as if the voter's personal Anthropic API key had hit a limit. Updated `src/lib/translations.ts` to clarify: "Our free AI chat reached its monthly limit. Your personal Anthropic API key is unaffected..." — explicitly distinguishes the free-tier app cap from the bring-your-own-key path.

**Monitoring:** Trigger exhaustion in en + es and confirm copy reads cleanly in both.

**[idea — IMPLEMENTED 2026-05-18] Tesseract.js OCR fallback for scanned PDFs**

**Status:** Shipped in `fix/launch-prod-feedback` (commit 1054bcb)
STATUS: Done

`ResearchLayout` PDF upload now OCR-fallbacks via `tesseract.js` when pdfjs returns fewer than 50 characters (i.e., the PDF is a scan, not a text-layer document). Lazy-imported on the scanned-PDF code path only — zero initial-bundle cost for the common text-layer case. Pinned `tesseract.js@5.1.1`. Also updated `pdfScannedError` copy with explicit Cmd/Ctrl+A copy-paste fallback steps, and opened the upload `<details>` by default so the textarea surface is discoverable.

**Monitoring:** Validate on actual scanned ballot PDFs post-deploy — a few real county-provided scans are the only meaningful test. If OCR quality is poor for specific counties' scan formats, that's a tuning conversation (preprocess image, try alternate language packs).

**[P1 — FIXED 2026-05-19] Generate-profile + Finish-later buttons visible after profile already generated**

**Status:** FIXED in `fix/launch-prod-feedback`
STATUS: Done

User had already generated her voter profile and printable ballot but the safety-net "Generate my voter profile and printable ballot" + "Finish this later" buttons were still showing at the bottom of the chat, which was confusing — those deliverables already exist. Buttons now gated on `!ballotReady`: once the AI has emitted `[MY BALLOT]`, they disappear.

**[P1 — FIXED 2026-05-19] Duplicate "Your research portfolio" cue at top of chat**

**Status:** FIXED in `fix/launch-prod-feedback`
STATUS: Done

After the auto-switch to `ResearchPortfolio` view fires (on `ballotReady`), if the user clicks "Back to chat," a large green "Your research portfolio" button was re-injected at the top of the chat. Muxin: "what the heck is the Research Portfolio? It's just repeating the section that already exists higher up." Button removed entirely. The auto-switch still fires once; portfolio remains reachable by re-asking the AI or via the existing scroll.

**[P2 — FIXED 2026-05-19] "Prefer to use your own AI?" section visible alongside active chat**

**Status:** FIXED in `fix/launch-prod-feedback`
STATUS: Done

The promptOutput section was rendered alongside ChatPanel for the entire session — confusing because it offered a competing path while the user was already in the AI chat. Gate changed to `canStartResearch && budgetChecked && !chatAvailable` — section now only appears as the fallback when chat is unavailable.

**[P2 — FIXED 2026-05-19] "Returning voter? Upload your voter profile" visible mid-session**

**Status:** FIXED in `fix/launch-prod-feedback`
STATUS: Done

`ProfileUpload` was visible at the top of the page even after the user had started a chat session. Now hidden once any chat messages exist (`hasChatStarted === true`), via a new `onChatStarted` callback wired from ChatPanel → ResearchLayout → BallotToolClient.

**[idea — IMPLEMENTED 2026-05-19] Dev-mode URL overrides for QA preview**

**Status:** Implemented in `fix/launch-prod-feedback`
STATUS: Done

`?devBudget=normal|notice|soft_close|handoff|exhausted` overrides the displayed budget tier in `NODE_ENV=development` so we can screenshot/preview the budget-exhausted banner without polluting real state.

`?devPolis=mock` injects a hardcoded ~20-voter mock dataset into `PolisOverlay` so we can preview the visualization in low-participation areas. Useful for QA, demos, marketing.

Both no-op in production. Both `console.warn` on activation.

**Caveat:** `devBudget` is display-only. Backend `/api/chat` still enforces the real budget. To actually USE the chat against a real backend in an exhausted-state environment, clear the durable-store key `voter-choice:budget:YYYY-MM` (Upstash console or `redis-cli del voter-choice:budget:2026-05`).
