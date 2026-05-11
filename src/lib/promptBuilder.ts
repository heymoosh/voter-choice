import type { StateData, Election } from "../types/state";
import { formatDate, getDeadlineInfo } from "./deadlineStatus";
import { BALLOT_PROMPT_TEXT } from "./ballotPromptText";

export function buildContextBlock(
  zip: string,
  state: StateData,
  election: Election | null
): string {
  const reg = state.registration;
  const today = new Date();

  const onlineDeadline =
    reg.online.available && reg.online.deadline
      ? getDeadlineInfo(reg.online.deadline, today)
      : null;
  const mailDeadline = getDeadlineInfo(reg.byMail.deadline, today);
  const inPersonDeadline = getDeadlineInfo(reg.inPerson.deadline, today);

  const electionLine = election
    ? `- **Election:** ${election.name} on ${formatDate(election.date)}\n- **Election type:** ${election.type}${election.primaryType ? ` (${election.primaryType} primary)` : ""}`
    : "- **Election:** No upcoming election found";

  const onlineLine =
    reg.online.available && reg.online.deadline
      ? `Online by ${formatDate(reg.online.deadline)} (${onlineDeadline?.label})`
      : "Not available";

  const earlyVotingLine =
    state.earlyVoting.available &&
    state.earlyVoting.startDate &&
    state.earlyVoting.endDate
      ? `${formatDate(state.earlyVoting.startDate)} through ${formatDate(state.earlyVoting.endDate)}`
      : "Not available — absentee voting only";

  const idLine = state.votingRules.idRequired
    ? `Required. Accepted: ${state.votingRules.acceptedIds
        .slice(0, 3)
        .join(", ")}${state.votingRules.acceptedIds.length > 3 ? ", and others" : ""}`
    : "Not required";

  return `Hi! I'm voting in **${state.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
${electionLine}
- **Registration deadlines:** Online: ${onlineLine}; By mail by ${reg.byMail.deadline ? formatDate(reg.byMail.deadline) : "N/A"} (${mailDeadline.label}${reg.byMail.sincePostmarked ? " — postmark date" : ""}); In person by ${reg.inPerson.deadline ? formatDate(reg.inPerson.deadline) : "N/A"} (${inPersonDeadline.label})
- **Early voting:** ${earlyVotingLine}
- **Voter ID:** ${idLine}
- **Phones at polls:** ${state.votingRules.phonesAtPollsDetail}
- **My sample ballot:** ${state.resources.sampleBallotLookup}
- **My county election office:** ${state.resources.countyElectionLookup}

Help me with my ballot.`;
}

export function buildFullPrompt(
  zip: string,
  state: StateData,
  election: Election | null
): string {
  const contextBlock = buildContextBlock(zip, state, election);
  return `${BALLOT_PROMPT_TEXT}\n\n---\n\n${contextBlock}`;
}
