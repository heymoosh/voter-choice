import type { StateData } from "@/types/state";
import type { OpenStatesCandidateContext } from "@/lib/openstates/types";

const BASE_PROMPT = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS - not their campaign promises.

Keep each issue or race concise, teach before you ask, and always ground advice in public sources. When you have enough information, produce the ballot summary and voter profile in the formats requested by the prompt.`;

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function getNextElection(
  stateData: StateData,
): StateData["elections"][number] | null {
  const today = new Date();
  const upcoming = stateData.elections
    .map((election) => ({
      election,
      time: new Date(`${election.date}T00:00:00`).getTime(),
    }))
    .filter(
      ({ time }) => !Number.isNaN(time) && time >= today.setHours(0, 0, 0, 0),
    )
    .sort((left, right) => left.time - right.time);

  return upcoming[0]?.election ?? stateData.elections[0] ?? null;
}

function describeDeadline(label: string, deadline: string | null): string {
  if (!deadline) {
    return `${label}: not available`;
  }

  return `${label}: ${formatDate(deadline)}`;
}

function buildContextBlock(stateData: StateData, zip: string): string {
  const election = getNextElection(stateData);
  const electionLine = election
    ? `- Election: ${election.name} on ${formatDate(election.date)}`
    : `- Election: no upcoming election found`;
  const typeLine = election
    ? `- Election type: ${election.type}${election.primaryType ? ` (${election.primaryType} primary)` : ""}`
    : "- Election type: not available";
  const registration = stateData.registration;
  const earlyVoting = stateData.earlyVoting;
  const voterId = stateData.votingRules.idRequired
    ? `Required. ${stateData.votingRules.acceptedIds.join("; ")}`
    : "Not required.";
  const phonePolicy = stateData.votingRules.phonesAtPollsDetail
    ? `${stateData.votingRules.phonesAtPolls}: ${stateData.votingRules.phonesAtPollsDetail}`
    : stateData.votingRules.phonesAtPolls;

  return [
    `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.`,
    "Here's what I know about my upcoming election:",
    electionLine,
    typeLine,
    `- Registration deadlines: ${describeDeadline("online", registration.online.deadline)}, ${describeDeadline("by mail", registration.byMail.deadline)} (sincePostmarked: ${registration.byMail.sincePostmarked ? "postmarked" : "received"}), ${describeDeadline("in person", registration.inPerson.deadline)}`,
    earlyVoting.available
      ? `- Early voting: ${formatDate(earlyVoting.startDate ?? "")} through ${formatDate(earlyVoting.endDate ?? "")}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "- Early voting: not available",
    `- Voter ID: ${voterId}`,
    `- Phones at polls: ${phonePolicy}`,
    `- My sample ballot: ${stateData.resources.sampleBallotLookup}`,
    `- My county election office: ${stateData.resources.countyElectionLookup}`,
    "",
    "Help me with my ballot.",
  ].join("\n");
}

function buildOpenStatesContext(
  candidateContext?: OpenStatesCandidateContext | null,
): string {
  if (!candidateContext) {
    return "";
  }

  const officeBits = [
    candidateContext.officeLabel
      ? `Office: ${candidateContext.officeLabel}`
      : null,
    candidateContext.jurisdictionName
      ? `Jurisdiction: ${candidateContext.jurisdictionName}`
      : null,
    candidateContext.incumbent ? "Incumbent: yes" : "Incumbent: no",
  ].filter(Boolean);
  const voteLine = candidateContext.recentVoteSummary
    ? `Recent voting record: ${candidateContext.recentVoteSummary}`
    : null;
  const sourceLine = candidateContext.sourceUrls.length
    ? `Sources: ${candidateContext.sourceUrls.join(", ")}`
    : null;

  return [
    "OpenStates enrichment:",
    `- Candidate: ${candidateContext.displayName}`,
    `- Identity: ${candidateContext.personId}${candidateContext.primaryParty ? ` (${candidateContext.primaryParty})` : ""}`,
    ...officeBits.map((bit) => `- ${bit}`),
    voteLine ? `- ${voteLine}` : null,
    sourceLine ? `- ${sourceLine}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildFullPrompt(
  stateData: StateData,
  zip: string,
  candidateContext?: OpenStatesCandidateContext | null,
): string {
  const openStatesBlock = buildOpenStatesContext(candidateContext);

  return [BASE_PROMPT, buildContextBlock(stateData, zip), openStatesBlock]
    .filter(Boolean)
    .join("\n\n");
}
