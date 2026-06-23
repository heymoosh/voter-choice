# Monetization Strategy

**Status:** Strategy / exploration. No code or product commitments. Written 2026-06-23 from a read of the repo.

This document answers one question: *Voter Choice itself is a free, privacy-locked, nonpartisan consumer tool — so what here can actually make money, and how?* It separates the two tracks the brief named — **productized SaaS** and **retainer / services (setup → custom builds)** — and maps each reusable asset onto them.

---

## 0. The core constraint (read first)

The consumer product is **deliberately not monetizable as-is**, and that is a feature, not a gap:

- No accounts, no stored user data, no cookies/analytics, no client persistence (`docs/PROJECT_SPEC.md` "Privacy and security constraints").
- Nonpartisan positioning is the whole brand (`src/app/about/page.tsx`, `docs/SOURCE_TIERS.md`).
- The economics are a $20/month hard cap with graceful degradation to copy/paste (`docs/LAUNCH_PLAN.md`).

So **do not** monetize by bolting ads, accounts, data-selling-of-users, or a partisan tilt onto the public site. That would burn the only asset (trust) that makes the rest credible.

**What is monetizable is everything *underneath* the consumer site:** the data pipelines, the scoring engines, the extraction stack, and the build expertise. All of the underlying source data (FEC, 50-state ethics commissions, GovInfo/Congress.gov, Census) is **public-domain government data**, so reselling normalized derivatives of it is clean. The value we add — normalization, directional tagging, crosswalking, plain-language summaries — is ours to license.

---

## 1. Asset inventory (what's actually in the repo)

| # | Asset | Where | Rarity / why it's worth money |
|---|-------|-------|-------------------------------|
| A | **50-state + DC + federal campaign-finance donor pipeline** — 53 ingest scripts (`*-donors.ts`), one per state ethics commission, normalized into `donor_aggregates` | `scripts/ingest/*-donors.ts`, `db/schema.ts` (`donorAggregates`) | **The crown jewel.** Every state publishes campaign finance in a different broken format (PDFs, ASPX portals, Playwright-only sites — see `nd-playwright-donors.ts`). A clean, normalized, refreshable 50-state donor table is something almost nobody has. FEC is easy; *state-level* is the moat. |
| B | **Directional bill-tagging engine** — "tag positions, not topics," pole vocabulary, sub-issues, confidence | `src/lib/alignment/poleVocabulary.ts`, `subIssues.ts`, `scripts/ingest/tag-bills*.ts`, `docs/ALIGNMENT_DATA_MODEL.md`, `docs/ISSUE_DIRECTIONALITY_DESIGN.md` | The insight that topic-tags silently invert alignment scores (~25–40% error) and the pole-vocabulary fix is genuinely novel IP. Most "AI tags bills" vendors have this bug and don't know it. |
| C | **Alignment engine** — kitchen-table concern → value → position → vote scoring | `src/lib/server/alignment.ts`, `src/app/api/alignment/`, `docs/alignment/` | Turns "rent keeps going up" into a defensible per-legislator score with citations. Reusable for any "match a person to a record" product. |
| D | **CRS / plain-language bill summaries** — GovInfo BILLSTATUS + Congress.gov fallback, public-domain | `scripts/ingest/crs-summaries.ts`, `scripts/ingest/summarize-bills.ts`, `db` (`bill_plain_summary`) | Plain-English summaries of legislation, sourced to public domain, with a free fallback chain. Sellable as a content feed. |
| E | **Ballot extraction stack** — Textract + LLM vision + pdf.js + Tesseract, with detector, sampler, stitcher, verdict | `src/lib/server/extract-*.ts`, `src/app/api/extract-ballot/` | A robust "messy government PDF/image → structured data" pipeline. The hard part (multi-engine fallback + confidence verdict) is done. Generalizes far beyond ballots. |
| F | **Privacy-first, budget-capped AI chat pattern** — graceful handoff, two-threshold soft-close, rate limiting, durable Upstash store, BYOK | `src/lib/server/budget.ts`, `counters*.ts`, `durable-store.ts`, `anthropic-client-byok.ts`, `docs/LAUNCH_PLAN.md` | A reference architecture for "offer a free public AI tool without going bankrupt or getting abused." This is a *services* asset more than a data asset. |
| G | **Candidate / CAN2026 enrichment schema** — races, ratings, donor trails, key votes, citations | `db/schema.ts` (`can*` tables), `docs/CAN2026_ENRICHMENT_SCHEMA.md`, `scripts/ingest/can2026.ts`, `federal-candidates.ts` | Crosswalked candidate records with provenance on every row. The crosswalk discipline is the reusable part. |
| H | **Polis-style consensus engine** — bridges, compass, bars | `src/app/api/polis/*` | Opinion-clustering / "what do people across the aisle agree on" — sellable to deliberation, civic-engagement, and research buyers. |
| I | **Legislator scorecards / member stats** | `scripts/ingest/member-stats.ts`, `db` (`member_stats`, `scorecard_meta`) | Per-member voting statistics, ready to syndicate. |
| J | **50-state voter-rules + logistics dataset** — ID rules, deadlines, registration, early voting | `src/lib/state-rules/`, `src/lib/voter-id-rules.ts`, `src/data/states/`, `src/lib/civic-logistics.ts` | Structured, maintained, 50-state election-logistics data. Civic orgs pay to not maintain this themselves. |
| K | **Nonpartisan citation methodology** — source tiers, advocacy labeling, "drop the claim if no Tier 1–3 source" | `docs/SOURCE_TIERS.md`, `src/lib/prompts/` | A governance/methodology asset. It's what makes an LLM civic product *defensible*. Sellable as the "trust layer" in consulting. |

---

## 2. Track 1 — Productized SaaS

Ranked by distance-to-revenue (closest first).

### 2.1 Donor & money-in-politics data API  ⭐ best SaaS bet
**Asset A (+ G, I).** Sell normalized, refreshable **state + federal campaign-finance data** as an API / bulk feed.

- **Why it wins:** highest moat, broadest buyer set, fully public-domain source data, and the hard work (53 state scrapers) is already done.
- **Buyers:** newsrooms & data journalists, political-research / public-affairs firms, watchdog/transparency nonprofits, academic researchers, ESG/corporate-PAC analysts, other civic-tech apps that don't want to build 50 scrapers.
- **Packaging:** tiered API (free tier for small/academic, $99–$499/mo pro, custom enterprise/bulk). Charge for freshness (nightly vs quarterly), coverage (federal-only vs all-50), and entity-resolution quality.
- **Gap to close:** harden scrapers into scheduled refresh jobs with monitoring (`docs/operations/donor-data-gaps.md` already tracks coverage holes); add a documented public API surface, entity dedup/crosswalk SLA, and per-key auth/metering. The chat budget/rate-limit infra (F) is reusable for metering.
- **Moat note:** keep the *state* scrapers as the paid differentiator. FEC-only competitors exist; clean 50-state does not.

### 2.2 Legislation intelligence feed
**Assets B + D + I.** "Bills, tagged by *position* (not topic), with plain-language summaries and per-member scores."

- **Buyers:** advocacy orgs, lobbyists/govtech, news, education/civics platforms, other LLM apps that need a clean bills corpus.
- **Differentiator:** the directional pole-vocabulary tagging (B) — pitch it explicitly as *"alignment scoring that doesn't silently invert,"* citing the audit. That's a credible, technical wedge against generic bill-tagging vendors.
- **Packaging:** corpus subscription + API; premium tier adds the directional tags and confidence scores.

### 2.3 "Civic AI in a box" — white-label voter/constituent assistant
**The whole app as a template (E, F, J, K).** License a privacy-first, budget-capped, nonpartisan ballot/issue assistant to organizations that want their *own* branded version.

- **Buyers:** Secretaries of State / county election offices, libraries, universities, unions, large nonpartisan nonprofits (League of Women Voters–type), newsrooms wanting an election companion.
- **Why it's viable:** the privacy guarantees and budget safeguards are exactly what a government/institutional buyer needs and won't build. BYOK (`anthropic-client-byok.ts`) lets them bring their own LLM spend.
- **Packaging:** setup fee + annual license + per-seat or per-jurisdiction. This blends into Track 2.

### 2.4 Document → structured data extraction (vertical SaaS)
**Asset E, generalized.** The multi-engine extraction + confidence-verdict stack isn't ballot-specific.

- **Buyers:** anyone drowning in messy government/legal PDFs — gov procurement, legal, compliance, records-request shops.
- **Reality check:** this is the most *crowded* market (lots of "PDF → JSON" startups). Only pursue if a specific vertical buyer shows up; otherwise it's a feature, not a company.

---

## 3. Track 2 — Retainer / services (setup → custom builds)

This is the **faster cash** and lower-risk path, and it's where the team's demonstrated build quality (TDD, mutation testing, 90%+ coverage, full CI/CD, secrets automation) is itself the product.

### 3.1 Productized setup packages (one-time, fixed-fee)
Turn the launch playbook into repeatable engagements:

- **"Privacy-first public AI tool" setup** — the F + K stack: budget caps, graceful handoff, rate limiting, durable safeguards, nonpartisan citation discipline. Many orgs want a free public LLM tool and are terrified of cost blowups / hallucination liability. Sell the guardrails. (`scripts/provision-durable-safeguards.sh` is literally a turnkey setup script already.)
- **"State data pipeline" build-out** — stand up campaign-finance / legislative ingestion for a client's jurisdictions. Priced per-state (the 53 scripts are the reference implementations).
- **Election-companion deployment** — white-label the consumer app for a specific state/county (ties to 2.3).

### 3.2 Retainers (recurring)
- **Data freshness & maintenance retainer** — state portals break constantly (that's why `nd-playwright-donors.ts` exists). Charge monthly to keep a client's feeds green. This is the natural recurring-revenue annuity behind the donor data, whether sold as SaaS or service.
- **Cycle retainer** — civic orgs need surge capacity every election cycle. Retainer for ingestion, QA, and ballot-data refresh through a cycle.
- **Methodology / trust advisory** — for media & institutions building their own civic LLM features: source-tiering, nonpartisan QA, alignment-scoring correctness review (the pole-vocabulary audit as a service).

### 3.3 Custom builds (project-based)
- Custom dashboards on top of the donor / legislation data (e.g., "show me this sector's giving in these 6 states").
- Bespoke alignment/scoring models for an advocacy org's specific issue set.
- Polis-style deliberation engine (H) deployments for deliberative-democracy / public-consultation clients.

---

## 4. Recommended sequencing

1. **Now (services, weeks):** Package 3.1 setup offers + 3.2 maintenance retainer. Lowest lift, validates buyers, funds the SaaS build. The data-freshness retainer doubles as the ops hardening the donor API needs anyway.
2. **Next (SaaS, 1–2 quarters):** Productize **2.1 the donor/finance API** — single best SaaS bet. Re-use chat metering infra (F) for auth/rate-limit/billing. Lead with the 50-state moat.
3. **Then:** Layer **2.2 legislation feed** onto the same API platform and billing. Pitch directional tagging (B) as the wedge.
4. **Opportunistic:** **2.3 white-label** when an institutional buyer appears — it bridges both tracks and carries the best per-deal economics.
5. **Only if pulled:** 2.4 extraction — feature, not a company, unless a vertical buyer asks.

---

## 5. Guardrails (non-negotiable)

- **Never** sell consumer-side user data or weaken the public site's privacy promise — it's both the ethics and the brand.
- **Keep commercial and nonpartisan brands legible.** Consider a separate commercial entity/brand for the data API so the free tool's neutrality is never questioned; Grey Bird LLC already structures this.
- **Resell only public-domain-derived data** (FEC, state ethics commissions, GovInfo, Census). Audit any source whose ToS restricts redistribution (e.g., third-party aggregators) before it enters a paid product. Note CAN2026 (G) is single-maintainer scraped content with attribution obligations — treat as enrichment, not a resale base.
- **Attribution & provenance** stay on every row (the schema already enforces `source_url` + `snapshot_date`); that provenance discipline is a selling point, not overhead.

---

## 6. One-line summary

> The free tool is the trust-builder and the lead-gen; the **53-state campaign-finance pipeline is the business** — sell it first as maintenance/setup retainers, then as a metered data API, with directional legislation tagging and white-label civic-AI as the next layers up.
