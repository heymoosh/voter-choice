# Pattern Taxonomies

Canonical owner of donor-bucket vocabulary, per-office retrospective metric vocabulary, and proposition pattern set definition. Referenced by `docs/BALLOT_PROMPT.md` Act 3 and used as a verification reference for any prompt-side validation.

**Scope:** Vocabularies and definitions only — no chat-flow rules.

---

## Donor bucket vocabulary

Fixed ~20 categories. The model picks 2–4 per candidate from this list. Labels must be used verbatim. If a candidate's funding cannot be expressed as 2–4 of these, emit `donorUnavailable`.

- Real estate & development
- Oil, gas & energy
- Healthcare industry
- Pharmaceutical & medical device
- Finance, banking & insurance
- Technology
- Legal industry
- Agriculture
- Telecom & utilities
- Retail & hospitality
- Trade unions (non-public-safety)
- Public safety unions
- Education employees
- Small individual donors (under $200) — individual contribution under $200 per donation; aggregated by dollar amount, not by donor count
- Large individual donors ($200+)
- Self-funded
- Party committees
- Issue-aligned PACs — \<issue\>  *(suffix the live issue, e.g., "Issue-aligned PACs — gun rights")*
- Other

---

## Retrospective metric vocabulary by office type (Texas)

Model selects 1–4 per incumbent. Names from the list verbatim. If the office isn't here or no metric is assemblable: emit `retrospectiveUnavailable`.

### District Attorney

- Felony conviction rate
- Case backlog (open cases over 12 months)
- Exoneration count over term
- Average time to disposition
- Diversion program enrollment

### District / County Court Judge

- Reversal rate on appeal
- Median case clearance time
- Pending caseload at term end
- Median time to first hearing

### Appellate Judge (state or federal)

- Reversal rate by the higher court
- Authored opinions count
- Recusal rate

### County Commissioner / Commissioners Court

- Bond program execution rate
- Property tax rate change over term
- Capital projects completed on time
- Public meeting attendance

### Sheriff / Constable

- Reported crime trajectory in jurisdiction
- Response time trend
- Use-of-force incidents per 1k contacts
- Jail population vs. capacity

### City Council / Mayor

- Budget vote alignment with platform
- Public meeting attendance
- Permit / housing approvals over term
- 311 / constituent service resolution rate

### State Representative / State Senator

- Bills authored that became law
- Floor vote attendance
- Committee attendance
- Roll-call alignment with platform

### US Representative / US Senator

- Bills authored that became law
- Floor vote attendance
- Bipartisan vote rate
- Constituent service responsiveness (where measurable)

---

## Proposition pattern set

Propositions don't fit the candidate pattern set. Substitute these four:

1. **Plain-English text.** What the measure literally does, in 2 sentences. Not the ballot title. Source: official ballot language + neutral analysis (League of Women Voters, Texas Legislative Council, Ballotpedia).
2. **Pro/con coalition shape.** Donor-bucket-style breakdown of who's funding YES vs. NO, drawn from TEC PAC filings for the proposition's campaign committees. Same vocabulary as candidate donor coalitions.
3. **Endorsement split.** Editorial boards, civic orgs, advocacy groups for vs. against, grouped by category. Same render as candidate endorsement clusters.
4. **Fiscal note + comparable history.** What the measure costs / changes (official fiscal note) and the outcome of the most directly comparable measure passed elsewhere or earlier. Source: official fiscal note + one cited comparison.

Propositions render labeled YES / NO from the start (no anonymization). The `[RACE_PATTERNS]` block is reused with field overrides:

- `name` = "YES on \<short measure title\>" / "NO on \<short measure title\>"
- `incumbent` = false (always)
- `priorRole` = the plain-English text
- `donorCoalition` = pro/con coalition shape
- `endorsements` = endorsement split for that side
- `platformAlignment` = null
- `retrospective` = the fiscal-note-plus-comparable-history pair (treated as 1–2 metric entries)
