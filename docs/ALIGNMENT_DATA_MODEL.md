# Alignment Data Model — Concern → Value → Position → Vote

**Status:** Design / north-star. No source files edited. This is the conceptual layer that motivates the schema work; it answers one question: *what data and tagging do we need so that a Yea/Nay on a bill can be honestly judged against what a real person, speaking in everyday language, actually values?*

**Companion docs (this doc sits above both):**
- `docs/ISSUE_DIRECTIONALITY_DESIGN.md` — the schema-level fix ("pole as data"), with the full proof of how poleless labels silently invert alignment. **Read it for the mechanism; this doc does not re-derive it.**
- `docs/operations/BILL_TAG_AUDIT.md` — the empirical evidence: ~25–30% tag error overall, ~40–55% on poleless issues, ~2–4k likely-inverted `stance_lens` values, anti-calibrated confidence.
- `docs/alignment/POLE_VOCABULARY.md` — **the keystone, now authored**: all 16 canonical issues with their two poles defined and bound to the `in_favor`/`opposed` enum, critic-validated. This doc is the *why*; that file is the *what*.

**Where this sits relative to the redesign's alignment engine.** The canonical
product/delivery spec is `voter-choice-alignment-engine-v2.md` (in the
`design-integration` worktree — **read-only**); it owns the shipped UI
(`AlignmentScoreBanner`, `AlignmentDrilldown`, the `[CONCERN_INTERPRETATION]` gate,
the donor tool). **This doc is the correctness layer *beneath* that brief.** The
brief assumes "`canonicalIssue` + a binary stance" is enough to score a vote; the
audit shows that assumption **silently inverts on contested axes**. The pole
vocabulary is the fix, and it is **interface-preserving** — it changes the *meaning*
of `stance_lens` / `resolvedStance`, not the enum, the tool signatures, or any
component. Vocabulary map: the brief's **`resolvedStance` ≡ our pole**; the brief's
**"stance disambiguation" / `[CONCERN_INTERPRETATION]` gate ≡ §6.2** (the data-driven
trigger lives in `docs/alignment/SHARED_ANCHOR_SPEC.md`).

---

## 1. The product reality this model must serve

The user never names a policy. The chat opens with *"what are you worried about?"* and people answer in kitchen-table language:

> "Rent keeps going up." · "I can't afford groceries." · "My mom's insulin costs are insane." · "I don't feel safe walking home."

From that, the system must infer **what they value**, **which side they're on**, and then decide whether a candidate's recorded vote *advances or undercuts that*. The current model can't do this reliably — see the audit. The reason is a category error: **we tag topics, but alignment is about positions.**

**What "honestly judged" means here — and what it does *not*.** We are not adjudicating each vote in isolation or trying to catch every gotcha. The product question is a *tendency*: **in the majority of the moments where this representative could have advanced what you value, did they?** That framing is deliberate — it is robust to the occasional mis-scored vote (a poison-pill omnibus, a procedural maneuver) in a way a per-vote verdict never could be. We give the user enough signal to judge a *pattern*, not a perfect ledger, and we trust them to make the nuanced call. Two signals feed that judgment and **each stands on its own**: (1) the **voting record** — did their Yea/Nay advance your pole (§2–§6); and (2) the **fundraising record** — who funded them (§7), which is telling regardless of any single vote.

---

## 2. The reframe: tag *positions*, not *topics*

A topic (`healthcare`, `gun_rights_safety`) has no direction. "In favor of healthcare" is not a stance, and "in favor of gun_rights_safety" is undefined — which is precisely why the tagger collapsed to `in_favor` and inverted thousands of scores (`ISSUE_DIRECTIONALITY_DESIGN.md` §1.4).

The atomic unit must be a **position = (axis, pole)**:

- An **axis** is a defined policy spectrum (e.g. *prescription-drug pricing*).
- Each axis has exactly **two named, defined poles** (e.g. `lower` = "government should cap/negotiate prices to reduce costs" ↔ `market` = "prices should be set by the market / protect pharma innovation").

A voter's concern resolves to a pole. A bill is tagged with the pole a **Yea** vote advances. Alignment is: *does the candidate's vote advance the voter's pole?* Because both sides now reference the **same defined pole**, the XNOR in `computeVoteAlignment` (`alignment.ts`) can no longer silently invert. This also dissolves the old "split vs. document poles" fork: **every** issue becomes an axis with two defined poles. What differs between issues is the *axis type* (§4).

---

## 3. The pipeline

```
free-text concern
   │  (runtime LLM, concern-resolver)
   ▼
VALUE / OUTCOME the person wants        e.g. "I want my insulin to cost less"
   │  (resolve against the axis vocabulary in §5)
   ▼
POSITION = (axis, pole)                 e.g. (drug_pricing, lower)
   │  (join to bills tagged with the pole a Yea advances)
   ▼
VOTE ALIGNMENT                          candidate voted Yea on a $35 insulin cap
   │                                    → that bill's Yea advances drug_pricing.lower
   ▼                                    → matches the voter's pole → "with"
ALIGNMENT RESULT (+ rationale shown)    "You said insulin costs; this bill caps
                                         insulin at $35; they voted Yea → aligned."
```

The **vote rationale** (last line) is not decoration — it is the safety mechanism for §6: the user must see *why* their words were mapped to that bill and be able to reject the inference. *(Renamed from "the bridge" to avoid collision with the redesign's Polis **bridge statements** — an unrelated cross-cluster-consensus view. In the shipped UI this rationale is the `AlignmentDrilldown` line item.)*

---

## 4. Two kinds of axes — and the dangerous one is invisible today

| Axis type | What it means | Examples | What a value alone tells us |
|---|---|---|---|
| **Contested** | Both poles have genuine political constituencies; the disagreement is over the *goal itself* | guns (access ↔ regulation), crime (enforcement ↔ reform), immigration (restrict ↔ welcome), abortion (restrict ↔ protect) | **Nothing.** "I care about guns" is useless. You MUST know the pole. |
| **Valence-dominant** | Almost everyone wants the same *outcome*; the disagreement is over *means* | drug pricing, rent/housing cost, grocery/inflation, school quality, neighborhood safety, jobs | The **outcome**, but NOT the **means**. Two opposing bills both claim to serve it. |

This distinction is the heart of the problem and it is **not represented anywhere in the current schema.**

- **Contested axes** are where the audit found the silent inversions (`gun_rights_safety`, `crime_public_safety`, `immigration`, `border_security`). These cannot ship until re-tagged against defined poles.
- **Valence-dominant axes** were the *healthy* ~5–8% rows in the audit (`healthcare_affordability`, `housing_affordability`, etc.) — because the label already named the near-universal direction. But they hide a subtler trap (§6).

Every concern in §1 — rent, groceries, insulin, safety — is **valence-dominant**. The user's examples are not random; they are the everyday-language entry points to valence-dominant axes, which is exactly where the value→means gap lives.

---

## 5. The data we need

Three artifacts, one shared source of truth. (1) extends the `issue_poles` proposal in `ISSUE_DIRECTIONALITY_DESIGN.md` §3; the new parts are `axis_type` and the concern anchors. **(1) is now authored in full in `docs/alignment/POLE_VOCABULARY.md`** — keyed to the existing 16 canonical issues (NOT new axis ids; each issue's two poles bind to the current `in_favor`/`opposed` enum), 12 contested / 4 valence-dominant, critic-validated. Splitting any issue into a finer axis (e.g. `housing_cost`) is deferred to the granularity decision (§9.1).

### 5.1 Policy-axis vocabulary (the shared target)
Per axis:
- `id`, `label`
- `axis_type`: `"contested" | "valence_dominant"` — **drives the resolution strategy in §6**
- `poleA` / `poleB`, each: `{ id, label, definition, bill_signals }` — plain-language definition + the kinds of bill provisions that indicate this pole
- For `valence_dominant` axes, one pole is the **consensus outcome** (e.g. `lower` cost); the other is the contested-means/counter pole
- `example_concerns`: everyday phrasings mapped to a pole — *"my mom's insulin costs" → drug_pricing.lower*, *"rent is too high" → housing_cost.lower (value-only; means unresolved)*

These anchors are consumed by **both** the bill-tagger and the runtime concern-resolver, so the two can't drift (the drift is what causes inversion — see directionality doc §1.2).

### 5.2 Bill → position tags
Per bill: `(axis, pole_a_yea_advances, confidence)`, anchored to the pole *definitions* above — the tagger answers a concrete question ("does a Yea advance `lower` or `market`?") instead of an undefined "in_favor." Supersedes the meaning of `issue_tags.stance_lens`; migration in directionality doc §6.

### 5.3 Concern-resolution anchors
The example_concerns in 5.1 double as few-shot anchors for the runtime resolver. The resolver's job: free-text → one or more `(axis, pole)` — or, when it can only reach the *value* on a contested/ambiguous axis, escalate per §6.

---

## 6. The values ↔ means gap (the crux — do not skip)

Everyday concerns express **outcomes people want**; bills enact **contested means**. "Rent is too high" gives us the *value*, not the *position*: rent control and zoning-deregulation are **opposing** bills that both claim to lower rent. If we silently pick a means and score against it, we are guessing — the same failure as poleless labels, one layer up. Deliberate policy, keyed off `axis_type`:

1. **Valence-dominant axis → match the outcome, SHOW THE RATIONALE.** Score against the consensus pole (`lower` cost), but render the reasoning chain (§3) so the user sees "your words → this bill → this vote" and can reject it. Transparency is the safety valve; we never claim to know their policy philosophy, only that *this bill moves the outcome they named, and the candidate voted X.*
2. **Contested axis → clarify the side, briefly.** A value-only concern on a contested axis triggers a short disambiguation ("more toward tenant protections, or building more housing to bring prices down?") that turns the value into a pole *before* scoring. Keep it to one or two turns — enough to establish which side the voter is on, never a slide into policy debate or research. The goal is to know where the voter stands, not to make them a policy expert. (The UI already has a disambiguation step — `ConcernInterpretation.tsx`; this gives it a principled trigger.)
3. **Still unresolved → abstain honestly.** Return "we can't score this fairly" rather than a guess. The audit proves guessing yields confident inversions; a blank is better than a wrong arrow.

A bill may also carry **both** a claimed outcome and a means, so a vote against price caps ("protects innovation") can be shown truthfully against a "cheaper insulin" concern: *the candidate voted against this particular mechanism* — with the vote rationale visible — rather than a bare "against."

**Vote *meaning* comes from curated context where we have it — never from a "cleanliness" heuristic.** A summary-only tag cannot tell a clean single-issue vote from a poison-pill omnibus, and any heuristic that tried to (scoring "bill cleanliness") would just smuggle back the "understand every bill in full" problem this model exists to avoid. Instead, where a vote is covered by **curated context** — CAN's per-vote narratives and procedural notes (`CAN2026_ENRICHMENT_SCHEMA.md`) — we use that prose to explain what the vote *actually* meant and surface it in the vote rationale. Where we have none, the **tendency** read (§1) absorbs the noise: a single ambiguous omnibus vote does not move a majority pattern, and when even the pattern is too thin, we abstain (§6.3). Precise human-curated overlay where it exists (the federal races CAN covers); honest tendency everywhere else — and never a pretense that we parse every bill. **CAN is federal-only (~170 candidates), so this overlay matches the federal launch scope; it is not a corpus-wide mechanism.**

---

## 7. Fundraising: a first-class, standalone signal

Who funds a campaign is alignment evidence **on its own** — it needs no bill-reading at all, and it is often the clearest signal we have. A representative who takes heavily from an industry's PACs has revealed a preference the voting record may only partly show. So fundraising is not a tiebreaker or a footnote to the vote score; it is a **parallel signal surfaced beside the vote record**, and the user weighs both.

- **Source data.** `donor_aggregates` (existing) gives bucketed totals per candidate/cycle; CAN's donor trails and issue-PAC contributions (`CAN2026_ENRICHMENT_SCHEMA.md`) add curated, sourced detail — including *negative* assertions ("took no money from X") where CAN confirms them.
- **How it maps to positions.** PAC agendas resolve onto the **same axes/poles** as votes (§2): Fairshake → `crypto_regulation.deregulate`; AIPAC → an Israel-policy pole. So "is this funder fighting for the voter's pole?" reuses the identical machinery as "did this vote advance the voter's pole?" — see directionality doc §5.
- **What we claim, and don't.** We show *who gave how much, from what sector, with the citation* — and let the user judge. We do **not** assert the money *caused* a vote. Like the vote read, this is a tendency/transparency signal, not a proof of corruption.
- **Standalone value.** Even for a candidate with **no usable voting record** (challengers, first-time candidates — exactly the case the alignment endpoint returns `found:false` for today), fundraising may still let us say something honest about whose agenda backs them.

---

## 8. What changes downstream

- **`computeVoteAlignment`** keeps its signature but both inputs are now **pole-anchored**, so the XNOR is sound (directionality doc §3/§5).
- **Alignment result** gains a **vote rationale** per contributing vote (the concern→bill mapping), surfaced in the UI as the `AlignmentDrilldown` line item. This is a new field on `ContributingVote`/`AlignmentResult` in `alignment.ts`. Where CAN curated context covers the vote, the rationale is populated from that prose (§6, "vote *meaning*") instead of a generic summary.
- **Re-tag scope (from the audit):** contested axes (`gun_rights_safety`, `crime_public_safety`, `public_safety`, `immigration`, `border_security`, and review `election_integrity`, `reproductive_rights`, `environment_climate`) must be re-tagged against defined poles — high-confidence rows included (confidence is anti-calibrated). Valence-dominant axes are largely fine; spot-fix the procedural false-positives and the 585 `public_safety`/`crime_public_safety` double-tags the audit flagged.
- **PAC agendas & fundraising** are now a first-class *parallel* signal — see §7. They map onto the *same* axes/poles, so the scoring machinery is reused wholesale; integration detail in directionality doc §5 and `CAN2026_ENRICHMENT_SCHEMA.md` §3.7.

---

## 9. Open decisions for the user

1. **Axis granularity** — how finely to split valence-dominant "affordability" concerns (one `cost_of_living` axis vs. separate `drug_pricing` / `housing_cost` / `grocery_inflation`). Finer = better rationales, more tagging.
2. **Clarifying-question budget** — *resolved:* one or two turns to establish the voter's side is acceptable; the only hard rule is no slide into policy debate/research (§6.2). Remaining sub-question: trigger on every contested value-only concern, or only when the side would change the answer materially?
3. **Abstain threshold** — when to show "can't score this fairly" (§6.3) vs. a low-confidence score with a caveat. The audit's `LIMITED_DATA_THRESHOLD` (`alignment.ts`, currently 5) is the natural place to extend.
4. **Re-tag sequencing** — re-tag contested axes first (launch-blocking), valence-dominant later; or all at once after the axis vocabulary lands.
5. **Surfaced by the pole-vocabulary critic pass** (consolidated in `docs/alignment/HANDOFF.md`): the exact disambiguation-question *phrasing* per contested axis (voice/editorial); whether to **merge `public_safety` and `crime_public_safety`** (near-duplicate enforcement↔reform axes); and whether to **rename `election_integrity` → `voting_access`** (the label fights its own orientation). The same pass reclassified `economy_jobs`, `education_funding`, `property_taxes` from valence to contested (already applied) — so **12 of 16 issues are contested**, making the disambiguation gate the central UX.

All implementation that touches `src/lib/canonicalIssues.ts`, the tagger prompts, or the stance-resolver must coordinate with the active 2026 redesign, which holds uncommitted edits to `canonicalIssues.ts`.
