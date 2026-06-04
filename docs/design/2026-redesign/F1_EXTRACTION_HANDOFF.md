# F1 — large-format ballot extraction misreads dense columns — HANDOFF

**Start a fresh session here.** Self-contained. F1 is the one open item from the
2026-06-04 NJ QA pass (`QA_NJ_BALLOT_2026-06-04.md`).

**Status:** OPEN — diagnosed, not fixed. A naive tiling fix was built and **reverted
(regressed)**. F1 is **gated to large-format ballots** and does NOT block the app: the
Democratic NJ path is verified correct; only a *large-format Republican* ballot hits it.

**Worktree/branch:** `…/.claude/worktrees/design-integration` @ `feat/prototype-rebuild`.
NOT deployed. Operate via absolute paths into that worktree.

---

## The bug (one paragraph)
`/api/extract-ballot` misreads candidate NAMES in the single densest multi-candidate
column of a large-format ballot, and — worse — **invents plausible names instead of
reporting uncertainty.** On the Camden County / Audubon NJ June-2-2026 primary PDF (a
17.5×23″ trifold), the Republican U.S. Senator race (real: **LEBOVICS, MURPHY, ZDAN,
TABOR**) extracts as wrong names — a fresh, uncached run returned **LESNIAK, MURPHY,
ZAHAR, FABER** (right *count*, only MURPHY correct). A real Republican voter would be
shown fabricated candidates rendered as real. Everything else extracts correctly
(Booker, Norcross, all D commissioners, R-House Galdo, R-commissioner Stone).

## Root cause — DIAGNOSED (verified, not a guess)
- **Not a cache bug.** The bad read was sticky in the SHA-256 cache, but busting the key
  + re-extracting fresh REPRODUCED the misread. A pure cache delete does not fix it
  (verified). ⚠️ Re-extracting **re-caches the wrong names** under the same key.
- The route renders each page **whole** at `scale: 2.0` (~144 DPI) and sends one image
  per page to Sonnet vision (`claude-sonnet-4-5`). Anthropic's vision API downscales
  large images to a long-edge cap (~1568px — **confirm the current value from
  Anthropic docs; the whole plan rests on this number**). A 17.5×23″ page at that cap
  leaves candidate text ~20–30px tall → unreliable OCR on the densest column.
- The model then **autocompletes** the blurry text to plausible NJ surnames rather than
  flagging illegibility. That inference is the trust harm.

## What was already tried and FAILED — do not repeat naively
- A full image-tiling impl (`renderPdfPagesTiled` + `mergeTiles`) was built, unit-tested,
  live-tested → **REGRESSED**. The tiles **severed the office-header/row context**, so
  the model invented offices from whatever text was in each crop: party slogans
  ("America First Always") became OFFICES, the return-address line became a race,
  candidates scattered into phantom "State Senator" races. Race count went ~8 coherent →
  **30 fragmented**. Names improved; **structure broke.** Reverted in `8164d38`.
- WIP preserved at **`.scratch-ballot/f1-wip/`** (`f1-tiling.patch` + `extract-vision.test.ts`).
  It tiled in a **header-severing geometry** — that's the lesson, not a template.

## The core constraint (this IS the whole problem)
**Preserve the office ↔ candidate mapping.** The whole-page pass already gets STRUCTURE
right (offices, counts, positions) for the entire ballot; it only fails on dense NAMES.
Naive tiling got NAMES right but destroyed STRUCTURE. Any fix must improve legibility
**without letting a crop redefine which office a candidate belongs to**, and **without
promoting a slogan to an office.**

**Is it the feed to the 3-pane/card view? NO.** The wrong names live in the RAW
extraction JSON — upstream of `extractionToRaces` → `deriveRaces` → cards. Everything
that extracted correctly also rendered correctly. The fix belongs in **extraction**, not
the card feed.

---

## Recommended approach — STAGED, cheapest-first. Stop at the first step that works.

### Step 1 — do first. Cheap, separable, fixes the TRUST harm regardless of legibility.
Harden the extraction prompt (`src/lib/server/extract-prompt.ts`) to forbid inference:
- *"Transcribe each candidate name EXACTLY as printed. Do NOT infer, autocomplete, or
  'correct' a name toward a known politician. If a name is not clearly legible, set
  `name: null` with `placeholder_reason: "illegible"` (or a low-confidence flag) — never
  guess."*
- The prompt already says "prefer null over guess" for incomplete *upstream* output
  (~line 49) but has **no anti-inference / illegibility rule for names.** Add it.
- Optionally bump render scale (`route.ts:334`), but know it's **capped by the
  server-side downscale** — it only helps if the page is under the cap, which a large
  trifold is not. Minor complement, not the fix.
- **Effect:** converts "fabricated names shown as real" → "honest illegible gaps." This
  removes the voter-facing harm even if full legibility is never solved. **Shippable
  alone** as the F1 stopgap.

### Step 2 — if legible names are still needed: header-preserving HORIZONTAL-band tiling
Office rows run **full-width horizontally**; candidates sit in columns within a row. So
split each page into **full-width horizontal bands** (NEVER vertical columns). Each band
keeps its office header attached to its candidates, and a shorter band sent as its own
image gets far more pixels-per-name. **One pass, no reconciliation** — structure stays
intact because headers travel with their rows. This is "header-aware split" done with the
**opposite geometry** from the reverted WIP. Use generous vertical overlap so a band
boundary never bisects a race.

### Step 3 — only if bands prove too layout-fragile: two-pass + positional reconcile
Pass A = whole page → authoritative STRUCTURE. Pass B = high-res tiles → NAMES only.
Reconcile B into A's slots. **Prerequisite check done:** the schema HAS string anchors
`ballot_position` / `position` ("A1","A2",… — `extract-types.ts:48,55`), but they are
**model-emitted strings, not geometric bboxes**, so they can themselves be misread —
**reconcile by ORDER within an office**, not by trusting the code. Costs 2× vision
passes; gate to large-format pages only. Heaviest; avoid unless Step 2 fails.

---

## Code map (entry points)
| Piece | Location |
|---|---|
| Render pages → PNG | `renderPdfPages(data,{scale})` — `src/lib/server/extract-pdfjs.ts:108` (@napi-rs/canvas, 1 PNG/page) |
| **Orchestration (hook staging here)** | `runVisionPath(client,buffer)` — `src/app/api/extract-ballot/route.ts:328` (renders @334, vision @345) |
| Vision call | `extractWithVision` — `src/lib/server/extract-vision.ts:234` (per-page `Promise.all`); model `claude-sonnet-4-5` (`:21`), base64 PNG, **no client-side resize** |
| **Prompt (Step-1 target)** | `src/lib/server/extract-prompt.ts` |
| Cross-page stitch | `src/lib/server/extract-stitcher.ts` (`mergeTiles` would slot before it) |
| Cache | SHA-256 of buffer (`route.ts:85`); key `extractionCacheKey(hash)` version **v2** (`route.ts:88-96`); Upstash, 30-day TTL |

## Operational gotchas — READ before iterating
- **Re-extract re-caches the result under the PDF's SHA key.** Between iterations you MUST
  bust the key (`DEL voter-choice:extraction:v2:<sha256>`) or bump the cache version
  (`route.ts:88`), or you'll test a stale wrong cache. (The QA pass hit exactly this.)
- Each fresh extract is a **~25s real Sonnet call on the COMMUNITY budget** — iterate
  deliberately.
- Test PDF + verified ground truth: `.scratch-ballot/GROUND_TRUTH.md` + high-res crops.
  Playwright file-upload only accepts paths under the agitated-shockley worktree — staged
  at `…/agitated-shockley-cda6b6/.playwright-mcp/nj-june2-2026-ballot.pdf`.
- Local `.env.local` has all real keys; **restart dev (:3000) after any env edit.**
- Gate before deploy: `tsc --noEmit` + `eslint` + `vitest run` + `next build`
  (`next.config.ts` ignores build errors, so run all four). Deploy only after user review.

## Verification recipe
1. Bump cache version (or DEL the key) so the next extract is live.
2. Re-extract the test PDF (drive the app, or a script calling `runVisionPath` directly).
3. **Step-1 success** = wrong reads come back as `null`/illegible, NOT fabricated names.
   **Step-2/3 success** = R-Senate reads exactly `[LEBOVICS, MURPHY, ZDAN, TABOR]`.
4. **Structure intact:** ~8 races, offices are real offices (NOT slogans, NOT 30 fragments).
5. **No regression** on a normal letter-size ballot (the large-format gate must skip it).
