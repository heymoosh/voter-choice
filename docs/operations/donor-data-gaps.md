# Donor Data Gaps

**Last updated:** 2026-05-14  
**Overall coverage:** 6,771 / 8,357 state legislative candidates (81%)

This document records states where donor data is incomplete at launch, what's blocking completion, and what it would take to unblock each one.

---

## Hard Blockers — Cannot Be Automated

These states have genuine structural barriers. No amount of additional scripting will move them significantly.

### Kansas — 0% (0/151 candidates)

**Why blocked:**  
The Kansas Ethics Commission portal (`ethics.ks.gov`) has a broken SSL certificate that causes a `net::ERR_CERT_COMMON_NAME_INVALID` error in all browsers. The HTTP fallback returns 403 Forbidden to all non-browser clients. The HTTPS redirect chain is malformed (redirects to `http://ethics.ks.govCFAOnline/...` with a missing slash). The portal is on the kansas.gov shared hosting infrastructure with no alternative bulk export URL.

**What it would take:**  
- KS Ethics Commission fixes the SSL certificate (requires their IT team)  
- OR KS publishes a bulk CSV export at a different URL  
- OR someone manually downloads the data (requires navigating the portal interactively in a real browser and hand-extracting CSV exports per candidate — 151 candidates)

**Workaround estimate:** ~4 hours of manual work if the portal is accessible in a browser; ~0 hours of automated work currently possible.

---

### Mississippi — 8% (13/165 candidates)

**Why blocked:**  
Mississippi's campaign finance portal (MS SOS electronic filing system) was disabled in 2023. No new electronic data has been available since. The 13 candidates with data were ingested from pre-2023 records. Paper filings dominate Mississippi legislative races; most state legislators file on paper rather than electronically.

**What it would take:**  
- MS SOS re-enables the electronic filing portal  
- OR a third party (e.g., Mississippi Secretary of State's public records office) provides bulk exports

**Workaround estimate:** Not currently possible. Contact `sos@sos.ms.gov`.

---

### Wisconsin — 7% (12/163 candidates)

**Why blocked:**  
Wisconsin's CFIS (Campaign Finance Information System) at `campaignfinance.wi.gov` is accessible via API. However, only 13 of 163 WI state legislative candidate committees have filed any contributions electronically in 2023–2024. The API was fully scanned (550+ pages, 27,500+ contribution rows) — those 13 committees are the only ones with electronic filings. Wisconsin's campaign finance law does not require electronic filing for committees below ~$10,000, and most WI Assembly and Senate campaigns operate below that threshold or prefer paper filing.

**What it would take:**  
- WI legislature amends campaign finance law to require electronic filing for all candidates  
- OR the Wisconsin Democracy Campaign (`wisdc.org`) provides a data partnership (they have more comprehensive WI data compiled from paper filings)  
- OR manual entry of paper filings (2,200+ paper reports, clearly infeasible)

**Workaround estimate:** Data partnership with Wisconsin Democracy Campaign would be fastest. Contact `wisdcampaign@wisdc.org`.

---

## Soft Blockers — Technically Possible, High Effort

These states have data accessible in principle but require significant manual or session-based work to retrieve.

### Wyoming — 26% (23/90 candidates)

**Why blocked:** Wyoming's CFR (Campaign Finance Registry) electronic system only has data for candidates who file electronically. Most WY state legislators file on paper — Wyoming has no electronic filing mandate, and with a legislature of 90 members, many campaigns are small enough to operate entirely on paper.

**What it would take:** Manual download of individual filings from `cfr.wyo.gov` — each paper filing is a separate PDF. The 67 missing candidates likely have no electronic records.

---

### Oregon — 36% (32/90 candidates)

**Why blocked:** Oregon's ORESTAR portal has a Web Application Firewall (WAF) that blocks all automated requests. A Playwright-based scraper exists (`or-orestar-donors.ts`) but CSRF tokens expire after ~40 minutes, making full-state scraping unreliable. Additionally, many 2022 Oregon Senate candidates (who last ran in 2022, not 2024) aren't captured by the 2024 committee list.

**What it would take:**  
- Playwright-based scraper run manually in a browser session (possible but takes ~3 hours of active monitoring)  
- OR Oregon SOS provides a bulk export endpoint  
- OR the script is refactored to run faster within a single CSRF session

**Estimated improvement:** Could reach ~60% with a dedicated manual session; ~75% is the ceiling given 2022 Senate data availability.

---

### Alaska — 46% (47/103 candidates)

**Why blocked:** APOC (Alaska Public Offices Commission) campaign finance exports require a valid ASP.NET session established by navigating specific search pages. The session state is server-side only and cannot be reconstructed via API calls. A Playwright-based solution exists in principle but wasn't implemented.

**What it would take:** Playwright script that:  
1. Navigates to APOC search  
2. Performs a search  
3. Clicks "Export All"  
4. Captures the resulting CSV download  

**Estimated improvement:** ~75–80% with a working Playwright scraper.

---

### New Hampshire — 46% (117/253 candidates)

**Why blocked:** NH has no electronic filing mandate. Campaigns raising less than $1,000 total don't file. Given NH's 400-member House — the largest state legislature in the country — most members represent tiny districts and raise little money. The 103 House members without data are structurally beyond the filing threshold ceiling.

**What it would take:** NH changes its filing threshold law. No technical workaround exists.

---

## Data Quality Ceilings — Electronic Data Exhausted

These states are fully scraped. The missing candidates simply don't have electronic contribution records.

| State | Coverage | Note |
|-------|----------|------|
| AZ | 67% House, 77% Senate | Pre-aggregated totals; many AZ candidates report $0 contributions |
| PA | 67–68% | Tried 2021, 2022, 2024 — no additional records found |
| GA | 71–72% | GA eFile API ceiling; paper filing candidates not in system |
| NY | 72–80% | NY BOE committee-name matching ceiling |
| HI Senate | 60% | 2020–2022 contribution period not in bulk CSV export |
| IL | 78–80% | All-time Illinois Sunshine data captured |
| VT | 78–79% | Many VT candidates below filing threshold |

---

## What's Working Well

43 of 50 states have ≥ 80% coverage. 18 states are at 90–100%.

| Coverage | States |
|----------|--------|
| 100% | AL (House), ND (Senate), OK (Senate), NM (Senate), NJ (Senate), CT (Senate), AL (Senate) |
| 95–99% | WA, MN, IN, MT, MD, MI, IN, ND, UT, MA, OK, MT, KY, ID, SC, NV |
| 90–94% | CO, CA, WA, CT, UT, MO, MD, OH, FL, LA, WV, IA, DE, TX, SC, TN, RI, ME |
| 80–89% | FL, TN, OH, LA, AR, RI, VA, CA, MO, IA, NJ, KY, NC, TX, NM, NC, ME, NY |

---

## If We Had More Time

Ranked by impact-per-hour:

1. **Alaska Playwright scraper** (~8 hours dev, +56 candidates): The pattern exists from ND and TN scrapers. APOC has a predictable form-based export.

2. **Oregon dedicated session** (~3 hours manual, +20–30 candidates): Run the existing Playwright script in a controlled session with CSRF token refresh.

3. **Wisconsin Democracy Campaign partnership** (~1 email + data import, +100+ candidates): They have compiled WI paper filings.

4. **Kansas manual download** (~4 hours, +100+ candidates): If the portal SSL is fixed, bulk CSV export per year/office is available through the browser interface.
