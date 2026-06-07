# Portability Map — how this substrate ports into the 2026 redesign

**Status:** Design / spec. Docs-only. This is the doc Muxin asked for: proof that the
alignment substrate **maps cleanly onto the in-progress redesign** rather than
demanding new front-end work. One-line thesis: **everything here is an
interface-preserving correctness layer *under* surfaces the redesign already
shipped** — it changes the *meaning* and *content* feeding those surfaces, not the
surfaces, the enum, or the tool signatures.

## The shipped surfaces it lands under (design-integration @ `782a0f8`)

- **`AlignmentScoreBanner`** — "voted with your side N of M times" per (candidate,
  canonical-issue). Fed by `lookupAlignment` via a tool call in the chat route
  ([chat/route.ts:1058](../../src/app/api/chat/route.ts)).
- **`AlignmentDrilldown`** — per-vote line items (bill, vote cast, date, source chip)
  + disclaimer. (Also `AllVotesPanel`, `CompareModal`.)
- **`[CONCERN_INTERPRETATION]` gate / `ConcernInterpretation.tsx`** — disambiguation;
  emits `[VOTER CONFIRMED CONCERNS]` carrying `canonicalIssue` + `resolvedStance`.
- **`lookupAlignment(candidateId, canonicalIssue, resolvedStance)`** → reads
  `issue_tags.stance_lens` → `computeVoteAlignment` XNOR.
- **`lookupDonorCoalition` tool / `/api/donors` / donor-coalition pattern** — the
  fundraising surface.
- **Thin-data handling** — `LIMITED_DATA_THRESHOLD = 5`, "based on N votes" label,
  "No voting record yet" empty state.

## Artifact → surface it feeds

| Substrate artifact | Feeds | What changes | What stays |
|---|---|---|---|
| `POLE_VOCABULARY.md` | tagger (`stance_lens`) + resolver (`resolvedStance` + options) → `lookupAlignment` → `AlignmentScoreBanner` / `AlignmentDrilldown` | the *meaning* of `in_favor`/`opposed` per issue | the `in_favor`/`opposed` enum; `canonicalIssue` ids; `computeVoteAlignment` signature |
| `SHARED_ANCHOR_SPEC.md` | tagger prompt + resolver prompt + the disambiguation trigger | both prompts read one shared derivative; trigger keys off `axis_type` not LLM confidence | `[CONCERN_INTERPRETATION]` block shape; `ConcernInterpretation.tsx` |
| `RETAG_PLAN.md` | `issue_tags` rows (the corpus `lookupAlignment` reads) | tag **content** re-derived to a new reversible version; per-issue cutover | the `issue_tags` schema; the tool; the banner |
| `FUNDRAISING_POLE_MAP.md` | `lookupDonorCoalition` / donor-coalition pattern | funder→pole rows surfaced beside the vote score | the donor tool + pattern UI |
| `ALIGNMENT_DATA_MODEL.md` "vote rationale" | `AlignmentDrilldown` line item | a new `rationale` field on `ContributingVote`/`AlignmentResult`, populated (from CAN curated context where present) | the drilldown component itself |

## Key-compatibility check (the thing that could break a port)

The vocabulary is keyed to the **exact 16 canonical issues** at
`design-integration@782a0f8` — so porting is "keys still match," not "rewrite":

`healthcare_affordability · border_security · economy_jobs · education_funding ·
public_safety · crime_public_safety · property_taxes · water_infrastructure ·
energy_grid · reproductive_rights · gun_rights_safety · environment_climate ·
election_integrity · immigration · housing_affordability · congressional_accountability`

**The only changes that would break key-compatibility** (and therefore need
coordination + a `canonicalIssues.ts` edit + a prompt-vocabulary update) are the two
gated decisions in HANDOFF:
- **Axis split** (e.g. `housing_affordability` → a finer `housing_cost`) → adds a key.
- **`election_integrity` → `voting_access` rename** → changes a key.
- **New funder axes** (crypto, Israel) if adopted → add keys.

Absent those, the substrate drops in against the existing 16 with no key churn. The
**axis_type** distinction (contested vs valence) is *new* metadata the redesign
doesn't track yet — but it lives in the shared derivative, not in `canonicalIssues.ts`,
so it adds no key and breaks nothing.

## Untouched vs changed (the clean-port summary)

**Untouched** (so the redesign's shipped work stands): the `in_favor`/`opposed` enum;
`computeVoteAlignment` signature; `lookupAlignment` / `lookupDonorCoalition` tool
signatures; `AlignmentScoreBanner`, `AlignmentDrilldown`, `AllVotesPanel`,
`CompareModal`, `ConcernInterpretation`; the `[CONCERN_INTERPRETATION]` /
`[ALIGNMENT_SCORES]` block shapes; thin-data + empty-state handling.

**Changed** (all backend / prompt / data, redesign-coordinated): `issue_tags`
*content* (re-tag); the tagger prompt; the resolver prompt + the trigger; a new
`rationale` field on the alignment result.

## Port order (when the redesign is ready — gated)

1. Land the structured derivative of `POLE_VOCABULARY.md` (`SHARED_ANCHOR_SPEC.md` §5).
2. Pole-anchor the tagger + resolver prompts; switch the disambiguation trigger to
   `axis_type`. (Coordinated edit in `design-integration`.)
3. Re-tag contested issues to a new version; validate offline; cut over per-issue
   (`RETAG_PLAN.md`).
4. Add + populate the `rationale` field on `AlignmentResult` → `AlignmentDrilldown`.
5. Wire the funder→pole rows into the donor surface (`FUNDRAISING_POLE_MAP.md`).
6. Only if Muxin approves: axis split / `voting_access` rename / new funder axes →
   the `canonicalIssues.ts` + prompt-vocabulary updates.
