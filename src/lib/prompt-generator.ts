import type {
  StateElectionData,
  RegistrationInfo,
  VotingRules,
  EarlyVoting,
} from "@/types/election";
import { getNextElection } from "./election-data";

function formatRegistration(reg: RegistrationInfo): string {
  const online = reg.online.available
    ? `Online: ${reg.online.deadline ?? "see state website"}`
    : "Online registration not available";
  const byMail = reg.byMail.deadline
    ? `By mail: ${reg.byMail.deadline}${reg.byMail.sincePostmarked ? " (postmark)" : ""}`
    : "By mail: see state website";
  const inPerson = reg.inPerson.deadline
    ? `In person: ${reg.inPerson.deadline}`
    : "In person: see state website";
  const sameDay = reg.sameDayRegistration
    ? "Same-day registration is available."
    : "Same-day registration is NOT available.";
  return `${online}\n${byMail}\n${inPerson}\n${sameDay}\nCheck registration status: ${reg.registrationCheckUrl}`;
}

function formatVotingRules(rules: VotingRules): string {
  const idList = rules.acceptedIds.slice(0, 3).join("; ");
  const idMore = rules.acceptedIds.length > 3 ? " (and others)" : "";
  const idReq = rules.idRequired
    ? `Photo ID required. Accepted IDs: ${idList}${idMore}.`
    : "No photo ID required to vote.";
  const additional =
    rules.additionalRules.length > 0
      ? `\nAdditional rules:\n${rules.additionalRules.map((r) => `- ${r}`).join("\n")}`
      : "";
  return `${idReq}\nPhone policy at polls: ${rules.phonesAtPollsDetail}${additional}`;
}

function formatEarlyVoting(ev: EarlyVoting): string {
  return ev.available
    ? `Early voting: ${ev.startDate} through ${ev.endDate}. ${ev.notes}`
    : `Early voting: Not available. ${ev.notes}`;
}

export function generatePrompt(state: StateElectionData, zip: string): string {
  const today = new Date().toISOString().split("T")[0];
  const nextElection = getNextElection(state.elections, today);
  const primaryTypeLabel = nextElection.primaryType
    ? ` (${nextElection.primaryType} primary)`
    : "";

  return `You are a nonpartisan ballot research assistant. Please help me research my ${state.stateName} ballot.

My zip code is ${zip}. I am a voter in ${state.stateName}.

=== UPCOMING ELECTION ===
${nextElection.name}${primaryTypeLabel}
Election date: ${nextElection.date}

=== VOTER REGISTRATION (${state.stateName}) ===
${formatRegistration(state.registration)}

=== EARLY VOTING ===
${formatEarlyVoting(state.earlyVoting)}

=== VOTING RULES ===
${formatVotingRules(state.votingRules)}

=== RESOURCES ===
State election website: ${state.resources.stateElectionWebsite}
Find your polling place: ${state.resources.pollingPlaceLookup}
Sample ballot: ${state.resources.sampleBallotLookup}

=== RESEARCH REQUEST ===
Please walk me through my ${state.stateName} ballot using the 7-act research flow:
1. Confirm my election date and what races/measures will be on my ballot for ${zip}
2. Brief me on your research methodology (nonpartisan, patterns only, no recommendations)
3. For each candidate race: show funding sources, endorsements, voting record patterns, and any gaps
4. For each ballot measure: explain the measure and how it aligns with common voter values
5. Provide a downloadable ballot summary I can print
6. Offer to save a voter profile for future sessions
7. Give me a session handoff block I can use to continue this research in any AI tool

Start with Act 1 — what races and measures will appear on my ${state.stateName} ballot?`;
}
