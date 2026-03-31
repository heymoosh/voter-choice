---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/product-brief-voter-choice-2026-03-31.md'
  - 'docs/PROJECT_SPEC.md'
workflowType: 'architecture'
project_name: 'voter-choice'
user_name: 'Muxin'
date: '2026-03-31'
---

# Architecture Decision Document

## 1. System Context

### System Overview
The Ballot Research Tool is a static single-page web application built with Next.js 15 (App Router). It reads election data from JSON files, performs date calculations, and generates customized text prompts. There are no external APIs, no database, no authentication, and no server-side state.

### System Boundary
```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         Next.js Application               │   │
│  │                                           │   │
│  │  Server Components    Client Components   │   │
│  │  ┌──────────┐       ┌─────────────────┐  │   │
│  │  │ page.tsx │       │ BallotToolClient│  │   │
│  │  │ (static  │       │ ZipForm         │  │   │
│  │  │  content)│       │ StateInfoCard   │  │   │
│  │  └──────────┘       │ PromptOutput    │  │   │
│  │                      │ StateSelectorM. │  │   │
│  │  ┌──────────┐       └─────────────────┘  │   │
│  │  │ /data/   │                             │   │
│  │  │ JSON     │  ← Dynamic import on demand │   │
│  │  └──────────┘                             │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Clipboard API ──→ External AI Chatbot           │
└─────────────────────────────────────────────────┘
```

### External Dependencies
- **None at runtime.** All data is bundled in static JSON files.
- **Build-time only:** Next.js, TypeScript, Tailwind CSS, Vitest, Playwright

---

## 2. Technology Stack Decisions

### Decision: Next.js 15 with App Router
**Status:** Decided (scaffold already in place)
**Rationale:** Already configured in Phase 0.3a. App Router provides Server Components for static content and Client Components for interactive UI. No alternative considered — scaffold is a fixed constraint.

### Decision: TypeScript Strict Mode
**Status:** Decided
**Rationale:** Type safety on the prompt generation pipeline catches missing fields at compile time. The prompt is the most critical output — type errors here would produce broken user experiences.

### Decision: Tailwind CSS
**Status:** Decided (scaffold already in place)
**Rationale:** Utility-first CSS enables rapid responsive development without custom CSS files. Already configured in scaffold.

### Decision: System Font Stack (No Web Fonts)
**Status:** Decided
**Rationale:** Eliminates 50-150KB font download. Improves LCP on slow connections. Civic tool must load fast for all users.

### Decision: Vitest for Unit Tests, Playwright for E2E
**Status:** Decided (scaffold already in place)
**Rationale:** Vitest for fast unit tests on pure functions (date utils, prompt generation). Playwright for 42 shared e2e tests that validate the full user flow.

---

## 3. Architecture Patterns

### Pattern: Pure Function Pipeline
All data transformation is modeled as a pipeline of pure functions:

```typescript
zipCode: string
  → lookupZip(zip) → string[]           // state codes
  → getStateData(code) → StateElectionData  // full state data
  → getDeadlineStatus(date, today) → DeadlineStatus  // per-deadline
  → generatePrompt(stateData, zip) → string  // final prompt text
```

**Why:** No side effects means trivially testable. Each function can be unit tested in isolation. No mocking needed. No race conditions.

### Pattern: Server Component for Static, Client Component for Interactive
- `page.tsx` (Server Component): Renders hero section, tips, footer, loads ballot prompt template
- `BallotToolClient` (Client Component): Manages form state, results state, clipboard interaction

**Why:** Minimizes client-side JavaScript. Most of the page is static content that never changes. Only the interactive flow (form → results → copy) needs client-side React.

### Pattern: Dynamic Import for State Data
```typescript
const stateData = await import(`@/data/states/${stateCode}.json`);
```

**Why:** Each state JSON is ~2KB. Loading all states up front wastes bandwidth. Dynamic import loads only the state the user needs after zip submission.

### Pattern: Configurable Date for Testing
```typescript
function getDeadlineStatus(
  deadline: string,
  today: Date = new Date()
): DeadlineStatus
```

**Why:** Date calculations are the most complex logic in the app. Making `today` a parameter enables deterministic testing without mocking `Date.now()`.

---

## 4. Data Architecture

### State Election Data Schema
Defined in `src/lib/types.ts`. Matches the schema in PROJECT_SPEC.md exactly:

```typescript
interface StateElectionData {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: Resources;
}
```

### Data Files
```
src/data/
├── states/
│   ├── TX.json    // Texas — open primary, strict ID, phones prohibited
│   ├── CA.json    // California — semi-closed, same-day registration
│   └── NH.json    // New Hampshire — same-day registration, no early voting
└── zip-to-state.json  // zip → state code(s) mapping
```

### Zip-to-State Lookup
```typescript
// zip-to-state.json structure
{
  "73301": ["TX"],
  "90210": ["CA"],
  "03031": ["NH"],
  "86515": ["AZ", "NM"]  // multi-state
}
```

---

## 5. Component Architecture

### Component Tree
```
page.tsx (Server Component)
├── Hero Section (static HTML)
├── BallotToolClient (Client Component)
│   ├── ZipForm
│   │   └── Error display
│   ├── StateSelectorModal (conditional)
│   ├── StateInfoCard (conditional)
│   │   ├── Election info
│   │   ├── Registration deadlines with status indicators
│   │   ├── Early voting info
│   │   ├── Voter ID info
│   │   └── Resource links
│   ├── PromptOutput (conditional)
│   │   ├── Prompt text display
│   │   └── Copy button with confirmation
│   └── Not-found message (conditional)
├── Tips Section (static HTML)
└── Footer (static HTML)
```

### State Management
No external state management library. React `useState` in `BallotToolClient`:

```typescript
const [zip, setZip] = useState('');
const [stateData, setStateData] = useState<StateElectionData | null>(null);
const [stateCodes, setStateCodes] = useState<string[]>([]);
const [error, setError] = useState<string | null>(null);
const [copied, setCopied] = useState(false);
```

**Why:** The state is simple and local. Redux/Zustand/etc. would be over-engineering for a single-page tool with 5 state variables.

---

## 6. File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with metadata, skip-to-content
│   ├── page.tsx            # Server Component — hero, tips, footer + BallotToolClient
│   └── globals.css         # Tailwind imports + custom styles
├── components/
│   ├── BallotToolClient.tsx  # Client orchestrator
│   ├── ZipForm.tsx           # Form input + validation
│   ├── StateInfoCard.tsx     # Election info display
│   ├── PromptOutput.tsx      # Prompt + copy button
│   └── StateSelectorModal.tsx # Multi-state selector
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   ├── date-utils.ts         # getDeadlineStatus, formatDate, daysUntil
│   ├── lookupZip.ts          # Zip → state code(s)
│   ├── getStateData.ts       # State code → StateElectionData
│   └── generatePrompt.ts     # State data + zip → prompt string
├── data/
│   ├── states/
│   │   ├── TX.json
│   │   ├── CA.json
│   │   └── NH.json
│   ├── zip-to-state.json
│   └── ballot-prompt.ts      # Prompt template as string constant
└── __tests__/
    ├── date-utils.test.ts
    ├── lookupZip.test.ts
    ├── getStateData.test.ts
    ├── generatePrompt.test.ts
    └── components/
        ├── ZipForm.test.tsx
        ├── StateInfoCard.test.tsx
        ├── PromptOutput.test.tsx
        └── BallotToolClient.test.tsx
```

---

## 7. Validation Checklist

### Architecture Validates Against PRD

| PRD Requirement | Architecture Decision |
|----------------|----------------------|
| Static JSON data, no APIs | Data files in src/data/, dynamic import |
| Single-page app | One page.tsx with client component orchestrator |
| Mobile-first responsive | Tailwind utility classes, 3 breakpoints |
| WCAG AA accessibility | Semantic HTML, ARIA, focus management |
| 14 data-testid attributes | Mapped to specific components |
| Copy to clipboard | Clipboard API in PromptOutput component |
| Multi-state handling | StateSelectorModal component |
| Deadline status indicators | getDeadlineStatus pure function |
| <120KB first load JS | Server Components + dynamic imports + system fonts |
| ESLint complexity ≤10 | Pure functions, single-responsibility components |

### Architecture Validates Against UX Design

| UX Requirement | Architecture Decision |
|---------------|----------------------|
| Zip input in hero section | page.tsx renders hero → BallotToolClient inline |
| Smooth scroll to results | Client-side scrollIntoView in BallotToolClient |
| Sticky copy button | CSS position:sticky in PromptOutput |
| Deadline color + text labels | getDeadlineStatus returns status + label + color |
| Two-column desktop layout | Tailwind responsive grid in BallotToolClient |
| System font stack | Tailwind config with system fonts |
| No web fonts, no images | CSS-only design, no image imports |

---

## 8. Key Constraints

1. **No external API calls at runtime.** All data is bundled.
2. **No user data storage.** No cookies, no localStorage for tracking.
3. **No authentication.** Anonymous, stateless.
4. **Scaffold is fixed.** Next.js 15, TypeScript, Tailwind, ESLint, Prettier already configured.
5. **Shared e2e test suite.** 42 Playwright tests with fixed data-testid expectations.
6. **ESLint complexity max 10.** Functions must be decomposed if they exceed this.
7. **Phase 2 consideration.** Architecture should not block adding i18n in Phase 2, but i18n infrastructure is out of scope for Phase 1.
