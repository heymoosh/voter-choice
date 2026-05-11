import type { StateElectionData, Election } from "./types";
import { formatDate, findNextElection } from "./deadlineStatus";

// The base ballot research prompt — extracted from docs/BALLOT_PROMPT.md
// Starting at "You are a nonpartisan civic research assistant..."
const BASE_PROMPT = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.

## HOW TO FORMAT EVERY RESPONSE (follow this strictly)

- **Keep each issue or race to 4-6 bullet points max.** No long paragraphs.
- **Bold the key takeaway** in each bullet so I can scan.
- **One issue or race per response** unless I ask you to speed up.
- **Bottom line first.** Lead with the 1-sentence summary, then give me supporting detail I can expand on.
- **3-4 sentences per bullet max.** If you're writing more, you're writing too much.
- **Use plain language.** If a 16-year-old wouldn't understand it, rewrite it.
- **Never recap what we already covered** unless I ask.

I can always say "tell me more" if I want depth. Default to concise.

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

- **What does this position actually do?** Don't assume I know.
- **Research in the background.** Search voting records, donor data, endorsements, and news.
- **Present each candidate in 2-3 sentences.** Focus on: what they got done, money trail concerns, and how they match what I care about.
- **Flag red flags and key endorsements.**
- **Ask me what I think or if I want a recommendation.**

## STEP 5: Propositions

For each proposition:

- **One-sentence plain language summary**
- What "yes" and "no" actually mean in practice
- Whether it connects to what I said I care about

## STEP 6: Give me my summary

Clean, printable summary I can take to the polls. Remind me that many states prohibit phones at polling places.

## STEP 7: Generate my outputs

At the end, generate two outputs: (A) a one-page ballot printout, and (B) a voter profile for future elections.

## Important rules

- **Collaborate, don't auto-fill.** Recommend only when asked.
- **Actions > words.** Prioritize what candidates have DONE.
- **Teach before you ask.** Never ask my opinion on something I don't understand yet.
- **AI makes mistakes.** Link me to sources so I can verify.

Let's start with Step 1.`;

/**
 * Generate the customized prompt for a voter based on their state data and zip code.
 */
export function generatePrompt(
  stateData: StateElectionData,
  zip: string,
  today: Date = new Date(),
): string {
  const nextElection = findNextElection(stateData.elections, today);

  const contextBlock = buildContextBlock(stateData, zip, nextElection);

  return `${BASE_PROMPT}

---

${contextBlock}`;
}

function buildContextBlock(
  state: StateElectionData,
  zip: string,
  election: Election | null,
): string {
  const lines: string[] = [];

  lines.push(
    `Hi! I'm voting in **${state.stateName}**. My zip code is **${zip}**.`,
  );
  lines.push("");
  lines.push("Here's what I know about my upcoming election:");

  if (election) {
    lines.push(
      `- **Election:** ${election.name} on ${formatDate(election.date)}`,
    );
    const typeStr =
      election.isPrimary && election.primaryType
        ? `${election.type} (${election.primaryType} primary)`
        : election.type;
    lines.push(`- **Election type:** ${typeStr}`);
  } else {
    lines.push("- **Election:** No upcoming election found");
  }

  // Registration deadlines
  const { online, byMail, inPerson } = state.registration;
  const onlineDeadline =
    online.available && online.deadline
      ? `Online by ${formatDate(online.deadline)}`
      : "Online registration not available";
  const mailDeadline = byMail.deadline
    ? `by mail by ${formatDate(byMail.deadline)}${byMail.sincePostmarked ? " (postmark date)" : " (received date)"}`
    : "by mail: N/A";
  const inPersonDeadline = inPerson.deadline
    ? `in person by ${formatDate(inPerson.deadline)}`
    : "in person: N/A";

  lines.push(
    `- **Registration deadlines:** ${onlineDeadline}, ${mailDeadline}, ${inPersonDeadline}`,
  );

  // Early voting
  if (
    state.earlyVoting.available &&
    state.earlyVoting.startDate &&
    state.earlyVoting.endDate
  ) {
    lines.push(
      `- **Early voting:** ${formatDate(state.earlyVoting.startDate)} through ${formatDate(state.earlyVoting.endDate)}`,
    );
  } else {
    lines.push("- **Early voting:** Not available — absentee voting only");
  }

  // Voter ID
  if (state.votingRules.idRequired) {
    const ids = state.votingRules.acceptedIds.join(", ");
    lines.push(`- **Voter ID:** Required. Accepted: ${ids}`);
  } else {
    lines.push("- **Voter ID:** Not required");
  }

  // Phones at polls
  lines.push(`- **Phones at polls:** ${state.votingRules.phonesAtPollsDetail}`);

  // Resources
  lines.push(`- **My sample ballot:** ${state.resources.sampleBallotLookup}`);
  lines.push(
    `- **My county election office:** ${state.resources.countyElectionLookup}`,
  );

  lines.push("");
  lines.push("Help me with my ballot.");

  return lines.join("\n");
}
