/**
 * Ballot data utilities — pure functions, no side effects.
 * All data is sourced from static JSON files in src/data/.
 * No external API calls. No localStorage or cookies.
 */

import zipToState from "@/data/zip-to-state.json";

// ---- Types -----------------------------------------------------------------

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
}

export type DeadlineStatus = "green" | "yellow" | "red" | "passed";

export interface DeadlineInfo {
  date: string;
  daysLeft: number;
  status: DeadlineStatus;
  label: string;
}

// ---- Zip lookup ------------------------------------------------------------

/** Returns array of state codes for a zip, or null if not found. */
export function lookupZip(zip: string): string[] | null {
  const map = zipToState as Record<string, string[]>;
  return map[zip] ?? null;
}

// ---- State data loading ----------------------------------------------------

/** Dynamically loads state JSON. Returns null for unknown state codes. */
export async function loadStateData(
  stateCode: string,
): Promise<StateData | null> {
  try {
    // Dynamic import so each state file is only loaded when needed
    const imported = await import(`@/data/states/${stateCode}.json`);
    return imported.default as StateData;
  } catch {
    return null;
  }
}

// ---- Election helpers ------------------------------------------------------

/** Returns the next upcoming election (date >= today), or null. */
export function getNextElection(
  elections: Election[],
  today: Date = new Date(),
): Election | null {
  const todayStr = today.toISOString().split("T")[0];
  const upcoming = elections.filter((e) => e.date >= todayStr);
  if (upcoming.length === 0) return null;
  // Sort ascending and return first
  return upcoming.sort((a, b) => a.date.localeCompare(b.date))[0];
}

/** Formats an ISO date string to a human-readable date like "March 3, 2026". */
export function formatDate(isoDate: string): string {
  // Parse as UTC to avoid timezone shifts
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ---- Deadline helpers ------------------------------------------------------

/**
 * Calculates deadline status given a deadline ISO date and today's date.
 * - green: > 14 days
 * - yellow: <= 14 days and > 3 days
 * - red: <= 3 days and >= 0 days
 * - passed: < 0 days
 */
export function getDeadlineInfo(
  deadlineIso: string | null,
  today: Date = new Date(),
): DeadlineInfo | null {
  if (!deadlineIso) return null;
  const [year, month, day] = deadlineIso.split("-").map(Number);
  const deadline = new Date(Date.UTC(year, month - 1, day));
  const todayUtc = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.round(
    (deadline.getTime() - todayUtc.getTime()) / msPerDay,
  );

  let status: DeadlineStatus;
  let label: string;

  if (daysLeft < 0) {
    status = "passed";
    label = "Passed";
  } else if (daysLeft <= 3) {
    status = "red";
    label =
      daysLeft === 0
        ? "Today!"
        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  } else if (daysLeft <= 14) {
    status = "yellow";
    label = `${daysLeft} days left`;
  } else {
    status = "green";
    label = `${daysLeft} days left`;
  }

  return { date: deadlineIso, daysLeft, status, label };
}

// ---- Prompt generation -----------------------------------------------------

const BALLOT_PROMPT = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.

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

If this is a primary where I choose a party ballot, ask me 3-4 quick questions about **how I think**, not policy. Examples:

- Track record of getting things done vs. strong public voice for your values?
- Realistic winner in November vs. expressing what you believe?
- Keep a bad actor out vs. nominate the strongest candidate on your side?
- Small-dollar donor base vs. voting record that shows independence from big donors?

Then **make a clear recommendation** in 2-3 sentences, give me the strongest counterargument for the other primary, and let me decide.

If this is a general election, skip this step.

## STEP 4: Research candidates — race by race

**No candidate bios.** For each race:

- **What does this position actually do?** Don't assume I know.
- **Research in the background.** Search voting records, donor data, endorsements, and news. Look at actions, funding, and whether words match deeds.
- **Present each candidate in 2-3 sentences.** Focus on: what they got done, money trail concerns, and how they match what I care about.
- **Flag red flags and key endorsements.**
- **Ask me what I think or if I want a recommendation.** Don't auto-fill my ballot.

## STEP 5: Propositions

For each proposition: one-sentence plain language summary, what "yes" and "no" actually mean, whether it connects to what I care about, and my likely lean.

## STEP 6: Give me my summary

Clean, printable summary I can take to the polls.

## STEP 7: Generate my outputs

**Output A:** One-page ballot printout with just my picks.
**Output B:** My voter profile for future elections.

## Important rules

- **Collaborate, don't auto-fill.** Recommend only when asked.
- **Actions > words.** Prioritize what candidates have DONE.
- **Teach before you ask.** Never ask my opinion on something I don't understand yet.
- **AI makes mistakes.** Link me to sources so I can verify.

Let's start with Step 1.`;

// ---- Context block helpers (extracted to reduce complexity) ----------------

function electionLines(election: Election | null): string[] {
  if (!election) return ["- **Election:** No upcoming elections found"];
  const electionType =
    election.isPrimary && election.primaryType
      ? `${election.primaryType} primary`
      : election.type;
  return [
    `- **Election:** ${election.name} on ${formatDate(election.date)}`,
    `- **Election type:** ${electionType}`,
  ];
}

function registrationLines(reg: StateData["registration"]): string[] {
  const onlineStr = reg.online.available
    ? reg.online.deadline
      ? `Online by ${formatDate(reg.online.deadline)}`
      : "Online registration not available"
    : "Online registration not available";
  const byMailStr = `by mail by ${formatDate(reg.byMail.deadline)} (${reg.byMail.sincePostmarked ? "postmark date" : "received date"})`;
  const inPersonStr = `in person by ${formatDate(reg.inPerson.deadline)}`;
  const lines = [
    `- **Registration deadlines:** ${onlineStr}, ${byMailStr}, ${inPersonStr}`,
  ];
  if (reg.sameDayRegistration)
    lines.push("  - Same-day registration available");
  return lines;
}

function earlyVotingLine(ev: StateData["earlyVoting"]): string {
  if (ev.available && ev.startDate) {
    const notes = ev.notes ? ` (${ev.notes})` : "";
    return `- **Early voting:** ${formatDate(ev.startDate)} through ${formatDate(ev.endDate!)}${notes}`;
  }
  return "- **Early voting:** Not available — absentee voting only";
}

function voterIdLine(rules: StateData["votingRules"]): string {
  if (rules.idRequired) {
    return `- **Voter ID:** Required. Accepted IDs: ${rules.acceptedIds.join(", ")}`;
  }
  return "- **Voter ID:** Not required";
}

/** Generates the pre-filled context block appended to the ballot prompt. */
export function generateContextBlock(
  stateData: StateData,
  zip: string,
  election: Election | null,
): string {
  const lines: string[] = [
    `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.`,
    "",
    "Here's what I know about my upcoming election:",
    ...electionLines(election),
    ...registrationLines(stateData.registration),
    earlyVotingLine(stateData.earlyVoting),
    voterIdLine(stateData.votingRules),
    `- **Phones at polls:** ${stateData.votingRules.phonesAtPollsDetail}`,
    `- **My sample ballot:** ${stateData.resources.sampleBallotLookup}`,
    `- **My county election office:** ${stateData.resources.countyElectionLookup}`,
    "",
    "Help me with my ballot.",
  ];
  return lines.join("\n");
}

/** Returns the full copyable prompt: ballot prompt + context block. */
export function buildFullPrompt(contextBlock: string): string {
  return `${BALLOT_PROMPT}\n\n---\n\n${contextBlock}`;
}
