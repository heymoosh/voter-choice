# Fundraising → Pole Mapping Framework

**Status:** Design / starter framework. Docs-only (envelope). Realizes §7 of
`ALIGNMENT_DATA_MODEL.md`: fundraising is a **standalone, parallel** alignment signal
that reuses the **same poles** as votes (`POLE_VOCABULARY.md`). This file says how a
funder's agenda maps to `(canonical_issue, pole)` so "is this funder fighting for the
voter's pole?" runs on the identical machinery as the vote read.

## Principle

- **Standalone, not a tiebreaker.** Surfaced *beside* the vote record (the shipped
  `lookupDonorCoalition` tool / donor-coalition pattern), weighed by the user. It is
  often the clearest signal — and the **only** one for challengers with no voting
  record (exactly the `found:false` case the vote endpoint returns today).
- **Reuses the pole vocabulary.** A funder's agenda resolves to the same
  `(canonical_issue, pole)` a bill's `stance_lens` does, so a voter resolved to a pole
  is matched against funders the same way as against votes. Same orientation
  discipline; same drift guard (binds to `POLE_VOCABULARY.md`).
- **What we claim / don't.** We show *who gave how much, from what sector, with the
  citation* — and let the user judge. We do **not** assert the money caused a vote.
  Tendency / transparency, never a proof of corruption.

## Source data

- **`donor_aggregates`** (existing) — bucketed sector totals per candidate/cycle. The
  bulk signal; maps at the **sector** grain (§ table below).
- **CAN donor trails + issue-PAC contributions** (`CAN2026_ENRICHMENT_SCHEMA.md`) —
  curated, **sourced** named-PAC detail, including **negative assertions** ("took no
  money from X") where CAN confirms them. The sharp, federal-only signal.
- Each mapping row carries a **confidence** and a **source citation** (FEC committee
  id / CAN trail), so the surfaced claim is always attributable.

## Mapping model

A funder (sector bucket OR named PAC) → `{ canonical_issue, pole, confidence, source }`.
Two tiers:

1. **Sector buckets → existing poles** — the donor_aggregates sectors map to the
   pole their industry's agenda advances. Bulk coverage, lower confidence (a sector is
   coarser than a PAC).
2. **Named issue-PACs → poles** — CAN's curated trails; high confidence, sourced.

A funder may map to **multiple** `(issue, pole)` rows. Negative assertions map the
same way with an inverted reading ("no fossil-PAC money" weakly signals *not* energy
Pole A).

## Seed table (starter — NOT exhaustive)

| Funder / sector | → (issue, pole) | Notes |
|---|---|---|
| Oil & gas / fossil energy PACs | energy_grid · **in_favor** (fossil prod.) | API, major producers |
| Clean-energy / enviro PACs (LCV) | environment_climate · **in_favor** / energy_grid · **opposed** | maps to both overlapping issues |
| Pharma / PhRMA | healthcare_affordability · **opposed** (market/limit gov) | drug-pricing posture |
| Teachers unions (NEA, AFT) | education_funding · **in_favor** (public schools) | |
| School-choice / charter PACs | education_funding · **opposed** (choice) | |
| NRA / gun-rights PACs | gun_rights_safety · **in_favor** (access) | Everytown/Giffords → **opposed** |
| Planned Parenthood / NARAL | reproductive_rights · **in_favor** (access) | SBA Pro-Life → **opposed** |
| Police unions / FOP | public_safety · **in_favor** (policing) | reform/ACLU PACs → **opposed** |
| Bail / private-prison industry | crime_public_safety · **in_favor** (enforcement) | |
| Labor (AFL-CIO, SEIU) | economy_jobs · **in_favor** (public invest./labor) | Club for Growth / Chamber → **opposed** |
| Pro-enforcement immigration PACs | border_security · **in_favor** / immigration · **opposed** | |
| Real estate / developers | housing_affordability · *ambiguous* | build-more (A) vs anti-regulation (B) — judge by the PAC's actual posture, not "real estate" alone |

## The new-axis gap (a decision for Muxin — HANDOFF)

Some of the most *telling* funders push agendas that are **not among the 16 canonical
issues**, so they have no pole to map to today:

- **Fairshake** (crypto super PAC) → a crypto / financial-deregulation axis — **not
  canonical**.
- **AIPAC** (+ affiliated) → an Israel-policy axis — **not canonical**.

Options (granularity decision, same family as §9.1): (a) add new canonical issues for
these high-salience funder axes; (b) keep them **out of pole-matching** but still show
them **standalone** (sector + amount + citation), since "who funds them" is
informative even without a pole. **Recommended interim: (b)** — show standalone, flag
the candidate new axes in HANDOFF. Never invent a forced pole match.

## Rendering & reuse

- Surfaced beside the vote score; for a pole-matched funder, "this funder backs your
  pole / the opposing pole, $X, [source]." For unmatched funders, "top sectors: …,
  [source]" with no pole claim.
- **Standalone for challengers:** even with zero votes, the funder profile can say
  something honest about whose agenda backs them.
- Binds to `POLE_VOCABULARY.md` (same orientation per issue) — so a funder mapped to
  `energy_grid · in_favor` means the *same* fossil-production pole a bill's
  `stance_lens` would. No separate directionality.

## Out of scope / gated

- Building the full funder→pole table at scale (every sector + every significant PAC)
  is real work and a fresh error surface — do it with the same offline-validation
  discipline as the re-tag (`RETAG_PLAN.md`), and source every row.
- No production donor-DB read here; the seed table is hand-authored from public
  knowledge. Live mapping data comes later, gated.
