# LAUNCH_PLAN.md — Ship Voter Choice Today (MVP)

**Date:** 2026-04-12
**Goal:** Launch a working ballot research tool with an on-site AI chat experience for Texas voters.
**Scope:** MVP of all phases, scoped to Texas only. Chat is the default. Copy/paste is the budget-exhaustion fallback.

---

## What "MVP of All Phases" Means

| Phase | Full Vision | Today's MVP | Deferred |
|-------|-------------|-------------|----------|
| **1** (Core) | Zip → state info → prompt output | ✅ Already built on `run3/spec-kit` | — |
| **2** (i18n) | Spanish language support | ✅ Already built on `run3/spec-kit` | — |
| **3** (Real data) | 5 public APIs, 50 states + DC, candidate records | TX static data only (enriched with all 2026 elections). No API integrations today. | API layer, 50-state expansion, candidate enrichment |
| **4** (Languages) | Vietnamese, Chinese, Arabic + RTL | Skip. EN + ES is enough for TX launch. | Full 5-language support, RTL layout |
| **5** (Chat + outputs) | LLM chat, downloadable ballot, voter profile | ✅ Build today — this is the product. | Polish, edge cases |

---

## Decision Log

| Decision | Choice | Why |
|----------|--------|-----|
| Base branch | `run3/spec-kit` | 159 unit tests, 91.6% coverage, 100 Lighthouse, Spanish i18n, cleanest architecture |
| New branch | `launch/production` from `run3/spec-kit` | Preserves experiment data on other branches |
| Default path | **Chat on-site** (Path A from Phase 5 spec) | The chat IS the product |
| Fallback path | Copy/paste prompt (Path B) | Activates when $20/month budget is exhausted |
| LLM | Claude Sonnet (`claude-sonnet-4-6`) via Anthropic API | Cost-effective, high quality |
| Budget | $20/month hard cap via Anthropic Console | Per Phase 5 spec |
| Data scope | Texas only — all 2026 elections (May 2 local, May 26 runoff, Nov 3 general) | Ship today, expand later |
| Secrets | Bitwarden SM → GitHub Actions → Vercel (automated) | GitHub repo secrets configured: `BW_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Pipeline pulls `ANTHROPIC_API_KEY` from Bitwarden SM at deploy time. |
| Deployment | Vercel via GitHub Actions | Push to `launch/production` triggers auto-deploy |

---

## Graceful Handoff System

The most important UX decision: when the budget runs low, existing users are never cut off. New users absorb the reduction first.

**Budget math:** ~$1.20/conversation, ~$0.07/handoff, ~16 full conversations per month at $20.

**Two-threshold system:**

| Threshold | New users | Existing conversations |
|-----------|-----------|----------------------|
| 0-70% | Normal | Normal |
| 70-80% | Normal + subtle notice | Normal + subtle notice |
| **80-90%** | **See copy/paste flow as primary** (soft close) | **Continue normally** (protected) |
| **90%** | Copy/paste only | **Handoff triggered** — AI wraps up warmly |
| 100% | Copy/paste only | Client-side fallback handoff |

**At 80%** — stop admitting new conversations. New visitors see "Our AI chat is at capacity this month, but you can still research your ballot" with the copy/paste flow. Never a broken or disabled chat. A working product.

**At 90%** — trigger handoffs for all active conversations. The API injects a system instruction and the AI generates: ballot-so-far (covered + remaining), voter profile, and session handoff. The user sees "Here's everything we've worked on so far" with three outputs:
1. **Your Ballot So Far** — printable, covered races + "Races Remaining"
2. **Your Voter Profile** — downloadable .txt
3. **Continue Where You Left Off** — one "Copy" button, self-contained prompt, paste anywhere

**At 100%** — backstop. Client-side assembles a handoff from conversation history in browser memory if the API can't.

The user does zero work to continue. One copy, one paste, they're back.

---

## Session Execution

See `docs/SESSION_PROMPTS.md` for the exact prompts to paste into each Claude Code session.

| Session | Duration | What | Depends on Gemini? |
|---------|----------|------|---------------------|
| 1: Branch + cleanup | 20-30 min | Strip experiments, fix TX data, CI/CD | No |
| 2: Chat API route | 45-60 min | Backend: streaming, rate limiting, budget, handoff | No |
| 3: Chat UI | 45-60 min | Frontend: chat component, two paths, degradation | **Yes — fold Gemini feedback here** |
| 4: Ballot + profile | 30-45 min | Downloads, uploads, parsing | No (minor Gemini influence) |
| 5: Legal + deploy | 30-45 min | Privacy, terms, metadata, ship it | No |

**Start Sessions 1-2 now. Wait for Gemini feedback before Session 3.**

---

## Secrets Setup

### Already Done ✅
- GitHub repo secrets: `BW_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Bitwarden SM: `ANTHROPIC_API_KEY` stored
- Anthropic Console: $20/month hard spending cap set

### How Deployment Works
Push to `launch/production` → GitHub Actions → pulls `ANTHROPIC_API_KEY` from Bitwarden SM → deploys to Vercel with key injected.

### Adding Future API Keys
1. Add new key to Bitwarden SM
2. Add key name to `bws` pull step in `.github/workflows/deploy.yml`
3. Push. Done.

### For Local Dev
- `bws run -- npm run dev` (recommended) or `.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` (gitignored)
- `.env.example` documents required vars with placeholder values
