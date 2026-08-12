# Promise adjudication rubric

> **Version: 1.0.0** — signed off by Muxin 2026-08-12 ("get everything else
> out"): the proposed ship-gate numbers ship as the initial defaults, revisable
> before the first gold pass (revising them is a MINOR bump per the rule
> below, cheap while no verdict has shipped).
>
> Parent plan: `docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md` Part 5. The
> verdict enum was signed off 2026-07-23.
>
> **Versioning rule:** semver, recorded verbatim in
> `promise_verdicts.adjudicator_version` beside the model identifier (e.g.
> `rubric-0.1.0+modelrev`). Any change to a verdict definition, the evidence
> ladder, or the extraction gate is a MINOR bump and invalidates prior
> verdicts (they revert to `not_yet_rated` until re-adjudicated); wording
> clarifications that cannot change a verdict are PATCH bumps.

## Who applies this rubric

The **adjudicator** is an LLM. It is **not the judge — it is an evidence
assembler applying this published rubric**. The rubric is the editorial
judgment we own; the model executes it, shows its work, and **flags ambiguous
cases for human review instead of forcing a verdict**. The **annotators** are
the humans (Muxin plus her husband — see §6.2 for the composition note) who
hand-label the gold set the adjudicator is graded against (§6).

---

## 1 · What counts as a promise (the extraction gate)

A statement enters `candidate_promises` only if **all four** hold at
extraction time:

1. **Committed actor.** The candidate commits _themself_ ("I will vote
   against…", "I'll introduce…"), not their party, not "Washington", not "we
   as a nation".
2. **Falsifiable action.** A concrete act a member of Congress can take, not
   a disposition ("fight for", "stand with", "prioritize" are rhetoric unless
   attached to a specific act).
3. **Determinable scope.** What the action applies to is identifiable — a
   named bill, program, tax, appointment, or a class of votes definable by
   our `issue_tags` vocabulary.
4. **Testable window.** An explicit deadline, or an implied one we declare —
   default: the term of office being sought. Recorded in
   `conditions_deadline`.

**The test for "kept" is declared at extraction time, before any outcome is
known** — never chosen after seeing how things turned out. Concretely: the
extractor writes `promise_type` (`vote` | `introduce_bill` | `oversight` |
`funding` | `outcome`) and `conditions_deadline` into the promise row, and the
adjudicator may only apply that pre-declared test. If the declared test turns
out to be wrong (mis-typed at extraction), the fix is a re-extraction — a new
row version — never a silent in-place change at adjudication time.

A statement failing any gate is **filtered as unverifiable rhetoric** and not
carried forward to be judged. Filtering is not a verdict and is never shown as
one; it just means the statement is not in the ledger.

**Conditional promises** ("if X passes, I will…"): the condition goes into
`conditions_deadline`. If the condition never occurs inside the window, the
promise is `not_yet_testable` — never `broken`, never quietly dropped.

## 2 · Unit of evaluation: the controllable action

A promise is evaluated against **the action the member plausibly controlled**,
by chamber and office:

- A promise to **vote** a certain way is kept by casting that vote. A House
  member who promised "vote against X" and did so has **kept** the promise
  even if X passed. "No law materialized" is never by itself `broken`.
- A promise to **introduce** or **cosponsor** is kept by the introduction or
  cosponsorship appearing in the official record.
- A promise of an **outcome** ("repeal X", "get Y funded") is the only type
  where advancement and enactment matter — and is exactly where
  `attempted_blocked` and `compromise` exist to keep us honest about what one
  member can control.

The mirror-image rule, both directions enforced:

- **Never credit an outcome they didn't drive.** Introducing a bill similar
  to a law that later passed is _Activity_, not authorship of the outcome
  (agenda-setting is attributed separately from outcome).
- **Never blame an outcome they couldn't control.** Other institutions
  stopping a genuinely attempted action is `attempted_blocked`, not `broken`.

## 3 · Evidence standard: Activity < Advancement < Outcome

Every `promise_actions` row is labeled with the **highest** rung the official
record actually supports, and a verdict may only cite that rung:

| Label           | What the record shows                                                         | Our sources                                    |
| --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| **Activity**    | Introduced / cosponsored / offered an amendment / cast a vote                 | `bills`, `bill_cosponsors`, `votes`            |
| **Advancement** | Committee action, markup, amendment adopted, floor consideration              | `committee_memberships` + Congress.gov actions |
| **Outcome**     | Provision in enacted law, or the promised vote actually cast on final passage | enacted-law status on `bills`, `votes`         |

Admissible evidence is the **official record** (votes, bill status,
cosponsorship, committee actions, enacted law) plus the member's own archived
statements for what was promised. **Not admissible as evidence of action:**
news coverage, opponents' characterizations, party-level behavior, or the
member's own claims about what they did (their claims are promises or
positions; the record is the evidence).

## 4 · Verdicts

Enum (signed off 2026-07-23): `kept` | `attempted_blocked` | `compromise` |
`broken` | `not_yet_testable` | `not_yet_rated`.

Apply the first rule that matches, in this order:

1. **`not_yet_testable`** — no relevant vote, bill, or deadline has occurred
   yet; or a declared condition hasn't triggered. This is a real
   adjudication, recorded with the same rigor as any other, and it is the
   default state of most promises early in a term.
2. **`kept`** — the pre-declared controllable action occurred, in the
   promised direction, inside the window, at the evidence rung the promise
   type requires (`vote`/`introduce_bill`: Activity is sufficient because the
   act _is_ the promise; `outcome`: requires Outcome).
3. **`attempted_blocked`** — the member took the promised controllable action
   (Activity, and Advancement where available), but other institutions
   stopped the outcome: the bill died in the other chamber, was vetoed,
   failed on a floor vote they lost, was enjoined. The member's own conduct
   matched the promise.
4. **`compromise`** — a materially partial version of the promised outcome
   was achieved with the member's promised participation: narrower scope,
   lower funding, sunset clauses. The record must show both the delta from
   the promise and the member's role.
5. **`broken`** — the window closed (or the dispositive vote occurred) and
   the record shows the member either took the opposite action (voted
   against what they promised to vote for), or took **no** controllable
   action toward the promise when the opportunity existed. Absence of
   opportunity is `not_yet_testable` or `attempted_blocked`, never `broken`.
6. **`not_yet_rated`** — not yet adjudicated, or **contested**: the two human
   annotators disagreed (§6), or the adjudicator flagged the case as
   ambiguous (§5). Visible state, never hidden.

Every verdict row records: the rationale, the evidence refs (each with its
Activity/Advancement/Outcome label), `adjudicator_version` (which pins this
rubric's version), and `adjudicated_at`. **Every verdict shows its evidence
inline** on any surface that renders it.

## 5 · Ambiguity: when the adjudicator must not force a verdict

The adjudicator flags for human review — producing `not_yet_rated` with a
recorded reason — whenever:

- The promise's scope and the candidate action's scope overlap only partially
  and no rule in §4 clearly applies.
- Two evidence items point at different verdicts (e.g. voted for the rule,
  against the bill).
- The promise depends on characterizing a bill's content beyond its
  `issue_tags` (the deterministic join failed and a judgment call would be
  needed to link promise to action).
- Sarcasm/rhetoric vs. commitment is genuinely unclear in the archived
  source.

A forced-verdict rate target belongs to evaluation, not to the case: the
adjudicator is never penalized in scoring for flagging; it is penalized for
guessing.

## 6 · Gold set, calibration, and the ship gate

Mirrors the bill tagger's gold workflow (`scripts/ingest/_gold-sample.ts`,
`_gold-oracle.workflow.js`, `_subissue-gold-score.ts`) with the additions the
plan requires because kept/broken is a contested judgment, not an objective
tag:

1. **External calibration first.** Before grading our own gold set, score the
   adjudicator against a sample of professionally hand-labeled promise
   verdicts — PolitiFact's presidential meters and the academic
   Polimeter/Poltext corpora — mapping their scales onto our enum. This
   calibrates the _method_ (they cover presidents/governments, not members of
   Congress) and shrinks the gold set we must label; it does not replace it.
   PolitiFact labels are Poynter's copyrighted editorial content: internal
   scoring with citation only, never republished.
2. **Two annotators.** Muxin plus her husband (chosen 2026-08-12), labeling
   independently against this rubric. The original "ideally of differing
   politics" criterion is consciously deferred, not dropped (Muxin:
   "yes agree but let's get this out first, finesse it later") — the known
   mitigation is a third spot-check annotator on a gold-set sample before
   the ledger faces outside scrutiny, and same-household annotators make
   the independent-labeling rule below load-bearing: no discussing a case
   until both labels are recorded.
3. **Agreement reported.** Inter-annotator agreement (Cohen's κ) published
   beside the oracle score. **Where the two humans disagree, the promise is a
   genuinely contested case and goes to `not_yet_rated` — it does not enter
   the gold set.**
4. **Ship gate (initial defaults, confirmed 2026-08-12; revisable before the
   first gold pass):** no verdict ships until, on the pilot state's gold set,
   κ ≥ 0.70 on the human pair AND the adjudicator matches the agreed human
   label on ≥ 90% of gold cases with zero `kept`↔`broken` polarity flips.
   Behind `PROMISE_TRACKER_ENABLED` until Muxin signs off regardless of
   scores.

## 7 · Display rules (summarized here; UI owns the copy)

- Every verdict renders with its evidence refs inline.
- `not_yet_rated` and `not_yet_testable` are legitimate, visible states.
- Zero promises found for a candidate renders as "no promise corpus for this
  candidate", never as a blank (Part 2 step 4's honesty rule).
- Archived-source links point at the **exact capture** the promise was
  extracted from (`archive_url`), or the verdict is unreproducible.

## Change log

- **1.0.0** (2026-08-12) — signed off by Muxin ("get everything else out"):
  ship-gate numbers confirmed as initial defaults (revisable pre-gold-pass);
  second annotator named (her husband; differing-politics criterion deferred
  with the third-spot-check mitigation recorded). Constraint recorded from
  the same exchange: **no paid licensing** for any promise-venue source —
  free/public-record routes only (state voter guides, state filings, and
  Ballotpedia/Vote Smart only under free terms).
- **0.1.0-draft** (2026-07-25) — initial draft for Muxin + second annotator
  review. Encodes the Part 5 plan requirements: signed-off verdict enum,
  controllable-action unit, declare-test-at-extraction,
  Activity/Advancement/Outcome ladder, ambiguity escalation, two-annotator
  gold process. Proposed (not settled): the §6 ship-gate numbers, the
  default testable-window (term of office), the §1 four-gate wording.
