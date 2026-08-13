# Pole Vocabulary — the shared directionality anchor

**Status:** Draft for review (overnight build). This is the **keystone** the rest
of the alignment correctness work hangs on. It is a data/spec artifact — prose,
not a live `src/` module — so it ports without build coupling.

## What this is and why

The alignment score asks: *did this candidate's Yea/Nay advance the side the
voter is on?* That comparison happens in `computeVoteAlignment` (an XNOR) between
two values, both stored as the enum `in_favor | opposed`:

- the **bill's** `stance_lens` — set by the tagger,
- the **voter's** `resolvedStance` — set by the runtime concern-resolver.

Both are measured against a **canonical issue**. The bug (audited at ~40–55%
error on contested issues): a bare topic like `gun_rights_safety` has **no fixed
direction**, so the tagger and the resolver can each silently read it a different
way ("expand the *rights*?" vs "expand the *safety regulation*?"), and the XNOR
inverts with high confidence.

**This file removes the ambiguity by fixing, per issue, exactly what `in_favor`
and `opposed` mean** — as two named, defined poles with concrete bill signals.
Both the tagger and the resolver consume *this same file*, so they cannot drift.
It is **interface-preserving**: the enum stays `in_favor | opposed`, the tool
signatures and UI stay untouched. Only the *meaning* becomes pinned and shared.

## The convention every entry binds to

From the tagger (`scripts/ingest/_classify-batch.ts`): `stance_lens` = *what
voting **YEA** on the bill MEANS for the issue.*

- **`in_favor`** = a YEA **supports / expands / funds** the issue (→ **Pole A**).
- **`opposed`** = a YEA **restricts / cuts / opposes** the issue (→ **Pole B**).

So for every issue we name **Pole A ≡ `in_favor`** and **Pole B ≡ `opposed`**,
then define both concretely. For *contested* issues the A/B orientation is a
**deliberate, documented choice** (real-world constituencies exist on both
sides); pick the orientation where Pole A = "expand/strengthen the issue's
nominal subject," state it loudly, and apply it to both tagger and resolver.

## Axis types

- **`contested`** — both poles have genuine political constituencies; a value
  alone tells you *nothing* about side ("I care about guns"). The resolver
  **must** disambiguate to a pole before scoring (see each entry's question).
- **`valence_dominant`** — almost everyone wants the same *outcome*; the fight
  is over *means* ("I can't afford insulin"). The resolver matches the consensus
  outcome (Pole A) and **shows the rationale** so the user can reject it; no
  mandatory question, but an explicit anti-government/anti-mechanism concern
  resolves to Pole B.

## Cross-cutting tagger rules (apply to every entry)

- **Fall-through = no-score.** A bill matching neither pole (procedural,
  administrative, out-of-scope) must NOT default to a pole — return no-score. Never
  let an untaggable bill resolve to `in_favor`.
- **Omnibus / bundled bills → dominant provision, else curated context + tendency.**
  When one bill advances BOTH poles, tag by the dominant provision; if genuinely
  co-equal, no-score and defer the vote's *meaning* to curated context (CAN) where it
  exists. The tendency (majority-pattern) read absorbs the residual. Applies to EVERY
  entry, not only the ones that spell it out.
- **Per-(bill, issue) tagging.** `stance_lens` is stored per `(bill, issue)` pair
  (verified in `alignment.ts`), so the same bill can carry opposite orientations under
  two overlapping issues (border-wall funding = `opposed` under immigration,
  `in_favor` under border_security) — both correct. The resolver's issue-routing is
  therefore correctness-critical: **never XNOR a stance resolved under one issue
  against a bill lens tagged under another.**

## Entry template

```
### <canonical_issue_id> — <Label>
- axis_type: contested | valence_dominant
- Pole A  ≡ in_favor   — name: <short name>
    means: <plain-language definition>
    bill_signals: <provisions whose YEA advances Pole A>
- Pole B  ≡ opposed    — name: <short name>
    means: <plain-language definition>
    bill_signals: <provisions whose YEA advances Pole B>
- example_concerns:
    "<kitchen-table phrasing>" → in_favor | opposed   [value-only? note it]
- disambiguation (contested only — neutral, no-labeled-guess):
    question: "<question that does not hint at a 'right' answer>"
    A → in_favor: "<button label>"
    B → opposed:  "<button label>"
- notes: <orientation rationale; means-traps; cross-issue overlaps; omnibus risk>
```

---

# Exemplar entries (quality bar for the remaining issues)

### gun_rights_safety — Gun Rights & Safety
- axis_type: **contested**
- Pole A ≡ in_favor — name: **Gun access / rights**
    means: protect or expand the right to own and carry firearms; remove or block
    restrictions.
    bill_signals: national concealed-carry reciprocity; repealing waiting periods;
    blocking new bans; protecting private/unlicensed sales; suppressor deregulation
    (e.g. "Hearing Protection Act"); arming teachers / school staff; guns-in-schools
    or campus-carry expansion.
- Pole B ≡ opposed — name: **Gun regulation / safety**
    means: tighten access to reduce gun violence.
    bill_signals: universal background checks; assault-weapon or high-capacity
    magazine bans; red-flag / ERPO laws; waiting periods; raising the purchase age.
- example_concerns:
    "protect my Second Amendment rights" → in_favor
    "I'm scared of school shootings" / "fewer guns on the street" → opposed
    "I care about guns" → **value-only → must disambiguate**
- disambiguation:
    question: "On guns, are you more focused on protecting access to firearms, or
    on tightening gun laws?"
    A → in_favor: "Protect access"
    B → opposed:  "Tighten gun laws"
- notes: Orientation chosen as **rights = in_favor** (Pole A = "expand the nominal
  subject, firearms"). This is the fixed convention; tagger and resolver must both
  use it. Omnibus crime bills often bundle gun provisions — defer vote *meaning*
  to curated context (CAN) where it exists; the tendency read absorbs the rest.

### healthcare_affordability — Healthcare Affordability
- axis_type: **valence_dominant**  (everyone wants affordable care; fight is means)
- Pole A ≡ in_favor — name: **Expand coverage & cap costs (government action)**
    means: government expands coverage, caps prices, funds subsidies.
    bill_signals: insulin / drug price caps; Medicare drug-price negotiation; ACA
    subsidy expansion; Medicaid expansion; surprise-billing protections.
- Pole B ≡ opposed — name: **Market-based / limit government role**
    means: reduce government mandates and spending; rely on market competition.
    bill_signals: ACA repeal; block-granting Medicaid; HSA expansion; repealing the
    IRA drug-negotiation provisions; association health plans.
- example_concerns:
    "my mom's insulin costs are insane" → in_favor  [value-only on means; consensus
       outcome = lower cost → Pole A, **show the rationale**]
    "I can't afford my premiums" → in_favor  [outcome]
    "government shouldn't run healthcare" / "fewer mandates" → opposed
- notes: **Means-trap** — a Nay on a specific mechanism ("voted against price caps
  to protect innovation") must surface as *"voted against this particular
  mechanism,"* with the rationale visible, never a bare "against." Valence-dominant
  ⇒ no forced question; but an explicitly anti-government concern resolves to Pole B.
  **Tiebreak:** tag by *primary operative mechanism* — a bill whose core act is a tax
  *cut/repeal that reduces the government's fiscal role* (medical-device-tax repeal,
  mandate-penalty repeal, HSA expansion) is **opposed** even when marketed as cost
  relief. (This does NOT capture refundable subsidies like ACA premium credits, which
  expand the government role → in_favor.)

### housing_affordability — Housing Affordability   ← the means-trap exemplar
- axis_type: **valence_dominant**  (consensus outcome = lower housing cost)
- Pole A ≡ in_favor — name: **Expand affordability / supply / tenant support**
    means: actions that aim to lower housing cost or expand access.
    bill_signals: housing subsidies / vouchers; affordable-housing funding;
    zoning/permitting reform to build more; first-time buyer support; tenant
    protections.
- Pole B ≡ opposed — name: **Cut housing programs / reduce government role**
    means: reduce housing subsidies or federal housing involvement.
    bill_signals: cutting HUD / voucher funding; repealing affordability mandates.
- example_concerns:
    "rent keeps going up" → in_favor  [value-only; outcome = lower cost → Pole A,
       **show the rationale**]
    "I'll never afford a house" → in_favor
- notes: **This is the hardest case and a flagged decision for Muxin (granularity).**
  Within Pole A, two *opposing means* both claim to lower rent — **tenant
  protections / rent control** vs **build-more / deregulate zoning**. The binary
  Pole A/B captures the *outcome* (lower cost) but not this means split. Options:
  (1) keep it valence_dominant and rely on the visible rationale to let the user
  reject a means they dislike (current model, §6.1); or (2) split a finer
  `housing_cost` contested sub-axis with its own question ("more toward tenant
  protections, or building more housing to bring prices down?"). Splitting *would*
  ripple into `canonicalIssues.ts` + the prompt — hence a Muxin call, not an
  autonomous one. **Recommended interim: keep valence_dominant + rationale; surface
  the granularity choice in HANDOFF.** **Mixed-bill tiebreak:** a bill with BOTH a
  Pole-A signal (supply/tenant/subsidy) AND a Pole-B signal (cut HUD/voucher funding) →
  the funding cut dominates → **opposed**; zoning/permitting preemption alone (no
  funding cut) stays **in_favor**. Tag rent control by *nominal intent* (lower cost →
  in_favor), never by disputed economic effect.

### immigration — Immigration
- axis_type: **contested**
- Pole A ≡ in_favor — name: **Welcoming / expand legal immigration & protections**
    means: expand legal pathways and protections for immigrants.
    bill_signals: path to citizenship; DACA / TPS codification; raising refugee or
    visa caps; in-state tuition; protections against removal.
- Pole B ≡ opposed — name: **Restrictive / enforcement-first**
    means: reduce immigration and increase enforcement / removal.
    bill_signals: border-wall funding; mandatory E-Verify; asylum limits; increased
    ICE / detention funding; Remain-in-Mexico-style policies; lowering refugee/visa
    caps; cutting family or diversity visa categories.
- example_concerns:
    "protect the dreamers" / "immigrants strengthen our community" → in_favor
    "secure the border" / "too many people coming illegally" → opposed
    "I care about immigration" → **value-only → must disambiguate**
- disambiguation:
    question: "On immigration, are you more focused on expanding legal pathways and
    protections, or on tightening enforcement and border security?"
    A → in_favor: "Expand pathways"
    B → opposed:  "Tighten enforcement"
- notes: Overlaps the separate `border_security` issue — a concern specifically
  about border *enforcement* maps better to `border_security` (where enforcement
  is Pole A); `immigration` is the broad axis. Tagger should cross-tag bills that
  genuinely touch both, with the orientation fixed independently per issue.

---

# Remaining issues (T1.2 — authored to the bar above)

### border_security — Border Security
- axis_type: **contested**
- Pole A ≡ in_favor — name: **Strengthen border enforcement**
    means: increase physical/personnel border security and deterrence.
    bill_signals: border-wall funding; more Border Patrol agents; detention
    capacity; asylum restrictions at the border; rapid-expulsion measures.
- Pole B ≡ opposed — name: **Limit enforcement / humane & legal-pathway approach**
    means: de-emphasize hardline enforcement; prioritize processing and asylum access.
    bill_signals: cutting wall funding; alternatives to detention; expanding asylum
    processing; ending family separation.
- example_concerns:
    "secure the border" / "stop illegal crossings" → in_favor
    "treat asylum seekers humanely" / "stop caging kids" → opposed
    "I care about the border" → **value-only → must disambiguate**
- disambiguation:
    question: "On the border, are you more focused on strengthening border
    enforcement, or on expanding processing and legal pathways?"
    A → in_favor: "Strengthen enforcement"
    B → opposed:  "Humane processing"
- notes: Tightly overlaps `immigration`; `border_security` is enforcement-centric,
  `immigration` is the broad axis. Orientations fixed independently.

### economy_jobs — Economy & Jobs
- axis_type: **contested**  *(reclassified from valence — the tax-cut/deregulation bloc voices itself through this issue's own "can't find a job" phrasing, so an outcome-only concern silently defaulted to Pole A)*
- Pole A ≡ in_favor — name: **Public investment & worker protections**
    means: government spending/programs and labor protections to create jobs and
    raise wages.
    bill_signals: infrastructure spending; jobs programs; minimum-wage increases;
    pro-union (e.g. PRO Act); expanded unemployment.
- Pole B ≡ opposed — name: **Deregulation & lower taxes (market-led growth)**
    means: reduce taxes/regulation to spur private growth.
    bill_signals: corporate/income tax cuts; deregulation; right-to-work; spending cuts.
- example_concerns:
    "can't find a good-paying job" / "wages are too low" → **value-only → must disambiguate** (both poles claim "more/better jobs")
    "taxes and regulations are killing small business" → opposed
    "invest in workers / raise the minimum wage" → in_favor
- disambiguation:
    question: "On the economy, are you more focused on public investment and worker protections to create jobs, or on lower taxes and fewer regulations to spur private growth?"
    A → in_favor: "Public investment"
    B → opposed:  "Lower taxes & deregulation"
- notes: The means ARE the poles here, the split is ~50/50 and party-correlated,
  and outcome-only phrasing ("more jobs") does not reveal side — so the gate is required.

### education_funding — Education Funding
- axis_type: **contested**  *(reclassified from valence — the school-choice bloc voices itself as "my kid's school is failing, I want options," an outcome-only concern that silently defaulted to Pole A)*
- Pole A ≡ in_favor — name: **Increase public-education funding & access**
    bill_signals: public-school funding increases; Title I; student-loan relief;
    universal pre-K; teacher pay.
- Pole B ≡ opposed — name: **School choice / limit federal spending**
    bill_signals: voucher / ESA programs; cutting the Dept. of Education; block
    grants; opposing loan forgiveness.
- example_concerns:
    "schools are underfunded" / "teachers deserve better pay" → in_favor
    "my kid's school is failing, I want options" / "school choice" → opposed
    "I care about my kid's education" → **value-only → must disambiguate**
- disambiguation:
    question: "On education, are you more focused on increasing funding for public schools, or on expanding school choice like vouchers and charters?"
    A → in_favor: "Fund public schools"
    B → opposed:  "Expand school choice"
- notes: Charter bills straddle (public funding + choice mechanism) — tag by the
  dominant mechanism: new choice/voucher authority → opposed; pure public-school
  funding → in_favor.

### public_safety — Public Safety
- axis_type: **contested**
- Pole A ≡ in_favor — name: **Policing / enforcement capacity**
    means: expand policing and enforcement capacity. (Subject is *policing/enforcement*,
    NOT the "safety" outcome — see the means-trap note below.)
    bill_signals: police funding increases; tougher enforcement powers; qualified-
    immunity protection.
- Pole B ≡ opposed — name: **Reform & prevention**
    bill_signals: police accountability; ending qualified immunity; diversion /
    community-investment programs.
- example_concerns:
    "I don't feel safe walking home" → **value-only → must disambiguate** (could mean
       more police OR more community investment)
    "fund the police" → in_favor
    "stop police violence" / "accountability" → opposed
- disambiguation:
    question: "On public safety, are you more focused on stronger policing and
    enforcement, or on reform and prevention through community investment?"
    A → in_favor: "Stronger policing"
    B → opposed:  "Reform & prevention"
- notes: **Means-trap:** funding crime *prevention* / community-investment programs
  advances **Pole B (opposed)**, NOT Pole A — even though it "funds public safety."
  **Boundary with `crime_public_safety` (NOT the same axis):** `public_safety` =
  **policing / use-of-force** (police funding, enforcement powers, qualified immunity,
  accountability); `crime_public_safety` = **sentencing / charging / incarceration**.
  Do NOT cross-tag the same provision under both; route a use-of-force concern →
  `public_safety`, a sentencing/incarceration concern → `crime_public_safety`. Whether
  to MERGE the two is a Muxin call — see HANDOFF. "I don't feel safe" is the §1
  canonical value-only concern: explicitly contested.

### crime_public_safety — Crime & Public Safety
- axis_type: **contested**
- Pole A ≡ in_favor — name: **Tough-on-crime / enforcement**
    bill_signals: mandatory minimums; more police; cash-bail retention; tougher penalties.
- Pole B ≡ opposed — name: **Criminal-justice reform**
    bill_signals: bail reform; sentencing reform; decriminalization; reentry programs.
- example_concerns:
    "crime is out of control" → in_favor
    "mass incarceration is wrong" / "reform the system" → opposed
    "I care about crime" → **value-only → must disambiguate**
- disambiguation:
    question: "On crime, are you more focused on tougher enforcement and penalties,
    or on reforming the justice system?"
    A → in_favor: "Tougher enforcement"
    B → opposed:  "Justice reform"
- notes: **Boundary with `public_safety` (distinct sub-domains):**
  `crime_public_safety` = **sentencing / charging / incarceration** (mandatory
  minimums, cash bail, sentencing reform, reentry); `public_safety` = policing /
  use-of-force. Do NOT cross-tag the same provision under both; route by concern.
  **Means note:** reform / reentry bills are Pole B even though they aim to reduce
  crime. **Omnibus:** crime bills bundling Pole-A minimums with Pole-B reentry → tag
  by dominant provision; defer to curated context (CAN) where co-equal. Whether to
  MERGE with `public_safety` is a Muxin call — see HANDOFF.

### property_taxes — Property Taxes
- axis_type: **contested**  *(reclassified from valence — the entry's own example_concerns are opposite OUTCOMES, not shared-outcome/different-means; school levy & bond elections run ~50/50)*
- Pole A ≡ in_favor — name: **Lower / cap property taxes**
    bill_signals: property-tax caps; homestead exemptions; rollbacks; assessment limits.
- Pole B ≡ opposed — name: **Maintain tax base for services**
    bill_signals: opposing caps; raising rates/assessments to fund schools/services.
- example_concerns:
    "my property taxes are crushing me" → in_favor
    "we need to fund our schools and services" → opposed
    "property taxes are a big issue for me" → **value-only → must disambiguate**
- disambiguation:
    question: "On property taxes, are you more focused on lowering or capping what you pay, or on keeping funding for schools and local services?"
    A → in_favor: "Lower my taxes"
    B → opposed:  "Fund schools & services"
- notes: A genuine opposite-*outcome* contest (not a means-trap) — the gate is required.

### water_infrastructure — Water & Infrastructure
- axis_type: **valence_dominant**
- Pole A ≡ in_favor — name: **Fund / strengthen water infrastructure & standards**
    bill_signals: water-infrastructure funding; lead-pipe replacement; drought/flood
    resilience; dam/reservoir investment; enforceable water-quality / contaminant
    standards (e.g. PFAS, lead) — regulatory *strengthening* → in_favor, *rollback* →
    opposed.
- Pole B ≡ opposed — name: **Limit federal spending / local-only**
    bill_signals: cutting infrastructure funds; opposing federal water programs.
- example_concerns:
    "our water isn't safe" / "we keep flooding or running dry" → in_favor
- notes: Strongly valence — near-universal support for clean, reliable water;
  Pole B is essentially "don't spend federal money." No forced question.

### energy_grid — Energy Grid
- axis_type: **contested**
- Pole A ≡ in_favor — name: **Expand fossil / conventional production**
    means: boost FOSSIL & conventional energy production (oil, gas, coal) and the grid
    that carries it. (Subject is *fossil/conventional production*, NOT "energy"
    generically — see the means-trap note below.)
    bill_signals: oil/gas leasing; pipeline approvals; LNG exports; blocking emissions
    rules; nuclear expansion (zero-emission but firm baseload → ruled Pole A).
- Pole B ≡ opposed — name: **Clean-energy transition / restrict fossil**
    means: shift to renewables and cut emissions.
    bill_signals: renewable tax credits; emissions limits; blocking new fossil leases;
    grid electrification.
- example_concerns:
    "drill, baby, drill" / "energy independence" → in_favor
    "we need clean energy" / "fight climate change" → opposed
    "my electric bill is too high / blackouts" → **value-only → disambiguate** (both
       poles claim reliability/cost), or fall back to the user's stated source view
- disambiguation:
    question: "On energy, are you more focused on expanding domestic production
    including oil and gas, or on shifting to clean energy and cutting emissions?"
    A → in_favor: "Expand production"
    B → opposed:  "Clean transition"
- notes: **Means-trap:** funding / expanding CLEAN energy (renewables, electrification)
  advances **Pole B (opposed)**, NOT Pole A — do not tag `in_favor` merely because a
  bill "funds energy." **Mixed-bill tiebreak:** "all-of-the-above" / IRA-style bills
  that fund BOTH fossil and clean advance both poles → tag by the *dominant provision*;
  if genuinely co-equal, no-score + defer to curated context (CAN), tendency absorbs it.
  **Rulings:** nuclear → Pole A (firm conventional baseload); carbon-capture (CCS) →
  Pole A (extends fossil-plant life). **Overlaps `environment_climate` — orientation is
  fixed INDEPENDENTLY per issue; route the concern to the most-specific issue
  (cost/reliability/source → energy_grid; emissions/nature/climate →
  environment_climate) and NEVER score a stance resolved under one issue against a bill
  lens tagged under the other.** Reliability/cost concerns are claimed by both poles →
  disambiguation trigger.

### reproductive_rights — Reproductive Rights
- axis_type: **contested**
- Pole A ≡ in_favor — name: **Protect / expand access**
    bill_signals: codifying Roe; protecting clinic access; funding reproductive care;
    protecting contraception / IVF.
- Pole B ≡ opposed — name: **Restrict reproductive access**
    bill_signals: abortion bans/limits; defunding providers; fetal-personhood;
    restricting medication abortion; contraception-coverage restrictions / Title X
    gag rule; IVF restrictions or personhood measures affecting IVF; defunding family
    planning.
- example_concerns:
    "protect a woman's right to choose" → in_favor
    "I'm pro-life" / "protect the unborn" → opposed
    "reproductive rights" → **value-only → must disambiguate** (the phrase is used
       both ways — see the shipped disambiguation gate)
- disambiguation:
    question: "On reproductive policy, are you more focused on protecting access to
    abortion and contraception, or on restricting it?"
    A → in_favor: "Protect access"
    B → opposed:  "Restrict access"
- notes: Canonical "same phrase, opposite meanings" case. Neutral phrasing is essential.

### environment_climate — Environment & Climate
- axis_type: **contested**
- Pole A ≡ in_favor — name: **Climate action / environmental protection**
    bill_signals: emissions limits; clean-energy incentives; conservation / public-
    lands protection; EPA authority.
- Pole B ≡ opposed — name: **Deregulation / limit climate mandates**
    bill_signals: rolling back EPA rules; opening public lands to drilling; blocking
    climate spending.
- example_concerns:
    "we have to act on climate change" → in_favor
    "climate regulations kill jobs / overreach" → opposed
    "I care about the environment" → leans in_favor; disambiguate if framed around
       cost/jobs/regulation
- disambiguation:
    question: "On the environment, are you more focused on stronger government action
    to cut emissions and protect natural areas, or on reducing regulations to lower
    costs and support energy and business growth?"
    A → in_favor: "Stronger action"
    B → opposed:  "Limit regulations"
- notes: **Rulings:** permitting / NEPA reform → judge by dominant effect (fast-tracks
  fossil → Pole B; fast-tracks clean transmission → Pole A; co-equal → no-score +
  curated context); carbon-capture → Pole A. **Tiebreak:** mixed bills → dominant
  provision. **Overlaps `energy_grid` — orientation fixed INDEPENDENTLY per issue;
  route the concern to the most-specific issue (emissions/nature/climate →
  environment_climate; cost/reliability/source → energy_grid) and NEVER score a stance
  from one issue against a bill lens tagged under the other.** Most "environment"
  concerns lean Pole A.

### election_integrity — Election Integrity
- axis_type: **contested**  (⚠ the label itself is a partisan frame)
- Pole A ≡ in_favor — name: **Voting access / expand participation**
    bill_signals: automatic / same-day registration; mail-voting expansion; restoring
    the Voting Rights Act; early voting.
- Pole B ≡ opposed — name: **Voting restrictions / security-first**
    bill_signals: voter-ID requirements; voter-roll purges; limiting mail / drop
    boxes; restricting early voting.
- example_concerns:
    "make it easier to vote" / "stop voter suppression" → in_favor
    "we need voter ID" / "secure elections" / "stop fraud" → opposed
    "election integrity" → **value-only → must disambiguate**
- disambiguation:
    question: "On elections, are you more focused on expanding access and making
    voting easier, or on tightening rules like ID requirements to prevent fraud?"
    A → in_favor: "Expand access"
    B → opposed:  "Tighten rules"
- notes: **ORIENTATION LOCK (high inversion risk).** Subject = ballot **access** /
  the franchise. The word "integrity" in the id is a partisan frame and does **NOT**
  set direction. Any provision that restricts voter access (voter-ID, roll purges,
  drop-box / mail limits) = **opposed**, regardless of the bill's title — even a bill
  literally named "Election Integrity Act." Fall-through: a bill that neither expands
  nor restricts voter access (redistricting, ECRA / certification, campaign-finance
  disclosure, audits) = **no-score**, never default to a pole. (Rename →
  `voting_access` would remove the trap but ripples into `canonicalIssues.ts` — a
  Muxin call, see HANDOFF.)

### congressional_accountability — Congressional Accountability
- axis_type: **valence_dominant**  (a "bridge" issue — near-universal agreement)
- Pole A ≡ in_favor — name: **Stronger ethics & accountability**
    bill_signals: congressional stock-trading bans; transparency / disclosure;
    closing the lobbying revolving door.
- Pole B ≡ opposed — name: **Status quo / weaker rules**
    bill_signals: voting against stock-trading bans; opposing transparency measures.
- example_concerns:
    "members of Congress shouldn't trade stocks" → in_favor
    "politicians are corrupt" / "more transparency in Congress" → in_favor
- notes: Overwhelming consensus on Pole A — the canonical Polis "bridge statement"
  theme (90%+ cross-cluster agreement). Rare opposed constituency. No forced question.
  **Scope (halo-label guard):** restrict to consensus ethics/transparency. EXCLUDE
  (a) **term limits** — a contested governance mechanism, not consensus accountability;
  (b) partisan single-target oversight / investigation bills — do NOT cross-tag these
  into this issue and auto-resolve them to Pole A.

---

# v2 additions — 2026-08-13 vocabulary expansion (pole-vocab-v2)

**Provenance:** the automated vocabulary-gap review over the full promise corpus
(`scripts/ingest/_vocab-gap.workflow.js` gap report) plus Muxin's manual pass on
the 30-promise TX extraction worksheet; every entry carries at least one real
promise behind it. Approved proposal-by-proposal on 2026-08-13.

**Why these are canonical issues and not sub-issues:** four of the six were
proposed as sub-issues, but their direction is ORTHOGONAL to the would-be
parent's axis, and a sub-issue inherits the parent's poles verbatim (see
`SUB_ISSUE_VOCABULARY.md`) — in this architecture, a facet with its own poles IS
a canonical issue. Overlapping issues are already supported per-(bill, issue).
The two direction-ALIGNED proposals from the same review
(`interior_ice_enforcement`, `wages_worker_power`) became sub-issues instead.

**Rejected / watch-list from the same review:** `cartel_narco_terrorism`
(one promise, executive-facing — revisit as more states land);
a standalone `artificial_intelligence` id (the only AI promise observed is
election-scoped and lands in election_security_disinformation — revisit when
non-election AI promises appear).

**v2 routing updates to existing entries** (mirrored in the module notes):
economy_jobs → tariffs route to trade_tariffs; education_funding →
curriculum-content routes to curriculum_culture; healthcare_affordability →
Social Security routes to retirement_income_security; election_integrity →
redistricting routes to redistricting_reform and disinformation/infrastructure
routes to election_security_disinformation (its fall-through list shrinks
accordingly); congressional_accountability → term limits route to
congressional_term_limits.

### trade_tariffs — Trade & Tariffs
- axis_type: **contested**
- Pole A ≡ in_favor — name: Trade protection / tariffs
    means: use tariffs and trade barriers to protect domestic industry and jobs.
    bill_signals: imposing or raising tariffs; Buy American / domestic-content
    requirements; withdrawing from or renegotiating trade agreements;
    anti-dumping / trade-remedy enforcement.
- Pole B ≡ opposed — name: Free trade / lower tariffs
    means: reduce tariffs and trade barriers; expand trade.
    bill_signals: repealing or blocking tariffs; new or expanded trade
    agreements; tariff-exclusion / relief processes; limiting unilateral
    presidential tariff authority.
- Orientation: Pole A = expand the nominal subject (trade protection). The split
  cuts ACROSS both parties — party is no proxy; the disambiguation gate is
  required. Boundary with economy_jobs: orthogonal axes — a tariff provision is
  neither a labor protection nor a domestic tax cut; route trade mechanisms
  here, general jobs/wages concerns stay economy_jobs.

### curriculum_culture — School Curriculum & Culture
- axis_type: **contested**
- Pole A ≡ in_favor — name: Curriculum restrictions & parental oversight
    means: restrict DEI / gender-identity content in public-school curriculum
    and student life; mandate curriculum transparency and parental review.
    bill_signals: banning or defunding DEI programs; restricting gender-identity
    or sexual-orientation curriculum; sex-based school-sports eligibility;
    curriculum-transparency / parental-review mandates; book-removal authority.
- Pole B ≡ opposed — name: Inclusive curriculum & educator discretion
    means: preserve inclusive curriculum and programming; leave content
    decisions with schools and educators.
    bill_signals: protecting or funding DEI / inclusive programming;
    trans-inclusive school sports or facilities policy; blocking
    curriculum-content bans or book bans.
- Orientation (documented choice): the nominal subject is curriculum
  RESTRICTION — Pole A expands it. Boundary with education_funding: orthogonal
  axes — content/culture provisions route here; funding/choice mechanisms
  (vouchers, ESAs, funding, teacher pay) stay education_funding. Omnibus
  education bills carrying both → dominant provision, else no-score + CAN.

### redistricting_reform — Redistricting & Gerrymandering
- axis_type: **valence_dominant**
- Pole A ≡ in_favor — name: Independent / anti-gerrymandering map-drawing
    means: move district map-drawing to independent processes and ban partisan
    gerrymandering.
    bill_signals: independent redistricting commissions;
    partisan-gerrymandering bans; map-drawing criteria / transparency
    requirements; banning mid-decade (out-of-cycle) redistricting.
- Pole B ≡ opposed — name: Legislature-controlled map-drawing
    means: keep district maps drawn by state legislatures / the party in power.
    bill_signals: blocking commission requirements; preserving legislative
    map-drawing authority.
- The home for election_integrity's former redistricting fall-through. Voiced
  concern is near-uniformly Pole A (valence); legislative votes still split
  party-line by state context — the tagger tags both directions. Ballot-access
  provisions never cross-tag here.

### election_security_disinformation — Election Security & Disinformation
- axis_type: **valence_dominant**
- Pole A ≡ in_favor — name: Protect elections from manipulation & disinformation
    means: regulate deceptive AI / deepfakes in elections and fund election
    security.
    bill_signals: AI-deepfake disclosure or bans in election communications;
    election-disinformation countermeasures; election-infrastructure /
    cybersecurity funding; foreign-interference protections.
- Pole B ≡ opposed — name: Minimal regulation of election speech & technology
    means: oppose new regulation of election-related speech and technology.
    bill_signals: blocking deepfake / disinformation rules (speech grounds);
    cutting election-security funding.
- ⚠ ORIENTATION GUARD (halo-label risk, mirrors election_integrity's lock):
  this issue is TECHNOLOGICAL security of the process. A "security"-framed bill
  whose operative provisions restrict voter ACCESS (voter ID, roll purges, mail
  limits) is election_integrity Pole B, never this issue's Pole A.

### congressional_term_limits — Congressional Term Limits
- axis_type: **valence_dominant**
- Pole A ≡ in_favor — name: Impose term limits
    means: limit the number of terms members of Congress may serve.
    bill_signals: term-limits constitutional amendments; statutory congressional
    term limits; cosponsoring term-limits resolutions.
- Pole B ≡ opposed — name: Preserve unlimited terms
    means: oppose imposing new term limits; keep the current system.
    bill_signals: voting against term-limits amendments or resolutions.
- The home for congressional_accountability's term-limits carve-out (its
  halo-label guard excludes term limits from consensus ethics). Public consensus
  on Pole A is overwhelming (valence); the measure persistently fails in
  Congress — incumbent resistance, not voter-side ambiguity. A candidate's
  SELF-imposed term-limit pledge is campaign conduct (extraction gate 2b), not a
  congressional act — do not extract or tag it.

### retirement_income_security — Social Security & Retirement
- axis_type: **valence_dominant**
- Pole A ≡ in_favor — name: Protect / expand retirement benefits
    means: protect or expand Social Security and earned retirement-income
    benefits.
    bill_signals: blocking Social Security benefit cuts; benefit expansions /
    COLA increases; raising or eliminating the payroll-tax cap (revenue-side
    solvency); protecting the current retirement age.
- Pole B ≡ opposed — name: Restructure / reduce benefits
    means: restrain Social Security spending or restructure benefits.
    bill_signals: raising the retirement age; means-testing or benefit-formula
    cuts; partial privatization / private accounts; commissions fast-tracking
    entitlement cuts.
- Solvency means-trap: "save / fix Social Security" is voiced by BOTH poles —
  the MECHANISM decides. Revenue-side fixes = in_favor; benefit-side cuts =
  opposed, however marketed. Boundary: Medicare and senior CARE stay
  healthcare_affordability (senior_care facet); this issue is retirement
  INCOME. A bundled "protect Social Security and Medicare" promise carries both
  issues.

---

**All 22 canonical issues authored** (16 original + 6 added in the 2026-08-13
vocabulary expansion, see the v2 section below). **14 are contested**
(need the disambiguation gate): gun_rights_safety, immigration, border_security,
public_safety, crime_public_safety, energy_grid, reproductive_rights,
environment_climate, election_integrity, **economy_jobs**, **education_funding**,
**property_taxes** (last three reclassified from valence by the critic pass),
plus v2's **trade_tariffs** and **curriculum_culture**.
**8 are valence-dominant:** healthcare_affordability, housing_affordability,
water_infrastructure, congressional_accountability, plus v2's
redistricting_reform, election_security_disinformation,
congressional_term_limits, retirement_income_security.

> ⚠ This shifts the product picture: **three-quarters of issues now require the
> disambiguation gate.** That makes the gate (already shipped as
> `[CONCERN_INTERPRETATION]`) the central UX, and it strengthens the case for the
> data-driven trigger (axis_type=contested ⇒ always ask) over the LLM's
> per-utterance confidence guess.

## Critic verdict (T1.3 — adversarial acceptance pass, 3 offline critics)

> **UPDATE (loop iteration):** every MUST-FIX item below is now **applied** to the
> entries above — including the election_integrity orientation lock and the
> reproductive_rights scope-match, which were recorded as "applied" in the first pass
> but had not actually landed in the entries (caught on re-read). A re-verification
> critic pass follows; T1.3 is marked clean only once that passes.

**Discriminator the critics converged on** — *for axis type:* "does the Pole-B
constituency express its preference through THIS issue's own kitchen-table
phrasing? Yes → contested (needs the gate); no → valence." *For inversion:* a
finding is a BLOCKER only if a realistic single-subject bill gets the **wrong
sign** when a reasonable tagger follows the entry's own definitions.

**Per-issue verdict:** CLEAN — gun_rights_safety, immigration, border_security,
healthcare_affordability, water_infrastructure, congressional_accountability
(minors only). NEEDS-FIX — election_integrity, reproductive_rights, energy_grid,
public_safety, crime_public_safety, environment_climate, housing_affordability.
RECLASSIFY valence→contested — economy_jobs, education_funding, property_taxes.

### MUST-FIX — applied this session
- **economy_jobs / education_funding / property_taxes → `contested`.** Each adds
  a neutral disambiguation gate (the canonical ~50/50 economic axis; the
  school-choice bloc; the lower-taxes-vs-fund-services split — all speak through
  the issue's own outcome phrasing, so they silently defaulted to Pole A).
- **election_integrity orientation lock.** The id "integrity" + the global
  convention push a voter-ID/purge bill to `in_favor` while the poles say
  `opposed` (internal contradiction). Locked: subject = ballot ACCESS; the
  "integrity" frame does NOT set direction; access-restricting provisions =
  `opposed` regardless of title.
- **reproductive_rights scope-match.** Pole B widened from "Restrict abortion" to
  "Restrict reproductive access" (+ contraception/IVF/Title-X/family-planning
  signals) so a contraception restriction can't fall into Pole A and invert.

### MUST-FIX — recorded for the loop (T1.3 remainder, apply then re-run a critic)
- **energy_grid (within-issue inversion + overlap):** redefine Pole A subject as
  *fossil/conventional production* (not "energy" generically) + means-trap note
  ("funding CLEAN energy = Pole B, not A"); add dominant-provision tiebreak +
  explicit rulings (nuclear→A; CCS→A w/ note) + all-of-the-above omnibus note.
- **public_safety (inversion):** redefine Pole A subject as *policing/enforcement
  capacity* (not the "safety" outcome) + means-trap note ("funding
  prevention/community-investment = Pole B").
- **environment_climate (overlap):** explicit rulings for permitting reform &
  carbon-capture + dominant-provision tiebreak; debias the question (drop
  "regulations that raise costs" as stated fact).
- **CROSS-ISSUE energy_grid ↔ environment_climate:** orientation-independence +
  concern-routing note (cost/reliability/source → energy_grid; emissions/nature →
  environment_climate); never XNOR a stance from one issue against a bill lens
  tagged under the other.
- **CROSS-ISSUE public_safety ↔ crime_public_safety:** do NOT blind-merge — they
  are distinct sub-domains (policing/use-of-force vs sentencing/incarceration).
  Drop the "same axis" framing; define the boundary; forbid cross-tagging the
  same provision; route by concern. (Merge remains a Muxin call — HANDOFF.)
- **housing_affordability (overlap):** mixed YIMBY-dereg + spending-cut bills fire
  both poles — add tiebreak: a cut-HUD/voucher-funding signal dominates →
  `opposed`; zoning preemption alone → `in_favor`. (Axis stays valence.)
- **Minors:** gun_rights_safety (+arming-teachers signal; debias question);
  immigration (+visa-cap-cut mirror signal); healthcare (mechanism-based tiebreak
  for tax-cuts-marketed-as-cost-relief); water_infrastructure (+PFAS/regulatory-
  standard signal); congressional_accountability (scope off term-limits & partisan
  oversight); border_security & several questions (de-load wording).

### CONVENTION-LEVEL must-fixes (add to the header + each contested entry)
- **Storage assumption to VERIFY (flips a cross-issue note to a BLOCKER if false):**
  `stance_lens` must be stored per-`(bill, issue)` pair, not one value per bill —
  else a wall-funding bill can't be `opposed`-under-immigration AND
  `in_favor`-under-border_security. Resolver issue-routing is correctness-critical.
- **Fall-through = no-score.** An untaggable bill (e.g. an election
  administration/redistricting bill under election_integrity) must NOT default to
  a pole; return no-score.
- **Omnibus → curated context / tendency (global).** State once that the
  gun-entry's "defer vote meaning to CAN curated context where it exists; the
  tendency read absorbs the rest" applies to ALL entries; cross-ref each contested
  entry.
