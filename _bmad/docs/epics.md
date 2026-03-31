---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - 'docs/PROJECT_SPEC.md'
---

# voter-choice - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Ballot Research Tool, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR-1: Zip Code Entry (FR-1.1 through FR-1.7)
- FR-2: State Lookup (FR-2.1 through FR-2.4)
- FR-3: State Info Display (FR-3.1 through FR-3.12)
- FR-4: Prompt Generation (FR-4.1 through FR-4.3)
- FR-5: Copy to Clipboard (FR-5.1 through FR-5.5)
- FR-6: Hero Section (FR-6.1 through FR-6.3)
- FR-7: Tips Section (FR-7.1 through FR-7.2)
- FR-8: Footer (FR-8.1 through FR-8.2)

### Non-Functional Requirements

- NFR-1: Performance (Lighthouse ≥90, <120KB JS, <2s TTI)
- NFR-2: Accessibility (WCAG AA, keyboard nav, screen reader, skip-to-content)
- NFR-3: Responsive Design (mobile/tablet/desktop, 44px+ touch targets)
- NFR-4: Code Quality (ESLint 0 errors, complexity ≤10, <5% duplication)
- NFR-5: Security (no data storage, no tracking)

### Additional Requirements

- 14 data-testid attributes per PROJECT_SPEC.md
- Configurable date for testing (architecture decision)
- Pure function pipeline for data transformation (architecture pattern)

### UX Design Requirements

- UX-1: System font stack (no web fonts)
- UX-2: Navy/teal nonpartisan color palette
- UX-3: Deadline status indicators with color + text labels
- UX-4: Smooth scroll to results after zip submission
- UX-5: Focus management for accessibility
- UX-6: Two-column desktop layout for results
- UX-7: Sticky copy button on mobile
- UX-8: Progressive disclosure pattern

### FR Coverage Map

| Epic | FRs Covered |
|------|------------|
| Epic 1: Foundation | Types, data layer, date utils |
| Epic 2: Zip Entry & Lookup | FR-1, FR-2 |
| Epic 3: State Info Display | FR-3 |
| Epic 4: Prompt Generation & Copy | FR-4, FR-5 |
| Epic 5: Page Layout & Static Sections | FR-6, FR-7, FR-8 |
| Epic 6: Integration & Polish | NFR-1 through NFR-5, UX-1 through UX-8 |

## Epic List

1. **Epic 1: Data Foundation** — Types, lib functions, date utilities, unit tests
2. **Epic 2: Zip Code Entry & State Lookup** — ZipForm component, validation, zip-to-state lookup, multi-state handling
3. **Epic 3: State Election Info Display** — StateInfoCard component with deadline indicators
4. **Epic 4: Prompt Generation & Clipboard** — PromptOutput component, prompt builder, copy functionality
5. **Epic 5: Page Layout & Static Content** — Hero, tips, footer, page.tsx, BallotToolClient orchestrator
6. **Epic 6: Integration, Accessibility & Polish** — Responsive layout, accessibility, keyboard nav, e2e tests, build verification

---

## Epic 1: Data Foundation

Build the TypeScript types, pure utility functions, and data access layer that all components depend on. No UI — just testable library code.

### Story 1.1: TypeScript Type Definitions

As a developer,
I want TypeScript interfaces for all state election data structures,
So that the compiler catches data shape errors before runtime.

**Acceptance Criteria:**

**Given** the state data schema from PROJECT_SPEC.md
**When** I create src/lib/types.ts
**Then** it exports interfaces: StateElectionData, Election, Registration, RegistrationMethod, EarlyVoting, VotingRules, Resources
**And** all interfaces match the JSON schema exactly (stateCode, stateName, lastUpdated, elections[], registration, earlyVoting, votingRules, resources)
**And** DeadlineStatus type is defined as 'safe' | 'warning' | 'urgent' | 'passed'

### Story 1.2: Date Utility Functions

As a developer,
I want pure date calculation functions with configurable "today",
So that deadline statuses are deterministically testable.

**Acceptance Criteria:**

**Given** a deadline date string and optional today parameter
**When** I call getDeadlineStatus(deadline, today)
**Then** it returns 'safe' when >14 days remaining, 'warning' when ≤14 days, 'urgent' when ≤3 days, 'passed' when deadline has passed
**And** daysUntil(deadline, today) returns the number of days (negative if passed)
**And** formatDate(isoDate) returns human-readable date string (e.g., "March 3, 2026")
**And** all functions are pure (no side effects, no Date.now() calls)
**And** unit tests cover all status thresholds and edge cases (0 days, negative days, exactly 3 days, exactly 14 days)

### Story 1.3: Zip Lookup Function

As a developer,
I want a function that maps zip codes to state codes,
So that the UI can resolve user input to state data.

**Acceptance Criteria:**

**Given** a 5-digit zip code string
**When** I call lookupZip(zip)
**Then** it returns an array of state codes (e.g., ["TX"] or ["AZ", "NM"])
**And** returns null or empty array for unknown zip codes
**And** unit tests cover: single-state zip, multi-state zip, unknown zip

### Story 1.4: State Data Loader

As a developer,
I want a function that loads state election data by state code,
So that components can get full state data from a code.

**Acceptance Criteria:**

**Given** a state code string (e.g., "TX")
**When** I call getStateData(stateCode)
**Then** it returns the typed StateElectionData object from the JSON file
**And** returns null for unknown state codes
**And** unit tests verify data loads correctly for TX, CA, NH

### Story 1.5: Prompt Generation Function

As a developer,
I want a function that generates the full customized prompt,
So that the prompt output component has a single source of prompt text.

**Acceptance Criteria:**

**Given** a StateElectionData object, zip code, and today's date
**When** I call generatePrompt(stateData, zip, today)
**Then** it returns the full prompt text including:
- The ballot research prompt template
- A pre-filled context block with: state name, zip, election name/date/type, registration deadlines with status, early voting dates, voter ID info, phone policy, sample ballot link, county election link
**And** the context block matches the format in PROJECT_SPEC.md
**And** unit tests verify prompt generation for TX, CA, NH with snapshot testing

---

## Epic 2: Zip Code Entry & State Lookup

Build the ZipForm component and StateSelectorModal for multi-state zip codes.

### Story 2.1: ZipForm Component

As a voter,
I want to enter my 5-digit zip code and submit it,
So that I can look up my state's election information.

**Acceptance Criteria:**

**Given** the page is loaded
**When** I see the zip code input
**Then** it has data-testid="zip-input" and an associated label
**And** the submit button has data-testid="zip-submit"
**And** the input accepts only text entry (validation on submit, not on keystroke)
**And** pressing Enter in the input triggers submission

**Given** I submit an empty input
**When** validation runs
**Then** an error "Please enter a zip code" appears in a container with data-testid="zip-error"
**And** the error has role="alert" for screen reader announcement
**And** the input gets aria-invalid="true"

**Given** I submit a non-5-digit or non-numeric value
**When** validation runs
**Then** an error "Please enter a valid 5-digit zip code" appears
**And** error clears when I start typing again

### Story 2.2: State Selector for Multi-State Zips

As a voter in a border area,
I want to choose which state I'm voting in when my zip spans multiple states,
So that I get the correct election information.

**Acceptance Criteria:**

**Given** I enter a multi-state zip code (e.g., 86515)
**When** the lookup returns multiple state codes
**Then** a state selector appears with data-testid="state-selector"
**And** it uses radio buttons (not a dropdown) with each state name
**And** selecting a state loads that state's election data
**And** the selector is keyboard-navigable (arrow keys between options, Enter to confirm)

---

## Epic 3: State Election Info Display

Build the StateInfoCard component showing all election information with deadline status indicators.

### Story 3.1: State Info Card — Core Display

As a voter,
I want to see my state's election information in a clear summary card,
So that I can quickly understand my upcoming election details.

**Acceptance Criteria:**

**Given** a valid zip code has been submitted and state data loaded
**When** the state info card renders
**Then** it has data-testid="state-info"
**And** shows the state name
**And** shows the next upcoming election name (data-testid="election-name") and date (data-testid="election-date")
**And** shows early voting dates or "Not available — absentee voting only"
**And** shows voter ID requirements (required/not required + accepted IDs list)
**And** shows phone-at-polls policy with detail text
**And** links to state election website and sample ballot lookup

**Given** no upcoming election exists for the state
**When** the card renders
**Then** a message appears with data-testid="no-election-message"

### Story 3.2: Registration Deadline Status Indicators

As a voter,
I want to see color-coded deadline statuses for each registration method,
So that I know if I can still register and how urgent it is.

**Acceptance Criteria:**

**Given** the state info card is rendered
**When** registration deadlines are displayed
**Then** the registration section has data-testid="registration-status"
**And** each deadline shows: method name, date, and status indicator
**And** status indicators use color AND text: green/"X days left", yellow/"X days left", red/"X days left", gray/"Passed"
**And** status thresholds: >14 days = green/safe, ≤14 = yellow/warning, ≤3 = red/urgent, past = gray/passed

### Story 3.3: Not Found Message

As a voter with an unmapped zip code,
I want a helpful message explaining the situation,
So that I know the tool doesn't support my area yet and can find alternatives.

**Acceptance Criteria:**

**Given** I enter a valid 5-digit zip code not in the dataset
**When** the lookup returns no results
**Then** a message appears with data-testid="not-found-message"
**And** the message says "We don't have data for this zip code yet. We're working on adding all U.S. zip codes."
**And** includes a link to a state election website directory

---

## Epic 4: Prompt Generation & Clipboard

Build the PromptOutput component with the generated prompt and copy-to-clipboard functionality.

### Story 4.1: Prompt Output Display

As a voter,
I want to see the customized AI ballot research prompt with my state's information,
So that I can review what I'll send to the chatbot.

**Acceptance Criteria:**

**Given** state data has been loaded
**When** the prompt output renders
**Then** the container has data-testid="prompt-output"
**And** displays the full prompt including the ballot research template and personalized context block
**And** the prompt text is in a scrollable container on mobile
**And** there is clear visual separation between the main prompt and the pre-filled context block

### Story 4.2: Copy to Clipboard

As a voter,
I want to copy the customized prompt with one click,
So that I can paste it into an AI chatbot.

**Acceptance Criteria:**

**Given** the prompt output is visible
**When** I click the copy button (data-testid="copy-button")
**Then** the full prompt + context is copied to clipboard as plain text
**And** the button changes to "Copied!" with data-testid="copy-confirmation" visible
**And** the confirmation reverts after 2 seconds
**And** the button is keyboard-operable (Enter/Space)

**Given** the Clipboard API is not available
**When** copy is attempted
**Then** the text in the prompt area is selected
**And** a fallback message instructs "Press Ctrl+C / Cmd+C to copy"

---

## Epic 5: Page Layout & Static Content

Build the page layout including hero section, tips, footer, and the BallotToolClient orchestrator.

### Story 5.1: Page Layout with Server/Client Split

As a developer,
I want a page.tsx that renders static content as Server Components and interactive content as a Client Component,
So that the initial page load is minimal and fast.

**Acceptance Criteria:**

**Given** the page renders
**When** it loads
**Then** page.tsx is a Server Component that renders: hero section, BallotToolClient (client), tips section, footer
**And** the hero section includes a headline, subtitle, and chatbot logos with links
**And** BallotToolClient orchestrates the interactive flow (form → results)
**And** the page has a logical heading hierarchy (h1 > h2 > h3)
**And** a skip-to-content link is the first focusable element

### Story 5.2: Hero Section

As a voter landing on the page,
I want to immediately understand what this tool does,
So that I know how to use it.

**Acceptance Criteria:**

**Given** the page loads
**When** I see the hero section
**Then** there is a clear headline explaining the tool in one sentence
**And** a subtitle (2-3 sentences) explaining: enter zip, get prompt, paste into chatbot
**And** chatbot logos (Claude, ChatGPT, Gemini, Grok) with links to each chatbot
**And** the zip input is visible without scrolling on mobile

### Story 5.3: Tips Section and Footer

As a voter,
I want tips for using the AI prompt effectively,
So that I get the most out of my chatbot research session.

**Acceptance Criteria:**

**Given** the page renders
**When** I scroll to the tips section
**Then** static tips are displayed for effective AI ballot research
**And** a reminder that AI can make mistakes — verify with official sources
**And** the footer shows "Share this tool" CTA, attribution "Created by a human using AI tools"

---

## Epic 6: Integration, Accessibility & Polish

Wire everything together, ensure accessibility, responsive design, and all tests pass.

### Story 6.1: BallotToolClient Integration

As a developer,
I want BallotToolClient to orchestrate the full user flow,
So that all components work together seamlessly.

**Acceptance Criteria:**

**Given** BallotToolClient renders
**When** the user submits a valid zip code
**Then** it calls lookupZip, handles single/multi-state, loads state data, renders StateInfoCard and PromptOutput
**And** smooth scrolls to results after submission
**And** focus moves to state info heading for screen readers
**And** a new zip submission replaces previous results

### Story 6.2: Responsive Layout

As a voter on any device,
I want the layout to work on mobile, tablet, and desktop,
So that I can use the tool regardless of my device.

**Acceptance Criteria:**

**Given** the page renders
**When** viewed at mobile width (<640px)
**Then** single-column layout, full-width cards, 48px+ touch targets
**When** viewed at tablet width (640-1024px)
**Then** centered content, max-width 640px
**When** viewed at desktop width (>1024px)
**Then** two-column layout for results (state info left, prompt right), max-width 1200px

### Story 6.3: Accessibility Compliance

As a voter with disabilities,
I want the tool to be fully accessible,
So that I can use it with assistive technology.

**Acceptance Criteria:**

**Given** the page renders
**When** navigating with keyboard
**Then** all interactive elements are reachable via Tab in logical order
**And** buttons activate with Enter/Space
**And** focus is visibly indicated on all elements (3px teal outline)
**And** skip-to-content link appears on first Tab
**And** aria-live="polite" on results area announces new content
**And** color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text)
**And** deadline indicators use text labels, not only color

### Story 6.4: Build Verification & Test Suite

As a developer,
I want all unit tests and the production build to pass,
So that the application is verified before measurement.

**Acceptance Criteria:**

**Given** all stories are implemented
**When** I run the test suite and build
**Then** `npm run build` succeeds with no errors
**And** all Vitest unit tests pass
**And** ESLint reports 0 errors and 0 warnings
**And** all 14 data-testid attributes are present in the rendered HTML
