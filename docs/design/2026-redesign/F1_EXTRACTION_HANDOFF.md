# F1 — large-format ballot extraction misreads dense columns

> ## ✅ LARGELY FIXED (2026-06-04, commits `ed36368` + `2611f48`) — sampling-with-abstention
> The fix is **`src/lib/server/extract-sampler.ts`**: for large-format ballots only
> (logical area > 1.0M pt²), `/api/extract-ballot` now extracts **N=3×** and reconciles
> by majority — a name is kept only when ≥2 runs agree (strict majority); disagreements,
> lone reads, and mostly-illegible races become honest `illegible` gaps. No tiling (it
> regressed; a 5× stability experiment proved the misreads are NONDETERMINISTIC, so
> consensus catches them).
>
> **VERIFIED END-TO-END through the real route** (commit `2611f48` bumped the cache to v3
> to evict the poisoned entries — without that the route serves the old fabrication
> forever): cache-miss → `runVisionPath` → N=3 sampling → `stitchPages`, `extraction_path:
> vision` (~29s). **Democratic path is 100% correct** (Booker, Norcross, all 4
> commissioners, Stone); structure intact (8 races). The bulk of the fabrication is gone
> (4-6 fake R-Senate names → mostly honest gaps + the real MURPHY/ZDAN where they agree).
>
> ### ⚠️ KNOWN RESIDUAL + two OPEN DECISIONS (the honest seams)
> 1. **A semi-stable hallucination can still leak in the densest column.** `MEISSNER`
>    (a recurring fake) reaches a bare 2/3 majority sometimes, so a *Republican* voter may
>    still see one fabricated R-Senate name among the real ones. This is the analytically
>    predicted limit of sampling (it cannot catch a misread that recurs). Mitigations, your
>    call: (a) flip the guard to `>= 2 illegible → blank the race` (one line in
>    `reconcileRace`; kills the leak but also blanks real names like MURPHY/ZDAN → shows
>    the race as "couldn't read, verify your ballot"); (b) raise `SAMPLE_COUNT` to 5
>    (reduces, doesn't eliminate); (c) true resolution / tiling for the dense column (heavy,
>    only thing that can actually *read* it). Recommended: (a) — it matches the
>    honesty-over-completeness bar set everywhere else in this app.
> 2. **Downstream silently DROPS `illegible` candidates** (`extractionToRaces.ts:253`
>    filters to `placeholder_reason === null && c.name`). So a flagged R-Senate reaches the
>    UI as a *short or empty* race with NO "we couldn't read N candidates — verify your
>    official ballot" affordance. The `illegible` honesty built into extraction never
>    surfaces to the voter. Decide whether that affordance is needed before deploy
>    (especially if you pick mitigation 1a, which makes empty races common on hard ballots).
>
> Everything below is the original handoff / diagnosis, kept as the record of how we got
> here (incl. the rejected tiling approach). It is NO LONGER the plan.

**Historical branch:** `feat/prototype-rebuild`. NOT deployed. If this work is
resumed, use a fresh current worktree or branch rather than the old handoff path.

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

> **✅ Step 1 LANDED + live-verified (2026-06-04).** Prompt guard + `"illegible"`
> placeholder shipped (`extract-prompt.ts`, `extract-types.ts`; tsc + 56 extraction
> tests green). Two live uncached re-extracts via `scripts/_verify-f1.ts` (kept — your
> ready-made re-test harness; bypasses the cache). **Result: a real improvement but NOT
> a fix.** Run A emitted honest `[illegible]` markers for the unreadable R-Senate slots;
> Run B emitted ZERO and just confidently misread. So the guard is **nondeterministic** —
> it cannot overcome the resolution problem. **STILL DO Step 2.**
>
> **🔴 Bigger finding the live runs exposed — the cache was MASKING pervasive misreads.**
> The QA pass saw "only R-Senate wrong, everything else correct" — but that was one
> frozen cache sample. Fresh uncached reads are nondeterministically wrong across
> MULTIPLE races: run B misread **GALDO→SALVO** (R-House) and **HAWKINS→HANKINS**
> (D-commissioner), and R-Senate differs every run (LESNIAK/ZAHAR/FABER → ZEBAR/ROGERS/
> FASSER → LEONARD/PATEL/FASSLER). **STRUCTURE is rock-solid every run** (8 races, correct
> offices/party_context/vote_for_n); **NAMES on this large-format ballot are unreliable,
> not just in one column.** → Step 2 (resolution) is **necessary and the priority**, and
> its success metric is *all* names stable across re-runs, not just R-Senate. The
> Democratic *federal* races (Booker, Norcross) did read correctly in every run; a local
> commissioner surname still misread once.

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
