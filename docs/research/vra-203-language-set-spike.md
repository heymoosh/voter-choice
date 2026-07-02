# VRA §203 Language-Set Research Spike

**Date:** 2026-07-02
**Card:** `[P2] Research spike: confirm the major-language translation set (VRA §203 coverage)` (`d885108b`)
**Parent:** `[P1] Translations to major languages` (`2b325135-bafc-454f-b253-5bce21e05a13`)
**Scope:** Research SPIKE only. No changes to `src/lib/translations.ts`, the `ballotPromptEn`/`ballotPromptEs` variants, or any UI copy. All findings below are from live web research (WebSearch/WebFetch) on 2026-07-02; anything not directly confirmed from a primary/near-primary source is labeled UNCONFIRMED.

Origin: the parent translation epic has an open TBD — the app is English + Spanish today, and before adding more languages it asked to "choose the set deliberately rather than 'all major world languages.'" The suggested starting point was Voting Rights Act §203 (Chinese, Vietnamese, Korean, Tagalog, + applicable Native American / Alaska Native language groups). This spike confirms or revises that list against the actual statute and the latest Census Bureau determinations.

---

## Summary / Recommendation

**Verdict: the card's suggested list is CONFIRMED as a legally-grounded, well-chosen Tier-1 set — with one framing correction on the Native American / Alaska Native line (see §4).**

| Tier | Languages | Legal basis | Note |
|---|---|---|---|
| **0 — done** | Spanish | 52 U.S.C. §10503; largest §203 group by far (statewide in CA/FL/TX + 232 subdivisions) | Already shipped |
| **1 — recommended next** | Chinese, Vietnamese, Korean, Tagalog | Each is 1 of the 8 Asian-American language groups triggered nationally under the 2021 §203 determination, and each ranks among the largest by covered population/jurisdiction reach ([Census 2021 press release](https://www.census.gov/newsroom/press-releases/2021/section-203-voting-rights-act.html), [NARF summary](https://narf.org/2021-voter-language-assistance-jurisdictions/), [MPI LEP data](https://www.migrationpolicy.org/programs/data-hub/charts/top-10-languages-spoken-limited-english-proficient-us-residents-and-lep)) | Matches the card's suggestion exactly |
| **2 — candidates, not required** | Cambodian (Khmer); Navajo (if AIAN support is pursued at all) | Cambodian is LA County's 5th non-Spanish §203 language; Navajo is the single largest AIAN language by a wide margin (~161–167K speakers, ~47% of all Native North American language speakers — [Census 2025 story](https://www.census.gov/library/stories/2025/06/native-american-language-use.html)) | Real but thinner federal footprint than Tier 1 |
| **3 — legally real, likely skip** | Bengali/Bangladeshi, Hmong, "Asian Indian" group (Hindi/Gujarati/Punjabi — no single clean target language), remaining ~90 hyper-local AI/AN tribal languages | Each is §203-covered somewhere, but only 1–3 jurisdictions each (Bengali, Hmong) or ambiguous as to which specific language to ship (Asian Indian), or tied to a single reservation (most AI/AN languages) | Not nationally scalable |
| **Explicitly NOT §203-anchored** | Arabic, Russian (and others: Haitian Creole, Portuguese, French, Somali...) | None — excluded from §203 by *statutory category*, not population size. Both rank in the top 10 US languages by LEP population per MPI data, yet no jurisdiction is required to translate for them under §203 because Arabic/Russian speakers don't fall within the "American Indian, Asian American, Alaska Native, or Spanish heritage" ancestry buckets the statute uses ([NPR/GPB](https://www.gpb.org/news/2022/06/27/federal-law-requires-translated-voting-ballots-not-in-arabic-or-haitian-creole)) | Would need a separate, population-driven rationale — a different kind of decision than extending §203 |

**This spike does not decide the shipped set — that's Muxin's product/legal call, especially Tiers 2–3 and any population-driven additions beyond the legal anchor.**

---

## 1. How §203 coverage actually works

Voting Rights Act §203, codified at **52 U.S.C. § 10503** ("Bilingual election requirements"), defines the covered language-minority groups in subsection (e):

> "the term 'language minorities' or 'language minority group' means persons who are American Indian, Asian American, Alaskan Natives, or of Spanish heritage."
> — [52 U.S.C. § 10503, via Cornell LII](https://www.law.cornell.edu/uscode/text/52/10503)

This **confirms the card's four-bucket framing exactly**: Spanish, Asian, American Indian, Alaska Native — nothing else.

Coverage is a **jurisdiction-by-jurisdiction determination**, not a national language list. Per §203(b)(2)(A) (10503(b)), the Census Bureau Director must designate a state or political subdivision as covered if:

> "more than 5 percent of the citizens of voting age of such State or political subdivision are members of a single language minority and are limited-English proficient" **OR** "more than 10,000 of the citizens of voting age of such political subdivision are members of a single language minority and are limited-English proficient" **OR**, for a subdivision containing all or part of an Indian reservation, "more than 5 percent of the American Indian or Alaska Native citizens of voting age within the Indian reservation are members of a single language minority" — **AND** "the illiteracy rate of the citizens in the language minority as a group is higher than the national illiteracy rate" (illiteracy defined as failure to complete the 5th grade).
> — [52 U.S.C. § 10503(b), via Cornell LII](https://www.law.cornell.edu/uscode/text/52/10503)

The 2006 VRA reauthorization extended §203 through 2032 and moved the determination cadence from every 10 years to **every 5 years**, using **American Community Survey (ACS) 5-year estimates** as the primary data source ([Census.gov, "Section 203 Language Determinations"](https://www.census.gov/programs-surveys/decennial-census/about/voting-rights/voting-rights-determination-file.html); [Census 2021 press release](https://www.census.gov/newsroom/press-releases/2021/section-203-voting-rights-act.html)).

**Key structural point for this app:** §203 was built to tell one county "you must translate for LEP group Y," not to define a national priority list. voter-choice is a federal congressional tool used everywhere, not tied to one covered jurisdiction — so "the §203 language set" for this app necessarily means the *union* of what's triggered somewhere, not any single determination's list. That union is a defensible anchor (it's real, government-mandated coverage, not invented), but it doesn't perfectly track national LEP population size either — see §4.

---

## 2. The latest determination (2021) — languages and reach

Published **December 8, 2021**, based on **2015–2019 ACS 5-year estimates** ([Census.gov press release](https://www.census.gov/newsroom/press-releases/2021/section-203-voting-rights-act.html)). This is confirmed as still the **most recent** determination: the Census Bureau's own determinations page lists only 2002, 2011, 2016, and 2021 as published cycles, with no 2026 release found as of this research ([Census.gov determination-file page](https://www.census.gov/programs-surveys/decennial-census/about/voting-rights/voting-rights-determination-file.html)). The next determination is expected around **December 2026** (5-year cycle from 2021) — **UNCONFIRMED exact date, and given today's date this could land within months; worth a re-check before this work ships.**

**Sourcing caveat:** `federalregister.gov` and `justice.gov` both blocked direct automated fetch during this spike (bot-protection redirect / 403). The figures below are corroborated across multiple independent secondary sources (Census Bureau's own press release, Native American Rights Fund, Election Assistance Commission, Asian Americans Advancing Justice–AAJC, Lawyers' Committee for Civil Rights Under Law) rather than verified against the primary Federal Register notice text directly. They agree with each other consistently, which is reasonable confidence, but flagging the gap for honesty.

### Overall reach

- **331 jurisdictions** (counties and minor civil divisions) plus **3 full states**, covering **24,244,810** voting-age citizens total.
- By group: **20,386,604 Hispanic**, **3,621,264 Asian**, **236,942 American Indian and Alaska Native** voting-age citizens in covered jurisdictions.
— [Census 2021 press release](https://www.census.gov/newsroom/press-releases/2021/section-203-voting-rights-act.html)

### Spanish — largest by a wide margin

Statewide in **California, Florida, and Texas**, plus **232 political subdivisions across 26 states**. By far the largest group by both population and geographic reach. — [NARF, "New Determination On Jurisdictions to Provide Language Assistance to Voters"](https://narf.org/2021-voter-language-assistance-jurisdictions/)

### Asian languages — 32 subdivisions, 14 states

The specific Asian-American ACS-defined groups triggered nationally in 2021: **Asian Indian, Bangladeshi (Bengali), Cambodian (Khmer), Chinese, Filipino (Tagalog), Hmong, Korean, Vietnamese** — 8 groups total. — synthesized from [EAC language access resources](https://www.eac.gov/language-access-resources) and [AAJC "Language Rights in Voting"](https://www.advancingjustice-aajc.org/language-rights-voting), cross-checked against [NARF](https://narf.org/2021-voter-language-assistance-jurisdictions/)

- 2021 changes vs. 2016: added jurisdictions for **Chinese (+1)**, **Vietnamese (+3)**, **Filipino (+3)**, **Bengali/Bangladeshi (+1)**, and **Hmong newly triggered** (a Minnesota subdivision) — search-synthesized from Census/Advancing Justice coverage; not independently verified against the primary FR table.
- **Los Angeles County, CA remains the single jurisdiction required to provide the most languages nationally: 6 total — Spanish, Cambodian, Chinese, Filipino, Korean, Vietnamese.** — [NARF](https://narf.org/2021-voter-language-assistance-jurisdictions/)
- Note on naming: the Census/ACS category is **"Filipino"** (an ethnicity/ancestry group); the language actually printed on ballots for that group is **Tagalog**. The card's use of "Tagalog" is the correct implementation-level language name for that §203 group.
- Note on "Asian Indian": this ACS category doesn't map to one language — South Asian immigrants to the US speak Hindi, Gujarati, Punjabi, and others. There's no single clean "the language" for this group the way there is for Chinese/Korean/Vietnamese/Tagalog. Flagged as a real practical gap if this group is ever pursued (Tier 3 above).

### American Indian languages — 94 subdivisions, 12 states

Up sharply from 35 subdivisions in 9 states in 2016. Coverage was lost in California, Connecticut, and Iowa but newly added in Florida, Idaho, Minnesota, Nevada, and Wisconsin — search-synthesized from NARF's summary of the determination, UNCONFIRMED against the primary FR text.

Specific tribal languages named across these determinations include **Navajo**, plus dozens of others region-specific to individual reservations. Navajo is overwhelmingly the largest by national speaker count:

> "Roughly half (47%) of those who spoke a Native North American language spoke Navajo" — approximately **161,174 speakers** (2017–2021 ACS). Other prominent languages: Cherokee (10,440), Choctaw (9,635), Zuni (9,615), Hopi (7,105).
> — [Census.gov, "In Some States, Native North American Languages Were Among the Most Spoken Languages Other Than English" (2025)](https://www.census.gov/library/stories/2025/06/native-american-language-use.html)

### Alaska Native languages — 12 subdivisions (down from 15 in 2016)

All within Alaska. Named languages include **Central Yupik (Yup'ik)**, **Inupiaq**, and **Central Siberian Yupik**, among the most-spoken non-English languages in Alaska per Census data — [Census.gov Native American language story](https://www.census.gov/library/stories/2025/06/native-american-language-use.html); jurisdiction count via [NARF](https://narf.org/2021-voter-language-assistance-jurisdictions/).

### What this means for "most widespread"

By **jurisdiction count**, American Indian languages (94 subdivisions) actually outnumber Asian languages (32 subdivisions) — but by **population**, Asian-language citizens covered (3.6M) dwarf AI/AN citizens covered (237K) by roughly 15x. The reason: AI/AN §203 coverage is triggered by dozens of small, reservation-specific languages each clearing a *local* 5%-of-reservation threshold, while Asian-language coverage concentrates in fewer, much larger jurisdictions (major counties). This directly informs the Tier 2/3 split below — AI/AN coverage is legally real and broad in *jurisdiction count*, but not translatable into one or two "big" languages the way Spanish/Chinese/Vietnamese/Korean/Tagalog are, except for Navajo.

---

## 3. Confirm/revise verdict on the card's suggested list

The card suggested: **Chinese, Vietnamese, Korean, Tagalog, + applicable Native American / Alaska Native language groups** (beyond Spanish, already shipped).

**Chinese, Vietnamese, Korean, Tagalog — CONFIRMED, no changes recommended.** All four are:
1. Squarely within the statutory Asian-American §203 category (4 of the 8 nationally-triggered Asian language groups in the 2021 determination).
2. Among the largest by both jurisdiction reach and covered population — they match 4 of LA County's own 5 non-Spanish languages (the single most multilingual jurisdiction in the country), and independently rank among the largest Asian languages by LEP population nationally: Chinese ~1.6M LEP speakers (6.4% of the national LEP population), Vietnamese ~850K (3.4%), Korean ~630K (2.5%) — [Migration Policy Institute, search-synthesized from their LEP data hub](https://www.migrationpolicy.org/programs/data-hub/charts/top-10-languages-spoken-limited-english-proficient-us-residents-and-lep) (direct chart fetch was blocked by a 403; figures via corroborated search snippets — UNCONFIRMED against the primary chart, worth a manual look before citing externally). Tagalog's specific national LEP population figure wasn't independently pinned in this spike (labeled uncertain) but it is one of Hawaii's top 3 LEP languages and one of the 8 nationally-triggered §203 Asian groups.
3. Missing nothing obviously bigger: the one plausible addition is **Cambodian (Khmer)** — LA County's 5th non-Spanish §203 language and one of the 8 nationally-triggered groups — but it's smaller nationally than the card's 4 (2 fewer jurisdictions triggered in the LA-County comparison set, and not independently showing up in top-10 US LEP rankings). Placed as a Tier 2 candidate, not a required addition.

**"Native American / Alaska Native language groups where covered jurisdictions require them" — CONFIRMED as a real legal category, but the framing needs revision for this app.** The category is legally real (94 AI subdivisions/12 states + 12 AK subdivisions in 2021), but it is not one translatable "language" — it's ~90+ distinct, hyper-local tribal languages each tied to a specific reservation/subdivision's determination, with no single AI/AN language coming close to the breadth of Spanish/Chinese/Vietnamese/Korean/Tagalog except **Navajo** (161K+ speakers, ~47% of all Native North American language speakers nationally — [Census 2025](https://www.census.gov/library/stories/2025/06/native-american-language-use.html)). Recommendation: either (a) name Navajo specifically as the one AI/AN language worth a general-purpose translation, or (b) treat full AI/AN §203 parity as explicitly out of scope for a national tool and say so, rather than carrying an open-ended "Native American / Alaska Native" line that can't actually be closed out. This is a framing correction, not a rejection of the underlying legal premise.

---

## 4. Legal-coverage-driven vs. population-driven set selection — the tradeoff

**Legal-coverage-driven (§203-anchored), as the card proposes:**
- Defensible on its face — it's the actual federal baseline many local election offices already implement, not an invented list.
- Bounded and closable — the 2021 determination gives a finite, citable list (Tier 1–3 above), rather than an open-ended "translate into every language spoken in America" scope.
- **Weakness:** §203 coverage is inherently *jurisdiction-local*, not national. It both over-includes (dozens of thin, single-reservation AI/AN languages; 1–3-jurisdiction Bengali/Hmong footprints) and under-includes relative to true national LEP population size — most notably **Arabic and Russian**, both of which place in the top 10 US languages by LEP population per Migration Policy Institute data, yet are excluded from §203 entirely because Arabic and Russian speakers don't fall within the statute's four ancestry categories (American Indian, Asian American, Alaska Native, Spanish heritage) — a categorical exclusion, not a population judgment. Haitian Creole is the sharpest example: the Census Bureau classifies it as an Indo-European language, so despite a well-documented voting-rights history (Miami-Dade, FL post-2000), its speakers don't qualify as "Asian American" or any other covered bucket and receive no federal translation mandate anywhere — confirmed via [NPR/GPB, "A federal law requires translated voting ballots, but not in Arabic or Haitian Creole"](https://www.gpb.org/news/2022/06/27/federal-law-requires-translated-voting-ballots-not-in-arabic-or-haitian-creole).

**Population-driven (largest-LEP-population, ignoring §203):**
- Broader real-world reach — would likely add Arabic, Russian, and arguably Haitian Creole/Portuguese/French depending on threshold.
- **Weakness:** no external legal anchor. Every inclusion/exclusion becomes a defend-it-yourself product judgment ("why Arabic but not Somali?") rather than "we're matching a federal mandate." Given the card's own instruction to choose deliberately "rather than all major world languages," this path reintroduces exactly the scope-creep risk the card was trying to avoid.

**Recommendation:** anchor Tier 1 in §203 (as the card already proposed) specifically *because* that anchor is what makes the choice non-arbitrary and finite. If Muxin wants to go beyond §203 to chase raw LEP population (e.g., add Arabic/Russian), that should be a distinct, explicitly-labeled decision — not folded into "more §203 languages" — since it trades away the legal-defensibility rationale for a different (also legitimate, but different) rationale of maximizing reach. Both are reasonable; they're just not the same decision, and the sign-off on which one(s) to take is Muxin's.

---

## What this spike did not do

No changes were made to `src/lib/translations.ts`, the `ballotPromptEn.generated.ts` / `ballotPromptEs.generated.ts` system-prompt variants, or any UI copy. No code was written. This is a desk review of public Census Bureau, DOJ, EAC, NARF, AAJC, Lawyers' Committee, Migration Policy Institute, and news-media documentation. Two primary sources (`federalregister.gov`, `justice.gov`) blocked direct automated fetch during this research; findings that rely on them are sourced through corroborated secondary summaries instead and flagged accordingly above. The 2026 §203 determination (expected ~December 2026) had not been published as of this research — this doc should be re-checked against it before the translation work ships if the timing overlaps.
