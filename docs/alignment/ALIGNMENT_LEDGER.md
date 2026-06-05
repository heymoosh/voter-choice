# Alignment Learnings Ledger

Running log of eval runs, findings, and decisions for the alignment scoring engine.
**Append-only; newest first.** Method + metrics: `ALIGNMENT_EVAL.md`.

## Open findings
| id | finding | status |
|---|---|---|
| **F1** | `criminal_justice` Pole B ("oversight that reduces incarceration") is too broad — it pulled a neutral Corrections Ombudsman to "opposed." Tighten to reform/leniency; route neutral oversight → no-score. | open |
| **F2** | Environment poles miss **climate adaptation/resilience** (wildfire / insurance-hardening bills fit neither "climate action" nor "deregulation"). Add an adaptation rule or explicit no-score. | open |
| **F3** | `border_security`'s strict relevance gate drops state **immigration-enforcement** bills (they should route to `immigration`, not vanish). | open |
| **F4** | ~47% of state bills have no summary (ingest gap, not extraction). Filed in `post-launch-backlog.md` → Data Quality. Biggest single lever for state-race coverage. | open → backlog |
| **M1** (meta) | The eval runner must **auto-capture model id + settings** — the 2026-06-04 run did not. | open |
| **F5** | Internal `in_favor`/`opposed` labels do NOT need renaming — the UI never shows them (it renders "voted with your side N of M" + the bill/vote). Presentation is redesign-owned. | closed (Muxin) |
| **F6** | Incentive-vs-mandate "safety" bills (e.g. a tax credit for a gun safe) are genuinely ambiguous in direction. Keep them **low-confidence + show the vote**; don't force a pole. | accepted (Muxin) |
| **F7** | `border_security` is ~93% mis-tagged — after correction only ~11 of 155 are genuine physical-border bills; the rest are interior-immigration / foreign-land-ownership. **Decide: merge into `immigration`, or keep as a thin federal-only issue.** | open (Muxin) |
| **M2** (meta) | The at-scale tagging runner needs **retry-on-transient-error** — 1 of 12 subagents hit a socket error and had to be re-run by hand. The background workflow must auto-retry failed batches. | open |

## Runs

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
