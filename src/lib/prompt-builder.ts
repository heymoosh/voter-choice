import type { StateData, Election } from "@/types";
import { BALLOT_PROMPT_BASE } from "./ballot-prompt";
import { formatDate } from "./deadline-status";

/**
 * Builds the full customized prompt string:
 * [base prompt] + [pre-filled context block]
 */
export function buildPrompt(
  stateData: StateData,
  zipCode: string,
  election: Election | null,
): string {
  const contextBlock = buildContextBlock(stateData, zipCode, election);
  return `${BALLOT_PROMPT_BASE}\n\n---\n\n${contextBlock}`;
}

/**
 * Builds only the pre-filled context block (second "message").
 */
export function buildContextBlock(
  stateData: StateData,
  zipCode: string,
  election: Election | null,
): string {
  const { stateName, registration, earlyVoting, votingRules, resources } =
    stateData;

  // Election line
  const electionLine = election
    ? `**Election:** ${election.name} on ${formatDate(election.date)}`
    : "**Election:** No upcoming election found";

  const electionTypeLine = election
    ? `**Election type:** ${election.type}${election.isPrimary && election.primaryType ? ` (${election.primaryType} primary)` : ""}`
    : "";

  // Registration deadlines
  const onlineDeadline = registration.online.available
    ? registration.online.deadline
      ? `Online by ${formatDate(registration.online.deadline)}`
      : "Online — date not available"
    : "Online — not available";

  const byMailDeadline = registration.byMail.deadline
    ? `by mail by ${formatDate(registration.byMail.deadline)} (${registration.byMail.sincePostmarked ? "postmark date" : "received date"})`
    : "by mail — date not available";

  const inPersonDeadline = registration.inPerson.deadline
    ? `in person by ${formatDate(registration.inPerson.deadline)}`
    : "in person — date not available";

  const registrationLine = `**Registration deadlines:** ${onlineDeadline}, ${byMailDeadline}, ${inPersonDeadline}`;

  // Early voting
  let earlyVotingLine: string;
  if (earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate) {
    earlyVotingLine = `**Early voting:** ${formatDate(earlyVoting.startDate)} through ${formatDate(earlyVoting.endDate)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`;
  } else {
    earlyVotingLine = "**Early voting:** Not available — absentee voting only";
  }

  // Voter ID
  let voterIdLine: string;
  if (votingRules.idRequired) {
    const idList =
      votingRules.acceptedIds.length > 0
        ? ` Accepted: ${votingRules.acceptedIds.slice(0, 3).join(", ")}${votingRules.acceptedIds.length > 3 ? ", and others" : ""}.`
        : "";
    voterIdLine = `**Voter ID:** Required.${idList}`;
  } else {
    voterIdLine = "**Voter ID:** Not required.";
  }

  // Phones at polls
  const phonesLine = `**Phones at polls:** ${votingRules.phonesAtPollsDetail}`;

  // Links
  const sampleBallotLine = `**My sample ballot:** ${resources.sampleBallotLookup}`;
  const countyOfficeLine = `**My county election office:** ${resources.countyElectionLookup}`;

  const lines = [
    `Hi! I'm voting in **${stateName}**. My zip code is **${zipCode}**.`,
    "",
    "Here's what I know about my upcoming election:",
    `- ${electionLine}`,
    electionTypeLine ? `- ${electionTypeLine}` : null,
    `- ${registrationLine}`,
    `- ${earlyVotingLine}`,
    `- ${voterIdLine}`,
    `- ${phonesLine}`,
    `- ${sampleBallotLine}`,
    `- ${countyOfficeLine}`,
    "",
    "Help me with my ballot.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return lines;
}
