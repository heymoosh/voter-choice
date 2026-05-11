import type { StateData, Election } from "@/types/state";

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getNextElection(
  elections: StateData["elections"],
): Election | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return elections.find((e) => new Date(e.date + "T00:00:00") >= today);
}

function formatElectionLine(election: Election | undefined): string {
  if (!election) return "No upcoming elections found.";
  const typeLabel = election.isPrimary
    ? `${election.primaryType ?? ""} primary`.trim()
    : election.type;
  return `**Election:** ${election.name} on ${formatDate(election.date)} (${typeLabel})`;
}

function formatEarlyVoting(earlyVoting: StateData["earlyVoting"]): string {
  if (!earlyVoting.available) return "Not available — absentee voting only";
  return `${formatDate(earlyVoting.startDate!)} through ${formatDate(earlyVoting.endDate!)}`;
}

function formatVoterIdInfo(votingRules: StateData["votingRules"]): string {
  if (!votingRules.idRequired) return "Not required";
  const ids = votingRules.acceptedIds;
  const listed = ids.slice(0, 2).join(", ");
  const suffix = ids.length > 2 ? ", and others" : "";
  return `Required. Accepted: ${listed}${suffix}`;
}

export function buildContextBlock(stateData: StateData, zip: string): string {
  const upcoming = getNextElection(stateData.elections);
  const reg = stateData.registration;

  return `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
- ${formatElectionLine(upcoming)}
- **Registration deadlines:** Online by ${reg.online.deadline ?? "N/A"}, by mail by ${reg.byMail.deadline ?? "N/A"}, in person by ${reg.inPerson.deadline ?? "N/A"}
- **Early voting:** ${formatEarlyVoting(stateData.earlyVoting)}
- **Voter ID:** ${formatVoterIdInfo(stateData.votingRules)}
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
