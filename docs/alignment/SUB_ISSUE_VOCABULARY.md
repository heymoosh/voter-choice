# Sub-Issue Vocabulary — optional facets beneath the canonical issues

**Status:** Draft for review. This is a data/spec artifact — prose, the
human-readable source of truth that `src/lib/alignment/subIssues.ts` mirrors.

## What this is and why

A **sub-issue** is a TOPIC FACET of an existing canonical issue (see
`docs/alignment/POLE_VOCABULARY.md` for the 16 canonical issues). It is an
**optional hierarchical layer**: where a canonical issue like
`healthcare_affordability` bundles distinct topics (drug prices, coverage,
provider costs, …), a sub-issue names one of those facets so scoring can
**prefer** votes on the facet the voter actually cares about and **fall back**
to the parent when those votes are sparse — a score is therefore never worse
than scoring against the parent alone.

**A sub-issue inherits the parent's pole axis.** It introduces **no new
direction**: `in_favor` / `opposed` keep exactly the meaning the parent issue
pins in the pole vocabulary. A sub-issue only narrows WHICH bills count toward a
concern; it never changes the side.

Both the tagger and the live resolver consume `subIssues.ts` (the tagger via
`renderTaggerSubIssueBlock`, the resolver via `renderResolverSubIssues`), so the
two cannot drift. Editing this prose requires mirroring the change in the module
and bumping `SUB_ISSUE_VOCABULARY_VERSION`; `subIssues.test.ts` fails if the id
set or any parent drifts.

## Pilot scope

Piloted on **`healthcare_affordability`** with the five sub-issues below. Other
canonical issues have no sub-issues yet — the layer is additive and per-parent.

## Entry template

```
### <sub_issue_id>
parent: <canonical_issue_id>
- label: <short label>
- description: <one-line resolver description>
- bill_signals: <topics/provisions that route a bill into this facet>
```

---

# Healthcare sub-issues (parent: healthcare_affordability)

### drug_prices
parent: healthcare_affordability
- label: **Drug & Insulin Prices**
- description: the cost of prescription drugs and insulin, and how government
  negotiates or caps those prices.
- bill_signals: insulin / drug price caps; Medicare Part D drug-price
  negotiation; PBM (pharmacy benefit manager) reform.

### coverage_access
parent: healthcare_affordability
- label: **Insurance Coverage & Access**
- description: specific insurance-coverage mechanisms — marketplace enrollment
  windows, premium subsidies for individuals buying on ACA exchanges, Medicaid
  eligibility for a concrete population, coverage mandates, or protections for
  the uninsured. NOT general ACA overhaul, broad Medicaid restructuring, or
  bills primarily about healthcare spending levels.
- bill_signals:
  - marketplace / exchange enrollment window or SEP (special enrollment period)
  - ACA premium-subsidy cliff / APTC (advance premium tax credit) for individual market
  - Medicaid eligibility expansion to a specific population (e.g. postpartum, childless adults)
  - individual mandate / coverage requirement
  - uninsured-rate reduction / coverage gap
  - short-term / association health plan coverage rules
- explicit exclusions (stay at parent level, NOT coverage_access):
  - broad ACA repeal / replace bills
  - Medicaid block-grant or per-capita cap restructuring
  - general healthcare spending / omnibus healthcare bills

> **Why tightened (v2):** Original signals ("ACA subsidies", "Medicaid expansion
> / block-grant", "ACA repeal") fired on every broad ACA/Medicaid structural
> bill. Gold-panel agreement was only 43% on high-confidence tagger calls —
> because annotators read those broad bills as "general healthcare," not a
> specific coverage facet. Tightened signals require a concrete coverage
> *mechanism* to fire; structural / spending bills now fall back to the parent.
> Facet remains disabled on prod pending a fresh gold gate.

> **Split recommendation:** see section below.

### provider_costs
parent: healthcare_affordability
- label: **Hospital & Provider Costs**
- description: what hospitals and providers charge — surprise bills, price
  transparency, and market consolidation.
- bill_signals: surprise-billing protections; price transparency;
  provider-consolidation / anti-monopoly; site-neutral payment.

### senior_care
parent: healthcare_affordability
- label: **Medicare & Senior Care**
- description: Medicare benefits and care for older adults — Medicare Advantage
  rules and long-term / nursing-home care.
- bill_signals: Medicare benefits; Medicare Advantage rules; long-term /
  nursing-home care; nursing-home staffing.

### mental_behavioral_health
parent: healthcare_affordability
- label: **Mental & Behavioral Health**
- description: access to mental-health and addiction care — parity enforcement,
  treatment funding, and crisis services.
- bill_signals: mental-health parity enforcement; SUD / opioid treatment
  funding; 988 crisis funding; behavioral-health workforce.

---

**5 healthcare sub-issues authored,** all with parent `healthcare_affordability`.

---

## Split recommendation for `coverage_access` (decision needed)

The tightening above is a conservative repair — it makes the existing facet
precise enough to pass a gold gate. But the domain naturally splits into three
distinct voter concerns. A structural split is recommended for a future card
after the next gold gate confirms the tightened version is working.

### Candidate split: `coverage_access` → 3 facets

**`medicaid_chip`** — Medicaid & CHIP coverage
- Who: low-income adults, children, pregnant women, people with disabilities
- Bill signals: Medicaid eligibility rules; Medicaid block-grant / per-capita
  cap; CHIP reauthorization; Medicaid expansion population (childless adults,
  postpartum); unwinding / redetermination of Medicaid enrollment
- Resolver description: Medicaid and CHIP coverage rules — who qualifies,
  how the program is funded, and enrollment continuity.

**`aca_marketplace`** — ACA individual-market / marketplace
- Who: people buying coverage on their own (not employer-sponsored)
- Bill signals: ACA marketplace / exchange; APTC / premium subsidies for
  individual market; open enrollment / SEP rules; ACA marketplace plan
  requirements (essential health benefits, no preexisting-condition exclusions)
- Resolver description: ACA marketplace rules — premium subsidies, enrollment
  windows, and plan requirements for people buying individual coverage.

**`coverage_gap_uninsured`** — the uninsured / coverage gap
- Who: people who fall between Medicaid and marketplace eligibility (coverage
  gap) or are uninsured for other reasons
- Bill signals: coverage gap states / Medicaid non-expansion gap; uninsured-rate
  reduction; individual mandate / penalty for lacking coverage; short-term /
  association health plans as gap-filler; state reinsurance programs
- Resolver description: people who lack coverage or fall through eligibility
  gaps — the uninsured, coverage-gap states, and mandates.

### Tradeoffs: tighten vs. split

| Dimension | Tighten only (this PR) | Full split |
|---|---|---|
| Gold-gate cost | 1 panel on tightened `coverage_access` | 3 panels (one per new facet) |
| Data disruption | None — facet id unchanged | Enum change; existing NULL rows stay NULL; new re-tag needed |
| Scoring precision | Moderate — single facet for 3 distinct concerns | High — voter concerns map cleanly to one facet |
| Voter UX | Fine for most users | Enables "I care about Medicaid specifically" vs. "ACA marketplace" |
| Recommended order | Ship tightening now, re-tag, run gold gate | Decide split AFTER gold gate confirms tightened version works |

**Recommendation:** Implement the tightening now. Enabling the facet is gated
only on a *quality* check — the gold gate confirms the tags are accurate (i.e.
not mislabeling general-healthcare bills as coverage). That is about
**correctness, not volume.** Decide the split on whether Medicaid /
ACA-marketplace / the-uninsured read as genuinely distinct voter concerns worth
separate labels — a qualitative call, **not a data-volume gate.** The split is a
medium-sized card (enum change + 3 gold panels + re-tag).

**Data-visibility principle (do NOT violate):** a thin record is still signal.
Always surface the contributing votes that exist, **with the count shown**, and
let the voter judge — never suppress an issue's record below a vote-count
threshold. A split only changes which bucket a vote lands in; it must never hide
votes. If a (sub-)facet is thin, show it thin, with the count.
