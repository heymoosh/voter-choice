# Ballot Research Tool Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js 15 app where voters enter their zip code and receive a customized, copyable AI ballot research prompt.

**Architecture:** Client-side React with static JSON imports. No API routes. All logic in `src/lib/`. Components split by section. State managed with `useState` hooks only.

**Tech Stack:** Next.js 15.5.12, React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright

---

## Chunk 1: Types and Data Utilities

### Task 1: TypeScript interfaces

**Files:**
- Create: `src/types/state.ts`

- [ ] **Step 1: Create `src/types/state.ts`** with interfaces matching the JSON schema in PROJECT_SPEC.md

```typescript
export interface Election {
  id: string;
  name: string;
  date: string; // ISO date
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface Registration {
  online: { available: boolean; deadline: string | null; url: string | null };
  byMail: { deadline: string | null; sincePostmarked: boolean };
  inPerson: { deadline: string | null; sincePostmarked: boolean };
  sameDayRegistration: boolean;
  registrationCheckUrl: string;
}

export interface EarlyVoting {
  available: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string;
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

export type DeadlineStatus = "green" | "yellow" | "red" | "passed";

export interface DeadlineInfo {
  date: string | null;
  status: DeadlineStatus;
  daysRemaining: number | null;
  label: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/state.ts
git commit -m "phase1: add TypeScript state interfaces"
```

---

### Task 2: Zip lookup utility

**Files:**
- Create: `src/lib/zipLookup.ts`
- Create: `tests/lib/zipLookup.test.ts`

- [ ] **Step 1: Write the failing test** at `tests/lib/zipLookup.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { lookupZip } from "../../src/lib/zipLookup";

describe("lookupZip", () => {
  it("returns state codes for a known TX zip", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns multiple state codes for multi-state zip", () => {
    const result = lookupZip("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result).toHaveLength(2);
  });

  it("returns null for unknown zip code", () => {
    expect(lookupZip("00000")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(lookupZip("abcde")).toBeNull();
  });

  it("returns null for wrong length", () => {
    expect(lookupZip("123")).toBeNull();
  });

  it("returns CA for 90210", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/zipLookup.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Implement `src/lib/zipLookup.ts`**

```typescript
import zipToState from "../data/zip-to-state.json";

const zipMap = zipToState as Record<string, string[]>;

export function lookupZip(zip: string): string[] | null {
  if (!/^\d{5}$/.test(zip)) return null;
  return zipMap[zip] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/zipLookup.test.ts`
Expected: all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/zipLookup.ts tests/lib/zipLookup.test.ts
git commit -m "phase1: add zipLookup utility with tests"
```

---

### Task 3: Deadline status utility

**Files:**
- Create: `src/lib/deadlineStatus.ts`
- Create: `tests/lib/deadlineStatus.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { getDeadlineInfo } from "../../src/lib/deadlineStatus";

describe("getDeadlineInfo", () => {
  it("returns passed for a date in the past", () => {
    const info = getDeadlineInfo("2020-01-01", new Date("2026-05-11"));
    expect(info.status).toBe("passed");
    expect(info.label).toMatch(/passed/i);
    expect(info.daysRemaining).toBeNull();
  });

  it("returns red for deadline 2 days away", () => {
    const info = getDeadlineInfo("2026-05-13", new Date("2026-05-11"));
    expect(info.status).toBe("red");
    expect(info.daysRemaining).toBe(2);
    expect(info.label).toMatch(/2 days/i);
  });

  it("returns yellow for deadline 10 days away", () => {
    const info = getDeadlineInfo("2026-05-21", new Date("2026-05-11"));
    expect(info.status).toBe("yellow");
    expect(info.daysRemaining).toBe(10);
  });

  it("returns green for deadline 20 days away", () => {
    const info = getDeadlineInfo("2026-05-31", new Date("2026-05-11"));
    expect(info.status).toBe("green");
    expect(info.daysRemaining).toBe(20);
  });

  it("returns passed for null deadline", () => {
    const info = getDeadlineInfo(null, new Date("2026-05-11"));
    expect(info.status).toBe("passed");
    expect(info.date).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/deadlineStatus.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/deadlineStatus.ts`**

```typescript
import type { DeadlineInfo } from "../types/state";

export function getDeadlineInfo(
  deadline: string | null,
  today: Date = new Date()
): DeadlineInfo {
  if (!deadline) {
    return { date: null, status: "passed", daysRemaining: null, label: "Not available" };
  }

  const deadlineDate = new Date(deadline + "T00:00:00");
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.round((deadlineDate.getTime() - todayDate.getTime()) / msPerDay);

  if (daysRemaining < 0) {
    return { date: deadline, status: "passed", daysRemaining: null, label: "Passed" };
  }

  if (daysRemaining === 0) {
    return { date: deadline, status: "red", daysRemaining: 0, label: "Today" };
  }

  if (daysRemaining <= 3) {
    return { date: deadline, status: "red", daysRemaining, label: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left` };
  }

  if (daysRemaining <= 14) {
    return { date: deadline, status: "yellow", daysRemaining, label: `${daysRemaining} days left` };
  }

  return { date: deadline, status: "green", daysRemaining, label: `${daysRemaining} days left` };
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npx vitest run tests/lib/deadlineStatus.test.ts`
Expected: all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/deadlineStatus.ts tests/lib/deadlineStatus.test.ts
git commit -m "phase1: add deadlineStatus utility with tests"
```

---

### Task 4: State data loader

**Files:**
- Create: `src/lib/stateData.ts`

- [ ] **Step 1: Implement `src/lib/stateData.ts`**

```typescript
import type { StateData } from "../types/state";

// Dynamic imports keyed by state code
const stateModules: Record<string, () => Promise<{ default: StateData }>> = {
  TX: () => import("../data/states/TX.json"),
  CA: () => import("../data/states/CA.json"),
  NH: () => import("../data/states/NH.json"),
};

export async function loadStateData(stateCode: string): Promise<StateData | null> {
  const loader = stateModules[stateCode];
  if (!loader) return null;
  const module = await loader();
  return module.default as StateData;
}

export function getNextElection(stateData: StateData, today: Date = new Date()): import("../types/state").Election | null {
  const todayStr = today.toISOString().split("T")[0];
  return stateData.elections.find((e) => e.date >= todayStr) ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stateData.ts
git commit -m "phase1: add stateData loader utility"
```

---

### Task 5: Prompt builder

**Files:**
- Create: `src/lib/promptBuilder.ts`
- Create: `src/lib/ballotPromptText.ts`
- Create: `tests/lib/promptBuilder.test.ts`

- [ ] **Step 1: Create `src/lib/ballotPromptText.ts`** with the prompt text extracted from `docs/BALLOT_PROMPT.md` (from "You are a nonpartisan civic research assistant..." to end)

The prompt content starts at the "You are a nonpartisan civic research assistant..." section of the BALLOT_PROMPT.md file.

```typescript
export const BALLOT_PROMPT_TEXT = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.

[... full prompt text from docs/BALLOT_PROMPT.md starting at "You are a nonpartisan..." ...]`;
```

NOTE: The actual implementation extracts the full text from BALLOT_PROMPT.md at build time.

- [ ] **Step 2: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { buildContextBlock } from "../../src/lib/promptBuilder";

describe("buildContextBlock", () => {
  const mockState = {
    stateCode: "TX",
    stateName: "Texas",
    lastUpdated: "2026-03-01",
    elections: [
      {
        id: "tx-runoff",
        name: "2026 Texas Primary Runoff",
        date: "2026-05-26",
        type: "runoff" as const,
        isPrimary: false,
        primaryType: null,
      },
    ],
    registration: {
      online: { available: true, deadline: "2026-02-02", url: "https://www.votetexas.gov/" },
      byMail: { deadline: "2026-02-02", sincePostmarked: true },
      inPerson: { deadline: "2026-02-02", sincePostmarked: false },
      sameDayRegistration: false,
      registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
    },
    earlyVoting: { available: false, startDate: null, endDate: null, notes: "" },
    votingRules: {
      idRequired: true,
      acceptedIds: ["Texas driver's license"],
      phonesAtPolls: "prohibited" as const,
      phonesAtPollsDetail: "Phones prohibited.",
      additionalRules: [],
    },
    resources: {
      stateElectionWebsite: "https://www.votetexas.gov/",
      countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
      sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
      pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
    },
  };

  it("includes state name in context block", () => {
    const block = buildContextBlock("73301", mockState, mockState.elections[0]);
    expect(block).toContain("Texas");
  });

  it("includes zip code in context block", () => {
    const block = buildContextBlock("73301", mockState, mockState.elections[0]);
    expect(block).toContain("73301");
  });

  it("includes election name", () => {
    const block = buildContextBlock("73301", mockState, mockState.elections[0]);
    expect(block).toContain("2026 Texas Primary Runoff");
  });

  it("includes registration info", () => {
    const block = buildContextBlock("73301", mockState, mockState.elections[0]);
    expect(block).toMatch(/registration/i);
  });

  it("handles null election gracefully", () => {
    const block = buildContextBlock("73301", mockState, null);
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });
});
```

- [ ] **Step 3: Implement `src/lib/promptBuilder.ts`**

```typescript
import type { StateData, Election } from "../types/state";
import { formatDate, getDeadlineInfo } from "./deadlineStatus";

export function buildContextBlock(
  zip: string,
  state: StateData,
  election: Election | null
): string {
  const reg = state.registration;
  const today = new Date();

  const onlineDeadline = reg.online.available
    ? getDeadlineInfo(reg.online.deadline, today)
    : null;
  const mailDeadline = getDeadlineInfo(reg.byMail.deadline, today);
  const inPersonDeadline = getDeadlineInfo(reg.inPerson.deadline, today);

  const electionLine = election
    ? `- **Election:** ${election.name} on ${formatDate(election.date)}\n- **Election type:** ${election.type}${election.primaryType ? ` (${election.primaryType} primary)` : ""}`
    : "- **Election:** No upcoming election found";

  const onlineLine = reg.online.available && reg.online.deadline
    ? `Online by ${formatDate(reg.online.deadline)} (${onlineDeadline?.label})`
    : "Not available";

  const earlyVotingLine = state.earlyVoting.available && state.earlyVoting.startDate && state.earlyVoting.endDate
    ? `${formatDate(state.earlyVoting.startDate)} through ${formatDate(state.earlyVoting.endDate)}`
    : "Not available — absentee voting only";

  const idLine = state.votingRules.idRequired
    ? `Required. Accepted: ${state.votingRules.acceptedIds.slice(0, 3).join(", ")}${state.votingRules.acceptedIds.length > 3 ? ", and others" : ""}`
    : "Not required";

  return `Hi! I'm voting in **${state.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
${electionLine}
- **Registration deadlines:** Online: ${onlineLine}; By mail by ${reg.byMail.deadline ? formatDate(reg.byMail.deadline) : "N/A"} (${mailDeadline.label}${reg.byMail.sincePostmarked ? " — postmark date" : ""}); In person by ${reg.inPerson.deadline ? formatDate(reg.inPerson.deadline) : "N/A"} (${inPersonDeadline.label})
- **Early voting:** ${earlyVotingLine}
- **Voter ID:** ${idLine}
- **Phones at polls:** ${state.votingRules.phonesAtPollsDetail}
- **My sample ballot:** ${state.resources.sampleBallotLookup}
- **My county election office:** ${state.resources.countyElectionLookup}

Help me with my ballot.`;
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npx vitest run tests/lib/promptBuilder.test.ts`
Expected: all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/promptBuilder.ts src/lib/ballotPromptText.ts tests/lib/promptBuilder.test.ts
git commit -m "phase1: add promptBuilder utility with tests"
```

---

## Chunk 2: UI Components

### Task 6: ZipEntry component

**Files:**
- Create: `src/app/components/ZipEntry.tsx`

```typescript
"use client";

interface ZipEntryProps {
  onSubmit: (zip: string) => void;
}

export function ZipEntry({ onSubmit }: ZipEntryProps) {
  // useState for zip value and error
  // validate: must be /^\d{5}$/
  // show error with data-testid="zip-error"
  // input: data-testid="zip-input", type="text", inputMode="numeric"
  // button: data-testid="zip-submit"
  // support Enter key via onKeyDown
}
```

### Task 7: StateSelector component

**Files:**
- Create: `src/app/components/StateSelector.tsx`

- Receives `stateCodes: string[]` and `onSelect: (code: string) => void`
- Renders dropdown with `data-testid="state-selector"`

### Task 8: StateInfoCard component

**Files:**
- Create: `src/app/components/StateInfoCard.tsx`

- Receives `StateData`, `Election | null`, `zip`
- `data-testid="state-info"`, `data-testid="election-name"`, `data-testid="election-date"`, `data-testid="registration-status"`
- Shows deadline status with color + text label

### Task 9: PromptOutput component

**Files:**
- Create: `src/app/components/PromptOutput.tsx`

- Receives `fullPromptText: string`
- `data-testid="prompt-output"` on container
- `data-testid="copy-button"` on copy button
- `data-testid="copy-confirmation"` on confirmation (shown for 2s after copy)
- Uses `navigator.clipboard.writeText`; fallback: select all text

### Task 10: BallotTool root component + page integration

**Files:**
- Create: `src/app/components/BallotTool.tsx`
- Modify: `src/app/page.tsx`

BallotTool orchestrates:
1. ZipEntry → lookupZip → if multi-state: StateSelector → loadStateData
2. StateInfoCard + PromptOutput rendered when state loaded
3. `data-testid="not-found-message"` when zip not found
4. `data-testid="no-election-message"` when no upcoming election

page.tsx becomes a thin wrapper importing BallotTool.

---

## Chunk 3: Full Integration and Verification

### Task 11: Run all tests

- [ ] Run: `npm run lint`
- [ ] Run: `npx vitest run`
- [ ] Run: `npx playwright test` (app must be running on port 3000)
- [ ] Fix any failures

---
