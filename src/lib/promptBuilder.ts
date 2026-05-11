import type { StateData, Election } from "../types/state";
import { formatDate, getDeadlineInfo } from "./deadlineStatus";
import { BALLOT_PROMPT_TEXT } from "./ballotPromptText";

function buildElectionLine(election: Election | null): string {
  if (!election) return "- **Election:** No upcoming election found";
  const typeSuffix = election.primaryType
    ? ` (${election.primaryType} primary)`
    : "";
  return `- **Election:** ${election.name} on ${formatDate(election.date)}\n- **Election type:** ${election.type}${typeSuffix}`;
}

function buildRegistrationLine(state: StateData): string {
  const reg = state.registration;
  const today = new Date();
  const onlineDeadline =
    reg.online.available && reg.online.deadline
      ? getDeadlineInfo(reg.online.deadline, today)
      : null;
  const mailDeadline = getDeadlineInfo(reg.byMail.deadline, today);
  const inPersonDeadline = getDeadlineInfo(reg.inPerson.deadline, today);

  const onlinePart =
    reg.online.available && reg.online.deadline
      ? `Online by ${formatDate(reg.online.deadline)} (${onlineDeadline?.label})`
      : "Online: Not available";
  const mailDate = reg.byMail.deadline
    ? formatDate(reg.byMail.deadline)
    : "N/A";
  const mailPostmark = reg.byMail.sincePostmarked ? " — postmark date" : "";
  const inPersonDate = reg.inPerson.deadline
    ? formatDate(reg.inPerson.deadline)
    : "N/A";

  return `- **Registration deadlines:** ${onlinePart}; By mail by ${mailDate} (${mailDeadline.label}${mailPostmark}); In person by ${inPersonDate} (${inPersonDeadline.label})`;
}

function buildEarlyVotingLine(state: StateData): string {
  const ev = state.earlyVoting;
  if (ev.available && ev.startDate && ev.endDate) {
    return `- **Early voting:** ${formatDate(ev.startDate)} through ${formatDate(ev.endDate)}`;
  }
  return "- **Early voting:** Not available — absentee voting only";
}

function buildIdLine(state: StateData): string {
  if (!state.votingRules.idRequired) return "- **Voter ID:** Not required";
  const ids = state.votingRules.acceptedIds;
  const idList =
    ids.slice(0, 3).join(", ") + (ids.length > 3 ? ", and others" : "");
  return `- **Voter ID:** Required. Accepted: ${idList}`;
}

export function buildContextBlock(
  zip: string,
  state: StateData,
  election: Election | null,
): string {
  return `Hi! I'm voting in **${state.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
${buildElectionLine(election)}
${buildRegistrationLine(state)}
${buildEarlyVotingLine(state)}
${buildIdLine(state)}
- **Phones at polls:** ${state.votingRules.phonesAtPollsDetail}
- **My sample ballot:** ${state.resources.sampleBallotLookup}
- **My county election office:** ${state.resources.countyElectionLookup}

Help me with my ballot.`;
}

export function buildFullPrompt(
  zip: string,
  state: StateData,
  election: Election | null,
): string {
  const contextBlock = buildContextBlock(zip, state, election);
  return `${BALLOT_PROMPT_TEXT}\n\n---\n\n${contextBlock}`;
}
