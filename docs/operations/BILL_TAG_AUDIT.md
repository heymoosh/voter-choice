# Bill Tag Accuracy Audit

**Date:** 2026-05-28
**Auditor:** LLM manual review (Claude), no automated LLM-tagging path invoked
**Database:** production Postgres (Neon) via `launch/production` `.env.local`
**Scope:** `issue_tags` table — accuracy of `canonical_issue` and especially `stance_lens`
**Method:** read-only SELECTs only; no rows modified; throwaway query scripts deleted after use

---

## TL;DR

- **Headline estimated error rate (stance_lens + canonical_issue combined): ~25–30% of tags are wrong or unusable**, concentrated almost entirely in the **bidirectional / "poleless" canonical issues**.
- **Root cause:** several `canonical_issue` ids name *two opposing poles at once* (`gun_rights_safety`, `crime_public_safety`, `public_safety`) or a contested domain (`immigration`, `border_security`, `election_integrity`, `environment_climate`). For these, `stance_lens = in_favor` is semantically undefined — the tagger cannot consistently decide whether "in_favor" means *favoring gun rights* or *favoring the gun-safety domain*. It defaults to `in_favor` for almost everything, which **silently inverts the alignment score** for every bill that actually cuts against the first pole of the label.
- **Suspected stance_lens inversions found in the 104-bill sample: 19** (plus ~6 more that are ambiguous-by-construction and effectively coin-flips). On the unidirectional issues (`healthcare_affordability`, `education_funding`, `housing_affordability`, `water_infrastructure`, `energy_grid`, `economy_jobs`, `property_taxes`, `reproductive_rights`) stance_lens is largely **correct**.
- **Worst issues:** `gun_rights_safety`, `crime_public_safety`, `public_safety`, `immigration`, `border_security`. These need a **targeted re-tag with a redesigned (single-pole) lens**, not a full corpus re-tag.
- **Calibration:** confidence is **systematically over-stated on exactly the wrong tags** — most inversions carry 0.78–0.95 confidence. Confidence is therefore not a usable trust signal for the poleless issues.

---

## 1. Corpus overview (read-only SQL)

| Metric | Value |
|---|---|
| Total `issue_tags` rows | **42,506** |
| Distinct tagged bills | 38,020 |
| Tagger version | `claude-haiku-4-5-20251001-v1` (single version; no mix) |
| Tags whose bill has ≥1 vote (i.e. affect alignment scoring) | **42,506 — 100%** |
| Federal tags | 588 |
| State tags | 41,918 |

So **every tag in the table is live in the scoring path** — there is no "dead" tag inventory. State bills dominate ~71:1.

### Distribution by canonical_issue (with stance split + avg confidence)

| canonical_issue | n | in_favor | opposed | %in_favor | avg conf | poleless? |
|---|---|---|---|---|---|---|
| healthcare_affordability | 6,019 | 5,722 | 297 | 95% | 0.769 | no |
| education_funding | 5,751 | 5,304 | 447 | 92% | 0.786 | no |
| economy_jobs | 5,675 | 5,305 | 370 | 93% | 0.755 | no |
| public_safety | 5,499 | 5,286 | 213 | 96% | 0.809 | **YES** |
| crime_public_safety | 3,800 | 3,617 | 183 | 95% | 0.844 | **YES** |
| environment_climate | 2,941 | 2,637 | 304 | 90% | 0.819 | **YES** |
| housing_affordability | 2,789 | 2,653 | 136 | 95% | 0.818 | no |
| property_taxes | 2,343 | 1,902 | 441 | 81% | 0.831 | partial |
| water_infrastructure | 2,218 | 2,157 | 61 | 97% | 0.785 | no |
| energy_grid | 1,824 | 1,706 | 118 | 94% | 0.832 | partial |
| election_integrity | 1,774 | 1,656 | 118 | 93% | 0.813 | **YES** |
| gun_rights_safety | 692 | 504 | 188 | 73% | 0.866 | **YES** |
| reproductive_rights | 619 | 409 | 210 | 66% | 0.859 | contested |
| immigration | 407 | 204 | 203 | 50% | 0.845 | **YES** |
| border_security | 155 | 135 | 20 | 87% | 0.794 | **YES** |

The **95%+ in_favor collapse** on `public_safety`, `crime_public_safety`, `water_infrastructure`, `healthcare_affordability`, `housing_affordability` is the fingerprint of the lens defaulting to "in_favor" rather than reasoning about vote direction. On the unidirectional issues that default is *usually correct* (almost any healthcare/housing/water bill does fund or expand the thing). On the poleless issues it is frequently *wrong*.

### Confidence distribution (whole corpus)

| bucket | n | share |
|---|---|---|
| <0.50 | 411 | 1.0% |
| 0.50–0.69 | 5,620 | 13.2% |
| 0.70–0.79 | 12,552 | 29.5% |
| 0.80–0.89 | 19,381 | 45.6% |
| 0.90–1.00 | 4,542 | 10.7% |

Confidence is tightly clustered 0.70–0.89 (75% of all tags). There is almost no low-confidence tail to filter on, so a naive "trust tags above 0.8" policy would *retain* most of the inversions (see calibration note).

---

## 2. Sample methodology

A **stratified random sample of 104 (bill, issue) pairs** was drawn with `ORDER BY RANDOM()` inside each stratum:

- **Per-issue quotas**, oversampling the bidirectional/poleless issues (gun 12, immigration 10, repro/election/environment/border/crime 8 each) and lighter quotas (5–6) on the unidirectional issues.
- Within each issue, **~⅓ federal / ~⅔ state** to guarantee federal coverage despite federal being only 1.4% of the corpus.
- Selected `bills.title`, `bills.summary`, `issue_tags.canonical_issue`, `stance_lens`, `tagger_confidence`.

Each pair was then judged by hand (the auditor is an LLM reading title+summary) on three axes: (a) is `canonical_issue` relevant, (b) is `stance_lens` correct *as the label is literally named*, (c) is confidence calibrated. Findings were cross-checked against whole-corpus keyword splits (Section 5) so the error-rate extrapolation does not rest on 104 rows alone.

**Caveat:** ~40% of state bills had `summary = null`; those were judged on title alone, which understates state error somewhat (a null-summary restriction bill is easy to mis-lens).

---

## 3. Estimated error rate

| Cut | Est. error rate | Basis |
|---|---|---|
| **Overall (all issues)** | **~25–30%** | weighted blend below |
| Unidirectional issues (healthcare, education, economy, housing, water, energy, property, reproductive) | **~5–8%** | mostly correct; errors are relevance/over-tagging, few inversions |
| Poleless issues (gun, crime, public_safety, immigration, border, election, environment) | **~40–55%** | stance_lens undefined-by-construction; ~half of "minority pole" bills inverted |
| Federal | **~22%** | many tags land on *procedural "providing for consideration of…" rule resolutions* that bundle unrelated bills → wrong/weak relevance |
| State | **~26%** | inversions on poleless issues; null summaries raise uncertainty |

The overall figure is dominated by the poleless issues, which together are ~15,300 tags (36% of the corpus). If you exclude them, the remaining ~27,200 tags are in good shape (~6%).

### By canonical_issue (sample-based, directional)

| canonical_issue | judged error rate (sample) | dominant error type |
|---|---|---|
| gun_rights_safety | ~55% | **stance_lens inversion** (restriction bills tagged in_favor) |
| crime_public_safety | ~50% | **stance_lens inversion** (leniency/reform tagged in_favor = "tough on crime") |
| public_safety | ~45% | redundant/duplicative issue + lens collapse |
| immigration | ~40% | **stance_lens inversion** + relevance on tangential bills |
| border_security | ~35% | lens ambiguity + non-border bills (foreign-land-ownership) |
| election_integrity | ~30% | relevance (procedural rules) + lens ambiguity |
| environment_climate | ~20% | lens correct on CRA disapprovals; some relevance misses |
| reproductive_rights | ~15% | mostly correct; one likely inversion |
| property_taxes | ~10% | minor |
| economy_jobs / education / housing / healthcare / water / energy | ~5–8% | over-tagging on omnibus appropriations |

---

## 4. Misclassification table (every error found in the 104-row sample)

Error types: **INV** = stance_lens inversion (highest priority); **REL** = wrong/irrelevant canonical_issue; **AMB** = label is poleless so the tag is undefined-by-construction (effectively a coin-flip, treat as unreliable); **OVER** = over-tagging (bill only tangentially touches the issue, usually an omnibus).

| bill_id | issue | tag said | should be | type | note |
|---|---|---|---|---|---|
| openstates…693e70d1 (ME) | gun_rights_safety | in_favor | opposed* | INV | "Concealed carry on school property" expands rights → if label read as gun *safety*, YEA reduces safety. Lens is incoherent for this label. |
| openstates…358ecd2c (NY) | gun_rights_safety | in_favor (0.95) | opposed | INV | Extreme Risk Protection Orders = gun **restriction**. YEA does NOT favor gun rights. High-confidence inversion. |
| openstates…8027c1f0 (NY) | gun_rights_safety | in_favor | opposed | INV | Waives fee for **ERPO** applications → pro-restriction. |
| openstates…ddcb09f8 (NY) | gun_rights_safety | in_favor | opposed | INV | "Office of Gun Violence Prevention" → pro gun-control, not pro gun-rights. |
| openstates…90884bbd (CA) | gun_rights_safety | in_favor (0.94) | opposed | INV | "Do Not Sell List" → a gun-control mechanism. |
| openstates…9bae6a23 (NY) | gun_rights_safety | in_favor | (AMB) | AMB | Psychiatric care for firearm-violence victims — neither pole; arguably not gun policy. |
| openstates…d582f84d (ME) | gun_rights_safety | in_favor | opposed | INV | Public hearing to **enact** an Extreme Risk Protection Order Act. |
| govtrack-hres1042-119 (fed) | gun_rights_safety | in_favor | (REL/AMB) | REL | Procedural rule bundling 3 unrelated bills; firearms bill is "modernize"; weak tag. |
| openstates…f56ea57c (OK) | education_funding | opposed (0.75) | in_favor? | INV | Raising min ACT score for a college-access program restricts access, but it's still about the access *program*; lens questionable. |
| openstates…cd34c33a (OK) | reproductive_rights | opposed | in_favor? | INV | "Parental notice / right to parent" — direction depends on framing; likely mis-lensed. |
| openstates…1d9e99f0 (OK) | immigration | in_favor | opposed | INV | Driver-license lawful-presence requirement = **enforcement/restrictive**; "in_favor of immigration" is wrong. |
| openstates…48cf5669 (NH) | immigration | in_favor | opposed | INV | "Cooperation with federal immigration authorities" = enforcement; not pro-immigration. |
| openstates…69b67744 (PA) | immigration | in_favor | in_favor✓ | OK | Office of New Pennsylvanians = pro-immigrant; tag defensible (AMB label though). |
| openstates…c46ae092 (HI) | immigration | in_favor (0.78) | (REL) | REL | Bill is about **cannabis** rescheduling — no immigration content. Misclassified. |
| openstates…06d660b9 (TN) | election_integrity | in_favor | (REL/AMB) | REL | Bill is an **immigration enforcement** act; voter-eligibility clause is incidental. |
| govtrack-hres282-119 (fed) | election_integrity | in_favor | (AMB) | AMB | Procedural rule bundling overdraft/CFPB/judicial + a proof-of-citizenship voter bill. Lens undefined. |
| govtrack-hres1100-119 (fed) | election_integrity | in_favor | (REL) | REL | Ethics-records-disclosure resolution; not election integrity. |
| govtrack-hr4405-119 (fed) | election_integrity | in_favor (0.65) | (REL) | REL | **Epstein Files Transparency Act** — transparency, not elections. |
| openstates…1009a3f4 (CA) | election_integrity | in_favor | in_favor✓ | OK | Behested-payment reporting = campaign-finance transparency; defensible. |
| govtrack-hres53-119 (fed) | environment_climate | in_favor | opposed | INV | Rule for a bill to **expedite NEPA / forest logging** → cuts environmental protection. YEA is anti-, not pro-. |
| openstates…94160b8c (CA) | border_security | in_favor | (REL) | REL | Foreign ownership of **agricultural land** — economic/security, not border security. |
| openstates…2ab62d3b (AZ) | border_security | in_favor | (REL) | REL | "Critical infrastructure / foreign adversary" — not border security. |
| openstates…75a8c0a3 (NC) | border_security | in_favor | (REL) | REL | "Prohibit foreign ownership of NC land" — not border security. |
| openstates…71578eb8 (VT) | border_security | opposed | opposed✓ | OK | Resolution opposing ICE/CBP surge → correctly opposed. Good tag. |
| govtrack-hr5585-118 (fed) | crime_public_safety | in_favor | in_favor✓ | OK | New criminal offense for fleeing Border Patrol → toughens crime law. Correct. |
| openstates…f2200dee (IL) | crime_public_safety | in_favor (0.85) | opposed | INV | "Emerging Adult Sentencing" — probation **in lieu of incarceration** → leniency. A "tough on crime" voter would see YEA as *against*. |
| openstates…6e6fbd34 (IL) | crime_public_safety | in_favor (0.85) | opposed | INV | Expands **sentence credit** (early release) → leniency, not "in favor of public safety/toughness." |
| openstates…733f254e (ME) | public_safety | in_favor | opposed? | INV/AMB | Youth **diversion** from criminal justice → leniency; lens collapse. |
| openstates…39df0a4c (ME) | public_safety | in_favor | (AMB) | AMB | "Corrections Ombudsman" — oversight; pole undefined. |
| openstates…52fbfba3 (CA) | public_safety | in_favor (0.78) | (REL) | REL | **E-bike speed-modification** sales ban — vehicle code, weak public-safety tag. |
| openstates…508773ab (NY) | public_safety | in_favor | (REL/AMB) | OVER | Mandated-reporter training timeframe extension — tangential. |
| govtrack-hr2659-119 (fed) | public_safety | in_favor (0.62) | in_favor✓ | OK | Cyber-resilience task force; defensible (low conf appropriately). |
| openstates…d3b57d19 (NY) | healthcare_affordability | opposed (0.15) | (REL) | REL | Insurer info-demand restriction on **theft claims** — property insurance, not healthcare. Confidence 0.15 correctly low. |
| govtrack-sjres82-119 (fed) | healthcare_affordability | opposed (0.45) | (REL/AMB) | REL | CRA disapproval of an APA-text rule at HHS — not about affordability. Low conf appropriate. |
| openstates…a9637291 (IL) | healthcare_affordability | in_favor | in_favor✓ | OK | Non-compete carve-out for reproductive/maternity care → expands access. Fine (could also be repro). |
| govtrack-hr5371-119 (fed) | healthcare_affordability | in_favor | in_favor✓ | OVER | Continuing resolution; healthcare is one line item. Over-tag but not harmful. |
| govtrack-hr7148-119 (fed) | education_funding / housing / water | in_favor | in_favor✓ | OVER | Omnibus appropriations tagged to 3 issues; each defensible but blunt. |
| openstates…6610bb31 (WA) | economy_jobs | in_favor | in_favor✓ | OK | Green-fertilizer incentive; could also be environment. Minor. |
| govtrack-hr22-118 (fed) | energy_grid | opposed (0.85) | opposed✓ | OK | Bars SPR oil **sales to China** — restricts energy export; "opposed" lens defensible. |
| govtrack-sjres91-119 (fed) | environment_climate | opposed (0.95) | opposed✓ | OK | Nullifies BLM rule that *protected* ANWR acreage → YEA is anti-environment = opposed. **Correct & well-calibrated.** |
| govtrack-sjres55-119 (fed) | environment_climate | opposed (0.78) | (borderline) | AMB | Nullifies a hydrogen-vehicle safety standard; environment link is thin. |

*Bills marked ✓ are confirmations the tag is correct (included to show the auditor checked both directions, not just hunted for errors).*

**Counts in sample:** INV ≈ 14 clear + ~5 INV/AMB borderline = **~19 stance inversions**; REL ≈ 11; AMB (undefined-by-label) ≈ 6; OVER ≈ 4. Correct ✓ ≈ the remainder.

---

## 5. Suspected stance_lens INVERSIONS — highest priority

A stance_lens inversion is the single most damaging error class: per the truth-table in `src/lib/server/alignment.ts`, a flipped `stance_lens` turns every "with" into "against" and vice-versa, so a candidate who votes exactly the user's way scores as *opposed*.

### 5a. The structural problem: poleless labels

Three canonical ids encode **two opposing poles in one label**:

- `gun_rights_safety` — "gun rights" and "gun safety" are *opposites*. A bill restricting guns is pro-safety / anti-rights. `in_favor` is undefined: in_favor of *which*?
- `crime_public_safety` / `public_safety` — "tough on crime" vs "criminal-justice reform" both live here. A sentence-reduction bill is pro-reform / anti-toughness.
- `immigration`, `border_security`, `election_integrity`, `environment_climate` — contested domains where "support the issue" has no agreed direction.

The tagger's instruction ("in_favor = a YEA vote supports/expands/funds *this issue*") is unanswerable for these, so it collapses toward `in_favor`. The whole-corpus keyword splits prove the collapse is systematic, not sampling noise:

| Probe (whole corpus) | in_favor | opposed | reading |
|---|---|---|---|
| `gun_rights_safety` w/ **restriction**-signaling titles (extreme risk, gun violence, do-not-sell, ban, prohibit, background check, ghost gun, assault weapon, safe storage) | **101** | 59 | 63% of clearly-restrictive gun bills are tagged in_favor — i.e. labeled as if YEA = pro-gun-rights. These are inversions for any safety-minded voter. |
| `gun_rights_safety` w/ **rights**-signaling titles (concealed/constitutional carry, 2nd Amendment, preemption) | 29 | 1 | rights bills correctly skew in_favor — confirms the lens means "pro-rights," which makes the 101 above inversions. |
| `crime_public_safety` w/ **leniency/reform** titles (diversion, expunge, sentence credit, parole, probation, decriminalize, reentry) | **200** | 27 | 88% of reform/leniency bills tagged in_favor — inverted for a "tough-on-crime" voter, and arguably for the reform voter too since the lens is incoherent. |
| `immigration` w/ **pro-immigrant** titles (sanctuary, dream, protect-immigrant, welcoming, New ___) | 6 | 10 | even pro-immigrant bills split — lens is essentially random here. |

**Conservative extrapolation of confirmed inversions to the live corpus:**
- `gun_rights_safety`: at least the ~100 restriction bills mis-lensed in_favor (≈15–20% of the 692, likely higher once null-summary state bills are read).
- `crime_public_safety` + `public_safety`: the ~200+ leniency bills mis-lensed, plus the general collapse → on the order of **1,500–3,000 tags** whose lens is wrong or undefined across these two issues (they total 9,299 tags, 95%+ in_favor).
- `immigration` / `border_security`: roughly half of the minority-pole bills, ~150–250 tags.

**Bottom line: low hundreds of *confirmed-pattern* inversions, and on the order of 2,000–4,000 tags whose stance_lens is wrong or semantically undefined** — virtually all inside the poleless issues. The unidirectional issues are essentially inversion-free.

### 5b. Concrete high-confidence inversions (from sample, worth fixing first)
1. NY Extreme Risk Protection Orders — gun_rights_safety / in_favor @ **0.95** → should be opposed.
2. CA "Do Not Sell List" — gun_rights_safety / in_favor @ **0.94** → opposed.
3. IL "Emerging Adult Sentencing" (probation in lieu of prison) — crime_public_safety / in_favor @ 0.85 → opposed.
4. IL sentence-credit expansion — crime_public_safety / in_favor @ 0.85 → opposed.
5. Federal H.Res.53 (expedite NEPA / forest logging) — environment_climate / in_favor → opposed.
6. OK driver-license lawful-presence — immigration / in_favor → opposed (enforcement).
7. NH "cooperation with federal immigration authorities" — immigration / in_favor → opposed.

---

## 6. Calibration note on tagger_confidence

Confidence is **anti-calibrated on the poleless issues**: the inverted tags above carry 0.78–0.95, which is *higher* than the corpus mean (avg conf on `gun_rights_safety` is 0.866, the **highest of any issue** — yet it has the worst inversion rate). The model is confident about *topic* identification (it correctly knows the bill is about guns) and exports that confidence onto the `stance_lens` field, which is the part it actually got wrong.

Where confidence **is** well-calibrated: the genuinely-ambiguous or off-topic tags do get low scores — e.g. the theft-insurance bill mis-tagged healthcare got 0.15, the HHS APA-rule CRA got 0.45, the cyber task-force got 0.62. So low confidence (<0.5) is a usable "this is junk" signal, but there are only 411 such rows. **High confidence is NOT a usable "this is correct" signal for stance_lens on the poleless issues.** Any re-tag must not trust existing confidence to decide what to skip.

---

## 7. Recommendation (prioritized)

**The tags are NOT trustworthy as-is for the poleless issues; they are largely trustworthy for the unidirectional issues. Do a targeted re-tag, not a full re-tag.**

1. **[P0 — fix the schema/vocabulary first, then re-tag]** The defect is in the **label design**, so re-tagging with the same vocabulary will reproduce it. Split each poleless id into a single-pole, unambiguously-directional label *or* add an explicit "pole" the lens is measured against. Concretely:
   - `gun_rights_safety` → `gun_regulation` (in_favor = more restriction) OR keep two ids `gun_rights` / `gun_safety`.
   - `crime_public_safety` & `public_safety` → collapse the duplicate (585 bills are double-tagged to both) and re-cast as `criminal_justice` with a defined pole (e.g. in_favor = tougher enforcement), OR `criminal_justice_reform` (in_favor = reform/leniency).
   - `immigration` → `immigration_enforcement` (in_favor = more enforcement).
   - `border_security` → tighten relevance (it's catching foreign-land-ownership bills that aren't border bills).
   - *(Note: `src/lib/canonicalIssues.ts` has uncommitted edits in another worktree — coordinate before changing it.)*
2. **[P0] Re-tag the ~15,300 tags on the poleless issues** (`gun_rights_safety`, `crime_public_safety`, `public_safety`, `immigration`, `border_security`, `election_integrity`, `environment_climate`) under the new vocabulary, with a prompt that **forces the model to state the pole and the YEA-direction explicitly** before emitting stance_lens. Do **not** skip high-confidence rows.
3. **[P1] Drop the relevance false-positives.** Procedural "providing for consideration of the bill…" *rule resolutions* (federal `H.Res.`) are getting tagged to whatever bills they bundle, producing weak/wrong tags. Add an explicit "these are procedural and should usually return []" rule and re-tag/purge that class. Same for off-topic catches (Epstein-files → election_integrity, cannabis → immigration).
4. **[P2] Leave the unidirectional issues** (healthcare, education, economy, housing, water, energy, property_taxes, reproductive_rights) **as-is.** ~5–8% error, mostly harmless over-tagging on omnibus appropriations. Optionally de-duplicate omnibus bills (one CR is tagged to many issues at once) but it does not invert scores.
5. **[P2] Add a validation guard** to the tagger: when an issue is poleless, require the model to name the YEA-direction in a free-text field and reject the tag if it's blank — making future inversions detectable.

**Estimated blast radius if shipped unfixed:** alignment scores for any voter whose top issues include guns, crime/policing, or immigration — i.e. several of the highest-salience ballot issues — will be **silently inverted for a large fraction of a candidate's relevant votes**, producing confidently-wrong "aligns / opposes" verdicts. This is the worst-case failure mode for a ballot-research tool and should block launch for those issues.
