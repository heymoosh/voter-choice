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
- `DelegationWorkspace.tsx` — the single-seat deep view (v3, 2026-07-21: the
  right rail is gone — the delegation overview is the only nav surface at
  every breakpoint; this hosts the centered RepCard + all-done panel + ask).
- `EditIssuesModal.tsx` — workspace modal for editing locked issues via the
  same conversational loop as intake; re-scores on apply.
- `FundingSources.tsx` — money-redesign's fused "where the big money comes
  from" ranked source list (individuals + named issue-PACs + industries +
  untraced remainder as one dollar-sorted list); FunderBars renders the same
  data as three separate blocks for the legacy ballot CandidateCard, whose
  DOM this repo has to keep byte-identical — a shared component would need a
  variant flag replicating that split, which is more coupling than the two
  surfaces' genuinely different layouts warrant.
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
- `MoneyVerdict.tsx` — the donors'-way money-influence verdict block
  (whiteboard v4 `.mny-verdict`), rendered from `deriveMoneyInfluence()` on
  both the seat card and the duel money columns; honest-null (renders
  nothing without scorable PAC data), so it couldn't live inside
  FundingSources (which gates on the full funding breakdown instead).
- `OutsideSpending.tsx` — the "Outside spending about this race" block
  (Part 6b): independent expenditures for/against as two never-summed
  figures in a separately-bordered container with its own legal explainer.
  Deliberately NOT inside FundingSources or the money expander — the
  campaign-finance-law display rule requires this money never mingle with
  candidate receipts, so a variant of an existing money component would be
  the exact misstatement the isolation test forbids.
- `PolisClose.tsx` — the "where you stand" standing report (party-free
  consensus/divided panels).
- `PolisEntry.tsx` — polis invite/preview interstitial between workspace
  completion and the standing flow.
- `PolisStand.tsx` — blind agree/disagree/pass contribution step of the
  polis chain.
- `RepCard.tsx` — the single-seat candidate card (alignment banner, voting
  record entry, provenance, funding glance); the center pane of the
  workspace.
- `RevolvingDoorBand.tsx` — the "heading for the exit" revolving-door
  callout (whiteboard v4 `.rd-band`), gated on an explicit curated record
  prop with a citation; renders nowhere until the curated dataset exists,
  so it stays a standalone slot rather than a FundingSources/RepCard
  variant.
- `ScorecardPrintView.tsx` — the print/export sheet of all seats + verdicts.
- `SeatChat.tsx` — per-seat "ask anything about this seat" support chat under
  the RepCard.
- `TopPacSponsors.tsx` — the "Top PACs and sponsors" breakdown (Part 6a):
  names the committees inside the funding mix's "PACs" slice with filed
  sponsor, sector, and evidence link. Lives beside FundingSources rather
  than inside it because it is per-committee curated data (auto/verified/
  rejected) with its own empty state, not a slice of the mix percentages
  FundingSources renders.
