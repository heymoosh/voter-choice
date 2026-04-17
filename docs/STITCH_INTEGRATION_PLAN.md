# Stitch UI Integration Plan

**Branch:** `stitch/ui-integration`  
**Base:** `launch/production`  
**Goal:** Replace the current UI with the Google Stitch → AI Studio generated front-end, keeping all backend logic intact. Production-quality outcome.

---

## Context

This branch tests a new workflow: **Stitch (design) → Google AI Studio (front-end code) → Claude Code (backend integration + polish)**. If the result is better than the current UI, it ships.

The civic-research code from AI Studio is a Vite + React Router app with a Material 3 design system, Motion animations, and 6 pages of high-fidelity UI. All data is hardcoded/stubbed. The voter-choice repo has a complete Next.js backend with Claude chat streaming, Google Civic API proxy, budget tracking, rate limiting, and Texas election data.

The plan ports the Stitch UI into the Next.js app so the backend stays untouched.

---

## ⚠️ Entry Flow Change (2026-04-13)

`launch/production` no longer starts with a bare ZIP code. The landing form now collects a **full street address upfront** (street + city + state + ZIP), because we need the full address to call Google Civic Information API and pull real polling/ballot data. The current production flow is:

1. Landing page → `ZipForm` accepts a full address string, runs `extractZip()` to derive the ZIP for state/county lookup
2. On submit → `lookupZip()` resolves state, `getStateData()` loads election data, **and** `fetchCivicData(address)` calls `/api/civic` upfront
3. Address is then persisted/passed downstream so the Polling page does not need to re-collect it
4. `AddressInput.tsx` exists as a secondary component for cases where address still needs to be edited or re-entered

The Stitch/AI Studio reference code (`reference/civic-research/`) was generated against the **old ZIP-only** flow. Every place this plan or the reference code says "ZIP input" on the landing page must be replaced with **full street address input** that matches the current `ZipForm` behavior. Do **not** regress the entry flow.

Affected areas (also flagged inline in the phases below):
- **Phase 3a Landing Page** — must port as full-address input, not ZIP
- **Phase 3d Polling Place** — address is already collected at landing; this page should consume the stored address, not re-prompt (unless the user wants to look up a different address)
- **Civic API wiring** — happens at landing submit, not on the polling page
- **State resolution** — still derived from the address via `extractZip()` + `lookupZip()`
- **Returning user upload** — if a `.CIVIC` file already contains an address, skip the address form and proceed directly
- **i18n strings** — translation keys for "enter your ZIP" must be replaced with "enter your address" equivalents (Spanish copy too)
- **Validation + error states** — ported landing must show address-shape errors (missing street, missing zip, etc.), not just 5-digit zip errors
- **Tests** — any new landing tests must cover address parsing + civic API call, not just zip validation
- **Analytics/data-testids** — the landing input testid changes from a zip-style id to an address-style id; update PROJECT_SPEC if it pinned the old id

---

## Source File Locations

### Reference: Stitch/AI Studio Front-End Code

**Location in branch:** `reference/civic-research/` (copied from Downloads at branch creation, gitignored)

| File | Purpose | Port Target |
|---|---|---|
| `reference/civic-research/src/index.css` | Material 3 color tokens, Public Sans font, Tailwind base | `src/app/globals.css` |
| `reference/civic-research/src/lib/utils.ts` | `cn()` utility (clsx + tailwind-merge) | `src/lib/utils.ts` |
| `reference/civic-research/src/components/Layout.tsx` | Responsive nav shell (sidebar + bottom nav) | `src/components/StitchLayout.tsx` |
| `reference/civic-research/src/App.tsx` | Route definitions (React Router) | `src/app/` directory structure (Next.js App Router) |
| `reference/civic-research/src/pages/LandingPage.tsx` | Hero, ZIP input, trust signals, returning user upload — **port as full-address input (see Entry Flow Change)** | `src/app/page.tsx` |
| `reference/civic-research/src/pages/DeadlinesPage.tsx` | Expandable timeline, election dates | `src/app/deadlines/page.tsx` |
| `reference/civic-research/src/pages/IDRequirementsPage.tsx` | Accepted IDs grid, impediment declaration | `src/app/id-rules/page.tsx` |
| `reference/civic-research/src/pages/PollingPlacePage.tsx` | Address search, location cards | `src/app/polling/page.tsx` |
| `reference/civic-research/src/pages/ChatPage.tsx` | Research chat UI, progress tracker, selection chips | `src/app/chat/page.tsx` |
| `reference/civic-research/src/pages/ResearchPortfolioPage.tsx` | Ballot summary, candidate selections, print/download | `src/app/portfolio/page.tsx` |
| `reference/civic-research/package.json` | Dependency list (Motion, clsx, tailwind-merge, etc.) | `package.json` (merge new deps) |
| `reference/civic-research/src/main.tsx` | Vite entry point | Not ported (Next.js handles this) |
| `reference/civic-research/vite.config.ts` | Vite config | Not ported (Next.js handles this) |

### Reference: Stitch Design Assets

**Location:** `docs/UI_REFERENCE/` (already in repo)

Contains the original Stitch design screens — use these as the visual truth when the AI Studio code diverges or when components need refinement.

### Existing Backend (Do NOT Modify)

| File | Purpose |
|---|---|
| `src/app/api/chat/route.ts` | Claude Sonnet streaming chat endpoint |
| `src/app/api/civic/route.ts` | Google Civic API proxy (polling locations) |
| `src/lib/server/budget.ts` | Monthly budget tracking ($20 cap, tier thresholds) |
| `src/lib/server/rate-limit.ts` | Per-IP rate limiting (concurrent sessions, daily caps) |
| `src/lib/lookupZip.ts` | ZIP code → state(s) mapping |
| `src/lib/getStateData.ts` | Async state election data loader |
| `src/lib/generatePrompt.ts` | Customized prompt builder (EN/ES) |
| `src/lib/getDeadlineStatus.ts` | Deadline → color/status calculator |
| `src/lib/chatParser.ts` | Structured content extraction ([CANDIDATES], [PROPOSITION]) |
| `src/lib/parseBallotContent.ts` | Ballot summary extraction from chat |
| `src/lib/ballot-utils.ts` | Ballot + voter profile extraction |
| `src/lib/i18n.tsx` | Language context provider (EN/ES) |
| `src/lib/translations.ts` | All UI translation strings |
| `src/lib/researchMode.tsx` | Research mode context |
| `src/types/election.ts` | TypeScript interfaces for election data |
| `src/data/states/TX.json` | Texas election data (dates, rules, resources) |
| `src/data/states/CA.json`, `NH.json`, `AZ.json`, `NM.json` | Other state stubs |
| `src/data/zip-to-state.json` | ZIP override mappings |
| `docs/BALLOT_PROMPT.md` | System prompt for Claude chat (EN + ES) |

### Existing UI Components (Available for Reuse or Reference)

These are the current `launch/production` components. Some logic should be extracted and reused even if the visual component is replaced:

| File | Reusable Logic |
|---|---|
| `src/components/ChatPanel.tsx` | SSE stream parsing, session management, structured content extraction — **extract into `useChat` hook** |
| `src/components/BallotToolClient.tsx` | Top-level state orchestration, budget check on mount |
| `src/components/ZipForm.tsx` | **Full-address entry + `extractZip()` + civic API trigger** — current production entry form. Reuse logic; restyle visually. |
| `src/components/AddressInput.tsx` | Standalone address input component (already address-based) — usable on Polling page if user wants to re-query a different address |
| `src/components/PromptOutput.tsx` | Copy/paste fallback flow (reuse for budget exhaustion) |
| `src/components/StructuredCards.tsx` | Candidate/proposition card rendering |
| `src/components/BallotActions.tsx` | Download ballot, download profile handlers |
| `src/components/ProfileUpload.tsx` | Voter profile upload + parse logic |
| `src/components/HandoffPackage.tsx` | Three-output handoff generation |
| `src/components/LanguageToggle.tsx` | EN/ES toggle (restyle for new nav) |

---

## What Transfers Cleanly (No Changes Needed)

These move from civic-research into Next.js with zero or trivial modifications:

- **Color system** — Material 3 tokens in `index.css` → `globals.css` custom properties
- **Typography** — Public Sans font import, weight/tracking utilities
- **All visual components** — Cards, badges, chips, timeline, progress bars, candidate grids
- **Animation library** — `motion` (Framer Motion successor) works in client components
- **Icons** — Lucide React (already a dependency in both projects)
- **Utility functions** — `cn()` helper using clsx + tailwind-merge

## What Gets Replaced by Existing Backend

The civic-research stubs these out. The voter-choice repo already has production implementations:

| Civic-Research (stubbed) | Voter-Choice (production) | Action |
|---|---|---|
| Hardcoded Texas dates | `src/data/states/TX.json` | Wire Stitch UI to existing data loader |
| Hardcoded ID requirements | `TX.json` → `votingRules` | Wire to existing data |
| Hardcoded polling places + dummy map | `/api/civic` route + Google Civic API | Wire to existing API route |
| No chat functionality | `/api/chat` route + Claude Sonnet streaming | Wire Stitch ChatPage to existing streaming logic |
| Hardcoded candidate comparisons | Chat parser + StructuredCards | Wire to existing structured content extraction |
| No budget tracking | `lib/server/budget.ts` | Wire budget status to Stitch UI chrome |
| No rate limiting | `lib/server/rate-limit.ts` | Already handled server-side, no UI work |
| Alert-only file upload | Existing ProfileUpload component logic | Port upload handler into Stitch UI |
| No ballot generation | Existing BallotBuilder + ballot-utils | Wire to Stitch ResearchPortfolioPage |
| No i18n | `lib/translations.ts` + LanguageProvider | Integrate — see Phase 4 |

## What the Stitch UI Adds (New)

Things the current voter-choice UI doesn't have:

- **Multi-page navigation** with sidebar (desktop) + bottom nav (mobile) — current app is single-page
- **Material 3 design system** — richer visual hierarchy, consistent token-based theming
- **Motion animations** — entrance effects, staggered reveals, loading states
- **Dedicated pages** for Deadlines, ID Requirements, Polling — currently these are tabs within ResearchLayout
- **Progress tracker** in chat — visual ballot completion percentage
- **Selection chips** — collapsible panel showing current ballot picks
- **Research memo format** — structured candidate comparison cards with source citations
- **Returning user flow** — explicit .CIVIC file upload with drag-and-drop UI

---

## Phased Build Plan

### Phase 1: Branch Setup + Reference Codebase + Design System

**What:** Create the branch, bring in the reference code, install new dependencies, port the design system.

- Create `stitch/ui-integration` branch from `launch/production`
- Copy `Downloads/civic-research/` into `reference/civic-research/` in the repo
- Add `reference/` to `.gitignore` (reference code is for Claude Code to read, not to ship)
- Add new dependencies: `motion`, `clsx`, `tailwind-merge` (Lucide already present)
- Port Material 3 CSS custom properties from `reference/civic-research/src/index.css` into `src/app/globals.css`
  - Namespace new tokens (e.g., `--md-primary`) to avoid collisions with existing Tailwind theme
  - Preserve existing Tailwind config
- Import Public Sans font in root layout
- Create the `cn()` utility in `src/lib/utils.ts` (from `reference/civic-research/src/lib/utils.ts`)
- **Verify:** `npm run build` succeeds, existing pages still render correctly with the new CSS variables

### Phase 2: Layout + Navigation Shell

**What:** Replace the current single-page layout with the multi-page navigation structure.

- Create `src/components/StitchLayout.tsx` client component
  - Port from `reference/civic-research/src/components/Layout.tsx`
  - Replace React Router `<NavLink>` with Next.js `<Link>` + `usePathname()` for active states
  - Sticky header, desktop sidebar, mobile bottom nav
- Set up Next.js App Router page structure:
  - `src/app/page.tsx` → Landing (hero + zip input)
  - `src/app/deadlines/page.tsx` → Election dates timeline
  - `src/app/id-rules/page.tsx` → Voter ID requirements
  - `src/app/polling/page.tsx` → Polling place finder
  - `src/app/chat/page.tsx` → AI research chat
  - `src/app/portfolio/page.tsx` → Ballot summary + voter profile
  - Keep existing `src/app/privacy/page.tsx` and `src/app/terms/page.tsx`
- Update `src/app/layout.tsx` to use `StitchLayout`
- **Do not** wire any data yet — pages render with placeholder content from the reference code
- **Verify:** Navigation works on desktop and mobile, all routes resolve, `npm run build` passes, existing API routes still function at `/api/chat` and `/api/civic`

### Phase 3: Page-by-Page Component Port (Data-Connected)

Port each page from `reference/civic-research/src/pages/`, connecting to real backend data. Order: simplest → most complex.

#### 3a: Landing Page
- **Reference:** `reference/civic-research/src/pages/LandingPage.tsx` (was built around a ZIP-only field — **must be adapted, not copied verbatim**)
- Port hero section with Motion entrance effects
- **Replace the reference's ZIP input with a full street address input** that matches the current `ZipForm.tsx` behavior:
  - Accept full address string (street + city + state + ZIP)
  - Run `extractZip()` to derive ZIP for state lookup
  - Call `lookupZip()` → `getStateData()` for state/election data
  - Call `/api/civic` (via `fetchCivicData(address)` pattern in `BallotToolClient.tsx`) **upfront** so polling data is ready downstream
  - Show address-shape validation errors, not just zip errors
  - Update placeholder/label/aria-label copy in EN and ES
- Persist the submitted address into shared state so downstream pages (Polling, Chat, Portfolio) can read it without re-prompting
- Port trust signals section and quick links grid
- Port returning user upload section → connect to existing `src/components/ProfileUpload.tsx` logic; if the uploaded `.CIVIC` profile already contains an address, skip the address form
- **Verify:** A real Texas address (e.g., `1100 Congress Ave, Austin, TX 78701`) loads Texas data, fires the civic API call, and navigates onward; bare ZIP-only input is rejected with a clear "please enter your full address" error

#### 3b: Deadlines Page
- **Reference:** `reference/civic-research/src/pages/DeadlinesPage.tsx`
- Port timeline component with expandable `<details>` sections
- Replace hardcoded dates with dynamic data from `src/data/states/TX.json` elections array
- Wire deadline status indicators to existing `src/lib/getDeadlineStatus.ts`
- Port quick-access resource links → point to real URLs from `TX.json` resources
- **Verify:** Dates match TX.json, status colors correct relative to today, all 4 elections listed

#### 3c: ID Requirements Page
- **Reference:** `reference/civic-research/src/pages/IDRequirementsPage.tsx`
- Port accepted IDs grid, warning banner, impediment declaration section
- Replace hardcoded data with `src/data/states/TX.json` → `votingRules` fields
- Wire "Download Declaration Form" to real resource URL
- **Verify:** All 7 ID types render, expiration rule displays, supporting docs list matches data

#### 3d: Polling Place Page
- **Reference:** `reference/civic-research/src/pages/PollingPlacePage.tsx` (reference assumes the user enters their address here for the first time — **no longer true**)
- **Default state:** address was already collected on the landing page and the civic API has already been called. This page should render the cached polling locations + early vote sites immediately, without re-prompting.
- Provide a secondary "look up a different address" affordance (reuse `src/components/AddressInput.tsx`) for users who want to check another location — that path re-fires `/api/civic`
- Port search UI and location card layout (the search UI becomes the secondary lookup, not the default)
- Replace dummy image with directions link (per LAUNCH_PLAN — no embedded maps)
- Wire to existing `src/app/api/civic/route.ts` via fetch when the secondary lookup is used
- Display real polling locations and early vote sites from Google Civic API response
- Handle loading, error, and no-results states (fallback to county website link); also handle "address not yet provided" by routing the user back to the landing form
- **Verify:** Landing-page address auto-populates polling results without re-entry; the optional re-lookup form still works

#### 3e: Chat Page (Most Complex)
- **Reference:** `reference/civic-research/src/pages/ChatPage.tsx`
- **Pre-work:** Extract streaming logic from `src/components/ChatPanel.tsx` into a `src/hooks/useChat.ts` custom hook (SSE parsing, session ID, message history, error handling)
- Port the Stitch chat UI (input bar, message display, typing indicator)
- Wire to `useChat` hook → existing `/api/chat` streaming endpoint
- Wire structured content extraction → existing `src/lib/chatParser.ts`
- Port research memo card format for AI responses → integrate with `src/components/StructuredCards.tsx` rendering
- Port selection chips → wire to `src/lib/ballot-utils.ts` ballot builder logic
- Wire progress tracker to actual ballot completion state
- Integrate budget status display from `src/lib/server/budget.ts`
- Handle edge cases: budget exhausted (→ copy/paste fallback), rate limited, session timeout
- Port handoff flow → wire to existing `src/components/HandoffPackage.tsx` logic
- **Verify:** Full end-to-end: ZIP entry → chat opens → Claude responds with streaming → structured cards render → ballot picks tracked → handoff works at budget threshold

#### 3f: Research Portfolio Page
- **Reference:** `reference/civic-research/src/pages/ResearchPortfolioPage.tsx`
- Port ballot summary display, candidate selections, ballot measures layout
- Wire to existing `src/lib/parseBallotContent.ts` and `src/lib/ballot-utils.ts`
- Wire "Print My Ballot" to actual print/download → reuse handlers from `src/components/BallotActions.tsx`
- Wire "Download Profile" to voter profile generation
- Replace dummy polling location with real data (passed from polling lookup or state)
- **Verify:** Portfolio reflects actual chat selections, downloads produce valid files

### Phase 4: Production Parity

**What:** Bring the new UI up to the same quality bar as `launch/production`.

#### 4a: Spanish Translation (i18n)
- Integrate existing `src/lib/i18n.tsx` LanguageProvider into StitchLayout
- Add translation keys to `src/lib/translations.ts` for all new Stitch UI strings (nav labels, page headers, trust signals, timeline labels, etc.)
- Port `src/components/LanguageToggle.tsx` into new header/nav (restyle to match)
- Replace all hardcoded English strings in ported components with `t()` calls
- **Verify:** Full app works in both EN and ES, no untranslated strings visible

#### 4b: Copy/Paste Fallback
- When budget is in `soft_close` or `exhausted` state, show prompt output instead of chat
- Port existing `src/components/PromptOutput.tsx` + `src/lib/generatePrompt.ts` logic into Stitch layout
- Display budget status messaging in the chat page UI
- **Verify:** Set budget to exhausted in dev → app gracefully degrades to copy/paste mode

#### 4c: Accessibility (WCAG AA)
- Audit all new components for keyboard navigation, focus management, ARIA labels
- Ensure skip-to-content link works with new StitchLayout
- Check color contrast ratios of Material 3 palette against WCAG AA requirements
- Add `data-testid` attributes per `docs/PROJECT_SPEC.md` requirements
- **Verify:** Lighthouse accessibility score ≥ 95, keyboard-only navigation works throughout

#### 4d: Testing
- Port or rewrite unit tests for adapted components (target: match existing 159+ tests)
- Existing backend tests should pass untouched — run `npm run test` to confirm
- Add integration tests for new page navigation flow
- Run Playwright e2e tests (`npm run e2e`) and fix any failures
- **Target:** ≥ 91.6% coverage

#### 4e: Performance
- Server/client component split: server components where no interactivity needed, `'use client'` only for interactive + animated components
- Lazy-load Motion library on pages that use animations
- Check bundle size impact of new dependencies (`motion` is the largest addition)
- Run Lighthouse performance audit
- **Target:** Lighthouse performance ≥ 95, matching current 100 score as closely as possible

### Phase 5: Cleanup + Decision

- Delete `reference/civic-research/` directory (its job is done)
- Remove unused old UI components that have been fully replaced
- Keep shared utilities and backend files
- Document the Stitch → AI Studio → Claude Code workflow: time spent per phase, what worked, what needed manual fixes
- Side-by-side comparison: visual quality, a11y score, performance score, code maintainability, total build time
- **Decision point:** Merge `stitch/ui-integration` into `launch/production`, iterate further, or keep current UI

---

## Dependency Changes

**Add to package.json:**
- `motion` — animations (Framer Motion successor, used throughout civic-research)
- `clsx` — conditional class names (used by `cn()` utility)
- `tailwind-merge` — merge Tailwind classes without conflicts (used by `cn()` utility)

**Already present (no change):**
- `lucide-react`, `next`, `react`, `react-dom`, `tailwindcss`, `@anthropic-ai/sdk`

**From civic-research, NOT ported (framework-specific or unused):**
- `react-router-dom` — Next.js handles routing
- `@google/genai` — using Anthropic, not Gemini
- `express` — Next.js handles serving
- `vite`, `@tailwindcss/vite` — Next.js handles bundling

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Motion library + Next.js SSR conflict | Animations break or cause hydration errors | Mark animated components as `'use client'`, test SSR behavior early in Phase 1 |
| Material 3 colors clash with existing Tailwind theme | Visual inconsistencies during transition | Namespace new tokens (e.g., `--md-primary`), remove old tokens only after full port |
| Chat streaming logic tightly coupled to current ChatPanel | Hard to rewire into Stitch chat UI | Extract into `useChat` hook as Phase 3e pre-work before porting any chat UI |
| i18n coverage gaps | Untranslated strings in production | Create translation checklist per page, test both languages per phase |
| Bundle size increase from Motion | Performance regression | Tree-shake Motion imports, dynamic import for animated sections, measure before/after |
| Stitch designs vs. AI Studio code drift | Code doesn't match the Stitch designs exactly | Cross-reference `docs/UI_REFERENCE/` screens during each page port |
| Reference code uses old ZIP-only entry flow | Porting verbatim would regress the production address-first flow and break the civic API call | Treat the landing input as a known divergence — port the **shape** of the Stitch landing UI but swap the input + submit handler to match `ZipForm.tsx`'s address behavior; review every reference file that touches "zip" before porting |

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-13 | Port Stitch UI into Next.js (not keep as separate Vite app) | Preserves proven backend, single deployment, no framework split |
| 2026-04-13 | Production-quality target (not throwaway experiment) | If the Stitch workflow produces better UI faster, it should ship |
| 2026-04-13 | Phased approach (design system → shell → pages → parity) | Reduces blast radius — each phase is independently verifiable |
| 2026-04-13 | Copy civic-research into `reference/` dir on branch | Gives Claude Code direct access to source files during porting, gitignored so it doesn't ship |
| 2026-04-13 | Keep `launch/production` full-address entry flow; do **not** regress to ZIP-only | Google Civic Information API needs a full address to return polling/ballot data; collecting it upfront avoids a second prompt later and unblocks the polling page rendering immediately |
