---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['docs/PROJECT_SPEC.md']
session_topic: 'Ballot Research Tool - Single-page web app helping U.S. voters use AI chatbots to research their ballot'
session_goals: 'Generate innovative approaches for UI/UX, component architecture, data flow, accessibility, and mobile-first civic engagement'
selected_approach: 'ai-recommended'
techniques_used: ['SCAMPER Method', 'Role Playing', 'First Principles Thinking']
ideas_generated: [108]
context_file: 'docs/PROJECT_SPEC.md'
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Muxin
**Date:** 2026-03-31

## Session Overview

**Topic:** Building a ballot research tool — a single-page web application that helps U.S. voters use AI chatbots to research their ballot by entering their zip code, viewing state election info, and generating a customized prompt.

**Goals:** Generate innovative approaches for UI/UX design, component architecture, data flow patterns, accessibility, mobile-first responsive design, and civic engagement UX.

### Context Guidance

Source of truth is `docs/PROJECT_SPEC.md`. Key constraints: static JSON data (no API), single-page app, mobile-first (viral Reddit traffic), WCAG AA accessibility, 14 required `data-testid` attributes, 3 stub states (TX, CA, NH), copy-to-clipboard UX.

### Session Setup

AI-recommended approach selected. Three complementary techniques chosen for a web app product brainstorm: SCAMPER for systematic feature innovation, Role Playing for stakeholder empathy, and First Principles for architectural decisions.

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Civic web tool with mobile-first constraints and accessibility requirements

**Recommended Techniques:**

- **SCAMPER Method:** Systematic innovation through seven lenses (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse) — ideal for product feature brainstorming
- **Role Playing:** Stakeholder perspective exploration — essential for a civic tool serving diverse voter populations
- **First Principles Thinking:** Strip assumptions to rebuild architecture from fundamentals — critical for data flow and component design

## Technique Execution Results

### Technique 1: SCAMPER Method

#### S — Substitute

**[UX #1]**: Progressive Zip Reveal
_Concept_: Instead of a submit button, auto-lookup as user types the 5th digit. The state info animates in immediately — zero friction.
_Novelty_: Eliminates the "submit" mental model entirely. Most civic tools require explicit submission.

**[UX #2]**: Geolocation Substitute
_Concept_: Offer "Use my location" as an alternative to zip code entry. Browser geolocation → reverse geocode → state lookup.
_Novelty_: Reduces friction to one tap on mobile. Out of scope for Phase 1 but worth noting for future.

**[Data #3]**: Template Literal Prompt
_Concept_: Instead of string concatenation for prompt generation, use tagged template literals with state data objects for type-safe prompt construction.
_Novelty_: Catches missing data fields at compile time rather than producing broken prompts at runtime.

**[UX #4]**: Chatbot Deep Links
_Concept_: Instead of generic "paste into any chatbot," provide direct deep links to Claude/ChatGPT/Gemini with the prompt pre-loaded via URL parameters where APIs support it.
_Novelty_: Eliminates copy-paste friction entirely for supported chatbots.

**[Arch #5]**: Static Site Generation
_Concept_: Pre-render state pages at build time with Next.js SSG. Each state gets a static HTML page — zero client-side data loading.
_Novelty_: Eliminates loading states and reduces first-contentful-paint. But doesn't match the single-page spec.

#### C — Combine

**[UX #6]**: Info Card + Prompt Preview
_Concept_: Combine the state info card and prompt output into a single scrollable view where the info card IS the prompt preview — what you see is what gets copied.
_Novelty_: Eliminates the cognitive disconnect between "viewing info" and "generating prompt."

**[UX #7]**: Deadline Urgency + CTA
_Concept_: Combine deadline status indicators with contextual calls-to-action. Red deadline → "Register NOW" button linking to state registration URL.
_Novelty_: Transforms passive information display into active civic engagement.

**[Arch #8]**: Zip Lookup + State Data in One Pass
_Concept_: Combine zip-to-state.json and state JSON loading into a single data fetch pipeline that resolves both in one render cycle.
_Novelty_: Prevents waterfall requests (zip lookup → then state data) that cause visible loading states.

**[UX #9]**: Hero + Zip Entry Combined
_Concept_: Place the zip code input directly in the hero section. The hero IS the entry point — no scrolling required.
_Novelty_: Reduces time-to-first-interaction to zero scroll distance.

**[UX #10]**: Multi-State Selector + Comparison
_Concept_: For multi-state zip codes (86515 → AZ/NM), show both states side-by-side instead of a selector dropdown.
_Novelty_: Lets border-area voters compare election rules between states.

#### A — Adapt

**[UX #11]**: News Feed Urgency Pattern
_Concept_: Adapt the social media "breaking news" banner pattern for registration deadlines. Sticky urgency banner at top when deadlines are within 3 days.
_Novelty_: Leverages familiar mobile UI patterns for civic urgency.

**[UX #12]**: Wizard Step Pattern
_Concept_: Adapt multi-step wizard UX for the flow: zip entry → state confirmation → info review → prompt generation. Mobile-friendly sequential reveal.
_Novelty_: Each step fills the full viewport on mobile, reducing cognitive load.

**[Arch #13]**: React Query Pattern for Static Data
_Concept_: Adapt the SWR/React Query caching pattern for static JSON lookups with instant cache hits for repeat zip codes.
_Novelty_: Over-engineering for static data BUT provides a clean data-fetching abstraction.

**[UX #14]**: Clipboard API with Fallback
_Concept_: Adapt PWA clipboard patterns: try `navigator.clipboard.writeText()`, fall back to `document.execCommand('copy')`, final fallback to textarea select-all with instructions.
_Novelty_: Three-tier degradation ensures copy works on every browser.

**[Access #15]**: Skip Navigation Patterns from Gov Sites
_Concept_: Adapt .gov accessibility patterns: skip-to-content, landmark roles, aria-live regions for dynamic content. These are well-tested in civic contexts.
_Novelty_: Battle-tested accessibility patterns specific to civic/government tools.

#### M — Modify

**[UX #16]**: Animated Deadline Countdown
_Concept_: Modify static deadline dates into live countdown timers ("3 days, 4 hours remaining"). Updates in real-time.
_Novelty_: Creates urgency without being alarmist. Well-tested in e-commerce countdown patterns.

**[UX #17]**: Expandable Info Sections
_Concept_: Modify the flat info card into collapsible accordion sections. Show summary (election + deadlines) by default, expand for voter ID details, early voting, resources.
_Novelty_: Reduces information overload on mobile while keeping all data accessible.

**[UX #18]**: Prompt Syntax Highlighting
_Concept_: Modify the plain-text prompt display to use syntax highlighting that distinguishes the static prompt from the personalized context block.
_Novelty_: Visual differentiation helps users understand what was customized for them.

**[Design #19]**: Patriotic-but-Modern Color Palette
_Concept_: Modify typical red/white/blue civic design into a modern, muted palette. Navy + warm gold + white. Avoids partisan associations.
_Novelty_: Most civic tools look like government forms. This looks like a modern app.

**[UX #20]**: Toast Notification for Copy
_Concept_: Modify the in-button "Copied!" feedback into a floating toast notification that's visible regardless of scroll position.
_Novelty_: Ensures copy confirmation is seen on long pages with mobile viewports.

#### P — Put to Other Uses

**[UX #21]**: Share Prompt as Link
_Concept_: Generate a shareable URL that encodes the zip code, so users can share "Check your ballot info" links on social media.
_Novelty_: Viral distribution mechanism. Each share pre-loads the recipient's state info.

**[UX #22]**: Print-Friendly Prompt
_Concept_: Add a "Print this prompt" option for users who want a physical reference to take to a library computer.
_Novelty_: Addresses digital divide — not all voters have smartphones.

**[Data #23]**: State Data as API
_Concept_: Expose the static JSON as a simple API endpoint for other civic tools to consume.
_Novelty_: Turns data asset into platform — but out of scope.

**[UX #24]**: Prompt as QR Code
_Concept_: Generate a QR code of the customized prompt for easy phone-to-desktop transfer.
_Novelty_: Bridges device gap for users who browse on phone but use desktop chatbot.

#### E — Eliminate

**[UX #25]**: No Loading Spinner
_Concept_: Eliminate loading indicators entirely. Static JSON imports resolve synchronously with Next.js — no async delay to show.
_Novelty_: Instant feedback violates "show a loading state" convention but matches actual performance.

**[UX #26]**: No Separate Tips Section
_Concept_: Eliminate the standalone tips section. Instead, inject tips as contextual tooltips within the prompt output area.
_Novelty_: Tips appear where they're most relevant rather than in a separate section users might skip.

**[Arch #27]**: Eliminate Client-Side Routing
_Concept_: No router needed. Single-page app with scroll-to-section behavior. React state drives visibility.
_Novelty_: Simplest possible architecture for a single-page tool.

**[UX #28]**: Eliminate Scroll-to-Top
_Concept_: Instead of scrolling to results after zip submission, keep the zip input visible in a sticky header and render results below.
_Novelty_: Users can change zip code without scrolling back up.

#### R — Reverse

**[UX #29]**: Start with the Prompt
_Concept_: Show the generic prompt template FIRST, then let users "fill in" their state by entering a zip code. Watch the template populate in real-time.
_Novelty_: Reverses the flow from "enter data → see result" to "see template → personalize it."

**[UX #30]**: Bottom-Up Mobile Layout
_Concept_: Place the zip input at the BOTTOM of the mobile screen (like a chat input). State info expands upward.
_Novelty_: Matches thumb-reach ergonomics on mobile. Chat app muscle memory.

**[UX #31]**: Voter to Advocate Reversal
_Concept_: Add a "Help someone else vote" mode where you can look up info for a friend's zip code and share it.
_Novelty_: Transforms tool from self-serve to advocacy tool.

### Technique 2: Role Playing (Stakeholder Perspectives)

#### Perspective: First-Time Young Voter (18, on phone)

**[UX #32]**: TikTok-Native Visual Language
_Concept_: Use bold typography, gradient backgrounds, and animation micro-interactions that feel native to Gen Z social media feeds.
_Novelty_: Civic tools designed for young voters usually look like school worksheets.

**[UX #33]**: One-Thumb Reachability
_Concept_: All interactive elements in the bottom 60% of mobile viewport. No reaching to top corners.
_Novelty_: Matches actual phone holding patterns for Gen Z users.

**[UX #34]**: Emoji Status Indicators
_Concept_: Use emoji alongside text for deadline statuses: ✅ Registered, ⚠️ Deadline soon, ❌ Deadline passed, 📅 12 days left.
_Novelty_: Instantly scannable. Familiar iconography for young users.

**[UX #35]**: "What Do I Need?" Quick Answer
_Concept_: Before the full info card, show a 3-line summary: "You need: [ID type]. Your election: [date]. Register by: [deadline]."
_Novelty_: Answers the top 3 voter questions immediately.

#### Perspective: Elderly Voter (75, desktop, low tech confidence)

**[Access #36]**: Large Touch Targets Everywhere
_Concept_: Minimum 48x48px touch targets (exceeding WCAG's 44px minimum). Large, clearly labeled buttons.
_Novelty_: Spec says 44px. Going to 48px costs nothing and helps significantly.

**[Access #37]**: High Contrast Default
_Concept_: Ship with contrast ratios exceeding 7:1 (AAA level) by default, not just meeting 4.5:1 (AA).
_Novelty_: Most tools treat AA as a ceiling. Treating AAA as the default helps everyone.

**[UX #38]**: Explicit Action Labels
_Concept_: "Copy This Prompt to Your Clipboard" instead of just "Copy." Every button describes exactly what it does.
_Novelty_: Eliminates ambiguity for users unfamiliar with clipboard metaphors.

**[UX #39]**: Print-Optimized CSS
_Concept_: `@media print` stylesheet that formats the prompt output cleanly for printing.
_Novelty_: Elderly users often print web pages. Format it well.

**[UX #40]**: Step-by-Step Instructions
_Concept_: Numbered visual instructions: "Step 1: Enter your zip code. Step 2: Review your info. Step 3: Copy the prompt. Step 4: Paste into a chatbot."
_Novelty_: Explicit sequential guidance reduces cognitive load for less tech-savvy users.

#### Perspective: Voter with Visual Disability (screen reader user)

**[Access #41]**: Semantic HTML-First Architecture
_Concept_: Build with native HTML elements (`<form>`, `<button>`, `<section>`, `<article>`) before adding any ARIA. Let semantic HTML carry the accessibility load.
_Novelty_: Most React apps over-rely on ARIA divs. Native elements work better with assistive tech.

**[Access #42]**: Live Region for Dynamic Results
_Concept_: Wrap the state info and prompt output areas in `aria-live="polite"` regions. Screen readers announce new content without page refresh.
_Novelty_: Critical for SPAs where content changes without navigation.

**[Access #43]**: Focus Management on Submission
_Concept_: After zip code submission, programmatically move focus to the state info card heading. Screen reader users hear the result immediately.
_Novelty_: Most SPAs leave focus on the submit button after form submission.

**[Access #44]**: Descriptive Error Messages
_Concept_: Error messages include both what went wrong AND what to do: "Invalid zip code. Please enter exactly 5 digits, like 90210."
_Novelty_: Actionable errors vs. just stating the problem.

#### Perspective: Rural Voter (slow connection, older phone)

**[Perf #45]**: Sub-100KB First Load
_Concept_: Keep total first-load JavaScript under 100KB. Static JSON data loaded on demand only after zip submission.
_Novelty_: Most Next.js apps ship 200KB+ on first load. Aggressive code splitting for rural connections.

**[Perf #46]**: Offline-First with Service Worker
_Concept_: Cache the app shell and state JSON files in a service worker. Tool works offline after first visit.
_Novelty_: Useful for voters in areas with spotty connectivity. Out of scope for Phase 1 but architecturally worth considering.

**[Perf #47]**: No Web Fonts
_Concept_: Use system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto...`). Zero font download cost.
_Novelty_: Eliminates 50-150KB of font files and FOIT/FOUT on slow connections.

**[Perf #48]**: Minimal Animation
_Concept_: Use `prefers-reduced-motion` media query. Skip all animations by default on low-power devices.
_Novelty_: Respects user preferences and saves CPU on older phones.

#### Perspective: Non-English Speaker (visiting on behalf of English-speaking family member)

**[UX #49]**: Visual Iconography
_Concept_: Use universal icons (calendar for dates, lock for ID, map pin for location) alongside text labels.
_Novelty_: Icons are language-agnostic. Helps users who struggle with English text.

**[Arch #50]**: i18n-Ready Architecture
_Concept_: Even for Phase 1 (English only), use an i18n key system for all UI strings. Makes Phase 2 (Spanish) a content-only change.
_Novelty_: Zero extra cost now, massive savings for Phase 2.

#### Perspective: Advocacy Organization (sharing tool with constituents)

**[UX #51]**: Social Share Metadata
_Concept_: Rich Open Graph and Twitter Card meta tags. Sharing the URL on social media shows a compelling preview card.
_Novelty_: Free distribution mechanism when advocates share on social platforms.

**[UX #52]**: Embeddable Widget Mode
_Concept_: A minimal embed version (`?embed=true`) that other organizations can iframe on their sites.
_Novelty_: Multiplies reach without users needing to visit the main site.

### Technique 3: First Principles Thinking

#### Fundamental Truth: The app is a TEMPLATE ENGINE, not a database

**[Arch #53]**: Pure Function Pipeline
_Concept_: Model the entire data flow as: `zipCode → stateData → promptTemplate → filledPrompt`. Each step is a pure function. No side effects until the final render.
_Novelty_: Eliminates state management complexity. No useEffect chains, no race conditions.

**[Arch #54]**: Data Layer as Module, Not API
_Concept_: Import state JSON as ES modules. `import TX from '@/data/states/TX.json'`. Webpack tree-shakes unused states.
_Novelty_: Simplest possible data access pattern. No fetch, no async, no loading states.

**[Arch #55]**: Prompt as Configuration
_Concept_: Store the prompt template as a separate markdown/text file, not embedded in component code. Template variables like `{{stateName}}` get replaced at render time.
_Novelty_: Separates content from code. Non-developers can edit the prompt template.

#### Fundamental Truth: Users want ONE thing — the prompt

**[UX #56]**: Copy-First Design
_Concept_: The copy button should be the most visually prominent element on the page after results load. Everything else is supporting context.
_Novelty_: Most tools emphasize the information display. This tool's value IS the copied prompt.

**[UX #57]**: Prompt Quality Indicator
_Concept_: Show a "prompt completeness" indicator based on how much state data was injected. States with more data produce richer prompts.
_Novelty_: Sets user expectations about prompt quality.

**[UX #58]**: Auto-Scroll to Prompt
_Concept_: After zip submission, auto-scroll to the prompt output section. The state info card is visible above on scroll-up.
_Novelty_: Gets users to the value proposition (the prompt) fastest.

#### Fundamental Truth: This is civic infrastructure, not a product

**[Design #59]**: Nonpartisan Visual Design
_Concept_: Avoid red and blue as primary colors (partisan associations). Use greens, teals, warm neutrals.
_Novelty_: Subtly signals nonpartisanship through color choice.

**[Trust #60]**: Transparency About Data Freshness
_Concept_: Display "Data last updated: [date]" prominently with each state. Link to official source for verification.
_Novelty_: Builds trust by being transparent about data currency.

**[Trust #61]**: "Verify This" Links
_Concept_: Next to each piece of state info, include a small "Verify ↗" link to the official state source.
_Novelty_: Encourages verification rather than blind trust. Appropriate for civic tools.

#### Fundamental Truth: The hardest UX problem is the multi-state zip code

**[UX #62]**: Inline Radio Buttons
_Concept_: For multi-state zips, show inline radio buttons (not a dropdown) with state names. Default to the first state.
_Novelty_: Radio buttons are faster than dropdowns on mobile. One tap vs. tap-scroll-tap.

**[UX #63]**: Geolocation Disambiguation
_Concept_: For multi-state zips, use browser geolocation (if available) to auto-select the correct state.
_Novelty_: Eliminates the selection step entirely for users who grant location permission.

**[UX #64]**: "I'm not sure" Option
_Concept_: Add an "I'm not sure which state" option that shows both states' info with a note to check voter registration.
_Novelty_: Handles the real-world confusion of border-area voters.

#### Fundamental Truth: Deadline logic is a date math problem

**[Arch #65]**: UTC-Normalized Dates
_Concept_: Store all dates as ISO strings. Compare using UTC midnight. Avoid timezone bugs that could show wrong deadline status.
_Novelty_: Deadline status is mission-critical. Timezone bugs could tell voters they still have time when they don't.

**[Arch #66]**: Configurable "Today"
_Concept_: Accept an optional `today` parameter for date calculations. Defaults to `new Date()`. Enables deterministic testing.
_Novelty_: Makes the most complex logic in the app trivially testable.

**[UX #67]**: Deadline Status as State Machine
_Concept_: Model deadline status as: `UPCOMING → WARNING → URGENT → PASSED`. Each state has clear styling and messaging rules.
_Novelty_: Eliminates ad-hoc conditional rendering. State machine enforces exhaustive handling.

### Additional Ideas (Cross-Technique Synthesis)

**[Arch #68]**: Component Composition Pattern
_Concept_: Build from atomic components up: Button → CopyButton → PromptOutput → BallotToolClient. Each component has one responsibility.
_Novelty_: Testable in isolation. Easy to modify individual pieces.

**[Arch #69]**: Server Component for Data, Client Component for Interaction
_Concept_: Use Next.js Server Components for data loading and static content. Client Components only for interactive elements (form, copy button, state selector).
_Novelty_: Minimizes client-side JavaScript. Most of the page is static.

**[Test #70]**: Snapshot Tests for Prompt Output
_Concept_: Snapshot test the generated prompt for each state. Catches unintended prompt changes during refactoring.
_Novelty_: The prompt IS the product — treat it as a critical output to test.

**[Test #71]**: Visual Regression for Responsive
_Concept_: Screenshot tests at 375px, 768px, and 1280px widths. Catch responsive layout breaks.
_Novelty_: Automated visual QA for the three spec breakpoints.

**[UX #72]**: Progressive Disclosure
_Concept_: Show zip input → state summary → expandable details → full prompt. Each layer reveals more complexity.
_Novelty_: Serves both quick-scan and deep-dive users with one design.

**[UX #73]**: Contextual Chatbot Logos
_Concept_: Show Claude/ChatGPT/Gemini/Grok logos in the hero section as "trusted chatbot" badges. Each links to the chatbot.
_Novelty_: Social proof + direct links reduce friction between copy and paste.

**[Arch #74]**: Error Boundary per Section
_Concept_: Wrap each section (hero, zip form, state info, prompt) in its own React Error Boundary. One section failing doesn't crash the whole page.
_Novelty_: Graceful degradation for a civic tool that must be reliable.

**[UX #75]**: Keyboard Shortcut for Copy
_Concept_: Add Ctrl+C / Cmd+C keyboard shortcut that copies the prompt when the prompt section is focused.
_Novelty_: Power user affordance. Accessibility benefit for keyboard navigators.

**[Design #76]**: Dark Mode Support
_Concept_: Respect `prefers-color-scheme` for automatic dark mode. Many users browse at night.
_Novelty_: Reduces eye strain for evening research sessions.

**[UX #77]**: Back-to-Zip on State Change
_Concept_: If user enters a new zip code after viewing results, smooth-animate the transition to new state data.
_Novelty_: Avoids jarring content replacement on re-submission.

**[Arch #78]**: Custom Hook: useStateElectionData
_Concept_: Encapsulate all state data lookup, date calculations, and deadline status in a single custom hook.
_Novelty_: Single source of truth for all derived state. Components are pure renderers.

**[Arch #79]**: Typed Prompt Builder
_Concept_: TypeScript interface for prompt template with required fields. Compiler catches missing data before runtime.
_Novelty_: Type safety on the most critical output of the application.

**[UX #80]**: Inline Chatbot Instructions
_Concept_: Below the copy button, show 4 visual steps with chatbot logos: "1. Copy prompt above → 2. Open [chatbot] → 3. Paste prompt → 4. Start researching!"
_Novelty_: Hand-holds users through the cross-app workflow.

**[UX #81]**: Success Animation on Copy
_Concept_: Brief confetti or checkmark animation when prompt is copied. Celebration moment for civic engagement.
_Novelty_: Positive reinforcement for the key action.

**[Perf #82]**: Dynamic Import for State Data
_Concept_: `const stateData = await import(`@/data/states/${stateCode}.json`)`. Only loads the needed state.
_Novelty_: Keeps initial bundle tiny. Each state is ~2KB.

**[UX #83]**: Persistent Zip in URL
_Concept_: Update URL to `?zip=73301` after submission. Enables bookmarking and sharing specific lookups.
_Novelty_: Deep linkable state without routing complexity.

**[UX #84]**: Early Voting Calendar View
_Concept_: Display early voting dates as a mini calendar widget instead of just "Feb 17 - Feb 28."
_Novelty_: Visual calendars are more intuitive than date ranges for planning.

**[Access #85]**: Screen Reader Summary
_Concept_: Add a visually-hidden summary at the top of results: "Election info for Texas: Primary on March 3, registration deadline February 2."
_Novelty_: Gives screen reader users immediate context before detailed content.

**[UX #86]**: "Changed My Mind" State Selector
_Concept_: After selecting a state (multi-state zip), keep the other state option visible as a "Switch to [other state]" link.
_Novelty_: Easy state switching without re-entering zip code.

**[Arch #87]**: Environment-Based Date Override
_Concept_: `NEXT_PUBLIC_TODAY=2026-02-15` env variable for testing deadline calculations with specific dates.
_Novelty_: Test any date scenario without mocking. Works in e2e tests too.

**[UX #88]**: Deadline Alert Banner
_Concept_: If any registration deadline is within 3 days, show a persistent sticky banner at the top: "⚠️ Registration deadline in X days!"
_Novelty_: Can't-miss urgency for time-sensitive civic information.

**[Arch #89]**: Server-Side Prompt Generation
_Concept_: Generate the prompt on the server (Server Component) and send it as static HTML. Zero client-side computation.
_Novelty_: Prompt is deterministic given state data + today's date. No reason to compute client-side.

**[UX #90]**: Two-Column Desktop Layout
_Concept_: On desktop, show state info card on the left and prompt output on the right. Side-by-side comparison.
_Novelty_: Uses desktop real estate effectively while keeping mobile as single-column.

**[Test #91]**: Property-Based Testing for Dates
_Concept_: Use property-based testing (fast-check) for date calculation functions. Generate random dates and verify deadline status invariants.
_Novelty_: Catches edge cases (leap years, timezone boundaries) that manual tests miss.

**[UX #92]**: Animated Section Reveals
_Concept_: Sections below the zip input fade/slide in after submission. Creates a sense of progressive discovery.
_Novelty_: Subtle motion design that guides attention without being flashy.

**[UX #93]**: Contextual Footer Links
_Concept_: Footer shows state-specific resources after zip entry instead of generic links.
_Novelty_: Every element becomes contextually relevant to the user's state.

**[Arch #94]**: Monorepo-Ready Structure
_Concept_: Organize code as: `src/lib/` (pure functions), `src/components/` (UI), `src/data/` (static). Clean dependency graph.
_Novelty_: Even for a single app, clean separation prevents spaghetti.

**[UX #95]**: Prompt Length Indicator
_Concept_: Show character/word count of the generated prompt. Some chatbots have input limits.
_Novelty_: Prevents users from hitting chatbot input limits and being confused.

**[UX #96]**: "What is this?" Expandable Explainer
_Concept_: Collapsible section explaining what AI ballot research is and why it's useful. Collapsed by default for returning users.
_Novelty_: Educates newcomers without cluttering the interface for power users.

**[Access #97]**: Form Validation with ARIA
_Concept_: Use `aria-invalid`, `aria-describedby`, and `role="alert"` for form validation. Error messages linked to inputs via `aria-describedby`.
_Novelty_: Proper ARIA form validation is rare. Most React forms break screen reader announcements.

**[UX #98]**: Smooth Scroll Behavior
_Concept_: Use `scroll-behavior: smooth` in CSS and `scrollIntoView({ behavior: 'smooth' })` for navigation.
_Novelty_: Polished feel without JavaScript animation libraries.

**[Design #99]**: Card-Based Info Architecture
_Concept_: Present each info category (registration, early voting, voter ID, resources) as a separate card within the state info section.
_Novelty_: Cards are scannable, visually distinct, and reorderable.

**[Arch #100]**: Barrel Exports for Clean Imports
_Concept_: `src/lib/index.ts` exports all pure functions. `src/components/index.ts` exports all components. Single import source.
_Novelty_: Clean dependency management. Easy to test and refactor.

**[UX #101]**: State Flag/Seal Visual
_Concept_: Display small state seal or outline map next to state name in the info card.
_Novelty_: Visual confirmation of correct state identification.

**[UX #102]**: Re-Submit Confirmation
_Concept_: If user enters a new zip code while viewing results, briefly highlight what changed in the new state data.
_Novelty_: Change tracking helps users notice differences between states.

**[Perf #103]**: Image-Free Design
_Concept_: Zero images. All visual elements use CSS (gradients, shadows, borders) and Unicode/SVG icons.
_Novelty_: Eliminates image loading. Perfect Lighthouse performance score achievable.

**[Arch #104]**: Feature Flag for Phase 2
_Concept_: Include a `NEXT_PUBLIC_ENABLE_I18N` flag that Phase 2 can flip. i18n infrastructure exists but is dormant.
_Novelty_: Phase 2 enablement is one env variable, not a code rewrite.

**[UX #105]**: Prompt Section Sticky Header
_Concept_: The copy button floats at the top of the prompt section as user scrolls through the long prompt text.
_Novelty_: Copy button is always visible regardless of scroll position within the prompt.

**[UX #106]**: Interactive Prompt Sections
_Concept_: Color-code or highlight different sections of the prompt (instructions vs. personalized data vs. closing).
_Novelty_: Users understand what they're sending to the chatbot.

**[Test #107]**: E2E Happy Path as Documentation
_Concept_: The Playwright e2e test suite doubles as living documentation of the expected user flow.
_Novelty_: Tests ARE the acceptance criteria. Spec and test stay in sync.

**[Arch #108]**: Centralized Date Utility
_Concept_: Single `date-utils.ts` module with `getDeadlineStatus()`, `formatDate()`, `daysUntil()`. All date logic in one place.
_Novelty_: Avoids scattered date calculations across components. Single place to fix timezone bugs.

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Mobile-First UX & Interaction Design** (Ideas #1, 9, 12, 16, 20, 28, 30, 33, 56, 58, 72, 80, 81, 83, 90, 92, 98, 105)
- Core pattern: minimize friction, maximize one-thumb reachability, progressive disclosure
- Key insight: the copy button is the product — design everything around it

**Theme 2: Accessibility & Inclusivity** (Ideas #15, 36, 37, 38, 39, 40, 41, 42, 43, 44, 48, 49, 85, 97)
- Core pattern: semantic HTML first, ARIA second, text labels always, large targets
- Key insight: civic tools must serve ALL voters — accessibility is functional, not optional

**Theme 3: Data Architecture & Component Design** (Ideas #3, 8, 27, 53, 54, 65, 66, 67, 68, 69, 74, 78, 79, 82, 87, 89, 94, 100, 108)
- Core pattern: pure functions, server-first rendering, typed data pipeline, clean separation
- Key insight: the app is a template engine — model it as `zip → state → prompt`

**Theme 4: Performance & Loading** (Ideas #5, 25, 45, 47, 48, 82, 103)
- Core pattern: minimize JS, eliminate images, system fonts, code splitting
- Key insight: sub-100KB first load is achievable with static data and disciplined architecture

**Theme 5: Trust & Civic Design** (Ideas #19, 59, 60, 61, 107)
- Core pattern: nonpartisan design, data transparency, verify links, living documentation
- Key insight: civic infrastructure demands trust through transparency

**Theme 6: Testing & Quality** (Ideas #66, 70, 71, 87, 91, 107)
- Core pattern: deterministic testing via configurable dates, snapshot prompts, property-based dates
- Key insight: configurable "today" makes the hardest logic (deadlines) trivially testable

### Prioritization Results

**Top Priority (Must Implement):**
1. **Pure Function Pipeline** (#53) + **Custom Hook** (#78) — architectural foundation
2. **Semantic HTML-First** (#41) + **ARIA Validation** (#97) — accessibility foundation
3. **Copy-First Design** (#56) + **Sticky Copy Button** (#105) — UX value proposition
4. **Configurable Today** (#66) + **Centralized Date Utils** (#108) — testability foundation
5. **Hero + Zip Combined** (#9) — minimize time-to-first-interaction

**Quick Wins:**
- System font stack (#47) — one CSS line, 50KB+ savings
- Image-free design (#103) — CSS-only visual design
- Smooth scroll (#98) — one CSS property
- Large touch targets (#36) — padding adjustment
- URL-persisted zip (#83) — shareable lookups

**Breakthrough Concepts (Phase 2+):**
- i18n-ready architecture (#50) — Phase 2 preparation
- Chatbot deep links (#4) — eliminate copy-paste entirely
- Share-as-link (#21) — viral distribution mechanism

## Session Summary and Insights

**Key Achievements:**
- 108 ideas generated across 3 complementary techniques
- 6 organized themes covering UX, accessibility, architecture, performance, trust, and testing
- Clear architectural direction: pure function pipeline with server components and typed data
- Accessibility strategy: semantic HTML first, ARIA as enhancement, text labels always
- UX strategy: copy-first design, progressive disclosure, mobile-thumb-reachable

**Session Reflections:**
- SCAMPER was most productive for feature innovation (31 ideas)
- Role Playing generated the most actionable accessibility insights (22 ideas from 5 personas)
- First Principles produced the strongest architectural decisions (16 ideas)
- Cross-technique synthesis generated 40 additional ideas showing strong interconnection
- The "pure function pipeline" pattern emerged independently from both SCAMPER and First Principles — strong signal
