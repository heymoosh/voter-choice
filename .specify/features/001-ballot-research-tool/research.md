# Research: Ballot Research Tool

**Date:** 2026-05-11

## Decisions

### Decision 1: Single-Page React Component Architecture
- **Decision:** Implement the entire UI as a single Next.js page (`src/app/page.tsx`) with React component decomposition
- **Rationale:** The spec describes a "single-page web application." Next.js App Router with React Server Components (where applicable) + Client Components (for interactivity) is the project's existing stack choice.
- **Alternatives considered:** Multi-page route structure (rejected — spec says single page), plain HTML (rejected — project uses TypeScript + Next.js)

### Decision 2: Static JSON Data at Build Time
- **Decision:** Bundle zip-to-state mapping and state election data as static JSON files imported directly into the component
- **Rationale:** Spec explicitly states "All data is served from static JSON files. No external API calls." Already have TX, CA, NH stub data in `src/data/`.
- **Alternatives considered:** API route (rejected — adds latency and complexity for static data), database (rejected — spec prohibits user data storage)

### Decision 3: Ballot Prompt Embedded as Module String
- **Decision:** Import the ballot prompt text at build time and embed in the page as a JavaScript string constant
- **Rationale:** Spec says prompt comes from `docs/BALLOT_PROMPT.md`. To avoid a runtime file-system read (not available in browser), we extract the prompt text and embed it in a TypeScript module.
- **Alternatives considered:** API route to serve prompt (adds unnecessary network round-trip), reading file at runtime (not possible client-side)

### Decision 4: Client-Side Date Computation for Deadlines
- **Decision:** Compute "days remaining" and deadline statuses client-side using `new Date()` at render time
- **Rationale:** Avoids SSR hydration issues with date-dependent content. Spec says no server-side persistence of user data.
- **Alternatives considered:** Server-side date computation (causes hydration mismatch with client date)

### Decision 5: Clipboard API with Text Selection Fallback
- **Decision:** Use `navigator.clipboard.writeText()` with try/catch fallback to `document.execCommand('copy')` on a textarea
- **Rationale:** Spec requires clipboard API usage with fallback for older browsers
- **Alternatives considered:** Clipboard API only (fails in older browsers), execCommand only (deprecated)

### Decision 6: Tailwind CSS for Styling
- **Decision:** Use Tailwind CSS v4 (already installed in project) for all styling
- **Rationale:** Already in project stack, responsive-first utilities align with mobile-first requirement
- **Alternatives considered:** CSS modules (more verbose for responsive), styled-components (not in project stack)
