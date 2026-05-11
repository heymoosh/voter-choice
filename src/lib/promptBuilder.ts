import type { StateData, Election } from "@/types";
import { BASE_BALLOT_PROMPT } from "./ballotPrompt";
import { formatDate, getDeadlineStatus } from "./deadlineUtils";

/**
 * Build the customized AI prompt by appending a state-specific context block
 * after the base ballot research prompt.
 */
// eslint-disable-next-line complexity
export function buildCustomizedPrompt(
  stateData: StateData,
  zipCode: string,
  nextElection: Election,
): string {
  const { stateName, registration, earlyVoting, votingRules, resources } =
    stateData;

  // Format registration deadlines
  const onlineDeadline = registration.online.available
    ? registration.online.deadline
      ? `${formatDate(registration.online.deadline)} (${getDeadlineStatus(registration.online.deadline).label})`
      : "Not available"
    : "Not available online";

  const byMailDeadline = `${formatDate(registration.byMail.deadline)} (${getDeadlineStatus(registration.byMail.deadline).label})${registration.byMail.sincePostmarked ? " — by postmark" : " — must be received"}`;

  const inPersonDeadline = `${formatDate(registration.inPerson.deadline)} (${getDeadlineStatus(registration.inPerson.deadline).label})`;

  // Format early voting
  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `${formatDate(earlyVoting.startDate)} through ${formatDate(earlyVoting.endDate)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "Not available — absentee voting only";

  // Format election type
  const electionTypeLabel =
    nextElection.type === "primary" && nextElection.primaryType
      ? `${nextElection.primaryType} primary`
      : nextElection.type;

  // Format voter ID
  const voterIdInfo = votingRules.idRequired
    ? `Required. Accepted IDs: ${votingRules.acceptedIds.slice(0, 3).join(", ")}${votingRules.acceptedIds.length > 3 ? ` (and ${votingRules.acceptedIds.length - 3} more)` : ""}`
    : "Not required";

  const contextBlock = `Hi! I'm voting in **${stateName}**. My zip code is **${zipCode}**.

Here's what I know about my upcoming election:
- **Election:** ${nextElection.name} on ${formatDate(nextElection.date)}
- **Election type:** ${electionTypeLabel}
- **Registration deadlines:** Online by ${onlineDeadline}, by mail by ${byMailDeadline}, in person by ${inPersonDeadline}
- **Early voting:** ${earlyVotingInfo}
- **Voter ID:** ${voterIdInfo}
- **Phones at polls:** ${votingRules.phonesAtPollsDetail}
- **My sample ballot:** ${resources.sampleBallotLookup}
- **My county election office:** ${resources.countyElectionLookup}

Help me with my ballot.`;

  return `${BASE_BALLOT_PROMPT}

---

${contextBlock}`;
}
