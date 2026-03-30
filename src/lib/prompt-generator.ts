import type { StateData } from "../types/election";
import {
  getNextElection,
  computeDeadlineStatus,
  formatDate,
} from "./date-utils";

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

function buildRegistrationDeadlines(stateData: StateData, today: Date): string {
  const reg = stateData.registration;
  const onlineStatus = computeDeadlineStatus(
    reg.online.available ? reg.online.deadline : null,
    today,
  );
  const byMailStatus = computeDeadlineStatus(reg.byMail.deadline, today);
  const inPersonStatus = computeDeadlineStatus(reg.inPerson.deadline, today);
  const onlineDeadline = reg.online.available
    ? `Online by ${formatDate(reg.online.deadline!)} (${onlineStatus.label})`
    : "Online registration not available";
  const postmarkNote = reg.byMail.sincePostmarked
    ? ", postmark date"
    : ", received date";
  const byMailDeadline = `By mail by ${formatDate(reg.byMail.deadline)} (${byMailStatus.label}${postmarkNote})`;
  const inPersonDeadline = `In person by ${formatDate(reg.inPerson.deadline)} (${inPersonStatus.label})`;
  return `${onlineDeadline}; ${byMailDeadline}; ${inPersonDeadline}`;
}

function buildEarlyVotingLine(stateData: StateData): string {
  const ev = stateData.earlyVoting;
  if (!ev.available || !ev.startDate || !ev.endDate) {
    return "Not available — absentee voting only";
  }
  const notesStr = ev.notes ? ` — ${ev.notes}` : "";
  return `${formatDate(ev.startDate)} through ${formatDate(ev.endDate)}${notesStr}`;
}

/** Builds the pre-filled context block ("Hi! I'm voting in..."). */
export function buildContextBlock(
  stateData: StateData,
  zip: string,
  today: Date,
): string {
  const nextElection = getNextElection(stateData.elections, today);
  const electionLine = nextElection
    ? `- **Election:** ${nextElection.name} on ${formatDate(nextElection.date)}\n- **Election type:** ${nextElection.type}${nextElection.primaryType ? ` (${nextElection.primaryType} primary)` : ""}`
    : "- **Election:** No upcoming elections found — check your state election website for updates.";

  const rules = stateData.votingRules;
  const voterIdLine = rules.idRequired
    ? `Required. Accepted: ${rules.acceptedIds.slice(0, 3).join(", ")}${rules.acceptedIds.length > 3 ? ", and others" : ""}`
    : "Not required";

  return `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
${electionLine}
- **Registration deadlines:** ${buildRegistrationDeadlines(stateData, today)}
- **Early voting:** ${buildEarlyVotingLine(stateData)}
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
  today: Date,
): string {
  return (
    BALLOT_PROMPT_TEXT +
    "\n\n---\n\n" +
    buildContextBlock(stateData, zip, today)
  );
}
