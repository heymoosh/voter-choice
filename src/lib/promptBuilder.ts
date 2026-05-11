import type { StateData, Election } from "@/types/election";
import { BALLOT_PROMPT_TEXT } from "./ballotPrompt";
import {
  findNextElection,
  formatDate,
  getDeadlineStatus,
} from "./electionUtils";

/**
 * Build the full customized prompt for a voter.
 * Combines the base ballot prompt with state-specific context.
 */
export function buildPrompt(stateData: StateData, zip: string): string {
  const contextBlock = buildContextBlock(stateData, zip);
  return `${BALLOT_PROMPT_TEXT}\n\n---\n\n${contextBlock}`;
}

/**
 * Build the state-specific pre-filled context block.
 */
export function buildContextBlock(stateData: StateData, zip: string): string {
  const nextElection = findNextElection(stateData.elections);
  const { registration, earlyVoting, votingRules, resources } = stateData;

  const electionInfo = nextElection
    ? formatElectionInfo(nextElection)
    : "No upcoming elections found — check your state election website for updates.";

  const onlineReg = registration.online.available
    ? getDeadlineStatus(registration.online.deadline).label +
      (registration.online.deadline
        ? ` (${formatDate(registration.online.deadline)})`
        : "")
    : "Not available";

  const byMailReg =
    getDeadlineStatus(registration.byMail.deadline).label +
    ` (${formatDate(registration.byMail.deadline)})` +
    (registration.byMail.sincePostmarked
      ? " — postmark date"
      : " — received date");

  const inPersonReg =
    getDeadlineStatus(registration.inPerson.deadline).label +
    ` (${formatDate(registration.inPerson.deadline)})`;

  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `${formatDate(earlyVoting.startDate)} through ${formatDate(earlyVoting.endDate)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "Not available — absentee voting only";

  const voterIdInfo = votingRules.idRequired
    ? `Required. Accepted IDs: ${votingRules.acceptedIds.join(", ")}`
    : "Not required";

  return `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
- **Election:** ${electionInfo}
- **Registration deadlines:** Online by ${onlineReg}, by mail by ${byMailReg}, in person by ${inPersonReg}
- **Early voting:** ${earlyVotingInfo}
- **Voter ID:** ${voterIdInfo}
- **Phones at polls:** ${votingRules.phonesAtPollsDetail}
- **My sample ballot:** ${resources.sampleBallotLookup}
- **My county election office:** ${resources.countyElectionLookup}

Help me with my ballot.`;
}

function formatElectionInfo(election: Election): string {
  const dateStr = formatDate(election.date);
  const typeStr =
    election.isPrimary && election.primaryType
      ? `${election.primaryType} primary`
      : election.type;
  return `${election.name} on ${dateStr} (${typeStr})`;
}
