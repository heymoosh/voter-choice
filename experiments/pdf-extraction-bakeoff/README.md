# PDF Extraction Bakeoff

A controlled experiment comparing PDF extraction tools for Voter Choice's sample-ballot upload flow.

## Why

Production currently uses `pdfjs-dist` for text PDFs and `tesseract.js` as an OCR fallback for image PDFs (see `src/lib/pdf-extract.ts` on `launch/production`). Tesseract works but produces garbage on visually complex multi-column documents — exactly what real sample ballots are.

This bakeoff measures how well alternative tools handle real ballot PDFs, so we can make a defensible swap.

## What's in scope

- **Real ballot fixtures**, not synthetic test PDFs. We test against what actually breaks.
- **Per-state coverage** — TX and NJ have different ballot layouts (2 of each).
- **Ground-truth comparison** — for each fixture, we hand-write the correct extraction. Tools are scored against that, not vibes.
- **All tools run on the same fixtures**, so the comparison is apples-to-apples.

## What's NOT in scope

- Mobile responsiveness, UI styling, prompt tuning — pure extraction quality only.
- Long-tail PDF formats (encrypted, vector-only, password-protected) — those are edge cases for a separate pass.
- Performance benchmarking past "is the latency acceptable for a user upload" — quality is the bottleneck, not speed.

## Layout

```
experiments/pdf-extraction-bakeoff/
├── README.md              ← you are here
├── fixtures/              ← real ballot PDFs (TX × 2, NJ × 2)
├── ground-truth/          ← hand-written expected output per fixture (JSON)
├── runners/               ← one script per tool, numbered
├── results/               ← raw output from each (tool × fixture)
└── decision.md            ← writeup + winner (filled in after Phase 4)
```

## Process

1. **Setup** (done): worktree + scaffold
2. **Fixtures**: drop 4 real ballot PDFs into `fixtures/`
3. **Ground truth**: hand-write `ground-truth/<fixture>.json` for each
4. **Run**: each tool's runner script extracts each fixture, dumps to `results/`
5. **Score**: compare each result against ground-truth on:
   - All races found (recall)
   - No fake races invented (precision)
   - Correct candidate names per race
   - Correct party labels
   - Race section (Federal/State/Local) preserved or inferable
6. **Decide**: writeup in `decision.md`, pick a winner (or "none of these is good enough")
7. **Fold in** (separate PR off `launch/production`, not this branch): port the winner's integration into production code

## Branch + worktree

This work lives on `experiment/pdf-extraction-bakeoff`, in worktree `.claude/worktrees/pdf-bakeoff/`. The branch name's `experiment/` prefix is intentional — it signals to future-us that this branch is allowed to be messy and may never merge.

If we pick a winner, we create a NEW branch off `launch/production` (e.g., `feat/replace-tesseract-with-<winner>`) for the production integration. The bakeoff branch stays as a reference artifact, not a merged commit chain.

## Cost

Budget: $5 for paid API calls during the bakeoff. Free tiers used where possible. Per-tool API cost is logged in `results/<tool>/cost.txt`.

## Tools tested

(Filled in once user supplies the tool list.)
