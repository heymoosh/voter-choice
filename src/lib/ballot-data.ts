/**
 * Ballot data utilities — pure functions, no side effects.
 * All data is sourced from static JSON files in src/data/.
 * No external API calls. No localStorage or cookies.
 */

import zipToState from "@/data/zip-to-state.json";
import { getTranslations, type Language, type T } from "./translations";

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

/**
 * Formats an ISO date string to a human-readable date per locale conventions.
 * English:    "March 3, 2026"
 * Spanish:    "3 de marzo de 2026"
 * Vietnamese: "3 tháng 3, 2026"
 * Chinese:    "2026年3月3日"
 * Arabic:     "3 مارس 2026"
 *
 * Note: Arabic uses Western Arabic numerals (0-9) intentionally per spec.
 * Intl.DateTimeFormat with "ar-u-nu-latn" forces Latin digits in Arabic.
 */
export function formatDate(isoDate: string, lang: Language = "en"): string {
  // Parse as UTC to avoid timezone shifts
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));

  switch (lang) {
    case "vi":
      // Vietnamese: "3 tháng 3, 2026"
      return d.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    case "zh":
      // Chinese: "2026年3月3日"
      return d.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    case "ar": {
      // Arabic MSA: "3 مارس 2026" with Western (Latin) digits
      const parts = d.toLocaleDateString("ar-EG-u-nu-latn", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
      return parts;
    }
    case "es":
      return d.toLocaleDateString("es-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    default:
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
  }
}

// ---- Deadline helpers ------------------------------------------------------

type DeadlineBadgeT = Pick<
  T,
  | "deadlineBadgePassed"
  | "deadlineBadgeToday"
  | "deadlineBadgeDaysLeft"
  | "deadlineBadgeDayLeft"
>;

function deadlineLabel(daysLeft: number, t: DeadlineBadgeT): string {
  if (daysLeft < 0) return t.deadlineBadgePassed;
  if (daysLeft === 0) return t.deadlineBadgeToday;
  if (daysLeft === 1) return t.deadlineBadgeDayLeft;
  return t.deadlineBadgeDaysLeft.replace("{n}", String(daysLeft));
}

function deadlineStatus(daysLeft: number): DeadlineStatus {
  if (daysLeft < 0) return "passed";
  if (daysLeft <= 3) return "red";
  if (daysLeft <= 14) return "yellow";
  return "green";
}

const DEFAULT_BADGE_T: DeadlineBadgeT = {
  deadlineBadgePassed: "Passed",
  deadlineBadgeToday: "Today!",
  deadlineBadgeDaysLeft: "{n} days left",
  deadlineBadgeDayLeft: "1 day left",
};

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
  t?: Partial<DeadlineBadgeT>,
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
  const badgeT = { ...DEFAULT_BADGE_T, ...t };
  const status = deadlineStatus(daysLeft);
  const label = deadlineLabel(daysLeft, badgeT);
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

function electionLines(
  election: Election | null,
  t: T,
  lang: Language,
): string[] {
  if (!election) return [`- **${t.ctxElection}** ${t.ctxNoElection}`];
  const primaryTypeMap: Record<string, string> = {
    open: t.primaryTypeOpen,
    closed: t.primaryTypeClosed,
    "semi-closed": t.primaryTypeSemiClosed,
    "semi-open": t.primaryTypeSemiOpen,
  };
  const electionType =
    election.isPrimary && election.primaryType
      ? `${primaryTypeMap[election.primaryType] ?? election.primaryType} ${t.electionTypePrimary}`
      : election.type;
  return [
    `- **${t.ctxElection}** ${election.name} on ${formatDate(election.date, lang)}`,
    `- **${t.ctxElectionType}** ${electionType}`,
  ];
}

function registrationLines(
  reg: StateData["registration"],
  t: T,
  lang: Language,
): string[] {
  const onlineStr = reg.online.available
    ? reg.online.deadline
      ? `${t.ctxOnline} ${formatDate(reg.online.deadline, lang)}`
      : t.ctxOnlineNA
    : t.ctxOnlineNA;
  const postmarkLabel = reg.byMail.sincePostmarked
    ? t.ctxPostmark
    : t.ctxReceivedDate;
  const byMailStr = `${t.ctxByMail} ${formatDate(reg.byMail.deadline, lang)} (${postmarkLabel})`;
  const inPersonStr = `${t.ctxInPerson} ${formatDate(reg.inPerson.deadline, lang)}`;
  const lines = [
    `- **${t.ctxRegistration}** ${onlineStr}, ${byMailStr}, ${inPersonStr}`,
  ];
  if (reg.sameDayRegistration) lines.push(`  - ${t.ctxSameDayReg}`);
  return lines;
}

function earlyVotingLine(
  ev: StateData["earlyVoting"],
  t: T,
  lang: Language,
): string {
  if (ev.available && ev.startDate) {
    const notes = ev.notes ? ` (${ev.notes})` : "";
    return `- **${t.ctxEarlyVoting}** ${formatDate(ev.startDate, lang)} ${t.ctxEarlyThrough} ${formatDate(ev.endDate!, lang)}${notes}`;
  }
  return `- **${t.ctxEarlyVoting}** ${t.ctxEarlyVotingNA}`;
}

function voterIdLine(rules: StateData["votingRules"], t: T): string {
  if (rules.idRequired) {
    return `- **${t.ctxVoterId}** ${t.ctxVoterIdRequired} ${rules.acceptedIds.join(", ")}`;
  }
  return `- **${t.ctxVoterId}** ${t.ctxVoterIdNotRequired}`;
}

export interface LiveContextData {
  districts?: {
    county?: string | null;
    congressionalDistrict?: string | null;
    stateLegislativeUpper?: string | null;
    stateLegislativeLower?: string | null;
  } | null;
  pollingLocation?: {
    locationName: string;
    address: string;
    hours?: string | null;
  } | null;
  contests?: Array<{
    office: string;
    candidates: Array<{ name: string; party?: string | null }>;
  }>;
}

/** Generates the pre-filled context block appended to the ballot prompt. */
export function generateContextBlock(
  stateData: StateData,
  zip: string,
  election: Election | null,
  t?: T,
  live?: LiveContextData,
): string {
  // Default to English if no translations provided (backward compatible)
  const tr = t ?? getTranslations("en");
  const lang = tr.lang;

  const districtParts = live?.districts
    ? [
        live.districts.county,
        live.districts.congressionalDistrict,
        live.districts.stateLegislativeUpper,
        live.districts.stateLegislativeLower,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const zipLine = districtParts
    ? `${tr.ctxHello} **${stateData.stateName}**. ${tr.ctxZip} **${zip}** (${districtParts}).`
    : `${tr.ctxHello} **${stateData.stateName}**. ${tr.ctxZip} **${zip}**.`;

  const lines: string[] = [
    zipLine,
    "",
    tr.ctxKnow,
    ...electionLines(election, tr, lang),
    ...registrationLines(stateData.registration, tr, lang),
    earlyVotingLine(stateData.earlyVoting, tr, lang),
    voterIdLine(stateData.votingRules, tr),
    `- **${tr.ctxPhones}** ${stateData.votingRules.phonesAtPollsDetail}`,
    `- **${tr.ctxSampleBallot}** ${stateData.resources.sampleBallotLookup}`,
    `- **${tr.ctxCountyOffice}** ${stateData.resources.countyElectionLookup}`,
  ];

  // Phase 3 additions
  if (live?.pollingLocation) {
    lines.push(
      `- **${tr.ctxPollingPlace}** ${live.pollingLocation.locationName}, ${live.pollingLocation.address}`,
    );
  }

  if (live?.contests && live.contests.length > 0) {
    lines.push(`- **${tr.ctxBallotContests}**`);
    for (const contest of live.contests.slice(0, 5)) {
      const candidateNames = contest.candidates
        .map((c) => (c.party ? `${c.name} (${c.party})` : c.name))
        .join(", ");
      lines.push(`  - ${contest.office}: ${candidateNames}`);
    }
  }

  lines.push("", tr.ctxHelp);
  return lines.join("\n");
}

/** Returns the full copyable prompt: ballot prompt + context block. */
export function buildFullPrompt(
  contextBlock: string,
  ballotPrompt?: string,
): string {
  const promptText = ballotPrompt ?? BALLOT_PROMPT;
  return `${promptText}\n\n---\n\n${contextBlock}`;
}
