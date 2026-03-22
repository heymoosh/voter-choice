# Ballot Research Tool Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js 15 ballot research tool that lets U.S. voters enter a zip code and get a customized AI ballot research prompt.

**Architecture:** Server component shell (`page.tsx`) with a single `"use client"` island (`BallotToolClient`) that manages all interactive state. All data comes from static JSON imports — no API calls. Lib modules (`data.ts`, `date-utils.ts`, `prompt-generator.ts`) are pure functions, unit-tested first.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest (unit tests), Playwright (e2e), `@testing-library/react` (component tests)

---

## Chunk 1: Types + Lib Foundation

### Task 1: TypeScript Types

**Files:**
- Create: `src/types/election.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/election.ts

export interface Election {
  id: string;
  name: string;
  date: string; // ISO date "YYYY-MM-DD"
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface Registration {
  online: {
    available: boolean;
    deadline: string | null;
    url: string;
  };
  byMail: {
    deadline: string;
    sincePostmarked: boolean;
  };
  inPerson: {
    deadline: string;
    sincePostmarked: boolean;
  };
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}

export interface EarlyVoting {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  notes?: string;
}

export interface VotingRules {
  idRequired: boolean;
  acceptedIds: string[];
  phonesAtPolls: "prohibited" | "allowed" | "varies";
  phonesAtPollsDetail: string;
  additionalRules: string[];
}

export interface Resources {
  stateElectionWebsite: string;
  countyElectionLookup: string;
  sampleBallotLookup: string;
  pollingPlaceLookup: string;
}

export interface StateData {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: Registration;
  earlyVoting: EarlyVoting;
  votingRules: VotingRules;
  resources: Resources;
}

export type DeadlineUrgency = "ok" | "warning" | "urgent" | "passed" | "na";

export interface DeadlineStatus {
  date: string | null;
  daysLeft: number | null;
  label: string; // "12 days left" | "Passed" | "Not available"
  urgency: DeadlineUrgency;
}

export interface RegistrationStatuses {
  online: DeadlineStatus;
  byMail: DeadlineStatus;
  inPerson: DeadlineStatus;
  allPassed: boolean;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/election.ts
git commit -m "phase1: add TypeScript election types"
```

---

### Task 2: date-utils — TDD

**Files:**
- Create: `src/lib/__tests__/date-utils.test.ts`
- Create: `src/lib/date-utils.ts`

**What this module does:** Computes registration deadline status (urgency + label) relative to a given `today` date. Also formats ISO dates and finds the next upcoming election.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/date-utils.test.ts
import { describe, it, expect } from "vitest";
import {
  computeDeadlineStatus,
  getNextElection,
  formatDate,
} from "../date-utils";
import type { Election } from "../../types/election";

const elections: Election[] = [
  {
    id: "e1",
    name: "Past Election",
    date: "2025-01-01",
    type: "primary",
    isPrimary: true,
    primaryType: "open",
  },
  {
    id: "e2",
    name: "Future Election",
    date: "2026-11-03",
    type: "general",
    isPrimary: false,
    primaryType: null,
  },
  {
    id: "e3",
    name: "Near Election",
    date: "2026-05-26",
    type: "runoff",
    isPrimary: false,
    primaryType: null,
  },
];

const today = new Date("2026-03-21");

describe("getNextElection", () => {
  it("returns the earliest future election", () => {
    const result = getNextElection(elections, today);
    expect(result?.id).toBe("e3");
  });

  it("returns null if no future elections", () => {
    const pastOnly: Election[] = [elections[0]];
    expect(getNextElection(pastOnly, today)).toBeNull();
  });

  it("includes today as 'upcoming' (date >= today)", () => {
    const todayElection: Election[] = [
      { ...elections[0], date: "2026-03-21" },
    ];
    expect(getNextElection(todayElection, today)).not.toBeNull();
  });
});

describe("computeDeadlineStatus", () => {
  it("returns na for null deadline", () => {
    const result = computeDeadlineStatus(null, today);
    expect(result.urgency).toBe("na");
    expect(result.label).toBe("Not available");
    expect(result.daysLeft).toBeNull();
  });

  it("returns passed for a past deadline", () => {
    const result = computeDeadlineStatus("2026-02-01", today);
    expect(result.urgency).toBe("passed");
    expect(result.label).toBe("Passed");
    expect(result.daysLeft).toBe(0);
  });

  it("returns urgent for deadline 3 or fewer days away", () => {
    const result = computeDeadlineStatus("2026-03-24", today);
    expect(result.urgency).toBe("urgent");
    expect(result.daysLeft).toBe(3);
    expect(result.label).toBe("3 days left");
  });

  it("returns warning for 4-14 days away", () => {
    const result = computeDeadlineStatus("2026-04-01", today);
    expect(result.urgency).toBe("warning");
    expect(result.daysLeft).toBe(11);
    expect(result.label).toBe("11 days left");
  });

  it("returns ok for more than 14 days away", () => {
    const result = computeDeadlineStatus("2026-05-01", today);
    expect(result.urgency).toBe("ok");
    expect(result.daysLeft).toBe(41);
    expect(result.label).toBe("41 days left");
  });

  it("returns urgent for deadline exactly today", () => {
    const result = computeDeadlineStatus("2026-03-21", today);
    expect(result.urgency).toBe("urgent");
    expect(result.daysLeft).toBe(0);
    expect(result.label).toBe("Today");
  });

  it("returns urgent for 1 day left", () => {
    const result = computeDeadlineStatus("2026-03-22", today);
    expect(result.urgency).toBe("urgent");
    expect(result.daysLeft).toBe(1);
    expect(result.label).toBe("1 day left");
  });
});

describe("formatDate", () => {
  it("formats ISO date as 'Month D, YYYY'", () => {
    expect(formatDate("2026-11-03")).toBe("November 3, 2026");
    expect(formatDate("2026-03-21")).toBe("March 21, 2026");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/date-utils.test.ts
```
Expected: FAIL — "Cannot find module '../date-utils'"

- [ ] **Step 3: Implement date-utils**

```typescript
// src/lib/date-utils.ts
import type { Election, DeadlineStatus } from "../types/election";

/** Returns the earliest election with date >= today, or null. */
export function getNextElection(
  elections: Election[],
  today: Date
): Election | null {
  const todayStr = toDateStr(today);
  const upcoming = elections
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/** Computes urgency + label for a registration deadline. */
export function computeDeadlineStatus(
  deadline: string | null,
  today: Date
): DeadlineStatus {
  if (!deadline) {
    return { date: null, daysLeft: null, label: "Not available", urgency: "na" };
  }

  const todayStr = toDateStr(today);

  if (deadline < todayStr) {
    return { date: deadline, daysLeft: 0, label: "Passed", urgency: "passed" };
  }

  const daysLeft = diffDays(today, parseDate(deadline));

  if (daysLeft === 0) {
    return { date: deadline, daysLeft: 0, label: "Today", urgency: "urgent" };
  }

  const label = daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;

  const urgency =
    daysLeft <= 3 ? "urgent" : daysLeft <= 14 ? "warning" : "ok";

  return { date: deadline, daysLeft, label, urgency };
}

/** Formats "YYYY-MM-DD" as "Month D, YYYY". */
export function formatDate(isoDate: string): string {
  // Parse as UTC to avoid timezone shift
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// --- helpers ---

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function diffDays(from: Date, to: Date): number {
  const fromUTC = Date.UTC(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  );
  const toUTC = to.getTime();
  return Math.round((toUTC - fromUTC) / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/lib/__tests__/date-utils.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/date-utils.ts src/lib/__tests__/date-utils.test.ts
git commit -m "phase1: date-utils — TDD (getNextElection, computeDeadlineStatus, formatDate)"
```

---

### Task 3: data.ts — TDD

**Files:**
- Create: `src/lib/__tests__/data.test.ts`
- Create: `src/lib/data.ts`

**What this module does:** Looks up state code(s) from zip, loads state JSON data, computes all registration deadline statuses.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/data.test.ts
import { describe, it, expect } from "vitest";
import { lookupZip, loadStateData, computeRegistrationStatuses } from "../data";

const today = new Date("2026-03-21");

describe("lookupZip", () => {
  it("returns state codes for a known TX zip", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns multiple states for a multi-state zip", () => {
    expect(lookupZip("86515")).toEqual(["AZ", "NM"]);
  });

  it("returns null for unknown zip", () => {
    expect(lookupZip("00000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(lookupZip("")).toBeNull();
  });
});

describe("loadStateData", () => {
  it("returns TX state data", () => {
    const data = loadStateData("TX");
    expect(data?.stateCode).toBe("TX");
    expect(data?.stateName).toBe("Texas");
    expect(data?.elections.length).toBeGreaterThan(0);
  });

  it("returns null for unknown state code", () => {
    expect(loadStateData("ZZ")).toBeNull();
  });
});

describe("computeRegistrationStatuses", () => {
  it("returns allPassed=true when all deadlines are in the past", () => {
    const txData = loadStateData("TX")!;
    // TX registration deadlines are 2026-02-02, before today 2026-03-21
    const result = computeRegistrationStatuses(txData.registration, today);
    expect(result.allPassed).toBe(true);
    expect(result.online.urgency).toBe("passed");
    expect(result.byMail.urgency).toBe("passed");
    expect(result.inPerson.urgency).toBe("passed");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/data.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement data.ts**

```typescript
// src/lib/data.ts
import zipToStateRaw from "../data/zip-to-state.json";
import txData from "../data/states/TX.json";
import caData from "../data/states/CA.json";
import nhData from "../data/states/NH.json";
import type { StateData, Registration, RegistrationStatuses } from "../types/election";
import { computeDeadlineStatus } from "./date-utils";

const zipToState = zipToStateRaw as Record<string, string[]>;

const STATE_DATA: Record<string, StateData> = {
  TX: txData as StateData,
  CA: caData as StateData,
  NH: nhData as StateData,
};

/** Returns array of state codes for a zip, or null if not found. */
export function lookupZip(zip: string): string[] | null {
  if (!zip) return null;
  return zipToState[zip] ?? null;
}

/** Returns StateData for a state code, or null if not found. */
export function loadStateData(stateCode: string): StateData | null {
  return STATE_DATA[stateCode] ?? null;
}

/** Computes deadline statuses for all three registration methods. */
export function computeRegistrationStatuses(
  registration: Registration,
  today: Date
): RegistrationStatuses {
  const online = computeDeadlineStatus(
    registration.online.available ? registration.online.deadline : null,
    today
  );
  const byMail = computeDeadlineStatus(registration.byMail.deadline, today);
  const inPerson = computeDeadlineStatus(registration.inPerson.deadline, today);

  const allPassed =
    online.urgency === "passed" &&
    byMail.urgency === "passed" &&
    inPerson.urgency === "passed";

  return { online, byMail, inPerson, allPassed };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/data.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/lib/__tests__/data.test.ts
git commit -m "phase1: data.ts — TDD (lookupZip, loadStateData, computeRegistrationStatuses)"
```

---

### Task 4: prompt-generator.ts — TDD

**Files:**
- Create: `src/lib/__tests__/prompt-generator.test.ts`
- Create: `src/lib/prompt-generator.ts`

**What this module does:** Assembles the full prompt text = BALLOT_PROMPT (embedded constant) + pre-filled context block with state-specific data.

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/prompt-generator.test.ts
import { describe, it, expect } from "vitest";
import { generatePromptText, buildContextBlock } from "../prompt-generator";
import { loadStateData } from "../data";

const today = new Date("2026-03-21");
const txData = loadStateData("TX")!;

describe("buildContextBlock", () => {
  it("includes state name and zip", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("includes election name", () => {
    const block = buildContextBlock(txData, "73301", today);
    // TX has a future election (runoff 2026-05-26, general 2026-11-03)
    expect(block).toContain("2026 Texas");
  });

  it("includes sample ballot URL", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block).toContain("votetexas.gov");
  });

  it("includes voter ID info when required", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block).toContain("Voter ID");
  });

  it("includes phones at polls info", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block).toContain("Phones at polls");
  });

  it("includes 'Help me with my ballot.' at the end", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block.trim()).toMatch(/Help me with my ballot\.$/);
  });
});

describe("generatePromptText", () => {
  it("starts with the ballot prompt text", () => {
    const text = generatePromptText(txData, "73301", today);
    expect(text).toContain("nonpartisan civic research assistant");
  });

  it("contains the context block", () => {
    const text = generatePromptText(txData, "73301", today);
    expect(text).toContain("Hi! I'm voting in");
    expect(text).toContain("Texas");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/prompt-generator.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement prompt-generator.ts**

```typescript
// src/lib/prompt-generator.ts
import type { StateData } from "../types/election";
import { getNextElection, computeDeadlineStatus, formatDate } from "./date-utils";

// The full ballot research prompt text (from docs/BALLOT_PROMPT.md).
// Embedded as a constant to avoid runtime file reads in Next.js.
const BALLOT_PROMPT_TEXT = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.

## HOW TO FORMAT EVERY RESPONSE (follow this strictly)

- **Keep each issue or race to 4-6 bullet points max.** No long paragraphs.
- **Bold the key takeaway** in each bullet so I can scan.
- **One issue or race per response** unless I ask you to speed up.
- **Bottom line first.** Lead with the 1-sentence summary, then give me supporting detail I can expand on.
- **3-4 sentences per bullet max.** If you're writing more, you're writing too much.
- **Use plain language.** If a 16-year-old wouldn't understand it, rewrite it.
- **Never recap what we already covered** unless I ask.
- I can always say "tell me more" if I want depth. Default to concise.

## STEP 1: Get my location and start immediately

Ask me my zip code and state in one question. Then:

- **Search for my state's election context.** What type of election, how it works (open/closed primary), election date. **Verify today's date vs. election date** — tell me if polls are open today, early voting is underway, or it's upcoming. 2-3 sentences max.
- **If this is a primary:** Don't ask which party ballot. We'll figure that out together after the issues.
- **Give me one link** to my county election site for my sample ballot. Suggest I upload it — but **don't wait.** Start immediately with statewide races.
- **If I upload a sample ballot or share districts**, use that as the definitive source.
- **Flag once** that zip codes can span multiple districts, then move on.
- **Preview how this works** in 2-3 sentences: we walk through issues together, you can say "I don't know," I research in the background, and I'll create a handoff block if we need to continue in a new chat.

Then go straight to Step 2.

## STEP 2: Walk me through the issues — one at a time

**Don't ask "what issues matter to you."** Walk me through them. For each issue:

- **What's happening** — current situation, real numbers, plain language
- **What each side wants** — what "yes" vs. "no" means, or what candidates have actually done
- **What my vote does** — binding law or non-binding signal? One sentence.
- **Who this affects** — make it concrete and personal ("If you rent..." / "If you have kids in public school...")
- **Then ask what I think.** It's okay if I say "I don't care" or "I'm not sure" — that's useful too.

If I say "I don't know," don't restate — teach me more, then ask again.

After every 2-3 issues, give me a **one-sentence summary** of what my answers suggest so far.

## STEP 3: Help me pick a primary (if applicable)

If this is a primary where I choose a party ballot, ask me 3-4 quick questions about **how I think**, not policy.

Then **make a clear recommendation** in 2-3 sentences, give me the strongest counterargument for the other primary, and let me decide.

If this is a general election, skip this step.

## STEP 4: Research candidates — race by race

**No candidate bios.** For each race:

- **What does this position actually do?** Use concrete examples.
- **Research in the background.** Search voting records, donor data, endorsements, and news.
- **Present each candidate in 2-3 sentences.** Focus on: what they got done, money trail concerns, and how they match what I care about.
- **Flag red flags and key endorsements.**
- **Ask me what I think or if I want a recommendation.**

## STEP 5: Propositions

For each: one-sentence plain language summary, what yes/no means, whether it connects to what I care about.

## STEP 6: Give me my summary

Clean, printable summary I can take to the polls.

**Remind the voter:** Many states prohibit phones at polling places. Suggest they write down or print this summary.

## STEP 7: Generate my outputs

At the end, generate: (A) 1-page ballot printout, (B) voter profile for future elections.

## Important rules

- **Collaborate, don't auto-fill.** Recommend only when asked.
- **Actions > words.** Prioritize what candidates have DONE.
- **Teach before you ask.**
- **AI makes mistakes.** Link me to sources so I can verify.

Let's start with Step 1.`;

/** Builds the pre-filled context block ("Hi! I'm voting in..."). */
export function buildContextBlock(
  stateData: StateData,
  zip: string,
  today: Date
): string {
  const nextElection = getNextElection(stateData.elections, today);

  const electionLine = nextElection
    ? `- **Election:** ${nextElection.name} on ${formatDate(nextElection.date)}\n- **Election type:** ${nextElection.type}${nextElection.primaryType ? ` (${nextElection.primaryType} primary)` : ""}`
    : "- **Election:** No upcoming elections found — check your state election website for updates.";

  const reg = stateData.registration;
  const onlineStatus = computeDeadlineStatus(
    reg.online.available ? reg.online.deadline : null,
    today
  );
  const byMailStatus = computeDeadlineStatus(reg.byMail.deadline, today);
  const inPersonStatus = computeDeadlineStatus(reg.inPerson.deadline, today);

  const onlineDeadline = reg.online.available
    ? `Online by ${formatDate(reg.online.deadline!)} (${onlineStatus.label})`
    : "Online registration not available";
  const byMailDeadline = `By mail by ${formatDate(reg.byMail.deadline)} (${byMailStatus.label}${reg.byMail.sincePostmarked ? ", postmark date" : ", received date"})`;
  const inPersonDeadline = `In person by ${formatDate(reg.inPerson.deadline)} (${inPersonStatus.label})`;

  const ev = stateData.earlyVoting;
  const earlyVotingLine = ev.available && ev.startDate && ev.endDate
    ? `${formatDate(ev.startDate)} through ${formatDate(ev.endDate)}${ev.notes ? ` — ${ev.notes}` : ""}`
    : "Not available — absentee voting only";

  const rules = stateData.votingRules;
  const voterIdLine = rules.idRequired
    ? `Required. Accepted: ${rules.acceptedIds.slice(0, 3).join(", ")}${rules.acceptedIds.length > 3 ? ", and others" : ""}`
    : "Not required";

  return `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
${electionLine}
- **Registration deadlines:** ${onlineDeadline}; ${byMailDeadline}; ${inPersonDeadline}
- **Early voting:** ${earlyVotingLine}
- **Voter ID:** ${voterIdLine}
- **Phones at polls:** ${rules.phonesAtPollsDetail}
- **My sample ballot:** ${stateData.resources.sampleBallotLookup}
- **My county election office:** ${stateData.resources.countyElectionLookup}

Help me with my ballot.`;
}

/** Returns the full prompt text = BALLOT_PROMPT + pre-filled context block. */
export function generatePromptText(
  stateData: StateData,
  zip: string,
  today: Date
): string {
  return BALLOT_PROMPT_TEXT + "\n\n---\n\n" + buildContextBlock(stateData, zip, today);
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/prompt-generator.test.ts
```
Expected: all PASS

- [ ] **Step 5: Run all unit tests**

```bash
npm test
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompt-generator.ts src/lib/__tests__/prompt-generator.test.ts
git commit -m "phase1: prompt-generator.ts — TDD (buildContextBlock, generatePromptText)"
```

---

## Chunk 2: React Components

### Task 5: ZipForm Component — TDD

**Files:**
- Create: `src/components/__tests__/ZipForm.test.tsx`
- Create: `src/components/ZipForm.tsx`

**Setup needed first:** Install React Testing Library.

- [ ] **Step 1: Install testing dependencies**

```bash
npm install --save-dev @testing-library/react@16.3.0 @testing-library/user-event@14.6.1 @testing-library/jest-dom@6.6.3 @vitejs/plugin-react@4.5.2
```

- [ ] **Step 2: Configure vitest for jsdom**

Check `vitest.config.ts` or `vitest.config.mjs`. If it doesn't exist, create it:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

Create the setup file:

```typescript
// src/test-setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 3: Write failing component tests**

```typescript
// src/components/__tests__/ZipForm.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ZipForm } from "../ZipForm";

describe("ZipForm", () => {
  it("renders zip input and submit button with correct testids", () => {
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByTestId("zip-input")).toBeInTheDocument();
    expect(screen.getByTestId("zip-submit")).toBeInTheDocument();
  });

  it("shows error for empty submission", async () => {
    const user = userEvent.setup();
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    await user.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a zip code"
    );
  });

  it("shows error for non-5-digit input", async () => {
    const user = userEvent.setup();
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    await user.type(screen.getByTestId("zip-input"), "1234");
    await user.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a valid 5-digit zip code"
    );
  });

  it("shows error for non-numeric input", async () => {
    const user = userEvent.setup();
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    await user.type(screen.getByTestId("zip-input"), "abcde");
    await user.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a valid 5-digit zip code"
    );
  });

  it("calls onSubmit with zip for valid input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} isLoading={false} />);
    await user.type(screen.getByTestId("zip-input"), "73301");
    await user.click(screen.getByTestId("zip-submit"));
    expect(onSubmit).toHaveBeenCalledWith("73301");
  });

  it("disables submit button when loading", () => {
    render(<ZipForm onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByTestId("zip-submit")).toBeDisabled();
  });

  it("clears error message when input changes after error", async () => {
    const user = userEvent.setup();
    render(<ZipForm onSubmit={vi.fn()} isLoading={false} />);
    await user.click(screen.getByTestId("zip-submit")); // trigger error
    expect(screen.getByTestId("zip-error")).toBeInTheDocument();
    await user.type(screen.getByTestId("zip-input"), "7");
    expect(screen.queryByTestId("zip-error")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npm test -- src/components/__tests__/ZipForm.test.tsx
```
Expected: FAIL — "Cannot find module '../ZipForm'"

- [ ] **Step 5: Implement ZipForm**

```typescript
// src/components/ZipForm.tsx
"use client";

import { useState } from "react";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  isLoading: boolean;
}

export function ZipForm({ onSubmit, isLoading }: ZipFormProps) {
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate(value: string): string | null {
    if (!value.trim()) return "Please enter a zip code";
    if (!/^\d{5}$/.test(value.trim()))
      return "Please enter a valid 5-digit zip code";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(zip);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSubmit(zip.trim());
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setZip(e.target.value);
    if (error) setError(null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="zip-input-field"
          className="text-sm font-medium text-gray-700"
        >
          Your zip code
        </label>
        <div className="flex gap-2">
          <input
            id="zip-input-field"
            data-testid="zip-input"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={zip}
            onChange={handleChange}
            placeholder="e.g. 90210"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "zip-error-msg" : undefined}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
          <button
            data-testid="zip-submit"
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 min-h-[44px] min-w-[44px] transition-colors"
          >
            {isLoading ? "Loading…" : "Look Up"}
          </button>
        </div>
        {error && (
          <p
            id="zip-error-msg"
            data-testid="zip-error"
            role="alert"
            aria-live="polite"
            className="text-red-600 text-sm"
          >
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Run tests**

```bash
npm test -- src/components/__tests__/ZipForm.test.tsx
```
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ZipForm.tsx src/components/__tests__/ZipForm.test.tsx src/test-setup.ts vitest.config.ts
git commit -m "phase1: ZipForm component — TDD"
```

---

### Task 6: StateSelectorModal Component — TDD

**Files:**
- Create: `src/components/__tests__/StateSelectorModal.test.tsx`
- Create: `src/components/StateSelectorModal.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/__tests__/StateSelectorModal.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { StateSelectorModal } from "../StateSelectorModal";

const stateCodes = ["AZ", "NM"];

describe("StateSelectorModal", () => {
  it("renders with data-testid='state-selector'", () => {
    render(
      <StateSelectorModal
        stateCodes={stateCodes}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByTestId("state-selector")).toBeInTheDocument();
  });

  it("shows all state options", () => {
    render(
      <StateSelectorModal
        stateCodes={stateCodes}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Arizona")).toBeInTheDocument();
    expect(screen.getByText("New Mexico")).toBeInTheDocument();
  });

  it("calls onSelect with state code on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <StateSelectorModal
        stateCodes={stateCodes}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByText("Arizona"));
    expect(onSelect).toHaveBeenCalledWith("AZ");
  });

  it("calls onCancel when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <StateSelectorModal
        stateCodes={stateCodes}
        onSelect={vi.fn()}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npm test -- src/components/__tests__/StateSelectorModal.test.tsx
```

- [ ] **Step 3: Implement StateSelectorModal**

```typescript
// src/components/StateSelectorModal.tsx
"use client";

const STATE_NAMES: Record<string, string> = {
  TX: "Texas", CA: "California", NH: "New Hampshire",
  AZ: "Arizona", NM: "New Mexico", NY: "New York",
  FL: "Florida", WA: "Washington", OR: "Oregon",
};

interface StateSelectorModalProps {
  stateCodes: string[];
  onSelect: (stateCode: string) => void;
  onCancel: () => void;
}

export function StateSelectorModal({
  stateCodes,
  onSelect,
  onCancel,
}: StateSelectorModalProps) {
  return (
    <div
      data-testid="state-selector"
      role="dialog"
      aria-modal="true"
      aria-labelledby="state-selector-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h2
          id="state-selector-title"
          className="text-lg font-semibold mb-2"
        >
          Which state are you voting in?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          This zip code spans multiple states.
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {stateCodes.map((code) => (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[44px] font-medium"
            >
              {STATE_NAMES[code] ?? code}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 min-h-[44px]"
          aria-label="Cancel state selection"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/__tests__/StateSelectorModal.test.tsx
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/StateSelectorModal.tsx src/components/__tests__/StateSelectorModal.test.tsx
git commit -m "phase1: StateSelectorModal component — TDD"
```

---

### Task 7: StateInfoCard Component — TDD

**Files:**
- Create: `src/components/__tests__/StateInfoCard.test.tsx`
- Create: `src/components/StateInfoCard.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/__tests__/StateInfoCard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StateInfoCard } from "../StateInfoCard";
import { loadStateData, computeRegistrationStatuses } from "../../lib/data";
import { getNextElection } from "../../lib/date-utils";

const today = new Date("2026-03-21");
const txData = loadStateData("TX")!;
const nextElection = getNextElection(txData.elections, today);
const regStatuses = computeRegistrationStatuses(txData.registration, today);

describe("StateInfoCard", () => {
  it("renders with data-testid='state-info'", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />
    );
    expect(screen.getByTestId("state-info")).toBeInTheDocument();
  });

  it("shows election name and date", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />
    );
    expect(screen.getByTestId("election-name")).toBeInTheDocument();
    expect(screen.getByTestId("election-date")).toBeInTheDocument();
  });

  it("shows registration status container", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />
    );
    expect(screen.getByTestId("registration-status")).toBeInTheDocument();
  });

  it("shows no-election-message when nextElection is null", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={null}
        regStatuses={regStatuses}
        today={today}
      />
    );
    expect(screen.getByTestId("no-election-message")).toBeInTheDocument();
  });

  it("shows all-deadlines-passed alert when allPassed is true", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />
    );
    // TX deadlines are all passed relative to 2026-03-21
    expect(
      screen.getByText(/Registration deadlines for this election have passed/i)
    ).toBeInTheDocument();
  });

  it("shows state name", () => {
    render(
      <StateInfoCard
        stateData={txData}
        nextElection={nextElection}
        regStatuses={regStatuses}
        today={today}
      />
    );
    expect(screen.getByText(/Texas/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npm test -- src/components/__tests__/StateInfoCard.test.tsx
```

- [ ] **Step 3: Implement StateInfoCard**

```typescript
// src/components/StateInfoCard.tsx
import type { StateData, Election, RegistrationStatuses, DeadlineUrgency } from "../types/election";
import { formatDate } from "../lib/date-utils";

interface StateInfoCardProps {
  stateData: StateData;
  nextElection: Election | null;
  regStatuses: RegistrationStatuses;
  today: Date;
}

const urgencyClasses: Record<DeadlineUrgency, string> = {
  ok: "text-green-700 bg-green-50 border-green-200",
  warning: "text-yellow-700 bg-yellow-50 border-yellow-200",
  urgent: "text-red-700 bg-red-50 border-red-200",
  passed: "text-gray-500 bg-gray-50 border-gray-200",
  na: "text-gray-400 bg-gray-50 border-gray-100",
};

function DeadlineRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: ReturnType<typeof import("../lib/date-utils")["computeDeadlineStatus"]>;
  detail?: string;
}) {
  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded border text-sm ${urgencyClasses[status.urgency]}`}>
      <span className="font-medium">{label}</span>
      <span>
        {status.date ? formatDate(status.date) : "N/A"} — <strong>{status.label}</strong>
        {detail && <span className="text-xs ml-1">({detail})</span>}
      </span>
    </div>
  );
}

export function StateInfoCard({
  stateData,
  nextElection,
  regStatuses,
}: StateInfoCardProps) {
  const reg = stateData.registration;

  return (
    <section data-testid="state-info" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-4">{stateData.stateName} Election Info</h2>

      {/* Election */}
      {nextElection ? (
        <div className="mb-4">
          <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Next Election</div>
          <div data-testid="election-name" className="font-semibold text-lg">{nextElection.name}</div>
          <div data-testid="election-date" className="text-gray-600">{formatDate(nextElection.date)}</div>
          {nextElection.primaryType && (
            <div className="text-sm text-gray-500 mt-1">
              {nextElection.primaryType.charAt(0).toUpperCase() + nextElection.primaryType.slice(1)} primary
            </div>
          )}
        </div>
      ) : (
        <div
          data-testid="no-election-message"
          role="alert"
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm"
        >
          No upcoming elections found for {stateData.stateName}.{" "}
          <a href={stateData.resources.stateElectionWebsite} className="underline" target="_blank" rel="noopener noreferrer">
            Check the state election website
          </a>{" "}
          for updates.
        </div>
      )}

      {/* Registration Deadlines */}
      <div data-testid="registration-status" className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">Registration Deadlines</div>

        {regStatuses.allPassed && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-2 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm"
          >
            Registration deadlines for this election have passed.{" "}
            <a href={reg.registrationCheckUrl} className="underline font-medium" target="_blank" rel="noopener noreferrer">
              Check your registration status
            </a>.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {reg.online.available && (
            <DeadlineRow label="Online" status={regStatuses.online} />
          )}
          <DeadlineRow
            label="By mail"
            status={regStatuses.byMail}
            detail={reg.byMail.sincePostmarked ? "postmark" : "received"}
          />
          <DeadlineRow label="In person" status={regStatuses.inPerson} />
        </div>

        {reg.sameDayRegistration && (
          <p className="text-sm text-green-700 mt-2">✓ Same-day registration available</p>
        )}
      </div>

      {/* Early Voting */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Early Voting</div>
        {stateData.earlyVoting.available && stateData.earlyVoting.startDate ? (
          <p className="text-sm">
            {formatDate(stateData.earlyVoting.startDate)} – {formatDate(stateData.earlyVoting.endDate!)}
            {stateData.earlyVoting.notes && (
              <span className="text-gray-500"> ({stateData.earlyVoting.notes})</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-500">Not available — absentee voting only</p>
        )}
      </div>

      {/* Voting Rules */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Voting Rules</div>
        <p className="text-sm">
          <strong>Voter ID:</strong>{" "}
          {stateData.votingRules.idRequired ? "Required" : "Not required"}
        </p>
        <p className="text-sm mt-1">
          <strong>Phones at polls:</strong> {stateData.votingRules.phonesAtPollsDetail}
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
        <a
          href={stateData.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          County Election Office →
        </a>
        <a
          href={stateData.resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Sample Ballot Lookup →
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/__tests__/StateInfoCard.test.tsx
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/StateInfoCard.tsx src/components/__tests__/StateInfoCard.test.tsx
git commit -m "phase1: StateInfoCard component — TDD"
```

---

### Task 8: PromptOutput Component — TDD

**Files:**
- Create: `src/components/__tests__/PromptOutput.test.tsx`
- Create: `src/components/PromptOutput.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/__tests__/PromptOutput.test.tsx
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptOutput } from "../PromptOutput";

const SAMPLE_PROMPT = "You are a nonpartisan civic research assistant\n\nHi! I'm voting in Texas.";

describe("PromptOutput", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders prompt-output testid", () => {
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    expect(screen.getByTestId("prompt-output")).toBeInTheDocument();
  });

  it("renders copy-button testid", () => {
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    expect(screen.getByTestId("copy-button")).toBeInTheDocument();
  });

  it("shows prompt text", () => {
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    expect(screen.getByTestId("prompt-output")).toHaveTextContent(
      "nonpartisan civic research assistant"
    );
  });

  it("shows copy-confirmation after clicking copy", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers();
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    await user.click(screen.getByTestId("copy-button"));
    expect(screen.getByTestId("copy-confirmation")).toBeInTheDocument();
    expect(screen.getByTestId("copy-confirmation")).toHaveTextContent("Copied!");
    vi.useRealTimers();
  });

  it("copy-confirmation disappears after 2 seconds", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers();
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    await user.click(screen.getByTestId("copy-button"));
    expect(screen.getByTestId("copy-confirmation")).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByTestId("copy-confirmation")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npm test -- src/components/__tests__/PromptOutput.test.tsx
```

- [ ] **Step 3: Implement PromptOutput**

```typescript
// src/components/PromptOutput.tsx
"use client";

import { useState, useRef } from "react";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      // Fallback: select all text in textarea
      if (textAreaRef.current) {
        textAreaRef.current.select();
        // Show instruction to copy manually
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Your Customized Prompt</h2>
        <div className="flex items-center gap-2">
          {copied && (
            <span
              data-testid="copy-confirmation"
              role="status"
              aria-live="polite"
              className="text-green-600 text-sm font-medium flex items-center gap-1"
            >
              ✓ Copied!
            </span>
          )}
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
            aria-label="Copy prompt to clipboard"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Copy this prompt and paste it as your first message in any AI chatbot.
      </p>
      <textarea
        ref={textAreaRef}
        data-testid="prompt-output"
        readOnly
        value={promptText}
        aria-label="Customized ballot research prompt"
        className="w-full h-64 md:h-96 p-4 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/__tests__/PromptOutput.test.tsx
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PromptOutput.tsx src/components/__tests__/PromptOutput.test.tsx
git commit -m "phase1: PromptOutput component — TDD"
```

---

### Task 9: BallotToolClient Component — TDD

**Files:**
- Create: `src/components/__tests__/BallotToolClient.test.tsx`
- Create: `src/components/BallotToolClient.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/__tests__/BallotToolClient.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BallotToolClient } from "../BallotToolClient";

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("BallotToolClient", () => {
  it("renders zip form initially", () => {
    render(<BallotToolClient />);
    expect(screen.getByTestId("zip-input")).toBeInTheDocument();
    expect(screen.getByTestId("zip-submit")).toBeInTheDocument();
  });

  it("shows state info after valid TX zip", async () => {
    const user = userEvent.setup();
    render(<BallotToolClient />);
    await user.type(screen.getByTestId("zip-input"), "73301");
    await user.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("state-info")).toBeInTheDocument();
    });
  });

  it("shows prompt output after valid TX zip", async () => {
    const user = userEvent.setup();
    render(<BallotToolClient />);
    await user.type(screen.getByTestId("zip-input"), "73301");
    await user.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("prompt-output")).toBeInTheDocument();
    });
  });

  it("shows not-found-message for unknown zip", async () => {
    const user = userEvent.setup();
    render(<BallotToolClient />);
    await user.type(screen.getByTestId("zip-input"), "00000");
    await user.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("not-found-message")).toBeInTheDocument();
    });
  });

  it("shows state-selector for multi-state zip", async () => {
    const user = userEvent.setup();
    render(<BallotToolClient />);
    await user.type(screen.getByTestId("zip-input"), "86515");
    await user.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("state-selector")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npm test -- src/components/__tests__/BallotToolClient.test.tsx
```

- [ ] **Step 3: Implement BallotToolClient**

```typescript
// src/components/BallotToolClient.tsx
"use client";

import { useState } from "react";
import { ZipForm } from "./ZipForm";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { StateSelectorModal } from "./StateSelectorModal";
import { lookupZip, loadStateData, computeRegistrationStatuses } from "../lib/data";
import { getNextElection } from "../lib/date-utils";
import { generatePromptText } from "../lib/prompt-generator";
import type { StateData, Election, RegistrationStatuses } from "../types/election";

type AppState =
  | { stage: "idle" }
  | { stage: "multi-state"; zip: string; stateCodes: string[] }
  | { stage: "result"; zip: string; stateData: StateData; nextElection: Election | null; regStatuses: RegistrationStatuses; promptText: string }
  | { stage: "not-found"; zip: string };

export function BallotToolClient() {
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date();

  function handleZipSubmit(zip: string) {
    setIsLoading(true);
    const stateCodes = lookupZip(zip);

    if (!stateCodes) {
      setAppState({ stage: "not-found", zip });
      setIsLoading(false);
      return;
    }

    if (stateCodes.length > 1) {
      setAppState({ stage: "multi-state", zip, stateCodes });
      setIsLoading(false);
      return;
    }

    resolveState(zip, stateCodes[0]);
  }

  function resolveState(zip: string, stateCode: string) {
    const stateData = loadStateData(stateCode);

    if (!stateData) {
      setAppState({ stage: "not-found", zip });
      setIsLoading(false);
      return;
    }

    const nextElection = getNextElection(stateData.elections, today);
    const regStatuses = computeRegistrationStatuses(stateData.registration, today);
    const promptText = generatePromptText(stateData, zip, today);

    setAppState({ stage: "result", zip, stateData, nextElection, regStatuses, promptText });
    setIsLoading(false);
  }

  function handleStateSelect(stateCode: string) {
    if (appState.stage !== "multi-state") return;
    resolveState(appState.zip, stateCode);
  }

  function handleStateCancel() {
    setAppState({ stage: "idle" });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ZipForm onSubmit={handleZipSubmit} isLoading={isLoading} />

      {appState.stage === "multi-state" && (
        <StateSelectorModal
          stateCodes={appState.stateCodes}
          onSelect={handleStateSelect}
          onCancel={handleStateCancel}
        />
      )}

      {appState.stage === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800"
        >
          <p className="font-semibold mb-1">Zip code not found</p>
          <p className="text-sm">
            We don&apos;t have data for zip code <strong>{appState.zip}</strong> yet.
            We&apos;re working on adding all U.S. zip codes.{" "}
            <a
              href="https://www.usa.gov/election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Find your state election website
            </a>.
          </p>
        </div>
      )}

      {appState.stage === "result" && (
        <>
          <div className="mt-6">
            <StateInfoCard
              stateData={appState.stateData}
              nextElection={appState.nextElection}
              regStatuses={appState.regStatuses}
              today={today}
            />
          </div>
          <PromptOutput promptText={appState.promptText} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/__tests__/BallotToolClient.test.tsx
```
Expected: all PASS

- [ ] **Step 5: Run ALL unit+component tests**

```bash
npm test
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/BallotToolClient.tsx src/components/__tests__/BallotToolClient.test.tsx
git commit -m "phase1: BallotToolClient component — TDD"
```

---

## Chunk 3: Page + Layout + Polish

### Task 10: Update page.tsx and layout.tsx

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace page.tsx**

```typescript
// src/app/page.tsx
import { BallotToolClient } from "../components/BallotToolClient";

export const metadata = {
  title: "AI Ballot Research Tool — Know What You're Voting For",
  description:
    "Enter your zip code to get a customized AI ballot research prompt. Free, nonpartisan, works with any chatbot.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>

      {/* Hero */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Know What You&apos;re Voting For
          </h1>
          <p className="text-gray-600 text-base sm:text-lg mb-4">
            Enter your zip code to get a customized AI ballot research prompt. Paste it into any
            free AI chatbot to research candidates based on what they&apos;ve actually done.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-gray-500">Works with:</span>
            {[
              { name: "Claude", url: "https://claude.ai" },
              { name: "ChatGPT", url: "https://chatgpt.com" },
              { name: "Gemini", url: "https://gemini.google.com" },
              { name: "Grok", url: "https://grok.com" },
            ].map(({ name, url }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                {name}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        <BallotToolClient />

        {/* Tips */}
        <section className="mt-12 pt-8 border-t border-gray-200" aria-labelledby="tips-heading">
          <h2 id="tips-heading" className="text-lg font-semibold mb-4">
            Tips for the conversation
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>You can say <strong>&ldquo;I don&apos;t know&rdquo;</strong> or <strong>&ldquo;I&apos;m not sure&rdquo;</strong> — the AI will help you figure it out</li>
            <li>Ask it to <strong>research something</strong> for you ("Can you look up this candidate's voting record?")</li>
            <li>You can <strong>ask questions</strong> anytime ("What does this position actually do?")</li>
            <li>At the end, it&apos;ll give you a <strong>printable ballot summary</strong> you can take to the polls</li>
          </ul>
          <p className="mt-4 text-sm text-gray-500 italic">
            AI can make mistakes. This is a research starting point — the tool links to official sources
            so you can verify anything that matters.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>
            <strong className="text-gray-700">Share this tool</strong> with voters in your community
          </p>
          <p>Created by a human using AI tools</p>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Update layout.tsx metadata**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Ballot Research Tool",
  description: "Know what you're voting for. Free, nonpartisan AI ballot research.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build compiles**

```bash
npm run build
```
Expected: Build succeeds with no errors

- [ ] **Step 4: Run lint**

```bash
npm run lint
```
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "phase1: update page.tsx and layout.tsx — hero, tips, footer, skip link"
```

---

### Task 11: Run e2e tests and fix failures

**Files:**
- Read: `e2e/ballot-tool.spec.ts` (shared e2e suite)

- [ ] **Step 1: Start dev server and run e2e**

```bash
npm run build && npm run start &
sleep 5
npm run e2e
```

- [ ] **Step 2: Review failures and fix**

If any tests fail, read `e2e/ballot-tool.spec.ts` to understand the exact assertions, then fix the implementation to match. Common issues:
- Missing `data-testid` attributes
- Wrong text content
- Focus management issues

- [ ] **Step 3: Run e2e again to confirm all pass**

```bash
npm run e2e
```
Expected: all PASS

- [ ] **Step 4: Commit fixes (if any)**

```bash
git add -A
git commit -m "phase1: fix e2e test failures"
```

---

### Task 12: Final lint + test pass

- [ ] **Step 1: Run all unit tests**

```bash
npm test
```
Expected: all PASS

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: 0 errors

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: success

- [ ] **Step 4: Commit any remaining fixes**

If there were issues, fix them and commit:

```bash
git add -A
git commit -m "phase1: lint and build fixes"
```
