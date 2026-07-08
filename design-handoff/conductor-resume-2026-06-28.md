# Handoff — 2026-06-28 (incident resolved · pivot to implementing Keystone)

**Resume in a fresh session:** open this repo in Claude Code and say:
> "Read `claude-code-handoff/conductor-resume-2026-06-28.md` and continue — start with the Bold Flag palette."

Authoritative state as of 2026-06-28. Supersedes `conductor-resume-2026-06-26-final.md`.

---

## ✅ Incident resolved this session (the "no data / budget wiped / was it hacked?" scare)
- **"No data" on cards = production schema drift** (NOT data loss, NOT a PR, NOT a hack). Code (#144, ~06-25)
  selected columns never migrated onto prod Neon, so the alignment query threw → blank cards. **Fixed:** applied
  migrations **0007 + 0009 + 0010** to prod (additive; verified — the failing query now returns Cornyn's 18
  healthcare votes). Live site + localhost both restored. `tally_*`/`bill_status` null until next ingest backfills
  (display-only, not needed for scoring).
- **Budget wipe = the Sunday `ingest-tag-bills.yml` cron** (`0 9 * * 0`) submitting ~29k bills to the Anthropic
  Batch API on the front-end key `ANTHROPIC_VOTER_API`. Spikes 6/21 + 6/28 = Sundays; workspace limit resets
  **2026-07-01**. **No compromise:** clean authors, no exfil/rogue deps.
- **Directive (locked):** `ANTHROPIC_VOTER_API` is **front-end user usage ONLY** — no unattended backend jobs.
  (Memory: `api-key-frontend-only`.)

## 🔜 Open ops items (carry these)
1. **Merge PR #177** (disables the Sunday cron, keeps `workflow_dispatch`). CI was green-ish at handoff. **Merge
   before Sun 7/05** (first Sunday after the 7/01 budget reset). Muxin merges — agent auto-merge is blocked.
2. **Weekly-tagging reminder hook — Muxin to decide wiring.** Script written: `scripts/ops/tagging-reminder.sh`
   (silent unless tagging >7d overdue). Options: wire it into `.claude/settings.local.json` SessionStart hook /
   `/schedule` cloud routine / skip. (Snippet in this session's history.)
3. **Backend tagging is paused** → re-architect onto **Claude Code / Max** (owner-initiated), NOT the Batch API.

---

## 🎯 MAIN GO-FORWARD — implement the Keystone design (start with the palette)

**Corrected understanding (don't repeat the earlier mistake of calling the staged PRs "rework"):**
Keystone (`claude-code-handoff/design-session/DECISIONS.md`) is being implemented **surface-by-surface**, and
**most of it already merged**: orientation (#160), results-one-panel (#159/#161), scorecard overhaul (#164),
print-CTA (#162), non-2026 reps (#163), homepage hero (#156). The **4 staged "surface" PRs ARE Keystone work**
(see table) — not polish of the old design.

**THE missing piece = the Bold Flag palette (Decision 6).** White ground + bolder navy/red — the actual
"look & feel." The code still **hardcodes the old `civic` (warm teal) mood**, so the new *structure* renders in
the *old skin*. That gap is why it doesn't yet look like the design. The palette is **separable + front-end-only**;
exact tokens live in `design-session/screens.css` under `[data-palette="white"]`.

**Recommended order:**
1. **Apply Bold Flag palette** — port the `[data-palette="white"]` token set as the **default** in
   `prototype.css` (add/wire `--brand` / `--keep` / `--replace`, swap `--civic`). Instantly re-skins every merged
   Keystone surface. **First step:** grep how the palette/mood is currently wired (`data-mood`/`data-palette`/
   `--civic` in `public/prototype.css` + `src/prototype/redesign/`), then port faithfully (copy token values — do
   NOT re-interpret). Show Muxin the app in the new colors.
2. **Then the 4 surface PRs are genuine Keystone** → review/merge (now in Bold Flag). Diff each against its
   `design-session` source first to confirm it matches *as code* (Muxin's rule: port, don't re-interpret).
3. **The 5 design-agnostic PRs** land regardless (bugs/plumbing/i18n/copy — Keystone doesn't touch them).
4. **Remaining Keystone (separate, after):** the **"Raised vs. the median"** feature (backend-gated — see
   `HANDOFF-TO-CLAUDE-CODE.md` §1, `peerComparison` on `/api/donors`; #152 already started `MedianChip`); a
   **full palette-rollout audit** across every shipped surface; the **a11y + empty/failure/streaming-state** gaps
   (`HANDOFF-TO-CLAUDE-CODE.md` §2c/§2a).

---

## 🗂️ The 9 staged held-draft PRs — categorized
Worktrees at `…/voter-choice-worktrees/wt-<slug>`. They re-stale as peers merge (touch VoterChoiceApp/
DelegationWorkspace) — re-resolve via worktree `git fetch && git merge origin/main` (NO force-push).

| PR | slug | Keystone? |
|---|---|---|
| #165 | unify-candidate-cards | **Keystone** — unified card (Session 2 / 05b995c8) |
| #174 | president-vp-card-consistency | **Keystone** — unified card (Session 2 / 31145699) |
| #167 | candidates-duel-ux | **Keystone** — head-to-head "B" (6a1fb1fb) |
| #157 | simplify-address-box | **Keystone** — Session 3 (1850349c) |
| #170 | budget-exhausted-message-clarity | design-agnostic (copy) |
| #171 | polling-place-not-published-note | design-agnostic |
| #172 | edit-issues-propagate-plus-keys | design-agnostic (React-key bug) |
| #168 | spanish-translation-body | design-agnostic (i18n / d8059e2e) |
| #169 | settings-button-functionality | design-agnostic (403ed2a6) |

**Review workflow (agreed — use instead of "go click localhost"):** mechanics/regressions = CI (tsc/vitest/e2e);
**design quality = Muxin via a screenshot contact sheet** — drive the changed surfaces with the `playwright-cli`
skill in a subprocess, capture images of ONLY the changed views, ping Muxin **images + one design question**
(~30s vs ~10min). localhost is a fallback.

---

## 📐 Design source of truth — `claude-code-handoff/design-session/`
**Directive: port the design AS CODE; never re-interpret it as "direction."** (Memory: `design-prototype-integration`.)
- `DECISIONS.md` — the Keystone spec: each decision → exact repo target file. (Sessions 1–3: orientation, results,
  scorecard, palette, candidate card + head-to-head "B", homepage hero. Bold Flag = the locked palette.)
- `screens-{results,candidates,funding}.jsx` + `{screens,candidates,funding}.css` — the reference renderings to
  port. `screens.css` holds the `[data-palette="white"]` palette tokens.
- `HANDOFF-TO-CLAUDE-CODE.md` — the "Raised vs. the median" data contract + the a11y / AI-privacy-ethics readiness
  checklist (highest-stakes; close before launch).
- `representatives-only/HANDOFF.md` — the already-ported delta (now `src/prototype/redesign/`) + the
  do-not-modify boundary list.

---

## ⏭️ Deferred / tracked (paste-ready cards in this session's history → `/tmp/claude-501/response.md`)
- **Budget hardening:** lower `CHAT_DAILY_SESSION_LIMIT` 100→10 (28bf87ec); verify fail-closed budget (#150) live;
  set an Anthropic **workspace spend cap**; security review (850b1220); reset Polis count (1f5e2506).
- **Schema-vs-migrations drift guard** + a **golden-address data smoke test** (Houston TX → Cornyn alignment
  non-empty) so blank-data can't ship silently again.
- **Review-workflow rollout:** add screenshot-capture to the conductor (orchestrate-pipeline skill) Step-4; add the
  FE CI gate (visual snapshots + golden-record smoke test) to the **repo starter kit**.
- **Other sessions:** Polis redesign/placement (bc774728); palette rollout across shipped surfaces; remaining
  HANDOFF gap-states.

## ⚙️ Gotchas
- Main checkout sits on `chore/track-kanban-backlog`; sync via `git branch -f main origin/main` (not checkout).
- `.env.local` (symlinked into worktrees) = **prod** Neon. Dev server (from any worktree):
  `npx next dev --turbopack -p 3210`. `gh`/DB calls need **sandbox OFF**.
- Review-session protocol: **Muxin owns the backlog** — hand paste-ready cards, don't write it programmatically.
- Full incident plan: `~/.claude/plans/there-s-no-data-when-curried-token.md`.
