# Conductor handoff — 2026-06-26 (FE review session, END)

**Loop intentionally STOPPED by Muxin at end of this session.** Do NOT auto-resume / re-arm.
To restart later: `Run the orchestrate-pipeline conductor here. DRY_RUN=false. UNATTENDED=true`
then: "continue the one-by-one localhost review of the staged FE drafts."

## ✅ Merged + deployed + LIVE this session (7)
All squash-merged to main, deploy.yml → vercel --prod confirmed green for each:
- #159 jurisdiction-context — `3ec5748` (Muxin's call: dropped inline jurisdiction captions, kept
  removal of "Your seat at the national table" intro → retitled "Your federal delegation")
- #161 results one-panel — `c888d41` (left rail `.ws-rail` removed; single right panel)
- #160 orientation interstitial — `a8a2c72` (OrientationView + "orientation" stage, after lock)
- #163 de-emphasize non-2026 reps — `3cda988` (greyed + "Not up for election in 2026" + excluded from print)
- #164 scorecard print overhaul — `95e8c96` (✓KEEP/⇄REPLACE, % aligned, decisions-first, white print)
- #162 Print-My-Scorecard completion CTA — `dd1570a`
- #158 Lock-These-In prominence — `e646248` (CSS-only)

## ⚠️ Board behind reality — cards needing Muxin's Done flip (review-session protocol: conductor did NOT write board)
This session: **#159, #161, #160, #163, #164, #162, #158** → mark **Done**.
Prior session (still showing Review): **#155, #156, #166** → Done; **#173** → Done (tablet e2e false alarm, recommend close).
**#154** already CLOSED. New backlog card to add (paste-ready below): the alignment data-gap.

## 🟡 Staged as HELD DRAFTS — conflict-free vs current main, CI running, await one-by-one localhost review
Each is `draft=true`, `MERGEABLE`, tsc+prettier green. Muxin's flow = localhost preview before each
merge. **Most touch VoterChoiceApp.tsx / DelegationWorkspace.tsx → each will RE-STALE as others merge**;
re-resolve via worktree `git fetch && git merge origin/main` + regular push (NO force-push).
- #165 unify candidate cards — `54d1010` (clean)
- #174 President/VP card — `5e78b03` (resolved prototype.css nav vs #166)
- #167 candidates duel UX — `5f5291f` (clean; duel stage coexists w/ orientation)
- #157 simplify address box — `02e07f1` (clean)
- #169 settings button — `8ae1acb` (resolved App2 import + VoterChoiceApp export)
- #172 stable React keys — `609bc4f` (resolved DelegationWorkspace key onto single-panel list)
- #168 Spanish body — `a5880375` (resolved i18n in DelegationWorkspace; added es for KEEP/REPLACE +
  "Tu delegación federal"; NOTE worktree needed node_modules symlink; a few now-unused es keys left for pruning)
- #170 budget message — `ba1df35` (clean; isolated BudgetModal.tsx)
- #171 polling-place note — `8116c36` (clean)

## 🔬 Alignment data-gap investigation — RESULT (high-value finding)
Surfaced in #164 review: AI safety + Healthcare costs show n/a / "Thin record" for Hunt (TX-38) + Cornyn;
print omits all alignment %. Attendance loads fine (Hunt missed 26.71%/584). Investigated against prod Neon DB.

**Root cause = a COMBINATION (not one bug):**
- **"AI safety" = (a) taxonomy/coverage gap.** The canonical vocabulary has only **16 issues and NO AI bucket**
  (`src/lib/canonicalIssues.ts`; resolver `src/lib/prompts/theme-extraction.ts`; `/api/race-data` drops
  non-whitelisted issues). So AI safety can NEVER score — 0 tagged bills because the bucket doesn't exist. Honest n/a.
- **"Healthcare costs" = (c) resolver / canonicalIssue carry-through BUG — data EXISTS but isn't scored.**
  Maps to `healthcare_affordability`, the **most-tagged issue (6,494 bills)**. Scoreable votes in window:
  **Hunt 31, Cornyn 18** — both far above `LIMITED_DATA_THRESHOLD = 5`. So `lookupAlignment()` WOULD return
  real totals; the block is empty only because the user's issue reaches the scorecard WITHOUT a usable
  `canonicalIssue` (display matches via `scores.find(s => s.canonicalIssue === iss.canonicalIssue)`,
  `delegationData.tsx:691`). i.e. a silent suppression of alignment that *should* render.
- **(b) threshold ruled out:** `attachLimitedDataNotice` (alignment.ts:80) only ADDS a notice, never hides;
  the ±5 "noise floor" (delegationData.ts:723) is only for REVISIT delta highlighting.
- Same on production (dev uses prod DB via `.env.local`).

**Fix direction:** (1) AI safety → add an `ai_safety` canonical issue + re-tag (taxonomy). (2) Healthcare →
instrument `/api/race-data` to confirm whether the issue arrives with `canonicalIssue:'healthcare_affordability'`;
the lookup works, so the gap is upstream resolver mapping / canonicalIssue carry-through to `userIssues`.
Confidence: HIGH on AI-safety = taxonomy & (b) ruled out; MEDIUM on the exact Healthcare (c) sub-mechanism
(reproduce session + capture the `/api/race-data` payload to reach HIGH).

### Paste-ready backlog card (Muxin owns the board)
```markdown
**[P1] Alignment silently empty for well-covered issues — fix canonicalIssue carry-through + add AI bucket**
- Surfaced in #164 review (2026-06-26). Workspace shows n/a / "Thin record" and the printed scorecard omits
  ALL alignment % for a Houston TX address (Hunt TX-38 + Cornyn) on "AI safety" and "Healthcare costs".
- Investigation (prod DB): TWO causes.
  (a) "AI safety" — NO canonical bucket exists (vocab = 16 issues, none for AI). Can never score until added + re-tagged.
  (b) "Healthcare costs" — REAL BUG: healthcare_affordability is the most-tagged issue (6,494 bills); Hunt has 31
      scoreable votes, Cornyn 18 (>> threshold 5). The data exists but the issue reaches the scorecard without a
      usable `canonicalIssue`, so `scores.find(...)` matches nothing and the whole alignment block is suppressed.
  (b-threshold) ruled out — attachLimitedDataNotice only adds a notice, never hides.
- Fix: (1) add `ai_safety` canonical issue to canonicalIssues.ts + theme-extraction.ts, then re-tag.
  (2) instrument /api/race-data; trace why the resolved issue loses `canonicalIssue='healthcare_affordability'`
  before reaching scorecard userIssues. Undercuts the core alignment value prop → P1.
- STATUS: Backlog
```

## ⏭️ Parked (not FE-review)
- #146 Polis clustering + #151 anon usage metrics — held drafts, carry DB migrations (apply 0012/0011 on prod before flipping flags).
- #175 in-chat pole disambiguation (2b) — product/UX call.
- #147 docs monetization strategy — docs PR.

## 🎨 The "new design / bold colors" Muxin keeps expecting (memory: project_bold_flag_keystone_redesign)
= **Bold Flag palette / Keystone redesign**. Designed (claude-code-handoff/ DECISIONS.md + screens-*.jsx) but
NOT built — code only wires civic/manifesto/editorial moods, hardcodes `data-mood="civic"`. The FE-refinement
PRs #157–#174 are NOT it. **Decision 2026-06-26: finish the small-fix queue first (done for 7; 9 staged),
Keystone/Bold-Flag port = NEXT dedicated session.** Color scheme is likely separable from the backend-gated
screen ports (mood infra already exists).

## Merge mechanics (gotchas)
- Force-push / `git reset --hard` / self-editing settings = BLOCKED by auto-mode classifier. WORKS: regular
  `git push`, `gh pr ready`, `gh pr merge --auto --squash`.
- `mergeStateStatus` often lags at UNKNOWN even when the squash merge lands — poll `.state` for MERGED.
- `gh` needs sandbox OFF. `public/prototype.css` has a pre-existing whole-file prettier failure on main
  (CI doesn't gate on it) — ignore unless your change touches its lines.
- Main checkout sits on `chore/track-kanban-backlog`; sync via `git branch -f main origin/main` (not checkout).
