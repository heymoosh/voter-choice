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
| **3** (Real data) | 5 public APIs, 50 states + DC, candidate records | TX static data only (already exists, enrich as needed). No API integrations today. | API layer, 50-state expansion, candidate enrichment |
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
| Data scope | Texas only | Ship today, expand later |
| Secrets | Bitwarden Secrets Manager → Vercel env vars | No .env files in repo ever |
| Deployment | Vercel | Next.js native, free tier, auto-SSL |

---

## This is NOT Part of the Experiment

Ignore the CLAUDE.md experiment protocol for this work. Do not update RUN_LOG.md. Do not follow the /start workflow. This is a production launch on a standalone branch.

---

## Claude Code Session Plan

### Session 1: Branch Setup + Cleanup (20 min)

1. Create `launch/production` branch from `run3/spec-kit`
2. Remove experiment-only artifacts:
   - `scoring/` directory
   - `metrics/` directory
   - `docs/EXPERIMENT_DESIGN.md`, `docs/ANALYSIS.md`, `docs/LEARNINGS.md`
   - `docs/PHASE*_SPEC.md` files (keep BALLOT_PROMPT.md and PROJECT_SPEC.md)
   - `scripts/measure.mjs`, `scripts/analyze-adherence.mjs`
   - `docker/` directory
   - `.claude/commands/` experiment commands
3. Update `.claude/CLAUDE.md` — replace experiment instructions with production project context
4. Verify TX data in `src/data/states/TX.json` is accurate for 2026 elections. Enrich if needed (add districts, polling info as static data)
5. Commit: `launch: create production branch, strip experiment artifacts`

### Session 2: Chat Interface — API Route + Core (45-60 min)

Build per Phase 5 spec sections: "LLM Chat Window", "API Route Security", "Session Handling"

1. Create `/api/chat` route (Next.js API route):
   - Receives conversation history array from client
   - Injects system prompt: BALLOT_PROMPT.md content + user's TX election context + voter profile (if uploaded)
   - Proxies to Anthropic API with streaming enabled
   - Returns streaming response via Server-Sent Events (SSE)
   - Same-origin validation
   - Never logs conversation content
   - Never exposes API key to client
   - Model: `claude-sonnet-4-6`, max_tokens: 4096, temperature: 1

2. Implement rate limiting (per Phase 5 spec):
   - 60 messages per session (client-side counter)
   - 3 concurrent sessions per IP (server-side, in-memory Map)
   - 5 new sessions per day per IP (server-side, in-memory Map)
   - Friendly messaging when limits hit — direct to copy/paste fallback

3. Implement budget tracking (per Phase 5 spec):
   - Track estimated cumulative monthly spend from token counts
   - Server-side lightweight store (Vercel KV or in-memory with periodic flush)
   - Progressive degradation: normal → 70% notice → 90% notice → 100% chat disabled
   - At 100%: "Our free AI chat has reached its monthly limit. Copy the prompt below and paste it into any free AI chatbot."

4. Commit: `launch: add chat API route with rate limiting and budget management`

### Session 3: Chat Interface — UI (45-60 min)

Build per Phase 5 spec sections: "Chat Interface", "Two User Paths", "Privacy and Data UX"

1. Create chat UI component:
   - Chat panel appears on-page after user clicks "Research My Ballot" CTA (after zip lookup)
   - Election data stays visible/accessible — chat doesn't navigate away
   - Message input at bottom, conversation scrolling above
   - Streaming text display (incremental rendering as response generates)
   - Pre-session privacy notice: "Your conversation stays in your browser only — we don't store it. If you close or refresh, your conversation will be lost."
   - All conversation state in React state (browser memory only)

2. Wire up the two paths (per Phase 5 spec "Two User Paths"):
   - **Path A (default):** "Research My Ballot" → opens chat → conversation happens on-site
   - **Path B (fallback):** "Copy & Paste" → existing prompt output flow — displayed either alongside Path A or becomes primary when budget is exhausted

3. Budget degradation UI:
   - 0-70%: Normal. No messaging.
   - 70-90%: Subtle notice in chat, copy/paste CTA slightly more prominent
   - 90-100%: Stronger notice, both paths equally prominent
   - 100%: Chat disabled, copy/paste is the only path. Clear, friendly messaging.

4. All required `data-testid` attributes from Phase 5 spec: `chat-cta`, `chat-window`, `chat-input`, `chat-send`, `chat-message-user`, `chat-message-assistant`, `chat-privacy-notice`, `chat-budget-notice`, `chat-disabled-message`

5. Commit: `launch: add chat UI with streaming, budget degradation, two-path UX`

### Session 4: Downloadable Ballot + Voter Profile (30-45 min)

Build per Phase 5 spec sections: "Downloadable Ballot", "Voter Profile"

1. **Downloadable ballot:**
   - Parse structured "MY BALLOT" output from chat (Path A) or from paste area (Path B)
   - Render as printable HTML (black-on-white, large font, fits one page)
   - "Download My Ballot" button appears when ballot output is detected
   - Manual entry fallback: race → candidate pairs form
   - Include TX phone-at-polls reminder: "Texas law prohibits wireless devices in the voting room. Print this or write it down."
   - `data-testid`: `download-ballot-btn`, `ballot-preview`, `ballot-paste-input`, `ballot-manual-entry`

2. **Voter profile:**
   - Parse structured "MY VOTER PROFILE" output from chat
   - Download as `.txt` file
   - Upload input for returning voters: `.txt` files only, max 10KB
   - On upload: show confirmation, include in system prompt
   - Prompt injection protection: wrap in `[BEGIN USER VOTER PROFILE]...[END USER VOTER PROFILE]`, add ignore-instructions directive, include as user message not system
   - `data-testid`: `download-profile-btn`, `upload-profile-input`, `profile-confirmation`

3. Commit: `launch: add downloadable ballot and voter profile`

### Session 5: Legal Pages + Polish + Deploy (30-45 min)

1. **Privacy Policy** (`src/app/privacy/page.tsx`):
   - Zero data collection. Zip code processed in browser only.
   - Chat conversations exist in browser memory only — not stored, not logged.
   - Voter profile uploads used for current session only, not stored on servers.
   - Chat messages sent to Anthropic API for processing — we do not log or store them. Link to Anthropic's privacy policy.
   - No cookies, no localStorage, no analytics, no telemetry.

2. **Terms of Use** (`src/app/terms/page.tsx`):
   - Election information for research purposes only.
   - Verify all dates/requirements with official state election website.
   - AI can make mistakes — not a substitute for official sources.
   - Not affiliated with any government agency, campaign, or political party.
   - Monthly chat capacity is limited; copy/paste fallback always available.

3. **Footer links** to Privacy Policy and Terms of Use

4. **Page metadata:**
   - Title: "Voter Choice — Free AI Ballot Research Tool"
   - Meta description
   - Open Graph tags (og:title, og:description, og:image)
   - Social sharing preview

5. **Deploy to Vercel:**
   - Connect GitHub repo
   - Set production branch to `launch/production`
   - Set `ANTHROPIC_API_KEY` via Bitwarden Secrets Manager integration (see setup below)
   - Verify deployment
   - Configure custom domain if DNS is ready (otherwise use Vercel subdomain for day one)

6. **Smoke test on live URL:**
   - Enter TX zip code → see state info
   - Open chat → send a message → verify streaming response
   - Copy/paste fallback works
   - Privacy and Terms pages load
   - Mobile layout is clean
   - Spanish toggle works

7. Commit: `launch: add legal pages, metadata, deploy config`

---

## Bitwarden Secrets Manager Setup (Do Before Session 2)

Muxin does this manually — Claude Code cannot access Bitwarden.

### If Starting from Scratch

1. **Bitwarden account:** If you don't already have one, sign up at bitwarden.com. Secrets Manager is included in some plans or available as an add-on.

2. **Create a machine account:**
   - Go to Bitwarden web vault → Organization → Secrets Manager
   - Create a new "Machine Account" (this is what Vercel will use to pull secrets)
   - Name it something like `voter-choice-vercel`

3. **Store the API key as a secret:**
   - In Secrets Manager, create a new secret:
     - Key: `ANTHROPIC_API_KEY`
     - Value: Your Anthropic API key (get from console.anthropic.com → API Keys)
   - Grant the `voter-choice-vercel` machine account access to this secret

4. **Set up the Anthropic workspace budget:**
   - Go to console.anthropic.com → Settings → Billing
   - Set a hard spending limit of $20/month on the workspace
   - This is your backstop — the app tracks budget too, but the API-level cap prevents runaways

5. **Connect to Vercel:**
   - In Vercel project settings → Integrations → Find "Bitwarden Secrets Manager"
   - Authenticate with the machine account credentials
   - Map the `ANTHROPIC_API_KEY` secret to the `ANTHROPIC_API_KEY` environment variable
   - This syncs automatically — no .env files, no manual entry

### If Bitwarden is Already Set Up

1. Create the `ANTHROPIC_API_KEY` secret in Secrets Manager
2. Grant your existing machine account access
3. Map it in Vercel

### For Local Development

You still need the key locally to test the chat. Options:
- Use `bws` CLI: `eval $(bws secret get ANTHROPIC_API_KEY)` exports it to your shell
- Or create a `.env.local` file (already gitignored) with `ANTHROPIC_API_KEY=sk-ant-...` — just never commit it
- The `.env.example` file (committed) documents what's needed without values

---

## Go-Live Checklist

### Must-Have for Today
- [ ] Chat interface works with streaming responses
- [ ] TX zip code returns accurate election data
- [ ] Budget cap: $20/month, graceful degradation to copy/paste
- [ ] Rate limiting: 60 msg/session, 3 concurrent/IP, 5 daily/IP
- [ ] Privacy policy and terms of use pages
- [ ] Pre-session privacy notice in chat
- [ ] Mobile-friendly layout
- [ ] API key not exposed to client
- [ ] No user data stored anywhere
- [ ] Deployed on public URL

### Nice-to-Have for Today
- [ ] Downloadable ballot (printable HTML)
- [ ] Voter profile download/upload
- [ ] Open Graph tags for social sharing
- [ ] "Upcoming elections in your state" callout
- [ ] Custom domain configured

### v2 (Not Today)
- [ ] Phase 3 API integrations (Google Civic, Democracy Works, Vote Smart, OpenStates, OpenFEC)
- [ ] 50-state data expansion
- [ ] Phase 4 language expansion (Vietnamese, Chinese, Arabic + RTL)
- [ ] PDF ballot download
- [ ] Session handoff automation
- [ ] Vercel Analytics (if desired)

---

## Estimated Timeline

| Session | Duration | What |
|---------|----------|------|
| Bitwarden setup (manual) | 15 min | Muxin sets up secrets before coding starts |
| Session 1: Branch + cleanup | 20 min | Strip experiments, verify TX data |
| Session 2: Chat API route | 45-60 min | API route, streaming, rate limiting, budget |
| Session 3: Chat UI | 45-60 min | Chat component, two paths, degradation UI |
| Session 4: Ballot + profile | 30-45 min | Downloads, uploads, parsing |
| Session 5: Legal + deploy | 30-45 min | Privacy, terms, metadata, Vercel, smoke test |
| **Total** | **~3-4 hours** | |

Sessions 2+3 are the critical path. If time gets tight, Session 4 (ballot/profile downloads) can ship in a fast-follow tomorrow — the chat itself is the launch feature.
