# Alignment Learnings Ledger

Running log of eval runs, findings, and decisions for the alignment scoring engine.
**Append-only; newest first.** Method + metrics: `ALIGNMENT_EVAL.md`.

## Open findings
| id | finding | status |
|---|---|---|
| **F1** | `criminal_justice` Pole B ("oversight that reduces incarceration") is too broad — it pulled a neutral Corrections Ombudsman to "opposed." Tighten to reform/leniency; route neutral oversight → no-score. | open |
| **F2** | Environment poles miss **climate adaptation/resilience** (wildfire / insurance-hardening bills fit neither "climate action" nor "deregulation"). Add an adaptation rule or explicit no-score. | open |
| **F3** | `border_security`'s strict relevance gate drops state **immigration-enforcement** bills (they should route to `immigration`, not vanish). | open |
| **F4** | ~47% of state bills have no summary (ingest gap, not extraction). Biggest single lever for state-race coverage. **Partially RESOLVED 2026-06-05 (summary-recovery-1):** recovered full bill text for **9,408 / 16,841** null-summary tagged bills (56%) from Muxin's **local OpenStates pgdump** (`opencivicdata_searchablebill.raw_text`) — no API, no PDF/OCR. The residual ~6,868 are `is_error` in OpenStates' own extraction (scanned PDFs); recovering them needs OCR OpenStates already failed at → leave for a later OCR pass if ever. | partially resolved |
| **M1** (meta) | The eval runner must **auto-capture model id + settings** — the 2026-06-04 run did not. | open |
| **F5** | Internal `in_favor`/`opposed` labels do NOT need renaming — the UI never shows them (it renders "voted with your side N of M" + the bill/vote). Presentation is redesign-owned. | closed (Muxin) |
| **F6** | Incentive-vs-mandate "safety" bills (e.g. a tax credit for a gun safe) are genuinely ambiguous in direction. Keep them **low-confidence + show the vote**; don't force a pole. | accepted (Muxin) |
| **F7** | `border_security` is ~93% mis-tagged — after correction only ~11 of 155 are genuine physical-border bills. **Resolved (Muxin): MERGE into `immigration`.** At cutover, drop `border_security` as a canonical issue; genuine border content scores under `immigration` (border-enforcement = `opposed`/restrictive). The big-issue workflow therefore does NOT re-tag border separately. | resolved (Muxin) |
| **M2** (meta) | The at-scale tagging runner needs **retry-on-transient-error**. **Confirmed at scale: 36 of 141 workflow batches (25%) reported "completed" but never wrote a result file** — the workflow's completion signal ≠ file written. A production run MUST verify each result file exists + valid and auto-retry the missing. **Largely FIXED 2026-06-05 (big-2):** agents write results to **in-repo files** and the gate is a file-by-file coverage check (`_pole-assemble.ts`), not the completion signal — so the 2/157 batches that failed to return their structured summary still had complete files → **0 data loss**. The remaining residue is occasional single-bill `bill_id` transcription slips (~1 per 5–15k), caught by the same coverage check and patched. | mitigated |
| **F8** | `public_safety` (84% →no_score) and `election_integrity` (85% →no_score) are over-tagged grab-bags like `border` — the old tagger had high recall but low precision, forcing off-topic bills in. Real counts are small (~870 policing, ~258 ballot-access). Reproductive (43%) had the same over-tag pattern with off-topic gender/health bills. **Net: ~60% of contested tags are now no_score — alignment coverage on contested issues is much thinner. Lever: recover bill summaries (Data-Quality backlog item).** | open (Muxin) |

## Runs

### 2026-06-05 — Missing-summary recovery from the local OpenStates dump (`source_run='summary-recovery-1'`)
**On subscription.** Recovered bill **full text** for the null-summary tagged corpus straight from
Muxin's **local 9.8 GB OpenStates pgdump** — `opencivicdata_searchablebill.raw_text` (OpenStates'
pre-extracted full-text-search column) — so **no API, no rate limit, no PDF download/OCR**. Disk-safe
stream-filter (`pg_restore --data-only -t opencivicdata_searchablebill | line-filter`) of just our
16,841 ids. **Yield: 9,408 / 16,841 (56%)** have usable text; the other 6,868 are `is_error` in
OpenStates' own extraction (scanned PDFs — see F4). Then **1 background Workflow, 717 length-batches,
Sonnet, one pass = summary + (contested) pole_stance**, single-issue batches so the
`environment_climate`↔`energy_grid` *opposite* orientation can't cross-contaminate. File-based
M2-safe: **717/717 batches, 0 missing/incomplete**.

- **`bills.summary`:** 9,405 written (durable; helps the app + all future tagging).
- **`issue_tags_pole_v1` re-tag (7,828 contested pairs, now text-informed):**
  **1,598 RECOVERED `no_score`→confident** (1,083 in_favor / 515 opposed) · **93 sign-inversions
  corrected** (text flipped what title-only got backwards) · **516 demoted →no_score** (text showed
  they were off-topic — false-confident removed) · 3,753 stayed no_score (genuinely non-directional).
  Net **~+1,080 confident contested tags and ~600 wrong ones fixed**.

**Tooling:** `_summary-{idset,stream-filter,issuemap,batch,recover.workflow,persist,flipcheck}`.
**Decision:** this completes the "recover summaries first" gate before cutover. The contested pole_v1
corpus is now denser AND more accurate. **Next:** Step 3 — build + validate the staged data-only
cutover. Production still untouched.

### 2026-06-05 — Remaining 4 contested issues re-tagged → ALL 12 done (15,593 tags, `source_run='big-2'`)
**On subscription.** 1 background `Workflow`, **155 batches**, **Sonnet** taggers (per Muxin —
Opus orchestrates, Sonnet executes; captures model per **M1**). `issue_tags` untouched; written to
`issue_tags_pole_v1` (`tagger_version='pole-anchored-v1'`). **1:1 coverage verified** for all four
(pole_v1 count == old `issue_tags` count). Orchestration scripts: `scripts/ingest/_pole-*.{ts,workflow.js}`.

- **`energy_grid` (1824) — the near-miss.** Was **never re-tagged** (RETAG_PLAN lists 12 contested
  issues; the prior handoff accounted for only 11). Surfaced in the Step-0 audit. **580 flips (32%!)**
  · 1,092 →no_score (60%) · 152 unchanged → new 183/549/1092. The big driver: the **means-trap** —
  "funds/expands clean energy" that the old tagger read as pro-production `in_favor` is correctly
  `opposed` (537 `in_favor→opposed`). Had we cut over without it, energy alignment would have shipped
  ~32% inverted.
- **economy_jobs (5675):** 530 flips (9%) · 2,963 →no_score (52%) · 2,182 unchanged → new 2140/572/2963.
  481 `in_favor→opposed` (deregulation/tax-cut bills the old tagger defaulted to `in_favor`).
- **property_taxes (2343):** 215 flips (9%) · 1,504 →no_score (64%) · 624 unchanged → new 790/49/1504.
- **education_funding (5751):** 180 flips (3%) · 3,629 →no_score (63%) · 1,942 unchanged → new
  1898/224/3629. Lowest flip rate — audit's "mostly fine" confirmed; the no_score is over-tag cleanup.

**Method note (M2 fix in practice):** Sonnet agents READ a ~100-bill batch file and WRITE a result
JSON in-repo; the integrity gate re-reads every file (`_pole-assemble.ts`), not the workflow's
completion signal. 2/157 batches failed to return a structured summary but had written complete
files → **0 data loss**; 1 single-bill `bill_id` transcription slip was caught by the coverage check
and patched. Pole prompts inlined from `POLE_VOCABULARY.md` with the repeal/CRA **net-effect** rule
(e.g. nullifying a rule that restricted oil/gas leasing → `in_favor`) and the energy means-trap;
dry-run on 4 batches validated these before the full run.

**Milestone: all 12 launch-blocking contested issues are now re-tagged** (prior 8 = 15,887 + these
4 = 15,593 → **31,480 corrected tags** in `issue_tags_pole_v1`). **Next:** missing-summary recovery
(the coverage lever, per Muxin's "recover summaries first" decision), then the gated data-only
cutover. Production still untouched.

### 2026-06-05 — Big launch-blocking issues re-tagged via background workflow (14,014 tags)
**On subscription**, 2 background workflows (141 batches + a 36-batch retry — the first
run reported 141/141 "completed" but 36 never wrote their result file → **M2**).
`issue_tags` untouched. `source_run='big-1'`.
- **public_safety (5499):** 308 flips · **4,629 →no_score (84%)** · 562 unchanged → new 524/346/4629. Over-tagged with non-policing bills (like border); only ~870 real policing/sentencing bills.
- **crime_public_safety (3800):** **613 flips** · 1,854 →no_score (49%) · 1,333 unchanged → new 1280/666/1854. Genuinely populated; large enforcement↔reform inversion fix (audit's ~50% confirmed).
- **environment_climate (2941):** 88 flips · 749 →no_score (25%) · **2,104 unchanged (72%)** → new 1930/262/749. Healthiest — old tags mostly right.
- **election_integrity (1774):** 55 flips · **1,516 →no_score (85%)** · 203 unchanged → new 189/69/1516. Over-tagged like border; only ~258 real ballot-access bills.

**Milestone: all 8 launch-blocking contested issues re-tagged = 15,887 tags.** Across
them **~60% are now no_score** — the corrected contested corpus is far thinner but
trustworthy (it traded confidently-wrong coverage for correct coverage). Coverage
levers: recover bill summaries (backlog); the over-tagging cleanup is permanent/correct.
**Next:** reclassified economy/education/property (~13.8k, lower priority — audit had
them mostly fine), then the gated cutover.

### 2026-06-04 — 3 small contested issues re-tagged: border, immigration, reproductive
**On subscription** (12 tagger subagents + 1 re-run after a transient socket error).
`issue_tags` untouched. `source_run='small-1'`.
- **border_security (155):** 1 flip · **144 →no_score** · 10 unchanged → new: 11 in_favor / 0 opposed / 144 no_score. **93% of its tags were never about the physical border** (interior-immigration-enforcement & foreign-land-ownership bills the old tagger forced in). See **F7**.
- **immigration (407):** **88 flips (22%)** · 92 →no_score · 227 unchanged → new: 187 / 128 / 92. Old was a ~50/50 coin-flip; now decisive.
- **reproductive_rights (619):** 16 flips (3%) · **265 →no_score (43%)** · 338 unchanged → new: 244 / 110 / 265. The high no_score is **relevance cleanup** (off-topic gender-affirming-care / trans-sports / aid-in-dying / menstrual bills were mis-tagged here), NOT inversions.

**Cumulative re-tagged: 1,873 contested tags** (guns + these three). **Next:** the big issues
(public_safety ~5.5k, crime ~3.8k, environment ~2.9k, election ~1.8k, + reclassified
economy/education/property ~14k) via a **background workflow** on the subscription.

### 2026-06-04 — `gun_rights_safety` FULL re-tag complete (692 bills, on subscription)
**What:** finished the gun issue. The remaining 642 bills were tagged by **9 parallel
subagents on the Claude Code subscription (no API cost)** and written to
`issue_tags_pole_v1`. `issue_tags` untouched.

**Full-issue result vs. old (692):** **136 sign-flips (20%, inversions fixed) · 285
→no_score (41%, old forced guesses) · 271 unchanged (39%)**. Confirms the audit's
~55% gun error at full scale. New distribution **151 rights / 256 regulation / 285
can't-tell** vs. old **504 / 188 / 0** — the "default to in_favor" bias is gone;
regulation now correctly outnumbers rights.

**Coverage tradeoff (quantified):** 41% →no_score means gun alignment now rests on
~407 confident tags, not 692. Driven heavily by the 386 null-summary bills (see
backlog: *recover OpenStates abstracts*) plus genuine ambiguity. More honest, but
thinner — **recovering summaries is the lever to win coverage back.**

**Settings:** 9 Agent-tool subagents (Claude; ids not captured — M1), pole-anchored
gun prompt, 80/batch, `source_run='gun-rem'`. Quality: subagents correctly abstained
on criminal-penalty, hunting/sport, technical, and safety-*incentive* (F6) bills, and
scored repeals by net effect.

**Next:** the other contested issues; for the big ones (public_safety ~5.5k, crime
~3.8k, economy/education/property ~5–6k) run as a **background workflow** on the
subscription.

### 2026-06-04 — First re-tag WRITE: `gun_rights_safety` batch 1 (50 bills)
**What:** first real pole-anchored re-tag written to the DB. Written to a **new,
separate table `issue_tags_pole_v1`** on the `alignment-work` Neon branch — because
`issue_tags` has a UNIQUE index on `(bill_id, canonical_issue)`, version-rows in the
same table are impossible, so the re-tag lives in its own table; **`issue_tags` is
never modified** and the whole thing is reversible by `DROP TABLE`. `pole_stance` ∈
{in_favor, opposed, no_score}.

**Settings:** 1 Agent-tool subagent (Claude; exact id not captured — see M1),
pole-anchored `gun_rights_safety` prompt, 50 with-summary bills (of 692 gun tags;
306 have summaries). `tagger_version='pole-anchored-v1'`, `source_run='gun-batch-1'`.

**Result vs. old tags:** **14 sign-flips (inversions fixed) · 17 →no_score (old forced
guesses) · 19 unchanged** — i.e. **31/50 (62%) of the old gun tags were wrong or
unsupported**, consistent with the audit's ~55% gun error. Fixed examples (all old
`in_favor` → correctly `opposed`): "Declaring gun violence a public health crisis,"
"Safe gun storage," "Handguns in unattended motor vehicle… penalty." Integrity check:
old `issue_tags` still has 692 gun rows, untouched.

**Decision / next:** scale to the rest of guns (642 left, incl. 386 null-summary →
expect mostly no_score, the coverage tradeoff), then the other contested issues. Use
**multi-tagger consensus** for the at-scale write (not single-tagger). Cutover to
production is a later, separate, gated step (point `lookupAlignment` at the new tags
via a migration).

**Reviewed (Muxin, 2026-06-04):** batch accepted. The ~3 low-confidence judgment-call
flips (firearm-safety-device tax credit, "Reimagine" grants tweak, voluntary
purchase-waiver) are kept as tagged — low-confidence + visible vote is the safety net.
Internal `in_favor`/`opposed` labels stay unchanged (see F5).

### 2026-06-04 — Real-data methodology validation (3-tagger, 49 real bills)
**Question:** does the (issue, side) pole approach fix inversions on the *real* bill
text — including the ~40% of state bills with no summary — or only on hand-written
descriptions?

**Settings:** 3 independent Agent-tool subagents (Claude; harness default subagent
model — exact id **not captured**, see M1). Reasoned from real `title` + `summary`.
Pole definitions inlined from the `alignment/pole-vocabulary` vocabulary with user
decisions 1–5 applied (merged `criminal_justice`; `voting_access` orientation).
Sample: stratified random, the 7 poleless contested issues × 7 each, pulled read-only
from the `alignment-work` Neon branch; ~21/49 had `null` summaries.

**Result:**
- **Inter-rater agreement: 47/49 unanimous (96%).** The 2 non-unanimous were
  score-vs-abstain, never direction → directional judgment is highly reliable.
- vs. current production tags: **21 same · 8 sign-inversions (all corrected) · 20
  →no-score.** Corrected inversions include voter-ID→`opposed`, "Office of Gun
  Violence Prevention"→`opposed`, honoring-ICE-detainers→`opposed`, abolishing-youth-
  fines→`opposed`. The 20 no-scores were ≈half off-topic false-positives the old
  tagger wrongly scored (Israel arms under `border_security`, campaign-finance under
  `election_integrity`…) and ≈half honest abstentions on thin/null-summary bills.
- **0 new sign-inversions introduced.**

**Read:** the methodology holds on real data — it fixes real inversions and fails
*safe* (abstains rather than guesses). It trades coverage for correctness (the 20
no-scores), which makes the abstain threshold + the F4 summary gap the levers to
watch.

**Findings produced:** F1, F2, F3, F4, M1 (above).

**Decision / next:** proceed to a **bounded first re-tag** — one issue (e.g.
`gun_rights_safety`, ~690 tags) written to `tagger_version='pole-anchored-v1'` on the
`alignment-work` branch, inspect real rows, then scale. Apply F2/F3 vocabulary
refinements first.

### (earlier, pre-ledger) Adversarial vocabulary critic pass
3 offline critics stress-tested all 16 issue definitions; found + fixed 8 blockers;
reclassified `economy_jobs` / `education_funding` / `property_taxes` from
valence→contested. Verdict: internally clean — **but that is internal consistency,
not real-world fit**, which the 2026-06-04 run then tested on real bills. Detail:
`alignment/pole-vocabulary` → `POLE_VOCABULARY.md` "Critic verdict".
