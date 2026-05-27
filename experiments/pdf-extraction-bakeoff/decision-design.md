# Ballot Extraction Bake-off — Design

Revised version of the original decision doc with tightenings from review. Original doc is the authoritative source for intent; this version is the implementation-ready spec the bakeoff runs against.

The final outcome (winner declared, results scored) goes in `decision.md`. This file (`decision-design.md`) is the procedural spec.

---

## Context

Current pipeline (`src/lib/pdf-extract.ts`) uses `pdfjs-dist` with `tesseract.js` fallback. Failing on PDFs with broken text layers (NJ Camden County sample — pdfjs returns gibberish like `)+&'%`, Tesseract returns OCR salad). Working fine on PDFs with clean text layers (Harris County TX — full clean extraction via pdfjs alone).

GDP.PDF benchmark (Surge AI, 2026) showed no frontier multimodal model exceeds 15% strict pass rate on professional PDFs. No single tool will Just Work; the pipeline needs validation and fallback layers.

---

## Decisions already made (do not re-litigate)

1. **Extract everything, filter downstream.** State voting rules vary enormously. Embedding that logic into extraction creates 50+ edge cases at the wrong layer. Extract every race and every candidate visible on the ballot; let the presentation layer decide what to surface based on user jurisdiction/party.
2. **Two-path pipeline.** Working text layer → cheap path (`pdfjs-dist` alone). Broken text layer → vision / layout-aware path (one of the bakeoff contenders). Detection step decides which path runs.
3. **Drop `tesseract.js`.** Garbage on hard cases, redundant on easy ones. Saves ~10MB from client bundle.
4. **Drop Claude Haiku from contention.** For NJ-shape complexity, Sonnet is the floor. Per-page cost difference vs Haiku is rounding error against value of correct extraction.
5. **Drop Claude Opus from escalation.** Cost-per-page at scale matters more than marginal accuracy gain. Escalation if no winner = the original doc's hybrid (Textract extracts + Sonnet re-checks bounding boxes), NOT a more expensive model.
6. **Privacy is not a scoring criterion.** The PDF is public sample-ballot content already on state `.gov` sites. Provider sees a ballot PDF and our server's IP — not voter identity, address, or voting decisions. Cost and accuracy are the real tiebreakers.

---

## Architecture

```
PDF upload
  ↓
pdfjs-dist text extraction
  ↓
Text-quality detector → garbage? ──→ vision / layout-aware path
  ↓                                     ↓
parse structured text              primary extractor
  ↓                                     ↓
       schema normalization  ←─────────┘
  ↓
Validated JSON output
```

### Detector requirements (behavior, not code)

- Measure ratio of dictionary-recognized tokens (English + Spanish) in extracted text against total token count
- Check for presence of expected ballot vocabulary ("Vote for", "Senator", "Governor", "Democratic Party", "Republican Party", "Partido", "Elección")
- Check for proper-noun-shaped tokens (capitalized multi-word sequences resembling candidate names)
- Threshold: if any combination falls below a confidence floor, escalate to vision path
- Never silently use bad text — escalate or surface manual-paste fallback

**Threshold tuning is deferred to production.** Implementation logs every detection decision (which PDF, heuristic scores, path picked) so future-us can adjust the floor based on real-world miscategorizations. Don't optimize the threshold during the bakeoff — that's a separate observability pass post-launch.

---

## Target output schema

Both paths must produce the same JSON shape:

```json
{
  "election_metadata": {
    "election_date": "YYYY-MM-DD",
    "election_type": "primary" | "primary_runoff" | "general" | "special",
    "jurisdiction": "string",
    "ballot_style": "string (optional)"
  },
  "sections": [
    {
      "section_name": "Federal" | "State" | "County" | "Municipal" | "Judicial" | "Propositions" | "Constitutional Amendments" | "County Questions" | "Ballot Measures" | "Judicial Retention" | "Bond Measures",
      "races": [
        {
          "office": "string",
          "district": "string (optional)",
          "position": "string (optional)",
          "vote_for_n": 1,
          "party_context": "Democratic Primary" | "Republican Primary" | null,
          "candidates": [
            {
              "name": "string",
              "party": "string | null",
              "ballot_position": "A1 (optional)",
              "placeholder_reason": "no_petition_filed" | "write_in" | null
            }
          ]
        }
      ]
    }
  ]
}
```

### Schema notes

- **`placeholder_reason`** replaces the original draft's two booleans (`is_petition_filed`, `is_write_in_slot`). One enum prevents impossible combinations like "petition filed AND write-in." `null` = real candidate.
- **Multi-party ballots** (NJ-shape, where DEM and REP ballots appear on same page): capture both, tag each race with `party_context`. Presentation layer filters.
- **Bilingual ballots** (Hidalgo TX-shape, where Spanish appears adjacent to English): extract one set of races using the English office/name field as canonical. Implicit assumption: the Spanish is a translation of the same races, not separate races. Bakeoff confirms whether tools handle this correctly per scoring criterion #8 below.

---

## Bake-off plan

### Contenders

1. **AWS Textract Forms mode + Claude Sonnet post-processor** — Textract extracts spatial form structure, Sonnet normalizes to schema and filters non-ballot content.
2. **Claude Sonnet vision direct** — page image(s) to Claude with structured extraction prompt; single-step.
3. **docling (open-source, self-hosted Python service) + Claude Sonnet post-processor** — docling extracts layout-aware structure, Sonnet normalizes.

### Standardized post-processor prompt

For contenders #1 and #3, the Sonnet post-processor receives the upstream tool's raw output and produces the target schema. The Sonnet prompt is **identical across both contenders** with a single instance variable: the upstream tool's raw output. This isolates the variable being tested (upstream extractor quality) from the post-processor's normalization quality.

Prompt template:

```
You are extracting structured ballot data from raw text produced by an upstream PDF extraction tool.

[INPUT: raw upstream output]
{{ upstream_raw_output }}
[/INPUT]

Produce JSON that conforms to the target schema below. Extract every race and every candidate visible on the ballot — do NOT filter based on party affiliation or voting rules; the presentation layer handles that.

If the upstream output is incomplete or unreliable, prefer to mark a field as null rather than guess. Mark "NO PETITION FILED" rows as placeholder_reason="no_petition_filed", not as candidates.

Target schema: [paste schema above]

Output: JSON only. No prose.
```

For contender #2 (Sonnet vision direct), the prompt is the same minus the `[INPUT]` block — Sonnet receives the page images directly.

### Multi-page PDF strategy

**Per-page calls + a stitching pass in the post-processor.** Locked across all three contenders.

Why per-page:
- Vision contender (#2): multi-image-per-call loses reading order across page boundaries. Per-page eliminates this.
- Layout-aware contenders (#1, #3): both are page-aware natively; per-page gives them cleanest input.

Stitching pass: deterministic post-processing. If a section header on page N has no candidates AND page N+1 starts mid-list with no header → merge them. ~30 lines of post-processor logic.

Cost impact: per-page is N× the API calls. For a typical 2-page ballot at Sonnet vision prices that's ~$0.10/ballot. Within the $0.10/page ceiling.

### Test PDFs

4 fixtures, each representing a distinct extraction challenge:

| Fixture | State | County | Notes |
|---|---|---|---|
| `nj-camden-2026-primary.pdf` | NJ | Camden | Broken text layer, multi-column party-grouped layout, "NO PETITION FILED" placeholders, write-in slots, bilingual, multiple party ballots on same page. |
| `tx-harris-2026-dem-runoff.pdf` | TX | Harris | Clean text-layer baseline (May 26 DEM Primary Runoff). Any contender that fails this is disqualified. |
| `tx-hidalgo-2026-bilingual.pdf` | TX | Hidalgo | Bilingual / style-specific layout (14 pages). Exercises bilingual extraction explicitly. |
| `fl-orange-2026-composite.pdf` | FL | Orange | Composite ballot format. Distinct visual style from TX/NJ. |

### Ground-truth authoring

Process:

1. **Subagent drafts ground-truth** from rendered page screenshots (NOT from pdfjs extraction — that would bias toward the cheap path).
2. **User reviews** the draft against the PDF. Marks corrections; AI applies them.
3. **Subagent double-checks** specific fields the user flags as uncertain.
4. Result: canonical `ground-truth/<fixture>.json` per fixture.

Time estimate: ~10 min per fixture.

### Retry policy

If a tool times out, rate-limits, or returns malformed JSON during the bakeoff: **retry once with exponential backoff**. After second failure, mark as "extraction failed" — score = 0 for that (tool × fixture) cell.

Failure modes are part of what we're measuring. A tool that crashes 30% of the time is not shippable, even if its successful runs are perfect.

---

## Evaluation criteria

Score each (contender × fixture) cell on each criterion. Scoring scale: 0 (fail), 1 (partial), 2 (clean). Some criteria are mechanically scorable; others require human judgment.

| # | Criterion | Auto or Human | Description |
|---|---|---|---|
| 1 | Race coverage | Auto | % of races on the PDF that appear in output |
| 2 | Candidate completeness | Auto | % of candidates per race captured correctly — name spelling, party affiliation, ballot position |
| 3 | Structural accuracy | Human | Races grouped under correct section; correct vote-for-N; "NO PETITION FILED" handled as placeholder not candidate name; write-in slots flagged |
| 4 | Non-ballot filtering | Human | Voter education content, polling locations, QR codes, early voting tables correctly excluded |
| 5 | Schema compliance | Auto | Output validates against target schema without manual repair |
| 6 | Cost per ballot | Auto | Total $ per PDF processed (logged automatically — see below) |
| 7 | Latency | Auto | Time from runner invocation to validated JSON (logged automatically — see below) |
| 8 | Bilingual handling | Human | For Hidalgo TX fixture: captures English races without duplicating into Spanish-only entries; doesn't mangle multilingual text into garbage |

Sum scored criteria 1-5 and 8 (skip 6 and 7 for the sum — those are independent tradeoff dimensions). **Weight by ballot difficulty:** NJ-Camden and Hidalgo-TX weighted 2× the simpler TX baseline. Orange-FL weighted 1.5×.

### Auto-scoring (`score.ts`)

A script in `experiments/pdf-extraction-bakeoff/score.ts` loads ground-truth and tool output, computes criteria 1, 2, 5, 6, 7 mechanically:

- **Criterion 1 (race coverage)**: `intersection(extracted_races, ground_truth_races) / |ground_truth_races|`. Match by normalized office string (lowercase, strip punctuation).
- **Criterion 2 (candidate completeness)**: per matched race, `intersection(extracted_candidates, ground_truth_candidates) / |ground_truth_candidates|`. Match by name (Levenshtein distance ≤ 2 to handle "Donald Norcross" vs "Donald W. Norcross Jr." gracefully).
- **Criterion 5 (schema compliance)**: validate output against the JSON schema (use a schema validator — Zod or AJV). Pass = 2, partial-with-warnings = 1, fail = 0.
- **Criterion 6 + 7 (cost + latency)**: read from each runner's `metrics.json` (see Cost + Latency Measurement section).

Output: `results/score-matrix.json` and a Markdown table summary in `decision.md`.

### Human-scored criteria

For criteria 3, 4, 8: user reviews each (contender × fixture) output side-by-side against the rendered PDF and assigns 0/1/2. ~5 min per (contender × fixture) cell. With 3 contenders × 4 fixtures = 12 cells × 5 min = ~60 min total review time.

---

## Cost + latency measurement

Each runner writes a `metrics.json` to `results/<runner-name>/<fixture-basename>.metrics.json` with shape:

```json
{
  "runner": "01-textract-sonnet",
  "fixture": "nj-camden-2026-primary.pdf",
  "started_at": "2026-05-27T18:00:00.000Z",
  "completed_at": "2026-05-27T18:00:12.345Z",
  "latency_ms": 12345,
  "cost_usd": 0.0834,
  "cost_breakdown": {
    "textract_pages": 2,
    "textract_cost_usd": 0.03,
    "sonnet_input_tokens": 3200,
    "sonnet_output_tokens": 850,
    "sonnet_cost_usd": 0.0534
  },
  "retries": 0,
  "outcome": "success" | "failed_after_retry" | "schema_invalid"
}
```

The `score.ts` reads these metrics files and aggregates for criteria 6 + 7. This gives us:

- Per-contender total cost across all 4 fixtures
- Per-contender mean/p95 latency
- Cost-per-page broken down by upstream tool vs Sonnet post-processor
- Confidence to project production cost at scale

---

## What "winning" looks like

A contender ships if it achieves on ALL of:

- ≥ 90% race coverage on the simpler TX baseline fixture
- ≥ 70% race coverage on the NJ-Camden fixture
- Schema-valid output on every fixture (criterion 5 = 2 on every fixture)
- Cost under $0.10/page (averaged across fixtures)
- Latency under 15 seconds (p95 across fixtures)
- Bilingual criterion ≥ 1 on the Hidalgo TX fixture

If multiple contenders pass: pick the lowest total cost across the 4 fixtures, tiebreak on latency.

### If no contender hits the bars

Per decision #5: do NOT escalate to Opus. Instead, run a v2 bakeoff with **the original doc's hybrid path**: Textract extracts spatial structure (bounding boxes per text region), Sonnet receives BOTH the rendered page image AND the Textract bounding-box JSON, and is prompted to cross-check the layout against the visual. This trades a small cost increase (Textract + vision pass through Sonnet) for stronger reading-order accuracy.

No "ship as-is" fallback. The bakeoff produces a winner OR we keep iterating. If v2 also fails, scope re-opens — but that's a separate conversation, not a silent regression to current pipeline.

---

## Out of scope for the bake-off

- State-specific voting rule logic (downstream concern, deliberately deferred)
- User-facing UI for paste-text fallback (still required for shipping, but separate workstream)
- Auth, rate limiting, abuse prevention on extraction endpoint (production wiring concern)
- Caching strategy for repeat uploads (production wiring concern)
- Detector threshold tuning (telemetry-driven post-launch)

---

## Open questions to resolve during implementation

- Where does extraction run? New `/api/extract-ballot` route, or extend `/api/civic`? **Decide during shipping phase.**
- Caching for re-uploads of same PDF (hash-based)? **Decide during shipping phase.**
- How are extraction failures surfaced to user — confidence threshold, partial result + flag, force manual paste? **v1: force manual paste below threshold. v2: partial result + flag.**
- **Progressive UX during extraction**: do users wait silently 10-15s, or do races stream into the UI as they're extracted? **Out of scope for bakeoff. Tag in `decision.md` as a follow-up after the winner ships.**

---

## Shipping after bake-off

Winning contender → wire as primary path in `/api/extract-ballot`. pdfjs-dist remains as the cheap path for text-layer-clean PDFs. Manual-paste UI fallback stays as the floor for everything that fails extraction.

Production rollout PR is created from a NEW branch off `launch/production`, not from this `experiment/pdf-extraction-bakeoff` branch. The bakeoff branch stays as an archived reference artifact.

Follow-up after ship (tagged in `decision.md`):
- Progressive UX during extraction (streaming races to UI as they're parsed)
- Detector threshold tuning based on production telemetry
- Caching strategy for repeat uploads
