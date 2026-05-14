# V2 Plan — Closing the Gap to the UI Reference

**Date:** 2026-04-12
**Author:** Muxin + Claude (planning session)
**Goal:** Bring Voter Choice from "functional MVP" to the experience described in `docs/UI_REFERENCE/`.

---

## Critical UX Bug: Chat Is Hidden Behind Address Input

**The chat feature exists in the code but most users will never find it.**

After entering a zip code, the user sees: StateInfoCard → ProfileUpload → AddressInput. The "Research My Ballot" chat button only appears AFTER the user either enters a street address or clicks "Skip." The address input has no obvious indication that it's a gate blocking the main feature. If a user doesn't interact with it, they see election info and nothing else — no chat button, no copy/paste prompt, no ballot builder.

This is the flow in `BallotToolClient.tsx`:

```
showChatCTA = !chatOpen && addressDone && (chatAvailable || !budgetChecked)
```

`addressDone` requires the address step to be "done", "skipped", or "error" — but it starts as "input". So the entire product is gated behind an optional address lookup that looks like a required step.

**This must be fixed before any design work.** The simplest fix: show the chat CTA immediately after zip lookup, move address input to be optional and non-blocking (or accessible from within the chat experience). The address lookup is a nice-to-have for polling location data — it should never block the core product.

Additionally: even if a user does get past the address gate, they then see the privacy notice ("Your conversation stays in your browser only...") with a "Got it, let's start" button. Only after clicking that does the chat actually begin. That's three gates: zip → address → privacy → chat. The reference shows one: zip → research begins.

---

## Diagnosis: What Happened

The MVP launch plan (LAUNCH_PLAN.md) scoped everything into 5 tightly-bounded Claude Code sessions. The backend is solid — streaming chat, budget management, graceful handoff, Google Civic integration, rate limiting, and CI/CD all work. But the session prompts compressed the entire frontend into Session 3A ("Chat UI + Design System" in 40-50 min), which forced Claude Code to build a working chat on a single page rather than implementing the rich information architecture from the UI reference.

### What the UI reference describes (and the MVP doesn't have)

| Reference Screen                           | What It Shows                                                                                                                                                                                                         | Current State                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **landing_final_mobile_flow**              | Editorial hero ("Your Ballot, Your Research, Your Privacy"), 3 trust signals with icons, "How it Works" 3-step visual section, returning voter file upload, resource cards (polling, dates, ID rules), mission footer | Basic hero with title + subtitle + chatbot links. No trust signals, no How it Works, no resource cards.                                           |
| **fresh_research_start_new_voter**         | Desktop sidebar navigation (Dates, ID Requirements, Polling Places, Sample Ballot), AI "Research Memo" card style, status indicators, historical context callout, days-until-election countdown, quick-action chips   | Single-page chat with no sidebar, no navigation between info sections, no quick-action chips.                                                     |
| **active_research_progress_overlays**      | Sticky progress bar (25%), selections counter, candidate cards in grid with incumbent/challenger labels, "Verified Sources" section, "Deep Search Prompt" input                                                       | Chat streams plain text. No progress tracking, no structured candidate cards, no source citations in UI.                                          |
| **research_payoff_mobile_optimized_final** | Printable "Research Portfolio" with candidate cards (photos, party, platform quote), proposition YES/NO cards, polling location with map + hours table, "Print My Ballot" CTA, encrypted profile download             | Ballot downloads as plain text window. No candidate cards, no proposition formatting, no polling location in ballot view.                         |
| **resumed_research_returning_voter**       | Welcome back with loaded profile, bento grid (district, pending measures, election day), Active Intelligence sidebar (matched topics + correlation scores), polling map thumbnail                                     | Simple file upload with text confirmation. No bento grid, no intelligence sidebar. _(Explicitly deferred in launch plan — v2 feature.)_           |
| **research_fallback_session_handoff_v2**   | Styled handoff package with warm messaging, budget explanation, chat history summary, resume options                                                                                                                  | HandoffPackage component exists but is functionally styled, not matching reference.                                                               |
| **voter_id_rules_texas**                   | Dedicated page: editorial header, warning banner (4-year expiration), 7-item accepted ID grid with icons, "Reasonable Impediment Declaration" section, supporting docs list, download button                          | Voter ID info displayed as text lines inside StateInfoCard. No dedicated view, no icon grid, no declaration info.                                 |
| **unified_voting_location_schedule**       | Precinct finder with map, distance badge, ADA indicator, wait time estimate, early voting hours table, "Add to Calendar" CTA, alternative locations                                                                   | AddressInput + PollingLocationCard shows name/address/hours. No map, no distance, no ADA info, no calendar integration, no alternative locations. |
| **visual_election_timeline**               | Vertical milestone timeline with icons (registration deadline, early voting, election day)                                                                                                                            | No timeline component exists. Dates shown as text in StateInfoCard.                                                                               |

### What was explicitly deferred (reasonable v2 cuts from LAUNCH_PLAN.md)

These were called out in the launch plan as post-MVP:

- Active Intelligence sidebar with matched topics + correlation scores (returning voter)
- Embedded Google Maps (directions links cover 90% of value)
- Candidate enrichment APIs (Vote Smart, OpenStates, OpenFEC)
- Democracy Works integration
- 50-state expansion

### What the backend already supports (no rebuild needed)

- `/api/chat` — streaming, rate limiting, budget tracking, graceful handoff, session management
- `/api/civic` — Google Civic API integration (polling + early vote sites)
- Budget degradation system (0%→70%→80%→90%→100% thresholds)
- Ballot extraction from AI output (MY BALLOT / MY VOTER PROFILE markers)
- Voter profile upload with prompt injection protection
- Bilingual support (EN/ES)
- CI/CD pipeline (Bitwarden SM → GitHub Actions → Vercel)

---

## Verification Needed: Backend Deployment

Before building more frontend, confirm the deployed site actually works end-to-end. The CI/CD pipeline exists in `.github/workflows/deploy.yml` but success hasn't been verified in this session.

### Checks to run

1. **Has the site deployed?** Check the Vercel dashboard or visit the production URL. Look for a successful GitHub Actions run on `launch/production`.
2. **Does the chat API work?** Enter a TX zip code, start a chat, confirm Claude responds with streaming tokens.
3. **Does the Civic API work?** Enter a street address, confirm polling location data returns.
4. **Does budget tracking work?** Check the Anthropic Console for usage. Send a few test messages and confirm the budget response headers come back.
5. **Does the handoff system work?** Simulate budget exhaustion (or test the 60-message session limit) and confirm the handoff package renders.
6. **Do downloads work?** Complete a conversation through to ballot generation, confirm the ballot opens in a printable window and the profile downloads as .txt.

If any of these fail, fix them before UI work. A beautiful frontend on a broken backend is worse than what exists now.

---

## Sessions: 11-Session UI Rebuild

Each session is a fresh Claude Code window. The session prompt, reference files, and verification criteria are self-contained — no context from previous sessions is needed beyond what's committed to the repo. Sessions are ordered by dependency; do not skip ahead.

---

### Session 1: Unblock the Chat + Verify Deployment

**Goal:** Fix the critical UX bug where the chat is unreachable, then verify the deployed backend works end-to-end.

**Reference files:** None (functional fix, not visual)

**Context for Claude Code:**

- `src/components/BallotToolClient.tsx` — the `showChatCTA` condition requires `addressDone` to be true, which gates the entire product behind the optional address input. The "Research My Ballot" button is invisible until the user either enters a street address or clicks "Skip."
- `src/components/ChatPanel.tsx` — after the CTA, there's a second gate: a privacy notice with "Got it, let's start" that must be clicked before the chat begins.
- The flow today is: zip → address input (blocking) → chat CTA → privacy gate → chat. It should be: zip → chat CTA → chat (with privacy notice inline, address input optional within the experience).

**Scope:**

- Remove the `addressDone` condition from `showChatCTA` — the chat button should appear immediately after zip lookup resolves to a state
- Move `AddressInput` to render AFTER the chat CTA or inside the research experience (e.g., as a panel the user can optionally open for polling location data)
- Make the privacy notice inline (visible but not a blocking modal) or fold it into the chat's first message context — reduce the click path to: zip submit → "Research My Ballot" → chat begins
- Verify `/api/chat` GET returns a budget status (confirms the route is deployed and responding)
- Verify `/api/chat` POST streams a Claude response (enter a TX zip, start the chat, confirm tokens arrive)
- Verify `/api/civic` returns data for a TX street address
- Run `npm run build` to confirm no regressions

**Verification:**

- After entering zip 77001, the "Research My Ballot" button is visible without scrolling past or interacting with any other form
- Clicking it opens the chat and the AI begins responding within seconds
- Address input is still available somewhere but does not block the main flow
- `npm run build` passes

**Commit:** `fix: unblock chat flow — remove address gate, inline privacy notice`

---

### Session 2: Design System Foundation

**Goal:** Make the existing page look like the UI reference design system. No new features or layout changes — just visual transformation of what's already on screen.

**Reference files:**

- `docs/UI_REFERENCE/voter_choice_editorial/DESIGN.md` — the rules (colors, typography, surfaces, do's and don'ts)
- `docs/UI_REFERENCE/landing_final_mobile_flow/screen.png` — for overall color/type feel
- `docs/UI_REFERENCE/fresh_research_start_new_voter/screen.png` — for component-level styling cues

**Context for Claude Code:**

- Shared UI components already exist in `src/components/ui/` (Button, Card, Notice, TextInput, Badge) but they don't fully match the design system
- Tailwind config may have some design tokens but needs audit
- The page currently uses system fonts or partial Public Sans — needs verification

**Scope:**

- Import and enforce Public Sans as the sole typeface (via Google Fonts or local). Verify it's rendering, not falling back.
- Set Tailwind config tokens: `primary` (#005c55), `surface` (#fbf9f7), `surface-low` (#f5f3f1), `surface-lowest` (#ffffff), `surface-high` (#eae8e6), `accent`/tertiary (#7f4025), `on-surface` (#1b1c1b), `on-primary` (#ffffff), `outline-variant` (#bdc9c6)
- Apply warm cream `surface` (#fbf9f7) as the page background
- Restyle every component in `src/components/ui/` to match DESIGN.md: sharp corners (rounded-sm max), no 1px borders (use tonal shifts), no heavy shadows, correct color usage
- Restyle `StateInfoCard`, `ChatPanel`, `PromptOutput`, `ZipForm` to use the editorial surface hierarchy (white cards on cream, surface-low for secondary blocks)
- Apply typography scale: display-lg (3.5rem) for the hero h1, title-lg (1.375rem) for section headings, body-lg (1rem) for text, label styles for metadata
- Audit all components for violations: gradients, blue links, heavy shadows, rounded corners above md, 1px solid borders for layout
- `npm run build` passes

**Verification:**

- Page background is warm cream, not white
- Cards are white on cream with no visible borders
- All text is Public Sans
- Hero heading is large editorial typography (3.5rem+)
- Buttons are sharp-cornered with teal or sienna fills
- No 1px border lines visible anywhere in the layout
- `npm run build` passes

**Commit:** `design: apply editorial design system — colors, typography, surfaces, components`

---

### Session 3: Landing Page

**Goal:** Rebuild the hero and pre-chat experience to match the landing page reference.

**Reference files:**

- `docs/UI_REFERENCE/landing_final_mobile_flow/code.html` — **the implementation target** (open and study the exact HTML/CSS)
- `docs/UI_REFERENCE/landing_final_mobile_flow/screen.png` — **the visual QA target**

**Context for Claude Code:**

- Session 2 established the design system tokens and component styles — use them
- The current hero in `src/app/PageContent.tsx` is basic: title, subtitle, chatbot links
- The landing reference shows a much richer pre-chat experience

**Scope:**

- Replace the hero section to match the reference: commanding editorial headline, trust signals with icons ("No data stored," "No accounts," "100% private")
- Add "How it Works" 3-step visual section showing the user journey (adapt copy for actual functionality — the reference is aspirational)
- Add a returning voter section — file upload for `.txt` voter profile, more prominent than the current hidden `ProfileUpload`
- Add resource cards section linking to election dates, ID rules, and polling places (these will link to dedicated views built in Sessions 7-8, but for now they can anchor-link to existing StateInfoCard sections)
- Redesign the footer: mission statement, civic integrity notice, "Get Started Now" CTA
- The zip code input should feel like a natural part of the hero, not a separate form section
- Bilingual support: all new copy needs EN/ES translations in `src/lib/translations.ts`
- `npm run build` passes

**Verification:**

- Open `docs/UI_REFERENCE/landing_final_mobile_flow/screen.png` side-by-side with the rendered page — they should share the same visual DNA (editorial typography, teal/cream palette, trust signals, step section)
- All new text has Spanish translations
- Zip code entry and chat flow still work end-to-end
- `npm run build` passes

**Commit:** `design: rebuild landing page to match editorial reference`

---

### Session 4: Research Layout + Navigation

**Goal:** Transform the post-zip-entry experience from a flat list into a structured research interface with navigation.

**Reference files:**

- `docs/UI_REFERENCE/fresh_research_start_new_voter/code.html` — **the implementation target**
- `docs/UI_REFERENCE/fresh_research_start_new_voter/screen.png` — **the visual QA target**

**Context for Claude Code:**

- After zip entry, the current `ElectionResult` component in `BallotToolClient.tsx` renders: StateInfoCard → ProfileUpload → PollingSection → ChatCTA → ChatPanel → PromptOutput → BallotBuilder, all stacked vertically
- The reference shows a sidebar/tabbed layout: left navigation (Dates, ID Requirements, Polling Places, Sample Ballot) with the chat as the main content area
- The chat starts with an AI "Research Memo" card, not a plain text bubble

**Scope:**

- Add tabbed or sidebar navigation that organizes the existing election info into sections: Dates, ID Requirements, Polling Places, Ballot Research
- On desktop: sidebar left, chat/content right. On mobile: tabs at top or bottom, content below
- The chat panel becomes the "Ballot Research" tab/main content area — it should show the AI's initial research memo in a card format, not a plain bubble
- Days-until-election countdown as a prominent badge
- Quick-action suggestion chips below the chat input (e.g., "I'm in Travis County," "Tell me about the candidates," "What's on my ballot?")
- Status indicators showing session state ("Voter File Initialized," "Region: State of Texas")
- `StateInfoCard` content gets distributed into the navigation tabs rather than being one monolithic card
- `npm run build` passes

**Verification:**

- Compare against `fresh_research_start_new_voter/screen.png` — the layout should have a clear navigation structure, not a flat stack
- Navigation tabs/sidebar allows switching between election info categories
- Chat is accessible from the main research view
- Quick-action chips appear below chat input
- Countdown badge is visible
- Mobile layout stacks gracefully
- `npm run build` passes

**Commit:** `design: add research layout with navigation, chips, and countdown`

---

### Session 5: Research Progress + Structured Chat Output

**Goal:** Add progress tracking and render AI candidate/proposition output as structured cards instead of plain text.

**Reference files:**

- `docs/UI_REFERENCE/active_research_progress_overlays/code.html` — **the implementation target**
- `docs/UI_REFERENCE/active_research_progress_overlays/screen.png` — **the visual QA target**

**Context for Claude Code:**

- The AI's system prompt (in `docs/BALLOT_PROMPT.md` and `src/lib/generatePrompt.ts`) walks through a multi-step methodology: locate district → walk issues → choose primary → research candidates → handle propositions → generate ballot → create voter profile
- Currently the AI's markdown output streams as plain text in `ChatMessageBubble`
- The reference shows: sticky progress bar, "Selections (2)" counter, candidate comparison cards with incumbent/challenger labels, verified sources section

**Historical approach — deprecated:**
This plan originally proposed hidden JSON metadata markers for candidate and proposition cards. That approach was removed during the ballot prompt v2 migration. The current chat experience is conversational text only; candidate and proposition card parsing/rendering is not part of the runtime.

**Scope:**

- Do not revive hidden candidate/proposition JSON metadata markers without a new product decision and work packet.
- Do not add a parser for candidate/proposition metadata blocks.
- Render candidate JSON as grid cards: candidate name, incumbent/challenger label, focus areas, "View Full Ledger" expansion
- Render proposition JSON as cards with measure name, description, YES/NO recommendation
- Add a progress bar component that estimates completion based on which research steps have been covered (count marker types that have appeared: candidates, propositions, ballot)
- Add a "Selections" counter that tracks how many races the user has made decisions on (parse from candidate JSON blocks where the user confirmed a choice)
- Add a "Verified Sources" indicator — "Sources are from Claude's training data as of [date]. Always verify with official records before voting."
- Style the chat input area as a "Deep Search Prompt" (reference shows this as a styled input label)
- `npm run build` passes

**Verification:**

- Compare against `active_research_progress_overlays/screen.png`
- Progress bar appears and advances during conversation
- Candidate information renders as cards when the AI presents comparisons
- Sources indicator is visible
- If structured markers are used, the AI conversation still feels natural (markers don't leak into the displayed text)
- `npm run build` passes

**Commit:** `design: add research progress tracking and structured candidate cards`

---

### Session 6: Research Payoff Screen

**Goal:** When the AI generates the final ballot, present it as a polished "Research Portfolio" instead of a plain text dump.

**Reference files:**

- `docs/UI_REFERENCE/research_payoff_mobile_optimized_final/code.html` — **the implementation target**
- `docs/UI_REFERENCE/research_payoff_mobile_optimized_final/screen.png` — **the visual QA target**

**Context for Claude Code:**

- The AI generates `=== MY BALLOT ===` and `=== MY VOTER PROFILE ===` markers at the end of the conversation
- `src/components/BallotActions.tsx` currently detects these markers and offers download buttons
- `src/components/HandoffPackage.tsx` has parsing logic in `parseHandoffMarkers()`
- The reference shows a full "Research Portfolio" screen: candidate cards with race name, party, platform quote; proposition cards with YES/NO; polling location with map + hours table; "Print My Ballot" CTA; encrypted profile download

**Scope:**

- When the MY BALLOT marker is detected, transition the view to a full "Research Portfolio" layout (replace or overlay the chat, not just append buttons)
- Parse the ballot content into structured data: races → candidate selections, propositions → yes/no votes
- Render candidate selections as cards: race name, candidate name, party affiliation, key reason for selection (extracted from ballot text)
- Render propositions as cards with clear YES/NO indicators and measure description
- Include "Your Voting Destination" section pulling polling location data from the Civic API (if available) — name, address, hours, early voting schedule, "Get Directions" link
- Prominent "Print My Ballot" button that opens a print-optimized view (black-on-white, one page, large text)
- "Download Voter Profile" button alongside ballot
- Privacy protocol notice with shield icon
- Civic integrity notice in footer
- `npm run build` passes

**Verification:**

- Compare against `research_payoff_mobile_optimized_final/screen.png`
- After a conversation produces a ballot, the portfolio view renders with structured cards
- "Print My Ballot" opens a clean printable view
- Voter profile downloads as .txt
- Polling location section appears if Civic API data is available
- `npm run build` passes

**Commit:** `design: add Research Portfolio payoff screen with structured ballot cards`

---

### Session 7: Voter ID Rules + Election Timeline Views

**Goal:** Build dedicated views for voter ID information and election timeline — two data-display screens that pull from TX.json.

**Reference files:**

- `docs/UI_REFERENCE/voter_id_rules_texas/code.html` — **Voter ID implementation target**
- `docs/UI_REFERENCE/voter_id_rules_texas/screen.png` — **Voter ID visual QA target**
- `docs/UI_REFERENCE/visual_election_timeline/screen.png` — **Timeline visual QA target** (no code.html — build from the PNG)

**Context for Claude Code:**

- Voter ID data is in `src/data/TX.json` under `votingRules.acceptedIds` (7 items) and `votingRules.phonesAtPollsDetail`
- TX.json needs expanding: add `votingRules.impedimentDeclaration` (Reasonable Impediment info), `votingRules.supportingDocs` (list of alternative documents), and `votingRules.expirationRule` (4-year rule warning text)
- Election timeline data is already in TX.json: `elections[].date`, `registration.*.deadline`, `earlyVoting.startDate`, `earlyVoting.endDate`
- These views should be accessible from the navigation tabs built in Session 4

**Scope — Voter ID view:**

- Dedicated panel/tab matching the reference: editorial header "ID Requirements" with left accent bar
- Warning banner (tertiary/sienna color) about the 4-year expiration rule
- 7-item accepted ID grid with icons and descriptions (one card per ID type)
- "No ID? No Problem" section explaining the Reasonable Impediment Declaration
- Supporting documents list (birth certificate, utility bill, paycheck, government document, bank statement, etc.)
- Non-partisan footer notice
- Expand TX.json with the missing data fields

**Scope — Election timeline:**

- Vertical milestone timeline component
- Milestones: voter registration deadline, early voting start, early voting end, election day (pull from TX.json)
- Color-coded status: green (upcoming), yellow (imminent), teal (active now), gray (passed)
- Each milestone shows date and brief description
- This is a simpler component — build it in the same session as voter ID

**Scope — both:**

- Wire into the navigation tabs from Session 4 (ID Requirements tab → voter ID view, Dates tab → timeline view)
- Bilingual: all new copy in EN/ES
- `npm run build` passes

**Verification:**

- Compare Voter ID view against `voter_id_rules_texas/screen.png` — warning banner, ID grid, impediment section all present
- Compare timeline against `visual_election_timeline/screen.png` — vertical milestones with dates and status colors
- Both views accessible from navigation tabs
- TX.json has been expanded with new voter ID data fields
- `npm run build` passes

**Commit:** `design: add voter ID rules view and election timeline`

---

### Session 8: Polling Location View

**Goal:** Build an enhanced polling location display that matches the reference, integrating Google Civic API data.

**Reference files:**

- `docs/UI_REFERENCE/unified_voting_location_schedule/code.html` — **the implementation target**
- `docs/UI_REFERENCE/unified_voting_location_schedule/screen.png` — **the visual QA target**

**Context for Claude Code:**

- `/api/civic` route already exists and returns polling locations + early vote sites from Google Civic API
- `src/components/PollingLocationCard.tsx` and `src/components/AddressInput.tsx` exist but are minimal
- Session 1 moved address input to be non-blocking — it may now live inside the research experience
- The reference shows: "Find Your Precinct" search, primary recommendation card with distance/hours/ADA, early voting table, "Add to Calendar" CTA, alternative locations

**Scope:**

- Build as a dedicated tab/panel in the navigation (Polling Places tab)
- "Find Your Precinct" address search at the top of the view (reuse/restyle `AddressInput`)
- Primary polling location card: name, full address, election day hours, early voting hours in table format
- "Get Directions" button (existing Google Maps deep link)
- "Add to Calendar" button — generate an .ics file or Google Calendar link with election day, polling location address, and hours
- Alternative locations as compact cards below the primary (if Civic API returns multiple)
- ADA accessibility indicator — show if the Civic API data includes accessibility info, otherwise omit (don't fake it)
- Fallback: if no address entered or API returns nothing, show county election office link from TX.json
- Note at bottom: "Poll data from Google Civic Information API. Verify with your county election office."

**Not in scope (deferred):** Embedded map, distance badge, real-time wait times — these require additional APIs or data sources.

- `npm run build` passes

**Verification:**

- Compare against `unified_voting_location_schedule/screen.png` — structured polling card with hours table, directions, calendar
- Address search works and returns results for a TX address
- "Add to Calendar" generates a valid calendar event
- Alternative locations render when API returns multiple
- Graceful fallback when no data available
- `npm run build` passes

**Commit:** `design: add polling location view with calendar integration`

---

### Session 9: Handoff + Fallback Polish

**Goal:** Make the budget-exhausted and session-end experiences feel warm and first-class, not like error states.

**Reference files:**

- `docs/UI_REFERENCE/research_fallback_session_handoff_v2/code.html` — **the implementation target**
- `docs/UI_REFERENCE/research_fallback_session_handoff_v2/screen.png` — **the visual QA target**

**Context for Claude Code:**

- `src/components/HandoffPackage.tsx` has the handoff logic: parses `=== VOTER SESSION HANDOFF ===`, `MY BALLOT`, `MY VOTER PROFILE` markers, builds continuation prompt, and renders a package UI
- `BallotToolClient.tsx` renders `BudgetSoftCloseNotice` when budget is at soft_close
- The copy/paste fallback (Path B) is rendered via `PromptSection` as a collapsed `<details>` element
- `src/components/BallotBuilder.tsx` provides manual ballot entry
- The reference shows a warm, editorial handoff: styled messaging, budget explanation, chat history summary, clear continuation options

**Scope:**

- Restyle `HandoffPackage` to match the reference: warm editorial header ("Here's everything we've worked on so far"), not a warning/error treatment
- Clear visual sections: Your Ballot So Far, Your Voter Profile, Continue Where You Left Off
- "Monthly Chat Budget Reached" explanation in user-friendly language with the tertiary accent color — not alarming, just informative
- Chat history summary (what was covered, what remains) above the handoff content
- "Copy Continuation Prompt" button with links to Claude, ChatGPT, Gemini, Grok — styled as a first-class feature, not a fallback
- Restyle `BudgetSoftCloseNotice` to match the same warm editorial treatment
- Restyle the copy/paste `PromptSection` (Path B) — it's currently a collapsed `<details>` element. Make it a visible, editorial-styled section: "Prefer to use your own AI? Copy this prompt." with the same card/surface treatment as the rest of the design system
- Restyle `BallotBuilder` manual entry form with editorial card treatment
- `npm run build` passes

**Verification:**

- Compare against `research_fallback_session_handoff_v2/screen.png`
- Handoff package feels warm, not like an error
- Copy/paste path looks like a first-class feature
- "Copy Continuation Prompt" button works
- BallotBuilder is styled consistently with the rest of the site
- `npm run build` passes

**Commit:** `design: polish handoff package and fallback paths to editorial standard`

---

### Session 10: Mobile Optimization

**Goal:** Verify and fix responsive behavior across all views. Add mobile-specific navigation.

**Reference files:**

- ALL `screen.png` files in `docs/UI_REFERENCE/` — cross-reference each at mobile width
- `docs/UI_REFERENCE/research_payoff_mobile_optimized_final/screen.png` — specifically designed for mobile
- `docs/UI_REFERENCE/voter_id_rules_texas/screen.png` — shows fixed bottom navigation

**Context for Claude Code:**

- Several reference screens show a fixed bottom navigation bar with 4 tabs (varies by screen: Requirements/Polling Place/Ballot/Resources or Dates/IDs/Ballot/Profile)
- The current layout is responsive via Tailwind but was never specifically optimized for mobile after all the Session 2-9 changes
- Print stylesheet is needed for the ballot output

**Scope:**

- Add fixed bottom navigation bar on mobile (visible below 768px): 4 tabs mapping to the main navigation sections. The tabs should correspond to the same navigation built in Session 4.
- Test every view at 375px width — fix any overflow, truncation, or tap target issues
- Test every view at 768px (tablet) and 1280px (desktop) — verify layouts scale properly
- Verify all interactive elements have minimum 44x44px tap targets on mobile
- Verify chat input is accessible while scrolling (sticky bottom on mobile)
- Add print stylesheet for the Research Portfolio / ballot output: black-on-white, large text, fits one page, no navigation/chrome
- Verify the "Print My Ballot" button triggers clean print output
- Fix any z-index or overflow issues introduced by the navigation system
- `npm run build` passes

**Verification:**

- At 375px: bottom nav visible, all views render without horizontal scroll, tap targets are large enough, chat input stays accessible
- At 1280px: sidebar layout works, no wasted space
- "Print My Ballot" → print preview shows a clean one-page ballot
- No broken layouts at any breakpoint
- `npm run build` passes

**Commit:** `design: mobile optimization — bottom nav, responsive fixes, print stylesheet`

---

### Session 11: End-to-End QA + Visual Audit + Deploy

**Goal:** Final quality pass. Compare every view against its reference PNG. Fix gaps. Ship it.

**Reference files:**

- ALL files in `docs/UI_REFERENCE/` — this session is a visual audit against every single reference

**Context for Claude Code:**

- Sessions 1-10 have built all the features and views. This session is about catching what's off.
- The site should be functionally complete — this is polish and verification, not new feature work.

**Scope:**

- Visual audit: open each reference `screen.png` and compare against the rendered page. Note and fix discrepancies in: spacing, typography scale, color usage, surface layering, component styling, layout structure
  - `landing_final_mobile_flow/screen.png` vs. landing page
  - `fresh_research_start_new_voter/screen.png` vs. research layout
  - `active_research_progress_overlays/screen.png` vs. progress/chat view
  - `research_payoff_mobile_optimized_final/screen.png` vs. ballot portfolio
  - `research_fallback_session_handoff_v2/screen.png` vs. handoff package
  - `voter_id_rules_texas/screen.png` vs. voter ID view
  - `unified_voting_location_schedule/screen.png` vs. polling location view
  - `visual_election_timeline/screen.png` vs. timeline component
- Accessibility audit: keyboard navigation through all views, screen reader check, WCAG AA contrast on all text/background combinations
- Security audit (from original Session 5): grep for `NEXT_PUBLIC_GOOGLE`, `NEXT_PUBLIC_ANTHROPIC`, `console.log` of env vars — zero results
- Run `npm test` — fix any failures from changed components
- Run `npm run build` — clean build
- Run ESLint + Prettier
- Bilingual check: toggle to Spanish, verify all views have translations, no English-only strings
- End-to-end smoke test: TX zip → landing page → research my ballot → chat streams → progress updates → ballot portfolio → print → download profile → handoff (simulate budget) → copy/paste fallback
- Push to `launch/production` and verify on the live Vercel URL
- Mobile smoke test on live URL

**Verification:**

- Every reference screen has a visual match in the built app (not pixel-perfect, but same design DNA, layout, and level of polish)
- All tests pass
- Clean build
- No security leaks
- Bilingual complete
- Live site works end-to-end
- The experience matches what the UI reference promised

**Commit:** `launch: visual QA pass, accessibility audit, deploy v2`

---

## Explicitly Deferred (v3+)

These features appear in the UI reference but require data sources or complexity beyond what's reasonable for the current build:

| Feature                             | Reference Screen                       | Why Deferred                                                                                                 |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Active Intelligence sidebar         | resumed_research_returning_voter       | Requires topic extraction + correlation scoring engine. High complexity, low launch priority.                |
| Candidate photographs               | research_payoff_mobile_optimized_final | No candidate photo database. Would need Ballotpedia/Wikipedia scraping or a media API.                       |
| Embedded maps                       | unified_voting_location_schedule       | Google Maps embed requires Maps JS API + API key. Directions link covers core need.                          |
| Real-time wait times                | unified_voting_location_schedule       | No data source for polling place wait times in Texas.                                                        |
| Distance badge ("0.8 miles away")   | unified_voting_location_schedule       | Requires geocoding the user's address and calculating distance. Possible via Google but adds API complexity. |
| Matched topics + correlation scores | resumed_research_returning_voter       | Requires NLP analysis of voter profile. High complexity.                                                     |
| 50-state expansion                  | —                                      | Data curation at scale. Launch plan correctly identified this as a scaling concern.                          |

---

## Execution Order

```
Session 1  — Unblock chat + verify deployment (MUST DO FIRST)
Session 2  — Design system foundation
Session 3  — Landing page
Session 4  — Research layout + navigation
Session 5  — Research progress + structured chat output
Session 6  — Research payoff screen
Session 7  — Voter ID rules + election timeline
Session 8  — Polling location view
Session 9  — Handoff + fallback polish
Session 10 — Mobile optimization
Session 11 — End-to-end QA + visual audit + deploy
```

**Session 1 is non-negotiable.** The chat being hidden behind the address input means the core product doesn't work for most users. Fix this first, verify it on the deployed site, then proceed.

Sessions 2-3 establish the visual foundation. Sessions 4-8 build the views. Session 9 polishes edge cases. Sessions 10-11 are QA and ship.

Sessions 7-8 are independent of sessions 4-6 — if you need to parallelize or reorder, those are the safest to move. Everything else is sequential.

---

## Session Prompt Strategy

**The HTML files and PNG screenshots in `docs/UI_REFERENCE/` ARE the spec.** DESIGN.md describes the system's principles, but the actual HTML and visual output in each subfolder is what the build must match. Every session prompt lists its specific reference files.

**How to use this plan in Claude Code:** Each session above is designed to be copy-pasted as context into a fresh Claude Code window. The "Goal," "Reference files," "Context for Claude Code," "Scope," and "Verification" sections give Claude Code everything it needs without prior session context. The "Context for Claude Code" section explains what already exists in the repo and what changed in previous sessions.

**Key differences from the MVP session prompts:**

- Each session leads with the specific `code.html` and `screen.png` files that define its visual target — Claude Code should open these files first
- DESIGN.md is a constraint system (what NOT to do), not a generative guide — the HTML files already encode the design decisions
- Claude Code has freedom to structure React/Tailwind components as needed to match the reference — the prompts don't dictate component names or props
- Every session includes visual verification: compare the rendered result against the reference PNG
