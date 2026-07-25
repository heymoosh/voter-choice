# Design handoff — RepCard §5 "Closest collaborators"

> **Status: data layer shipped and verified on prod; the front end is a PLACEHOLDER that has
> never had a design review.** Built to prove the data path end-to-end (PRs #456, #458). The
> markup below renders correctly and is self-vetted for code/render correctness only. Treat
> the layout, ordering, copy and IA as open. It may be reworked, moved, or dropped.
>
> Date: 2026-07-25. Source of truth for the feature: `docs/DONOR_FRAMING_AND_ACCOUNTABILITY_PLAN.md`
> (Part 4 + "Part 4 follow-up — executed").

## The ask, in one line

Design the "Closest collaborators" band — and specifically decide how (or whether) to mark a
collaborator who has **left Congress**, given that departed members turn out to be
concentrated in the "reaches across the aisle" list.

---

## 1. What this section is

Answers a question voters asked us verbatim: _"I'd also want to know who their closest
partisan and bipartisan collaborators are."_

The data is a **bill-participation graph**: two members collaborate on a bill when both put
their name on it, as sponsor or cosponsor. We hold 12,073 such rows over 626 federal bills.
For each member we compute their top same-party and top cross-party collaborators by
shared-bill count, in SQL at request time.

**The metric is unweighted and we know it.** A widely-cosponsored ceremonial resolution counts
the same as a narrow, hard-fought bipartisan bill. That is why the band cites the **Lugar
Center–Georgetown Bipartisan Index** as the rigorous external benchmark rather than claiming a
bipartisanship score of our own. Any design must not let the number read as a score.

## 2. Current implementation (literal source — do not rebuild from prose)

`src/prototype/redesign/RepCard.tsx`, `CollaboratorsBand` + `CollaboratorGroup`:

```jsx
<div className="cmt-outer collab-band">
  <div className="collab-groups">
    {/* cross-party group renders FIRST when non-empty, then same-party */}
    <div className="collab-group">
      <div className="collab-group-label">Reaches across the aisle to</div>
      <ul className="cmt-list collab-list">
        <li className="cmt-row collab-row">
          <span className="cmt-name">
            David Trone
            <span className="collab-party"> (D · former)</span>
          </span>
          <span className="collab-count-chip">9 bills</span>
        </li>
        {/* …up to 5 rows */}
      </ul>
    </div>
    {/* same-party group, identical structure */}
  </div>
  <p className="collab-cite">
    By bills cosponsored together. For a rigorous bipartisanship score, see the
    Lugar Center–Georgetown Bipartisan Index.
  </p>
</div>
```

Honest-empty state (federal vs state are deliberately different copy):

```jsx
<div className="cmt-outer na collab-na">
  <span className="txt">
    Not enough cosponsorship data on file yet to name this member's closest
    collaborators.
  </span>
</div>
```

Section chrome — reuses the numbered-step pattern from §4 Committees:

```jsx
<div className="sec step-collaborators">
  {/* kicker: "Who they work with"  ·  heading: "Closest collaborators" */}
```

`public/redesign2.css` (the whole of it — there is no other collaborator styling):

```css
/* ---- collaborators (cosponsorship network) ---- */
.collab-band {
  align-items: stretch;
  flex-direction: column;
}
.collab-groups {
  display: grid;
  gap: 12px;
  width: 100%;
}
.collab-group-label {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 5px;
}
.collab-party {
  color: var(--ink-3);
  font-size: 12px;
}
.collab-count-chip {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--paper-2);
  color: var(--ink-2);
  white-space: nowrap;
}
.collab-cite {
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--ink-3);
}
```

Every string is i18n'd (`en` + `es` both present in `src/prototype/VoterChoiceApp.tsx`):

| key                               | en                                                                                                                    | es                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `stepCollaboratorsKicker`         | Who they work with                                                                                                    | Con quién trabajan         |
| `stepCollaboratorsHeading`        | Closest collaborators                                                                                                 | Colaboradores más cercanos |
| `collaboratorsCrossParty`         | Reaches across the aisle to                                                                                           | Cruza el pasillo con       |
| `collaboratorsSameParty`          | Most often works with                                                                                                 | Trabaja más seguido con    |
| `collaboratorsFormer`             | former                                                                                                                | ex                         |
| `collaboratorsSharedBills`        | {n} bills                                                                                                             | {n} proyectos              |
| `collaboratorsCite`               | By bills cosponsored together. For a rigorous bipartisanship score, see the Lugar Center–Georgetown Bipartisan Index. | —                          |
| `collaboratorsUnavailableFederal` | Not enough cosponsorship data on file yet to name this member's closest collaborators.                                | —                          |
| `collaboratorsUnavailableState`   | Cosponsorship isn't tracked at the state level yet.                                                                   | —                          |

Data shape reaching the component (`ApiCollaborator`):

```ts
{ candidateId: string; name: string; party: "D" | "R" | "I" | null;
  sharedBills: number; departed?: boolean }
```

## 3. Real data to design against

Pulled live from prod, 2026-07-25. These are actual rendered values, not mockups.

**Claudia Tenney (R-NY24)** — a high-volume member:

```
REACHES ACROSS THE AISLE TO        MOST OFTEN WORKS WITH
Josh Gottheimer (D)      20 bills  Randy Weber (R)          48 bills
Jared Moskowitz (D)      15 bills  Nicholas Langworthy (R)  45 bills
Susie Lee (D)            14 bills  Dan Crenshaw (R)         39 bills
Brad Sherman (D)         13 bills  Earl Carter (R)          38 bills
David Trone (D · former) 13 bills  Erin Houchin (R)         38 bills
```

**Marie Gluesenkamp Perez (D-WA3)** — mid-volume, unusually bipartisan:

```
REACHES ACROSS THE AISLE TO        MOST OFTEN WORKS WITH
Michael Lawler (R)       11 bills  Donald Davis (D)         13 bills
John Rutherford (R)      10 bills  Josh Gottheimer (D)      10 bills
Brad Finstad (R)          9 bills  Chris Pappas (D)          8 bills
Brian Fitzpatrick (R)     9 bills  Jared Moskowitz (D)       7 bills
David Kustoff (R)         9 bills  Jasmine Crockett (D)      7 bills
```

**Sara Jacobs (D-CA51)** — low-volume; note how small the numbers get:

```
REACHES ACROSS THE AISLE TO        MOST OFTEN WORKS WITH
Brian Fitzpatrick (R)     6 bills  Chris Deluzio (D)         9 bills
Don Bacon (R)             6 bills  Eleanor Holmes Norton (D) 9 bills
Michael Lawler (R)        5 bills  Betty McCollum (D)        8 bills
Andrew Garbarino (R)      4 bills  Dina Titus (D)            8 bills
Ann Wagner (R)            4 bills  James McGovern (D)        8 bills
```

**Kevin Kiley (I-CA3)** — the edge case that drove the last fix. He is an **Independent who
caucuses Republican**, so he displays "(I)" but his same-party bucket is Republicans. Note
**two** departed people in his cross-party list:

```
REACHES ACROSS THE AISLE TO         MOST OFTEN WORKS WITH
Josh Gottheimer (D)       8 bills   Claudia Tenney (R)       19 bills
Scott Peters (D)          7 bills   Gus Bilirakis (R)        18 bills
Susie Lee (D)             7 bills   John Moolenaar (R)       18 bills
David Trone (D · former)  6 bills   Troy Balderson (R)       18 bills
Derek Kilmer (D · former) 6 bills   Garland Barr (R)         17 bills
```

## 4. The new question — and why it's bigger than a label

~96 people in the graph have **left Congress**. They are in it legitimately: they cosponsored
118th-Congress (2023–24) bills alongside members who still sit. Muxin's call was **show them,
labelled "former"** — dropping them would silently shrink a member's real network, but
unlabelled they read as current colleagues. The current treatment is the minimum viable version
of that: `David Trone (D · former)`.

**Then the numbers came in, and they complicate the framing.** Measured across 400 sitting
members with a rendered network:

| measure                                                   | value                   |
| --------------------------------------------------------- | ----------------------- |
| members showing ≥1 departed collaborator                  | **179 / 400**           |
| departed rows in the **cross-party** ("aisle") lists      | **191 / 1,793** (10.7%) |
| departed rows in the **same-party** lists                 | 25 / 2,000 (1.25%)      |
| members with ≥1 departed person in their cross-party list | **159**                 |
| members whose **entire** cross-party list is departed     | **15**                  |

A departed collaborator is **~8.5× more likely** to appear in the bipartisanship list than the
same-party list. (Mechanically: cross-party thresholds are much lower — 4–13 shared bills vs
17–48 — so a departed member's modest counts clear the aisle bar but never the same-party bar.)

So for 40% of members, the "Reaches across the aisle to" claim is partly carried by people no
longer in Congress — and for 15 members, **entirely** so. That is a truthfulness question about
the section's headline claim, not just a styling question about a suffix.

**Design questions:**

1. Is "(D · former)" enough, or does a departed row need stronger visual separation — a chip,
   a muted row, a rule, a separate sub-list ("previously worked closely with")?
2. Should the "Reaches across the aisle to" label change when some or all of that list is
   departed? A member whose entire aisle-reaching list left Congress arguably should not be
   framed as currently reaching across the aisle at all.
3. Is "former" the right word? (es: "ex".) Alternatives: "left Congress", "no longer serving",
   a year — "(D · through 2024)".

## 5. Pre-existing open questions (unchanged, still open)

4. **Information architecture.** Collaborators currently occupy their own numbered step, §5,
   which pushes Money and Attendance down the card. Does it deserve a numbered step at all, or
   should it live inside an existing section, or behind a disclosure?
5. **Ordering and framing.** Cross-party leads because bipartisan reach is the more interesting
   signal — an editorial choice made in code, never designed. Same-party first is defensible.
6. **The "N bills" chip.** It exposes the unweighted proxy directly to the reader. A designed
   treatment might show rank only, bucket it ("frequently / occasionally"), or drop the number
   entirely and lean on the Lugar link. Note how weak the small numbers look in the Sara Jacobs
   example above — "4 bills" invites a precision the metric doesn't have.

## 6. Constraints (non-negotiable)

- **Never claim a bipartisanship score.** The count is a rough proxy; Lugar is the benchmark and
  the citation stays in some form.
- **Honest empty states stay**, and federal vs state must remain distinguishable — cosponsorship
  is a federal-only source, so a state legislator's blank means "not tracked", not "no friends".
- **Every string must be i18n-able** (en + es both ship).
- **Party letter is display-only.** A genuine Independent must never be printed as D or R, even
  though the buckets use their caucus. Sanders, King and Kiley are the live cases.
- Challengers never render this section at all — it is incumbent-only by construction.
- Work within the existing `redesign2.css` token vocabulary (`--ink-*`, `--paper-*`, `--mono`).

## 7. What we need back

Per the design round-trip protocol: **literal front-end source**, not a description — the
existing markup + CSS above is what we will diff against and port real logic into. A rework of
the band covering the populated state, the departed-collaborator treatment, and both empty
states. If the answer is "this shouldn't be its own section", that is a valid and useful
outcome — say so and show where it should go instead.
