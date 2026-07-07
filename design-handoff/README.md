# Voter Choice — Claude Code handoff bundle

Self-contained drop for the engineer wiring the **"Raised vs. the median"**
feature (and closing the launch-readiness items) behind the reviewed design.
Paths below resolve relative to this folder.

## Read in this order
1. **`design-session/HANDOFF-TO-CLAUDE-CODE.md`** ← START HERE. The spec: the
   `peerComparison` data contract, where each piece renders, the gap analysis
   (components / interactions / a11y / AI privacy & ethics), and done-criteria.
2. **`representatives-only/HANDOFF.md`** — the mock→real-source map
   (`/api/donors` → `lookupDonorCoalition()`, `donor_aggregates`) and the
   do-not-modify boundary list.
3. **`uploads/SCOPE.md`** + **`design-session/DECISIONS.md`** — the broader
   scope and the decision→repo-file wiring the spec references.

## The new feature — design source to port
- **`design-session/screens-funding.jsx`** — the components: `MedianChip` (the
  collapsed glance), the field/scale, and `MoneyGapH2H` (the head-to-head). All
  band logic + the `null`-median blank live here.
- **`design-session/funding.css`** — its styles.
- **`design-session/screens.css`** — palette tokens the CSS needs
  (`--gold`, `--ink*`, `--brand*`, `--keep`, `--replace`, `--mono`/`--serif`…)
  under `[data-palette="white"]`, plus `.flagbar` / `.kick`.
- **`design-session/candidates.css`** — the `.pip` party dots the scale reuses.

## The two surfaces it plugs into
- **`design-session/screens-results.jsx`** — `FunderPanel` + `REP_FUNDING`. The
  static `peer: "≈3× the median House campaign"` string is what the scale
  **replaces**; the chip goes on the collapsed money-line.
- **`design-session/screens-candidates.jsx`** — `CandCard` (drop the chip on its
  money row) and `HeadToHead` (the compare flow that gets `MoneyGapH2H`).

## One-line brief
Baseline is the **chamber median** (locked). Lead with a **multiple**; the gold
segment past the median line is "how much more." Neutral palette (gold, not
keep/replace red/green). `peerComparison: null` ⇒ show the dollar only — never a
fabricated baseline. Don't redesign — wire.
