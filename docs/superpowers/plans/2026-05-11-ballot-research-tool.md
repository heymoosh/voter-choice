# Ballot Research Tool Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js app where voters enter their zip code to see state election info and get a customized AI ballot research prompt.

**Architecture:** Single page with progressive section reveal; React useState for all state; static JSON data files; lib utilities for pure functions.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest, Playwright

---

## Chunk 1: Lib utilities (pure functions, fully testable)

### Task 1: deadlineStatus utility

**Files:**
- Create: `src/lib/deadlineStatus.ts`
- Create: `src/lib/__tests__/deadlineStatus.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/deadlineStatus.test.ts
import { describe, it, expect } from "vitest";
import { getDeadlineStatus } from "../deadlineStatus";

describe("getDeadlineStatus", () => {
  it("returns passed status when deadline is in the past", () => {
    const result = getDeadlineStatus("2020-01-01", new Date("2026-05-11"));
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
    expect(result.colorClass).toBe("text-gray-500");
  });

  it("returns urgent status when 3 or fewer days remain", () => {
    const result = getDeadlineStatus("2026-05-13", new Date("2026-05-11"));
    expect(result.status).toBe("urgent");
    expect(result.daysLeft).toBe(2);
    expect(result.colorClass).toBe("text-red-600");
  });

  it("returns warning status when 14 or fewer days remain", () => {
    const result = getDeadlineStatus("2026-05-20", new Date("2026-05-11"));
    expect(result.status).toBe("warning");
    expect(result.daysLeft).toBe(9);
    expect(result.colorClass).toBe("text-yellow-600");
  });

  it("returns ok status when more than 14 days remain", () => {
    const result = getDeadlineStatus("2026-06-30", new Date("2026-05-11"));
    expect(result.status).toBe("ok");
    expect(result.colorClass).toBe("text-green-600");
  });

  it("returns passed when deadline is today", () => {
    const result = getDeadlineStatus("2026-05-11", new Date("2026-05-11"));
    expect(result.status).toBe("passed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/deadlineStatus.test.ts
```
Expected: FAIL — "Cannot find module '../deadlineStatus'"

- [ ] **Step 3: Implement deadlineStatus.ts**

```typescript
// src/lib/deadlineStatus.ts
export type DeadlineStatus = {
  status: "ok" | "warning" | "urgent" | "passed";
  label: string;
  colorClass: string;
  daysLeft: number | null;
};

export function getDeadlineStatus(
  isoDate: string | null | undefined,
  today: Date = new Date()
): DeadlineStatus {
  if (!isoDate) {
    return { status: "passed", label: "N/A", colorClass: "text-gray-500", daysLeft: null };
  }

  const deadline = new Date(isoDate + "T00:00:00");
  const todayNormalized = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffMs = deadline.getTime() - todayNormalized.getTime();
  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 1) {
    return { status: "passed", label: "Passed", colorClass: "text-gray-500", daysLeft: 0 };
  }
  if (daysLeft <= 3) {
    return { status: "urgent", label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, colorClass: "text-red-600", daysLeft };
  }
  if (daysLeft <= 14) {
    return { status: "warning", label: `${daysLeft} days left`, colorClass: "text-yellow-600", daysLeft };
  }
  return { status: "ok", label: `${daysLeft} days left`, colorClass: "text-green-600", daysLeft };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/deadlineStatus.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/deadlineStatus.ts src/lib/__tests__/deadlineStatus.test.ts
git commit -m "phase1: add deadlineStatus utility (TDD)"
```

---

### Task 2: lookupState utility

**Files:**
- Create: `src/lib/lookupState.ts`
- Create: `src/lib/__tests__/lookupState.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/lookupState.test.ts
import { describe, it, expect } from "vitest";
import { lookupState } from "../lookupState";

describe("lookupState", () => {
  it("returns state codes for a known Texas zip", () => {
    expect(lookupState("73301")).toEqual(["TX"]);
  });

  it("returns state codes for a known California zip", () => {
    expect(lookupState("90210")).toEqual(["CA"]);
  });

  it("returns multiple states for a multi-state zip", () => {
    const result = lookupState("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result).toHaveLength(2);
  });

  it("returns null for an unknown zip code", () => {
    expect(lookupState("00000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(lookupState("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/lookupState.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement lookupState.ts**

```typescript
// src/lib/lookupState.ts
import zipToState from "@/data/zip-to-state.json";

const zipMap = zipToState as Record<string, string[]>;

export function lookupState(zip: string): string[] | null {
  if (!zip) return null;
  const states = zipMap[zip];
  return states && states.length > 0 ? states : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/lookupState.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/lookupState.ts src/lib/__tests__/lookupState.test.ts
git commit -m "phase1: add lookupState utility (TDD)"
```

---

### Task 3: getStateData utility

**Files:**
- Create: `src/lib/getStateData.ts`
- Create: `src/lib/__tests__/getStateData.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/getStateData.test.ts
import { describe, it, expect } from "vitest";
import { getStateData } from "../getStateData";

describe("getStateData", () => {
  it("returns Texas state data for TX", () => {
    const data = getStateData("TX");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("Texas");
    expect(data?.stateCode).toBe("TX");
  });

  it("returns California state data for CA", () => {
    const data = getStateData("CA");
    expect(data?.stateName).toBe("California");
  });

  it("returns null for unknown state code", () => {
    expect(getStateData("ZZ")).toBeNull();
  });

  it("returns elections array", () => {
    const data = getStateData("TX");
    expect(Array.isArray(data?.elections)).toBe(true);
    expect(data!.elections.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/getStateData.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement getStateData.ts**

```typescript
// src/lib/getStateData.ts
import TX from "@/data/states/TX.json";
import CA from "@/data/states/CA.json";
import NH from "@/data/states/NH.json";
import type { StateData } from "./types";

const stateMap: Record<string, StateData> = {
  TX: TX as StateData,
  CA: CA as StateData,
  NH: NH as StateData,
};

export function getStateData(stateCode: string): StateData | null {
  return stateMap[stateCode] ?? null;
}
```

- [ ] **Step 4: Create types file**

```typescript
// src/lib/types.ts
export type ElectionType = "primary" | "general" | "runoff" | "special";

export type Election = {
  id: string;
  name: string;
  date: string;
  type: ElectionType;
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
};

export type StateData = {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: {
    online: { available: boolean; deadline: string | null; url: string };
    byMail: { deadline: string; sincePostmarked: boolean };
    inPerson: { deadline: string; sincePostmarked: boolean };
    sameDayRegistration: boolean;
    registrationCheckUrl: string;
  };
  earlyVoting: {
    available: boolean;
    startDate: string | null;
    endDate: string | null;
    notes?: string;
  };
  votingRules: {
    idRequired: boolean;
    acceptedIds: string[];
    phonesAtPolls: "prohibited" | "allowed" | "varies";
    phonesAtPollsDetail: string;
    additionalRules: string[];
  };
  resources: {
    stateElectionWebsite: string;
    countyElectionLookup: string;
    sampleBallotLookup: string;
    pollingPlaceLookup: string;
  };
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/getStateData.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/getStateData.ts src/lib/__tests__/getStateData.test.ts
git commit -m "phase1: add getStateData + StateData types (TDD)"
```

---

### Task 4: generatePrompt utility

**Files:**
- Create: `src/lib/ballotPromptText.ts`
- Create: `src/lib/generatePrompt.ts`
- Create: `src/lib/__tests__/generatePrompt.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/generatePrompt.test.ts
import { describe, it, expect } from "vitest";
import { generatePrompt } from "../generatePrompt";
import { getStateData } from "../getStateData";

describe("generatePrompt", () => {
  it("includes the state name in the prompt", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("Texas");
  });

  it("includes the zip code in the prompt", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("73301");
  });

  it("includes election info when a future election exists", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toMatch(/election/i);
  });

  it("includes registration deadline info", () => {
    const stateData = getStateData("CA")!;
    const result = generatePrompt(stateData, "90210", new Date("2026-05-11"));
    expect(result).toMatch(/registration/i);
  });

  it("includes sample ballot link", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("votetexas.gov");
  });

  it("starts with the ballot prompt preamble", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("nonpartisan civic research assistant");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/generatePrompt.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement ballotPromptText.ts** (export static ballot prompt)

- [ ] **Step 4: Implement generatePrompt.ts**

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Commit**

```bash
git add src/lib/ballotPromptText.ts src/lib/generatePrompt.ts src/lib/__tests__/generatePrompt.test.ts
git commit -m "phase1: add generatePrompt utility (TDD)"
```

---

## Chunk 2: UI Components

### Task 5: ZipForm component

**Files:**
- Create: `src/components/ZipForm.tsx`

- [ ] **Step 1: Implement ZipForm with required data-testid attributes**
- [ ] **Step 2: Commit**

```bash
git add src/components/ZipForm.tsx
git commit -m "phase1: add ZipForm component"
```

### Task 6: StateInfoCard component

**Files:**
- Create: `src/components/StateInfoCard.tsx`

- [ ] **Step 1: Implement StateInfoCard with deadline status indicators**
- [ ] **Step 2: Commit**

```bash
git add src/components/StateInfoCard.tsx
git commit -m "phase1: add StateInfoCard component"
```

### Task 7: PromptOutput component

**Files:**
- Create: `src/components/PromptOutput.tsx`

- [ ] **Step 1: Implement PromptOutput with copy button and confirmation**
- [ ] **Step 2: Commit**

```bash
git add src/components/PromptOutput.tsx
git commit -m "phase1: add PromptOutput component"
```

### Task 8: StateSelector, TipsSection, Footer components

**Files:**
- Create: `src/components/StateSelector.tsx`
- Create: `src/components/TipsSection.tsx`
- Create: `src/components/Footer.tsx`

- [ ] **Step 1: Implement components**
- [ ] **Step 2: Commit**

---

## Chunk 3: Page Assembly + Accessibility

### Task 9: Assemble page.tsx

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Wire components into page with progressive reveal logic**
- [ ] **Step 2: Add skip-to-content link in layout.tsx**
- [ ] **Step 3: Verify heading hierarchy**
- [ ] **Step 4: Commit**

---

## Chunk 4: Build Verification

### Task 10: Build + test passes

- [ ] **Step 1: npm run lint** — fix any errors
- [ ] **Step 2: npx vitest run** — fix any failures  
- [ ] **Step 3: npm run build** — fix any build errors (use --turbo if WasmHash bug)
- [ ] **Step 4: npx playwright test** — fix any e2e failures
- [ ] **Step 5: Commit all fixes**
