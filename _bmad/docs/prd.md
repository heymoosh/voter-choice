---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-voter-choice-2026-03-31.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-31-0200.md'
  - 'docs/PROJECT_SPEC.md'
  - 'docs/BALLOT_PROMPT.md'
workflowType: 'prd'
classification:
  projectType: 'web-app'
  domain: 'civic-technology'
  complexity: 'low'
  projectContext: 'greenfield'
---

# Product Requirements Document - voter-choice

**Author:** Muxin
**Date:** 2026-03-31

## Executive Summary

The Ballot Research Tool is a single-page web application that helps U.S. voters research their ballot using AI chatbots. Users enter their zip code, view state-specific election information (deadlines, early voting, voter ID rules), and receive a customized AI prompt pre-filled with local context. They copy the prompt into any free AI chatbot (Claude, ChatGPT, Gemini, Grok) to begin an interactive ballot research session.

The tool serves as a bridge between static election data and AI-powered research — it does NOT host or run an LLM, store user data, or require authentication. All data comes from static JSON files served via Next.js.

### What Makes This Special

- **Prompt-first design:** The product IS the generated prompt. The state info display supports the prompt, not the other way around.
- **Chatbot-agnostic:** Works with any AI chatbot. Zero vendor lock-in.
- **Zero friction:** No signup, no tracking. Enter zip → copy prompt → paste → research. Under 30 seconds.
- **Mobile-first civic tool:** Designed for viral social media traffic — most users on phones.
- **Static and fast:** Pre-compiled JSON, no API calls, no server computation.

## Project Classification

- **Project Type:** Single-page web application (Next.js + TypeScript + Tailwind CSS)
- **Domain:** Civic technology / voter information
- **Complexity:** Low (no auth, no database, no external APIs, static data)
- **Project Context:** Greenfield — building from scaffold with Next.js 15, ESLint, Prettier, and stub state data already in place

---

## Success Criteria

### User Success

| Criterion | Target | How Measured |
|-----------|--------|--------------|
| User can enter zip and get customized prompt | 100% for stub states | Playwright e2e tests |
| Time from page load to copied prompt | <30 seconds | Manual UX evaluation |
| Error states handled clearly | All 6 error cases per spec | Playwright e2e tests |
| Multi-state zip resolved correctly | 86515 → AZ/NM selector works | Playwright e2e test |
| Prompt contains all required context fields | 100% per spec | Unit tests + e2e tests |

### Technical Success

| Criterion | Target | How Measured |
|-----------|--------|--------------|
| Lighthouse Performance | ≥90 | npm run measure |
| Lighthouse Accessibility | ≥90 | npm run measure |
| Lighthouse Best Practices | ≥90 | npm run measure |
| Lighthouse SEO | ≥90 | npm run measure |
| Playwright e2e pass rate | 42/42 (100%) | npm run measure |
| ESLint errors | 0 | npm run measure |
| ESLint warnings | 0 | npm run measure |
| Code duplication | <5% | npm run measure |
| First load JS | <120 KB | npm run measure |
| Production build | Succeeds | next build |

### Business Success

| Criterion | Target | How Measured |
|-----------|--------|--------------|
| All 14 data-testid attributes present | 100% | Playwright e2e tests |
| Responsive at 3 breakpoints | Mobile/tablet/desktop | Manual + e2e |
| WCAG AA compliance | All requirements met | Lighthouse + manual |
| Keyboard navigation complete | Full tab order | Manual + e2e |

---

## User Journeys

### Journey 1: The Motivated Voter (Jordan)

Jordan (28) sees the tool shared on Reddit. They open it on their phone, see a clear headline explaining the concept, and immediately enter their zip code (73301). The page displays Texas election information — primary on March 3, registration deadline February 2 (marked red: "Passed"), early voting February 17-28. Below the info card, a customized prompt is ready with all their state details pre-filled. Jordan taps "Copy to Clipboard," sees "Copied!" confirmation, switches to the Claude app, pastes the prompt, and starts researching their ballot within 45 seconds of landing.

**Key interactions:** Zip entry → state info review → copy prompt → external chatbot
**Success moment:** Pasting the prompt and getting an immediately useful, personalized response from the chatbot.

### Journey 2: The Multi-State Border Voter (Ana)

Ana (34) lives near the AZ/NM border. She enters 86515 and sees: "This zip code spans multiple states. Which state are you voting in?" with radio buttons for Arizona and New Mexico. She selects New Mexico, reviews her election info, copies the prompt, and pastes it into ChatGPT. Later she comes back, enters the same zip, selects Arizona to check her mother's election info.

**Key interactions:** Zip entry → state selector → state info → copy
**Success moment:** Easy state switching without re-entering zip code.

### Journey 3: The Error Recovery Voter (Mike)

Mike (65) types "9021" (only 4 digits) and hits submit. He sees: "Please enter a valid 5-digit zip code." He fixes it to "90210" and gets California election info. He tries his friend's zip "00000" and sees: "We don't have data for this zip code yet." He returns to the tool later with a valid zip and completes the flow.

**Key interactions:** Invalid input → error message → correction → success
**Success moment:** Clear error guidance leads to successful completion.

### Journey 4: The Advocacy Sharer (Maria)

Maria (45) uses the tool herself, then shares the URL with her extended family via group text. Each person enters their own zip code and gets their state-specific prompt. Maria also looks up zip codes for family in different states.

**Key interactions:** Self-use → share URL → multi-state lookups
**Success moment:** Family members successfully using the tool independently.

---

## Domain Requirements

### Civic Technology Considerations

- **Nonpartisan presentation:** Visual design must avoid partisan color associations (no red/blue primary colors). Use neutral palette (navy, teal, warm gold).
- **Data accuracy transparency:** Display "Data last updated: [date]" for each state. Link to official sources for verification.
- **Accessibility as functional requirement:** This is a civic tool for ALL voters. WCAG AA is a minimum, not a stretch goal.
- **Phone-at-polls awareness:** The prompt output and tips section must remind voters that many states prohibit phones at polling places.
- **Trust through transparency:** The generated prompt is fully visible before copying. Users see exactly what they'll send to the chatbot.

### No Compliance Requirements

- No PII storage (no GDPR/CCPA concerns)
- No financial data (no PCI)
- No health data (no HIPAA)
- No authentication (no credential storage)

---

## Functional Requirements

### FR-1: Zip Code Entry

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Single text input accepts 5-digit numeric zip codes | Must |
| FR-1.2 | Submit button triggers lookup | Must |
| FR-1.3 | Empty input shows: "Please enter a zip code" | Must |
| FR-1.4 | Non-numeric or wrong length shows: "Please enter a valid 5-digit zip code" | Must |
| FR-1.5 | Input has `data-testid="zip-input"` | Must |
| FR-1.6 | Submit button has `data-testid="zip-submit"` | Must |
| FR-1.7 | Error container has `data-testid="zip-error"` | Must |

### FR-2: State Lookup

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Look up state(s) from zip-to-state.json | Must |
| FR-2.2 | Valid zip loads state JSON data | Must |
| FR-2.3 | Unknown zip shows "not found" message with `data-testid="not-found-message"` | Must |
| FR-2.4 | Multi-state zip shows state selector with `data-testid="state-selector"` | Must |

### FR-3: State Info Display

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Display state name, next election name and date | Must |
| FR-3.2 | Show registration deadlines (online, by mail, in person) with status indicators | Must |
| FR-3.3 | Status indicators: green (>14 days), yellow (≤14 days), red (≤3 days), gray (passed) | Must |
| FR-3.4 | Show early voting dates or "Not available" | Must |
| FR-3.5 | Show voter ID requirements and accepted IDs | Must |
| FR-3.6 | Show phone-at-polls policy and details | Must |
| FR-3.7 | Link to state election website and sample ballot lookup | Must |
| FR-3.8 | Container has `data-testid="state-info"` | Must |
| FR-3.9 | Election name has `data-testid="election-name"` | Must |
| FR-3.10 | Election date has `data-testid="election-date"` | Must |
| FR-3.11 | Registration section has `data-testid="registration-status"` | Must |
| FR-3.12 | No upcoming election shows message with `data-testid="no-election-message"` | Must |

### FR-4: Prompt Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Generate full prompt from BALLOT_PROMPT.md template | Must |
| FR-4.2 | Append state-specific context block with: election name/date/type, registration deadlines, early voting dates, voter ID info, phone policy, sample ballot link, county election link | Must |
| FR-4.3 | Prompt output container has `data-testid="prompt-output"` | Must |

### FR-5: Copy to Clipboard

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Copy button copies full prompt + context as plain text | Must |
| FR-5.2 | Button shows "Copy to Clipboard" default, "Copied!" for 2 seconds after copy | Must |
| FR-5.3 | Fallback: select-all text with Ctrl+C/Cmd+C instructions if Clipboard API unavailable | Must |
| FR-5.4 | Copy button has `data-testid="copy-button"` | Must |
| FR-5.5 | Confirmation has `data-testid="copy-confirmation"` | Must |

### FR-6: Hero Section

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Headline explaining tool in one sentence | Must |
| FR-6.2 | Subtitle (2-3 sentences) explaining: enter zip → get prompt → paste into chatbot | Must |
| FR-6.3 | Visual list of supported chatbots (Claude, ChatGPT, Gemini, Grok) with links | Must |

### FR-7: Tips Section

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Static tips for effective AI ballot research | Must |
| FR-7.2 | Reminder that AI can make mistakes — verify with official sources | Must |

### FR-8: Footer

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | "Share this tool" call to action | Must |
| FR-8.2 | Attribution: "Created by a human using AI tools" | Must |

---

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | Lighthouse Performance score | ≥90 |
| NFR-1.2 | First load JS bundle | <120 KB |
| NFR-1.3 | Time to Interactive on 3G | <2 seconds |
| NFR-1.4 | Static JSON data — no external API calls | 0 API calls |

### NFR-2: Accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-2.1 | WCAG AA color contrast (4.5:1 normal text, 3:1 large text) | Pass |
| NFR-2.2 | All interactive elements keyboard navigable | 100% |
| NFR-2.3 | Tab order follows visual layout | Pass |
| NFR-2.4 | Form inputs have associated `<label>` elements | 100% |
| NFR-2.5 | Deadline status uses text labels, not only color | Pass |
| NFR-2.6 | Error messages use `aria-live="polite"` or `role="alert"` | Pass |
| NFR-2.7 | Skip-to-content link present | Pass |
| NFR-2.8 | Logical heading hierarchy (h1 > h2 > h3) | Pass |
| NFR-2.9 | Lighthouse Accessibility score | ≥90 |

### NFR-3: Responsive Design

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-3.1 | Mobile layout (< 640px / 375px reference) | Pass |
| NFR-3.2 | Tablet layout (640-1024px / 768px reference) | Pass |
| NFR-3.3 | Desktop layout (> 1024px / 1280px reference) | Pass |
| NFR-3.4 | Touch targets minimum 44x44px on mobile | Pass |
| NFR-3.5 | Prompt output scrollable on mobile without losing copy button | Pass |

### NFR-4: Code Quality

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-4.1 | ESLint errors | 0 |
| NFR-4.2 | ESLint warnings | 0 |
| NFR-4.3 | Code duplication | <5% |
| NFR-4.4 | Function complexity (ESLint max) | ≤10 |
| NFR-4.5 | TypeScript strict mode | Enabled |

### NFR-5: Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-5.1 | No user data storage | Pass |
| NFR-5.2 | No external API calls | Pass |
| NFR-5.3 | No cookies or local storage for tracking | Pass |
| NFR-5.4 | Security headers (X-Content-Type-Options, X-Frame-Options) | Configured |

---

## Technical Architecture

### Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Testing:** Vitest (unit), Playwright (e2e)
- **Linting:** ESLint with complexity plugin, Prettier
- **Build:** Static export via Next.js

### Component Architecture

```
src/
├── app/
│   └── page.tsx              # Server Component — data loading, static sections
├── components/
│   ├── BallotToolClient.tsx   # Client Component — orchestrates interactive UI
│   ├── ZipForm.tsx            # Client Component — zip input + validation
│   ├── StateInfoCard.tsx      # Client Component — election info display
│   ├── PromptOutput.tsx       # Client Component — prompt display + copy
│   └── StateSelectorModal.tsx # Client Component — multi-state resolution
├── lib/
│   ├── types.ts               # TypeScript interfaces for state data
│   ├── date-utils.ts          # Deadline calculation, status, formatting
│   ├── lookupZip.ts           # Zip → state code(s) lookup
│   ├── getStateData.ts        # State code → election data
│   └── generatePrompt.ts     # State data → customized prompt text
└── data/
    ├── states/
    │   ├── TX.json
    │   ├── CA.json
    │   └── NH.json
    └── zip-to-state.json
```

### Data Flow

```
User enters zip → lookupZip(zip) → stateCode[]
  → if multiple: StateSelectorModal → selected stateCode
  → getStateData(stateCode) → StateElectionData
  → StateInfoCard renders election info with deadline statuses
  → generatePrompt(stateData, zip) → full prompt text
  → PromptOutput renders prompt with copy button
```

### Key Design Decisions

1. **Server Components for data, Client Components for interaction.** Static content (hero, tips, footer) rendered server-side. Interactive elements (form, copy, selector) are client components.
2. **Pure function pipeline.** Each lib function is pure: `input → output`. No side effects. Trivially testable.
3. **Configurable "today" for date calculations.** All date functions accept an optional `today` parameter. Defaults to `new Date()`. Enables deterministic testing.
4. **Dynamic import for state data.** State JSON loaded on demand after zip submission — keeps initial bundle small.

---

## Scope Boundaries

### In Scope (MVP)

- Single-page app with all sections per PROJECT_SPEC.md
- Zip code lookup from static JSON (TX, CA, NH stub data)
- Multi-state zip handling
- State info display with deadline status indicators
- Prompt generation with state-specific context
- Copy to clipboard with confirmation
- All 14 data-testid attributes
- Mobile-first responsive design (3 breakpoints)
- WCAG AA accessibility
- Keyboard navigation
- Unit tests (Vitest) + e2e tests (Playwright)

### Out of Scope

- LLM hosting or AI conversation
- User accounts, authentication, data storage
- Full 50-state dataset
- Deployment (Vercel)
- Analytics or tracking
- Multiple language support (Phase 2)
- Geolocation
- Chatbot deep links or API integration
- Offline/PWA support
