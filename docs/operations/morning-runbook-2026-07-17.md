# Morning runbook — 2026-07-17 (prod cutover: roster flag flip + deploy unblock)

Everything below is a **prod mutation the overnight session's permission rules correctly refused to run unattended** (verified: prod *reads* were allowed, prod *writes* were classifier-blocked every time). Each step is one paste-ready command, in order. Run from `/Users/Muxin/Documents/GitHub/voter-choice`. In a Claude Code session, prefix each with `!` to run it in-session; a plain terminal works too.

## The situation you're waking up to

1. **Every prod deploy has failed since ~July 15** — the deploy-time schema-drift guard (working as designed) fails because migrations **0015/0016** (`official_roster_candidates`) were applied only to the *staging* Neon branch during the state builds, never to prod. Prod is stale: none of the 50-state roster code or the overnight fixes are live.
2. All 50 states merged overnight (WY was last, 04:53Z). The flip you pre-authorized needs prod to have the table (step 1), the data (step 3), and the env flag (step 4).
3. PR #383 (ballot-accuracy feedback intake) is held only on migration **0017**.

## Steps

**1. Apply migrations 0015 + 0016 + 0017 to prod** (additive-only — your standing no-ceremony convention):

```bash
git fetch origin feat/roster-feedback-intake && git show origin/feat/roster-feedback-intake:db/migrations/0017_add_roster_feedback.sql > /tmp/0017.sql && vercel env pull --environment=production /tmp/prodenv --yes && DATABASE_URL="$(grep '^DATABASE_URL=' /tmp/prodenv | cut -d= -f2- | tr -d '"')" npx tsx -e 'const run=async()=>{const{neon}=await import("@neondatabase/serverless");const fs=await import("node:fs");const s=neon(process.env.DATABASE_URL);for(const f of["db/migrations/0015_add_official_roster_candidates.sql","db/migrations/0016_fix_official_roster_null_district_uniqueness.sql","/tmp/0017.sql"]){for(const st of fs.readFileSync(f,"utf8").split("--> statement-breakpoint").map(x=>x.trim()).filter(Boolean))await s.query(st);console.log("applied",f)}};run();' ; rm -f /tmp/prodenv /tmp/0017.sql
```

**2. Re-run the failed deploy so prod catches up to main** (or just wait — the next merge to main redeploys):

```bash
gh run rerun $(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

**3. Import all 50 states into prod** (idempotent upserts; flag is still OFF so nothing is user-visible yet):

```bash
vercel env pull --environment=production /tmp/prodenv --yes && export PROD_DB="$(grep '^DATABASE_URL=' /tmp/prodenv | cut -d= -f2- | tr -d '"')" && rm -f /tmp/prodenv && for ST in $(grep -oE '^  [A-Z]{2}: \[' scripts/ingest/official-roster.ts | grep -oE '[A-Z]{2}'); do DATABASE_URL="$PROD_DB" npx tsx scripts/ingest/official-roster.ts --state $ST; done; unset PROD_DB
```

**4. Flip the flag + fresh prod deploy** (NOT `vercel redeploy` — it reuses old env):

```bash
printf 'true' | vercel env add OFFICIAL_ROSTER_ENABLED production && vercel --prod
```

**5. Re-arm the held feedback-intake PR:**

```bash
gh pr merge --auto --squash 383
```

**6. Verify (golden addresses):** load the live app for 2–3 addresses across different states (the TX Senate regression + one AL + one CA address per the old sanity-gate card) and confirm roster-backed candidates render with correct names/parties, and a "Report a ballot issue" affordance appears once #383 deploys.

## Rollback

Any step reverses cleanly: `vercel env rm OFFICIAL_ROSTER_ENABLED production` + `vercel --prod` un-flips; the tables are additive (ignore or `DROP TABLE official_roster_candidates, roster_feedback` to fully revert); imports are idempotent upserts keyed per seat.
