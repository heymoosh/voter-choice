# Non-voting-territory delegate rendering gap — design-decision writeup

Date: 2026-07-15. Discovered while scoping the "[P0] Import + verify official
roster: American Samoa (AS)" backlog card, before any code was written or the
card was claimed. Card left at `STATUS: Backlog` — this build was paused, not
started, per Muxin's explicit call (see "Decision" below).

## Bottom line

**American Samoa does not fit the AZ/TX/OK/AL/AK vertical-slice pattern.**
Every jurisdiction built through that pattern so far is a *voting* state (a
House district and/or a Senate seat). AS, DC, GU, MP, PR, and VI are all
non-voting territories represented only by a single at-large Delegate (PR's
is titled Resident Commissioner) — and the app currently short-circuits all
six of them to an honest "no representation" state **before any roster code
ever runs**:

```ts
// src/app/api/delegation/route.ts:206, :80
const NON_VOTING_AREAS = new Set(["DC", "PR", "GU", "VI", "AS", "MP"]);
// ...
if (district === null && isNonVotingArea(stateCode)) {
  return Response.json({
    status: "no_representation",
    stateCode,
    territoryName: stateName,
  });
}
```

Importing an official roster fixture for any of these six today would have
**zero user-visible effect** — the route returns before `resolveDelegation`,
`lookupChallengers`, or `getOfficialRoster` are ever called. This isn't the
additive, flag-gated, zero-behavior-change slice the prior five cards were;
building the fixture/importer/tests layer alone would satisfy none of the
card's own `GOAL_CONDITION` (the app's literal output must match the roster —
there is no app output to match yet).

## What's actually missing (three layers, not one)

1. **No "delegate" office type anywhere in the roster pipeline.**
   `scripts/congressional-rosters/types.ts`'s `OfficialRosterEntry.office`
   is `"house" | "senate"` only. `db/schema.ts`'s `official_roster_candidates.office`
   column is plain `text` (no CHECK constraint, so no migration would be
   *required* to add a third value) but `officialRoster.ts`'s reader,
   `races.ts`'s `lookupChallengers`, and every test helper are written
   assuming exactly those two chambers.

2. **The delegation route's short-circuit never reaches the resolver.**
   `resolveDelegation` (`src/lib/server/delegation.ts`) only ever builds
   `DelegationSeat[]` shaped as one House + two Senate seats. A delegate seat
   is structurally different — one seat, no House/Senate split, and for
   Puerto Rico a different title ("Resident Commissioner" vs. "Delegate").
   Nothing in `DelegationSeat`, the route, or the resolver models this today.

3. **The geocoder already does the right thing, quietly.**
   `src/lib/server/census-geocode.ts`'s `parseGeocodeResponse` explicitly
   nulls `district` for every state in `NON_VOTING_AREAS` (`district = null`
   when `NON_VOTING_AREAS.has(stateCode)`), and Census's own non-voting
   delegate codes (98/99) already parse to `null` independently. So state
   resolution for these six territories is correct and requires no change —
   only the *route's interpretation* of `district === null` (currently
   "there is no representation to show") needs to become "there is a
   Delegate/Resident Commissioner seat to show" for these six specifically.

## Open product/design questions (Muxin's call, not an engineering default)

- **UI presentation.** `RepCard.tsx` is built around a two-tier House/Senate
  layout (`blindLabel`s like "Your U.S. Representative" /
  "Your Senior U.S. Senator"). A single delegate seat needs its own card
  shape or a graceful one-seat degradation of the existing one — a genuine
  UX call, not a data-plumbing one.
- **Copy.** "Delegate" (AS/DC/GU/MP/VI) vs. "Resident Commissioner" (PR)
  need distinct labels; PR's Resident Commissioner is also on a 4-year, not
  2-year, cycle (already flagged on PR's own backlog card) — 2026 may not
  even be an election year for that seat.
- **Does "no_representation" still exist as a status, or does it become
  "no *voting* representation, but here is your Delegate"?** This is a
  framing/product decision (how do we describe non-voting representation
  honestly and usefully to a territory voter), not just a code branch.
- **Scope of the fix.** This is shared code touching all six territories at
  once (route + resolver + reader + component), not a per-territory change
  — building it once unblocks AS/DC/GU/MP/PR/VI together, rather than
  resolving it ad hoc on whichever territory is picked up first.

## Recommendation

Do not build any of the six non-voting-territory roster cards under the
existing self-vet-auto-merge authorization until this gap is resolved — the
work is materially different in kind (new shared UI/data model + a product
call on presentation), not a data-only slice. A new epic-level backlog card
capturing this decision has been added
(see `docs/operations/voter-choice-backlog.md`, parent `c5a813bb`); each of
the six territory cards has been annotated with a `BLOCKED` note pointing
back here so a parallel session doesn't pick one up assuming the AZ/TX/OK/AL/AK
pattern applies as-is.

## Decision

Muxin, 2026-07-15: **Pause AS; write up the gap as an epic-level decision**
rather than building a data-only slice or forcing the full UI wiring through
under the existing auto-merge authorization. This doc + the new backlog card
are that writeup. No code was written; no card was claimed; `origin/main` is
untouched by this investigation beyond this doc and the backlog annotations.
