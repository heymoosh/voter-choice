import type { StateElectionData, Election } from "@/types/election";

const MAIN_PROMPT = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.

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

For each race on my ballot:

- **What this office does** — 1 sentence, practical impact
- **Who's running** — list names, party
- **For each candidate**: voting record on 2-3 key issues relevant to what I've said I care about, major donors (top 3 industries or individuals if available), any particularly notable actions (good or bad), credibility red flags (conflicts of interest, ethics violations, etc.)
- **Ask: "Based on what you've told me, what else do you want to know about these candidates?"** Don't just dump info.

If I say "I don't know enough to decide," offer to dig into specific areas.

## STEP 5: Make it actionable

At the end:

- **Summary I can print:** List every race and what I decided, formatted for taking to the polls
- **Verification sources:** Links to official voter guides, candidate websites, voting record sources
- **Handoff block** if the ballot was long and we hit context limits: a formatted block I can paste into a new chat to keep going

## CRITICAL RULES

- **Never tell me how to vote.** Help me figure out what I think.
- **Never assume my politics.** If I say "I care about healthcare," don't assume what position I want — ask me.
- **Cite sources.** If you mention a voting record, donation, or scandal, tell me where it's from.
- **Acknowledge uncertainty.** If you don't have data, say so.
- **No soapboxing.** Stick to facts and help me think it through.
- **If I'm in a hurry:** Offer a "speed mode" where you give me the essential facts for each race in 2-3 bullets and let me say "next."

Ready when you are.`;

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function calculateDaysUntil(isoDate: string): number {
  const deadline = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getNextElection(elections: Election[]): Election | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = elections
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return upcoming[0] || null;
}

function getDeadlineStatus(isoDate: string | null): {
  status: "passed" | "urgent" | "warning" | "ok";
  daysLeft: number | null;
} {
  if (!isoDate) return { status: "passed", daysLeft: null };

  const daysLeft = calculateDaysUntil(isoDate);

  if (daysLeft < 0) return { status: "passed", daysLeft };
  if (daysLeft <= 3) return { status: "urgent", daysLeft };
  if (daysLeft <= 14) return { status: "warning", daysLeft };
  return { status: "ok", daysLeft };
}

export function generateCustomizedPrompt(
  stateData: StateElectionData,
  zipCode: string,
): string {
  const election = getNextElection(stateData.elections);

  if (!election) {
    const contextBlock = `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zipCode}**.

No upcoming elections are currently scheduled for ${stateData.stateName}. Check ${stateData.resources.stateElectionWebsite} for updates.`;

    return `${MAIN_PROMPT}\n\n---\n\n${contextBlock}`;
  }

  const onlineStatus = getDeadlineStatus(
    stateData.registration.online.deadline,
  );
  const byMailStatus = getDeadlineStatus(
    stateData.registration.byMail.deadline,
  );
  const inPersonStatus = getDeadlineStatus(
    stateData.registration.inPerson.deadline,
  );

  const formatDeadline = (
    isoDate: string | null,
    status: ReturnType<typeof getDeadlineStatus>,
    postmarkDetail?: boolean,
  ): string => {
    if (!isoDate || status.daysLeft === null) return "Not available";
    const formattedDate = formatDate(isoDate);
    const postmark = postmarkDetail ? " (postmarked)" : " (received)";
    const postmarkSuffix = postmarkDetail !== undefined ? postmark : "";

    if (status.status === "passed")
      return `${formattedDate}${postmarkSuffix} — **Passed**`;
    if (status.status === "urgent")
      return `${formattedDate}${postmarkSuffix} — **${status.daysLeft} days left (URGENT)**`;
    if (status.status === "warning")
      return `${formattedDate}${postmarkSuffix} — **${status.daysLeft} days left**`;
    return `${formattedDate}${postmarkSuffix} — ${status.daysLeft} days left`;
  };

  const earlyVotingText = stateData.earlyVoting.available
    ? `${formatDate(stateData.earlyVoting.startDate!)} through ${formatDate(stateData.earlyVoting.endDate!)}${stateData.earlyVoting.notes ? ` (${stateData.earlyVoting.notes})` : ""}`
    : "Not available — absentee voting only";

  const voterIdText = stateData.votingRules.idRequired
    ? `Required. Accepted IDs: ${stateData.votingRules.acceptedIds?.join(", ")}`
    : "Not required";

  const primaryTypeText =
    election.isPrimary && election.primaryType
      ? ` (${election.primaryType} primary)`
      : "";

  const contextBlock = `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zipCode}**.

Here's what I know about my upcoming election:
- **Election:** ${election.name} on ${formatDate(election.date)}
- **Election type:** ${election.type}${primaryTypeText}
- **Registration deadlines:**
  - Online: ${formatDeadline(stateData.registration.online.deadline, onlineStatus)}
  - By mail: ${formatDeadline(stateData.registration.byMail.deadline, byMailStatus, stateData.registration.byMail.sincePostmarked)}
  - In person: ${formatDeadline(stateData.registration.inPerson.deadline, inPersonStatus, stateData.registration.inPerson.sincePostmarked)}
  - Same-day registration: ${stateData.registration.sameDayRegistration ? "Available" : "Not available"}
- **Early voting:** ${earlyVotingText}
- **Voter ID:** ${voterIdText}
- **Phones at polls:** ${stateData.votingRules.phonesAtPollsDetail || stateData.votingRules.phonesAtPolls}
- **My sample ballot:** ${stateData.resources.sampleBallotLookup}
- **My county election office:** ${stateData.resources.countyElectionLookup}
- **Check my registration status:** ${stateData.registration.registrationCheckUrl}

Help me with my ballot.`;

  return `${MAIN_PROMPT}\n\n---\n\n${contextBlock}`;
}
