# Epics and Stories: Voter Choice

## Epic 1: Foundation
Set up TypeScript types, data utilities, and layout scaffolding.

### Story 1.1: TypeScript Types and Data Models
- Define interfaces: StateData, Election, Registration, EarlyVoting, VotingRules, Resources
- Define DeadlineStatus enum: GREEN, YELLOW, RED, PASSED
- File: src/lib/types.ts

### Story 1.2: Static Data Utilities
- Function to load zip-to-state mapping
- Function to load state data by code
- Function to find next upcoming election
- File: src/lib/stateData.ts

### Story 1.3: Deadline Calculation Utility
- Function: getDeadlineStatus(isoDate: string, today: Date): DeadlineStatus
- Function: getDaysRemaining(isoDate: string, today: Date): number
- File: src/lib/deadlineUtils.ts

### Story 1.4: Prompt Builder Utility
- Function: buildPrompt(stateData, zipCode, today): string
- Injects state-specific context block per PROJECT_SPEC.md format
- File: src/lib/promptBuilder.ts

### Story 1.5: Layout and Global Styles
- Update layout.tsx with proper title and metadata
- Tailwind CSS setup, global styles
- Skip-to-content link for accessibility

## Epic 2: Core User Flow
Implement the primary happy path: zip → state info → prompt.

### Story 2.1: BallotTool Root Component
- Client component managing all state
- ZipForm integration
- State lookup logic
- Multi-state detection
- Files: src/components/BallotTool.tsx

### Story 2.2: ZipForm Component
- Controlled input with data-testid="zip-input"
- Submit button with data-testid="zip-submit"
- Error display with data-testid="zip-error"
- Validation: empty, non-numeric, wrong length
- Enter key submission
- File: src/components/ZipForm.tsx

### Story 2.3: StateInfo Component
- State election info card with data-testid="state-info"
- Election name (data-testid="election-name")
- Election date (data-testid="election-date")
- Registration status (data-testid="registration-status")
- Early voting info
- Voting rules summary
- File: src/components/StateInfo.tsx

### Story 2.4: DeadlineStatus Component
- Visual status indicator (color + text)
- Shows date and relative indicator ("12 days left" / "Passed")
- Never color-only — always text label
- File: src/components/DeadlineStatus.tsx

### Story 2.5: PromptOutput Component
- Full prompt display with data-testid="prompt-output"
- Copy button with data-testid="copy-button"
- Confirmation with data-testid="copy-confirmation"
- 2-second confirmation, then reset
- Clipboard API fallback
- File: src/components/PromptOutput.tsx

## Epic 3: Edge Cases and Error States
Handle multi-state zips, unknown zips, no upcoming elections.

### Story 3.1: StateSelector Component
- Shown for multi-state zips
- data-testid="state-selector"
- File: src/components/StateSelector.tsx

### Story 3.2: Error and Edge Case Messages
- Not-found message: data-testid="not-found-message"
- No election message: data-testid="no-election-message"
- All deadlines passed alert
- Inline error messages with aria-live

## Epic 4: Main Page Assembly and Polish
Wire everything together into the final page.

### Story 4.1: Hero Section
- Tool headline and subtitle
- Chatbot links (Claude, ChatGPT, Gemini, Grok)

### Story 4.2: Tips Section and Footer
- Static tips from BALLOT_PROMPT.md
- AI disclaimer
- Footer with attribution

### Story 4.3: Accessibility and Responsive Polish
- Skip-to-content link
- ARIA roles/labels
- Tab order verification
- Mobile viewport testing (375px min)
- Touch targets 44x44px

### Story 4.4: Vitest Unit Tests
- Tests for deadlineUtils (status calculation)
- Tests for promptBuilder (context block format)
- Tests for stateData (zip lookup, election finder)

## Sprint 1 (All Stories)
All stories from Epics 1-4 are in Sprint 1.
