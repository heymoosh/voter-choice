# Monetization Strategy

**Status:** Strategy / exploration. No code or product commitments. Written 2026-06-23 from a read of the repo; revised same day to (a) separate *ready-to-sell* from *needs-build* and (b) verify monetization rights.

This document answers two questions:
1. **What can we actually sell *now*** — as a service or as a dataset license — versus what needs a build first?
2. **Do we have the rights** to sell each of those things?

---

## 0. The core constraint (read first)

The consumer product is **deliberately not monetizable as-is**, and that is a feature:

- No accounts, no stored user data, no cookies/analytics, no client persistence (`docs/PROJECT_SPEC.md`).
- Nonpartisan positioning is the brand (`src/app/about/page.tsx`, `docs/SOURCE_TIERS.md`).
- $20/month hard cap with graceful degradation (`docs/LAUNCH_PLAN.md`).

Do **not** monetize by bolting ads, accounts, user-data-selling, or a partisan tilt onto the public site — that burns the trust that makes everything else credible. What's monetizable is everything *underneath* it: the datasets, the build expertise, and (later) the engines.

---

## 1. Ready to sell **now** ✅

These three are launchable as a **service or a dataset license** today — no product build required. Verify rights per §3 first.

### 1.1 Election-logistics dataset (50 states + DC) — *cleanest, lowest-risk*
- **What:** 51 structured JSON files (`src/data/states/`) — registration deadlines, early voting, voter-ID rules, election dates — each with `_sources` provenance, "last verified" dates, and noted discrepancies (e.g. `TX.json` flags its own online-registration caveat).
- **Sell as:** a licensed dataset / refreshed feed. Buyers: civic orgs, newsrooms, voter-engagement apps that don't want to maintain 51 jurisdictions.
- **Why it's ready:** structured, source-cited, maintained; no correctness landmines.
- **Rights:** ✅ clean — see §3.1.

### 1.2 Campaign-finance donor data — **as a delivered dataset, the clean subset only**
- **What:** populated, not just scripts — **81% coverage, 6,771 / 8,357 state legislative candidates** (`docs/operations/donor-data-gaps.md`) plus federal FEC, normalized into `donor_aggregates`. The honest per-state gaps ledger is itself a selling asset.
- **Sell as:** a one-time/periodic **bulk delivery** or a "run-the-pipeline-for-your-states" service. **Not** a metered API yet (that's a build — §2.1).
- **Critical caveat:** the table blends three provenance classes. **Only the FEC + direct-state-portal rows are cleanly sellable; the FollowTheMoney/NIMSP rows are not.** This is filterable via the existing `donor_aggregates.source` column. See §3.2 — *do not skip this.*

### 1.3 Services — setup + maintenance retainers — *ready by definition*
- **"Privacy-first, budget-capped AI tool" setup.** `scripts/provision-durable-safeguards.sh` is already a turnkey installer; the budget/handoff/rate-limit/citation stack is the deliverable institutions won't build themselves.
- **State data-pipeline build-outs.** The 53 ingest scripts are reference implementations; price per-state.
- **Data-freshness retainer.** State portals break constantly (that's why `nd-playwright-donors.ts` exists). This is the recurring-revenue annuity behind the donor data.
- **Rights:** ✅ selling our own labor + our own code (§3.4).

---

## 1A. What we have that others don't (honest moat — with caveats)

Several of these spaces have real incumbents (Google Civic, Democracy Works/TurboVote, FollowTheMoney/NIMSP, OpenSecrets). The differentiation below is deliberately conservative — where a claim would be commodity or false, it's flagged so we don't sell on a weak point.

### Election-logistics dataset
- **Commodity (do not sell on this):** the *dates* — registration deadlines, early-voting windows, election dates. Civic API, Democracy Works, Vote.org, Ballotpedia, Vote411 all have these.
- **Our actual edge — the *eligibility/rules* layer the date-feeds skip:**
  - **Primary-participation gates as statute-cited structured data** (open/closed/semi-closed/top-two, party-lock-to-first-round, runoff consequences, unaffiliated paths) — answers *"can I vote in this primary and what does it lock me into?"* **Covers 28 jurisdictions.**
  - **Voter-ID rules with the *fallback/cure path***, not just yes/no (provisional/affidavit, expiration, reasonable-impediment declaration — **24 state files**).
  - **Bilingual plain-language rule explanations** (`ruleExplanationEn`/`Es`).
  - **Honest provenance** — per-field `lastVerified`, source URLs, and discrepancy notes (TX flags its own online-registration caveat).
- **Caveat to disclose:** depth is uneven — all 51 have dates + ID-category (NCSL) + phones-at-polls; ~28 have the party gates; **only TX + GA** have fully-verified accepted-ID lists. Sell as "the rules layer the date-feeds lack," not "complete at full depth for all 50."

### Donor data (clean subset)
- **Weakest moat — do NOT overclaim.** FollowTheMoney/NIMSP, Transparency USA, and OpenSecrets already have state + federal donor data; we **seeded 18 states from FollowTheMoney**, so we do *not* have "more state donor data than the incumbents." Claiming so is false.
- **Our actual edge:**
  - **One sector vocabulary across federal + 50 states, joined to candidates** (`_bucket-mapping.ts` → single `bucket_label`). A buyer pulling raw FEC + state portals gets 51 incompatible schemas; we give one, candidate-keyed.
  - **Commercial cleanliness** — FEC + direct-state is sourced from public records a commercial buyer can actually use; FollowTheMoney's terms travel with its data.
  - **Honest coverage ledger** (`donor-data-gaps.md`).
- **One-line pitch:** *not more data than OpenSecrets/FTM — cleaner, single-schema, candidate-joined, commercially usable.*

### Services
- **Commodity:** generic "build me an AI app" shops.
- **Our edge:** a *shipped*, civic-specific, privacy-and-liability-hardened reference build (budget caps, two-threshold graceful handoff, durable safeguards, rate limiting, BYOK, nonpartisan citation discipline) plus proven brittle-portal scraping muscle. For an election office/library, the guardrails *are* the project.

---

## 2. Needs a build before it can sell ⛔ (roadmap, not launch)

### 2.1 Donor / finance **metered API** (SaaS)
Data is ready; the *product wrapper* isn't — auth, billing, rate-limit/metering (reuse the chat infra in `src/lib/server/`), docs, SLA. Best SaaS bet, but it is a build. Ship 1.2 as a delivery first.

### 2.2 Legislation-intelligence feed / directional bill-tagging
Best *IP* (pole-vocabulary, "tag positions not topics"), but **not sellable today**: the live corpus is **~25–30% wrong**, concentrated on contested issues, with anti-calibrated confidence (`docs/operations/BILL_TAG_AUDIT.md`). The fix is *designed, not applied*. Selling now = selling known-inverted data. (The underlying CRS/GovInfo summaries are public-domain and fine; the *tags* are the problem.)

### 2.3 White-label "civic AI in a box"
Bridges service + SaaS; strong per-deal economics. Needs a packaging/tenancy build. Pursue when an institutional buyer (Secretary of State, library system, university) appears.

### 2.4 Ballot extraction, Polis consensus, CAN2026 enrichment
Engines/schemas exist but no packaged offer or buyer; CAN2026 is design-only (no migration). Opportunistic at best. Note CAN2026 also has a **rights problem** — §3.3.

---

## 3. Rights & clearance — **verified against the repo** ⚠️

Bottom line: **two of the three "ready now" offers are clean; the donor dataset is sellable only after filtering out one source.** No `LICENSE` file exists and `package.json` has no license field, and the repo is `"private": true` — so the **code is all-rights-reserved to Grey Bird LLC** (good: ours to license; but we should add an explicit license/terms before any external delivery).

### 3.1 Election-logistics dataset — ✅ CLEAR
Compiled by us from **official state Secretary-of-State `.gov` pages** (see `_sources` in each `src/data/states/*.json`, e.g. `sos.state.tx.us`, `votetexas.gov`). The underlying items are **facts** (dates, deadlines, ID rules) — not copyrightable (*Feist v. Rural*). Our compilation is ours to license. No third-party API sits in this data path — in particular it is **not** Google-Civic-derived (Civic's ToS forbids caching/redistribution; we sourced direct from SoS pages instead). **Action:** none required to sell; attach our own dataset license/terms.

### 3.2 Donor data — ⚠️ MIXED; segregate before selling
`donor_aggregates` carries a per-row **`source`** column (`"fec" | "followthemoney" | …`) and `source_url` — provenance is separable, which is what makes a clean carve-out possible.

| Source class | Script(s) | Right to resell commercially? |
|---|---|---|
| **Federal — OpenFEC** | `federal-donors.ts` (`api.open.fec.gov`) | ✅ **Yes.** U.S. government, public domain. |
| **Direct state portals** | 50+ per-state `*-donors.ts` (e.g. `ks-cfr-donors.ts` → KS SoS) | ✅ **Mostly** — public records / facts. ⚠️ Per-portal **Terms of Use** vary; a few we access via bot-detection bypass (KS, OR via MCP Playwright, ND) — those ToU deserve a legal read before commercial resale. |
| **FollowTheMoney / NIMSP** | `state-donors.ts` (`api.followthemoney.org`) | ❌ **No.** Third-party aggregator; the script's own header says *"free for public use; attribution required"* — that is **not** a commercial-resale license. Per the gaps doc, FTM bulk seeded ~18 states. |

**Actions before any donor-data sale:**
1. **Exclude `source = 'followthemoney'`** from any delivered/sold dataset (one-line filter). Or negotiate a commercial license with FollowTheMoney/OpenSecrets if those states are needed.
2. Re-state coverage **on the clean subset only** (FEC + direct-state) — it will be lower than 81%; disclose honestly.
3. Quick **per-state ToU pass** for the direct-scraped states, prioritizing the bot-detection-bypass ones.

### 3.3 CAN2026 enrichment — ❌ do not resell
Single-maintainer scraped site (Paul Zurav LLC) with attribution obligations; `docs/CAN2026_ENRICHMENT_SCHEMA.md` itself frames it as **enrichment, not a resale base**. Keep out of any sold product.

### 3.4 Code & services — ✅ CLEAR
All-rights-reserved to Grey Bird LLC (no OSS license granted). Direct dependencies are permissively licensed (Next/React MIT; `pdfjs-dist`/`tesseract.js` Apache-2.0; `drizzle-orm` MIT) — **no copyleft blocker** for white-labeling or client builds. Services revenue is our labor + our playbook. **Action:** standard client-contract IP terms; nothing blocking.

### 3.5 Runtime-only sources — keep out of sold data
`docs/SOURCE_TIERS.md` lists **OpenSecrets, Ballotpedia, Vote Smart** as sources the **LLM cites at runtime** — they are *not* ingested into the sellable tables, and must stay that way (OpenSecrets data is non-commercial-licensed; Ballotpedia is copyrighted). Same for Google Civic (polling-place lookups are runtime, never stored/sold).

---

## 4. Recommended next steps (in order)

1. **License the election-logistics dataset (1.1).** Cleanest, fastest, zero rights work. Validates that institutions will pay for maintained civic data.
2. **Stand up the setup + freshness retainer (1.3).** Lowest lift; funds everything else.
3. **Carve and deliver the clean donor subset (1.2 + §3.2):** filter out FollowTheMoney rows, re-state coverage, run the ToU pass, then sell as bulk delivery.
4. **Only then** build the donor **API** (2.1). Then legislation feed (2.2, after the tagging fix) and white-label (2.3).

---

## 5. Guardrails (non-negotiable)

- Never weaken the consumer site's privacy promise or sell consumer-side user data.
- Keep commercial and nonpartisan brands legible — consider a separate commercial entity/brand so the free tool's neutrality is never questioned.
- **Resell only sources we've cleared** (§3): FEC + direct-state + our own compilations. Exclude FollowTheMoney, CAN2026, OpenSecrets/Ballotpedia/Vote Smart, and anything Google-Civic-derived until separately licensed.
- Provenance stays on every row (`source` + `source_url` already enforce this) — it's both the compliance backbone and a selling point.

---

## 6. One-line summary

> Three things are sellable **now** — the 50-state election-logistics dataset (rights-clean), the setup/freshness **retainer**, and the **clean donor subset** (FEC + direct-state, minus the FollowTheMoney rows). Everything with "API/SaaS" in the name is one build away; everything touching bill-tagging is a fix away; and the only hard rights blockers are FollowTheMoney (filterable) and CAN2026 (exclude).
