# Decision: PDF Extraction Tool Bakeoff

**Status:** Phase 5 complete — scoring locked. Winner: pending orchestrator + user confirmation.

This document summarizes the bakeoff outcome. Scoring is final; the winner section is intentionally left as TBD for the orchestrator + user to confirm based on which "winning" bar relaxations or escalations they prefer.

---

## Tools tested

- Contender 2: **Claude Sonnet vision direct** — page images → Sonnet → structured JSON. Scored on all 4 fixtures.
- Contender 3: **docling + Claude Sonnet post-processor** — docling extracts layout-aware markdown, Sonnet normalizes to schema. Scored on all 4 fixtures.
- Contender 1: **AWS Textract Forms + Sonnet** — **SKIPPED**. No AWS credentials available locally (no `~/.aws/credentials`, no `AWS_*` env vars, no SSO cache). Documented in `results/01-textract-sonnet/SKIPPED.md`. Treated as N/A in the score matrix, not zero.

## Fixtures used

| Filename | State | Difficulty weight | Notes |
|---|---|---|---|
| `tx-harris-2026-dem-runoff.pdf` | TX | 1× | Clean text-layer baseline. Single-party (DEM) primary runoff. |
| `fl-orange-2026-composite.pdf` | FL | 1.5× | Composite ballot, 3 pages. Includes multi-district races (Rep in Congress 8/9/10/11; State Rep 35–47), judicial retentions, 10 constitutional amendments, 10 county charter amendments, sales surtax referendum. |
| `tx-hidalgo-2026-bilingual.pdf` | TX | 2× | Bilingual English/Spanish, 14 pages. Tests bilingual handling (criterion 8). |
| `nj-camden-2026-primary.pdf` | NJ | 2× | Broken text-layer (the motivating fixture). Multi-party (DEM + REP on same ballot). "NO PETITION FILED" placeholders and write-in slots. |

## Scoring rubric

Per `decision-design.md`:

| # | Criterion | Auto/Human | Description |
|---|---|---|---|
| 1 | Race coverage | Auto | % of GT races matched by office string |
| 2 | Candidate completeness | Auto | % of GT candidates matched by name |
| 3 | Structural accuracy | Heuristic (auto-suggested) | section_name + vote_for_n + placeholder counts + party_context all correct |
| 4 | Non-ballot filtering | Heuristic (auto-suggested) | Extraction did not invent extra races |
| 5 | Schema compliance | Auto | Output validates against target schema (errors = 0, warnings = 1, clean = 2) |
| 6 | Cost / ballot | Auto | $ per PDF |
| 7 | Latency | Auto | Time to validated JSON |
| 8 | Bilingual handling | Heuristic (auto-suggested) | Hidalgo only: no duplication, no Spanish leakage |

Each criterion scored 0/1/2. Sum criteria 1–5 (+ 8 if active) and weight by fixture difficulty. Criteria 6 + 7 are independent tradeoff dimensions, not part of the sum.

Full per-cell scores live in `results/score-matrix.json`. Judgment calls in scoring heuristics are documented in `score.ts` and as a `judgment_calls` array in that file.

## Per-contender summary

| Contender | Fixtures | Total | Max | Score % | Total cost | Mean latency | p95 latency |
|---|---|---|---|---|---|---|---|
| 02-sonnet-vision | 4 | 56 | 69 | **81.16%** | $0.310 | 46.9s | 82.4s |
| 03-docling-sonnet | 4 | 54 | 69 | **78.26%** | $0.252 | 39.9s | 80.4s |
| 01-textract-sonnet | — | — | — | — | — | — | — (SKIPPED) |

Per-page cost (8 pages across 4 fixtures): C2 = $0.039/page, C3 = $0.032/page. Both under the $0.10/page ceiling.

## Per-fixture score breakdown

Score matrix (rows = criteria, columns = fixtures, cells = score; ✗ = SKIPPED):

### Contender 2 — Sonnet vision direct

| Criterion | TX Harris (×1) | FL Orange (×1.5) | Hidalgo (×2) | NJ Camden (×2) |
|---|---|---|---|---|
| 1. Race coverage | 2 (100%) | 2 (96%) | 2 (100%) | 2 (100%) |
| 2. Candidate completeness | 2 (100%) | 2 (94%) | 2 (100%) | 1 (87%) |
| 3. Structural accuracy | 1 | 1 | 1 | 1 |
| 4. Non-ballot filtering | 2 (0x) | 0 (3x) | 2 (0x) | 2 (0x) |
| 5. Schema compliance | 2 | 1 (warn) | 2 | 2 |
| 8. Bilingual | — | — | 2 | — |
| **Cell weighted total** | **9 / 10** | **9 / 15** | **22 / 24** | **16 / 20** |
| Cost ($) | 0.023 | 0.145 | 0.094 | 0.049 |
| Latency (ms) | 14,850 | 86,807 | 57,504 | 28,324 |

### Contender 3 — docling + Sonnet

| Criterion | TX Harris (×1) | FL Orange (×1.5) | Hidalgo (×2) | NJ Camden (×2) |
|---|---|---|---|---|
| 1. Race coverage | 2 (100%) | 2 (100%) | 2 (100%) | **0 (0%)** |
| 2. Candidate completeness | 2 (100%) | 2 (100%) | 2 (98%) | **0 (0%)** |
| 3. Structural accuracy | 1 | 2 | 1 | 0 |
| 4. Non-ballot filtering | 2 (0x) | 2 (0x) | 2 (0x) | 2 (0x) |
| 5. Schema compliance | 2 | 2 | 2 | 2 (empty) |
| 8. Bilingual | — | — | 2 | — |
| **Cell weighted total** | **9 / 10** | **15 / 15** | **22 / 24** | **8 / 20** |
| Cost ($) | 0.021 | 0.137 | 0.085 | 0.009 |
| Latency (ms) | 15,298 | 86,114 | 48,202 | 9,891 |

The 56-vs-54 weighted total is misleadingly close. The per-fixture pattern is the real story: **C2 wins NJ Camden cleanly (16 vs 8), C3 wins FL Orange cleanly (15 vs 9), TX Harris and Hidalgo are effectively ties.**

## Headline findings

**1. C2 handled NJ Camden; C3 found 0 races.** The broken-text-layer fixture is the one that motivated the entire bakeoff. C2 matched all 8 GT races (100% race coverage, 87% candidate completeness). C3 emitted `{"sections": []}` — passes schema validation, but useless. docling depends on extractable text; that PDF has none.

**2. C3 outperformed on FL Orange composite.** Long-form prose-y office names (judicial retentions, constitutional amendments) and multi-district races. C3 matched 49/49 races at 100% candidate completeness. C2 had 3 wrong-district extractions (Senator district 21 instead of 25; a hallucinated State Rep district 44; a Circuit Judge with position/district transposed). FL Orange weight = 1.5×.

**3. Hidalgo bilingual: both handled it without duplication or Spanish leakage.** GT had 34 races; both contenders emitted 34. No `ñ/é/è` characters in office names. Bilingual criterion = 2 for both. C2 100% candidate, C3 98% (one race's slate dropped).

**4. TX Harris: both perfect on simple baseline.** 6/6 races, 100% candidates. Both score 9/10 — the loss is criterion 3 partial (both contenders set `party_context="Democratic Primary"` instead of null on a single-party ballot, per spec).

**5. Both fail the <15s p95 latency bar by ~5×.** C2 = 82.4s, C3 = 80.4s. Driven by FL Orange (3-page composite) and Hidalgo (14-page bilingual). Per-page latency is in line with Sonnet vision throughput; the absolute number is just a function of page count.

## Cost + latency

| | C2 | C3 |
|---|---|---|
| Total cost (4 fixtures, 8 pages) | $0.310 | $0.252 |
| Per-page cost | $0.039 | $0.032 |
| Cost ceiling (decision-design) | $0.10/page | $0.10/page |
| **Cost result** | ✓ under | ✓ under |
| Mean latency | 46.9s | 39.9s |
| p95 latency | 82.4s | 80.4s |
| Latency ceiling (decision-design) | 15s p95 | 15s p95 |
| **Latency result** | ✗ over by 5.5× | ✗ over by 5.4× |

Total bakeoff spend: ~$0.84 (well under the $5 budget).

## "Winning" bar analysis

Per `decision-design.md` §"What winning looks like", **a contender ships if it achieves ALL of**:

| Bar | Threshold | C2 | C3 |
|---|---|---|---|
| TX baseline race coverage | ≥ 90% | ✓ 100% | ✓ 100% |
| NJ Camden race coverage | ≥ 70% | ✓ 100% | **✗ 0%** |
| Schema-valid every fixture | criterion 5 = 2 on all | **✗ FL Orange = 1** (warnings) | ✓ |
| Cost / page | < $0.10 | ✓ $0.039 | ✓ $0.032 |
| Latency p95 | < 15s | **✗ 82.4s** | **✗ 80.4s** |
| Hidalgo bilingual | ≥ 1 | ✓ 2 | ✓ 2 |

**Neither contender hits all bars.** Per `decision-design.md` §"If no contender hits the bars", the spec's escape hatch is a v2 bakeoff with **the original hybrid path** (Textract bounding-boxes + Sonnet vision cross-check), explicitly NOT escalating to Opus.

## Winner

**TBD — pending orchestrator + user confirmation.**

The data points clearly but doesn't auto-resolve under the spec's strict "all bars" definition. The decision rests on which bar(s) to relax (or which contender's misses are more recoverable):

- **C2 misses two bars**: FL Orange schema validity (warnings only — "Constitutional Amendments" and "County Questions" section names not in the schema enum; this is a one-prompt fix), and p95 latency (82s vs 15s).
- **C3 misses two bars**: NJ Camden race coverage (0% — fundamental limitation of docling on broken-text-layer PDFs), and p95 latency (80s).

C2's schema miss is a tractable normalization fix. C3's NJ miss is architectural — docling cannot OCR; it needs either a Tesseract preprocess step (which the bakeoff explicitly drops, per decision #3) or to be replaced by a vision-aware extractor for the broken-text case. The bakeoff's motivating use case is exactly the broken-text NJ-shape PDF.

Latency is missed by both, equally. The 15s p95 bar may need re-litigating regardless of winner — it was set before measuring real per-page Sonnet vision throughput on multi-page composites.

## Reasoning (data, not verdict)

1. **The 56 vs 54 weighted score is misleading.** Read by fixture, not by sum. C2 dominates NJ Camden (the motivating case). C3 dominates FL Orange (long-form ballot with composite content).

2. **Schema compliance ≠ useful output.** C3 NJ Camden score 5 = 2 (schema-valid) but score 1 = 0 (zero races). A passing validator is a necessary but not sufficient signal.

3. **Criterion 4 "extras" can mean wrong-district, not non-ballot.** C2 FL Orange has 3 extras: a Senator with the wrong district number (21 vs 25), a hallucinated district 44 State Rep, and a Circuit Judge where the position field landed in the district field. None of these are "non-ballot content"; they're mid-extraction errors. The criterion 4 score of 0 still reasonable given 3+ extras indicates systemic issue, but the failure mode is not "the model hallucinated polling-place info."

4. **Heuristic-suggested scores need human review on 6 of 8 scored cells.** All on criterion 3, all medium-confidence. Section_name disagreements (C2 puts NJ "County Committee" under "County" vs GT's "Municipal"; FL Orange "Judicial" boundary fuzzy) and party_context-on-single-party redundancy (both contenders over-tag TX Harris). A human flip on any of these moves the score by 1 × weight per cell.

5. **The Phase 4 cost was ~$0.84, well under budget.** A v2 bakeoff with Textract bounding-boxes is financially feasible if the orchestrator/user picks that escalation path.

## Production integration plan

TBD — fill in after winner confirmation. Spec requires a NEW branch off `launch/production` (not this experiment branch) for production rollout. pdfjs-dist stays as the cheap path for text-layer-clean PDFs; manual-paste fallback stays as the floor.

## What we'd do differently

Captured from Phase 4 subagent debrief and Phase 5 scoring observations:

1. **Make max_tokens explicit per-fixture.** The bakeoff bumped Sonnet `max_tokens` from 8192 to 16384 mid-run because FL Orange's docling output (16K markdown → long JSON) was truncating. The bump was applied uniformly across contenders so the comparison stayed apples-to-apples, but ideally fixture token budget would be measured upfront, not discovered mid-run.

2. **Per-page latency telemetry on the runners, not just total latency.** Both contenders have ~80s p95 driven by 3-page (FL) and 14-page (Hidalgo) PDFs. Per-page Sonnet vision latency in the bakeoff was ~10–15s, so per-page is in the right zone for the 15s bar — but multi-page composites bake N× into the wall clock. The bakeoff's "p95 across fixtures" framing conflates "single-page latency" with "ballot latency." Production rollout should re-measure with per-page parallelism (Sonnet calls can fan out concurrently per page) to see if p95 collapses.

3. **C3's docling extractor needs a guard for empty-output-but-schema-valid.** The "C3 NJ = 0 sections" trap is structural. Any future runner should fail-fast (or emit `outcome: "failed_after_retry"`) when the upstream tool returns nothing recognizable. Otherwise downstream callers ship empty ballots silently.

4. **Office-name normalization is hard.** Scoring required iterating on the office matcher 4× before landing at a stable rule (substring + 80% token-subset). For production, the schema's `office` field should probably have a small canonical-form normalizer baked in so downstream consumers don't re-derive matching logic.

5. **Per-page calling strategy was set in spec but not measured comparatively.** The spec locked "per-page calls + stitch" for all contenders. Worth a follow-up A/B in production telemetry: does whole-ballot-in-one-call materially change accuracy vs cost? (C3 already does whole-doc Sonnet calls because docling's markdown lacks reliable page breaks — that deviation was documented in Phase 4.)

6. **Schema enum for section_name is too narrow.** FL Orange has "Constitutional Amendments" and "County Questions" as natural section headers. The contender emitting those is structurally correct; the schema enum is wrong by design. Recommend expanding the enum (or making it open with a `_typed_section_name` enum + freeform `section_name` field) before production wires anything live.

## Out-of-scope follow-ups

- **Progressive UX during extraction.** With 80s+ p95 ballot processing time, users will need streaming feedback (races appear in the UI as parsed) rather than a single spinner. Tag in the production-integration ticket.
- **Detector threshold tuning.** Decision-design.md defers detector floor tuning to telemetry. The bakeoff doesn't address this.
- **Caching for repeat uploads.** Hash-based dedupe so re-uploading the same PDF doesn't re-spend $0.04–$0.15.
- **Bakeoff vNext.** If AWS credentials become available, run Contender 1 (Textract + Sonnet) on the same 4 fixtures and re-rank. Per the spec's "if no contender hits all bars" escape hatch, the hybrid path (Textract bounding-box JSON + Sonnet page image in same call, cross-checking each other) is the recommended next experiment, NOT escalating to Opus.
- **Multi-page parallelism.** Fan out per-page Sonnet calls in parallel rather than sequentially. Likely halves wall-clock latency for FL and Hidalgo without changing cost.
