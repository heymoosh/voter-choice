import { StateData, Election } from "@/types/election";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getRegistrationStatus(stateData: StateData): string {
  const { registration } = stateData;
  const lines: string[] = [];

  if (registration.sameDayRegistration) {
    lines.push("✓ Same-day registration available");
  } else {
    lines.push(
      `Registration deadline: ${formatDate(registration.online.deadline)}`,
    );
  }

  if (registration.online.available) {
    lines.push(`Online registration: ${registration.online.url}`);
  }

  return lines.join("\n");
}

function getVotingRulesText(stateData: StateData): string {
  const { votingRules } = stateData;
  const lines: string[] = [];

  if (votingRules.idRequired) {
    lines.push("Photo ID required to vote");
    if (votingRules.acceptedIds.length > 0) {
      lines.push(
        `Accepted IDs: ${votingRules.acceptedIds.slice(0, 3).join("; ")}`,
      );
    }
  } else {
    lines.push("No photo ID required to vote");
  }

  lines.push(votingRules.phonesAtPollsDetail);

  return lines.join("\n");
}

function getElectionContext(election: Election): string {
  const lines: string[] = [];
  lines.push(`Election: ${election.name}`);
  lines.push(`Date: ${formatDate(election.date)}`);
  lines.push(
    `Type: ${election.type.charAt(0).toUpperCase() + election.type.slice(1)}`,
  );

  if (election.isPrimary && election.primaryType) {
    const typeLabels: Record<string, string> = {
      open: "Open primary (any registered voter may participate)",
      closed: "Closed primary (must be registered with party)",
      "semi-closed":
        "Semi-closed primary (registered party members + independents)",
      "semi-open":
        "Semi-open primary (can cross party lines with restrictions)",
    };
    lines.push(
      typeLabels[election.primaryType] ??
        `Primary type: ${election.primaryType}`,
    );
  }

  return lines.join("\n");
}

export function generateBallotPrompt(
  stateData: StateData,
  election: Election | null,
  zipCode: string,
): string {
  const electionContext = election
    ? getElectionContext(election)
    : `No upcoming election data available for ${stateData.stateName}`;

  const registrationStatus = getRegistrationStatus(stateData);
  const votingRules = getVotingRulesText(stateData);

  return `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.

## HOW TO FORMAT EVERY RESPONSE (follow this strictly)

- **Keep each issue or race to 4-6 bullet points max.** No long paragraphs.
- **Bold the key takeaway** in each bullet so I can scan.
- **One issue or race per response** unless I ask you to speed up.
- **Bottom line first.** Lead with the 1-sentence summary, then supporting detail.
- **3-4 sentences per bullet max.**
- **Use plain language.** If a 16-year-old wouldn't understand it, rewrite it.
- **Never recap what we already covered** unless I ask.

## MY ELECTION CONTEXT

State: ${stateData.stateName}
Zip Code: ${zipCode}

${electionContext}

## REGISTRATION & VOTING

${registrationStatus}

## VOTING RULES

${votingRules}

## RESOURCES

Official election website: ${stateData.resources.stateElectionWebsite}
Find your polling place: ${stateData.resources.pollingPlaceLookup}
Sample ballot lookup: ${stateData.resources.sampleBallotLookup}

## IMPORTANT RULES

- **Collaborate, don't auto-fill.** Recommend only when asked.
- **Actions > words.** Prioritize what candidates have DONE.
- **Teach before you ask.** Never ask my opinion on something I don't understand yet.
- **Make it personal.** "This affects renters because..." beats abstract policy talk.
- **AI makes mistakes.** Link me to sources so I can verify.

Let's start! Please ask me about my specific ballot and then walk me through each race and proposition one at a time.`;
}
