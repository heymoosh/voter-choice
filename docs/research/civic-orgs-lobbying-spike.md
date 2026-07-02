# Civic-Org Memberships & Lobbying Contacts — Research Spike

**Date:** 2026-07-01
**Card:** `[P2] Include unpaid civic orgs and lobbying contacts` (`797088b2-4667-4835-ad6c-a2b59a8cac06`)
**Scope:** Research SPIKE only. No ingest code, no prod writes, no app-code changes. All findings below are from live web research (WebSearch/WebFetch) on 2026-07-01; anything not directly confirmed is labeled UNCONFIRMED.

Origin: Peter Scheipers asked whether the app could show a politician's membership in unpaid civic organizations, plus lobbyist contacts/payments. The backlog's own 2026-06-26 plan note split this into two very different data tracks and asked for a spike to confirm formats/licensing/match-feasibility before scoping a build. This doc is that spike.

---

## Summary

| Question | Track A — Civic-org positions (FD "Positions Held Outside U.S. Government") | Track B — Lobbying (LDA LD-2 quarterly filings) |
|---|---|---|
| **Source format** | Mixed. House Clerk: official bulk annual ZIP is an **index only** (filer name, state/district, filing type, year, PDF link — no schedule content) refreshed daily; actual Schedule E content lives in per-filing PDFs, text-searchable for most modern e-filed reports but scanned images (OCR needed) for paper filers. Senate EFD: e-filed reports render as **structured HTML** per filing (parseable without OCR — confirmed via a working community scraper that extracts a "Part 8. Position" section); paper filings are scanned PDFs. OpenSecrets: pre-parsed CSV "Positions" table, ready to use *if current* (see caveat below — UNCONFIRMED currency). |
| **License / redistribution terms** | Governed by federal statute, not a website ToS — same restriction applies to reports from *either* chamber. Quoted below. Ambiguous fit for a voter-information app; not resolved in this spike. If sourcing via OpenSecrets instead of raw filings, an *additional*, independent CC BY-NC-SA non-commercial restriction applies. |
| **Per-member match feasibility** | High. Filed per named individual + state/district; this app already resolves comparable federal sources by `bioguide_id` (see `scripts/ingest/member-stats.ts`, `federal-votes.ts`, `federal-donors.ts`). OpenSecrets' own ID (`CID`) crosswalks to `bioguide_id` via the public-domain, CC0-licensed `unitedstates/congress-legislators` project — a solved problem, not new work. |
| **Update cadence** | Annual — FD reports filed by May 15 for the prior calendar year, public ~30 days later. House's bulk *index* refreshes daily, but it's metadata only. OpenSecrets cadence is UNCONFIRMED and the public evidence suggests it lags (see caveat). |
| **Go/No-Go** | **GO** — technically feasible, cleanly matchable — but carries two open decisions that belong on the build card, not this spike (see below). | **GO** for the data plumbing (best format and cleanest license of anything reviewed in this spike), but **confirmed NOT per-member** — only client × issue-area × chamber granularity. |

---

## Track A — Civic-org memberships / positions

### What's being disclosed

Annual Financial Disclosure (FD) reports filed by Members of Congress include **Schedule E ("Positions")**: non-governmental positions held (officer, director, trustee, general partner, employee, etc.) with any organization other than the U.S. government, excluding purely honorary positions and religious/social/fraternal/political organizations. This covers board/officer/trustee roles at non-profits and civic groups, paid or unpaid — exactly what the card asked about. Filers must report the current year plus the preceding calendar year. Source: [House Ethics FD Instruction Guide](https://ethics.house.gov/wp-content/uploads/2023/12/FINAL-2021-FD-Instructions_1.pdf).

### Sources checked

1. **House Clerk FD portal** — [disclosures-clerk.house.gov/FinancialDisclosure](https://disclosures-clerk.house.gov/FinancialDisclosure). Search-and-download interface for individual PDFs. Separately, the Clerk publishes an **official annual bulk ZIP** containing a parsed XML index — filer identity, state/district, filing type, year, and a document/PDF link — republished daily as new filings arrive, covering every annual filing index from 2008 onward. This index is **metadata only**; it does not contain schedule content. Getting the actual "Positions" schedule requires downloading and parsing the linked PDF per filer per year. Modern e-filed reports are generally text-searchable PDFs; some (especially older or paper-filed) are scanned images requiring OCR. `fd.house.gov` is the filer-facing e-filing system, not a public data endpoint.
2. **Senate EFD** — [efdsearch.senate.gov](https://efdsearch.senate.gov/search/home/). Per-senator, per-year search and PDF/report access. A working open-source scraper ([jeremiak/us-senate-financial-disclosure-scraper](https://github.com/jeremiak/us-senate-financial-disclosure-scraper)) confirms that **e-filed reports render as structured HTML** ("nice HTML documents... amenable to automated parsing") and that it explicitly extracts a Position section with fields `position-dates`, `position-held`, `entity`, `entity-type`, `comments`, keyed to a standardized filer name pulled from a dropdown (i.e., pre-normalized, not free-text name matching). Paper-filed reports remain scanned PDFs needing OCR/manual review. Senate's e-filed-HTML path is the single cleanest structured-data story found in this whole spike for Track A.
3. **OpenSecrets "Personal Finances" data** — [opensecrets.org/personal-finances](https://www.opensecrets.org/personal-finances), bulk data at [opensecrets.org/open-data/bulk-data](https://www.opensecrets.org/open-data/bulk-data). Ships as a normalized relational dataset (compressed CSV + data dictionary) with dedicated tables: Agreements, Assets and Liabilities, Outside Compensation and Income, Honoraria and Gifts, **Positions**, Transactions, Travel. This would be the least-engineering-effort option — pre-parsed, no PDF/OCR work — **if current** (see caveat).
4. **ProPublica Congress API** — CONFIRMED DEAD. Shut down 2024-07-10; documentation now explicitly marked "historical reference only"; no new API keys issued. ([ProPublica Congress API docs](https://projects.propublica.org/api-docs/congress-api/), corroborating: [threads.com/@jehiah](https://www.threads.com/@jehiah/post/C5g2E36OP30)). Matches this repo's standing memory note — not a viable Track A source.

**Caveat — OpenSecrets Personal Finances currency is UNCONFIRMED and probably stale.** Both `opensecrets.org/open-data/bulk-data-documentation` and `opensecrets.org/personal-finances/methodology` returned HTTP 403 to automated fetch (likely bot-blocking, not a content signal either way — genuinely unconfirmed). But the surrounding public surface is suggestive: their own "Top Net Worth" page is titled/dated **2018** ([opensecrets.org/personal-finances/top-net-worth](https://www.opensecrets.org/personal-finances/top-net-worth)), and their "Freshmen" personal-finances page covers the **116th Congress** (2019–2020) — no 118th/119th Congress (2023–2025) personal-finances page turned up in search. This is circumstantial, not proof, but it means the "cleanest" Track A source may not have current-Congress data. **A live check (one registered API call to `memPFDprofile`, or a direct bulk-CSV pull) is needed before committing to OpenSecrets over raw-portal parsing.**

### License / redistribution terms (quoted)

The underlying restriction is a **federal statute**, not a portal ToS, and it binds the *reports themselves* regardless of which chamber's portal you pull them from:

> "It is unlawful to use the information contained in [a] Statement or [Periodic Transaction Report] for any of the following purposes: (A) any unlawful purpose; (B) any commercial purpose, other than by news and communications media for dissemination to the general public; (C) determining or establishing the credit rating of any individual, or (D) use, directly or indirectly, in the solicitation of money for any political, charitable, or other purpose." Violations are civilly enforceable by the Attorney General for penalties up to $20,731.
> — 5 U.S.C. app. 4 § 105(c)(1),(2), as reproduced/cited by [ethics.senate.gov](https://www.ethics.senate.gov/public/index.cfm/financialdisclosure) and House Ethics instruction guides.

**This is genuinely ambiguous for voter-choice and is not something this spike can resolve.** The app's intended use — surfacing disclosed board/officer positions to help voters, free, without soliciting money — plausibly fits "news and communications media for dissemination to the general public," but voter-choice isn't a traditional news outlet, and there's no known precedent testing the statute against a civic-tech voter-information product. **This is the #1 open decision for the follow-on card.**

If sourcing via **OpenSecrets** instead of/in addition to raw filings, a second, independent license layer applies:

> "Use of this OpenSecrets.org API (Service) is provided free for educational, research, and non-commercial use." Data is released under "Creative Commons license Attribution Non-Commercial Share Alike." Users agree to "Not sell or otherwise use the data provided via this Service for other commercial purposes, including republishing, without our expressed written permission," and may not "scrape and/or store a collection of Provider's data on your server."
> — [OpenSecrets API Terms of Service](https://www.opensecrets.org/open-data/api-terms-of-service)

Two implications worth flagging explicitly: (1) if voter-choice has *any* commercial dimension, CC BY-NC-SA conflicts with that outright — independent of the EIGA question above; (2) the no-store/no-mirror clause is in tension with this app's normal ingest-and-cache architecture (used for donor data, votes, etc.) — using OpenSecrets as a source would likely mean live per-request lookups rather than a bulk ingest, a different integration shape than the rest of the codebase, or a written-permission ask to OpenSecrets.

### Per-member match feasibility

High. FD reports are filed per named individual with state/district, so name+state/district matching (the pattern already used across `scripts/ingest/member-stats.ts`, `federal-votes.ts`, `federal-donors.ts`, `press-release-matcher.ts` — all confirmed grep hits for `bioguide` in this repo) applies directly; Senate's e-filed HTML even ships a pre-normalized filer name. If OpenSecrets is used instead, its `CID` identifier crosswalks to `bioguide_id` for free via the public-domain (CC0 1.0) [unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) project, which maintains a maintained id crosswalk (bioguide, opensecrets, govtrack, fec, wikidata, etc.) across `legislators-current.yaml`/`legislators-historical.yaml`. Not novel work either way.

### Update cadence

Annual, statutory: FD reports due May 15 for the prior calendar year, released publicly ~30 days after filing (so new-year data lands roughly mid-June). House's bulk *index* ZIP refreshes daily but, again, is metadata-only — new schedule *content* only appears once you fetch/parse the linked PDF. OpenSecrets cadence is unconfirmed (see caveat above).

### Go/No-Go — Track A: **GO**

Feasible on every axis this spike was asked to check — format (Senate HTML is genuinely clean; House PDF parsing is a known, bounded problem), per-member matching (solved pattern in this codebase), and cadence (annual, predictable). The reason this isn't an unconditional "start building": (1) the EIGA statutory fit is a real open legal/product question, not an engineering one, and (2) OpenSecrets' currency is unconfirmed and may force a fallback to raw-portal PDF/HTML parsing (more work, but sidesteps the OpenSecrets-specific CC BY-NC-SA restriction). Both are carried onto the follow-on card below as explicit open decisions rather than resolved here.

---

## Track B — Lobbying (LDA LD-2 quarterly filings)

### What's being disclosed

Registrants (lobbying firms/in-house lobbyists) file quarterly **LD-2** Activity Reports naming the client, the general issue-area code(s) lobbied, a free-text "specific issues" description, the lobbyist(s) involved, an income/expense bracket, and — critically — **only the chamber(s) or agency(ies) contacted**, e.g. "Senate," "House of Representatives," "Department of Agriculture." Instructions explicitly tell filers to name the chamber/agency, **not the individual office**, and to check "none" if there were no contacts that quarter. Source: [Instructions for Form LD-2](https://www.senate.gov/reference/resources/pdf/LD2_Instructions.pdf); confirmed against live sample filings on lda.senate.gov.

### Sources checked

1. **Senate LDA system** — public REST API, now consolidating onto **[lda.gov](https://lda.gov/api/)** (redoc: [lda.gov/api/redoc/v1/](https://lda.gov/api/redoc/v1/)). Returns JSON per filing — the cleanest, most structured format of anything reviewed in this entire spike; no PDF or OCR work anywhere. Anonymous access is allowed (15 req/min); a free registered API key raises the limit to 120 req/min ([registration](https://lda.senate.gov/api/register/)). **Operational note, time-sensitive:** `lda.senate.gov` carries a banner that the site **"will no longer be available after 06/30/2026"** in favor of `lda.gov` — and today is 2026-07-01, i.e. that cutover window has just closed or is closing now. Any build work should target `lda.gov` from day one, not `lda.senate.gov`. There is also a legacy **bulk quarterly XML download** ([senate.gov/legislative/Public_Disclosure/database_download.htm](https://www.senate.gov/legislative/Public_Disclosure/database_download.htm)) covering 1999–2022, but that page itself points users to the newer API/query system for anything current — the REST API is the live path, not the old bulk XML.
2. **House side** — [lobbyingdisclosure.house.gov](https://lobbyingdisclosure.house.gov/). Per HLOGA §209, the House Clerk and Senate Secretary jointly administer public access to the *same* underlying LD-1/LD-2 filings; no separate or better-structured House-only data was found, and the Senate API already surfaces filings from registrants regardless of chamber, so this wasn't pursued further.
3. **OpenSecrets lobbying aggregates** — [opensecrets.org/federal-lobbying](https://www.opensecrets.org/federal-lobbying). Rolled up to client/industry/year; doesn't add any per-member resolution beyond what's already in (or absent from) raw LD-2 data, and carries the same CC BY-NC-SA non-commercial restriction described under Track A.

### License / redistribution terms (quoted)

> "Users of the public API should cite the date that data were accessed or retrieved using the API" and must state that "Senate Office of Public Records cannot vouch for the data or analyses derived from these data after the data have been retrieved from LDA.gov." "Users may not modify or falsely represent content accessed through LDA.gov and still cite the source as LDA.gov." Services are provided "as is" and "as-available," with no warranty.
> — [LDA.gov API Terms of Service](https://lda.senate.gov/api/tos/)

No non-commercial or no-redistribution clause was found for the LDA API — the underlying filings are a **statutorily mandated public dataset**: "the Clerk of the House of Representatives and the Secretary of the Senate [must] make all documents filed under the [Lobbying Disclosure Act] ... available to the public over the Internet" (HLOGA §209). This is the cleanest license posture of any source reviewed in this spike — attribution + accessed-date citation + no misrepresentation, and that's it. (If OpenSecrets' aggregated view is used instead of/alongside the raw LDA API, its CC BY-NC-SA non-commercial restriction — quoted under Track A — would still apply to that specific data.)

### Per-member attribution weakness — CONFIRMED

The card's own framing is correct and this spike confirms it directly from the form instructions: LD-2 filers disclose **only the chamber or agency** contacted, never a specific Member of Congress — there is no field for it on the form. (A *different* LDA form, LD-203, discloses lobbyist campaign contributions/bundling and can sometimes reference specific candidates or committees, but that's out of scope — the card and this spike are about LD-2 specifically.) Net: Track B data is usable at **client × issue-area × chamber** granularity only, never "this lobbyist contacted Rep. X."

### Update cadence

Quarterly, statutory — LD-2 is due within 20 days of each calendar quarter's end. This is the most current/frequent of every source reviewed in this spike (versus Track A's annual cadence).

### Go/No-Go — Track B: **GO** (for the data plumbing; not per-member)

Best format (full public JSON API, zero PDF/OCR work), cleanest license of anything in this spike, and the fastest update cadence. The open question isn't feasibility, it's product framing: this data can only ever describe *issue-area lobbying activity near a chamber*, never a member-specific "lobbying contact." Whether/how voter-choice surfaces that — and how to avoid implying a false member-specific link, given [the repo's own labeling principle](../operations/voter-choice-backlog.md) of disclosure-not-accusation — is a product call, not resolved here.

---

## Drafted follow-on build card

Both tracks came back GO from this spike, so one combined card is drafted below (matching the parent card's own two-track structure). The licensing/product judgment calls are written as **explicit open decisions on the card itself**, per this spike's brief — they are not decided here.

> **[P2] BUILD: Civic-org positions (Track A) + lobbying issue-context (Track B)**
>
> - From SPIKE (`docs/research/civic-orgs-lobbying-spike.md`, 2026-07-01): both tracks are technically feasible and per-member (Track A) or per-issue (Track B) matchable. This card scopes the ingest + UI. Split into two sub-scopes below; either can ship independently.
> - **OPEN DECISION (Track A, legal/product — not decided by the spike):** does voter-choice's use of Financial Disclosure "Positions Held" data fit the 5 U.S.C. app. 4 § 105(c) carve-out for "news and communications media... dissemination to the general public"? If unclear, consider: (a) legal input before building, or (b) building read-only/citation-linked (always link back to the official filing, never claim to be the disclosure of record) to reduce exposure either way.
> - **OPEN DECISION (Track A, product):** if OpenSecrets' Personal Finances data is confirmed stale (do one live check — a registered `memPFDprofile` API call or bulk-CSV pull — before deciding), do we accept building directly against House/Senate raw portals (PDF text-extraction + Senate e-filed-HTML parsing, more engineering, no OpenSecrets non-commercial/no-mirror restriction) instead?
> - **OPEN DECISION (Track B, product):** should voter-choice surface issue/client-level lobbying data at all, given it can never be tied to a specific member's vote or position? If yes, how is it framed/labeled to make the client×issue×chamber granularity unmistakable (e.g., "X organizations lobbied the Senate on [issue] this quarter" — never "lobbied Sen. Y")?
> - Scope — Track A: `member_civic_positions` (or similar) table keyed by `bioguide_id`; ingest job against Senate EFD e-filed HTML (primary, structured) + House Clerk PDF text-extraction (fallback, may need OCR for scanned filers) or OpenSecrets bulk CSV (pending currency check above); annual refresh; always link the source filing (PDF/HTML) alongside any surfaced position, consistent with the "disclosure not accusation" principle already used for donor/stock-adjacent cards.
> - Scope — Track B: `lobbying_issue_activity` (or similar) table, NOT member-keyed — keyed by (client, issue-area code, chamber, quarter); ingest job against the `lda.gov` REST API (register for an API key; do not use `lda.senate.gov`, which is being retired ~2026-06-30); quarterly refresh; render as issue-level context only, never attached to an individual member's record.
> - Validate before building (fail-open, like `congress-press`): confirm current OpenSecrets Personal Finances coverage with one live API call; confirm `lda.gov` API key registration works and returns current-quarter data.
> - GROOMED: pending — carries two Track-A open decisions + one Track-B open decision above; do not auto-promote to BUILD without those being addressed (or explicitly deferred) first.
> - STATUS: Backlog

---

## What this spike did not do

No data was fetched from any of these sources beyond what public documentation/sample pages show. No ingest code was written. No database schema was touched. No prod credentials were used. This is a desk review of public documentation, terms-of-service pages, and community open-source scrapers (used only to confirm data *shape*, not run against prod).
