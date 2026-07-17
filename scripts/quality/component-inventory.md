# Component inventory — `src/prototype/redesign/`

One line per component file: **what UI function it serves**. This file is a
gate input (`npm run inventory:check`, `scripts/quality/
component-inventory-gate.ts`): a PR that adds a new component file under
`src/prototype/redesign/` fails CI until the component is listed here.

The point is component _minimization_, which the literal-clone ratchet
(`npm run dup:check`) cannot see: two independently-written components can
serve the same UI function without sharing a line of code — and then drift
out of sync. Before adding an entry, read the list and answer honestly:
**why can't an existing component (extended with a prop/variant) serve this
function?** Put that answer in the entry — it's the one sentence a reviewer
needs. If you can't write it, extend the existing component instead.

Format (parsed by the gate — keep it): `- \`FileName.tsx\` — description`.
Entries for deleted files fail the gate too; remove them in the same PR.

## Entries

- `App2.tsx` — app shell + stage router for the congress-assessment
  experience (home → intake → orientation → workspace → polis); owns the
  canonical locked-issues state.
- `BudgetModal.tsx` — community-budget-exhausted modal (continuity options
  when the shared LLM budget runs out).
- `RosterFeedback.tsx` — "Missing a rep? Something look wrong?" ballot-accuracy
  feedback trigger + modal; reuses the shared `.be-modal-overlay`/`.be-modal`
  chrome from BudgetModal/HandoffModal rather than a new modal system.
- `ByokCard.tsx` — bring-your-own-key entry card; shared by the budget and
  handoff modals rather than duplicated into each.
- `DelegationOverview.tsx` — the "everyone who represents you — scored"
  landing grid: one scored SeatCard per up-for-election seat.
- `DelegationWorkspace.tsx` — the 3-pane workspace (rail / center card /
  scorecard) that hosts a single seat's deep view.
- `EditIssuesModal.tsx` — workspace modal for editing locked issues via the
  same conversational loop as intake; re-scores on apply.
- `HandoffActions.tsx` — continue-elsewhere actions (per-chatbot copy & open,
  .txt download); shared by budget + handoff modals.
- `HandoffModal.tsx` — "take your scorecard with you" export surface.
- `HeadToHead.tsx` — incumbent-vs-challengers duel ("Time to replace" flow),
  including the seat's funding comparison.
- `IntakeLocked.tsx` — pre-lock confirm screen between the issue conversation
  and the lock taking effect (review card + jurisdiction split banner).
- `IntakeView.tsx` — cold-open host for the conversational issue intake.
- `IssueConversation.tsx` — the ONE conversational issue loop (extract →
  refine → lock), shared by IntakeView and EditIssuesModal; also exports the
  IssueReviewCard list both intake screens render.
- `IssueDeltaBanner.tsx` — post-re-score delta banner (what changed per seat
  after an issues edit).
- `MoneyGap.tsx` — "raised vs. the median" money-scale primitives
  (MedianChip glance + MoneyGapScale/GapRow rows); consumed by RepCard and
  HeadToHead rather than re-implemented per surface.
- `PolisClose.tsx` — the "where you stand" standing report (party-free
  consensus/divided panels).
- `PolisEntry.tsx` — polis invite/preview interstitial between workspace
  completion and the standing flow.
- `PolisStand.tsx` — blind agree/disagree/pass contribution step of the
  polis chain.
- `RepCard.tsx` — the single-seat candidate card (alignment banner, voting
  record entry, provenance, funding glance); the center pane of the
  workspace.
- `ScorecardPrintView.tsx` — the print/export sheet of all seats + verdicts.
- `SeatChat.tsx` — per-seat "ask anything about this seat" support chat under
  the RepCard.
