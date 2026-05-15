# Post-Launch Backlog

Issues, monitoring gaps, data quality concerns, and enhancement ideas identified at or after launch. Entries are triaged by severity and should be reviewed quarterly.

**Severity:** `P0` = blocking / causes silent bad data · `P1` = meaningful user impact · `P2` = improvement / polish · `idea` = not yet scoped

---

## Data Quality

### [P1] Issue taxonomy is too broad for precise alignment matching
**Status:** Open (flagged 2026-05-15)

The 15 canonical issues (`healthcare_affordability`, `economy_jobs`, etc.) are high-level categories. A voter who cares about "insulin prices" and one who cares about "hospital monopolies" both resolve to `healthcare_affordability` and get the same alignment score, even if their actual concerns are distinct. Similarly, "crime" vs. "policing reform" both land in `crime_public_safety` with no way to distinguish stance at query time.

**Impact on chat:** Alignment answers can feel generic or off-target for voters with specific policy concerns. The system will return votes that are technically related to the category but not the voter's actual position.

**Longer-term fix:** Expand the canonical vocabulary (likely 30–50 issues), add stance-level sub-tags (e.g., `healthcare_affordability:expand_coverage` vs. `healthcare_affordability:cost_containment`), and re-tag the 67K bill corpus. Requires coordinated change to `canonicalIssues.ts`, `BALLOT_PROMPT.md`, and a full re-tagging run.

**Related:** See "Store voter issue preferences" idea below.

---

### [P1] No distinction between "not yet tagged" and "not an issue bill"
**Status:** Open (flagged 2026-05-15)

Bills with zero `issue_tags` rows look identical in the DB whether they are:
- Genuinely non-issue (procedural votes, budget line items, ceremonial resolutions, street renaming) — estimated ~30% of all bills
- Legitimately untagged because the tagger hasn't reached them yet

**Impact:** The 56.2% bill coverage figure overstates the gap. The real "taggable but untagged" figure is probably closer to 25–30%. Alignment scores for high-bill states (IL at 31.8%, TN at 35.6%) look sparse but some of that is structural.

**Fix:** Add a `skip_reason` column to `bills` table (or a separate `bill_skips` table). When the tagger decides a bill is non-issue, record it explicitly. Then coverage reporting can separate "skipped non-issue" from "queued for tagging."

**Tracking query:**
```sql
SELECT COUNT(*) FROM bills b
WHERE NOT EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id = b.id);
-- Current: ~29,654 bills — mix of non-issue + untagged
```

---

### [P2] IL bill coverage lagging (31.8% — worst of high-volume states)
**Status:** Open (flagged 2026-05-15)

Illinois has 8,379 bills — the largest state corpus — but only 31.8% are tagged. Sunday cron will close this slowly. If IL is a priority, a targeted manual tagging run (100 batches × 300 bills) would close it in one session.

---

### [P2] `crime_public_safety` and `public_safety` are redundant canonical issues
**Status:** Open (flagged 2026-05-15)

Both exist in the taxonomy. `public_safety` has 5,499 tags; `crime_public_safety` has 3,800. They overlap substantially. When the taxonomy is expanded (see P1 above), consolidate these into sub-issues under a single parent.

---

### [P2] WI has 0% donor coverage (honest, but notable)
**Status:** Documented, no action needed

WI source deleted 2026-05-14 after finding implausibly large amounts ($26M for state senator from `wi_cfis_bulk`). WI has no electronic filing mandate — structural ceiling. Chat will not show donor data for WI candidates. This is correct behavior.

---

## Chat / Alignment Feature

### [P0 — FIXED 2026-05-15] `healthcare_access` wrong canonical id in system prompt example
**Status:** Fixed in `docs/BALLOT_PROMPT.md` + regenerated, commit pending

The `[CONCERN_INTERPRETATION]` example in the system prompt showed `"canonicalIssue":"healthcare_access"` — a string that doesn't exist in the `issue_tags` table. When Claude followed this example for health-related voter concerns, `lookup_alignment` returned no contributing votes (correct format, zero results), and the chat fell back to web search instead of using the voting record database.

**Fix applied:** Corrected example to `healthcare_affordability`. Added explicit vocabulary list of all 15 valid ids to the system prompt rules so the model cannot invent variants.

**Monitoring:** After the API cap is lifted and chat is functional, spot-check a session where a voter mentions "healthcare costs" and confirm the alignment tool is called with `healthcare_affordability`, not a variant.

---

### [P1] Alignment returns `kept: 0` silently for unmapped concerns
**Status:** Open (flagged 2026-05-15)

If Claude maps a voter concern to a canonical id that has very few tagged bills (e.g., `border_security` with only 155 tags, or `immigration` with 407), the alignment lookup will return `found: true` but very low `kept` counts. The voter sees a score like "1 of 47 votes" which looks like the candidate barely addressed the issue — when in reality there just aren't many tagged bills.

**Impact:** Misleading sparsity signals, especially for federal-only issues (immigration, border) where state legislators rarely vote on them.

**Fix options:** (a) Show a "limited data" notice when `total < 5`. (b) Fall back to web search when `total` is below a threshold. (c) Expand the tag corpus for thin issues.

---

### [P1] Google Civic ballot lookup unreliable for Texas (and likely other states)
**Status:** Open — structural, partially mitigated

Harris County 77002 returns "0 races, Not confirmed" from Google Civic. The PDF ballot upload fallback works well (confirmed with real DEM Harris ballot). But users who don't know to upload a PDF will see the "not confirmed" state and may not realize there's a fallback.

**Mitigation in place:** PDF upload is surfaced in the UI with a `<details>` section and clear instructions. pdfjs-dist extraction confirmed working.

**Remaining gap:** No proactive prompt to upload when Civic lookup fails — user must discover the `<details>` section themselves.

---

### [P1] No alignment data for non-legislative candidates (executive, judicial, local)
**Status:** Open (flagged 2026-05-15)

The `candidates` table and `votes` table only contain state house/senate members and federal House/Senate members. Statewide executive candidates (Governor, Lt. Governor, Attorney General), judicial candidates (judges), county officials, city council, school board, and ballot measure races have no entries in the DB.

**Impact:** For ballots that are entirely or mostly non-legislative (primaries, runoffs, off-cycle local elections), `lookup_alignment` returns `found: false` for every candidate. The entire chat session falls back to web search. Our proprietary voting record data plays no role. The May 26, 2026 Texas DEM runoff ballot is an example: Lt. Governor, AG, Court of Appeals, County Judge, District Clerk — none covered.

**Partial mitigation:** Web-search-based alignment scoring (see idea below). Full fix requires new data sources (executive campaign finance, AG actions, bill signing records) — significant scope.

---

### [P1] `reproductive_rights` and `immigration` canonical issues have very thin tag coverage
**Status:** Open (flagged 2026-05-15)

`reproductive_rights`: 619 tags (1.5% of corpus). `immigration`: 407 tags (1%). `border_security`: 155 tags (0.4%). These are the three thinnest canonical issues.

**Impact:** Voters who care about reproductive rights or immigration will often see 0–2 contributing votes even for active state legislators, which reads as "this candidate doesn't address this issue" when the reality is "we don't have enough tagged bills." This is the most politically significant taxonomy gap given that reproductive rights is a top-tier voter concern in 2026.

**Why thin:** State legislatures rarely have explicit "reproductive rights" bill language — bills are titled by their regulatory mechanism (gestational limits, clinic licensing, etc.). The tagger is less confident matching these to the canonical issue without explicit text, leading to low-confidence drops. Federal bills are better labeled but we have fewer of them.

**Fix:** Write targeted tagger instructions specifically for reproductive rights and immigration bills (examples of what to look for), and run a focused re-tagging pass on states with relevant legislative histories (TX, FL, OH, GA, NC, AZ, WI for reproductive rights; TX, AZ, FL for immigration). Also see "Expand canonical vocabulary" P1 above.

---

## Operations / Infrastructure

### [P1] `ingest-states.yml` cron has never fired from main
**Status:** Partially resolved 2026-05-15

Scheduled trigger only fires from default branch (`main`). New `dispatch-state-ingest.yml` on `main` added 2026-05-15 to trigger `workflow_dispatch` on `launch/production` daily at 07:30 UTC. First fire: 2026-05-16 (shard 1: HI ID IL IN IA KS KY LA ME MD).

**Monitor:** Check `gh run list --workflow=dispatch-state-ingest.yml` after 2026-05-16 07:30 UTC to confirm it fired and the downstream ingest succeeded.

---

### [P2] deploy.yml `vercel env add` failures were silently swallowed
**Status:** Fixed 2026-05-15

All `vercel env add` calls previously used `2>/dev/null || true`. ANTHROPIC_VOTER_API was not landing in production deployments; `/api/chat` returned 500. Fixed with explicit `::notice::`/`::error::` logging.

---

### [P2] `ingest-state-donors-monthly.yml` — ~21 states use best-effort download URLs
**Status:** Open (flagged during build)

Several state donor download URLs were added as best-effort guesses without verification (AK, AR, CO, FL, HI, IN, KY, MA, MI, MN, MO, MS, NC, ND-cfis, NY, OH, OK, SC, TN, TX). These have `continue-on-error: true` and may silently fail on the monthly run. The existing donor data for these states is from the initial ingest and is correct; only future refreshes are at risk.

**Fix:** Verify each URL manually before the first monthly run. Expected: June 2026.

---

## Product Ideas (not yet scoped)

### [idea] Web-search-based alignment scoring as fallback when DB has no data
**Status:** Flagged 2026-05-15 — requires design

**What:** When `lookup_alignment` returns `found: false` (non-legislative candidate) or `total < threshold` (thin data), instruct the model to run a targeted web search for the candidate's public statements, endorsements, and actions on the issue — then emit a structured alignment assessment in the same `[ALIGNMENT_SCORES]` format, labeled with a different source type so the UI can render it differently.

**Why it's viable:** The model already does this analysis in prose for non-legislative candidates. The change is making it structured and consistent rather than narrative. The model reads web search results and synthesizes "does this candidate support or oppose this concern?" It already knows how to do that reasoning — we'd just be capturing the output formally.

**What it would look like in the scores block:**
```json
{
  "canonicalIssue": "reproductive_rights",
  "issueLabel": "Reproductive Rights",
  "resolvedStance": "in_favor",
  "kept": null,
  "total": null,
  "sourceType": "web_search",
  "confidence": "medium",
  "evidence": [
    {"summary": "Endorsed by Planned Parenthood TX, May 2026", "url": "..."},
    {"summary": "Stated opposition to HB 1280 in campaign interview", "url": "..."}
  ]
}
```

**Key design constraints:**
- Must be clearly labeled as "Based on public statements" — not "voting record." Different epistemics: voting records are facts, web search summaries are interpretations of available media.
- Confidence degradation: `high` only for explicit on-record statements; `medium` for endorsements; `low` for inferred from affiliations.
- Hallucination risk: model must cite sources for each evidence item. Any claim without a real URL should be dropped.
- Source quality: partisan endorsement sites can be misleading. The model should weight official campaign statements, credentialed news coverage, and official government records over advocacy org summaries.

**Implementation path:** Primarily a system prompt change + a UI change to render `sourceType: "web_search"` scores differently from `sourceType: "voting_record"` scores. No new backend required. Moderate prompt engineering effort. Low infrastructure cost.

**Related:** Addresses "No alignment data for non-legislative candidates" [P1] above and "thin tag coverage" [P1] above.

---

### [idea] Store voter issue preferences for analysis
**Status:** Flagged 2026-05-15 — requires design

**What:** Persist the `[CONCERN_INTERPRETATION]` output (voter's ranked canonical issues + stances) to a database table, anonymously, without any PII. This would let us run analysis: which issues voters in which states care most about, which canonical issues are being invented (indicating taxonomy gaps), how often voters express concerns outside the 15 canonical categories.

**Why this matters:** The current taxonomy was built bottom-up from legislative data, not from what voters actually ask. Storing what voters ask would let us close the gap — both by expanding the vocabulary and by improving the tagging priority queue (tag more bills in the issues voters actually care about).

**What it requires before building:**
- New DB table (`voter_concern_events` or similar) with columns: session_id (hashed), canonical_issue, resolved_stance, was_off_topic, confidence_level, state_code, timestamp
- Privacy policy update: clarify that we store anonymous, non-PII issue preference signals. Current policy says we store "anonymous counts only — never who said what." This is consistent but needs explicit mention of concern signals.
- UX: this data is already being sent to Anthropic as part of the chat context. The new part is persisting the structured output, not adding new collection.
- A simple analytics query interface (even just SQL in the repo) to inspect the data.

**Constraint:** Do not collect the voter's free-text verbatim — only the resolved canonical issue id and stance. Free text could be identifying.
