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

## Runs

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
