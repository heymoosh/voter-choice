---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/product-brief-voter-choice-2026-03-31.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-31-0200.md'
  - 'docs/PROJECT_SPEC.md'
---

# UX Design Specification — voter-choice

**Author:** Muxin
**Date:** 2026-03-31

---

## 1. UX Discovery Summary

### Product Context
Single-page civic web tool that generates customized AI ballot research prompts from zip code input. Mobile-first (viral Reddit traffic), zero-friction (no auth), static data (no APIs).

### Key UX Challenges
1. **Cold start:** User arrives from social media with zero context — must understand and act in <30 seconds
2. **Copy-paste bridge:** Value is delivered OUTSIDE this app (in the chatbot) — UX must get users there fast
3. **Multi-state disambiguation:** Border zip codes need smooth resolution without breaking flow
4. **Deadline urgency:** Time-sensitive civic info must communicate urgency without anxiety
5. **Universal access:** Civic tool must serve voters of all ages, abilities, and tech comfort levels

### User Segments
- **Young first-time voter** (18-30, phone, social media referral)
- **Time-pressed regular voter** (30-60, phone or desktop, wants efficiency)
- **Elderly voter** (65+, desktop, low tech confidence, may print)
- **Advocacy sharer** (any age, looks up multiple zip codes for others)

---

## 2. Core Experience Definition

### The One-Line Experience
"Enter your zip code. Copy your prompt. Research your ballot."

### Experience Principles
1. **Instant value:** Every second between landing and copied prompt is friction to eliminate
2. **Copy is king:** The copy button is the most important element on the page after results load
3. **Progressive disclosure:** Show the essential first, details on demand
4. **Civic trust:** Transparent, nonpartisan, verifiable — no dark patterns, no manipulation
5. **Universal access:** If you can vote, you can use this tool

### Core Flow (3 steps, under 30 seconds)
```
[1] ENTER → Zip code input in hero section (zero scroll on mobile)
[2] REVIEW → State info card + customized prompt appear
[3] COPY → One tap copies prompt to clipboard → user leaves for chatbot
```

---

## 3. Emotional Design

### Emotional Journey Map

| Stage | User Feeling | Design Response |
|-------|-------------|-----------------|
| Landing | Curious but skeptical | Clear headline, trusted chatbot logos, no jargon |
| Zip entry | "Is this legit?" | Minimal input, instant response, professional design |
| Results load | "Oh, this is useful!" | Rich info card, clear deadline indicators |
| Reviewing prompt | "This is exactly what I need" | Visible prompt, highlighted personalization |
| After copy | "That was easy!" | Satisfying confirmation, clear next steps |
| Sharing | "My friends need this" | Easy share CTAs, memorable URL |

### Trust Signals
- Nonpartisan color palette (no red/blue)
- "Data last updated" transparency
- Visible prompt (nothing hidden)
- Links to official sources for verification
- "Created by a human using AI tools" attribution

---

## 4. Design Inspiration

### Reference Patterns
- **Vote.org** — clean civic tool aesthetic, minimal design
- **Stripe Docs** — information density with clarity
- **Linear** — modern web app feel, smooth interactions
- **Gov.uk** — accessible-first design, clear hierarchy

### Anti-Patterns to Avoid
- Government form aesthetic (cluttered, institutional)
- Partisan color schemes (red/blue primary colors)
- Heavy illustration or mascots (doesn't match civic seriousness)
- Modal overload (keep flow linear, not popup-driven)

---

## 5. Design System Foundation

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Navy | #1e3a5f | Headings, primary buttons, header |
| Secondary | Teal | #0d9488 | Accents, links, interactive elements |
| Success | Green | #16a34a | Deadline "safe" (>14 days) |
| Warning | Amber | #d97706 | Deadline "warning" (≤14 days) |
| Urgent | Red | #dc2626 | Deadline "urgent" (≤3 days) |
| Muted | Gray | #6b7280 | Deadline "passed", secondary text |
| Background | Warm White | #fafaf9 | Page background |
| Surface | White | #ffffff | Cards, input fields |
| Text | Dark Gray | #1f2937 | Body text |
| Text Secondary | Medium Gray | #6b7280 | Captions, metadata |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 (Hero headline) | System sans-serif | 2rem (32px) mobile / 3rem (48px) desktop | 700 |
| H2 (Section headers) | System sans-serif | 1.5rem (24px) mobile / 2rem (32px) desktop | 600 |
| H3 (Card headers) | System sans-serif | 1.25rem (20px) | 600 |
| Body | System sans-serif | 1rem (16px) | 400 |
| Small / Caption | System sans-serif | 0.875rem (14px) | 400 |
| Prompt text | System monospace | 0.875rem (14px) | 400 |

**System font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`

No web fonts. Zero font download cost.

### Spacing Scale
4px base unit: 4, 8, 12, 16, 24, 32, 48, 64, 96

### Border Radius
- Buttons: 8px
- Cards: 12px
- Inputs: 8px
- Modals: 16px

### Shadows
- Card: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- Elevated card: `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)`
- Input focus: `0 0 0 3px rgba(13, 148, 136, 0.3)` (teal ring)

---

## 6. Defining Experience (Key Screens)

### Screen: Landing State (Before Zip Entry)

```
┌─────────────────────────────────────┐
│           HEADER (optional)          │
├─────────────────────────────────────┤
│                                     │
│   🗳️ Research Your Ballot with AI   │  ← H1
│                                     │
│   Enter your zip code, get a        │  ← Subtitle
│   customized prompt, paste it       │
│   into any free AI chatbot.         │
│                                     │
│   [Claude] [ChatGPT] [Gemini] [Grok]│  ← Chatbot logos
│                                     │
│   ┌─────────────┐ ┌──────────┐     │
│   │  Zip Code   │ │  Go  →   │     │  ← Input + Button
│   └─────────────┘ └──────────┘     │
│                                     │
├─────────────────────────────────────┤
│   Tips for Using AI Ballot Research  │  ← Tips section
│   • You can say "I don't know"...   │
│   • AI can make mistakes...         │
├─────────────────────────────────────┤
│   Share this tool · Attribution      │  ← Footer
└─────────────────────────────────────┘
```

### Screen: Results State (After Valid Zip)

```
┌─────────────────────────────────────┐
│   [Hero — compressed with zip in    │
│    sticky header or inline]         │
├─────────────────────────────────────┤
│   ┌─── State Info Card ───────────┐ │
│   │ 🏛️ Texas                      │ │  ← State name
│   │ Primary Election · Mar 3, 2026│ │  ← Election info
│   │                               │ │
│   │ Registration Deadlines:       │ │
│   │ 🔴 Online: Feb 2 · Passed    │ │  ← Red status
│   │ 🔴 By mail: Feb 2 · Passed   │ │
│   │ 🔴 In person: Feb 2 · Passed │ │
│   │                               │ │
│   │ Early Voting: Feb 17-28       │ │
│   │ Voter ID: Required            │ │
│   │ Phones at Polls: Prohibited   │ │
│   │                               │ │
│   │ [Election Website ↗]          │ │
│   │ [Sample Ballot ↗]            │ │
│   └───────────────────────────────┘ │
├─────────────────────────────────────┤
│   Your Customized Prompt            │
│   ┌───────────────────────────────┐ │
│   │ ┌─[Copy to Clipboard]──────┐ │ │  ← Sticky copy btn
│   │ │                           │ │ │
│   │ │ You are a nonpartisan     │ │ │
│   │ │ civic research assistant  │ │ │
│   │ │ helping a U.S. voter...   │ │ │
│   │ │ ...                       │ │ │
│   │ │ --- Pre-filled Context ---│ │ │
│   │ │ Hi! I'm voting in Texas.  │ │ │
│   │ │ My zip code is 73301...   │ │ │
│   │ └───────────────────────────┘ │ │
│   └───────────────────────────────┘ │
├─────────────────────────────────────┤
│   Next: Open a chatbot and paste    │  ← Instructions
│   [Claude] [ChatGPT] [Gemini] [Grok]│
├─────────────────────────────────────┤
│   Tips · Footer                      │
└─────────────────────────────────────┘
```

### Screen: Multi-State Zip

```
┌─────────────────────────────────────┐
│   This zip code spans multiple      │
│   states. Which state are you       │
│   voting in?                        │
│                                     │
│   (●) Arizona                       │  ← Radio buttons
│   ( ) New Mexico                    │  ← Not dropdown
│                                     │
│   [Continue]                        │
└─────────────────────────────────────┘
```

### Screen: Error States

```
Inline below zip input:
┌─────────────────────────────────────┐
│   ⚠️ Please enter a valid 5-digit   │  ← Red text
│      zip code                       │
└─────────────────────────────────────┘

Not found (replaces state info area):
┌─────────────────────────────────────┐
│   We don't have data for this zip   │
│   code yet. We're working on adding │
│   all U.S. zip codes.               │
│   [Find your state election website ↗]│
└─────────────────────────────────────┘
```

---

## 7. Visual Foundation

### Layout Grid
- **Mobile (< 640px):** Single column, 16px horizontal padding
- **Tablet (640-1024px):** Single column, 32px horizontal padding, max-width 640px centered
- **Desktop (> 1024px):** Two-column for results (state info left, prompt right), max-width 1200px centered

### Visual Hierarchy (Z-pattern on mobile)
1. **Hero headline** — first thing seen
2. **Zip input** — primary action
3. **State info card** — context
4. **Copy button** — primary CTA after results
5. **Prompt text** — the product
6. **Tips/footer** — supporting content

### Motion & Animation
- Results section: fade-in + slide-up (200ms, ease-out)
- Copy confirmation: scale bounce (150ms)
- Deadline status: no animation (static, reliable feel)
- Respect `prefers-reduced-motion`: skip all animations

---

## 8. Design Directions

### Selected Direction: "Modern Civic"
Clean, trustworthy, and modern. Not a government form, not a startup landing page. Somewhere in between — serious enough for civic content, approachable enough for Gen Z on Reddit.

**Key characteristics:**
- System fonts for speed and reliability
- Navy + teal palette avoids partisan associations
- Cards with subtle shadows for content separation
- Generous whitespace for readability
- Bold typography for scanability
- Zero images — CSS-only visual design

---

## 9. User Journey Flows

### Happy Path Flow
```
Landing → Enter zip → Submit → State info + Prompt → Copy → Leave to chatbot
```

### Multi-State Flow
```
Landing → Enter zip → Multi-state selector → Select state → State info + Prompt → Copy
```

### Error Recovery Flow
```
Landing → Enter invalid zip → Error message → Fix zip → Submit → State info + Prompt → Copy
```

### Not Found Flow
```
Landing → Enter valid but unmapped zip → Not found message → Try different zip or visit state directory
```

### Re-Entry Flow
```
(Returning user) → Landing → Enter different zip → New state info + Prompt → Copy
```

---

## 10. Component Strategy

### Component Hierarchy

| Component | Type | Responsibility |
|-----------|------|---------------|
| `page.tsx` | Server | Data loading, static sections (hero, tips, footer) |
| `BallotToolClient` | Client | Orchestrates form → results flow, manages state |
| `ZipForm` | Client | Zip input, validation, submit, error display |
| `StateInfoCard` | Client | Election info display, deadline indicators |
| `PromptOutput` | Client | Prompt text display, copy button |
| `StateSelectorModal` | Client | Multi-state radio selection |

### Interaction States per Component

**ZipForm:**
- Empty (default)
- Typing (input has value)
- Submitting (brief loading state)
- Error (validation message visible)

**StateInfoCard:**
- Hidden (no zip submitted yet)
- Visible (showing state data)
- Deadline states: safe (green), warning (yellow), urgent (red), passed (gray)

**PromptOutput:**
- Hidden (no zip submitted yet)
- Visible (showing prompt)
- Copy states: default ("Copy to Clipboard"), copied ("Copied!" for 2s)

**StateSelectorModal:**
- Hidden (single-state zip or no zip)
- Visible (multi-state zip detected)

---

## 11. UX Patterns

### Pattern: Inline Validation
- Validate on submit (not on keystroke — avoids premature errors)
- Error message appears below input with `role="alert"`
- Error clears on next keystroke
- Input gets red border + `aria-invalid="true"`

### Pattern: Progressive Disclosure
- State info card shows summary by default
- Voter ID details, early voting notes expand on interaction
- Full prompt is visible but scrollable

### Pattern: Sticky Copy Button
- On mobile, copy button stays visible at top of prompt section during scroll
- Ensures primary CTA is always reachable

### Pattern: Deadline Status Indicators
- Color + icon + text label (never color alone)
- Green circle + "12 days left"
- Yellow triangle + "3 days left"
- Red exclamation + "Tomorrow!"
- Gray dash + "Passed"

### Pattern: Smooth Scroll to Results
- After zip submission, smooth scroll to state info card
- Focus moves to state info heading for screen readers

---

## 12. Responsive Strategy

### Mobile (< 640px)
- Single column, full-width cards
- Zip input fills width
- Touch targets: minimum 48x48px (exceeding 44px spec for safety)
- Copy button: full-width, prominent
- Prompt section: scrollable with sticky copy button

### Tablet (640-1024px)
- Centered content, max-width 640px
- Same layout as mobile but with more breathing room
- Larger font sizes for headings

### Desktop (> 1024px)
- Two-column layout for results: state info (left), prompt output (right)
- Side-by-side view lets users reference state info while reading prompt
- Max-width 1200px, centered

---

## 13. Accessibility Specification

### Keyboard Navigation
- Tab order: Skip link → Zip input → Submit → State selector (if visible) → State info links → Copy button → Tips links → Footer links
- Enter/Space activates buttons
- Escape closes state selector modal
- Focus trap in modal when open

### Screen Reader Support
- `aria-live="polite"` on results area (announces new content)
- `role="alert"` on error messages (immediate announcement)
- `aria-invalid="true"` on input when validation fails
- `aria-describedby` links input to error message
- Visually-hidden summary at top of results for screen readers

### Focus Management
- After zip submission: focus moves to state info heading
- After state selection: focus moves to state info heading
- After copy: focus stays on copy button (confirmation is visual + aria-live)

### Skip Navigation
- "Skip to main content" link as first focusable element
- Hidden until focused (visible on Tab)

### Color & Contrast
- All text: minimum 4.5:1 contrast ratio (WCAG AA)
- Large text (≥18px bold or ≥24px): minimum 3:1
- Interactive elements: visible focus ring (3px teal outline)
- Deadline status: text labels always present alongside color indicators

---

## 14. data-testid Map

| `data-testid` | Component | Element |
|----------------|-----------|---------|
| `zip-input` | ZipForm | `<input type="text">` |
| `zip-submit` | ZipForm | `<button type="submit">` |
| `zip-error` | ZipForm | Error message `<div>` |
| `state-selector` | StateSelectorModal | Container `<div>` |
| `state-info` | StateInfoCard | Outer `<section>` |
| `prompt-output` | PromptOutput | Outer `<section>` |
| `copy-button` | PromptOutput | `<button>` |
| `copy-confirmation` | PromptOutput | "Copied!" `<span>` |
| `election-name` | StateInfoCard | Election name `<span>` |
| `election-date` | StateInfoCard | Election date `<span>` |
| `registration-status` | StateInfoCard | Registration `<div>` |
| `no-election-message` | StateInfoCard | No election `<div>` |
| `not-found-message` | BallotToolClient | Not found `<div>` |
