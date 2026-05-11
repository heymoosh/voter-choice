import type { StateData, Election } from "./types";
import { BALLOT_PROMPT_TEXT } from "./ballotPromptText";

function findNextElection(
  elections: Election[],
  today: Date
): Election | null {
  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  const upcoming = elections.filter((e) => {
    const [y, m, d] = e.date.split("-").map(Number);
    return Date.UTC(y, m - 1, d) >= todayMs;
  });

  if (upcoming.length === 0) return null;

  // Return the earliest upcoming election
  return upcoming.reduce((a, b) => {
    const aMs = new Date(a.date + "T00:00:00Z").getTime();
    const bMs = new Date(b.date + "T00:00:00Z").getTime();
    return aMs <= bMs ? a : b;
  });
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatElectionType(election: Election): string {
  const parts = [election.type];
  if (election.isPrimary && election.primaryType) {
    parts.push(`${election.primaryType} primary`);
  }
  return parts.join(", ");
}

export function generatePrompt(
  stateData: StateData,
  zip: string,
  today: Date = new Date()
): string {
  const nextElection = findNextElection(stateData.elections, today);
  const { registration, earlyVoting, votingRules, resources, stateName } =
    stateData;

  let electionBlock: string;
  if (nextElection) {
    electionBlock =
      `- **Election:** ${nextElection.name} on ${formatDate(nextElection.date)}\n` +
      `- **Election type:** ${formatElectionType(nextElection)}`;
  } else {
    electionBlock = `- **Election:** No upcoming elections found. Check ${resources.stateElectionWebsite} for updates.`;
  }

  const regOnline = registration.online.available
    ? `Online by ${formatDate(registration.online.deadline!)} (${registration.online.url})`
    : "Online registration not available";

  const regByMail = `By mail by ${formatDate(registration.byMail.deadline)} (${registration.byMail.sincePostmarked ? "postmark date" : "received date"})`;

  const regInPerson = `In person by ${formatDate(registration.inPerson.deadline)}`;

  const earlyVotingBlock = earlyVoting.available
    ? `${formatDate(earlyVoting.startDate!)} through ${formatDate(earlyVoting.endDate!)}${earlyVoting.notes ? ` — ${earlyVoting.notes}` : ""}`
    : "Not available — absentee voting only";

  const voterIdBlock = votingRules.idRequired
    ? `Required. Accepted IDs: ${votingRules.acceptedIds.join(", ")}`
    : "Not required";

  const contextBlock =
    `Hi! I'm voting in **${stateName}**. My zip code is **${zip}**.\n\n` +
    `Here's what I know about my upcoming election:\n` +
    `${electionBlock}\n` +
    `- **Registration deadlines:** ${regOnline}, ${regByMail}, ${regInPerson}\n` +
    `- **Early voting:** ${earlyVotingBlock}\n` +
    `- **Voter ID:** ${voterIdBlock}\n` +
    `- **Phones at polls:** ${votingRules.phonesAtPollsDetail}\n` +
    `- **My sample ballot:** ${resources.sampleBallotLookup}\n` +
    `- **My county election office:** ${resources.countyElectionLookup}\n\n` +
    `Help me with my ballot.`;

  return BALLOT_PROMPT_TEXT + "\n\n" + contextBlock;
}
