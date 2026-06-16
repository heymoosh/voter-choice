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
- description: who can get health insurance and at what cost — ACA subsidies,
  Medicaid, and coverage rules.
- bill_signals: ACA subsidies; Medicaid expansion / block-grant; ACA repeal;
  HSAs (health savings accounts).

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
