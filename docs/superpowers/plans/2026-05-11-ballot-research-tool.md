# Ballot Research Tool Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js 15 ballot research tool where voters enter a zip code to get state election info and a customized AI research prompt.

**Architecture:** Static JSON data (no external APIs), React client components with a custom hook for state management, Next.js API route serving state data, Clipboard API for copy functionality.

**Tech Stack:** Next.js 15.5.12 App Router, TypeScript, Tailwind CSS v4, Vitest, Playwright

---

## Chunk 1: Data utilities and API route

### Task 1: Utility libraries

**Files:**
- Create: `src/lib/zipLookup.ts`
- Create: `src/lib/deadlineUtils.ts`
- Create: `src/lib/promptBuilder.ts`
- Create: `tests/lib/zipLookup.test.ts`
- Create: `tests/lib/deadlineUtils.test.ts`
- Create: `tests/lib/promptBuilder.test.ts`

- [ ] **Step 1: Create zip lookup utility**

```typescript
// src/lib/zipLookup.ts
import zipToState from "@/data/zip-to-state.json";

export function lookupZip(zip: string): string[] | null {
  const mapping = zipToState as Record<string, string[]>;
  return mapping[zip] ?? null;
}
```

- [ ] **Step 2: Create deadline calculation utility**

```typescript
// src/lib/deadlineUtils.ts
export type DeadlineStatus = "green" | "yellow" | "red" | "passed";

export interface DeadlineInfo {
  status: DeadlineStatus;
  label: string;
  daysLeft: number | null;
}

export function getDeadlineInfo(
  deadlineIso: string | null | undefined,
  today: Date = new Date()
): DeadlineInfo {
  if (!deadlineIso) {
    return { status: "passed", label: "Not available", daysLeft: null };
  }
  const deadline = new Date(deadlineIso + "T00:00:00");
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffMs = deadline.getTime() - todayMidnight.getTime();
  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: "passed", label: "Passed", daysLeft: null };
  }
  if (daysLeft === 0) {
    return { status: "red", label: "Today", daysLeft: 0 };
  }
  if (daysLeft <= 3) {
    return { status: "red", label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, daysLeft };
  }
  if (daysLeft <= 14) {
    return { status: "yellow", label: `${daysLeft} days left`, daysLeft };
  }
  return { status: "green", label: `${daysLeft} days left`, daysLeft };
}
```

- [ ] **Step 3: Create prompt builder utility**

```typescript
// src/lib/promptBuilder.ts
import type { StateData } from "@/types/state";

export function buildContextBlock(stateData: StateData, zip: string): string {
  const today = new Date();
  const upcoming = stateData.elections.find(
    (e) => new Date(e.date + "T00:00:00") >= today
  );

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  let electionLine = "No upcoming elections found.";
  if (upcoming) {
    const typeLabel = upcoming.isPrimary
      ? `${upcoming.primaryType ?? ""} primary`.trim()
      : upcoming.type;
    electionLine = `**Election:** ${upcoming.name} on ${formatDate(upcoming.date)} (${typeLabel})`;
  }

  const reg = stateData.registration;
  const earlyVoting = stateData.earlyVoting.available
    ? `${formatDate(stateData.earlyVoting.startDate!)} through ${formatDate(stateData.earlyVoting.endDate!)}`
    : "Not available — absentee voting only";

  const idInfo = stateData.votingRules.idRequired
    ? `Required. Accepted: ${stateData.votingRules.acceptedIds.slice(0, 2).join(", ")}${stateData.votingRules.acceptedIds.length > 2 ? ", and others" : ""}`
    : "Not required";

  return `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
- ${electionLine}
- **Registration deadlines:** Online by ${reg.online.deadline ?? "N/A"}, by mail by ${reg.byMail.deadline ?? "N/A"}, in person by ${reg.inPerson.deadline ?? "N/A"}
- **Early voting:** ${earlyVoting}
- **Voter ID:** ${idInfo}
- **Phones at polls:** ${stateData.votingRules.phonesAtPollsDetail ?? stateData.votingRules.phonesAtPolls}
- **My sample ballot:** ${stateData.resources.sampleBallotLookup}
- **My county election office:** ${stateData.resources.countyElectionLookup}

Help me with my ballot.`;
}

const BALLOT_PROMPT_CORE = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.`;

export function buildFullPrompt(stateData: StateData, zip: string): string {
  const contextBlock = buildContextBlock(stateData, zip);
  return `${BALLOT_PROMPT_CORE}\n\n---\n\n${contextBlock}`;
}
```

- [ ] **Step 4: Create type definitions**

```typescript
// src/types/state.ts
export interface Election {
  id: string;
  name: string;
  date: string;
  type: "primary" | "general" | "runoff" | "special";
  isPrimary: boolean;
  primaryType: "open" | "closed" | "semi-closed" | "semi-open" | null;
}

export interface StateData {
  stateCode: string;
  stateName: string;
  lastUpdated: string;
  elections: Election[];
  registration: {
    online: { available: boolean; deadline: string | null; url: string };
    byMail: { deadline: string | null; sincePostmarked: boolean };
    inPerson: { deadline: string | null; sincePostmarked: boolean };
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
    phonesAtPollsDetail?: string;
    additionalRules: string[];
  };
  resources: {
    stateElectionWebsite: string;
    countyElectionLookup: string;
    sampleBallotLookup: string;
    pollingPlaceLookup: string;
  };
}
```

- [ ] **Step 5: Write vitest unit tests**

```typescript
// tests/lib/zipLookup.test.ts
import { describe, it, expect } from "vitest";
import { lookupZip } from "@/lib/zipLookup";

describe("lookupZip", () => {
  it("returns TX for 73301", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });
  it("returns CA for 90210", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });
  it("returns multiple states for 86515", () => {
    const result = lookupZip("86515");
    expect(result).toBeTruthy();
    expect(result!.length).toBeGreaterThan(1);
  });
  it("returns null for unknown zip", () => {
    expect(lookupZip("00000")).toBeNull();
  });
});
```

```typescript
// tests/lib/deadlineUtils.test.ts
import { describe, it, expect } from "vitest";
import { getDeadlineInfo } from "@/lib/deadlineUtils";

describe("getDeadlineInfo", () => {
  it("returns passed for dates in the past", () => {
    const today = new Date("2026-05-11");
    const result = getDeadlineInfo("2026-03-01", today);
    expect(result.status).toBe("passed");
    expect(result.label).toBe("Passed");
  });
  it("returns red for 1 day left", () => {
    const today = new Date("2026-05-11");
    const result = getDeadlineInfo("2026-05-12", today);
    expect(result.status).toBe("red");
  });
  it("returns yellow for 10 days left", () => {
    const today = new Date("2026-05-11");
    const result = getDeadlineInfo("2026-05-21", today);
    expect(result.status).toBe("yellow");
  });
  it("returns green for 20 days left", () => {
    const today = new Date("2026-05-11");
    const result = getDeadlineInfo("2026-05-31", today);
    expect(result.status).toBe("green");
  });
  it("returns passed for null deadline", () => {
    const today = new Date("2026-05-11");
    const result = getDeadlineInfo(null, today);
    expect(result.status).toBe("passed");
  });
});
```

- [ ] **Step 6: Create API route for state data**

```typescript
// src/app/api/state/[code]/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const ALLOWED_STATE_CODES = /^[A-Z]{2}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!ALLOWED_STATE_CODES.test(code)) {
    return NextResponse.json({ error: "Invalid state code" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "src",
    "data",
    "states",
    `${code}.json`
  );

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "State not found" }, { status: 404 });
  }
}
```

- [ ] **Step 7: Commit utilities**

```bash
git add src/lib/ src/types/ src/app/api/ tests/
git commit -m "phase1: utility libs, types, API route"
```

---

## Chunk 2: React components

### Task 2: Core components

**Files:**
- Create: `src/components/ZipForm.tsx`
- Create: `src/components/StateInfoCard.tsx`
- Create: `src/components/DeadlineStatus.tsx`
- Create: `src/components/StateSelector.tsx`
- Create: `src/components/PromptOutput.tsx`
- Create: `src/components/TipsSection.tsx`
- Create: `src/components/Footer.tsx`
- Create: `src/hooks/useElectionData.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create useElectionData hook**

```typescript
// src/hooks/useElectionData.ts
"use client";
import { useState, useCallback } from "react";
import { lookupZip } from "@/lib/zipLookup";
import { buildFullPrompt, buildContextBlock } from "@/lib/promptBuilder";
import type { StateData } from "@/types/state";

export type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "multi-state"; stateCodes: string[]; zip: string }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "loaded"; stateData: StateData; zip: string; prompt: string };

export function useElectionData() {
  const [state, setState] = useState<AppState>({ status: "idle" });

  const lookup = useCallback(async (zip: string) => {
    const stateCodes = lookupZip(zip);
    if (!stateCodes) {
      setState({ status: "not-found" });
      return;
    }
    if (stateCodes.length > 1) {
      setState({ status: "multi-state", stateCodes, zip });
      return;
    }
    await loadState(stateCodes[0], zip);
  }, []);

  const loadState = async (code: string, zip: string) => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/state/${code}`);
      if (!res.ok) throw new Error("State data unavailable");
      const stateData: StateData = await res.json();
      const prompt = buildFullPrompt(stateData, zip);
      setState({ status: "loaded", stateData, zip, prompt });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const selectState = useCallback((code: string, zip: string) => {
    loadState(code, zip);
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, lookup, selectState, reset };
}
```

- [ ] **Step 2: Create ZipForm component**

```tsx
// src/components/ZipForm.tsx
"use client";
import { useState, FormEvent } from "react";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  disabled?: boolean;
}

export function ZipForm({ onSubmit, disabled }: ZipFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = (zip: string): string | null => {
    if (!zip.trim()) return "Please enter a zip code";
    if (!/^\d{5}$/.test(zip)) return "Please enter a valid 5-digit zip code";
    return null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="zip-input" className="block text-sm font-medium text-gray-700 mb-1">
        Enter your 5-digit zip code
      </label>
      <div className="flex gap-2">
        <input
          id="zip-input"
          data-testid="zip-input"
          type="text"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit(e as unknown as FormEvent);
            }
          }}
          placeholder="e.g. 73301"
          disabled={disabled}
          aria-describedby={error ? "zip-error-msg" : undefined}
          aria-invalid={!!error}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
        />
        <button
          type="submit"
          data-testid="zip-submit"
          disabled={disabled}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 min-h-[44px] min-w-[44px]"
        >
          Look up
        </button>
      </div>
      {error && (
        <p
          id="zip-error-msg"
          data-testid="zip-error"
          role="alert"
          aria-live="polite"
          className="mt-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Create DeadlineStatus component**

```tsx
// src/components/DeadlineStatus.tsx
import { getDeadlineInfo } from "@/lib/deadlineUtils";

const statusStyles: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  red: "bg-red-100 text-red-800 border-red-200",
  passed: "bg-gray-100 text-gray-600 border-gray-200",
};

interface DeadlineStatusProps {
  label: string;
  deadline: string | null | undefined;
  today?: Date;
}

export function DeadlineStatus({ label, deadline, today }: DeadlineStatusProps) {
  const info = getDeadlineInfo(deadline, today);
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[info.status]}`}
      >
        {deadline && info.status !== "passed" ? `${deadline} · ` : ""}{info.label}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create StateSelector component**

```tsx
// src/components/StateSelector.tsx
"use client";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

interface StateSelectorProps {
  stateCodes: string[];
  onSelect: (code: string) => void;
}

export function StateSelector({ stateCodes, onSelect }: StateSelectorProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <p className="text-sm font-medium text-amber-800 mb-3">
        This zip code spans multiple states. Which state are you voting in?
      </p>
      <div
        data-testid="state-selector"
        role="group"
        aria-label="Select your state"
        className="flex flex-col gap-2"
      >
        {stateCodes.map((code) => (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 text-left font-medium min-h-[44px]"
          >
            {STATE_NAMES[code] ?? code}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create StateInfoCard component**

```tsx
// src/components/StateInfoCard.tsx
import type { StateData, Election } from "@/types/state";
import { DeadlineStatus } from "./DeadlineStatus";

function getNextElection(elections: Election[]): Election | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return elections.find((e) => new Date(e.date + "T00:00:00") >= today) ?? null;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface StateInfoCardProps {
  stateData: StateData;
}

export function StateInfoCard({ stateData }: StateInfoCardProps) {
  const election = getNextElection(stateData.elections);
  const reg = stateData.registration;

  return (
    <div data-testid="state-info" className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-1">{stateData.stateName}</h2>
      <p className="text-sm text-gray-500 mb-4">Last updated: {stateData.lastUpdated}</p>

      {election ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Next Election
          </h3>
          <p data-testid="election-name" className="font-semibold text-gray-900">
            {election.name}
          </p>
          <p data-testid="election-date" className="text-gray-600 text-sm mt-0.5">
            {formatDate(election.date)}
          </p>
        </div>
      ) : (
        <p data-testid="no-election-message" className="text-amber-700 bg-amber-50 rounded-lg px-4 py-3 mb-4 text-sm">
          No upcoming elections found for {stateData.stateName}.{" "}
          <a href={stateData.resources.stateElectionWebsite} className="underline" target="_blank" rel="noopener noreferrer">
            Check the state election website
          </a>{" "}
          for updates.
        </p>
      )}

      <div data-testid="registration-status" className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Registration Deadlines
        </h3>
        <DeadlineStatus label="Online" deadline={reg.online.deadline} />
        <DeadlineStatus label="By mail" deadline={reg.byMail.deadline} />
        <DeadlineStatus label="In person" deadline={reg.inPerson.deadline} />
        {reg.sameDayRegistration && (
          <p className="text-xs text-green-700 mt-1">Same-day registration available</p>
        )}
        <a
          href={reg.registrationCheckUrl}
          className="text-xs text-blue-600 underline mt-1 inline-block"
          target="_blank"
          rel="noopener noreferrer"
        >
          Check your registration status
        </a>
      </div>

      {stateData.earlyVoting.available && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Early Voting
          </h3>
          <p className="text-sm text-gray-700">
            {stateData.earlyVoting.startDate && stateData.earlyVoting.endDate
              ? `${stateData.earlyVoting.startDate} – ${stateData.earlyVoting.endDate}`
              : "Available"}
          </p>
          {stateData.earlyVoting.notes && (
            <p className="text-xs text-gray-500 mt-0.5">{stateData.earlyVoting.notes}</p>
          )}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Voting Rules
        </h3>
        <p className="text-sm text-gray-700">
          <strong>Voter ID:</strong>{" "}
          {stateData.votingRules.idRequired ? "Required" : "Not required"}
        </p>
        {stateData.votingRules.phonesAtPollsDetail && (
          <p className="text-xs text-gray-500 mt-0.5">{stateData.votingRules.phonesAtPollsDetail}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={stateData.resources.stateElectionWebsite}
          className="text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          State election website
        </a>
        <a
          href={stateData.resources.sampleBallotLookup}
          className="text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sample ballot lookup
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create PromptOutput component**

```tsx
// src/components/PromptOutput.tsx
"use client";
import { useState, useRef } from "react";

interface PromptOutputProps {
  prompt: string;
}

export function PromptOutput({ prompt }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
      if (textRef.current) {
        textRef.current.select();
        // Show instruction in a brief alert — in production would use a UI toast
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">Your Customized Research Prompt</h2>
        <button
          data-testid="copy-button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
          aria-label="Copy prompt to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>
      </div>

      {copied && (
        <p
          data-testid="copy-confirmation"
          role="status"
          aria-live="polite"
          className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3"
        >
          Copied! Paste this as your first message in any AI chatbot.
        </p>
      )}

      <p className="text-sm text-gray-600 mb-3">
        Copy this prompt and paste it as your first message in any AI chatbot:
      </p>

      <div className="relative">
        <div
          data-testid="prompt-output"
          className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-[400px] overflow-y-auto"
          role="region"
          aria-label="Customized AI ballot research prompt"
        >
          <textarea
            ref={textRef}
            readOnly
            value={prompt}
            className="w-full bg-transparent text-sm text-gray-800 font-mono resize-none outline-none whitespace-pre-wrap"
            rows={Math.min(prompt.split("\n").length + 2, 20)}
            aria-label="Ballot research prompt text"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create TipsSection component**

```tsx
// src/components/TipsSection.tsx
export function TipsSection() {
  return (
    <section aria-labelledby="tips-heading" className="bg-blue-50 rounded-xl border border-blue-100 p-6">
      <h2 id="tips-heading" className="text-lg font-bold text-blue-900 mb-4">
        Tips for Using Your Prompt
      </h2>
      <ul className="space-y-2 text-sm text-blue-800">
        <li>You can say <strong>"I don&apos;t know"</strong> or <strong>"I&apos;m not sure where I stand"</strong> — the AI will explain more and help you figure it out.</li>
        <li>You can ask it to <strong>research something</strong> for you ("Can you look up this candidate&apos;s voting record?")</li>
        <li>You can <strong>ask questions</strong> anytime ("What does this position actually do?" or "Why does this matter?")</li>
        <li>At the end, you&apos;ll get a summary you can <strong>write down or print</strong> to bring to the polls.</li>
      </ul>
      <p className="text-xs text-blue-700 mt-4 border-t border-blue-200 pt-3">
        <strong>Important:</strong> AI can make mistakes. This is a research starting point. The tool links you to official sources so you can verify anything that matters to you.
      </p>
    </section>
  );
}
```

- [ ] **Step 8: Create Footer component**

```tsx
// src/components/Footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-gray-200 py-8 mt-12">
      <div className="max-w-2xl mx-auto px-4 text-center space-y-2">
        <p className="text-sm text-gray-600">
          Share this tool with friends and family — it works for any U.S. state and any election.
        </p>
        <p className="text-xs text-gray-400">
          Created by a human using AI tools, because everyone deserves to know what they&apos;re actually voting for.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 9: Update layout.tsx with skip link**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voter Choice — AI Ballot Research Tool",
  description: "Enter your zip code to get a customized AI ballot research prompt for your state.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-medium"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Update page.tsx — main application**

```tsx
// src/app/page.tsx
"use client";
import { ZipForm } from "@/components/ZipForm";
import { StateInfoCard } from "@/components/StateInfoCard";
import { StateSelector } from "@/components/StateSelector";
import { PromptOutput } from "@/components/PromptOutput";
import { TipsSection } from "@/components/TipsSection";
import { Footer } from "@/components/Footer";
import { useElectionData } from "@/hooks/useElectionData";

export default function Home() {
  const { state, lookup, selectState } = useElectionData();

  return (
    <div className="min-h-screen bg-gray-50">
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Know What You&apos;re Voting For
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto">
            Enter your zip code to get a customized AI research prompt for your
            ballot. Paste it into any free AI chatbot — Claude, ChatGPT, Gemini,
            or Grok — and get personalized help with every race and issue.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
            {[
              { name: "Claude", url: "https://claude.ai" },
              { name: "ChatGPT", url: "https://chatgpt.com" },
              { name: "Gemini", url: "https://gemini.google.com" },
              { name: "Grok", url: "https://grok.com" },
            ].map((bot) => (
              <a
                key={bot.name}
                href={bot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-blue-400 hover:text-blue-700 transition-colors"
              >
                {bot.name}
              </a>
            ))}
          </div>
        </header>

        {/* Zip Code Entry */}
        <section aria-labelledby="zip-section-label" className="mb-8">
          <h2 id="zip-section-label" className="sr-only">
            Enter your zip code
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <ZipForm
              onSubmit={lookup}
              disabled={state.status === "loading"}
            />
            {state.status === "loading" && (
              <p className="mt-3 text-sm text-gray-500 animate-pulse">
                Looking up election information...
              </p>
            )}
            {state.status === "not-found" && (
              <p data-testid="not-found-message" role="alert" className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                We don&apos;t have data for this zip code yet. We&apos;re working on adding all
                U.S. zip codes.{" "}
                <a
                  href="https://www.usa.gov/election-office"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find your state election website
                </a>
                .
              </p>
            )}
            {state.status === "error" && (
              <p role="alert" className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                {state.message}
              </p>
            )}
          </div>
        </section>

        {/* Multi-state selector */}
        {state.status === "multi-state" && (
          <section className="mb-8">
            <StateSelector
              stateCodes={state.stateCodes}
              onSelect={(code) => selectState(code, state.zip)}
            />
          </section>
        )}

        {/* Results */}
        {state.status === "loaded" && (
          <div className="space-y-6">
            <StateInfoCard stateData={state.stateData} />
            <PromptOutput prompt={state.prompt} />
            <TipsSection />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 11: Commit components**

```bash
git add src/
git commit -m "phase1: React components, hooks, and page assembly"
```

---

## Chunk 3: Vitest configuration and tests

### Task 3: Configure Vitest and run tests

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Update vitest.config.ts with path aliases**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Run vitest and fix any issues**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/
git commit -m "phase1: vitest config and unit tests"
```
