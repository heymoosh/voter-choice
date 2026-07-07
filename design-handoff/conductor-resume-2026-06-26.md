# Conductor resume state — 2026-06-26 (FE PR review session)

Re-launch with: **`Run the orchestrate-pipeline conductor here. DRY_RUN=false. UNATTENDED=true`**
then say: **"continue driving the remaining front-end PRs one-by-one with a localhost
preview before I approve each."**

## Done + live this session (merged + deployed green)
- #176 (deploy.yml DATABASE_URL fix), #141 (re-tag tooling), #173 (tablet e2e — P0 false alarm),
  #155 (Why Now page), #156 (homepage hero), #166 (header/footer + mobile-nav fix).
- #154 CLOSED (superseded by #166, Muxin's decision).

## ⚠️ Board is behind reality
Per the review-session protocol Muxin owns backlog.md, so the conductor did NOT mark the merged
cards Done. Cards still showing `Review` but actually MERGED+DONE: #155 (9031f1ce), #156 (b4cc1c9e),
#166 (c9891a1f), #173 (ef8d602c — also a false alarm, recommend close). On cold-start, either Muxin
closes them or the conductor reconciles (merged PR + Review card → Step 6 → Done). Don't double-merge.

## Remaining FE held PRs — review ONE BY ONE on localhost (Muxin's explicit flow)
Workspace/results: #161 (results one-panel), #163 (de-emphasize non-2026), #160 (orientation screen)
Scorecard: #164 (print overhaul), #162 (print discoverable), #158 (Lock-These-In prominence)
Candidates: #165 (unify cards), #174 (President/VP), #167 (duel UX)
Issues/intake: #157 (address box), #159 (jurisdiction context), #169 (settings button)
i18n/misc: #168 (Spanish body — worktree has NO node_modules, symlink first), #170 (budget message —
  ISOLATED, only BudgetModal.tsx, no VoterChoiceApp conflict), #171 (polling-place note)

Most touch `src/prototype/VoterChoiceApp.tsx` → expect conflicts as each merges; resolve in the
worktree (`git fetch && git merge origin/main`, reconcile, regular `git push`), NOT force-push.

## Parked for Muxin (not FE)
- #146 (polis clustering) + #151 (usage metrics): backend, carry DB migrations — code-safe to merge
  but apply migrations 0012 / 0011 on prod before flipping their flags. Now held drafts.
- #175 (in-chat pole disambiguation): product/UX call (loop-cap not wired client-side).

## Per-PR review flow
1. `gh pr update-branch <n>` (or worktree `git merge origin/main` + resolve + push if it conflicts).
2. Spin dev server SANDBOX-OFF: `cd <worktree> && nohup npm run dev &` → localhost:3000.
3. Give Muxin localhost:PORT + exact repro steps; wait for "looks good".
4. `gh pr ready <n>` (if draft) → `gh pr merge <n> --auto --squash` → watch deploy → recommend close card.

## Merge mechanics (CRITICAL — see memory project_conductor_run_env)
Force-push / `git reset --hard` / self-editing settings are BLOCKED by the auto-mode classifier.
WORKS: regular `git push`, `gh pr update-branch`, `gh pr merge --auto`, `gh pr ready`. Repo requires
branches up-to-date, so every merge re-stales the others.

## Launch-ops still surfaced (DECISION lines already on the To Do cards — relaunch-safe)
- 1f5e2506 Polis count reset (mechanism pinned: Upstash keys `voter-choice:counters:state:*`; no script exists yet).
- 28bf87ec chat limit 100→10 (`vercel env rm CHAT_DAILY_SESSION_LIMIT production` + redeploy).
- 850b1220 /security-review (deferred), fe26165f confirm-prod-data (Muxin eyeballs).
- 02686df1 deploy.yml fix DONE; prod migration audit 0007–0010 still unverified.
