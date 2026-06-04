# QA pass — NJ June 2 2026 ballot, driven as a real voter (2026-06-04)

## ✅ FIXES APPLIED THIS SESSION (feat/prototype-rebuild, NOT deployed; tsc + unit tests green)
Re-verified by re-driving the Democratic NJ ballot end-to-end (upload→gate→issues→
workspace→pick→print).
- **F11 — vote-for-N picks.** `Race.voteForN` now threaded from extraction
  (`extractionToRaces`) + `deriveRaces`; the decision model holds an array of picks
  (toggle, cap at N, no premature auto-advance, "pick N more" hint). Ballot pane +
  print render every pick; print lists one checkbox per name under "VOTE FOR 2".
  *Verified:* both CAPPELLI, JR. + YOUNG recorded and printed.
- **F12 — print/header logistics.** Print + workspace bar now driven by the REAL
  state (`getFallbackStateData(getRealStateCode())`): "New Jersey", district from the
  ballot ("House — CD-1"), honest "ID rules vary — check vote.gov" + "Look up your
  polling place… at vote.gov". No more Houston/TX-7/TX-IDs/Oct-EV. Mock precinct
  dropped from the ballot pane. *Verified:* `hasTexasMock=false`.
- **F3 — empty-race leak.** `filterRacesByParty` now keeps candidate-free races only
  for proposition-type sections; drops empty candidate-offices. *Verified:* committee
  race gone → 3 races (was 4).
- **F7 — race intro count.** "Two candidates" → real `{count} candidate(s) … vote
  for {N}`. *Verified:* "4 candidates for County Commissioners — vote for 2."
- **F10 — pick rationale.** Only claims "strongest record on X" when the candidate
  has a scored record; no-record picks get "my pick; no voting record on file to
  score." *Verified* across Booker (record) vs Norcross/commissioners (none).
- **F2 — theme-extraction honesty.** Removed the false "What you actually said." /
  "the words you actually used" claims (now "Starter issues — make them yours.");
  preset quote labels "your words" → "example". (Real text→theme extraction is still
  NOT wired — that's the proper follow-up; this only removes the dishonesty.)
- **F8 — chat markdown.** AI bubbles run through `stripChatMd` (strips
  `**bold**`/`*italic*`/`` `code` ``/`# headings`). *Verified* on sample inputs.

### Still outstanding (need a focused follow-up / authorization)
- **F1 — extraction misreads the dense R-Senate column.** DIAGNOSED as a vision-OCR
  resolution problem on a large-format trifold (NOT a cache bug — see below). Fix =
  tile/raise render scale + prompt hardening; a renderer-pipeline change with
  regression risk, left for a focused session.
- **F5 — Norcross unmatched.** Needs a prod-DB read (blocked without authorization)
  to confirm whether Donald Norcross is missing from the `candidates` table or sits
  under a mismatched `jurisdiction`; likely a data/ingest gap, not a frontend fix.

---


**Branch:** `feat/prototype-rebuild` · local dev `:3000` · all real API keys present.
**Method:** Playwright drive of the full flow with the real Camden County / Audubon
Borough primary PDF. Ground truth read directly from the PDF (`.scratch-ballot/`).
**Scope:** the four goal areas — (1) every candidate has alignment + data, (2) chat
works and can't be abused, (3) printing works, (4) the whole ballot, end to end.

## Verdict by goal area
| Goal | Result |
|---|---|
| Each candidate has alignment + data | ⚠️ Partial — only Booker (Sen) resolves. Norcross (House) match-fails; commissioners are a coverage gap. |
| Chat works · limited scope · can't be abused | ✅ Solid — grounded answers, refuses jailbreak/persuasion, blind-anonymized payload, no PII echo. One cosmetic markdown leak. |
| Printing works | ⚠️ Mechanism works + clean layout, but logistics block is hardcoded **Texas** mock data, and multi-seat races truncate to one pick. |
| Whole ballot end-to-end | ✅ Reachable end-to-end (upload→gate→issues→workspace→pick→print) — but with the correctness bugs below. |

The core data seams that were wired in the rebuild **work** (extraction, party gate,
race-data → Booker funding+alignment, chat streaming, blind anonymization). The
failures cluster in (a) **unwired secondary seams still showing prototype mock data**
and (b) **multi-seat / federal-match correctness**.

---

## 🔴 CRITICAL — break core voting correctness or block a voter

### F1 · Extraction returns a CACHED HALLUCINATION for the R-Senate race
`/api/extract-ballot` returned `_meta.cache_hit:true`. The cached result's
**Republican U.S. Senator** contest lists 6 candidates — LEVINE, PARKER, MEISSNER,
PATEL, ZDAN, FASSLER — but the real ballot has **4**: LEBOVICS, MURPHY, ZDAN, TABOR
(only ZDAN is real). Everything else cached correctly (Booker, Norcross, all D
commissioners, R-House Galdo, R-commissioner Stone). Cache is content-addressed by
SHA-256 of the PDF (Upstash, 30-day TTL) → a prior vision run hallucinated the single
densest multi-candidate column and the wrong result is **sticky** for this file.
**Impact:** a Republican voter is shown fabricated Senate candidates (it renders fine —
not a crash). **Observed from the cached extraction JSON, not driven in-UI** (I drove
the Democratic path, whose data verified correct).
**Root cause — DIAGNOSED (2026-06-04):** NOT a stale cache. Busted the key and
re-extracted fresh (`extraction_path:vision`, 25.6s): R-Senate came back **LESNIAK,
MURPHY, ZAHAR, FABER** — right count (4) but still wrong names (real: LEBOVICS, MURPHY,
ZDAN, TABOR; only MURPHY correct). The extractor **misreads the dense column**,
autocompleting to plausible NJ surnames. The cache only made one bad read sticky.
Why: the route renders pages at `renderPdfPages(..., {scale:2.0})` (~144 DPI) and sends
the WHOLE page to vision, but this ballot is a large-format **17.5"×23" trifold** — after
the vision API's own downscaling the candidate text is ~20–30px tall → unreliable OCR.
**Fix path (resolution-first):** (a) raise render scale AND/OR **tile large pages**
(crop per panel/section) so each candidate row reaches the model at legible size — the
highest-leverage lever; (b) prompt: transcribe names exactly as printed, do NOT infer
known politicians, flag low-confidence reads; (c) optional self-check pass. A pure cache
delete does NOT fix it (verified). Note: my DEL + re-extract re-cached the fresh
(still-wrong) LESNIAK/ZAHAR/FABER under this PDF's key.

### F11 · A "vote for TWO" race can only record ONE pick
County Commissioners is *Vote for Two*. The decisions model stores a single scalar
per race: `decisions["…county-commissioners-dem"] = { pick:"YOUNG", candidateName:"YOUNG" }`.
Picking a 2nd candidate (Young) **overwrote** the 1st (Cappelli). The ballot pane and
the printout show only ONE commissioner. Also: the race auto-advances and is marked
"decided" (progress +1) after the **first** pick, so a voter easily under-votes.
**Impact:** every Camden ballot has a vote-for-2 commissioner race; the printed ballot
is structurally incomplete for any multi-seat office. Direct hit on "all choices marked."
**Fix:** make a decision hold up to `vote_for_n` picks (array); gate "decided" on
count and don't auto-advance until the seat count is reached (or the voter moves on).

### F12 · Printout's voter-logistics block is hardcoded TEXAS mock data
The print view ("Your printable ballot") renders, with a clean one-page layout and a
working `window.print()`. The **picks and issues are correct** (Booker, Norcross,
Young; the 3 issues). But the logistics block is prototype Texas content:
- Polling place **"5750 Hartwick Rd, Houston, TX 77057"**, Polls **7:00 AM–7:00 PM**
  (NJ is 6am–8pm; real place is in Audubon).
- DISTRICT **"U.S. House TX-7"** (should be NJ CD-1).
- BRING (ANY ONE): **TX driver license, TX concealed handgun license, TX election ID…**
  (Texas voter-ID list — NJ does not require this).
- EARLY VOTING **"Oct 19–Oct 30"** (this is a June primary).
Only the ADDRESS field reflects real input. Same mock leaks on the workspace header
("Trini Mendell Elementary · Precinct 0364 · 35 days until Election Day").
**Impact:** a NJ voter is told to bring a TX handgun license to a Houston polling place.
**Fix:** wire the logistics block (polling place, district, ID rules, EV window, hours)
to the real state/county from civic/address, or omit fields we can't source. State-rule
table likely needed (NJ vs TX vs …).

---

## 🟠 HIGH — wrong/misleading data for a real candidate

### F5 · Norcross (incumbent U.S. House) doesn't resolve — shows blank
`/api/race-data` for the House race returns Norcross as unmatched: alignment
`"Couldn't match this candidate in our voting-record data"`, funding `"Couldn't match…
campaign-finance data"`. Booker matched fine in the same drive, and the RESUMING log
says Norcross funding rows were ingested — so this is a **name-resolution miss** on the
extraction's surname-only `"NORCROSS"`. A sitting congressman shows no record.
**Fix:** resolve federal candidates by surname + office + state/district (not exact
full-name), so `NORCROSS`+House+NJ-01 → Donald Norcross.

### F2 · Cold-open theme extraction is mocked AND fabricates "your words"
Typed a real message (healthcare/drug prices, housing, corporate money/corruption).
Clicking Send fired **no** extraction call (only civic + extract-ballot in the network
log). It returned 3 preset issues whose "your words" quotes I never wrote — *"my mom's
insulin keeps going up"*, *"rent went up 11% last year"*, *"the stock trading thing —
how is that still legal"* — under the heading **"What you actually said."** Stored in
localStorage as `sourceType:"freeText"` with those fabricated quotes.
**Impact:** the entire issue-elicitation is fake and misattributes quotes to the voter
(an "invent" the app's own rules forbid).
**Fix:** wire Send → real theme extraction (text → issues w/ canonicalIssue), or until
then stop presenting preset quotes as the user's own words.

### F10 · Pick rationale fabricates "strongest record" for no-record candidates
Every recorded pick gets the templated note *"Candidate X — strongest record on Lower
insulin & drug prices."* — applied to Norcross and the commissioners, who have **no
matched record**. Asserts a record-based justification that doesn't exist.
**Fix:** derive the note from real alignment; for no-record candidates use a neutral
note (or none).

---

## 🟡 MEDIUM

### F3 · Empty R committee race leaks into the D ballot + is mislabeled a "proposition"
"Female Members of County Committee" (Republican-context, all *no petition filed*)
appears as the 4th race on the **Democratic** ballot — the party filter keeps
zero-candidate races as "non-partisan." In the workspace it's rendered as *"a ballot
proposition. Here's what's at stake:"* (it isn't) with an empty body and a nonsensical
*"Show me the incumbent's key votes"* action.
**Fix:** filter committee/empty races out of the wrong party; don't classify a
zero-candidate office as a proposition.

### F7 · Blind intro hardcodes "Two candidates" regardless of count
Every race opens *"Two candidates for <race>…"* — shown on the 1-candidate Senate race
and the 4-candidate commissioners race alike. Count is not wired to the real roster.

---

## 🟢 LOW / cosmetic

- **F8** · Chat reply emits markdown (`**bold**`, `*italics*`) despite the prompt's
  "NO markdown" rule; the bubble renders raw text → literal asterisks shown.
- Blind **"(?)"** marker renders as a bare "?" next to names in the ballot pane and on
  the printout ("BOOKER ?") — reads like uncertainty.
- **PII §3 absent from the chat prompt.** Legacy chat path (no `view`) skips the
  server `prependSafetyHeader`; the client prompt lacks the "don't echo name/address/
  DOB/phone/ID" rule. Behavior held in testing (model declined), but add it for
  defense-in-depth.
- Dev leftovers: sidebar **"See party-gate (TX primary)"** link; **"35 days until
  Election Day"** mock countdown.

---

## ✅ What works well (don't regress)
- Upload → extraction → **party gate** fires correctly for a NJ primary (D/R/everything).
- Civic seam correctly detects NJ + routes a passed-primary address to upload/paste.
- **Booker** renders real voting-record alignment ("Aligned on 11 of 18 votes · 61%",
  56% avg) **and** the FEC funding mix (60% small / 37% large / 4% PACs · $13.6M) with
  industry breakdown — the happy path is genuinely good.
- No-data states are **graceful**: structured `*Unavailable:{reason}` per field, honest
  copy, voter can still pick.
- **Chat:** grounded on-topic answers citing real bills; refuses jailbreak + "who do I
  vote for"; doesn't echo pasted PII; **blind payload anonymization holds** — `/api/chat`
  contained no "Booker"/"Cory", only "Candidate A" + the BLIND MODE instruction (c5fae03).
- Print **mechanism**: dedicated clean print view + working `window.print()`.
- **Intended (not a bug):** picking a candidate reveals their real name in the ballot
  pane + printout ("BOOKER", etc.). The blind invariant is about *passive* leaks into
  derived labels without a user action; a deliberate "Pick" is the voter committing, and
  the printout must name real candidates (you can't vote for "Candidate A" at the polls).

---

## The documented NEXT TASK in this light
"Auto-populate missing candidates" (webfetch → structured issue-scored data → persist →
render via the same alignment UX) addresses the **commissioner coverage gap** and helps
**F5/Norcross**. But the QA pass shows **F1 (extraction hallucination), F11 (vote-for-2),
and F12 (Texas print logistics)** more directly break "a real user, ballot ready to
print with all choices marked." Recommend sequencing those before/with the auto-populate
build. The auto-populate build still carries the open **honest-labeling** decision
(position-based vs voting-record-based score) — tee that up to the user.
